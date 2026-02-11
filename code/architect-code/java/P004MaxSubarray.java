/**
 * 문제 004: 최대 부분 배열 합 (Kadane's Algorithm)
 * [문제] 연속 부분 배열의 최대 합을 구하라.
 * [아키텍트의 시선] 온라인 알고리즘과 상태 전이.
 * current = max(nums[i], current + nums[i]) → 이전을 포함할지 새로 시작할지.
 * 실무: 주가 최대 수익 구간, 네트워크 트래픽 피크 분석.
 * [시간 복잡도] O(n) [공간 복잡도] O(1)
 */
public class P004MaxSubarray {
    public static int maxSubArray(int[] nums) {
        int maxSum = nums[0], current = nums[0];
        for (int i = 1; i < nums.length; i++) {
            current = Math.max(nums[i], current + nums[i]);
            maxSum = Math.max(maxSum, current);
        }
        return maxSum;
    }

    public static void main(String[] args) {
        assert maxSubArray(new int[]{-2,1,-3,4,-1,2,1,-5,4}) == 6;
        assert maxSubArray(new int[]{1}) == 1;
        assert maxSubArray(new int[]{-1}) == -1;
        assert maxSubArray(new int[]{5,4,-1,7,8}) == 23;
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
