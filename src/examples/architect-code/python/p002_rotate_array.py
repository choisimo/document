"""
==========================================================
문제 002: 배열 회전 (Rotate Array)
==========================================================

[문제 설명]
정수 배열 nums를 오른쪽으로 k번 회전하라. (in-place, O(1) 추가 공간)

[아키텍트의 시선 - in-place 알고리즘과 메모리 효율성]
"3회 반전(Three Reversals)" 기법은 추가 배열 없이 순환 이동을 구현한다.
실무에서 메모리 제약이 있는 임베디드/스트리밍 시스템에서 핵심적인 사고방식.
핵심: 전체 반전 → 앞부분 반전 → 뒷부분 반전

[시간 복잡도] O(n)
[공간 복잡도] O(1) - in-place
"""

from typing import List


def rotate(nums: List[int], k: int) -> None:
    n = len(nums)
    k %= n  # k가 배열 길이보다 클 수 있음

    def reverse(start: int, end: int) -> None:
        while start < end:
            nums[start], nums[end] = nums[end], nums[start]
            start += 1
            end -= 1

    # 3회 반전: [1,2,3,4,5,6,7] k=3
    # 1단계 전체 반전: [7,6,5,4,3,2,1]
    reverse(0, n - 1)
    # 2단계 앞 k개 반전: [5,6,7,4,3,2,1]
    reverse(0, k - 1)
    # 3단계 나머지 반전: [5,6,7,1,2,3,4]
    reverse(k, n - 1)


if __name__ == "__main__":
    arr1 = [1, 2, 3, 4, 5, 6, 7]
    rotate(arr1, 3)
    assert arr1 == [5, 6, 7, 1, 2, 3, 4], f"실패: {arr1}"

    arr2 = [-1, -100, 3, 99]
    rotate(arr2, 2)
    assert arr2 == [3, 99, -1, -100], f"실패: {arr2}"

    arr3 = [1, 2]
    rotate(arr3, 5)  # k > len
    assert arr3 == [2, 1], f"실패: {arr3}"

    print("✓ 모든 테스트 통과!")
