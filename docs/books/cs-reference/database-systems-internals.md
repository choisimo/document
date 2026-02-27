# Database Systems Internals: Under the Hood

> Synthesized from: Elmasri & Navathe *Fundamentals of Database Systems* 6th ed, Korotkevitch *Pro SQL Server Internals* 2nd ed, MySQL database design references, and supporting comp(85/230/305-322) database references.

---

## 1. Storage Engine Architecture — Pages, Extents, and Buffer Pool

Every relational database manages storage through a **page-based** abstraction layer. Understanding page anatomy is the foundation for all performance analysis.

### InnoDB Page Layout (16 KB default)

```
+------------------+ offset 0
| File Header      | 38 bytes: page type, LSN, space_id, page_no, checksum
+------------------+
| Page Header      | 56 bytes: slot count, free space, garbage ptr, level
+------------------+
| Infimum Record   | virtual lower bound record (fixed)
+------------------+
| User Records     | actual row data (grows toward free space)
|   ↓              |
+------------------+
| Free Space       | unallocated area between records and directory
|   ↑              |
+------------------+
| Page Directory   | 2-byte slots, each points to record (grows upward)
| (Slot Array)     | binary searchable: O(log n) slot scan
+------------------+
| File Trailer     | 8 bytes: LSN checksum verification
+------------------+ offset 16383
```

Page types: `FIL_PAGE_INDEX` (B+Tree node), `FIL_PAGE_UNDO_LOG`, `FIL_PAGE_INODE`, `FIL_PAGE_IBUF_BITMAP`, `FIL_PAGE_TYPE_SYS`, `FIL_PAGE_BLOB`.

### Buffer Pool Architecture

```mermaid
flowchart TD
    subgraph Buffer_Pool["InnoDB Buffer Pool (e.g. 8 GB)"]
        direction TB
        LRU_NEW["LRU New Sublist (5/8)\nHot pages - recently accessed"]
        LRU_OLD["LRU Old Sublist (3/8)\nCold pages - aging out"]
        FREE["Free Page List"]
        FLUSH["Flush List\n(dirty pages ordered by LSN)"]
        LRU_NEW <-->|"midpoint insertion\nnewly read → old head"| LRU_OLD
        LRU_OLD -->|"page not re-accessed\nwithin innodb_old_blocks_time (1s)"| LRU_NEW
        LRU_OLD -->|"eviction"| FREE
    end

    SQL["SQL Query"] --> BUF_LOOKUP{"Page in\nbuffer pool?"}
    BUF_LOOKUP -->|"hit"| RETURN["Return page\nno disk I/O"]
    BUF_LOOKUP -->|"miss"| FREE
    FREE -->|"read page from\ntablespace file"| LRU_OLD
```

**Double-write buffer**: Before flushing dirty pages to tablespace, InnoDB writes them sequentially to the doublewrite buffer (2 MB, 128 pages). This protects against partial page writes (torn pages) during crash — recovery reads from doublewrite if page checksum fails.

---

## 2. B+Tree Index Internals

### Node Structure and Split Algorithm

```mermaid
flowchart TD
    Root["Root Node\nPage 4\n[K1=50, K2=150]\nPtrs: [P1, P2, P3]"] 
    
    Root -->|"P1: key < 50"| L1["Leaf Page\n[10,20,30,40]\nPrev←→Next ptrs"]
    Root -->|"P2: 50 ≤ key < 150"| L2["Leaf Page\n[50,80,100,120]\nPrev←→Next ptrs"]
    Root -->|"P3: key ≥ 150"| L3["Leaf Page\n[150,200,250]\nPrev←→Next ptrs"]

    L1 <-->|"sibling links\nfor range scans"| L2
    L2 <-->| | L3
```

### Page Split on INSERT

When a leaf page reaches capacity (fill factor ~69% to leave room for updates):

```mermaid
sequenceDiagram
    participant TX as Transaction
    participant BP as Buffer Pool
    participant BT as B+Tree

    TX->>BT: INSERT (key=75)
    BT->>BP: Find leaf page containing 75
    Note over BP: Page has 15/15 records — FULL
    BT->>BP: Allocate new page N
    BT->>BT: Split: move upper half to N\nInsert separator key 88 into parent
    Note over BT: Parent also full? → recursive split upward
    BT->>BP: Write both pages to flush list (dirty)
    BT->>TX: Insert complete (record in new page N)
```

**Clustered index** (InnoDB primary key): Entire row stored in B+Tree leaf. Physical order = PK order. Fragmentation occurs on random PK inserts (UUID PKs = worst case).

**Secondary index**: Leaf stores `(secondary_key, primary_key)`. Point lookup: secondary index B+Tree → PK value → clustered index B+Tree (two B+Tree traversals = "bookmark lookup").

### Index Fill Factor and Fragmentation

```mermaid
flowchart LR
    A["Sequential INSERT\n(AUTO_INCREMENT PK)\nPages fill left-to-right\nFill factor ~95%"] -->|"ANALYZE TABLE"| B["Fragmentation: ~0%"]
    C["Random INSERT\n(UUID PK or random hash)\nPage splits everywhere\nFill factor ~50-69%"] -->|"ANALYZE TABLE"| D["Fragmentation: 30-50%\nALTER TABLE FORCE or\nOPTIMIZE TABLE to rebuild"]
```

---

## 3. InnoDB MVCC — Undo Log Chain

MVCC (Multi-Version Concurrency Control) enables readers to never block writers. Every row version is chained through undo logs.

### Row Version Chain

```mermaid
flowchart LR
    CURRENT["Clustered Index Leaf\nROW: id=5, salary=75000\nDB_TRX_ID=1005\nDB_ROLL_PTR → undo"]
    
    UNDO1["Undo Log Segment\nOld version: salary=70000\nDB_TRX_ID=998\nROLL_PTR → prev undo"]
    
    UNDO2["Undo Log Segment\nOld version: salary=65000\nDB_TRX_ID=750\nROLL_PTR → null"]

    CURRENT -->|"DB_ROLL_PTR\n(7-byte rollback ptr)"| UNDO1
    UNDO1 -->|"prev rollback ptr"| UNDO2
```

### Read View Mechanism

```mermaid
sequenceDiagram
    participant TX100 as Transaction 100 (long-running read)
    participant TX1005 as Transaction 1005 (writer)
    participant TRX_SYS as trx_sys (active list)

    Note over TX100: BEGIN; → ReadView created\nup_limit_id=999, low_limit_id=1000\nids_list=[998,999]

    TX1005->>TRX_SYS: UPDATE row (trx_id=1005)
    TX1005->>TRX_SYS: COMMIT

    TX100->>TRX_SYS: SELECT salary FROM employees WHERE id=5
    Note over TX100: Row has DB_TRX_ID=1005\n1005 >= low_limit_id(1000) → INVISIBLE\nWalk undo chain → find DB_TRX_ID=750 < up_limit_id(999)\n→ VISIBLE: return salary=65000
```

**Purge thread**: Background thread (`srv_purge_coordinator_thread`) cleans undo logs when no active ReadView needs them. Long-running transactions prevent purge → undo tablespace grows unboundedly (classic `ibdata1` bloat problem).

---

## 4. Transaction Log (WAL) and Crash Recovery

### Write-Ahead Logging Protocol

```mermaid
flowchart TD
    TX["Transaction: UPDATE row"] --> UNDO_WRITE["1. Write UNDO log record\n(before-image of row)"]
    UNDO_WRITE --> BUFFER["2. Modify page in buffer pool\n(dirty page, not written yet)"]
    BUFFER --> REDO_WRITE["3. Write REDO log (WAL)\nLog record: {LSN, space_id, page_no,\noffset, before, after}\nfsync to redo log file"]
    REDO_WRITE --> COMMIT["4. COMMIT: write commit log record\nfsync (innodb_flush_log_at_trx_commit=1)\n→ durability guaranteed"]
    COMMIT --> FLUSH["5. Background: flush dirty\npages from buffer pool to .ibd\n(checkpoint advances LSN)"]
```

**LSN (Log Sequence Number)**: monotonically increasing byte offset into redo log. Every page header stores `FIL_PAGE_LSN` = LSN of last modification. Pages with `page_LSN < checkpoint_LSN` are guaranteed durable.

### Crash Recovery — ARIES Algorithm

```mermaid
sequenceDiagram
    participant Recovery as InnoDB Recovery
    participant RedoLog as Redo Log
    participant UndoLog as Undo Log

    Note over Recovery: Phase 1: ANALYSIS\nScan redo log from last checkpoint\nBuild dirty page table, active TX table

    Recovery->>RedoLog: Phase 2: REDO (Roll Forward)\nReplay ALL log records from checkpoint LSN\nEven uncommitted TXs are redone\n(brings DB to crash-moment state)

    Recovery->>UndoLog: Phase 3: UNDO (Roll Back)\nFor each uncommitted TX in active TX table\nApply undo records in reverse LSN order\n(atomicity: partial TXs rolled back)

    Note over Recovery: Database consistent\nNormal operation resumes
```

---

## 5. Query Execution Pipeline

### Query Lifecycle

```mermaid
flowchart TD
    A["SQL String:\nSELECT u.name, COUNT(o.id)\nFROM users u JOIN orders o ON u.id=o.user_id\nWHERE u.region='US' GROUP BY u.id"] 
    
    A --> B["Parser\nLex/Yacc → AST\nSyntax validation\nIdentifier resolution"]
    B --> C["Semantic Analyzer\nTable/column existence\nPermission check\nType coercion"]
    C --> D["Query Rewriter\nView expansion\nSubquery → JOIN\nIN → EXISTS transformation"]
    D --> E["Cost-Based Optimizer\nEnumerate join orders\nIndex access path selection\nCardinality estimation"]
    E --> F["Execution Plan\nIterator tree of operators\nEach operator: open/next/close"]
    F --> G["Execution Engine\nVolcano/Iterator model\nPull-based evaluation"]
    G --> H["Result rows to client"]
```

### Cost-Based Optimizer — Index Selection

```mermaid
flowchart TD
    A["Predicate: WHERE region='US' AND created_at > '2024-01-01'"] 
    
    A --> B["Statistics lookup\ninnodb_index_stats table\ncardinality per index"]
    
    B --> C["Option 1: Full table scan\nCost = n_rows × row_read_cost\n= 1,000,000 × 1.0 = 1,000,000"]
    
    B --> D["Option 2: idx_region\nSELECTIVITY = 200k/1M = 20%\nRange scan cost = 200,000 + 200,000 bookmark lookups\n= 400,000"]
    
    B --> E["Option 3: idx_region_created (composite)\nSELECTIVITY = 2k/1M = 0.2%\nCost = 2,000 (index only, no bookmark lookup)\n= 2,000 ✓ CHOSEN"]

    E --> F["Execution plan: index range scan on idx_region_created\nCovering index if SELECT columns ⊆ index columns"]
```

### Volcano Iterator Model

```mermaid
sequenceDiagram
    participant Client
    participant HashAgg as HashAggregate.next()
    participant HashJoin as HashJoin.next()
    participant Scan as IndexScan.next()

    Client->>HashAgg: next()
    HashAgg->>HashJoin: next() [loop: build hash table from orders]
    HashJoin->>Scan: next() [probe side: fetch user rows]
    Scan-->>HashJoin: row {id=1, name="Alice", region="US"}
    HashJoin-->>HashAgg: joined row {name="Alice", order_count=5}
    HashAgg-->>Client: aggregated row {name="Alice", count=5}
```

**Hash join internals**: Build phase reads smaller table into in-memory hash table (`hash(join_key) → bucket → row`). Probe phase reads larger table, hashes join key, probes buckets. If hash table exceeds `join_buffer_size` → spill to disk (grace hash join with partitioning).

---

## 6. SQL Server Storage Internals (Pro SQL Server Internals)

### Data Page (8 KB)

```
+-------------------+ 0
| Page Header       | 96 bytes: pageID, type, freeCount, slotCount, nextPage, prevPage
+-------------------+
| Row 0             | Variable-length: null bitmap + fixed cols + var-length ptr array + var data
| Row 1             |
| ...               |
| Row N             |
+-------------------+
| Free Space        |
+-------------------+
| Row Offset Array  | 2 bytes per row, grows from bottom
| [N offset]        | slot[i] = byte offset of row i within page
+-------------------+ 8191
```

### Row Structure (Variable Length)

```mermaid
flowchart LR
    A["Status Bits (1B)\nhas_nulls, has_var_cols"] --> B["Fixed-length data\ncols in schema order\ne.g. int(4B) + tinyint(1B)"]
    B --> C["Null bitmap\n1 bit per nullable col"]
    C --> D["Variable col count (2B)"]
    D --> E["Variable col offset array\n2B per var col\n→ end offset of each var col"]
    E --> F["Variable-length data\nVARCHAR/NVARCHAR contents"]
```

**Forwarded records**: When UPDATE increases row size beyond page capacity, row moved to new page. Original slot gets an 8-byte forwarding pointer. Heap scans follow forwarding pointers — performance degrades. Fix: `ALTER TABLE REBUILD` (clustered index) eliminates forwarded records.

### SQL Server Lock Hierarchy

```mermaid
flowchart TD
    DB["Database Lock\n(IS, S, IX, SIX, X)"] --> TABLE["Table Lock\n(IS, S, IX, SIX, X)"]
    TABLE --> PAGE["Page Lock\n(IS, S, IX, SIX, X)"]
    PAGE --> ROW["Row (Key) Lock\n(S, U, X, RangeS-S, RangeI-N, ...)"]
```

**Lock escalation**: SQL Server escalates row/page locks to table lock when lock count exceeds ~5000 per transaction (to reduce memory overhead). Can cause blocking. Disable with `ALTER TABLE ... SET (LOCK_ESCALATION = DISABLE)`.

**NOLOCK hint / READ UNCOMMITTED**: Reads pages without acquiring shared locks → dirty reads possible (sees uncommitted data, phantom rows, even rolled-back data mid-flight).

---

## 7. Transaction Isolation Levels and Anomaly Prevention

```mermaid
flowchart TD
    subgraph Isolation_Levels
        RU["READ UNCOMMITTED\nNo locks acquired on read\nDirty read ✓, Phantom ✓"]
        RC["READ COMMITTED\nShared lock acquired + released after read\nDirty read ✗, Non-repeatable read ✓"]
        RR["REPEATABLE READ (default MySQL)\nShared lock held until TX end\nDirty ✗, Non-repeatable ✗, Phantom ✓\nInnoDB: gap locks prevent phantoms too"]
        SER["SERIALIZABLE\nRange locks / predicate locks\nAll anomalies ✗"]
        SER_SI["SNAPSHOT ISOLATION (SQL Server)\nMVCC ReadView per TX\nDirty ✗, Non-repeatable ✗, Phantom ✗\nWrite skew still possible"]
    end
```

**Gap locks (InnoDB RR)**: Lock the gap before a record, preventing INSERT into range. If `WHERE id BETWEEN 10 AND 20`, gap locks on all gaps in that range prevent concurrent INSERTs. Eliminates phantoms without full serializable isolation.

**Deadlock detection**: Each lock manager maintains a "waits-for graph". Background thread runs cycle detection (DFS). On cycle found, victim selection: smallest transaction (by undo log size) rolled back. Deadlock information written to `INFORMATION_SCHEMA.INNODB_TRX`.

---

## 8. Index Types and Access Patterns

```mermaid
flowchart TD
    subgraph Index_Types
        BTREE["B+Tree Index\nOrdered, range-scannable\nInnoDB default\nO(log n) point, O(log n + k) range"]
        HASH["Hash Index\nMemory engine only (InnoDB adaptive hash)\nO(1) exact match\nNo range scan support"]
        FULLTEXT["Full-Text Index\nInverted index: term → {docid, position}\nMySQL: FTS_DOC_ID column\nTFIDF/BM25 ranking"]
        SPATIAL["Spatial Index (R-Tree)\nMBR nesting, bounding box queries\nMySQL geometry types\nST_Contains, ST_Distance"]
        BITMAP["Bitmap Index (Oracle/columnar)\nBit vector per distinct value\nEfficient for low-cardinality cols\nAND/OR = bitwise ops"]
    end
```

### Covering Index — Eliminating Bookmark Lookup

```mermaid
flowchart LR
    A["Query: SELECT name, email\nFROM users WHERE region='US'"]

    A --> B{Index covers\nname, email, region?}
    B -->|"No (idx_region only)"| C["Index Range Scan → 200k PKs\n200k Bookmark Lookups to clustered index\n200k random I/Os ← SLOW"]
    B -->|"Yes (idx_region_name_email)"| D["Index Only Scan\nAll data in index leaf\n0 bookmark lookups ← FAST"]
```

---

## 9. Join Algorithms — Memory and CPU Paths

```mermaid
flowchart TD
    subgraph Nested_Loop
        A["For each row R in outer table\n  For each row S in inner table\n    IF R.key == S.key → emit\nCost: O(|R| × |S|)\nGood when inner table small or indexed"]
    end

    subgraph Hash_Join
        B["Build phase: load smaller table\ninto hash table keyed by join col\nProbe phase: scan larger table\nhash lookup per row\nCost: O(|R| + |S|)\nRequires join_buffer_size memory"]
    end

    subgraph Sort_Merge_Join
        C["Sort both inputs on join key\nTwo-pointer merge scan\nCost: O(|R|log|R| + |S|log|S|)\nGood if inputs already sorted (index)"]
    end
```

**Block Nested Loop** (MySQL pre-8.0): Read outer table in chunks of `join_buffer_size`, scan inner table once per chunk. Reduces inner table reads from `|outer|` to `|outer| / buffer_chunk_size`.

**Hash Anti-Join** (for NOT IN / NOT EXISTS): Build hash set from subquery result; for each probe row, emit only if no hash match found.

---

## 10. Write Path — Checkpoint and Redo Log Cycle

```mermaid
flowchart LR
    subgraph Memory
        BP["Buffer Pool\nDirty Pages\nFlush List (LSN ordered)"]
        LOGBUF["Log Buffer\n(in-memory redo ring)"]
    end
    subgraph Disk
        REDO["ib_logfile0\nib_logfile1\n(circular ring, e.g. 2×512MB)"]
        IBD[".ibd tablespace files"]
        DWB["Doublewrite Buffer\n(sequential write area)"]
    end

    TX["TX COMMIT"] --> LOGBUF
    LOGBUF -->|"fsync every commit\nor group commit batch"| REDO
    BP -->|"Page Cleaner thread\nflushes dirty pages\nwhen free page shortage\nor checkpoint age threshold"| DWB
    DWB -->|"atomic write\ncopy to actual page location"| IBD

    REDO -->|"space reclaimed\nafter checkpoint\nadvances past log records"| REDO
```

**Checkpoint age**: `innodb_log_file_size × 2 × 0.75` = maximum dirty data before forced flushing. If redo log fills (checkpoint age = log size), all writes STALL while checkpoint completes. Symptom: "InnoDB: page_cleaner: 1000ms intended loop took 5000ms" in error log.

---

## 11. Partitioning Internals

```mermaid
flowchart TD
    A["INSERT INTO orders (id, region, amount)\nVALUES (1001, 'APAC', 500)"]
    
    A --> B["Partition function evaluation\nRANGE: PARTITION BY RANGE(YEAR(created_at))\nHASH: PARTITION BY HASH(customer_id) PARTITIONS 16\nLIST: PARTITION BY LIST(region)"]
    
    B --> C["Partition pruning at query time\nWHERE region='APAC'\n→ only scan p_APAC partition\nOther partitions skipped entirely"]
    
    C --> D["Each partition:\nIndependent tablespace (.ibd)\nSeparate B+Tree root\nSeparate buffer pool pages\nSeparate statistics"]
```

Partition pruning requires **predicates on partition column** in WHERE clause. Without pruning, all partitions scanned — worse than non-partitioned table (more B+Tree roots to descend). Partition key must be part of every unique/primary key.

---

## 12. Column Store vs Row Store Internals

```mermaid
flowchart LR
    subgraph Row_Store["Row Store (OLTP)"]
        direction TB
        R1["Page: [id=1,name=Alice,age=25,dept=Eng]"]
        R2["Page: [id=2,name=Bob,age=30,dept=Mkt]"]
        R3["Page: [id=3,name=Carol,age=28,dept=Eng]"]
        R1 --- R2 --- R3
        N1["SELECT name WHERE id=1\n→ read 1 page, return name\nGood for point lookups"]
    end

    subgraph Col_Store["Column Store (OLAP)"]
        direction TB
        C1["Column file: id=[1,2,3,4,5...]"]
        C2["Column file: age=[25,30,28,35,22...]"]
        C3["Column file: dept=[Eng,Mkt,Eng,Eng,Mkt...]"]
        C1 --- C2 --- C3
        N2["SELECT AVG(age) WHERE dept='Eng'\n→ read only dept + age columns\nVectorized SIMD scan\nDict encoding: Eng=1,Mkt=2\nRun-length: [1,1,1,2,2...]"]
    end
```

**Dictionary encoding**: Replace string column values with integer codes. `dept` column stored as `uint8` array, dictionary: `{0: "Engineering", 1: "Marketing"}`. Compression ratio 10-100x for low-cardinality columns.

**Vectorized execution**: Process 1024 rows at once using SIMD (AVX-256: 8 × 32-bit ops per instruction). Columnar layout enables this — all values of one column contiguous in memory → CPU prefetch efficient, L1/L2 cache utilized.

---

## Database Performance Numbers Reference

| Operation | InnoDB | SQL Server | Notes |
|-----------|--------|------------|-------|
| Buffer pool hit | ~100 ns | ~100 ns | DRAM access |
| Page read from NVMe SSD | ~50 µs | ~50 µs | Sequential: ~10 µs |
| B+Tree point lookup (3 levels) | 3 × 50 µs = 150 µs | similar | Cache may save most |
| Full table scan (1M rows) | 0.5-5 sec | similar | Depends on I/O bandwidth |
| Hash join (2 × 1M rows) | 1-10 sec | similar | Spill to disk if no memory |
| Index rebuild (100M rows) | 10-60 min | similar | Online rebuild: longer |
| Checkpoint flush stall | 0-5 sec | 0-5 sec | Tunable via log file size |
| Row lock acquisition | ~1 µs | ~1 µs | In-memory hash lookup |
| Deadlock detection | ~1 ms | ~1 ms | DFS cycle detection |

---

## Summary — Data Flow Map

```mermaid
flowchart TD
    SQL["SQL Query arrives"] --> PARSE["Parse → AST"]
    PARSE --> OPT["Cost-based optimizer\nStatistics → access path"]
    OPT --> EXEC["Iterator execution tree\nVolcano pull model"]
    EXEC --> BP["Buffer Pool lookup\n(page granularity)"]
    BP -->|"miss"| DISK["Disk read\n.ibd page → buffer pool"]
    BP -->|"hit"| ROW["Row extraction\nslot array → row offset\nnull bitmap → field values"]
    ROW -->|"MVCC"| UNDO["Undo chain walk\nReadView visibility check"]
    UNDO --> RESULT["Return row to iterator"]
    
    WRITE["DML: INSERT/UPDATE/DELETE"] --> UNDOW["Write undo log"]
    UNDOW --> MODP["Modify buffer pool page\n(dirty)"]
    MODP --> REDOW["Append redo log record"]
    REDOW --> COMMIT["COMMIT → fsync redo log"]
    COMMIT --> BGFLUSH["Background: page cleaner\nflushes dirty pages"]
```

The complete lifecycle of every byte: SQL text → AST → cost-estimated plan → iterator pull → buffer pool page → MVCC undo chain → field bytes. On write: undo log (before-image) → dirty page (in-memory) → redo log (WAL, durable) → background flush to .ibd. The WAL guarantee is the bedrock: data is durable the moment redo log is fsynced, regardless of whether the actual data page is on disk.
