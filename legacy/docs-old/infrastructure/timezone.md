## set timezone 
    sudo timedatectl set-timezone Asia/Seoul
## check timezone
    timedatectl


---


#### **1. NTP(Network Time Protocol) 동기화**
NTP 서비스를 사용하여 서버 간 시간을 동기화합니다.

##### NTP 설치 및 활성화 (Ubuntu 예시):
```bash
sudo apt update
sudo apt install ntp -y
sudo systemctl enable ntp
sudo systemctl start ntp
```

##### 시간 동기화 확인:
```bash
ntpq -p
```

#### **2. Docker 컨테이너 시간 확인 및 동기화**
Docker 컨테이너가 호스트 시스템의 시간을 동기화하고 있는지 확인합니다.

##### Docker 컨테이너 시간 확인:
```bash
docker exec -it <컨테이너_ID> date
```

##### 컨테이너와 호스트 시간 동기화:
Docker 컨테이너를 생성할 때 `--volume` 플래그를 사용하여 호스트의 `/etc/localtime`을 마운트합니다:
```bash
docker run -d --name=loki \
  --volume /etc/localtime:/etc/localtime:ro \
  grafana/loki:latest
```

---

### **3. Promtail과 Loki 시간 동기화 확인**
Promtail과 Loki가 같은 시간대를 사용하는지 확인하세요. 시간대가 다르면 타임스탬프 불일치 문제가 발생할 수 있습니다.

##### Promtail 시간 확인:
```bash
date
```

##### Loki 컨테이너 시간 확인:
```bash
docker exec -it <Loki_컨테이너_ID> date
```

---

### **4. 문제 해결 후 확인**
시간을 동기화한 후 다음을 확인하세요:
1. Promtail 로그에서 `tail`이 제대로 작동하는지.
2. Loki API를 통해 데이터가 수집되고 있는지:
   ```bash
   curl -G -X GET "http://<Loki_IP>:3200/loki/api/v1/query" \
       --data-urlencode 'query={job="spring-boot"}'
   ```
3. Grafana에서 시간 범위를 넓혀 데이터를 조회.

시간 동기화 이후에도 문제가 지속되면 알려주세요! 추가 도움을 드릴게요.