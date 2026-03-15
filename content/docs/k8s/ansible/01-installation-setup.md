# Ansible 설치 및 초기 설정

## 📖 개요

Ansible은 에이전트가 필요 없는 자동화 도구로, SSH를 통해 원격 서버를 관리합니다. Python으로 작성되었으며 YAML 문법을 사용합니다.

## 🎯 학습 목표

- Ansible 설치 및 환경 설정
- 첫 번째 Ad-hoc 명령 실행
- Inventory 파일 작성
- SSH 키 기반 인증 설정

## 📦 설치

### Ubuntu/Debian
```bash
# 패키지 업데이트
sudo apt update

# Ansible 설치
sudo apt install -y ansible

# 설치 확인
ansible --version
```

### CentOS/RHEL
```bash
# EPEL 저장소 추가
sudo yum install -y epel-release

# Ansible 설치
sudo yum install -y ansible
```

### macOS
```bash
# Homebrew 사용
brew install ansible
```

### Python pip 사용 (모든 OS)
```bash
pip install ansible

# 또는 최신 버전
pip install --upgrade ansible
```

## 🔧 기본 구성

### 디렉토리 구조 생성

```bash
mkdir -p ~/ansible-lab/{inventory,playbooks,roles}
cd ~/ansible-lab
```

권장 프로젝트 구조:
```
ansible-lab/
├── ansible.cfg          # Ansible 설정 파일
├── inventory/
│   ├── hosts            # 인벤토리 파일
│   └── group_vars/      # 그룹 변수
├── playbooks/           # 플레이북 파일들
├── roles/               # 역할(Role) 디렉토리
└── files/               # 배포할 파일들
```

### ansible.cfg 설정

프로젝트 루트에 `ansible.cfg` 생성:

```ini
[defaults]
# 인벤토리 파일 위치
inventory = ./inventory/hosts

# SSH 설정
host_key_checking = False
remote_user = ubuntu
private_key_file = ~/.ssh/id_rsa

# 출력 설정
stdout_callback = yaml
display_skipped_hosts = False

# 성능 최적화
forks = 10
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 3600

# 로그
log_path = ./ansible.log

[privilege_escalation]
# sudo 설정
become = True
become_method = sudo
become_user = root
become_ask_pass = False
```

## 🖥️ 테스트 환경 준비

### 옵션 1: Docker로 테스트 노드 생성

```bash
# Docker 이미지로 3개의 테스트 노드 실행
docker run -d --name node1 -p 2221:22 ubuntu/ubuntu:22.04 sleep infinity
docker run -d --name node2 -p 2222:22 ubuntu/ubuntu:22.04 sleep infinity
docker run -d --name node3 -p 2223:22 ubuntu/ubuntu:22.04 sleep infinity

# 각 컨테이너에 SSH 설치
for node in node1 node2 node3; do
  docker exec $node bash -c "apt update && apt install -y openssh-server python3"
  docker exec $node bash -c "mkdir /var/run/sshd && /usr/sbin/sshd"
done
```

### 옵션 2: Vagrant로 가상머신 생성

```ruby
# Vagrantfile
Vagrant.configure("2") do |config|
  (1..3).each do |i|
    config.vm.define "node#{i}" do |node|
      node.vm.box = "ubuntu/jammy64"
      node.vm.hostname = "node#{i}"
      node.vm.network "private_network", ip: "192.168.56.#{10+i}"
      
      node.vm.provider "virtualbox" do |vb|
        vb.memory = "512"
        vb.cpus = 1
      end
    end
  end
end
```

```bash
vagrant up
```

## 🔐 SSH 키 설정

### 1. SSH 키 생성

```bash
# 키 생성 (비밀번호 없이)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/ansible_key -N ""
```

### 2. 공개키 배포

```bash
# 대상 서버에 공개키 복사
ssh-copy-id -i ~/.ssh/ansible_key.pub user@node1.example.com
ssh-copy-id -i ~/.ssh/ansible_key.pub user@node2.example.com
ssh-copy-id -i ~/.ssh/ansible_key.pub user@node3.example.com

# 또는 수동으로
cat ~/.ssh/ansible_key.pub | ssh user@node1 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3. SSH 접속 테스트

```bash
ssh -i ~/.ssh/ansible_key user@node1.example.com
```

## 📋 첫 번째 Inventory 파일

`inventory/hosts` 파일 생성:

```ini
# 단일 호스트 정의
node1.example.com

# 그룹 정의
[webservers]
web1.example.com
web2.example.com ansible_host=192.168.1.11

[databases]
db1.example.com ansible_host=192.168.1.21 ansible_port=2222

# 그룹의 그룹
[production:children]
webservers
databases

# 그룹 변수
[webservers:vars]
ansible_user=ubuntu
http_port=80
app_env=production

[databases:vars]
ansible_user=admin
db_port=5432
```

### Inventory 변수 설명

| 변수 | 설명 | 예시 |
|------|------|------|
| `ansible_host` | 실제 IP 주소 | `192.168.1.10` |
| `ansible_port` | SSH 포트 | `22` |
| `ansible_user` | SSH 사용자 | `ubuntu` |
| `ansible_ssh_private_key_file` | SSH 키 경로 | `~/.ssh/id_rsa` |
| `ansible_connection` | 연결 방식 | `ssh`, `local` |
| `ansible_python_interpreter` | Python 경로 | `/usr/bin/python3` |

## 🚀 첫 번째 Ad-hoc 명령

### 1. 연결 테스트 (ping)

```bash
# 모든 호스트에 ping
ansible all -m ping

# 특정 그룹에만
ansible webservers -m ping

# 특정 호스트에만
ansible node1.example.com -m ping
```

**성공 출력:**
```yaml
node1.example.com | SUCCESS => {
    "changed": false,
    "ping": "pong"
}
```

### 2. 명령어 실행

```bash
# 모든 서버에서 uptime 확인
ansible all -m shell -a "uptime"

# 디스크 사용량 확인
ansible all -m shell -a "df -h"

# 메모리 확인
ansible all -m shell -a "free -m"
```

### 3. 파일 작업

```bash
# 파일 생성
ansible all -m file -a "path=/tmp/test.txt state=touch"

# 디렉토리 생성
ansible all -m file -a "path=/tmp/mydir state=directory mode=0755"

# 파일 복사
ansible all -m copy -a "src=/tmp/test.txt dest=/tmp/remote.txt"
```

### 4. 패키지 관리

```bash
# 패키지 설치 (Ubuntu/Debian)
ansible all -m apt -a "name=nginx state=present" --become

# 패키지 업데이트
ansible all -m apt -a "update_cache=yes" --become

# 패키지 제거
ansible all -m apt -a "name=nginx state=absent" --become
```

### 5. 서비스 관리

```bash
# 서비스 시작
ansible all -m service -a "name=nginx state=started" --become

# 서비스 재시작
ansible all -m service -a "name=nginx state=restarted" --become

# 서비스 상태 확인
ansible all -m service -a "name=nginx state=status" --become
```

## 📊 정보 수집 (Facts)

```bash
# 모든 시스템 정보 수집
ansible all -m setup

# 특정 정보만 필터링
ansible all -m setup -a "filter=ansible_distribution*"

# 네트워크 정보
ansible all -m setup -a "filter=ansible_default_ipv4"

# 메모리 정보
ansible all -m setup -a "filter=ansible_memory_mb"
```

### 유용한 Facts

```yaml
ansible_hostname          # 호스트명
ansible_distribution      # OS 배포판 (Ubuntu, CentOS 등)
ansible_distribution_version   # OS 버전
ansible_processor_cores   # CPU 코어 수
ansible_memtotal_mb      # 총 메모리
ansible_default_ipv4.address  # IP 주소
```

## 💡 Ad-hoc 명령어 패턴

### 패턴 문법

```bash
# 모든 호스트
ansible all -m ping

# 특정 그룹
ansible webservers -m ping

# 여러 그룹
ansible webservers:databases -m ping

# 그룹 제외
ansible all:!databases -m ping

# 그룹 교집합
ansible webservers:&production -m ping

# 정규식
ansible ~web.* -m ping

# 범위
ansible webservers[0:2] -m ping
```

## 🔍 디버깅

### 상세 출력 레벨

```bash
# 상세도 레벨 1 (-v)
ansible all -m ping -v

# 레벨 2 (-vv): 더 상세한 정보
ansible all -m ping -vv

# 레벨 3 (-vvv): 연결 정보 포함
ansible all -m ping -vvv

# 레벨 4 (-vvvv): 모든 디버그 정보
ansible all -m ping -vvvv
```

### 실행 확인 (Dry-run)

```bash
# 실제 변경 없이 테스트
ansible all -m apt -a "name=nginx state=present" --check
```

## 🛠️ 실습 과제

### 과제 1: 웹 서버 3대에 Nginx 설치

```bash
# 1. Inventory에 webservers 그룹 추가
# 2. Ad-hoc 명령으로 Nginx 설치
ansible webservers -m apt -a "name=nginx state=present" --become

# 3. Nginx 시작 및 활성화
ansible webservers -m service -a "name=nginx state=started enabled=yes" --become

# 4. 상태 확인
ansible webservers -m shell -a "systemctl status nginx | grep Active"
```

### 과제 2: 모든 서버의 시스템 정보 수집

```bash
# OS, IP, 메모리, 디스크 정보를 파일로 저장
ansible all -m setup --tree /tmp/facts
```

### 과제 3: 보안 업데이트 적용

```bash
# 모든 서버에 보안 업데이트
ansible all -m apt -a "upgrade=dist update_cache=yes" --become
```

## 🐛 트러블슈팅

### 문제 1: "Failed to connect to the host via ssh"
**해결:**
```bash
# SSH 키 확인
ssh -i ~/.ssh/ansible_key user@host

# ansible.cfg에 올바른 키 경로 설정
private_key_file = ~/.ssh/ansible_key
```

### 문제 2: "Permission denied"
**해결:**
```bash
# --become 플래그 추가
ansible all -m apt -a "name=nginx state=present" --become

# sudo 비밀번호 필요 시
ansible all -m apt -a "name=nginx state=present" --become --ask-become-pass
```

### 문제 3: "MODULE FAILURE"
**해결:**
```bash
# Python이 설치되어 있는지 확인
ansible all -m raw -a "which python3"

# Python 설치
ansible all -m raw -a "apt install -y python3" --become
```

## 📚 다음 단계

- [Inventory 작성 방법](02-inventory-basics.md)
- [Playbook 작성 실습](03-playbook-examples.md)

## 🔗 참고 자료

- [Ansible 공식 문서](https://docs.ansible.com/)
- [Ansible 모듈 목록](https://docs.ansible.com/ansible/latest/collections/index_module.html)
- [Ansible 베스트 프랙티스](https://docs.ansible.com/ansible/latest/user_guide/playbooks_best_practices.html)
