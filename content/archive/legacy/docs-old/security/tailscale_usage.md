# Tailscale MARK 커널 모듈 오류 분석과 해결 방법

> **진단 경계:** MARK 규칙 추가 실패를 설명하는 보관 자료이며 재현 로그가 현재 시스템의 원인을 증명하지 않는다. 배포판·커널·Tailscale·iptables backend와 `lsmod`·`modinfo`·서비스 로그를 먼저 수집한다. 커널 모듈 부재·backend 불일치·제품 결함은 확인할 가설이다. 방화벽 flush는 기존 접근 제어·NAT를 지우므로 복구 단계로 사용하지 않는다.

Tailscale에서 발생하는 MARK 커널 모듈 오류는 Linux 커널의 Netfilter 구현, iptables/nftables 전환, 커널 모듈 로딩 상태와 관련될 수 있다. 이 문서는 오류 원인, 영향 범위, 해결 방법, 선택 기준을 정리한다.

## 오류 개요

Tailscale 상태 점검에서 다음 유형의 오류가 발생할 수 있다.

```text
Warning: Extension MARK revision 0 not supported, missing kernel module?
```

이 메시지는 MARK 기능을 사용하는 규칙 처리에 문제가 있음을 시사한다. 주변 명령·종료 코드·로그를 함께 확인해야 실제 `ip6tables` 실패와 원인을 구분할 수 있으며 모듈 부재만으로 단정하지 않는다.

## 기술적 원인

1. **커널 모듈 부재**
   - 배포판 커널 구성·패키지·현재 부팅 커널에서 MARK 기능이 모듈인지 내장인지 확인한다. 문서에 기록된 Ubuntu·Fedora 버전은 사례이며 일반적인 재현 조건이 아니다.

2. **Netfilter 구현 변경**
   - iptables-legacy·iptables-nft·직접 nftables 사용은 사용자 공간 도구와 backend 선택을 함께 확인한다. 커널 버전만으로 현재 사용 경로를 결정할 수 없다.

3. **대소문자 구분 문제**
   - 일부 시스템에서는 `xt_MARK`와 `xt_mark` 이름 차이로 인해 모듈 로딩이 실패할 수 있다.

4. **모듈 의존성 문제**
   - MARK 모듈은 다른 Netfilter 모듈과 의존성이 있어 특정 모듈이 누락되면 오류가 발생한다.

## 영향 범위

1. **IPv6 기능 장애**
   - IPv6 통신이 차단되거나 간헐적으로 실패할 수 있다.

2. **자체 Tailscale IP 접근 불가**
   - 호스트가 자신의 Tailscale IP(`100.x.x.x`)에 ping을 보낼 수 없는 상태가 될 수 있다.

3. **서브넷 라우팅 실패**
   - Tailscale을 통한 다른 네트워크 서브넷 라우팅이 작동하지 않을 수 있다.

4. **내부 DNS 해석 문제**
   - Tailscale MagicDNS 기능이 간헐적으로 실패할 수 있다.

## 해결 방법

### 1. 커널 모듈 수동 로드

```bash
# 현재 커널에서 제공되는 모듈 이름·의존성을 먼저 확인
uname -r
modinfo xt_mark
lsmod

# modinfo와 배포판 패키지에서 확인한 경우에만 로드
sudo modprobe xt_mark
```

이 방법은 현재 커널에 필요한 모듈이 존재하고 로드 누락이 원인임을 확인했을 때 검토한다. 내장 기능이나 다른 backend 문제에는 같은 조치가 맞지 않을 수 있다. 재부팅 후 필요성까지 확인한 경우에만 자동 로딩 설정을 별도로 관리한다.

### 2. 커널 업데이트 적용

```bash
# Fedora 예시
sudo dnf upgrade

# Ubuntu 예시
sudo apt update && sudo apt upgrade
```

Fedora 41·커널 6.11.6에서 해결됐다는 기록은 당시 사례다. 현재 배포판의 변경 내역과 실제 증상을 대조하고 부팅 항목·이전 커널·콘솔 복구 경로를 확보한 뒤 업데이트 결과를 검증한다.

### 3. Tailscale 방화벽 모드 전환

Tailscale은 Linux에서 iptables 도구 또는 nftables Netlink API를 사용하는 방화벽 모드를 제공한다. 아래 `TS_DEBUG_FIREWALL_MODE`는 공식 문서에서 임시 설정 수단으로 설명되므로 영구 지원 계약으로 취급하지 않는다. [방화벽 모드 문서](https://tailscale.com/docs/features/firewall-mode)와 설치 버전을 확인한다.

```bash
# /etc/default/tailscaled 예시
TS_DEBUG_FIREWALL_MODE=nftables
```

진단 근거가 있는 경우 유지보수 창에서 검토한다. 해당 환경 파일을 실제 서비스가 읽는지 확인하고, 변경 후 `journalctl -u tailscaled`에서 선택된 모드와 오류를 확인한다. 실패하면 이전 환경값과 서비스 구성을 복원한다.

### 4. 서브넷 라우팅 설정 조정

```bash
# 진단용 조회: 기존 광고 경로와 현재 설정부터 확인
tailscale status --json
tailscale set --help
```

`--snat-subnet-routes=false`는 서브넷 트래픽의 출발지 주소와 반환 경로 요구를 바꾸는 설계 선택이다. MARK 오류의 일반 해결책이 아니며 필요한 return route·정책·IPv4/IPv6 경로를 설계한 경우에만 적용한다.

### 5. 이전 커널 버전 롤백

문제가 없는 것으로 확인된 이전 커널 버전으로 돌아가는 방식이다. 예시로 Fedora 환경에서는 6.11.3 같은 이전 버전이 언급된다. 이는 임시 복구 수단이며, 보안 패치 적용 상태를 함께 확인한다.

## 선택 기준

### 프로덕션 환경

선택 흐름: 증거 수집 → 원인 가설 확인 → 해당 원인에 맞는 변경 한 가지 → 연결·거부·복구 검증

- 장기 안정성 확보
- 보안 패치 유지
- 공식 패키지 중심의 호환성 관리

### 빠른 임시 복구

선택 흐름: 대체 관리 경로 확보 → 마지막 정상 상태 확인 → 증거가 있는 최소 변경 → 실패 시 복원

- 시스템 변경 범위 최소화
- 서비스 중단 시간 축소
- 즉시 기능 복구 중심

### 세밀한 네트워크 제어

선택 흐름: 현재 backend·규칙·return route 조사 → 필요한 한 계층만 변경 → IPv4/IPv6·서브넷·DNS를 각각 검증

- 특정 네트워크 환경에 맞춘 조정 가능
- 라우팅과 NAT 동작을 세부 제어
- 다른 네트워킹 애플리케이션과의 상호작용 확인 필요

## 결론

Tailscale의 MARK 커널 모듈 오류는 최신 Linux 커널의 Netfilter 구현 변경과 방화벽 모드 전환 과정에서 발생할 수 있다. 서브넷 라우팅, IPv6 통신, MagicDNS 같은 기능에 영향을 줄 수 있으므로, 커널 업데이트 가능 여부와 방화벽 모드, 서브넷 라우팅 구성을 순서대로 점검한다.

완료는 MARK 관련 오류가 사라진 것뿐 아니라 Tailscale 상태, 허용·거부된 피어 통신, IPv4·IPv6, 서브넷 경로와 MagicDNS가 각각 기대와 일치하고 재시작 후 유지되었는지로 판정한다. 이 문서에는 현재 환경에서 그 시험을 실행한 증거가 포함되어 있지 않다.
