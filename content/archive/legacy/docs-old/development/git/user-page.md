# GitHub Pages 사용자 정의 도메인과 Cloudflare DNS 설정

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

DNS 레코드 전파에는 몇 분에서 최대 48시간까지 걸릴 수 있다. DNS 설정 후 GitHub 저장소의 Pages 설정에서 사용자 정의 도메인을 지정한다.

1. GitHub 저장소의 `Settings` 탭으로 이동한다.
2. 왼쪽 사이드바에서 `Pages`를 선택한다.
3. `Custom domain` 섹션에 `www.example.com` 또는 `example.com`을 입력하고 저장한다.
4. Apex 도메인을 입력하면 GitHub가 `www` 도메인으로의 리디렉션을 시도할 수 있다.
5. `Enforce HTTPS` 옵션이 활성화 가능하면 체크한다.

Cloudflare SSL/TLS 모드는 일반적으로 `Flexible` 또는 `Full`을 사용한다. GitHub Pages에서 HTTPS가 활성화된 뒤에는 `Full` 구성이 더 명확한 종단 간 암호화 경로를 제공한다.

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
- 저장소 루트의 `CNAME` 파일이 있는 경우 GitHub Pages 설정의 사용자 정의 도메인과 일치해야 한다.
- Cloudflare SSL/TLS 모드가 `Off`인지 확인하고, GitHub Pages HTTPS 상태에 맞춰 `Flexible` 또는 `Full`을 선택한다.
