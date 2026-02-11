/**
 * 문제 091: 트라이 (Trie / Prefix Tree)
 *
 * [문제] insert, search, startsWith를 지원하는 트라이를 구현하라.
 *
 * [아키텍트의 시선]
 * 검색 엔진과 자동 완성.
 * 각 노드가 문자 하나를 담는 트리. 접두사 공유로 메모리 절약.
 * O(m) 검색/삽입 (m=문자열 길이) — 해시맵보다 접두사 검색에 유리.
 * 실무: 자동 완성, IP 라우팅(CIDR), 맞춤법 검사, DNA 서열 검색.
 *
 * [시간 복잡도] O(m) per operation [공간 복잡도] O(SIGMA * m * n)
 */
import java.util.*;

public class P091Trie {
    static class TrieNode {
        Map<Character, TrieNode> children = new TreeMap<>();
        boolean isEnd = false;
    }

    private TrieNode root = new TrieNode();

    public void insert(String word) {
        TrieNode node = root;
        for (char ch : word.toCharArray()) {
            node.children.putIfAbsent(ch, new TrieNode());
            node = node.children.get(ch);
        }
        node.isEnd = true;
    }

    public boolean search(String word) {
        TrieNode node = findNode(word);
        return node != null && node.isEnd;
    }

    public boolean startsWith(String prefix) {
        return findNode(prefix) != null;
    }

    private TrieNode findNode(String prefix) {
        TrieNode node = root;
        for (char ch : prefix.toCharArray()) {
            if (!node.children.containsKey(ch)) return null;
            node = node.children.get(ch);
        }
        return node;
    }

    // 자동 완성: prefix로 시작하는 단어들 반환
    public List<String> autocomplete(String prefix, int limit) {
        TrieNode node = findNode(prefix);
        if (node == null) return new ArrayList<>();
        List<String> results = new ArrayList<>();
        dfs(node, new StringBuilder(prefix), results, limit);
        return results;
    }
    private void dfs(TrieNode node, StringBuilder path, List<String> results, int limit) {
        if (results.size() >= limit) return;
        if (node.isEnd) results.add(path.toString());
        for (Map.Entry<Character, TrieNode> e : node.children.entrySet()) {
            path.append(e.getKey());
            dfs(e.getValue(), path, results, limit);
            path.deleteCharAt(path.length() - 1);
        }
    }

    public static void main(String[] args) {
        P091Trie t = new P091Trie();
        t.insert("apple");
        t.insert("app");
        t.insert("application");
        t.insert("banana");
        assert t.search("apple") == true;
        assert t.search("app") == true;
        assert t.search("ap") == false;
        assert t.startsWith("ap") == true;
        assert t.startsWith("ban") == true;
        assert t.startsWith("cat") == false;
        List<String> ac = t.autocomplete("app", 5);
        assert ac.equals(Arrays.asList("app", "apple", "application"));
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
