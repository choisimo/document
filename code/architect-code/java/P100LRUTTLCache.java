/**
 * 문제 100: LRU + TTL 캐시 시스템 (LRU Cache with TTL)
 *
 * [문제] LRU 캐시에 TTL(만료 시간)을 추가한 캐시를 설계하라.
 *        get(key): 만료 안 된 값 반환, 만료면 삭제 후 -1.
 *        put(key, value, ttl): TTL 밀리초 동안 유효한 캐시 저장.
 *
 * [아키텍트의 시선]
 * 실무 시스템 설계 종합.
 * LRU(최근 사용 순서) + TTL(시간 기반 만료) = Redis의 핵심 동작.
 * LinkedHashMap + 시간 추적. 실무에서 가장 많이 사용되는 캐시 전략.
 * 실무: Redis, Memcached, CDN 캐시, 세션 관리, DNS 캐시.
 *
 * [시간 복잡도] O(1) per operation [공간 복잡도] O(capacity)
 */
import java.util.*;

public class P100LRUTTLCache {
    private final int capacity;
    private final LinkedHashMap<String, long[]> cache; // key -> {value, expireTimeMs}

    public P100LRUTTLCache(int capacity) {
        this.capacity = capacity;
        this.cache = new LinkedHashMap<>(capacity, 0.75f, true); // accessOrder=true
    }

    public int get(String key) {
        if (!cache.containsKey(key)) return -1;
        long[] entry = cache.get(key);
        if (System.currentTimeMillis() > entry[1]) {
            cache.remove(key);
            return -1;
        }
        return (int) entry[0];
    }

    public void put(String key, int value, long ttlMs) {
        if (cache.containsKey(key)) {
            cache.remove(key);
        } else if (cache.size() >= capacity) {
            // LRU 제거 (가장 오래 안 쓴 항목 = 첫 번째)
            String eldest = cache.keySet().iterator().next();
            cache.remove(eldest);
        }
        cache.put(key, new long[]{value, System.currentTimeMillis() + ttlMs});
    }

    public int size() { return cache.size(); }

    public static void main(String[] args) throws InterruptedException {
        P100LRUTTLCache c = new P100LRUTTLCache(3);
        c.put("a", 1, 10000);
        c.put("b", 2, 10000);
        c.put("c", 3, 10000);
        assert c.get("a") == 1;
        assert c.size() == 3;
        // 용량 초과 -> LRU(b) 제거
        c.put("d", 4, 10000);
        assert c.get("b") == -1;
        assert c.get("d") == 4;
        assert c.size() == 3;
        // TTL 만료 테스트
        P100LRUTTLCache c2 = new P100LRUTTLCache(2);
        c2.put("x", 10, 100); // 100ms 후 만료
        assert c2.get("x") == 10;
        Thread.sleep(150);
        assert c2.get("x") == -1; // 만료됨
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
