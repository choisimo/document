/**
 * 문제 028: 두 배열의 교집합 II (Intersection of Two Arrays II)
 *
 * [문제] 두 배열의 교집합을 구하라. 결과에서 각 원소의 등장 횟수는
 * 두 배열 모두에서의 등장 횟수 중 작은 값만큼이어야 한다.
 *
 * [아키텍트의 시선]
 * 교집합 연산은 데이터베이스 INNER JOIN, API 필터링의 기본이다.
 * 해시맵 기반 구현은 메모리 내 해시 조인과 동일하며,
 * 정렬 기반은 소트-머지 조인에 해당한다.
 *
 * [시간 복잡도] O(n+m) [공간 복잡도] O(min(n,m))
 */
import java.util.*;

public class P028IntersectionOfArrays {
    public static int[] intersect(int[] nums1, int[] nums2) {
        Map<Integer, Integer> countMap = new HashMap<>();
        for (int n : nums1) countMap.merge(n, 1, Integer::sum);

        List<Integer> result = new ArrayList<>();
        for (int n : nums2) {
            if (countMap.getOrDefault(n, 0) > 0) {
                result.add(n);
                countMap.merge(n, -1, Integer::sum);
            }
        }
        return result.stream().mapToInt(i -> i).toArray();
    }

    public static void main(String[] args) {
        int[] r1 = intersect(new int[]{1,2,2,1}, new int[]{2,2});
        Arrays.sort(r1);
        assert Arrays.equals(r1, new int[]{2,2});

        int[] r2 = intersect(new int[]{4,9,5}, new int[]{9,4,9,8,4});
        Arrays.sort(r2);
        assert Arrays.equals(r2, new int[]{4,9});

        assert intersect(new int[]{1}, new int[]{2}).length == 0;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
