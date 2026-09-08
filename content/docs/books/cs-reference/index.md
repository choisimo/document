---
title: CS 참고 문서
description: 한국어와 영어로 읽는 26개 CS 주제. 제목과 요약을 검색하고 언어와 카테고리로 찾아보세요.
hide:
  - navigation
  - toc
---

<div class="hub-catalog" markdown="1">

<div class="catalog-heading" markdown="1">

[Books Library](../index.md){ .catalog-back }

# CS 참고 문서

시스템부터 소프트웨어 설계까지, 26개 주제를 한국어와 영어로 읽습니다.

</div>

<form id="cs-reference-controls" class="cs-reference-controls catalog-controls" role="search" aria-label="CS 참고 문서 찾기" hidden>
  <div class="catalog-field catalog-query">
    <label for="cs-ref-query">제목·요약 검색</label>
    <input id="cs-ref-query" type="search" placeholder="예: 캐시, TCP, garbage collection" autocomplete="off" aria-controls="cs-reference-table" aria-describedby="cs-ref-search-help">
  </div>
  <div class="catalog-field">
    <label for="cs-ref-language">문서 언어</label>
    <select id="cs-ref-language" aria-controls="cs-reference-table">
      <option value="ko" selected>한국어</option>
      <option value="en">English</option>
    </select>
  </div>
  <div class="catalog-field">
    <label for="cs-ref-category">카테고리</label>
    <select id="cs-ref-category" aria-controls="cs-reference-table">
      <option value="all">전체 카테고리</option>
        <option value="core-systems">코어 시스템</option>
        <option value="networking">네트워킹</option>
        <option value="languages-runtimes">언어와 런타임</option>
        <option value="databases-data">데이터베이스와 데이터</option>
        <option value="security">보안</option>
        <option value="cloud-devops">클라우드와 데브옵스</option>
        <option value="algorithms-math">알고리즘과 수학</option>
        <option value="aiml-data-science">AI/ML과 데이터 과학</option>
        <option value="platform-mobile">플랫폼과 모바일</option>
        <option value="software-engineering">소프트웨어 공학</option>
        <option value="distributed-reference">분산 시스템 레퍼런스</option>
    </select>
  </div>
  <button id="cs-ref-reset" class="catalog-reset" type="button" disabled>초기화</button>
  <p id="cs-ref-search-help" class="catalog-help">한국어와 영어 제목·요약을 함께 검색합니다.</p>
</form>

<p id="cs-ref-count" class="catalog-count" role="status" aria-live="polite" aria-atomic="true">26개 주제 · 한국어 / English</p>

<noscript><p class="catalog-help">각 주제의 한국어와 영어 문서를 모두 표시합니다. 브라우저의 페이지 내 찾기로 원하는 용어를 찾아보세요.</p></noscript>

<div id="cs-ref-empty" class="catalog-empty" hidden>
  <h2>일치하는 주제를 찾지 못했습니다</h2>
  <p>검색어를 줄이거나 다른 카테고리를 선택해 보세요.</p>
  <button class="catalog-reset" type="button" data-catalog-reset>모든 주제 다시 보기</button>
</div>

<ul id="cs-reference-table" class="cs-reference-table catalog-list" markdown="1">

<li class="catalog-row" data-category="core-systems" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">코어 시스템</span><span data-lang="en" lang="en">Core Systems</span></p>

<h2 markdown="span">[컴퓨터 아키텍처 내부 동작](ko/computer-architecture-internals.md){ data-lang="ko" } [Computer Architecture Internals](computer-architecture-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">파이프라인 단계, 해저드, 분기 예측, 비순차 실행, 캐시 계층</p>
  <p data-lang="en" lang="en">Pipeline stages, hazards, branch prediction, out-of-order execution, cache hierarchy</p>
</div>
</li>

<li class="catalog-row" data-category="core-systems" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">코어 시스템</span><span data-lang="en" lang="en">Core Systems</span></p>

<h2 markdown="span">[컴파일러 내부 동작](ko/compiler-internals.md){ data-lang="ko" } [Compiler Internals](compiler-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">렉서/파서 내부, AST→IR 변환, SSA, 레지스터 할당, 명령어 선택</p>
  <p data-lang="en" lang="en">Lexer/parser internals, AST to IR lowering, SSA, register allocation, instruction selection</p>
</div>
</li>

<li class="catalog-row" data-category="core-systems" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">코어 시스템</span><span data-lang="en" lang="en">Core Systems</span></p>

<h2 markdown="span">[운영체제 내부 동작](ko/operating-systems-internals.md){ data-lang="ko" } [Operating Systems Internals](operating-systems-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">스케줄링, 가상 메모리, 저널링 파일시스템, IPC 메커니즘</p>
  <p data-lang="en" lang="en">Scheduling, virtual memory, journaling file systems, IPC mechanisms</p>
</div>
</li>

<li class="catalog-row" data-category="core-systems" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">코어 시스템</span><span data-lang="en" lang="en">Core Systems</span></p>

<h2 markdown="span">[시스템 프로그래밍 내부 동작](ko/systems-programming-internals.md){ data-lang="ko" } [Systems Programming Internals](systems-programming-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">메모리 순서, 시스템콜 경로, futex, 소유권 모델, 할당기 내부</p>
  <p data-lang="en" lang="en">Memory ordering, syscall path, futex, ownership model, allocator internals</p>
</div>
</li>

<li class="catalog-row" data-category="networking" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">네트워킹</span><span data-lang="en" lang="en">Networking</span></p>

<h2 markdown="span">[네트워킹 내부 동작](ko/networking-internals.md){ data-lang="ko" } [Networking Internals](networking-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">TCP 상태 전이, 혼잡 제어, TLS 1.3, DNS, BGP, HTTP/2</p>
  <p data-lang="en" lang="en">TCP lifecycle, congestion control, TLS 1.3, DNS resolution, BGP, HTTP/2</p>
</div>
</li>

<li class="catalog-row" data-category="languages-runtimes" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">언어와 런타임</span><span data-lang="en" lang="en">Languages and Runtimes</span></p>

<h2 markdown="span">[C/C++ 내부 동작](ko/c-cpp-internals.md){ data-lang="ko" } [C/C++ Internals](c-cpp-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">객체 모델, UB/메모리 모델, 템플릿, 스마트 포인터, LLVM, 새니타이저</p>
  <p data-lang="en" lang="en">Object model, UB and memory model, templates, smart pointers, LLVM, sanitizers</p>
</div>
</li>

<li class="catalog-row" data-category="languages-runtimes" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">언어와 런타임</span><span data-lang="en" lang="en">Languages and Runtimes</span></p>

<h2 markdown="span">[Python 내부 동작](ko/python-internals.md){ data-lang="ko" } [Python Internals](python-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">바이트코드 실행, 참조 카운트/GC, GIL, 디스크립터, import 시스템</p>
  <p data-lang="en" lang="en">Bytecode execution, refcount and GC, GIL, descriptor protocol, import system</p>
</div>
</li>

<li class="catalog-row" data-category="languages-runtimes" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">언어와 런타임</span><span data-lang="en" lang="en">Languages and Runtimes</span></p>

<h2 markdown="span">[Java 내부 동작](ko/java-internals.md){ data-lang="ko" } [Java Internals](java-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">클래스 로딩, 바이트코드 검증, JIT 티어, GC, Java 메모리 모델</p>
  <p data-lang="en" lang="en">Class loading, bytecode verification, JIT tiers, GC, Java memory model</p>
</div>
</li>

<li class="catalog-row" data-category="languages-runtimes" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">언어와 런타임</span><span data-lang="en" lang="en">Languages and Runtimes</span></p>

<h2 markdown="span">[프로그래밍 언어 내부 동작](ko/programming-languages-internals.md){ data-lang="ko" } [Programming Languages Internals](programming-languages-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">Go/Rust/Kotlin/Scala 런타임 구조와 타입 추론</p>
  <p data-lang="en" lang="en">Runtime architecture of Go, Rust, Kotlin, Scala and type inference</p>
</div>
</li>

<li class="catalog-row" data-category="languages-runtimes" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">언어와 런타임</span><span data-lang="en" lang="en">Languages and Runtimes</span></p>

<h2 markdown="span">[함수형 프로그래밍 내부 동작](ko/functional-programming-internals.md){ data-lang="ko" } [Functional Programming Internals](functional-programming-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">람다 계산, 지연 평가, HM 추론, 모나드, 영속 자료구조, STM</p>
  <p data-lang="en" lang="en">Lambda calculus, laziness, HM inference, monads, persistent structures, STM</p>
</div>
</li>

<li class="catalog-row" data-category="databases-data" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">데이터베이스와 데이터</span><span data-lang="en" lang="en">Databases and Data</span></p>

<h2 markdown="span">[데이터베이스 시스템 내부 동작](ko/database-systems-internals.md){ data-lang="ko" } [Database Systems Internals](database-systems-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">B+트리, WAL, MVCC, 옵티마이저, 버퍼 매니저, 락 매니저</p>
  <p data-lang="en" lang="en">B+tree, WAL, MVCC, optimizer, buffer manager, lock manager</p>
</div>
</li>

<li class="catalog-row" data-category="databases-data" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">데이터베이스와 데이터</span><span data-lang="en" lang="en">Databases and Data</span></p>

<h2 markdown="span">[자료구조 내부 동작](ko/data-structures-internals.md){ data-lang="ko" } [Data Structures Internals](data-structures-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">RB 트리, 스킵 리스트, 해시맵, 유니온파인드, 세그먼트 트리</p>
  <p data-lang="en" lang="en">RB tree, skip list, hash map, union-find, segment tree</p>
</div>
</li>

<li class="catalog-row" data-category="databases-data" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">데이터베이스와 데이터</span><span data-lang="en" lang="en">Databases and Data</span></p>

<h2 markdown="span">[데이터 마이닝/빅데이터 내부 동작](ko/data-mining-bigdata-internals.md){ data-lang="ko" } [Data Mining & Big Data Internals](data-mining-bigdata-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">MapReduce, Spark lineage, Flink 체크포인트, 컬럼 저장, LSM 컴팩션</p>
  <p data-lang="en" lang="en">MapReduce, Spark lineage, Flink checkpoints, columnar formats, LSM compaction</p>
</div>
</li>

<li class="catalog-row" data-category="security" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">보안</span><span data-lang="en" lang="en">Security</span></p>

<h2 markdown="span">[보안 내부 동작](ko/security-internals.md){ data-lang="ko" } [Security Internals](security-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">AES-GCM, RSA/ECDH, TLS 키 스케줄, 해시, 인증 프로토콜, 부채널 방어</p>
  <p data-lang="en" lang="en">AES-GCM, RSA/ECDH, TLS key schedule, hashing, auth protocols, side-channel defense</p>
</div>
</li>

<li class="catalog-row" data-category="cloud-devops" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">클라우드와 데브옵스</span><span data-lang="en" lang="en">Cloud and DevOps</span></p>

<h2 markdown="span">[클라우드/AWS 내부 동작](ko/cloud-aws-internals.md){ data-lang="ko" } [Cloud & AWS Internals](cloud-aws-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">Nitro 하이퍼바이저, VPC 데이터 경로, S3 내구성, Lambda microVM, IAM 평가</p>
  <p data-lang="en" lang="en">Nitro hypervisor, VPC data path, S3 durability, Lambda microVM, IAM evaluation</p>
</div>
</li>

<li class="catalog-row" data-category="cloud-devops" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">클라우드와 데브옵스</span><span data-lang="en" lang="en">Cloud and DevOps</span></p>

<h2 markdown="span">[DevOps/Linux 내부 동작](ko/devops-linux-internals.md){ data-lang="ko" } [DevOps & Linux Internals](devops-linux-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">systemd 활성화, 패키지 관리, Terraform 상태, 프로세스·시그널, eBPF, OCI 런타임</p>
  <p data-lang="en" lang="en">systemd activation, package management, Terraform state, processes and signals, eBPF, OCI runtime</p>
</div>
</li>

<li class="catalog-row" data-category="cloud-devops" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">클라우드와 데브옵스</span><span data-lang="en" lang="en">Cloud and DevOps</span></p>

<h2 markdown="span">[Docker/Kubernetes CS 내부 동작](ko/docker-kubernetes-cs.md){ data-lang="ko" } [Docker & Kubernetes CS Internals](docker-kubernetes-cs.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">BuildKit, etcd/Raft, kube-proxy 모드, 스케줄러, 어드미션 제어</p>
  <p data-lang="en" lang="en">BuildKit, etcd/Raft, kube-proxy modes, scheduler, admission control</p>
</div>
</li>

<li class="catalog-row" data-category="cloud-devops" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">클라우드와 데브옵스</span><span data-lang="en" lang="en">Cloud and DevOps</span></p>

<h2 markdown="span">[마이크로서비스 내부 동작](ko/microservices-internals.md){ data-lang="ko" } [Microservices Internals](microservices-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">서비스 메시, 서킷 브레이커, 트레이싱 컨텍스트, 게이트웨이 제어, 사가 패턴</p>
  <p data-lang="en" lang="en">Service mesh, circuit breaker, tracing context, gateway throttling, saga patterns</p>
</div>
</li>

<li class="catalog-row" data-category="algorithms-math" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">알고리즘과 수학</span><span data-lang="en" lang="en">Algorithms and Mathematics</span></p>

<h2 markdown="span">[알고리즘 CS 레퍼런스 내부 동작](ko/algorithms-cs-reference.md){ data-lang="ko" } [Algorithms CS Reference Internals](algorithms-cs-reference.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">DP DAG, 네트워크 플로우, KMP, 복잡도 계층, 확률 자료구조</p>
  <p data-lang="en" lang="en">DP DAG, network flow, KMP, complexity classes, probabilistic data structures</p>
</div>
</li>

<li class="catalog-row" data-category="algorithms-math" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">알고리즘과 수학</span><span data-lang="en" lang="en">Algorithms and Mathematics</span></p>

<h2 markdown="span">[수학/과학 컴퓨팅 내부 동작](ko/math-computing-internals.md){ data-lang="ko" } [Math & Scientific Computing Internals](math-computing-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">IEEE 754, LU/SVD, FFT, 최적화, 샘플링, 쌍대성</p>
  <p data-lang="en" lang="en">IEEE 754, LU/SVD, FFT, optimization, sampling, duality</p>
</div>
</li>

<li class="catalog-row" data-category="aiml-data-science" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">AI/ML과 데이터 과학</span><span data-lang="en" lang="en">AI/ML and Data Science</span></p>

<h2 markdown="span">[ML/AI 내부 동작](ko/ml-ai-internals.md){ data-lang="ko" } [ML & AI Internals](ml-ai-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">역전파, 어텐션, 트랜스포머, 정규화, 최적화, CNN/ResNet</p>
  <p data-lang="en" lang="en">Backprop, attention, transformers, normalization, optimization, CNN/ResNet</p>
</div>
</li>

<li class="catalog-row" data-category="platform-mobile" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">플랫폼과 모바일</span><span data-lang="en" lang="en">Platform and Mobile</span></p>

<h2 markdown="span">[모바일/안드로이드 내부 동작](ko/mobile-android-internals.md){ data-lang="ko" } [Mobile & Android Internals](mobile-android-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">Binder IPC, ART/JIT/AOT, Compose 재구성, 렌더링 파이프라인, 카메라 스택</p>
  <p data-lang="en" lang="en">Binder IPC, ART/JIT/AOT, Compose recomposition, rendering pipeline, camera stack</p>
</div>
</li>

<li class="catalog-row" data-category="platform-mobile" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">플랫폼과 모바일</span><span data-lang="en" lang="en">Platform and Mobile</span></p>

<h2 markdown="span">[웹/프론트엔드 내부 동작](ko/web-frontend-internals.md){ data-lang="ko" } [Web & Frontend Internals](web-frontend-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">브라우저 렌더링, 이벤트 루프, V8 JIT, React 재조정, 서비스 워커</p>
  <p data-lang="en" lang="en">Browser rendering, event loop, V8 JIT, React reconciliation, service worker</p>
</div>
</li>

<li class="catalog-row" data-category="software-engineering" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">소프트웨어 공학</span><span data-lang="en" lang="en">Software Engineering</span></p>

<h2 markdown="span">[소프트웨어 공학 내부 동작](ko/software-engineering-internals.md){ data-lang="ko" } [Software Engineering Internals](software-engineering-internals.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">패턴, SOLID, DDD, 이벤트 소싱, CQRS, 헥사고날 아키텍처</p>
  <p data-lang="en" lang="en">Patterns, SOLID, DDD, event sourcing, CQRS, hexagonal architecture</p>
</div>
</li>

<li class="catalog-row" data-category="software-engineering" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">소프트웨어 공학</span><span data-lang="en" lang="en">Software Engineering</span></p>

<h2 markdown="span">[기타 CS 내부 동작](ko/miscellaneous-cs.md){ data-lang="ko" } [Miscellaneous CS Internals](miscellaneous-cs.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">그래픽스, 레이트레이싱, ECS, 메시징, IaC, SRE, 관측성, 캐시 일관성</p>
  <p data-lang="en" lang="en">Graphics, ray tracing, ECS, messaging, IaC, SRE, observability, coherence</p>
</div>
</li>

<li class="catalog-row" data-category="distributed-reference" markdown="1">
<div class="catalog-topic" markdown="1">

<p class="catalog-category"><span data-lang="ko">분산 시스템 레퍼런스</span><span data-lang="en" lang="en">Distributed Systems Reference</span></p>

<h2 markdown="span">[분산 시스템 CS 내부 동작](ko/distributed-systems-cs.md){ data-lang="ko" } [Distributed Systems CS Internals](distributed-systems-cs.md){ data-lang="en" lang="en" }</h2>

</div>
<div class="catalog-summary">
  <p data-lang="ko">합의 알고리즘, CAP, 트랜잭션, 시계 동기화, CRDT, 가십, 안티엔트로피, 분산 락</p>
  <p data-lang="en" lang="en">Consensus, CAP, transactions, clocks, CRDT, gossip, anti-entropy, locks</p>
</div>
</li>

</ul>

</div>
