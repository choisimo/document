# 마이크로서비스 내부: 내부

> 소스 합성: 서비스 메시, API 게이트웨이, 서비스 간 통신, 분산 추적, 서비스 검색 및 탄력성 패턴을 다루는 마이크로서비스 참조 서적(comp 107, 112, 147–151, 163–164, 370).

---

## 1. 서비스 메시 아키텍처 - 데이터 플레인과 제어 플레인

```mermaid
flowchart TD
    subgraph ControlPlane["Control Plane (Istio / Linkerd)"]
        Pilot["Pilot / istiod\n- xDS server (ADS)\n- watches k8s API\n- computes Envoy config\n- pushes LDS/RDS/CDS/EDS"]
        Citadel["Citadel / SPIFFE\n- issues SVID x509 certs\n- cert rotation every 24h\n- SPIFFE ID: spiffe://cluster.local/ns/default/sa/myapp"]
        Galley["Galley / config validator\n- validates VirtualService\n- MeshConfig\n- DestinationRule"]
    end

    subgraph DataPlane["Data Plane (Envoy sidecars)"]
        App1["Service A\n:8080"]
        Sidecar1["Envoy Proxy\n(iptables redirect\nall traffic through :15001)"]
        App2["Service B\n:8080"]
        Sidecar2["Envoy Proxy"]
    end

    Pilot -->|"xDS push (gRPC stream)"| Sidecar1
    Pilot -->|"xDS push"| Sidecar2
    Citadel -->|"mTLS cert"| Sidecar1
    Citadel -->|"mTLS cert"| Sidecar2
    App1 <-->|"loopback"| Sidecar1
    Sidecar1 <-->|"mTLS\nHTTP/2 / gRPC"| Sidecar2
    Sidecar2 <-->|"loopback"| App2
```

### iptables 트래픽 차단

```mermaid
flowchart LR
    subgraph Pod Netns
        App["App process\n:8080"]
        Envoy["Envoy\n:15001 (outbound)\n:15006 (inbound)"]
        IP["iptables rules\n(injected by istio-init)"]
    end

    Out["Outbound call to 10.244.1.7:8080"]
    App -->|"connect() → 10.244.1.7:8080"| IP
    IP -->|"REDIRECT --to-port 15001\n(OUTPUT chain, ISTIO_OUTPUT)"| Envoy
    Envoy -->|"original dst via SO_ORIGINAL_DST\n→ route decision\n→ upstream TLS"| Out

    In["Inbound from 10.244.1.5"]
    In -->|"PREROUTING: REDIRECT --to-port 15006"| Envoy
    Envoy -->|"policy check + telemetry\n→ forward to :8080"| App
```

---

## 2. Envoy xDS — 동적 구성 프로토콜

```mermaid
sequenceDiagram
    participant Envoy
    participant istiod as istiod (xDS server)
    participant K8s as Kubernetes API

    K8s-->>istiod: Service/Endpoints/VirtualService watch events
    istiod->>istiod: compute xDS config snapshot
    Envoy->>istiod: DiscoveryRequest{node_id, resource_names, version_info}
    istiod-->>Envoy: DiscoveryResponse{version, resources:[LDS listeners]}
    Envoy-->>istiod: ACK (version matches)
    
    Note over Envoy: LDS: Listeners (ports to bind)
    Note over Envoy: RDS: Route configs (Host+Path → Cluster)
    Note over Envoy: CDS: Cluster configs (load balancing policy, circuit breaker)
    Note over Envoy: EDS: Endpoint addresses (pod IPs + weights + health)

    istiod-->>Envoy: CDS push (new cluster added)
    Envoy-->>istiod: ACK
    istiod-->>Envoy: EDS push (pod IP changed)
    Envoy-->>istiod: ACK
```

---

## 3. API 게이트웨이 - 요청 처리 파이프라인

```mermaid
flowchart TD
    Client["Client\n(mobile / browser)"]
    GW["API Gateway\n(Kong / AWS API GW / Nginx)"]

    subgraph Gateway Pipeline
        TLS_Term["TLS Termination\n(certificate at edge)"]
        Auth["Authentication\n- JWT validation (RS256 pubkey)\n- API key lookup (hash → secret store)\n- OAuth2 token introspection"]
        RateLimit["Rate Limiting\n- token bucket per key (Redis)\n- sliding window counter\n- 429 Too Many Requests"]
        Transform["Request Transform\n- header injection (X-User-Id)\n- path rewrite (/v1/users → /users)\n- body schema validation"]
        Route["Routing\n- path prefix match\n- host-based routing\n- canary weight split"]
        LB["Load Balancing\n- round-robin / least-conn\n- health check (active probes)\n- circuit breaker"]
        Upstream["Upstream Services\n(microservices)"]
        Cache["Response Cache\n(CDN / Varnish / Redis)\nCache-Control headers"]
    end

    Client --> GW --> TLS_Term --> Auth --> RateLimit --> Transform --> Route --> LB --> Upstream
    Upstream -->|"response"| Cache -->|"cached or passthrough"| Client
```

### 토큰 버킷 속도 제한기 내부

```mermaid
flowchart LR
    subgraph Redis Token Bucket
        Key["key: ratelimit:{api_key}\nfields:\n  tokens: 95.0\n  last_refill: 1709123456789"]
        Refill["Refill:\ntokens += rate × (now - last_refill)\ntokens = min(tokens, capacity)"]
        Consume["Consume:\nif tokens >= 1:\n  tokens -= 1 → ALLOW\nelse:\n  → 429 DENY"]
        Script["Lua script (atomic EVAL)\n→ no race condition\n→ single RTT to Redis"]
    end
    Request -->|"EVAL lua, key"| Script
    Script --> Refill --> Consume
```

---

## 4. 서비스 검색 — 클라이언트측 vs 서버측

```mermaid
flowchart TD
    subgraph Client-Side Discovery (Eureka / Consul)
        SvcA["Service A"]
        Registry["Service Registry\n(Consul / Eureka)\nhealth-checked store\nof {name → [ip:port]}"]
        SvcB_1["Service B instance 1\n10.244.1.5:8080"]
        SvcB_2["Service B instance 2\n10.244.1.7:8080"]
        LB_Client["Client-side LB\n(Ribbon / gRPC client LB)\nround-robin / p2c"]

        SvcA -->|"1. lookup service-b"| Registry
        Registry -->|"2. return [10.244.1.5, 10.244.1.7]"| SvcA
        SvcA --> LB_Client
        LB_Client -->|"3. pick instance"| SvcB_1
    end

    subgraph Server-Side Discovery (Kubernetes Service)
        SvcC["Service C"]
        ClusterIP["ClusterIP 10.96.0.10:80\n(kube-proxy iptables DNAT)"]
        SvcD_1["Service D pod 1"]
        SvcD_2["Service D pod 2"]
        SvcC -->|"connect ClusterIP"| ClusterIP
        ClusterIP -->|"random DNAT"| SvcD_1 & SvcD_2
    end

    subgraph Consul Internal
        Agent["consul agent\n(local sidecar)"]
        Server["consul server\n(Raft cluster)"]
        HCheck["health check:\nHTTP GET /health → 200?\nTCP connect?\nScript output?"]
        Agent -->|"gossip protocol\n(SWIM)\nfailure detection"| Server
        Agent --> HCheck
    end
```

---

## 5. gRPC 내부 — 전송 및 프로토콜 버퍼

```mermaid
flowchart TD
    subgraph gRPC Stack
        AppCode["Application Code\ngrpc.Dial() + stub.Method()"]
        Stub["Generated Stub\n(protoc-gen-go/grpc)"]
        Channel["gRPC Channel\n- connection pool\n- load balancing policy\n- name resolver (DNS/xDS)"]
        HTTP2["HTTP/2 Transport\n- multiplexed streams\n- header compression (HPACK)\n- flow control (per-stream + connection)\n- stream ID (odd=client)"]
        TLS["TLS 1.3\n(or plaintext h2c)"]
        TCP["TCP Socket"]
    end

    subgraph Protobuf Encoding
        Msg["Message{id: 1, name: 'Alice', score: 99.5}"]
        Enc["Wire format:\n08 01 — field 1, varint, value 1\n12 05 41 6c 69 63 65 — field 2, len, 'Alice'\n1d 00 00 c7 42 — field 3, fixed32, 99.5"]
        Note1["Tag = (field_number << 3) | wire_type\nVarint: base-128, LSB first, MSB=continuation\nNo field names, no nulls — extremely compact"]
    end

    AppCode --> Stub --> Channel --> HTTP2 --> TLS --> TCP
    Msg --> Enc
```

### gRPC 스트리밍 — 역압 흐름

```mermaid
sequenceDiagram
    participant Client
    participant H2C as HTTP/2 Connection
    participant Server

    Client->>H2C: SETTINGS (initial_window_size=65535)
    Server->>H2C: SETTINGS (initial_window_size=65535)
    Client->>H2C: HEADERS frame (stream_id=1, :path=/svc/Method)
    Client->>H2C: DATA frame (stream_id=1, payload=1000B)
    Note over H2C: client window -= 1000 (64535 remaining)
    Server->>H2C: WINDOW_UPDATE (stream_id=1, increment=1000)
    Note over H2C: client window restored → can send more
    Server->>H2C: DATA frame (response chunk)
    Server->>H2C: DATA frame (response chunk)
    Server->>H2C: HEADERS frame (END_STREAM, grpc-status=0)
```

---

## 6. 분산 추적 — OpenTelemetry 내부

```mermaid
flowchart TD
    subgraph Trace Propagation
        Req["HTTP Request\nW3C Trace Context headers:\ntraceparent: 00-{traceId}-{spanId}-01\ntracestate: vendor-specific"]
        SvcA["Service A\n- extract context\n- start span (spanId=aaaa)\n- inject into outbound headers"]
        SvcB["Service B\n- extract parent spanId=aaaa\n- start child span (spanId=bbbb)\n- record attributes+events"]
        SvcC["Service C\n- child span (spanId=cccc)"]

        Req --> SvcA -->|"HTTP with traceparent"| SvcB -->|"gRPC metadata"| SvcC
    end

    subgraph OTLP Export Pipeline
        SDK["OTel SDK\n- Tracer → start/end spans\n- SpanProcessor (BatchSpanProcessor)\n- in-memory ring buffer"]
        Collector["OTel Collector\n- receives OTLP (gRPC/HTTP)\n- tail sampling processor\n- batch exporter"]
        Backend["Jaeger / Zipkin / Tempo\n- trace storage\n- span index\n- dependency graph"]
        SDK -->|"OTLP gRPC (async batch)"| Collector
        Collector -->|"Jaeger Thrift / OTLP"| Backend
    end

    subgraph Span Data Model
        Span["Span {\n  traceId: 128-bit\n  spanId: 64-bit\n  parentSpanId: 64-bit\n  name: 'GET /users'\n  kind: CLIENT/SERVER/PRODUCER/CONSUMER\n  startTime, endTime (UnixNano)\n  attributes: {http.method, http.status_code}\n  events: [{name, timestamp, attrs}]\n  status: OK / ERROR\n}"]
    end
```

---

## 7. 회로 차단기 - 상태 머신 내부

```mermaid
stateDiagram-v2
    [*] --> Closed : initial state
    Closed --> Open : failure rate > threshold\n(e.g. 50% of last 10 calls fail)
    Open --> HalfOpen : timeout elapsed\n(e.g. 30 seconds)
    HalfOpen --> Closed : probe request succeeds
    HalfOpen --> Open : probe request fails

    note right of Closed
      Requests pass through normally
      Failure counter incremented on error
      Sliding window: last N calls or time window
    end note
    note right of Open
      All requests FAIL FAST immediately
      No network calls made
      Error returned to caller instantly
    end note
    note right of HalfOpen
      Single probe request allowed
      Determines if backend recovered
    end note
```

### Resilience4j 슬라이딩 윈도우

```mermaid
flowchart LR
    subgraph Count-Based Window (size=10)
        W["Ring buffer [F,S,F,S,S,F,S,S,S,F]\n(F=fail, S=success)\nfailureRate = count(F)/10 = 40%"]
        Threshold["threshold=50% → CLOSED (below threshold)"]
    end
    subgraph Time-Based Window (5 seconds)
        T["Epoch buckets (1 per second):\n[t-5: 3F 7S]\n[t-4: 1F 4S]\n[t-3: 5F 2S]\n[t-2: 2F 8S]\n[t-1: 4F 6S]\naggregated failureRate = 15/42 = 36%"]
    end
    subgraph Bulkhead
        B["Semaphore bulkhead:\nmaxConcurrentCalls=10\nmaxWaitDuration=0ms\n→ immediate rejection if saturated\n(isolates one service from starving others)"]
    end
```

---

## 8. 사가 패턴 - 분산 트랜잭션 내부

```mermaid
sequenceDiagram
    participant Orchestrator as Saga Orchestrator
    participant Order as Order Service
    participant Payment as Payment Service
    participant Inventory as Inventory Service
    participant Notify as Notification Service

    Note over Orchestrator: Choreography-based Saga via events
    Orchestrator->>Order: CreateOrder command
    Order-->>Orchestrator: OrderCreated event
    Orchestrator->>Payment: ReservePayment command
    Payment-->>Orchestrator: PaymentReserved event
    Orchestrator->>Inventory: ReserveStock command
    Inventory-->>Orchestrator: StockReservationFailed event (out of stock)
    
    Note over Orchestrator: ROLLBACK: compensating transactions
    Orchestrator->>Payment: CancelPaymentReservation (compensating)
    Payment-->>Orchestrator: PaymentCancelled
    Orchestrator->>Order: RejectOrder (compensating)
    Order-->>Orchestrator: OrderRejected
    Note over Orchestrator: Saga completed (with rollback)
```

### 사가 vs 2PC 비교

```mermaid
flowchart LR
    subgraph 2PC
        C2["Coordinator"]
        P1["Participant 1\n(DB lock held\nduring prepare phase)"]
        P2["Participant 2\n(DB lock held)"]
        C2 -->|"Phase 1: PREPARE"| P1 & P2
        P1 & P2 -->|"VOTE_COMMIT"| C2
        C2 -->|"Phase 2: COMMIT"| P1 & P2
        Note2["Problem: coordinator crash\nduring phase 2 → participants\nblocked forever holding locks"]
    end
    subgraph Saga
        So["Orchestrator (stateful)"]
        S1["Service 1: local tx\n(no distributed lock)"]
        S2["Service 2: local tx"]
        So --> S1 --> S2
        Note_s["Eventual consistency\nCompensating txs for rollback\nNo cross-service locks\nAT-LEAST-ONCE delivery via MQ"]
    end
```

---

## 9. 이벤트 중심 마이크로서비스 — 발신함 패턴

```mermaid
flowchart TD
    subgraph Service A (Order)
        Tx["DB Transaction\n(single local tx)"]
        Orders["orders table\nINSERT order_id=123"]
        Outbox["outbox table\nINSERT {event_type=OrderCreated,\npayload=JSON,\nstatus=PENDING}"]
        Tx --> Orders
        Tx --> Outbox
    end

    subgraph Outbox Relay
        Poller["Debezium CDC\n(read WAL/binlog)\nor polling thread\n→ reads PENDING outbox rows"]
        MQ["Message Broker\n(Kafka / RabbitMQ)\npublish OrderCreated event"]
        Mark["UPDATE outbox SET status=PUBLISHED"]
    end

    subgraph Service B (Inventory)
        Consumer["Kafka consumer\nidempotency check:\n(event_id already processed?)"]
        Idempotency["processed_events table\n(event_id → UNIQUE constraint)"]
        InventoryUpdate["UPDATE inventory\n(reserve stock)"]
    end

    Outbox --> Poller --> MQ --> Consumer
    Consumer --> Idempotency
    Idempotency -->|"not seen → process"| InventoryUpdate
    Poller --> Mark
```

---

## 10. CQRS — 명령 쿼리 책임 분리

```mermaid
flowchart LR
    subgraph Write Side (Commands)
        Cmd["Command: CreateOrder{userId, items}"]
        Handler["CommandHandler\n- validate business rules\n- apply domain events\n- save to EventStore (append-only)"]
        EventStore["Event Store\n(append-only log)\nOrderCreated\nOrderShipped\nOrderCancelled"]
        EventBus["Event Bus (Kafka)\n→ fan out to projections"]
    end

    subgraph Read Side (Queries)
        Projection1["Order Summary\nProjection\n→ PostgreSQL read model\n(denormalized for fast SELECT)"]
        Projection2["User Orders\nProjection\n→ Redis cache\n(precomputed list)"]
        Query["Query: GetOrder{orderId}\n→ read from projection DB\n(no event replay needed)"]
    end

    Cmd --> Handler --> EventStore --> EventBus
    EventBus --> Projection1 & Projection2
    Query --> Projection1

    subgraph Event Sourcing Replay
        Replay["Rebuild projection:\nreplay ALL events from EventStore\n→ recompute state\n(snapshot every N events\n→ replay from snapshot)"]
    end
```

---

## 11. 상태 확인 및 활동성 내부

```mermaid
flowchart TD
    subgraph Spring Boot Actuator / Kubernetes Probes
        Live["Liveness Probe\nGET /actuator/health/liveness\n→ 200 OK: process running\n→ non-200: kubelet restarts container\n(never checks downstream deps!)"]
        Ready["Readiness Probe\nGET /actuator/health/readiness\n→ 200 OK: ready to serve traffic\n→ non-200: removed from Service EP\n(checks DB, cache, dependencies)"]
        Start["Startup Probe\nGET /actuator/health/startup\n→ disables liveness until first success\n(slow startup apps: avoid false restarts)"]
    end

    subgraph Health Aggregation
        Composite["HealthIndicator tree\nCompositeHealthContributor"]
        DB["DataSourceHealthIndicator\nSELECT 1\n→ UP / DOWN"]
        Redis_H["RedisHealthIndicator\nPING\n→ UP / DOWN"]
        Disk["DiskSpaceHealthIndicator\nfree space check"]
        Composite --> DB & Redis_H & Disk
        DB -->|"any DOWN → overall DOWN"| Composite
    end
```

---

## 12. 서비스 메시 mTLS - 인증서 수명 주기

```mermaid
sequenceDiagram
    participant Envoy as Envoy Sidecar
    participant Agent as Istio Agent (pilot-agent)
    participant istiod as istiod (Citadel)
    participant Workload as App Container

    Note over Agent: Pod starts → pilot-agent starts first
    Agent->>Agent: generate private key (ECDSA P-256)
    Agent->>Agent: create CSR (SPIFFE ID in SAN)
    Agent->>istiod: gRPC CreateCertificate(CSR)
    istiod->>istiod: validate k8s ServiceAccount JWT
    istiod->>istiod: sign cert with cluster root CA
    istiod-->>Agent: signed SVID cert (24h TTL)
    Agent->>Envoy: push cert via SDS (Secret Discovery Service)
    Note over Envoy: TLS listener now has cert+key
    Envoy->>Envoy: rotate cert at 80% TTL (~19h)
    Agent->>istiod: re-CSR (no downtime, hot swap)
    
    Note over Envoy: mTLS handshake with peer
    Envoy->>Envoy: verify peer SVID\n(SPIFFE ID: spiffe://cluster.local/ns/foo/sa/bar)\n→ authorization policy check
```

---

## 13. 성능 및 오버헤드 요약

```mermaid
block-beta
  columns 2
  block:sidecar["Sidecar Proxy Overhead"]:1
    s1["CPU: ~0.5–2% per request (Envoy)"]
    s2["Memory: ~50–100MB per sidecar"]
    s3["Latency: +0.3–1ms p50 (local loopback)"]
    s4["p99 latency: +2–5ms (mTLS handshake amortized)"]
  end
  block:discovery["Service Discovery Latency"]:1
    d1["Consul health check: 10s interval default"]
    d2["DNS TTL: 5–30s (stale pods visible)"]
    d3["k8s Endpoints update: ~1–5s after pod ready"]
    d4["xDS push to Envoy: ~1–3s after EP change"]
  end
  block:grpc["gRPC vs REST"]:1
    g1["Protobuf encoding: 3–10x smaller than JSON"]
    g2["HTTP/2 multiplexing: 1 TCP conn, N streams"]
    g3["gRPC streaming: server push (no polling)"]
    g4["gRPC latency: ~10–50% lower than REST/JSON"]
  end
  block:saga["Saga Overhead"]:1
    sa1["Outbox polling: 100ms–1s delay (CDC faster)"]
    sa2["Compensating tx: idempotency check O(1) with index"]
    sa3["Event store replay: O(events) — snapshot every 100 events"]
    sa4["2PC lock hold: entire prepare+commit round trip"]
  end
```

---

## 주요 내용

- **Envoy 차단**은 iptables `REDIRECT`(`TPROXY` 아님)을 사용합니다. 모든 트래픽 경로는 로컬 호스트 포트 15001/15006을 통해 이루어집니다. `SO_ORIGINAL_DST`는 실제 대상을 복구합니다.
- **xDS 푸시 프로토콜**은 delta-xDS 스트림을 사용하므로 변경된 리소스만 전송됩니다. Envoy는 각 버전에 대해 ACK를 보냅니다. NACK 롤백
- **Protobuf varint 인코딩**은 대부분의 필드에 대해 필드 번호 + 연결 유형을 단일 바이트로 압축합니다. 일반적인 메시지는 동등한 JSON보다 3~10배 작습니다.
- **회로 차단기 반 개방**은 정확히 하나의 프로브 요청을 허용합니다. 다른 모든 요청은 프로브가 성공할 때까지 여전히 빠른 실패 상태를 유지합니다.
- **Saga 보상 트랜잭션**은 멱등성이 있어야 합니다. 오케스트레이터는 재시도 시 명령을 다시 보낼 수 있습니다(Kafka에서 한 번 이상 전달).
- **Outbox 패턴**은 동일한 로컬 트랜잭션에서 DB 쓰기 + 이벤트 게시 원자성을 만들어 정확히 한 번만 전달되도록 보장합니다. Debezium CDC는 거의 0에 가까운 오버헤드로 WAL을 읽습니다.
- **CQRS 프로젝션**은 이벤트 저장소 재생에서 다시 작성됩니다. N 이벤트마다 스냅샷을 생성하면 재생 시간이 O(모든 이벤트)에서 O(스냅샷 이후 이벤트)로 단축됩니다.
