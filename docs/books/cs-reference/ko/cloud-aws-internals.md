# 클라우드 및 AWS 내부: 하이퍼바이저, 가상 네트워크 및 관리형 서비스

> 내부 내용: 베어 메탈에서 EC2 인스턴스를 부팅하는 방법, S3가 오류 도메인 전체에 객체를 저장하는 방법, VPC가 가상 스위치를 통해 패킷을 라우팅하는 방법, Lambda 콜드 스타트 작동 방법 등 클라우드 인프라 이면의 정확한 하드웨어, 네트워크 및 스토리지 메커니즘을 설명합니다.

---

## 1. 하이퍼바이저 아키텍처: Nitro의 EC2

AWS Nitro는 호스트 OS가 아닌 전용 하드웨어 카드에 I/O 및 보안을 오프로드하는 맞춤형 하이퍼바이저입니다.

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

### Nitro의 VM 부팅 순서

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

## 2. VPC 네트워크 아키텍처: 가상 스위치 및 라우팅

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

### 패킷 흐름: EC2에서 인터넷으로

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

### 보안 그룹: 상태 저장 패킷 검사

```mermaid
stateDiagram-v2
    [*] --> Evaluate_Egress: Outbound packet
    Evaluate_Egress --> Allowed: Rule match (allow)
    Evaluate_Egress --> Dropped: No rule match (default deny)
    Allowed --> ConnTrack: Add to connection tracking table
    ConnTrack --> PassThrough: Return traffic (automatic)\nno inbound rule needed
```

SG는 **상태 저장**(Nitro 하이퍼바이저의 Linux conntrack 테이블을 통한 연결 추적) — 인바운드 규칙은 반환 트래픽이 아닌 새 연결에 대해서만 확인됩니다.

---

## 3. S3 내부: 개체 스토리지 아키텍처

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

### 리드 솔로몬 삭제 코딩(RS 6+2)

S3는 객체를 6개의 데이터 청크로 분할하고 GF(2⁸)를 통한 리드 솔로몬 코딩을 사용하여 2개의 패리티 청크를 계산합니다.

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

### S3 일관성 모델

2020년 12월부터 S3는 모든 작업에 대해 **강력한 쓰기 후 읽기 일관성**을 제공합니다. 내부적으로 이는 직렬화 가능한 메타데이터 저장소를 사용하는 인덱스 서비스에 의해 달성됩니다. PUT 후 GET은 보장된 새 객체를 확인합니다(이전에는 덮어쓰기에 대해 최종 일관성만 유지).

---

## 4. Lambda 콜드 스타트 내부

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

### 폭죽 MicroVM

AWS Lambda는 **Firecracker**(오픈 소스 KVM 기반 microVM)를 사용합니다.

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

**콜드 스타트 분석(Python 3.11, 256MB)**:
- 폭죽 부팅: ~125ms
- Amazon Linux 초기화: ~50ms  
- Python 인터프리터 시작: ~100ms
- 고객 `import` 문: 가변(0ms~2000ms)
- **총계: 250ms~2500ms**(웜 대비: <1ms 오버헤드)

---

## 5. DynamoDB 내부: 파티셔닝 및 복제

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

### DynamoDB LSM-트리 스토리지 엔진

각 DynamoDB 파티션은 내부적으로 LSM 트리(Log-Structured Merge-Tree)를 사용합니다.

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

### DynamoDB 자동 파티셔닝(적응형 용량)

파티션이 1000WCU/s 또는 3000RCU/s를 초과하면 DynamoDB는 파티션을 분할합니다.

```
partition_id=abc → [abc_low, abc_high]
split_point = median key in partition
all keys < median → abc_low
all keys ≥ median → abc_high
Transparent to application: router table updated atomically
```

---

## 6. EBS: 블록 스토리지 내부

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

**EBS gp3 처리량**: 125MB/s 기준, 최대 1000MB/s(프로비저닝) Nitro 카드는 모든 NVMe 프로토콜, 암호화(하드웨어의 AES-256) 및 EBS 플릿에 대한 TCP 네트워킹을 처리하며 I/O용 호스트 CPU는 없습니다.

---

## 7. IAM 정책 평가 엔진

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

**조건 평가**: IAM 조건은 Condition 블록 내에서 AND를 사용하거나 여러 Condition 요소에 걸쳐 평가됩니다. `aws:RequestedRegion`, `aws:SourceVpc`, `aws:CurrentTime`는 서비스 제어 플레인에 의해 평가 시 삽입된 컨텍스트 키입니다.

---

## 8. RDS 다중 AZ: 동기식 복제 내부

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

### 읽기 전용 복제본 아키텍처(비동기)

읽기 복제본은 **비동기** 로그 전달을 사용합니다. 다중 AZ(동기식, 동일 리전 장애 조치)와 달리 읽기 전용 복제본은 몇 분 정도 지연될 수 있으며 HA가 아닌 **읽기 확장**에 사용됩니다.

```
Primary → WAL chunks → replica_1 (async, may lag)
                     → replica_2 (async, may lag)
                     → replica_3 (cross-region, higher lag)
```

---

## 9. CloudFront CDN 내부: 엣지 캐싱

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

### 캐시 키 구성

```
Default cache key = host + path + query string params (configured)
Vary headers (Accept-Encoding: gzip,br) → separate cache variants
CloudFront Functions: modify cache key in edge compute (sub-ms JS runtime)
Lambda@Edge: full Node.js (origin/response/request phase — 5ms max)
```

---

## 10. AWS Auto Scaling: 제어 루프 메커니즘

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

## 11. AWS 서비스 내부 요약

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

## AWS 공동 책임 모델: 기술 경계

| 레이어 | AWS 책임 | 고객 책임 |
|---|---|---|
| 물리적 하드웨어 | ✅ 니트로 카드, BIOS, 펌웨어 | — |
| 하이퍼바이저 | ✅ Nitro 하이퍼바이저 격리 | — |
| 호스트 OS | ✅ 패치, 업데이트 | — |
| 게스트 OS | — | ✅ EC2 AMI 패치 |
| 네트워크 ACL | ✅ VPC 인프라 | ✅ 규칙 구성 |
| 미사용 데이터 | ✅ 하드웨어 AES-256 옵션 | ✅ 암호화 활성화 |
| IAM 권한 | ✅ 정책 엔진 | ✅ 최소 권한 정책 작성 |
| 애플리케이션 코드 | — | ✅ 취약점은 당신의 것입니다 |
