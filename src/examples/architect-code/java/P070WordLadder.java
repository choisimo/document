/**
 * 문제 070: 단어 사다리 (Word Ladder)
 *
 * [문제] 한 번에 한 글자만 바꿔서 beginWord에서 endWord까지의 최단 변환 길이를 구하라.
 * 모든 중간 단어는 wordList에 있어야 한다.
 *
 * [아키텍트의 시선]
 * 단어 사다리는 상태 공간 탐색의 전형이다.
 * 설정 변경의 최소 단계 수, 데이터베이스 마이그레이션 경로,
 * API 버전 업그레이드의 최소 변경 경로와 동일한 패턴이다.
 * BFS = 최단 경로 보장.
 *
 * [시간 복잡도] O(M^2 * N) M=단어길이, N=단어수 [공간 복잡도] O(M * N)
 */
import java.util.*;

public class P070WordLadder {
    public static int ladderLength(String beginWord, String endWord, List<String> wordList) {
        Set<String> wordSet = new HashSet<>(wordList);
        if (!wordSet.contains(endWord)) return 0;

        Queue<String> queue = new LinkedList<>();
        queue.offer(beginWord);
        Set<String> visited = new HashSet<>();
        visited.add(beginWord);
        int level = 1;

        while (!queue.isEmpty()) {
            int size = queue.size();
            for (int i = 0; i < size; i++) {
                String word = queue.poll();
                char[] chars = word.toCharArray();
                for (int j = 0; j < chars.length; j++) {
                    char original = chars[j];
                    for (char c = 'a'; c <= 'z'; c++) {
                        if (c == original) continue;
                        chars[j] = c;
                        String newWord = new String(chars);
                        if (newWord.equals(endWord)) return level + 1;
                        if (wordSet.contains(newWord) && !visited.contains(newWord)) {
                            visited.add(newWord);
                            queue.offer(newWord);
                        }
                    }
                    chars[j] = original;
                }
            }
            level++;
        }
        return 0;
    }

    public static void main(String[] args) {
        assert ladderLength("hit", "cog",
            Arrays.asList("hot","dot","dog","lot","log","cog")) == 5;
        assert ladderLength("hit", "cog",
            Arrays.asList("hot","dot","dog","lot","log")) == 0;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
