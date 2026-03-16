services:
  # Named volume은 기본적으로 root:root 소유/권한으로 생성됩니다.
  # langflow 이미지가 non-root로 실행되면 /var/lib/langflow 쓰기에서 Permission denied가 반복될 수 있어
  # 시작 전에 볼륨 권한을 보정하는 one-shot init 서비스를 둡니다.
  langflow-perms:
    image: busybox:1.36
    container_name: langflow-perms
    user: "0:0"
    restart: "no"
    volumes:
      - langflow-data:/var/lib/langflow
    command: ["sh", "-c", "chmod -R a+rwX /var/lib/langflow"]
    networks:
      - internal

  langflow:
    image: langflowai/langflow:latest
    container_name: langflow
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      langflow-perms:
        condition: service_completed_successfully
    environment:
      - LANGFLOW_DATABASE_URL=postgresql://langflow:${POSTGRES_PASSWORD}@postgres:5432/langflow
      - LANGFLOW_CONFIG_DIR=/var/lib/langflow
    volumes:
      - langflow-data:/var/lib/langflow
    networks:
      - internal
    # 로컬 접속이 필요할 때만 유지
    # ports:
    #   - "7860:7860"

  postgres:
    image: postgres:16
    container_name: langflow-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: langflow
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: langflow
    volumes:
      - langflow-db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U langflow -d langflow"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal
    # 외부 DB 접속이 필요할 때만 유지
    # ports:
    #   - "5432:5432"

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    depends_on:
      - langflow
    networks:
      - internal

volumes:
  langflow-data:
  langflow-db:

networks:
  internal:
    driver: bridge

