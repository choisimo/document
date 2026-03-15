/**
 * 문제 088: 집 도둑 (House Robber)
 *
 * [문제] 일렬 집들의 금액 nums[]에서 인접한 집을 털 수 없을 때 최대 금액을 구하라.
 *
 * [아키텍트의 시선]
 * 상태 정의의 핵심 — 선택/비선택 DP.
 * dp[i] = max(dp[i-1], dp[i-2] + nums[i])
 * '현재를 선택하면 이전 불가, 선택 안 하면 이전까지의 최적 유지'
 * 실무: 자원 할당에서 충돌 제약, 스케줄링 제약, 독립 집합 최적화.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(1)
 */

public class P088HouseRobber {
    // 선형 배열
    public static int rob(int[] nums) {
        if (nums.length == 0) return 0;
        if (nums.length == 1) return nums[0];
        if (nums.length == 2) return Math.max(nums[0], nums[1]);
        int prev2 = nums[0], prev1 = Math.max(nums[0], nums[1]);
        for (int i = 2; i < nums.length; i++) {
            int curr = Math.max(prev1, prev2 + nums[i]);
            prev2 = prev1;
            prev1 = curr;
        }
        return prev1;
    }

    // 원형 배열 (House Robber II)
    public static int robCircular(int[] nums) {
        if (nums.length == 1) return nums[0];
        return Math.max(robRange(nums, 0, nums.length - 2),
                        robRange(nums, 1, nums.length - 1));
    }
    private static int robRange(int[] nums, int start, int end) {
        int prev2 = 0, prev1 = 0;
        for (int i = start; i <= end; i++) {
            int curr = Math.max(prev1, prev2 + nums[i]);
            prev2 = prev1;
            prev1 = curr;
        }
        return prev1;
    }

    public static void main(String[] args) {
        assert rob(new int[]{1,2,3,1}) == 4;     // 1+3
        assert rob(new int[]{2,7,9,3,1}) == 12;  // 2+9+1
        assert rob(new int[]{2,1,1,2}) == 4;     // 2+2
        // 원형
        assert robCircular(new int[]{2,3,2}) == 3;
        assert robCircular(new int[]{1,2,3,1}) == 4;
        assert robCircular(new int[]{1,2,3}) == 3;
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
