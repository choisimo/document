# 사용자 지정 SSH 포트로 rsync 사용하기

> **범위:** 원본·대상·SSH 포트가 확인된 파일 동기화 예시다. `backup@example.invalid`와 경로·포트는 환경에 맞게 바꾸며 `.invalid`는 실제 서버가 아니다. 전송 전에 미리보기를 검토하고 완료 후 대상 내용과 복구 가능성을 확인한다.

rsync가 지정한 SSH 포트 `2722`가 아니라 기본 SSH 포트 `22`로 연결을 시도하면 `Connection refused` 오류가 발생할 수 있다. `--port` 옵션은 rsync 데몬 포트에 대한 옵션이며, SSH 연결 포트를 지정하는 방식이 아니다.

## 기존 명령의 문제

기존 명령:

```text
rsync -avz /mnt/nas/backup/* --port 2722 backup@example.invalid:/mnt/nas/files/backup/040825/
```

이 명령은 `--port 2722`를 rsync 옵션으로 전달한다. SSH 전송 모드에서는 이 구문이 SSH 포트를 지정하지 않으므로 rsync가 기본 SSH 포트 `22`로 연결을 시도할 수 있다.

## 올바른 구문

SSH 포트를 지정하려면 원격 shell 명령을 지정하는 `-e` 옵션을 사용한다.

```bash
rsync -a --dry-run --itemize-changes -e "ssh -p 2722" /mnt/nas/backup/ backup@example.invalid:/mnt/nas/files/backup/040825/
```

이 명령은 SSH 포트 `2722`를 사용해 변경 목록만 미리 보여 준다. 원본의 끝 `/`는 디렉터리 내용 전체를 뜻하며 `*` glob과 달리 숨김 항목을 셸이 제외하지 않는다. 목록을 검토한 뒤 같은 명령에서 `--dry-run`만 제거한다.

## 주요 옵션

- `-a`: archive mode. 대상 파일 시스템과 실행 권한이 지원하는 속성을 보존하며 ACL·확장 속성 등 추가 요구는 별도로 확인
- `-v`: 전송 진행 상황 출력
- `-z`: 선택적인 전송 압축. 이미 압축된 데이터에서 CPU 비용만 늘지 않는지 측정한 뒤 추가
- `-e "ssh -p 2722"`: 원격 shell로 SSH를 사용하고 포트 `2722` 지정

## SSH config 사용

같은 서버에 같은 포트로 자주 연결한다면 `~/.ssh/config`에 포트를 지정할 수 있다.

```sshconfig
Host backup-target
    HostName example.invalid
    User backup
    Port 2722
    IdentityFile ~/.ssh/backup_ed25519
```

이 설정 후에는 rsync 명령을 다음처럼 단순화할 수 있다.

```bash
ssh -G backup-target
rsync -a --dry-run --itemize-changes /mnt/nas/backup/ backup-target:/mnt/nas/files/backup/040825/
```

## 요약

비표준 SSH 포트로 rsync를 사용할 때는 `-e "ssh -p PORT"` 형식을 사용한다. 대상 서버가 해당 포트에서 SSH 연결을 허용하면 파일 동기화가 정상적으로 진행된다.

## 실행 결과와 대상 검증

미리보기와 직접 SSH 연결이 확인되면 실제 전송을 실행하고 종료 상태를 기록한다.

```bash
rsync -a --itemize-changes -e 'ssh -p 2722' /mnt/nas/backup/ backup@example.invalid:/mnt/nas/files/backup/040825/
rsync_exit=$?
printf 'rsync_exit=%s\n' "$rsync_exit"
```

종료 0과 대상 내용 검증을 구분한다. 파일 수·대표 파일·숨김 파일·소유권·백업 정책의 체크섬과 복원 결과를 확인한다. 로컬 접근 권한이 부족하면 필요한 범위를 먼저 정리하며 기본 해법으로 `sudo`를 추가하지 않는다. `--delete`는 대상 범위와 복구 가능한 백업이 확인되기 전에는 추가하지 않는다.
