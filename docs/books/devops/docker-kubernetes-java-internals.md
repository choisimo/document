# Docker and Kubernetes for Java Developers: Under the Hood

> Source: *Docker and Kubernetes for Java Developers* — Jaroslaw Krochmalski, Packt Publishing, 2017 (417 pages)

---

## 1. Docker Image Internals: Layered Filesystem Architecture

Every Docker image is a stack of immutable, read-only **content-addressable layers** stored as compressed tar archives (OCI Image Format). When you build a Java application image, each Dockerfile instruction generates a new layer identified by its SHA-256 digest.

```mermaid
flowchart BT
    subgraph IMAGE["Docker Image Layer Stack (java-app:1.0)"]
        L1["Layer 1 (SHA256:a1b2...)\nFROM openjdk:11-jre-slim\n~175MB — debian:buster-slim + JRE"]
        L2["Layer 2 (SHA256:c3d4...)\nRUN apt-get install curl\n~8MB — added binaries"]
        L3["Layer 3 (SHA256:e5f6...)\nCOPY target/app.jar /app/app.jar\n~25MB — JAR file"]
        L4["Layer 4 (SHA256:g7h8...)\nCOPY config/ /app/config/\n~2KB — config files"]
    end
    subgraph CONTAINER["Running Container"]
        RW["Read-Write Layer (upperdir)\nRuntime writes: logs, temp files"]
    end
    L1 --> L2 --> L3 --> L4 --> RW
```

### OverlayFS: How Layers Merge in the Kernel

```mermaid
flowchart TD
    subgraph OVERLAYFS["OverlayFS mount(2) syscall"]
        LOWER["lowerdir = layer1:layer2:layer3:layer4\n(all read-only image layers, colon-separated)"]
        UPPER["upperdir = container RW layer\n/var/lib/docker/overlay2/<id>/diff/"]
        WORK["workdir = atomic rename staging\n/var/lib/docker/overlay2/<id>/work/"]
        MERGED["merged = container's / view\n/var/lib/docker/overlay2/<id>/merged/"]
    end
    LOWER --> MERGED
    UPPER --> MERGED
    WORK --> MERGED
    MERGED --> CONTAINER_FS["Container sees unified / filesystem"]
```

**Copy-on-Write mechanics**: When a container modifies `/etc/hosts` (in lower layer), the kernel's `copy_up()` function:
1. Reads the file from the lowest layer containing it
2. Creates a full copy in `upperdir`
3. Applies the write to the copy
4. Subsequent reads hit `upperdir` first

This means **first write is expensive** (full file copy), subsequent writes are cheap.

### Dockerfile Layer Caching: The Build Cache Algorithm

```mermaid
sequenceDiagram
    participant DOCKER as docker build
    participant CACHE as Build Cache (content-addressed)
    participant REGISTRY as Base Registry

    DOCKER->>CACHE: FROM openjdk:11-jre-slim → SHA256:a1b2?
    CACHE-->>DOCKER: HIT (layer exists locally)
    DOCKER->>CACHE: RUN apt-get install curl → cache key = (parent_sha + instruction_text)
    CACHE-->>DOCKER: HIT
    DOCKER->>CACHE: COPY target/app.jar → cache key = (parent_sha + file_checksum)
    alt JAR changed
        CACHE-->>DOCKER: MISS (file checksum differs)
        DOCKER->>DOCKER: Execute COPY, create new layer
        Note over DOCKER: ALL subsequent layers invalidated
    else JAR unchanged
        CACHE-->>DOCKER: HIT
    end
```

**Java optimization**: Place `COPY target/app.jar` as late as possible. Dependencies rarely change; the JAR changes on every build. Split into:
```
COPY target/dependency/ /app/WEB-INF/lib/    # changes rarely → cache hit
COPY target/classes/ /app/WEB-INF/classes/   # changes often → only this misses
```

---

## 2. JVM Inside Containers: cgroup Memory Boundaries

Pre-Java 10, the JVM used `sysconf(_SC_PHYS_PAGES)` to discover total RAM — it read the **host** physical memory, not the container limit. This caused catastrophic heap sizing when a container with a 512MB limit ran on a 64GB host: the JVM would configure `MaxHeapSize = 64GB × 0.25 = 16GB`, triggering OOM kills immediately.

```mermaid
flowchart TD
    subgraph HOST["Linux Host (64GB RAM)"]
        subgraph CGROUP["cgroup: memory.limit_in_bytes = 512MB"]
            subgraph CONTAINER["Container"]
                JVM["JVM Process"]
                JVM -->|"Pre-Java 10:\nread /proc/meminfo → 64GB\nErgoMaxHeap = 16GB"| BAD["💥 OOM Kill\n(16GB > 512MB limit)"]
                JVM -->|"Java 11+:\nread /sys/fs/cgroup/memory/\nmemory.limit_in_bytes → 512MB\nErgoMaxHeap = 128MB"| GOOD["✅ Runs fine"]
            end
        end
    end
```

### cgroup v1 Memory Subsystem Paths (JVM reads)

```
/sys/fs/cgroup/memory/memory.limit_in_bytes     → container memory ceiling
/sys/fs/cgroup/memory/memory.usage_in_bytes     → current usage
/sys/fs/cgroup/memory/memory.memsw.limit_in_bytes → memory+swap ceiling
/sys/fs/cgroup/cpu/cpu.cfs_quota_us             → CPU allocation (microseconds/period)
/sys/fs/cgroup/cpu/cpu.cfs_period_us            → period window (default 100000 = 100ms)
```

**CPU throttling**: If `cfs_quota_us = 50000` and `cfs_period_us = 100000`, the container gets 0.5 CPUs. Java's `Runtime.getRuntime().availableProcessors()` historically returned the host count (e.g., 32), causing thread pools sized 32x too large.

```mermaid
block-beta
    columns 2
    A["JVM Flag\n-XX:+UseContainerSupport\n(Java 8u191+, default on)"]
    B["Effect\nReads cgroup limits\nSizes heap and thread pools\nfrom container constraints"]
    C["JVM Flag\n-XX:MaxRAMPercentage=75.0"]
    D["Effect\nHeap = 75% of container limit\nLeaves headroom for metaspace\nnon-heap, OS buffers"]
    E["JVM Flag\n-XX:ActiveProcessorCount=N"]
    F["Effect\nOverride CPU count for\nthread pool sizing\nForkJoinPool, GC threads"]
```

---

## 3. Docker Networking Internals: Linux Bridge and veth Pairs

When Docker starts a container, it creates an isolated network namespace and connects it to the `docker0` bridge via a **veth pair** (virtual Ethernet cable with two ends).

```mermaid
sequenceDiagram
    participant DOCKER_D as dockerd
    participant NETNS as Linux Network Namespace
    participant VETH as veth pair
    participant BRIDGE as docker0 bridge (172.17.0.1/16)
    participant IPTABLES as iptables NAT

    DOCKER_D->>NETNS: ip netns add container1
    DOCKER_D->>VETH: ip link add veth0 type veth peer name veth1
    DOCKER_D->>NETNS: ip link set veth1 netns container1
    DOCKER_D->>BRIDGE: ip link set veth0 master docker0
    DOCKER_D->>NETNS: ip addr add 172.17.0.2/16 dev veth1 (in container ns)
    DOCKER_D->>IPTABLES: MASQUERADE rule:\n172.17.0.0/16 → host IP (NAT)
    Note over BRIDGE: Container can reach internet\nvia NAT through host eth0
```

### Port Binding: DNAT Rule Creation

When you `docker run -p 8080:80`, Docker inserts iptables DNAT rules:

```mermaid
flowchart LR
    EXTERNAL["External request\n→ host:8080"] -->|PREROUTING chain| DNAT["iptables DNAT\n-j DNAT --to-destination 172.17.0.2:80"]
    DNAT --> CONTAINER["Container 172.17.0.2:80\n(Tomcat/Jetty)"]
    CONTAINER -->|Response| POSTROUTING["iptables MASQUERADE\nsrc=172.17.0.2 → src=host IP"]
    POSTROUTING --> EXTERNAL
```

### Docker Network Modes

```mermaid
stateDiagram-v2
    [*] --> bridge: docker run (default)\nPrivate subnet + NAT
    [*] --> host: docker run --network=host\nShares host network stack\nNo isolation
    [*] --> overlay: docker swarm / K8s\nVXLAN tunnel across hosts
    [*] --> none: docker run --network=none\nComplete network isolation

    bridge --> NET_NS: Own network namespace\n172.17.x.x/16 subnet
    host --> HOST_NS: No network namespace\n→ ports bind directly on host
    overlay --> VXLAN: VXLAN encapsulation\nUDP port 4789\nMulti-host communication
```

---

## 4. Docker Volumes: Persistent Storage Internals

Container filesystems are ephemeral — the `upperdir` is destroyed when the container is removed. Volumes bypass the overlay filesystem entirely, mounting host directories directly into the container's mount namespace.

```mermaid
flowchart TD
    subgraph HOST["Host Filesystem"]
        VOL_DIR["/var/lib/docker/volumes/mydb/_data/\n(actual data lives here)"]
        BIND_DIR["/home/user/data/ (bind mount)"]
    end
    subgraph CONTAINER["Container Mount Namespace"]
        OVERLAY["OverlayFS (container rootfs)\n/var/lib/docker/overlay2/..."]
        MOUNT_POINT["/var/lib/mysql/ (inside container)"]
        BIND_MOUNT["/app/data/ (inside container)"]
    end
    VOL_DIR -->|"mount --bind\n(kernel bind mount)"| MOUNT_POINT
    BIND_DIR -->|"mount --bind"| BIND_MOUNT
    Note["Volume writes bypass OverlayFS\nDirect syscalls to host ext4/xfs/btrfs\nNo copy-on-write overhead"]
```

**Named volume vs bind mount**: Named volumes are managed by Docker — Docker creates and owns the directory. Bind mounts reference arbitrary host paths. For Java apps, use named volumes for database files, bind mounts for development (live code reload).

---

## 5. Docker Compose: Multi-Container Dependency Graph

Docker Compose translates YAML dependency declarations into Docker network and container creation sequences:

```mermaid
sequenceDiagram
    participant COMPOSE as docker-compose up
    participant DOCKER as Docker Engine
    participant NETWORK as Docker Network
    participant DB as postgres container
    participant APP as java-app container

    COMPOSE->>DOCKER: Create network: myapp_default (bridge)
    COMPOSE->>DOCKER: Create + start postgres (depends_on order)
    DOCKER-->>DB: Running at 172.20.0.2
    COMPOSE->>DOCKER: Create + start java-app
    DOCKER->>APP: env: DB_HOST=postgres (service DNS name)
    Note over APP: CoreDNS resolves "postgres"\n→ 172.20.0.2 within the network
    APP->>DB: JDBC connection to postgres:5432
```

**`depends_on` vs health checks**: `depends_on` only waits for the container to *start*, not for the service to be *ready*. A Postgres container starts in milliseconds but needs seconds to initialize. Use `condition: service_healthy` with `HEALTHCHECK` instructions to gate Java app startup on actual DB readiness.

---

## 6. Kubernetes API Request Flow for Java Applications

When a Java microservice running in a pod calls the Kubernetes API (e.g., to discover other services):

```mermaid
sequenceDiagram
    participant JAVA as Java App (pod)
    participant SA as ServiceAccount Token\n/var/run/secrets/kubernetes.io/serviceaccount/token
    participant API as kube-apiserver
    participant AUTHN as Token Authenticator
    participant AUTHZ as RBAC Authorizer
    participant ETCD as etcd

    JAVA->>SA: Read JWT token (auto-mounted)
    JAVA->>API: GET /api/v1/namespaces/default/services\nAuthorization: Bearer <JWT>
    API->>AUTHN: Verify JWT (bound to pod UID + node name)
    AUTHN-->>API: user = system:serviceaccount:default:my-sa
    API->>AUTHZ: Can my-sa GET services in default namespace?
    AUTHZ->>AUTHZ: Walk: ServiceAccount → RoleBinding → Role → verbs
    AUTHZ-->>API: allowed=true
    API->>ETCD: GET /registry/services/default/...
    ETCD-->>API: service objects (proto)
    API-->>JAVA: 200 JSON (service list)
```

### RBAC Authorization Internals

```mermaid
flowchart LR
    SA["ServiceAccount\n(my-sa in default ns)"] -->|subject| RB["RoleBinding\n(my-sa-binding)"]
    RB -->|roleRef| ROLE["Role\n(service-reader)"]
    ROLE -->|rules| RULES["- apiGroups: ['']\n  resources: ['services']\n  verbs: ['get', 'list', 'watch']"]
    SA2["ServiceAccount\n(admin-sa)"] -->|subject| CRB["ClusterRoleBinding"]
    CRB -->|roleRef| CR["ClusterRole\n(cluster-admin)"]
    CR -->|rules| CRULES["- apiGroups: ['*']\n  resources: ['*']\n  verbs: ['*']"]
```

**RBAC evaluation**: The RBAC authorizer performs a set intersection — it checks if the requested `{verb, resource, apiGroup, namespace}` tuple is covered by any PolicyRule reachable from the authenticating subject via RoleBinding/ClusterRoleBinding chains. There are **no deny rules** — only allow rules. Permissions are additive across all bindings.

---

## 7. Kubernetes Deployment Pipeline for Java Applications

```mermaid
flowchart TD
    subgraph CI["CI Pipeline"]
        BUILD["mvn package\n(compile + test)"]
        DOCKER_BUILD["docker build\n(Dockerfile: COPY JAR → JRE image)"]
        PUSH["docker push registry/app:git-sha"]
    end
    subgraph CD["CD Pipeline"]
        KUBECTL["kubectl set image deployment/app\napp=registry/app:new-sha"]
        ROLLOUT["Deployment Controller\n(rolling update)"]
        WATCH["kubectl rollout status\nwatch pod Ready conditions"]
    end
    subgraph K8S["Kubernetes Cluster"]
        RS_OLD["ReplicaSet v1\n(image: old-sha) → scale down"]
        RS_NEW["ReplicaSet v2\n(image: new-sha) → scale up"]
        POD_LIFECYCLE["Pod: ContainerCreating → Running → Ready"]
    end
    BUILD --> DOCKER_BUILD --> PUSH --> KUBECTL --> ROLLOUT
    ROLLOUT --> RS_NEW
    RS_OLD -.->|"scale to 0 after v2 Ready"| ROLLOUT
    RS_NEW --> POD_LIFECYCLE
```

### Java App Readiness: Why Startup Probes Matter

```mermaid
stateDiagram-v2
    [*] --> ContainerCreating: Image pulled, container created
    ContainerCreating --> Running: Container PID 1 started (JVM init)
    Running --> StartupProbe: startupProbe checks /health\nevery 10s, up to 30 failures (5min)
    StartupProbe --> LivenessActive: Startup probe passed\n(JVM fully initialized, app ready)
    StartupProbe --> Restarting: 30 failures × 10s = 300s timeout\n(JVM too slow to start)
    LivenessActive --> LivenessProbe: Liveness: /health every 30s
    LivenessProbe --> Running: probe passes
    LivenessProbe --> Restarting: 3 consecutive failures\n(deadlock / OOM)
    Running --> ReadinessProbe: Readiness: /health/ready every 10s
    ReadinessProbe --> ReadyForTraffic: probe passes\n(pod added to Service endpoints)
    ReadyForTraffic --> NotReady: probe fails\n(pod removed from endpoints\nno new connections)
```

**Java startup issue**: Spring Boot applications can take 20-60 seconds to initialize on cold start (classpath scanning, bean wiring, DB connection pool). Without a `startupProbe`, the `livenessProbe` fires during initialization and **kills the app in a restart loop**. The startup probe suspends liveness checks until the app is confirmed started.

---

## 8. Service Discovery: How Java Microservices Find Each Other

```mermaid
flowchart TD
    subgraph JAVA_APP["Java App Pod"]
        HTTP_CLIENT["RestTemplate / WebClient / Feign"]
        DNS_LOOKUP["InetAddress.getByName('payment-service')\n→ gethostbyname → /etc/resolv.conf"]
    end
    subgraph RESOLV["/etc/resolv.conf (injected by kubelet)"]
        SEARCH["search default.svc.cluster.local svc.cluster.local cluster.local"]
        NAMESERVER["nameserver 10.96.0.10 (CoreDNS ClusterIP)"]
    end
    subgraph COREDNS["CoreDNS"]
        QUERY["payment-service.default.svc.cluster.local A?"]
        ETCD_WATCH["Watch Service objects in etcd"]
        RETURN_IP["A 10.247.45.88 (ClusterIP)"]
    end
    subgraph KUBE_PROXY["kube-proxy (iptables/IPVS)"]
        DNAT["DNAT: 10.247.45.88:8080 → random pod endpoint"]
    end
    HTTP_CLIENT --> DNS_LOOKUP --> RESOLV --> COREDNS --> RETURN_IP
    RETURN_IP --> DNAT --> TARGET_POD["Payment Service Pod"]
```

**Environment variable injection**: Kubernetes also injects `SERVICE_NAME_SERVICE_HOST` and `SERVICE_NAME_SERVICE_PORT` environment variables for every service that existed when the pod started. These are a legacy mechanism; DNS is preferred because it works for services created after pod startup.

---

## 9. ConfigMaps and Secrets: How Configuration Reaches Java Apps

```mermaid
sequenceDiagram
    participant ADMIN as kubectl apply -f config.yaml
    participant API as kube-apiserver
    participant ETCD as etcd (encrypted at rest with AES-CBC)
    participant KUBELET as kubelet
    participant CONTAINER as Java Container

    ADMIN->>API: Create Secret (type: Opaque, data: base64 encoded)
    API->>ETCD: Write encrypted to /registry/secrets/default/db-password
    KUBELET->>API: Watch: pods needing this secret
    KUBELET->>KUBELET: Create tmpfs mount (in-memory, not on disk)
    KUBELET->>CONTAINER: Mount /var/run/secrets/db-password/\n(tmpfs — disappears on pod termination)
    Note over CONTAINER: Java reads:\nFiles.readString(Path.of("/var/run/secrets/db-password/password"))
    Note over ETCD: Secrets base64-encoded in etcd by default\nenable --encryption-provider-config for real AES-CBC encryption
```

### Environment Variable vs Volume Mount

```mermaid
block-beta
    columns 2
    A["env: valueFrom: secretKeyRef\n\nPros: Simple, Spring @Value works\nCons: Visible in /proc/<pid>/environ\nNo auto-update on secret rotation"]
    B["volumeMounts: /var/run/secrets/\n\nPros: Files on tmpfs (not in env)\nAuto-updated when secret rotates\nCons: App must re-read file on change"]
```

---

## 10. Persistent Java State in Kubernetes: StatefulSets + PVCs

```mermaid
flowchart TD
    subgraph STS["StatefulSet: kafka (3 replicas)"]
        POD0["kafka-0\nenv: KAFKA_BROKER_ID=0"]
        POD1["kafka-1\nenv: KAFKA_BROKER_ID=1"]
        POD2["kafka-2\nenv: KAFKA_BROKER_ID=2"]
    end
    subgraph PVCS["PersistentVolumeClaims (per-pod)"]
        PVC0["data-kafka-0 (10Gi)"]
        PVC1["data-kafka-1 (10Gi)"]
        PVC2["data-kafka-2 (10Gi)"]
    end
    subgraph STORAGE["Storage Backend"]
        EBS0["AWS EBS vol-aaa (zone us-east-1a)"]
        EBS1["AWS EBS vol-bbb (zone us-east-1b)"]
        EBS2["AWS EBS vol-ccc (zone us-east-1c)"]
    end
    POD0 --> PVC0 --> EBS0
    POD1 --> PVC1 --> EBS1
    POD2 --> PVC2 --> EBS2
    NOTE["PVCs survive pod deletion.\nkafka-0 always gets data-kafka-0.\nKafka commit log persists across restarts."]
```

### CSI Volume Attachment Flow (AWS EBS → Java Pod)

```mermaid
sequenceDiagram
    participant SCHED as Scheduler
    participant CSI_CTRL as CSI Controller (aws-ebs-csi-driver)
    participant AWS as AWS EC2 API
    participant KUBELET as kubelet (node agent)
    participant CSI_NODE as CSI Node Plugin
    participant JAVA as Java Process (kafka-0)

    SCHED->>CSI_CTRL: VolumeAttachment: attach vol-aaa to node-1
    CSI_CTRL->>AWS: AttachVolume (vol-aaa, instance-id-node-1)
    AWS-->>CSI_CTRL: device=/dev/xvdba
    KUBELET->>CSI_NODE: NodeStageVolume (format if needed: mkfs.ext4)
    KUBELET->>CSI_NODE: NodePublishVolume\n(bind-mount /dev/xvdba → /var/lib/kubelet/pods/<UID>/volumes/)
    KUBELET->>JAVA: Container sees /var/lib/kafka/data/\n(actual EBS block device, ext4 formatted)
```

---

## 11. Horizontal Pod Autoscaling for Java Services

```mermaid
flowchart TD
    KUBELET["kubelet\n(cAdvisor metrics)"] -->|CPU/memory usage per pod| METRICS_SERVER["metrics-server\n(in-cluster aggregator)"]
    METRICS_SERVER -->|Metrics API| HPA["HPA Controller\n(reconcile every 15s)"]
    PROM["Prometheus\n(custom metrics)"] -->|custom-metrics API| HPA
    HPA -->|"desiredReplicas =\nceil(current × actual/target)"| DEPLOY["Deployment"]
    DEPLOY --> PODS["Pod count adjusted"]
    PODS --> KUBELET

    subgraph FORMULA["HPA Formula Example"]
        EX["3 pods × (80% CPU / 50% target)\n= ceil(3 × 1.6) = ceil(4.8) = 5 pods"]
    end
```

**Java-specific consideration**: JVM CPU usage spikes during GC. If a full GC pause consumes 100% CPU for 200ms, HPA may scale out unnecessarily. Use JVM GC metrics (e.g., `jvm_gc_pause_seconds`) as custom HPA metrics rather than raw CPU for more stable scaling behavior.

---

## 12. Docker + Kubernetes Build Pipeline: Complete Data Flow

```mermaid
flowchart LR
    subgraph DEV["Developer Machine"]
        CODE["Java Source\nsrc/main/java/..."]
        MVN["mvn clean package\n→ target/app.jar"]
        DOCKERFILE["Dockerfile:\nFROM openjdk:11-jre-slim\nCOPY target/app.jar /app/\nENTRYPOINT java -jar /app/app.jar"]
    end
    subgraph CI["CI/CD (Jenkins/GitHub Actions)"]
        BUILD["docker build -t registry/app:${GIT_SHA} ."]
        TEST["docker run --rm integration-tests"]
        PUSH["docker push registry/app:${GIT_SHA}"]
        DEPLOY["kubectl set image deployment/app app=registry/app:${GIT_SHA}"]
    end
    subgraph K8S["Kubernetes Cluster"]
        PULL["kubelet pulls image\nfrom registry (TLS)"]
        UNPACK["containerd unpacks layers\n→ overlay2 snapshots"]
        CGROUPSETUP["cgroup hierarchy created\n/kubepods/burstable/pod<UID>/<containerID>"]
        JVM_START["JVM starts:\n-XX:+UseContainerSupport\nReads memory.limit_in_bytes\nSizes heap accordingly"]
        PROBES["liveness + readiness probes\nHTTP GET /actuator/health"]
        SERVICE["Service endpoints updated\nkube-proxy iptables rules installed"]
    end
    CODE --> MVN --> DOCKERFILE --> BUILD --> TEST --> PUSH --> DEPLOY
    DEPLOY --> PULL --> UNPACK --> CGROUPSETUP --> JVM_START --> PROBES --> SERVICE
```

---

## 13. Kubernetes Networking for Java: Service Types Internals

```mermaid
flowchart TD
    JAVA_CLIENT["Java Client\n(RestTemplate calling payment-svc)"] --> CLUSTER_IP["ClusterIP Service\n10.247.45.88:8080\n(virtual, not a real host)"]

    CLUSTER_IP -->|"kube-proxy iptables chain\nKUBE-SVC-xxx"| EP_SEL["Endpoint Selection\nStatistical load balancing"]
    EP_SEL --> POD_A["payment-pod-1\n172.16.0.10:8080"]
    EP_SEL --> POD_B["payment-pod-2\n172.16.0.11:8080"]
    EP_SEL --> POD_C["payment-pod-3\n172.16.0.12:8080"]

    EXTERNAL["External Java Client\n(outside cluster)"] --> NODE_PORT["NodePort\nnode-ip:30080"]
    NODE_PORT -->|DNAT| CLUSTER_IP

    CLOUD_LB["Cloud LoadBalancer\n(AWS NLB / GCP GLB)"] --> NODE_PORT
```

**Session affinity**: Setting `service.spec.sessionAffinity: ClientIP` instructs kube-proxy to create iptables rules using the `-m recent` module to track client IP → backend pod mappings (default 10800s timeout). Java apps using sticky sessions (e.g., HTTP session state) need this to avoid request scattering across pods.

---

## Summary: JVM-in-Container Mental Model

```mermaid
flowchart TD
    subgraph KERNEL["Linux Kernel"]
        CGROUP["cgroup: memory.limit_in_bytes = 512MB\ncpu.cfs_quota_us = 50000 (0.5 CPU)"]
        NETNS["Network namespace:\nveth0 ↔ cni0 bridge\npod CIDR: 172.16.x.x"]
        MNTNS["Mount namespace:\nOverlayFS rootfs\nVolume bind-mounts (tmpfs for secrets)"]
        PIDNS["PID namespace:\nJVM = PID 1 inside container"]
    end
    subgraph JVM["JVM Process"]
        HEAP["-Xmx = MaxRAMPercentage × 512MB\n= 384MB heap"]
        NONHEAP["Non-heap:\nMetaspace (class metadata)\nCode cache (JIT compiled)\nThread stacks (512KB each)"]
        GC["GC threads = min(ActiveProcessorCount, 8)"]
    end
    CGROUP -->|constrains| JVM
    NETNS -->|routes| JAVA_NET["Java network I/O\n(HTTP, JDBC, Kafka)"]
    MNTNS -->|provides| JAVA_FS["Java file I/O\n(config reads, log writes)"]
    PIDNS -->|hosts| JVM
```

The JVM must always be treated as a **cgroup-aware process**. Container resource limits are not hints — they are hard kernel enforcement boundaries. A JVM that ignores them will be OOM-killed by the kernel's memory reclaim machinery, not by a graceful Java exception.
