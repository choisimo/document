# 워크로드와 내구성 요구에 따른 파일시스템 선택·튜닝

리눅스 파일시스템은 데이터의 **무결성(Integrity)**과 **성능(Performance)** 사이에서 균형을 맞춰야 합니다. 서비스의 규모와 트랜잭션 빈도에 따라 적절한 파일시스템 선택과 튜닝이 필요합니다.

## 판단 경계

- "중소규모/대규모" 대신 파일 크기·개수, fsync 빈도, queue depth, 순차/랜덤 비율, crash 후 허용 손실과 복구 시간을 측정합니다.
- 파일시스템 저널은 주로 메타데이터 일관성과 복구를 돕습니다. 애플리케이션 트랜잭션, 저장장치 write cache, 복제와 백업의 내구성을 대신하지 않습니다.
- mount 옵션은 kernel·filesystem·storage stack별 의미를 확인하고 동일 workload의 latency 분포, throughput과 crash test로 비교합니다.
- 변경 완료는 mount 성공이 아니라 재부팅, 전원 장애 가정, 데이터 검증과 원래 옵션으로의 복구 가능성을 확인한 상태입니다.

## 1. 파일시스템 트랜잭션의 핵심: 저널링(Journaling)
Ext4와 XFS 같은 파일시스템은 저널을 사용해 crash 후 메타데이터 일관성 복구 범위를 줄입니다. 어떤 사용자 데이터가 안정 저장됐는지는 모드, `fsync`, barrier, 장치 cache와 filesystem 구현에 따라 달라집니다.

### 저널링 모드 (Ext4 기준)
트랜잭션 처리 방식에 따라 안전성과 성능이 달라집니다. (`mount` 옵션으로 조절)

| 모드 | 설명 | 특징 (장점/단점) |
| :--- | :--- | :--- |
| **`data=ordered`** | 메타데이터 journal commit 전에 관련 data block을 쓰도록 순서를 둡니다. | 흔한 기본값이지만 현재 mount 옵션과 durability 요구 확인 |
| **`data=journal`** | 메타데이터와 사용자 데이터를 journal 경로에 포함합니다. | 쓰기 패턴과 장치에 따라 비용·내구성 효과 측정 필요 |
| **`data=writeback`** | 메타데이터 journal과 사용자 data write 순서를 강하게 묶지 않습니다. | crash 후 오래된 데이터 노출 위험을 명시적으로 수용할 때만 검토 |

## 2. 서비스 규모별 파일시스템 선택 전략

### A. 중소규모 및 일반 웹 서비스 (General Purpose)
*   **추천:** **Ext4**
*   **이유:** 안정성이 입증되었고 관리가 쉽습니다. 파일 크기가 적당하고 동시 접속이 폭발적이지 않은 경우 가장 무난합니다.
*   **트랜잭션 관리:** 기본 `data=ordered` 모드 사용.

### B. 대규모, 고트래픽, 대용량 파일 서비스 (Enterprise/Big Data)
*   **추천:** **XFS**
*   **이유:**
    *   **병렬 처리:** XFS는 **Allocation Group(AG)**이라는 단위로 디스크를 나누어 관리하므로, 동시에 여러 프로세스가 I/O 트랜잭션을 일으켜도 락(Lock) 경합이 적어 병렬 성능이 뛰어납니다.
    *   **동적 아이노드:** Ext4와 달리 아이노드를 미리 생성하지 않아 파일 수가 엄청나게 많아져도 유연하게 대처합니다.
*   **주의:** XFS는 한 번 생성하면 파티션 축소(Shrink)가 불가능합니다.

## 3. 고성능 트랜잭션 처리를 위한 튜닝 (Scaling Tips)

서비스 규모가 커져 디스크 I/O가 병목이 될 때 고려해야 할 옵션들입니다.

1.  **`noatime` / `relatime`**:
    *   리눅스는 파일을 **읽기만 해도** 접근 시간(Access Time)을 기록하기 위해 쓰기(Write) 작업을 발생시킵니다.
    *   대규모 읽기 트랜잭션이 많은 서비스(웹 서버, DB)에서는 `noatime` 마운트 옵션을 사용하여 불필요한 쓰기 부하를 제거해야 합니다.

2.  **Write ordering과 flush**:
    *   barrier/flush는 filesystem, block layer, controller와 drive cache 사이의 내구성 순서를 구성합니다.
    *   이를 비활성화하면 BBWC가 있어도 firmware, controller 교체, cache mode 오인식 등 별도 실패가 생길 수 있습니다. 지원 문서와 실제 power-loss 시험 없이 끄지 않습니다.

3.  **Commit Interval (`commit=N`)**:
    *   기본적으로 Ext4는 5초마다 저널 내용을 디스크에 동기화합니다.
    *   데이터 유실 허용 범위가 넓고 성능이 중요한 임시 데이터 처리 서버라면 `commit=30` 등으로 늘려 I/O 빈도를 줄일 수 있습니다.

## 4. 요약
*   **일반 서버:** Ext4, 기본값 사용 유지.
*   **고성능/대용량 DB:** DB vendor 지원 범위와 실제 I/O profile로 XFS·Ext4 등 후보와 atime 정책 비교.
*   **데이터 중요도가 낮은 캐시/로그:** 성능을 위해 `data=writeback` 또는 `commit` 주기 연장 고려.
*   **하드웨어 RAID 환경:** `barrier=0` 적용 검토.
