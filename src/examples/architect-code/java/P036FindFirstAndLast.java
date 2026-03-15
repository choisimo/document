/**
 * 문제 036: 정렬 배열에서 첫/마지막 위치 (Find First and Last Position)
 *
 * [문제] 정렬된 배열에서 타겟의 시작과 끝 인덱스를 찾아라. O(log n).
 *
 * [아키텍트의 시선]
 * 이진 탐색의 변형(좌측/우측 경계 탐색)은
 * 시계열 DB에서 시간 범위 질의, 로그 검색의 시작/끝 타임스탬프 탐색,
 * 페이지네이션의 범위 결정과 동일한 패턴이다.
 *
 * [시간 복잡도] O(log n) [공간 복잡도] O(1)
 */
public class P036FindFirstAndLast {
    public static int[] searchRange(int[] nums, int target) {
        return new int[]{findFirst(nums, target), findLast(nums, target)};
    }

    private static int findFirst(int[] nums, int target) {
        int left = 0, right = nums.length - 1, result = -1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) {
                result = mid;
                right = mid - 1; // 더 왼쪽을 탐색
            } else if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return result;
    }

    private static int findLast(int[] nums, int target) {
        int left = 0, right = nums.length - 1, result = -1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) {
                result = mid;
                left = mid + 1; // 더 오른쪽을 탐색
            } else if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return result;
    }

    public static void main(String[] args) {
        assert java.util.Arrays.equals(searchRange(new int[]{5,7,7,8,8,10}, 8), new int[]{3,4});
        assert java.util.Arrays.equals(searchRange(new int[]{5,7,7,8,8,10}, 6), new int[]{-1,-1});
        assert java.util.Arrays.equals(searchRange(new int[]{}, 0), new int[]{-1,-1});
        System.out.println("✓ 모든 테스트 통과!");
    }
}
