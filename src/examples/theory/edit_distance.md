# Edit Distance (편집 거리)와 가중치 연산 메커니즘

이 문서는 **Competitive Programmer's Handbook**과 **Introduction to Algorithms (Third Edition)**에 기반하여, **Edit Distance (편집 거리)**, 특히 Levenshtein Distance에서 두 문자열을 비교하고 가중치를 결정하는 핵심 원리를 설명합니다. 단순 암기가 아닌, 알고리즘이 '왜' 이렇게 작동하는지 이해하는 것을 목표로 합니다.

## 적용 범위와 검증 기준

- **범위:** 기본 설명은 insertion·deletion·substitution cost가 1이고 match가 0인 Levenshtein distance입니다. transposition을 포함하는 Damerau 계열과 weighted variant는 다른 문제입니다.
- **입력 전제:** 비교 단위가 byte, Unicode code point, grapheme cluster 중 무엇인지와 normalization, case/locale policy를 정의합니다.
- **복잡도 전제:** 길이 `N`, `M`의 full table은 `O(NM)` time·space이며 distance만 필요하고 dependency가 맞으면 space를 `O(min(N,M))`로 줄일 수 있습니다.
- **실패·완료:** empty string, combining character, asymmetric/negative weight, overflow와 path reconstruction을 시험합니다. 작은 입력의 exhaustive/reference 결과, recurrence와 boundary row/column이 일치할 때 완료입니다.

---

## 1. 가중치(Cost) 결정의 핵심 로직

unit-cost Levenshtein에서 현재 두 문자의 동일성은 match/substitution cost를 결정합니다. insertion과 deletion cost는 별도 transition이며 weighted variant에서는 함수가 달라집니다. 이를 소스 자료에서는 $cost(a, b)$ 함수로 표현하고 있습니다.

*   **문자가 일치할 때 ($x[a] == y[b]$):**
    두 문자가 동일하다면 편집할 필요가 없으므로 가중치(비용)는 **0**입니다. 이를 **매치(Match)** 또는 **Copy**라고 부릅니다.
*   **문자가 불일치할 때 ($x[a] \neq y[b]$):**
    두 문자가 다르다면 하나의 문자를 다른 문자로 변경해야 하므로 가중치는 **1**이 됩니다 (일반적인 Levenshtein Distance의 경우). 이를 **수정(Modify)** 또는 **교체(Replace)**라고 부릅니다.

## 2. 동적 계획법(DP) 점화식에서의 비교 연산

이 가중치 비교는 전체 편집 거리를 계산하는 재귀 점화식(Recurrence Relation)의 일부로 사용됩니다. 문자열 $x$의 길이 $a$까지의 접두사와 문자열 $y$의 길이 $b$까지의 접두사 사이의 거리를 $distance(a, b)$라고 할 때, 계산식은 다음과 같습니다:

$$distance(a, b) = \min \begin{cases} distance(a, b-1) + 1 & \text{(삽입, Insert)} \\ distance(a-1, b) + 1 & \text{(삭제, Remove)} \\ distance(a-1, b-1) + cost(a, b) & \text{(수정 또는 매치)} \end{cases}$$

여기서 세 번째 항목인 **$distance(a-1, b-1) + cost(a, b)$** 부분이 바로 두 문자의 비교 연산이 적용되는 지점입니다.
*   만약 문자가 같다면 $cost(a, b)$는 0이 되어 대각선 방향($a-1, b-1$)의 값이 그대로 전달됩니다.
*   만약 문자가 다르다면 $cost(a, b)$는 1이 되어 이전 상태의 비용에 1이 더해집니다.

## 3. 가중치의 일반화 (Weighted Edit Distance)

unit-cost Levenshtein에서는 insertion·deletion·substitution cost가 1이고 match cost가 0입니다. weighted cost는 문제별로 달라지며 symmetry·triangle inequality 같은 metric 성질이 유지되는지 별도 확인합니다.

*   **다양한 연산 비용:** 예를 들어, **Copy** (문자 유지) 비용과 **Replace** (문자 교체) 비용이 서로 다를 수 있으며, **Delete**나 **Insert** 비용이 교체 비용보다 클 수도 있습니다.
*   **DNA 서열 정렬 예시:** 생물학적 응용에서는 유사도를 측정하기 위해 다른 점수 체계를 사용하기도 합니다. 예를 들어, 문자가 일치하면 **+1**, 불일치하면 **-1**, 공백(삽입/삭제)에는 **-2**의 점수를 부여하여 점수의 합을 최대화하는 방식으로 변형될 수 있습니다.

## 요약

Edit Distance에서 두 문자열의 비교 연산은 **현재 위치의 문자가 서로 동일한지 확인하여, 동일하면 가중치 0을, 다르면 정해진 가중치(보통 1)를 부여**하여 이전 단계($a-1, b-1$)의 최적해에 더하는 방식으로 작동합니다.
