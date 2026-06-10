# rsync와 SSH 포트 사용 기준

`rsync`는 파일을 복사하는 명령이 아니라 원본과 대상의 차이를 계산해 동기화하는 도구다. 이 문서는 SSH 커스텀 포트를 쓰는 rsync 문법과, `--delete` 같은 위험 옵션을 안전하게 검증하는 기준을 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

백업, 배포, 서버 이전 작업에서는 같은 파일을 반복해서 옮겨야 한다. `scp`처럼 매번 전체를 복사하면 느리고, 수동 복사는 누락이 생긴다.

`rsync`는 변경분만 전송할 수 있어 효율적이지만 문법을 잘못 쓰면 연결 실패, 대상 경로 오염, 대량 삭제가 발생한다. 특히 SSH 포트와 rsync daemon 포트를 혼동하면 `--port`를 잘못 사용하게 된다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 SSH 커스텀 포트 사용법을 중심으로 여러 예제를 제공한다. 하지만 안전 기준은 부족했다.

- `--port`와 `-e "ssh -p ..."`의 경계가 짧게만 설명되어 있다.
- source 경로의 trailing slash 의미가 빠져 있다.
- `--delete` 사용 전 `--dry-run` 검증이 필수 규칙으로 고정되어 있지 않다.
- 백업 스크립트 예제가 성공 로그를 남기지만 실패 시 중단과 검증 기준이 약하다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 SSH 위에서 rsync를 사용해 예측 가능한 동기화를 수행하는 것이다.

- SSH 포트는 `-e "ssh -p 포트"` 또는 `~/.ssh/config`로 지정한다.
- rsync daemon 모드가 아니라면 `--port`를 쓰지 않는다.
- `--delete`를 쓰기 전에는 반드시 `--dry-run`으로 삭제 대상을 확인한다.
- source 경로의 trailing slash 의미를 명확히 이해한다.
- 자동화는 로그, exit code, 대상 경로 검증을 포함한다.

## 4. 시스템 번역 (Data Flow)

SSH 기반 rsync 흐름은 다음과 같다.

```text
로컬 rsync
  -> SSH transport
  -> 원격 rsync 프로세스
  -> 파일 목록 비교
  -> 변경 파일 전송
  -> 대상 파일시스템 갱신
```

rsync daemon 모드는 별도 프로토콜이다. `rsync://host/module` 또는 `host::module` 형태를 쓰며 일반적으로 daemon 포트를 사용한다. SSH 포트 변경과는 다른 문제다.

## 5. 핵심 구성요소 (Building Blocks)

`-a`는 archive 모드다. 권한, 타임스탬프, 심볼릭 링크 등 파일 메타데이터를 가능한 범위에서 보존한다.

`-e`는 원격 셸을 지정한다. SSH 포트를 바꾸려면 여기에 `ssh -p 2722`를 넣는다.

`--delete`는 원본에 없는 파일을 대상에서 삭제한다. 백업 대상 경로를 잘못 잡으면 정상 파일도 삭제될 수 있다.

`--dry-run` 또는 `-n`은 실제 변경 없이 어떤 작업을 할지 보여준다. rsync 공식 manpage도 삭제가 있는 작업은 먼저 dry-run을 해보는 것이 좋다고 설명한다.

Trailing slash는 source 경로 의미를 바꾼다. `/src/`는 내부 내용을 대상에 넣고, `/src`는 `src` 디렉터리 자체를 대상 아래에 만든다.

## 6. 상태 전이 (State Transition)

rsync 작업은 다음 상태로 진행한다.

```text
대상 접속 확인
  -> 원본과 대상 경로 확인
  -> dry-run 실행
  -> 변경 목록 검토
  -> 실제 동기화 실행
  -> exit code와 파일 수 검증
  -> 복구 가능성 확인
```

`--delete`가 포함된 작업은 `dry-run`에서 삭제 목록을 확인한 뒤에만 실제 실행 상태로 넘어간다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- SSH 커스텀 포트는 `--port`가 아니라 `-e "ssh -p 포트"`로 지정한다.
- `--delete`와 대상 경로를 동시에 처음 쓰는 경우 dry-run 없이 실행하지 않는다.
- 백업 자동화는 원본과 대상 경로 변수가 비어 있을 때 실행되지 않게 만든다.
- SSH 키 권한은 개인키 `600`, `~/.ssh` 디렉터리 `700`을 유지한다.
- root 권한 rsync는 필요한 경우에만 쓰고 대상 경로를 더 보수적으로 검증한다.
- 복구 테스트 없는 rsync 복사본은 백업 완료로 보지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

먼저 SSH 연결을 직접 확인한다.

```bash
ssh -p 2722 backup@backup.example.com
```

SSH 커스텀 포트를 사용해 dry-run을 실행한다.

```bash
rsync -avhn --itemize-changes \
  -e "ssh -p 2722" \
  /srv/app-data/ \
  backup@backup.example.com:/backups/app-data/
```

출력 목록을 확인한 뒤 실제 전송을 실행한다.

```bash
rsync -avh --partial --progress \
  -e "ssh -p 2722" \
  /srv/app-data/ \
  backup@backup.example.com:/backups/app-data/
```

대상을 원본과 완전히 같게 만드는 미러링은 더 위험하므로 `--delete`를 dry-run과 함께 먼저 본다.

```bash
rsync -avhn --delete --itemize-changes \
  -e "ssh -p 2722" \
  /srv/app-data/ \
  backup@backup.example.com:/backups/app-data/
```

검토 후 실제 실행한다.

```bash
rsync -avh --delete --partial \
  -e "ssh -p 2722" \
  /srv/app-data/ \
  backup@backup.example.com:/backups/app-data/
```

반복 접속은 SSH config로 줄인다.

```text
Host backup-server
    HostName backup.example.com
    User backup
    Port 2722
    IdentityFile ~/.ssh/backup_key
```

이후에는 다음처럼 쓴다.

```bash
rsync -avh /srv/app-data/ backup-server:/backups/app-data/
```

## 9. 실패 사례 (What could go wrong?)

`rsync --port 2722 /src/ user@host:/dest/`는 SSH 포트를 바꾸지 않는다. SSH transport를 쓰는 경우 `-e "ssh -p 2722"`가 필요하다.

원본 경로 끝의 slash를 잘못 쓰면 대상에 `/dest/src/...`가 생기거나, 반대로 내부 파일이 바로 풀린다. 명령을 처음 만들 때는 작은 테스트 디렉터리로 의미를 확인한다.

`--delete` 대상 경로를 `/backups/app-data/`가 아니라 `/backups/`로 잘못 잡으면 다른 백업도 삭제 후보가 될 수 있다. `--itemize-changes`와 dry-run 출력에서 삭제 줄을 먼저 본다.

권한 오류가 발생하면 전송은 일부만 끝날 수 있다. exit code를 확인하고, 로그에 `Permission denied`, `failed`, `IO error`가 있는지 본다.

이미 압축된 미디어 파일은 `-z` 압축 이득이 작다. CPU가 병목이면 `-z`를 빼고 대역폭이 병목이면 `--bwlimit`을 검토한다.

## 10. 뇌 확장하기 (Evolution & Variants)

파일시스템 백업에서 ACL, xattr, hardlink까지 보존해야 하면 `-A`, `-X`, `-H` 같은 옵션을 검토한다. 단, 원격 사용자 권한과 파일시스템 지원이 맞아야 한다.

클라우드 스토리지는 `rsync`보다 `rclone`이 적합한 경우가 많다. S3, Google Drive, Backblaze 같은 대상은 인증, API 제한, 객체 스토리지 의미가 다르다.

데이터베이스는 데이터 디렉터리를 rsync하는 것보다 database-native dump, replication, snapshot이 더 안전한 경우가 많다. 실행 중인 DB 파일을 그대로 복사하면 일관성이 깨질 수 있다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] SSH 접속을 rsync 전에 직접 확인했다.
- [ ] SSH 포트는 `-e "ssh -p ..."` 또는 SSH config로 지정했다.
- [ ] source 경로의 trailing slash 의미를 확인했다.
- [ ] `--delete`가 있으면 dry-run 출력의 삭제 목록을 검토했다.
- [ ] 실제 실행 후 rsync exit code를 확인했다.
- [ ] 대상 경로의 파일 수와 핵심 파일을 확인했다.
- [ ] 백업 용도라면 복구 테스트를 수행했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

rsync over SSH에서 포트는 `--port`가 아니라 `-e "ssh -p 포트"`로 바꾼다. 그리고 rsync의 가장 위험한 부분은 연결이 아니라 경로와 삭제 옵션이므로, trailing slash와 `--delete --dry-run`을 먼저 확인해야 한다.
