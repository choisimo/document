# Docker & Kubernetes Internals: Under the Hood

> Sources: CI/CD with Docker and Kubernetes (Semaphore), Everything Kubernetes (Stratoscale), Docker and Kubernetes for Java Developers, Cloud Container Engine Kubernetes Basics (Huawei), Container Management: Kubernetes vs Docker Swarm vs Mesos vs Amazon ECS

---

> **Reading contract:** This overview is for engineers tracing container and Kubernetes control paths. It assumes Linux containers and must name Docker/BuildKit, OCI runtime, Linux/cgroup mode, Kubernetes, CRI, CNI, CSI, and kube-proxy implementation before its internals are treated as facts. Diagrams show common defaults, not every managed cluster or eBPF data plane. A rollout is complete only when the image digest, admitted object revision, Ready endpoints, observed traffic, SLO window, and rollback result are recorded. Pull, admission, scheduling, probe, or traffic failures require bounded retries and then rollback or escalation.

## 1. What Makes a Container: Linux Kernel Primitives

In the Linux model used here, a container is a group of processes isolated and constrained by kernel features while sharing the host kernel. Some products also offer VM-backed or Windows isolation, so "no hypervisor" is not a universal container property.

```mermaid
block-beta
  columns 3
  block:vm["Virtual Machine"]:1
    columns 1
    A["App A"]
    B["Guest OS (full kernel)"]
    C["Hypervisor (KVM/VMware)"]
    D["Host Hardware"]
  end
  space
  block:ct["Container"]:1
    columns 1
    E["App B (process)"]
    F["Linux Namespaces + cgroups"]
    G["Host Kernel (shared)"]
    H["Host Hardware"]
  end
```

### Linux Namespaces — Isolation Boundaries

A container process can receive separate namespace views, but runtimes may share namespaces through host-network, host-PID, sidecar, or explicit namespace settings:

```mermaid
flowchart TD
  HOST["Host Kernel"]
  HOST --> PID["PID Namespace\nisolated process tree\ncontainer PID 1 = init"]
  HOST --> NET["NET Namespace\nisolated network stack\nvirtual eth pair (veth)"]
  HOST --> MNT["MNT Namespace\nisolated mount points\nrootfs overlay"]
  HOST --> UTS["UTS Namespace\nisolated hostname\n/etc/hostname per container"]
  HOST --> IPC["IPC Namespace\nisolated SysV IPC\nPOSIX message queues"]
  HOST --> USER["USER Namespace\nisolated UID/GID mapping\nrootless containers"]
  HOST --> CG["cgroups (not a namespace)\nCPU/memory/IO resource limits\nenforced by kernel scheduler"]
```

**cgroups** can enforce resource budgets. A 500m CPU limit represents half of one CPU's time averaged over the configured quota period, not permanent ownership of half a core. cgroup version, period, burst behavior, CPU set, and scheduler version determine throttling.

---

## 2. Docker Image Layers: OverlayFS Union Filesystem

Docker images are **content-addressed stacks of read-only layers** merged by OverlayFS (or AUFS on older systems) into a single unified view.

```mermaid
block-beta
  columns 1
  block:ul["upperdir (writable container layer — CoW)"]
    W["writes, new files, modifications go here"]
  end
  block:l4["layer 4 (read-only): APP entrypoint binary"]
    L4["sha256:a1b2c3... (content hash)"]
  end
  block:l3["layer 3 (read-only): pip/npm packages"]
    L3["sha256:d4e5f6..."]
  end
  block:l2["layer 2 (read-only): runtime (JDK/Python)"]
    L2["sha256:g7h8i9..."]
  end
  block:l1["layer 1 (read-only): base OS (debian/alpine)"]
    L1["sha256:j0k1l2..."]
  end
  block:merge["OverlayFS merged view"]
    M["union of all layers: upperdir shadows lowerdir on write"]
  end
```

### Copy-on-Write (CoW) Semantics

When a container writes to a file that exists in a lower read-only layer:

```mermaid
sequenceDiagram
  participant P as Container Process
  participant OFS as OverlayFS
  participant U as upperdir (writable)
  participant L as lowerdir (read-only layer)

  P->>OFS: open("/etc/nginx/nginx.conf", O_RDWR)
  OFS->>L: stat file in lowerdir
  L-->>OFS: file found (inode, blocks)
  OFS->>U: copy file blocks to upperdir
  U-->>OFS: copy complete
  OFS-->>P: fd pointing to upperdir copy
  P->>U: write new content
  Note over L: original unchanged forever
  Note over U: modified version lives in container layer
```

When the container is destroyed, upperdir is discarded. The lower layers (image) are immutable and shared across all containers using the same image — this is why 10 containers from the same image share layer storage.

### Build Cache Invalidation

```mermaid
flowchart LR
  D["Dockerfile instruction"] --> H["compute instruction hash\n(command text + parent layer hash)"]
  H --> C{cache hit?}
  C -- yes --> REUSE["reuse cached layer\nno rebuild"]
  C -- no --> BUILD["execute instruction\ncreate new layer\ninvalidate all downstream layers"]
  BUILD --> STORE["store layer in\n/var/lib/docker/overlay2/"]
```

`COPY` instructions invalidate cache when file content changes (checksum comparison). This is why `COPY requirements.txt .` + `RUN pip install` should precede `COPY . .` — changing app source code won't re-run slow dependency installs.

---

## 3. Container Runtime Stack

```mermaid
flowchart TD
  DC["docker CLI / kubectl"] --> DS["dockerd daemon (Docker API)"]
  DS --> CT["containerd (OCI lifecycle manager)"]
  CT --> RU["runc (low-level OCI runtime)"]
  RU --> CL["clone() syscall\nLinux namespaces created"]
  RU --> CG2["cgroups v2 hierarchy\nresource limits applied"]
  CL --> FS["OverlayFS mount\nimage layers + upperdir"]
  FS --> C["Container process running\nas isolated pid 1"]
```

**containerd** manages image pulls (from registry), snapshot management (OverlayFS layers), and delegates actual process spawning to **runc** via the OCI runtime spec. Kubernetes communicates with containerd via the **Container Runtime Interface (CRI)** gRPC protocol.

---

## 4. Kubernetes Control Plane: Full Internal Flow

```mermaid
flowchart TD
  K["kubectl apply -f deployment.yaml"]
  K --> API["API Server\n(kube-apiserver)\nHTTPS REST endpoint\nadmission webhooks\nOPA/Gatekeeper validation"]
  API --> ETCD["etcd\ndistributed KV store\nRaft consensus\nsource of truth for all cluster state"]
  ETCD --> CM["Controller Manager\n(kube-controller-manager)\nwatches etcd via list/watch\nDeployment controller, RS controller\nEndpoint controller, etc."]
  CM --> SCHED["Scheduler\n(kube-scheduler)\nwatches unbound pods\nscores nodes via predicates+priorities\nwrites spec.nodeName to etcd"]
  SCHED --> KL["kubelet on selected node\nwatches pod spec via API Server\ncalls containerd via CRI gRPC"]
  KL --> RT["containerd → runc\nnamespace + cgroup setup\nOverlayFS mount"]
  RT --> POD["Pod running on node\ncontainers started"]
```

### Admission Webhook Chain

```mermaid
sequenceDiagram
  participant U as kubectl
  participant API as API Server
  participant MUT as Mutating Webhook (e.g., Istio sidecar injector)
  participant VAL as Validating Webhook (e.g., OPA Gatekeeper)
  participant ETCD as etcd

  U->>API: POST /apis/apps/v1/deployments
  API->>API: authentication (mTLS/OIDC token)
  API->>API: authorization (RBAC check)
  API->>MUT: MutatingAdmissionWebhook (can modify object)
  MUT-->>API: patched object (e.g., sidecar container injected)
  API->>VAL: ValidatingAdmissionWebhook (can only approve/reject)
  VAL-->>API: 200 OK / 403 Forbidden
  API->>ETCD: persist object
  ETCD-->>API: resourceVersion assigned
  API-->>U: 201 Created
```

---

## 5. etcd: The Cluster's Single Source of Truth

```mermaid
stateDiagram-v2
  [*] --> Follower
  Follower --> Candidate: election timeout (150-300ms)\nno heartbeat from leader
  Candidate --> Leader: majority votes (quorum = N/2+1)
  Candidate --> Follower: higher term discovered
  Leader --> Follower: higher term or partition
  Leader --> Leader: heartbeat AppendEntries every 50ms
```

Kubernetes API objects are persisted through the API server to its configured storage, commonly etcd. Components consume API-server `list/watch` streams and may relist after expiration or disconnect; they do not receive raw etcd events directly. Reconciliation is level-based and must tolerate duplicate, delayed, and missed watch notifications.

---

## 6. ReplicaSet Label Selector Mechanics

A ReplicaSet does NOT track which pods it created by UUID. It performs a **label selector query** continuously:

```mermaid
flowchart LR
  RS["ReplicaSet\nspec.replicas: 3\nselector:\n  matchLabels:\n    app: nginx\n    version: v2"]
  RS --> Q["LIST pods WHERE\napp=nginx AND version=v2\n(like SQL SELECT)"]
  Q --> COUNT["count matching pods"]
  COUNT --> CMP{count == 3?}
  CMP -- "count < 3" --> CREATE["create new pod\nfrom spec.template"]
  CMP -- "count > 3" --> DELETE["delete oldest extra pod"]
  CMP -- "count == 3" --> IDLE["no action — desired state met"]
```

This label-based ownership means: if you **manually label** an unrelated pod with `app: nginx, version: v2`, the ReplicaSet will **adopt it** and potentially delete one of your intentional pods to maintain count=3.

---

## 7. Rolling Update: Deployment Controller State Machine

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Stable_v1: initial state\n3 pods on RS-v1
  Stable_v1 --> Transitioning: kubectl set image\nnew RS-v2 created (0 replicas)
  Transitioning --> Progressing: scale RS-v2 up by MaxSurge\nscale RS-v1 down by MaxUnavailable
  Progressing --> Progressing: repeat until\nRS-v2=3, RS-v1=0
  Progressing --> Stable_v2: all pods Ready\nRS-v1 kept at 0 (for rollback)
  Stable_v2 --> Stable_v1: kubectl rollout undo\nRS-v1 scaled back up
```

**MaxSurge=1, MaxUnavailable=0** (availability-oriented rollout configuration, not a zero-downtime guarantee):
- At no point can the total Ready pods drop below desired (3)
- One extra pod created (4 total briefly), then one old pod deleted
- Each new pod must pass readiness probe before proceeding

```mermaid
sequenceDiagram
  participant DC as Deployment Controller
  participant RSv1 as ReplicaSet v1 (3 pods)
  participant RSv2 as ReplicaSet v2 (0 pods)

  DC->>RSv2: scale to 1
  RSv2->>RSv2: pod v2-1 starts, passes readinessProbe
  DC->>RSv1: scale to 2
  RSv1->>RSv1: pod v1-3 terminated
  DC->>RSv2: scale to 2
  RSv2->>RSv2: pod v2-2 starts, passes readinessProbe
  DC->>RSv1: scale to 1
  DC->>RSv2: scale to 3
  RSv2->>RSv2: pod v2-3 passes readinessProbe
  DC->>RSv1: scale to 0
  Note over RSv1: RS-v1 kept (revision history for rollback)
```

---

## 8. Service Networking: kube-proxy iptables/IPVS

A **Service** is a stable virtual IP (ClusterIP) that load-balances to a dynamic set of pod IPs. There is no kernel load-balancer process — it's implemented via **iptables DNAT rules** (or IPVS in proxy mode).

```mermaid
flowchart TD
  PKT["packet to ClusterIP:80\n(e.g., 10.96.43.21:80)"]
  PKT --> PREROUTING["iptables PREROUTING chain"]
  PREROUTING --> KS["KUBE-SERVICES chain\nmatch destination IP:port"]
  KS --> SVC["KUBE-SVC-XXXXX chain\n(per-Service chain)\nstatistical load balance\n(1/N probability each rule)"]
  SVC --> SEP1["KUBE-SEP-AAAA\nDNAT to pod-1-IP:8080\n(e.g., 192.168.1.5:8080)"]
  SVC --> SEP2["KUBE-SEP-BBBB\nDNAT to pod-2-IP:8080"]
  SVC --> SEP3["KUBE-SEP-CCCC\nDNAT to pod-3-IP:8080"]
  SEP1 --> POD["Pod receives packet\non real IP:port"]
```

The Endpoint controller continuously watches pod events. When a pod fails readiness, its IP is removed from the Endpoints object, and kube-proxy removes that DNAT rule — **traffic stops before pod termination**.

### IPVS Mode (high pod count)

At 10,000+ services, iptables linear-scan becomes O(N). IPVS uses kernel hash tables for O(1) lookup:

```mermaid
block-beta
  columns 2
  block:ip["iptables mode"]:1
    I1["rule 1: match SVC-A → pod-1"]
    I2["rule 2: match SVC-A → pod-2"]
    I3["rule ...10000 rules scanned linearly"]
  end
  block:ipv["IPVS mode"]:1
    V1["IPVS virtual server table (hash)"]
    V2["O(1) lookup → backend real server"]
    V3["LB algorithms: rr, lc, sh, dh, wlc"]
  end
```

---

## 9. Ingress Controller: L7 HTTP Routing Internals

```mermaid
flowchart TD
  EXT["External traffic\nHTTPS :443"]
  EXT --> ING["Ingress Controller\n(nginx/envoy pod)\nTLS termination\n(cert-manager managed TLS secret)"]
  ING --> RR["nginx upstream routing rules\ngenerated from Ingress resource"]
  RR --> SVC_A["Service A (ClusterIP)\n/api/* → service-api:8080"]
  RR --> SVC_B["Service B (ClusterIP)\n/static/* → service-static:3000"]
  SVC_A --> PA["Pod A instances\n(kube-proxy DNAT)"]
  SVC_B --> PB["Pod B instances\n(kube-proxy DNAT)"]
```

The nginx ingress controller runs a **watch loop** on Ingress objects. When an Ingress is created/modified, nginx-ingress calls `nginx -s reload` (hot reload via Unix socket) — no dropped connections — updating its `upstream` blocks.

---

## 10. Persistent Volumes: CSI Driver Architecture

The Container Storage Interface (CSI) decouples Kubernetes from storage vendor implementations:

```mermaid
flowchart TD
  PVC["PVC: request 10Gi ReadWriteOnce\nstorageClassName: fast-ssd"]
  PVC --> SC["StorageClass\nprovisioner: ebs.csi.aws.com\nreclaimPolicy: Delete\nvolumeBindingMode: WaitForFirstConsumer"]
  SC --> PROV["CSI external-provisioner sidecar\ncalls CreateVolume RPC"]
  PROV --> DRIVER["CSI driver (aws-ebs-csi-driver)\ncreates EBS volume via AWS API"]
  DRIVER --> PV["PV object created\nspec.csi.volumeHandle: vol-0abc123\nstatus: Available"]
  PV --> BIND["PVC bound to PV\n(1:1 binding, immutable)"]
  BIND --> POD["Pod spec: volumeMounts\nCSI attaches EBS to node\n(NodeStage + NodePublish RPCs)\nblock device mounted at /data"]
```

**PV access modes** map to storage system capabilities:
- `ReadWriteOnce (RWO)`: one node mounts read/write — EBS, local SSD
- `ReadWriteMany (RWX)`: multiple nodes mount read/write — NFS, CephFS
- `ReadOnlyMany (ROX)`: multiple nodes read-only — shared config data

---

## 11. RBAC: Subject → Role → Resource Binding

```mermaid
flowchart LR
  SA["ServiceAccount: app-reader\n(namespace: production)"]
  SA --> RB["RoleBinding: app-reader-binding\nsubject: ServiceAccount/app-reader\nroleRef: Role/pod-reader"]
  RB --> R["Role: pod-reader\nrules:\n- apiGroups: [\"\"]\n  resources: [pods]\n  verbs: [get, list, watch]"]
  R --> AUTH["API Server RBAC authorizer\nrequest: GET /api/v1/namespaces/production/pods\n→ ALLOW"]
  R --> DENY["request: DELETE /api/v1/namespaces/production/pods/foo\n→ DENY 403"]
```

**ClusterRole vs Role**: Role is namespace-scoped; ClusterRole applies cluster-wide (e.g., node access, PV management). `ClusterRoleBinding` grants cluster-wide permissions; `RoleBinding` scopes a ClusterRole to a namespace.

---

## 12. StatefulSet vs Deployment: Identity Preservation

```mermaid
stateDiagram-v2
  direction LR
  state "Deployment (stateless)" as DEP {
    p1: pod-abc12
    p2: pod-def34
    p3: pod-ghi56
    note: random names, any pod replaceable
  }
  state "StatefulSet (stateful)" as STS {
    s0: mysql-0 (persistent identity)
    s1: mysql-1
    s2: mysql-2
    note: ordered creation 0→1→2\nordered deletion 2→1→0\nstable DNS: mysql-0.mysql.ns.svc.cluster.local\npersistent PVC bound to each ordinal
  }
```

StatefulSets guarantee:
1. **Stable network identity**: `$(podname).$(servicename).$(namespace).svc.cluster.local`
2. **Stable storage**: PVC `data-mysql-0` persists across pod restarts (not deleted on pod delete)
3. **Ordered rolling updates**: pod N+1 not updated until pod N is Running+Ready

---

## 13. Kubernetes vs Docker Swarm vs Mesos: Scheduler Architecture

```mermaid
block-beta
  columns 3
  block:K8s["Kubernetes"]:1
    columns 1
    KCP["Control Plane:\nAPI Server + etcd + Scheduler\n+ Controller Manager"]
    KN["Worker Nodes: kubelet + kube-proxy"]
    KS["Scheduling: predicate filter\n(resource fit, taints, affinity)\n+ priority scoring\n(bin-packing vs spreading)"]
  end
  block:SW["Docker Swarm"]:1
    columns 1
    SM["Manager Nodes:\nRaft consensus\norchestrateService tasks"]
    SN["Worker Nodes: receive tasks"]
    SS["Scheduling: spread strategy\nby default (even distribution)\nnaive compared to K8s"]
  end
  block:MS["Mesos + Marathon"]:1
    columns 1
    MM["Mesos Master:\ntwo-level scheduling\noffer-based resource delegation"]
    MN["Mesos Agents: report resources"]
    MSS["Marathon Scheduler:\nreceives resource offers\nlaunches Docker executor"]
  end
```

**Kubernetes two-phase scheduling** (predicates → priorities):
1. **Predicates** (hard filters): `NodeResourcesFit`, `PodFitsHostPorts`, `NodeAffinity`, `TaintToleration` — eliminates ineligible nodes
2. **Priorities** (soft scoring): `LeastRequestedPriority` (bin-pack), `BalancedResourceAllocation`, `InterPodAffinity` — scores remaining nodes 0-100, highest wins

---

## 14. Blue/Green and Canary Deployments: Label Selector Switch

Both advanced deployment strategies exploit K8s label selector mechanics — no special controller needed.

### Blue/Green

```mermaid
sequenceDiagram
  participant SVC as Service (selector: version=blue)
  participant BLUE as Deployment-blue (3 pods, version=blue)
  participant GREEN as Deployment-green (3 pods, version=green)

  Note over SVC,BLUE: 100% traffic → blue
  Note over GREEN: green deployed in parallel, not receiving traffic
  SVC->>SVC: patch selector: version=green
  Note over SVC,GREEN: 100% traffic switches to green instantly
  Note over BLUE: blue kept for instant rollback\ndelete when green stable
```

**Rollback**: patch selector back to `version=blue` — instantaneous, no pod restart.

### Canary

```mermaid
flowchart LR
  SVC["Service selector:\napp: frontend"] 
  SVC --> ST["Stable deployment\napp: frontend\n9 replicas\n→ 90% traffic"]
  SVC --> CN["Canary deployment\napp: frontend\n1 replica\n→ 10% traffic\n(proportional to replica count)"]
  CN --> MON["Monitor error rates\nlatency via Prometheus"]
  MON -- "healthy" --> SCALE["scale canary to 10\nscale stable to 0"]
  MON -- "bad metrics" --> ROLLBACK["delete canary deployment"]
```

---

## 15. CI/CD Pipeline: Container Lifecycle in Automation

```mermaid
flowchart LR
  GIT["git push\nfeature branch"]
  GIT --> CI["CI pipeline\n(Semaphore/Jenkins/GitHub Actions)"]
  CI --> BUILD["docker build -t app:$GIT_SHA .\n(layer cache from registry)"]
  BUILD --> TEST["docker run --rm app:$GIT_SHA\nnpm test / pytest / go test"]
  TEST --> PUSH["docker push registry/app:$GIT_SHA\n(push only new/changed layers)"]
  PUSH --> STAGING["kubectl set image deployment/app\napp=registry/app:$GIT_SHA\n--namespace=staging"]
  STAGING --> SMOKE["smoke tests\nreadiness probe gate"]
  SMOKE -- "pass" --> PROD["kubectl set image deployment/app\napp=registry/app:$GIT_SHA\n--namespace=production\n(rolling update)"]
  SMOKE -- "fail" --> RB["kubectl rollout undo\ndeployment/app"]
```

**Build-once, promote** principle: promote the same immutable image **digest**, not only a mutable tag or Git SHA. A digest identifies manifest content, while runtime configuration, secrets, platform-specific manifests, admission mutation, and node runtime can still change observed behavior.

---

## 16. Pod Lifecycle State Machine

```mermaid
stateDiagram-v2
  [*] --> Pending: pod created, scheduled to node
  Pending --> Init: init containers start (sequential)
  Init --> Running: all init containers exit 0\nmain containers start
  Running --> Succeeded: all containers exit 0 (Job)
  Running --> Failed: container exits non-zero\nrestartPolicy=Never
  Running --> Running: container restarts\n(restartPolicy=Always/OnFailure)\nExponential backoff: 10s→20s→40s→...→5min
  Running --> Terminating: SIGTERM sent\nterminationGracePeriodSeconds countdown
  Terminating --> [*]: SIGKILL if grace period exceeded
```

**Probe types and failure effects**:
- **livenessProbe** fails → container killed and restarted (CrashLoopBackOff if repeated)
- **readinessProbe** fails → pod IP removed from Endpoints (no traffic, pod stays Running)
- **startupProbe** fails → container killed (prevents liveness from firing during slow startup)

---

## 17. Network Policy: eBPF/iptables Packet Filter Architecture

```mermaid
flowchart TD
  POD_A["Pod A (namespace: prod)\nip: 192.168.1.5"]
  POD_B["Pod B (namespace: prod)\nip: 192.168.1.6"]
  POD_C["Pod C (namespace: test)\nip: 192.168.2.7"]

  NP["NetworkPolicy on Pod B:\nspec.ingress:\n- from:\n  - podSelector: {app: trusted}\n  namespaceSelector: {env: prod}"]

  POD_A -- "app=trusted label → ALLOW" --> NP
  NP --> POD_B
  POD_C -- "namespace=test → DENY" --> NP
```

NetworkPolicy is enforced by the **CNI plugin** (Calico, Cilium, WeaveNet). Cilium uses **eBPF programs** attached to network interfaces — no iptables rules, O(1) verdict lookup via BPF hash maps. Calico uses iptables chains injected per-NetworkPolicy.

---

## 18. Auto Scaling: HPA Control Loop

```mermaid
flowchart TD
  HPA["HPA Controller\n(kube-controller-manager)\nchecks every 15s"]
  HPA --> MS["Metrics Server\naggregates kubelet /metrics/resource"]
  MS --> CPU["current avg CPU utilization\nacross all pods"]
  CPU --> CALC["desired replicas =\nceil(currentReplicas × (currentUtil / targetUtil))\ne.g., 3 × (80% / 50%) = ceil(4.8) = 5"]
  CALC --> CMP{within min/max bounds?}
  CMP -- yes --> SCALE["patch Deployment.spec.replicas = 5"]
  CMP -- no --> CLAMP["clamp to minReplicas or maxReplicas"]
```

**Scale-down stabilization**: HPA waits 5 minutes before scaling down to prevent thrashing (yo-yo scaling). Scale-up has no stabilization delay — it acts immediately.

---

## Summary: Data Flow Through the Full Stack

```mermaid
flowchart TD
  DEV["Developer: git push"]
  DEV --> CICD["CI/CD pipeline\nbuilds Docker image layers\n(OverlayFS content-addressed)"]
  CICD --> REG["Container Registry\nstores layer blobs by sha256"]
  REG --> KUBCTL["kubectl apply\nDeployment spec → API Server"]
  KUBCTL --> ETCD["etcd (Raft)\ndesired state persisted"]
  ETCD --> CTRL["Deployment/RS Controller\nwatches etcd list/watch stream"]
  CTRL --> SCHED["Scheduler\npredicate filter + priority score\nselects node, writes nodeName"]
  SCHED --> KUBELET["kubelet on node\nwatches pod spec"]
  KUBELET --> CRI["containerd via CRI gRPC\npull image layers from registry"]
  CRI --> OFS["OverlayFS\nstacks read-only layers\n+ writable upperdir"]
  OFS --> NS["Linux namespaces created\n(PID, NET, MNT, UTS, IPC)"]
  NS --> CG["cgroups applied\n(CPU quota, memory limit)"]
  CG --> RUN["Container process running\nas isolated pid 1"]
  RUN --> SVC["kube-proxy iptables DNAT rules\nClusterIP → pod IPs\nload balanced"]
  SVC --> ING["Ingress controller (nginx)\nL7 HTTP routing\nTLS termination"]
  ING --> USER["User request served"]
```

The final diagram is one common Linux, containerd, OverlayFS, and kube-proxy path. Static pods, alternate runtimes, managed control planes, eBPF proxies, host networking, and server-side dry runs take different branches; trace the actual cluster before using it as an incident path.
