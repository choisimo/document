# Documentation

프로젝트 문서 인덱스입니다.

## Index Scope

This page is a navigation index, not an assertion that every linked guide matches the deployed environment. Verify link existence, repository revision, Docker and service versions, secret and exposure assumptions, and each guide's failure and rollback criteria before use.

---

## Guides

- [DOCKER_NETWORK.md](DOCKER_NETWORK.md) - Docker network의 선택 option과 환경별 설정 가이드

## Services

- [../stacks/automation/langflow/README.md](../stacks/automation/langflow/README.md) - Langflow + PostgreSQL + optional Cloudflare Tunnel stack
- [n8n.md](services/n8n.md) - n8n 워크플로우 자동화 스택 가이드
- [supabase.md](services/supabase.md) - Supabase (PostgreSQL + pgvector) 벡터 DB 가이드

## Development Environments

개발 환경 이미지 사용법은 각 이미지 디렉토리의 README를 참조하세요:

- `images/dev-environments/node/` - Node.js 개발 환경
- `images/dev-environments/python/` - Python 개발 환경
- `images/dev-environments/go/` - Go 개발 환경
- `images/dev-environments/rust/` - Rust 개발 환경
- `images/dev-environments/java/` - Java 개발 환경
- `images/dev-environments/flutter/` - Flutter 개발 환경
