# Security Internals: Cryptography, Authentication & Exploit Mechanics

> Under the Hood: How TLS handshakes negotiate keys, how hash functions avalanche, how buffer overflows corrupt control flow, how OAuth tokens prove identity — the exact memory layouts, state machines, and mathematical operations behind security mechanisms.

---

## 1. Symmetric Encryption: AES Internal Mechanics

AES (Advanced Encryption Standard) operates on a 4×4 byte **state matrix** through 10/12/14 rounds (for 128/192/256-bit keys).

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

### SubBytes: S-Box as GF(2⁸) Multiplicative Inverse

The S-box is not arbitrary — each byte `b` is mapped to `b⁻¹ mod (x⁸+x⁴+x³+x+1)` (multiplicative inverse in GF(2⁸)), then an affine transform is applied. This provides:
- **Non-linearity**: breaks any linear algebraic attack
- **Avalanche**: 1 bit change in input changes ~50% of output bits after several rounds

### AES-GCM: Authenticated Encryption

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

## 2. Public Key Cryptography: RSA and ECDH Internals

### RSA Key Generation and Operations

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

### ECDH Key Exchange (Curve25519)

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

**Why Curve25519 over NIST curves**: Curve25519 (`y² = x³ + 486662x² + x` over GF(2²⁵⁵-19)) has no known NIST backdoors, is twist-secure, and the Montgomery ladder implementation is constant-time (no timing side channels).

---

## 3. TLS 1.3 Handshake: Every Byte Explained

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

### HKDF Key Derivation

TLS 1.3 uses HKDF (HMAC-based Extract-and-Expand KDF):
```
HKDF-Extract(salt, IKM) = HMAC-SHA256(salt, IKM) → PRK (pseudorandom key)
HKDF-Expand(PRK, info, L) = T(1) || T(2) || ... where T(i) = HMAC-SHA256(PRK, T(i-1)||info||i)
```

**Forward Secrecy**: TLS 1.3 mandates ephemeral key exchange (X25519/P-256). The session key is derived from a fresh DH exchange per connection — compromising the server's long-term private key later cannot decrypt past traffic.

---

## 4. Hash Functions: SHA-256 Internals

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

**Σ and σ functions use bit rotations + XOR**:
- `Σ0(a) = ROTR²(a) XOR ROTR¹³(a) XOR ROTR²²(a)`
- `Ch(e,f,g) = (e AND f) XOR (NOT_e AND g)` — "choose" function
- `Maj(a,b,c) = (a AND b) XOR (a AND c) XOR (b AND c)` — "majority" function

These bitwise operations create the **avalanche effect**: flipping 1 input bit changes ~50% of output bits.

---

## 5. Password Hashing: Why bcrypt/Argon2 vs SHA-256

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

### Argon2 Memory Access Pattern

Argon2 allocates a matrix of memory blocks (1KB each). Each block computation depends on pseudo-random previous blocks — impossible to parallelize without the full matrix in memory.

---

## 6. Buffer Overflow: Stack Smashing Internals

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

### Stack Layout During Overflow

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

### Modern Mitigations and How They're Bypassed

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

## 7. OAuth 2.0 / OIDC: Token Flow Internals

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

### JWT Structure and Signature Verification

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

## 8. SQL Injection: Parse Tree Manipulation

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

The key: parameterized queries **separate code from data** at the parser level. The SQL engine builds the parse tree from the template, then substitutes values as data literals — the value can never alter the tree structure.

---

## 9. Certificate Chain Verification

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

**Certificate Transparency (CT)**: Since 2018, browsers require all TLS certs to be logged in public CT logs before issuance. The leaf cert contains a **Signed Certificate Timestamp (SCT)** — proof that it was submitted to a CT log. This prevents misissued certificates from hiding.

---

## 10. Memory Safety: Use-After-Free Exploitation

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

**Mitigations**:
- **Memory-safe languages**: Rust borrow checker prevents dangling pointers at compile time
- **AddressSanitizer**: Red zones + shadow memory detect use-after-free at runtime (2-3× slowdown)
- **tcmalloc/jemalloc pointer randomization**: Makes reuse address prediction harder
- **CFI**: Validates vtable call targets against expected class hierarchy

---

## 11. Side-Channel Attacks: Timing and Cache

### Spectre (Cache Timing Side Channel)

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

**Mitigation LFENCE**: Inserting `LFENCE` after bounds check prevents speculative execution of OOB access. **Retpoline** replaces indirect branches (jmp [rax]) with a return-based trampoline that confuses the branch predictor, preventing BTI (branch target injection).

---

## 12. Zero-Knowledge Proofs: Proving Without Revealing

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

**zk-SNARKs** (used in ZCash, Ethereum): The prover knows a witness `w` satisfying a circuit `C(x, w) = 1`. The proof size is O(1) (a few hundred bytes) and verification is O(1) regardless of circuit complexity. This enables verifying blockchain transactions without revealing amounts.

---

## 13. Key Exchange Summary: What Actually Happens in Every HTTPS Connection

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

## Security Properties Cross-Reference

| Threat | Mechanism | Defense |
|---|---|---|
| Brute force password | Fast hash (SHA-256) | Memory-hard hash (Argon2id) |
| MITM interception | No authentication | TLS certificate chain verification |
| Traffic replay | Reuse captured token | Nonce/timestamp in token, short TTL |
| Buffer overflow | strcpy without bounds | Bounds-checked APIs, ASLR+NX+Canary |
| SQL injection | String concatenation | Parameterized queries |
| Use-after-free | C/C++ manual memory | Rust borrow checker, ASan |
| Cache timing (Spectre) | Speculative execution | LFENCE, retpoline, site isolation |
| CSRF | Cross-origin state-changing request | SameSite cookie, CSRF token |
| XSS | Unsanitized HTML output | Content Security Policy, output encoding |
| Downgrade attack | TLS version negotiation | TLS_FALLBACK_SCSV, HSTS preload |
