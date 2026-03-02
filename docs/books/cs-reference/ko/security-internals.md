# 보안 내부 요소: 암호화, 인증 및 공격 메커니즘

> 내부 정보: TLS 핸드셰이크가 키를 협상하는 방법, 해시 기능이 급증하는 방법, 버퍼 오버플로가 손상된 제어 흐름을 수행하는 방법, OAuth 토큰이 ID를 증명하는 방법(정확한 메모리 레이아웃, 상태 시스템 및 보안 메커니즘 뒤에 있는 수학적 연산).

---

## 1. 대칭 암호화: AES 내부 메커니즘

AES(Advanced Encryption Standard)는 10/12/14 라운드(128/192/256비트 키의 경우)를 통해 4×4바이트 **상태 매트릭스**에서 작동합니다.

```mermaid
flowchart TD
    subgraph "AES-128 Round Structure (10 rounds)"
        PT["Plaintext 16 bytes\n→ 4×4 state matrix"]
        IKA["Initial AddRoundKey\nXOR with round key 0"]
        subgraph "Rounds 1-9 (each)"
            SB["SubBytes\nS-box byte substitution\n(256-entry lookup table, GF(2⁸))"]
            SR["ShiftRows\nRow 0: no shift\nRow 1: shift left 1\nRow 2: shift left 2\nRow 3: shift left 3"]
            MC["MixColumns\nMatrix mult in GF(2⁸)\neach column: 4→4 bytes"]
            AK["AddRoundKey\nXOR with round key i"]
            SB --> SR --> MC --> AK
        end
        FR["Final Round (no MixColumns)\nSubBytes→ShiftRows→AddRoundKey"]
        CT["Ciphertext 16 bytes"]
        PT --> IKA --> SB --> FR --> CT
    end
```

### 하위 바이트: S-Box를 GF(2⁸) 곱셈 역원으로

S-box는 임의적이지 않습니다. 각 바이트 `b`은 `b⁻¹ mod (x⁸+x⁴+x³+x+1)`(GF(2⁸)의 곱셈 역수)에 매핑된 다음 아핀 변환이 적용됩니다. 이는 다음을 제공합니다:
- **비선형성**: 모든 선형 대수 공격을 중단합니다.
- **눈사태**: 입력의 1비트 변경은 여러 라운드 후 출력 비트의 ~50%를 변경합니다.

### AES-GCM: 인증된 암호화

```mermaid
sequenceDiagram
    participant App as Application
    participant AESGCM as AES-GCM Engine

    App->>AESGCM: Encrypt(key, nonce, plaintext, AAD)
    Note over AESGCM: 1. Generate H = AES_K(0^128) [hash subkey]
    Note over AESGCM: 2. CTR mode: J0 = nonce || 0001\n   encrypt blocks: Ci = Pi XOR AES_K(inc(J0,i))
    Note over AESGCM: 3. GHASH over AAD+ciphertext:\n   T = GHASH_H(AAD, CT) XOR AES_K(J0)
    AESGCM-->>App: (ciphertext, auth_tag T [16 bytes])

    Note over App: Decrypt: verify tag FIRST\nbefore any plaintext output\n→ prevents padding oracle attacks
```

---

## 2. 공개 키 암호화: RSA 및 ECDH 내부

### RSA 키 생성 및 운영

```mermaid
flowchart TD
    subgraph "RSA Key Generation"
        P["Choose primes p, q\n(2048-bit each)"]
        N["n = p × q\n(4096-bit modulus)"]
        PHI["φ(n) = (p-1)(q-1)"]
        E["Choose e = 65537\n(Fermat prime, common)"]
        D["d = e⁻¹ mod φ(n)\n(Extended Euclidean Algorithm)"]
        PubKey["Public key: (n, e)"]
        PrivKey["Private key: (n, d) + (p, q, dp, dq, qInv)\nfor CRT optimization"]
        P --> N --> PHI --> E --> D
        E --> PubKey
        D --> PrivKey
    end
    subgraph "RSA-OAEP Encryption"
        M["Message m\n(< 446 bytes for 4096-bit key)"]
        OAEP["OAEP padding:\nm' = MGF(seed) XOR (m || hash)\npadded = seed XOR MGF(m')"]
        ENC["c = m'^e mod n\n(modular exponentiation)"]
        M --> OAEP --> ENC
    end
```

### ECDH 키 교환(Curve25519)

```mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob

    Note over A: Generate private key a (random 256-bit scalar)
    Note over A: Compute public key A = a×G\n(G = curve base point)
    Note over B: Generate private key b
    Note over B: Compute public key B = b×G

    A->>B: Send public key A = a×G
    B->>A: Send public key B = b×G

    Note over A: Shared secret = a×B = a×(b×G) = ab×G
    Note over B: Shared secret = b×A = b×(a×G) = ab×G
    Note over A,B: Both derive same shared secret\nwithout ever transmitting it\nECDH security: finding a from a×G\nis the discrete log problem\ninfeasible on elliptic curves
```

**NIST 곡선에 대한 Curve25519 이유**: Curve25519(GF(2²⁵⁵-19)에 대한 `y² = x³ + 486662x² + x`)에는 알려진 NIST 백도어가 없고 트위스트 보안이 적용되며 몽고메리 래더 구현은 일정 시간(타이밍 측면 채널 없음)입니다.

---

## 3. TLS 1.3 핸드셰이크: 모든 바이트 설명

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server

    C->>S: ClientHello\n[client_random, TLS 1.3,\nkey_share: X25519 pubkey,\nsupported_ciphers: AES-GCM, ChaCha20]

    Note over S: Select cipher + key exchange\nCompute DH shared secret\nDerive handshake keys via HKDF
    S->>C: ServerHello\n[server_random, key_share: X25519 pubkey]
    Note over S,C: Both derive:\nhandshake_secret = HKDF-Extract(DHE, early_secret)\nclient_hs_key, server_hs_key = HKDF-Expand(handshake_secret)

    Note over S: All subsequent messages encrypted
    S->>C: {EncryptedExtensions}\n{Certificate}\n{CertificateVerify: Sig(priv_key, transcript_hash)}\n{Finished: HMAC(server_hs_key, transcript)}

    Note over C: Verify certificate chain → root CA\nVerify CertificateVerify signature\nVerify Finished HMAC
    C->>S: {Finished: HMAC(client_hs_key, transcript)}

    Note over C,S: Derive application keys:\nmaster_secret = HKDF-Extract(0, handshake_secret)\nclient_app_key, server_app_key = HKDF-Expand(master_secret)

    C->>S: {Application Data} [encrypted with client_app_key]
    S->>C: {Application Data} [encrypted with server_app_key]
```

### HKDF 키 파생

TLS 1.3은 HKDF(HMAC 기반 추출 및 확장 KDF)를 사용합니다.
```
HKDF-Extract(salt, IKM) = HMAC-SHA256(salt, IKM) → PRK (pseudorandom key)
HKDF-Expand(PRK, info, L) = T(1) || T(2) || ... where T(i) = HMAC-SHA256(PRK, T(i-1)||info||i)
```

**순방향 비밀성**: TLS 1.3에서는 임시 키 교환(X25519/P-256)을 요구합니다. 세션 키는 연결당 새로운 DH 교환에서 파생됩니다. 즉, 나중에 서버의 장기 개인 키가 손상되더라도 과거 트래픽을 해독할 수 없습니다.

---

## 4. 해시 함수: SHA-256 내부

```mermaid
flowchart TD
    subgraph "SHA-256 Processing"
        MSG["Message M (arbitrary length)"]
        PAD["Padding:\nappend '1' bit\nappend zeros\nappend 64-bit length\n→ multiple of 512 bits"]
        
        subgraph "Each 512-bit block"
            SCHED["Message Schedule W[0..63]:\nW[i] = msg word for i<16\nW[i] = σ1(W[i-2])+W[i-7]+σ0(W[i-15])+W[i-16]"]
            INIT["Initialize: a,b,c,d,e,f,g,h\n= current hash state H[0..7]"]
            subgraph "64 compression rounds"
                T1["T1 = h + Σ1(e) + Ch(e,f,g) + K[i] + W[i]"]
                T2["T2 = Σ0(a) + Maj(a,b,c)"]
                ROT["h=g, g=f, f=e, e=d+T1\nd=c, c=b, b=a, a=T1+T2"]
                T1 --> T2 --> ROT
            end
            ADD["H[0..7] += a,b,c,d,e,f,g,h\n(add compressed to state)"]
        end
        FINAL["Final hash: H[0]||H[1]||...||H[7]\n= 256 bits"]
        MSG --> PAD --> SCHED --> INIT --> ADD --> FINAL
    end
```

**Σ 및 σ 함수는 비트 회전 + XOR을 사용합니다**:
- `Σ0(a) = ROTR²(a) XOR ROTR¹³(a) XOR ROTR²²(a)`
- `Ch(e,f,g) = (e AND f) XOR (NOT_e AND g)` — "선택" 기능
- `Maj(a,b,c) = (a AND b) XOR (a AND c) XOR (b AND c)` — "다수" 함수

이러한 비트 연산은 **눈사태 효과**를 생성합니다. 즉, 1개의 입력 비트를 뒤집으면 출력 비트의 ~50%가 변경됩니다.

---

## 5. 비밀번호 해싱: 왜 bcrypt/Argon2와 SHA-256을 비교해야 할까요?

```mermaid
flowchart TD
    subgraph "SHA-256 (WRONG for passwords)"
        SHA["SHA-256(password)"]
        GPU["Modern GPU: 10¹⁰ SHA-256/sec\nBrute force 8-char password: seconds"]
        SHA --> GPU
    end
    subgraph "bcrypt (Work Factor)"
        BCR["bcrypt(password, cost=12)"]
        BLO["Blowfish key schedule:\n2^12 = 4096 iterations\nDeliberately slow: ~100ms per hash"]
        BCR --> BLO
        GPU2["GPU attack: ~10⁴ bcrypt/sec\n10M attempts: 1000 seconds\n(vs 1ms for SHA-256)"]
        BLO --> GPU2
    end
    subgraph "Argon2id (Memory-Hard)"
        ARG["Argon2id(password, salt, t=3, m=64MB, p=4)"]
        MEM["Fills 64MB RAM per hash\nGPU cannot parallelize\n(limited RAM per core)\nResists ASICs and GPUs"]
        ARG --> MEM
    end
```

### Argon2 메모리 액세스 패턴

Argon2는 메모리 블록 매트릭스(각각 1KB)를 할당합니다. 각 블록 계산은 의사 무작위 이전 블록에 따라 달라집니다. 즉, 메모리의 전체 행렬 없이는 병렬화가 불가능합니다.

---

## 6. 버퍼 오버플로: 스택 스매싱 내부

```mermaid
flowchart TD
    subgraph "Normal Stack Frame"
        RET["Return address (8 bytes)"]
        SBP["Saved base pointer (8 bytes)"]
        LOC["Local variables:\nbuf[16] at rbp-0x20\ni at rbp-0x4"]
        ARGS["Function arguments"]
        RET --> SBP --> LOC --> ARGS
    end
    subgraph "Stack Smash Attack"
        INPUT["User input: 40 bytes of 'A's\n+ 8 bytes of attacker's address"]
        OVERFLOW["strcpy(buf, input)\n→ writes past buf[16]\n→ overwrites saved rbp\n→ overwrites return address!"]
        HIJACK["Function returns\n→ jumps to attacker's address\n→ shellcode execution\nor ROP chain gadget"]
        INPUT --> OVERFLOW --> HIJACK
    end
```

### 오버플로 중 스택 레이아웃

```
[High address]
  0x7fff1000: return address = 0x401234 (main+0x30)
  0x7ffe_fff8: saved RBP = 0x7fff2000
  0x7ffe_fff0: i = 0
  0x7ffe_ffe0: buf[0..15] = "AAAA..."
[Low address]
                         ↑
                    strcpy writes upward
After overflow:
  return address = 0x41414141 (AAAA — attacker controlled)
```

### 최신 완화 방법 및 우회 방법

```mermaid
flowchart LR
    subgraph "Mitigations"
        ASLR["ASLR\nRandomize stack/heap/lib base\nMitigation: info leak + brute force 32-bit"]
        NX["NX/DEP\nStack non-executable\nMitigation: ROP (return-oriented programming)"]
        CANARY["Stack Canary\nRandom value before ret addr\nMitigation: canary leak via format string"]
        CFI["CFI\nControl Flow Integrity\nVerify jump targets are valid"]
        ASLR --> CFI
        NX --> CFI
        CANARY --> CFI
    end
    subgraph "ROP Chain"
        G1["gadget 1: pop rdi; ret"]
        G2["gadget 2: pop rsi; ret"]
        G3["gadget 3: syscall"]
        G1 --> G2 --> G3
        Note["Chain existing code snippets\nending in 'ret' to execute\narbitrary operations"]
    end
```

---

## 7. OAuth 2.0 / OIDC: 토큰 흐름 내부

```mermaid
sequenceDiagram
    participant U as User Browser
    participant App as Client App
    participant Auth as Auth Server (AS)
    participant RS as Resource Server (API)

    U->>App: Click "Login with Google"
    App->>U: Redirect to AS:\nhttps://as.example.com/auth?\n  response_type=code\n  client_id=app123\n  redirect_uri=https://app/callback\n  scope=openid profile\n  state=random_csrf_token\n  code_challenge=BASE64(SHA256(verifier)) [PKCE]

    U->>Auth: Browser follows redirect
    Auth->>U: Login form
    U->>Auth: username/password
    Auth->>U: Redirect to:\nhttps://app/callback?\n  code=AUTH_CODE_xyz\n  state=random_csrf_token

    Note over App: Verify state == stored state (CSRF check)
    App->>Auth: POST /token\n  grant_type=authorization_code\n  code=AUTH_CODE_xyz\n  code_verifier=original_verifier [PKCE]\n  client_id=app123\n  client_secret=... (optional)

    Note over Auth: Verify code_verifier:\nBASE64(SHA256(code_verifier)) == code_challenge\nCode single-use, short TTL (10min)
    Auth-->>App: {\n  access_token: JWT (15min)\n  refresh_token: opaque (7 days)\n  id_token: JWT with user claims\n}

    App->>RS: GET /api/data\nAuthorization: Bearer <access_token>
    Note over RS: Verify JWT signature\nwith AS's public key (from JWKS)\nCheck exp, iss, aud claims
    RS-->>App: Protected resource data
```

### JWT 구조 및 서명 확인

```
Header: {"alg":"RS256","typ":"JWT","kid":"key-id-123"}
        → base64url encoded

Payload: {"sub":"user123","iss":"https://auth.example.com",
          "aud":"app123","exp":1709999999,"iat":1709996399,
          "scope":"openid profile"}
         → base64url encoded

Signature: RS256_sign(private_key, header.payload)
          = RSA-PKCS1v15-SHA256(private_key, base64(header)+"."+base64(payload))
          → base64url encoded

Final: header.payload.signature (3 dots-separated parts)
```

---

## 8. SQL 주입: 구문 분석 트리 조작

```mermaid
flowchart TD
    subgraph "Vulnerable Code"
        CODE["query = 'SELECT * FROM users WHERE name=\'' + user_input + '\''"]
        LEGIT["user_input = 'alice'\n→ WHERE name='alice' ✓"]
        ATTACK["user_input = \"' OR '1'='1\"\n→ WHERE name='' OR '1'='1'\n→ returns ALL rows!"]
        CODE --> LEGIT
        CODE --> ATTACK
    end
    subgraph "Parameterized Query (Safe)"
        PARAM["query = 'SELECT * FROM users WHERE name=?'\nparams = [user_input]"]
        PARSE["DB parses SQL structure ONCE\nbefore substituting value"]
        SAFE["user_input = \"' OR '1'='1\"\n→ treated as literal string\n→ WHERE name = \"\\' OR \\'1\\'=\\'1\\'\"\n→ no rows returned ✓"]
        PARAM --> PARSE --> SAFE
    end
```

핵심: 파서 수준에서 매개변수화된 쿼리 **데이터와 별도의 코드**. SQL 엔진은 템플릿에서 구문 분석 트리를 구축한 다음 값을 데이터 리터럴로 대체합니다. 값은 트리 구조를 변경할 수 없습니다.

---

## 9. 인증서 체인 검증

```mermaid
flowchart TD
    subgraph "Certificate Chain"
        LEAF["Leaf Cert: *.example.com\nPublic Key: EC P-256\nIssuer: DigiCert TLS RSA\nSignature: RSA by DigiCert TLS RSA key"]
        INT["Intermediate CA: DigiCert TLS RSA\nPublic Key: RSA 2048\nIssuer: DigiCert Global Root CA\nSignature: RSA by Root CA key"]
        ROOT["Root CA: DigiCert Global Root CA\nPublic Key: RSA 2048\nIssuer: self-signed\nTrusted: pre-installed in OS/browser"]

        LEAF --> INT --> ROOT
    end
    subgraph "Verification Steps"
        V1["1. Verify leaf cert signature\n   using intermediate CA's public key"]
        V2["2. Verify intermediate cert signature\n   using root CA's public key"]
        V3["3. Verify root cert in trusted store\n   (OS certificate bundle)"]
        V4["4. Check hostname: CN/SAN matches\n   *.example.com → valid for www.example.com"]
        V5["5. Check validity period\n   notBefore < now < notAfter"]
        V6["6. Check revocation:\n   OCSP staple or CRL download"]
        V1 --> V2 --> V3 --> V4 --> V5 --> V6
    end
```

**인증서 투명성(CT)**: 2018년부터 브라우저에서는 발급 전에 모든 TLS 인증서가 공개 CT 로그에 기록되도록 요구합니다. 리프 인증서에는 **서명된 인증서 타임스탬프(SCT)**가 포함되어 있어 CT 로그에 제출되었음을 증명합니다. 이렇게 하면 잘못 발급된 인증서가 숨겨지는 것을 방지할 수 있습니다.

---

## 10. 메모리 안전: Use-After-Free 공격

```mermaid
sequenceDiagram
    participant App as Application
    participant Heap as Heap Allocator
    participant Attacker as Attacker-Controlled Input

    App->>Heap: malloc(64) → ptr A [0x7f001000]
    Note over App: Use ptr A (fill with vtable/func ptr data)
    App->>Heap: free(ptr A)
    Note over Heap: Block returned to free list\nptr A still contains 0x7f001000\n(dangling pointer)

    Attacker->>Heap: malloc(64) → ptr B [0x7f001000]
    Note over Attacker: Same address reused!\nWrite attacker-controlled data\nincluding fake vtable pointer

    App->>App: Use ptr A (dangling!)\ncall through vtable
    Note over App: Vtable = attacker's fake vtable\n→ virtual function call\njumps to attacker's address
```

**완화**:
- **메모리 안전 언어**: Rust 빌림 검사기는 컴파일 타임에 포인터가 매달리는 것을 방지합니다.
- **AddressSanitizer**: 레드 존 + 섀도우 메모리가 런타임 시 사용 후 사용을 감지합니다(2-3배 속도 저하).
- **tcmalloc/jemalloc 포인터 무작위화**: 재사용 주소 예측을 더 어렵게 만듭니다.
- **CFI**: 예상 클래스 계층 구조에 대해 vtable 호출 대상을 검증합니다.

---

## 11. 사이드 채널 공격: 타이밍 및 캐시

### Spectre(캐시 타이밍 사이드 채널)

```mermaid
flowchart TD
    subgraph "Spectre Attack Mechanism"
        S1["Attacker trains branch predictor:\nif (x < array_size) → always taken"]
        S2["Attacker provides x = secret_address (OOB)"]
        S3["CPU speculatively executes:\nvalue = array1[x]  ← OOB read\ntemp = array2[value * 4096]  ← cache load"]
        S4["Branch misprediction detected\nSpeculative results discarded\nBut cache state persists!"]
        S5["Attacker measures cache hit time:\nfor each byte b in 0..255:\n  time access to array2[b*4096]\n  cache hit (~50 cycles) → b was the secret byte"]
        S1 --> S2 --> S3 --> S4 --> S5
    end
```

**LFENCE 완화**: 경계 확인 후 `LFENCE`을 삽입하면 OOB 액세스의 추측 실행이 방지됩니다. **Retpoline**은 간접 분기(jmp [rax])를 분기 예측자를 혼동하는 반환 기반 트램펄린으로 대체하여 BTI(분기 대상 주입)를 방지합니다.

---

## 12. 영지식 증명: 공개하지 않고 증명하기

```mermaid
sequenceDiagram
    participant P as Prover (knows secret x)
    participant V as Verifier

    Note over P: Knows: x such that y = g^x mod p
    Note over V: Knows only: y, g, p

    P->>V: Commit: r = g^k mod p\n(k = random nonce)
    V->>P: Challenge: c = random bit (0 or 1)
    P->>V: Response: s = k - c*x mod (p-1)

    Note over V: Verify: g^s * y^c mod p == r\nIf c=0: g^k * 1 == r ✓\nIf c=1: g^(k-x) * g^x == g^k == r ✓

    Note over P,V: Repeat 100 times → soundness: 2^(-100)\nVerifier learns nothing about x\n(any r,s,c triple is simulatable)
```

**zk-SNARKs** (ZCash, Ethereum에서 사용됨): 증명자는 회로 `C(x, w) = 1`을 만족하는 증인 `w`을 알고 있습니다. 증명 크기는 O(1)(수백 바이트)이고 검증은 회로 복잡성에 관계없이 O(1)입니다. 이를 통해 금액을 공개하지 않고도 블록체인 거래를 확인할 수 있습니다.

---

## 13. 키 교환 요약: 모든 HTTPS 연결에서 실제로 일어나는 일

```mermaid
flowchart LR
    subgraph "0ms: TCP SYN/SYN-ACK/ACK"
        TCP["3-way handshake"]
    end
    subgraph "~10ms: TLS ClientHello"
        CH["Random + supported ciphers\n+ X25519 ephemeral pubkey\n+ SNI hostname"]
    end
    subgraph "~20ms: TLS ServerHello + Certificate"
        SH["X25519 ephemeral pubkey\n+ certificate chain\n+ CertificateVerify\n+ Finished HMAC"]
    end
    subgraph "~30ms: TLS Finished + First Request"
        FIN["Client Finished HMAC\n+ HTTP GET (0-RTT or 1-RTT)"]
    end
    subgraph "Keys Derived"
        KEYS["ECDH shared secret\n→ HKDF early_secret\n→ handshake_secret\n→ master_secret\n→ client/server app keys\n(unique per connection,\nnever stored)"]
    end
    TCP --> CH --> SH --> FIN
    SH --> KEYS
    FIN --> KEYS
```

---

## 보안 속성 상호 참조

| 위협 | 메커니즘 | 국방 |
|---|---|---|
| 무차별 비밀번호 | 빠른 해시(SHA-256) | 메모리 하드 해시(Argon2id) |
| MITM 차단 | 인증 없음 | TLS 인증서 체인 확인 |
| 교통 재생 | 캡처된 토큰 재사용 | 토큰의 Nonce/타임스탬프, 짧은 TTL |
| 버퍼 오버플로 | 경계 없는 strcpy | 경계 검사 API, ASLR+NX+Canary |
| SQL 주입 | 문자열 연결 | 매개변수화된 쿼리 |
| 사용 후 무료 | C/C++ 수동 메모리 | Rust 빌림 검사기, ASan |
| 캐시 타이밍(Spectre) | 투기적 실행 | LFENCE, 리트폴린, 사이트 격리 |
| CSRF | 교차 출처 상태 변경 요청 | SameSite 쿠키, CSRF 토큰 |
| XSS | 정리되지 않은 HTML 출력 | 콘텐츠 보안 정책, 출력 인코딩 |
| 다운그레이드 공격 | TLS 버전 협상 | TLS_FALLBACK_SCSV, HSTS 사전 로드 |


---

## 설계적 고민

### 구조와 모델링

보안 시스템 설계에서 가장 근본적인 구조적 질문은 **"어디에 신뢰 경계를 설정할 것인가"**입니다. 전통적 경계 보안(perimeter security)은 내부 네트워크를 신뢰하고 외부만 차단하지만, 제로 트러스트 모델은 모든 요청을 검증 대상으로 봅니다.

**대칭키 vs 비대칭키 구조 선택**은 보안 시스템의 기초 설계를 결정합니다. 대칭키(AES-256-GCM)는 처리 속도가 비대칭키(RSA-2048) 대비 약 1000배 빠르지만, N명의 참여자 간 키 배포에 O(N²)개의 키가 필요합니다. 비대칭키는 O(N)개의 키 쌍만 필요하나 연산 비용이 높습니다. 현대 TLS 1.3은 이 둘을 결합한 하이브리드 구조를 채택합니다.

```mermaid
flowchart TD
    subgraph "전통적 경계 보안 모델"
        FW["방화벽\n외부 → 내부 차단"]
        INT["내부 네트워크\n암묵적 신뢰\nFlat Network"]
        SRV["내부 서버들\n상호 인증 없음"]
        FW --> INT --> SRV
    end
    subgraph "제로 트러스트 모델"
        IDP["Identity Provider\n모든 요청 인증\nMFA 필수"]
        PEP["Policy Enforcement Point\n컨텍스트 기반 접근 제어\n디바이스 상태 + 위치 + 시간"]
        MICRO["마이크로세그멘테이션\n서비스 간 mTLS\n최소 권한 원칙"]
        IDP --> PEP --> MICRO
    end
    subgraph "하이브리드 암호화 (TLS 1.3)"
        ASYM["비대칭키 (X25519)\n키 교환 전용\n연산 비용 높음"]
        KDF["HKDF\n공유 비밀 → 세션 키 유도"]
        SYM["대칭키 (AES-256-GCM)\n데이터 암호화\n초당 수 GB 처리"]
        ASYM -->|"1회 Handshake"| KDF -->|"세션 키"| SYM
    end
```

제로 트러스트에서 핵심은 **Policy Decision Point(PDP)**와 **Policy Enforcement Point(PEP)**의 분리입니다. PDP는 접근 정책을 평가하고, PEP는 실제 트래픽 경로에서 정책을 강제합니다. 이 분리를 통해 정책 변경이 트래픽 경로에 영향을 주지 않으며, 새로운 서비스 추가 시에도 일관된 보안 정책을 적용할 수 있습니다.

### 트레이드오프와 의사결정

보안 설계에서 가장 빈번한 트레이드오프는 **JWT vs 세션 토큰** 선택입니다. JWT는 서버 측 상태가 불필요하여 수평 확장에 유리하지만, 발급 후 즉시 무효화가 어렵습니다. 세션 토큰은 서버에서 즉시 삭제 가능하지만, 세션 저장소(Redis 등)에 대한 의존성이 생깁니다.

```mermaid
flowchart LR
    subgraph "JWT 기반 인증"
        CLIENT1["클라이언트"] -->|"Bearer eyJhbG..."| API1["API 서버 A"]
        CLIENT1 -->|"동일 JWT"| API2["API 서버 B"]
        CLIENT1 -->|"동일 JWT"| API3["API 서버 C"]
        API1 -->|"공개키로 로컬 검증\n네트워크 호출 불필요"| VERIFY1["✓ 유효"]
        API2 -->|"로컬 검증"| VERIFY2["✓ 유효"]
        API3 -->|"로컬 검증"| VERIFY3["✓ 유효"]
    end
    subgraph "세션 토큰 기반 인증"
        CLIENT2["클라이언트"] -->|"SessionID: abc123"| API4["API 서버"]
        API4 -->|"매 요청마다 조회"| REDIS["Redis 세션 저장소\n즉시 삭제 가능\nSPOF 위험"]
        REDIS -->|"세션 데이터 반환"| API4
    end
```

**OAuth 2.0 플로우 선택**도 중요한 의사결정입니다. Authorization Code + PKCE는 현재 가장 권장되는 방식으로, SPA와 모바일 앱 모두에서 안전합니다. Implicit Flow는 토큰이 URL fragment에 노출되어 더 이상 권장되지 않습니다. Client Credentials는 서비스 간 통신에만 적합합니다.

| 플로우 | 사용 시나리오 | 보안 수준 | Refresh Token |
|---|---|---|---|
| Authorization Code + PKCE | SPA, 모바일, 서버 앱 | 높음 | 지원 |
| Client Credentials | 서비스 간 (M2M) | 높음 | 불필요 |
| Device Authorization | IoT, CLI | 중간 | 지원 |
| Implicit (deprecated) | 레거시 SPA | 낮음 | 미지원 |

### 리팩토링과 설계 원칙

보안 아키텍처에서 **심층 방어(Defense in Depth)** 원칙은 단일 보안 레이어 실패가 전체 시스템 침해로 이어지지 않도록 다층 방어를 구축하는 것입니다. 각 레이어는 독립적으로 동작하며, 하나가 뚫려도 다음 레이어가 공격을 차단합니다.

```mermaid
flowchart TD
    subgraph "심층 방어 레이어 설계"
        L1["레이어 1: 네트워크 경계\nWAF + DDoS 방어\nRate Limiting\nGeo-blocking"]
        L2["레이어 2: 전송 보안\nTLS 1.3 필수\nCertificate Pinning\nHSTS Preload"]
        L3["레이어 3: 인증/인가\nOAuth 2.0 + PKCE\nRBAC/ABAC\nMFA 강제"]
        L4["레이어 4: 애플리케이션\n입력 검증/이스케이핑\nCSP + CORS\nParameterized Query"]
        L5["레이어 5: 데이터\nAES-256-GCM 암호화\nArgon2id 해싱\n키 관리(HSM/KMS)"]
        L6["레이어 6: 감사/탐지\nSIEM 로그 수집\n이상 행동 탐지\n침해 지표(IoC) 모니터링"]
        L1 --> L2 --> L3 --> L4 --> L5 --> L6
    end
```

리팩토링 관점에서 보안 코드의 핵심 원칙은 **"보안 로직을 비즈니스 로직에서 분리"**하는 것입니다. 인증/인가는 미들웨어 또는 게이트웨이 레이어에서 처리하고, 개별 서비스는 이미 검증된 컨텍스트만 받아야 합니다. 이를 통해 보안 정책 변경 시 개별 서비스 코드 수정 없이 중앙에서 일괄 적용할 수 있습니다.

**최소 권한 원칙(Principle of Least Privilege)**은 리팩토링 시 항상 점검해야 할 사항입니다. 서비스 계정, API 키, IAM 역할 모두 필요한 최소한의 권한만 부여해야 합니다. 과도한 권한은 침해 발생 시 폭발 반경(blast radius)을 키웁니다.

### 디자인 패턴 적용

보안 시스템에서 자주 사용되는 디자인 패턴은 **Gateway Pattern**, **Token Relay Pattern**, **Circuit Breaker**(인증 서버 장애 대응) 등입니다.

```mermaid
flowchart TD
    subgraph "API Gateway 보안 패턴"
        CLIENT["클라이언트"]
        GW["API Gateway\n- JWT 검증\n- Rate Limiting\n- Request Sanitization\n- mTLS termination"]
        AUTH["Auth Service\n- Token 발급/갱신\n- Refresh Token Rotation\n- Blocklist 관리"]
        SVC1["서비스 A\n비즈니스 로직만\n보안 로직 없음"]
        SVC2["서비스 B\n비즈니스 로직만\n보안 로직 없음"]
        CLIENT -->|"Access Token"| GW
        GW -->|"검증 요청"| AUTH
        GW -->|"인증된 컨텍스트 전달\nX-User-Id, X-Roles"| SVC1
        GW -->|"인증된 컨텍스트 전달"| SVC2
    end
    subgraph "Refresh Token Rotation 패턴"
        RT1["Refresh Token v1\n발급"] -->|"사용"| RT2["Refresh Token v2\n발급 + v1 무효화"]
        RT2 -->|"사용"| RT3["Refresh Token v3\n발급 + v2 무효화"]
        RT1 -->|"재사용 시도"| DETECT["⚠ 토큰 탈취 탐지\n모든 RT 무효화\n사용자 강제 로그아웃"]
    end
```

**Secure by Default 패턴**은 시스템의 기본 상태가 가장 안전한 설정이어야 한다는 원칙입니다. 새로운 API 엔드포인트는 기본적으로 인증 필수이며, 공개가 필요한 경우 명시적으로 `@Public` 어노테이션을 추가해야 합니다. CORS는 기본 차단이며, 허용 도메인을 화이트리스트로 관리합니다.

**감사 로그 패턴(Audit Trail Pattern)**도 보안 설계의 핵심입니다. 모든 인증/인가 이벤트, 데이터 접근, 설정 변경은 불변 로그로 기록하며, 로그 자체의 무결성도 해시 체인으로 보장합니다. 이는 사후 분석(forensics)과 컴플라이언스(SOC 2, ISO 27001) 요구사항을 동시에 충족합니다.

## 연습 문제

### 1. 시스템 구조와 모델링

**문제 1-1.** 모바일 뱅킹 앱이 OAuth 2.0 Authorization Code + PKCE 흐름을 사용하여 사용자의 계좌 정보에 접근하려 합니다. 앱이 Authorization Server에 인가 코드를 요청하고, 이를 Access Token으로 교환한 뒤, Resource Server에서 데이터를 가져오는 전체 흐름을 그려보세요. 이때 PKCE의 `code_verifier`와 `code_challenge`가 각 단계에서 어떤 역할을 하며, PKCE가 없을 경우 모바일 환경에서 어떤 공격이 가능한지 설명하세요.

<details><summary>힌트 보기</summary>

모바일 앱은 클라이언트 시크릿을 안전하게 저장할 수 없으므로, 인가 코드 가로채기(Authorization Code Interception) 공격에 취약합니다. PKCE는 앱이 생성한 `code_verifier`의 해시(`code_challenge`)를 인가 요청에 포함시키고, 토큰 교환 시 원본 `code_verifier`를 제출하여 인가 코드를 가로챈 공격자가 토큰을 획득하지 못하도록 합니다. `S256` 변환 방식과 `plain` 방식의 보안 차이도 고려해 보세요.

</details>

**문제 1-2.** 사용자가 브라우저에서 `https://bank.com`에 접속할 때, PKI(Public Key Infrastructure) 기반 인증서 체인 검증이 수행됩니다. 브라우저가 서버 인증서를 받은 후 Root CA까지 체인을 검증하고, OCSP로 인증서 폐지 여부를 확인하며, 최종적으로 세션 키를 교환하는 전체 흐름을 단계별로 설명하세요. 만약 중간 CA(Intermediate CA)의 인증서가 만료되었다면 어떤 단계에서 연결이 실패하는지도 함께 분석하세요.

<details><summary>힌트 보기</summary>

인증서 체인 검증은 서버 인증서 → 중간 CA 인증서 → Root CA 인증서 순서로 각 인증서의 서명을 상위 CA의 공개키로 검증합니다. OCSP(Online Certificate Status Protocol)는 인증서가 폐지(revoke)되지 않았는지 실시간으로 확인하며, OCSP Stapling은 서버가 OCSP 응답을 미리 가져와 TLS 핸드셰이크에 포함시켜 지연을 줄입니다. 중간 CA 만료 시 체인의 신뢰 앵커(Trust Anchor)까지 도달할 수 없어 `ERR_CERT_AUTHORITY_INVALID` 에러가 발생합니다.

</details>

**문제 1-3.** TLS 1.3 핸드셰이크에서 클라이언트와 서버가 세션 키를 협상하는 과정을 TLS 1.2와 비교하여 설명하세요. TLS 1.3이 핸드셰이크 왕복 횟수를 줄인 방법(1-RTT, 0-RTT)과, 0-RTT 재개(resumption)가 갖는 보안 위험(replay attack)은 무엇인지 분석하세요.

<details><summary>힌트 보기</summary>

TLS 1.2는 2-RTT가 필요하지만 TLS 1.3은 키 교환과 암호 스위트 협상을 동시에 수행하여 1-RTT로 줄입니다. 0-RTT는 이전 세션의 PSK(Pre-Shared Key)를 사용해 첫 요청에 데이터를 포함시키지만, 서버가 요청의 고유성을 보장할 수 없어 리플레이 공격에 취약합니다. 멱등하지 않은 요청(결제 등)에는 0-RTT를 사용해서는 안 됩니다.

</details>

### 2. 트레이드오프와 의사결정

**문제 2-1.** 마이크로서비스 아키텍처에서 인증 토큰 방식을 선택해야 합니다. JWT(JSON Web Token)는 무상태(stateless)이므로 수평 확장에 유리하지만, 한 번 발급하면 만료 전까지 서버 측에서 즉시 무효화할 수 없습니다. 반면 서버 세션 토큰(opaque token)은 중앙 세션 스토어가 필요합니다. 다음 시나리오에서 각각 어떤 방식이 더 적합한지 근거와 함께 설명하세요: (1) 금융 앱에서 즉시 로그아웃 기능이 필수인 경우, (2) 글로벌 CDN 엣지에서 API 인가를 수행해야 하는 경우.

<details><summary>힌트 보기</summary>

JWT의 즉시 무효화 문제를 해결하는 방법으로 짧은 만료 시간 + Refresh Token 조합, 토큰 블랙리스트(Redis), Token Introspection 엔드포인트가 있습니다. 각 방법은 무상태성을 일부 포기하는 트레이드오프가 있습니다. CDN 엣지에서는 중앙 세션 스토어 접근 지연이 치명적이므로 JWT의 자체 검증(self-contained verification)이 유리하지만, 토큰 크기가 쿠키 제한에 영향을 줄 수 있습니다.

</details>

**문제 2-2.** 새로운 서비스의 TLS 인증서에 사용할 암호화 알고리즘을 선택해야 합니다. RSA-2048, RSA-4096, ECDSA P-256 중에서 선택해야 할 때, 보안 강도(비트 수준의 안전성), 서명 생성/검증 속도, 인증서 및 핸드셰이크 크기의 관점에서 각 알고리즘의 트레이드오프를 분석하세요. IoT 디바이스(제한된 컴퓨팅 자원)와 고성능 웹 서버 각각에 어떤 선택이 적합한지 판단하세요.

<details><summary>힌트 보기</summary>

ECDSA P-256은 RSA-3072과 동등한 보안 강도(128비트)를 제공하면서 키 크기가 훨씬 작습니다(256비트 vs 3072비트). 서명 생성은 ECDSA가 빠르지만, 서명 검증은 RSA가 빠릅니다(공개키 지수 e가 작으므로). 인증서 크기 차이는 대역폭이 제한된 IoT 환경에서 중요하며, TLS 핸드셰이크 패킷 수에도 영향을 줍니다.

</details>

**문제 2-3.** API 게이트웨이에서 인증/인가 처리를 중앙화할지, 각 마이크로서비스가 독립적으로 수행할지 결정해야 합니다. 보안 정책 일관성, 단일 장애점(SPOF), 서비스 자율성, 성능(추가 네트워크 홉) 관점에서 두 접근법의 트레이드오프를 분석하고, 하이브리드 전략(게이트웨이에서 인증, 서비스에서 세분화된 인가)의 장점을 설명하세요.

<details><summary>힌트 보기</summary>

게이트웨이 중앙화는 보안 정책 일관성과 관리 편의성이 높지만, 모든 트래픽이 게이트웨이를 거치므로 병목이 될 수 있습니다. 서비스별 독립 처리는 각 서비스가 도메인 특화 인가 로직을 유연하게 구현할 수 있지만, 보안 라이브러리 버전 불일치 등 일관성 문제가 발생합니다. 하이브리드 접근에서 게이트웨이는 JWT 검증과 기본 인증을 담당하고, 서비스는 JWT 클레임에 기반한 세분화된 RBAC/ABAC를 수행합니다.

</details>

### 3. 문제 해결 및 리팩토링

**문제 3-1.** 다음 코드에는 SQL Injection 취약점이 있습니다:

```java
String query = "SELECT * FROM users WHERE id = " + userId;
Statement stmt = connection.createStatement();
ResultSet rs = stmt.executeQuery(query);
```

이 코드를 Prepared Statement로 리팩토링하세요. 또한, ORM(예: JPA/Hibernate)을 사용하더라도 `@Query(nativeQuery = true)` 어노테이션으로 Raw Query를 작성할 때 여전히 SQL Injection에 취약한 이유를 설명하고, 안전한 대안을 제시하세요.

<details><summary>힌트 보기</summary>

Prepared Statement는 쿼리 구조와 데이터를 분리하여 `?` 바인딩 파라미터로 값을 전달합니다. ORM의 JPQL/HQL도 문자열 연결 방식(`"WHERE name = '" + input + "'"`)으로 작성하면 HQL Injection에 취약합니다. 안전한 방법은 `@Param` 바인딩, Criteria API, QueryDSL 등 파라미터화된 쿼리 빌더를 사용하는 것입니다. 동적 테이블명/컬럼명은 바인딩할 수 없으므로 화이트리스트 검증이 필요합니다.

</details>

**문제 3-2.** 웹 애플리케이션의 세션 쿠키가 다음과 같이 설정되어 있습니다:

```http
Set-Cookie: sessionId=abc123; Path=/
```

`Secure`, `HttpOnly`, `SameSite` 플래그가 모두 누락된 상태입니다. 각 플래그의 부재가 어떤 공격(XSS, CSRF, 중간자 공격)에 노출되는지 설명하고, 올바른 쿠키 설정으로 리팩토링하세요. `SameSite=Strict`와 `SameSite=Lax`의 차이도 비교하세요.

<details><summary>힌트 보기</summary>

`HttpOnly`가 없으면 JavaScript(`document.cookie`)로 쿠키 탈취가 가능하여 XSS 공격에 취약합니다. `Secure`가 없으면 HTTP 평문 전송으로 중간자 공격에 노출됩니다. `SameSite`가 없으면 외부 사이트에서의 크로스사이트 요청에 쿠키가 포함되어 CSRF에 취약합니다. `SameSite=Strict`는 모든 크로스사이트 요청에서 쿠키를 차단하지만, 외부 링크로 접근 시 로그인이 풀리는 UX 문제가 있어 `Lax`가 더 일반적입니다.

</details>

**문제 3-3.** 레거시 시스템에서 비밀번호가 `SHA-256(password)` 해시로 저장되어 있습니다. Salt도 적용되어 있지 않습니다. 이 시스템이 레인보우 테이블 공격에 취약한 이유를 설명하고, bcrypt 또는 Argon2로 마이그레이션하는 전략을 설계하세요. 기존 사용자의 비밀번호를 모르는 상태에서 점진적으로 마이그레이션하는 방법도 포함하세요.

<details><summary>힌트 보기</summary>

Salt가 없는 해시는 동일 비밀번호가 동일 해시값을 가지므로, 미리 계산된 레인보우 테이블로 역방향 조회가 가능합니다. 점진적 마이그레이션 전략: (1) 기존 해시를 bcrypt로 감싸기(`bcrypt(SHA-256(password))`), (2) 사용자 로그인 시 평문 비밀번호를 받아 새 bcrypt 해시로 교체, (3) DB에 `hash_version` 컬럼을 추가하여 마이그레이션 완료 여부를 추적합니다. Argon2는 메모리 하드니스(memory-hard)로 GPU 병렬 공격에 더 강력합니다.

</details>

### 4. 개념 간의 연결성

**문제 4-1.** 마이크로서비스 환경에서 제로 트러스트 아키텍처를 구현하려 합니다. 기존의 네트워크 경계 기반 보안(VPN + 방화벽)이 충분하지 않은 이유를 설명하고, mTLS(상호 TLS)와 SPIFFE/SPIRE를 사용하여 서비스 간 인증을 "네트워크 위치"가 아닌 "서비스 ID"로 전환하는 구체적인 구현 방식을 설명하세요. SPIFFE ID(`spiffe://trust-domain/workload-id`)가 X.509 인증서의 SAN(Subject Alternative Name)에 어떻게 인코딩되는지도 함께 설명하세요.

<details><summary>힌트 보기</summary>

제로 트러스트는 네트워크 내부도 신뢰하지 않는 원칙입니다. mTLS는 클라이언트와 서버 양쪽 모두 인증서를 제시하여 상호 인증합니다. SPIFFE는 워크로드에 고유 ID를 부여하는 표준이며, SPIRE는 SPIFFE ID가 포함된 X.509-SVID(SPIFFE Verifiable Identity Document)를 자동으로 발급/갱신합니다. 서비스 메시(Istio/Envoy)의 사이드카가 mTLS를 투명하게 처리하므로 애플리케이션 코드 변경이 최소화됩니다.

</details>

**문제 4-2.** 비밀번호 저장 시스템을 설계하면서 bcrypt와 Argon2의 내부 동작을 비교하려 합니다. 단순 SHA-256 해시가 레인보우 테이블 공격에 취약한 이유, Salt의 역할, 그리고 adaptive hashing(비용 인자를 조절하여 해시 계산 시간을 의도적으로 늘리는 설계)이 GPU 기반 무차별 대입 공격에 대응하는 원리를 연결하여 설명하세요. Argon2가 bcrypt보다 메모리 하드니스 측면에서 우수한 이유도 분석하세요.

<details><summary>힌트 보기</summary>

SHA-256은 빠른 해시 함수이므로 GPU로 초당 수십억 개의 해시를 계산할 수 있습니다. bcrypt는 Blowfish 키 스케줄링의 비용 인자(cost factor)를 조절하여 의도적으로 느리게 만들지만, 메모리 사용량이 고정(4KB)이어서 FPGA/ASIC 공격에 제한적입니다. Argon2는 메모리 비용(memory_cost), 시간 비용(time_cost), 병렬도(parallelism)를 독립적으로 조절할 수 있어, 대량의 메모리를 요구함으로써 GPU 병렬 공격의 경제성을 떨어뜨립니다.

</details>

**문제 4-3.** HTTPS 통신에서 대칭키 암호화와 비대칭키 암호화가 함께 사용되는 이유를 설명하세요. TLS 핸드셰이크에서 RSA/ECDHE로 키 교환을 수행한 뒤 AES-GCM으로 데이터를 암호화하는 하이브리드 방식의 설계 근거를 성능과 보안 관점에서 분석하고, Perfect Forward Secrecy(PFS)를 보장하려면 키 교환 알고리즘에 어떤 속성이 필요한지 설명하세요.

<details><summary>힌트 보기</summary>

비대칭키 암호화(RSA, ECDHE)는 키 교환에는 안전하지만 대용량 데이터 암호화에는 느립니다(약 1000배 차이). 대칭키(AES-GCM)는 빠르지만 키 공유 문제가 있습니다. 하이브리드 방식은 양쪽의 장점을 결합합니다. PFS는 서버의 장기 개인키가 유출되어도 과거 세션 키를 복호화할 수 없는 속성으로, 임시 키(ephemeral key)를 사용하는 DHE/ECDHE가 이를 보장합니다. 정적 RSA 키 교환은 PFS를 제공하지 못하므로 TLS 1.3에서 제거되었습니다.

</details>