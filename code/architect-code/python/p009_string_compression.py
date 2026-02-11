"""
==========================================================
문제 009: 문자열 압축 (String Compression / Run-Length Encoding)
==========================================================

[문제 설명]
문자 배열을 Run-Length Encoding으로 in-place 압축.
연속 반복 문자를 [문자][횟수]로 변환. 횟수가 1이면 숫자 생략.

[아키텍트의 시선 - 데이터 직렬화(Serialization) 패턴]
RLE는 가장 단순한 직렬화 프로토콜.
실무: Protocol Buffers, MessagePack 등 직렬화 형식의 기초.
핵심: 읽기 포인터와 쓰기 포인터의 분리 + 상태 누적.

[시간 복잡도] O(n) [공간 복잡도] O(1)
"""

from typing import List


def compress(chars: List[str]) -> int:
    write = 0
    read = 0
    n = len(chars)

    while read < n:
        current_char = chars[read]
        count = 0

        while read < n and chars[read] == current_char:
            read += 1
            count += 1

        chars[write] = current_char
        write += 1

        if count > 1:
            for digit in str(count):
                chars[write] = digit
                write += 1

    return write


if __name__ == "__main__":
    c1 = ["a", "a", "b", "b", "c", "c", "c"]
    length1 = compress(c1)
    assert length1 == 6 and c1[:length1] == ["a", "2", "b", "2", "c", "3"]

    c2 = ["a"]
    length2 = compress(c2)
    assert length2 == 1 and c2[:length2] == ["a"]

    c3 = ["a", "b", "b", "b", "b", "b", "b", "b", "b", "b", "b", "b", "b"]
    length3 = compress(c3)
    assert length3 == 4 and c3[:length3] == ["a", "b", "1", "2"]

    print("✓ 모든 테스트 통과!")
