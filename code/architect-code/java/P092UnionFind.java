/**
 * 문제 092: 유니온 파인드 (Union-Find / Disjoint Set)
 *
 * [문제] Union-Find를 경로 압축과 랭크 최적화로 구현하라.
 *
 * [아키텍트의 시선]
 * 동적 연결성 관리.
 * find: 경로 압축으로 amortized O(alpha(n)) ~ O(1).
 * union: 랭크/크기 기반 합치기로 트리 균형 유지.
 * 실무: 네트워크 연결 관리, 이미지 영역 병합, 크루스칼 MST, 소셜 그룹.
 *
 * [시간 복잡도] O(alpha(n)) per operation [공간 복잡도] O(n)
 */

public class P092UnionFind {
    private int[] parent;
    private int[] rank;
    private int[] size;
    private int count; // 집합 수

    public P092UnionFind(int n) {
        parent = new int[n];
        rank = new int[n];
        size = new int[n];
        count = n;
        for (int i = 0; i < n; i++) {
            parent[i] = i;
            size[i] = 1;
        }
    }

    // 경로 압축
    public int find(int x) {
        if (parent[x] != x) {
            parent[x] = find(parent[x]);
        }
        return parent[x];
    }

    // 랭크 기반 합치기. 이미 같은 집합이면 false.
    public boolean union(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false;
        if (rank[px] < rank[py]) { int tmp = px; px = py; py = tmp; }
        parent[py] = px;
        size[px] += size[py];
        if (rank[px] == rank[py]) rank[px]++;
        count--;
        return true;
    }

    public boolean connected(int x, int y) { return find(x) == find(y); }
    public int getSize(int x) { return size[find(x)]; }
    public int getCount() { return count; }

    public static void main(String[] args) {
        P092UnionFind uf = new P092UnionFind(6);
        assert uf.getCount() == 6;
        uf.union(0, 1);
        uf.union(2, 3);
        assert uf.connected(0, 1) == true;
        assert uf.connected(0, 2) == false;
        assert uf.getCount() == 4;
        uf.union(1, 3);
        assert uf.connected(0, 3) == true;
        assert uf.getCount() == 3;
        assert uf.getSize(0) == 4;
        assert uf.union(0, 1) == false; // 이미 연결됨
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
