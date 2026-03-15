/**
 * 문제 095: 허프만 코딩 (Huffman Coding)
 *
 * [문제] 문자 빈도에 따라 허프만 트리를 구성하고 인코딩/디코딩하라.
 *
 * [아키텍트의 시선]
 * 데이터 압축과 탐욕 인코딩.
 * 빈도 낮은 것부터 합치기 -> 최적 접두사 코드 생성.
 * 탐욕: 매 단계에서 가장 빈도 낮은 두 노드 합치기 -> 전체 최적.
 * 실무: gzip, JPEG, MP3의 기반, 네트워크 대역폭 최적화.
 *
 * [시간 복잡도] O(n log n) [공간 복잡도] O(n)
 */
import java.util.*;

public class P095HuffmanCoding {
    static class HuffmanNode implements Comparable<HuffmanNode> {
        Character ch;
        int freq;
        HuffmanNode left, right;
        HuffmanNode(Character ch, int freq) { this.ch = ch; this.freq = freq; }
        HuffmanNode(int freq, HuffmanNode left, HuffmanNode right) {
            this.freq = freq; this.left = left; this.right = right;
        }
        public int compareTo(HuffmanNode o) { return this.freq - o.freq; }
    }

    public static HuffmanNode buildTree(String text) {
        Map<Character, Integer> freq = new HashMap<>();
        for (char c : text.toCharArray()) freq.merge(c, 1, Integer::sum);
        if (freq.size() == 0) return null;
        if (freq.size() == 1) {
            Map.Entry<Character, Integer> e = freq.entrySet().iterator().next();
            return new HuffmanNode(e.getValue(),
                new HuffmanNode(e.getKey(), e.getValue()), null);
        }
        PriorityQueue<HuffmanNode> pq = new PriorityQueue<>();
        for (Map.Entry<Character, Integer> e : freq.entrySet()) {
            pq.offer(new HuffmanNode(e.getKey(), e.getValue()));
        }
        while (pq.size() > 1) {
            HuffmanNode left = pq.poll(), right = pq.poll();
            pq.offer(new HuffmanNode(left.freq + right.freq, left, right));
        }
        return pq.poll();
    }

    public static Map<Character, String> buildCodes(HuffmanNode root) {
        Map<Character, String> codes = new HashMap<>();
        if (root != null) dfs(root, "", codes);
        return codes;
    }
    private static void dfs(HuffmanNode node, String code, Map<Character, String> codes) {
        if (node == null) return;
        if (node.ch != null) { codes.put(node.ch, code.isEmpty() ? "0" : code); return; }
        dfs(node.left, code + "0", codes);
        dfs(node.right, code + "1", codes);
    }

    public static String encode(String text, Map<Character, String> codes) {
        StringBuilder sb = new StringBuilder();
        for (char c : text.toCharArray()) sb.append(codes.get(c));
        return sb.toString();
    }

    public static String decode(String encoded, HuffmanNode root) {
        if (root == null) return "";
        StringBuilder sb = new StringBuilder();
        HuffmanNode node = root;
        for (char bit : encoded.toCharArray()) {
            node = (bit == '0') ? node.left : node.right;
            if (node.ch != null) {
                sb.append(node.ch);
                node = root;
            }
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        String text = "hello world";
        HuffmanNode tree = buildTree(text);
        Map<Character, String> codes = buildCodes(tree);
        String encoded = encode(text, codes);
        String decoded = decode(encoded, tree);
        assert decoded.equals(text);
        // 압축 효과: 인코딩된 비트 수 < 원본 * 8
        assert encoded.length() < text.length() * 8;
        // 단일 문자
        HuffmanNode t2 = buildTree("aaaa");
        Map<Character, String> c2 = buildCodes(t2);
        String e2 = encode("aaaa", c2);
        assert decode(e2, t2).equals("aaaa");
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
