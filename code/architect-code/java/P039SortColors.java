/**
 * 문제 039: 색 정렬 (Sort Colors — Dutch National Flag)
 *
 * [문제] 0, 1, 2로만 이루어진 배열을 제자리에서 정렬하라.
 * 한 번의 순회로 해결하라 (Dutch National Flag 알고리즘).
 *
 * [아키텍트의 시선]
 * 3-way 파티셔닝은 데이터를 범주별로 분류하는 핵심 패턴이다.
 * 네트워크 트래픽의 우선순위 분류(QoS), 요청의 긴급도 분류,
 * 멀티 레벨 캐시 할당과 동일한 원리다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(1)
 */
import java.util.Arrays;

public class P039SortColors {
    public static void sortColors(int[] nums) {
        int low = 0, mid = 0, high = nums.length - 1;
        while (mid <= high) {
            if (nums[mid] == 0) {
                swap(nums, low, mid);
                low++; mid++;
            } else if (nums[mid] == 1) {
                mid++;
            } else { // nums[mid] == 2
                swap(nums, mid, high);
                high--;
                // mid는 증가시키지 않음: 교환된 값을 다시 확인해야 함
            }
        }
    }

    private static void swap(int[] a, int i, int j) {
        int t = a[i]; a[i] = a[j]; a[j] = t;
    }

    public static void main(String[] args) {
        int[] a1 = {2,0,2,1,1,0};
        sortColors(a1);
        assert Arrays.equals(a1, new int[]{0,0,1,1,2,2});

        int[] a2 = {2,0,1};
        sortColors(a2);
        assert Arrays.equals(a2, new int[]{0,1,2});

        int[] a3 = {0};
        sortColors(a3);
        assert Arrays.equals(a3, new int[]{0});
        System.out.println("✓ 모든 테스트 통과!");
    }
}
