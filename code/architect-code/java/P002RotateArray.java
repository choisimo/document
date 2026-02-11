/**
 * 문제 002: 배열 회전 (Rotate Array)
 * [문제] 배열을 오른쪽으로 k칸 회전하라 (in-place).
 * [아키텍트의 시선] 3회 반전(reverse)으로 in-place 회전.
 * 추가 배열 O(n) 대신 reverse 3번으로 O(1) 공간.
 * 실무: 로그 로테이션, 원형 버퍼, 데이터 파이프라인.
 * [시간 복잡도] O(n) [공간 복잡도] O(1)
 */
import java.util.*;

public class P002RotateArray {
    public static void rotate(int[] nums, int k) {
        int n = nums.length;
        k = k % n;
        reverse(nums, 0, n - 1);
        reverse(nums, 0, k - 1);
        reverse(nums, k, n - 1);
    }

    private static void reverse(int[] nums, int start, int end) {
        while (start < end) {
            int temp = nums[start];
            nums[start] = nums[end];
            nums[end] = temp;
            start++;
            end--;
        }
    }

    public static void main(String[] args) {
        int[] a = {1, 2, 3, 4, 5, 6, 7};
        rotate(a, 3);
        assert Arrays.equals(a, new int[]{5, 6, 7, 1, 2, 3, 4});
        int[] b = {-1, -100, 3, 99};
        rotate(b, 2);
        assert Arrays.equals(b, new int[]{3, 99, -1, -100});
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
