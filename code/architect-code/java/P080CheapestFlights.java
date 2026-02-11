/**
 * 문제 080: K번 이내 환승 최저가 항공편 (Cheapest Flights Within K Stops)
 *
 * [문제] n개 도시와 항공편이 주어질 때, 최대 K번 환승으로
 * src에서 dst까지의 최저 비용을 구하라. 불가능하면 -1.
 *
 * [아키텍트의 시선]
 * 제약 있는 최단 경로는 SLA 제한 내 최적 경로,
 * TTL 제한 네트워크 라우팅, 예산 제한 서비스 호출 체인과 동일하다.
 * 벨만-포드 변형으로 "K+1 라운드만 실행"하면 된다.
 *
 * [시간 복잡도] O(K * E) [공간 복잡도] O(V)
 */
import java.util.*;

public class P080CheapestFlights {
    public static int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        dist[src] = 0;

        // K+1번 반복 (환승 K번 = 간선 K+1개)
        for (int i = 0; i <= k; i++) {
            int[] temp = Arrays.copyOf(dist, n); // 이전 라운드의 값 보존
            for (int[] f : flights) {
                int u = f[0], v = f[1], w = f[2];
                if (dist[u] != Integer.MAX_VALUE && dist[u] + w < temp[v]) {
                    temp[v] = dist[u] + w;
                }
            }
            dist = temp;
        }
        return dist[dst] == Integer.MAX_VALUE ? -1 : dist[dst];
    }

    public static void main(String[] args) {
        int[][] flights = {{0,1,100},{1,2,100},{0,2,500}};
        assert findCheapestPrice(3, flights, 0, 2, 1) == 200;
        assert findCheapestPrice(3, flights, 0, 2, 0) == 500;

        int[][] flights2 = {{0,1,1},{1,2,1},{2,3,1}};
        assert findCheapestPrice(4, flights2, 0, 3, 1) == -1;
        assert findCheapestPrice(4, flights2, 0, 3, 2) == 3;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
