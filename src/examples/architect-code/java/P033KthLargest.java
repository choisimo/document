/**
 * 문제 033: K번째로 큰 원소 (Kth Largest Element)
 *
 * [문제] 배열에서 K번째로 큰 원소를 찾아라.
 * QuickSelect 알고리즘으로 평균 O(n)에 해결하라.
 *
 * [아키텍트의 시선]
 * QuickSelect는 전체 정렬 없이 원하는 순위를 찾는 최적화된 방법이다.
 * Top-K 질의는 검색 엔진 순위, 추천 시스템, 모니터링 대시보드의 핵심이다.
 * 불필요한 작업을 건너뛰는 "필요한 만큼만 계산" 원칙의 전형이다.
 *
 * [시간 복잡도] 평균 O(n), 최악 O(n^2) [공간 복잡도] O(1)
 */
import java.util.Random;

public class P033KthLargest {
    private static Random rand = new Random();

    public static int findKthLargest(int[] nums, int k) {
        int target = nums.length - k; // k번째로 큰 = (n-k)번째로 작은
        return quickSelect(nums, 0, nums.length - 1, target);
    }

    private static int quickSelect(int[] nums, int left, int right, int target) {
        if (left == right) return nums[left];
        int pivotIdx = left + rand.nextInt(right - left + 1);
        pivotIdx = partition(nums, left, right, pivotIdx);
        if (pivotIdx == target) return nums[pivotIdx];
        else if (pivotIdx < target) return quickSelect(nums, pivotIdx + 1, right, target);
        else return quickSelect(nums, left, pivotIdx - 1, target);
    }

    private static int partition(int[] nums, int left, int right, int pivotIdx) {
        int pivot = nums[pivotIdx];
        swap(nums, pivotIdx, right);
        int storeIdx = left;
        for (int i = left; i < right; i++) {
            if (nums[i] < pivot) {
                swap(nums, storeIdx, i);
                storeIdx++;
            }
        }
        swap(nums, storeIdx, right);
        return storeIdx;
    }

    private static void swap(int[] a, int i, int j) {
        int t = a[i]; a[i] = a[j]; a[j] = t;
    }

    public static void main(String[] args) {
        assert findKthLargest(new int[]{3,2,1,5,6,4}, 2) == 5;
        assert findKthLargest(new int[]{3,2,3,1,2,4,5,5,6}, 4) == 4;
        assert findKthLargest(new int[]{1}, 1) == 1;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
