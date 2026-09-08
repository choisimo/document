# Schedule Manager

스케줄 관리 도구는 "언제, 누가, 무엇을 예약할 수 있는가"를 시스템 규칙으로 고정하는 도구다. 단순 캘린더 공유인지, 외부 고객 예약인지, 회의실 같은 자원 예약인지에 따라 선택지가 달라진다.

## 적용 범위와 선택 근거

이 문서는 예약·자원 관리·캘린더 동기화 제품을 평가하는 학습 가이드다. 보편 순위를 제시하지 않으며 평가 날짜, 공식 repository·release·license, 지원 DB, 인증·backup·upgrade 경로와 제외 이유를 기록한다. UI 편의성은 실제 사용자의 모바일·키보드·접근성 작업으로, 자원 비용은 같은 평가 workload의 CPU·memory·storage·복원 시간으로 비교한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

개인 캘린더만으로 예약을 처리하면 같은 시간대 중복 예약, 담당자별 가능 시간 누락, 취소 통보 실패가 쉽게 생긴다. 특히 외부 사용자가 직접 예약하는 흐름에서는 "가능한 시간"과 "확정된 예약"의 경계가 흐려지면 운영자가 수동으로 조정해야 한다.

스케줄 관리 시스템의 목적은 예약 가능 조건을 코드와 설정으로 고정하고, 변경 이력을 한곳에서 확인하며, 알림과 캘린더 동기화를 반복 가능한 절차로 만드는 것이다.

## 2. 현재 나의 상태 (Baseline)

다음 상태라면 전용 도구가 필요하다.

- 예약 요청이 메신저, 이메일, 전화, 캘린더 초대에 흩어져 있다.
- 같은 시간대에 여러 사람이 같은 자원이나 담당자를 예약할 수 있다.
- 취소, 노쇼, 일정 변경이 운영자 개인 기억에 의존한다.
- 외부 고객에게 공개할 예약 페이지가 필요하다.
- 예약 데이터가 백업되지 않거나, 누가 변경했는지 추적하기 어렵다.

반대로 개인 일정만 관리한다면 CalDAV 서버나 일반 캘린더 앱으로 충분할 수 있다.

## 3. 도달하고 싶은 목표 (Target State)

좋은 스케줄 관리 환경은 다음 상태를 만족해야 한다.

- 예약 가능한 시간대와 예약 불가능한 시간대가 명확하다.
- 담당자, 자원, 서비스별 예약 규칙이 분리되어 있다.
- 예약 생성, 변경, 취소가 한 시스템에서 기록된다.
- 외부 알림은 실패해도 예약 데이터 자체를 망가뜨리지 않는다.
- 데이터베이스, 업로드 파일, 설정 파일이 함께 백업된다.
- 관리자 계정, 메일 발송 계정, 캘린더 연동 토큰이 안전하게 보관된다.

## 4. 시스템 번역 (Data Flow)

예약 시스템의 기본 흐름은 다음과 같다.

```text
사용자
  -> 공개 예약 페이지 또는 관리자 화면
  -> 서비스/자원/담당자 선택
  -> 가능 시간 조회
  -> 예약 요청 제출
  -> transaction 안에서 충돌/용량 검사와 예약 저장을 원자적으로 수행
  -> durable 알림/동기화 작업 기록
  -> commit 후 이메일/웹훅/캘린더 처리와 결과 추적
```

가능 시간 조회는 예약 확정이 아니다. 저장 시점에 constraint·locking 또는 동등한 transaction 전략으로 충돌/용량 확인과 저장을 원자적으로 수행해야 한다. 동시에 들어온 요청 두 개가 모두 사전 검사를 통과해도 허용 용량을 넘겨 확정되지 않음을 시험한다.

## 5. 핵심 구성요소 (Building Blocks)

스케줄 도구를 고를 때는 기능 이름보다 책임 경계를 먼저 본다.

- 예약 페이지: 외부 사용자가 서비스와 시간을 선택하는 화면.
- 관리자 화면: 운영자가 예약, 자원, 담당자, 휴무일을 조정하는 화면.
- 예약 엔진: 영업시간, 버퍼 시간, 최대 인원, 중복 허용 여부를 판단한다.
- 저장소: 예약, 사용자, 서비스, 감사 로그를 보관한다.
- 알림 채널: 이메일, 웹훅, 캘린더 초대, 메신저 알림을 보낸다.
- 인증 계층: 관리자와 일반 사용자의 권한을 분리한다.
- 백업 단위: 데이터베이스와 설정 파일을 함께 복구할 수 있어야 한다.

도구 유형은 보통 다음으로 나뉜다.

- 약속 예약형: Easy!Appointments, Cal.com처럼 외부 예약 페이지가 중심이다.
- 자원 예약형: 회의실, 장비, 좌석처럼 제한된 자원을 예약한다.
- 캘린더 서버형: Radicale, Baikal처럼 CalDAV/CardDAV 동기화를 제공한다.
- 프로젝트 관리형: Plane처럼 일정과 작업 보드를 함께 다룬다.

| 후보 | 같은 기준으로 확인할 항목 |
| --- | --- |
| Easy!Appointments | 담당자·휴무·timezone·중복 예약·외부 캘린더; 공식 배포 reference |
| Booked Scheduler 계열 | 원본과 fork의 유지보수, PHP/DB 호환, plugin 보안 패치와 제3자 image 출처 구분 |
| Cal.com | self-hosted license, 필수 환경 변수, PostgreSQL migration, 메일·OAuth redirect 실제 시험 |
| Plane | 프로젝트/issue 관리와 예약 요구의 차이, 여러 서비스의 backup·upgrade 비용 |
| Radicale 또는 Baikal | 각각 독립된 CalDAV/CardDAV 서버 후보; client 호환·사용자·TLS·저장 권한·복원 |

공식 release note와 보안 공지, MFA/role/audit 요구, CalDAV·Google·Microsoft·SSO·webhook의 실제 성공/실패 흐름을 평가한다. 고정 처리량이나 cache 크기를 제품의 보편 성능으로 제시하지 않는다.

## 6. 상태 전이 (State Transition)

예약은 상태 기계로 관리해야 한다.

```text
available
  -> held
  -> confirmed
  -> rescheduled
  -> cancelled

confirmed
  -> completed
  -> no_show
```

- `available`: 아직 예약되지 않은 시간대다.
- `held`: 결제나 승인 대기처럼 임시로 잡아 둔 상태다.
- `confirmed`: 충돌 검사를 통과해 확정된 예약이다.
- `rescheduled`: 기존 예약이 다른 시간으로 이동했다.
- `cancelled`: 사용자나 관리자가 취소했다.
- `completed`: 예약된 이벤트가 정상 종료됐다.
- `no_show`: 예약자는 있었지만 실제 참석하지 않았다.

`held`에는 만료 시각과 해제 정책이 필요하다. `held -> confirmed`와 일정 변경은 현재 hold·용량·시간 규칙을 같은 transaction에서 확인하고 저장한다. 만료된 hold, 동시 확정과 취소/변경 경쟁을 시험한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 배타적 자원(capacity 1)은 시간대가 겹치는 확정 예약을 허용하지 않는다. 정원형 자원은 hold와 확정 수를 포함한 용량 정책을 transaction으로 보장한다.
- 담당자별 근무 시간, 휴무일, 버퍼 시간은 예약 확정 시점에도 다시 검사해야 한다.
- 취소된 예약은 복구할 수 있더라도 삭제된 것처럼 숨기면 안 된다.
- 알림 발송 실패가 예약 저장 실패로 자동 변환되면 안 된다.
- 관리자 기본 비밀번호·token은 최초 외부 노출 전에 교체하며 가능하면 첫 기동 전에 설정한다.
- 외부 공개 예약 페이지는 HTTPS 뒤에 둔다.
- 데이터베이스만 백업하고 업로드 파일이나 설정 파일을 빠뜨리면 복구 절차가 완성되지 않는다.
- 캘린더 연동 토큰, SMTP 비밀번호, 웹훅 URL은 저장소에 커밋하지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

가상의 image·환경 변수로 실제 배포처럼 보이는 Compose를 만들지 않는다. 선택한 제품의 검토한 공식 release Compose를 별도 평가 디렉터리에 준비하고 다음 기록을 채운다.

```text
Product / upstream repository / evaluated date:
Release, license and reviewed image digest:
Official Compose path and required environment schema:
Database version and migration/rollback procedure:
Persistent DB, uploaded files, configuration and encryption keys:
Loopback/private admin binding, authentication and public booking TLS:
Test workload and measured resource/backup/restore costs:
```

비밀은 저장소 밖에서 주입하고 관리 경로를 loopback 또는 사설망으로 제한한 뒤 설정을 검증한다. 이 명령은 제품별 필수 설정이 완료된 검토용 Compose에만 적용한다.

```bash
: "${SCHEDULER_COMPOSE_FILE:?set path to reviewed product Compose file}"
docker compose -f "$SCHEDULER_COMPOSE_FILE" config --quiet && \
  docker compose -f "$SCHEDULER_COMPOSE_FILE" up -d
docker compose -f "$SCHEDULER_COMPOSE_FILE" ps
```

seed 데이터로 예약 생성·변경·취소·동시 충돌·timezone·알림 실패를 시험한다. DB·첨부·설정 backup을 빈 환경에 복원해 같은 데이터를 확인하고 upgrade/rollback의 복구 시간과 데이터 손실 범위를 측정한다. image 재기동만으로 migration 실패가 복구된다고 가정하지 않는다.

## 9. 실패 사례 (What could go wrong?)

- 제품별 환경 변수 이름을 확인하지 않고 예제 Compose를 복사해 애플리케이션이 데이터베이스에 연결하지 못한다.
- 예약 가능 시간은 프론트엔드에서만 막고, 서버 저장 시점의 충돌 검사를 생략한다.
- 캘린더 동기화가 실패했는데 내부 예약은 확정되어 사용자 일정과 시스템 일정이 어긋난다.
- SMTP 설정 오류로 예약 확인 메일이 발송되지 않는다. 알림·calendar 동기화는 timeout, rate limit, idempotency와 부분 성공을 기록하고 상한이 있는 재시도·실패 queue/운영자 재처리 경로를 둔다.
- 외부 예약 페이지를 공개하면서 관리자 로그인도 같은 경로에 노출한다.
- 데이터베이스 백업은 있지만 첨부 파일, 로고, 설정, 암호화 키가 없어 복구가 불완전하다.
- `latest`를 버전 고정으로 오해해 재배포 때 다른 image가 실행된다. migration 실패 후에는 새 container를 반복 시작하지 않고 로그·backup·schema 상태를 보존해 rollback 여부를 판단한다.

## 10. 뇌 확장하기 (Evolution & Variants)

처음에는 하나의 예약 페이지와 하나의 관리자 계정으로 시작한다. 이후 다음 순서로 확장한다.

- 담당자별 근무 시간과 휴무일 분리.
- 서비스별 소요 시간, 준비 시간, 정리 시간 설정.
- 예약 전 승인 또는 결제 흐름 추가.
- 캘린더 연동과 이메일 알림을 비동기 작업으로 분리.
- 감사 로그와 예약 변경 사유 기록.
- 외부 고객용 도메인과 관리자용 접근 경로 분리.
- 백업 복구 리허설과 버전 업그레이드 절차 문서화.

도구 선택도 단계별로 바꿀 수 있다. 단순 약속 예약은 예약 페이지 중심 도구가 적합하고, 조직 내부 자원 예약은 자원 충돌 관리가 강한 도구가 더 낫다. 캘린더 동기화가 핵심이면 CalDAV 서버를 먼저 검토한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 예약 대상이 사람, 자원, 서비스 중 무엇인지 정의했다.
- [ ] 중복 예약을 막는 서버 측 규칙을 확인했다.
- [ ] 관리자와 일반 사용자의 권한을 분리했다.
- [ ] 기본 계정과 기본 비밀번호를 제거했다.
- [ ] 데이터베이스, 설정 파일, 업로드 파일 백업을 구성했다.
- [ ] SMTP, 웹훅, 캘린더 연동 실패 시 동작을 테스트했다.
- [ ] 공개 URL은 HTTPS 뒤에 배치했다.
- [ ] 업그레이드와 rollback을 실제 평가 환경에서 시험하고 복구 시간·손실 범위를 기록했다.
- [ ] 평가 날짜·release·license·제외 이유와 실제 자원 측정값을 남겼다.
- [ ] 잔여 위험과 운영 담당자, 외부 연동 실패 queue/재처리 절차를 정했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

스케줄 관리의 핵심은 예약 확정 시점에 현재 `____`와 `____`을 확인하고 검사와 저장을 `____`으로 처리해 허용 용량을 지키는 것이다.
