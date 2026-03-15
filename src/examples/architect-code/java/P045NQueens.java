/**
 * 문제 045: N-Queens
 *
 * [문제] N x N 체스판에 N개의 퀸을 서로 공격하지 않도록 배치하는
 * 모든 해를 찾아라.
 *
 * [아키텍트의 시선]
 * N-Queens는 제약 만족 문제(CSP)의 대표 사례다.
 * 리소스 할당에서 충돌 회피(포트 할당, IP 충돌 방지, 스레드 교착 회피)와
 * 동일한 구조다. 백트래킹 + 가지치기 = 제약 전파(Constraint Propagation).
 *
 * [시간 복잡도] O(n!) [공간 복잡도] O(n)
 */
import java.util.*;

public class P045NQueens {
    public static List<List<String>> solveNQueens(int n) {
        List<List<String>> result = new ArrayList<>();
        int[] queens = new int[n]; // queens[row] = col
        Arrays.fill(queens, -1);
        Set<Integer> cols = new HashSet<>();
        Set<Integer> diag1 = new HashSet<>(); // row - col
        Set<Integer> diag2 = new HashSet<>(); // row + col
        backtrack(n, 0, queens, cols, diag1, diag2, result);
        return result;
    }

    private static void backtrack(int n, int row, int[] queens,
            Set<Integer> cols, Set<Integer> diag1, Set<Integer> diag2,
            List<List<String>> result) {
        if (row == n) {
            result.add(buildBoard(queens, n));
            return;
        }
        for (int col = 0; col < n; col++) {
            if (cols.contains(col) || diag1.contains(row - col) || diag2.contains(row + col))
                continue;
            queens[row] = col;
            cols.add(col); diag1.add(row - col); diag2.add(row + col);
            backtrack(n, row + 1, queens, cols, diag1, diag2, result);
            cols.remove(col); diag1.remove(row - col); diag2.remove(row + col);
        }
    }

    private static List<String> buildBoard(int[] queens, int n) {
        List<String> board = new ArrayList<>();
        for (int row = 0; row < n; row++) {
            char[] line = new char[n];
            Arrays.fill(line, '.');
            line[queens[row]] = 'Q';
            board.add(new String(line));
        }
        return board;
    }

    public static void main(String[] args) {
        assert solveNQueens(4).size() == 2;
        assert solveNQueens(1).size() == 1;
        assert solveNQueens(8).size() == 92;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
