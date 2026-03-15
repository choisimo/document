/**
 * 문제 018: 일일 온도 (Daily Temperatures)
 *
 * [문제] 일일 온도 배열이 주어질 때, 각 날에 대해
 * 더 따뜻한 날이 며칠 후에 오는지 계산하라.
 *
 * [아키텍트의 시선]
 * 단조 스택(Monotonic Stack)은 시계열 데이터에서
 * "다음으로 큰 값까지의 거리"를 O(n)에 구하는 핵심 패턴이다.
 * 주가 분석, SLA 위반 예측, 리소스 스파이크 감지에 직접 활용된다.
 *
 * [시간 복잡도] O(n) [공간 복잡도] O(n)
 */
import java.util.Stack;
import java.util.Arrays;

public class P018DailyTemperatures {
    public static int[] dailyTemperatures(int[] temperatures) {
        int n = temperatures.length;
        int[] result = new int[n];
        Stack<Integer> stack = new Stack<>(); // 인덱스 저장

        for (int i = 0; i < n; i++) {
            // 현재 온도가 스택 top의 온도보다 높으면 → 답을 찾은 것
            while (!stack.isEmpty() && temperatures[i] > temperatures[stack.peek()]) {
                int idx = stack.pop();
                result[idx] = i - idx;
            }
            stack.push(i);
        }
        // 스택에 남은 인덱스는 더 따뜻한 날이 없음 → 0 (이미 초기화됨)
        return result;
    }

    public static void main(String[] args) {
        assert Arrays.equals(
            dailyTemperatures(new int[]{73,74,75,71,69,72,76,73}),
            new int[]{1,1,4,2,1,1,0,0});
        assert Arrays.equals(
            dailyTemperatures(new int[]{30,40,50,60}),
            new int[]{1,1,1,0});
        assert Arrays.equals(
            dailyTemperatures(new int[]{30,20,10}),
            new int[]{0,0,0});
        System.out.println("✓ 모든 테스트 통과!");
    }
}
