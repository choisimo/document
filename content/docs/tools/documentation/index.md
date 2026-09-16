---
title: 문서 사이트 유지보수
description: 문서 기여, 로컬 개발, 출판, 개인정보와 AI 연결을 현재 저장소 소스로 확인하는 안내입니다.
---

# 문서 사이트 유지보수

이 안내는 `apps/docs-site/mkdocs.yml`로 빌드하는 Documentation Hub를 대상으로 한다. 설치된 구성 파일과 코드에서 확인한 절차이며, 호스팅 서비스나 외부 AI 서버의 실제 배포 상태를 보증하지 않는다.

| 할 일 | 안내 | 완료 증거 |
| --- | --- | --- |
| 파일과 생성물의 책임 파악 | [출판 아키텍처](architecture.md) | 수정할 정본과 생성 경로를 구분 |
| 문서 추가·복구 | [기여 안내](contributing.md) | 출처, 탐색 경로, 링크 검사 |
| 로컬 빌드·검사 | [개발 환경](local-development.md) | 명령·범위·종료 코드 |
| 출판 실패 진단·복구 | [배포 런북](publishing-runbook.md) | 동일 산출물의 본문·검색·자산 확인 |
| 공개 범위·읽기 기록 확인 | [개인정보와 공개 경계](privacy.md) | 저장 위치와 실제 전송 대상 확인 |
| 문서 도우미 연결·장애 진단 | [AI 운영](ai-operations.md) | 공개 설정과 요청 계약 확인 |

자료가 디스크에 있다는 사실, 탐색 메뉴에 있다는 사실, 사이트에 공개된다는 사실은 서로 다르다. 특히 extra 동기화는 Markdown 출판과 별개다. 보관 자료를 다시 문서화하기 전에 [공개 경계](privacy.md)를 먼저 확인한다.

근거: `README.md`, `content/README.md`, `MIGRATION_MAP.md`, `apps/docs-site/mkdocs.yml`, `src/automation/site/sync-extra-assets.sh`.
