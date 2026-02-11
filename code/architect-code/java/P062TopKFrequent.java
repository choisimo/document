/**
 * 문제 062: 가장 빈번한 K개 원소 (Top K Frequent Elements)
 *
 * [문제] 정수 배열에서 가장 자주 등장하는 k개의 원소를 반환하라.
 *
 * [아키텍트의 시선]
 * Top-K 빈도 분석은 검색 엔진의 인기 검색어,
 * 로그 분석의 상위 오류 유형, 트래픽 분석의 핫스팟 감지에 핵심이다.
 * 힙 vs 버킷 정렬 — 시간/공간 트레이드오프를 이해해야 한다.
 *
 * [시간 복잡도] O(n) 버킷 정렬 [공간 복잡도] O(n)
 */
import java.util.*;

public class P062TopKFrequent {
    // 버킷 정렬 방법: O(n)
    @SuppressWarnings("unchecked")
    public static int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int n : nums) count.merge(n, 1, Integer::sum);

        // 빈도를 인덱스로 하는 버킷
        List<Integer>[] buckets = new List[nums.length + 1];
        for (Map.Entry<Integer, Integer> e : count.entrySet()) {
            int freq = e.getValue();
            if (buckets[freq] == null) buckets[freq] = new ArrayList<>();
            buckets[freq].add(e.getKey());
        }

        int[] result = new int[k];
        int idx = 0;
        for (int i = buckets.length - 1; i >= 0 && idx < k; i--) {
            if (buckets[i] != null) {
                for (int num : buckets[i]) {
                    if (idx >= k) break;
                    result[idx++] = num;
                }
            }
        }
        return result;
    }

    public static void main(String[] args) {
        int[] r1 = topKFrequent(new int[]{1,1,1,2,2,3}, 2);
        Arrays.sort(r1);
        assert Arrays.equals(r1, new int[]{1,2});

        int[] r2 = topKFrequent(new int[]{1}, 1);
        assert Arrays.equals(r2, new int[]{1});
        System.out.println("✓ 모든 테스트 통과!");
    }
}
