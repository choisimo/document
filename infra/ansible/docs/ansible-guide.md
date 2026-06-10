# Ansible 운영 가이드

> Ansible을 활용한 인프라 자동화 구성 및 운영 가이드

---

## 목차

1. [uv 설치 방법](#1-uv-설치-방법)
2. [Ansible 설치 방법](#2-ansible-설치-방법)
3. [Ansible 디렉토리 구조](#3-ansible-디렉토리-구조)
4. [Ansible Playbook 설치 및 실행](#4-ansible-playbook-설치-및-실행)
5. [Playbook, Play, Task, Module 구조](#5-playbook-play-task-module-구조)
6. [Ansible 작동 원리](#6-ansible-작동-원리)

---

## 1. uv 설치 방법

### uv란?

**uv**는 Rust로 작성된 초고속 Python 패키지 및 프로젝트 관리자입니다. pip, pip-tools, virtualenv를 대체할 수 있으며, 기존 도구 대비 **10-100배 빠른 속도**를 자랑합니다.

### 설치 방법

#### Linux/macOS (권장)

```bash
# curl을 사용한 설치 (권장)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 또는 wget 사용
wget -qO- https://astral.sh/uv/install.sh | sh
```

#### 패키지 관리자를 통한 설치

```bash
# Homebrew (macOS/Linux)
brew install uv

# Arch Linux (AUR)
yay -S uv

# Alpine Linux
apk add uv

# Scoop (Windows)
scoop install uv
```

#### pip를 통한 설치 (권장하지 않음)
```bash
pip install uv
```

### 설치 확인

```bash
uv --version
```

### uv 기본 사용법

```bash
# 가상환경 생성
uv venv

# 가상환경 활성화
source .venv/bin/activate

# 패키지 설치
uv pip install <package-name>

# requirements.txt로부터 설치
uv pip install -r requirements.txt

# 패키지 동기화 (lock 파일 기반)
uv pip sync requirements.txt
```

---

## 2. Ansible 설치 방법

### 사전 요구사항

- **Python 3.9 이상**
- **SSH 접근 권한** (원격 서버 관리 시)
- **sudo 권한** (시스템 패키지 설치 시)

### 방법 1: uv를 사용한 설치 (권장)

```bash
# 프로젝트 디렉토리 생성 및 이동
mkdir ~/ansible-project && cd ~/ansible-project

# 가상환경 생성
uv venv

# 가상환경 활성화
source .venv/bin/activate

# Ansible 설치
uv pip install ansible

# Ansible 버전 확인
ansible --version
```

### 방법 2: pip를 사용한 설치

```bash
# 가상환경 생성 (선택사항이지만 권장)
python3 -m venv .venv
source .venv/bin/activate

# Ansible 설치
pip install ansible

# 또는 특정 버전 설치
pip install ansible==8.0.0
```

### 방법 3: 시스템 패키지 관리자 사용

#### Rocky Linux / RHEL / CentOS

```bash
# EPEL 저장소 활성화
sudo dnf install epel-release -y

# Ansible 설치
sudo dnf install ansible -y
```

#### Ubuntu / Debian

```bash
# PPA 추가
sudo apt-add-repository ppa:ansible/ansible

# 패키지 목록 갱신 및 설치
sudo apt update
sudo apt install ansible -y
```

### 설치 확인

```bash
# 버전 확인
ansible --version

# 설정 확인
ansible-config dump --only-changed
```

---

## 3. Ansible 디렉토리 구조

### 표준 프로젝트 구조

```
ansible-project/
├── ansible.cfg              # Ansible 전역 설정 파일
├── inventory/               # 인벤토리 디렉토리
│   ├── production/          # 프로덕션 환경
│   │   ├── hosts.ini        # 호스트 정의
│   │   ├── group_vars/      # 그룹 변수
│   │   │   ├── all.yml      # 모든 호스트에 적용
│   │   │   ├── webservers.yml
│   │   │   └── dbservers.yml
│   │   └── host_vars/       # 호스트별 변수
│   │       └── server1.yml
│   └── staging/             # 스테이징 환경
│       └── hosts.ini
│
├── playbooks/               # 플레이북 디렉토리
│   ├── site.yml             # 마스터 플레이북
│   ├── webservers.yml       # 웹서버 플레이북
│   ├── dbservers.yml        # DB서버 플레이북
│   └── deploy.yml           # 배포 플레이북
│
├── roles/                   # 역할(Role) 디렉토리
│   ├── common/              # 공통 역할
│   │   ├── tasks/
│   │   │   └── main.yml
│   │   ├── handlers/
│   │   │   └── main.yml
│   │   ├── templates/
│   │   ├── files/
│   │   ├── vars/
│   │   │   └── main.yml
│   │   ├── defaults/
│   │   │   └── main.yml
│   │   └── meta/
│   │       └── main.yml
│   ├── nginx/
│   ├── docker/
│   └── database/
│
├── group_vars/              # 전역 그룹 변수
│   └── all.yml
├── host_vars/               # 전역 호스트 변수
├── library/                 # 커스텀 모듈
├── filter_plugins/          # 커스텀 필터 플러그인
└── files/                   # 정적 파일
```

### 각 디렉토리 역할

| 디렉토리/파일 | 설명 |
|--------------|------|
| `ansible.cfg` | Ansible 동작 설정 (SSH 설정, 인벤토리 경로 등) |
| `inventory/` | 관리 대상 서버 목록 및 그룹 정의 |
| `playbooks/` | 실행할 작업을 정의한 YAML 파일들 |
| `roles/` | 재사용 가능한 작업 묶음 (코드 모듈화) |
| `group_vars/` | 호스트 그룹별 변수 |
| `host_vars/` | 개별 호스트별 변수 |
| `templates/` | Jinja2 템플릿 파일 (.j2) |
| `files/` | 정적 파일 (그대로 복사될 파일들) |
| `handlers/` | 알림에 의해 트리거되는 작업 |

### Role 내부 구조 상세

```
roles/nginx/
├── tasks/
│   └── main.yml           # 메인 태스크 (필수)
├── handlers/
│   └── main.yml           # 핸들러 정의
├── templates/
│   └── nginx.conf.j2      # Jinja2 템플릿
├── files/
│   └── ssl.crt            # 정적 파일
├── vars/
│   └── main.yml           # 역할 내부 변수 (높은 우선순위)
├── defaults/
│   └── main.yml           # 기본값 변수 (낮은 우선순위)
└── meta/
    └── main.yml           # 역할 메타데이터 (의존성 등)
```

---

## 4. Ansible Playbook 설치 및 실행

### Playbook 작성

```yaml
# playbooks/site.yml
---
- name: Configure all servers
  hosts: all
  become: yes
  
  roles:
    - common

- name: Configure web servers
  hosts: webservers
  become: yes
  
  roles:
    - nginx
    - docker
```

### Playbook 실행 방법

#### 기본 실행

```bash
# 전체 플레이북 실행
ansible-playbook playbooks/site.yml

# 특정 인벤토리 지정
ansible-playbook -i inventory/production/hosts.ini playbooks/site.yml
```

#### 실행 옵션

```bash
# 드라이런 (실제 실행하지 않고 변경사항 확인)
ansible-playbook playbooks/site.yml --check

# 변경 사항 비교 (diff 출력)
ansible-playbook playbooks/site.yml --check --diff

# 상세 출력
ansible-playbook playbooks/site.yml -v    # 기본
ansible-playbook playbooks/site.yml -vv   # 상세
ansible-playbook playbooks/site.yml -vvv  # 디버그

# 특정 태그만 실행
ansible-playbook playbooks/site.yml --tags "nginx,docker"

# 특정 태그 제외
ansible-playbook playbooks/site.yml --skip-tags "debug"

# 특정 호스트만 대상
ansible-playbook playbooks/site.yml --limit webserver1

# 병렬 실행 수 조절 (기본값: 5)
ansible-playbook playbooks/site.yml --forks 10
```

#### 변수 전달

```bash
# 명령줄에서 변수 전달
ansible-playbook playbooks/site.yml -e "app_version=1.2.3"

# 변수 파일 지정
ansible-playbook playbooks/site.yml -e "@vars/production.yml"

# 여러 변수 전달
ansible-playbook playbooks/site.yml \
  -e "app_version=1.2.3" \
  -e "deploy_env=production"
```

---

## 5. Playbook, Play, Task, Module 구조

### 계층 구조 개요

```
Playbook
└── Play (1개 이상)
    ├── hosts: 대상 호스트
    ├── vars: 변수
    ├── pre_tasks: 사전 태스크
    ├── roles: 역할
    ├── tasks: 태스크 (1개 이상)
    │   └── Module 호출
    ├── post_tasks: 사후 태스크
    └── handlers: 핸들러
```

### 5.1 Playbook

**Playbook**은 Ansible 자동화의 최상위 단위입니다. 하나 이상의 Play를 포함하며, YAML 형식으로 작성됩니다.

```yaml
# playbooks/complete-example.yml
---
# 첫 번째 Play
- name: Configure web servers
  hosts: webservers
  become: yes
  vars:
    http_port: 80
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present

# 두 번째 Play
- name: Configure database servers
  hosts: dbservers
  become: yes
  tasks:
    - name: Install PostgreSQL
      ansible.builtin.apt:
        name: postgresql
        state: present
```

### 5.2 Play

**Play**는 특정 호스트 그룹에 대해 실행할 작업들의 집합입니다.

```yaml
- name: Web Server Setup        # Play 이름
  hosts: webservers             # 대상 호스트/그룹
  become: yes                   # 권한 상승 (sudo)
  become_user: root             # 실행 사용자
  gather_facts: yes             # 호스트 정보 수집
  serial: 2                     # 한 번에 2대씩 처리
  max_fail_percentage: 25       # 25% 초과 실패 시 중단
  
  vars:                         # Play 레벨 변수
    app_path: /var/www/app
  
  vars_files:                   # 외부 변수 파일
    - vars/web.yml
  
  pre_tasks:                    # roles 전에 실행
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: yes
  
  roles:                        # 역할 적용
    - common
    - nginx
  
  tasks:                        # 메인 태스크
    - name: Deploy application
      ansible.builtin.copy:
        src: app.tar.gz
        dest: "{{ app_path }}"
  
  post_tasks:                   # roles/tasks 후에 실행
    - name: Verify deployment
      ansible.builtin.uri:
        url: "http://localhost"
        status_code: 200
  
  handlers:                     # 알림 시 실행
    - name: Restart nginx
      ansible.builtin.service:
        name: nginx
        state: restarted
```

### 5.3 Task

**Task**는 단일 작업 단위입니다. 모듈을 호출하여 특정 작업을 수행합니다.

```yaml
tasks:
  # 기본 태스크
  - name: Install required packages
    ansible.builtin.apt:
      name:
        - nginx
        - python3
      state: present
  
  # 조건부 실행
  - name: Install EPEL (only on RedHat)
    ansible.builtin.yum:
      name: epel-release
      state: present
    when: ansible_os_family == "RedHat"
  
  # 루프
  - name: Create users
    ansible.builtin.user:
      name: "{{ item.name }}"
      groups: "{{ item.groups }}"
    loop:
      - { name: 'alice', groups: 'admin' }
      - { name: 'bob', groups: 'developers' }
  
  # 핸들러 알림
  - name: Update nginx config
    ansible.builtin.template:
      src: nginx.conf.j2
      dest: /etc/nginx/nginx.conf
    notify: Restart nginx
  
  # 결과 등록
  - name: Check service status
    ansible.builtin.command: systemctl status nginx
    register: nginx_status
    ignore_errors: yes
  
  # 등록된 변수 사용
  - name: Display status
    ansible.builtin.debug:
      msg: "Nginx is {{ 'running' if nginx_status.rc == 0 else 'stopped' }}"
  
  # 블록 (에러 처리)
  - name: Handle app deployment
    block:
      - name: Deploy app
        ansible.builtin.copy:
          src: app.tar.gz
          dest: /var/www/
    rescue:
      - name: Rollback on failure
        ansible.builtin.copy:
          src: app-backup.tar.gz
          dest: /var/www/
    always:
      - name: Cleanup temp files
        ansible.builtin.file:
          path: /tmp/deploy
          state: absent
```

### 5.4 Module

**Module**은 Ansible의 실제 작업 수행 단위입니다. Python으로 작성되며, 멱등성을 보장합니다.

#### 자주 사용하는 모듈

| 모듈 | 설명 | 예시 |
|-----|------|-----|
| `ansible.builtin.apt` | APT 패키지 관리 | 패키지 설치/삭제 |
| `ansible.builtin.yum` | YUM 패키지 관리 | RHEL/CentOS 패키지 |
| `ansible.builtin.copy` | 파일 복사 | 로컬→원격 파일 복사 |
| `ansible.builtin.template` | 템플릿 처리 | Jinja2 템플릿 렌더링 |
| `ansible.builtin.file` | 파일/디렉토리 관리 | 권한, 소유자 변경 |
| `ansible.builtin.service` | 서비스 관리 | 시작/중지/재시작 |
| `ansible.builtin.user` | 사용자 관리 | 사용자 생성/삭제 |
| `ansible.builtin.command` | 명령 실행 | 단순 명령 실행 |
| `ansible.builtin.shell` | 셸 명령 실행 | 파이프, 리다이렉션 포함 |
| `ansible.builtin.git` | Git 작업 | 저장소 클론/업데이트 |
| `ansible.builtin.docker_container` | Docker 컨테이너 | 컨테이너 생성/관리 |

#### 모듈 사용 예시

```yaml
# 파일 및 디렉토리
- name: Create directory
  ansible.builtin.file:
    path: /var/www/html
    state: directory
    owner: www-data
    group: www-data
    mode: '0755'

# 템플릿 (Jinja2)
- name: Deploy config from template
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/app/app.conf
    owner: root
    mode: '0644'
    validate: '/usr/bin/app --check %s'

# 서비스 관리
- name: Ensure nginx is running
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: yes

# 패키지 설치 (상태 기반)
- name: Install packages
  ansible.builtin.apt:
    name: "{{ item }}"
    state: present
  loop:
    - nginx
    - certbot
    - python3-certbot-nginx

# Docker 컨테이너
- name: Run application container
  community.docker.docker_container:
    name: myapp
    image: myapp:latest
    state: started
    ports:
      - "8080:80"
    volumes:
      - /data:/app/data
    env:
      DATABASE_URL: "{{ db_url }}"
```

---

## 6. Ansible 작동 원리

### 6.1 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                       Control Node                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Inventory  │  │  Playbook   │  │     ansible.cfg         │  │
│  │  (hosts)    │  │  (YAML)     │  │     (configuration)     │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────────┘  │
│         │                │                                       │
│         ▼                ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Ansible Engine                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │   │
│  │  │  Parser    │→ │  Executor  │→ │  Connection Plugin │  │   │
│  │  └────────────┘  └────────────┘  └─────────┬──────────┘  │   │
│  └──────────────────────────────────────────────┼────────────┘   │
└──────────────────────────────────────────────────┼───────────────┘
                                                   │
                          SSH / WinRM / Docker / Local
                                                   │
                    ┌──────────────────────────────┴──────────────────────────┐
                    ▼                              ▼                          ▼
           ┌────────────────┐           ┌────────────────┐          ┌────────────────┐
           │  Managed Node  │           │  Managed Node  │          │  Managed Node  │
           │   (Server 1)   │           │   (Server 2)   │          │   (Server 3)   │
           │                │           │                │          │                │
           │ Python Module  │           │ Python Module  │          │ Python Module  │
           │    실행 후     │           │    실행 후     │          │    실행 후     │
           │   결과 반환    │           │   결과 반환    │          │   결과 반환    │
           └────────────────┘           └────────────────┘          └────────────────┘
```

### 6.2 실행 흐름 상세

#### 1단계: 초기화 (Initialization)

```
ansible-playbook site.yml 실행
        │
        ▼
┌───────────────────────────────────┐
│ 1. ansible.cfg 로드               │
│    - 인벤토리 경로                │
│    - SSH 설정                     │
│    - 플러그인 경로                │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│ 2. Playbook YAML 파싱             │
│    - 문법 검증                    │
│    - Play/Task 구조 생성          │
└───────────────┬───────────────────┘
                │
                ▼
┌───────────────────────────────────┐
│ 3. Inventory 로드                 │
│    - 호스트 목록 파싱             │
│    - 그룹 관계 구성               │
│    - 변수 병합                    │
└───────────────────────────────────┘
```

#### 2단계: Fact 수집 (Gathering Facts)

```yaml
# gather_facts: yes (기본값)일 때 자동 실행
```

```
┌─────────────────────────────────────────────────────────────┐
│                    Control Node                              │
│  setup 모듈을 각 호스트에 전송                              │
└───────────────────────────┬─────────────────────────────────┘
                            │ SSH
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Managed Node                              │
│  setup 모듈 실행 → 시스템 정보 수집                         │
│  - ansible_os_family: "RedHat"                              │
│  - ansible_distribution: "Rocky"                            │
│  - ansible_default_ipv4.address: "192.168.1.10"            │
│  - ansible_memtotal_mb: 16384                               │
│  - ansible_processor_cores: 8                               │
└───────────────────────────┬─────────────────────────────────┘
                            │ JSON 결과 반환
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Control Node                              │
│  facts를 ansible_facts 변수에 저장                          │
│  → Playbook에서 조건문/템플릿에 활용                        │
└─────────────────────────────────────────────────────────────┘
```

#### 3단계: Task 실행 (Agentless Push Model)

```
┌──────────────────────────────────────────────────────────────────┐
│ Control Node                                                      │
│                                                                   │
│ 1. Python 모듈 생성                                              │
│    ┌────────────────────────────────────────┐                    │
│    │ # 임시 Python 스크립트                 │                    │
│    │ import json                            │                    │
│    │ def main():                            │                    │
│    │     # apt 모듈 로직                    │                    │
│    │     result = install_package('nginx')  │                    │
│    │     print(json.dumps(result))          │                    │
│    └────────────────────────────────────────┘                    │
│                                                                   │
│ 2. 모듈 + 인자를 Base64 인코딩                                   │
│                                                                   │
│ 3. SSH로 원격 호스트에 전송                                      │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                SSH (기본 포트: 22)
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ Managed Node                                                      │
│                                                                   │
│ 1. ~/.ansible/tmp/에 임시 디렉토리 생성                          │
│                                                                   │
│ 2. 전송받은 모듈 저장                                            │
│                                                                   │
│ 3. Python으로 모듈 실행                                          │
│    $ python /tmp/ansible-xxx/apt.py                              │
│                                                                   │
│ 4. 결과 JSON 생성                                                │
│    {                                                              │
│      "changed": true,                                            │
│      "msg": "Package nginx installed",                           │
│      "rc": 0                                                     │
│    }                                                              │
│                                                                   │
│ 5. 임시 파일 삭제 (cleanup)                                      │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                   JSON 결과 반환
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│ Control Node                                                      │
│                                                                   │
│ 결과 처리:                                                        │
│ - changed: true  → 노란색 (변경됨)                               │
│ - changed: false → 초록색 (이미 원하는 상태)                     │
│ - failed: true   → 빨간색 (실패)                                 │
└──────────────────────────────────────────────────────────────────┘
```

### 6.3 멱등성 (Idempotency)

Ansible의 핵심 원칙 중 하나입니다. **같은 Playbook을 여러 번 실행해도 결과는 동일**한 상태를 유지한다.

```yaml
# 멱등성 예시
- name: Ensure nginx is installed
  ansible.builtin.apt:
    name: nginx
    state: present  # "설치되어 있어야 함" (명령이 아닌 상태 선언)
```

```
첫 번째 실행:
┌────────────────────────────────────────┐
│ nginx 설치됨? → NO                     │
│ → apt install nginx 실행               │
│ → changed: true                        │
└────────────────────────────────────────┘

두 번째 실행:
┌────────────────────────────────────────┐
│ nginx 설치됨? → YES                    │
│ → 아무 작업도 하지 않음                │
│ → changed: false                       │
└────────────────────────────────────────┘
```

### 6.4 변수 우선순위 (Variable Precedence)

낮은 우선순위에서 높은 우선순위 순서:

```
1.  command line values (for example, -u my_user)
2.  role defaults (roles/xxx/defaults/main.yml)
3.  inventory file or script group vars
4.  inventory group_vars/all
5.  playbook group_vars/all
6.  inventory group_vars/*
7.  playbook group_vars/*
8.  inventory file or script host vars
9.  inventory host_vars/*
10. playbook host_vars/*
11. host facts / cached set_facts
12. play vars
13. play vars_prompt
14. play vars_files
15. role vars (roles/xxx/vars/main.yml)
16. block vars (within a block)
17. task vars (only for the task)
18. include_vars
19. set_facts / registered vars
20. role parameters
21. include parameters
22. extra vars (-e "key=value") ← 최우선
```

### 6.5 연결 플러그인 (Connection Plugins)

| 플러그인 | 용도 | 설정 예시 |
|---------|------|----------|
| `ssh` | Linux/Unix 서버 (기본값) | `ansible_connection: ssh` |
| `paramiko` | SSH (순수 Python 구현) | `ansible_connection: paramiko` |
| `winrm` | Windows 서버 | `ansible_connection: winrm` |
| `local` | 로컬 머신 | `ansible_connection: local` |
| `docker` | Docker 컨테이너 | `ansible_connection: docker` |
| `kubectl` | Kubernetes Pod | `ansible_connection: kubectl` |

### 6.6 핸들러 동작 원리

```yaml
tasks:
  - name: Update nginx config
    ansible.builtin.template:
      src: nginx.conf.j2
      dest: /etc/nginx/nginx.conf
    notify: Restart nginx           # 변경 시 핸들러 호출

  - name: Update ssl cert
    ansible.builtin.copy:
      src: ssl.crt
      dest: /etc/nginx/ssl.crt
    notify: Restart nginx           # 동일 핸들러 중복 호출

handlers:
  - name: Restart nginx
    ansible.builtin.service:
      name: nginx
      state: restarted
```

```
Task 1 실행 (config 변경) → "Restart nginx" 핸들러 대기열에 추가
Task 2 실행 (cert 변경)   → 동일 핸들러 이미 대기열에 있음 (중복 무시)
...모든 Task 완료...
핸들러 실행              → nginx 한 번만 재시작
```

### 6.7 실행 전략 (Strategy)

```yaml
- hosts: all
  strategy: linear    # 기본값: 모든 호스트가 각 task를 순차 완료 후 다음 task
  # strategy: free    # 각 호스트가 독립적으로 최대한 빠르게 진행
  # strategy: debug   # 디버깅용 (각 task마다 중단점)
```

```
Linear Strategy:
┌────────────────────────────────────────────────────────┐
│ Task 1: All hosts ████████████████████ (완료 대기)    │
│ Task 2: All hosts ████████████████████ (완료 대기)    │
│ Task 3: All hosts ████████████████████                │
└────────────────────────────────────────────────────────┘

Free Strategy:
┌────────────────────────────────────────────────────────┐
│ Host A: Task1 ██ Task2 ██ Task3 ██ (완료)             │
│ Host B: Task1 ████ Task2 ████ (진행 중)               │
│ Host C: Task1 ██████ (진행 중)                        │
└────────────────────────────────────────────────────────┘
```

---

## 참고 자료

- [Ansible 공식 문서](https://docs.ansible.com/)
- [Ansible Galaxy](https://galaxy.ansible.com/) - 커뮤니티 Role 저장소
- [uv 공식 문서](https://docs.astral.sh/uv/)
- [Ansible Practices](https://docs.ansible.com/ansible/latest/tips_tricks/ansible_tips_tricks.html)
