# Cloud & AWS Internals: Hypervisors, Virtual Networks & Managed Services

> Under the Hood: How EC2 instances boot on bare metal, how S3 stores objects across failure domains, how VPCs route packets through virtual switches, how Lambda cold starts work — the exact hardware, network, and storage mechanics behind cloud infrastructure.

## Evidence boundary

AWS publishes service contracts, quotas, and selected architecture details, but not every storage layout, host implementation, timing, or control-plane algorithm shown below. Treat diagrams that name shard counts, quorum protocols, internal databases, overlay formats, or fixed latency as **illustrative models**, not verified AWS internals. A production decision is complete only when the relevant AWS documentation, Region, service tier, configuration, and an observed metric or test result are recorded.

---

## 1. Hypervisor Architecture: EC2 on Nitro

AWS Nitro is a custom hypervisor offloading I/O and security to dedicated hardware cards rather than a host OS.

This describes Nitro's public architectural direction. The CPU-overhead percentages, firmware path, boot firmware, and device details in the diagram are workload- and generation-specific assumptions; they are not portable EC2 guarantees.

```mermaid
flowchart TD
    subgraph "Traditional Hypervisor (Xen)"
        DOM0["Dom0 (privileged VM)\nRuns host OS\nHandles all I/O\nConsumes 10-20% CPU"]
        DOMX["DomX (guest VM)\nEC2 instance"]
        NET["Network I/O via Dom0\n→ latency + CPU overhead"]
        DOM0 --> DOMX
        DOM0 --> NET
    end
    subgraph "Nitro Hypervisor"
        NH["Nitro Hypervisor\n(bare metal, <2% overhead)\nOnly CPU + memory virtualization"]
        NIC["Nitro Card: Network\nDedicated FPGA/ASIC\nSR-IOV: guest accesses NIC directly"]
        EBS["Nitro Card: EBS\nNVMe over PCIe to storage\nEncryption in hardware"]
        SEC["Nitro Security Chip\nBoot attestation\nTPM-based instance identity"]
        NH --> NIC
        NH --> EBS
        NH --> SEC
    end
```

### VM Boot Sequence on Nitro

```mermaid
sequenceDiagram
    participant PH as Physical Host
    participant NC as Nitro Controller
    participant NH as Nitro Hypervisor
    participant VM as Guest VM (EC2)

    PH->>NC: Provision request (instance type, AMI, network config)
    NC->>NH: Create vCPU+memory allocation
    Note over NH: Allocate EPT (Extended Page Tables)\nfor guest physical→host physical mapping
    NH->>VM: Virtual CPU VMLAUNCH instruction
    Note over VM: Boots via UEFI/SeaBIOS
    Note over VM: Kernel detects Nitro NVMe driver
    VM->>NC: NVMe over PCIe: fetch EBS blocks for root volume
    Note over VM: initrd → systemd → user space
    VM->>NC: VirtIO-net SR-IOV: connect to ENI
    NC-->>VM: IP assigned via DHCP (VPC DHCP server)
    Note over VM: Instance ready
```

---

## 2. VPC Network Architecture: Virtual Switches and Routing

```mermaid
flowchart TD
    subgraph "AWS Region: us-east-1"
        subgraph "VPC: 10.0.0.0/16"
            subgraph "AZ-1a"
                PUB["Public Subnet 10.0.1.0/24"]
                PRIV["Private Subnet 10.0.2.0/24"]
                EC2A["EC2: 10.0.1.5"]
                EC2B["EC2: 10.0.2.10"]
                PUB --> EC2A
                PRIV --> EC2B
            end
            IGW["Internet Gateway\n(VPC attachment)"]
            NGW["NAT Gateway\n10.0.1.20 (Elastic IP)"]
            RTB_PUB["Route Table (public):\n0.0.0.0/0 → IGW"]
            RTB_PRIV["Route Table (private):\n0.0.0.0/0 → NGW"]
        end
        IGW -->|EIP| Internet["Internet"]
        EC2A --> PUB --> RTB_PUB --> IGW
        EC2B --> PRIV --> RTB_PRIV --> NGW --> IGW
    end
```

### Packet Flow: EC2 to Internet

```mermaid
sequenceDiagram
    participant EC2 as EC2 10.0.1.5
    participant HyperV as Nitro Hypervisor
    participant VSwitch as Virtual Switch (VPC)
    participant IGW as Internet Gateway
    participant Internet as Internet Host 1.2.3.4

    EC2->>HyperV: Send packet\nsrc=10.0.1.5:44321\ndst=1.2.3.4:443
    Note over HyperV: SG egress check:\n443/TCP allowed?
    Note over HyperV: VPC route lookup:\n0.0.0.0/0 → IGW
    HyperV->>VSwitch: Encapsulate in VxLAN/Nitro overlay\nVNI=vpc-id tunnel to physical host running IGW
    VSwitch->>IGW: Inner packet + VPC metadata
    Note over IGW: SNAT: src=10.0.1.5\n→ src=52.x.x.x (EIP)\nConnection tracked in NAT table
    IGW->>Internet: src=52.x.x.x:44321, dst=1.2.3.4:443
    Internet->>IGW: dst=52.x.x.x:44321
    Note over IGW: DNAT lookup: 52.x.x.x:44321\n→ 10.0.1.5:44321
    IGW->>EC2: dst=10.0.1.5:44321
```

### Security Groups: Stateful Packet Inspection

```mermaid
stateDiagram-v2
    [*] --> Evaluate_Egress: Outbound packet
    Evaluate_Egress --> Allowed: Rule match (allow)
    Evaluate_Egress --> Dropped: No rule match (default deny)
    Allowed --> ConnTrack: Add to connection tracking table
    ConnTrack --> PassThrough: Return traffic (automatic)\nno inbound rule needed
```

Security groups are **stateful**: response traffic for an allowed flow is tracked without requiring a symmetric rule. AWS does not contractually expose this as a Linux `conntrack` table inside the Nitro hypervisor, so that implementation detail should not be used for capacity or failure analysis.

---

## 3. S3 Internals: Object Storage Architecture

```mermaid
flowchart TD
    subgraph "S3 Storage Hierarchy"
        PUT["PUT /bucket/key — 5MB object"]
        FE["S3 Frontend Fleet\n(per-region, anycast)\nAuthentication + rate limiting"]
        INDEX["Index Service\nBucket+key → object metadata\n(partition key: bucket/key hash)\nStored in DynamoDB-like service"]
        STORE["Storage Fleet\nErasure coding: RS(6,2)\n6 data shards + 2 parity\nAny 6 of 8 can reconstruct"]
        AZ1["AZ-1: shards 1,3,5,7"]
        AZ2["AZ-2: shards 2,4,6,8"]
        PUT --> FE --> INDEX
        FE --> STORE
        STORE --> AZ1
        STORE --> AZ2
    end
```

### Reed-Solomon Erasure Coding (RS 6+2)

The following `RS(6,2)` layout is a teaching example for erasure coding. S3's public durability and availability commitments do not specify this exact shard count or placement, and two lost shards do not imply tolerance of two entire Availability Zone failures.

```
Object → [d1, d2, d3, d4, d5, d6]  (data chunks)
         [p1, p2]                   (parity: p_i = linear combination of d_j over GF(2⁸))

Reconstruction: Any 6 of 8 shards sufficient.
               Solve system of linear equations over GF(2⁸)
               Tolerates: 2 simultaneous shard failures = 2 AZ failures
```

```mermaid
sequenceDiagram
    participant Client as S3 Client
    participant FE as S3 Frontend
    participant IDX as Index Service
    participant ST1 as Storage Node 1 (AZ-1)
    participant ST2 as Storage Node 2 (AZ-2)

    Client->>FE: GET /bucket/large-object
    FE->>IDX: Lookup(bucket, key) → object_id, chunk_locations
    IDX-->>FE: chunks: [node1:c1, node2:c2, node3:c3, node4:c4, node5:c5, node6:c6]
    Note over FE: Parallel fetch all 6 chunks
    FE->>ST1: Fetch c1, c3, c5 (parallel)
    FE->>ST2: Fetch c2, c4, c6 (parallel)
    ST1-->>FE: c1, c3, c5
    Note over ST2: Node crashes!
    ST2-->>FE: c2, c4 (only 2/3)

    Note over FE: 5 chunks received (need 6)\nFetch parity p1 from another node
    FE->>ST1: Fetch p1
    ST1-->>FE: p1
    Note over FE: Reconstruct c6 from d1..d5,p1\nvia RS decode (Gaussian elimination GF(2⁸))
    FE->>Client: Stream reassembled object
```

### S3 Consistency Model

Since December 2020, S3 documents strong read-after-write consistency for object PUT/DELETE and related read/list operations. The serializable metadata store described here is a hypothesis; the observable guarantee does not reveal the internal metadata implementation.

---

## 4. Lambda Cold Start Internals

```mermaid
stateDiagram-v2
    [*] --> Cold: Invocation (no warm container)
    Cold --> Download: Download container image\n(if not cached on worker host)
    Download --> Init_Sandbox: Create MicroVM (Firecracker)\nAllocate memory + vCPUs
    Init_Sandbox --> Run_Init: Run function init code\nimport modules, connect DB
    Run_Init --> Warm: Function ready (warm)
    Warm --> Execute: Invoke handler
    Execute --> Warm: Reuse container (next invocation)
    Warm --> Frozen: No invocations for ~15 min
    Frozen --> [*]: Container destroyed
```

### Firecracker MicroVM

AWS Lambda uses **Firecracker** (open-source KVM-based microVM):

```mermaid
flowchart LR
    subgraph "Lambda Worker Host"
        FC["Firecracker VMM\n(virtual machine monitor)\nminimal device model:\nonly virtio-net + virtio-block\nNo USB, no PCI bus, no BIOS\n→ 125ms boot time"]
        GUEST["Guest: Amazon Linux 2 mini-kernel\n+ Python/Node/Java runtime\n+ customer code"]
        VSOCK["vsock socket:\nhost ↔ guest IPC\nfor invocation payload delivery"]
        FC --> GUEST
        FC --> VSOCK
    end
    subgraph "Lambda Control Plane"
        CP["Invocation Dispatcher\nPicks warm slot or cold-start\nSends payload via vsock"]
    end
    CP --> VSOCK
```

**Cold start breakdown (Python 3.11, 256MB)**:

The values below are an example measurement envelope, not an SLA. Record Region, architecture, package size, runtime version, VPC configuration, provisioned concurrency, sample count, and percentile before comparing cold starts.
- Firecracker boot: ~125ms
- Amazon Linux init: ~50ms  
- Python interpreter start: ~100ms
- Customer `import` statements: variable (0ms–2000ms)
- **Total: 250ms–2500ms** (vs warm: <1ms overhead)

---

## 5. DynamoDB Internals: Partitioning and Replication

```mermaid
flowchart TD
    subgraph "DynamoDB Request Path"
        REQ["PutItem(PK='user#123', SK='profile')"]
        RF["Request Router\nHash(PK) → partition number\npartition_key = hash(PK) mod num_partitions"]
        PART["Storage Node (partition owner)\nLeader of Paxos group"]
        REP1["Replica 1 (AZ-1)"]
        REP2["Replica 2 (AZ-2)"]
        REP3["Replica 3 (AZ-3)"]
        RF --> PART
        PART -->|replicate| REP1
        PART -->|replicate| REP2
        PART -->|replicate| REP3
        Note["Write acknowledged after\n2 of 3 replicas confirm\n(quorum write)"]
    end
```

### DynamoDB LSM-Tree Storage Engine

The following LSM-tree diagram is a conceptual storage-engine model. DynamoDB does not expose a contractual per-partition LSM layout, SSTable size, Bloom-filter setting, or Paxos role assignment.

```mermaid
flowchart TD
    subgraph "DynamoDB Storage Layer (per partition)"
        WAL["Write-Ahead Log\n(append-only, sequential)\n→ durability guarantee\nbefore memtable write"]
        MEM["MemTable\n(in-memory BTree, sorted by PK+SK)\n→ fast writes"]
        L0["Level-0 SSTables\n(flushed from MemTable)\nsmall, may overlap"]
        L1["Level-1 SSTables\n(compacted, non-overlapping)\n10MB each"]
        L2["Level-2 SSTables\n(100MB each)"]
        BF["Bloom Filter\n(per SSTable, 10 bits/key)\n→ skip irrelevant SSTables on read"]
        IDX["Block Index\n(sparse: one entry per 4KB block)\n→ binary search to block"]
        WAL --> MEM --> L0
        L0 -->|compaction| L1 -->|compaction| L2
        L0 --> BF
        L0 --> IDX
    end
```

### DynamoDB Auto-Partitioning (Adaptive Capacity)

The following split algorithm is illustrative. Published per-partition throughput guidance does not mean a split occurs immediately at a fixed threshold or at the median key; adaptive capacity and partition management remain service-controlled.

```
partition_id=abc → [abc_low, abc_high]
split_point = median key in partition
all keys < median → abc_low
all keys ≥ median → abc_high
Transparent to application: router table updated atomically
```

---

## 6. EBS: Block Storage Internals

```mermaid
sequenceDiagram
    participant EC2 as EC2 Instance
    participant Nitro as Nitro NVMe Card
    participant EBS as EBS Storage Fleet

    EC2->>Nitro: NVMe write(LBA=0x1000, data=4KB, queue_depth=32)
    Note over Nitro: Hardware NVMe queue\nNo host CPU involvement
    Nitro->>EBS: TCP over dedicated EBS network\n(encrypted with NitroEnclaveKey)\nWrite(volume_id, offset, data)
    Note over EBS: Stripe data across 6+ nodes\n(RAID-6 equivalent within AZ)\nReplicate to 2nd AZ (Multi-AZ gp3)
    EBS-->>Nitro: ACK (after 2 replicas confirm)
    Nitro-->>EC2: NVMe completion queue entry
```

**EBS gp3 throughput**: 125 MB/s baseline, up to 1000 MB/s (provisioned). The Nitro card handles all NVMe protocol, encryption (AES-256 in hardware), and TCP networking to EBS fleet — zero host CPU for I/O.

The sequence diagram's “Replicate to 2nd AZ (Multi-AZ gp3)” line is not a general EBS property. An EBS volume is an Availability Zone resource; cross-AZ durability requires a separate mechanism such as snapshots, application replication, or a service that explicitly provides Multi-AZ storage. Throughput limits also depend on volume size, provisioned settings, instance EBS bandwidth, and I/O shape.

---

## 7. IAM Policy Evaluation Engine

```mermaid
flowchart TD
    REQ["API Call: s3:GetObject\non arn:aws:s3:::my-bucket/file"]
    
    P1["1. Is the caller authenticated?\n(STS token valid, not expired?)"]
    P2["2. Explicit DENY?\n(Any policy with Deny effect matches?)"]
    P3["3. Organizational SCPs allow?"]
    P4["4. Resource-based policy\nallows cross-account access?"]
    P5["5. Identity-based policy allows?"]
    P6["6. Permissions boundary allows?"]
    P7["7. Session policy (STS assume-role) allows?"]

    ALLOW["ALLOW"]
    DENY["DENY (default)"]

    REQ --> P1
    P1 -->|no| DENY
    P1 -->|yes| P2
    P2 -->|explicit deny found| DENY
    P2 -->|no deny| P3
    P3 -->|not allowed by SCP| DENY
    P3 -->|allowed| P4
    P4 -->|resource policy allows| ALLOW
    P4 -->|no resource policy match| P5
    P5 -->|identity policy allows| P6
    P5 -->|no allow| DENY
    P6 -->|within boundary| P7
    P6 -->|outside boundary| DENY
    P7 -->|session policy allows| ALLOW
    P7 -->|no allow| DENY
```

**Condition evaluation**: IAM combines condition operators and keys according to the policy grammar; multiple values, negated operators, set operators, and missing context keys change the result. Do not reduce evaluation to a universal “AND within, OR across” rule. Use the policy simulator or a denied test request with the exact principal, resource, action, and context keys.

---

## 8. RDS Multi-AZ: Synchronous Replication Internals

```mermaid
sequenceDiagram
    participant App as Application
    participant Primary as RDS Primary (AZ-1)
    participant Standby as RDS Standby (AZ-2)
    participant EBS_P as EBS Primary Volume
    participant EBS_S as EBS Standby Volume

    App->>Primary: INSERT INTO orders(...)
    Primary->>EBS_P: Write WAL + data pages
    Primary->>Standby: Synchronous WAL shipping\n(PostgreSQL streaming replication)
    Standby->>EBS_S: Apply WAL → replicate pages
    Standby-->>Primary: WAL position confirmed
    Primary-->>App: COMMIT OK

    Note over Primary: Primary instance failure
    Note over Primary: EBS primary unavailable
    Note over Standby: Automatic failover triggered\n(Route 53 CNAME update: ~60-120s)
    App->>Standby: Connection via CNAME endpoint\n(Standby promoted to primary)
    Standby-->>App: Requests served
```

### Read Replica Architecture (Asynchronous)

Read replicas use **asynchronous** log shipping. Unlike Multi-AZ (synchronous, same-region failover), read replicas can lag minutes and are used for **read scaling**, not HA:

```
Primary → WAL chunks → replica_1 (async, may lag)
                     → replica_2 (async, may lag)
                     → replica_3 (cross-region, higher lag)
```

---

## 9. CloudFront CDN Internals: Edge Caching

```mermaid
flowchart TD
    subgraph "CloudFront Request Flow"
        USER["User in Tokyo"]
        EDGE["CloudFront Edge\n(Tokyo PoP)\n220+ PoPs globally"]
        REG_EDGE["Regional Edge Cache\n(Osaka — larger cache tier)"]
        ORIGIN["Origin: S3 bucket in us-east-1"]

        USER -->|1. DNS: cf-id.cloudfront.net\nresolves to nearest PoP| EDGE
        EDGE -->|2. Cache HIT| USER
        EDGE -->|3. Cache MISS| REG_EDGE
        REG_EDGE -->|4. Cache HIT in regional cache| EDGE
        REG_EDGE -->|5. Cache MISS → origin fetch| ORIGIN
        ORIGIN -->|6. Response + Cache-Control headers| REG_EDGE
        REG_EDGE -->|cache + forward| EDGE
        EDGE -->|cache + respond| USER
    end
```

### Cache Key Composition

```
Default cache key = host + path + query string params (configured)
Vary headers (Accept-Encoding: gzip,br) → separate cache variants
CloudFront Functions: modify cache key in edge compute (sub-ms JS runtime)
Lambda@Edge: full Node.js (origin/response/request phase — 5ms max)
```

---

## 10. AWS Auto Scaling: Control Loop Mechanics

```mermaid
flowchart TD
    subgraph "Target Tracking Scaling"
        METRIC["CloudWatch Metric\ne.g., ALBRequestCountPerTarget = 1500\ntarget = 1000 req/target"]
        CALC["desired_capacity = ceil(current_metric / target)\n= ceil(1500/1000) * current_instances\n= 1.5 × 2 = 3 instances"]
        ASG["Auto Scaling Group\nLaunch 1 more instance\n(via Launch Template)"]
        COOLDOWN["Cooldown: 300s\nNo scale actions during cooldown\n(prevents thrash)"]
        METRIC --> CALC --> ASG --> COOLDOWN
    end
    subgraph "Instance Launch Flow"
        LT["Launch Template:\nAMI, instance type, SG, IAM role"]
        EC2["EC2 RunInstances API"]
        USERDATA["User Data Script\n(cloud-init runs on boot)\nInstall app, start service"]
        ALB["Register with ALB target group\nHealth check: HTTP /health 200"]
        LT --> EC2 --> USERDATA --> ALB
    end
```

---

## 11. AWS Service Internals Summary

```mermaid
block-beta
    columns 3
    block:Compute
        EC2["EC2\nNitro KVM hypervisor\nSR-IOV NIC"]
        Lambda["Lambda\nFirecracker microVM\n125ms cold boot"]
        ECS["ECS/EKS\nDocker + kubelet\non EC2 or Fargate"]
    end
    block:Storage
        S3["S3\nRS(6,2) erasure coding\nStrong consistency"]
        EBS["EBS\nNVMe over TCP\nAES-256 hardware"]
        ElastiCache["ElastiCache\nRedis replica groups\nCluster mode sharding"]
    end
    block:Network
        VPC["VPC\nVirtual switches\nOverlay (Nitro)"]
        CF["CloudFront\nEdge cache\n220+ PoPs"]
        ALB["ALB\nL7 load balancer\nWeighted target groups"]
    end
    block:Database
        RDS["RDS Multi-AZ\nSync WAL replication\nAuto failover 60-120s"]
        DynamoDB["DynamoDB\nLSM-tree + Paxos\nAuto-partition"]
        Aurora["Aurora\n6-way replication\n3 AZs, 6 copies"]
    end
```

---

## AWS Shared Responsibility Model: Technical Boundaries

| Layer | AWS Responsible | Customer Responsible |
|---|---|---|
| Physical hardware | ✅ Nitro cards, BIOS, firmware | — |
| Hypervisor | ✅ Nitro hypervisor isolation | — |
| Host OS | ✅ Patching, updates | — |
| Guest OS | — | ✅ Patch EC2 AMI |
| Network ACLs | ✅ VPC infrastructure | ✅ Configure rules |
| Data at rest | ✅ Hardware AES-256 option | ✅ Enable encryption |
| IAM permissions | ✅ Policy engine | ✅ Write least-privilege policies |
| Application code | — | ✅ Vulnerabilities are yours |
