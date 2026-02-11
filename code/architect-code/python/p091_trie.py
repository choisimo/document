"""
문제 091: 트라이 (Trie / Prefix Tree)
[문제] insert, search, startsWith를 지원하는 트라이를 구현하라.
[아키텍트의 시선] 검색 엔진과 자동 완성.
각 노드가 문자 하나를 담는 트리. 접두사 공유로 메모리 절약.
O(m) 검색/삽입 (m=문자열 길이) — 해시맵보다 접두사 검색에 유리.
실무: 자동 완성, IP 라우팅(CIDR), 맞춤법 검사, DNA 서열 검색.
[시간 복잡도] O(m) per operation [공간 복잡도] O(SIGMA * m * n)
"""

class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def search(self, word: str) -> bool:
        node = self._find_node(word)
        return node is not None and node.is_end

    def starts_with(self, prefix: str) -> bool:
        return self._find_node(prefix) is not None

    def _find_node(self, prefix: str):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node

    def autocomplete(self, prefix: str, limit: int = 5):
        """자동 완성: prefix로 시작하는 단어들 반환"""
        node = self._find_node(prefix)
        if not node:
            return []
        results = []
        def dfs(n, path):
            if len(results) >= limit:
                return
            if n.is_end:
                results.append(prefix + path)
            for ch in sorted(n.children):
                dfs(n.children[ch], path + ch)
        dfs(node, "")
        return results

if __name__ == "__main__":
    t = Trie()
    t.insert("apple")
    t.insert("app")
    t.insert("application")
    t.insert("banana")
    assert t.search("apple") == True
    assert t.search("app") == True
    assert t.search("ap") == False
    assert t.starts_with("ap") == True
    assert t.starts_with("ban") == True
    assert t.starts_with("cat") == False
    assert t.autocomplete("app") == ["app", "apple", "application"]
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
