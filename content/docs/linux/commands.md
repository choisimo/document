# Linux 명령어 참조

이 문서는 Linux 시스템을 확인하고 관리할 때 자주 쓰는 명령어를 작업 흐름 중심으로 정리한다. 목표는 명령어 옵션을 많이 외우는 것이 아니라 파일, 프로세스, 네트워크, 로그, 디스크 상태를 안전한 순서로 확인하는 것이다.

## 1. 왜 필요한가? (Pain Point & Motivation)

장애 상황에서 명령어를 아무 순서로 실행하면 원인보다 증상을 먼저 바꾸게 된다. 예를 들어 로그를 보기 전에 service를 재시작하거나, mount 상태를 보기 전에 디스크를 format하면 복구 단서가 사라진다.

명령어 참조는 “무엇을 바꿀까”보다 “무엇을 확인할까”를 먼저 제공해야 한다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 파일 탐색, 텍스트 처리, 프로세스, 네트워크, 권한, 로그 분석 명령을 나열한다. 보완해야 할 점은 다음과 같다.

- 조회 명령과 destructive 명령이 같은 밀도로 나열되어 있다.
- `netstat`처럼 구형 도구가 현재 기본 도구와 함께 설명된다.
- `rm -rf`, `find -delete`, `kill -9`의 위험 조건이 약하다.
- 실제 운영에서 필요한 검증 순서가 충분히 드러나지 않는다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 다음 작업을 안전하게 수행하는 것이다.

- 현재 위치와 파일 목록을 확인한다.
- 파일을 검색하고 내용을 샘플링한다.
- 프로세스와 systemd service 상태를 확인한다.
- 네트워크 주소, route, port, DNS, HTTP 응답을 확인한다.
- 디스크 사용량과 block device를 확인한다.
- 권한, 소유자, symbolic link 경로를 확인한다.
- 변경 명령은 범위를 좁힌 뒤 실행한다.

## 4. 시스템 번역 (Data Flow)

기본 운영 흐름은 다음과 같다.

```text
question
  -> read-only command
  -> narrowed target
  -> controlled change
  -> verification command
  -> log or note
```

명령어는 shell이 실행하고, 결과는 kernel, filesystem, process table, network stack, systemd journal에서 온다.

## 5. 핵심 구성요소 (Building Blocks)

파일 탐색은 `pwd`, `ls`, `stat`, `find`, `rg`로 시작한다. 저장소 안의 텍스트 검색은 `grep -R`보다 `rg`가 빠르고 결과가 읽기 쉽다.

텍스트 확인은 `less`, `head`, `tail`, `wc`, `sort`, `uniq`, `awk`, `sed`를 조합한다.

프로세스 확인은 `ps`, `pgrep`, `top`, `htop`, `systemctl`, `journalctl`을 사용한다.

네트워크 확인은 `ip`, `ss`, `resolvectl`, `dig`, `curl`, `ping`, `traceroute`를 사용한다.

디스크 확인은 `lsblk`, `blkid`, `df`, `du`, `findmnt`, `mount`를 사용한다.

권한 확인은 `ls -l`, `stat`, `namei -l`, `getfacl`, `id`, `groups`를 사용한다.

## 6. 상태 전이 (State Transition)

파일 문제는 다음 순서로 확인한다.

```text
path unknown
  -> locate or find
  -> stat
  -> permission check
  -> content sample
  -> edit or copy
  -> verify
```

서비스 문제는 다음 순서로 확인한다.

```text
service failing
  -> systemctl status
  -> journalctl unit logs
  -> config test
  -> restart or reload
  -> status check
```

네트워크 문제는 다음 순서로 확인한다.

```text
no connectivity
  -> link state
  -> IP address
  -> default route
  -> DNS
  -> remote port
  -> application response
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 조회 명령으로 대상 범위를 좁히기 전 삭제 명령을 실행하지 않는다.
- `rm -rf`, `find -delete`, `mkfs`, `dd`는 실행 전 대상 경로와 장치를 다시 확인한다.
- `kill -9`는 정상 종료가 실패한 뒤에만 사용한다.
- service restart 전 `systemctl status`와 최근 journal을 확인한다.
- `/etc` 파일 수정 전 원본을 백업한다.
- root shell에서는 현재 디렉터리와 변수 값을 확인한 뒤 명령을 실행한다.
- log 분석은 원본 로그를 보존하고 pipe로 필터링한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

현재 위치와 파일을 확인한다.

```bash
pwd
ls -lah
stat .
tree -L 2
```

파일을 찾는다.

```bash
find . -type f -name '*.log'
rg 'ERROR|WARN' .
rg --files | rg 'nginx|ssh|wireguard'
```

파일 내용을 안전하게 확인한다.

```bash
head -n 40 app.log
tail -n 100 app.log
tail -f app.log
less app.log
wc -l app.log
```

로그에서 자주 나온 IP를 센다.

```bash
rg -o '[0-9]+[.][0-9]+[.][0-9]+[.][0-9]+' access.log | sort | uniq -c | sort -rn | head
```

프로세스와 service를 확인한다.

```bash
ps aux
pgrep -af nginx
systemctl status nginx
journalctl -u nginx -n 100 --no-pager
journalctl -p warning -b
```

네트워크 상태를 확인한다.

```bash
ip addr show
ip route
ss -tulpen
resolvectl status
dig example.com
curl -I https://example.com
```

디스크와 mount 상태를 확인한다.

```bash
lsblk -f
blkid
df -h
du -xh --max-depth=1 .
findmnt
```

권한 경로를 확인한다.

```bash
id
groups
ls -l /etc/ssh/sshd_config
stat /etc/ssh/sshd_config
namei -l /etc/ssh/sshd_config
```

변경 전 백업을 만든다.

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
sudo sshd -t
sudo systemctl reload ssh
systemctl status ssh
```

## 9. 실패 사례 (What could go wrong?)

`rm -rf "$DIR"`에서 `DIR` 변수가 비어 있거나 `/`에 가까운 값이면 큰 사고가 난다. 실행 전 `printf '%s\n' "$DIR"`로 값을 확인한다.

`find . -delete`는 현재 디렉터리 기준으로 바로 삭제한다. 먼저 `find . ... -print`로 결과를 확인한다.

`kill -9`는 cleanup handler를 실행하지 못하게 한다. database, queue, file write process에는 특히 위험하다.

`chmod -R 777`은 문제를 해결하는 것이 아니라 권한 모델을 깨뜨린다. 필요한 사용자, 그룹, path만 좁혀서 수정한다.

`sed -i`는 원본을 즉시 바꾼다. 중요한 파일에는 `cp` 백업 또는 version control diff를 먼저 둔다.

`netstat`이 없는 시스템에서 오류가 나면 `ss`를 사용한다. 현대 Linux에서는 `iproute2` 계열 도구가 기본이다.

## 10. 뇌 확장하기 (Evolution & Variants)

운영 명령은 단독보다 조합이 중요하다. `systemctl status`는 서비스의 현재 상태를 보여주고, `journalctl -u`는 시간축 로그를 보여주며, `ss -tulpen`은 실제 port listen 상태를 보여준다.

파일 검색도 목적에 따라 도구가 다르다. 파일 이름은 `find`나 `rg --files`, 파일 내용은 `rg`, binary metadata는 `file`과 `stat`가 적합하다.

자동화 스크립트로 옮기기 전에는 수동 명령으로 입력, 출력, 실패 조건을 확인해야 한다. 특히 삭제와 권한 변경은 dry-run 또는 출력 확인 단계를 둔다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 조회 명령과 변경 명령을 구분할 수 있다.
- [ ] 파일, 프로세스, 네트워크, 디스크, 권한 상태를 확인할 수 있다.
- [ ] service 문제에서 `status`, `journal`, `port`를 함께 확인한다.
- [ ] 삭제 명령 전 대상 목록을 출력해 확인한다.
- [ ] `/etc` 설정 변경 전 백업과 구문 검증을 수행한다.
- [ ] 위험 명령의 rollback 가능성을 판단한다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Linux 명령어는 먼저 상태를 읽고, 대상을 좁히고, 작은 변경을 적용한 뒤 다시 검증하는 도구다. 빠른 해결보다 안전한 순서가 더 중요하다.
