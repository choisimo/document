"""
문제 095: 허프만 코딩 (Huffman Coding)
[문제] 문자 빈도에 따라 허프만 트리를 구성하고 인코딩/디코딩하라.
[아키텍트의 시선] 데이터 압축과 탐욕 인코딩.
빈도 낮은 것부터 합치기 → 최적 접두사 코드 생성.
탐욕: 매 단계에서 가장 빈도 낮은 두 노드 합치기 → 전체 최적.
실무: gzip, JPEG, MP3의 기반, 네트워크 대역폭 최적화.
[시간 복잡도] O(n log n) [공간 복잡도] O(n)
"""
from typing import Dict, Optional
import heapq
from collections import Counter

class HuffmanNode:
    def __init__(self, char=None, freq=0, left=None, right=None):
        self.char = char
        self.freq = freq
        self.left = left
        self.right = right

    def __lt__(self, other):
        return self.freq < other.freq

def build_huffman_tree(text: str) -> Optional[HuffmanNode]:
    freq = Counter(text)
    if len(freq) == 0:
        return None
    if len(freq) == 1:
        char, f = next(iter(freq.items()))
        return HuffmanNode(freq=f, left=HuffmanNode(char=char, freq=f))
    heap = [HuffmanNode(char=ch, freq=f) for ch, f in freq.items()]
    heapq.heapify(heap)
    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        merged = HuffmanNode(freq=left.freq + right.freq, left=left, right=right)
        heapq.heappush(heap, merged)
    return heap[0]

def build_codes(root: Optional[HuffmanNode]) -> Dict[str, str]:
    codes = {}
    def dfs(node, code):
        if not node:
            return
        if node.char is not None:
            codes[node.char] = code if code else "0"
            return
        dfs(node.left, code + "0")
        dfs(node.right, code + "1")
    dfs(root, "")
    return codes

def huffman_encode(text: str) -> tuple:
    tree = build_huffman_tree(text)
    codes = build_codes(tree)
    encoded = "".join(codes[ch] for ch in text)
    return encoded, tree, codes

def huffman_decode(encoded: str, tree: HuffmanNode) -> str:
    if not tree:
        return ""
    result = []
    node = tree
    for bit in encoded:
        node = node.left if bit == "0" else node.right
        if node.char is not None:
            result.append(node.char)
            node = tree
    return "".join(result)

if __name__ == "__main__":
    text = "hello world"
    encoded, tree, codes = huffman_encode(text)
    decoded = huffman_decode(encoded, tree)
    assert decoded == text
    # 압축 효과: 인코딩된 비트 수 < 원본 * 8
    assert len(encoded) < len(text) * 8
    # 단일 문자
    e2, t2, c2 = huffman_encode("aaaa")
    assert huffman_decode(e2, t2) == "aaaa"
    print("\u2713 \ubaa8\ub4e0 \ud14c\uc2a4\ud2b8 \ud1b5\uacfc!")
