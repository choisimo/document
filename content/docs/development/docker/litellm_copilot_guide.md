# LiteLLM + GitHub Copilot Auto-Auth Setup Guide

This guide documents an environment-specific experiment that forwards a local VS Code Copilot credential to LiteLLM. Model names and availability depend on the account, extension, provider, and current authorization terms.

Being logged into GitHub Copilot does not guarantee that this extraction method remains available or authorized. Credential storage, token scopes and expiry can change, so use a supported authentication path whenever one is provided.

## Prerequisites

* **Linux Environment** (Instructions below are optimized for Linux)
* **Docker & Docker Compose** installed
* **VS Code** installed and logged in to **GitHub Copilot**
* (Optional) `jq` installed for JSON parsing (alternative `grep` commands provided)

---

## Scope, Authorization, and Verification

- **Scope:** This workflow depends on the installed VS Code Copilot extension, LiteLLM version, local credential-storage layout, account entitlement, and models available at that time. None of those interfaces is assumed stable.
- **Authorization boundary:** A `ghu_...` value is a secret. Confirm that extracting and forwarding it is permitted by the current GitHub, Copilot, and organizational terms; never commit, log, publish, or expose it to an untrusted container or network listener.
- **Assumptions and uncertainty:** Login state alone does not guarantee that a token can be found, accepted, refreshed, or authorized for a model. Storage paths, scopes, expiry, and provider routing can change without this guide changing.
- **Failure and completion:** Treat missing or expired credentials, unauthorized models, accidental log output, non-local exposure, restart failure, and rate limits as explicit failures. Completion requires an authorized test request, confirmed token redaction, least-privilege network binding, expiry behavior, and a documented revocation path.

---

## 1. Automatic Token Extraction & Setup (.env)

Instead of manually copying the token, we can extract it from VS Code's local configuration file (`hosts.json`) and save it to the `.env` file.

Choose one of the following:

* **Option A**: Extract the `ghu_...` token from VS Code (recommended for desktop use).
* **Option B**: Store a GitHub PAT (`github_pat_...`) in `.env` and exchange it for a short-lived Copilot token (`gnu_...` or `ghu_...`) on demand (recommended for headless/CI).

### One-Liner Command (Recommended)

Run this command in your project directory (where your `docker-compose.yaml` will be). It finds the token and updates/creates the `.env` file.

```bash
# Extract token and save to .env
export GITHUB_TOKEN=$(grep -o 'ghu_[a-zA-Z0-9]\+' ~/.config/Code/User/globalStorage/github.copilot/hosts.json | head -n 1)

# Check if token was found
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: Copilot token not found. Please login to GitHub Copilot in VS Code."
else
  echo "Token found! Saving to .env..."
  # Create or update .env
  echo "GITHUB_TOKEN=$GITHUB_TOKEN" > .env
  echo "LITELLM_MASTER_KEY=sk-test-1234" >> .env # Add other defaults if needed
  echo "Success! .env updated."
fi
```

### Alternative: Python Script

If you prefer a more robust script (e.g., if you have multiple accounts), save this as `get_token.py`:

```python
import json
import os
from pathlib import Path

def get_token():
    # Path to VS Code Copilot config on Linux
    config_path = Path.home() / ".config/Code/User/globalStorage/github.copilot/hosts.json"
    
    if not config_path.exists():
        print("Config file not found.")
        return None

    try:
        with open(config_path, 'r') as f:
            data = json.load(f)
            # Find the first key containing github.com and get oauth_token
            for key, value in data.items():
                if "github.com" in key and "oauth_token" in value:
                    return value["oauth_token"]
    except Exception as e:
        print(f"Error: {e}")
        return None

token = get_token()
if token:
    print(f"GITHUB_TOKEN={token}")
else:
    print("Token not found")
```

Run it and append to .env:
```bash
python3 get_token.py >> .env
```

### Option B: PAT (`github_pat_...`) → Copilot token (`gnu_...`/`ghu_...`) auto-refresh

Use this when VS Code isn't available (headless/CI). You store the PAT in `.env`, then run a command to fetch a short-lived Copilot token and write it back into `.env` as `GITHUB_TOKEN`.

#### 0) Save the PAT in `.env`

```bash
# .env
GH_TOKEN=github_pat_xxx...
LITELLM_MASTER_KEY=sk-test-1234
```

> Keep `.env` out of Git (`.gitignore`). `GH_TOKEN` is the long-lived PAT; `GITHUB_TOKEN` will be updated by the commands below.

#### 1) CLI wrapper command (`gnu_token`) — curl + jq (recommended)

```bash
cat > gnu_token <<'SH'
#!/usr/bin/env bash
set -euo pipefail

set -a
source .env
set +a

if [ -z "${GH_TOKEN:-}" ]; then
  echo "GH_TOKEN (github_pat_...) is missing in .env"
  exit 1
fi

COPILOT_TOKEN=$(curl -sS -X POST \
  -H "Authorization: token ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/copilot_internal/v2/token \
  | jq -r '.token')

if [ -z "${COPILOT_TOKEN}" ] || [ "${COPILOT_TOKEN}" = "null" ]; then
  echo "Failed to fetch Copilot token"
  exit 1
fi

awk -v token="$COPILOT_TOKEN" '
  BEGIN {found=0}
  /^GITHUB_TOKEN=/ {print "GITHUB_TOKEN=" token; found=1; next}
  {print}
  END {if (!found) print "GITHUB_TOKEN=" token}
' .env > .env.tmp && mv .env.tmp .env

echo "GITHUB_TOKEN updated (prefix: ${COPILOT_TOKEN:0:4}...)"
SH

chmod +x gnu_token
./gnu_token
```

#### 2) curl (one-liner, no script)

```bash
set -a
source .env
set +a

COPILOT_TOKEN=$(curl -sS -X POST \
  -H "Authorization: token ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/copilot_internal/v2/token \
  | jq -r '.token')

awk -v token="$COPILOT_TOKEN" '
  BEGIN {found=0}
  /^GITHUB_TOKEN=/ {print "GITHUB_TOKEN=" token; found=1; next}
  {print}
  END {if (!found) print "GITHUB_TOKEN=" token}
' .env > .env.tmp && mv .env.tmp .env
```

#### 3) Python (stdlib only)

```bash
cat > gnu_token.py <<'PY'
import json
import urllib.request
from pathlib import Path

env_path = Path(".env")
env = {}
for line in env_path.read_text().splitlines():
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k] = v

gh_token = env.get("GH_TOKEN")
if not gh_token:
    raise SystemExit("GH_TOKEN (github_pat_...) is missing in .env")

req = urllib.request.Request(
    "https://api.github.com/copilot_internal/v2/token",
    method="POST",
    headers={
        "Authorization": f"token {gh_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    },
)
with urllib.request.urlopen(req) as resp:
    data = json.load(resp)

token = data.get("token")
if not token:
    raise SystemExit("Failed to fetch Copilot token")

env["GITHUB_TOKEN"] = token
env_path.write_text("\n".join(f"{k}={v}" for k, v in env.items()) + "\n")
print("GITHUB_TOKEN updated")
PY

python3 gnu_token.py
```

#### 4) Node.js (built-in fetch, Node 18+)

```bash
cat > gnu_token.mjs <<'JS'
import fs from "node:fs";

const envText = fs.readFileSync(".env", "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const [k, ...rest] = line.split("=");
  env[k] = rest.join("=");
}

if (!env.GH_TOKEN) {
  console.error("GH_TOKEN (github_pat_...) is missing in .env");
  process.exit(1);
}

const res = await fetch("https://api.github.com/copilot_internal/v2/token", {
  method: "POST",
  headers: {
    Authorization: `token ${env.GH_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  },
});

const data = await res.json();
if (!data.token) {
  console.error("Failed to fetch Copilot token");
  process.exit(1);
}

env.GITHUB_TOKEN = data.token;
fs.writeFileSync(
  ".env",
  Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n",
);
console.log("GITHUB_TOKEN updated");
JS

node gnu_token.mjs
```

#### 5) GitHub CLI (`gh api`)

```bash
set -a
source .env
set +a

COPILOT_TOKEN=$(GH_TOKEN="$GH_TOKEN" gh api --method POST \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /copilot_internal/v2/token --jq '.token')

awk -v token="$COPILOT_TOKEN" '
  BEGIN {found=0}
  /^GITHUB_TOKEN=/ {print "GITHUB_TOKEN=" token; found=1; next}
  {print}
  END {if (!found) print "GITHUB_TOKEN=" token}
' .env > .env.tmp && mv .env.tmp .env
```

---

## 2. Docker Compose Configuration

Create `docker-compose.yaml`. This configuration simply passes the `GITHUB_TOKEN` from your `.env` file into the container.

```yaml
version: "3.8"

services:
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    container_name: litellm-proxy
    ports:
      - "4000:4000"
    volumes:
      - ./config.yaml:/app/config.yaml
    env_file:
      - .env
    environment:
      # The token is passed from .env
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      
      # Recommended settings
      LITELLM_LOG_LEVEL: INFO
    command: ["litellm", "--config", "/app/config.yaml", "--port", "4000"]
    restart: unless-stopped
```

---

## 3. LiteLLM Config (`config.yaml`)

Create `config.yaml`. We use `os.environ/GITHUB_TOKEN` to tell LiteLLM to use the environment variable we injected.

```yaml
model_list:
  # GPT-4o via Copilot
  - model_name: copilot-gpt-4o
    litellm_params:
      model: github/gpt-4o
      api_key: os.environ/GITHUB_TOKEN
  
  # Claude 3.5 Sonnet via Copilot
  - model_name: copilot-claude-3.5
    litellm_params:
      model: github/claude-3.5-sonnet
      api_key: os.environ/GITHUB_TOKEN

general_settings:
  master_key: sk-test-1234  # Must match what you expect or set in .env
```

---

## 4. Run & Verify

1.  **Generate .env** (using the command from Step 1).
2.  **Start Docker**:
    ```bash
    docker-compose up -d
    ```
3.  **Test**:
    ```bash
    curl http://localhost:4000/chat/completions \
      -H "Authorization: Bearer sk-test-1234" \
      -H "Content-Type: application/json" \
      -d '{
        "model": "copilot-gpt-4o",
        "messages": [{"role": "user", "content": "Hello!"}]
      }'
    ```

### Troubleshooting
*   **"Token not found"**: Ensure you have opened VS Code and the GitHub Copilot Chat extension is active and logged in.
*   **Token Expiration**: Copilot `ghu_` tokens can expire. If auth fails, just restart VS Code (to refresh the token), run the extraction command again, and restart the container (`docker-compose restart`).
