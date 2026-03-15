/**
 * 문제 042: 순열 (Permutations)
 *
 * [문제] 중복 없는 정수 배열의 모든 순열을 반환하라.
 *
 * [아키텍트의 시선]
 * 순열 생성은 작업 스케줄링의 모든 실행 순서 탐색,
 * A/B 테스트의 변형 생성, 라우팅 경로 탐색의 기초다.
 * 백트래킹의 "선택-탐색-되돌림" 패턴은 트랜잭션의 commit/rollback과 같다.
 *
 * [시간 복잡도] O(n! * n) [공간 복잡도] O(n!)
 */
import java.util.*;

public class P042Permutations {
    public static List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        boolean[] used = new boolean[nums.length];
        backtrack(nums, used, new ArrayList<>(), result);
        return result;
    }

    private static void backtrack(int[] nums, boolean[] used, List<Integer> current, List<List<Integer>> result) {
        if (current.size() == nums.length) {
            result.add(new ArrayList<>(current));
            return;
        }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            current.add(nums[i]);
            backtrack(nums, used, current, result);
            current.remove(current.size() - 1);
            used[i] = false;
        }
    }

    public static void main(String[] args) {
        List<List<Integer>> r = permute(new int[]{1, 2, 3});
        assert r.size() == 6; // 3! = 6
        assert r.contains(Arrays.asList(1, 2, 3));
        assert r.contains(Arrays.asList(3, 2, 1));

        assert permute(new int[]{1}).size() == 1;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
