---
title: 알고리즘 코드와 시뮬레이터 사용 안내
description: 실제 소스 경로, 실행 입력과 검증 범위를 구분해 알고리즘 예제를 학습합니다.
---

# 알고리즘 코드와 시뮬레이터 사용 안내

문서의 설명은 `content/docs/algorithms/`, 실행 예제는 `src/examples/`가 정본이다. 원본 README의 체크 표시나 “100문제”라는 제목은 모든 구현의 현재 테스트 성공을 뜻하지 않는다.

| 실제 경로 | 학습 목적 |
| --- | --- |
| `src/examples/architect-code/` | 문제별 Python·Java 풀이와 교육용 아키텍처 비유 |
| `src/examples/data-structures/tree/binary-search-tree/` | 여러 언어의 BST 구현과 메모리 모델 설명 |
| `src/examples/competitive-programming/basics/` | 표준 입력 기반 Java 문제 풀이 |
| `src/examples/simulator/` | 알고리즘의 이산 단계를 보여 주는 CLI·웹 시각화 |
| `src/examples/theory/` | [편집 거리](edit-distance.md), [비트셋 DP](bitset-dp.md)의 원본 학습 노트 |
| `src/examples/templates/algorithm-architect/` | [공개 알고리즘 문서](algorithm-architect/index.md)의 관련 템플릿 |

## 작게 시작하기

저장소 루트에서 다음 파일을 먼저 읽고 실행한다. 해당 파일의 main 블록에는 기본·중복값·음수·큰 배열의 assert 예제가 있다.

```bash
python3 src/examples/architect-code/python/p001_two_sum.py
```

검증은 이 파일의 assert에 한정된다. 출력 메시지를 전체 문제집이나 실제 데이터베이스 인덱스 성능의 증거로 사용하지 않는다. 여러 정답이 가능한 변형에서는 반환 순서·해 선택 규칙을 별도로 정해야 한다.

## 표준 입력 문제의 계약

Java `Solution.java`는 문제별 디렉터리에서 독립적으로 컴파일해야 한다. 같은 기본 패키지·클래스명을 가진 파일을 한 번에 묶지 않는다. 현재 입력 계약은 다음과 같다.

| 문제 | 입력과 의미 |
| --- | --- |
| BST 삽입 | 원소 수와 정수 목록. 중복 키는 오른쪽에 삽입. 출력은 삽입 호출 횟수 |
| BST 삭제 | 초기 목록, 삭제 수, 순회 번호·삭제 키 쌍. 초기 중복 키는 무시 |
| 해시 테이블 | 원소 수와 정수 목록. 선형 탐사 충돌 횟수를 계산 |

BST라는 공통 이름만으로 중복 정책을 통일하지 않는다. 빈 입력, 없는 키, 음수, 정렬된 입력과 최대 깊이를 각 구현의 제약에 맞춰 검증한다.

## 시뮬레이터 읽기

웹 진입점은 `src/examples/simulator/javascript/index.html`이며 BST·해시 테이블·정렬·힙 화면을 연결한다. 출력의 memory view와 애니메이션 간격은 교육용 모델이다. 실제 프로세스 주소, 객체 크기, GC/JIT 동작이나 실행 성능 측정값이 아니다.

README에 적힌 과거 flat 경로와 현재 주제별 디렉터리가 다를 수 있다. `rg --files src/examples/simulator`로 실제 파일을 찾는다. 공통 `shared/test_cases.json`이 있다고 모든 runner가 이를 실행한다고 가정하지 않는다.

근거: `src/examples/README.md`의 Java 입력 계약, `src/examples/architect-code/README.md`, `src/examples/architect-code/python/p001_two_sum.py`, `src/examples/competitive-programming/basics/*/java/Solution.java`, `src/examples/simulator/README.md`와 웹 `index.html`.
