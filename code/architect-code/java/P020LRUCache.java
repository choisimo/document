/**
 * 문제 020: LRU 캐시 (LRU Cache)
 *
 * [문제] Least Recently Used 캐시를 구현하라.
 * get(key)과 put(key, value) 모두 O(1)에 동작해야 한다.
 *
 * [아키텍트의 시선]
 * LRU 캐시는 CDN, 데이터베이스 버퍼 풀, CPU 캐시의 핵심 교체 전략이다.
 * HashMap + Doubly Linked List 조합은 O(1) 조회와 O(1) 순서 갱신을 동시에
 * 달성하는 복합 자료구조 설계의 교과서적 사례다.
 *
 * [시간 복잡도] O(1) get/put [공간 복잡도] O(capacity)
 */
import java.util.HashMap;
import java.util.Map;

public class P020LRUCache {
    // 이중 연결 리스트 노드
    static class DNode {
        int key, value;
        DNode prev, next;
        DNode(int key, int value) { this.key = key; this.value = value; }
    }

    private int capacity;
    private Map<Integer, DNode> cache;
    private DNode head, tail; // sentinel 노드

    public P020LRUCache(int capacity) {
        this.capacity = capacity;
        this.cache = new HashMap<>();
        // 센티넬 노드로 경계 조건 제거
        head = new DNode(0, 0);
        tail = new DNode(0, 0);
        head.next = tail;
        tail.prev = head;
    }

    public int get(int key) {
        if (!cache.containsKey(key)) return -1;
        DNode node = cache.get(key);
        moveToHead(node); // 최근 사용으로 갱신
        return node.value;
    }

    public void put(int key, int value) {
        if (cache.containsKey(key)) {
            DNode node = cache.get(key);
            node.value = value;
            moveToHead(node);
        } else {
            DNode newNode = new DNode(key, value);
            cache.put(key, newNode);
            addToHead(newNode);
            if (cache.size() > capacity) {
                // 가장 오래된 노드(tail 직전) 제거
                DNode lru = tail.prev;
                removeNode(lru);
                cache.remove(lru.key);
            }
        }
    }

    private void addToHead(DNode node) {
        node.prev = head;
        node.next = head.next;
        head.next.prev = node;
        head.next = node;
    }

    private void removeNode(DNode node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void moveToHead(DNode node) {
        removeNode(node);
        addToHead(node);
    }

    public static void main(String[] args) {
        P020LRUCache lru = new P020LRUCache(2);
        lru.put(1, 1);
        lru.put(2, 2);
        assert lru.get(1) == 1;      // 1이 최근 사용됨
        lru.put(3, 3);                // 용량 초과 → 2 제거 (LRU)
        assert lru.get(2) == -1;      // 2는 제거됨
        lru.put(4, 4);                // 용량 초과 → 1 제거 (LRU)
        assert lru.get(1) == -1;
        assert lru.get(3) == 3;
        assert lru.get(4) == 4;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
