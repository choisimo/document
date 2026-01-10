다른 서버에서 특정 브랜치(server2)만 사용하도록 설정하는 방법을 안내해드리겠습니다.

## 현재 서버의 Git 설정 완료하기

먼저 현재 서버에서 remote를 올바르게 추가해야 합니다:

```bash
sudo git remote add origin git@github.com:choisimo/nginx-settings.git
```

여기서 `origin`은 원격 저장소의 이름입니다. 현재 명령어에서 이 부분이 빠져 있어 오류가 발생했습니다.

## 서버별 브랜치 설정 방법

1. 현재 서버에서 설정 파일을 커밋하고 서버별 브랜치를 생성합니다:
   ```bash
   sudo git add .
   sudo git commit -m "Initial commit for server1"
   sudo git branch -M server1  # 현재 서버의 브랜치 이름 변경
   sudo git push -u origin server1
   
   # server2 브랜치도 생성 (필요한 경우)
   sudo git checkout -b server2
   # server2에 맞는 설정 변경 후
   sudo git push -u origin server2
   
   # 다시 원래 브랜치로 돌아가기
   sudo git checkout server1
   ```

## 다른 서버에서 특정 브랜치만 클론하기

다른 서버(server2)에서는 해당 서버에 맞는 브랜치만 클론할 수 있습니다:

```bash
# server2에서 실행
cd /etc
sudo rm -rf nginx  # 기존 nginx 폴더 백업 후 삭제
sudo git clone --single-branch --branch server2 git@github.com:choisimo/nginx-settings.git nginx
```

이 명령은 `--single-branch` 옵션을 사용하여 'server2' 브랜치만 클론합니다[2][3]. 이 방식을 사용하면:

- 지정한 브랜치(server2)만 다운로드됩니다[3][5]
- 다른 브랜치의 정보는 가져오지 않습니다[5]
- 저장소 크기가 작아지고 클론 속도가 빨라집니다[3]

## 서버별 설정 업데이트 방법

각 서버에서 구성을 업데이트하는 경우:

```bash
# 변경사항 커밋 및 푸시
cd /etc/nginx
sudo git add .
sudo git commit -m "Update server2 configuration"
sudo git push origin server2

# 다른 서버에서 업데이트 가져오기
cd /etc/nginx
sudo git pull
```

## 새로운 브랜치 추가 필요시

이미 single-branch로 클론한 저장소에 다른 브랜치를 추가해야 할 경우:

```bash
# 다른 브랜치 추가하기
sudo git remote set-branches --add origin another-branch
sudo git fetch origin another-branch:another-branch
```

이 명령으로 특정 브랜치만 추가로 가져올 수 있습니다[4].

## 주의사항

1. 단일 브랜치 클론 시 해당 브랜치만 존재하므로 다른 브랜치로 전환하려면 추가 설정이 필요합니다[3]
2. SSH 키가 각 서버에 올바르게 설정되어 있어야 GitHub 저장소에 접근할 수 있습니다
3. `/etc/nginx` 디렉토리의 권한 문제를 피하기 위해 모든 Git 명령에 `sudo`를 사용해야 합니다

이 방식을 사용하면 각 서버가 자신의 구성 브랜치만 관리하면서도 중앙 저장소를 통해 모든 서버의 구성을 효율적으로 관리할 수 있습니다.


---

Github 저장소를 사용하여 여러 서버의 Nginx 구성을 자동으로 관리하는 방법을 설명해드리겠습니다.

## Git Push 시 서버별 자동 배포 원리

Git 저장소에 변경사항을 푸시하면 해당 서버에 자동으로 배포되는 시스템은 주로 CI/CD 파이프라인(예: GitHub Actions)을 통해 구현됩니다[2][3]. 기본적인 작동 원리는 다음과 같습니다:

1. 개발자가 로컬에서 변경사항을 커밋하고 푸시합니다
2. Git 저장소는 푸시 이벤트를 감지하고 설정된 워크플로우를 트리거합니다
3. 워크플로우는 변경된 파일을 분석하여 영향받는 서버를 결정합니다
4. SSH나 다른 방법을 통해 해당 서버에 접속하여 변경사항을 적용합니다

**서버별 디렉토리 구조 예시:**
```
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

## GitHub Actions 설정 방법

GitHub Actions를 사용하여 서버별 자동 배포를 구현하려면:

1. 프로젝트 루트에 `.github/workflows` 디렉토리를 생성합니다[2]
2. 해당 디렉토리에 워크플로우 YAML 파일을 생성합니다(예: `deploy.yml`)

다음은 서버별로 다른 구성을 배포하는 워크플로우 파일 예시입니다:

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
          CHANGED_FILES=$(git diff --name-only HEAD^ HEAD)
          AFFECTED_SERVERS=$(echo "$CHANGED_FILES" | grep -o 'servers/[^/]*' | sort | uniq | sed 's/servers\///' | jq -R -s -c 'split("\n")[:-1]')
          echo "servers=$AFFECTED_SERVERS" >> $GITHUB_OUTPUT
          echo "Affected servers: $AFFECTED_SERVERS"
  
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
            rm -rf conf.d/*
            cp -r /tmp/nginx-repo/servers/${{ matrix.server }}/* .
            nginx -t && systemctl reload nginx
```

이 워크플로우는 다음을 수행합니다:
- 변경된 파일을 분석하여 영향받는 서버를 식별합니다
- 각 서버에 대해 병렬로 배포 작업을 실행합니다
- SSH를 통해 서버에 접속하여 구성 파일을 업데이트합니다[3][4]

## 서버 특정 구성만 Pull/Clone 하는 방법

각 서버에서는 전체 저장소가 아닌 자신에게 해당하는 구성만 가져오는 것이 효율적입니다. 이를 구현하는 두 가지 방법이 있습니다:

### 1. Git Sparse Checkout 사용

Sparse checkout을 사용하면 저장소의 특정 부분만 체크아웃할 수 있습니다:

```bash
# 서버에서 최초 설정
mkdir -p /etc/nginx/git-config
cd /etc/nginx/git-config
git init
git remote add origin https://github.com/your-username/nginx-configs.git

# Sparse checkout 설정
git config core.sparseCheckout true
echo "servers/server1/*" > .git/info/sparse-checkout
echo "common/*" >> .git/info/sparse-checkout

# 저장소 내용 가져오기
git pull origin main

# 적절한 위치로 파일 복사
cp -r servers/server1/* /etc/nginx/
cp -r common/* /etc/nginx/common/
```

### 2. 서버별 브랜치 사용

각 서버마다 별도의 브랜치를 사용하는 방식도 가능합니다:

```bash
# 메인 브랜치에서 서버별 브랜치 생성 (개발 머신에서)
git checkout main
git checkout -b server1-config
git push origin server1-config

# 서버에서는 해당 브랜치만 클론
git clone -b server1-config --single-branch https://github.com/your-username/nginx-configs.git /etc/nginx/git-config
```

## 자동 Pull 스크립트 구성

각 서버에서 최신 구성을 자동으로 가져오는 스크립트를 작성할 수 있습니다:

```bash
#!/bin/bash
# /usr/local/bin/update-nginx-config.sh
SERVER_NAME="server1"
REPO_DIR="/etc/nginx/git-config"
NGINX_DIR="/etc/nginx"

# 저장소가 없으면 초기 설정
if [ ! -d "$REPO_DIR" ]; then
  mkdir -p $REPO_DIR
  cd $REPO_DIR
  git init
  git remote add origin https://github.com/your-username/nginx-configs.git
  git config core.sparseCheckout true
  echo "servers/$SERVER_NAME/*" > .git/info/sparse-checkout
  echo "common/*" >> .git/info/sparse-checkout
  git pull origin main
else
  # 이미 설정되어 있으면 최신 변경사항만 가져오기
  cd $REPO_DIR
  git pull origin main
fi

# 구성 파일 복사
cp -r $REPO_DIR/servers/$SERVER_NAME/* $NGINX_DIR/
cp -r $REPO_DIR/common/* $NGINX_DIR/common/

# Nginx 설정 테스트 및 리로드
nginx -t && systemctl reload nginx
```

이 스크립트를 cron에 등록하여 주기적으로 실행할 수 있습니다:

```
# 매시간 구성 업데이트
0 * * * * /usr/local/bin/update-nginx-config.sh >> /var/log/nginx-update.log 2>&1
```

## 웹훅을 사용한 실시간 업데이트

더 빠른 업데이트를 위해 웹훅을 구현할 수도 있습니다:

1. 서버에 간단한 웹 서버를 설정합니다(보안을 위해 적절히 보호)
2. GitHub 저장소에 웹훅을 설정하여 푸시 시 서버의 엔드포인트를 호출하도록 합니다
3. 서버에서는 웹훅을 받으면 위의 업데이트 스크립트를 실행합니다

이 방식을 통해 개발자가 변경사항을 푸시하면 해당 서버에 즉시 변경사항이 적용됩니다.

이 모든 접근법을 조합하면 여러 서버의 Nginx 구성을 효율적으로 관리하고 자동화할 수 있습니다.


---


# Nginx 서버별 GitHub 통합 관리 방법

GitHub을 사용하여 여러 서버의 Nginx 구성을 모듈화하여 관리하는 방법을 알려드리겠습니다. 이 접근법은 구성 파일의 일관성을 유지하고 변경 사항을 효율적으로 관리할 수 있게 해줍니다.

## 효과적인 디렉토리 구조 설계

GitHub 저장소에서 다음과 같은 서버별 모듈화 구조를 구현할 수 있습니다:

```
/
├── servers/
│   ├── server1/
│   │   ├── nginx.conf
│   │   ├── conf.d/
│   │   │   ├── site1.conf
│   │   │   └── site2.conf
│   │   └── snippets/
│   │       ├── ssl-params.conf
│   │       └── proxy-params.conf
│   ├── server2/
│   │   ├── nginx.conf
│   │   ├── conf.d/
│   │   │   └── ...
│   │   └── snippets/
│   │       └── ...
│   └── ...
├── common/
│   ├── snippets/
│   │   ├── ssl-params.conf
│   │   └── security-headers.conf
│   └── templates/
│       └── proxy-template.conf
└── deploy/
    └── github-actions-workflow.yml
```

이 구조는 각 서버의 구성을 분리하면서도 공통 설정을 재사용할 수 있게 해줍니다[7].

## 구성 모듈화 전략

모듈화된 구성 파일을 사용하여 코드 중복을 줄이고 관리를 간소화할 수 있습니다:

**1. 공통 스니펫 사용**

재사용 가능한 구성 요소(SSL 설정, 프록시 파라미터 등)를 `common/snippets/` 디렉토리에 저장합니다[7].

```nginx
# common/snippets/ssl-params.conf
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_session_timeout 10m;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

**2. 서버별 구성 파일**

각 서버의 특정 설정을 해당 서버 디렉토리에 저장합니다:

```nginx
# servers/server1/conf.d/example.com.conf
server {
    listen 443 ssl;
    server_name example.com;
    
    include /etc/nginx/snippets/ssl-params.conf;
    
    ssl_certificate /etc/nginx/ssl/example.com.crt;
    ssl_certificate_key /etc/nginx/ssl/example.com.key;
    
    location / {
        # 서버별 특정 설정
    }
}
```

## GitHub을 통한 배포 자동화

GitHub Actions를 사용하여 구성 변경 사항을 각 서버에 자동으로 배포할 수 있습니다:

**1. GitHub Actions 워크플로우 설정**

```yaml
name: Deploy Nginx Configs

on:
  push:
    branches: [ main ]
    paths:
      - 'servers/**'
      - 'common/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        server: [server1, server2, server3]
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Prepare Config Files
        run: |
          echo "NGINX_CONF_CONFIG_FILE=`cat servers/${{ matrix.server }}/nginx.conf | base64 -w 0`" >> $GITHUB_ENV
          # 필요한 다른 설정 파일들도 처리
          
      - name: Deploy to NGINX Instance
        run: |
          curl --location 'https://${{ vars.NMS_HOSTNAME }}/api/platform/v1/systems/${{ vars.SYSTEM_ID }}/instances/${{ vars.INSTANCE_ID }}/config' \
          --header "accept: application/json" \
          --header "Authorization: Basic ${{ env.NMS_LOGIN }}" \
          --header 'Content-Type: application/json' \
          --data '{
            "configFiles": {
              "rootDir": "/etc/nginx",
              "files": [
                {
                  "contents": "${{ env.NGINX_CONF_CONFIG_FILE }}",
                  "name": "/etc/nginx/nginx.conf"
                }
              ]
            },
            "externalIdType": "github",
            "externalId": "${{ github.sha }}"
          }'
```

이 워크플로우는 GitHub 저장소의 변경 사항을 감지하고 NGINX Instance Manager API를 통해 자동으로 서버에 배포합니다[6][8].

## 로컬 개발 및 동기화 방법

각 서버의 `/etc/nginx` 디렉토리를 GitHub 저장소와 연동하는 두 가지 접근 방식:

**1. Git을 직접 서버에 설치하여 관리**

```bash
# 각 서버에서 실행
cd /etc/nginx
git init
git remote add origin https://github.com/your-username/nginx-configs.git
git fetch origin
git checkout -b server1 origin/servers/server1
```

**2. 자동화된 Pull 스크립트 설정**

각 서버에 cron 작업을 설정하여 주기적으로 구성을 동기화:

```bash
#!/bin/bash
# /usr/local/bin/nginx-config-sync.sh
SERVER_NAME="server1"
REPO_DIR="/tmp/nginx-configs"
NGINX_DIR="/etc/nginx"

# 저장소 클론 또는 업데이트
if [ -d "$REPO_DIR" ]; then
  cd $REPO_DIR && git pull
else
  git clone https://github.com/your-username/nginx-configs.git $REPO_DIR
fi

# 서버별 구성 파일 복사
cp -R $REPO_DIR/servers/$SERVER_NAME/* $NGINX_DIR/
cp -R $REPO_DIR/common/snippets/* $NGINX_DIR/snippets/

# 구성 테스트 및 Nginx 재시작
nginx -t && systemctl reload nginx
```

이 스크립트를 cron에 등록하여 자동 동기화:

```
0 * * * * /usr/local/bin/nginx-config-sync.sh >> /var/log/nginx-sync.log 2>&1
```

## 글로벌 설정 관리

모든 서버에 적용되는 글로벌 설정은 `common` 디렉토리에서 관리하고 서버별 구성에서 포함시킬 수 있습니다[5].

이러한 접근 방식을 통해 여러 Nginx 서버의 구성을 체계적으로 관리하고, 변경 사항을 추적하며, 필요한 경우 빠르게 롤백할 수 있습니다.
