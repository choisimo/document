# 가상화 메커니즘: 하이퍼바이저와 컨테이너

이 문서는 시스템 가상화(System Virtualization)의 핵심인 하이퍼바이저의 작동 원리와, 컨테이너 기술(Docker)과의 격리 메커니즘 차이를 상세히 설명합니다.

## 문서 범위와 검증 기준

- **범위**: x86 하드웨어 가상화, Xen 계열 split driver와 Linux container를 중심으로 한 개념 비교입니다. 모든 hypervisor, Docker Desktop/비Linux host와 VM-backed container runtime을 같은 구조로 가정하지 않습니다.
- **전제**: 격리와 성능은 hypervisor 유형, VT-x/AMD-V·IOMMU 설정, device passthrough, namespace/user mapping, seccomp/LSM, kernel 버전과 workload에 좌우됩니다.
- **근거 상태와 환경**: ring·page-table·I/O 경로는 대상 CPU와 제품 버전의 공식 문서로 확인합니다. “높음/낮음/베어메탈 근접”은 측정과 위협 모델이 없는 정량 결론이 아닙니다.
- **실패/재시도**: VM exit, device/backend 오류, cgroup OOM과 container restart는 서로 다른 상태입니다. 재시작 정책은 멱등성·영속 volume·backoff·상한을 포함하고 격리 위반 의심은 재시도 대신 격리·조사합니다.
- **완료 증거**: 비교에는 CPU/메모리/I/O workload와 p95/p99, host/runtime/kernel 버전, 활성화된 격리 제어를 기록합니다. 권한·resource-limit 거부 테스트와 guest/container 종료·복구 결과까지 확인해야 완료입니다.

---

## 1. 하이퍼바이저(Hypervisor) 작동 메커니즘

하이퍼바이저는 CPU·메모리·장치 자원을 VM에 중재하는 계층입니다. Type 1은 하드웨어에 직접 가까이 실행되고 Type 2는 host OS 위 구성 요소를 사용할 수 있으므로 항상 “하드웨어 바로 위의 얇은 계층”인 것은 아닙니다.

### 1.1 CPU 가상화 (Privilege Levels & Instructions)

하이퍼바이저의 핵심 역할은 각 VM에 가상 CPU(VCPU)를 제공하고 이를 물리 CPU에 스케줄링하는 것입니다. 이 과정에서 **권한 수준(Privilege Levels/Rings)** 관리가 중요합니다.

*   **권한 레벨 조정 (Ring Deprivileging):**
    *   초기 소프트웨어 가상화는 hypervisor와 guest kernel의 권한 충돌을 binary translation이나 ring deprivileging으로 처리했습니다.
    *   VT-x/AMD-V 환경에서는 root/non-root 모드가 ring과 직교하므로 guest kernel도 non-root의 Ring 0에서 실행될 수 있습니다. “guest는 항상 Ring 1”은 역사적 기법이지 현대 하드웨어 가상화의 보편 구조가 아닙니다.

*   **명령어 처리 방식 (Traps & Hypercalls):**
    *   **특권 명령(Privileged Instructions):** 게스트 OS가 하드웨어 상태를 변경하려는 명령을 내리면, 권한 부족으로 인해 **트랩(Trap)**이 발생합니다. 하이퍼바이저는 이 트랩을 가로채서 명령을 검사하고 안전하게 에뮬레이션하거나 실행합니다.
    *   **민감 명령(Sensitive Instructions) 처리:** x86 아키텍처의 일부 명령은 트랩을 발생시키지 않아 가상화를 어렵게 만듭니다. 이를 해결하기 위해 두 가지 방식이 주로 사용됩니다.
        1.  **전가상화(Full Virtualization):** 대부분의 안전한 명령은 직접 실행하고 민감한 동작만 trap/emulation, binary translation 또는 하드웨어 exit로 처리할 수 있습니다. 모든 명령을 에뮬레이션한다고 단정하지 않습니다.
        2.  **반가상화(Paravirtualization):** 게스트 OS 커널을 수정하여, 민감한 작업을 수행할 때 **하이퍼콜(Hypercall)**이라는 특별한 시스템 호출을 통해 하이퍼바이저에게 작업을 요청합니다. 이는 트랩 오버헤드를 줄여 성능을 높입니다.

*   **스케줄링:** 하이퍼바이저는 물리 CPU 시간을 VCPU들에게 분배합니다. (예: Xen의 **Credit Scheduler**).

### 1.2 메모리 가상화 (Memory Virtualization)

게스트 OS는 자신이 연속된 물리 메모리를 독점한다고 착각하지만, 실제로는 파편화되어 있을 수 있습니다.

*   **3단계 주소 변환:**
    1.  **가상 주소 (Virtual Address):** 애플리케이션이 보는 주소.
    2.  **의사 물리 주소 (Pseudo-physical Address):** 게스트 OS가 인식하는 물리 메모리 주소 (0부터 시작).
    3.  **머신 물리 주소 (Machine Physical Address):** 실제 하드웨어의 물리 메모리 주소.

*   **매핑 관리:**
    *   게스트 OS는 가상 주소를 의사 물리 주소로 매핑하는 페이지 테이블을 관리합니다.
    *   하이퍼바이저는 의사 물리 주소를 실제 머신 물리 주소로 매핑합니다.
    *   **섀도우 페이지 테이블(Shadow Page Tables)**이나 하드웨어 지원(**EPT/NPT**)을 통해 주소 변환을 가속화합니다.

### 1.3 I/O 및 장치 가상화 (Split Device Drivers)

I/O는 workload에 따라 주요 가상화 비용이 될 수 있습니다. 다음은 Xen 계열의 split-driver 예이며 virtio, SR-IOV와 device passthrough는 다른 경로와 격리·성능 trade-off를 가집니다.

*   **구조:**
    *   **프론트엔드 드라이버 (Front-end Driver):** 게스트 OS 내부에 존재하며, I/O 요청을 백엔드로 전달합니다.
    *   **백엔드 드라이버 (Back-end Driver):** 실제 하드웨어에 접근 가능한 특권 도메인(Domain 0)에 존재하며, 실제 물리 장치와 통신합니다.

*   **통신 방식:**
    *   **공유 메모리(Shared Memory):** 데이터 복사 비용을 줄이기 위해 사용.
    *   **이벤트 채널(Event Channel):** 인터럽트와 유사한 알림(Notification)을 비동기적으로 주고받음.

---

## 2. Docker(컨테이너)와 VM의 비교

도커(컨테이너)와 가상 머신(VM)은 **격리의 대상**과 **커널 공유 여부**에서 가장 큰 차이를 보입니다.

### 2.1 기본 아키텍처 차이

| 특성 | 가상 머신 (VM) | 도커 (Container) |
| :--- | :--- | :--- |
| **가상화 대상** | **하드웨어** (Hardware Virtualization) | **운영체제** (OS Virtualization) |
| **커널** | 게스트 OS마다 **별도의 커널** 존재 | 호스트 OS의 **커널 공유** |
| **격리 수준** | 별도 guest kernel과 hardware-assisted 경계; hypervisor/device 공격면은 남음 | host kernel 공유; user namespace·seccomp·LSM과 runtime 설정에 의존 |
| **성능** | CPU는 근접할 수 있으나 exit·I/O·메모리 overcommit 비용이 workload별로 다름 | native process와 유사할 수 있으나 overlay network/filesystem·cgroup 비용이 workload별로 다름 |
| **구현 기술** | Hypervisor, VT-x/AMD-V | Namespaces, Cgroups |

### 2.2 가상 머신(VM)의 격리 방식
VM은 guest별 kernel과 하드웨어 지원 경계를 제공하지만 완전한 격리를 보장하지는 않습니다. hypervisor, shared microarchitecture, emulated device와 잘못된 passthrough 설정도 위협 모델에 포함합니다.
*   **하이퍼바이저:** 물리적 자원을 배분하고 가상 하드웨어 인터페이스 제공.
*   **권한 레벨:** 게스트 OS 커널은 Ring 0보다 낮은 권한(또는 Non-Root Mode)에서 실행되어, 하드웨어 직접 제어가 제한됨.

### 2.3 도커(컨테이너)의 격리 방식
Linux host의 Docker는 kernel namespace와 cgroup 등을 사용해 프로세스 수준 격리를 구성합니다. 비Linux Docker 환경은 내부 VM을 사용할 수 있으며 container 자체가 보안 경계가 되는지는 runtime 설정과 위협 모델로 판단합니다.

*   **네임스페이스(Namespaces):** 시스템 리소스의 **뷰(View)를 격리**합니다.
    *   `pid`(프로세스), `net`(네트워크), `mnt`(파일시스템), `ipc`, `user`, `uts` 등.
*   **Cgroups (Control Groups):** **물리적 자원 사용량을 제한**합니다. (CPU, 메모리, I/O 대역폭 등)
*   **계층화된 파일 시스템:** 이미지는 읽기 전용 레이어들의 조합이며, 실행 시 쓰기 가능 레이어가 추가됩니다.
