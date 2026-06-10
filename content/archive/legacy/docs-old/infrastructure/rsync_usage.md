# 사용자 지정 SSH 포트로 rsync 사용하기

rsync가 지정한 SSH 포트 `2722`가 아니라 기본 SSH 포트 `22`로 연결을 시도하면 `Connection refused` 오류가 발생할 수 있다. `--port` 옵션은 rsync 데몬 포트에 대한 옵션이며, SSH 연결 포트를 지정하는 방식이 아니다.

## 기존 명령의 문제

기존 명령:

```bash
sudo rsync -avz /mnt/nas/backup/* --port 2722 nodove@30.30.30.3:/mnt/nas/files/백업/040825/
```

이 명령은 `--port 2722`를 rsync 옵션으로 전달한다. SSH 전송 모드에서는 이 구문이 SSH 포트를 지정하지 않으므로 rsync가 기본 SSH 포트 `22`로 연결을 시도할 수 있다.

## 올바른 구문

SSH 포트를 지정하려면 원격 shell 명령을 지정하는 `-e` 옵션을 사용한다.

```bash
sudo rsync -avz -e "ssh -p 2722" /mnt/nas/backup/* nodove@30.30.30.3:/mnt/nas/files/백업/040825/
```

이 명령은 rsync가 SSH 포트 `2722`를 사용해 원격 서버에 연결하도록 지정한다.

## 주요 옵션

- `-a`: archive mode. 권한, 소유권, 타임스탬프 등을 보존
- `-v`: 전송 진행 상황 출력
- `-z`: 전송 중 데이터 압축
- `-e "ssh -p 2722"`: 원격 shell로 SSH를 사용하고 포트 `2722` 지정

## SSH config 사용

같은 서버에 같은 포트로 자주 연결한다면 `~/.ssh/config`에 포트를 지정할 수 있다.

```sshconfig
Host 30.30.30.3
    Port 2722
```

이 설정 후에는 rsync 명령을 다음처럼 단순화할 수 있다.

```bash
sudo rsync -avz /mnt/nas/backup/* nodove@30.30.30.3:/mnt/nas/files/백업/040825/
```

## 요약

비표준 SSH 포트로 rsync를 사용할 때는 `-e "ssh -p PORT"` 형식을 사용한다. 대상 서버가 해당 포트에서 SSH 연결을 허용하면 파일 동기화가 정상적으로 진행된다.
