"""
문제 070: 단어 사다리 (Word Ladder)
[문제] beginWord에서 endWord로 한 글자씩 바꿔가며 도달하는 최단 변환 횟수를 구하라.
       각 변환 단어는 wordList에 있어야 한다.
[아키텍트의 시선] 암묵적 그래프와 상태 공간 탐색.
단어가 노드, 한 글자 차이 = 간선. 명시적 그래프 구성 없이 BFS.
와일드카드 패턴(h*t → hat, hot, hit)으로 간선 생성 최적화.
실무: DNA 서열 변환, 상태 머신 최단 경로, 구성 변경 최소 단계.
[시간 복잡도] O(M^2 * N) M=단어길이, N=단어수 [공간 복잡도] O(M^2 * N)
"""
from typing import List
from collections import deque, defaultdict

def ladder_length(begin_word: str, end_word: str, word_list: List[str]) -> int:
    """BFS + 와일드카드 패턴"""
    word_set = set(word_list)
    if end_word not in word_set:
        return 0

    # 와일드카드 패턴 → 단어 매핑
    patterns = defaultdict(list)
    for word in word_set:
        for i in range(len(word)):
            pattern = word[:i] + "*" + word[i+1:]
            patterns[pattern].append(word)

    queue = deque([(begin_word, 1)])
    visited = {begin_word}

    while queue:
        word, length = queue.popleft()
        for i in range(len(word)):
            pattern = word[:i] + "*" + word[i+1:]
            for neighbor in patterns[pattern]:
                if neighbor == end_word:
                    return length + 1
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, length + 1))

    return 0

if __name__ == "__main__":
    assert ladder_length("hit", "cog",
        ["hot","dot","dog","lot","log","cog"]) == 5
    assert ladder_length("hit", "cog",
        ["hot","dot","dog","lot","log"]) == 0  # cog 없음
    assert ladder_length("a", "c", ["a","b","c"]) == 2
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
