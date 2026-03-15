"""
문제 092: 유니온 파인드 (Union-Find / Disjoint Set)
[문제] Union-Find를 경로 압축과 랭크 최적화로 구현하라.
[아키텍트의 시선] 동적 연결성 관리.
find: 경로 압축으로 amortized O(alpha(n)) ≈ O(1).
union: 랭크/크기 기반 합치기로 트리 균형 유지.
실무: 네트워크 연결 관리, 이미지 영역 병합, 크루스칼 MST, 소셜 그룹.
[시간 복잡도] O(alpha(n)) per operation [공간 복잡도] O(n)
"""

class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.size = [1] * n
        self.count = n  # 집합 수

    def find(self, x: int) -> int:
        """경로 압축"""
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: int, y: int) -> bool:
        """랭크 기반 합치기. 이미 같은 집합이면 False."""
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        self.size[px] += self.size[py]
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        self.count -= 1
        return True

    def connected(self, x: int, y: int) -> bool:
        return self.find(x) == self.find(y)

    def get_size(self, x: int) -> int:
        return self.size[self.find(x)]

if __name__ == "__main__":
    uf = UnionFind(6)
    assert uf.count == 6
    uf.union(0, 1)
    uf.union(2, 3)
    assert uf.connected(0, 1) == True
    assert uf.connected(0, 2) == False
    assert uf.count == 4
    uf.union(1, 3)
    assert uf.connected(0, 3) == True
    assert uf.count == 3
    assert uf.get_size(0) == 4
    assert uf.union(0, 1) == False  # 이미 연결됨
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
