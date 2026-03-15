/**
 * 문제 038: 제곱근 구현 (Sqrt(x))
 *
 * [문제] 음이 아닌 정수 x의 제곱근의 정수 부분을 반환하라.
 * 내장 함수 없이 이진 탐색으로 구현.
 *
 * [아키텍트의 시선]
 * "답이 단조 증가하는 탐색 공간"에서의 이진 탐색은
 * 시스템 용량 계획, 최적 샤드 수 결정, 타임아웃 값 튜닝 등
 * 수치 최적화 문제의 일반적 해법이다.
 *
 * [시간 복잡도] O(log x) [공간 복잡도] O(1)
 */
public class P038Sqrt {
    public static int mySqrt(int x) {
        if (x < 2) return x;
        long left = 1, right = x / 2;
        while (left <= right) {
            long mid = left + (right - left) / 2;
            long sq = mid * mid;
            if (sq == x) return (int) mid;
            else if (sq < x) left = mid + 1;
            else right = mid - 1;
        }
        return (int) right; // right는 sqrt(x) 이하의 최대 정수
    }

    public static void main(String[] args) {
        assert mySqrt(4) == 2;
        assert mySqrt(8) == 2;
        assert mySqrt(0) == 0;
        assert mySqrt(1) == 1;
        assert mySqrt(16) == 4;
        assert mySqrt(2147395599) == 46339;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
