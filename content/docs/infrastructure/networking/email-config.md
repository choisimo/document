# 리눅스 서버 이메일 발송 설정

서버 이메일은 사람이 작성하는 메일이 아니라 백업, 배치, 모니터링, 보안 작업의 결과를 운영자에게 전달하는 알림 경로다. 이 문서는 리눅스 서버에서 외부 SMTP 릴레이를 사용해 알림 메일을 보내는 최소 구성을 기준으로 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

서버 작업은 실패해도 화면에 남지 않는 경우가 많다. `cron`, 백업 스크립트, SMART 디스크 검사, 서비스 헬스체크가 조용히 실패하면 운영자는 장애를 늦게 발견한다.

이메일 발송 경로를 만들어 두면 서버 안의 자동화 작업이 실패, 성공, 경고 상태를 외부 사서함으로 남길 수 있다. 단, 메일 발송은 인증 정보, TLS, 발신 주소, 스팸 정책이 얽혀 있어 “명령 한 줄”보다 운영 규칙이 중요하다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 `mailutils`, `ssmtp`, `msmtp`, Postfix, 외부 HTTP 메일 API를 한 흐름으로 설명한다. 예제에는 SMTP 비밀번호를 설정 파일에 직접 쓰는 형태도 있다.

이 상태의 문제는 다음과 같다.

- 발송 전용 클라이언트와 로컬 MTA의 역할이 분리되어 있지 않다.
- 앱 비밀번호나 SMTP 토큰이 평문 예제로 고정되기 쉽다.
- 테스트 성공 기준이 `mail` 명령 실행 여부에 머물고 실제 릴레이 수락, 수신함 도착, 로그 확인까지 이어지지 않는다.
- Gmail, Outlook, 회사 SMTP 같은 릴레이마다 인증 정책이 다르지만 문서가 하나의 정답처럼 보인다.

## 3. 도달하고 싶은 목표 (Target State)

기본 목표는 “서버에서 외부 SMTP 릴레이로 알림 메일을 안정적으로 보낸다”이다.

- 단일 사용자 또는 단일 스크립트 발송은 `msmtp`를 기본 선택으로 둔다.
- 시스템 데몬의 로컬 메일, 큐, 재시도, `root` 메일 전달이 필요하면 Postfix를 사용한다.
- Gmail 같은 계정 기반 릴레이는 일반 계정 비밀번호가 아니라 해당 제공자가 허용하는 앱 비밀번호, SMTP 토큰, OAuth 정책을 확인한다.
- SMTP 인증 정보는 문서, Git, 셸 히스토리에 남기지 않는다.
- 테스트는 명령 실행, SMTP 로그, 수신함 도착까지 확인한다.

## 4. 시스템 번역 (Data Flow)

서버 이메일 발송 흐름은 다음처럼 번역할 수 있다.

```text
작업 스크립트
  -> mail/sendmail 인터페이스
  -> msmtp 또는 Postfix
  -> 외부 SMTP 릴레이
  -> 수신자 메일함
  -> 운영자 확인
```

중요한 경계는 `mail/sendmail 인터페이스`와 `SMTP 릴레이`다. 애플리케이션은 메일을 “발송 요청”할 뿐이고, 실제 수락 여부는 SMTP 릴레이와 수신 서버 정책이 결정한다.

## 5. 핵심 구성요소 (Building Blocks)

`mailutils` 또는 `bsd-mailx`는 스크립트에서 `mail -s` 형태로 메시지를 만들기 위한 명령줄 인터페이스다.

`msmtp`는 외부 SMTP 서버로 바로 릴레이하는 경량 클라이언트다. 서버 한 대에서 특정 계정으로 알림만 보낼 때 적합하다. `msmtp-mta`를 설치하면 `/usr/sbin/sendmail` 호환 인터페이스를 제공할 수 있다.

Postfix는 로컬 MTA다. 로컬 큐, 재시도, 시스템 메일 전달, 여러 데몬의 `sendmail` 호출을 안정적으로 받는 데 적합하다. 대신 설정 면적이 넓고 릴레이 정책을 잘못 잡으면 메일 발송 장애나 보안 문제가 생긴다.

SMTP 릴레이는 Gmail, Outlook, 회사 메일 서버, Mailgun, SendGrid 같은 외부 발송 지점이다. 릴레이마다 포트, TLS, 인증 방식, 발신 주소 검증 정책이 다르다.

## 6. 상태 전이 (State Transition)

메일 발송 경로는 다음 상태로 움직인다.

```text
미설정
  -> 패키지 설치
  -> SMTP 계정 준비
  -> 클라이언트 설정 작성
  -> 권한 잠금
  -> 수동 테스트
  -> 자동화 작업 연결
  -> 로그 기반 운영
```

장애가 발생하면 `자동화 작업 연결` 상태에서 바로 설정을 바꾸지 말고 `수동 테스트`로 되돌아간다. 수동 테스트가 실패하면 인증, TLS, 릴레이 주소, 발신 주소를 순서대로 좁힌다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 실제 SMTP 비밀번호, 앱 비밀번호, API 토큰은 문서와 Git에 쓰지 않는다.
- 사용자별 설정 파일은 소유자만 읽을 수 있어야 한다.
- STARTTLS 또는 TLS 없이 인터넷 SMTP 릴레이로 인증하지 않는다.
- `from` 주소는 릴레이 계정이 허용하는 주소로 맞춘다.
- 테스트 메일은 수신함 도착과 로그를 함께 확인한다.
- 대량 발송, 외부 사용자 발송, 뉴스레터 발송은 서버 알림 경로와 분리한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Debian/Ubuntu 계열에서 발송 전용 `msmtp` 구성을 만드는 최소 예시는 다음과 같다.

```bash
sudo apt-get update
sudo apt-get install -y msmtp msmtp-mta mailutils ca-certificates
mkdir -p ~/.config/msmtp
chmod 700 ~/.config/msmtp
```

SMTP 앱 비밀번호나 토큰은 별도 파일에 저장한다.

```bash
printf '%s' 'replace-with-provider-token' > ~/.config/msmtp/smtp-token
chmod 600 ~/.config/msmtp/smtp-token
```

`~/.msmtprc`를 작성한다.

```text
defaults
auth on
tls on
tls_starttls on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile ~/.msmtp.log

account alert
host smtp.example.com
port 587
from server-alert@example.com
user server-alert@example.com
passwordeval cat /home/admin/.config/msmtp/smtp-token

account default : alert
```

권한을 잠근다.

```bash
chmod 600 ~/.msmtprc
```

수동 테스트를 보낸다.

```bash
printf 'server mail test\n' | mail -s 'server alert test' admin@example.com
tail -n 50 ~/.msmtp.log
```

Gmail을 릴레이로 쓰는 경우 Google 계정의 2단계 인증과 앱 비밀번호 사용 가능 여부를 먼저 확인한다. Google 공식 도움말은 앱 비밀번호가 16자리 코드이며 2단계 인증이 켜져 있어야 만들 수 있다고 설명한다.

## 9. 실패 사례 (What could go wrong?)

인증 실패가 발생하면 계정 비밀번호를 그대로 넣었거나, 앱 비밀번호가 폐기되었거나, 조직 계정 정책상 앱 비밀번호가 막힌 경우가 많다.

TLS 오류가 발생하면 `ca-certificates` 패키지, `tls_trust_file` 경로, 사내 프록시나 방화벽의 TLS 가로채기를 확인한다.

메일이 수신되지 않으면 SMTP 릴레이 로그에서는 수락됐지만 수신 측 스팸함에 들어갔을 수 있다. 반대로 릴레이가 거절했다면 `from` 주소, SPF/DKIM/DMARC 정책, 발송량 제한을 확인한다.

`cron`에서는 수동 테스트와 달리 홈 디렉터리, 환경 변수, PATH가 다를 수 있다. 자동화 작업에서는 필요한 경로를 절대 경로로 쓰고, 실패 출력을 별도 로그로 남긴다.

## 10. 뇌 확장하기 (Evolution & Variants)

로컬 시스템 메일이 많아지면 `msmtp` 단독 구성보다 Postfix를 로컬 릴레이로 두는 편이 낫다. 이 경우 애플리케이션은 로컬 `sendmail`로 넘기고, Postfix가 외부 SMTP 릴레이로 전달한다.

Proxmox 같은 플랫폼은 자체 알림 대상과 매처를 제공한다. 플랫폼 알림은 일반 리눅스 메일 설정과 분리해서 플랫폼 문서 기준으로 구성한다.

장애 알림의 신뢰도가 중요하면 이메일 하나만 믿지 말고 Grafana Alerting, Gotify, Slack, Discord, SMS 같은 다른 경로를 병행한다. 이메일은 지연되거나 스팸 필터에 걸릴 수 있다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] SMTP 릴레이의 포트, TLS, 인증 정책을 확인했다.
- [ ] 비밀번호나 토큰을 Git에 넣지 않았다.
- [ ] 설정 파일 권한을 `600`으로 잠갔다.
- [ ] 수동 테스트 메일이 수신함에 도착했다.
- [ ] 발송 로그에서 인증과 릴레이 수락 상태를 확인했다.
- [ ] 자동화 작업에서 절대 경로와 로그 경로를 사용했다.
- [ ] 실패 시 확인할 로그 파일과 복구 순서를 문서화했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

리눅스 서버 메일은 “메일 작성” 기능이 아니라 `작업 -> sendmail/mail -> SMTP 클라이언트 또는 MTA -> 외부 릴레이 -> 운영자`로 이어지는 알림 파이프라인이다. 비밀번호를 숨기고, TLS를 켜고, 수동 테스트와 로그 확인까지 끝나야 설정이 완료된 것이다.
