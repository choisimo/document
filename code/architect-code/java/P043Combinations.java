/**
 * 문제 043: 조합 (Combinations)
 *
 * [문제] 1부터 n까지의 수에서 k개를 선택하는 모든 조합을 반환하라.
 *
 * [아키텍트의 시선]
 * 조합 생성은 팀 구성, 리소스 할당, 포트폴리오 최적화에서
 * 가능한 선택지를 열거하는 기본 패턴이다.
 * 가지치기(pruning)로 불필요한 탐색을 줄이는 것이 핵심이다.
 *
 * [시간 복잡도] O(C(n,k) * k) [공간 복잡도] O(C(n,k) * k)
 */
import java.util.*;

public class P043Combinations {
    public static List<List<Integer>> combine(int n, int k) {
        List<List<Integer>> result = new ArrayList<>();
        backtrack(n, k, 1, new ArrayList<>(), result);
        return result;
    }

    private static void backtrack(int n, int k, int start, List<Integer> current, List<List<Integer>> result) {
        if (current.size() == k) {
            result.add(new ArrayList<>(current));
            return;
        }
        // 가지치기: 남은 수가 부족하면 중단
        for (int i = start; i <= n - (k - current.size()) + 1; i++) {
            current.add(i);
            backtrack(n, k, i + 1, current, result);
            current.remove(current.size() - 1);
        }
    }

    public static void main(String[] args) {
        List<List<Integer>> r = combine(4, 2);
        assert r.size() == 6; // C(4,2) = 6
        assert r.contains(Arrays.asList(1, 2));
        assert r.contains(Arrays.asList(3, 4));

        assert combine(1, 1).size() == 1;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
