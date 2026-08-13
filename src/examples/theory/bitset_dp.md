# `std::bitset`을 이용한 Knapsack/Subset Sum 최적화

`std::bitset`을 이용한 배낭 문제(Knapsack)나 부분집합 합(Subset Sum) 문제 해결 방식의 핵심은 **"boolean DP 상태 갱신을 fixed-size bit vector의 word-level shift/OR로 묶어 처리하는 것"**입니다.

## 적용 범위와 검증 기준

- **범위:** `std::bitset<S>`의 compile-time capacity 안에서 non-negative integer weight를 한 번씩 사용하는 0/1 subset-sum reachability를 설명합니다. value optimization이나 unbounded knapsack은 별도 recurrence가 필요합니다.
- **복잡도 전제:** shift/OR는 implementation이 storage words를 순회하므로 개념적으로 item당 `O(S / word_size)`입니다. thread parallelism이나 항상 한 CPU instruction이라는 뜻은 아닙니다.
- **실패 조건:** negative/zero weight 정책, `w >= S`, 최대 합 truncation, 잘못된 bitset 크기, unbounded item 재사용과 합 overflow를 포함합니다.
- **완료 증거:** 작은 input을 boolean DP/subset enumeration과 비교하고 bit 0, 최대 representable sum, 범위 밖 합과 item별 update invariant를 확인합니다.

---

## 1. 기본 아이디어: 비트와 합(Sum)의 관계

일반적인 DP에서 `dp[i] = true`는 "합 `i`를 만들 수 있다"를 의미합니다. `bitset` 방식에서는 **비트의 인덱스(위치)가 곧 '만들 수 있는 합'**을 의미합니다.

*   **0번째 비트가 1이다:** 합 0을 만들 수 있다.
*   **5번째 비트가 1이다:** 합 5를 만들 수 있다.
*   **k번째 비트가 0이다:** 현재까지 처리한 item과 bitset 범위 안에서는 합 k가 reachable하지 않다.

## 2. 핵심 연산: `possible |= (possible << w)`

이 식은 한 item에 대한 합 방향의 inner loop를 대체하지만 item을 순회하는 outer loop와 capacity bound는 남습니다. 이 코드가 어떻게 작동하는지 3단계로 분해해 설명합니다.
현재 우리가 가지고 있는 가능한 합의 집합이 `{0, 2}`이고, 새로운 물건의 무게 `w = 3`이 들어왔다고 가정해 봅시다.

### 1단계: 시프트 연산 (`possible << w`)
*   **의미:** 현재 bitset 범위에서 reachable한 합에 `w`를 더한 위치를 만들며 범위를 벗어난 high bit는 보존되지 않습니다.
*   **작동 원리:** 비트를 왼쪽으로 `w`만큼 미는 것은 수학적으로 인덱스에 `w`를 더하는 것과 같습니다.
    *   현재 상태 (`possible`): `...00101` (오른쪽 끝이 0번 인덱스. 0번과 2번 비트가 1이므로 합 {0, 2}가 가능)
    *   연산 (`possible << 3`): `...00101`의 비트들을 왼쪽으로 3칸 이동시킵니다.
    *   결과: `...101000` (이제 3번과 5번 비트가 1이 됩니다. 이는 기존 합 {0, 2}에 3을 더한 {3, 5}를 의미합니다.)

### 2단계: OR 연산 (`possible | ...`)
*   **의미:** 기존에 만들 수 있었던 합들의 집합과, 새로 만들어진 합들의 집합을 **합칩니다(Union)**.
*   **작동 원리:** `|` 연산자는 두 비트 중 하나라도 1이면 1을 반환합니다.
    *   기존 상태: `...000101` (합 {0, 2})
    *   시프트된 상태: `...101000` (합 {3, 5})
    *   OR 연산 결과: `...101101` (합 {0, 2, 3, 5})

### 3단계: 할당 연산 (`|=`)
*   **의미:** 계산된 새로운 상태를 `possible` 변수에 저장하여 업데이트합니다. 이제 `possible`은 처리 완료한 0/1 item으로 만들 수 있고 bitset capacity 안에 남은 합을 표현합니다.

## 3. 왜 이 방식이 더 빠른가? (메커니즘의 이점)

일반적인 DP와 `bitset` DP의 차이는 **작업 처리 단위**에 있습니다.

### 일반 DP (Loop 방식)
```cpp
for (int i = MAX; i >= w; i--) {
    if (dp[i - w]) dp[i] = true;
}
```
이 방식은 배열의 각 칸(인덱스)을 하나씩 방문하며 `if` 문을 수행하고 값을 씁니다. 배열의 크기가 N이라면 N번의 연산이 필요합니다.

### Bitset DP (비트 연산 방식)
```cpp
possible |= (possible << w);
```
`std::bitset`의 storage layout과 generated instruction은 implementation·compiler·target에 종속됩니다. 보통 여러 bit를 word 단위로 처리해 scalar boolean loop의 constant factor를 줄이지만 정확히 32/64 states나 한 instruction을 보장하지 않습니다.
결과적으로 연산 횟수가 약 **1/32** 또는 **1/64**로 줄어드는 효과가 있습니다 (이를 상수 최적화라고 합니다).

## 요약

`bitset` 방식의 메커니즘은 다음과 같이 요약할 수 있습니다.

1.  **상태 압축:** 배열의 인덱스를 비트의 위치로 변환하여 메모리를 절약합니다.
2.  **병렬 덧셈:** `<< w` 연산을 통해 현재 가능한 모든 합에 `w`를 더하는 과정을 source 표현 한 번의 shift로 기술하지만 실행 비용은 bitset의 storage word 수에 비례할 수 있습니다.
3.  **병렬 병합:** `|` 연산을 통해 "물건을 넣지 않는 경우(기존 값)"와 "물건을 넣는 경우(시프트된 값)"를 한 번에 합칩니다.

이것이 복잡한 반복문 없이도 모든 가능한 합을 빠르게 계산할 수 있는 이유입니다.
