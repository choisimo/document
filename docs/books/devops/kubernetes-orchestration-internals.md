# Kubernetes Orchestration Internals: Under the Hood

> Sources: *Container Management: Kubernetes vs Docker Swarm, Mesos + Marathon, Amazon ECS* (eBook); *Everything Kubernetes: A Practical Guide* (Stratoscale); *Cloud Container Engine — Kubernetes Basics* (Huawei CCE, 2025)

---

## 1. The Control Plane: etcd as the Ground Truth

Every decision Kubernetes makes flows through a single source of truth: **etcd**, a distributed key-value store implementing the **Raft consensus algorithm**. When you `kubectl apply` a manifest, the journey begins not at the scheduler or kubelet — it begins at etcd.

```mermaid
flowchart TD
    CLI["kubectl apply -f pod.yaml"] -->|HTTPS/TLS| API["kube-apiserver\n:6443"]
    API -->|Authenticate + Authorize| AUTHN["RBAC / ServiceAccount\nToken Validation"]
    AUTHN -->|Admission Controllers| ADM["MutatingWebhook\nValidatingWebhook\nResourceQuota"]
    ADM -->|Write desired state| ETCD[("etcd\nRaft Cluster\n:2379")]
    ETCD -->|Watch notification| CTRL["kube-controller-manager\nDeployment Controller"]
    CTRL -->|Create ReplicaSet/Pod objects| ETCD
    ETCD -->|Watch: unscheduled pods| SCHED["kube-scheduler"]
    SCHED -->|Binding decision| ETCD
    ETCD -->|Watch: pod bound to node| KUBELET["kubelet (node agent)"]
    KUBELET -->|Pull image + start container| CRI["CRI: containerd / CRI-O"]
    CRI --> CGROUP["Linux cgroup namespace\nPID/Net/Mount isolation"]
```

The apiserver **never** writes to the scheduler or kubelet directly. Everything is **event-driven watch loops** — each component watches etcd for objects whose state it is responsible for reconciling.

### etcd Raft Internals

etcd stores Kubernetes objects as **serialized protobuf** under keys like `/registry/pods/default/nginx-abc123`. Raft ensures that writes are committed to a quorum (⌊n/2⌋ + 1) before returning success to the API server.

```mermaid
sequenceDiagram
    participant API as kube-apiserver
    participant L as etcd Leader
    participant F1 as etcd Follower 1
    participant F2 as etcd Follower 2

    API->>L: PUT /registry/pods/default/nginx (proto bytes)
    L->>L: Append to local WAL (Write-Ahead Log)
    par Raft AppendEntries
        L->>F1: AppendEntries RPC (log index N)
        L->>F2: AppendEntries RPC (log index N)
    end
    F1-->>L: ACK (success)
    F2-->>L: ACK (success)
    L->>L: Commit entry (quorum reached: 2/3)
    L-->>API: 200 OK (etcd revision R)
    L->>F1: Commit notification
    L->>F2: Commit notification
```

If the leader dies mid-write, Raft guarantees the partially-written entry is rolled back — the cluster elects a new leader and replays only committed log entries.

---

## 2. Scheduler Internals: Predicate and Priority Pipeline

The scheduler watches etcd for **Pending pods** (pods with no `spec.nodeName`). When found, it runs a two-phase pipeline to select a node.

```mermaid
flowchart LR
    subgraph FILTER["Phase 1: Filter (Predicates)"]
        P1["NodeResourcesFit\n(CPU/Memory requests)"]
        P2["NodeAffinity\n(label selectors)"]
        P3["PodTopologySpread\n(zone distribution)"]
        P4["TaintToleration\n(node taints)"]
        P5["VolumeBinding\n(PVC nodeAffinity)"]
    end
    subgraph SCORE["Phase 2: Score (Priorities)"]
        S1["LeastAllocated\n(spread load)"]
        S2["NodeAffinity score\n(preferred weight)"]
        S3["InterPodAffinity\n(co-location bonus)"]
        S4["ImageLocality\n(image already pulled)"]
    end
    PENDING["Pending Pod"] --> FILTER
    FILTER -->|Feasible nodes| SCORE
    SCORE -->|Highest score wins| BIND["Binding:\nPatch pod.spec.nodeName"]
    BIND --> ETCD[("etcd")]
```

**Filter phase** is O(nodes) — each predicate runs against all nodes. Infeasible nodes are eliminated immediately. **Score phase** normalizes each plugin's scores 0–100 and applies configured weights. The final score is a weighted sum.

### Resource Bin-Packing vs. Spreading

`LeastAllocated` scores nodes higher when they have *more* free resources — this spreads pods. `MostAllocated` scores nodes with *less* free resources — this bins-packs. The scheduler plugin framework lets you swap these.

```mermaid
stateDiagram-v2
    [*] --> PodCreated: kubectl apply
    PodCreated --> Pending: Pod object in etcd\nspec.nodeName = ""
    Pending --> Scheduled: Scheduler writes\nbinding to etcd
    Scheduled --> ContainerCreating: kubelet picks up pod\nstarts image pull
    ContainerCreating --> Running: All containers started
    Running --> Succeeded: All containers exit 0
    Running --> Failed: Container exit code != 0\nrestartPolicy=Never
    Running --> CrashLoopBackOff: Repeated failures\nexponential backoff
    Running --> Terminating: kubectl delete / preStop hook
    Terminating --> [*]: SIGTERM → grace period → SIGKILL
```

---

## 3. kubelet: The Node Agent's Internal Loop

The kubelet is the most complex component — it runs on every node and bridges the Kubernetes API with the container runtime (containerd/CRI-O) and Linux kernel.

```mermaid
flowchart TD
    WATCH["kubelet watches\nAPI server for pod specs\n(bound to this node)"] --> ADMIT["Pod Admission\n- resource limits check\n- QoS class assignment"]
    ADMIT --> CGROUPMGR["cgroup Manager\nCreate cgroup hierarchy:\n/kubepods/burstable/podUID/containerUID"]
    CGROUPMGR --> CRI_CALL["CRI gRPC call:\nRunPodSandbox (pause container)\nCreateContainer\nStartContainer"]
    CRI_CALL --> CNI["CNI Plugin Call:\nip netns create\nveth pair creation\nbridge/overlay attachment"]
    CNI --> PROBES["Probe Manager\nliveness: HTTP/TCP/Exec\nreadiness: HTTP/TCP/Exec\nstartup: HTTP/TCP/Exec"]
    PROBES --> STATUS["Status Manager\nPatch pod.status back\nto API server"]
    STATUS --> EVICT["Eviction Manager\nMonitor memory.available\nnodefs.available\nimagefs.available"]
```

### cgroup Hierarchy for Pod QoS

Kubernetes assigns each pod a **QoS class** based on resource requests/limits:

```
/sys/fs/cgroup/memory/kubepods/
├── guaranteed/          ← requests == limits for ALL containers
│   └── pod<UID>/
│       └── <containerID>/    memory.limit_in_bytes = N
├── burstable/           ← some containers have requests < limits
│   └── pod<UID>/
│       └── <containerID>/    memory.limit_in_bytes = limit
└── besteffort/          ← no requests or limits set
    └── pod<UID>/
        └── <containerID>/    memory.limit_in_bytes = node max
```

**OOM kill order**: BestEffort pods are killed first (OOM score adj = 1000), Burstable next (score adj proportional to limit/request ratio), Guaranteed last (score adj = -998).

```mermaid
block-beta
    columns 3
    A["Guaranteed QoS\nOOM adj: -998\nEviction: LAST"]:1
    B["Burstable QoS\nOOM adj: 2..999\nEviction: MIDDLE"]:1
    C["BestEffort QoS\nOOM adj: 1000\nEviction: FIRST"]:1
```

---

## 4. Container Runtime Interface (CRI): The Abstraction Layer

kubelet speaks **gRPC** to the CRI shim — it never calls Docker or containerd directly. The CRI defines two services: `RuntimeService` (pods/containers) and `ImageService` (pull/list/remove).

```mermaid
sequenceDiagram
    participant KL as kubelet
    participant CRI as containerd shim (CRI-O)
    participant RUNC as runc (OCI runtime)
    participant KERNEL as Linux Kernel

    KL->>CRI: RunPodSandbox(PodSandboxConfig)
    CRI->>KERNEL: clone(CLONE_NEWNET | CLONE_NEWUTS | CLONE_NEWIPC)
    KERNEL-->>CRI: pause container PID
    CRI-->>KL: PodSandboxID

    KL->>CRI: PullImage(ImageSpec)
    CRI->>CRI: Pull OCI layers → overlay2 mount
    CRI-->>KL: ImageRef

    KL->>CRI: CreateContainer(PodSandboxID, ContainerConfig)
    CRI->>RUNC: runc create (OCI spec JSON)
    RUNC->>KERNEL: mount overlay filesystem\nsetup cgroups\nsetup seccomp/apparmor
    RUNC-->>CRI: container ID

    KL->>CRI: StartContainer(ContainerID)
    CRI->>RUNC: runc start
    RUNC->>KERNEL: execve(entrypoint)
    KERNEL-->>CRI: PID 1 in container namespace
```

### Container Image Layers: Copy-on-Write Filesystem

```mermaid
flowchart BT
    subgraph OVERLAYfs["OverlayFS Mount"]
        UPPER["upperdir (read-write layer)\n/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/\nsnapshots/42/fs/"]
        WORK["workdir (atomic ops)"]
        LOWER3["lower layer 3: App binaries\n(sha256:abc...)"]
        LOWER2["lower layer 2: pip packages\n(sha256:def...)"]
        LOWER1["lower layer 1: base OS\n(sha256:ghi...)"]
    end
    LOWER1 --> LOWER2 --> LOWER3 --> UPPER
    UPPER -->|"merged view"| CONTAINER["Container sees unified /"]
```

When a container writes to a read-only lower layer, the kernel performs a **copy-up**: the file is copied to `upperdir` before modification. This means first-write latency includes the copy cost.

---

## 5. Kubernetes Networking: CNI and kube-proxy

### CNI Plugin Execution Flow

When the CRI creates a pod sandbox, it calls CNI plugins via exec (not gRPC):

```mermaid
sequenceDiagram
    participant CRI as containerd
    participant CNI as CNI Plugin (Calico/Flannel)
    participant NETNS as Linux netns
    participant BRIDGE as cni0 bridge / VXLAN

    CRI->>CNI: exec (ADD, netns path, pod name)
    CNI->>NETNS: ip netns exec <podNS> ip link add eth0 type veth
    CNI->>BRIDGE: Add veth peer to bridge / VTEP
    CNI->>NETNS: Assign pod CIDR IP to eth0
    CNI->>CNI: Install iptables/IPVS rules for pod IP
    CNI-->>CRI: Result JSON (IP, gateway, routes)
```

Each pod gets its own **network namespace** — a complete isolated TCP/IP stack. The `pause` container holds the namespace open so application containers can join it via `--net=container:<pause-PID>`.

### kube-proxy: Service to Pod Load Balancing

kube-proxy translates abstract Service VIPs into real pod endpoints using either **iptables** or **IPVS**:

```mermaid
flowchart LR
    CLIENT["Pod X\n10.0.0.5"] -->|dst: 10.247.124.252:8080| IPTABLES["iptables PREROUTING\nDNAT chain"]
    IPTABLES -->|Statistically select endpoint\n33% each| EP1["Pod 1: 172.16.3.6:80"]
    IPTABLES --> EP2["Pod 2: 172.16.2.132:80"]
    IPTABLES --> EP3["Pod 3: 172.16.3.10:80"]
    subgraph RULES["iptables rules (kube-proxy maintains)"]
        R1["-A KUBE-SVC-xxx -m statistic --mode random\n--probability 0.33 -j KUBE-SEP-1"]
        R2["-A KUBE-SVC-xxx -m statistic --mode random\n--probability 0.5 -j KUBE-SEP-2"]
        R3["-A KUBE-SVC-xxx -j KUBE-SEP-3"]
    end
```

**IPVS mode** (production recommended): instead of O(n²) iptables rules, IPVS maintains a hash table in the Linux kernel virtual server module — O(1) lookup per connection regardless of service count.

### DNS Resolution Internals (CoreDNS)

```mermaid
sequenceDiagram
    participant POD as Pod
    participant STUB as /etc/resolv.conf\nsearch default.svc.cluster.local
    participant COREDNS as CoreDNS (10.96.0.10)
    participant ETCD_DNS as etcd (Service objects)

    POD->>STUB: gethostbyname("nginx")
    STUB->>COREDNS: Query: nginx.default.svc.cluster.local A?
    COREDNS->>ETCD_DNS: Get Service nginx in namespace default
    ETCD_DNS-->>COREDNS: ClusterIP = 10.247.124.252
    COREDNS-->>STUB: A 10.247.124.252 (TTL 30s)
    STUB-->>POD: 10.247.124.252
```

---

## 6. Controllers: The Reconciliation Loop

All Kubernetes controllers share the same architectural pattern: **informers** (cached watches) feeding **work queues**, with reconcilers running in goroutines.

```mermaid
flowchart TD
    ETCD[("etcd")] -->|Watch stream| INFORMER["Informer (shared cache)\nList+Watch API objects\nlocal in-memory store"]
    INFORMER -->|Add/Update/Delete events| QUEUE["Rate-limited Work Queue\n(per controller)"]
    QUEUE --> RECONCILE["Reconcile Loop\nactualState vs desiredState"]
    RECONCILE -->|Create/Update/Delete objects| API["kube-apiserver"]
    API --> ETCD
    RECONCILE -->|Requeue on transient error| QUEUE
```

### Deployment Controller Deep Dive

When you update a Deployment's image, the Deployment Controller orchestrates a **rolling update** by managing ReplicaSets:

```mermaid
sequenceDiagram
    participant DC as Deployment Controller
    participant RS_OLD as ReplicaSet v1 (3 replicas)
    participant RS_NEW as ReplicaSet v2 (0 replicas)
    participant ETCD as etcd

    Note over DC: maxSurge=1, maxUnavailable=0
    DC->>RS_NEW: Scale up to 1 replica
    RS_NEW-->>DC: 1 pod Running (v2)
    DC->>RS_OLD: Scale down to 2 replicas
    RS_OLD-->>DC: 2 pods Running (v1)
    DC->>RS_NEW: Scale up to 2 replicas
    RS_NEW-->>DC: 2 pods Running (v2)
    DC->>RS_OLD: Scale down to 1 replica
    DC->>RS_NEW: Scale up to 3 replicas
    RS_NEW-->>DC: 3 pods Running (v2)
    DC->>RS_OLD: Scale down to 0 replicas
    Note over DC: Rolling update complete
```

The old ReplicaSet is retained (scaled to 0) to enable `kubectl rollout undo` — which simply scales the old RS back up.

---

## 7. StatefulSets: Stable Identity for Stateful Workloads

StatefulSets differ from Deployments in three critical ways:
1. **Stable network identity**: pod-0, pod-1, pod-2 — names are deterministic
2. **Ordered operations**: pods start/stop in strict order (0→1→2 up, 2→1→0 down)
3. **Persistent volume binding**: each pod gets its own PVC bound permanently

```mermaid
stateDiagram-v2
    [*] --> pod0_Pending: StatefulSet created
    pod0_Pending --> pod0_Running: pod-0 scheduled + started
    pod0_Running --> pod1_Pending: pod-0 Ready → start pod-1
    pod1_Pending --> pod1_Running: pod-1 scheduled + started
    pod1_Running --> pod2_Pending: pod-1 Ready → start pod-2
    pod2_Pending --> pod2_Running: pod-2 Ready
    pod2_Running --> [*]: All replicas ready

    state pod0_Running {
        [*] --> VolumeMount: PVC data-pod-0 bound
        VolumeMount --> NetworkID: DNS: pod-0.svc.ns.svc.cluster.local
    }
```

### Headless Service DNS for StatefulSets

A StatefulSet requires a **headless service** (`clusterIP: None`). CoreDNS creates A records for each pod individually:

```
pod-0.kafka.kafka-ns.svc.cluster.local → 172.16.0.10
pod-1.kafka.kafka-ns.svc.cluster.local → 172.16.0.11
pod-2.kafka.kafka-ns.svc.cluster.local → 172.16.0.12
```

Kafka brokers use these stable DNS names in their `advertised.listeners` — this is why StatefulSets are essential for stateful distributed systems.

---

## 8. Persistent Volume Subsystem: The Binding Protocol

```mermaid
sequenceDiagram
    participant DEV as Developer (PVC)
    participant CTRL as PersistentVolume Controller
    participant BINDER as Volume Binder (Scheduler)
    participant CSI as CSI Driver (EBS/Ceph/NFS)
    participant KUBELET as kubelet (node)

    DEV->>API: Create PVC (storage: 10Gi, ReadWriteOnce)
    CTRL->>CTRL: Find matching PV (capacity ≥ 10Gi,\naccessMode match, storageClass match)
    alt Static Binding
        CTRL->>PVC: Bind to existing PV
    else Dynamic Provisioning
        CTRL->>CSI: CreateVolume (10Gi, zone=us-east-1a)
        CSI-->>CTRL: VolumeID, access endpoint
        CTRL->>PV: Create PV object with VolumeID
        CTRL->>PVC: Bind PVC → PV
    end
    BINDER->>SCHEDULER: VolumeBinding predicate:\nnodes compatible with PV topology
    KUBELET->>CSI: NodeStageVolume (format if needed)
    KUBELET->>CSI: NodePublishVolume (bind-mount into pod)
    CSI-->>KUBELET: Volume mounted at /var/lib/kubelet/pods/<UID>/volumes/
```

---

## 9. Kubernetes vs Competing Orchestrators

### Architecture Comparison Matrix

```mermaid
block-beta
    columns 4
    H1["Feature"]:1 H2["Kubernetes"]:1 H3["Docker Swarm"]:1 H4["Mesos+Marathon"]:1
    R1["State Store"]:1 E1["etcd (Raft)"]:1 E2["Raft (Managers)"]:1 E3["ZooKeeper"]:1
    R2["Scheduling"]:1 S1["Predicate+Priority\nplugin framework"]:1 S2["Spread by default\nsimple constraints"]:1 S3["2-level: Mesos offers\n→ Marathon accepts"]:1
    R3["Service Discovery"]:1 D1["CoreDNS +\nkube-proxy"]:1 D2["DNS + VIP\ningress LB"]:1 D3["Marathon-LB\nMesos-DNS"]:1
    R4["Networking"]:1 N1["CNI plugins\n(Calico/Flannel)"]:1 N2["Overlay VXLAN\nbuilt-in"]:1 N3["No built-in\nuser-defined"]:1
    R5["Config Format"]:1 C1["YAML (rich types)\nCRD extensible"]:1 C2["docker-compose\nYAML"]:1 C3["Marathon JSON\nAPI"]:1
```

### Mesos Two-Level Scheduling

Mesos uses a **resource offer** model — fundamentally different from Kubernetes centralized scheduling:

```mermaid
sequenceDiagram
    participant MESOS as Mesos Master
    participant AGENT as Mesos Agent (node)
    participant MARATHON as Marathon Framework
    participant APP as App Task

    AGENT->>MESOS: RegisterSlave (CPUs=8, MEM=16G)
    MESOS->>MARATHON: ResourceOffer (4 CPUs, 8G, node-1)
    MARATHON->>MARATHON: Does any pending task fit?
    MARATHON->>MESOS: LaunchTask (2 CPUs, 4G, docker image)
    MESOS->>AGENT: LaunchTask
    AGENT->>APP: docker run (with cgroup limits)
    APP-->>AGENT: RUNNING
    AGENT-->>MESOS: StatusUpdate: RUNNING
    MESOS-->>MARATHON: StatusUpdate: RUNNING
```

The two-level model allows **multiple independent frameworks** (Marathon, Spark, Flink) to share the same cluster resources — Mesos is a datacenter-level resource abstraction.

---

## 10. Auto Scaling Internals: HPA and VPA

### Horizontal Pod Autoscaler (HPA) Control Loop

```mermaid
flowchart TD
    METRICS["metrics-server\nCPU/memory from kubelet\nCustom metrics from Prometheus adapter"] --> HPA["HPA Controller\n(reconcile every 15s)"]
    HPA -->|desiredReplicas = ceil(current × metric/target)| CALC["Scale Decision\nmin/max clamp applied"]
    CALC -->|scale up immediately| DEPLOY["Deployment / ReplicaSet"]
    CALC -->|scale down: wait 5min cooldown| DEPLOY
    DEPLOY --> PODS["Pod count changes"]
    PODS --> METRICS

    subgraph FORMULA["HPA Scaling Formula"]
        F1["desiredReplicas =\nceil(currentReplicas × (currentMetricValue / desiredMetricValue))"]
        F2["e.g.: 3 pods × (80% CPU / 50% target) = ceil(4.8) = 5 pods"]
    end
```

### RBAC Authorization: Token Flow

```mermaid
sequenceDiagram
    participant POD as Pod
    participant MOUNT as /var/run/secrets/kubernetes.io/serviceaccount/token
    participant API as kube-apiserver
    participant AUTHZ as RBAC Authorizer

    Note over MOUNT: TokenRequest API issues\nbound service account token\n(projected volume, TTL=1hr)

    POD->>API: GET /api/v1/namespaces/default/pods\nAuthorization: Bearer <token>
    API->>API: TokenReview: verify JWT signature\n(bound to pod UID + node)
    API->>AUTHZ: SubjectAccessReview:\nuser=system:serviceaccount:default:my-sa\nverb=get, resource=pods
    AUTHZ->>AUTHZ: Walk RoleBinding → Role → PolicyRule
    AUTHZ-->>API: allowed=true
    API-->>POD: 200 OK (pod list)
```

---

## 11. Ingress: External Traffic Routing

```mermaid
flowchart LR
    INTERNET["External Client"] -->|443/TLS| LB["Cloud LoadBalancer\n(NodePort 30443)"]
    LB --> NGINX_POD["nginx-ingress-controller pod\n(DaemonSet or Deployment)"]
    NGINX_POD -->|Watch Ingress objects| ETCD[("etcd")]
    NGINX_POD -->|Reload nginx.conf| NGINX["nginx process\nupstream blocks\nSSL termination"]
    NGINX -->|/api → svc-api:8080| SVC_A["Service: svc-api"]
    NGINX -->|/web → svc-web:80| SVC_B["Service: svc-web"]
    SVC_A --> PODS_A["API Pods"]
    SVC_B --> PODS_B["Web Pods"]

    subgraph RELOAD["nginx.conf upstream generation"]
        U1["upstream svc-api {\n  server 172.16.0.5:8080;\n  server 172.16.0.6:8080;\n}"]
    end
```

The ingress controller watches Ingress objects via informer; each add/update triggers nginx config regeneration and a graceful reload (`nginx -s reload` — no connection drops via master/worker hot-reload).

---

## 12. Node Failure and Pod Rescheduling

```mermaid
sequenceDiagram
    participant NODE as Worker Node
    participant KL as kubelet (on node)
    participant API as kube-apiserver
    participant NCM as Node Controller

    KL->>API: NodeHeartbeat (every 10s)
    Note over NODE: Node crashes / network partition
    NCM->>NCM: No heartbeat for 40s (node-monitor-grace-period)
    NCM->>API: Patch node.status.conditions:\nReady=Unknown
    NCM->>NCM: Wait 5min (pod-eviction-timeout)
    NCM->>API: Delete pods on Unknown node
    API->>ETCD: Delete pod objects
    SCHED["kube-scheduler"]-->API: Watch: pods Pending (no node)
    SCHED->>SCHED: Filter/Score healthy nodes
    SCHED->>API: Bind pod → new node
    API->>ETCD: Update pod.spec.nodeName
    KUBELET2["kubelet (new node)"]-->API: Watch: pod bound to me
    KUBELET2->>CRI2["containerd (new node)"]: Start containers
```

The 5-minute default eviction timeout means a node failure takes ~6 minutes to detect + reschedule. Tuning `node-monitor-period`, `node-monitor-grace-period`, and `pod-eviction-timeout` trades false-positive evictions against recovery speed.

---

## Summary: Data Flow Map

```mermaid
flowchart TD
    USER["User / CI System"] -->|kubectl / GitOps| API["kube-apiserver\n(validation + auth)"]
    API <-->|Read/Write proto| ETCD[("etcd cluster\nRaft consensus")]
    ETCD -->|Watch events| CTRL["Controller Manager\n(Deployment/RS/StatefulSet/Job)"]
    ETCD -->|Watch unscheduled pods| SCHED["Scheduler\n(filter + score)"]
    SCHED -->|Binding| ETCD
    ETCD -->|Watch node's pods| KUBELET["kubelet (per node)"]
    KUBELET -->|gRPC CRI| CONTAINERD["containerd"]
    CONTAINERD -->|OCI spec| RUNC["runc → Linux namespaces\ncgroups, seccomp"]
    KUBELET -->|exec| CNI["CNI plugin\n(network namespace)"]
    KUBELET -->|Probe HTTP/TCP| APP["Application containers"]
    KUBELET -->|Status patch| API
    API -->|Watch services| KPROXY["kube-proxy\n(iptables/IPVS)"]
    KPROXY -->|Route packets| APP
```

Every API call is authenticated, authorized, admitted, persisted to etcd, and then propagated through watch streams to the relevant controllers and node agents — no component holds authoritative state except etcd.
