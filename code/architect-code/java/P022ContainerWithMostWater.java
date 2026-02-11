/**
 * 문제 022: 가장 많은 물을 담는 컨테이너 (Container With Most Water)
 *
 * [문제] 높이 배열이 주어질 때, 두 선분과 x축으로 만든 컨테이너에
 * 담을 수 있는 최대 물의 양을 구하라.
 *
 * [아키텍트의 시선]
 * 투 포인터의 탐욕적 이동은 리소스 할당 최적화의 핵심이다.
 * "병목(짧은 쪽)을 먼저 개선"하는 전략은 시스템 성능 튜닝의 기본 원칙 —
 * Amdahl의 법칙과 동일한 사고방식이다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(1)
 */
public class P022ContainerWithMostWater {
    public static int maxArea(int[] height) {
        int left = 0, right = height.length - 1;
        int maxWater = 0;

        while (left < right) {
            int h = Math.min(height[left], height[right]);
            int w = right - left;
            maxWater = Math.max(maxWater, h * w);
            // 낮은 쪽을 이동해야 더 큰 영역을 찾을 가능성이 있다
            if (height[left] < height[right]) {
                left++;
            } else {
                right--;
            }
        }
        return maxWater;
    }

    public static void main(String[] args) {
        assert maxArea(new int[]{1,8,6,2,5,4,8,3,7}) == 49;
        assert maxArea(new int[]{1,1}) == 1;
        assert maxArea(new int[]{4,3,2,1,4}) == 16;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
