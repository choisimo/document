/**
 * 문제 047: 단어 찾기 (Word Search)
 *
 * [문제] 2D 문자 격자에서 상하좌우로 인접한 셀을 이용하여
 * 주어진 단어를 찾을 수 있는지 판별하라.
 *
 * [아키텍트의 시선]
 * 그리드 탐색 + 백트래킹은 네트워크 토폴로지에서 경로 탐색,
 * 맵 기반 서비스의 경로 검증, 2D 공간 인덱스에서의 패턴 매칭과 동일하다.
 * 방문 마킹/해제는 분산 락의 acquire/release와 같다.
 *
 * [시간 복잡도] O(m * n * 4^L) L=단어길이 [공간 복잡도] O(L) 재귀 스택
 */
public class P047WordSearch {
    public static boolean exist(char[][] board, String word) {
        int m = board.length, n = board[0].length;
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (dfs(board, word, i, j, 0)) return true;
            }
        }
        return false;
    }

    private static boolean dfs(char[][] board, String word, int i, int j, int idx) {
        if (idx == word.length()) return true;
        if (i < 0 || i >= board.length || j < 0 || j >= board[0].length) return false;
        if (board[i][j] != word.charAt(idx)) return false;

        char temp = board[i][j];
        board[i][j] = '#'; // 방문 마킹 (제자리)
        boolean found = dfs(board, word, i+1, j, idx+1) ||
                         dfs(board, word, i-1, j, idx+1) ||
                         dfs(board, word, i, j+1, idx+1) ||
                         dfs(board, word, i, j-1, idx+1);
        board[i][j] = temp; // 방문 해제
        return found;
    }

    public static void main(String[] args) {
        char[][] board = {
            {'A','B','C','E'},
            {'S','F','C','S'},
            {'A','D','E','E'}
        };
        assert exist(board, "ABCCED");
        assert exist(board, "SEE");
        assert !exist(board, "ABCB");
        System.out.println("✓ 모든 테스트 통과!");
    }
}
