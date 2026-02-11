/**
 * 문제 063: 데이터 스트림의 중앙값 (Find Median from Data Stream)
 *
 * [문제] 데이터가 스트림으로 들어올 때, 실시간으로 중앙값을 반환하라.
 *
 * [아키텍트의 시선]
 * 두 개의 힙(최대힙 + 최소힙)으로 실시간 중앙값을 추적하는 것은
 * 시계열 모니터링의 P50 지표 계산, 네트워크 지연시간 중앙값 추적,
 * 실시간 가격 엔진의 중간 가격 계산에 직접 활용된다.
 *
 * [시간 복잡도] addNum O(log n), findMedian O(1) [공간 복잡도] O(n)
 */
import java.util.*;

public class P063StreamMedian {
    private PriorityQueue<Integer> maxHeap; // 작은 절반 (최대힙)
    private PriorityQueue<Integer> minHeap; // 큰 절반 (최소힙)

    public P063StreamMedian() {
        maxHeap = new PriorityQueue<>(Collections.reverseOrder());
        minHeap = new PriorityQueue<>();
    }

    public void addNum(int num) {
        maxHeap.offer(num);
        minHeap.offer(maxHeap.poll()); // 밸런싱
        if (minHeap.size() > maxHeap.size()) {
            maxHeap.offer(minHeap.poll());
        }
    }

    public double findMedian() {
        if (maxHeap.size() > minHeap.size()) {
            return maxHeap.peek();
        }
        return (maxHeap.peek() + minHeap.peek()) / 2.0;
    }

    public static void main(String[] args) {
        P063StreamMedian mf = new P063StreamMedian();
        mf.addNum(1);
        assert mf.findMedian() == 1.0;
        mf.addNum(2);
        assert mf.findMedian() == 1.5;
        mf.addNum(3);
        assert mf.findMedian() == 2.0;
        mf.addNum(4);
        assert mf.findMedian() == 2.5;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
