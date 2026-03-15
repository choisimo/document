/**
 * 문제 061: 최소 힙 구현 (Min Heap Implementation)
 *
 * [문제] 배열 기반 최소 힙을 직접 구현하라.
 * insert, extractMin, peek 연산을 지원해야 한다.
 *
 * [아키텍트의 시선]
 * 힙은 우선순위 큐의 근본 자료구조다. 운영체제의 프로세스 스케줄러,
 * 이벤트 드리븐 시스템의 타이머 관리, 네트워크 패킷의 QoS 우선순위 처리에
 * 직접 활용된다. O(log n) 삽입/삭제가 핵심이다.
 *
 * [시간 복잡도] insert/extract O(log n), peek O(1) [공간 복잡도] O(n)
 */
import java.util.ArrayList;
import java.util.List;

public class P061MinHeap {
    private List<Integer> heap;

    public P061MinHeap() {
        heap = new ArrayList<>();
    }

    public void insert(int val) {
        heap.add(val);
        siftUp(heap.size() - 1);
    }

    public int extractMin() {
        int min = heap.get(0);
        int last = heap.remove(heap.size() - 1);
        if (!heap.isEmpty()) {
            heap.set(0, last);
            siftDown(0);
        }
        return min;
    }

    public int peek() {
        return heap.get(0);
    }

    public int size() {
        return heap.size();
    }

    private void siftUp(int i) {
        while (i > 0) {
            int parent = (i - 1) / 2;
            if (heap.get(i) >= heap.get(parent)) break;
            swap(i, parent);
            i = parent;
        }
    }

    private void siftDown(int i) {
        int n = heap.size();
        while (true) {
            int smallest = i;
            int left = 2 * i + 1, right = 2 * i + 2;
            if (left < n && heap.get(left) < heap.get(smallest)) smallest = left;
            if (right < n && heap.get(right) < heap.get(smallest)) smallest = right;
            if (smallest == i) break;
            swap(i, smallest);
            i = smallest;
        }
    }

    private void swap(int i, int j) {
        int tmp = heap.get(i);
        heap.set(i, heap.get(j));
        heap.set(j, tmp);
    }

    public static void main(String[] args) {
        P061MinHeap h = new P061MinHeap();
        h.insert(5); h.insert(3); h.insert(8); h.insert(1); h.insert(4);
        assert h.peek() == 1;
        assert h.extractMin() == 1;
        assert h.extractMin() == 3;
        assert h.extractMin() == 4;
        assert h.size() == 2;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
