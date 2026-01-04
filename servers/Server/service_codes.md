### **1. Spring Boot 프로젝트 서비스**

#### **서비스 파일 생성**
서비스 파일 경로: `/etc/systemd/system/backend.service`

```bash
sudo nano /etc/systemd/system/backend.service
```

#### **서비스 파일 내용**
```ini
[Unit]
Description=Spring Boot Backend Service
After=network.target

[Service]
User=nodove
WorkingDirectory=/server/backend
ExecStart=/usr/bin/java -jar /server/backend/career_note_web-0.0.1-SNAPSHO
T.jar
Restart=always
RestartSec=5

StandardOutput=append:/server/log/backend.log
StandardError=append:/server/log/backend.log

[Install]
WantedBy=multi-user.target
```

---

### **2. React 프로젝트 서비스**

#### **서비스 파일 생성**
서비스 파일 경로: `/etc/systemd/system/frontend.service`

```bash
sudo nano /etc/systemd/system/frontend.service
```

#### **서비스 파일 내용**
```ini
[Unit]
Description=React Frontend Service
After=network.target

[Service]
User=nodove
WorkingDirectory=/server/frontend/build
ExecStart=/usr/node-v21.6.1/bin/serve -s /server/frontend/build -l 3000
Restart=always
RestartSec=5

# 로그 설정 (필요하면 주석 제거)
StandardOutput=append:/server/log/front.log
StandardError=append:/server/log/front.log

[Install]
WantedBy=multi-user.target
```

---

### **3. 서비스 설정 적용 및 실행**

1. **서비스 파일 권한 설정**:
   ```bash
   sudo chmod 644 /etc/systemd/system/backend.service
   sudo chmod 644 /etc/systemd/system/frontend.service
   ```

2. **데몬 재로드**:
   ```bash
   sudo systemctl daemon-reload
   ```

3. **서비스 활성화** (부팅 시 자동 시작):
   ```bash
   sudo systemctl enable backend.service
   sudo systemctl enable frontend.service
   ```

4. **서비스 시작**:
   ```bash
   sudo systemctl start backend.service
   sudo systemctl start frontend.service
   ```

5. **서비스 상태 확인**:
   ```bash
   sudo systemctl status backend.service
   sudo systemctl status frontend.service
   ```

---

### **4. 서비스 로그 확인**
서비스 로그는 지정된 파일에 저장됩니다:
- Spring Boot 로그: `/server/log/backend.log`
- React 로그: `/server/log/front.log`

실시간으로 확인하려면:
```bash
tail -f /server/log/backend.log
tail -f /server/log/front.log
```
