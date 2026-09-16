---
title: systemd 애플리케이션 서비스 런북
description: 실행 사용자·경로·환경·재시작·종료 정책을 나누고 서비스 상태와 실제 준비 상태를 확인합니다.
---

# systemd 애플리케이션 서비스 런북

셸에서 앱을 `&`로 실행하는 것과 서비스 관리자가 재시작·종료를 관리하는 것은 다르다. 보관된 Spring Boot·정적 프런트엔드 unit의 일반 계약을 복구했다. 실제 서버 경로와 계정은 포함하지 않는다.

## unit의 입력 계약

아래는 **교체가 필요한 설명용 예시**다. 실행 파일, 계정, artifact, 데이터 경로를 확인한 뒤 별도 검토본으로 만든다. 이 파일을 그대로 설치하지 않는다.

```ini
[Unit]
Description=Example application
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=<SERVICE_ACCOUNT>
Group=<SERVICE_GROUP>
WorkingDirectory=/srv/example
EnvironmentFile=/etc/example/application.env
ExecStart=<JAVA_BIN> -jar /srv/example/app.jar
Restart=on-failure
RestartSec=5s
TimeoutStopSec=30s
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

`EnvironmentFile`이 필수인지 선택적인지 결정한다. 비밀을 unit 본문·명령 인자에 직접 넣지 않는다. working directory와 실제 파일 권한을 서비스 계정 기준으로 확인한다. `NoNewPrivileges`·`PrivateTmp`가 앱의 필요한 작업을 막는지도 시험한다.

`network-online.target` 이후 시작하도록 정해도 DB나 외부 API가 준비됐다고 보증하지 않는다. 애플리케이션의 연결 실패·재시도 정책과 실제 readiness 검사가 별도로 필요하다.

## 적용과 관찰

기존 unit·설정·artifact를 보존하고 검토한 unit에 대해 `systemd-analyze verify`를 실행한다. unit을 변경한 뒤에는 manager에 다시 읽히는 단계와 실제 서비스 재시작을 구분한다.

```bash
systemctl status '<SERVICE>.service'
journalctl -u '<SERVICE>.service' -n 100 --no-pager
```

대표 HTTP 요청이나 작업 한 건을 확인하고, 정지 시 처리가 종료되는지와 재시작 후 데이터가 보존되는지 시험한다. `active` 상태만으로 요청 처리 성공을 표시하지 않는다.

## 실패와 복구

반복 재시작이면 첫 오류, exit status, 실행 파일 존재, 사용자 권한, 환경 파일 접근, 포트 충돌을 확인한다. 재시작 간격만 늘리거나 root로 실행해 권한 오류를 덮지 않는다.

복구 시 이전 artifact·unit·환경과 데이터 스키마의 호환성을 확인한다. 검토된 사본을 복원하고 unit 재로딩·재시작·실제 요청을 다시 확인한다. 로그에는 자격증명이나 원본 사용자 데이터를 복사하지 않는다.

근거: `content/archive/legacy/docs-old/infrastructure/service_codes.md`, `server_service.md`; 관련 문서 [백그라운드 프로세스](process-management.md), [시간 진단](time-diagnostics.md).
