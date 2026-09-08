# Docker & Kubernetes Internals: Under the Hood

> Source synthesis: Container orchestration reference books (comp 244, 380, 398–417) covering Docker Engine architecture, container runtime internals, Kubernetes control plane mechanics, and network/storage subsystems.

## Version and implementation scope

Docker/containerd/runc, Linux cgroup mode, Kubernetes, and CNI/CSI implementations evolve independently. The diagrams are concrete examples, not a single mandatory path. Before using a path operationally, record component versions, runtime, cgroup v1/v2, network/storage plugins, feature gates, kube-proxy replacement, and the API object or metric that proves completion.

---

## 1. Container Runtime Architecture

### From `docker run` to Process

```mermaid
sequenceDiagram
    participant CLI as docker CLI
    participant Daemon as dockerd
    participant Containerd as containerd
    participant Shim as containerd-shim
    participant Runc as runc
    participant Kernel as Linux Kernel

    CLI->>Daemon: POST /containers/create (REST/gRPC)
    Daemon->>Containerd: TaskCreate RPC (containerd API)
    Containerd->>Shim: fork containerd-shim-runc-v2
    Shim->>Runc: runc create --bundle /run/containerd/...
    Runc->>Kernel: clone(CLONE_NEWPID|CLONE_NEWNET|CLONE_NEWNS|CLONE_NEWUTS|CLONE_NEWIPC|CLONE_NEWUSER)
    Runc->>Kernel: cgroup: write pid to cgroup.procs
    Runc->>Kernel: pivot_root() → new rootfs
    Runc->>Kernel: seccomp BPF filter install
    Runc-->>Shim: container state file written
    Shim-->>Containerd: CreateTaskResponse
    CLI->>Daemon: POST /containers/{id}/start
    Daemon->>Containerd: TaskStart RPC
    Containerd->>Shim: Start()
    Shim->>Runc: runc start
    Runc->>Kernel: execve("/entrypoint")
    Note over Shim,Runc: runc exits, shim adopts container process
```

### OCI Bundle Layout

```mermaid
block-beta
  columns 4
  block:bundle["OCI Bundle\n/run/containerd/io.containerd.runtime.v2.task/ns/id/"]:4
    config["config.json\n(OCI spec)"]
    rootfs["rootfs/\n(merged overlayfs)"]
    state["state.json\n(runtime state)"]
    log["log.json\n(stdio FIFOs)"]
  end
  block:spec["config.json sections"]:4
    process["process:\n{args, env,\ncapabilities,\nrlimits,\nseccomp}"]
    mounts["mounts:\n[{/proc, /sys,\n/dev, bind mounts}]"]
    linux["linux:\n{namespaces,\ncgroups path,\nmaskedPaths}"]
    hooks["hooks:\n{prestart,\npoststart,\npoststop}"]
  end
```

---

## 2. Namespace & Cgroup Internals

### Linux Namespaces — What Each Isolates

```mermaid
flowchart LR
    subgraph Namespaces
        PID["PID ns\npid_namespace struct\nchild_reaper = PID 1\n(container init)"]
        NET["NET ns\nnet struct\nown routing table\nnetdev list\niptables rules"]
        MNT["MNT ns\nmnt_namespace struct\nvfsmount tree\npivot_root changes root"]
        UTS["UTS ns\nuts_namespace struct\nhostname, domainname"]
        IPC["IPC ns\nipc_namespace struct\nSysV semaphores\nPOSIX MQ"]
        USER["USER ns\nuser_namespace struct\nUID/GID mappings\n(container UID 0 → host UID 1000)"]
        CGROUP["CGROUP ns\ncgroup_namespace struct\nhides host cgroup path"]
    end
```

### cgroup v2 Resource Control

```mermaid
flowchart TD
    Root["/sys/fs/cgroup/\n(unified hierarchy)"]
    Root --> System["system.slice/"]
    Root --> K8s["kubepods/"]
    K8s --> BestEffort["besteffort/"]
    K8s --> Burstable["burstable/"]
    K8s --> Guaranteed["guaranteed/"]
    Guaranteed --> Pod["pod-{uid}/"]
    Pod --> C1["container-1/\ncpu.weight=100\nmemory.max=512M\nio.weight=50\npids.max=100"]
    Pod --> C2["container-2/\ncpu.weight=200\nmemory.max=1G"]

    subgraph cgroup v2 controllers
        CPU["cpu: CFS bandwidth\ncpu.cfs_quota_us / cpu.cfs_period_us\ncpu.weight (nice-based)"]
        MEM["memory: hard limit\nmemory.max → OOM kill\nmemory.high → reclaim\nmemory.swap.max"]
        IO["io: blkio throttle\nio.max = rbps/wbps/riops/wiops\nio.weight = proportional"]
        PIDS["pids: fork bomb protection\npids.max"]
    end
```

---

## 3. OverlayFS — Container Image Layers

In cgroup v2, CPU bandwidth is configured through `cpu.max`; `cpu.cfs_quota_us` and `cpu.cfs_period_us` are cgroup v1 names even though they appear in the preceding v2 diagram. Kubernetes' on-disk cgroup paths also depend on the cgroup driver and QoS hierarchy.

```mermaid
flowchart BT
    subgraph OverlayFS Mount
        direction BT
        Upper["upperdir\n(container writable layer)\n/var/lib/docker/overlay2/{id}/diff/"]
        Work["workdir\n(atomic rename staging)\n/var/lib/docker/overlay2/{id}/work/"]
        Lower4["lowerdir[0]: app layer\n(sha256:abc123)"]
        Lower3["lowerdir[1]: runtime layer\n(sha256:def456)"]
        Lower2["lowerdir[2]: base libs\n(sha256:789abc)"]
        Lower1["lowerdir[3]: base OS\n(sha256:000000)"]
        Merged["merged view\n/var/lib/docker/overlay2/{id}/merged/\n(container sees this)"]

        Lower1 --> Lower2 --> Lower3 --> Lower4
        Lower4 -->|"read from lower if not in upper"| Merged
        Upper -->|"writes go here (copy-on-write)"| Merged
    end

    subgraph Copy-on-Write Write Path
        W1["read() — page fault → kernel checks upper"] -->|"not found"| W2
        W2["copy page from lower → upper/diff/"] --> W3
        W3["modify in-place in upper"] --> W4
        W4["write visible through merged/"]
    end
```

### Image Layer Storage

OverlayFS copy-up operates on a lower file/inode when it is first modified, not on a single memory page as the preceding flowchart suggests. Metadata-only operations may use metacopy when enabled, and large-file copy-up cost depends on filesystem and mount options.

```mermaid
block-beta
  columns 3
  block:content_addr["Content-Addressable Store\n/var/lib/docker/overlay2/"]:3
    l1["sha256:abc.../\n  diff/ (layer files)\n  link (short ID)\n  lower (parent chain)\n  work/"]
    l2["sha256:def.../\n  diff/\n  link\n  lower\n  work/"]
    l3["Container layer\n{container-id}/\n  diff/ (RW)\n  merged/\n  work/"]
  end
  block:manifest["Image Manifest (JSON)"]:3
    m1["mediaType:\napplication/vnd.oci.image.manifest.v1+json"]
    m2["layers: [{digest, size, mediaType}]\nconfig: {digest, size}\n(content hash → immutable)"]
    m3["Distribution Registry\nHTTP Range GET\nblob storage by digest"]
  end
```

---

## 4. Container Networking — CNI Internals

The following bridge/VXLAN path is a flannel-style example. Routed Calico, Cilium/eBPF, cloud VPC CNI, and other plugins may omit `cni0`, use different IPAM, or program routes/maps instead of a VXLAN bridge. `RunPodSandbox` and CNI success are the stable integration boundaries; Linux commands are implementation details.

### veth Pair + Bridge (Docker bridge / flannel VXLAN)

```mermaid
sequenceDiagram
    participant kubelet
    participant CRI as CRI (containerd)
    participant CNI as CNI Plugin (calico/flannel)
    participant Netns as Container Netns
    participant Bridge as cni0 bridge
    participant HostNS as Host Netns

    kubelet->>CRI: RunPodSandbox()
    CRI->>Netns: ip netns add cni-{uuid}
    CRI->>CNI: ADD cmd (env: CNI_NETNS, CNI_IFNAME=eth0)
    CNI->>HostNS: ip link add veth0 type veth peer name veth1
    CNI->>Netns: ip link set veth1 netns cni-{uuid}, rename eth0
    CNI->>Netns: ip addr add 10.244.1.5/24 dev eth0, ip link set eth0 up
    CNI->>HostNS: ip link set veth0 master cni0, ip link set veth0 up
    CNI->>HostNS: ip route add 10.244.1.5/32 dev veth0
    CNI-->>CRI: {"ip": "10.244.1.5/24", "gateway": "10.244.1.1"}
    CRI-->>kubelet: PodSandboxStatus
```

### Cross-Node Packet Flow (VXLAN overlay)

```mermaid
flowchart LR
    subgraph Node1["Node 1 (10.0.0.1)"]
        P1["Pod\n10.244.1.5"]
        V1["veth1"]
        B1["cni0 bridge\n10.244.1.1/24"]
        VXLAN1["flannel.1\n(VXLAN VTEP)\nVNI=1"]
    end
    subgraph Node2["Node 2 (10.0.0.2)"]
        VXLAN2["flannel.1\nVTEP"]
        B2["cni0 bridge\n10.244.2.1/24"]
        V2["veth2"]
        P2["Pod\n10.244.2.7"]
    end

    P1 -->|"src:10.244.1.5 dst:10.244.2.7"| V1 --> B1
    B1 -->|"FDB lookup: 10.244.2.7 → 10.0.0.2 via flannel.1"| VXLAN1
    VXLAN1 -->|"VXLAN encap:\nOuter UDP dst:4789\nVNI:1\nInner Eth+IP"| VXLAN2
    VXLAN2 -->|"decap → inner frame"| B2 --> V2 --> P2
```

---

## 5. Kubernetes Architecture — Control Plane Internals

### Component Interaction Map

```mermaid
flowchart TD
    subgraph ControlPlane["Control Plane"]
        API["kube-apiserver\n- REST + gRPC\n- authn/authz/admission\n- etcd gateway\n- watch cache"]
        ETCD["etcd\n- Raft consensus\n- /registry/ key prefix\n- watch → push events\n- 3 or 5 node cluster"]
        SCH["kube-scheduler\n- watch: unscheduled Pods\n- filter+score plugins\n- bind: write spec.nodeName"]
        CM["kube-controller-manager\n- ReplicaSet ctrl\n- Deployment ctrl\n- Node ctrl\n- Job ctrl\n- (16+ controllers in one binary)"]
    end
    subgraph Node["Worker Node"]
        KL["kubelet\n- watch assigned Pods\n- CRI: RunPodSandbox()\n- CNI: network setup\n- CSI: volume mount\n- liveness/readiness probes\n- status report"]
        KP["kube-proxy\n- watch Services/Endpoints\n- program iptables/IPVS\n- ClusterIP routing"]
        CRI2["containerd / CRI-O\n- OCI runtime\n- image pull\n- container lifecycle"]
    end

    API <-->|"watch/list/write"| ETCD
    SCH -->|"watch unscheduled\nbind nodeName"| API
    CM -->|"watch + reconcile\ndesired vs actual"| API
    KL -->|"watch pod assignments\nupdate pod status"| API
    KP -->|"watch Svc/EP\nprogram dataplane"| API
    KL --> CRI2
```

### etcd Raft Write Path

```mermaid
sequenceDiagram
    participant API as kube-apiserver
    participant Leader as etcd Leader
    participant F1 as etcd Follower 1
    participant F2 as etcd Follower 2

    API->>Leader: gRPC Put(/registry/pods/default/nginx, data)
    Leader->>Leader: append entry to WAL (term+index)
    Leader->>F1: AppendEntries RPC (log entry)
    Leader->>F2: AppendEntries RPC (log entry)
    F1-->>Leader: AppendEntriesResponse (success)
    F2-->>Leader: AppendEntriesResponse (success)
    Note over Leader: quorum achieved (2/3 nodes)
    Leader->>Leader: commit entry, apply to boltdb (bbolt)
    Leader-->>API: PutResponse (revision=12345)
    API->>API: update watch cache, fan out watch events
    Note over F1,F2: followers commit asynchronously
```

---

## 6. Pod Lifecycle — State Machine

```mermaid
stateDiagram-v2
    [*] --> Pending : kubectl apply
    Pending --> Pending : scheduler filters and scores nodes
    Pending --> Scheduled : spec.nodeName written
    Scheduled --> ContainerCreating : kubelet picks up pod
    ContainerCreating --> Running : all containers started
    Running --> Succeeded : all containers exit 0
    Running --> Failed : container exits non-zero (restartPolicy=Never)
    Running --> CrashLoopBackOff : container restarts > threshold
    Running --> Terminating : kubectl delete (gracePeriod timer)
    Terminating --> [*] : SIGTERM → gracePeriod → SIGKILL → netns deleted
    CrashLoopBackOff --> Running : exponential backoff reset
    Running --> OOMKilled : cgroup memory.max exceeded → kernel OOM
    OOMKilled --> CrashLoopBackOff : kubelet restart

    note right of ContainerCreating
      1. RunPodSandbox (pause container)
      2. CNI ADD (network)
      3. PullImage
      4. CreateContainer
      5. StartContainer
    end note
```

---

## 7. kube-scheduler — Filter + Score Pipeline

Kubernetes Pod `status.phase` values are `Pending`, `Running`, `Succeeded`, `Failed`, and `Unknown`. `Scheduled` is a condition, while `ContainerCreating`, `CrashLoopBackOff`, `Terminating`, and `OOMKilled` are kubectl/container waiting or termination reasons. Alerting and automation must read the correct field rather than treating every label in the preceding UI-oriented state diagram as an API phase.

```mermaid
flowchart TD
    Watch["Watch: unscheduled Pod\n(spec.nodeName == \"\")"]
    Queue["PriorityQueue\n(sorted by Priority class)"]
    Snapshot["Cluster Snapshot\n(cached node/pod state)"]

    Filter["Filter Plugins (run in parallel per node)"]
    F1["NodeUnschedulable\n(node.spec.unschedulable)"]
    F2["NodeResourcesFit\n(cpu/mem requests vs allocatable)"]
    F3["NodeAffinity\n(requiredDuringScheduling)"]
    F4["PodTopologySpread\n(zone/host spread constraints)"]
    F5["TaintToleration\n(node taints vs pod tolerations)"]
    F6["VolumeBinding\n(PVC → PV affinity)"]

    Score["Score Plugins (0–100 per node)"]
    S1["LeastAllocated\n(prefer underutilized nodes)"]
    S2["NodeAffinity\n(preferred weights)"]
    S3["InterPodAffinity\n(co-location scoring)"]
    S4["ImageLocality\n(image already pulled?)"]

    Bind["Bind: write spec.nodeName via API"]

    Watch --> Queue --> Snapshot
    Snapshot --> Filter
    Filter --> F1 & F2 & F3 & F4 & F5 & F6
    F1 & F2 & F3 & F4 & F5 & F6 -->|"feasible nodes"| Score
    Score --> S1 & S2 & S3 & S4
    S1 & S2 & S3 & S4 -->|"weighted sum → top node"| Bind
```

---

## 8. kube-proxy — Service → Pod Packet Routing

### iptables mode (default)

```mermaid
flowchart TD
    Pkt["Packet: dst=10.96.0.10:80\n(ClusterIP)"]
    NAT["PREROUTING → KUBE-SERVICES chain"]
    SVC["KUBE-SVC-{hash}\n(Service: my-svc port 80)"]
    EP1["KUBE-SEP-{hash1} — 33% probability\nDNAT → 10.244.1.5:8080"]
    EP2["KUBE-SEP-{hash2} — 50% probability\nDNAT → 10.244.1.7:8080"]
    EP3["KUBE-SEP-{hash3} — 100% probability\nDNAT → 10.244.2.3:8080"]
    Route["route to Pod IP via overlay"]

    Pkt --> NAT --> SVC
    SVC -->|"iptables statistic match\n--mode random --probability 0.33"| EP1
    SVC --> EP2
    SVC --> EP3
    EP1 & EP2 & EP3 --> Route

    subgraph IPVS mode
        VIP["ipvs virtual server\n10.96.0.10:80"]
        RS1["real server 10.244.1.5:8080\n(weight=1)"]
        RS2["real server 10.244.1.7:8080\n(weight=1)"]
        VIP -->|"rr/lc/sh algorithm\nO(1) hash lookup"| RS1 & RS2
        Note1["iptables: O(n) chain traversal\nIPVS: O(1) hash table\n→ 10000+ services: IPVS wins"]
    end
```

---

## 9. Horizontal Pod Autoscaler — Control Loop

```mermaid
flowchart TD
    subgraph HPA Control Loop ["HPA Controller (15s interval)"]
        Fetch["Fetch metrics:\nmetrics-server (CPU/mem)\nor custom metrics API"]
        Calc["Compute desired replicas:\ndesiredReplicas = ceil(currentReplicas × (currentMetric / targetMetric))"]
        Scale["Scale Deployment:\nPATCH /scale subresource\n→ ReplicaSet controller → Pod creation"]
        Cool["Cooldown check:\nscaleDown: 5min stabilization window\nscaleUp: immediate (default)"]
    end

    subgraph metrics-server
        Kubelet["kubelet /stats/summary\n(cAdvisor → CPU/mem usage)"]
        Agg["metrics-server aggregates\n→ metrics.k8s.io API"]
    end

    Kubelet -->|"scrape every 15s"| Agg
    Agg --> Fetch
    Fetch --> Calc --> Cool --> Scale
    Scale -->|"if currentReplicas == desired: no-op"| Fetch
```

---

## 10. Persistent Volumes — CSI Driver Internals

```mermaid
sequenceDiagram
    participant User as kubectl apply PVC
    participant API as kube-apiserver
    participant PVC as PersistentVolumeClaim
    participant PVCtrl as PV Controller
    participant CSI as CSI Driver (external-provisioner)
    participant Node as kubelet (CSI node plugin)
    participant Storage as Storage Backend (EBS/Ceph/NFS)

    User->>API: create PVC (storageClass=ebs-sc, 10Gi)
    API->>PVC: PVC → Pending
    PVC->>PVCtrl: watch unbound PVCs
    PVCtrl->>CSI: CreateVolume RPC (capacity=10Gi, parameters)
    CSI->>Storage: provision volume (e.g. AWS CreateVolume API)
    Storage-->>CSI: volumeId=vol-0abc123
    CSI->>API: create PV (spec.csi.volumeHandle=vol-0abc123)
    PVCtrl->>API: bind PVC → PV
    Note over API: PVC → Bound

    kubelet->>CSI: NodeStageVolume (attach + format + mount to staging path)
    CSI->>Storage: attach block device to node
    kubelet->>CSI: NodePublishVolume (bind mount staging → pod volume path)
    CSI-->>kubelet: volume ready
    Note over Node: Pod container sees /data mounted
```

---

## 11. Kubernetes RBAC — Authorization Internals

The CSI sequence combines controller and node responsibilities. For attachable block storage, `ControllerPublishVolume` normally attaches the volume before `NodeStageVolume`; node staging formats/mounts the already attached device, and `NodePublishVolume` exposes it to the Pod. Drivers and access modes may omit staging or attachment, so success is determined by CSI calls and Pod/PVC events, not a fixed count of three RPCs.

```mermaid
flowchart TD
    Req["API Request:\nGET /apis/apps/v1/namespaces/default/deployments"]
    AuthN["Authentication:\n1. x509 client cert (CN=user, O=group)\n2. Bearer token (ServiceAccount JWT)\n3. OIDC token (id_token claim)\n→ UserInfo{username, groups, extra}"]
    AuthZ["Authorization: RBAC\nfor each (verb, resource, ns):\n  find matching ClusterRole/Role\n  via RoleBinding/ClusterRoleBinding\n  PolicyRule{verbs, resources, resourceNames}"]
    Admit["Admission Controllers (in-order):\n1. NamespaceLifecycle\n2. ResourceQuota\n3. LimitRanger\n4. PodSecurity (PSA)\n5. MutatingWebhook (inject sidecar)\n6. ValidatingWebhook (OPA/Gatekeeper)\n7. DefaultStorageClass"]
    Persist["etcd write / read response"]

    Req --> AuthN --> AuthZ --> Admit --> Persist

    subgraph RBAC Object Chain
        SA["ServiceAccount\nnginx-sa\n(namespace: default)"]
        RB["RoleBinding\nnginx-rb\nsubjects: [{kind:SA, name:nginx-sa}]\nroleRef: {kind:Role, name:pod-reader}"]
        Role["Role\npod-reader\nrules: [{verbs:[get,list], resources:[pods]}]"]
        SA --> RB --> Role
    end
```

---

## 12. StatefulSet — Ordered Deployment Internals

Admission plugins are not a universal fixed sequence matching the earlier numbered list. Built-in plugin enablement/order is apiserver-version/configuration-specific, mutating webhooks run before validating webhooks within defined phases, and webhook ordering within a configuration needs explicit review. Authorization also precedes admission and read requests do not follow the same mutation path as writes.

```mermaid
sequenceDiagram
    participant Ctrl as StatefulSet Controller
    participant API as kube-apiserver
    participant PVC as PVC per pod
    participant Pod as Pod-0, Pod-1, Pod-2

    Note over Ctrl: spec.replicas=3, podManagementPolicy=OrderedReady
    Ctrl->>API: create PVC volumeClaimTemplate → pvc-0
    Ctrl->>API: create Pod-0 (index 0, hostname=web-0)
    API-->>Pod: Pod-0 Running+Ready
    Ctrl->>API: create PVC → pvc-1
    Ctrl->>API: create Pod-1 (hostname=web-1)
    API-->>Pod: Pod-1 Running+Ready
    Ctrl->>API: create Pod-2 (hostname=web-2)
    API-->>Pod: Pod-2 Running+Ready

    Note over Ctrl: Scale down: reverse order
    Ctrl->>API: delete Pod-2 (wait for termination)
    Ctrl->>API: delete Pod-1
    Note over PVC: PVCs retained (not deleted on scale-down)

    Note over Pod: Stable network identity\nweb-0.web-svc.default.svc.cluster.local\nweb-1.web-svc.default.svc.cluster.local\nHeadless Service (clusterIP=None) gives one DNS A record per pod IP
```

---

## 13. Docker BuildKit — Layer Cache Internals

```mermaid
flowchart TD
    Dockerfile["Dockerfile\nFROM ubuntu:22.04\nRUN apt-get install...\nCOPY . /app\nRUN make build"]

    subgraph BuildKit DAG
        S0["llb.Image(ubuntu:22.04)\n(cache key: digest)"]
        S1["ExecOp: apt-get install\n(cache key: hash(parent + command + env))"]
        S2["FileOp: COPY . /app\n(cache key: hash(parent + file checksums))"]
        S3["ExecOp: make build\n(cache key: hash(parent + command))"]
        S0 --> S1 --> S2 --> S3
    end

    subgraph Cache Resolution
        Hit["cache hit:\nreuse snapshot from content store\n(skip execution)"]
        Miss["cache miss:\nexecute op → create new snapshot\n(overlayfs layer)"]
        S1 -->|"apt-get unchanged?"| Hit
        S2 -->|"source files changed?"| Miss
    end

    subgraph Parallel Build
        Multi["multi-stage FROM\nstage A and stage B\n→ executed in parallel by BuildKit\n(independent DAG branches)"]
    end
```

---

## 14. Kubernetes Network Policy — eBPF / iptables Enforcement

```mermaid
flowchart LR
    subgraph Calico eBPF dataplane
        TC_In["TC ingress hook\n(XDP or tc BPF)\nattached to veth"]
        BPF_Map["BPF map:\npolicy_map[{src_ip, dst_ip, proto, port}]\n→ {ALLOW/DENY}"]
        TC_Out["TC egress hook"]
        Pod_A["Pod A\n10.244.1.5"]
        Pod_B["Pod B\n10.244.1.7"]

        Pod_A -->|"egress pkt"| TC_Out
        TC_Out -->|"lookup policy_map"| BPF_Map
        BPF_Map -->|"ALLOW → forward"| TC_In
        TC_In --> Pod_B
    end

    subgraph NetworkPolicy Spec
        NP["NetworkPolicy:\nspec.podSelector: {app: backend}\ningress:\n  from: [{podSelector: {app: frontend}}]\n  ports: [{port: 8080}]"]
        Calico_Ctrl["Calico controller\nwatches NetworkPolicy\n→ compiles to BPF maps"]
        NP --> Calico_Ctrl --> BPF_Map
    end
```

---

## 15. Performance Characteristics Summary

These values are experiment candidates, not Kubernetes or OCI guarantees. A usable result must include kernel/runtime/Kubernetes/plugin versions, node and control-plane resources, image size/cache state, cluster size, packet size, rule/service count, storage latency, load generator, repetitions, loss/error rate, and percentiles.

```mermaid
block-beta
  columns 2
  block:startup["Container Startup Latency"]:1
    s1["runc create + start: ~100–300ms"]
    s2["Image pull (cached): 0ms"]
    s3["Image pull (1GB, 1Gbps): ~8s"]
    s4["Pod ready (pre-pulled): ~500ms–2s"]
  end
  block:net["Network Overhead"]:1
    n1["veth pair: ~5μs additional latency"]
    n2["VXLAN overhead: +50 bytes/pkt, ~10μs"]
    n3["iptables: O(n) rules; 10k svcs → ms delay"]
    n4["IPVS: O(1) hash; 10k svcs → μs"]
  end
  block:sched["Scheduler Throughput"]:1
    sc1["kube-scheduler: ~1000 pods/sec\n(single-threaded bind)"]
    sc2["Filter: parallel goroutine per node"]
    sc3["Score: parallel goroutine per node"]
    sc4["Preemption: O(pods × nodes)"]
  end
  block:etcd_perf["etcd Performance"]:1
    e1["Write latency: ~1–5ms (fsync WAL)"]
    e2["Read (linearizable): ~1ms"]
    e3["Watch fanout: ~10k watchers/obj"]
    e4["Recommended: <8GB data, SSD required"]
  end
```

---

## Key Takeaways

- **runc** is the OCI runtime that calls `clone()` with 6 namespace flags — containerd-shim survives runc exit to own the container process lifecycle
- **OverlayFS** copy-on-write means first write to any file in a lower layer copies the full inode to `upperdir` — large files incur a one-time copy penalty
- **etcd Raft** requires quorum (⌊n/2⌋+1) for every write — a 3-node cluster tolerates 1 failure; all k8s state is serialized through this path
- **kube-scheduler filter/score** runs plugin chains in parallel goroutines per node — binding is the only serial step
- **kube-proxy iptables mode** scales poorly: O(n) chain traversal for n services; IPVS uses kernel hash tables for O(1) lookup
- **CSI volumes** require 3 RPCs per pod: ControllerPublishVolume (attach), NodeStageVolume (format/mount to staging), NodePublishVolume (bind mount into pod)
- **HPA** computes desired = ceil(current × actual/target) — the stabilization window prevents thrashing on bursty metrics
