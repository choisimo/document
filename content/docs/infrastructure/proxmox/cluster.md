# Proxmox QDevice `votes 0` 진단 가이드

QDevice가 `votes 0` 또는 연결 해제로 보일 때 토폴로지, 인증서, 네트워크, 서비스 상태를 순서대로 확인하는 런북입니다.

!!! danger "적용 범위"
    지원되는 Proxmox VE·Corosync 버전의 정상 다중 노드 클러스터를 전제로 합니다. QDevice는 일반적으로 짝수 노드 중재에 사용하며 단일 노드에 표를 추가해 HA를 만드는 장치가 아닙니다. `/etc/pve/corosync.conf`에 임의로 `votes`를 추가하거나 여러 노드의 Corosync를 동시에 재시작하지 마세요.

## 1. 상태와 토폴로지 수집

각 Proxmox 노드에서 같은 시각의 출력을 보관합니다.

```bash
pveversion -v
pvecm status
pvecm nodes
systemctl status corosync-qdevice --no-pager
journalctl -u corosync-qdevice --since "-15 min"
```

QNetd 호스트에서는 다음을 확인합니다.

```bash
systemctl status corosync-qnetd --no-pager
journalctl -u corosync-qnetd --since "-15 min"
ss -lntp | grep 5403
```

`votes 0`만 보지 말고 `Expected votes`, `Total votes`, `Quorate`, QDevice 플래그와 노드 수를 함께 해석합니다. 단일 노드나 지원되지 않는 토폴로지는 재설정보다 설계 수정이 먼저입니다.

## 2. 연결과 인증 확인

- QNetd의 안정된 주소와 실제 TCP listener에 각 노드가 연결되는지 확인합니다.
- 시간, 이름 해석, 방화벽, 인증서 만료와 클러스터 이름 불일치를 양쪽 journal에서 대조합니다.
- Corosync 노드 간 UDP와 QNetd TCP 흐름을 같은 포트 문제로 취급하지 않습니다.
- 포트 연결 성공만으로 TLS와 QDevice 등록 성공을 판정하지 않습니다.

## 3. 지원되는 재등록

클러스터가 quorate이고 유지보수 창과 콘솔 접근이 확보된 경우에만 한 클러스터 노드에서 실행합니다.

```bash
pvecm qdevice remove
apt install corosync-qdevice
pvecm qdevice setup <QNETD_IP>
```

`-f`는 기존 상태를 덮어쓸 필요와 영향을 확인한 경우에만 해당 버전 문서에 따라 사용합니다. 패키지 재설치나 전체 서비스 재시작을 첫 조치로 사용하지 않습니다.

## 4. 완료, 실패 및 롤백 증거

모든 노드의 expected votes, QDevice 연결, quorum이 일관되고 양쪽 로그에 인증·재연결 오류가 없어야 합니다. 유지보수 창에서 QNetd만 중단한 경우와 한 노드만 중단한 경우를 분리해 시험하고 예상한 쪽만 quorate인지 기록합니다. 결과가 다르면 `pvecm qdevice remove`로 외부 vote를 제거하고 기존 네트워크·인증 정책을 복원합니다.
