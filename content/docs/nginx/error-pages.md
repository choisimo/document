---
title: Nginx 사용자 오류 페이지
description: 로컬 오류와 upstream 오류 응답을 구분하고 상태·본문·리다이렉트 없는 오류 페이지를 검증합니다.
---

# Nginx 사용자 오류 페이지

Nginx가 선택한 500·502·503·504 응답에 설명 페이지를 연결할 수 있다. 공개용 오류 본문에는 내부 경로, upstream 주소, 예외 stack trace를 넣지 않는다.

## 설정 조각의 범위

다음은 **예시**다. 실제 server 블록과 파일 경로에 맞춰 검토하고 파일을 준비한다.

```nginx
error_page 500 502 503 504 /_errors/$status.html;

location ^~ /_errors/ {
    internal;
    alias /srv/example/errors/;
}
```

`/_errors/502.html`은 예시 경로의 `502.html` 파일로 매핑된다. `internal`은 이 location을 일반 클라이언트의 직접 요청 대상으로 쓰지 않도록 한다. 파일 부재·읽기 권한·Content-Type도 확인해야 한다.

## upstream 응답과의 관계

프록시된 앱이 반환한 오류를 Nginx 오류 페이지로 바꾸려면 해당 proxy location의 `proxy_intercept_errors` 정책을 검토한다. API의 원래 JSON 오류가 필요한 경우에는 브라우저용 HTML로 대체하면 계약이 깨질 수 있다.

구문 확인 뒤 검토한 변경만 적용한다.

```bash
nginx -t
```

위 명령은 현재 설치 구성의 문법·참조 파일 확인이지 오류 경로의 실제 HTTP 시험이 아니다. 운영에서 임의의 장애를 만들지 말고 분리된 시험 upstream 또는 검토한 오류 경로로 확인한다.

## 완료와 복구

로컬 생성 오류와 upstream 오류를 각각 시험한다. 원래 의도한 상태 코드, 본문, Content-Type, 외부 redirect 부재를 확인하고 오류 asset의 직접 URL도 점검한다. 오류 페이지의 이미지·CSS가 같은 장애 의존성에 묶이면 안내마저 깨질 수 있다.

문제가 생기면 이전 검토 설정을 복원하고 구문 확인·reload·대표 요청을 다시 확인한다. API 오류 응답 계약도 함께 복구한다.

근거: `content/archive/legacy/nginx/custom_page.md`; 관련 문서 [Nginx 구성](configuration.md).
