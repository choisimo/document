/**
 * 문제 075: 크루스칼 MST (Kruskal's Minimum Spanning Tree)
 *
 * [문제] 가중치 무방향 그래프의 최소 신장 트리를 크루스칼 알고리즘으로 구하라.
 *
 * [아키텍트의 시선]
 * MST는 네트워크 케이블 배선 최적화, 클러스터링(single-linkage),
 * 도로망/통신망 최소 비용 설계의 핵심이다.
 * 크루스칼 = 간선 정렬 + Union-Find = 탐욕법의 정당성이 증명된 경우.
 *
 * [시간 복잡도] O(E log E) [공간 복잡도] O(V)
 */
import java.util.*;

public class P075Kruskal {
    static int[] parent, rank;

    static int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]); // 경로 압축
        return parent[x];
    }

    static boolean union(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false; // 이미 같은 집합
        if (rank[px] < rank[py]) { int t = px; px = py; py = t; }
        parent[py] = px;
        if (rank[px] == rank[py]) rank[px]++;
        return true;
    }

    public static int kruskalMST(int n, int[][] edges) {
        parent = new int[n]; rank = new int[n];
        for (int i = 0; i < n; i++) parent[i] = i;

        // 가중치 기준 정렬
        Arrays.sort(edges, (a, b) -> a[2] - b[2]);

        int totalWeight = 0, edgeCount = 0;
        for (int[] edge : edges) {
            if (union(edge[0], edge[1])) {
                totalWeight += edge[2];
                edgeCount++;
                if (edgeCount == n - 1) break;
            }
        }
        return totalWeight;
    }

    public static void main(String[] args) {
        // 0--1(4), 0--2(1), 1--2(2), 1--3(5), 2--3(8), 3--4(3)
        int[][] edges = {{0,1,4},{0,2,1},{1,2,2},{1,3,5},{2,3,8},{3,4,3}};
        assert kruskalMST(5, edges) == 11; // 0-2(1) + 1-2(2) + 3-4(3) + 1-3(5)
        System.out.println("✓ 모든 테스트 통과!");
    }
}
