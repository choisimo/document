# OpenSSH 공개 키 인증 구성

이 절차는 Debian/Ubuntu 계열 서버와 OpenSSH 클라이언트를 기준으로 합니다. PuTTY의 PPK 키를 사용할 때만 PuTTYgen 변환 단계가 필요합니다. 개인 키는 서버로 복사하거나 문서에 첨부하지 않습니다.

## 서버 준비

```bash
sudo apt update
sudo apt install openssh-server
sudo systemctl status ssh
```

## 클라이언트 키 생성

```bash
ssh-keygen -t ed25519 -a 64 -f ~/.ssh/server_ed25519
ssh-copy-id -i ~/.ssh/server_ed25519.pub user@server.example
```

서버에서 사용자별 권한을 확인합니다.

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chown -R "$USER":"$(id -gn)" ~/.ssh
```

기본 파일은 `authorized_keys` 하나이며 줄마다 공개 키를 추가합니다. 임의의 `authorized_keys2` 파일은 `AuthorizedKeysFile` 유효 설정에 포함되지 않으면 읽히지 않습니다.

## 비밀번호 인증을 끄기 전 가드

1. 기존 관리자 세션을 유지합니다.
2. 새 터미널에서 개인 키 로그인이 성공하는지 확인합니다.
3. `sudo sshd -t`로 문법을 확인합니다.
4. `sshd -T | grep -E 'passwordauthentication|pubkeyauthentication|authorizedkeysfile'`로 유효 값을 확인합니다.
5. 복구 콘솔이 있는 경우에만 `PasswordAuthentication no`를 적용하고 SSH를 reload합니다.

```bash
sudo systemctl reload ssh
```

## 파일 전송

```bash
scp -i ~/.ssh/server_ed25519 ./local-file user@server.example:/remote/path/
scp -P 2722 -i ~/.ssh/server_ed25519 ./local-file user@server.example:/remote/path/
```

OpenSSH가 PuTTY 개인 키를 읽지 못할 때 PuTTYgen에서 키를 불러와 OpenSSH 형식으로 내보냅니다. 원본과 변환 키 모두 소유자만 읽을 수 있게 보관합니다.

완료 조건은 공개 키 로그인이 새 세션에서 성공하고, 비밀번호 로그인이 정책대로 거부되며, 서버 로그에 예상 사용자와 키 지문이 기록되는 것입니다.
