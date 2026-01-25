# Module 8: Proxmox VE User Management

## 학습 목표
이 모듈을 완료하면 다음을 이해할 수 있습니다:
- PVE 인증 시스템 아키텍처
- 다양한 인증 영역(PAM, PVE, LDAP, AD, OpenID Connect)
- 사용자, 그룹, API 토큰 관리
- 역할 기반 접근 제어(RBAC)와 권한 시스템
- 2단계 인증(TFA) 구성
- pveum 명령어 활용

---

## 1. 인증 시스템 아키텍처

### 1.1 전체 구조

```
+-------------------------------------------------------------------------+
|                    Proxmox VE Authentication System                      |
+-------------------------------------------------------------------------+
|                                                                         |
|  +-------------------+     +-------------------+     +---------------+  |
|  |   Web GUI/API     |     |   pveum CLI       |     |  REST API     |  |
|  +--------+----------+     +--------+----------+     +-------+-------+  |
|           |                         |                        |          |
|           +-------------------------+------------------------+          |
|                                     |                                   |
|                          +----------v----------+                        |
|                          |  Authentication     |                        |
|                          |     Layer           |                        |
|                          +----------+----------+                        |
|                                     |                                   |
|     +---------------+---------------+---------------+---------------+   |
|     |               |               |               |               |   |
|     v               v               v               v               v   |
|  +------+      +-------+      +------+      +------+      +--------+   |
|  | PAM  |      |  PVE  |      | LDAP |      |  AD  |      | OpenID |   |
|  +------+      +-------+      +------+      +------+      +--------+   |
|  Linux         Proxmox        OpenLDAP      Active       OAuth 2.0     |
|  System        Internal       Server        Directory    Provider      |
|                                                                         |
+-------------------------------------------------------------------------+
|                                                                         |
|  Configuration Files:                                                   |
|  - /etc/pve/user.cfg      : 사용자, 그룹, 권한 정보                       |
|  - /etc/pve/domains.cfg   : 인증 영역 설정                               |
|  - /etc/pve/priv/shadow.cfg : PVE 영역 비밀번호 해시                      |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 1.2 사용자 식별자 형식

```
+-------------------------------------------------------------------------+
|                        User ID Format                                    |
+-------------------------------------------------------------------------+
|                                                                         |
|   <username>@<realm>                                                    |
|                                                                         |
|   예시:                                                                  |
|   - root@pam        : Linux root 사용자 (PAM 영역)                       |
|   - admin@pve       : PVE 내부 사용자                                    |
|   - john@ldap       : LDAP 사용자                                        |
|   - jane@ad         : Active Directory 사용자                            |
|   - user1@oidc      : OpenID Connect 사용자                              |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 1.3 설정 파일 구조

```bash
# /etc/pve/user.cfg - 사용자 및 권한 설정
user:root@pam:1:0:::root@example.com:::
user:admin@pve:1:0:::admin@example.com::John:Admin:
group:admins:admin@pve::
group:developers:dev1@pve,dev2@pve::
role:CustomRole:VM.Console,VM.PowerMgmt:
acl:1:/vms:@admins:Administrator:
acl:1:/vms/100:user1@pve:PVEVMUser:
pool:dev-pool:::

# /etc/pve/domains.cfg - 인증 영역 설정
pam: pam
        comment Linux PAM standard authentication

pve: pve
        comment Proxmox VE authentication server

ldap: company-ldap
        base_dn ou=People,dc=company,dc=com
        server1 ldap.company.com
        user_attr uid

ad: company-ad
        domain company.local
        server1 dc.company.local
```

---

## 2. 인증 영역 (Authentication Realms)

### 2.1 영역 유형 비교

```
+-------------+----------------------------------------------------------+
|   Realm     |                    Characteristics                        |
+-------------+----------------------------------------------------------+
|             |                                                          |
|    PAM      | - Linux 시스템 사용자 인증                                 |
|             | - 각 노드에 사용자 존재 필요                                |
|             | - 비밀번호 변경은 해당 노드에만 적용                         |
|             | - 삭제 불가 (기본 제공)                                     |
|             |                                                          |
+-------------+----------------------------------------------------------+
|             |                                                          |
|    PVE      | - Proxmox VE 내부 인증 서버                                |
|             | - /etc/pve/priv/shadow.cfg에 해시 저장                     |
|             | - SHA-256 해싱                                            |
|             | - 소규모~중규모 환경에 적합                                  |
|             | - 사용자 완전 관리 (생성, 비밀번호 변경 등)                   |
|             |                                                          |
+-------------+----------------------------------------------------------+
|             |                                                          |
|    LDAP     | - 외부 LDAP 서버 인증 (OpenLDAP 등)                        |
|             | - base_dn, user_attr 설정 필요                            |
|             | - SSL/TLS 지원                                            |
|             | - 사용자 동기화(Sync) 가능                                  |
|             |                                                          |
+-------------+----------------------------------------------------------+
|             |                                                          |
|    AD       | - Microsoft Active Directory                              |
|             | - LDAP 프로토콜 사용                                       |
|             | - 도메인 기반 인증                                         |
|             | - 그룹 동기화 지원                                         |
|             |                                                          |
+-------------+----------------------------------------------------------+
|             |                                                          |
|  OpenID     | - OAuth 2.0 기반 외부 인증                                 |
|  Connect    | - Google, Keycloak 등 지원                                |
|             | - 사용자 자동 생성 옵션                                     |
|             | - 그룹 매핑 지원                                           |
|             |                                                          |
+-------------+----------------------------------------------------------+
```

### 2.2 PAM 영역

```bash
# PAM 영역은 Linux 시스템 사용자를 사용
# 각 노드에 동일한 사용자가 존재해야 함

# Linux 사용자 생성 (각 노드에서 실행)
adduser john

# PVE에서 PAM 사용자 등록
pveum user add john@pam -comment "John Doe"

# PAM 사용자 비밀번호 변경 (해당 노드에서만 적용)
passwd john

# 특징:
# - 노드별 독립적인 비밀번호 가능 (보안상 이점)
# - 모든 노드 동일 비밀번호 필요시 각 노드에서 설정
# - root@pam은 항상 무제한 관리자 권한
```

### 2.3 PVE 영역

```bash
# PVE 영역 - Proxmox VE 내부 인증

# 사용자 생성
pveum user add admin@pve -comment "Admin User"

# 비밀번호 설정
pveum passwd admin@pve

# 사용자 정보 수정
pveum user modify admin@pve \
  -firstname "Admin" \
  -lastname "User" \
  -email "admin@example.com"

# 사용자 비활성화
pveum user modify admin@pve -enable 0

# 사용자 삭제
pveum user delete admin@pve

# 비밀번호는 /etc/pve/priv/shadow.cfg에 SHA-256 해시로 저장
# 클러스터 전체에 자동 동기화
```

### 2.4 LDAP 영역

```bash
# LDAP 영역 추가
pveum realm add my-ldap --type ldap \
  --base_dn "ou=People,dc=company,dc=com" \
  --user_attr uid \
  --server1 ldap.company.com \
  --port 389 \
  --default 0 \
  --comment "Company LDAP"

# SSL/TLS 사용
pveum realm add my-ldap-ssl --type ldap \
  --base_dn "ou=People,dc=company,dc=com" \
  --user_attr uid \
  --server1 ldap.company.com \
  --port 636 \
  --secure 1 \
  --verify 1 \
  --capath /etc/ssl/certs

# Bind DN 설정 (인증된 검색이 필요한 경우)
pveum realm modify my-ldap \
  --bind_dn "cn=readonly,dc=company,dc=com"

# Bind 비밀번호 저장 (파일로)
echo "secret_password" > /etc/pve/priv/realm/my-ldap.pw
chmod 600 /etc/pve/priv/realm/my-ldap.pw

# 사용자 동기화
pveum realm sync my-ldap

# 동기화 옵션
pveum realm sync my-ldap \
  --scope both \
  --enable-new 1 \
  --remove-vanished entry,acl
```

**LDAP 설정 구조:**

```
+-------------------------------------------------------------------------+
|                         LDAP Configuration                               |
+-------------------------------------------------------------------------+
|                                                                         |
|   LDAP Server                           Proxmox VE                      |
|   +---------------------------+         +---------------------------+   |
|   |                           |         |                           |   |
|   | dc=company,dc=com         |         | /etc/pve/domains.cfg      |   |
|   |   |                       |         |                           |   |
|   |   +-- ou=People           | <-----> | ldap: my-ldap             |   |
|   |   |     |                 |  LDAP   |   base_dn: ou=People,...  |   |
|   |   |     +-- uid=john      |  Query  |   user_attr: uid          |   |
|   |   |     +-- uid=jane      |         |   server1: ldap.company...|   |
|   |   |                       |         |                           |   |
|   |   +-- ou=Groups           |         | /etc/pve/user.cfg         |   |
|   |         |                 |         |   user:john@my-ldap       |   |
|   |         +-- cn=developers |         |   user:jane@my-ldap       |   |
|   |                           |         |   group:developers-my-ldap|   |
|   +---------------------------+         +---------------------------+   |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 2.5 Active Directory 영역

```bash
# AD 영역 추가
pveum realm add company-ad --type ad \
  --domain company.local \
  --server1 dc1.company.local \
  --server2 dc2.company.local \
  --port 389 \
  --secure 0 \
  --default 0 \
  --comment "Company Active Directory"

# SSL 사용
pveum realm add company-ad-ssl --type ad \
  --domain company.local \
  --server1 dc1.company.local \
  --port 636 \
  --secure 1 \
  --verify 1

# Bind 사용자 설정 (대부분의 AD 환경에서 필요)
pveum realm modify company-ad \
  --bind_dn "CN=svc_proxmox,OU=Service Accounts,DC=company,DC=local"

# 비밀번호 저장
echo "service_account_password" > /etc/pve/priv/realm/company-ad.pw

# 그룹 필터 설정
pveum realm modify company-ad \
  --group_filter "(&(objectClass=group)(cn=PVE*))"

# 동기화
pveum realm sync company-ad --scope both

# 대소문자 구분 비활성화 (AD 기본 동작과 일치)
pveum realm modify company-ad --case-sensitive 0
```

### 2.6 OpenID Connect 영역

```bash
# Google OpenID Connect
pveum realm add google-oidc --type openid \
  --issuer-url "https://accounts.google.com" \
  --client-id "your-client-id.apps.googleusercontent.com" \
  --client-key "your-client-secret" \
  --username-claim email \
  --autocreate 1

# Keycloak OpenID Connect
pveum realm add keycloak-oidc --type openid \
  --issuer-url "https://keycloak.company.com/realms/company" \
  --client-id "proxmox-ve" \
  --client-key "client-secret" \
  --username-claim preferred_username \
  --autocreate 1

# 그룹 매핑 설정
pveum realm modify keycloak-oidc \
  --groups-claim groups \
  --groups-autocreate 1
```

**OpenID Connect 흐름:**

```
+-------------------------------------------------------------------------+
|                      OpenID Connect Auth Flow                            |
+-------------------------------------------------------------------------+
|                                                                         |
|   1. 사용자가 PVE 로그인 페이지에서 OpenID 영역 선택                       |
|                                                                         |
|   +----------+        +------------+        +------------------+        |
|   |  사용자   | -----> |  PVE GUI   | -----> | OpenID Provider  |        |
|   +----------+        +------------+        +------------------+        |
|                                                    |                    |
|   2. Provider 로그인 페이지로 리다이렉트              |                    |
|                                                    v                    |
|   +----------+        +------------+        +------------------+        |
|   |  사용자   | <----- | Provider   | <----- | 인증 수행        |        |
|   +----------+  Login +------------+        +------------------+        |
|        |                                                                |
|   3. 사용자 인증 (ID/PW, MFA 등)                                         |
|        |                                                                |
|        v                                                                |
|   +----------+        +------------+        +------------------+        |
|   |  사용자   | -----> | Provider   | -----> | Authorization    |        |
|   +----------+        +------------+        | Code 발급        |        |
|                                             +------------------+        |
|                                                    |                    |
|   4. PVE로 리다이렉트 (Authorization Code와 함께)   |                    |
|                                                    v                    |
|   +----------+        +------------+        +------------------+        |
|   |          |        |  PVE API   | -----> | Token Exchange   |        |
|   |          |        +------------+        +------------------+        |
|   |          |              |                      |                    |
|   |  사용자   |              v                      v                    |
|   |          |        +------------+        +------------------+        |
|   |          | <----- | PVE Session| <----- | ID Token 검증    |        |
|   +----------+        +------------+        +------------------+        |
|                                                                         |
|   5. 세션 생성 및 로그인 완료                                             |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 3. 사용자 및 그룹 관리

### 3.1 사용자 관리

```bash
# 사용자 목록 조회
pveum user list

# 특정 사용자 정보 조회
pveum user list --full | grep admin@pve

# 사용자 생성
pveum user add developer1@pve \
  -comment "Developer 1" \
  -email "dev1@company.com" \
  -firstname "John" \
  -lastname "Developer" \
  -groups developers \
  -expire 0

# 비밀번호 설정
pveum passwd developer1@pve

# 사용자 수정
pveum user modify developer1@pve \
  -enable 1 \
  -groups "developers,testers"

# 사용자 만료일 설정 (Unix timestamp)
pveum user modify developer1@pve -expire 1735689600

# 사용자 비활성화
pveum user modify developer1@pve -enable 0

# 사용자 삭제
pveum user delete developer1@pve

# 사용자 권한 확인
pveum user permissions developer1@pve
```

### 3.2 그룹 관리

```bash
# 그룹 목록 조회
pveum group list

# 그룹 생성
pveum group add developers -comment "Development Team"
pveum group add operators -comment "Operations Team"
pveum group add admins -comment "System Administrators"

# 그룹에 사용자 추가 (사용자 수정을 통해)
pveum user modify developer1@pve -groups developers

# 여러 그룹에 추가
pveum user modify developer1@pve -groups "developers,testers"

# 그룹 삭제
pveum group delete testers
```

**그룹 기반 권한 관리 구조:**

```
+-------------------------------------------------------------------------+
|                     Group-Based Permission Model                         |
+-------------------------------------------------------------------------+
|                                                                         |
|   Groups                    Roles                    Paths              |
|   +-------------+          +-----------+            +------------+      |
|   | admins      |---+      |Administrator|--------->| /          |      |
|   +-------------+   |      +-----------+            +------------+      |
|                     |                                                   |
|   +-------------+   |      +-----------+            +------------+      |
|   | developers  |---+----->|PVEVMAdmin |----------->| /vms       |      |
|   +-------------+   |      +-----------+            +------------+      |
|                     |                                                   |
|   +-------------+   |      +-----------+            +------------+      |
|   | operators   |---+      |PVEAdmin   |----------->| /pool/prod |      |
|   +-------------+          +-----------+            +------------+      |
|                                                                         |
|   Users are members of groups                                           |
|   +-------------+                                                       |
|   | user1@pve   |---> developers                                        |
|   | user2@pve   |---> developers, operators                             |
|   | admin@pve   |---> admins                                            |
|   +-------------+                                                       |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## 4. API 토큰

### 4.1 API 토큰 개념

```
+-------------------------------------------------------------------------+
|                          API Token Architecture                          |
+-------------------------------------------------------------------------+
|                                                                         |
|   +-------------------+                                                 |
|   |    User           |                                                 |
|   | (joe@pve)         |                                                 |
|   +--------+----------+                                                 |
|            |                                                            |
|            | owns                                                       |
|            |                                                            |
|   +--------v----------+     +------------------+                        |
|   |   API Token       |     |   API Token      |                        |
|   | (joe@pve!monitor) |     | (joe@pve!backup) |                        |
|   +--------+----------+     +--------+---------+                        |
|            |                         |                                  |
|   +--------v----------+     +--------v---------+                        |
|   | Privileges:       |     | Privileges:      |                        |
|   | - privsep: yes    |     | - privsep: no    |                        |
|   | - 별도 ACL 필요    |     | - 사용자 권한 상속 |                        |
|   +-------------------+     +------------------+                        |
|                                                                         |
|   Token Format: PVEAPIToken=USER@REALM!TOKENID=UUID                     |
|   Example: PVEAPIToken=joe@pve!monitor=aaaaaa-bbbb-cccc-dddd-eeeeee     |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 4.2 API 토큰 관리

```bash
# API 토큰 생성 (권한 분리 - 별도 ACL 필요)
pveum user token add joe@pve monitoring -privsep 1 -comment "Monitoring"

# 출력 예시:
# full-tokenid: joe@pve!monitoring
# info:
#   privsep: 1
# value: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# API 토큰 생성 (권한 상속 - 사용자 권한 그대로 사용)
pveum user token add joe@pve backup -privsep 0 -comment "Backup Script"

# 토큰 만료일 설정
pveum user token add joe@pve temp-token -privsep 1 -expire 1735689600

# 토큰 목록 조회
pveum user token list joe@pve

# 토큰 정보 조회
pveum user token list joe@pve monitoring

# 토큰에 권한 부여 (privsep=1인 경우)
pveum acl modify /vms -token 'joe@pve!monitoring' -role PVEAuditor

# 토큰 권한 확인
pveum user token permissions joe@pve monitoring

# 토큰 삭제
pveum user token remove joe@pve monitoring
```

### 4.3 API 토큰 사용 예제

```bash
# API 토큰으로 REST API 호출
curl -k -H "Authorization: PVEAPIToken=joe@pve!monitoring=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  https://pve.example.com:8006/api2/json/nodes

# Python 예제
import requests

headers = {
    "Authorization": "PVEAPIToken=joe@pve!monitoring=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}

response = requests.get(
    "https://pve.example.com:8006/api2/json/cluster/status",
    headers=headers,
    verify=False
)
print(response.json())

# Ansible에서 사용
# ansible.cfg 또는 inventory에서:
# api_user: joe@pve!monitoring
# api_token_id: monitoring
# api_token_secret: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 5. 역할 기반 접근 제어 (RBAC)

### 5.1 RBAC 구조

```
+-------------------------------------------------------------------------+
|                              RBAC Model                                  |
+-------------------------------------------------------------------------+
|                                                                         |
|   +----------+     +----------+     +-------------+     +----------+    |
|   |  Users   |---->|  Roles   |---->| Privileges  |---->|  Paths   |    |
|   |  Groups  |     |          |     |             |     | (Objects)|    |
|   |  Tokens  |     |          |     |             |     |          |    |
|   +----------+     +----------+     +-------------+     +----------+    |
|                                                                         |
|   ACL Entry: (Path, User/Group/Token, Role)                             |
|                                                                         |
|   예: (/vms, @developers, PVEVMAdmin)                                   |
|       -> developers 그룹이 /vms 경로에서 PVEVMAdmin 역할 수행            |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 5.2 기본 제공 역할

```
+-------------------+--------------------------------------------------+
|      Role         |                  Description                      |
+-------------------+--------------------------------------------------+
| Administrator     | 모든 권한 (root와 동일)                            |
| NoAccess          | 권한 없음 (명시적 거부)                             |
| PVEAdmin          | 대부분의 관리 권한 (시스템/권한 수정 제외)           |
| PVEAuditor        | 읽기 전용 (모니터링용)                              |
| PVEDatastoreAdmin | 백업 공간/템플릿 생성 및 관리                        |
| PVEDatastoreUser  | 백업 공간 할당 및 스토리지 조회                      |
| PVEMappingAdmin   | 리소스 매핑 관리                                    |
| PVEMappingUser    | 리소스 매핑 조회 및 사용                            |
| PVEPoolAdmin      | 리소스 풀 관리                                      |
| PVEPoolUser       | 리소스 풀 조회                                      |
| PVESDNAdmin       | SDN 설정 관리                                       |
| PVESDNUser        | 브리지/VNet 접근                                    |
| PVESysAdmin       | 시스템 감사, 콘솔, 로그                             |
| PVETemplateUser   | 템플릿 조회 및 복제                                 |
| PVEUserAdmin      | 사용자 관리                                         |
| PVEVMAdmin        | VM 전체 관리                                        |
| PVEVMUser         | VM 조회, 백업, CD-ROM, 콘솔, 전원 관리              |
+-------------------+--------------------------------------------------+
```

### 5.3 권한 (Privileges)

**노드/시스템 관련:**

```
+-------------------------+------------------------------------------------+
|      Privilege          |                Description                      |
+-------------------------+------------------------------------------------+
| Group.Allocate          | 그룹 생성/수정/삭제                              |
| Mapping.Audit           | 리소스 매핑 조회                                 |
| Mapping.Modify          | 리소스 매핑 관리                                 |
| Mapping.Use             | 리소스 매핑 사용                                 |
| Permissions.Modify      | 접근 권한 수정                                   |
| Pool.Allocate           | 풀 생성/수정/삭제                                |
| Pool.Audit              | 풀 조회                                          |
| Realm.AllocateUser      | 영역에 사용자 할당                               |
| Realm.Allocate          | 인증 영역 생성/수정/삭제                         |
| SDN.Allocate            | SDN 설정 관리                                    |
| SDN.Audit               | SDN 설정 조회                                    |
| Sys.Audit               | 노드 상태/설정, 클러스터/HA 설정 조회            |
| Sys.Console             | 노드 콘솔 접근                                   |
| Sys.Incoming            | 다른 클러스터에서 데이터 수신 (실험적)           |
| Sys.Modify              | 노드 네트워크 설정 생성/수정/삭제                |
| Sys.PowerMgmt           | 노드 전원 관리                                   |
| Sys.Syslog              | syslog 조회                                      |
| User.Modify             | 사용자 접근 및 세부정보 생성/수정/삭제           |
+-------------------------+------------------------------------------------+
```

**가상 머신 관련:**

```
+-------------------------+------------------------------------------------+
|      Privilege          |                Description                      |
+-------------------------+------------------------------------------------+
| SDN.Use                 | SDN VNet 및 로컬 브리지 접근                    |
| VM.Allocate             | 서버에 VM 생성/삭제                              |
| VM.Audit                | VM 설정 조회                                     |
| VM.Backup               | VM 백업/복원                                     |
| VM.Clone                | VM 복제                                          |
| VM.Config.CDROM         | CD-ROM 꺼내기/변경                               |
| VM.Config.CPU           | CPU 설정 변경                                    |
| VM.Config.Cloudinit     | Cloud-init 파라미터 변경                         |
| VM.Config.Disk          | 디스크 추가/수정/삭제                            |
| VM.Config.HWType        | 에뮬레이션 하드웨어 유형 변경                    |
| VM.Config.Memory        | 메모리 설정 변경                                 |
| VM.Config.Network       | 네트워크 장치 추가/수정/삭제                     |
| VM.Config.Options       | 기타 VM 설정 변경                                |
| VM.Console              | VM 콘솔 접근                                     |
| VM.Migrate              | VM을 클러스터 내 다른 노드로 마이그레이션        |
| VM.PowerMgmt            | 전원 관리 (시작, 정지, 재시작, 종료 등)          |
| VM.Snapshot             | VM 스냅샷 생성/삭제                              |
| VM.Snapshot.Rollback    | VM 스냅샷 롤백                                   |
+-------------------------+------------------------------------------------+
```

**스토리지 관련:**

```
+-------------------------+------------------------------------------------+
|      Privilege          |                Description                      |
+-------------------------+------------------------------------------------+
| Datastore.Allocate      | 데이터스토어 생성/수정/삭제, 볼륨 삭제           |
| Datastore.AllocateSpace | 데이터스토어에 공간 할당                         |
| Datastore.AllocateTemplate | 템플릿/ISO 이미지 할당/업로드                  |
| Datastore.Audit         | 데이터스토어 조회/탐색                           |
+-------------------------+------------------------------------------------+
```

### 5.4 객체 경로 (Paths)

```
+-------------------------------------------------------------------------+
|                           Object Paths                                   |
+-------------------------------------------------------------------------+
|                                                                         |
|   /                           # 루트 (전체)                              |
|   |                                                                     |
|   +-- /access                 # 접근 관리                                |
|   |   +-- /access/groups      # 그룹 관리                                |
|   |   +-- /access/realms/{id} # 특정 영역 관리                           |
|   |                                                                     |
|   +-- /nodes                  # 노드                                     |
|   |   +-- /nodes/{node}       # 특정 노드                                |
|   |                                                                     |
|   +-- /vms                    # 모든 VM/CT                               |
|   |   +-- /vms/{vmid}         # 특정 VM/CT                               |
|   |                                                                     |
|   +-- /storage                # 스토리지                                 |
|   |   +-- /storage/{storage}  # 특정 스토리지                            |
|   |                                                                     |
|   +-- /pool                   # 리소스 풀                                |
|   |   +-- /pool/{poolid}      # 특정 풀                                  |
|   |                                                                     |
|   +-- /sdn                    # SDN                                      |
|       +-- /sdn/zones/{zone}   # 특정 SDN 존                              |
|       +-- /sdn/vnets/{vnet}   # 특정 VNet                                |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 5.5 ACL 관리

```bash
# ACL 목록 조회
pveum acl list

# 사용자에게 역할 부여
pveum acl modify /vms -user developer1@pve -role PVEVMUser

# 그룹에게 역할 부여
pveum acl modify /vms -group developers -role PVEVMAdmin

# 토큰에게 역할 부여
pveum acl modify /vms -token 'joe@pve!monitoring' -role PVEAuditor

# 특정 VM에만 권한 부여
pveum acl modify /vms/100 -user testuser@pve -role PVEVMUser

# 특정 스토리지 권한
pveum acl modify /storage/local-lvm -user developer1@pve -role PVEDatastoreUser

# 특정 노드 권한
pveum acl modify /nodes/node1 -user operator@pve -role PVESysAdmin

# 풀 권한
pveum acl modify /pool/dev-pool -group developers -role PVEAdmin

# 권한 전파 비활성화 (하위 객체에 상속 안 함)
pveum acl modify /vms -user developer1@pve -role PVEVMAdmin -propagate 0

# ACL 삭제
pveum acl delete /vms -user developer1@pve -role PVEVMUser
```

### 5.6 커스텀 역할 생성

```bash
# 커스텀 역할 생성
pveum role add VM_PowerOnly -privs "VM.PowerMgmt VM.Console VM.Audit"

# 역할 수정
pveum role modify VM_PowerOnly -privs "VM.PowerMgmt VM.Console VM.Audit VM.Config.CDROM"

# 역할 조회
pveum role list

# 역할 삭제
pveum role delete VM_PowerOnly
```

---

## 6. 권한 상속 및 우선순위

### 6.1 상속 규칙

```
+-------------------------------------------------------------------------+
|                      Permission Inheritance Rules                        |
+-------------------------------------------------------------------------+
|                                                                         |
|   1. 사용자 권한은 항상 그룹 권한보다 우선                                 |
|                                                                         |
|   2. 그룹 권한은 사용자가 해당 그룹의 멤버일 때 적용                       |
|                                                                         |
|   3. 더 깊은 경로의 권한이 상위 경로 권한을 대체                          |
|                                                                         |
|   4. NoAccess 역할은 해당 경로의 모든 다른 역할을 취소                    |
|                                                                         |
|   5. 권한 분리 토큰은 사용자 권한을 초과할 수 없음                        |
|                                                                         |
+-------------------------------------------------------------------------+
|                                                                         |
|   예시:                                                                  |
|                                                                         |
|   /              -> @admins: Administrator                              |
|   /vms           -> @developers: PVEVMAdmin                             |
|   /vms/100       -> user1@pve: NoAccess                                 |
|                                                                         |
|   결과:                                                                  |
|   - admins 그룹: 전체 관리자 권한                                        |
|   - developers 그룹: /vms 하위 모든 VM 관리 권한                         |
|   - user1@pve (developers 멤버): VM 100 접근 불가, 나머지 VM 관리 가능   |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 6.2 실제 권한 계산

```bash
# 사용자의 실제 권한 확인
pveum user permissions developer1@pve

# 출력 예시:
# /: 
# /vms: VM.Allocate,VM.Audit,VM.Backup,...
# /vms/100: (none)
# /storage/local: Datastore.Audit

# 특정 경로의 권한 확인
pveum user permissions developer1@pve --path /vms/101

# 토큰 권한 확인
pveum user token permissions joe@pve monitoring
```

---

## 7. 2단계 인증 (TFA)

### 7.1 TFA 유형

```
+-------------------------------------------------------------------------+
|                     Two-Factor Authentication Types                      |
+-------------------------------------------------------------------------+
|                                                                         |
|   +-------------------+------------------------------------------+      |
|   |      Type         |              Description                  |      |
|   +-------------------+------------------------------------------+      |
|   | TOTP              | 시간 기반 일회용 비밀번호                   |      |
|   |                   | Google Authenticator, FreeOTP 등 사용      |      |
|   +-------------------+------------------------------------------+      |
|   | WebAuthn          | 하드웨어 보안 키 (YubiKey, TPM 등)         |      |
|   |                   | FIDO2/WebAuthn 표준                       |      |
|   +-------------------+------------------------------------------+      |
|   | YubiKey OTP       | YubiKey 전용 OTP (영역 레벨 강제)          |      |
|   +-------------------+------------------------------------------+      |
|   | Recovery Keys     | 일회용 복구 키 (비상용)                    |      |
|   +-------------------+------------------------------------------+      |
|   | U2F (Legacy)      | 레거시 - WebAuthn으로 전환 권장            |      |
|   +-------------------+------------------------------------------+      |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 7.2 TOTP 설정

```bash
# TOTP 키 생성 (명령행)
oathkeygen  # Base32 형식의 키 출력

# GUI에서 설정:
# Datacenter -> Permissions -> Two Factor -> Add -> TOTP
# 1. 키 생성 (Randomize)
# 2. QR 코드를 앱으로 스캔
# 3. 현재 OTP 코드 입력하여 검증
# 4. Apply

# 사용자별 TFA 확인
pveum user tfa list joe@pve
```

### 7.3 WebAuthn 설정

```bash
# 서버 설정 (/etc/pve/datacenter.cfg)
webauthn: rp=pve.example.com,origin=https://pve.example.com:8006,id=pve.example.com

# GUI에서 설정:
# Datacenter -> Options -> WebAuthn Settings
# - Relying Party: pve.example.com
# - Origin: https://pve.example.com:8006
# - ID: pve.example.com

# 사용자가 보안 키 등록:
# Datacenter -> Permissions -> Two Factor -> Add -> WebAuthn
# 보안 키 터치하여 등록
```

### 7.4 영역 레벨 TFA 강제

```bash
# 영역에 TFA 강제 적용 (TOTP)
pveum realm modify pve --tfa type=totp

# YubiKey OTP 강제
pveum realm modify pve --tfa type=yubico

# YubiKey 설정 (Yubico API 필요)
pveum realm modify pve --tfa "type=yubico,id=YOUR_API_ID,key=YOUR_API_KEY"
```

### 7.5 복구 키

```bash
# 복구 키 생성 (GUI에서만 가능)
# Datacenter -> Permissions -> Two Factor -> Add -> Recovery Keys
# 생성된 키를 안전한 곳에 보관

# 복구 키 사용:
# 로그인 시 OTP 대신 복구 키 입력
# 각 키는 한 번만 사용 가능
```

### 7.6 TFA 잠금 해제

```bash
# 사용자 TFA 잠금 해제 (관리자)
pveum user tfa unlock joe@pve

# 잠금 조건:
# - TOTP: 8회 실패 시 잠금
# - WebAuthn/Recovery: 100회 실패 시 1시간 차단
```

---

## 8. 리소스 풀

### 8.1 풀 개념

```
+-------------------------------------------------------------------------+
|                         Resource Pool Concept                            |
+-------------------------------------------------------------------------+
|                                                                         |
|   +-------------------+                                                 |
|   |   Resource Pool   |                                                 |
|   |    (dev-pool)     |                                                 |
|   +--------+----------+                                                 |
|            |                                                            |
|            | contains                                                   |
|            |                                                            |
|   +--------v----------+                                                 |
|   | - VM 100          |                                                 |
|   | - VM 101          |                                                 |
|   | - CT 200          |                                                 |
|   | - Storage: local  |                                                 |
|   +-------------------+                                                 |
|                                                                         |
|   Permissions on /pool/dev-pool apply to all members                    |
|                                                                         |
|   예: @developers: PVEAdmin on /pool/dev-pool                           |
|       -> VM 100, 101, CT 200, local storage 모두 관리 가능              |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 8.2 풀 관리

```bash
# 풀 생성
pveum pool add dev-pool --comment "Development Resources"
pveum pool add prod-pool --comment "Production Resources"

# 풀 목록 조회
pveum pool list

# 풀에 VM/CT 추가 (VM 설정에서)
qm set 100 --pool dev-pool
pct set 200 --pool dev-pool

# 풀에 스토리지 추가
pveum pool modify dev-pool --storage local-lvm

# 풀에 권한 부여
pveum acl modify /pool/dev-pool -group developers -role PVEAdmin

# 풀 삭제
pveum pool delete dev-pool
```

---

## 9. 실전 시나리오

### 9.1 관리자 그룹 설정

```bash
# 관리자 그룹 생성
pveum group add sysadmins -comment "System Administrators"

# 관리자 역할 부여
pveum acl modify / -group sysadmins -role Administrator

# 관리자 추가
pveum user add admin1@pve -group sysadmins
pveum passwd admin1@pve
```

### 9.2 개발팀 환경 구성

```bash
# 개발팀 그룹 생성
pveum group add developers -comment "Development Team"

# 개발용 풀 생성
pveum pool add dev-pool --comment "Development Pool"

# 개발팀에 풀 관리 권한 부여
pveum acl modify /pool/dev-pool -group developers -role PVEAdmin

# 개발팀 스토리지 접근 권한
pveum acl modify /storage/local-lvm -group developers -role PVEDatastoreUser

# 개발자 추가
pveum user add dev1@pve -group developers
pveum user add dev2@pve -group developers
```

### 9.3 감사자 (Auditor) 설정

```bash
# 감사자 사용자 생성
pveum user add auditor@pve -comment "Security Auditor"

# 전체 읽기 권한 부여
pveum acl modify / -user auditor@pve -role PVEAuditor
```

### 9.4 위임된 사용자 관리

```bash
# 사용자 관리자 생성
pveum user add useradmin@pve -comment "User Administrator"

# 특정 영역과 그룹에 대한 사용자 관리 권한
pveum acl modify /access/realm/pve -user useradmin@pve -role PVEUserAdmin
pveum acl modify /access/groups/developers -user useradmin@pve -role PVEUserAdmin

# useradmin은 이제 pve 영역의 developers 그룹 사용자만 관리 가능
```

### 9.5 모니터링용 제한된 API 토큰

```bash
# 사용자에게 VM 관리 권한 부여
pveum acl modify /vms -user operator@pve -role PVEVMAdmin

# 모니터링 전용 토큰 생성 (권한 분리)
pveum user token add operator@pve monitoring -privsep 1

# 토큰에 읽기 전용 권한만 부여
pveum acl modify /vms -token 'operator@pve!monitoring' -role PVEAuditor
pveum acl modify /nodes -token 'operator@pve!monitoring' -role PVEAuditor
pveum acl modify /storage -token 'operator@pve!monitoring' -role PVEAuditor

# 권한 확인
pveum user permissions operator@pve           # VM 관리 권한
pveum user token permissions operator@pve monitoring  # 읽기만 가능
```

### 9.6 LDAP 통합 시나리오

```bash
# LDAP 영역 설정
pveum realm add company-ldap --type ldap \
  --base_dn "ou=People,dc=company,dc=com" \
  --user_attr uid \
  --server1 ldap.company.com \
  --group_name_attr cn \
  --group_classes posixGroup

# 동기화 기본 설정
pveum realm modify company-ldap \
  --sync-defaults-options "enable-new=1,scope=both"

# 초기 동기화
pveum realm sync company-ldap

# LDAP 그룹에 권한 부여 (그룹명에 -company-ldap 접미사 붙음)
pveum acl modify /vms -group developers-company-ldap -role PVEVMAdmin

# 정기 동기화 (cron)
# 0 */6 * * * root /usr/bin/pveum realm sync company-ldap --scope both
```

---

## 10. 명령어 참조

### 10.1 pveum 주요 명령어

```bash
# 사용자 관리
pveum user add <userid> [options]
pveum user modify <userid> [options]
pveum user delete <userid>
pveum user list [--full]
pveum passwd <userid>
pveum user permissions <userid> [--path <path>]

# 그룹 관리
pveum group add <groupid> [options]
pveum group modify <groupid> [options]
pveum group delete <groupid>
pveum group list

# 역할 관리
pveum role add <roleid> --privs <privileges>
pveum role modify <roleid> --privs <privileges>
pveum role delete <roleid>
pveum role list

# ACL 관리
pveum acl modify <path> [-user|-group|-token] <id> -role <role> [options]
pveum acl delete <path> [-user|-group|-token] <id> -role <role>
pveum acl list

# API 토큰
pveum user token add <userid> <tokenid> [options]
pveum user token remove <userid> <tokenid>
pveum user token list <userid> [<tokenid>]
pveum user token permissions <userid> <tokenid>

# 영역 관리
pveum realm add <realmid> --type <type> [options]
pveum realm modify <realmid> [options]
pveum realm delete <realmid>
pveum realm list
pveum realm sync <realmid> [options]

# 풀 관리
pveum pool add <poolid> [options]
pveum pool modify <poolid> [options]
pveum pool delete <poolid>
pveum pool list

# TFA 관리
pveum user tfa list <userid>
pveum user tfa unlock <userid>
```

### 10.2 설정 파일 위치

```
+-----------------------------+------------------------------------------+
|          File               |              Description                  |
+-----------------------------+------------------------------------------+
| /etc/pve/user.cfg           | 사용자, 그룹, ACL, 풀 설정                 |
| /etc/pve/domains.cfg        | 인증 영역 설정                            |
| /etc/pve/priv/shadow.cfg    | PVE 영역 비밀번호 해시                    |
| /etc/pve/priv/realm/<name>.pw| LDAP/AD Bind 비밀번호                    |
| /etc/pve/datacenter.cfg     | WebAuthn/U2F 설정                        |
| /etc/pve/priv/tfa.cfg       | TFA 설정                                 |
+-----------------------------+------------------------------------------+
```

---

## 11. 모범 사례

### 11.1 보안 권장사항

```
+-------------------------------------------------------------------------+
|                      Security Best Practices                             |
+-------------------------------------------------------------------------+
|                                                                         |
|   1. root@pam 사용 최소화                                                |
|      - 일상 업무에 개인 계정 사용                                         |
|      - root는 비상시에만 사용                                            |
|                                                                         |
|   2. 최소 권한 원칙                                                      |
|      - 필요한 최소한의 권한만 부여                                        |
|      - 커스텀 역할로 세분화된 권한 관리                                   |
|                                                                         |
|   3. 그룹 기반 권한 관리                                                 |
|      - 개별 사용자 대신 그룹에 권한 부여                                  |
|      - 역할 변경 시 그룹 멤버십만 변경                                    |
|                                                                         |
|   4. 2단계 인증 필수화                                                   |
|      - 모든 관리자 계정에 TFA 설정                                       |
|      - 복구 키 안전하게 보관                                             |
|                                                                         |
|   5. API 토큰 보안                                                       |
|      - 권한 분리(privsep) 사용                                           |
|      - 만료일 설정                                                       |
|      - 불필요한 토큰 정기적 정리                                          |
|                                                                         |
|   6. 정기적인 감사                                                       |
|      - 사용자/권한 목록 주기적 검토                                       |
|      - 비활성 계정 비활성화 또는 삭제                                     |
|                                                                         |
+-------------------------------------------------------------------------+
```

### 11.2 LDAP/AD 통합 팁

```bash
# 1. 테스트 먼저 수행
pveum realm sync company-ldap --dry-run

# 2. 서비스 계정 사용
# - 읽기 전용 권한만 있는 전용 계정 사용
# - 비밀번호 정기 변경 정책 수립

# 3. 그룹 필터로 범위 제한
pveum realm modify company-ldap \
  --group_filter "(&(objectClass=group)(cn=PVE_*))"

# 4. 동기화 자동화 (crontab)
0 */6 * * * /usr/bin/pveum realm sync company-ldap --scope both 2>&1 | logger -t pveum-sync

# 5. 인증 실패 시 폴백
# - 로컬 관리자 계정 유지 (LDAP 장애 대비)
```

---

## 12. 요약

### 12.1 핵심 개념

| 개념 | 설명 |
|------|------|
| 사용자 ID | `username@realm` 형식 |
| 영역 (Realm) | 인증 백엔드 (PAM, PVE, LDAP, AD, OpenID) |
| 그룹 | 사용자 집합, 권한 관리 단위 |
| 역할 | 권한(Privilege) 집합 |
| 권한 | 특정 작업 수행 권리 |
| 경로 | 권한이 적용되는 객체 |
| ACL | (경로, 주체, 역할) 조합 |
| 풀 | VM/CT/Storage 논리적 그룹 |

### 12.2 권한 적용 흐름

```
사용자 로그인 -> 영역에서 인증 -> 사용자/그룹 확인 -> ACL 조회 -> 
역할 -> 권한 -> 요청된 작업에 해당 권한 있는지 확인 -> 허용/거부
```

---

## 다음 모듈 예고

**Module 9: Ceph Cluster**에서는 다음을 학습합니다:
- Ceph 아키텍처 (MON, OSD, MDS, MGR)
- Proxmox VE에서 Ceph 배포 (pveceph 명령)
- Pool 구성 및 CRUSH 규칙
- CephFS 공유 스토리지
- RBD VM 디스크
- Ceph 모니터링 및 유지보수
