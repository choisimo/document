/**
 * 문제 001: 두 수의 합 (Two Sum)
 * [문제] 정수 배열에서 두 수의 합이 target인 인덱스 쌍을 찾아라.
 * [아키텍트의 시선] 해시맵 기반 인덱싱과 조회 최적화.
 * O(n^2) 브루트포스 → O(n) 해시맵: 공간을 시간으로 교환.
 * 실무: 데이터베이스 인덱스, 캐시 조회, 역인덱스 설계.
 * [시간 복잡도] O(n) [공간 복잡도] O(n)
 */
import java.util.*;

public class P001TwoSum {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[]{map.get(complement), i};
            }
            map.put(nums[i], i);
        }
        return new int[]{};
    }

    public static void main(String[] args) {
        assert Arrays.equals(twoSum(new int[]{2, 7, 11, 15}, 9), new int[]{0, 1});
        assert Arrays.equals(twoSum(new int[]{3, 2, 4}, 6), new int[]{1, 2});
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
