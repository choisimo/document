#!/bin/bash
set -e

KEYFILE_PATH="mongodb/mongo-keyfile"

# keyfile이 없으면 생성
if [ ! -f "$KEYFILE_PATH" ]; then
  openssl rand -base64 756 > "$KEYFILE_PATH"
  chmod 600 "$KEYFILE_PATH"
  chown 999:999 "$KEYFILE_PATH"
fi

exec "$@"

