---
title: Spring 애플리케이션 경계와 시간 데이터
description: 패키지·DI·트랜잭션의 소유권과 생성·수정 시각, DB·로그·JSON 시간대를 구분합니다.
---

# Spring 애플리케이션 경계와 시간 데이터

이 문서는 보관된 Spring 설계 노트를 공개 학습용으로 정리한 것이다. 여기의 패키지·역할은 설계 예시이며 저장소에서 실행되는 Spring 서비스의 현재 구조를 뜻하지 않는다. 실제 Bean 등록과 의존성은 대상 프로젝트의 코드와 테스트로 확인한다.

## 패키지 배치와 책임

| 방식 | 장점 | 확인할 비용 |
| --- | --- | --- |
| 레이어별 controller·service·repository | 기술 역할별 파일을 찾기 쉬움 | 한 업무 변경이 여러 패키지에 흩어짐 |
| 기능별 api·application·domain·infrastructure | 업무 변경과 소유권을 모음 | 기능 사이의 내부 참조와 중복·공통화 경계 |

예를 들어 `com.example.order` 안에서 입력 DTO, 유스케이스, 주문 규칙, 저장 어댑터를 구분할 수 있다. 폴더만 나눠도 의존 방향이 강제되는 것은 아니다. 공개할 인터페이스와 금지할 직접 참조를 정하고 실제 import·호출로 검사한다. `shared`는 무엇이든 넣는 공용 폴더로 만들지 않는다.

DI는 의존성을 주입하는 방식이고 업무 경계를 자동으로 정해 주는 기능이 아니다. 생성자에서 드러나는 의존성을 따라 유스케이스가 무엇을 읽고 바꾸며 외부에 요청하는지 추적한다. Bean 초기화와 서비스가 실제 요청을 받을 준비가 된 상태도 다르다. [Bean 생명주기](../databases/jpa/lifecycle.md)를 함께 읽는다.

## 트랜잭션 소유자

대표 요청 하나를 입력 검증 → 유스케이스 → 조회 → 조건 분기 → 변경 → 외부 부작용 → 응답 순으로 기록한다. 트랜잭션 시작·종료, 예외별 rollback, 서비스 사이의 호출 경로를 실제 구현과 대조한다. 어노테이션 존재만으로 모든 호출에서 같은 경계가 적용된다고 판정하지 않는다.

캐시는 원격 데이터의 복사본이다. 갱신·무효화 주체, 만료, 실패 시 읽기 정책, 권한별 key 분리를 정한다. 특정 캐시 어노테이션 추가만으로 DB 변경과 캐시가 원자적으로 일치하는 것은 아니다. 상세 연결은 [Redis와 Spring](../databases/redis/springboot-integration.md)을 참조한다.

## 시각의 정본과 표시

| 계층 | 확인할 값 |
| --- | --- |
| 애플리케이션 | 어떤 clock과 타입으로 시점을 생성하는지 |
| JPA·DB | 생성·수정 시각의 갱신 주체, 컬럼 타입, DB 세션 시간대 |
| API | offset 또는 zone을 포함하는지, 직렬화·역직렬화 계약 |
| 로그 | 로그 formatter의 표시 시간대 |
| 화면 | 사용자가 보는 시간대로 변환하는 위치 |

JVM 기본 시간대를 바꿔도 이 다섯 계층이 자동으로 같아지지 않는다. `LocalDateTime` 같은 zone 없는 값만으로는 전 세계의 한 시점을 유일하게 표현할 수 없다. 업무상 지역의 날짜·시간이 필요한지, 절대 시점이 필요한지부터 정한다.

생성·수정 시각 어노테이션은 ORM·provider의 동작에 의존한다. 직접 SQL, bulk update, 다른 writer가 우회하면 값이 같은 정책으로 갱신되는지 따로 확인한다. 서로 다른 두 시점에 생성·수정하고 저장 값·API·로그를 비교해 책임을 입증한다.

근거: `content/archive/legacy/docs-old/databases/springboot-jpa/`의 `directory_structure.md`, `IoC_and_DI.md`, `springboot_caching_strategy.txt`, `timestamp.md`, `timezone.md`. 시간 진단은 [호스트·로그 시각 런북](../infrastructure/monitoring/time-diagnostics.md).
