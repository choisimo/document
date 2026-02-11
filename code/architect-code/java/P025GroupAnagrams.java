/**
 * 문제 025: 애너그램 그룹화 (Group Anagrams)
 *
 * [문제] 문자열 배열에서 애너그램끼리 그룹화하라.
 *
 * [아키텍트의 시선]
 * 정규화(Canonicalization) 후 해시 그룹화는 데이터 중복 제거,
 * 콘텐츠 기반 라우팅, 인덱스 구축의 핵심 패턴이다.
 * "동일성의 기준을 정의"하는 것이 아키텍처의 시작이다.
 *
 * [시간 복잡도] O(n * k log k) k=문자열 최대 길이 [공간 복잡도] O(n * k)
 */
import java.util.*;

public class P025GroupAnagrams {
    public static List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String s : strs) {
            char[] chars = s.toCharArray();
            Arrays.sort(chars);
            String key = new String(chars); // 정렬된 문자열 = 정규화 키
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
        }
        return new ArrayList<>(groups.values());
    }

    public static void main(String[] args) {
        List<List<String>> result = groupAnagrams(
            new String[]{"eat", "tea", "tan", "ate", "nat", "bat"});
        assert result.size() == 3;

        // 각 그룹 내용 확인
        Set<Set<String>> groups = new HashSet<>();
        for (List<String> g : result) groups.add(new HashSet<>(g));
        assert groups.contains(new HashSet<>(Arrays.asList("eat", "tea", "ate")));
        assert groups.contains(new HashSet<>(Arrays.asList("tan", "nat")));
        assert groups.contains(new HashSet<>(Arrays.asList("bat")));

        System.out.println("✓ 모든 테스트 통과!");
    }
}
