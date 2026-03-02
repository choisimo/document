# 데이터베이스 시스템 내부: 내부

> 다음에서 합성됨: Elmasri & Navathe *Fundamentals of Database Systems* 6판, Korotkevitch *Pro SQL Server Internals* 2판, MySQL 데이터베이스 설계 참조 및 지원 comp(85/230/305-322) 데이터베이스 참조.

---

## 1. 스토리지 엔진 아키텍처 — 페이지, 익스텐트 및 버퍼 풀

모든 관계형 데이터베이스는 **페이지 기반** 추상화 계층을 통해 스토리지를 관리합니다. 페이지 구조를 이해하는 것은 모든 성능 분석의 기초입니다.

### InnoDB 페이지 레이아웃(기본값 16KB)

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

페이지 유형: `FIL_PAGE_INDEX`(B+트리 노드), `FIL_PAGE_UNDO_LOG`, `FIL_PAGE_INODE`, `FIL_PAGE_IBUF_BITMAP`, `FIL_PAGE_TYPE_SYS`, `FIL_PAGE_BLOB`.

### 버퍼 풀 아키텍처

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

**이중 쓰기 버퍼**: 더티 페이지를 테이블스페이스로 플러시하기 전에 InnoDB는 이를 이중 쓰기 버퍼(2MB, 128페이지)에 순차적으로 씁니다. 이는 충돌 중에 부분 페이지 쓰기(찢어진 페이지)로부터 보호합니다. 페이지 체크섬이 실패하면 복구는 이중 쓰기에서 읽습니다.

---

## 2. B+Tree 인덱스 내부

### 노드 구조 및 분할 알고리즘

```mermaid
flowchart TD
    Root["Root Node\nPage 4\n[K1=50, K2=150]\nPtrs: [P1, P2, P3]"] 
    
    Root -->|"P1: key < 50"| L1["Leaf Page\n[10,20,30,40]\nPrev←→Next ptrs"]
    Root -->|"P2: 50 ≤ key < 150"| L2["Leaf Page\n[50,80,100,120]\nPrev←→Next ptrs"]
    Root -->|"P3: key ≥ 150"| L3["Leaf Page\n[150,200,250]\nPrev←→Next ptrs"]

    L1 <-->|"sibling links\nfor range scans"| L2
    L2 <-->| | L3
```

### INSERT 시 페이지 분할

리프 페이지가 용량에 도달하면(업데이트 공간을 남겨두기 위한 채우기 비율 ~69%):

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

**클러스터형 인덱스**(InnoDB 기본 키): B+Tree 리프에 저장된 전체 행입니다. 물리적 주문 = PK 주문. 조각화는 무작위 PK 삽입 시 발생합니다(UUID PK = 최악의 경우).

**보조 색인**: 리프는 `(secondary_key, primary_key)`을 저장합니다. 포인트 조회: 보조 인덱스 B+Tree → PK 값 → 클러스터형 인덱스 B+Tree(2개의 B+Tree 순회 = "북마크 조회").

### 인덱스 채우기 비율 및 조각화

```mermaid
flowchart LR
    A["Sequential INSERT\n(AUTO_INCREMENT PK)\nPages fill left-to-right\nFill factor ~95%"] -->|"ANALYZE TABLE"| B["Fragmentation: ~0%"]
    C["Random INSERT\n(UUID PK or random hash)\nPage splits everywhere\nFill factor ~50-69%"] -->|"ANALYZE TABLE"| D["Fragmentation: 30-50%\nALTER TABLE FORCE or\nOPTIMIZE TABLE to rebuild"]
```

---

## 3. InnoDB MVCC — 실행 취소 로그 체인

MVCC(Multi-Version Concurrency Control)를 사용하면 리더가 작성자를 차단하지 않습니다. 모든 행 버전은 실행 취소 로그를 통해 연결됩니다.

### 행 버전 체인

```mermaid
flowchart LR
    CURRENT["Clustered Index Leaf\nROW: id=5, salary=75000\nDB_TRX_ID=1005\nDB_ROLL_PTR → undo"]
    
    UNDO1["Undo Log Segment\nOld version: salary=70000\nDB_TRX_ID=998\nROLL_PTR → prev undo"]
    
    UNDO2["Undo Log Segment\nOld version: salary=65000\nDB_TRX_ID=750\nROLL_PTR → null"]

    CURRENT -->|"DB_ROLL_PTR\n(7-byte rollback ptr)"| UNDO1
    UNDO1 -->|"prev rollback ptr"| UNDO2
```

### 읽기 보기 메커니즘

```mermaid
sequenceDiagram
    participant TX100 as Transaction 100 (long-running read)
    participant TX1005 as Transaction 1005 (writer)
    participant TRX_SYS as trx_sys (active list)

    Note over TX100: BEGIN, ReadView created\nup_limit_id=999, low_limit_id=1000\nids_list=[998,999]

    TX1005->>TRX_SYS: UPDATE row (trx_id=1005)
    TX1005->>TRX_SYS: COMMIT

    TX100->>TRX_SYS: SELECT salary FROM employees WHERE id=5
    Note over TX100: Row has DB_TRX_ID=1005\n1005 >= low_limit_id(1000) → INVISIBLE\nWalk undo chain → find DB_TRX_ID=750 < up_limit_id(999)\n→ VISIBLE: return salary=65000
```

**스레드 제거**: 백그라운드 스레드(`srv_purge_coordinator_thread`)는 활성 ReadView에 로그가 필요하지 않은 경우 실행 취소 로그를 정리합니다. 장기 실행 트랜잭션은 제거를 방지합니다. → 실행 취소 테이블스페이스가 무제한으로 커집니다(전형적인 `ibdata1` 팽창 문제).

---

## 4. 트랜잭션 로그(WAL) 및 충돌 복구

### 미리 쓰기 로깅 프로토콜

```mermaid
flowchart TD
    TX["Transaction: UPDATE row"] --> UNDO_WRITE["1. Write UNDO log record\n(before-image of row)"]
    UNDO_WRITE --> BUFFER["2. Modify page in buffer pool\n(dirty page, not written yet)"]
    BUFFER --> REDO_WRITE["3. Write REDO log (WAL)\nLog record: {LSN, space_id, page_no,\noffset, before, after}\nfsync to redo log file"]
    REDO_WRITE --> COMMIT["4. COMMIT: write commit log record\nfsync (innodb_flush_log_at_trx_commit=1)\n→ durability guaranteed"]
    COMMIT --> FLUSH["5. Background: flush dirty\npages from buffer pool to .ibd\n(checkpoint advances LSN)"]
```

**LSN(Log Sequence Number)**: 리두 로그에 대한 바이트 오프셋을 단조롭게 증가시킵니다. 모든 페이지 헤더는 `FIL_PAGE_LSN` = 마지막 수정 LSN을 저장합니다. `page_LSN < checkpoint_LSN`이 있는 페이지는 내구성이 보장됩니다.

### 충돌 복구 — ARIES 알고리즘

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

## 5. 쿼리 실행 파이프라인

### 쿼리 수명 주기

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

### 비용 기반 최적화 도구 — 지수 선택

```mermaid
flowchart TD
    A["Predicate: WHERE region='US' AND created_at > '2024-01-01'"] 
    
    A --> B["Statistics lookup\ninnodb_index_stats table\ncardinality per index"]
    
    B --> C["Option 1: Full table scan\nCost = n_rows × row_read_cost\n= 1,000,000 × 1.0 = 1,000,000"]
    
    B --> D["Option 2: idx_region\nSELECTIVITY = 200k/1M = 20%\nRange scan cost = 200,000 + 200,000 bookmark lookups\n= 400,000"]
    
    B --> E["Option 3: idx_region_created (composite)\nSELECTIVITY = 2k/1M = 0.2%\nCost = 2,000 (index only, no bookmark lookup)\n= 2,000 ✓ CHOSEN"]

    E --> F["Execution plan: index range scan on idx_region_created\nCovering index if SELECT columns ⊆ index columns"]
```

### 화산 반복자 모델

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

**해시 조인 내부**: 빌드 단계에서는 더 작은 테이블을 메모리 내 해시 테이블(`hash(join_key) → bucket → row`)로 읽습니다. 프로브 단계는 더 큰 테이블을 읽고, 조인 키를 해시하고, 버킷을 프로브합니다. 해시 테이블이 `join_buffer_size`을 초과하면 → 디스크로 유출됩니다(파티션을 통한 그레이스 해시 조인).

---

## 6. SQL Server 저장소 내부(Pro SQL Server 내부)

### 데이터 페이지(8KB)

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

### 행 구조(가변 길이)

```mermaid
flowchart LR
    A["Status Bits (1B)\nhas_nulls, has_var_cols"] --> B["Fixed-length data\ncols in schema order\ne.g. int(4B) + tinyint(1B)"]
    B --> C["Null bitmap\n1 bit per nullable col"]
    C --> D["Variable col count (2B)"]
    D --> E["Variable col offset array\n2B per var col\n→ end offset of each var col"]
    E --> F["Variable-length data\nVARCHAR/NVARCHAR contents"]
```

**전달된 레코드**: UPDATE가 행 크기를 페이지 용량 이상으로 늘리면 행이 새 페이지로 이동됩니다. 원래 슬롯은 8바이트 전달 포인터를 갖습니다. 힙 스캔은 전달 포인터를 따르므로 성능이 저하됩니다. 수정: `ALTER TABLE REBUILD`(클러스터형 인덱스)는 전달된 레코드를 제거합니다.

### SQL Server 잠금 계층 구조

```mermaid
flowchart TD
    DB["Database Lock\n(IS, S, IX, SIX, X)"] --> TABLE["Table Lock\n(IS, S, IX, SIX, X)"]
    TABLE --> PAGE["Page Lock\n(IS, S, IX, SIX, X)"]
    PAGE --> ROW["Row (Key) Lock\n(S, U, X, RangeS-S, RangeI-N, ...)"]
```

**잠금 에스컬레이션**: SQL Server는 잠금 수가 트랜잭션당 ~5000을 초과하는 경우 메모리 오버헤드를 줄이기 위해 행/페이지 잠금을 테이블 잠금으로 에스컬레이션합니다. 차단을 유발할 수 있습니다. `ALTER TABLE ... SET (LOCK_ESCALATION = DISABLE)`로 비활성화하세요.

**NOLOCK 힌트 / READ UNCOMMITTED**: 공유 잠금을 획득하지 않고 페이지를 읽습니다 → 더티 읽기가 가능합니다(커밋되지 않은 데이터, 팬텀 행, 비행 중에 롤백된 데이터도 확인).

---

## 7. 트랜잭션 격리 수준 및 이상 방지

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

**간격 잠금(InnoDB RR)**: 레코드 앞의 간격을 잠가서 INSERT가 범위에 들어가는 것을 방지합니다. `WHERE id BETWEEN 10 AND 20`인 경우 해당 범위의 모든 간격에 대한 간격 잠금이 동시 INSERT를 방지합니다. 전체 직렬화 가능 격리 없이 팬텀을 제거합니다.

**교착 상태 감지**: 각 잠금 관리자는 "대기 그래프"를 유지합니다. 백그라운드 스레드는 DFS(주기 감지)를 실행합니다. 주기가 발견되면 피해자 선택: 가장 작은 트랜잭션(실행 취소 로그 크기 기준)이 롤백됩니다. `INFORMATION_SCHEMA.INNODB_TRX`에 교착 상태 정보가 기록되었습니다.

---

## 8. 인덱스 유형 및 액세스 패턴

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

### 커버링 인덱스 - 북마크 조회 제거

```mermaid
flowchart LR
    A["Query: SELECT name, email\nFROM users WHERE region='US'"]

    A --> B{Index covers\nname, email, region?}
    B -->|"No (idx_region only)"| C["Index Range Scan → 200k PKs\n200k Bookmark Lookups to clustered index\n200k random I/Os ← SLOW"]
    B -->|"Yes (idx_region_name_email)"| D["Index Only Scan\nAll data in index leaf\n0 bookmark lookups ← FAST"]
```

---

## 9. 조인 알고리즘 - 메모리 및 CPU 경로

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

**중첩 루프 차단**(MySQL 8.0 이전): `join_buffer_size` 청크로 외부 테이블을 읽고, 청크당 한 번씩 내부 테이블을 스캔합니다. 내부 테이블 읽기를 `|outer|`에서 `|outer| / buffer_chunk_size`로 줄입니다.

**해시 방지 조인**(NOT IN / NOT EXISTS의 경우): 하위 쿼리 결과에서 해시 세트를 구축합니다. 각 프로브 행에 대해 일치하는 해시가 없는 경우에만 내보냅니다.

---

## 10. 쓰기 경로 - 체크포인트 및 Redo 로그 주기

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

**체크포인트 기간**: `innodb_log_file_size × 2 × 0.75` = 강제 플러시 전 최대 더티 데이터. 리두 로그가 가득 차면(체크포인트 기간 = 로그 크기) 체크포인트가 완료되는 동안 모든 쓰기가 STALL됩니다. 증상: 오류 로그에 "InnoDB: page_cleaner: 1000ms 의도한 루프에 5000ms가 걸렸습니다."

---

## 11. 내부 파티셔닝

```mermaid
flowchart TD
    A["INSERT INTO orders (id, region, amount)\nVALUES (1001, 'APAC', 500)"]
    
    A --> B["Partition function evaluation\nRANGE: PARTITION BY RANGE(YEAR(created_at))\nHASH: PARTITION BY HASH(customer_id) PARTITIONS 16\nLIST: PARTITION BY LIST(region)"]
    
    B --> C["Partition pruning at query time\nWHERE region='APAC'\n→ only scan p_APAC partition\nOther partitions skipped entirely"]
    
    C --> D["Each partition:\nIndependent tablespace (.ibd)\nSeparate B+Tree root\nSeparate buffer pool pages\nSeparate statistics"]
```

파티션 정리에는 WHERE 절에 **파티션 열의 조건자**가 필요합니다. 정리하지 않으면 모든 파티션이 스캔됩니다. 파티션되지 않은 테이블보다 나쁩니다(내려갈 B+트리 루트가 더 많음). 파티션 키는 모든 고유/기본 키의 일부여야 합니다.

---

## 12. 열 저장소와 행 저장소 내부

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

**사전 인코딩**: 문자열 열 값을 정수 코드로 바꿉니다. `dept` 열은 `uint8` 배열, 사전: `{0: "Engineering", 1: "Marketing"}`로 저장됩니다. 카디널리티가 낮은 열의 경우 압축 비율은 10-100x입니다.

**벡터화된 실행**: SIMD(AVX-256: 명령어당 8 × 32비트 연산)를 사용하여 한 번에 1024개 행을 처리합니다. 열형 레이아웃을 사용하면 메모리에 연속된 한 열의 모든 값 → CPU 프리페치가 효율적이며 L1/L2 캐시가 활용됩니다.

---

## 데이터베이스 성능 수치 참조

| 운영 | 이노DB | SQL 서버 | 메모 |
|-----------|--------|------------|-------|
| 버퍼 풀 적중 | ~100ns | ~100ns | DRAM 액세스 |
| NVMe SSD에서 페이지 읽기 | ~50μs | ~50μs | 순차: ~10 µs |
| B+트리포인트 조회(3레벨) | 3 × 50μs = 150μs | 비슷한 | 캐시는 가장 많은 비용을 절약할 수 있습니다 |
| 전체 테이블 스캔(1M 행) | 0.5~5초 | 비슷한 | I/O 대역폭에 따라 다름 |
| 해시 조인(2 × 1M 행) | 1~10초 | 비슷한 | 메모리가 없으면 디스크로 유출 |
| 인덱스 재구축(1억 행) | 10~60분 | 비슷한 | 온라인 재구축: 더 길어짐 |
| 체크포인트 플러시 스톨 | 0~5초 | 0~5초 | 로그 파일 크기를 통해 조정 가능 |
| 행 잠금 획득 | ~1μs | ~1μs | 메모리 내 해시 조회 |
| 교착상태 감지 | ~1ms | ~1ms | DFS 주기 감지 |

---

## 요약 - 데이터 흐름 맵

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

모든 바이트의 전체 수명 주기: SQL 텍스트 → AST → 비용 추정 계획 → 반복자 풀 → 버퍼 풀 페이지 → MVCC 실행 취소 체인 → 필드 바이트. 쓰기 시: 실행 취소 로그(이미지 전) → 더티 페이지(메모리 내) → 다시 실행 로그(WAL, 내구성) → .ibd로 백그라운드 플러시. WAL 보장은 기반입니다. 실제 데이터 페이지가 디스크에 있는지 여부에 관계없이 다시 실행 로그가 fsync되는 순간 데이터는 내구성이 있습니다.
