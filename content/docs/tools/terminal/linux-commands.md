# Linux Commands

리눅스 명령어는 외워야 할 목록이 아니라 "파일, 프로세스, 네트워크, 텍스트 스트림을 어떻게 관찰하고 바꿀 것인가"를 다루는 작은 도구들의 조합이다. 좋은 명령어 사용은 빠른 실행보다 되돌릴 수 있는 실행에서 시작한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

GUI만으로 서버를 운영하면 장애 상황에서 확인할 수 있는 정보가 제한된다. 로그를 찾고, 프로세스를 확인하고, 디스크 사용량을 줄이고, 원격 파일을 옮기는 작업은 대부분 터미널에서 더 정확하게 처리된다.

명령어를 익히는 목적은 모든 옵션을 암기하는 것이 아니다. 위험한 변경 전에 상태를 확인하고, 작은 단위로 실행하고, 출력과 종료 코드를 보고 다음 행동을 결정하는 능력을 만드는 것이다.

## 2. 현재 나의 상태 (Baseline)

다음 상태라면 기본 명령어 체계를 다시 잡아야 한다.

- `rm -rf`, `chmod -R`, `chown -R` 같은 명령을 확인 없이 실행한다.
- 명령어가 어디에 설치되어 있는지 모른 채 실행한다.
- 파일 검색, 로그 검색, 프로세스 종료를 매번 검색해서 복사한다.
- 파이프라인에서 공백이 포함된 파일명을 안전하게 처리하지 못한다.
- 명령이 실패했는지 성공했는지 종료 코드를 확인하지 않는다.
- root 권한을 언제 써야 하는지 경계가 불명확하다.

## 3. 도달하고 싶은 목표 (Target State)

기본기를 갖춘 터미널 사용자는 다음 상태를 만족한다.

- 현재 위치와 대상 경로를 확인한 뒤 변경 명령을 실행한다.
- 도움말은 `man`, `--help`, `type`, `which`로 확인한다.
- 파일 작업은 먼저 조회하고, 그 다음 복사/이동/삭제한다.
- 텍스트 처리는 `grep`, `sed`, `awk`, `sort`, `uniq`, `cut`, `wc`를 조합한다.
- 프로세스 종료는 `TERM`을 먼저 보내고, `KILL`은 마지막 수단으로 쓴다.
- 네트워크 문제는 DNS, 연결성, 포트, HTTP 응답을 나눠 확인한다.
- 위험한 명령은 dry run, 백업, 인터랙티브 옵션을 먼저 사용한다.

## 4. 시스템 번역 (Data Flow)

터미널 작업은 보통 다음 흐름으로 진행한다.

```text
목표 정의
  -> 현재 상태 확인
  -> 대상 좁히기
  -> 안전한 미리보기
  -> 변경 실행
  -> 결과 검증
  -> 로그 또는 기록 남기기
```

예를 들어 오래된 로그를 삭제하는 작업은 바로 삭제로 시작하지 않는다.

```bash
pwd
find /var/log/myapp -type f -name "*.log" -mtime +30 -print
find /var/log/myapp -type f -name "*.log" -mtime +30 -delete
df -h
```

첫 번째 `find`는 대상 확인이고, 두 번째 `find`가 실제 변경이다.

## 5. 핵심 구성요소 (Building Blocks)

명령어는 작업 영역별로 묶어 이해한다.

| 영역 | 대표 명령 | 목적 |
| --- | --- | --- |
| 위치와 탐색 | `pwd`, `ls`, `cd`, `tree` | 현재 위치와 파일 구조 확인 |
| 파일 조작 | `cp`, `mv`, `rm`, `mkdir`, `touch`, `ln` | 파일 생성, 복사, 이동, 삭제, 링크 |
| 파일 정보 | `file`, `stat`, `du`, `df` | 타입, 메타데이터, 용량 확인 |
| 도움말 | `man`, `info`, `--help`, `help`, `type`, `which` | 명령 의미와 위치 확인 |
| 검색 | `find`, `locate`, `grep`, `rg` | 파일명과 내용 검색 |
| 텍스트 처리 | `cat`, `less`, `head`, `tail`, `sed`, `awk`, `cut`, `sort`, `uniq`, `wc` | 스트림 변환과 집계 |
| 프로세스 | `ps`, `top`, `htop`, `jobs`, `kill`, `pkill` | 실행 중인 작업 확인과 종료 |
| 네트워크 | `ip`, `ss`, `ping`, `traceroute`, `curl`, `wget`, `ssh`, `rsync` | 연결 상태와 원격 작업 확인 |
| 권한 | `chmod`, `chown`, `chgrp`, `id`, `groups`, `sudo` | 접근 권한과 실행 권한 관리 |
| 압축 | `tar`, `gzip`, `zip`, `unzip` | 묶기, 압축, 해제 |
| 디스크 | `mount`, `umount`, `lsblk`, `blkid`, `fsck` | 장치와 파일시스템 확인 |

## 6. 상태 전이 (State Transition)

파일 작업은 상태 전이를 의식해야 한다.

```text
unknown
  -> inspected
  -> copied_or_backed_up
  -> modified
  -> verified
```

- `unknown`: 아직 대상이 맞는지 모른다.
- `inspected`: `ls`, `stat`, `file`, `find`로 대상을 확인했다.
- `copied_or_backed_up`: 되돌릴 수 있는 복사본이 있다.
- `modified`: 실제 변경 명령을 실행했다.
- `verified`: 결과를 다시 확인했다.

프로세스 종료도 단계가 있다.

```text
running
  -> term_sent
  -> stopped
  -> kill_sent
```

`kill -9`는 정상 종료 기회를 주지 않으므로 마지막 단계에서만 사용한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 삭제 명령은 대상 목록을 먼저 출력한 뒤 실행한다.
- `rm -rf`에 변수나 와일드카드를 넣을 때는 변수가 비어 있는지 확인한다.
- `chmod -R`과 `chown -R`은 적용 범위를 먼저 `find`나 `ls`로 확인한다.
- root 권한은 필요한 명령 한 줄에만 붙인다.
- 공백이나 특수 문자가 포함된 파일명은 `find -print0`와 `xargs -0`로 처리한다.
- 로그를 볼 때는 원본을 직접 편집하지 않는다.
- 원격 복사나 동기화는 먼저 dry run 또는 대상 경로 확인을 한다.
- 장치 파일, 마운트, 파티션 명령은 디스크 이름을 두 번 확인한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

기본 탐색과 확인은 다음 명령만으로 시작할 수 있다.

```bash
pwd
ls -lah
type ls
man ls
df -h
du -sh .
```

텍스트 로그에서 오류를 찾는다.

```bash
grep -R "ERROR" logs/
grep -R "ERROR" logs/ | tail -n 20
grep -R "ERROR" logs/ | wc -l
```

파일을 안전하게 찾고 삭제한다.

```bash
find ./tmp -type f -name "*.cache" -mtime +7 -print
find ./tmp -type f -name "*.cache" -mtime +7 -delete
```

공백이 있는 파일명을 안전하게 처리한다.

```bash
find ./data -type f -name "*.txt" -print0 | xargs -0 wc -l
```

프로세스를 확인하고 정상 종료를 시도한다.

```bash
ps aux | grep myapp
pkill -TERM myapp
ps aux | grep myapp
```

네트워크 문제를 단계별로 본다.

```bash
ip addr
ip route
ping -c 3 example.com
ss -tulpn
curl -I https://example.com
```

## 9. 실패 사례 (What could go wrong?)

- 현재 디렉터리를 확인하지 않고 상대 경로 삭제를 실행한다.
- `rm -rf "$TARGET"`에서 `TARGET`이 비어 있어 예상보다 넓은 경로가 지워진다.
- `find ... | xargs rm` 조합으로 공백이 포함된 파일명이 잘못 쪼개진다.
- `sudo` 셸을 오래 유지해 필요 없는 명령까지 root로 실행한다.
- `kill -9`를 먼저 보내 애플리케이션이 정리 작업을 하지 못한다.
- `scp`나 `rsync`의 끝 슬래시 의미를 확인하지 않아 디렉터리 구조가 달라진다.
- 로그 파일을 편집기로 열어 저장하면서 원본 로그가 변경된다.
- `dd`, `mkfs`, `fdisk` 같은 장치 명령에서 대상 디스크를 잘못 고른다.

## 10. 뇌 확장하기 (Evolution & Variants)

처음에는 기본 명령어를 직접 익힌다. 이후 다음 방향으로 확장한다.

- 검색은 `grep`에서 `rg`로, 파일 찾기는 `find`에서 `fd`로 보완한다.
- `less` 검색, `tail -f`, `journalctl`로 로그 탐색을 익힌다.
- 반복 명령은 alias보다 작은 셸 함수로 만들고 입력 검증을 넣는다.
- 위험한 배치 작업은 스크립트보다 먼저 한 줄 명령과 dry run으로 검증한다.
- 네트워크 관찰은 `ss`, `dig`, `curl -v`, `tcpdump` 순서로 깊이를 늘린다.
- 파일 동기화는 `rsync --dry-run`으로 계획을 확인한 뒤 실행한다.

명령어는 많이 아는 것보다 조합을 안전하게 만드는 것이 더 중요하다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 변경 전 `pwd`와 대상 경로를 확인했다.
- [ ] 삭제 또는 덮어쓰기 전 대상 목록을 출력했다.
- [ ] 되돌릴 수 없는 변경 전 백업이나 dry run을 수행했다.
- [ ] 공백이 포함된 파일명 처리 방식을 고려했다.
- [ ] root 권한 사용 범위를 최소화했다.
- [ ] 명령 실패 여부를 출력과 종료 코드로 확인했다.
- [ ] 프로세스 종료는 `TERM`을 먼저 사용했다.
- [ ] 원격 복사와 동기화는 출발지와 목적지를 다시 확인했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

리눅스 명령어의 핵심은 빠르게 치는 것이 아니라, 변경 전에 `____`를 확인하고 실행 후 `____`로 검증하며 되돌릴 수 없는 명령은 `____`부터 하는 것이다.
