# Proxmox 이메일 알림 설정 가이드

Proxmox VE에서는 백업 완료/실패, 디스크 상태, 시스템 이벤트 등에 대한 알림을 이메일로 받을 수 있어 시스템 관리에 매우 유용합니다. 이 가이드에서는 Proxmox에서 이메일 알림을 설정하는 방법을 단계별로 자세히 살펴보겠습니다.

## 개요 및 중요성

Proxmox의 이메일 알림 기능은 백업 상태, 디스크 상태, 시스템 이벤트 등을 실시간으로 모니터링할 수 있게 해주는 중요한 기능입니다. 이 기능을 활성화하면 시스템 문제를 즉시 파악하고 대응할 수 있어 Proxmox를 사용하는 경우 필수적으로 설정하는 것이 좋습니다.

## Gmail을 이용한 이메일 알림 설정

가장 일반적으로 사용되는 Gmail을 기준으로 설정 방법을 설명하겠습니다. 다른 이메일 서비스도 유사한 방법으로 설정 가능합니다.

### 1. Gmail 앱 비밀번호 생성

Gmail에서 2단계 인증을 사용 중인 경우, 앱 비밀번호를 생성해야 합니다.

1. Google 계정 관리로 이동합니다
2. 보안 → 2단계 인증 메뉴로 이동합니다
3. 2단계 인증이 사용 설정되어 있지 않다면 사용 설정으로 변경합니다
4. 페이지 하단의 "앱 비밀번호" 설정으로 이동합니다
   - 앱 비밀번호가 보이지 않는 경우 다음 URL로 직접 이동할 수 있습니다: https://accounts.google.com/v3/signin/challenge/pwd?continue=https://myaccount.google.com/apppasswords&service=accountsettings
5. 앱 이름을 입력하고(예: "Proxmox") "만들기"를 클릭합니다
6. 생성된 앱 비밀번호를 기록해둡니다(예: "htlumtimtpuoxhil")

### 2. Postfix 설치 및 설정

이메일 발송에는 Postfix를 사용합니다. SSH나 Proxmox 웹 콘솔을 통해 쉘에 접속한 후 다음 단계를 진행합니다.

#### 2.1 필요한 패키지 설치

```bash
apt-get update
apt-get install postfix mailutils libsasl2-modules -y
```

일부 시스템에서는 `libsasl2-modules` 패키지를 찾을 수 없다는 오류가 발생할 수 있습니다. 이 경우 다음 명령어를 시도해보세요:

```bash
apt install postfix mailutils libsasl2-2 ca-certificates libsasl2-modules
```

#### 2.2 발신 이메일 정보 등록

```bash
vim /etc/postfix/sasl_passwd
```
또는 nano를 사용하는 경우:
```bash
nano /etc/postfix/sasl_passwd
```

파일에 다음 내용을 입력합니다:

```
smtp.gmail.com [이메일주소]@gmail.com:[앱비밀번호]
```

예: `smtp.gmail.com example@gmail.com:htlumtimtpuoxhil`

파일을 저장한 후 다음 명령어를 실행하여 계정 정보를 해시 처리하고 권한을 변경합니다:

```bash
postmap hash:/etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd
```

#### 2.3 Postfix 설정 변경

이제 Postfix 설정 파일을 수정합니다:

```bash
vim /etc/postfix/main.cf
```
또는:
```bash
nano /etc/postfix/main.cf
```

기존의 `relayhost=` 라인을 찾아 주석 처리(앞에 #을 추가)한 후, 파일 하단에 다음 내용을 추가합니다:

```
inet_protocols = all
relayhost = smtp.gmail.com:587
smtp_use_tls = yes
smtp_sasl_auth_enable = yes
smtp_sasl_security_options =
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_tls_CAfile = /etc/ssl/certs/Entrust_Root_Certification_Authority.pem
smtp_tls_session_cache_database = btree:/var/lib/postfix/smtp_tls_session_cache
smtp_tls_session_cache_timeout = 3600s
```

일부 시스템에서는 Entrust_Root_Certification_Authority.pem 파일이 없을 수 있습니다. 이 경우 다음과 같이 대체할 수 있습니다:

```
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
```

변경사항을 저장한 후 Postfix를 재시작합니다:

```bash
systemctl reload postfix
```
또는:
```bash
postfix reload
```

### 3. 이메일 발송 테스트

설정이 제대로 되었는지 테스트하기 위해 다음 명령어를 실행합니다:

```bash
echo "테스트 이메일" | mail -s "테스트 메일 제목" 수신자이메일주소@example.com
```

이메일이 정상적으로 전송되지 않는 경우, 로그 파일을 확인하여 문제를 해결할 수 있습니다:

```bash
cat /var/log/mail.log
```

### 4. 보낸 사람 이름 변경 (선택사항)

기본적으로 이메일은 'root'라는 이름으로 전송됩니다. 보낸 사람 이름을 변경하려면 다음 단계를 따릅니다:

```bash
nano /etc/postfix/header_check
```

파일에 다음 내용을 입력합니다:

```
/From:.*/ REPLACE From: [보낸사람 이름] 
```

예: `/From:.*/ REPLACE From: Proxmox Alert `

저장한 후 `/etc/postfix/main.cf` 파일에 다음 라인을 추가합니다:

```
smtp_header_checks = regexp:/etc/postfix/header_check
```

변경사항을 적용하기 위해 Postfix를 재시작합니다:

```bash
postfix reload
```

## Proxmox 웹 UI에서 이메일 설정

Proxmox 웹 UI를 통해서도 일부 이메일 설정을 할 수 있습니다:

1. Proxmox 웹 UI에 로그인합니다
2. 데이터센터 > 옵션으로 이동합니다
3. 'Email from address' 필드를 더블클릭합니다
4. Proxmox가 발신할 이메일 주소를 입력하고 OK를 클릭합니다
5. 사용자별 이메일 주소 설정: 데이터센터 > 권한 > 사용자로 이동한 후 사용자를 더블클릭하여 이메일 필드를 채웁니다

## 디스코드를 통한 알림 설정 (대안)

이메일 대신 디스코드로 알림을 받고 싶다면, 다음과 같이 설정할 수 있습니다:

1. 디스코드에서 알림을 받을 채널에 웹훅을 생성하고 URL을 복사합니다
2. Proxmox 서버에 필요한 패키지를 설치합니다:
   ```bash
   apt-get update && apt-get install jq -y
   ```
3. 디스코드 연동 스크립트를 생성합니다:
   ```bash
   vi /usr/bin/discord.sh
   ```
4. 스크립트에 다음 내용을 입력합니다:
   ```bash
   #!/bin/sh
   WEBHOOK_URL="웹훅URL"
   SERVERNAME="Proxmox"
   BODY="$(cat)"
   JSON=$(jq -n --arg body_oneline "$BODY" '{ "content": null, "embeds": [ { "title": "Proxmox", "description": $body_oneline } ] }')
   curl -d "$JSON" -H "Content-Type: application/json" "$WEBHOOK_URL"
   ```
5. 스크립트에 실행 권한을 부여합니다:
   ```bash
   chmod +x /usr/bin/discord.sh
   ```
6. `/root/.forward` 파일을 수정하여 디스코드로 포워딩합니다:
   ```bash
   vi /root/.forward
   ```
   파일에 다음 내용을 추가합니다:
   ```
   |/usr/bin/discord.sh
   ```
7. 테스트를 수행합니다:
   ```bash
   echo "디스코드 알람 테스트" | mail -s "디스코드 알람" example@gmail.com
   ```

## Proxmox 8.1 이상에서의 알림 시스템

Proxmox VE 8.1부터는 새로운 알림 시스템이 도입되었습니다:

1. 알림 타겟은 Sendmail, SMTP, Gotify 등 여러 유형이 있습니다
2. 데이터센터 > 알림 메뉴에서 설정할 수 있습니다
3. 백업 작업에는 알림 모드가 있어, 새 알림 시스템과 레거시 모드 중 선택할 수 있습니다
4. 설정은 `/etc/pve/notifications.cfg` 및 `/etc/pve/priv/notifications.cfg`에 저장됩니다

## 문제 해결 팁

1. 이메일이 전송되지 않는 경우 `/var/log/mail.log`를 확인하여 오류를 분석합니다
2. 앱 비밀번호가 올바르게 입력되었는지 확인합니다
3. Gmail 보안 설정에서 '보안 수준이 낮은 앱'에 대한 액세스가 허용되어 있는지 확인합니다(일부 계정에서 필요할 수 있음)
4. Postfix 설정 파일에서 오타나 잘못된 경로가 없는지 확인합니다
5. 필요한 패키지가 모두 설치되어 있는지 확인합니다
