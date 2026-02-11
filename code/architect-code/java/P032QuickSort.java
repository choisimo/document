/**
 * 문제 032: 퀵 정렬 (Quick Sort)
 *
 * [문제] 퀵 정렬을 구현하라. 피벗 선택과 파티셔닝의 원리를 이해하라.
 *
 * [아키텍트의 시선]
 * 퀵 정렬의 파티셔닝은 로드 밸런서의 트래픽 분배와 동일하다.
 * 피벗 선택의 품질이 성능을 결정하듯, 파티션 키의 선택이
 * 분산 데이터베이스의 핫스팟 방지에 핵심이다.
 *
 * [시간 복잡도] 평균 O(n log n), 최악 O(n^2) [공간 복잡도] O(log n) 스택
 */
import java.util.Arrays;

public class P032QuickSort {
    public static void quickSort(int[] arr, int low, int high) {
        if (low >= high) return;
        int pivotIdx = partition(arr, low, high);
        quickSort(arr, low, pivotIdx - 1);
        quickSort(arr, pivotIdx + 1, high);
    }

    private static int partition(int[] arr, int low, int high) {
        // 중간값 피벗 전략 (최악 O(n^2) 완화)
        int mid = low + (high - low) / 2;
        if (arr[mid] < arr[low]) swap(arr, low, mid);
        if (arr[high] < arr[low]) swap(arr, low, high);
        if (arr[mid] < arr[high]) swap(arr, mid, high);
        int pivot = arr[high];

        int i = low - 1;
        for (int j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;
                swap(arr, i, j);
            }
        }
        swap(arr, i + 1, high);
        return i + 1;
    }

    private static void swap(int[] arr, int i, int j) {
        int tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }

    public static void main(String[] args) {
        int[] a1 = {5, 3, 8, 1, 2};
        quickSort(a1, 0, a1.length - 1);
        assert Arrays.equals(a1, new int[]{1, 2, 3, 5, 8});

        int[] a2 = {3, 1, 4, 1, 5, 9, 2, 6};
        quickSort(a2, 0, a2.length - 1);
        assert Arrays.equals(a2, new int[]{1, 1, 2, 3, 4, 5, 6, 9});

        int[] a3 = {};
        quickSort(a3, 0, -1);
        assert Arrays.equals(a3, new int[]{});
        System.out.println("✓ 모든 테스트 통과!");
    }
}
