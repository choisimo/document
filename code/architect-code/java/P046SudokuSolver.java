/**
 * 문제 046: 스도쿠 풀기 (Sudoku Solver)
 *
 * [문제] 9x9 스도쿠 퍼즐을 풀어라. 빈 칸은 '.'으로 표시.
 *
 * [아키텍트의 시선]
 * 스도쿠는 다중 제약 조건을 동시에 만족시켜야 하는 CSP 문제다.
 * 데이터베이스의 다중 유니크 제약, 스케줄링의 리소스/시간/인력 동시 제약,
 * 네트워크 라우팅의 대역폭/지연시간/비용 제약과 동일한 구조다.
 *
 * [시간 복잡도] O(9^(빈칸수)) 최악, 실제는 가지치기로 빠름 [공간 복잡도] O(81)
 */
public class P046SudokuSolver {
    public static void solveSudoku(char[][] board) {
        solve(board);
    }

    private static boolean solve(char[][] board) {
        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 9; j++) {
                if (board[i][j] != '.') continue;
                for (char c = '1'; c <= '9'; c++) {
                    if (isValid(board, i, j, c)) {
                        board[i][j] = c;
                        if (solve(board)) return true;
                        board[i][j] = '.'; // 되돌림
                    }
                }
                return false; // 1~9 모두 불가 → 백트래킹
            }
        }
        return true; // 모든 칸 채움
    }

    private static boolean isValid(char[][] board, int row, int col, char c) {
        for (int i = 0; i < 9; i++) {
            if (board[row][i] == c) return false; // 행 체크
            if (board[i][col] == c) return false; // 열 체크
            // 3x3 박스 체크
            int boxRow = 3 * (row / 3) + i / 3;
            int boxCol = 3 * (col / 3) + i % 3;
            if (board[boxRow][boxCol] == c) return false;
        }
        return true;
    }

    public static void main(String[] args) {
        char[][] board = {
            {'5','3','.','.','7','.','.','.','.'},
            {'6','.','.','1','9','5','.','.','.'},
            {'.','9','8','.','.','.','.','6','.'},
            {'8','.','.','.','6','.','.','.','3'},
            {'4','.','.','8','.','3','.','.','1'},
            {'7','.','.','.','2','.','.','.','6'},
            {'.','6','.','.','.','.','2','8','.'},
            {'.','.','.','4','1','9','.','.','5'},
            {'.','.','.','.','8','.','.','7','9'}
        };
        solveSudoku(board);
        assert board[0][2] == '4'; // 첫 번째 빈칸 검증
        assert board[8][0] == '3'; // 마지막 행 검증
        // 각 행, 열, 박스의 합이 45인지 검증
        for (int i = 0; i < 9; i++) {
            int rowSum = 0, colSum = 0;
            for (int j = 0; j < 9; j++) {
                rowSum += board[i][j] - '0';
                colSum += board[j][i] - '0';
            }
            assert rowSum == 45;
            assert colSum == 45;
        }
        System.out.println("✓ 모든 테스트 통과!");
    }
}
