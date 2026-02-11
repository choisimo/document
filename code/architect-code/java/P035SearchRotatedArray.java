/**
 * 문제 035: 회전 정렬 배열 탐색 (Search in Rotated Sorted Array)
 *
 * [문제] 회전된 정렬 배열에서 타겟 값을 O(log n)에 찾아라.
 *
 * [아키텍트의 시선]
 * 부분적으로 정렬된 데이터에서의 이진 탐색은
 * 장애 복구 후 부분 일관성 상태의 데이터베이스 검색,
 * 링 버퍼에서의 탐색과 동일한 패턴이다.
 * "어느 쪽이 정렬되어 있는지"를 판별하는 것이 핵심이다.
 *
 * [시간 복잡도] O(log n) [공간 복잡도] O(1)
 */
public class P035SearchRotatedArray {
    public static int search(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) return mid;

            // 왼쪽 절반이 정렬된 상태인지 확인
            if (nums[left] <= nums[mid]) {
                if (nums[left] <= target && target < nums[mid]) {
                    right = mid - 1;
                } else {
                    left = mid + 1;
                }
            } else {
                // 오른쪽 절반이 정렬된 상태
                if (nums[mid] < target && target <= nums[right]) {
                    left = mid + 1;
                } else {
                    right = mid - 1;
                }
            }
        }
        return -1;
    }

    public static void main(String[] args) {
        assert search(new int[]{4,5,6,7,0,1,2}, 0) == 4;
        assert search(new int[]{4,5,6,7,0,1,2}, 3) == -1;
        assert search(new int[]{1}, 0) == -1;
        assert search(new int[]{1}, 1) == 0;
        assert search(new int[]{3,1}, 1) == 1;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
