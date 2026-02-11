/**
 * 문제 065: 그래프 표현 (Graph Representation)
 *
 * [문제] 인접 리스트와 인접 행렬로 그래프를 표현하고 기본 연산을 구현하라.
 *
 * [아키텍트의 시선]
 * 그래프 표현 방식의 선택은 시스템 설계의 첫 번째 결정이다.
 * 인접 리스트 = 희소 그래프(소셜 네트워크), 인접 행렬 = 밀집 그래프(라우팅 테이블).
 * 마이크로서비스 의존성 맵, API 호출 관계도 모두 그래프다.
 *
 * [공간 복잡도] 인접 리스트 O(V+E), 인접 행렬 O(V^2)
 */
import java.util.*;

public class P065GraphRepresentation {
    // 인접 리스트
    static class AdjListGraph {
        Map<Integer, List<Integer>> graph;
        boolean directed;

        AdjListGraph(boolean directed) {
            this.graph = new HashMap<>();
            this.directed = directed;
        }

        void addEdge(int u, int v) {
            graph.computeIfAbsent(u, k -> new ArrayList<>()).add(v);
            if (!directed) {
                graph.computeIfAbsent(v, k -> new ArrayList<>()).add(u);
            }
        }

        List<Integer> neighbors(int u) {
            return graph.getOrDefault(u, Collections.emptyList());
        }

        boolean hasEdge(int u, int v) {
            return graph.containsKey(u) && graph.get(u).contains(v);
        }
    }

    // 인접 행렬
    static class AdjMatrixGraph {
        int[][] matrix;
        int size;

        AdjMatrixGraph(int size) {
            this.size = size;
            this.matrix = new int[size][size];
        }

        void addEdge(int u, int v) {
            matrix[u][v] = 1;
            matrix[v][u] = 1; // 무방향
        }

        boolean hasEdge(int u, int v) {
            return matrix[u][v] == 1;
        }
    }

    public static void main(String[] args) {
        // 인접 리스트 테스트
        AdjListGraph g1 = new AdjListGraph(false);
        g1.addEdge(0, 1); g1.addEdge(0, 2); g1.addEdge(1, 2);
        assert g1.hasEdge(0, 1);
        assert g1.hasEdge(1, 0); // 무방향
        assert g1.neighbors(0).size() == 2;

        // 방향 그래프
        AdjListGraph g2 = new AdjListGraph(true);
        g2.addEdge(0, 1);
        assert g2.hasEdge(0, 1);
        assert !g2.hasEdge(1, 0);

        // 인접 행렬 테스트
        AdjMatrixGraph g3 = new AdjMatrixGraph(3);
        g3.addEdge(0, 1); g3.addEdge(1, 2);
        assert g3.hasEdge(0, 1);
        assert !g3.hasEdge(0, 2);

        System.out.println("✓ 모든 테스트 통과!");
    }
}
