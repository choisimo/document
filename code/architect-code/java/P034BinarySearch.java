/**
 * 문제 034: 이진 탐색 (Binary Search)
 *
 * [문제] 정렬된 배열에서 타겟 값의 인덱스를 찾아라. 없으면 -1 반환.
 *
 * [아키텍트의 시선]
 * 이진 탐색은 모든 "정렬된 탐색 공간"에 적용되는 보편적 패턴이다.
 * 데이터베이스 B-Tree 인덱스, DNS 조회, 로그 기반 타임스탬프 검색 등
 * O(log n) 조회를 가능케 하는 근본 원리다.
 *
 * [시간 복잡도] O(log n) [공간 복잡도] O(1)
 */
public class P034BinarySearch {
    public static int binarySearch(int[] nums, int target) {
        int left = 0, right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2; // 오버플로우 방지
            if (nums[mid] == target) return mid;
            else if (nums[mid] < target) left = mid + 1;
            else right = mid - 1;
        }
        return -1;
    }

    // 하한 탐색: target 이상인 첫 번째 위치
    public static int lowerBound(int[] nums, int target) {
        int left = 0, right = nums.length;
        while (left < right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] < target) left = mid + 1;
            else right = mid;
        }
        return left;
    }

    public static void main(String[] args) {
        assert binarySearch(new int[]{-1,0,3,5,9,12}, 9) == 4;
        assert binarySearch(new int[]{-1,0,3,5,9,12}, 2) == -1;
        assert binarySearch(new int[]{5}, 5) == 0;
        assert lowerBound(new int[]{1,2,4,4,5}, 4) == 2;
        assert lowerBound(new int[]{1,2,4,4,5}, 3) == 2;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
