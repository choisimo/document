3개의 서로 다른 VM 서버의 로그를 통합하여 보기 위해 

**Prometheus + Loki + Grafana**를 설정하는 방법을 안내하겠습니다. 

이 구성은 경량화된 설치와 운영이 가능하며, 

로그와 메트릭을 동시에 시각화할 수 있는 강력한 솔루션입니다.

---

## **구성 목표**
- 각 VM에서 로그를 수집하여 Loki에 전송.
- Loki에 수집된 로그를 Grafana로 시각화.
- Prometheus를 통해 추가적인 메트릭 데이터도 관리 가능.

---

## **구성 요소**
1. **Promtail**: 각 서버(VM)에서 로그를 수집하고 Loki에 전송.
2. **Loki**: 중앙 로그 저장소.
3. **Grafana**: 로그 및 메트릭 데이터 시각화.

---

## **설치 및 설정 단계**

### **1. Loki 설치 (중앙 서버)**
중앙 서버에 Loki를 설치합니다.

#### (1) Loki 바이너리 다운로드 및 실행
1. Loki 바이너리 다운로드:
```bash
  wget https://github.com/grafana/loki/releases/download/v2.9.1/loki-linux-amd64.zip
  wget https://github.com/grafana/loki/releases/download/v2.9.1/promtail-linux-amd64.zip
  wget https://raw.githubusercontent.com/grafana/loki/master/cmd/loki/loki-local-config.yaml
wget https://raw.githubusercontent.com/grafana/loki/main/clients/cmd/promtail/promtail-local-config.yaml

  sudo apt-get install unzip
  unzip locki-linux.amd64.zip
  unzip promtail-linux-amd64.zip

  chmod +x loki-linux-amd64
  chmod +x promtail-linux-amd64

# port 3100

nohup ./loki-linux-amd64 -config.file=/workspace/Loki/loki-local-config.yaml > loki.log 2>&1 &

# port 9080

nohup /workspace/Loki/promtail/promtail-linux-amd64 \
-config.file=/workspace/Loki/promtail/promtail-local-config.yaml \
> ./promtail.log 2>&1 &

```
## promtail systemd service 등록 (부팅 관리)
```bash
sudo vim /etc/systemd/system/promtail_service.service
```
### service
```
[Unit]
Description=Promtail Log Collector
After=network.target

[Service]
ExecStart=/workspace/Loki/promtail/promtail-linux-amd64 \
-config.file=/workspace/Loki/promtail/promtail-local-config.yaml
Restart=always
User=nodove
Group=nodove
WorkingDirectory=/workspace/Loki/promtail

[Install]
WantedBy=multi-user.target
```
## service enable
```
sudo systemctl daemon-reload
sudo systemctl start promtail_service
sudo systemctl enable promtail_service
sudo systemctl status promtail_service
```

## promtail 설정 (promtail.yaml) : 
```yaml
server:
  http_listen_port: 9080  # Promtail HTTP 서버 포트
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml  # Promtail이 마지막으로 읽은 로그 위치 저장 경로

clients:
  - url: http://<Loki_Server_IP>:3100/loki/api/v1/push  # Loki 서버의 HTTP URL

scrape_configs:
  - job_name: system_logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: system_logs
          host: ${HOSTNAME}
          __path__: /var/log/*.log  # 로그 파일 경로
```

## promtail 설정 multi (promtail.yaml) : 
```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://192.168.0.44:3200/loki/api/v1/push

scrape_configs:
  - job_name: backend-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: backend-log
          level: debug
          __path__: /server/log/backend.log

  - job_name: frontend-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: frontend-log
          level: debug
          __path__: /server/log/front.log
```
---

**Promtail**은 Grafana Loki와 함께 사용되는 **로그 수집 도구**로, 시스템 로그나 애플리케이션 로그를 Loki로 전송하는 역할을 합니다. <br/>
Promtail은 **log shipper**로서 Loki의 데이터 모델과 호환되는 메타데이터(라벨)를 추가하여 로그를 구조화합니다.<br/>
 Promtail은 주로 시스템에서 로그를 수집, 처리, 라벨링하고 Loki에 푸시하는 데 사용됩니다.

---

### **Promtail 주요 기능**
1. **로그 수집**:
   - 시스템 파일 로그(`/var/log`와 같은 디렉토리).
   - 컨테이너 로그(Docker 또는 Kubernetes 환경에서 사용).

2. **라벨링**:
   - Loki와 호환되는 메타데이터(라벨)를 로그와 함께 전송하여, Loki에서 쿼리를 통해 데이터를 효과적으로 검색 가능.

3. **로그 전송**:
   - 수집한 로그를 Loki API로 푸시.

4. **플랫폼 지원**:
   - 로컬 로그 파일.
   - Docker 컨테이너 로그.
   - Kubernetes 로그.

---

### **Promtail 설정 파일 설명**

Promtail의 설정 파일(예: `promtail-config.yml`)은 다음과 같은 주요 섹션으로 구성됩니다:

#### **1. `server` 섹션**
Promtail 자체의 서버 설정입니다.

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0
```

- **`http_listen_port`**: Promtail의 HTTP 상태 페이지 및 메트릭스를 확인할 수 있는 포트를 설정합니다. (기본적으로 9080).
- **`grpc_listen_port`**: gRPC 서버 포트를 설정합니다. 기본적으로 비활성화(0)됩니다.

---

#### **2. `positions` 섹션**
Promtail이 수집한 로그의 마지막 읽기 위치를 저장하는 파일 경로를 정의합니다.

```yaml
positions:
  filename: /tmp/positions.yaml
```

- **`filename`**: 로그 파일의 마지막 읽은 위치를 저장하는 YAML 파일의 경로입니다.
  - Promtail은 이 파일을 통해 이전 로그의 읽기 위치를 기억하고, 다음 실행 시 동일한 위치에서 다시 시작합니다.

---

#### **3. `clients` 섹션**
Promtail이 로그를 전송할 Loki 서버의 URL을 지정합니다.

```yaml
clients:
  - url: http://localhost:3100/loki/api/v1/push
```

- **`url`**: Loki API의 푸시 엔드포인트. Promtail이 이 주소로 로그를 전송합니다.
  - 예: `http://<Loki-Server-IP>:3100/loki/api/v1/push`.

---

#### **4. `scrape_configs` 섹션**
Promtail이 수집할 로그 파일 경로 및 라벨을 설정하는 섹션입니다. 여러 `scrape_configs`를 정의하여 다양한 로그 경로와 라벨링을 설정할 수 있습니다.

```yaml
scrape_configs:
- job_name: system
  static_configs:
  - targets:
      - localhost
    labels:
      job: was-log
      __path__: /home/ubuntu/be-log/*.log
```

- **`job_name`**: 로그 수집 작업(job)의 이름입니다. (예: `system`).
- **`static_configs`**:
  - **`targets`**: Promtail이 설치된 서버를 지정합니다. 대부분 `localhost`를 설정.
  - **`labels`**: Loki에 전달될 메타데이터로, 로그 검색 시 필터로 사용됩니다.
    - **`job`**: 로그의 그룹 또는 작업(job) 이름을 정의합니다. (예: `was-log`).
    - **`__path__`**: 수집할 로그 파일의 경로를 지정합니다.
      - 예: `/home/ubuntu/be-log/*.log`는 `/home/ubuntu/be-log/` 디렉터리의 모든 `.log` 파일을 대상으로 함.

---

### **Promtail 작동 흐름**
1. Promtail이 설정된 로그 파일 경로(예: `/home/ubuntu/be-log/*.log`)를 주기적으로 스캔.
2. 새 로그가 감지되면:
   - 라벨링(예: `job=was-log`)을 추가.
3. 수집한 로그를 Loki 서버(`http://localhost:3100/loki/api/v1/push`)로 전송.
4. Loki는 이를 저장하고, Grafana를 통해 시각화 및 검색 가능.

---

### **Promtail 구성 예시**
다음은 다양한 환경에서 Promtail을 구성하는 예시입니다:

#### **1. 기본 로그 파일 수집**
```yaml
scrape_configs:
- job_name: varlogs
  static_configs:
  - targets:
      - localhost
    labels:
      job: system-logs
      __path__: /var/log/*.log
```
- `/var/log` 디렉터리의 모든 `.log` 파일을 Loki로 전송.

#### **2. Docker 컨테이너 로그 수집**
```yaml
scrape_configs:
- job_name: docker-logs
  static_configs:
  - targets:
      - localhost
    labels:
      job: container-logs
      __path__: /var/lib/docker/containers/*/*.log
```
- Docker 컨테이너 로그를 Loki로 전송.

#### **3. Kubernetes 로그 수집**
Promtail은 Kubernetes 환경에서 **ConfigMap**으로 설정 파일을 제공하여 사용됩니다:
```yaml
scrape_configs:
- job_name: kubernetes-pods
  kubernetes_sd_configs:
  - role: pod
    labels:
      job: kubernetes-logs
```

---

### **Promtail 설치 및 실행**
1. **Promtail 바이너리 다운로드**:
   ```bash
   wget https://github.com/grafana/loki/releases/download/v2.8.0/promtail-linux-amd64.zip
   unzip promtail-linux-amd64.zip
   chmod +x promtail-linux-amd64
   ```

2. **설정 파일 작성**:
   설정 파일(`promtail-config.yml`)을 작성.

3. **Promtail 실행**:
   ```bash
   ./promtail-linux-amd64 --config.file=promtail-config.yml
   ```

---

### **Promtail 사용 예시**
Promtail은 **단독으로 사용**하기보다 Loki 및 Grafana와 함께 사용하여 강력한 **로그 수집 및 분석 환경**을 구성합니다. Promtail 설정이 Loki의 요구사항에 맞게 제대로 작성되면, 로그 데이터를 중앙화하고 쉽게 검색, 분석할 수 있습니다.



### loki data folders
1.1. make: 
```bash
    sudo mkdir -p /data/loki/index /data/loki/chunks /data/loki/compactor
    sudo chown user:user /data/loki/index /data/loki/chunks /data/loki/compactor
    chmod -R 755 /data/loki
```


2. Loki 기본 설정 파일 생성 (`/etc/loki/config.yml`) [24.11.30_tested]:
```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096
  log_level: debug
  grpc_server_max_concurrent_streams: 1000

common:
  instance_addr: 127.0.0.1
  path_prefix: /tmp/loki
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

storage_config:
  boltdb:
    directory: /tmp/loki/index
  filesystem:
    directory: /tmp/loki/chunks

query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 100

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://localhost:9093
```

3. Loki 실행:
   ```bash
   loki --config.file=/etc/loki/config.yml
   ```

4. Loki가 **3100 포트**에서 실행되고 있는지 확인:
   ```bash
   curl http://localhost:3100/ready
   ```

---

### **2. Promtail 설치 (각 VM)**
각 VM에서 로그를 수집하고 Loki로 전송하기 위해 Promtail을 설치합니다.

#### (1) Promtail 바이너리 다운로드 및 실행
1. Promtail 다운로드:
   ```bash
   wget https://github.com/grafana/loki/releases/download/v2.8.0/promtail-linux-amd64.zip
   unzip promtail-linux-amd64.zip
   chmod +x promtail-linux-amd64
   mv promtail-linux-amd64 /usr/local/bin/promtail
   ```

2. Promtail 설정 파일 생성 (`/etc/promtail/config.yml`):
   ```yaml
   server:
     http_listen_port: 9080
     grpc_listen_port: 0

   clients:
     - url: http://<Loki_Server_IP>:3100/loki/api/v1/push

   positions:
     filename: /tmp/positions.yaml

   scrape_configs:
     - job_name: system
       static_configs:
         - targets:
             - localhost
           labels:
             job: varlogs
             __path__: /var/log/*.log
     - job_name: application
       static_configs:
         - targets:
             - localhost
           labels:
             job: applogs
             __path__: /path/to/your/application/logs/*.log
   ```

3. Promtail 실행:
   ```bash
   promtail --config.file=/etc/promtail/config.yml
   ```

#### (2) 각 VM의 Promtail 설정
- `clients.url`: Loki 서버의 IP 주소를 설정.
- `__path__`: 각 VM에서 수집할 로그 경로를 설정.

---

### **3. Grafana 설치 및 Loki 데이터 소스 설정**
중앙 서버에 Grafana를 설치하고 Loki를 데이터 소스로 추가합니다.
Grafana 란? 오픈소스로 제공되는 대시보드 및 시각화 플랫폼

#### (1) Grafana 설치
1. Grafana 설치:
  ```bash
wget https://dl.grafana.com/enterprise/release/grafana-enterprise-10.1.2.linux-amd64.tar.gz
tar -zxvf grafana-enterprise-10.1.2.linux-amd64.tar.gz
   ```

- Grafana 실행:
   ```bash
   sudo systemctl start grafana-server
   sudo systemctl enable grafana-server

   sudo vim /etc/systemd/system/grafana-custom.service
   ```

2. Grafana Service:
```bash
[Unit]
Description=Grafana
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/grafana-10.1.2
ExecStart=/home/ubuntu/grafana-10.1.2/bin/grafana-server
Restart=on-failure

[Install]
WantedBy=multi-user.target
```
```bash
#서비스 파일 권한 설정 후 데몬 리로드
sudo chmod 644 /etc/systemd/system/grafana-custom.service
sudo systemctl daemon-reload
#Grafana 시작
sudo systemctl start grafana-custom
#시스템 부팅 시 자동 시작 설정
sudo systemctl enable grafana-custom
#그라파나 실행 확인
sudo systemctl status grafana-custom
```

3. 브라우저로 Grafana에 접속:
   - URL: `http://<Server_IP>:3000`
   - 기본 로그인:
     - ID: `admin`
     - PW: `admin`

---

#### (2) Loki 데이터 소스 추가
1. Grafana 대시보드에 로그인.
2. "Configuration" → "Data Sources" → "Add data source".
3. "Loki" 선택 후 아래 설정 입력:
   - **URL**: `http://<Loki_Server_IP>:3100`
   - "Save & Test" 버튼 클릭.

---

### **4. Grafana에서 로그 대시보드 설정**
1. Grafana에서 대시보드 생성.
2. "Explore" 탭에서 Loki 쿼리를 사용하여 로그 확인:
   - 예시 쿼리:
     ```logql
     {job="varlogs"}
     ```
   - 특정 애플리케이션 로그 확인:
     ```logql
     {job="applogs"}
     ```

---

## **요약**
1. **Loki 설치**: 중앙에서 로그를 저장.
2. **Promtail 설치**: 각 VM에서 로그를 수집하여 Loki로 전송.
3. **Grafana 설치**: Loki 데이터를 시각화.

---

### **추가 사항**
- Prometheus를 Loki와 함께 설치하면 애플리케이션 메트릭도 모니터링할 수 있습니다.
- 추가적인 알림 설정은 Grafana의 "Alerting" 기능을 사용하세요.

#### promtail <-> loki connection
```bash
curl -X GET http://192.168.0.44:3100/metrics | grep promtail
```


### **Extension**

현재 Loki의 설정 파일을 기반으로 문제를 분석하고 수정해야 할 사항을 몇 가지 제안할 수 있습니다.

---

### **1. Loki 설정 파일 요약**
#### 주요 설정:
- **Server**:
  - HTTP 포트: `3100`.
  - gRPC 포트: `9096`.
  - `grpc_server_max_concurrent_streams`: `1000` (동시 스트림 처리 제한).

- **Storage Config**:
  - `boltdb` 인덱스 저장 위치: `/tmp/loki/index`.
  - `filesystem` 저장 위치: `/tmp/loki/chunks`.

- **Query Range**:
  - 캐시 활성화: `true`.
  - 최대 캐시 크기: `100MB`.

- **Schema Config**:
  - `store`: `boltdb`.
  - `object_store`: `filesystem`.
  - `schema`: `v11`.

- **Ruler**:
  - Alertmanager URL: `http://localhost:9093`.

---

### **2. "Too Many Outstanding Requests" 해결을 위한 수정**
`Too Many Outstanding Requests` 오류는 보통 Loki의 요청 처리 능력을 초과했을 때 발생합니다. 설정 파일을 다음과 같이 수정하여 문제를 완화할 수 있습니다.

---

#### **a. `grpc_server_max_concurrent_streams` 값 조정**
현재 `grpc_server_max_concurrent_streams` 값이 `1000`으로 설정되어 있습니다. 요청이 더 많은 경우 이 값을 늘려 동시 요청 제한을 완화하세요:
```yaml
grpc_server_max_concurrent_streams: 2000
```

---

#### **b. Loki `limits_config` 추가**
현재 설정에는 `limits_config` 섹션이 없습니다. 이를 추가하여 Loki의 수집 및 처리 제한을 명확히 설정하세요.

```yaml
limits_config:
  ingestion_rate_mb: 10        # 초당 10MB 데이터 처리 (기본값 4MB).
  ingestion_burst_size_mb: 20  # 최대 처리량을 20MB로 설정.
  max_streams_per_user: 5000   # 사용자당 최대 스트림 수를 5000으로 설정.
```

---

#### **c. 디스크 경로 최적화**
현재 Loki는 `/tmp` 경로를 사용하고 있습니다. `/tmp`는 메모리에 종속되거나 크기가 제한적일 수 있습니다. 더 안정적인 저장소를 사용하도록 설정을 변경하세요:
```yaml
storage_config:
  boltdb:
    directory: /var/loki/index
  filesystem:
    directory: /var/loki/chunks
```

---

#### **d. Query 캐시 용량 확대**
현재 캐시 크기가 `100MB`로 설정되어 있습니다. 더 많은 요청을 처리하려면 캐시 크기를 늘려보세요:
```yaml
query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 500  # 500MB로 확대.
```

---

#### **e. Promtail 설정 조정**
Promtail에서 데이터를 보내는 빈도와 크기를 조정하여 Loki로 들어오는 요청 수를 제한하세요. Promtail 설정 파일에서 다음 항목을 수정하세요:
```yaml
clients:
  - url: http://<loki-server>:3100/loki/api/v1/push
    batchsize: 102400    # 100KB로 줄임.
    batchwait: 5s        # 전송 주기를 5초로 늘림.
```

---

### **3. Loki 서버 상태 확인**
변경 사항을 적용한 후 Loki 서버가 제대로 작동하는지 확인하세요:

#### Loki 서버 상태 점검:
1. Loki 서버 상태 확인:
   ```bash
   curl -X GET http://localhost:3100/ready
   ```
   - 응답이 `"ready"`이면 서버가 정상 작동 중.

2. Loki 로그 확인:
   ```bash
   journalctl -u loki.service
   ```

---

### **4. 적용 후 검증**
1. **Promtail 재시작**:
   ```bash
   sudo systemctl restart promtail
   ```

2. **Loki 재시작**:
   ```bash
   sudo systemctl restart loki
   ```

3. Grafana에서 Loki 쿼리를 실행하여 로그가 제대로 수집되고 표시되는지 확인:
   ```
   {job="nginx-main-access-log"}
   ```

---

### **요약**
- `grpc_server_max_concurrent_streams` 값을 늘리고, `limits_config`로 Loki의 처리 제한을 조정.
- 디스크 저장 경로를 `/tmp`에서 더 안정적인 경로로 변경.
- 캐시 크기를 늘려 쿼리 성능 향상.
- Promtail의 전송 빈도와 크기를 조정하여 Loki의 부하를 줄임.

위 단계를 적용하면 "Too Many Outstanding Requests" 문제를 해결할 수 있을 것입니다. 추가로 문제가 발생하면 말씀해주세요!