# Miscellaneous CS Topics — Under the Hood: Graphics, Game Engines, IoT, SRE, and DevOps Internals

> **Focus**: Internal mechanics — not how to use tools, but how game engines implement ECS, how GPUs execute shader pipelines, how Terraform tracks state, and how SRE error budgets drive automated decisions.

---

## 1. Real-Time Graphics: GPU Rendering Pipeline Internals

### Rasterization Pipeline

```mermaid
flowchart TD
    subgraph "GPU Rendering Pipeline"
        IA["Input Assembler\nvertex/index buffer fetch"] -->
        VS["Vertex Shader\nper-vertex: MVP transform\nclip space position"] -->
        TC["Tessellation Control\npatch subdivision factor"] -->
        TE["Tessellation Evaluation\nnew vertex positions"] -->
        GS["Geometry Shader (optional)\nper-primitive emission"] -->
        RS["Rasterizer\ntriangle → fragment coverage\nbary coords, interpolation"] -->
        FS["Fragment Shader\nper-pixel color computation\ntexture sampling"] -->
        OM["Output Merger\ndepth test + stencil test\nblend: src*srcAlpha + dst*(1-srcAlpha)"]
    end
```

### Depth Buffer and Early-Z

```mermaid
sequenceDiagram
    participant Fragment
    participant EarlyZ as Early-Z Test (before FS)
    participant FS as Fragment Shader
    participant Depth as Depth Buffer
    participant Color as Color Buffer

    Fragment->>EarlyZ: screen (x,y,z) from rasterizer
    EarlyZ->>Depth: compare z vs depth[x][y]
    alt z < depth[x][y]
        EarlyZ->>FS: execute shader (expensive)
        FS-->>Color: write color
        FS-->>Depth: write z
    else z >= depth[x][y]
        EarlyZ->>EarlyZ: discard (save bandwidth)
    end
```

**Early-Z** rejects fragments before shader execution — massive perf win. Broken if shader writes depth or calls `discard`.

### Deferred Rendering vs Forward Rendering

```mermaid
flowchart LR
    subgraph "Forward: O(objects × lights)"
        FR_Geo["Render each object\nwith ALL lights in FS"] --> FR_Out["Final color buffer"]
    end
    subgraph "Deferred: O(objects + lights)"
        DR_Geo["Geometry Pass\nwrite G-buffer: albedo, normal, depth"] -->
        DR_Light["Lighting Pass\nper-light: read G-buffer\ncompute only lit fragments"] -->
        DR_Out["Final color buffer"]
    end
```

**G-buffer layout** (MRT — Multiple Render Targets):
- RT0: Albedo (RGB) + Roughness (A)
- RT1: World Normal (RGB) + Metalness (A)
- RT2: Depth (32-bit float)
- RT3: Emissive (RGB) + AO (A)

### Ray Tracing: BVH Traversal

```mermaid
flowchart TD
    Ray["Ray origin + direction"] -->
    BVH_Root["BVH Root AABB intersection test"] -->|hit| BVH_L["Left Child AABB"]
    BVH_Root -->|miss| Discard["No intersection"]
    BVH_L -->|hit| Leaf["Leaf: triangle list"]
    Leaf --> MollerTrumbore["Möller–Trumbore algorithm\nbary coords u,v,t\nray = O + tD"]
    MollerTrumbore -->|t > 0| Hit["Record hit: (t, u, v, tri_id)"]
```

NVIDIA RTX uses **RT Cores** for hardware BVH traversal — a fixed-function unit offloading tree walks from shader processors. BVH build is O(N log N) via Surface Area Heuristic (SAH).

---

## 2. Game Engine Architecture: ECS and Physics

### Entity-Component-System Data Layout

```mermaid
flowchart TD
    subgraph "Traditional OOP (Array of Structs)"
        AOS["Entity[]\n[{pos,vel,health,render,...},\n {pos,vel,health,render,...}]\nPoor cache locality for System traversal"]
    end
    subgraph "ECS (Struct of Arrays / Archetypes)"
        SOA["Archetype: (Position, Velocity)\nPositions: [p0,p1,p2,...]\nVelocities: [v0,v1,v2,...]\nContiguous memory = cache lines filled"]
    end
    AOS -->|ECS migration| SOA
```

**Archetype** = unique set of component types. Entities with identical component sets share an archetype table. Moving a component to/from an entity = **archetype change** (memcpy row to new table).

### Physics Engine: Broad Phase → Narrow Phase

```mermaid
flowchart LR
    World[All Colliders] -->|Broad Phase| AABB_Prune["AABB sweep & prune\nSort by x-axis min/max\nO(N log N + pairs)"]
    AABB_Prune -->|candidate pairs| Narrow["Narrow Phase\nGJK algorithm: convex shapes\nEPA: penetration depth"]
    Narrow -->|contacts| Solver["Constraint Solver\nSequential Impulse (SI)\nIterative: N substeps × M iters"]
    Solver -->|impulses| Integration["Semi-implicit Euler\nv += a·dt\nx += v·dt"]
```

**GJK (Gilbert-Johnson-Keerthi)**: detects convex shape overlap by building a simplex in **Minkowski difference space**. If origin is inside Minkowski difference, shapes overlap.

### Game Loop Timing

```mermaid
stateDiagram-v2
    [*] --> Input: frame start
    Input --> Update: process events
    Update --> FixedUpdate: accumulate physics dt
    FixedUpdate --> FixedUpdate: step if accum >= fixedDt
    FixedUpdate --> Render: remaining time
    Render --> Present: swap buffers (vsync/triple buffer)
    Present --> [*]: wait for next frame
```

Fixed timestep (typically 50Hz) decouples physics stability from rendering. **Interpolation alpha** = `accum / fixedDt` blends last two physics states for smooth rendering at any FPS.

---

## 3. IoT Architecture: Edge Computing and Protocol Internals

### MQTT Protocol Internals

```mermaid
sequenceDiagram
    participant Device as IoT Device (Publisher)
    participant Broker as MQTT Broker
    participant App as Application (Subscriber)

    Device->>Broker: CONNECT (clientId, keepAlive=60s, cleanSession=false)
    Broker-->>Device: CONNACK (returnCode=0)
    Device->>Broker: PUBLISH (topic="sensor/temp", payload=23.4, QoS=1, packetId=1)
    Broker-->>Device: PUBACK (packetId=1)
    Broker->>App: PUBLISH (topic="sensor/temp", payload=23.4)
    App-->>Broker: PUBACK
    Note over Broker: QoS 2: PUBLISH→PUBREC→PUBREL→PUBCOMP (exactly-once)
```

**QoS levels**:
- QoS 0: at-most-once (fire and forget, no ACK)
- QoS 1: at-least-once (PUBACK, may duplicate)
- QoS 2: exactly-once (4-message handshake, store-and-forward)

### Edge Computing: Data Pipeline

```mermaid
flowchart TD
    Sensor["Sensors\n(temp, pressure, vibration)"] -->|BLE/Zigbee/LoRa| Gateway["Edge Gateway\nProtocol translation\nLocal filtering/aggregation"]
    Gateway -->|MQTT/AMQP| EdgeBroker["Edge Message Broker\n(Mosquitto/EMQX)"]
    EdgeBroker -->|stream processing| EdgeCompute["Edge Compute (k3s/microk8s)\nAnomaly detection\nPre-aggregation"]
    EdgeCompute -->|batched uploads| Cloud["Cloud Platform\nS3/GCS/Azure Blob\nTime-series DB (InfluxDB)"]
    EdgeCompute -->|low-latency control| Actuator["Actuators\n(motors, valves)"]
```

**Local loop latency**: edge-to-actuator < 10ms. Cloud round-trip: 50–200ms — too slow for real-time control.

### TLS on Constrained Devices

```mermaid
flowchart LR
    MCU["MCU 32-bit\n(Cortex-M4, 256KB RAM)"] -->|DTLS 1.3| Gateway
    DTLS["DTLS (TLS over UDP)\nECDH Curve25519 (32-byte key)\nChaCha20-Poly1305 (no AES hw)"]
    MCU --> DTLS
    PSK["Pre-Shared Key mode\nno certificate chain\nsaves 2KB RAM"]
    DTLS --> PSK
```

Constrained devices use **DTLS** (Datagram TLS) with PSK to avoid certificate parsing overhead. ChaCha20 is preferred on devices without AES hardware acceleration.

---

## 4. Infrastructure as Code: Terraform State Machine Internals

### Terraform Plan/Apply Lifecycle

```mermaid
sequenceDiagram
    participant User
    participant TF as Terraform CLI
    participant State as State Backend (S3+DynamoDB lock)
    participant Provider as AWS Provider Plugin
    participant API as AWS API

    User->>TF: terraform plan
    TF->>State: acquire DynamoDB lock (put-item if absent)
    TF->>State: read current state.json
    TF->>Provider: refresh: describe existing resources
    Provider->>API: DescribeInstances, ListBuckets...
    API-->>Provider: actual state
    TF->>TF: diff: desired (HCL) vs actual state
    TF-->>User: show planned changes (+/-/~)
    User->>TF: terraform apply
    TF->>Provider: create/update/delete resources
    Provider->>API: CreateInstance, PutBucketPolicy...
    TF->>State: write new state.json
    TF->>State: release DynamoDB lock
```

### Dependency Graph and Parallelism

```mermaid
flowchart TD
    VPC["aws_vpc.main"] --> Subnet["aws_subnet.public"]
    VPC --> IGW["aws_internet_gateway.main"]
    Subnet --> EC2["aws_instance.web"]
    IGW --> Route["aws_route.internet"]
    Route --> EC2
    EC2 --> EIP["aws_eip.web"]

    subgraph "Parallel execution"
        Subnet -.->|no dep| IGW
    end
```

Terraform builds a DAG of resources and applies **parallel** where dependencies allow. The `depends_on` meta-argument forces explicit edges when implicit dependencies aren't captured by references.

### State File Structure

```mermaid
block-beta
    columns 1
    block:state:1
        columns 2
        version["version: 4"]
        serial["serial: 42 (monotonic)"]
        lineage["lineage: UUID (immutable)"]
        resources["resources: [\n  { type, name, provider,\n    instances: [{id, attributes}] }\n]"]
        outputs["outputs: {key: {value, type}}"]
    end
```

`serial` increments on every apply — used for **optimistic locking**. If remote serial > local serial, apply is rejected (someone else modified first).

---

## 5. Ansible: Push-Based Configuration Internals

### Module Execution Mechanism

```mermaid
sequenceDiagram
    participant Control as Control Node
    participant SSH
    participant Target as Target Node (Python)

    Control->>Control: parse playbook YAML → task list
    Control->>SSH: connect (multiplexed SSH ControlMaster)
    Control->>Target: sftp upload: /tmp/ansible_tmp/command_module.py
    Control->>Target: python /tmp/ansible_tmp/command_module.py '{"cmd":"..."}'
    Target->>Target: execute module, collect facts
    Target-->>Control: JSON result: {changed:bool, stdout:str, rc:int}
    Control->>Target: rm -rf /tmp/ansible_tmp/
```

Ansible is **agentless** — Python module files are SCP'd to the target, executed, and cleaned up per-task. This means Python must be available on targets (except `raw` module which uses SSH directly).

### Idempotency and Check Mode

```mermaid
stateDiagram-v2
    [*] --> CheckState: task execution
    CheckState --> AlreadyDesired: state matches desired
    AlreadyDesired --> ReturnChanged_False: changed=false
    CheckState --> NeedChange: state differs
    NeedChange --> ApplyChange: check_mode=false
    NeedChange --> ReportOnly: check_mode=true (--check)
    ApplyChange --> ReturnChanged_True: changed=true
```

Modules must implement idempotent `get_state` → compare → `set_state` logic. `--check` mode runs `get_state` + compare only, dry-running the entire playbook.

---

## 6. SRE: Error Budgets, SLOs, and Alerting Internals

### SLO Error Budget Mechanics

```mermaid
flowchart TD
    SLO["SLO: 99.9% availability\n= 43.8 min downtime/month allowed"] -->
    EB["Error Budget = 1 - SLO\n= 0.1% = 43.8 min/month"]

    Request["Request outcomes"] -->|success| Good["Good events"]
    Request -->|error/timeout| Bad["Bad events"]
    Bad --> Burn["Budget burn rate\n= actual error rate / error budget rate"]

    Burn -->|rate > 1| Depleting["Budget depleting faster than allowed"]
    Burn -->|rate < 1| Accumulate["Budget accumulating"]

    subgraph "Multi-window alert"
        MWA1["1h window: burn rate > 14.4\n(consumes 2% budget in 1h)"] -->|AND| MWA2["5min window: burn rate > 14.4\nConfirms ongoing burn"]
        MWA1 & MWA2 --> Page["Page on-call"]
    end
```

**Multi-window alerting** (Google's approach): short window detects fast burns, long window detects slow burns without false positives.

### Prometheus Alerting Rule Evaluation

```mermaid
sequenceDiagram
    participant TSDB as Prometheus TSDB
    participant Engine as Query Engine
    participant AM as Alertmanager
    participant PD as PagerDuty

    loop every evaluation_interval (15s)
        Engine->>TSDB: evaluate PromQL: rate(http_errors[5m]) / rate(http_requests[5m]) > 0.01
        TSDB-->>Engine: time series result
        alt condition true for pending_period
            Engine->>AM: send alert (labels, annotations, startsAt)
            AM->>AM: group + route by label matchers
            AM->>AM: inhibit if higher-severity firing
            AM->>AM: silence check
            AM->>PD: POST /integration/events (dedup_key = fingerprint)
        end
    end
```

**Fingerprinting**: alert identity = hash of all label key/value pairs. Alertmanager uses fingerprint for deduplication and grouping.

### Distributed Tracing: OpenTelemetry Context Propagation

```mermaid
sequenceDiagram
    participant Client
    participant ServiceA
    participant ServiceB
    participant Collector as OTel Collector

    Client->>ServiceA: HTTP GET /api\nW3C TraceContext header:\ntraceparent: 00-{traceId}-{spanId}-01
    ServiceA->>ServiceA: extract trace context\ncreate child span (spanId_A)
    ServiceA->>ServiceB: HTTP POST /internal\ntraceparent: 00-{traceId}-{spanId_A}-01
    ServiceB->>ServiceB: create child span (spanId_B)
    ServiceB-->>ServiceA: response
    ServiceA-->>Client: response
    ServiceA->>Collector: export spans (OTLP gRPC)
    ServiceB->>Collector: export spans (OTLP gRPC)
    Collector->>Collector: reconstruct trace tree from parentSpanId links
```

`traceId` (128-bit) spans the entire request tree. `spanId` (64-bit) identifies one service's work unit. `parentSpanId` links child to parent, enabling tree reconstruction.

---

## 7. Testing Methodologies: Property-Based and Mutation Testing Internals

### Property-Based Testing (QuickCheck / Hypothesis)

```mermaid
flowchart TD
    Property["Property: ∀ list xs. sort(sort(xs)) == sort(xs)"] -->
    Generator["Generator: arbitrary List<Int>\nrandom size, random elements"]
    Generator -->|100 samples| Runner["Run property for each"]
    Runner -->|failure found| Shrink["Shrink: find minimal counterexample\nbinary search on size + element values"]
    Shrink -->|minimal case| Report["Report: failing case [5, 3, 1]"]
    Runner -->|all pass| Pass["Property holds for 100 samples"]
```

**Shrinking** is the key innovation — QuickCheck doesn't just report the random failure, it minimizes it to the smallest counterexample, making bugs debuggable.

### Mutation Testing Internals

```mermaid
flowchart TD
    Source["Source code AST"] -->|apply mutant| Mutant["Mutant: e.g., + → -, > → >="]
    Mutant -->|run test suite| Result{Tests pass?}
    Result -->|still pass| Survived["Survived mutant = test gap\n(test suite doesn't detect this change)"]
    Result -->|fail| Killed["Killed mutant = good test\n(test caught the regression)"]
    Survived --> Coverage["Mutation score = killed / (killed + survived)"]
```

Mutation testing reveals **false confidence** — 100% line coverage can still have high survived-mutation rate if assertions don't verify exact values.

---

## 8. Computer Graphics: Shader Compilation and SPIR-V

### GLSL → SPIR-V → Native ISA

```mermaid
flowchart TD
    GLSL["GLSL / HLSL source"] -->|glslangValidator| SPIRV["SPIR-V binary\n(vendor-neutral IR)"]
    SPIRV -->|driver compilation| ISA["GPU ISA\n(PTX→SASS for NVIDIA\nGCN for AMD\nEU ISA for Intel)"]
    SPIRV -->|optimization passes| SPIRV_Opt["spirv-opt: dead code elim\nvector width optimization"]
    SPIRV --> Vulkan["Vulkan VkShaderModule"]
    SPIRV --> Metal["SPIR-V Cross → MSL (Metal)"]
    SPIRV --> WebGPU["Naga → WGSL (WebGPU)"]
```

**SPIR-V** is a register-based SSA IR with explicit type system for GPU programs. It separates frontend language from backend driver compilation — enables one shader to target multiple platforms.

### Compute Shader Thread Hierarchy (CUDA/Vulkan Compute)

```mermaid
block-betting
    columns 1
    block:hierarchy:1
        columns 1
        g["Grid: 3D array of thread groups"]
        b["Thread Group (workgroup): 64–256 threads\nshared local memory (LDS) ~48KB"]
        t["Thread (lane): executes shader\nregisters: 32–255 per thread"]
        w["Warp (SIMD32/SIMD64): 32/64 threads\nexecute in lockstep (SIMT)"]
    end
```

**Warp divergence**: if threads in a warp take different branches (`if (threadId % 2)`), both paths execute sequentially with inactive lanes masked — worst case 50% utilization.

---

## 9. Database Internals: Query Optimizer and Execution Engine

### Query Optimization: Cost-Based Optimizer

```mermaid
flowchart TD
    SQL["SELECT * FROM orders o JOIN customers c ON o.cust_id = c.id WHERE c.country='US'"] -->
    Parse["Parse → AST"] -->
    Bind["Bind → resolve table/column refs"] -->
    Transform["Logical Plan: Filter → Join → Scan"] -->
    Enumerate["Plan Enumeration\nDP: enumerate join orderings\nO(3^N) with pruning"] -->
    CostModel["Cost Model\nI/O cost: #pages × seq_cost\nCPU cost: #rows × cpu_cost\nStats: table cardinality, column NDV, histograms"] -->
    BestPlan["Best Physical Plan\n(NestLoop vs HashJoin vs MergeJoin)\n(SeqScan vs IndexScan)"]
```

**Statistics** drive cost estimation: `pg_statistic` histograms, most common values (MCV), and null fractions. Stale stats → wrong cardinality estimates → wrong plan.

### Volcano/Iterator Execution Model

```mermaid
sequenceDiagram
    participant Parent as HashAggregate
    participant Child as HashJoin
    participant L as SeqScan (orders)
    participant R as IndexScan (customers)

    Parent->>Child: next()
    Child->>L: next() [build phase: read all right side]
    L-->>Child: tuple
    Child->>R: next()
    R-->>Child: tuple
    Child->>Child: probe hash table
    Child-->>Parent: matched tuple
    Parent->>Parent: update hash group aggregate
```

**Pull model (Volcano)**: each operator calls `next()` on its children — simple but has high function call overhead. Vectorized execution (DuckDB, ClickHouse) processes batches of 1024 rows per `next()` call.

---

## 10. Agile and Software Engineering Process Internals

### Git Branching Strategies: Internal Mechanics

```mermaid
flowchart LR
    subgraph "Trunk-Based Development"
        Main["main branch"] -->|short-lived| FB["feature branch\n(< 2 days)"]
        FB -->|PR + merge| Main
        Main -->|tag| Release["Release tag"]
    end
    subgraph "Gitflow"
        GF_Main["main"] ---|sync| GF_Dev["develop"]
        GF_Dev --> GF_Feature["feature/x"]
        GF_Dev --> GF_Release["release/1.2"]
        GF_Release --> GF_Main
        GF_Main --> GF_Hotfix["hotfix/y"]
        GF_Hotfix --> GF_Main
        GF_Hotfix --> GF_Dev
    end
```

### CI/CD Pipeline Execution Graph

```mermaid
flowchart TD
    Push["git push"] -->|webhook| CI["CI Server\n(Jenkins/GitLab CI/GitHub Actions)"]
    CI --> Checkout["checkout + cache restore"]
    Checkout --> Parallel{parallel jobs}
    Parallel --> Lint["lint + static analysis"]
    Parallel --> UnitTest["unit tests"]
    Parallel --> Build["build artifact"]
    Lint & UnitTest --> IntTest["integration tests\n(docker-compose up)"]
    IntTest & Build --> Package["package Docker image\ndocker build + push registry"]
    Package -->|tag=main| StagingDeploy["deploy to staging\nkubectl rollout"]
    StagingDeploy --> E2E["e2e tests (Playwright)"]
    E2E -->|manual approval| ProdDeploy["deploy to production\nblue/green or canary"]
```

---

## 11. Operating System Scheduling: Real-Time and Multi-Core

### Multi-Core Cache Coherence (MESI Protocol)

```mermaid
stateDiagram-v2
    [*] --> Invalid: cache line not present
    Invalid --> Exclusive: CPU reads, no other has it
    Exclusive --> Modified: CPU writes (no bus traffic)
    Modified --> Shared: another CPU reads (write-back + share)
    Exclusive --> Shared: another CPU reads
    Shared --> Modified: CPU writes (invalidate others)
    Shared --> Invalid: another CPU writes
    Modified --> Invalid: another CPU writes (must evict)
```

**False sharing**: two variables on same cache line (64B) modified by different CPUs → constant MESI state transitions → serialize execution. Fix: `__cacheline_aligned` / `@Contended` annotation.

### NUMA Memory Access Patterns

```mermaid
flowchart LR
    subgraph "NUMA Node 0"
        CPU0["CPU 0–15\nL3 Cache 30MB"]
        RAM0["Local DRAM\n64GB\n~50ns latency"]
    end
    subgraph "NUMA Node 1"
        CPU1["CPU 16–31\nL3 Cache 30MB"]
        RAM1["Remote DRAM\n64GB\n~100ns latency (QPI/xGMI)"]
    end
    CPU0 -->|local| RAM0
    CPU0 -->|remote 2× slower| RAM1
    CPU1 -->|local| RAM1
```

`numactl --membind=0` pins allocations to local NUMA node. Java GC overhead increases 40–60% with cross-NUMA allocations — JVM's NUMA-aware allocator (`-XX:+UseNUMAInterleaving`) mitigates this.

---

## Summary: Miscellaneous CS Internals Map

```mermaid
mindmap
  root((Misc CS Internals))
    Graphics
      Rasterization pipeline stages
      G-buffer deferred rendering
      BVH ray traversal hardware
      SPIR-V cross-platform IR
      Warp divergence SIMT
    Game Engines
      ECS archetype memory layout
      GJK Minkowski difference
      Fixed timestep physics loop
      Interpolation rendering
    IoT
      MQTT QoS 3 levels
      DTLS constrained devices
      Edge compute local latency
    DevOps/IaC
      Terraform DAG parallelism
      State serial optimistic lock
      Ansible agentless SSH module
    SRE
      Error budget burn rate
      Multi-window alerting
      OTel trace context propagation
    Testing
      QuickCheck shrinking
      Mutation testing survivors
    Database
      Cost-based optimizer statistics
      Volcano pull model
      Vectorized batch execution
    OS/Multi-core
      MESI cache coherence protocol
      False sharing cache lines
      NUMA topology memory latency
```
