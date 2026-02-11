/**
 * 문제 003: 중복 제거 (Remove Duplicates from Sorted Array)
 * [문제] 정렬된 배열에서 중복을 in-place로 제거하고 유니크 원소 수를 반환하라.
 * [아키텍트의 시선] 투 포인터 기반 스트림 필터링.
 * slow/fast 포인터로 유니크 원소만 앞쪽에 모은다.
 * 실무: 데이터 파이프라인의 중복 제거, 스트림 처리.
 * [시간 복잡도] O(n) [공간 복잡도] O(1)
 */
public class P003RemoveDuplicates {
    public static int removeDuplicates(int[] nums) {
        if (nums.length == 0) return 0;
        int slow = 0;
        for (int fast = 1; fast < nums.length; fast++) {
            if (nums[fast] != nums[slow]) {
                slow++;
                nums[slow] = nums[fast];
            }
        }
        return slow + 1;
    }

    public static void main(String[] args) {
        int[] a = {1, 1, 2};
        assert removeDuplicates(a) == 2;
        int[] b = {0, 0, 1, 1, 1, 2, 2, 3, 3, 4};
        assert removeDuplicates(b) == 5;
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
