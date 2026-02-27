# Consul Service Mesh Internals: Under the Hood

> Sources: Consul Tutorial (TutorialsPoint, 2017)

---

## 1. What Consul Actually Is: A Distributed Systems Coordination Plane

Consul is a **Go binary** that simultaneously acts as:
- A **service registry** (who is alive, where is it, is it healthy?)
- A **distributed KV store** (Raft-replicated, strongly consistent)
- A **gossip membership system** (who belongs to this cluster?)
- A **DNS server** (resolve `service.consul` to healthy pod IPs)
- A **service mesh control plane** (intention-based mTLS authorization)

All of these are embedded in a single binary with no external dependencies (no ZooKeeper, no etcd, no external database).

```mermaid
block-beta
  columns 3
  block:SERVER["Consul Server Node (3 or 5)"]:2
    columns 2
    A["Raft consensus module\n(log replication, leader election)"]
    B["Catalog (service registry)\nstored in Raft log"]
    C["KV store (hierarchical)\nstored in Raft log"]
    D["WAN gossip pool\n(cross-datacenter membership)"]
    E["RPC endpoint :8300\n(server-to-server + client→server)"]
    F["LAN gossip endpoint :8301 UDP\n(membership within datacenter)"]
  end
  block:CLIENT["Consul Client Agent (every node)"]:1
    columns 1
    G["LAN gossip participant"]
    H["service registration\n(local services → server)"]
    I["health check runner\n(HTTP/TCP/script checks)"]
    J["DNS listener :8600"]
    K["HTTP API :8500"]
  end
```

---

## 2. Raft Consensus: How Consul Achieves Strong Consistency

Consul's servers use **Raft** (Hashicorp's own Go implementation) to maintain a replicated state machine. Every write to the catalog or KV store must go through the Raft log.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Follower: node starts
  Follower --> Candidate: election timeout (150-300ms)\nno heartbeat received from leader
  Candidate --> Leader: receives majority votes (quorum = N/2+1)\ne.g., 3 servers → quorum = 2
  Candidate --> Follower: discovers higher-term node\nor receives AppendEntries
  Leader --> Follower: higher term discovered\nor network partition healed
  Leader --> Leader: sends heartbeat AppendEntries\nevery 50ms to all followers
```

### Raft Log Entry Lifecycle

```mermaid
sequenceDiagram
  participant C as Client (PUT /v1/kv/config/db/host)
  participant L as Leader Server
  participant F1 as Follower 1
  participant F2 as Follower 2

  C->>L: HTTP PUT (write request)
  L->>L: append entry to local Raft log\nassign log index + term
  L->>F1: AppendEntries RPC {index, term, entry}
  L->>F2: AppendEntries RPC {index, term, entry} (parallel)
  F1-->>L: ACK (entry appended to follower log)
  F2-->>L: ACK
  Note over L: quorum reached (2/3 ACK)\ncommit entry
  L->>L: apply to FSM (KV store in memory)
  L-->>C: 200 OK
  Note over F1,F2: followers apply committed entry\nwhen leader advances commit index
```

**Quorum requirement**: 3-server cluster tolerates 1 failure; 5-server tolerates 2 failures. Even number of servers should be avoided — with 4 servers, quorum = 3 same as with 3 servers, but 4 nodes must fail (network partition) to lose quorum — no improvement over 3.

### CAP Theorem Tradeoff

Consul chooses **CP** (Consistency + Partition Tolerance) over Availability:
- During a network partition, the minority partition becomes **unavailable** — reads return errors rather than stale data
- For **stale reads** (eventual consistency), `?stale` query parameter skips leader forwarding — followers answer locally but may return data up to `max_stale` seconds old

---

## 3. Gossip Protocol: Membership and Failure Detection

Consul uses **Serf** (a separate Hashicorp library) for gossip-based membership. Serf implements **SWIM** (Scalable Weakly-consistent Infection-style Process Group Membership).

```mermaid
flowchart TD
  N1["Node A (alive)"]
  N2["Node B (alive)"]
  N3["Node C (DEAD — process crashed)"]

  N1 -- "ping UDP every 200ms" --> N3
  N3 -. "no response (timeout)" .-> N1
  N1 -- "indirect ping: ask B to ping C" --> N2
  N2 -- "ping UDP" --> N3
  N3 -. "no response" .-> N2
  N2 -- "report C unreachable" --> N1
  N1 --> SUSP["mark C as Suspect\nbroadcast via gossip"]
  SUSP --> DEAD["if C stays silent for dead_interval\nmark C as Dead\nremove from membership"]
  DEAD --> REFUTE["if C is actually alive:\nC broadcasts Alive message\noverrides Dead state"]
```

**Gossip dissemination**: each node, every gossip interval, picks `k` random peers (fanout) and sends the full list of recent member state changes (piggybacked on health pings). Information spreads in O(log N) rounds — exponential fan-out ensures cluster-wide convergence.

### LAN vs WAN Gossip Pools

```mermaid
flowchart LR
  subgraph DC1["Datacenter 1 (us-east-1)"]
    S1["Server 1\n(LAN + WAN gossip)"]
    S2["Server 2\n(LAN gossip only)"]
    C1["Client agents\n(LAN gossip only)"]
  end
  subgraph DC2["Datacenter 2 (eu-west-1)"]
    S3["Server 3\n(LAN + WAN gossip)"]
    S4["Server 4\n(LAN gossip only)"]
  end

  S1 -- "WAN gossip :8302 UDP\ncross-DC membership" --> S3
  S1 -- "LAN gossip :8301 UDP" --> S2
  S2 -- "LAN gossip" --> C1
  S3 -- "WAN gossip" --> S1
```

WAN gossip pool has **only server nodes** — clients never participate in WAN gossip. This bounds WAN gossip load to O(servers) regardless of cluster size.

---

## 4. KV Store Internal Structure

The Consul KV store is a **hierarchical path-based key-value store** backed by the Raft log. Every entry is a `KVPair` struct:

```mermaid
block-beta
  columns 1
  block:KVP["KVPair struct (Go)"]:1
    columns 2
    K["Key: string\n'sites/1/domain'\n(slash-separated URL path)"]
    CI["CreateIndex: uint64\nRaft log index at creation"]
    MI["ModifyIndex: uint64\nRaft log index of last write"]
    LI["LockIndex: uint64\nRaft log index of last lock\n(distributed locking)"]
    FL["Flags: uint64\napp-defined metadata bitmask"]
    V["Value: []byte\nmax 512KB payload"]
    SS["Session: string\nlock holder session ID"]
  end
```

### Watch Mechanism: Blocking Queries

Consul KV supports **blocking queries** — long-polling via `?index=N&wait=Xs`. The client sends its last known `ModifyIndex`; the server holds the connection open until the index advances (a write occurs) or timeout:

```mermaid
sequenceDiagram
  participant APP as Application
  participant CL as Consul HTTP API (:8500)
  participant RAFT as Raft FSM

  APP->>CL: GET /v1/kv/config/db/host?index=42&wait=60s
  Note over CL: hold connection — watch for index > 42
  RAFT->>RAFT: new write committed (index=43)
  RAFT->>CL: notify watchers: index advanced to 43
  CL-->>APP: 200 {Value: "newvalue", ModifyIndex: 43}
  APP->>CL: GET /v1/kv/config/db/host?index=43&wait=60s
  Note over APP: application re-subscribes with new index
```

This enables **zero-latency config updates** without polling overhead — the HTTP connection blocks until something changes.

---

## 5. Service Registry: Catalog Architecture

The **catalog** is Consul's service registry — a Raft-replicated data structure mapping service names to healthy endpoint addresses.

```mermaid
flowchart TD
  SVC["Service registration\nconsul.services.register({\n  ID: 'web-1',\n  Name: 'web',\n  Address: '10.0.1.5',\n  Port: 8080,\n  Tags: ['v2', 'primary'],\n  Check: {HTTP: 'http://10.0.1.5:8080/health', Interval: '10s'}\n})"]

  SVC --> CA["Client agent\n(local machine)\nstores service registration"]
  CA --> HCHK["Health check runner\nHTTP GET /health every 10s"]
  HCHK -- "200 OK" --> PASS["check status: passing\nservice in healthy catalog"]
  HCHK -- "non-200 or timeout" --> FAIL["check status: critical\nservice removed from healthy responses\n(still in catalog — just marked unhealthy)"]
  CA --> SERVER["Consul server\n(via RPC :8300)"]
  SERVER --> RAFT["Raft log entry:\nRegisterRequest{Node, Service, Check}"]
  RAFT --> CATALOG["in-memory catalog\n(Raft FSM state)\nindexed by service name + tags + node"]
```

### Health Check Types

```mermaid
flowchart LR
  HC["Health Check"]
  HC --> HTTP["HTTP check\nGET url every interval\n200-299 = pass\n429 = warning\nother = critical"]
  HC --> TCP["TCP check\nconnect to host:port\nconnect success = pass\nrefused/timeout = critical"]
  HC --> SCRIPT["Script check\nexecute command\nexit 0 = pass\nexit 1 = warning\nexit 2+ = critical"]
  HC --> TTL["TTL check\napplication pushes heartbeat\nPUT /v1/agent/check/pass/ID\ntimeout = critical"]
  HC --> GRPC["gRPC check\nuses gRPC health checking protocol\nSERVING = pass"]
```

---

## 6. DNS Interface: Service Discovery via DNS

```mermaid
sequenceDiagram
  participant APP as Application
  participant DNS as Local DNS resolver
  participant CDNS as Consul DNS (:8600)
  participant CAT as Consul Catalog

  APP->>DNS: resolve web.service.consul (A record)
  DNS->>CDNS: forward .consul. domain queries to :8600
  CDNS->>CAT: lookup service 'web' with passing checks
  CAT-->>CDNS: [{IP: "10.0.1.5", Port: 8080}, {IP: "10.0.1.6", Port: 8080}]
  CDNS-->>DNS: A records: 10.0.1.5, 10.0.1.6 (TTL=0 for instant failover)
  DNS-->>APP: 10.0.1.5 (round-robin selection)
```

**DNS query patterns**:
- `web.service.consul` → A records for all healthy instances of `web`
- `web.service.dc2.consul` → instances in datacenter `dc2`
- `primary.web.service.consul` → instances tagged `primary`
- `_web._tcp.service.consul` → SRV records (includes port)

**TTL=0**: Consul sets DNS TTL to 0 by default so clients re-query on every connection — this ensures failed services are immediately excluded (at the cost of more DNS queries). Configurable via `dns_config.service_ttl`.

---

## 7. Multi-Datacenter Architecture: WAN Federation

```mermaid
flowchart TD
  subgraph DC1["Datacenter 1 (Primary)"]
    L1["Leader Server DC1"]
    F1A["Follower A DC1"]
    F1B["Follower B DC1"]
  end
  subgraph DC2["Datacenter 2 (Secondary)"]
    L2["Leader Server DC2"]
    F2A["Follower A DC2"]
  end

  L1 -- "WAN gossip\n(cross-DC membership)" --> L2
  L1 -- "cross-DC RPC forwarding\nGET /v1/catalog/service/web?dc=dc2" --> L2

  CLIENT["Client API request:\n/v1/catalog/service/web?dc=dc2"]
  CLIENT --> L1
  L1 --> L2
  L2 --> CATALOG2["Catalog in DC2\nreturns healthy web instances in DC2"]
  CATALOG2 --> L1
  L1 --> CLIENT
```

Each datacenter runs its **own independent Raft cluster** — there is no cross-DC replication of catalog data. Cross-DC queries are forwarded via **WAN RPC**: DC1 leader forwards the request to DC2 leader, which answers from its local catalog. This means cross-DC reads are strongly consistent within DC2 but involve WAN latency.

### Failover Ordering

```mermaid
flowchart LR
  Q["service discovery query:\nweb.service.consul"]
  Q --> LOCAL["check local DC: any healthy 'web'?"]
  LOCAL -- "yes" --> RESULT["return local instances"]
  LOCAL -- "no" --> FAILOVER["consul.services.deregister or TTL expired\ntry failover targets in order:\n  1. dc2\n  2. dc3\n(configured in service definition)"]
  FAILOVER --> DC2["cross-DC RPC → DC2 catalog\nreturn healthy DC2 instances"]
```

---

## 8. Session Locks: Distributed Mutex via Raft

Consul sessions enable **distributed leader election** and **service locking** built on top of the KV store:

```mermaid
sequenceDiagram
  participant A as Node A (wants leadership)
  participant B as Node B (wants leadership)
  participant CK as Consul KV (Raft-backed)

  A->>CK: PUT /v1/session/create {TTL: "15s", Behavior: "delete"}
  CK-->>A: SessionID: "abc-123"
  A->>CK: PUT /v1/kv/service/leader?acquire=abc-123\nbody: "node-a-address"
  CK->>CK: atomic CAS: if LockIndex==0, set Session=abc-123, increment LockIndex
  CK-->>A: true (lock acquired, A is leader)

  B->>CK: PUT /v1/kv/service/leader?acquire=xyz-789
  CK->>CK: LockIndex > 0 → lock held by abc-123
  CK-->>B: false (lock not acquired)

  Note over A: A must renew session before TTL expires:\nPUT /v1/session/renew/abc-123
  Note over A: if A crashes, session TTL expires\nlock key deleted (Behavior: delete)\nB can re-acquire
```

This pattern is used by Vault (Hashicorp), Nomad, and custom services for **leader election without external coordination**.

---

## 9. Consul Connect: Service Mesh mTLS Internals

Consul Connect extends service discovery into a **service mesh** — each service gets a **sidecar proxy** (Envoy) with automatically provisioned mTLS certificates:

```mermaid
flowchart TD
  SRC["Source service (frontend)"]
  SRC --> ENVOY_OUT["Envoy sidecar (outbound)\nlistens on 127.0.0.1:21000\n(frontend → upstream)"]
  ENVOY_OUT -- "mTLS tunnel\n(SPIFFE x.509 cert signed by Consul CA)" --> ENVOY_IN
  CONSUL_CA["Consul built-in CA\n(or Vault PKI backend)\ngenerates SVID certs:\nspiffe://cluster.local/ns/default/dc/dc1/svc/backend"]
  CONSUL_CA -- "cert provisioned to Envoy\nvia xDS API" --> ENVOY_OUT
  CONSUL_CA -- "cert provisioned to Envoy\nvia xDS API" --> ENVOY_IN
  ENVOY_IN["Envoy sidecar (inbound)\nlistens on 127.0.0.1:21001\n(backend ← downstream)"]
  ENVOY_IN --> DST["Destination service (backend)\nbinds to 127.0.0.1 only\nnot reachable without proxy"]

  INTENTIONS["Consul Intentions:\nDENY frontend → database\nALLOW frontend → backend"]
  INTENTIONS -- "intention policy enforced\nat Envoy inbound" --> ENVOY_IN
```

**SPIFFE** (Secure Production Identity Framework for Everyone): each service identity is a URI SAN in the x.509 cert — `spiffe://cluster.local/svc/backend`. The CA is Consul's own PKI (or Vault) — certificates are auto-rotated before expiry via the xDS protocol.

---

## 10. Watch System: Event-Driven Configuration Updates

Consul watches allow processes to react to changes without polling:

```mermaid
flowchart LR
  W["consul watch -type=key -key=config/db/host\ncmd: /usr/local/bin/reload-config.sh"]
  W --> BLOCK["blocking query loop:\nGET /v1/kv/config/db/host?index=N&wait=60s"]
  BLOCK -- "index advances (write detected)" --> EXEC["exec handler:\n/usr/local/bin/reload-config.sh\n(receives new value via stdin as JSON)"]
  EXEC --> UPDATE["application reloads config\nwithout restart"]
  EXEC --> BLOCK
```

**Watch types**:
- `key` — single KV key change
- `keyprefix` — any key under a prefix (e.g., `config/app/`)
- `services` — catalog: service list changes (new services registered/deregistered)
- `service` — specific service health changes
- `nodes` — cluster membership changes
- `checks` — health check status changes
- `event` — Consul user events (distributed pub/sub)

---

## 11. Snapshot and Restore: Raft State Serialization

```mermaid
sequenceDiagram
  participant OP as Operator
  participant API as Consul API
  participant RAFT as Raft Module
  participant DISK as Snapshot File

  OP->>API: GET /v1/snapshot
  API->>RAFT: trigger snapshot
  RAFT->>RAFT: serialize FSM state to BoltDB snapshot\n(catalog + KV store serialized to binary)
  RAFT->>DISK: write snapshot file (gzip compressed)
  DISK-->>OP: snapshot binary stream

  Note over OP: disaster recovery scenario
  OP->>API: PUT /v1/snapshot (upload file)
  API->>RAFT: restore from snapshot
  RAFT->>RAFT: replace FSM state with snapshot content\nreset Raft log index to snapshot index
  Note over RAFT: all servers must receive snapshot\n(leader ships to followers via InstallSnapshot RPC)
```

---

## 12. Comparison: Consul vs etcd vs ZooKeeper

```mermaid
block-beta
  columns 3
  block:CONSUL["Consul"]:1
    columns 1
    C1["Consensus: Raft"]
    C2["Membership: Gossip (SWIM)"]
    C3["Service discovery: built-in\nDNS + HTTP API"]
    C4["Health checks: built-in\nagent runs checks"]
    C5["Multi-DC: WAN gossip + RPC forwarding"]
    C6["Data model: KV + service catalog"]
    C7["CAP: CP (stale reads opt-in)"]
  end
  block:ETCD["etcd"]:1
    columns 1
    E1["Consensus: Raft"]
    E2["Membership: peer list (static)"]
    E3["Service discovery: none built-in\n(requires sidecars like coredns)"]
    E4["Health checks: none built-in"]
    E5["Multi-DC: no native support"]
    E6["Data model: KV only"]
    E7["CAP: CP (strict linearizable)"]
  end
  block:ZK["ZooKeeper"]:1
    columns 1
    Z1["Consensus: ZAB (Raft-like)"]
    Z2["Membership: static config"]
    Z3["Service discovery: via znodes\n(no DNS)"]
    Z4["Health checks: ephemeral znodes\n(session-based)"]
    Z5["Multi-DC: no native support"]
    Z6["Data model: hierarchical znodes"]
    Z7["CAP: CP (strong consistency)"]
  end
```

---

## 13. Full Data Flow: Service Registration to DNS Resolution

```mermaid
sequenceDiagram
  participant SVC as New Service Instance (10.0.1.7:8080)
  participant AGENT as Consul Client Agent
  participant SERVER as Consul Server (Leader)
  participant RAFT as Raft Log
  participant CAT as In-Memory Catalog
  participant DNS as Consul DNS (:8600)
  participant CLIENT as Downstream Client

  SVC->>AGENT: register via HTTP PUT /v1/agent/service/register\n{Name: "api", Port: 8080, Check: {HTTP: "/health", Interval: "5s"}}
  AGENT->>AGENT: run health check: GET http://localhost:8080/health
  AGENT-->>AGENT: 200 OK → check passing
  AGENT->>SERVER: RPC RegisterRequest{Node, Service, Check}
  SERVER->>RAFT: AppendEntries{RegisterRequest}
  RAFT->>RAFT: replicate to followers (quorum)
  RAFT->>CAT: apply: add Node{api, 10.0.1.7:8080, passing}
  CAT-->>SERVER: catalog updated, ModifyIndex advanced
  
  CLIENT->>DNS: A query: api.service.consul
  DNS->>CAT: lookup 'api' service, filter status=passing
  CAT-->>DNS: [{10.0.1.5, 8080}, {10.0.1.7, 8080}]
  DNS-->>CLIENT: A record: 10.0.1.5 (TTL=0, round-robin)
```

---

## 14. Failure Scenarios and Recovery

```mermaid
stateDiagram-v2
  direction LR
  state "Cluster Healthy" as H {
    Leader: Leader (3/3 servers up)
  }
  state "Single Server Failure" as S1 {
    Quorum: Quorum maintained (2/3)\nNew leader elected from followers
  }
  state "Quorum Loss (2/3 fail)" as Q {
    NoLeader: No leader elected\nCluster enters read-only mode\nWrites rejected — returns 500\nReads from follower with ?stale=true
  }
  state "Recovery" as R {
    Bootstrap: consul operator raft\nremove-dead-peer\nRestore from snapshot\nRe-bootstrap with new peer list
  }
  H --> S1: one server crashes
  S1 --> H: server recovers\nor new server joins
  S1 --> Q: second server crashes
  Q --> R: operator intervention
  R --> H: quorum re-established
```

---

## Summary: Consul Internal Data Path

```mermaid
flowchart TD
  REG["Service registers\nvia HTTP API to local agent"]
  REG --> HC["Agent runs health checks\n(HTTP/TCP/script/TTL)"]
  HC --> RPC["Healthy → agent sends RPC\nto Consul server"]
  RPC --> RAFT["Raft log entry\nleader appends, replicates to quorum"]
  RAFT --> CAT["In-memory catalog updated\n(ModifyIndex advances)"]
  CAT --> BLOCK["Blocking query watchers notified\n(all open ?index= connections respond)"]
  BLOCK --> DNS["DNS queries answered\n(only passing-check instances returned)"]
  BLOCK --> HTTP["HTTP API responses\n(/v1/health/service/X)"]
  BLOCK --> WATCH["Watch handlers executed\n(config reloads, scripts run)"]
  DNS --> CLIENTS["Clients connect to\nhealthy service instances only"]
```

Every piece of Consul's distributed coordination — from service health to config distribution to leader election — flows through this same Raft-gossip-catalog pipeline. The Raft log is the single source of truth; gossip provides failure detection without burdening the Raft leader; and the blocking query system turns the catalog into a push-based event stream.
