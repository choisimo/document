GitHub Pages 사용자 정의 도메인 연결 및 Cloudflare DNS 설정 가이드
이 가이드에서는 GitHub Pages로 호스팅되는 웹사이트에 개인 도메인을 연결하고, Cloudflare를 사용하여 DNS 설정을 구성하는 방법을 단계별로 안내합니다.

1단계: GitHub Pages IP 주소 확인
GitHub Pages는 특정 IP 주소를 사용합니다. 이 IP 주소들을 사용하여 DNS 설정에서 A 레코드를 생성해야 합니다. 현재 GitHub Pages에서 사용하는 IP 주소는 다음과 같습니다 (항상 최신 정보를 GitHub 공식 문서에서 확인하는 것이 좋습니다):

185.199.108.153

185.199.109.153

185.199.110.153

185.199.111.153

이 IP 주소들은 Apex 도메인(예: yourdomain.com)을 설정할 때 필요합니다.

2단계: Cloudflare에서 DNS 레코드 설정
Cloudflare 대시보드에 로그인하여 해당 도메인을 선택한 후, DNS 설정 섹션으로 이동합니다.

Apex 도메인 설정 (예: yourdomain.com)
Apex 도메인의 경우, 위에서 언급된 GitHub Pages IP 주소를 가리키는 A 레코드 4개를 추가해야 합니다.

유형(Type): A

이름(Name): @ (루트 도메인을 의미) 또는 yourdomain.com (본인 도메인 입력)

IPv4 주소(IPv4 address):

첫 번째 레코드: 185.199.108.153

두 번째 레코드: 185.199.109.153

세 번째 레코드: 185.199.110.153

네 번째 레코드: 185.199.111.153

프록시 상태(Proxy status): 초기 설정 시에는 'DNS 전용(DNS only)'으로 설정하여 연결을 먼저 확인하는 것이 좋습니다. 연결이 확인된 후 '프록시됨(Proxied)'으로 변경하여 Cloudflare의 추가 기능(CDN, SSL 등)을 활용할 수 있습니다.

TTL: 자동(Auto) 또는 1시간

[Cloudflare DNS 설정 화면 예시 이미지]

WWW 하위 도메인 설정 (예: www.yourdomain.com)
www와 같은 하위 도메인의 경우, GitHub Pages 사용자 이름(또는 조직 이름)과 GitHub 저장소 이름을 가리키는 CNAME 레코드를 추가하는 것이 일반적입니다.

유형(Type): CNAME

이름(Name): www (또는 다른 원하는 하위 도메인)

대상(Target): username.github.io (여기서 username은 본인의 GitHub 사용자 이름 또는 조직 이름으로 변경)

만약 조직 소유의 저장소라면 orgname.github.io 형태가 됩니다.

프로젝트 페이지의 경우(예: username.github.io/repository-name), Apex 도메인에 A 레코드를 설정하고, www는 Apex 도메인으로 리디렉션하거나, username.github.io로 CNAME을 설정한 후 GitHub Pages 설정에서 www.yourdomain.com을 기본으로 지정할 수 있습니다.

프록시 상태(Proxy status): Apex 도메인과 마찬가지로 초기에는 'DNS 전용(DNS only)'으로 설정했다가, 연결 확인 후 '프록시됨(Proxied)'으로 변경하는 것을 권장합니다.

TTL: 자동(Auto) 또는 1시간

참고:

username.github.io 대신 GitHub Pages 설정에서 지정한 사용자 정의 도메인(예: yourdomain.com)을 CNAME 대상으로 사용할 수도 있습니다. 하지만 GitHub의 권장 사항은 username.github.io를 사용하는 것입니다.

Cloudflare의 '프록시됨(Proxied)' 상태를 사용하면 IP 주소가 Cloudflare의 IP로 마스킹되어 DDoS 공격 방어 및 성능 향상에 도움이 됩니다.

3단계: GitHub 저장소 설정
DNS 레코드가 전파되려면 시간이 다소 걸릴 수 있습니다 (몇 분에서 최대 48시간). DNS 설정이 완료되었다고 판단되면, GitHub 저장소로 이동하여 사용자 정의 도메인을 설정합니다.

GitHub 저장소에서 Settings 탭으로 이동합니다.

왼쪽 사이드바에서 Pages를 선택합니다.

Custom domain 섹션에 구매한 도메인 주소(예: www.yourdomain.com 또는 yourdomain.com)를 입력하고 Save 버튼을 클릭합니다.

Apex 도메인(yourdomain.com)을 입력하면, GitHub는 자동으로 www.yourdomain.com으로의 리디렉션을 시도할 수 있습니다 (또는 그 반대).

만약 www.yourdomain.com을 주 도메인으로 사용하고 싶다면, 해당 주소를 입력합니다.

Enforce HTTPS 옵션이 있다면 체크합니다. GitHub Pages는 사용자 정의 도메인에 대해 HTTPS를 지원하며, Cloudflare를 통해서도 SSL/TLS 암호화를 설정할 수 있습니다. Cloudflare의 SSL/TLS 설정이 'Flexible' 또는 'Full'로 되어 있는지 확인하세요. 'Full (Strict)'를 사용하려면 GitHub Pages에서 HTTPS가 완전히 활성화된 후에 설정해야 합니다.

[GitHub Pages 사용자 정의 도메인 설정 화면 예시 이미지]

4단계: 설정 확인
DNS 전파 확인: nslookup yourdomain.com 또는 dig yourdomain.com (터미널/명령 프롬프트) 명령어나 온라인 DNS 조회 도구(예: whatsmydns.net)를 사용하여 DNS 레코드가 올바르게 전파되었는지 확인합니다. A 레코드가 GitHub IP 주소들을 가리키고, CNAME 레코드가 username.github.io를 가리키는지 확인합니다.

웹사이트 접속: 브라우저에서 사용자 정의 도메인(예: http://yourdomain.com 또는 https://www.yourdomain.com)으로 접속하여 웹사이트가 정상적으로 표시되는지 확인합니다.

HTTPS 확인: GitHub Pages 설정에서 'Enforce HTTPS'가 활성화되고, Cloudflare의 SSL/TLS 설정이 적절하게 구성되어 있다면, https://로 접속되는지 확인합니다.

문제 해결 팁
DNS 전파 시간: DNS 변경 사항이 전 세계적으로 전파되는 데는 시간이 걸릴 수 있습니다. 최대 48시간까지 기다려야 할 수도 있습니다.

Cloudflare 프록시: 만약 '프록시됨(Proxied)' 상태에서 문제가 발생하면, 일시적으로 'DNS 전용(DNS only)'으로 변경하여 GitHub Pages와 직접 연결되는지 확인해 보세요. 연결이 확인되면 다시 '프록시됨'으로 변경하고 Cloudflare 설정을 점검합니다.

GitHub Pages 오류 메시지: GitHub 저장소의 Pages 설정 화면에서 오류 메시지가 표시되는지 확인하고, 해당 메시지에 따라 조치합니다.

CNAME 파일: 과거에는 저장소 루트에 CNAME이라는 파일을 만들고 그 안에 도메인 이름을 적는 방식도 사용되었지만, 현재는 GitHub Pages 설정 화면에서 직접 입력하는 것이 표준입니다. 이 파일이 있다면 GitHub 설정과 일치하는지 확인하거나, 설정 화면을 통해 관리하는 것이 좋습니다.

Cloudflare SSL/TLS 설정: Cloudflare의 SSL/TLS 암호화 모드가 'Off'로 되어 있지 않은지 확인하세요. 일반적으로 'Flexible' 또는 'Full'을 사용합니다. 'Flexible'은 브라우저와 Cloudflare 간의 연결만 암호화하고, 'Full'은 브라우저-Cloudflare 및 Cloudflare-원본 서버(GitHub Pages) 간의 연결을 모두 암호화합니다. GitHub Pages에서 HTTPS가 활성화되어 있다면 'Full'을 사용하는 것이 더 안전합니다.

이 가이드가 GitHub Pages에 사용자 정의 도메인을 성공적으로 연결하는 데 도움이 되기를 바랍니다.