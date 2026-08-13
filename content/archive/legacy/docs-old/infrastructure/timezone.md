# 호스트 시계, 시간대, Loki 타임스탬프 진단

시간대는 시각을 표시하는 규칙이고, 시간 동기화는 호스트 시계를 기준 시간에 맞추는 기능입니다. 둘을 분리해서 확인합니다. 컨테이너는 호스트 커널 시계를 공유하므로 `/etc/localtime` 마운트는 표시 시간대에 영향을 줄 수 있지만 시계 오차를 교정하지는 않습니다.

## 1. 호스트 상태 확인

```bash
timedatectl status
date --iso-8601=seconds
date -u --iso-8601=seconds
```

표시 시간대를 서울로 바꿔야 할 때만 실행합니다.

```bash
sudo timedatectl set-timezone Asia/Seoul
```

기존에 활성화된 시간 동기화 구현을 먼저 확인합니다. `systemd-timesyncd`, Chrony, `ntpd`를 근거 없이 동시에 설치하거나 실행하지 않습니다.

```bash
timedatectl show -p NTPSynchronized -p NTP
systemctl --type=service --state=running | grep -E 'chrony|ntp|timesync'
```

## 2. 컨테이너 비교

```bash
docker exec <LOKI_CONTAINER> date --iso-8601=seconds
docker exec <LOKI_CONTAINER> date -u --iso-8601=seconds
```

애플리케이션 로그의 표시 시간대가 필요하면 이미지가 제공하는 `TZ` 설정이나 읽기 전용 `/etc/localtime` 마운트를 검토합니다. 수집·저장·질의 경계에서는 UTC 타임스탬프와 시간대 오프셋이 보존되는지 확인합니다.

## 3. Loki 수집 경로 확인

1. 수집기의 원본 로그 한 건에서 타임스탬프와 오프셋을 기록합니다.
2. 수집기 로그에서 같은 파일의 읽기 위치와 전송 오류를 확인합니다.
3. Loki의 준비 상태와 대상 포트를 확인합니다.
4. 원본 시각을 포함하는 절대 UTC 범위로 쿼리합니다.
5. 반환된 로그의 저장 시각과 원본 시각 차이를 비교합니다.

```bash
curl -fsS "http://<LOKI_HOST>:<LOKI_PORT>/ready"
curl -G "http://<LOKI_HOST>:<LOKI_PORT>/loki/api/v1/query_range" \
  --data-urlencode 'query={job="spring-boot"}' \
  --data-urlencode 'start=<RFC3339_START>' \
  --data-urlencode 'end=<RFC3339_END>'
```

완료 조건은 세 시스템의 `date` 출력이 비슷한 것만이 아닙니다. 알려진 로그 한 건이 예상 라벨로 수집되고, UTC 질의 범위에서 한 번만 반환되며, Grafana가 같은 시점을 사용자의 표시 시간대로 변환해야 합니다.
