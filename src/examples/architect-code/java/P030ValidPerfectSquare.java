/**
 * 문제 030: 유효한 완전 제곱수 (Valid Perfect Square)
 *
 * [문제] 주어진 양의 정수가 완전 제곱수인지 판별하라.
 * 내장 sqrt 함수를 사용하지 말 것.
 *
 * [아키텍트의 시선]
 * 이진 탐색으로 탐색 공간을 절반씩 줄이는 것은
 * 시스템의 이분 탐색 기반 디버깅(git bisect), 성능 임계값 탐색,
 * A/B 테스트의 최적 파라미터 찾기와 동일한 원리다.
 *
 * [시간 복잡도] O(log n) [공간 복잡도] O(1)
 */
public class P030ValidPerfectSquare {
    public static boolean isPerfectSquare(int num) {
        if (num < 1) return false;
        long left = 1, right = num;
        while (left <= right) {
            long mid = left + (right - left) / 2;
            long square = mid * mid;
            if (square == num) return true;
            else if (square < num) left = mid + 1;
            else right = mid - 1;
        }
        return false;
    }

    // 뉴턴 방법 (Newton's Method)
    public static boolean isPerfectSquareNewton(int num) {
        if (num < 1) return false;
        long x = num;
        while (x * x > num) {
            x = (x + num / x) / 2;
        }
        return x * x == num;
    }

    public static void main(String[] args) {
        assert isPerfectSquare(16);
        assert !isPerfectSquare(14);
        assert isPerfectSquare(1);
        assert isPerfectSquare(100);
        assert !isPerfectSquare(2);
        assert isPerfectSquareNewton(25);
        assert !isPerfectSquareNewton(3);
        System.out.println("✓ 모든 테스트 통과!");
    }
}
