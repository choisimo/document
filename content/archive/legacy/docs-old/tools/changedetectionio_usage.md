# changedetection.io Duration Time과 Discord 웹훅 알림 설정

## 스케줄과 웹훅의 증거 경계

`Start At`·`Run duration`·알림 UI는 설치 버전과 시간대에 따라 확인한다. 서버·컨테이너·작업 시간대, 자정을 넘는 구간, 요일 경계를 실제 실행 기록과 대조한다. Discord 웹훅 URL의 token은 전송 권한 자체이므로 비밀로 저장하고 화면·로그에 노출하지 않으며 유출 시 폐기·재발급한다. 예정 시간대의 시험 변경 한 건, 비활성 시간대의 요청 부재, 실패와 재시도 상태를 확인해야 완료다.

## Duration Time의 목적

changedetection.io의 `Duration Time`은 스케줄러에서 웹페이지 변경 감지를 실행할 시간 범위를 제어하는 설정이다. 요일별 시작 시간(`Start At`)과 실행 지속 시간(`Run duration`)을 함께 사용해 감지 작업이 활성화되는 시간대를 정한다.

### 특정 시간대 감지

업무 시간인 09:00부터 17:00까지만 변경을 확인하는 것처럼, 필요한 시간대에만 감지를 실행할 수 있다. 불필요한 시간대의 검사 요청을 줄여 시스템 자원과 네트워크 사용량을 낮춘다.

### 비용 절감

프록시 제공업체를 사용하는 경우, 필요한 시간대에만 웹페이지 변경 감지를 실행하면 네트워크 요청 수를 줄이고 비용을 절감할 수 있다.

## Duration Time 작동 방식

`Start At` 시간부터 `Run duration`에 설정한 시간만큼 변경 감지가 활성화된다.

예시:

- 시작 시간: `09:00`
- 실행 지속 시간: `8시간`
- 활성 구간: `09:00`부터 `17:00`

요일별로 시작 시간과 실행 지속 시간을 독립적으로 설정할 수 있다. `Optional timezone to run in` 필드에 타임존을 입력하면 해당 지역 시간 기준으로 스케줄이 동작한다.

## 활용 사례

### 업무 시간 모니터링

`Business hours` 같은 바로가기를 사용한 뒤에는 실제로 저장된 요일·시작·지속시간·시간대를 확인한다. 아래 업무 시간 예시와 설치 버전의 기본값이 같다고 가정하지 않는다.

### 특정 요일 모니터링

일요일만 검사하려면 해당 요일의 시작과 지속시간을 설정하고 다음 날 경계를 시험한다. `00:00`부터 `23시간 59분`이라는 예시는 일요일 전체 24시간과 같지 않으므로 의도한 끝 시각·검사 간격에 맞춰 조정한다.

## Discord 웹훅 알림 설정

ChangeDetection.io는 웹사이트 변경 사항을 감지한 뒤 Discord 웹훅으로 알림을 보낼 수 있다.

### Discord 서버에서 웹훅 생성

1. Discord 서버에서 알림을 받을 채널이 있는 서버를 선택한다.
2. 서버 이름을 우클릭하고 **서버 설정**을 선택한다.
3. 왼쪽 메뉴에서 **통합(Integrations)**을 클릭한다.
4. **웹훅(Webhooks)** 항목을 열고 **새 웹훅(New Webhook)** 버튼을 클릭한다.
5. 웹훅 이름과 메시지가 전송될 채널을 지정한다.
6. 필요한 경우 웹훅 프로필 이미지를 변경한다.
7. **웹훅 URL 복사(Copy Webhook URL)** 버튼으로 웹훅 URL을 복사한다.

### ChangeDetection.io에서 웹훅 URL 입력

Discord 웹훅 URL 형식:

```text
https://discord.com/api/webhooks/webhook_id/webhook_token
```

ChangeDetection.io 알림 URL 형식:

```text
discord://webhook_id/webhook_token
```

예시:

```text
https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN
discord://WEBHOOK_ID/WEBHOOK_TOKEN
```

설정 절차:

1. ChangeDetection.io에서 모니터링 대상의 **편집** 또는 전체 설정의 **알림(Notifications)** 탭으로 이동한다.
2. **Notification URL List** 필드에 변환한 Discord 웹훅 URL을 입력한다.
3. **저장(Save)** 버튼을 클릭한다.
4. **Send test notification** 버튼으로 테스트 알림을 전송한다.

## 스크린샷 첨부

ChangeDetection.io는 변경 사항 감지 시 스크린샷을 함께 전송할 수 있다.

1. 알림 설정 페이지에서 **Attach screenshot to notification (where possible)** 옵션을 체크한다.
2. 사용한 감시 방식과 알림 경로에서 실제 스크린샷이 생성·첨부되는지 시험한다. 화면에 개인정보가 포함될 수 있으므로 채널 접근과 보존 정책도 확인한다.
3. 변경 사항이 빈번한 웹사이트에서는 스토리지 사용량을 함께 확인한다.

## 인증과 네트워크 요구사항

- **Discord 계정**: 웹훅 생성과 관리를 위해 필요하다.
- **서버 관리 권한**: Discord 서버에서 웹훅 생성 권한이 필요하다.
- **ChangeDetection.io 접근 권한**: 알림 설정을 변경할 수 있어야 한다.
- **웹훅 URL 보안**: URL의 token 자체가 자격 증명이다. 비밀 저장소에서 관리하고 노출 시 폐기·재발급한다.
- **방화벽 설정**: 기업 네트워크에서는 `discord.com` API에 대한 아웃바운드 연결 허용이 필요할 수 있다.
- **프록시 설정**: 프록시 환경에서는 ChangeDetection.io가 Discord API에 접근하도록 프록시 설정을 조정한다.
- **전송 실패 진단**: 서버 측 알림 전송은 DNS·TLS·프록시·HTTP 상태·rate limit을 확인한다. 브라우저 CORS 헤더를 임의로 완화하는 방식으로 해결하지 않는다.

## 결론

Duration Time은 웹페이지 변경 감지의 시간 범위를 제한해 리소스 사용량을 조절하는 기능이다. Discord 웹훅 알림과 함께 사용하면 변경 사항을 지정된 시간대에 감지하고 팀 채널로 공유할 수 있다.
