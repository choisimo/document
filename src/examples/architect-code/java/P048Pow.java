/**
 * 문제 048: 거듭제곱 (Pow(x, n))
 *
 * [문제] x의 n제곱을 계산하라. 분할 정복으로 O(log n)에 해결.
 *
 * [아키텍트의 시선]
 * 반복 제곱법(Exponentiation by Squaring)은 암호학의 모듈러 거듭제곱,
 * 행렬 거듭제곱을 이용한 피보나치 계산, 그래프의 k-hop 도달성 분석에
 * 직접 활용된다. O(n) → O(log n) 최적화의 전형이다.
 *
 * [시간 복잡도] O(log n) [공간 복잡도] O(1)
 */
public class P048Pow {
    public static double myPow(double x, int n) {
        long N = n; // int 오버플로우 방지
        if (N < 0) {
            x = 1 / x;
            N = -N;
        }
        double result = 1.0;
        double current = x;
        while (N > 0) {
            if ((N & 1) == 1) result *= current; // 홀수면 곱하기
            current *= current; // 제곱
            N >>= 1;
        }
        return result;
    }

    public static void main(String[] args) {
        assert Math.abs(myPow(2.0, 10) - 1024.0) < 1e-9;
        assert Math.abs(myPow(2.1, 3) - 9.261) < 1e-3;
        assert Math.abs(myPow(2.0, -2) - 0.25) < 1e-9;
        assert Math.abs(myPow(1.0, Integer.MIN_VALUE) - 1.0) < 1e-9;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
