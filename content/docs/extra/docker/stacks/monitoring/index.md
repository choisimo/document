# Monitoring Docker Stacks 학습 및 기록 노트

Monitoring 카테고리는 서비스 상태를 관찰하거나 웹 페이지 변화를 감지하는 구성을 모은다. 현재는 실행 가능한 ChangeDetection Compose와, 다른 스택에 붙여 사용할 수 있는 Prometheus 설정 파일이 있다.

## 1. 왜 필요한가? (Pain Point & Motivation)

모니터링 스택은 장애를 발견하기 위해 두지만, 설정이 불완전하면 오히려 잘못된 신호를 준다. ChangeDetection은 데이터 저장 경로가 없으면 감시 목록이 사라질 수 있고, Prometheus 설정은 실제 Prometheus 컨테이너가 없으면 단독으로 실행되지 않는다.

따라서 monitoring 문서는 “무엇이 실행 가능한 스택인지”와 “무엇이 설정 조각인지”를 분명히 구분해야 한다.

## 2. 현재 나의 상태 (Baseline)

현재 `infra/docker/stacks/monitoring`에는 다음 파일이 있다.

- `changedetection/docker-compose.yaml`: ChangeDetection.io와 Playwright Chrome 구성
- `prometheus-grafana/prometheus.yml`: Prometheus scrape 설정 파일

검증 결과는 다음과 같다.

- ChangeDetection은 `DATASTORE_DIR`와 `PORT` 값을 제공하면 `docker compose config`가 성공한다.
- ChangeDetection Compose의 `version` 속성은 최신 Compose에서 obsolete 경고가 난다.
- `prometheus-grafana` 디렉터리에는 `prometheus.yml`만 있고 Grafana 또는 Prometheus Compose 파일은 없다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 상태다.

- ChangeDetection을 데이터 보존 경로와 함께 실행한다.
- Playwright Chrome이 내부 렌더링 서비스로 연결되는지 확인한다.
- Prometheus 설정 파일은 실제 Prometheus 컨테이너와 함께 사용할 때만 적용한다.
- scrape target의 DNS 이름이 같은 Docker 네트워크에서 해석되는지 검증한다.
- 모니터링 데이터와 설정 파일을 운영 백업 대상에 포함한다.

## 4. 시스템 번역 (Data Flow)

ChangeDetection 흐름은 다음과 같다.

```text
browser
  -> ChangeDetection UI
  -> datastore
  -> Playwright Chrome
  -> monitored websites
```

Prometheus 설정 흐름은 다음과 같다.

```text
prometheus.yml
  -> Prometheus server
  -> scrape targets
  -> metric storage
  -> Grafana dashboard
```

현재 저장소에는 두 번째 흐름 중 `prometheus.yml`만 있으므로, Prometheus와 Grafana 컨테이너는 별도로 준비해야 한다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 현재 파일 |
| --- | --- | --- |
| ChangeDetection | 웹 페이지 변경 감지 UI | `changedetection/docker-compose.yaml` |
| Playwright Chrome | JavaScript 렌더링 지원 | ChangeDetection Compose 내부 서비스 |
| `DATASTORE_DIR` | 감시 목록과 상태 저장 | 환경 변수 |
| `PORT` | ChangeDetection UI 호스트 포트 | 환경 변수 |
| `prometheus.yml` | scrape interval과 target 정의 | `prometheus-grafana/prometheus.yml` |

현재 Prometheus target은 다음 두 개다.

| job | target |
| --- | --- |
| `prometheus` | `localhost:9090` |
| `n8n` | `n8n:5678` |

`n8n:5678`은 Prometheus 컨테이너가 n8n과 같은 Docker 네트워크에 있을 때만 해석된다.

## 6. 상태 전이 (State Transition)

ChangeDetection 실행 흐름은 다음과 같다.

```text
환경 변수 결정
  -> datastore 생성
  -> Compose 렌더링
  -> 컨테이너 기동
  -> UI 접속
  -> 감시 항목 저장과 재시작 검증
```

Prometheus 설정 적용 흐름은 다음과 같다.

```text
Prometheus 컨테이너 준비
  -> prometheus.yml 마운트
  -> target 네트워크 연결
  -> scrape 상태 확인
  -> Grafana datasource 연결
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- ChangeDetection의 `DATASTORE_DIR`는 비어 있거나 임시 경로이면 안 된다.
- `PORT`는 호스트에서 충돌하지 않아야 한다.
- Playwright Chrome은 외부 공개 서비스가 아니라 내부 렌더링 의존성으로 다룬다.
- Prometheus 설정 파일만으로는 Prometheus/Grafana 스택이 실행되지 않는다.
- scrape target 이름은 Prometheus 컨테이너가 속한 네트워크에서 해석 가능해야 한다.
- 모니터링 스택도 운영 데이터와 설정 백업 대상에 포함한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

ChangeDetection 실행 전 검증은 다음과 같다.

```bash
cd infra/docker/stacks/monitoring/changedetection
mkdir -p datastore
DATASTORE_DIR=./datastore PORT=5000 docker compose config
DATASTORE_DIR=./datastore PORT=5000 docker compose up -d
docker compose ps
```

로그를 확인한다.

```bash
docker compose logs --tail=100
```

Prometheus 설정 파일은 실제 Prometheus 컨테이너에 마운트해야 한다.

```bash
cd infra/docker/stacks/monitoring/prometheus-grafana
sed -n '1,120p' prometheus.yml
```

target 이름이 해석되는지 Prometheus 컨테이너 안에서 확인한다.

```bash
docker compose exec prometheus wget -qO- http://n8n:5678
```

## 9. 실패 사례 (What could go wrong?)

첫 번째 실패는 `DATASTORE_DIR`를 설정하지 않고 ChangeDetection을 실행하는 것이다. Compose 변수 치환이 비어 있으면 데이터 저장 경로가 의도와 다르게 해석될 수 있다.

두 번째 실패는 Prometheus/Grafana 디렉터리에 Compose가 있다고 가정하는 것이다. 현재는 `prometheus.yml`만 있으므로 별도 실행 스택이 필요하다.

세 번째 실패는 `n8n:5678` target이 어디서나 동작한다고 생각하는 것이다. Docker DNS 이름은 같은 네트워크 안에서만 해석된다.

네 번째 실패는 ChangeDetection UI를 인증 없이 공개하는 것이다. 감시 대상 URL, 알림 채널, 스크린샷이 노출될 수 있다.

## 10. 뇌 확장하기 (Evolution & Variants)

ChangeDetection을 운영용으로 쓰려면 알림 채널, 백업, 인증 프록시, 감시 주기 정책을 함께 정한다.

Prometheus/Grafana를 완성하려면 Compose 파일, Prometheus data volume, Grafana data volume, datasource provisioning, dashboard provisioning이 필요하다.

n8n 같은 애플리케이션을 scrape하려면 애플리케이션이 실제로 metrics endpoint를 제공하는지 확인해야 한다. 단순 웹 포트가 있다고 Prometheus metric이 있는 것은 아니다.

모니터링 스택은 관찰 대상과 같은 장애 도메인에 있으면 함께 죽을 수 있다. 중요한 운영 환경에서는 별도 호스트나 외부 모니터링도 검토한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] ChangeDetection의 `DATASTORE_DIR`와 `PORT`를 명시했다.
- [ ] `docker compose config`가 성공한다.
- [ ] Playwright Chrome이 내부 의존성으로 연결된다.
- [ ] ChangeDetection UI와 데이터 보존을 확인했다.
- [ ] Prometheus 설정 파일과 실제 Prometheus 실행 스택을 구분했다.
- [ ] scrape target이 같은 네트워크에서 해석되는지 확인했다.
- [ ] 모니터링 설정과 데이터를 백업 대상으로 정했다.
- [ ] 외부 공개 시 인증과 TLS를 검토했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Monitoring 문서는 실행 가능한 스택과 `__________` 조각을 구분해야 한다. ChangeDetection은 `__________`가 핵심이고, Prometheus target은 같은 Docker `__________`에서 해석되어야 한다.
