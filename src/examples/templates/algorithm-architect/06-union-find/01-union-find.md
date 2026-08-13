# 유니온 파인드 (Union-Find / Disjoint Set)

## 개요

| 항목 | 설명 |
|------|------|
| **Use Case** | 집합 합치기, 연결 요소 판별, 크루스칼 알고리즘 |
| **Components** | Parent Array, Rank Array (최적화) |
| **Constraint** | 두 최적화는 α(N) amortized bound의 전제; deletion은 직접 지원하지 않음 |
| **시간 복잡도** | operation sequence에서 amortized O(α(N)); strict O(1) 아님 |

---

## 적용 범위와 검증 기준

- **범위:** insertion과 union/connectivity query가 있는 disjoint-set 문제입니다. 일반적인 edge deletion이나 historical connectivity는 별도 구조가 필요합니다.
- **복잡도 전제:** path compression과 union by rank/size를 함께 사용한 operation sequence의 amortized bound가 `O(α(N))`입니다. 개별 operation이 strict `O(1)`이라는 뜻은 아닙니다.
- **실패 조건:** uninitialized parent, invalid index, rank/size update 오류, recursion depth와 Kruskal의 disconnected graph를 포함합니다.
- **완료 증거:** naive set-label reference와 random union/find sequence를 비교하고 parent forest·representative·component count invariant를 확인합니다.

---

## 기본 템플릿

```python
# [Union-Find 템플릿: 아키텍트 버전]
# Use Case: 집합 합치기, 연결 요소 판별, 크루스칼 알고리즘
# Components: Parent Array, Rank Array (최적화)
# Constraint: Path Compression + Union by Rank

class UnionFind:
    def __init__(self, n):
        # 1. 초기화 (Initialization Layer)
        #    - 각 노드가 자기 자신을 부모로
        self.parent = list(range(n))
        self.rank = [0] * n
    
    # 2. Find 연산 (Find Operation)
    #    - 경로 압축(Path Compression) 적용
    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # 경로 압축
        return self.parent[x]
    
    # 3. Union 연산 (Union Operation)
    #    - Rank 기반 합치기
    def union(self, x, y):
        root_x = self.find(x)
        root_y = self.find(y)
        
        if root_x == root_y:
            return False  # 이미 같은 집합
        
        # 4. Rank 비교 (Union by Rank)
        if self.rank[root_x] < self.rank[root_y]:
            self.parent[root_x] = root_y
        elif self.rank[root_x] > self.rank[root_y]:
            self.parent[root_y] = root_x
        else:
            self.parent[root_y] = root_x
            self.rank[root_x] += 1
        
        return True
    
    # 5. 연결 여부 확인 (Connected Check)
    def is_connected(self, x, y):
        return self.find(x) == self.find(y)
```

---

## 예제: 크루스칼 알고리즘 (Kruskal's MST)

```python
# [예제: 크루스칼 알고리즘 (Kruskal's MST)]
def kruskal_mst(n, edges):
    # 1. 간선 정렬 (가중치 기준)
    edges.sort(key=lambda x: x[2])
    
    uf = UnionFind(n)
    mst = []
    total_weight = 0
    
    # 2. 간선 순회
    for u, v, weight in edges:
        # 3. 사이클 검사
        if uf.union(u, v):
            mst.append((u, v, weight))
            total_weight += weight
    
    return mst, total_weight
```

---

## 구조 요약

```text
초기화(parent, rank) → Find(경로 압축) → Union(랭크 기반) → Connected 체크
```
