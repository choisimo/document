# Sourcebot 설정 가이드

## 1. 환경 변수 설정

1. `env.example` 파일을 `.env`로 복사:
   ```bash
   cp env.example .env
   ```

2. `.env` 파일을 편집하여 실제 API 키들을 입력:
   - `GITHUB_TOKEN`: GitHub Personal Access Token
   - `OPENROUTER_API_KEY`: OpenRouter API 키
   - `GEMINI_API_KEY`: Google Gemini API 키

## 2. GitHub 연결 설정

`config.json` 파일에서 `connections.github-connection.repos` 배열에 인덱싱할 저장소를 추가:

```json
"repos": [
  "your-username/your-repo",
  "organization/another-repo"
]
```

또는 조직 전체를 인덱싱하려면:

```json
"orgs": ["your-organization"],
"topics": ["core", "docs"]  // 선택사항: 특정 토픽만
```

## 3. 실행 방법

### Docker Compose 사용 (권장):
```bash
docker-compose up -d
```

### 직접 Docker 실행:
```bash
docker run -d \
  --name sourcebot \
  -p 3333:3333 \
  -v $(pwd):/data \
  --env-file .env \
  -e CONFIG_PATH=/data/config.json \
  ghcr.io/sourcebot-dev/sourcebot:latest
```

## 4. 접속

브라우저에서 `http://localhost:3333`으로 접속

## 5. AI Agent 연동 (MCP)

Claude 등에서 MCP 서버로 등록:

```bash
claude mcp add-json "sourcebot" '{
  "command":"docker",
  "args":[
    "run","-p","3333:3333","--pull=always","--rm",
    "-v","${workspaceFolder}:/data",
    "-e","CONFIG_PATH=/data/config.json",
    "--name","sourcebot",
    "ghcr.io/sourcebot-dev/sourcebot:latest"
  ]
}'
```

## 6. 컨테이너 관리

- 중지: `docker-compose down`
- 재시작: `docker-compose restart`
- 로그 확인: `docker-compose logs -f`
