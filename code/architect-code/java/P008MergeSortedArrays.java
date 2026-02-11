/**
 * 문제 008: 정렬된 배열 합치기 (Merge Sorted Arrays)
 * [문제] 정렬된 배열 nums1(크기 m+n)에 nums2(크기 n)를 병합하라.
 * [아키텍트의 시선] 역방향 포인터로 in-place 병합.
 * 뒤에서부터 채우면 덮어쓰기 충돌 없음.
 * 실무: 외부 정렬, 병합 조인, 스트림 병합.
 * [시간 복잡도] O(m+n) [공간 복잡도] O(1)
 */
import java.util.*;

public class P008MergeSortedArrays {
    public static void merge(int[] nums1, int m, int[] nums2, int n) {
        int i = m - 1, j = n - 1, k = m + n - 1;
        while (j >= 0) {
            if (i >= 0 && nums1[i] > nums2[j]) {
                nums1[k--] = nums1[i--];
            } else {
                nums1[k--] = nums2[j--];
            }
        }
    }

    public static void main(String[] args) {
        int[] a = {1, 2, 3, 0, 0, 0};
        merge(a, 3, new int[]{2, 5, 6}, 3);
        assert Arrays.equals(a, new int[]{1, 2, 2, 3, 5, 6});
        int[] b = {1};
        merge(b, 1, new int[]{}, 0);
        assert Arrays.equals(b, new int[]{1});
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
