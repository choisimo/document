/**
 * 문제 019: 슬라이딩 윈도우 최댓값 (Sliding Window Maximum)
 *
 * [문제] 크기 k의 슬라이딩 윈도우가 배열을 지날 때,
 * 각 위치에서의 윈도우 내 최댓값을 반환하라.
 *
 * [아키텍트의 시선]
 * 덱(Deque) 기반 슬라이딩 윈도우는 실시간 스트리밍에서
 * 윈도우 집계(max, min)를 O(1)에 수행하는 핵심 패턴이다.
 * 시계열 DB의 윈도우 함수, 네트워크 QoS 모니터링에 직접 적용된다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(k)
 */
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Arrays;

public class P019SlidingWindowMax {
    public static int[] maxSlidingWindow(int[] nums, int k) {
        if (nums.length == 0) return new int[]{};
        int n = nums.length;
        int[] result = new int[n - k + 1];
        Deque<Integer> deque = new ArrayDeque<>(); // 인덱스 저장, 내림차순 유지

        for (int i = 0; i < n; i++) {
            // 윈도우 범위 밖의 원소 제거
            while (!deque.isEmpty() && deque.peekFirst() < i - k + 1) {
                deque.pollFirst();
            }
            // 현재 값보다 작은 원소는 불필요 → 제거
            while (!deque.isEmpty() && nums[deque.peekLast()] < nums[i]) {
                deque.pollLast();
            }
            deque.offerLast(i);
            // 윈도우가 완성된 시점부터 결과 기록
            if (i >= k - 1) {
                result[i - k + 1] = nums[deque.peekFirst()];
            }
        }
        return result;
    }

    public static void main(String[] args) {
        assert Arrays.equals(
            maxSlidingWindow(new int[]{1,3,-1,-3,5,3,6,7}, 3),
            new int[]{3,3,5,5,6,7});
        assert Arrays.equals(
            maxSlidingWindow(new int[]{1}, 1),
            new int[]{1});
        assert Arrays.equals(
            maxSlidingWindow(new int[]{9,11}, 2),
            new int[]{11});
        System.out.println("✓ 모든 테스트 통과!");
    }
}
