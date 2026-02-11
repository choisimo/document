/**
 * 문제 016: 최소 스택 (Min Stack)
 *
 * [문제] push, pop, top, getMin 모두 O(1)에 동작하는 스택을 구현하라.
 *
 * [아키텍트의 시선]
 * O(1) 최솟값 조회는 모니터링 시스템의 실시간 최솟값 추적,
 * SLA 위반 즉시 감지, 리소스 사용량 하한선 모니터링과 동일하다.
 * 보조 자료구조로 시간 복잡도를 낮추는 것은 캐싱 전략의 핵심이다.
 *
 * [시간 복잡도] O(1) 모든 연산 [공간 복잡도] O(n)
 */
import java.util.Stack;

public class P016MinStack {
    private Stack<Integer> stack;
    private Stack<Integer> minStack; // 각 시점의 최솟값을 추적

    public P016MinStack() {
        stack = new Stack<>();
        minStack = new Stack<>();
    }

    public void push(int val) {
        stack.push(val);
        // 현재까지의 최솟값을 minStack에 유지
        if (minStack.isEmpty() || val <= minStack.peek()) {
            minStack.push(val);
        } else {
            minStack.push(minStack.peek());
        }
    }

    public void pop() {
        stack.pop();
        minStack.pop();
    }

    public int top() {
        return stack.peek();
    }

    public int getMin() {
        return minStack.peek();
    }

    public static void main(String[] args) {
        P016MinStack ms = new P016MinStack();
        ms.push(-2);
        ms.push(0);
        ms.push(-3);
        assert ms.getMin() == -3;
        ms.pop();
        assert ms.top() == 0;
        assert ms.getMin() == -2;
        ms.push(1);
        assert ms.getMin() == -2;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
