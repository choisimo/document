# Proxmox 이메일 알림 설정 기준

Proxmox VE 알림은 백업 실패, ZFS/SMART 경고, 시스템 메일, HA 이벤트를 운영자에게 전달하는 경로다. 이 문서는 Proxmox의 알림 시스템에서 SMTP target과 Sendmail/Postfix target을 어떻게 선택하고 검증할지 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Proxmox 장애는 조용히 누적될 수 있다. 백업 실패, 디스크 오류, storage full, HA 상태 변화가 UI에만 남으면 운영자는 늦게 발견한다.

이메일 알림을 설정하면 Proxmox 내부 이벤트를 외부 메일함으로 보낼 수 있다. 다만 Proxmox 8 계열의 알림 시스템은 target, matcher, user email, secret config가 분리되어 있으므로 단순 Postfix 설정만으로 전체 알림이 완성되지 않는다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 Gmail 앱 비밀번호와 Postfix relay 설정을 중심으로 한다. 또한 Discord webhook을 `/root/.forward`로 연결하는 우회 방식과 Proxmox 8.1 이상 알림 시스템이 함께 섞여 있다.

보완해야 할 점은 다음과 같다.

- Proxmox notification target과 legacy sendmail/Postfix 경계가 불명확하다.
- SMTP target은 시스템 MTA를 거치지 않는다는 점이 빠져 있다.
- SMTP target secret은 `/etc/pve/priv/notifications.cfg`에 저장된다는 운영 경계가 약하다.
- Gmail의 “보안 수준이 낮은 앱” 같은 오래된 안내가 남아 있다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 Proxmox 이벤트가 의도한 recipient에게 안정적으로 도착하는 것이다.

- Datacenter의 사용자 이메일 주소를 먼저 채운다.
- Datacenter Notifications에서 target과 matcher를 구성한다.
- 직접 SMTP relay를 사용할지, Sendmail/Postfix를 사용할지 선택한다.
- 비밀번호와 token은 root만 읽을 수 있는 Proxmox private config 또는 Postfix secret 파일에 둔다.
- 테스트 알림과 실제 백업 실패 알림 경로를 모두 확인한다.

## 4. 시스템 번역 (Data Flow)

Proxmox 알림 흐름은 다음처럼 나뉜다.

```text
Proxmox event
  -> notification matcher
  -> notification target
  -> SMTP relay or sendmail/Postfix
  -> recipient mailbox
  -> operator action
```

SMTP target은 Proxmox가 SMTP relay에 직접 접속한다. Sendmail target은 시스템의 `sendmail` 인터페이스를 호출하고, 표준 Proxmox 설치에서는 보통 Postfix가 이 역할을 제공한다.

## 5. 핵심 구성요소 (Building Blocks)

Notification event는 백업, 시스템 메일, HA, storage 같은 Proxmox 내부 이벤트다.

Notification matcher는 event metadata를 기준으로 어떤 target에 보낼지 결정한다.

Notification target은 실제 목적지다. Proxmox 공식 문서는 mail 기반 target으로 Sendmail과 SMTP를 설명하고, Gotify 같은 다른 target도 제공한다.

SMTP target은 Proxmox가 외부 SMTP relay에 직접 접속한다. 공식 문서는 SMTP target이 시스템 MTA를 사용하지 않으며, delivery 실패 시 queue/retry 메커니즘이 없다고 설명한다.

Sendmail target은 시스템 `sendmail` binary를 사용한다. 표준 Proxmox 설치에서는 Postfix가 sendmail binary를 제공하며, 외부 relay가 필요하면 Postfix smart host 설정이 필요하다.

## 6. 상태 전이 (State Transition)

이메일 알림 설정은 다음 상태로 진행한다.

```text
recipient 결정
  -> Proxmox user email 설정
  -> target 방식 선택
  -> secret 저장
  -> matcher 연결
  -> test notification
  -> 실제 작업 알림 확인
  -> 로그 기반 운영
```

SMTP target을 쓰면 Proxmox 알림 설정 안에서 완료된다. Sendmail target을 쓰면 Proxmox target 설정과 Postfix relay 설정을 모두 검증해야 한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- SMTP 비밀번호, 앱 비밀번호, API token을 문서나 Git에 쓰지 않는다.
- Proxmox user를 recipient로 쓰려면 해당 user의 email field가 채워져 있어야 한다.
- SMTP relay의 `from-address`는 relay가 허용하는 주소여야 한다.
- SMTP target의 실패는 queue/retry 없이 끝날 수 있음을 감안한다.
- Postfix relay를 쓰면 `/var/log/mail.log` 또는 journal에서 delivery 결과를 확인한다.
- 백업 알림은 성공 알림만 보지 말고 실패 알림 경로를 반드시 테스트한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

먼저 Proxmox UI에서 user email을 설정한다.

```text
Datacenter
  -> Permissions
  -> Users
  -> root@pam 또는 운영자 계정
  -> E-Mail 입력
```

Proxmox 알림 시스템을 쓰는 경우 UI에서 SMTP target을 만든다.

```text
Datacenter
  -> Notifications
  -> Notification Targets
  -> Add
  -> SMTP
```

SMTP target에는 relay host, port, encryption mode, username, password, from-address, recipient를 넣는다. 외부 relay가 STARTTLS를 요구하면 mode를 `starttls`로 둔다.

matcher를 추가해 target에 연결한다.

```text
Datacenter
  -> Notifications
  -> Notification Matchers
  -> Add
  -> target 선택
  -> severity 또는 event type 조건 선택
```

Sendmail target을 쓰고 Postfix를 외부 relay로 보낼 때의 최소 설정은 다음과 같다.

```bash
apt update
apt install -y postfix mailutils libsasl2-modules ca-certificates
```

relay credential 파일을 만든다.

```text
[smtp.example.com]:587 alert@example.com:provider-app-password
```

Postfix map과 권한을 적용한다.

```bash
postmap /etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd /etc/postfix/sasl_passwd.db
```

Postfix relay 설정을 넣는다.

```bash
postconf -e 'relayhost = [smtp.example.com]:587'
postconf -e 'smtp_sasl_auth_enable = yes'
postconf -e 'smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd'
postconf -e 'smtp_sasl_security_options = noanonymous'
postconf -e 'smtp_tls_security_level = encrypt'
postconf -e 'smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt'
systemctl reload postfix
```

테스트 메일을 보낸다.

```bash
printf 'proxmox mail test\n' | mail -s 'proxmox mail test' admin@example.com
journalctl -u postfix -n 100
```

Gmail을 relay로 쓰는 경우 Google 계정 정책을 확인한다. Google 공식 도움말은 앱 비밀번호가 2단계 인증이 켜진 계정에서 사용하는 16자리 코드라고 설명하며, 일부 조직 계정이나 보호 설정에서는 앱 비밀번호 메뉴가 보이지 않을 수 있다.

## 9. 실패 사례 (What could go wrong?)

메일이 오지 않는데 Proxmox UI만 확인하면 원인을 놓친다. SMTP target은 Proxmox task/syslog를 보고, Sendmail target은 Postfix 로그까지 확인한다.

SMTP target을 사용하면서 delivery retry를 기대하면 안 된다. 공식 문서 기준으로 SMTP target은 시스템 MTA queue/retry를 사용하지 않는다. 재시도와 큐가 중요하면 Postfix relay를 둔다.

recipient를 `root@pam`으로 지정했는데 root user email이 비어 있으면 메일이 전송되지 않는다. 사용자 email field를 먼저 확인한다.

Gmail 또는 회사 SMTP가 `from-address`를 거절하면 인증은 성공해도 메일이 거부될 수 있다. relay 계정이 허용하는 발신 주소를 사용한다.

`.forward`로 Discord나 webhook을 우회 연결하면 root 메일 파이프라인 전체가 외부 스크립트에 의존한다. Proxmox notification target이나 Gotify 같은 공식 target을 우선 검토한다.

## 10. 뇌 확장하기 (Evolution & Variants)

중요 알림은 이메일 하나에만 의존하지 않는다. Gotify, Slack/Discord webhook proxy, Grafana Alerting 같은 별도 채널을 병행하면 스팸 필터나 SMTP 장애의 영향을 줄일 수 있다.

백업 job은 notification mode가 legacy sendmail인지 notification system인지 확인한다. mode에 따라 `mailto` 설정과 Notification matcher 중 어느 경로가 사용되는지가 달라질 수 있다.

ZFS나 SMART 같은 로컬 시스템 메일은 Proxmox notification system으로 변환되거나 sendmail target으로 전달될 수 있다. 디스크 장애 알림은 실제 테스트가 어렵기 때문에 주기적인 test notification과 로그 점검을 운영 절차로 둔다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 운영자 user의 email field를 채웠다.
- [ ] SMTP target 또는 Sendmail target 중 하나를 명확히 선택했다.
- [ ] SMTP 비밀번호와 token을 문서나 Git에 남기지 않았다.
- [ ] matcher가 실제 target에 연결되어 있다.
- [ ] Proxmox test notification이 수신함에 도착했다.
- [ ] 백업 job의 notification mode를 확인했다.
- [ ] 실패 시 확인할 Proxmox 로그와 Postfix 로그 위치를 알고 있다.
- [ ] Gmail 또는 외부 relay의 앱 비밀번호/발신 주소 정책을 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Proxmox 이메일 알림은 `event -> matcher -> target -> SMTP 또는 sendmail -> mailbox` 흐름이다. SMTP target은 간단하지만 queue/retry가 없고, Sendmail target은 Postfix 운영까지 포함하므로 선택한 경로에 맞게 로그와 테스트를 검증해야 한다.
