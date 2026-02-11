/**
 * 문제 031: 병합 정렬 (Merge Sort)
 *
 * [문제] 병합 정렬을 구현하라. 분할 정복의 대표적 정렬 알고리즘.
 *
 * [아키텍트의 시선]
 * 병합 정렬의 분할-정복-결합은 MapReduce의 근본 원리다.
 * 대규모 데이터를 분할하여 병렬 처리 후 결과를 병합하는 패턴은
 * 분산 시스템 아키텍처의 핵심 설계 패턴이다. 안정 정렬 보장.
 *
 * [시간 복잡도] O(n log n) [공간 복잡도] O(n)
 */
import java.util.Arrays;

public class P031MergeSort {
    public static void mergeSort(int[] arr, int left, int right) {
        if (left >= right) return;
        int mid = left + (right - left) / 2;
        mergeSort(arr, left, mid);      // 좌측 정복
        mergeSort(arr, mid + 1, right); // 우측 정복
        merge(arr, left, mid, right);   // 결합
    }

    private static void merge(int[] arr, int left, int mid, int right) {
        int[] temp = new int[right - left + 1];
        int i = left, j = mid + 1, k = 0;
        while (i <= mid && j <= right) {
            if (arr[i] <= arr[j]) temp[k++] = arr[i++];
            else temp[k++] = arr[j++];
        }
        while (i <= mid) temp[k++] = arr[i++];
        while (j <= right) temp[k++] = arr[j++];
        System.arraycopy(temp, 0, arr, left, temp.length);
    }

    public static void main(String[] args) {
        int[] a1 = {5, 3, 8, 1, 2};
        mergeSort(a1, 0, a1.length - 1);
        assert Arrays.equals(a1, new int[]{1, 2, 3, 5, 8});

        int[] a2 = {1};
        mergeSort(a2, 0, 0);
        assert Arrays.equals(a2, new int[]{1});

        int[] a3 = {3, 1, 4, 1, 5, 9, 2, 6};
        mergeSort(a3, 0, a3.length - 1);
        assert Arrays.equals(a3, new int[]{1, 1, 2, 3, 4, 5, 6, 9});
        System.out.println("✓ 모든 테스트 통과!");
    }
}
