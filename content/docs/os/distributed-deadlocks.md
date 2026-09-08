# Distributed Deadlocks

분산 교착 상태는 여러 노드에 흩어진 작업 집합이 서로 유발할 사건이나 자원 해제를 기다려 진행할 수 없는 상태다. 관련 없는 작업은 진행할 수 있으며 전역 대기 상태를 즉시 관찰하기 어려워 탐지에 별도 프로토콜이 필요하다.

## 문서 범위와 프로토콜 전제

- **범위**: 분산 lock/resource manager가 명시적인 wait-for 관계를 관측할 수 있는 교과서 모델을 설명합니다. 일반 메시지 지연, 합의 교착, 애플리케이션 livelock을 모두 다루는 알고리즘은 아닙니다.
- **전제**: Chandy-Misra-Haas에는 AND/OR 대기 모델별 변형이 있으며, 프로세스·사이트 식별자, 메시지 전달, 중복 억제와 wait 관계의 유효 시점을 정의해야 합니다.
- **근거 상태와 환경**: “효율적”이라는 평가는 메시지 수, 탐지 지연, WFG 변화율과 장애 모델을 고정한 뒤 비교해야 합니다. 운영 적용은 대상 DB/lock manager 버전의 공식 프로토콜과 로그로 확인합니다.
- **실패/재시도**: probe 지연·중복·유실, 사이트 단절과 stale edge를 교착으로 즉시 확정하지 않습니다. 탐지 epoch와 TTL을 두고 제한 재시도하며, 결과 불명 상태는 재검증 또는 운영자 격리로 전환합니다.
- **완료 증거**: 선언된 교착은 동일 epoch의 cycle/probe 기록으로 입증하고, 해결은 희생 트랜잭션의 abort·보상, 자원 해제와 나머지 작업의 진행을 확인해야 완료입니다.

## 1. 왜 필요한가? (Pain Point & Motivation)

단일 머신의 lock/resource manager도 자신이 관측하는 자원 관계만 알 수 있다. 분산 환경에서는 각 노드가 일부 상태만 알고 메시지 지연·재정렬 때문에 이미 해소된 대기 관계가 늦게 도착할 수 있다.

그래서 분산 교착 상태는 "cycle이 있는가"뿐 아니라 "그 cycle이 지금도 실제로 존재하는가"를 따져야 한다. 잘못 탐지하면 정상 트랜잭션을 중단시키는 phantom deadlock이 생긴다.

## 2. 현재 나의 상태 (Baseline)

흔한 출발점은 다음과 같다.

- 단일 머신 deadlock detector를 그대로 분산 시스템에 쓰면 된다고 생각한다.
- wait-for graph를 전역으로 항상 정확히 만들 수 있다고 가정한다.
- edge chasing을 단순한 그래프 순회로만 이해한다.
- phantom deadlock이 왜 생기는지 설명하지 못한다.
- 탐지 후 victim 선택과 rollback 비용을 고려하지 않는다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 분산 대기 관계를 불완전한 관찰 문제로 이해하는 것이다.

- 로컬 WFG와 글로벌 WFG의 차이를 설명한다.
- prevention, avoidance, detection의 분산 환경 비용을 비교한다.
- edge chasing이 전역 그래프를 만들지 않고 cycle을 찾는 방식을 설명한다.
- Chandy-Misra-Haas probe의 `(initiator, sender, receiver)` 의미를 이해한다.
- phantom deadlock과 중복 abort 위험을 설명한다.
- 탐지 이후 victim 선택 기준을 설계 관점에서 말할 수 있다.

## 4. 시스템 번역 (Data Flow)

분산 대기 관계는 다음 흐름으로 생긴다.

```text
transaction T1 on node A holds resource R1
transaction T2 on node B holds resource R2
T1 waits for R2
T2 waits for R1
each node sees only part of the wait relation
detector exchanges messages to infer a cycle
```

edge chasing은 probe 메시지를 대기 간선을 따라 전달한다.

```text
initiator creates probe
probe follows local wait relation
remote wait sends probe to another node
probe returns to initiator
valid returning probe identifies a candidate; protocol validates current waits
```

## 5. 핵심 구성요소 (Building Blocks)

- Local wait-for graph: 한 노드가 알고 있는 프로세스나 트랜잭션 대기 관계.
- Global wait-for graph: 모든 노드의 대기 관계를 합친 개념적 그래프.
- Probe: cycle 탐지를 위해 대기 간선을 따라 전달되는 작은 메시지.
- Initiator: 탐지를 시작한 프로세스나 트랜잭션.
- Edge chasing: 전역 그래프를 수집하지 않고 probe를 간선 방향으로 보내 cycle을 찾는 방식.
- Path pushing: 로컬 WFG 정보를 다른 노드로 보내 경로 정보를 확장하는 방식.
- Phantom deadlock: 메시지 지연이나 오래된 상태 때문에 실제로는 없는 교착 상태를 탐지하는 오탐.
- Victim selection: 교착 상태 해소를 위해 중단하거나 rollback할 대상을 고르는 정책.

## 6. 상태 전이 (State Transition)

분산 교착 상태 탐지의 상태 흐름은 다음과 같다.

```mermaid
stateDiagram-v2
    Running --> LocallyWaiting: waits for local resource
    LocallyWaiting --> RemotelyWaiting: dependency crosses node
    RemotelyWaiting --> ProbeSent: detection starts
    ProbeSent --> DeadlockSuspected: probe path forms cycle
    DeadlockSuspected --> DeadlockConfirmed: model/epoch/wait validation
    DeadlockConfirmed --> RecoveryPending: one victim selected
    RecoveryPending --> Resolved: abort/compensation and progress verified
    RecoveryPending --> RecoveryUncertain: timeout or partial failure
    LocallyWaiting --> Running: resource granted
    RemotelyWaiting --> Running: remote wait clears
```

DeadlockSuspected에서는 해당 대기 모델과 프로토콜의 epoch·중복 억제·유효한 dependency 조건을 검사한다. timestamp 하나나 timeout만으로 현재 cycle을 증명할 수 없으며 복구가 불명확하면 재검증·격리로 남긴다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- 탐지 메시지는 어떤 대기 관계를 근거로 만들어졌는지 식별 가능해야 한다.
- 이미 사라진 대기 관계가 새 교착 상태처럼 사용되지 않도록 freshness를 관리해야 한다.
- 같은 cycle에 대해 여러 노드가 동시에 victim을 중복 중단하지 않게 조정해야 한다.
- victim rollback은 보유 자원을 실제로 해제해야 한다.
- 분산 탐지 비용은 정상 요청 처리 경로를 압도하면 안 된다.
- 탐지 알고리즘은 메시지 지연과 재전송을 전제로 설계되어야 한다.

## 8. 가장 작은 예제 (Minimal Viable Example)

세 트랜잭션이 세 노드에 흩어져 있다고 가정한다.

```text
Node A: T1 waits for T2
Node B: T2 waits for T3
Node C: T3 waits for T1
```

아래는 AND 대기 모델에서 세 트랜잭션이 해당 의존 관계로 계속 blocked 상태인 하나의 탐지 epoch를 가정한 Chandy-Misra-Haas 스타일 설명이다. probe는 중복 억제와 현재 대기 관계 검사 규칙을 따른다.

```text
probe(T1, T1, T2)
probe(T1, T2, T3)
probe(T1, T3, T1)
```

유효한 probe가 T1으로 돌아오면 이 모델에서 T1→T2→T3→T1의 교착 후보를 얻는다. 현재 wait 관계를 프로토콜 규칙으로 재확인하고 단일 victim 복구 뒤 자원 해제·다른 작업 진행까지 관찰해야 해소되었다고 판단한다.

## 9. 실패 사례 (What could go wrong?)

- probe가 이동하는 동안 대기 관계가 해소되면 phantom deadlock이 탐지될 수 있다.
- 네트워크 지연이 크면 탐지 결과가 실제 상태보다 늦다.
- 여러 initiator가 같은 cycle을 동시에 탐지하면 과도한 abort가 발생할 수 있다.
- victim 선택이 단순 PID 기준이면 큰 작업을 반복적으로 rollback할 수 있다.
- rollback이 외부 side effect를 되돌리지 못하면 시스템 상태가 불일치할 수 있다.
- 탐지 메시지에 epoch이나 timestamp가 없으면 오래된 probe가 새 판단에 섞인다.

## 10. 뇌 확장하기 (Evolution & Variants)

- 중앙 집중형 detector, 계층형 detector, 완전 분산 detector를 비교한다.
- 데이터베이스의 distributed transaction deadlock과 microservice saga의 보상 트랜잭션을 비교한다.
- vector clock이나 logical timestamp가 dependency freshness 판단에 어떻게 쓰일 수 있는지 살펴본다.
- phantom deadlock을 줄이는 확인 단계와 탐지 지연 증가 사이의 trade-off를 분석한다.
- timeout 기반 해소와 그래프 기반 탐지의 장단점을 비교한다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] 로컬 WFG와 글로벌 WFG의 차이를 설명할 수 있다.
- [ ] 분산 환경에서 전역 상태가 어려운 이유를 설명할 수 있다.
- [ ] edge chasing의 probe 흐름을 예제로 설명할 수 있다.
- [ ] phantom deadlock이 생기는 이유를 말할 수 있다.
- [ ] victim selection 기준을 최소 두 가지 이상 제시할 수 있다.
- [ ] 탐지 비용과 오탐 위험의 trade-off를 설명할 수 있다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

분산 교착 상태는 전역 대기 그래프를 즉시 알 수 없는 문제이며, edge chasing은 대기 간선을 따라 probe를 보내 cycle을 추론한다.
