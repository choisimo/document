# 데이터 마이닝 및 빅 데이터 내부: 내부

> 소스 합성: Hadoop MapReduce 내부, Spark RDD/DAG 실행, Flink 스트리밍, 열 저장소 압축, LSM 트리 및 데이터 마이닝 알고리즘을 다루는 데이터 마이닝 및 빅 데이터 참고서(comp 234–240, 268–290, 310, 436–438, 441, 446, 448, 453–454, 488).

---

## 1. Hadoop MapReduce — 실행 내부

```mermaid
flowchart TD
    subgraph MapReduce Pipeline
        Input["HDFS Input Files\n(128MB blocks)"]
        IS["InputSplit\n(logical split ≤ 1 block)\n→ 1 Map task per split"]
        Map["Map Tasks (parallel)\nmap(k1,v1) → list(k2,v2)\nrun on same DataNode as block\n(data locality)"]
        Buffer["In-memory Sort Buffer\n(io.sort.mb=100MB default)\nSpillThreshold=0.80\n→ sorted runs spilled to disk"]
        Combine["Combiner (optional)\nlocal reduce-like aggregation\nbefore shuffle\n→ reduces network traffic"]
        Shuffle["Shuffle + Sort\nHTTP fetch from Map outputs\n→ merge-sort by key\n(external merge sort)\nGrouped by key for Reduce"]
        Reduce["Reduce Tasks\nreduce(k2, list(v2)) → list(k3,v3)"]
        Output["HDFS Output\n(replication factor=3)"]
    end

    Input --> IS --> Map --> Buffer --> Combine --> Shuffle --> Reduce --> Output

    subgraph HDFS Block Layout
        NN["NameNode\n- fsimage: namespace tree\n- edit log: recent mutations\n- block→DataNode mapping (in-memory)\n- heartbeat every 3s\n- block report every 6h"]
        DN["DataNode × N\n- store 128MB block files\n- block scanner: CRC32 verify\n- pipeline write: client → DN1 → DN2 → DN3"]
        NN <-->|"RPC"| DN
    end
```

### MapReduce Shuffle 심층 분석

```mermaid
sequenceDiagram
    participant Map as Map Task
    participant Buffer as Sort Buffer (RAM)
    participant Disk as Local Disk (spill files)
    participant Reduce as Reduce Task

    Map->>Buffer: output (k,v) pairs
    Note over Buffer: buffer fill → quicksort in-place by (partition, key)
    Buffer->>Disk: spill sorted run to disk (spill.N)
    Note over Disk: multiple spills → merge-sort into single file per Map task
    Reduce->>Map: HTTP GET /mapOutput?mapId=...&reduce=R
    Note over Reduce: fetch from all Map tasks (shuffle phase)
    Reduce->>Reduce: merge-sort fetched segments
    Note over Reduce: on-disk merge if too many segments\n→ k-way merge with priority queue
    Reduce->>Reduce: reduce() called for each key group
```

---

## 2. Apache Spark — RDD, DAG 및 실행

```mermaid
flowchart TD
    subgraph Spark Application Architecture
        Driver["Driver Process\n- SparkContext\n- DAGScheduler\n- TaskScheduler\n- BlockManagerMaster"]
        EM["Executor Manager\n(YARN/K8s ResourceManager)"]
        E1["Executor 1\n- BlockManager\n- Task threads (cores=4)\n- JVM heap + off-heap"]
        E2["Executor 2\n- BlockManager\n- Task threads"]
    end

    Driver -->|"task launch"| E1 & E2
    Driver <-->|"resource negotiation"| EM
    E1 <-->|"shuffle data"| E2

    subgraph RDD Lineage (Lazy Evaluation)
        R1["textFile('/data/log')\n(HadoopRDD)"]
        R2["filter(line => line.contains('ERROR'))\n(FilteredRDD)"]
        R3["map(line => (line.split(' ')(0), 1))\n(MappedRDD)"]
        R4["reduceByKey(_ + _)\n(ShuffledRDD)\n← STAGE BOUNDARY (shuffle)"]
        R5["collect()\n← ACTION → triggers execution"]
        R1 --> R2 --> R3 --> R4 --> R5
    end
```

### DAG 스케줄러 — 단계 분할

```mermaid
flowchart LR
    subgraph DAGScheduler
        Action["collect() action"]
        Stage2["ResultStage\n(after shuffle)\nTask: read ShuffleMapOutput\n→ reduceByKey → output"]
        Stage1["ShuffleMapStage\n(before shuffle boundary)\nTask: read HDFS block\n→ filter → map\n→ write shuffle files"]
        TaskScheduler["TaskScheduler\nSchedule tasks on executors\n(data locality: PROCESS_LOCAL\n → NODE_LOCAL → RACK_LOCAL → ANY)"]
    end
    Action --> Stage2
    Stage2 -->|"depends on shuffle output of"| Stage1
    Stage1 & Stage2 --> TaskScheduler
```

### 셔플 내부(정렬 기반)

```mermaid
flowchart TD
    subgraph Spark Sort Shuffle
        Map2["Map Task output\n(key,value) pairs"]
        Serialize["Serialize to byte[] (Kryo / Java)"]
        SortPartition["Sort by (partition_id, sort_key)\nusing Tungsten's off-heap sorter\n(unsafe memory, no GC pressure)"]
        IndexFile["shuffle_{mapId}_{reduceId}.index\n(byte offsets per partition)"]
        DataFile["shuffle_{mapId}_{reduceId}.data\n(all partitions concatenated)"]
        Fetch["Reduce task fetches partition slice\nvia BlockManager.getRemoteBytes()\n(HTTP or direct memory transfer)"]
    end
    Map2 --> Serialize --> SortPartition
    SortPartition --> IndexFile & DataFile
    DataFile --> Fetch
    IndexFile --> Fetch
```

---

## 3. Spark Tungsten — 오프힙 바이너리 형식

```mermaid
flowchart LR
    subgraph Tungsten Memory Management
        JavaObj["Java Object\nRow: ('Alice', 30, 95.5)\nJVM: 80+ bytes with headers, padding"]
        UnsafeRow["UnsafeRow (binary)\n8B null bitmap\n8B fixed-width field 0 (ptr+len for string)\n8B fixed-width field 1 (30 as long)\n8B fixed-width field 2 (95.5 as double)\n+ variable-length data (Alice bytes)\nTotal: ~48 bytes, cache-line friendly"]
        NoCopy["No deserialization needed\nDirect unsafe memory reads\nComparisons on raw bytes\n→ 2-5× less memory, no GC"]
    end
    JavaObj --> UnsafeRow --> NoCopy

    subgraph Whole-Stage Code Generation
        Interpreted["Interpreted Volcano:\nfor each row:\n  Filter.next() calls Map.next() calls Scan.next()\n  → virtual dispatch, no loop fusion"]
        Codegen["Whole-Stage Codegen:\ngenerate single tight loop:\nfor (row in partition) {\n  if (filter_cond) {\n    hash_agg.update(row.getLong(0), row.getDouble(1))\n  }\n}\n→ JIT-friendly, CPU register optimized"]
    end
```

---

## 4. Apache Flink — 스트리밍 실행 내부

```mermaid
flowchart TD
    subgraph Flink Architecture
        JM["JobManager\n- JobGraph → ExecutionGraph\n- CheckpointCoordinator\n- ResourceManager"]
        TM1["TaskManager 1\n- TaskSlots (1 per core)\n- Network buffers (32KB each)\n- Managed memory (off-heap)"]
        TM2["TaskManager 2"]
    end

    subgraph Dataflow Graph
        Source["Kafka Source\n(parallelism=8\n→ 8 source tasks)"]
        Map3["Map/Filter\n(parallelism=8)"]
        Window["WindowOperator\n(keyBy → parallel=8)\nTumbling/Sliding/Session windows"]
        Sink["Sink (parallelism=4)"]
    end

    JM --> TM1 & TM2
    Source --> Map3 --> Window --> Sink

    subgraph Network Data Exchange
        LocalFwd["Local Forward (same TM, same slot chain)\n→ in-memory buffer hand-off (0 copy)"]
        NetworkShuffle["Network Shuffle (different TM)\n→ serialize → Netty buffer pool\n→ TCP channel → deserialize\nCredit-based flow control:\nreceiver grants credits (buffer availability)\n→ sender limited by credits → no buffer overflow"]
    end
```

### Flink 체크포인트 - Chandy-Lamport 알고리즘

```mermaid
sequenceDiagram
    participant CC as CheckpointCoordinator (JM)
    participant S1 as Source 1
    participant S2 as Source 2
    participant OP as Operator (Window)
    participant Sink2 as Sink

    CC->>S1: triggerCheckpoint(checkpointId=5)
    CC->>S2: triggerCheckpoint(checkpointId=5)
    S1->>S1: snapshot state → S3/HDFS
    S1->>OP: emit BARRIER(5) into stream
    S2->>S2: snapshot state
    S2->>OP: emit BARRIER(5)
    Note over OP: Wait for BARRIER from ALL inputs (barrier alignment)
    OP->>OP: snapshot window state → S3/HDFS
    OP->>Sink2: emit BARRIER(5)
    Sink2->>Sink2: snapshot state
    Sink2-->>CC: acknowledgeCheckpoint(5)
    Note over CC: All operators acked → checkpoint complete → advance recovery point
```

---

## 5. LSM 트리 - 경로 내부 쓰기

```mermaid
flowchart TD
    subgraph LSM-Tree (RocksDB / Cassandra)
        Write["Write: PUT(key, value)"]
        WAL["WAL (Write-Ahead Log)\nappend-only, sequential write\n→ crash recovery"]
        Memtable["MemTable\n(in-memory sorted structure\nRed-Black tree or SkipList)\nwrite + read: O(log n)"]
        Immutable["Immutable MemTable\n(flipped when MemTable full ~64MB)\n→ being flushed to L0"]
        L0["L0 SSTable files\n(sorted within file\nbut keys can overlap between L0 files)\n→ 4–8 files before compaction trigger"]
        L1["L1 SSTables\n(total size ~256MB\nnon-overlapping key ranges)"]
        L2["L2 SSTables\n(total size ~2.56GB)"]
        Ln["L_n ...\n(10× size amplification per level)"]
    end

    Write --> WAL & Memtable
    Memtable --> Immutable --> L0 --> L1 --> L2 --> Ln

    subgraph Compaction (Leveled)
        Pick["Pick overlapping SSTable from L_i\nand all overlapping SSTables from L_{i+1}"]
        Merge["k-way merge (sorted iterators)\nremove tombstones (if past TTL)\ndedup: newer version wins"]
        Write2["Write new sorted SSTable to L_{i+1}\ndelete old files (atomic manifest update)"]
        Pick --> Merge --> Write2
    end
```

### SSTable 블룸 필터 + 인덱스

```mermaid
flowchart LR
    subgraph SSTable Structure
        BF["Bloom Filter\n(per file)\n~10 bits/key, 1% FPR\ncheck before disk seek\n→ avoid disk read for non-existent keys"]
        Index["Block Index\n(sparse: one entry per 4KB data block)\n{first_key → file_offset}\n→ binary search to find block"]
        DataBlocks["Data Blocks (4KB each)\n{key, value} pairs sorted\nSnappy/Zstd compressed\nCRC32 checksum"]
        Footer["Footer\noffsets of MetaIndex and Index blocks\nmagic number"]
    end
    BF --> Index --> DataBlocks --> Footer
```

---

## 6. 열 저장소 — 압축 및 벡터화된 실행

```mermaid
flowchart LR
    subgraph Column Storage (Parquet / ORC)
        Row["Row-oriented:\n[id=1, name=Alice, age=30, score=95.5]\n[id=2, name=Bob, age=25, score=87.0]\n→ read all columns even if only 'score' needed"]
        Col["Column-oriented:\nid_col:   [1,2,3,4,...]\nname_col: [Alice,Bob,Carol,...]\nage_col:  [30,25,28,...]\nscore_col:[95.5,87.0,92.3,...]\n→ read only 'score_col' for aggregation"]
    end

    subgraph Parquet Encoding Schemes
        Plain["Plain encoding:\n[30, 25, 28, 30, 25]\n(4 bytes each)"]
        DeltaEnc["Delta encoding:\nfirst=30, deltas=[−5,+3,+2,−5]\n(variable-length int → 2× smaller)"]
        RLE["Run-Length Encoding (RLE):\n[30, 30, 30, 30, 25, 25]\n→ {val=30, run=4}, {val=25, run=2}\n(highly repetitive cols: status, country)"]
        Dict["Dictionary encoding:\n{0:Alice, 1:Bob, 2:Carol}\nname_col=[0,1,2,0,1,...]\n(low-cardinality strings: 10× smaller)"]
    end
    Plain --> DeltaEnc & RLE & Dict
```

### 벡터화된 쿼리 실행

```mermaid
flowchart TD
    subgraph Vectorized vs Scalar
        Scalar["Scalar (row-at-a-time):\nfor (row : table) {\n  if (row.age > 25)\n    sum += row.score;\n}\n→ function call overhead per row\nbranch misprediction"]
        Vector["Vectorized (batch of 1024 rows):\nSIMD AVX-512 comparison:\nmask = age_col[0..1023] > 25 (512-bit vector op)\nmasked sum: sum += score_col[mask]\n→ 16 FP32 ops per SIMD instruction\n→ 10–50× faster for aggregations"]
    end
    Scalar --> Vector

    subgraph Late Materialization
        Filter2["Evaluate filter on compressed column\nget matching row IDs (bitmap)\nOnly fetch other columns for matching rows\n→ avoid decompressing unwanted rows"]
    end
```

---

## 7. 빈번한 항목 집합 마이닝 - Apriori & FP-Growth

```mermaid
flowchart TD
    subgraph Apriori Algorithm
        D["Transaction database\nT1: {milk, bread, beer}\nT2: {milk, bread}\nT3: {bread, beer, diapers}"]
        C1["C1 (candidate 1-itemsets):\n{milk:2, bread:3, beer:2, diapers:1}"]
        L1["L1 (freq 1-itemsets, minSup=2):\n{milk:2, bread:3, beer:2}"]
        C2["C2 (candidate 2-itemsets from L1):\n{milk,bread}, {milk,beer}, {bread,beer}"]
        L2["L2 (freq 2-itemsets):\n{milk,bread:2}, {bread,beer:2}"]
        Prune["Anti-monotone pruning:\nif {milk,beer,bread} has subset {milk,beer} not freq\n→ prune (all subsets must be frequent)"]
    end
    D --> C1 --> L1 --> C2 --> L2 --> Prune

    subgraph FP-Growth (no candidate generation)
        FPTree["FP-Tree:\ncompressed prefix tree\nheader table → linked list per item\nTwo DB scans: 1. freq items 2. build tree"]
        ConditionalDB["Conditional Pattern Base:\nfor each freq item β:\n  extract all paths to β\n  form conditional FP-tree\n  mine recursively"]
        FPTree --> ConditionalDB
    end
```

---

## 8. K-평균 군집화 — Lloyd의 알고리즘 내부

```mermaid
flowchart TD
    subgraph K-Means Iteration
        Init["Initialize k centroids\n(K-means++: D² weighted sampling\n→ spread-out initialization)"]
        Assign["Assignment step:\nfor each point x_i:\n  c(x_i) = argmin_k ‖x_i - μ_k‖²\n(nearest centroid)\nO(n·k·d) per iteration"]
        Update["Update step:\nμ_k = (1/|C_k|) Σ_{x∈C_k} x\n(mean of assigned points)"]
        Converge["Convergence:\ncentroids change < ε\nor max_iter reached\nObjective: minimize inertia\n= Σ_i min_k ‖x_i - μ_k‖²"]
    end
    Init --> Assign --> Update --> Converge
    Update -->|"not converged"| Assign

    subgraph Distributed K-Means (Spark MLlib)
        Partitions["Partitions: data distributed across executors"]
        LocalSum["Local aggregation:\neach partition sums points per cluster\n→ (cluster_id, sum_vector, count)"]
        GlobalReduce["Driver reduces partial sums:\nμ_k = Σ(local_sum_k) / Σ(local_count_k)"]
        Broadcast["Broadcast new centroids to all executors"]
        Partitions --> LocalSum --> GlobalReduce --> Broadcast --> LocalSum
    end
```

---

## 9. 연관 규칙 마이닝 - 신뢰도 및 상승도

```mermaid
flowchart LR
    subgraph Rule Metrics
        Sup["Support(A→B) = P(A∪B)\nfraction of transactions containing both A and B\n= count(A∪B) / |D|"]
        Conf["Confidence(A→B) = P(B|A)\n= support(A∪B) / support(A)\n= P(A∪B) / P(A)"]
        Lift["Lift(A→B) = confidence(A→B) / support(B)\n= P(A∪B) / (P(A)·P(B))\nLift>1: positive correlation\nLift=1: independent\nLift<1: negative correlation"]
        Conv["Conviction(A→B) = (1-support(B)) / (1-confidence(A→B))\n→ measures departure from independence\nConv=∞ if conf=1 (perfect implication)"]
    end

    subgraph Rule Generation from Frequent Itemsets
        FreqItemsets["Frequent itemsets L_k\n(already computed by Apriori/FP-Growth)"]
        GenRules["For each L_k = {i1,...,ik}:\n  generate all non-empty subsets s\n  if conf(s → L_k - s) ≥ minConf:\n    output rule s → L_k - s"]
        AntiMono["Anti-monotone pruning on rules:\nif s → L_k-s has low conf\nall subsets of s also have lower conf\n→ prune descendants in rule lattice"]
        FreqItemsets --> GenRules --> AntiMono
    end
```

---

## 10. 스트리밍 데이터 - 저장소 샘플링 및 최소 카운트 스케치

```mermaid
flowchart TD
    subgraph Reservoir Sampling (Vitter's Algorithm R)
        Stream["Infinite stream x_1, x_2, ..., x_n, ..."]
        Reservoir["Reservoir R[1..k]\n(k randomly selected items)"]
        Process["For each new item x_i (i > k):\n  j = random(1, i)\n  if j ≤ k:\n    R[j] = x_i  (replace with prob k/i)\n→ each item has equal probability k/i of being in reservoir\n→ uniform random sample without knowing stream length"]
        Stream --> Reservoir --> Process
    end

    subgraph Count-Min Sketch (Frequency Estimation)
        Sketch["Data structure:\nw×d array of counters\n(e.g. w=2000, d=5)"]
        Hash["d independent hash functions h_1,...,h_d\n(pairwise independent)"]
        Update["Update(x, count):\nfor i in 1..d:\n  sketch[i][h_i(x)] += count"]
        Query["Query(x):\nreturn min_i sketch[i][h_i(x)]\n→ overestimate (hash collisions add to count)\nbut never underestimate\nError: ε = e/w, δ = e^(-d)\n(ε-approximate with prob 1-δ)"]
        Sketch --> Hash --> Update & Query
    end
```

---

## 11. HDFS 쓰기 경로 — 3× 복제 파이프라인

```mermaid
sequenceDiagram
    participant Client
    participant NN as NameNode
    participant DN1 as DataNode 1
    participant DN2 as DataNode 2
    participant DN3 as DataNode 3

    Client->>NN: create file (/data/file.txt)
    NN-->>Client: block locations: [DN1, DN2, DN3]
    Client->>DN1: writeBlock (64KB packets)
    DN1->>DN2: pipeline forward
    DN2->>DN3: pipeline forward
    DN3-->>DN2: ACK
    DN2-->>DN1: ACK
    DN1-->>Client: ACK (packet acknowledged)
    Note over Client,DN3: repeat for each 64KB packet
    Client->>NN: addBlock (when block full, 128MB)
    NN->>NN: record block locations in metadata
    Client->>NN: complete (file closed)
    Note over NN: blockReport from DNs verifies replication
```

---

## 12. 데이터 웨어하우스 — 스타 스키마 및 쿼리 최적화

```mermaid
flowchart LR
    subgraph Star Schema
        Fact["Fact Table (sales_fact)\norder_id, date_id, customer_id, product_id\nquantity, revenue\n(100M+ rows, clustered on date_id)"]
        DimDate["Dim_Date\ndate_id, year, quarter, month, day_of_week\n(365 rows/year)"]
        DimCustomer["Dim_Customer\ncustomer_id, name, country, segment\n(1M rows)"]
        DimProduct["Dim_Product\nproduct_id, category, brand, price_tier\n(100K rows)"]
        Fact --- DimDate & DimCustomer & DimProduct
    end

    subgraph OLAP Query Optimization
        StarJoin["Star Join optimization:\nbuild hash tables for small dimensions in memory\nprobe fact table row-by-row\n→ Bitmap join index: precompute dim FK bitmaps\n→ AND bitmaps → only access matching fact rows"]
        Partition["Partition pruning:\nWHERE date_id BETWEEN 2024_01 AND 2024_03\n→ skip 75% of partitions\n→ scan only Q1 partitions"]
        ColScan["Column scan (Parquet):\nSELECT SUM(revenue) GROUP BY country\n→ read only revenue + customer_id columns\n+ join with dim_customer for country\n→ skip 8/10 fact table columns"]
    end
```

---

## 13. PageRank — 반복 그래프 계산

```mermaid
flowchart TD
    subgraph PageRank Algorithm
        Init["Initialize: PR(v) = 1/N for all vertices"]
        Iter["Each iteration:\nPR(v) = (1-d)/N + d × Σ_{u→v} PR(u)/out_degree(u)\nd = damping factor = 0.85\n(random surfer: 85% follow link, 15% teleport)"]
        Conv2["Converge when:\n‖PR_{t+1} - PR_t‖_1 < ε"]
    end
    Init --> Iter --> Conv2
    Iter -->|"not converged"| Iter

    subgraph Spark GraphX Implementation
        RDD_V["RDD[VertexId, PRValue]\n(partitioned by VertexId hash)"]
        RDD_E["RDD[EdgeTriplet]\n(src, dst, srcPR, outDegree)"]
        SendMsg["sendMsg: edge → (dst, src_PR/out_degree)"]
        Merge["mergeMsg: sum incoming messages per vertex"]
        Update["updateVertex: apply PageRank formula\n+ add dangling node mass"]
        RDD_V --> RDD_E --> SendMsg --> Merge --> Update --> RDD_V
    end
```

---

## 14. 성능 수치

```mermaid
block-beta
  columns 2
  block:hadoop_perf["Hadoop MapReduce"]:1
    h1["Map task startup: ~1–2s (JVM launch)"]
    h2["Shuffle I/O: bottleneck for large jobs"]
    h3["Sort buffer: io.sort.mb=100–512MB per task"]
    h4["Typical job: minutes to hours"]
  end
  block:spark_perf["Apache Spark"]:1
    s1["Task startup: ~10ms (JVM reuse)"]
    s2["In-memory cache: 10–100× faster than disk"]
    s3["Shuffle: ~50–200ms for 100M rows"]
    s4["Tungsten off-heap: 2–5× less memory than Java objs"]
  end
  block:lsm_perf["LSM-Tree (RocksDB)"]:1
    l1["Write: ~100K–1M ops/sec (sequential WAL)"]
    l2["Point read: ~100–500K ops/sec"]
    l3["Compaction write amp: 10–30× leveled"]
    l4["Bloom filter FPR: 1% at 10 bits/key"]
  end
  block:col_perf["Column Store"]:1
    c1["Scan 1B rows, 1 column: ~1–10s (Parquet+Spark)"]
    c2["Dictionary encoding: 10× compression for strings"]
    c3["SIMD vectorized filter: 50–200M rows/sec per core"]
    c4["Late materialization: 5–10× vs row scan"]
  end
```

---

## 주요 내용

- **MapReduce 셔플**은 주요 I/O 비용입니다. 결합기는 로컬 사전 집계를 수행하여 네트워크 바이트를 줄입니다. Spill 파일은 Reduce 전에 외부 k-way 병합을 사용하여 병합 정렬됩니다.
- **Spark DAG**는 셔플 경계에서 단계로 분할됩니다. 단계 내의 작업은 완전히 파이프라인됩니다(연산자 간 직렬화 없음). 텅스텐 오프힙 행으로 GC 일시중지 방지
- **LSM-Tree**는 읽기 증폭을 희생하면서 무작위 쓰기를 순차 I/O(MemTable → WAL → 정렬된 SSTable 파일)로 변환하여 높은 쓰기 처리량을 달성합니다(여러 레벨을 확인해야 함).
- SSTable의 **블룸 필터**는 포인트 쿼리 누락을 O(레벨) 대신 O(1) I/O로 만듭니다. 키당 10비트는 ~1%의 거짓 긍정 비율을 제공합니다.
- **열 저장소 + 사전 인코딩**은 카디널리티가 낮은 열(국가, 상태, 범주)에 가장 효과적입니다. 단조롭게 증가하는 타임스탬프에 대한 델타 인코딩; 반복되는 값에 대한 RLE
- **FP-Growth**는 압축된 접두사 트리를 구축하고 조건부 데이터베이스를 반복적으로 마이닝하여 Apriori의 기하급수적인 후보 생성을 방지합니다. 밀도가 높은 데이터 세트의 경우 훨씬 더 빠릅니다.
- **Flink 체크포인트**는 Chandy-Lamport 장벽 주입을 사용합니다. 장벽은 데이터 흐름 그래프를 통해 흐릅니다. 모든 입력의 장벽이 도착하면 운영자는 상태를 스냅샷합니다(정렬된 체크포인트).
