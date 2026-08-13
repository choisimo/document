# Edge Computing Container Architectures: Docker vs. Kubernetes for Real-Time Robotics

> **Under the Hood** — How containers orchestrate closed-loop control systems at the edge: namespace isolation, network routing, scheduling latency, and MPC feedback timing across ROS message buses.

---

> **Reading contract:** This is a scenario analysis for ROS, MPC, Docker, and Kubernetes at the edge, not a flight-safety design or a general benchmark. The numerical comparison is evidence only for its original hardware, ROS version, topology, solver, workload, sample count, and percentile, none of which are fully recorded here. Readers must separate measured values from causal hypotheses. A control deployment is complete only after worst-case execution time, end-to-end age, jitter, deadline misses, actuator failsafe, recovery time, and rollback are demonstrated under load. A missed deadline is a safety failure, not a retry opportunity inside the same control period.

## 1. The Edge Computing Compute Model

Edge computing places compute near sensors and actuators to reduce, not eliminate, network delay and jitter. Whether cloud or edge execution can support a closed loop depends on the control period, worst-case age of data, loss behavior, solver deadline, stability analysis, and onboard fallback.

```mermaid
flowchart LR
    subgraph UAV["UAV (Robot Side)"]
        SENSOR["IMU + GPS\nSensor Fusion"]
        ODOM["Odometry\nPublisher\n/odometry topic"]
        CTRL["Attitude\nController\n(low-level)"]
        ACTUATOR["Motor ESCs\nThrust + Roll + Pitch"]
    end
    subgraph EDGE["Edge Node (Container Side)"]
        MPC["MPC Node\nOptimization Engine\n100Hz, N=100"]
        ROSMASTER["ROS Master\nTopic Registry"]
    end
    SENSOR --> ODOM
    ODOM -- "x(k), TCP WiFi\nd1=9-14ms" --> MPC
    MPC -- "u(k), TCP WiFi\nd3=13-18ms" --> CTRL
    CTRL --> ACTUATOR
    ROSMASTER -.->|"register\nnodes"| MPC
    ROSMASTER -.->|"register\nnodes"| ODOM
    style EDGE fill:#1a3a5c,color:#fff
    style UAV fill:#2d4a1e,color:#fff
```

**Round-trip timing formula:**

```
T_rtt = T_robot→edge + T_mpc_exec + T_edge→robot
Docker RTT:     14.2ms + 16.1ms + 17.6ms = ~47.9ms
Kubernetes RTT:  9.5ms + 16.9ms + 13.1ms = ~39.5ms
```

---

## 2. Container Isolation Architecture: What Actually Gets Isolated

Both Docker and Kubernetes use the same Linux kernel primitives for container isolation. Understanding which namespaces exist and which are shared is critical for ROS networking.

```mermaid
flowchart TD
    subgraph HOST["Host Kernel"]
        PID_NS["PID Namespace\nProcess tree isolation\nContainers see PID 1 = entrypoint"]
        MNT_NS["Mount Namespace\nOverlayFS filesystem view\nper-container /proc /sys"]
        UTS_NS["UTS Namespace\nhostname + domainname"]
        IPC_NS["IPC Namespace\nShared memory, semaphores\nisolated per container"]
        NET_NS["NET Namespace\nVirtual network interface\nveth pair, private IP"]
        USER_NS["User Namespace\nUID/GID mapping\nroot-in-container ≠ root-on-host"]
        CGROUP["cgroups v2\nCPU, Memory, I/O\nThrottling + Accounting"]
    end
    subgraph ROS_ISSUE["ROS Networking Problem"]
        PRIVATE_IP["Container gets\nprivate subnet IP\ne.g. 172.17.0.2"]
        ROS_COMM["ROS communicates\nvia random TCP ports\nbetween nodes"]
        MISMATCH["Port mismatch:\ncontainer registers\ncontainer IP, not host IP"]
    end
    NET_NS --> PRIVATE_IP
    PRIVATE_IP --> MISMATCH
    ROS_COMM --> MISMATCH
    style HOST fill:#1a1a2e,color:#fff
    style ROS_ISSUE fill:#4a1a1a,color:#fff
```

### The `--network=host` Fix: Bypassing NET Namespace

```mermaid
flowchart LR
    subgraph DEFAULT["Default Network Mode"]
        C1["Container\nveth0: 172.17.0.2\nports: random"]
        BRIDGE["docker0 bridge\n172.17.0.1"]
        HOST_IF["Host interface\neth0: 192.168.1.10"]
        C1 -->|"veth pair"| BRIDGE --> HOST_IF
    end
    subgraph HOST_NET["--network=host Mode"]
        C2["Container\nshares host NET namespace\nth0: 192.168.1.10\nports: directly on host"]
        HOST_IF2["Host interface\neth0: 192.168.1.10"]
        C2 -.->|"same namespace\nno veth"| HOST_IF2
    end
    style DEFAULT fill:#3a2a1a,color:#fff
    style HOST_NET fill:#1a3a1a,color:#fff
```

With `--network=host`, the container's ROS master registers itself on the host's actual IP (e.g., `192.168.1.10`) instead of a private Docker subnet IP, enabling cross-device ROS topic subscription to work correctly over WiFi.

---

## 3. Docker Single-Node Edge Architecture: Internal Data Flow

```mermaid
sequenceDiagram
    participant UAV as UAV (Gazebo/ROS)
    participant ROSCORE as roscore Container
    participant MPC_C as MPC Container
    participant KERNEL as Linux Kernel

    UAV->>ROSCORE: TCP connect to ROS_MASTER_URI
    UAV->>ROSCORE: Register /odometry publisher
    MPC_C->>ROSCORE: Register /odometry subscriber
    ROSCORE-->>MPC_C: Return UAV's TCP endpoint
    
    loop 100Hz MPC Control Loop
        UAV->>MPC_C: Publish x(k): pos + vel + quaternion
        Note over MPC_C: Solve QP optimization<br/>horizon N=100 steps<br/>exec time ~16ms
        MPC_C->>UAV: Publish u(k): thrust, φd, θd
        Note over UAV: Attitude controller<br/>executes motor commands
    end
    
    MPC_C->>KERNEL: CPU user-space: 9.2%<br/>kernel-space: 0.8%
```

### Container Process Hierarchy (Docker)

```mermaid
flowchart TD
    subgraph HOST["Host OS (Ubuntu 20.04)"]
        DOCKERD["dockerd\nContainer daemon\nHTTP REST API"]
        CONTAINERD["containerd\nContainer lifecycle\nImage pulls, snapshots"]
        RUNC["runc\nOCI runtime\nclone() + exec()"]
    end
    subgraph C1["roscore Container"]
        INIT1["PID 1: entrypoint.sh"]
        ROSCORE["roscore\nROS Master\nxmlrpc port :11311"]
    end
    subgraph C2["MPC Container"]
        INIT2["PID 1: entrypoint.sh"]
        MPCNODE["mpc_node\nC++ ROS node\nEigen + OSQP solver"]
        LIBOSQP["libosqp.so\nQuadratic Program Solver\nADMM algorithm"]
    end
    DOCKERD --> CONTAINERD --> RUNC
    RUNC -->|"clone(CLONE_NEWPID|CLONE_NEWNS\n|CLONE_NEWNET)"| C1
    RUNC -->|"clone()"| C2
    INIT1 --> ROSCORE
    INIT2 --> MPCNODE --> LIBOSQP
    style HOST fill:#1a1a2e,color:#fff
```

---

## 4. Kubernetes Multi-Node Edge Architecture: Control Plane Data Flow

```mermaid
flowchart TD
    subgraph CONTROL_PLANE["K8s Control Plane (Master Node)"]
        API["kube-apiserver\nREST + Watch API\nValidation + Admission"]
        ETCD["etcd\nRaft consensus KV\nCluster state store"]
        SCHED["kube-scheduler\nPredicate filter +\nPriority scoring"]
        CM["controller-manager\nReplicaSet + Deployment\nReconciliation loops"]
    end
    subgraph WORKER["Worker Node (Edge Machine)"]
        KUBELET["kubelet\nCRI gRPC interface\nPod lifecycle manager"]
        CRI["containerd (CRI)\nImage pull + unpack\nContainer creation"]
        RUNC2["runc\nOCI runtime"]
        subgraph POD1["Pod: roscore"]
            ROSCORE2["roscore container\nhost network"]
        end
        subgraph POD2["Pod: mpc-controller"]
            MPC2["mpc_node container\nhost network"]
        end
        KUBEPROXY["kube-proxy\niptables DNAT rules\nService VIP→Pod IP"]
        SERVICE["Service: ClusterIP\nVirtual IP for pod discovery"]
    end
    API --> ETCD
    API -->|"Watch"| CM
    CM -->|"Schedule pod"| SCHED
    SCHED -->|"Node binding"| API
    API -->|"Pod spec"| KUBELET
    KUBELET -->|"RunPodSandbox\nCreateContainer"| CRI --> RUNC2
    RUNC2 --> POD1
    RUNC2 --> POD2
    KUBEPROXY --> SERVICE
    SERVICE -->|"routes to"| POD1
    SERVICE -->|"routes to"| POD2
    style CONTROL_PLANE fill:#1a2a3a,color:#fff
    style WORKER fill:#1a3a2a,color:#fff
```

### Kubernetes Pod Network Isolation vs. Host Network

```mermaid
flowchart LR
    subgraph DEFAULT_POD["Default Pod Networking"]
        POD["Pod\ncni0: 10.244.0.5/24\nVeth pair to node bridge"]
        CNI_BRIDGE["cni0 bridge\n10.244.0.1/24"]
        VETH["veth pair\nOne end in pod netns\nOne end on host"]
        POD <--> VETH <--> CNI_BRIDGE
    end
    subgraph HOST_NET_POD["hostNetwork: true"]
        POD2["Pod\nShares host net namespace\neth0: 192.168.1.10\nSees all host ports"]
        HOST_NIC["Host NIC\neth0: 192.168.1.10"]
        POD2 -.->|"same netns"| HOST_NIC
    end
    NOTE["hostNetwork is one ROS 1 connectivity option\nroutable advertised addresses, overlays,\nor explicit networking may also work"]
    style DEFAULT_POD fill:#3a1a1a,color:#fff
    style HOST_NET_POD fill:#1a3a1a,color:#fff
```

---

## 5. MPC Optimization: What the Compute Offload Actually Does

The MPC solve is a quadratic program (QP) solved at 100Hz. This is what gets offloaded to the edge container.

```mermaid
flowchart TD
    subgraph MPC_INTERNALS["MPC Compute Flow (16ms budget at 100Hz)"]
        STATE["x(k) = [p, v, φ, θ]ᵀ\nReceived from UAV\nwith delay d1"]
        PREDICT["State Prediction\nForward Euler integration\nN=100 steps"]
        COST["Cost Function Assembly\nJ = Σ[state_cost + input_cost + smoothness_cost]\nFor j=1..N"]
        QP["QP Solver (OSQP/ADMM)\nFind u* minimizing J\nSubject to: actuator limits"]
        OUTPUT["u(k) = [T, φd, θd]ᵀ\nFirst control action\nReceding horizon"]
        STATE --> PREDICT --> COST --> QP --> OUTPUT
    end
    subgraph COST_TERMS["Cost Function Terms"]
        T1["State Cost\n(xd - xk+j|k)ᵀ Qx (xd - xk+j|k)\nDeviaton from desired trajectory"]
        T2["Input Cost\n(ud - uk+j|k)ᵀ Qu (ud - uk+j|k)\nHovering: ud = [g, 0, 0]"]
        T3["Smoothness Cost\n(δu)ᵀ Qδu (δu)\nInput rate penalty"]
    end
    COST -.-> T1 & T2 & T3
    style MPC_INTERNALS fill:#1a1a3a,color:#fff
```

### UAV Kinematic Model in Memory

```mermaid
flowchart LR
    subgraph STATE_VECTOR["State Vector x ∈ ℝ¹²"]
        P["p = [px, py, pz]ᵀ\nGlobal position"]
        V["v = [vx, vy, vz]ᵀ\nLinear velocity"]
        ATT["φ, θ (roll, pitch)\nEuler angles"]
        Q["quaternion\n[qw, qx, qy, qz]"]
    end
    subgraph CONTROL["Control Input u ∈ ℝ³"]
        T["T: total thrust\n≥ 0"]
        PHI["φd: desired roll"]
        THETA["θd: desired pitch"]
    end
    subgraph DYNAMICS["Dynamics (Forward Euler)"]
        ACC["v̇ = R(φ,θ)·[0,0,T]ᵀ + [Ax,Ay,Az]·v - [0,0,g]"]
        ATT_DYN["φ̇ = (Kφ·φref - φ) / τφ\nθ̇ = (Kθ·θref - θ) / τθ"]
    end
    STATE_VECTOR --> DYNAMICS
    CONTROL --> DYNAMICS
```

---

## 6. Docker vs. Kubernetes: Resource Overhead Under the Hood

```mermaid
block-beta
    columns 3
    A["Metric"]:1 B["Docker Standalone"]:1 C["Kubernetes"]:1
    D["CPU user-space"]:1 E["9.2%"]:1 F["18.8%"]:1
    G["CPU kernel-space"]:1 H["0.8%"]:1 I["4.5%"]:1
    J["Combined CPU"]:1 K["10.0%"]:1 L["23.3%"]:1
    M["Robot→Edge RTT"]:1 N["14.2ms"]:1 O["9.5ms"]:1
    P["MPC Exec Time"]:1 Q["16.1ms"]:1 R["16.9ms"]:1
    S["Edge→Robot RTT"]:1 T["17.6ms"]:1 U["13.1ms"]:1
    V["Total RTT"]:1 W["47.9ms"]:1 X["39.5ms"]:1
```

This sample reports lower Kubernetes RTT and higher CPU usage than its Docker run. The proposed ARP, iptables, and control-plane causes are **hypotheses**, not demonstrated explanations; topology, warm-up, host networking, sampling, background load, and variance must be controlled before attribution.

```mermaid
flowchart TD
    subgraph K8S_OVERHEAD["Kubernetes Extra Processes (per worker node)"]
        KUBELET2["kubelet\nPod health polling\nCRI gRPC calls\n~50MB RAM"]
        KUBEPROXY2["kube-proxy\niptables sync loop\nEvery 30s full resync\n~20MB RAM"]
        PAUSE["pause container\nPer-pod network namespace holder\n~700KB per pod"]
        CADVISOR["cAdvisor\nContainer metrics\nRead cgroup files\n~30MB RAM"]
        DNS["CoreDNS\nCluster DNS\nService discovery\n~50MB RAM"]
    end
    subgraph DOCKER_SIMPLE["Docker Standalone"]
        DOCKERD2["dockerd\n~100MB RAM"]
        CONTAINERD2["containerd\n~30MB RAM"]
    end
    style K8S_OVERHEAD fill:#2a1a3a,color:#fff
    style DOCKER_SIMPLE fill:#1a2a1a,color:#fff
```

---

## 7. ROS Node Communication: Pub/Sub Over TCP

```mermaid
sequenceDiagram
    participant MASTER as ROS Master (:11311)
    participant UAV_PUB as UAV Publisher Node
    participant EDGE_SUB as Edge Subscriber (MPC)

    UAV_PUB->>MASTER: registerPublisher("/odometry", "nav_msgs/Odometry")
    MASTER-->>UAV_PUB: [statusCode, msg, subscriberAPIs]
    
    EDGE_SUB->>MASTER: registerSubscriber("/odometry", "nav_msgs/Odometry")
    MASTER-->>EDGE_SUB: [statusCode, msg, [UAV_PUB_URI]]
    
    EDGE_SUB->>UAV_PUB: requestTopic("/odometry", [TCPROS])
    UAV_PUB-->>EDGE_SUB: [statusCode, "TCPROS", HOST, PORT]
    
    EDGE_SUB->>UAV_PUB: TCP connect to HOST:PORT
    UAV_PUB-->>EDGE_SUB: Header exchange (MD5 sum, type, topic)
    
    loop 100Hz Message Stream
        UAV_PUB->>EDGE_SUB: Serialized nav_msgs/Odometry\n[uint32 length][serialized bytes]
    end
```

ROS Master returns the publisher's advertised endpoint to subscribers. A non-routable container address will fail from another device, but `--network=host` is only one remedy; a routable CNI/overlay, correct `ROS_IP`/`ROS_HOSTNAME`, port reachability, or a gateway can satisfy the same requirement.

---

## 8. Container Failure Recovery: Docker vs. K8s State Machines

```mermaid
stateDiagram-v2
    state "Docker Standalone" as DOCKER {
        [*] --> Running: docker run
        Running --> Dead: crash/OOM
        Dead --> [*]: manual restart\nor --restart=always
        Dead --> Running: --restart=always\ncreates new container
    }
    
    state "Kubernetes Pod" as K8S {
        [*] --> Pending: Pod scheduled
        Pending --> Running: Container started
        Running --> Succeeded: normal exit
        Running --> Failed: crash/OOM/signal
        Failed --> Running: kubelet restartPolicy=Always\nExponential backoff: 10s→20s→40s...→5min
        Running --> CrashLoopBackOff: >5 consecutive failures\nbackoff capped at 5min
        CrashLoopBackOff --> Running: manual delete+recreate\nor fix root cause
    }
```

Kubernetes restart and readiness behavior can restore a failed process, but exponential backoff is not a real-time flight-control failover. Production UAV control needs an onboard safe controller and explicit stale-command timeout; orchestration recovery is a slower secondary mechanism. Docker also supports restart and health-check features, though higher-level routing and readiness semantics differ.

---

## 9. Edge Architecture Decision Matrix

```mermaid
flowchart TD
    REQ["Mission Requirements"] --> Q1{"Multi-container\ncoordination?"}
    Q1 -->|No| Q2{"Failure\nauto-recovery?"}
    Q1 -->|Yes| K8S_BRANCH["Kubernetes Path"]
    Q2 -->|No| DOCKER_SIMPLE2["Docker: simplest\n--rm flag\nno orchestration"]
    Q2 -->|Yes| DOCKER_RESTART["Docker: --restart=always\nor docker-compose\nrestart: always"]
    K8S_BRANCH --> Q3{"Resource\nconstraints?"}
    Q3 -->|"Embedded\n<4GB RAM"| K3S["k3s / MicroK8s\nLightweight K8s\n~300MB overhead"]
    Q3 -->|"Edge server\n>8GB RAM"| FULL_K8S["Full Kubernetes\nFull feature set\nHighest resilience"]
    Q3 -->|"Extreme edge\n<1GB RAM"| NOMAD["HashiCorp Nomad\nor bare containers\nMinimal orchestration"]
    style K8S_BRANCH fill:#1a2a3a,color:#fff
```

---

## 10. Latency Budget Analysis: Why Edge Beats Cloud for Real-Time Control

```mermaid
flowchart LR
    subgraph CLOUD["Cloud Architecture"]
        C_ROBOT["UAV\nWiFi AP"]
        C_INTERNET["Internet\n~50ms RTT\n+jitter"]
        C_CLOUD["Cloud VM\nMPC Node"]
        C_ROBOT -->|"50ms+"| C_INTERNET -->|"50ms+"| C_CLOUD
        NOTE_C["Total RTT: >100ms\nMPC at 10Hz max\nUnstable at N=100"]
    end
    subgraph EDGE["Edge Architecture"]
        E_ROBOT["UAV\nWiFi AP"]
        E_LOCAL["Local WiFi\n<15ms RTT"]
        E_EDGE["Edge Server\nMPC Node"]
        E_ROBOT -->|"~14ms"| E_LOCAL -->|"~14ms"| E_EDGE
        NOTE_E["Total RTT: ~48ms\nMPC at 100Hz\nN=100 horizon stable"]
    end
    subgraph ONBOARD["On-board Compute"]
        OB_ROBOT["UAV + MPC\nSame device"]
        NOTE_OB["0ms network RTT\nBut CPU-limited:\nN=100 may not fit\nin 10ms budget"]
    end
    style CLOUD fill:#3a1a1a,color:#fff
    style EDGE fill:#1a3a1a,color:#fff
    style ONBOARD fill:#1a1a3a,color:#fff
```

A 100Hz period is 10ms, so the stated 16ms edge solve already misses that deadline before adding network delay; it is not "just within" the budget. These figures support a lower demonstrated control rate unless pipelining and a stability analysis define a different deadline model.

---

## 11. Container Image Layer Architecture for ROS

```mermaid
flowchart TD
    subgraph ROSCORE_IMAGE["roscore Container Image Layers"]
        L1_A["ubuntu:20.04\n~73MB\nBase OS"]
        L2_A["ros-noetic-ros-base\n~150MB\nCore ROS packages"]
        L3_A["entrypoint.sh\n~1KB\nroscore startup"]
        L1_A --> L2_A --> L3_A
    end
    subgraph MPC_IMAGE["MPC Container Image Layers"]
        L1_B["ubuntu:20.04\n~73MB\n(shared cache layer)"]
        L2_B["ros-noetic-ros-base\n~150MB\n(shared cache layer)"]
        L3_B["ros-noetic-mavros +\nros-noetic-geometry\n~80MB\nRobotics packages"]
        L4_B["Eigen3 + OSQP\nOptimization libraries\n~50MB"]
        L5_B["mpc_package (custom)\n~10MB\nUAV controller code"]
        L6_B["entrypoint.sh\n~1KB\nrosrun mpc mpc_node"]
        L1_B --> L2_B --> L3_B --> L4_B --> L5_B --> L6_B
    end
    OVERLAY["OverlayFS Union Mount\nlowerdir: read-only layers\nupperdir: writable CoW layer\nmerged: container's view"]
    L6_B --> OVERLAY
    L3_A --> OVERLAY
    style ROSCORE_IMAGE fill:#1a2a1a,color:#fff
    style MPC_IMAGE fill:#1a1a3a,color:#fff
```

---

## 12. Extending the Architecture: Multi-Robot Coordination via Edge

```mermaid
flowchart TD
    subgraph EDGE_CLUSTER["Kubernetes Edge Cluster"]
        subgraph NS_UAV1["Namespace: uav-1"]
            MPC1["mpc-controller Pod"]
            ROS1["roscore Pod"]
        end
        subgraph NS_UAV2["Namespace: uav-2"]
            MPC2["mpc-controller Pod"]
            ROS2["roscore Pod"]
        end
        COORD["coordination-node Pod\nShared state:\n- Collision avoidance\n- Formation control\n- Path planning"]
        MPC1 <-->|"ROS cross-namespace\ntopics"| COORD
        MPC2 <-->|"ROS cross-namespace\ntopics"| COORD
    end
    UAV1["UAV 1\nWiFi"] --> MPC1
    UAV2["UAV 2\nWiFi"] --> MPC2
    MPC1 --> UAV1
    MPC2 --> UAV2
    NOTE["K8s enables:\n- Per-UAV namespace isolation\n- Shared coordination pod\n- Automatic pod recovery\n- Resource quotas per UAV\nDocker Compose cannot\nachieve this cleanly"]
    style EDGE_CLUSTER fill:#1a2a3a,color:#fff
```

---

## Summary: Internal Architecture Tradeoffs

| Dimension | Docker Standalone | Kubernetes |
|-----------|------------------|------------|
| **Network overhead** | Host-mode: zero overhead | Host-mode: still passes kube-proxy DNAT |
| **CPU overhead** | ~10% (MPC only) | ~23% (MPC + kubelet + kube-proxy + etcd client) |
| **Failure recovery** | Manual or `--restart` flag | Automatic with probe-gated readiness |
| **Scaling** | Single node only | Multi-node pod migration |
| **Network RTT** | 47.9ms total | 39.5ms total (warmed iptables chains) |
| **Kubernetes overhead source** | — | etcd heartbeats, kubelet CRI polls, kube-proxy iptables resync |
| **Namespace isolation** | PID + MNT + IPC (not NET with `--network=host`) | Same + pause container per pod |
| **Real-time deadline safety** | Simple, predictable | Scheduler jitter possible under load |

The core principle: **containers do not create isolation for free** — every namespace boundary has a cost in setup latency, routing overhead, and memory footprint. For hard real-time control loops, the tradeoff between isolation/orchestration features and raw determinism must be carefully evaluated against the mission's RTT budget.
