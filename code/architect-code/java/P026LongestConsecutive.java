/**
 * 문제 026: 가장 긴 연속 수열 (Longest Consecutive Sequence)
 *
 * [문제] 정렬되지 않은 배열에서 가장 긴 연속 수열의 길이를 O(n)에 구하라.
 *
 * [아키텍트의 시선]
 * HashSet 기반 O(n) 풀이는 "시퀀스의 시작점만 탐색"하는 전략이다.
 * 이는 분산 시스템의 리더 선출, 체인 시작점 탐지,
 * 연속적 이벤트 시퀀스의 시작/끝 감지와 동일한 패턴이다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(n)
 */
import java.util.*;

public class P026LongestConsecutive {
    public static int longestConsecutive(int[] nums) {
        Set<Integer> numSet = new HashSet<>();
        for (int n : nums) numSet.add(n);

        int maxLen = 0;
        for (int num : numSet) {
            // 시퀀스의 시작점인 경우만 탐색 (num-1이 없는 경우)
            if (!numSet.contains(num - 1)) {
                int current = num;
                int length = 1;
                while (numSet.contains(current + 1)) {
                    current++;
                    length++;
                }
                maxLen = Math.max(maxLen, length);
            }
        }
        return maxLen;
    }

    public static void main(String[] args) {
        assert longestConsecutive(new int[]{100, 4, 200, 1, 3, 2}) == 4;
        assert longestConsecutive(new int[]{0, 3, 7, 2, 5, 8, 4, 6, 0, 1}) == 9;
        assert longestConsecutive(new int[]{}) == 0;
        assert longestConsecutive(new int[]{1}) == 1;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
