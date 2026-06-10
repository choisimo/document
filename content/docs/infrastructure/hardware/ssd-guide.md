# SSD 및 NVMe 상태 점검 학습 노트

SSD와 NVMe 상태 점검은 `smartctl` 출력에서 하나의 숫자만 보는 일이 아니다. 드라이브 종류, 제조사별 SMART attribute, 쓰기량, 온도, 오류 증가 추세, 백업 상태를 함께 보고 교체 시점을 판단해야 한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

스토리지는 장애가 발생하면 가장 복구 비용이 크다. 디스크가 완전히 죽은 뒤에는 모니터링도, SMART 출력도 의미가 없다. 특히 SSD는 갑작스러운 읽기 전용 전환이나 컨트롤러 장애가 발생할 수 있어 “현재 정상”보다 “오류가 증가하는지”를 추적해야 한다.

이 문서의 목적은 SSD/NVMe 상태를 정기적으로 확인하고, 위험 신호가 보이면 백업과 교체를 먼저 판단하게 하는 것이다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 다음 내용을 제공했다.

- `smartctl -H`, `smartctl -a` 기본 명령
- SATA SSD와 NVMe 지표별 경고 임계값 표
- 분석 흐름도
- 용도별 드라이브 추천
- 간단한 자동 점검 스크립트

하지만 SMART attribute는 제조사와 인터페이스에 따라 의미가 다르다. 절대 숫자 하나로 정상과 고장을 단정하기보다 추세와 백업 상태를 함께 봐야 한다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- SATA SSD와 NVMe의 상태 확인 명령을 구분한다.
- 전체 상태, 오류 카운터, 쓰기량, 온도, spare, self-test 결과를 함께 본다.
- 경고 지표가 보이면 먼저 백업 상태를 확인한다.
- 같은 지표가 시간에 따라 증가하는지 기록한다.
- 교체 판단을 “현재 수치”가 아니라 “데이터 위험” 기준으로 내린다.

## 4. 시스템 번역 (Data Flow)

스토리지 상태 점검 흐름은 다음과 같다.

```text
drive
  -> SMART or NVMe log
  -> health summary
  -> detailed counters
  -> self-test result
  -> trend comparison
  -> backup or replacement decision
```

운영 관점에서는 다음 순서가 더 중요하다.

```text
warning signal
  -> backup verification
  -> workload impact check
  -> replacement plan
  -> restore test
```

디스크 점검의 목적은 장애 예측 자체가 아니라 데이터 손실 가능성을 줄이는 것이다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 대표 확인 |
| --- | --- | --- |
| `smartctl -H` | 건강 상태 요약 | 빠른 실패 여부 확인 |
| `smartctl -a` | 전체 SMART 정보 | SATA와 NVMe 상세 출력 |
| `smartctl -x` | 확장 정보 | 지원 장치에서 더 많은 로그 확인 |
| Self-test | 장치 내부 테스트 | short, long 테스트 결과 |
| Error counter | 미디어/전송 오류 추적 | 증가 추세 확인 |
| Wear indicator | NAND 사용량 추정 | 제조사별 해석 필요 |
| Temperature | 발열 상태 | 장시간 고온 여부 확인 |

NVMe에서 자주 보는 항목은 다음과 같다.

| 항목 | 의미 |
| --- | --- |
| `Percentage Used` | 제조사가 추정한 수명 사용률 |
| `Available Spare` | 예비 블록 여유 |
| `Media and Data Integrity Errors` | 미디어 또는 데이터 무결성 오류 |
| `Unsafe Shutdowns` | 정상 종료되지 않은 횟수 |
| `Data Units Written` | 누적 쓰기량 |
| `Temperature` | 현재 온도와 경고 온도 |

SATA SSD는 제조사별 attribute 이름과 raw value 해석이 다르므로 모델별 문서를 함께 본다.

## 6. 상태 전이 (State Transition)

드라이브 운영 상태는 다음처럼 이동한다.

```text
정상 운영
  -> 경고 지표 발견
  -> 백업 확인
  -> 추세 관찰
  -> 교체 계획
  -> 데이터 이전
  -> 폐기 또는 예비 보관
```

상태별 통과 기준은 다음과 같다.

- 정상 운영: health check가 통과하고 오류 카운터 증가가 없다.
- 경고 발견: spare 감소, media error, reallocated sector, self-test 실패가 보인다.
- 백업 확인: 최근 백업과 복구 가능성을 확인했다.
- 추세 관찰: 같은 명령 출력을 날짜별로 비교한다.
- 교체 계획: 서비스 중단 시간과 데이터 이전 경로를 정한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- SMART가 `PASSED`여도 백업이 필요 없다는 뜻은 아니다.
- 오류 카운터가 증가하면 먼저 백업을 확인한다.
- 제조사별 SMART attribute를 같은 기준으로 해석하지 않는다.
- self-test는 운영 부하와 장치 상태를 고려해 실행한다.
- 고온이 지속되면 성능 저하와 수명 저하 가능성을 함께 본다.
- 데이터가 중요한 드라이브는 교체 전 복구 테스트를 한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

장치 목록을 확인한다.

```bash
lsblk -o NAME,MODEL,SIZE,TYPE,MOUNTPOINTS
sudo smartctl --scan
```

SATA SSD 상태를 확인한다.

```bash
sudo smartctl -H /dev/sda
sudo smartctl -a /dev/sda
```

NVMe 상태를 확인한다.

```bash
sudo smartctl -H /dev/nvme0n1
sudo smartctl -a /dev/nvme0n1
```

짧은 self-test를 실행한다.

```bash
sudo smartctl -t short /dev/sda
sudo smartctl -l selftest /dev/sda
```

긴 self-test는 운영 영향이 적은 시간에 실행한다.

```bash
sudo smartctl -t long /dev/sda
```

출력을 날짜별로 보관해 추세를 비교한다.

```bash
sudo smartctl -a /dev/nvme0n1 > smart-nvme0n1-$(date +%F).txt
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 `PASSED`만 보고 안심하는 것이다. 요약 상태가 통과해도 media error나 unsafe shutdown 같은 지표가 증가할 수 있다.

두 번째 실패는 `Percentage Used`를 남은 수명 퍼센트로 거꾸로 해석하는 것이다. 이 값은 대체로 사용된 수명 추정치로 읽어야 한다.

세 번째 실패는 온도 센서를 과신하는 것이다. 일부 저가형 컨트롤러는 부정확한 값을 표시할 수 있으므로 케이스 냉각과 실제 부하 상황을 함께 확인한다.

네 번째 실패는 self-test를 백업보다 먼저 실행하는 것이다. 이미 의심스러운 드라이브에는 추가 부하보다 백업 확인이 먼저다.

다섯 번째 실패는 새 드라이브에서 초기 오류가 보이는데 계속 사용하는 것이다. 초기 불량 가능성이 있으므로 burn-in과 교환 판단을 빠르게 한다.

## 10. 뇌 확장하기 (Evolution & Variants)

홈랩에서는 일일 또는 주간 SMART 출력 저장만으로도 추세 파악에 도움이 된다.

운영 서버에서는 Prometheus node exporter, smartctl exporter, ZFS event, Proxmox 알림과 연결해 경고를 자동화할 수 있다.

RAID나 ZFS를 사용하면 개별 드라이브 상태와 풀 상태를 함께 봐야 한다. 하나의 디스크가 정상이어도 풀 scrub 결과가 실패할 수 있다.

NVMe는 PCIe 오류, 발열, 펌웨어 이슈도 중요하다. 반복 오류가 보이면 제조사 펌웨어 릴리스와 서버 메인보드 호환성도 확인한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] `smartctl --scan`으로 장치 이름을 확인했다.
- [ ] SATA와 NVMe 명령을 구분해 실행했다.
- [ ] health summary와 상세 카운터를 함께 봤다.
- [ ] 오류 지표가 있으면 백업 상태를 먼저 확인했다.
- [ ] self-test 결과를 확인했다.
- [ ] 날짜별 출력으로 증가 추세를 비교했다.
- [ ] 교체 기준을 데이터 중요도와 복구 가능성 기준으로 정했다.
- [ ] 장기 운영 드라이브는 모니터링 또는 알림에 연결했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

SSD 상태 점검은 `PASSED` 한 줄이 아니라 오류 `__________`, 수명 사용률, 온도, self-test, 백업 상태를 함께 보는 일이다. 의심 신호가 보이면 먼저 `__________`을 확인하고, 숫자는 단일 값보다 `__________`로 판단한다.
