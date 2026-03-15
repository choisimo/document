# CS References (EN/KR)

`cs-references` 전체 항목을 한국어/영어로 선택해서 볼 수 있는 인덱스입니다.

- 언어 선택: `한국어`, `English`
- 카테고리 선택: 코어 시스템, 네트워킹, 언어와 런타임 등

<div class="cs-reference-controls" markdown>
  <label for="cs-ref-language">언어</label>
  <select id="cs-ref-language">
    <option value="ko" selected>한국어</option>
    <option value="en">English</option>
  </select>

  <label for="cs-ref-category">카테고리</label>
  <select id="cs-ref-category">
    <option value="all">전체 / All</option>
    <option value="core-systems">코어 시스템 / Core Systems</option>
    <option value="networking">네트워킹 / Networking</option>
    <option value="languages-runtimes">언어와 런타임 / Languages and Runtimes</option>
    <option value="databases-data">데이터베이스와 데이터 / Databases and Data</option>
    <option value="security">보안 / Security</option>
    <option value="cloud-devops">클라우드와 데브옵스 / Cloud and DevOps</option>
    <option value="algorithms-math">알고리즘과 수학 / Algorithms and Mathematics</option>
    <option value="aiml-data-science">AI/ML과 데이터 과학 / AI/ML and Data Science</option>
    <option value="platform-mobile">플랫폼과 모바일 / Platform and Mobile</option>
    <option value="software-engineering">소프트웨어 공학 / Software Engineering</option>
    <option value="distributed-reference">분산 시스템 레퍼런스 / Distributed Systems Reference</option>
  </select>
</div>

<table class="cs-reference-table" id="cs-reference-table">
  <thead>
    <tr>
      <th><span data-lang="ko">카테고리</span><span data-lang="en">Category</span></th>
      <th><span data-lang="ko">게시글</span><span data-lang="en">Post</span></th>
      <th><span data-lang="ko">요약</span><span data-lang="en">Summary</span></th>
    </tr>
  </thead>
  <tbody>
    <tr data-category="core-systems">
      <td>
        <span data-lang="ko">코어 시스템</span>
        <span data-lang="en">Core Systems</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/computer-architecture-internals/">컴퓨터 아키텍처 내부 동작</a>
        <a data-lang="en" href="computer-architecture-internals/">Computer Architecture Internals</a>
      </td>
      <td>
        <span data-lang="ko">파이프라인 단계, 해저드, 분기 예측, 비순차 실행, 캐시 계층</span>
        <span data-lang="en">Pipeline stages, hazards, branch prediction, out-of-order execution, cache hierarchy</span>
      </td>
    </tr>
    <tr data-category="core-systems">
      <td>
        <span data-lang="ko">코어 시스템</span>
        <span data-lang="en">Core Systems</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/compiler-internals/">컴파일러 내부 동작</a>
        <a data-lang="en" href="compiler-internals/">Compiler Internals</a>
      </td>
      <td>
        <span data-lang="ko">렉서/파서 내부, AST→IR 변환, SSA, 레지스터 할당, 명령어 선택</span>
        <span data-lang="en">Lexer/parser internals, AST to IR lowering, SSA, register allocation, instruction selection</span>
      </td>
    </tr>
    <tr data-category="core-systems">
      <td>
        <span data-lang="ko">코어 시스템</span>
        <span data-lang="en">Core Systems</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/operating-systems-internals/">운영체제 내부 동작</a>
        <a data-lang="en" href="operating-systems-internals/">Operating Systems Internals</a>
      </td>
      <td>
        <span data-lang="ko">스케줄링, 가상 메모리, 저널링 파일시스템, IPC 메커니즘</span>
        <span data-lang="en">Scheduling, virtual memory, journaling file systems, IPC mechanisms</span>
      </td>
    </tr>
    <tr data-category="core-systems">
      <td>
        <span data-lang="ko">코어 시스템</span>
        <span data-lang="en">Core Systems</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/systems-programming-internals/">시스템 프로그래밍 내부 동작</a>
        <a data-lang="en" href="systems-programming-internals/">Systems Programming Internals</a>
      </td>
      <td>
        <span data-lang="ko">메모리 순서, 시스템콜 경로, futex, 소유권 모델, 할당기 내부</span>
        <span data-lang="en">Memory ordering, syscall path, futex, ownership model, allocator internals</span>
      </td>
    </tr>
    <tr data-category="networking">
      <td>
        <span data-lang="ko">네트워킹</span>
        <span data-lang="en">Networking</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/networking-internals/">네트워킹 내부 동작</a>
        <a data-lang="en" href="networking-internals/">Networking Internals</a>
      </td>
      <td>
        <span data-lang="ko">TCP 상태 전이, 혼잡 제어, TLS 1.3, DNS, BGP, HTTP/2</span>
        <span data-lang="en">TCP lifecycle, congestion control, TLS 1.3, DNS resolution, BGP, HTTP/2</span>
      </td>
    </tr>
    <tr data-category="languages-runtimes">
      <td>
        <span data-lang="ko">언어와 런타임</span>
        <span data-lang="en">Languages and Runtimes</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/c-cpp-internals/">C/C++ 내부 동작</a>
        <a data-lang="en" href="c-cpp-internals/">C/C++ Internals</a>
      </td>
      <td>
        <span data-lang="ko">객체 모델, UB/메모리 모델, 템플릿, 스마트 포인터, LLVM, 새니타이저</span>
        <span data-lang="en">Object model, UB and memory model, templates, smart pointers, LLVM, sanitizers</span>
      </td>
    </tr>
    <tr data-category="languages-runtimes">
      <td>
        <span data-lang="ko">언어와 런타임</span>
        <span data-lang="en">Languages and Runtimes</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/python-internals/">Python 내부 동작</a>
        <a data-lang="en" href="python-internals/">Python Internals</a>
      </td>
      <td>
        <span data-lang="ko">바이트코드 실행, 참조 카운트/GC, GIL, 디스크립터, import 시스템</span>
        <span data-lang="en">Bytecode execution, refcount and GC, GIL, descriptor protocol, import system</span>
      </td>
    </tr>
    <tr data-category="languages-runtimes">
      <td>
        <span data-lang="ko">언어와 런타임</span>
        <span data-lang="en">Languages and Runtimes</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/java-internals/">Java 내부 동작</a>
        <a data-lang="en" href="java-internals/">Java Internals</a>
      </td>
      <td>
        <span data-lang="ko">클래스 로딩, 바이트코드 검증, JIT 티어, GC, Java 메모리 모델</span>
        <span data-lang="en">Class loading, bytecode verification, JIT tiers, GC, Java memory model</span>
      </td>
    </tr>
    <tr data-category="languages-runtimes">
      <td>
        <span data-lang="ko">언어와 런타임</span>
        <span data-lang="en">Languages and Runtimes</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/programming-languages-internals/">프로그래밍 언어 내부 동작</a>
        <a data-lang="en" href="programming-languages-internals/">Programming Languages Internals</a>
      </td>
      <td>
        <span data-lang="ko">Go/Rust/Kotlin/Scala 런타임 구조와 타입 추론</span>
        <span data-lang="en">Runtime architecture of Go, Rust, Kotlin, Scala and type inference</span>
      </td>
    </tr>
    <tr data-category="languages-runtimes">
      <td>
        <span data-lang="ko">언어와 런타임</span>
        <span data-lang="en">Languages and Runtimes</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/functional-programming-internals/">함수형 프로그래밍 내부 동작</a>
        <a data-lang="en" href="functional-programming-internals/">Functional Programming Internals</a>
      </td>
      <td>
        <span data-lang="ko">람다 계산, 지연 평가, HM 추론, 모나드, 영속 자료구조, STM</span>
        <span data-lang="en">Lambda calculus, laziness, HM inference, monads, persistent structures, STM</span>
      </td>
    </tr>
    <tr data-category="databases-data">
      <td>
        <span data-lang="ko">데이터베이스와 데이터</span>
        <span data-lang="en">Databases and Data</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/database-systems-internals/">데이터베이스 시스템 내부 동작</a>
        <a data-lang="en" href="database-systems-internals/">Database Systems Internals</a>
      </td>
      <td>
        <span data-lang="ko">B+트리, WAL, MVCC, 옵티마이저, 버퍼 매니저, 락 매니저</span>
        <span data-lang="en">B+tree, WAL, MVCC, optimizer, buffer manager, lock manager</span>
      </td>
    </tr>
    <tr data-category="databases-data">
      <td>
        <span data-lang="ko">데이터베이스와 데이터</span>
        <span data-lang="en">Databases and Data</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/data-structures-internals/">자료구조 내부 동작</a>
        <a data-lang="en" href="data-structures-internals/">Data Structures Internals</a>
      </td>
      <td>
        <span data-lang="ko">RB 트리, 스킵 리스트, 해시맵, 유니온파인드, 피보나치 힙</span>
        <span data-lang="en">RB tree, skip list, hash map, union-find, Fibonacci heap</span>
      </td>
    </tr>
    <tr data-category="databases-data">
      <td>
        <span data-lang="ko">데이터베이스와 데이터</span>
        <span data-lang="en">Databases and Data</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/data-mining-bigdata-internals/">데이터 마이닝/빅데이터 내부 동작</a>
        <a data-lang="en" href="data-mining-bigdata-internals/">Data Mining & Big Data Internals</a>
      </td>
      <td>
        <span data-lang="ko">MapReduce, Spark lineage, Flink 워터마크, 컬럼 저장, LSM 컴팩션</span>
        <span data-lang="en">MapReduce, Spark lineage, Flink watermarking, columnar formats, LSM compaction</span>
      </td>
    </tr>
    <tr data-category="security">
      <td>
        <span data-lang="ko">보안</span>
        <span data-lang="en">Security</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/security-internals/">보안 내부 동작</a>
        <a data-lang="en" href="security-internals/">Security Internals</a>
      </td>
      <td>
        <span data-lang="ko">AES-GCM, RSA/ECDH, TLS 키 스케줄, 해시, 인증 프로토콜, 부채널 방어</span>
        <span data-lang="en">AES-GCM, RSA/ECDH, TLS key schedule, hashing, auth protocols, side-channel defense</span>
      </td>
    </tr>
    <tr data-category="cloud-devops">
      <td>
        <span data-lang="ko">클라우드와 데브옵스</span>
        <span data-lang="en">Cloud and DevOps</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/cloud-aws-internals/">클라우드/AWS 내부 동작</a>
        <a data-lang="en" href="cloud-aws-internals/">Cloud & AWS Internals</a>
      </td>
      <td>
        <span data-lang="ko">Nitro 하이퍼바이저, VPC 데이터 경로, S3 내구성, Lambda microVM, IAM 평가</span>
        <span data-lang="en">Nitro hypervisor, VPC data path, S3 durability, Lambda microVM, IAM evaluation</span>
      </td>
    </tr>
    <tr data-category="cloud-devops">
      <td>
        <span data-lang="ko">클라우드와 데브옵스</span>
        <span data-lang="en">Cloud and DevOps</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/devops-linux-internals/">DevOps/Linux 내부 동작</a>
        <a data-lang="en" href="devops-linux-internals/">DevOps & Linux Internals</a>
      </td>
      <td>
        <span data-lang="ko">systemd 활성화, cgroup v2, 네임스페이스, seccomp, audit, netfilter</span>
        <span data-lang="en">systemd activation, cgroup v2, namespaces, seccomp, audit, netfilter</span>
      </td>
    </tr>
    <tr data-category="cloud-devops">
      <td>
        <span data-lang="ko">클라우드와 데브옵스</span>
        <span data-lang="en">Cloud and DevOps</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/docker-kubernetes-cs/">Docker/Kubernetes CS 내부 동작</a>
        <a data-lang="en" href="docker-kubernetes-cs/">Docker & Kubernetes CS Internals</a>
      </td>
      <td>
        <span data-lang="ko">BuildKit, etcd watch, kube-proxy 모드, Helm 수명주기, 어드미션 제어</span>
        <span data-lang="en">BuildKit, etcd watch, kube-proxy modes, Helm lifecycle, admission control</span>
      </td>
    </tr>
    <tr data-category="cloud-devops">
      <td>
        <span data-lang="ko">클라우드와 데브옵스</span>
        <span data-lang="en">Cloud and DevOps</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/microservices-internals/">마이크로서비스 내부 동작</a>
        <a data-lang="en" href="microservices-internals/">Microservices Internals</a>
      </td>
      <td>
        <span data-lang="ko">서비스 메시, 서킷 브레이커, 트레이싱 컨텍스트, 게이트웨이 제어, 사가 패턴</span>
        <span data-lang="en">Service mesh, circuit breaker, tracing context, gateway throttling, saga patterns</span>
      </td>
    </tr>
    <tr data-category="algorithms-math">
      <td>
        <span data-lang="ko">알고리즘과 수학</span>
        <span data-lang="en">Algorithms and Mathematics</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/algorithms-cs-reference/">알고리즘 CS 레퍼런스 내부 동작</a>
        <a data-lang="en" href="algorithms-cs-reference/">Algorithms CS Reference Internals</a>
      </td>
      <td>
        <span data-lang="ko">DP DAG, 네트워크 플로우, KMP, 복잡도 계층, 확률 자료구조</span>
        <span data-lang="en">DP DAG, network flow, KMP, complexity classes, probabilistic data structures</span>
      </td>
    </tr>
    <tr data-category="algorithms-math">
      <td>
        <span data-lang="ko">알고리즘과 수학</span>
        <span data-lang="en">Algorithms and Mathematics</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/math-computing-internals/">수학/과학 컴퓨팅 내부 동작</a>
        <a data-lang="en" href="math-computing-internals/">Math & Scientific Computing Internals</a>
      </td>
      <td>
        <span data-lang="ko">IEEE 754, LU/SVD, FFT, 최적화, 샘플링, 쌍대성</span>
        <span data-lang="en">IEEE 754, LU/SVD, FFT, optimization, sampling, duality</span>
      </td>
    </tr>
    <tr data-category="aiml-data-science">
      <td>
        <span data-lang="ko">AI/ML과 데이터 과학</span>
        <span data-lang="en">AI/ML and Data Science</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/ml-ai-internals/">ML/AI 내부 동작</a>
        <a data-lang="en" href="ml-ai-internals/">ML & AI Internals</a>
      </td>
      <td>
        <span data-lang="ko">역전파, 어텐션, 트랜스포머, 정규화, 최적화, CNN/ResNet</span>
        <span data-lang="en">Backprop, attention, transformers, normalization, optimization, CNN/ResNet</span>
      </td>
    </tr>
    <tr data-category="platform-mobile">
      <td>
        <span data-lang="ko">플랫폼과 모바일</span>
        <span data-lang="en">Platform and Mobile</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/mobile-android-internals/">모바일/안드로이드 내부 동작</a>
        <a data-lang="en" href="mobile-android-internals/">Mobile & Android Internals</a>
      </td>
      <td>
        <span data-lang="ko">Binder IPC, ART/JIT/AOT, Compose 재구성, 렌더링 파이프라인, 카메라 스택</span>
        <span data-lang="en">Binder IPC, ART/JIT/AOT, Compose recomposition, rendering pipeline, camera stack</span>
      </td>
    </tr>
    <tr data-category="platform-mobile">
      <td>
        <span data-lang="ko">플랫폼과 모바일</span>
        <span data-lang="en">Platform and Mobile</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/web-frontend-internals/">웹/프론트엔드 내부 동작</a>
        <a data-lang="en" href="web-frontend-internals/">Web & Frontend Internals</a>
      </td>
      <td>
        <span data-lang="ko">브라우저 렌더링, 이벤트 루프, V8 JIT, React 재조정, 서비스 워커</span>
        <span data-lang="en">Browser rendering, event loop, V8 JIT, React reconciliation, service worker</span>
      </td>
    </tr>
    <tr data-category="software-engineering">
      <td>
        <span data-lang="ko">소프트웨어 공학</span>
        <span data-lang="en">Software Engineering</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/software-engineering-internals/">소프트웨어 공학 내부 동작</a>
        <a data-lang="en" href="software-engineering-internals/">Software Engineering Internals</a>
      </td>
      <td>
        <span data-lang="ko">패턴, SOLID, DDD, 이벤트 소싱, CQRS, 헥사고날 아키텍처</span>
        <span data-lang="en">Patterns, SOLID, DDD, event sourcing, CQRS, hexagonal architecture</span>
      </td>
    </tr>
    <tr data-category="software-engineering">
      <td>
        <span data-lang="ko">소프트웨어 공학</span>
        <span data-lang="en">Software Engineering</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/miscellaneous-cs/">기타 CS 내부 동작</a>
        <a data-lang="en" href="miscellaneous-cs/">Miscellaneous CS Internals</a>
      </td>
      <td>
        <span data-lang="ko">그래픽스, 레이트레이싱, ECS, 메시징, IaC, SRE, 관측성, 캐시 일관성</span>
        <span data-lang="en">Graphics, ray tracing, ECS, messaging, IaC, SRE, observability, coherence</span>
      </td>
    </tr>
    <tr data-category="distributed-reference">
      <td>
        <span data-lang="ko">분산 시스템 레퍼런스</span>
        <span data-lang="en">Distributed Systems Reference</span>
      </td>
      <td>
        <a data-lang="ko" href="ko/distributed-systems-cs/">분산 시스템 CS 내부 동작</a>
        <a data-lang="en" href="distributed-systems-cs/">Distributed Systems CS Internals</a>
      </td>
      <td>
        <span data-lang="ko">합의 알고리즘, CAP, 트랜잭션, 시계 동기화, CRDT, 가십, 안티엔트로피, 분산 락</span>
        <span data-lang="en">Consensus, CAP, transactions, clocks, CRDT, gossip, anti-entropy, locks</span>
      </td>
    </tr>
  </tbody>
</table>

> 참고: 한국어 버전은 한국어 안내 + 원문 병행 구조입니다. 언어 선택은 목록 노출 기준이며, 각 문서 내부에서 원문과 함께 확인할 수 있습니다.
