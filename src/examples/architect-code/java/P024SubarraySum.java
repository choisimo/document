/**
 * 문제 024: 부분 배열의 합 (Subarray Sum Equals K)
 *
 * [문제] 연속 부분 배열의 합이 k가 되는 경우의 수를 구하라.
 *
 * [아키텍트의 시선]
 * 누적합(Prefix Sum) + 해시맵은 O(n)에 구간 합 질의를 처리하는 핵심 기법이다.
 * 이는 시계열 데이터베이스의 범위 집계, 재무 시스템의 누적 거래 분석,
 * 네트워크 트래픽의 구간별 대역폭 계산과 동일한 원리다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(n)
 */
import java.util.*;

public class P024SubarraySum {
    public static int subarraySum(int[] nums, int k) {
        Map<Integer, Integer> prefixCount = new HashMap<>();
        prefixCount.put(0, 1); // 빈 부분 배열(합 0)이 1개 존재
        int count = 0, prefixSum = 0;

        for (int num : nums) {
            prefixSum += num;
            // prefixSum - k가 이전에 등장했다면, 그 지점부터 현재까지의 합이 k
            count += prefixCount.getOrDefault(prefixSum - k, 0);
            prefixCount.merge(prefixSum, 1, Integer::sum);
        }
        return count;
    }

    public static void main(String[] args) {
        assert subarraySum(new int[]{1, 1, 1}, 2) == 2;
        assert subarraySum(new int[]{1, 2, 3}, 3) == 2;
        assert subarraySum(new int[]{1, -1, 0}, 0) == 3;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
