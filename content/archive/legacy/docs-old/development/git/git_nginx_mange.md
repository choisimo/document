# Git을 이용한 Nginx 서버 다중 관리 가이드

Github 저장소를 사용하여 여러 서버의 Nginx 구성을 자동으로 관리하고 배포하는 전략을 설명합니다.

## 배포 차단 조건

현재 GitHub Actions 예시는 러너에서 저장소를 checkout하지만 원격 서버의 `/tmp/nginx-repo`로 파일을 전달하거나 checkout하지 않은 채 그 경로를 복사한다. 또한 `conf.d/*` 또는 `/etc/nginx`를 먼저 삭제해 후보 설정 검증에 실패해도 기존 설정을 잃을 수 있다. 따라서 이 예시는 그대로 실행하지 않는다. 배포는 대상 revision 고정, 원격 임시 경로 전달, 기존 설정 백업, 후보 설정 검사, 활성 경로 전환, reload, 상태 확인, 실패 시 복원 순서로 구현해야 하며 각 서버의 성공·실패를 별도로 기록한다.

## 1. 작동 원리: Git Push 기반 자동 배포

Git 저장소에 변경사항을 푸시하면 해당 서버에 자동으로 배포되는 시스템은 주로 CI/CD 파이프라인(예: GitHub Actions)을 통해 구현됩니다.

**기본 워크플로우:**
1.  개발자가 로컬에서 Nginx 설정을 변경하고 커밋/푸시합니다.
2.  Git 저장소(GitHub)는 푸시 이벤트를 감지하고 워크플로우를 트리거합니다.
3.  워크플로우는 변경된 파일을 분석하여 어떤 서버가 영향을 받는지 결정합니다.
4.  대상 서버에 SSH로 접속하여 변경사항을 적용(Pull)하고 Nginx를 리로드합니다.

### 추천 디렉터리 구조
```text
/
├── servers/
│   ├── server1/
│   │   ├── nginx.conf
│   │   └── conf.d/
│   ├── server2/
│   │   ├── nginx.conf
│   │   └── conf.d/
│   └── server3/
│       ├── nginx.conf
│       └── conf.d/
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## 2. GitHub Actions를 이용한 자동화

`.github/workflows/deploy.yml` 파일을 생성하여 배포를 자동화할 수 있습니다.

**워크플로우 예시 (deploy.yml):**

```yaml
name: Deploy Server Configs

on:
  push:
    branches: [ main ]
    paths:
      - 'servers/**'

jobs:
  identify-servers:
    runs-on: ubuntu-latest
    outputs:
      affected-servers: ${{ steps.set-servers.outputs.servers }}
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 2
      
      - id: set-servers
        name: Identify affected servers
        run: |
          # 변경된 파일 목록에서 서버 이름 추출
          CHANGED_FILES=$(git diff --name-only HEAD^ HEAD)
          AFFECTED_SERVERS=$(echo "$CHANGED_FILES" | grep -o 'servers/[^/]*' | sort | uniq | sed 's/servers\///' | jq -R -s -c 'split("\n")[:-1]')
          echo "servers=$AFFECTED_SERVERS" >> $GITHUB_OUTPUT
  
  deploy:
    needs: identify-servers
    runs-on: ubuntu-latest
    strategy:
      matrix:
        server: ${{ fromJson(needs.identify-servers.outputs.affected-servers) }}
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST_PREFIX }}${{ matrix.server }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /etc/nginx
            # 기존 설정 백업 또는 삭제 후 새 설정 적용
            rm -rf conf.d/*
            cp -r /tmp/nginx-repo/servers/${{ matrix.server }}/* .
            nginx -t && systemctl reload nginx
```

이 워크플로우는 변경된 서버를 감지하여 병렬로 배포를 실행합니다.

---

## 3. 서버별 구성 관리 전략 (Pull/Clone)

각 서버에서 전체 저장소를 받는 대신, 필요한 구성만 가져오는 두 가지 효율적인 방법이 있습니다.

### 방법 1: Git Sparse Checkout 사용 (단일 브랜치)
하나의 `main` 브랜치에서 모든 설정을 관리하되, 서버는 필요한 폴더만 체크아웃합니다.

```bash
# 1. 저장소 초기화
mkdir -p /etc/nginx/git-config
cd /etc/nginx/git-config
git init
git remote add origin https://github.com/your-username/nginx-configs.git

# 2. Sparse Checkout 활성화
git config core.sparseCheckout true

# 3. 가져올 경로 지정 (해당 서버 설정 + 공통 설정)
echo "servers/server1/*" > .git/info/sparse-checkout
echo "common/*" >> .git/info/sparse-checkout

# 4. Pull
git pull origin main

# 5. 설정 적용
cp -r servers/server1/* /etc/nginx/
cp -r common/* /etc/nginx/common/
```

### 방법 2: 서버별 브랜치 사용 (Branching)
각 서버마다 별도의 브랜치(`server1`, `server2`)를 운영합니다.

**개발자 PC에서 브랜치 생성:**
```bash
git checkout main
git checkout -b server1-config
# server1 설정 추가/수정
git push origin server1-config
```

**서버에서 해당 브랜치만 Clone:**
```bash
# --single-branch 옵션으로 특정 브랜치만 가져옴 (용량 절약)
git clone -b server1-config --single-branch https://github.com/your-username/nginx-configs.git /etc/nginx/git-config
```

---

## 4. 자동 Pull 스크립트 (Cron)

서버가 주기적으로 최신 설정을 가져오도록 스크립트를 작성하여 Cron에 등록할 수 있습니다.

**업데이트 스크립트 (update-nginx-config.sh):**
```bash
#!/bin/bash
SERVER_NAME="server1"
REPO_DIR="/etc/nginx/git-config"
NGINX_DIR="/etc/nginx"

# 저장소 없으면 초기 설정, 있으면 Pull
if [ ! -d "$REPO_DIR" ]; then
  mkdir -p $REPO_DIR
  cd $REPO_DIR
  git init
  git remote add origin https://github.com/your-username/nginx-configs.git
  git config core.sparseCheckout true
  echo "servers/$SERVER_NAME/*" > .git/info/sparse-checkout
  git pull origin main
else
  cd $REPO_DIR
  git pull origin main
fi

# 변경 사항이 있을 때만 적용하는 로직 추가 가능
cp -r $REPO_DIR/servers/$SERVER_NAME/* $NGINX_DIR/
nginx -t && systemctl reload nginx
```

**Cron 등록 (1시간마다 실행):**
```cron
0 * * * * /usr/local/bin/update-nginx-config.sh >> /var/log/nginx-update.log 2>&1
```

---

## 5. 실전 가이드: 서버별 브랜치 운영

다른 서버(`server2`) 설정을 위한 구체적인 절차입니다.

### 5.1. 서버별 브랜치 생성 및 푸시
```bash
# 현재 서버(server1) 설정 커밋
sudo git add .
sudo git commit -m "Initial commit for server1"
sudo git branch -M server1
sudo git push -u origin server1

# server2 브랜치 생성
sudo git checkout -b server2
# server2에 맞게 설정 수정
sudo git push -u origin server2
```

### 5.2. 서버에서 브랜치 Clone
`server2` 서버에 접속하여 실행합니다.

```bash
cd /etc
sudo rm -rf nginx # 주의: 기존 설정 삭제됨
sudo git clone --single-branch --branch server2 git@github.com:choisimo/nginx-settings.git nginx
```

### 5.3. 브랜치 추가하기
이미 Single Branch로 클론된 상태에서 다른 브랜치를 가져와야 할 경우:

```bash
sudo git remote set-branches --add origin another-branch
sudo git fetch origin another-branch:another-branch
```

### 주의사항
1.  **권한**: `/etc/nginx`는 root 권한이 필요하므로 `sudo`를 사용해야 합니다.
2.  **SSH 키**: 프라이빗 리포지토리를 사용하는 경우, 각 서버의 SSH 퍼블릭 키를 GitHub의 Deploy Keys에 등록해야 합니다.
3.  **Single Branch**: `--single-branch`로 클론하면 다른 브랜치로 쉽게 전환할 수 없으므로(remote 설정 필요), 용도에 맞게 사용하세요.
