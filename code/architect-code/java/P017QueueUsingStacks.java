/**
 * 문제 017: 스택으로 큐 구현 (Queue Using Stacks)
 *
 * [문제] 두 개의 스택만 사용하여 FIFO 큐를 구현하라.
 * push, pop, peek, empty 연산을 지원해야 한다.
 *
 * [아키텍트의 시선]
 * 스택→큐 변환은 메시지 브로커의 내부 구현 패턴이다.
 * Producer/Consumer 패턴에서 LIFO→FIFO 변환은
 * 이벤트 순서 보장 메커니즘의 근본 원리다.
 * 분할 상환 분석(Amortized Analysis)으로 O(1) 평균 성능을 보장한다.
 *
 * [시간 복잡도] push O(1), pop 분할상환 O(1) [공간 복잡도] O(n)
 */
import java.util.Stack;

public class P017QueueUsingStacks {
    private Stack<Integer> inStack;  // push용
    private Stack<Integer> outStack; // pop용

    public P017QueueUsingStacks() {
        inStack = new Stack<>();
        outStack = new Stack<>();
    }

    public void push(int x) {
        inStack.push(x);
    }

    public int pop() {
        peek(); // outStack이 비어있으면 채움
        return outStack.pop();
    }

    public int peek() {
        if (outStack.isEmpty()) {
            // inStack의 모든 원소를 outStack으로 이동 → 순서 뒤집힘 → FIFO
            while (!inStack.isEmpty()) {
                outStack.push(inStack.pop());
            }
        }
        return outStack.peek();
    }

    public boolean empty() {
        return inStack.isEmpty() && outStack.isEmpty();
    }

    public static void main(String[] args) {
        P017QueueUsingStacks q = new P017QueueUsingStacks();
        q.push(1);
        q.push(2);
        assert q.peek() == 1;
        assert q.pop() == 1;
        assert !q.empty();
        assert q.pop() == 2;
        assert q.empty();
        System.out.println("✓ 모든 테스트 통과!");
    }
}
