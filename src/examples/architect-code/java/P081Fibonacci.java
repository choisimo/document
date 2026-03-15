/**
 * 문제 081: 피보나치 최적화 (Fibonacci Optimization)
 *
 * [문제] n번째 피보나치 수를 O(log n)에 구하라. 재귀/반복/행렬 거듭제곱 비교.
 *
 * [아키텍트의 시선]
 * Top-down vs Bottom-up vs 행렬 거듭제곱.
 * 재귀+메모이제이션(Top-down): 호출 스택 O(n), 직관적.
 * 반복(Bottom-up): 공간 O(1), 실용적.
 * 행렬 거듭제곱: O(log n), 이론적 최적 → 대규모 n에 필수.
 * 실무: 분할 정복의 본질, 상태 전이의 행렬 표현.
 *
 * [시간 복잡도] O(log n) 행렬 / O(n) 반복 [공간 복잡도] O(1)
 */
import java.util.*;

public class P081Fibonacci {
    // --- Top-down 메모이제이션 ---
    public static long fibRecursive(int n, Map<Integer,Long> memo) {
        if (n <= 1) return n;
        if (memo.containsKey(n)) return memo.get(n);
        long val = fibRecursive(n - 1, memo) + fibRecursive(n - 2, memo);
        memo.put(n, val);
        return val;
    }

    // --- Bottom-up O(1) 공간 ---
    public static long fibIterative(int n) {
        if (n <= 1) return n;
        long a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            long tmp = a + b;
            a = b;
            b = tmp;
        }
        return b;
    }

    // --- 행렬 거듭제곱 O(log n) ---
    static long[][] matMult(long[][] A, long[][] B) {
        return new long[][] {
            {A[0][0]*B[0][0] + A[0][1]*B[1][0], A[0][0]*B[0][1] + A[0][1]*B[1][1]},
            {A[1][0]*B[0][0] + A[1][1]*B[1][0], A[1][0]*B[0][1] + A[1][1]*B[1][1]}
        };
    }
    static long[][] matPow(long[][] M, int p) {
        long[][] result = {{1,0},{0,1}}; // 단위 행렬
        while (p > 0) {
            if ((p & 1) == 1) result = matMult(result, M);
            M = matMult(M, M);
            p >>= 1;
        }
        return result;
    }
    public static long fibMatrix(int n) {
        if (n <= 1) return n;
        long[][] M = {{1,1},{1,0}};
        long[][] result = matPow(M, n - 1);
        return result[0][0];
    }

    public static void main(String[] args) {
        int[][] tests = {{0,0},{1,1},{2,1},{5,5},{10,55},{20,6765}};
        for (int[] t : tests) {
            assert fibRecursive(t[0], new HashMap<>()) == t[1];
            assert fibIterative(t[0]) == t[1];
            assert fibMatrix(t[0]) == t[1];
        }
        assert fibMatrix(50) == 12586269025L;
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
