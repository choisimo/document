# Tailscale MARK 커널 모듈 오류 분석과 해결 방법

Tailscale에서 발생하는 MARK 커널 모듈 오류는 Linux 커널의 Netfilter 구현, iptables/nftables 전환, 커널 모듈 로딩 상태와 관련될 수 있다. 이 문서는 오류 원인, 영향 범위, 해결 방법, 선택 기준을 정리한다.

## 오류 개요

Tailscale 상태 점검에서 다음 유형의 오류가 발생할 수 있다.

```text
Warning: Extension MARK revision 0 not supported, missing kernel module?
```

이 메시지는 `ip6tables` 또는 Netfilter 규칙 처리 중 MARK target을 사용할 수 없거나 관련 커널 모듈이 누락된 상태를 나타낸다.

## 기술적 원인

1. **커널 모듈 부재**
   - Ubuntu 24.04의 6.8 계열, Fedora 41의 6.11.5 같은 최신 커널 환경에서 `xt_mark.ko` 모듈이 없거나 로드되지 않을 수 있다.

2. **Netfilter 구현 변경**
   - 최신 커널은 iptables에서 nftables 중심으로 전환되며 일부 Netfilter 모듈의 구현 방식이 달라졌다.

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
# 모듈 로드 시도
sudo modprobe xt_MARK

# 소문자 이름으로도 시도
sudo modprobe xt_mark

# 부팅 시 자동 로드
echo "xt_mark" | sudo tee /etc/modules-load.d/tailscale.conf
```

이 방법은 모듈이 커널에 존재하지만 로드되지 않은 경우에 효과가 있다. 구형 커널이나 모듈이 명확히 존재하는 환경에서 사용할 수 있다.

### 2. 커널 업데이트 적용

```bash
# Fedora 예시
sudo dnf upgrade

# Ubuntu 예시
sudo apt update && sudo apt upgrade
```

Fedora 41의 예시에서는 커널 6.11.6 업데이트가 문제 해결 경로로 언급된다. 커널 업데이트는 iptables/nftables 호환성 문제 또는 MARK 모듈 관련 수정 사항을 포함할 수 있다.

### 3. Tailscale 방화벽 모드 전환

Tailscale은 v1.48.0부터 `iptables`와 `nftables` 방화벽 모드를 지원한다. `nftables` 모드는 MARK 모듈 의존성을 줄이고 Netlink API를 통해 규칙을 설정한다.

```bash
# /etc/default/tailscaled 예시
TS_DEBUG_FIREWALL_MODE=nftables
```

커널 업데이트가 어렵거나 시스템이 이미 nftables를 사용하는 경우 검토할 수 있다.

### 4. 서브넷 라우팅 설정 조정

```bash
tailscale up --advertise-routes=192.168.1.0/24 --snat-subnet-routes=false
```

`--snat-subnet-routes=false` 옵션은 Tailscale의 기본 SNAT 동작을 비활성화한다. 복잡한 네트워크 환경에서는 별도 iptables/nftables 규칙으로 포워딩과 NAT를 명확히 구성할 수 있다.

### 5. 이전 커널 버전 롤백

문제가 없는 것으로 확인된 이전 커널 버전으로 돌아가는 방식이다. 예시로 Fedora 환경에서는 6.11.3 같은 이전 버전이 언급된다. 이는 임시 복구 수단이며, 보안 패치 적용 상태를 함께 확인한다.

## 선택 기준

### 프로덕션 환경

선택 흐름: 커널 업데이트 → 방화벽 모드 변경 → 서브넷 라우팅 최적화

- 장기 안정성 확보
- 보안 패치 유지
- 공식 패키지 중심의 호환성 관리

### 빠른 임시 복구

선택 흐름: 방화벽 모드 변경 → 이전 커널 버전 롤백 → 수동 모듈 로드

- 시스템 변경 범위 최소화
- 서비스 중단 시간 축소
- 즉시 기능 복구 중심

### 세밀한 네트워크 제어

선택 흐름: 커널 모듈 수동 로드 + 서브넷 라우팅 최적화 + iptables/nftables 규칙 사용자 정의

- 특정 네트워크 환경에 맞춘 조정 가능
- 라우팅과 NAT 동작을 세부 제어
- 다른 네트워킹 애플리케이션과의 상호작용 확인 필요

## 결론

Tailscale의 MARK 커널 모듈 오류는 최신 Linux 커널의 Netfilter 구현 변경과 방화벽 모드 전환 과정에서 발생할 수 있다. 서브넷 라우팅, IPv6 통신, MagicDNS 같은 기능에 영향을 줄 수 있으므로, 커널 업데이트 가능 여부와 방화벽 모드, 서브넷 라우팅 구성을 순서대로 점검한다.
