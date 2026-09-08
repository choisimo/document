# Module 6: Backup & Restore (vzdump) 운영 가이드

> 적용 범위: 명령과 UI 경로는 Proxmox VE 8.x 계열 예시다. 실행 전 `pveversion -v`, `vzdump --help`, PBS 버전과 스토리지 기능을 확인한다.
> 안전 경계: prune, 작업 삭제, restore, `qm unlock`, 암호화 키 변경은 복구 가능성에 직접 영향을 준다. 대상·보존 기간·복원 위치·rollback 조건을 기록하고 dry-run 또는 격리 복원을 먼저 수행한다.
> 완료 증거: “백업 작업 성공”, “백업 검증 성공”, “격리 환경 복원 성공”, “애플리케이션 정상 응답”은 서로 다른 단계다. 앞 단계만으로 뒤 단계의 성공을 주장하지 않는다.

## 학습 목표
이 모듈은 다음 주제를 다룹니다:
- vzdump의 백업 모드와 각각의 장단점
- Proxmox Backup Server(PBS) 통합 및 고급 기능
- 백업 보존 정책(Retention)의 설계 및 적용
- 복원(Restore) 절차와 Live-Restore 기능

---

## 1. 백업 아키텍처 개요

### 1.1 Proxmox VE 백업 시스템

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Proxmox VE Backup Architecture                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                      vzdump (Backup Tool)                        │  │
│   │                                                                  │  │
│   │   • VM/CT 설정 + 데이터를 함께 백업                             │  │
│   │   • 항상 Full Backup (증분 없음 - PBS 제외)                     │  │
│   │   • Live Backup 지원 (실행 중 백업)                             │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                │                                        │
│           ┌────────────────────┼────────────────────┐                  │
│           │                    │                    │                  │
│           ▼                    ▼                    ▼                  │
│   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐          │
│   │  File-Level   │   │  Block-Level  │   │  Proxmox      │          │
│   │  Storage      │   │  Storage      │   │  Backup Server│          │
│   │               │   │               │   │               │          │
│   │  • NFS        │   │  • Local Dir  │   │  • 증분 백업  │          │
│   │  • CIFS       │   │  • (VMA files)│   │  • 중복 제거  │          │
│   │  • Local Dir  │   │               │   │  • 암호화     │          │
│   └───────────────┘   └───────────────┘   └───────────────┘          │
│                                                                         │
│   백업 파일 형식:                                                       │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  VM:  vzdump-qemu-<vmid>-<date>-<time>.vma[.zst|.gz|.lzo]      │  │
│   │  CT:  vzdump-lxc-<vmid>-<date>-<time>.tar[.zst|.gz|.lzo]       │  │
│   │  PBS: Chunked + Deduplicated (index + chunks)                   │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 백업 스토리지 유형 비교

| 스토리지 유형 | 파일 형식 | 증분 백업 | 중복 제거 | 암호화 | 권장 용도 |
|--------------|----------|----------|----------|--------|----------|
| **Proxmox Backup Server** | Chunks | ✅ | ✅ | ✅ (Client-side) | **프로덕션 권장** |
| **NFS/CIFS** | .vma/.tar | ❌ | ❌ | ❌ | 간단한 백업 |
| **Local Directory** | .vma/.tar | ❌ | ❌ | ❌ | 테스트/임시 |

### 1.3 주요 설정 파일

| 파일 경로 | 용도 |
|-----------|------|
| `/etc/vzdump.conf` | 노드별 기본 백업 설정 |
| `/etc/pve/jobs.cfg` | 스케줄된 백업 작업 |
| `/etc/pve/storage.cfg` | 백업 스토리지 정의 |

---

## 2. 백업 모드 (Backup Modes)

### 2.1 VM 백업 모드

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        VM Backup Modes                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  SNAPSHOT Mode (기본값, 권장)                                     │  │
│  │  ═══════════════════════════════════════════════════════════════  │  │
│  │                                                                   │  │
│  │    1. QEMU에 "copy-before-write" 필터 설치                       │  │
│  │    2. Guest 계속 실행 (다운타임 최소)                            │  │
│  │    3. 새로운 쓰기 발생시 → 기존 데이터 먼저 백업                 │  │
│  │    4. QEMU Guest Agent → fs-freeze (파일 시스템 쓰기 정지)       │  │
│  │                                                                   │  │
│  │    Timeline:                                                      │  │
│  │    ─────────────────────────────────────────────────────────     │  │
│  │    [fs-freeze] → [Backup Start] → [Data Copy] → [fs-thaw]        │  │
│  │      (~1sec)          │              │            (~1sec)         │  │
│  │                   VM Running     VM Running                       │  │
│  │                                                                   │  │
│  │    장점: guest 실행을 유지; 지원 범위는 스토리지·버전별 확인      │  │
│  │    단점: I/O 부하 (copy-before-write 오버헤드)                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  SUSPEND Mode                                                     │  │
│  │  ═══════════════════════════════════════════════════════════════  │  │
│  │                                                                   │  │
│  │    1. VM을 일시 중지 (vCPU halt, RAM 유지)                       │  │
│  │    2. Dirty bitmap 확보                                          │  │
│  │    3. VM 재개                                                    │  │
│  │    4. Dirty 데이터 백업                                          │  │
│  │                                                                   │  │
│  │    Timeline:                                                      │  │
│  │    ─────────────────────────────────────────────────────────     │  │
│  │    [VM Suspend] → [Bitmap] → [VM Resume] → [Backup Dirty]        │  │
│  │         │           │            │                                │  │
│  │      Downtime    (~1sec)      Running                            │  │
│  │                                                                   │  │
│  │    장점: Guest Agent 불필요                                      │  │
│  │    단점: 짧은 다운타임 발생                                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  STOP Mode                                                        │  │
│  │  ═══════════════════════════════════════════════════════════════  │  │
│  │                                                                   │  │
│  │    1. VM 완전 종료                                               │  │
│  │    2. 디스크 백업                                                │  │
│  │    3. VM 재시작                                                  │  │
│  │                                                                   │  │
│  │    Timeline:                                                      │  │
│  │    ─────────────────────────────────────────────────────────     │  │
│  │    [VM Stop] ═════════════════════════════════════ [VM Start]    │  │
│  │              ←──────── Full Downtime ────────────→               │  │
│  │                        (백업 전체 시간)                           │  │
│  │                                                                   │  │
│  │    장점: 종료된 guest 디스크 상태를 백업                          │  │
│  │    단점: 긴 다운타임                                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Container 백업 모드

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Container Backup Modes                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  SNAPSHOT Mode (기본값)                                           │  │
│  │                                                                   │  │
│  │    • 스토리지 스냅샷 기능 사용                                   │  │
│  │    • LVM, ZFS, Ceph RBD 등 지원                                  │  │
│  │    • 컨테이너 계속 실행                                          │  │
│  │    • 파일 시스템 일관성: 스냅샷 시점 기준                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  SUSPEND Mode                                                     │  │
│  │                                                                   │  │
│  │    • 컨테이너 프로세스 freeze (SIGSTOP)                          │  │
│  │    • 성능은 파일 수·스토리지·네트워크에 따라 달라져 실측 필요    │  │
│  │    • ACL·xattr 보존 여부를 샘플 복원으로 확인                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  STOP Mode                                                        │  │
│  │                                                                   │  │
│  │    • 컨테이너 완전 종료                                          │  │
│  │    • 가장 긴 다운타임                                            │  │
│  │    • 종료된 파일 시스템 상태 제공; 외부 시스템 일관성은 별도     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 모드 선택 가이드

| 상황 | 권장 모드 | 이유 |
|------|----------|------|
| 일반 프로덕션 VM | `snapshot` | 중단을 줄일 수 있으며 앱별 quiesce 여부는 별도 확인 |
| Guest Agent 없는 VM | `snapshot` 또는 `suspend` | RTO와 앱 일관성 요구를 시험해 선택 |
| 데이터베이스 서버 | `snapshot` + App dump | DB 일관성 별도 확보 필요 |
| 중요 시스템 | `stop` (점검 시간) | 종료된 디스크 상태 확보; 외부 의존성은 별도 검증 |
| 스냅샷 지원 스토리지의 CT | `snapshot` | 빠르고 효율적 |
| NFS 타겟 + 로컬 CT | 시험 후 선택 | 파일 수·ACL·네트워크에 따른 시간과 복원 결과 비교 |

---

## 3. vzdump 사용법

### 3.1 기본 백업 명령어

```bash
# 단일 VM 백업 (기본 설정)
vzdump 100

# 모드 지정
vzdump 100 --mode snapshot    # 스냅샷 모드 (기본)
vzdump 100 --mode suspend     # 일시정지 모드
vzdump 100 --mode stop        # 정지 모드

# 여러 VM 백업
vzdump 100 101 102

# 모든 VM 백업
vzdump --all

# 특정 VM 제외
vzdump --all --exclude 100,101

# 스토리지 지정
vzdump 100 --storage backup-storage

# 디렉토리 직접 지정
vzdump 100 --dumpdir /mnt/backup

# 압축 설정
vzdump 100 --compress zstd    # zstd (권장, 빠름)
vzdump 100 --compress gzip    # gzip
vzdump 100 --compress lzo     # lzo (가장 빠름, 압축률 낮음)
vzdump 100 --compress 0       # 압축 안함
```

### 3.2 고급 백업 옵션

```bash
# 대역폭 제한 (KiB/s)
vzdump 100 --bwlimit 51200    # 50 MiB/s

# 메일 알림
vzdump 100 --mailto admin@example.com

# 알림 조건
vzdump 100 --mailnotification always    # 항상
vzdump 100 --mailnotification failure   # 실패시만

# 보호된 백업으로 생성
vzdump 100 --protected 1

# 노트 템플릿 (메타데이터)
vzdump 100 --notes-template "{{guestname}} backup on {{node}}"

# I/O 우선순위 (BFQ 스케줄러)
vzdump 100 --ionice 7    # 0-7 (7=최저 우선순위)

# 특정 경로 제외 (CT만)
vzdump 200 --exclude-path /var/cache --exclude-path /tmp

# stdout으로 출력 (파이프용)
vzdump 100 --stdout | ssh remote "cat > /backup/vm100.vma"
```

### 3.3 Backup Fleecing (VM)

백업 중 덮어쓸 기존 블록을 별도 임시 스토리지에 두어 느린 백업 대상이 guest I/O에 주는 영향을 줄이는 기능입니다. 개선 폭과 추가 공간 요구량은 쓰기 패턴과 두 스토리지의 성능에 따라 달라집니다.

```bash
# Fleecing 활성화
vzdump 100 --fleecing enabled=1,storage=local-lvm

# 설명:
# - 백업 중 Guest가 블록에 새로 쓰면
# - 기존 데이터를 fleecing storage에 임시 저장
# - guest I/O 지연을 줄일 수 있지만 백업 타겟과 무관한 성능을 보장하지 않음
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Backup Fleecing Flow                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Without Fleecing:                                                     │
│   ┌─────────┐     Write      ┌─────────┐    Old Data   ┌───────────┐  │
│   │  Guest  │ ──────────────►│  Disk   │ ─────────────►│  Backup   │  │
│   │         │                │         │    (slow)     │  Target   │  │
│   └─────────┘                └─────────┘               └───────────┘  │
│                                   │                                    │
│                           Guest waits for backup target               │
│                                                                         │
│   With Fleecing:                                                        │
│   ┌─────────┐     Write      ┌─────────┐    Old Data   ┌───────────┐  │
│   │  Guest  │ ──────────────►│  Disk   │ ─────────────►│ Fleecing  │  │
│   │         │                │         │    (fast)     │ Storage   │  │
│   └─────────┘                └─────────┘      │        │ (local)   │  │
│        │                          │           │        └───────────┘  │
│        │                          │           │              │         │
│   Less coupling              ┌────▼────┐      │       ┌──────▼──────┐ │
│                              │ Backup  │◄─────┘       │   Backup    │ │
│                              │ Process │◄─────────────│   Target    │ │
│                              └─────────┘              │   (slow)    │ │
│                                                       └─────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.4 PBS Change Detection (Container)

PBS로 컨테이너 백업시 변경 감지 최적화:

```bash
# 메타데이터 기반 변경 감지 (빠름)
vzdump 200 --storage pbs --pbs-change-detection-mode metadata

# 모드 설명:
# default: 기본 동작
# metadata: mtime/ctime 기반 (빠르지만 덜 정확할 수 있음)
```

---

## 4. 백업 스케줄링

### 4.1 Web UI를 통한 스케줄 설정

**경로:** Datacenter → Backup → Add

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Backup Job Configuration                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  General:                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Storage:     [backup-storage ▼]                                 │   │
│  │  Schedule:    [daily ▼]  또는 Cron: [0 2 * * *]                 │   │
│  │  Selection:   ○ All  ○ Exclude selected  ● Include selected     │   │
│  │  Mode:        [Snapshot ▼]                                       │   │
│  │  Compression: [ZSTD ▼]                                           │   │
│  │  Mail:        [admin@example.com]                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Advanced:                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Bandwidth Limit: [51200] KiB/s                                  │   │
│  │  I/O Nice:        [7]                                            │   │
│  │  Enable Fleecing: [✓]  Storage: [local-lvm]                     │   │
│  │  Protected:       [ ]                                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Retention:                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ○ Use storage defaults                                          │   │
│  │  ● Custom: keep-last=7, keep-weekly=4, keep-monthly=6           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 CLI를 통한 스케줄 관리

```bash
# 백업 작업 목록 조회
pvesh get /cluster/backup

# 새 백업 작업 생성
pvesh create /cluster/backup \
  --storage backup-storage \
  --schedule "0 2 * * *" \
  --mode snapshot \
  --compress zstd \
  --vmid 100,101,102 \
  --prune-backups keep-last=7,keep-weekly=4

# 백업 작업 수정
pvesh set /cluster/backup/<job-id> --mailto admin@example.com

# 백업 작업 삭제
pvesh delete /cluster/backup/<job-id>

# 즉시 백업 작업 실행
vzdump --jobid <job-id>
```

### 4.3 스케줄 표현식

| 표현식 | 의미 |
|--------|------|
| `daily` | 매일 00:00 |
| `hourly` | 매시간 |
| `weekly` | 매주 일요일 00:00 |
| `monthly` | 매월 1일 00:00 |
| `0 2 * * *` | 매일 02:00 |
| `0 3 * * 0` | 매주 일요일 03:00 |
| `0 4 1 * *` | 매월 1일 04:00 |

### 4.4 jobs.cfg 파일 구조

```bash
cat /etc/pve/jobs.cfg
```

```
vzdump: backup-daily
    all 1
    compress zstd
    mailnotification always
    mailto admin@example.com
    mode snapshot
    node pve1,pve2,pve3
    prune-backups keep-last=7,keep-weekly=4,keep-monthly=6
    schedule 0 2 * * *
    storage pbs-backup
```

---

## 5. 백업 보존 정책 (Retention)

### 5.1 보존 옵션 설명

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Retention Options Processing                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  처리 순서 (앞에서부터):                                               │
│                                                                         │
│  1. keep-last    : 최근 N개 백업 유지                                  │
│  2. keep-hourly  : 시간당 최신 백업 N개 유지                           │
│  3. keep-daily   : 일당 최신 백업 N개 유지                             │
│  4. keep-weekly  : 주당 최신 백업 N개 유지                             │
│  5. keep-monthly : 월당 최신 백업 N개 유지                             │
│  6. keep-yearly  : 연당 최신 백업 N개 유지                             │
│                                                                         │
│  ※ 각 옵션은 독립적으로 동작, 이미 선택된 백업은 다음 옵션에서 제외   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 보존 정책 예제

```bash
# 예제 1: 간단한 보존 (최근 7개)
vzdump 100 --prune-backups keep-last=7

# 예제 2: 복합 보존 정책
vzdump 100 --prune-backups keep-last=3,keep-daily=14,keep-weekly=8,keep-monthly=12,keep-yearly=5

# 예제 3: 모든 백업 유지 (주의!)
vzdump 100 --prune-backups keep-all=1
```

### 5.3 보존 정책 예시 (10년 보관 요구가 있는 경우)

이 수치는 기본 권장값이 아닙니다. RPO, 규정, 예상 변경률, 백업 크기, 오프사이트 복사와 실제 복원 가능 기간으로 용량을 계산한 뒤 정합니다.

```
┌─────────────────────────────────────────────────────────────────────────┐
│               Recommended Retention Policy (10 Years)                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  keep-last=3                                                            │
│    └── 추가 수동 백업 대비 (예: 메이저 업데이트 전)                    │
│                                                                         │
│  keep-hourly=0 (설정 안함)                                              │
│    └── 일일 백업이면 불필요                                            │
│                                                                         │
│  keep-daily=14                                                          │
│    └── 2주간의 일일 백업                                               │
│                                                                         │
│  keep-weekly=8                                                          │
│    └── 2개월간의 주간 백업                                             │
│                                                                         │
│  keep-monthly=12                                                        │
│    └── 1년간의 월간 백업                                               │
│                                                                         │
│  keep-yearly=10                                                         │
│    └── 10년간의 연간 백업                                              │
│                                                                         │
│  설정 예:                                                               │
│  prune-backups: keep-last=3,keep-daily=14,keep-weekly=8,               │
│                 keep-monthly=12,keep-yearly=10                          │
│                                                                         │
│  시각화:                                                                │
│  ─────────────────────────────────────────────────────────────         │
│  [Day 1-14: Daily] → [Week 1-8: Weekly] → [Month 1-12: Monthly]        │
│                                           → [Year 1-10: Yearly]         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 스토리지에 기본 보존 정책 설정

```bash
# 스토리지 설정에 기본 보존 정책 추가
pvesm set backup-storage --prune-backups keep-last=7,keep-weekly=4,keep-monthly=6

# storage.cfg 확인
cat /etc/pve/storage.cfg | grep -A5 "dir: backup"
```

```
dir: backup
    path /mnt/backup
    content backup
    prune-backups keep-last=7,keep-weekly=4,keep-monthly=6
```

### 5.5 수동 Prune 실행

```bash
# 특정 스토리지의 백업 정리 (dry-run)
pvesm prune-backups backup-storage --dry-run

# dry-run 목록을 저장하고 보호 백업·법적 보존 대상을 대조한 뒤 실제 정리 실행
pvesm prune-backups backup-storage

# 특정 VM의 백업만 정리
pvesm prune-backups backup-storage --vmid 100

# 커스텀 보존 정책으로 정리
pvesm prune-backups backup-storage --keep-last=3 --keep-daily=7
```

---

## 6. Proxmox Backup Server (PBS) 통합

### 6.1 PBS 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  Proxmox Backup Server Architecture                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Proxmox VE Cluster                    Proxmox Backup Server          │
│   ┌─────────────────────┐              ┌─────────────────────┐         │
│   │                     │              │                     │         │
│   │  ┌─────┐  ┌─────┐  │   HTTPS      │    Datastore       │         │
│   │  │VM100│  │VM101│  │ ──────────►  │  ┌───────────────┐ │         │
│   │  └─────┘  └─────┘  │   API/Data   │  │ Chunks        │ │         │
│   │                     │              │  │  (Deduplicated)│ │         │
│   │  vzdump with PBS    │              │  │               │ │         │
│   │  storage backend    │              │  │ Index Files   │ │         │
│   │                     │              │  │  (Metadata)   │ │         │
│   └─────────────────────┘              │  └───────────────┘ │         │
│                                         │                     │         │
│   특징:                                 │  추가 기능:         │         │
│   • 증분 백업                          │  • Verify           │         │
│   • Client-side 암호화                 │  • Tape Backup     │         │
│   • Live-restore                       │  • S3 Sync         │         │
│                                         │  • Remote Sync     │         │
│                                         └─────────────────────┘         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 PBS 스토리지 추가

**Web UI:** Datacenter → Storage → Add → Proxmox Backup Server

```bash
# CLI로 PBS 스토리지 추가
pvesm add pbs pbs-backup \
  --server pbs.example.com \
  --username backup@pbs \
  --datastore main-datastore \
  --fingerprint <SHA256-fingerprint>

# Password 설정 (대화형)
pvesm set pbs-backup --password
# 셸 기록이나 문서에 평문 비밀번호를 넣지 말고, 전용 최소 권한 계정과 secret 저장소를 사용한다.
```

### 6.3 PBS storage.cfg 예제

```
pbs: pbs-backup
    datastore main-datastore
    server pbs.example.com
    username backup@pbs
    fingerprint AA:BB:CC:DD:...
    content backup
    prune-backups keep-all=1
```

### 6.4 Client-side 암호화

```bash
# 암호화 키 생성 (대화형 암호 설정; 운영 키에 --kdf none을 사용하지 않음)
proxmox-backup-client key create /etc/pve/priv/storage/pbs-backup.enc

# 스토리지에 암호화 키 설정
pvesm set pbs-backup --encryption-key /etc/pve/priv/storage/pbs-backup.enc

# Paper Key 생성 (재해 복구용)
proxmox-backup-client key paperkey /etc/pve/priv/storage/pbs-backup.enc --output-format text

# Master Key 설정 (관리자가 복호화 가능)
proxmox-backup-client key create-master-key master-public.pem master-private.pem
pvesm set pbs-backup --master-pubkey master-public.pem
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PBS Encryption Architecture                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐    AES-256-GCM    ┌─────────────────────┐            │
│   │   VM Data   │ ─────────────────►│  Encrypted Chunks   │            │
│   └─────────────┘                   │  (on PBS)           │            │
│          │                          └─────────────────────┘            │
│          │                                    │                         │
│          ▼                                    │                         │
│   ┌─────────────┐                            │                         │
│   │ Client Key  │ (encryption-key)           │                         │
│   │ .enc file   │                            │                         │
│   └──────┬──────┘                            │                         │
│          │                                    │                         │
│          │ RSA Encrypt                       │                         │
│          ▼                                    │                         │
│   ┌─────────────┐    Stored with    ┌───────▼───────────┐             │
│   │ Master Pub  │ ─────────────────►│ Encrypted Key     │             │
│   │    Key      │    each backup    │ (recovery)        │             │
│   └─────────────┘                   └───────────────────┘             │
│                                                                         │
│   ⚠️ 키 분실 = 백업 복구 불가! Paper key와 Master key 안전 보관 필수  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.5 PBS 스토리지 명령어

```bash
# PBS datastore 목록 조회
pvesm scan pbs --server pbs.example.com --username backup@pbs

# 백업 목록 조회
pvesm list pbs-backup --content backup

# 특정 VM의 백업 목록
pvesm list pbs-backup --content backup --vmid 100

# 백업 설정 추출
pvesm extractconfig pbs-backup backup/vm/100/2024-01-15T02:00:00Z

# 최근 스냅샷의 특정 파일 추출
pvesm extract pbs-backup backup/vm/100/2024-01-15T02:00:00Z /etc/hostname
```

---

## 7. 복원 (Restore)

### 7.1 VM 복원

```bash
# 기본 복원
qmrestore /var/lib/vz/dump/vzdump-qemu-100-2024_01_15-02_00_00.vma 100

# 다른 VMID로 복원
qmrestore /var/lib/vz/dump/vzdump-qemu-100-2024_01_15-02_00_00.vma 200

# PBS에서 복원
qmrestore pbs-backup:backup/vm/100/2024-01-15T02:00:00Z 100

# 스토리지 지정
qmrestore backup.vma 100 --storage local-lvm

# 복원 후 즉시 시작
qmrestore backup.vma 100 --start 1

# 대역폭 제한
qmrestore backup.vma 100 --bwlimit 51200

# 고유 MAC 생성 (충돌 방지)
qmrestore backup.vma 200 --unique 1

# HA 리소스로 추가
qmrestore backup.vma 100 --ha 1
```

### 7.2 Container 복원

```bash
# 기본 복원
pct restore 200 /var/lib/vz/dump/vzdump-lxc-200-2024_01_15-02_00_00.tar.zst

# 스토리지 및 크기 지정
pct restore 200 backup.tar.zst --rootfs local-lvm:8

# PBS에서 복원
pct restore 200 pbs-backup:backup/ct/200/2024-01-15T02:00:00Z

# unprivileged 컨테이너로 복원
pct restore 200 backup.tar.zst --unprivileged 1

# 마운트 포인트 커스터마이즈
pct restore 200 backup.tar.zst --rootfs local-lvm:16 --mp0 local-lvm:8,mp=/data

# 고유 MAC 및 호스트명
pct restore 200 backup.tar.zst --unique 1 --hostname newcontainer

# 대역폭 제한
pct restore 200 backup.tar.zst --bwlimit 51200
```

### 7.3 Live-Restore (PBS 전용)

PBS에서 VM 디스크 전체 전송이 끝나기 전에 guest를 시작할 수 있습니다. 부팅 가능 시점은 네트워크, PBS 부하와 guest의 초기 읽기 패턴에 따라 달라집니다.

```bash
# Live-restore 활성화
qmrestore pbs-backup:backup/vm/100/2024-01-15T02:00:00Z 100 --live-restore 1
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Live-Restore Timeline                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Traditional Restore:                                                   │
│  ───────────────────────────────────────────────────────────────────   │
│  [Start] ════════════════════════════════════════════════ [VM Ready]   │
│          ←────────── Full Download (Wait) ──────────────→              │
│                                                                         │
│  Live-Restore:                                                          │
│  ───────────────────────────────────────────────────────────────────   │
│  [Start] [VM Boot] ──────────────────────────────────── [Fully Local]  │
│     │        │                    │                           │         │
│     │        │    Background      │                           │         │
│     │        │    Download        │                           │         │
│     │        │         ↓          │                           │         │
│     │        └── Prioritize ──────┘                           │         │
│     │            accessed chunks                              │         │
│     │                                                         │         │
│     └─── VM availability must be measured ────────────────────┘         │
│                                                                         │
│  ⚠️ 주의사항:                                                          │
│  • 백업 서버 접근 필수 (복원 완료 전까지)                              │
│  • 디스크 읽기 성능 제한 (데이터가 로컬에 없으면 PBS에서 로드)         │
│  • 실패시 VM 상태 불확실 → 다시 복원 필요                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.4 파일 단위 복원 (PBS)

```bash
# Web UI에서 파일 브라우저 사용 가능
# Backup → 선택 → File Restore

# CLI로 특정 파일 추출
proxmox-backup-client restore pbs-backup:backup/vm/100/2024-01-15T02:00:00Z \
  drive-scsi0.img.fidx /target/path --repository user@pbs:datastore
```

### 7.5 백업 설정만 추출

```bash
# vzdump 백업에서 설정 추출
pvesm extractconfig backup-storage vzdump-qemu-100-2024_01_15-02_00_00.vma

# 출력 예:
# [main]
# name: webserver
# memory: 4096
# cores: 4
# net0: virtio=AA:BB:CC:DD:EE:FF,bridge=vmbr0
# scsi0: local-lvm:vm-100-disk-0,size=32G
# ...
```

---

## 8. 백업 설정 파일

### 8.1 /etc/vzdump.conf

```bash
cat /etc/vzdump.conf
```

```
# vzdump default settings

# Default storage for backups
storage: backup-storage

# Default backup mode
mode: snapshot

# Default compression
compress: zstd

# I/O nice level (0-7, 7=lowest priority)
ionice: 5

# Default retention
prune-backups: keep-last=3,keep-daily=7,keep-weekly=4,keep-monthly=6

# Bandwidth limit (KiB/s), 0 = no limit
bwlimit: 0

# Mail recipients (comma separated)
# mailto: admin@example.com

# Notification mode: always, failure
# mailnotification: always

# Note template
notes-template: {{guestname}} - {{node}} - {{vmid}}

# Backup fleecing
# fleecing: enabled=1,storage=local-lvm

# PBS change detection (metadata|default)
# pbs-change-detection-mode: metadata
```

### 8.2 디스크 백업 제외

개별 디스크를 백업에서 제외:

```bash
# VM 디스크 백업 제외 설정
qm set 100 --scsi1 local-lvm:vm-100-disk-1,backup=0

# CT 마운트 포인트 백업 제외
pct set 200 --mp0 local-lvm:subvol-200-disk-0,mp=/data,backup=0

# 또는 포함 설정
pct set 200 --mp0 local-lvm:subvol-200-disk-0,mp=/data,backup=1
```

---

## 9. 모니터링 및 알림

### 9.1 백업 작업 로그 확인

```bash
# 최근 백업 작업 목록
pvesh get /cluster/tasks --typefilter vzdump

# 특정 작업 로그
pvenode task log UPID:pve1:00010D94:001CA6EA:6124E1B9:vzdump:100:root@pam:

# 작업 상태 확인
pvesh get /nodes/pve1/tasks/<upid>/status
```

### 9.2 알림 설정

**notification-priv.cfg 예제:**

```bash
# 백업 실패 알림 매처
cat /etc/pve/notifications.cfg
```

```
matcher: backup-failures
    match-field exact:type=vzdump
    match-severity error
    target backup-admins
    comment Send backup failure notifications to admins

target: backup-admins
    mailto admin@example.com,ops@example.com
```

### 9.3 백업 관련 알림 유형

| 이벤트 | 타입 | 심각도 |
|--------|------|--------|
| 백업 성공 (작업) | vzdump | info |
| 백업 실패 (작업) | vzdump | error |
| 개별 VM 백업 성공 | vzdump | info |
| 개별 VM 백업 실패 | vzdump | error |

---

## 10. 문제 해결

### 10.1 일반적인 문제

| 문제 | 원인 | 해결 방법 |
|------|------|-----------|
| 백업 중 VM 느려짐 | copy-before-write 오버헤드 | `fleecing` 사용, `ionice` 설정 |
| 백업 파일 손상 | 스토리지 문제 | verify 실행, 스토리지 점검 |
| PBS 연결 실패 | 인증서/네트워크 | fingerprint 확인, 방화벽 점검 |
| 공간 부족 | 보존 정책 미설정 | `prune-backups` 설정 |
| CT 백업 느림 | 많은 작은 파일 | PBS + metadata 모드 사용 |

### 10.2 디버깅 명령어

```bash
# vzdump 상세 로그
vzdump 100 --mode snapshot 2>&1 | tee /tmp/vzdump.log

# PBS 연결 테스트
proxmox-backup-client status --repository user@pbs:datastore

# 스토리지 상태 확인
pvesm status

# 백업 무결성 검증 (PBS)
proxmox-backup-client verify --repository user@pbs:datastore backup/vm/100/2024-01-15T02:00:00Z

# 디스크 공간 확인
df -h /var/lib/vz/dump
pvesm list backup-storage
```

### 10.3 백업 실패 복구

```bash
# 중단된 백업 후보를 먼저 목록화하고 현재 task가 사용 중인지 확인
find /var/lib/vz/dump -maxdepth 1 -name 'vzdump-qemu-100-*.tmp' -print

# Lock 소유 task가 종료됐고 guest·스토리지 작업이 없음을 확인한 경우에만 잠금 해제
# qm unlock 100

# PBS 미완료 백업 정리 (PBS 서버에서)
proxmox-backup-manager garbage-collect <datastore>
```

---

## 11. 베스트 프랙티스

### 11.1 백업 전략 체크리스트

- [ ] **PBS 사용** - 증분, 중복제거, 암호화 지원
- [ ] **3-2-1 규칙** - 3개 복사본, 2개 미디어, 1개 오프사이트
- [ ] **정기 테스트** - 분기별 복원 테스트
- [ ] **보존 정책** - 비즈니스 요구사항에 맞게 설정
- [ ] **암호화 키 백업** - Paper key 인쇄 및 보관
- [ ] **알림 설정** - 실패 알림 필수

### 11.2 권장 설정

다음은 출발점 예시입니다. 스토리지 처리량과 업무 RPO/RTO를 측정하지 않은 채 그대로 운영 기준으로 사용하지 않습니다.

```bash
# /etc/vzdump.conf 권장 설정
storage: pbs-backup
mode: snapshot
compress: zstd
ionice: 5
prune-backups: keep-last=3,keep-daily=14,keep-weekly=8,keep-monthly=12,keep-yearly=5
fleecing: enabled=1,storage=local-lvm
notes-template: {{guestname}} ({{vmid}}) on {{node}} - {{cluster}}
```

### 11.3 대역폭 관리

```bash
# 스토리지 레벨 대역폭 제한
pvesm set backup-storage --bwlimit restore=102400  # 100 MiB/s

# Datacenter 레벨 기본값
pvesh set /cluster/options --bwlimit "restore=51200,default=0"
```

---

## 12. 요약

### 핵심 명령어

| 작업 | 명령어 |
|------|--------|
| 백업 생성 | `vzdump 100 --storage backup --mode snapshot` |
| VM 복원 | `qmrestore backup.vma 100` |
| CT 복원 | `pct restore 200 backup.tar.zst` |
| 백업 목록 | `pvesm list backup-storage --content backup` |
| 보존 정리 | `pvesm prune-backups backup-storage` |
| 설정 추출 | `pvesm extractconfig backup-storage backup-file` |

### 백업 모드 요약

| 모드 | VM | CT | 다운타임 | 일관성 |
|------|----|----|----------|--------|
| snapshot | ✅ | ✅ | 보통 짧음 | 파일 시스템·앱 quiesce 방식에 따라 다름 |
| suspend | ✅ | ✅ | 환경별 측정 | 정지 시점의 메모리·디스크 상태; 앱별 검증 필요 |
| stop | ✅ | ✅ | 백업 시간 동안 | 종료된 디스크 상태; 외부 의존성은 별도 검증 |

---

## 완료 기준

- 최근 백업 task가 성공했고 대상 VM/CT, 디스크 포함·제외 목록, 보존 정책이 의도와 일치한다.
- PBS verify 또는 매체 무결성 검사를 통과했으며, 별도 VMID·격리 네트워크에 복원해 파일과 애플리케이션을 확인했다.
- 암호화된 백업은 운영 시스템 밖에서 복구 키 접근 절차를 시험했고, 키 자체를 작업 로그에 남기지 않았다.
- 실패하거나 부분 복원된 대상은 운영 트래픽에 연결하지 않고 로그·임시 리소스를 보존해 재시도 여부를 판단했다.

## 다음 단계

- **Module 7**: Firewall - 네트워크 보안 및 방화벽 규칙
- **Module 8**: User Management - 사용자, 권한, 인증 관리
