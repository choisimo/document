---
title: 저장소 자동화 스크립트 사용 경계
description: 백업, 배포, 정리, 요약, 스케줄 스크립트의 실제 동작과 미완성 지점을 구분합니다.
---

# 저장소 자동화 스크립트 사용 경계

`src/automation/README.md`의 분류와 권장 패턴은 각 스크립트가 그 패턴을 구현했다는 증거가 아니다. 실행하기 전에 대상 파일을 읽고 입력·출력·권한·변경 범위를 확인한다. 이 페이지는 실행 허가나 배포 완료 보고서가 아니다.

| 파일 또는 묶음 | 실제 확인한 동작 | 사용 전 처리 |
| --- | --- | --- |
| `backup/rsync_nas_fetch.sh` | 복수 셸 예시가 연결돼 있고 로그 변수에 명령 치환 형태의 오류가 있음 | 운영 경로를 옮기지 말고 단일 검토본으로 정리한 후 독립 복원 시험 |
| `deployment/loadbalancing-server-sync.sh` | rsync의 `--delete`, 호스트 키 확인 비활성 옵션 사용 | 목적지 삭제 범위·호스트 신뢰·백업 확인 |
| `deployment/deploy.sh` | Node 앱 실행을 PM2에 등록하는 절차 포함 | 실제 앱 파일·작업 경로·프로세스 소유권 확인 |
| `maintenance/clean-docker.sh` | 전체 컨테이너 중지·삭제, 이미지·볼륨 삭제와 prune | 공유 호스트에서 일반 청소 명령으로 사용하지 않음 |
| `utilities/project-summary.sh` | 프로젝트 구조와 선택한 파일 내용을 결과 파일로 생성 | 출력 파일, 제외 목록, 포함 파일의 비밀·저작권 검토 |
| `utilities/rename.sh`, `moveSubDirectory.sh` | 파일 이름 또는 디렉터리 위치 변경 | 별도 사본에서 충돌·경로·되돌리기 확인 |
| `utilities/remove_citation.sh` | 문서 인용 표기를 변경하는 유틸리티 | 인용을 지우면 근거가 사라질 수 있으므로 문서별 검토 |
| `utilities/schedule.py` | Windows batch 실행을 예약하는 코드 | OS·경로·중복 실행·종료 방식 확인 |
| `utilities/schedule_db.py` | DB 연결의 필수 값과 `port` 표현식이 비어 있음 | 현재 상태는 실행 가능한 DB 스케줄러가 아님 |
| `extractor/` | 특정 파일 형식을 읽고 텍스트 목록을 만드는 스크립트 | 일반 프로젝트 분석기로 간주하지 않고 입력 형식 확인 |

표의 경로는 모두 `src/automation/` 기준이다. 현행 사이트 보조 도구인 `site/`와 스크린샷 wrapper는 [로컬 개발](../documentation/local-development.md), [배포 런북](../documentation/publishing-runbook.md)에서 별도로 다룬다.

## 안전한 검토 순서

1. 파일에서 실제 parser, 기본 경로, 삭제·네트워크·외부 프로그램 실행을 읽는다. 주석의 “dry-run 지원”만 믿지 않는다.
2. 필요한 interpreter와 외부 프로그램의 버전을 확인한다. 셸 구문 검사는 다음 형태로 한다.
3. 공개가 허용된 작은 입력과 임시 출력으로 변환 결과를 확인한다. 실제 인프라 대상은 별도의 변경 절차로 다룬다.
4. 실행 상태, stderr, 생성 파일의 내용과 개수를 확인한다. 백업은 복원 시험, 배포는 실제 요청, 스케줄은 중복·실패 처리가 완료 증거다.

```bash
bash -n src/automation/utilities/project-summary.sh
```

이 명령은 셸 문법만 검사한다. 위험한 삭제, 잘못된 대상, 의미 오류를 실행 전에 모두 찾아 주지는 않는다. 다른 셸용 파일에 Bash 검사를 일괄 적용하지 않는다.

원본 스크립트가 `/extra/scripts/`로 공개될 수 있으므로 계정·주소·자격증명을 스크립트 안에 저장하지 않는다. 기존 소스의 공개 적합성은 [개인정보 경계](../documentation/privacy.md)에 따라 따로 검토한다.

근거: `src/automation/README.md`와 위 파일의 실행문·기본값. 원격 접속 정보와 개인 경로는 이 문서에서 제외했다.
