# changedetection.io Duration Time과 Discord 웹훅 알림 설정

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

`Business hours` 바로가기를 사용하면 평일 09:00부터 8시간 동안 실행되는 일정이 설정된다. 업무 시간 동안만 중요한 웹사이트 변경을 모니터링할 때 사용한다.

### 특정 요일 모니터링

일요일만 변경을 확인하려면 일요일의 `Start At` 체크박스를 선택하고 시작 시간을 `00:00`, 지속 시간을 `23시간 59분`으로 설정한다.

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
https://discord.com/api/webhooks/123456789012345678/abcdefghijklmnopqrstuvwxyz
discord://123456789012345678/abcdefghijklmnopqrstuvwxyz
```

설정 절차:

1. ChangeDetection.io에서 모니터링 대상의 **편집** 또는 전체 설정의 **알림(Notifications)** 탭으로 이동한다.
2. **Notification URL List** 필드에 변환한 Discord 웹훅 URL을 입력한다.
3. **저장(Save)** 버튼을 클릭한다.
4. **Send test notification** 버튼으로 테스트 알림을 전송한다.

## 스크린샷 첨부

ChangeDetection.io는 변경 사항 감지 시 스크린샷을 함께 전송할 수 있다.

1. 알림 설정 페이지에서 **Attach screenshot to notification (where possible)** 옵션을 체크한다.
2. 웹사이트 변경 사항이 감지되면 스크린샷이 Discord 메시지에 첨부된다.
3. 변경 사항이 빈번한 웹사이트에서는 스토리지 사용량을 함께 확인한다.

## 인증과 네트워크 요구사항

- **Discord 계정**: 웹훅 생성과 관리를 위해 필요하다.
- **서버 관리 권한**: Discord 서버에서 웹훅 생성 권한이 필요하다.
- **ChangeDetection.io 접근 권한**: 알림 설정을 변경할 수 있어야 한다.
- **웹훅 URL 보안**: 웹훅 URL만으로 메시지를 보낼 수 있으므로 외부 노출을 피한다.
- **방화벽 설정**: 기업 네트워크에서는 `discord.com` API에 대한 아웃바운드 연결 허용이 필요할 수 있다.
- **프록시 설정**: 프록시 환경에서는 ChangeDetection.io가 Discord API에 접근하도록 프록시 설정을 조정한다.
- **CORS 이슈**: 일부 환경에서는 헤더 설정 조정이 필요할 수 있다.

## 결론

Duration Time은 웹페이지 변경 감지의 시간 범위를 제한해 리소스 사용량을 조절하는 기능이다. Discord 웹훅 알림과 함께 사용하면 변경 사항을 지정된 시간대에 감지하고 팀 채널로 공유할 수 있다.
