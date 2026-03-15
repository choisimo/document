/**
 * 문제 021: 세 수의 합 (3Sum)
 *
 * [문제] 배열에서 합이 0이 되는 세 수의 조합을 모두 찾아라. 중복 제거.
 *
 * [아키텍트의 시선]
 * 정렬 + 투 포인터는 O(n^3)을 O(n^2)로 줄이는 전형적 최적화 패턴이다.
 * 데이터베이스 조인 최적화에서 정렬 기반 머지 조인과 동일한 원리다.
 * 중복 제거 로직은 결과 집합의 유일성 보장 — API 응답 정규화와 같다.
 *
 * [시간 복잡도] O(n^2) [공간 복잡도] O(1) 정렬 제외
 */
import java.util.*;

public class P021ThreeSum {
    public static List<List<Integer>> threeSum(int[] nums) {
        List<List<Integer>> result = new ArrayList<>();
        Arrays.sort(nums);

        for (int i = 0; i < nums.length - 2; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue; // 중복 건너뛰기
            int left = i + 1, right = nums.length - 1;
            while (left < right) {
                int sum = nums[i] + nums[left] + nums[right];
                if (sum == 0) {
                    result.add(Arrays.asList(nums[i], nums[left], nums[right]));
                    while (left < right && nums[left] == nums[left + 1]) left++;
                    while (left < right && nums[right] == nums[right - 1]) right--;
                    left++; right--;
                } else if (sum < 0) {
                    left++;
                } else {
                    right--;
                }
            }
        }
        return result;
    }

    public static void main(String[] args) {
        List<List<Integer>> r = threeSum(new int[]{-1, 0, 1, 2, -1, -4});
        assert r.size() == 2;
        assert r.contains(Arrays.asList(-1, -1, 2));
        assert r.contains(Arrays.asList(-1, 0, 1));
        assert threeSum(new int[]{0, 0, 0}).size() == 1;
        assert threeSum(new int[]{1, 2, 3}).isEmpty();
        System.out.println("✓ 모든 테스트 통과!");
    }
}
