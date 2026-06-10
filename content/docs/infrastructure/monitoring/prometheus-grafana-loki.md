# Prometheus, Grafana, Loki 관측 스택 학습 노트

Prometheus, Grafana, Loki는 메트릭과 로그를 함께 보는 관측 스택이다. 이 문서의 중심은 세 VM의 로그를 중앙에서 보기 위한 흐름이며, 신규 로그 수집 에이전트는 Promtail이 아니라 Grafana Alloy를 기준으로 검토한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

서버가 여러 대로 나뉘면 장애 원인을 찾기 위해 각 VM에 SSH로 접속해 로그를 보는 방식은 곧 한계에 닿는다. 메트릭은 Prometheus, 로그는 Loki, 시각화는 Grafana로 모으면 시간대별로 증상과 원인을 함께 볼 수 있다.

다만 관측 스택은 설치만으로 끝나지 않는다. 로그 수집 에이전트, 라벨 설계, 저장 경로, 인증, 보존 기간, 알림 정책이 맞지 않으면 데이터가 쌓여도 검색과 운영 판단이 어렵다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 다음 내용을 포함했다.

- Loki와 Promtail 바이너리 수동 다운로드
- Promtail systemd service 예시
- Promtail scrape config 예시
- Loki local filesystem 설정
- Grafana 설치와 Loki datasource 추가
- `Too Many Outstanding Requests` 완화 설정

하지만 현재 Grafana 공식 문서 기준으로 Promtail은 신규 구성의 기본 선택지가 아니다. Grafana Alloy가 Loki로 로그를 보내는 권장 에이전트이며, Promtail은 기존 구성의 마이그레이션 대상으로 보는 것이 안전하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- 메트릭과 로그의 책임을 구분한다.
- Loki는 중앙 로그 저장소로 배치한다.
- 신규 로그 수집은 Grafana Alloy 기준으로 설계한다.
- Grafana는 Loki와 Prometheus datasource를 분리해 연결한다.
- 로그 라벨은 검색에 필요한 최소 기준으로 설계한다.
- Loki 저장 경로, 보존 기간, 인증 경계를 운영 기준으로 정한다.

## 4. 시스템 번역 (Data Flow)

로그 수집 흐름은 다음과 같다.

```text
VM log files
  -> Grafana Alloy
  -> Loki push API
  -> Loki storage
  -> Grafana Explore and dashboard
```

메트릭 수집 흐름은 다음과 같다.

```text
exporter targets
  -> Prometheus scrape
  -> Prometheus TSDB
  -> Grafana dashboard and alerting
```

Grafana는 데이터를 저장하는 주체가 아니라 datasource를 조회하고 시각화하는 계층이다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 주의점 |
| --- | --- | --- |
| Loki | 로그 저장과 LogQL 질의 | 인증 계층 없음, reverse proxy 필요 |
| Grafana Alloy | 로그와 telemetry 수집 에이전트 | 신규 Promtail 대체 기준 |
| Prometheus | 메트릭 수집과 저장 | scrape target과 label 설계 |
| Grafana | 시각화와 탐색 | datasource URL과 권한 |
| Log labels | 로그 검색 인덱스 기준 | 과도한 cardinality 방지 |
| Storage schema | Loki 저장 구조 | 신규 설치는 최신 권장 schema 확인 |

Loki 신규 설치에서는 `tsdb` store와 `v13` schema를 기준으로 공식 문서를 확인한다. 기존 `boltdb` 기반 예시는 레거시 설정으로 취급한다.

## 6. 상태 전이 (State Transition)

관측 스택 구축 흐름은 다음과 같다.

```text
관측 대상 정의
  -> 로그와 메트릭 분리
  -> 중앙 Loki와 Prometheus 배치
  -> 에이전트 설치
  -> datasource 연결
  -> 쿼리와 대시보드 검증
  -> 보존 기간과 알림 설정
```

각 단계의 통과 기준은 다음과 같다.

- 대상 정의: 어떤 VM, 어떤 로그, 어떤 metric이 필요한지 정한다.
- 중앙 배치: Loki와 Prometheus의 데이터 경로가 영구 저장소다.
- 에이전트: 각 VM에서 로그가 Loki로 실제 전송된다.
- datasource: Grafana에서 Save & Test가 성공한다.
- 쿼리 검증: LogQL과 PromQL로 기대한 데이터가 조회된다.
- 운영 설정: 인증, 백업, 보존, 알림 정책이 있다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- Loki를 공개 네트워크에 인증 없이 노출하지 않는다.
- 로그 라벨에 요청 ID, 사용자 ID 같은 고카디널리티 값을 무분별하게 넣지 않는다.
- Loki storage를 `/tmp` 같은 임시 경로에 두지 않는다.
- 신규 구성에서 Promtail을 기본 선택지로 두지 않는다.
- 기존 Promtail 구성은 Grafana Alloy로의 마이그레이션 계획을 둔다.
- Grafana 기본 `admin/admin` 계정은 초기 로그인 후 즉시 변경한다.
- 로그 수집 여부는 Grafana 화면이 아니라 Loki query와 에이전트 로그로 검증한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Loki readiness를 확인한다.

```bash
curl http://127.0.0.1:3100/ready
```

Loki metrics endpoint를 확인한다.

```bash
curl http://127.0.0.1:3100/metrics
```

Grafana에서 Loki datasource URL은 중앙 Loki 주소를 사용한다.

```text
http://loki.example.internal:3100
```

Grafana Explore에서 로그가 들어오는지 확인한다.

```logql
{job="system"}
```

Prometheus target 상태는 Prometheus UI 또는 API로 확인한다.

```bash
curl http://127.0.0.1:9090/-/ready
curl http://127.0.0.1:9090/api/v1/targets
```

기존 Promtail 서비스를 쓰고 있다면 새 설치 대신 마이그레이션 대상으로 표시한다.

```bash
systemctl status promtail
journalctl -u promtail --since today
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 오래된 Promtail 설치 절차를 신규 구성에 그대로 적용하는 것이다. Promtail은 지원 수명 관점에서 신규 표준으로 보기 어렵고, Alloy 전환을 계획해야 한다.

두 번째 실패는 Loki를 인증 없이 노출하는 것이다. Loki 자체에 포함된 인증 계층이 없으므로 reverse proxy, 네트워크 제한, Grafana datasource 권한을 함께 설계해야 한다.

세 번째 실패는 로그 라벨을 너무 세분화하는 것이다. 라벨 cardinality가 커지면 저장소와 쿼리 비용이 급격히 증가한다.

네 번째 실패는 `/tmp/loki` 같은 임시 경로에 저장하는 것이다. 재부팅이나 정리 작업으로 로그가 사라질 수 있다.

다섯 번째 실패는 `Too Many Outstanding Requests`를 단순히 제한값만 올려 해결하려는 것이다. 수집량, batch, label cardinality, query 범위, 저장소 성능을 함께 봐야 한다.

## 10. 뇌 확장하기 (Evolution & Variants)

작은 홈랩에서는 Loki single binary와 로컬 파일시스템 저장소로 시작할 수 있다. 그래도 저장 경로와 백업, 인증 프록시는 필요하다.

운영 환경에서는 object storage, retention, compactor, ruler, Alertmanager, Grafana provisioning을 함께 검토한다.

기존 Promtail 설정이 많다면 Alloy로 변환 가능한 단위부터 나누어 이전한다. VM별 로그 경로와 label 구조를 그대로 보존하면 Grafana dashboard 변경을 줄일 수 있다.

Prometheus와 Loki를 함께 쓰면 장애 시점의 metric spike와 관련 로그를 같은 시간축에서 볼 수 있다. 이때 host label, service label, environment label을 일관되게 맞추는 것이 중요하다.

공식 기준은 Grafana Loki local install, storage schema, Alloy migration 문서를 우선한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 관측 대상 VM과 로그 경로를 정했다.
- [ ] Loki 저장 경로가 영구 저장소다.
- [ ] 신규 로그 수집 에이전트는 Alloy 기준으로 검토했다.
- [ ] 기존 Promtail은 마이그레이션 대상으로 표시했다.
- [ ] Grafana에서 Loki datasource 테스트가 성공한다.
- [ ] LogQL로 기대한 로그가 조회된다.
- [ ] Prometheus target이 up 상태다.
- [ ] 인증, 보존 기간, 백업, 알림 정책을 정했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

관측 스택은 Grafana 화면이 아니라 데이터 흐름이다. 로그는 `__________`를 거쳐 Loki에 들어가고, 메트릭은 `__________`가 수집한다. 신규 로그 에이전트는 Promtail보다 `__________`를 기준으로 검토한다.
