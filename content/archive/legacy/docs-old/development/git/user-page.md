# GitHub Pages 사용자 정의 도메인과 Cloudflare DNS 설정

> **적용 범위:** GitHub Pages에 apex와 `www` 도메인을 연결하는 예시다. IP·대시보드·프록시 옵션은 적용 시점의 공식 문서를 따른다. DNS 조회, Pages 도메인 검사, 원본과 방문자 측 HTTPS, 대표 도메인 리디렉션이 각각 확인되어야 완료다.

GitHub Pages로 호스팅되는 웹사이트에 사용자 정의 도메인을 연결하고 Cloudflare에서 DNS 레코드를 구성하는 절차다.

## GitHub Pages IP 주소

Apex 도메인에는 GitHub Pages의 A 레코드 대상 IP가 필요하다. 이 문서의 예시 IP는 다음과 같다.

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

GitHub Pages IP는 변경될 수 있으므로 실제 적용 전 GitHub 공식 문서의 Pages DNS 항목을 확인한다.

## Cloudflare DNS 레코드

Cloudflare 대시보드에서 해당 도메인을 선택한 뒤 DNS 설정 섹션으로 이동한다.

### Apex 도메인

예: `example.com`

| 항목 | 값 |
| --- | --- |
| Type | `A` |
| Name | `@` 또는 `example.com` |
| IPv4 address | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| Proxy status | 초기 연결 확인 시 `DNS only`, 확인 후 필요에 따라 `Proxied` |
| TTL | `Auto` 또는 1시간 |

### WWW 하위 도메인

예: `www.example.com`

| 항목 | 값 |
| --- | --- |
| Type | `CNAME` |
| Name | `www` |
| Target | `username.github.io` |
| Proxy status | 초기 연결 확인 시 `DNS only`, 확인 후 필요에 따라 `Proxied` |
| TTL | `Auto` 또는 1시간 |

조직 소유 저장소는 `orgname.github.io` 형태를 사용할 수 있다. 프로젝트 페이지는 `username.github.io/repository-name` 경로를 사용하므로, Apex 도메인 A 레코드와 `www` CNAME 또는 리디렉션 구성을 함께 검토한다.

Cloudflare의 `Proxied` 상태를 사용하면 방문자에게 Cloudflare IP가 노출되고 CDN, SSL/TLS, 보안 기능을 적용할 수 있다.

## GitHub 저장소 설정

도메인 소유권과 현재 DNS 구성을 확인하고 GitHub Pages 설정에 대표 도메인을 등록한 뒤 필요한 DNS 레코드를 구성한다. 전파 시간은 TTL·캐시·인증서 발급 상태에 따라 다르므로 고정된 최대 시간만으로 완료를 판단하지 않는다.

1. GitHub 저장소의 `Settings` 탭으로 이동한다.
2. 왼쪽 사이드바에서 `Pages`를 선택한다.
3. `Custom domain` 섹션에 `www.example.com` 또는 `example.com`을 입력하고 저장한다.
4. 양쪽 DNS를 올바르게 구성하면 대표 도메인이 apex일 때 `www`에서 apex로, 대표 도메인이 `www`일 때 apex에서 `www`로 리디렉션되는지 확인한다.
5. `Enforce HTTPS` 옵션이 활성화 가능하면 체크한다.

GitHub Pages의 원본 HTTPS 인증서가 대상 호스트명과 일치하고 유효한지 먼저 확인한다. Cloudflare 프록시를 사용하는 경우 원본 인증서까지 검증하는 `Full (strict)`로 구성한다. `Flexible`은 원본 구간을 암호화하지 않고 `Full`만으로는 원본 인증서 검증을 보장하지 않으므로 정상 완료 기준을 낮추는 대안으로 사용하지 않는다. [Cloudflare Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)의 인증서 조건을 확인한다.

## 설정 확인

DNS 전파 상태는 터미널 또는 온라인 DNS 조회 도구로 확인한다.

```bash
nslookup example.com
dig example.com
```

A 레코드가 GitHub Pages IP를 가리키고, CNAME 레코드가 `username.github.io`를 가리키는지 확인한다. 이후 브라우저에서 `http://example.com` 또는 `https://www.example.com`으로 접속해 사이트 표시와 HTTPS 적용 상태를 확인한다.

## 문제 해결

- DNS 변경 사항은 전파 지연이 있을 수 있다.
- Cloudflare `Proxied` 상태에서 문제가 발생하면 일시적으로 `DNS only`로 변경하여 GitHub Pages 직접 연결을 확인한다.
- GitHub Pages 설정 화면의 오류 메시지를 확인하고 해당 메시지에 맞춰 조치한다.
- 게시 방식이 `CNAME` 파일을 사용하는 경우 파일 값·게시 소스·Pages 설정의 대표 도메인이 일치하고 배포 도구가 덮어쓰지 않는지 확인한다.
- 원본 인증서 오류나 프록시 문제는 `DNS only` 직접 연결로 분리해 진단한다. 원본 HTTPS를 복구한 뒤 인증서 검증 모드로 전환하고 인증서 갱신도 확인한다.

DNS 값과 대표 도메인 방향은 [GitHub Pages 사용자 정의 도메인 관리](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)를 기준으로 확인한다. 변경 전 DNS·Pages·Cloudflare 설정을 기록하고 실패하면 마지막 정상 구성으로 복구한다.
