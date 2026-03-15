"""
==========================================================
문제 018: 일일 온도 (Daily Temperatures)
==========================================================

[문제 설명]
일일 온도 배열이 주어질 때, 각 날짜에 대해
더 따뜻한 날이 오기까지 며칠을 기다려야 하는지 구하라.

[아키텍트의 시선 - 모노토닉 스택과 이벤트 기반 처리]
모노토닉(단조) 스택: 스택에 "아직 답을 찾지 못한 인덱스"를 유지.
새 값이 들어올 때 이전 미해결 문제들을 한꺼번에 해결.
실무: 주가 분석(다음 큰 값), 이벤트 큐 처리, 모니터링 알림.

[시간 복잡도] O(n) [공간 복잡도] O(n)
"""
from typing import List


def daily_temperatures(temperatures: List[int]) -> List[int]:
    n = len(temperatures)
    result = [0] * n
    stack = []  # 모노토닉 스택: 인덱스 저장 (온도 내림차순 유지)

    for i, temp in enumerate(temperatures):
        while stack and temperatures[stack[-1]] < temp:
            prev_idx = stack.pop()
            result[prev_idx] = i - prev_idx
        stack.append(i)

    return result


if __name__ == "__main__":
    assert daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]) == [1, 1, 4, 2, 1, 1, 0, 0]
    assert daily_temperatures([30, 40, 50, 60]) == [1, 1, 1, 0]
    assert daily_temperatures([30, 60, 90]) == [1, 1, 0]

    print("✓ 모든 테스트 통과!")
