# Ansible 디렉터리 예시

아래 트리는 학습용 구조 예시이며 이 repository의 실제 파일 목록이나 배포 완료 상태를 나타내지 않습니다. 실제 entrypoint, inventory, role과 변수는 실행할 revision에서 확인합니다.

> 운영 전 `ansible-inventory --graph`, `ansible-playbook --syntax-check`, 제한된 canary의 `--check --diff`를 순서대로 사용합니다. check mode가 모든 module의 변경과 외부 side effect를 예측한다고 가정하지 않습니다.

```yaml
my-homelab/                 # 프로젝트 루트
├── ansible.cfg             # Ansible 전체 설정 (SSH 타임아웃 등)
├── inventory/
│   └── hosts.ini           # [1. Inventory] 서버 주소록
├── roles/                  # [3. Roles] 기능별 패키지 (재사용 가능한 단위)
│   ├── common/             #  ㄴ 모든 서버에 공통 적용할 설정 (기본 보안, 유저 생성)
│   │   └── tasks/main.yml
│   └── media_stack/        #  ㄴ 미디어 서버용 설정 (Docker, qBittorrent 등)
│       ├── tasks/main.yml
│       ├── templates/      #  ㄴ 설정 파일 템플릿 (docker-compose.yml 등)
│       └── vars/main.yml
└── site.yml                # [실행 파일] Playbook (Inventory와 Role을 연결)
```
