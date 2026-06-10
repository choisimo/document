# infra/

실제 배포 및 운영에 사용되는 인프라 설정과 자동화 자산 모음입니다.

> **규칙**: 이 디렉터리에는 실행 가능한 설정/매니페스트만 둔다.
> 설명 문서(`.md` 가이드)는 `content/docs/infrastructure/`에 둔다.

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
