# Ansible 설치와 초기 설정

Ansible은 control node에서 inventory의 host로 SSH 접속한 뒤 module을 실행해 원하는 상태를 맞추는 자동화 도구다. 이 문서는 설치 방법 자체보다 “어떤 host에 어떤 사용자와 key로 접속하고, 반복 실행해도 안전한가”를 기준으로 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

서버가 늘어나면 패키지 설치, 설정 파일 배포, 서비스 재시작을 수동으로 반복하기 어렵다. Ansible은 agent를 설치하지 않고 SSH와 Python을 이용해 여러 서버의 상태를 일관되게 맞출 수 있다.

문제는 초기 설정에서 inventory, SSH key, sudo, Python interpreter가 조금만 어긋나도 모든 task가 실패한다는 점이다. 설치보다 연결 계약을 먼저 잡아야 한다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 OS별 설치, Docker/Vagrant 테스트 노드, SSH 키, inventory, ad-hoc 명령, facts, troubleshooting을 한 번에 제공한다.

repository에는 실제 Ansible 예시도 있다.

- `infra/ansible/ansible.cfg`: `inventory = ./inventory`, `remote_user = ansible`, `host_key_checking = False`, `become = True`
- `infra/ansible/inventory/hosts.ini`: Proxmox node group과 `ansible_host` 예시
- `infra/ansible/playbooks/site.yml`: `webservers.yml`, `dbservers.yml`, `infrastructures.yml` import 구조

이 문서는 그 구조와 맞춰 control node, inventory, SSH, 첫 연결 검증에 집중한다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 Ansible control node에서 대상 host에 안전하게 접속하고, 첫 ad-hoc 명령이 성공하는 것이다.

- Ansible 설치 경로를 하나로 정한다.
- inventory에 host와 접속 변수를 명시한다.
- SSH key 인증과 sudo 권한을 검증한다.
- `ansible all -m ping`이 성공한다.
- `--check`와 idempotency 개념을 초기에 이해한다.

## 4. 시스템 번역 (Data Flow)

Ansible 실행 흐름은 다음과 같다.

```text
ansible command
  -> ansible.cfg
  -> inventory
  -> SSH connection
  -> remote Python
  -> module execution
  -> changed or ok result
```

control node에는 Ansible이 필요하고, managed node에는 SSH 접속과 Python 실행 환경이 필요하다. Windows나 network 장비는 연결 방식이 다르므로 별도 문서가 필요하다.

## 5. 핵심 구성요소 (Building Blocks)

Control node는 `ansible` 명령을 실행하는 로컬 또는 CI 머신이다.

Managed node는 Ansible이 SSH로 접속해 module을 실행하는 대상 host다.

Inventory는 host 목록과 group, 접속 변수의 source of truth다.

`ansible.cfg`는 inventory 경로, remote user, SSH 정책, privilege escalation 같은 기본값을 정한다.

Module은 실제 작업 단위다. `ansible.builtin.apt`, `file`, `copy`, `service`, `shell` 같은 module이 있다.

Idempotency는 같은 작업을 반복 실행해도 결과 상태가 같아야 한다는 원칙이다.

## 6. 상태 전이 (State Transition)

초기 설정은 다음 순서로 진행한다.

```text
Ansible installed
  -> project directory created
  -> ansible.cfg written
  -> inventory written
  -> SSH key works
  -> sudo works
  -> ping module succeeds
  -> first idempotent task succeeds
```

`ping` module은 ICMP ping이 아니라 Ansible이 remote Python module을 실행할 수 있는지 확인하는 테스트다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 설치 방법은 OS package, pip, pipx 중 하나로 통일한다.
- inventory에 private key나 password를 평문으로 넣지 않는다.
- production에서 host key checking을 무심코 끄지 않는다.
- `shell`보다 전용 module을 우선 사용한다.
- `become=True`는 필요한 task에만 쓰는 방향으로 좁힌다.
- playbook은 반복 실행 시 불필요한 `changed`가 나오지 않아야 한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

Debian/Ubuntu control node에서 설치한다.

```bash
sudo apt update
sudo apt install -y ansible
ansible --version
```

프로젝트 구조를 만든다.

```bash
mkdir -p ansible-lab/inventory ansible-lab/playbooks ansible-lab/roles
cd ansible-lab
```

`ansible.cfg`를 둔다.

```ini
[defaults]
inventory = ./inventory/hosts.ini
remote_user = ansible
roles_path = ./roles
retry_files_enabled = False

[privilege_escalation]
become = True
become_method = sudo
become_user = root
become_ask_pass = False
```

실습 환경에서만 host key checking을 끄려면 의도를 남긴다.

```ini
[defaults]
host_key_checking = False
```

`inventory/hosts.ini`를 작성한다.

```ini
[webservers]
web1 ansible_host=192.168.56.11
web2 ansible_host=192.168.56.12

[webservers:vars]
ansible_user=ansible
ansible_ssh_private_key_file=~/.ssh/ansible_key
ansible_python_interpreter=/usr/bin/python3
```

SSH 접속을 먼저 확인한다.

```bash
ssh -i ~/.ssh/ansible_key ansible@192.168.56.11
```

Ansible 연결을 확인한다.

```bash
ansible all -m ping
ansible webservers -m ansible.builtin.command -a "uptime"
```

idempotent module을 실행한다.

```bash
ansible webservers -m ansible.builtin.file -a "path=/tmp/ansible-check state=directory mode=0755"
ansible webservers -m ansible.builtin.file -a "path=/tmp/ansible-check state=directory mode=0755"
```

두 번째 실행에서 `changed`가 아니라 `ok`에 가까운 결과가 나와야 한다.

## 9. 실패 사례 (What could go wrong?)

`Failed to connect to the host via ssh`는 Ansible 문제가 아니라 SSH 사용자, key, port, known_hosts 문제인 경우가 많다. 같은 옵션으로 직접 `ssh`를 먼저 실행한다.

`/usr/bin/python`을 찾지 못하면 managed node에 Python이 없거나 interpreter 경로가 다르다. inventory에 `ansible_python_interpreter=/usr/bin/python3`를 명시한다.

`Missing sudo password`가 나오면 sudoers 정책과 `become_ask_pass` 설정을 확인한다. 무조건 passwordless sudo를 요구하지 말고 운영 보안 정책을 따른다.

`host_key_checking = False`는 MITM 보호를 약화한다. lab에서는 편하지만 production에서는 known_hosts 관리 방식을 정해야 한다.

`shell` module로 package 설치나 service 제어를 반복하면 idempotency를 잃기 쉽다. 전용 module을 먼저 찾는다.

## 10. 뇌 확장하기 (Evolution & Variants)

Ansible에는 `ansible-core`와 community collection을 포함한 `ansible` package가 있다. 공식 설치 문서는 OS package 또는 선택한 Python 환경의 pip 설치를 안내한다. 팀에서는 버전과 설치 방식을 고정해야 한다.

Inventory는 INI, YAML, dynamic inventory 모두 가능하다. Cloud 환경에서는 Terraform output을 inventory로 연결하거나 dynamic inventory plugin을 사용할 수 있다.

운영 playbook은 role, group_vars, host_vars, vault, tags, check mode, diff mode로 발전한다. 초기 문서에서는 연결과 idempotency를 먼저 증명한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] Ansible 설치 방식과 버전을 확인했다.
- [ ] `ansible.cfg`가 project directory에서 로드된다.
- [ ] inventory host와 group이 실제 대상과 일치한다.
- [ ] SSH key 접속이 직접 성공한다.
- [ ] managed node에서 Python interpreter를 찾을 수 있다.
- [ ] `ansible all -m ping`이 성공한다.
- [ ] sudo/become 정책을 확인했다.
- [ ] 첫 idempotent task를 두 번 실행해 결과를 비교했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Ansible 초기 설정의 핵심은 설치가 아니라 `ansible.cfg -> inventory -> SSH -> remote Python -> module result` 경로를 검증하는 것이다. 직접 SSH가 안 되면 Ansible도 안정적으로 동작하지 않는다.
