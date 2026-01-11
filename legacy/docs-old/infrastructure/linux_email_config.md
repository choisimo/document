# 리눅스에서 이메일 설정 및 전송 방법

리눅스에서 이메일을 설정하고 전송하는 여러 방법이 있습니다. 특히 시스템 알림, 백업 결과 등을 자동으로 받기 위해 메일 설정이 필요합니다.

## 이메일 전송 도구 설치

### 1. 기본 패키지 설치

```bash
# Debian/Ubuntu 계열
sudo apt-get install mailutils ssmtp

# Fedora/CentOS 계열
sudo dnf install mailx postfix
```

### 2. 추가 이메일 클라이언트 도구 설치

```bash
# mutt 설치 (더 다양한 기능 제공)
sudo apt-get install mutt

# msmtp 설치 (Gmail과 같은 외부 SMTP 서버 연동에 좋음)
sudo apt-get install msmtp msmtp-mta
```

## SMTP 설정 방법

### ssmtp 사용 방법 (단순하고 쉬움)

```bash
# 설정 파일 편집
sudo nano /etc/ssmtp/ssmtp.conf
```

설정 파일에 다음 내용 추가 (Gmail 예시):

```
# SMTP 서버 설정
mailhub=smtp.gmail.com:587
AuthUser=your-gmail@gmail.com
AuthPass=your-app-password
UseTLS=YES
UseSTARTTLS=YES
FromLineOverride=YES
```

> 주의: Gmail은 2023년 이후 일반 비밀번호 인증을 지원하지 않습니다. 반드시 앱 비밀번호를 생성하여 사용하세요.

### msmtp 설정 (더 안정적인 방법)

```bash
# ~/.msmtprc 파일 생성
nano ~/.msmtprc
```

파일 내용:

```
# 기본 설정
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        ~/.msmtp.log

# Gmail 계정
account        gmail
host           smtp.gmail.com
port           587
from           your-email@gmail.com
user           your-email@gmail.com
password       your-app-password

# 기본 계정 지정
account default : gmail
```

```bash
# 파일 권한 설정 (보안!)
chmod 600 ~/.msmtprc
```

## 이메일 전송 방법

### 1. mail 명령어 사용

```bash
# 기본 메일 보내기
echo "이메일 내용" | mail -s "제목" 수신자@example.com

# 파일 내용 보내기
cat 파일명.txt | mail -s "제목" 수신자@example.com

# 첨부 파일 보내기
mail -s "제목" -a 첨부파일.pdf 수신자@example.com  2단계 인증 > 앱 비밀번호 선택
3. '앱 선택' 드롭다운에서 '기타(맞춤 이름)'을 선택하고 이름 입력 (예: "Linux Server")
4. '생성' 버튼을 클릭하여 16자리 앱 비밀번호 생성
5. 이 비밀번호를 SMTP 설정의 AuthPass 또는 password 항목에 사용

## curl을 사용한 이메일 API 활용

외부 이메일 API를 사용하여 이메일을 보낼 수도 있습니다. Mailtrap 예시:

```bash
#!/bin/bash

api_key="your_Mailtrap_api_token"

curl -X POST "https://send.api.mailtrap.io/api/send" \
--header "Authorization: Bearer $api_key" \
--header 'Content-Type: application/json' \
--data-raw '{
  "from": {"email": "youremail@example.com", "name": "서버 알림"},
  "to": [{"email": "recipient@example.com"}],
  "subject": "서버 백업 완료",
  "text": "백업이 성공적으로 완료되었습니다.",
  "category": "백업"
}'
```

## 자동 실행 설정 (cron)

정기적으로 이메일을 보내려면 cron 작업을 설정합니다:

```bash
# crontab 편집
crontab -e

# 매일 자정에 백업 스크립트 실행 및 이메일 전송
00 00 * * * /opt/backup-tool/linuxbackups backups:mysql --backup-file-prefix="daily" --notifications-when-done
```

## 문제 해결

1. **이메일이 전송되지 않거나 스팸함으로 들어갈 경우**:
   - SPF 레코드가 올바르게 설정되어 있는지 확인
   - 대형 메일 제공업체(Gmail, Outlook 등)는 자체 서버에서 보낸 메일을 차단할 수 있음
   - 로그 파일 확인: `/var/log/mail.log`

2. **인증 오류 발생 시**:
   - 앱 비밀번호를 사용하고 있는지 확인
   - 계정 정보가 정확한지 확인
   - TLS/SSL 설정이 올바른지 확인

이메일 설정은 처음에는 복잡할 수 있지만, 한 번 설정해 놓으면 서버 상태 모니터링, 백업 알림 등 다양한 자동화 작업에 활용할 수 있습니다.
