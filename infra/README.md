# infra/

배포에 사용될 수 있는 인프라 설정과 자동화 자산 모음입니다. 파일의 존재만으로 현재 환경에 적용됐다고 판단하지 않으며, 환경별 inventory·배포 이력·runtime 상태를 근거로 확인합니다.

> 변경 계약: 대상 환경, 승인된 diff, secret 주입 경로, backup/rollback과 검증 명령을 작업 기록에 남긴 뒤 실행합니다. `plan`, lint 또는 syntax check 통과는 실제 서비스 정상 동작의 증거와 구분합니다.

> **규칙**: 이 디렉터리에는 실행 가능한 설정/매니페스트만 두세요.  
> 설명 문서(`.md` 가이드)는 `content/docs/infrastructure/`에 두세요.

## 디렉터리 구조

```
infra/
├── ansible/        # Ansible 플레이북, 인벤토리, 롤
├── configs/        # Nginx, HAProxy, 모니터링 서비스 설정 파일
├── docker/         # Docker 이미지, Compose 스택, 템플릿
└── k8s/            # Kubernetes 매니페스트 (예정)
```

## 주요 경로

| 경로 | 설명 |
|------|------|
| `ansible/playbooks/` | 서버 프로비저닝 플레이북 |
| `configs/nginx/` | Nginx 설정 파일 |
| `configs/haproxy/` | HAProxy 설정 파일 |
| `configs/monitoring/` | Loki, Prometheus 설정 |
| `docker/stacks/` | 서비스별 Docker Compose 스택 |
| `docker/images/` | 커스텀 Dockerfile |

## 관련 문서

- 인프라 가이드: `content/docs/infrastructure/`
- Docker 운영 가이드: `content/docs/development/docker/`
