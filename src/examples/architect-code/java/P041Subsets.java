/**
 * 문제 041: 부분집합 (Subsets)
 *
 * [문제] 중복 없는 정수 배열의 모든 부분집합(멱집합)을 반환하라.
 *
 * [아키텍트의 시선]
 * 부분집합 열거는 기능 플래그 조합 테스트, 마이크로서비스 의존성 분석,
 * 설정 옵션의 모든 가능한 조합 검증과 동일하다.
 * 비트마스킹과 백트래킹 두 방법 모두 이해해야 한다.
 *
 * [시간 복잡도] O(n * 2^n) [공간 복잡도] O(n * 2^n)
 */
import java.util.*;

public class P041Subsets {
    public static List<List<Integer>> subsets(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        backtrack(nums, 0, new ArrayList<>(), result);
        return result;
    }

    private static void backtrack(int[] nums, int start, List<Integer> current, List<List<Integer>> result) {
        result.add(new ArrayList<>(current)); // 현재 상태를 결과에 추가
        for (int i = start; i < nums.length; i++) {
            current.add(nums[i]);          // 선택
            backtrack(nums, i + 1, current, result); // 탐색
            current.remove(current.size() - 1);       // 되돌리기
        }
    }

    // 비트마스킹 방법
    public static List<List<Integer>> subsetsBitmask(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        int n = nums.length;
        for (int mask = 0; mask < (1 << n); mask++) {
            List<Integer> subset = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                if ((mask & (1 << i)) != 0) subset.add(nums[i]);
            }
            result.add(subset);
        }
        return result;
    }

    public static void main(String[] args) {
        List<List<Integer>> r = subsets(new int[]{1, 2, 3});
        assert r.size() == 8; // 2^3 = 8
        assert r.contains(Arrays.asList());
        assert r.contains(Arrays.asList(1, 2, 3));

        List<List<Integer>> r2 = subsetsBitmask(new int[]{1, 2});
        assert r2.size() == 4;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
