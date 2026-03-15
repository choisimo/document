/**
 * 문제 027: 과반수 원소 (Majority Element)
 *
 * [문제] 배열에서 n/2번 초과 등장하는 원소를 찾아라.
 * Boyer-Moore 투표 알고리즘을 사용하라.
 *
 * [아키텍트의 시선]
 * Boyer-Moore 투표는 스트리밍 데이터에서 O(1) 공간으로 빈도 분석하는 핵심이다.
 * 분산 시스템의 쿼럼(Quorum) 합의, 리더 선출 프로토콜(Raft/Paxos)에서
 * 과반수 결정과 동일한 원리다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(1)
 */
public class P027MajorityElement {
    public static int majorityElement(int[] nums) {
        int candidate = 0, count = 0;
        // Phase 1: 후보 선정 (상쇄 원리)
        for (int num : nums) {
            if (count == 0) candidate = num;
            count += (num == candidate) ? 1 : -1;
        }
        // Phase 2: 검증 (문제에서 과반수 보장이므로 생략 가능)
        return candidate;
    }

    public static void main(String[] args) {
        assert majorityElement(new int[]{3, 2, 3}) == 3;
        assert majorityElement(new int[]{2, 2, 1, 1, 1, 2, 2}) == 2;
        assert majorityElement(new int[]{1}) == 1;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
