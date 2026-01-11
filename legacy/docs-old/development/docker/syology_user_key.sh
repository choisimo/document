#!/bin/bash

# 관리자 권한 체크
if [ "$(id -u)" != "0" ]; then
    echo "This script must be run as root. Please use sudo."
    exit 1
fi

# 사용자 이름 입력
read -p "Enter the username: " USERNAME

# 홈 디렉토리 경로 설정
HOMEDIR="/var/services/homes/$USERNAME"
SSHDIR="$HOMEDIR/.ssh"

# .ssh 디렉토리 생성
if [ ! -d "$SSHDIR" ]; then
    echo "Creating .ssh directory for $USERNAME..."
    mkdir -p "$SSHDIR"
    chmod 700 "$SSHDIR"
    echo ".ssh directory created."
else
    echo ".ssh directory already exists."
fi

# SSH 키 생성
KEY_FILE="$SSHDIR/id_rsa"
if [ -f "$KEY_FILE" ]; then
    read -p "SSH key already exists at $KEY_FILE. Do you want to create a new key with a different name? (y/n): " CREATE_NEW_KEY
    if [ "$CREATE_NEW_KEY" == "y" ] || [ "$CREATE_NEW_KEY" == "Y" ]; then
        read -p "Enter new key name: " NEW_KEY_NAME
        KEY_FILE="$SSHDIR/$NEW_KEY_NAME"
    else
        echo "Skipping key generation."
        exit 0
    fi
fi

# 새 SSH 키 생성
echo "Generating SSH key pair for $USERNAME..."
ssh-keygen -t rsa -b 4096 -C "nodove@nodove.com" -f "$KEY_FILE" -N ""
echo "SSH key pair generated."

# authorized_keys 파일에 공개 키 추가
AUTHORIZED_KEYS="$SSHDIR/authorized_keys"
if [ ! -f "$AUTHORIZED_KEYS" ]; then
    echo "Creating authorized_keys file for $USERNAME..."
    touch "$AUTHORIZED_KEYS"
    chmod 600 "$AUTHORIZED_KEYS"
fi

# 공개 키 추가
PUB_KEY_FILE="$KEY_FILE.pub"
if grep -qxFf "$PUB_KEY_FILE" "$AUTHORIZED_KEYS"; then
    echo "Public key already exists in authorized_keys."
else
    echo "Adding public key to authorized_keys..."
    cat "$PUB_KEY_FILE" >> "$AUTHORIZED_KEYS"
    echo "Public key added to authorized_keys."
fi

# 완료 메시지
echo "Setup complete for user $USERNAME."
ls -la "$SSHDIR"
