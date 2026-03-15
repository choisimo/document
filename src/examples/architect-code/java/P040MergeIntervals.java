/**
 * 문제 040: 구간 병합 (Merge Intervals)
 *
 * [문제] 겹치는 구간들을 병합하라.
 *
 * [아키텍트의 시선]
 * 구간 병합은 캘린더 시스템의 일정 충돌 감지,
 * 메모리 할당기의 프리 블록 병합, IP 대역 통합,
 * 시계열 데이터의 중복 기간 제거에 직접 활용된다.
 * 정렬 후 순차 병합은 스트림 처리의 기본 패턴이다.
 *
 * [시간 복잡도] O(n log n) [공간 복잡도] O(n)
 */
import java.util.*;

public class P040MergeIntervals {
    public static int[][] merge(int[][] intervals) {
        if (intervals.length <= 1) return intervals;
        Arrays.sort(intervals, (a, b) -> a[0] - b[0]); // 시작점 기준 정렬

        List<int[]> merged = new ArrayList<>();
        int[] current = intervals[0];
        merged.add(current);

        for (int i = 1; i < intervals.length; i++) {
            if (intervals[i][0] <= current[1]) {
                // 겹침 → 끝점을 확장
                current[1] = Math.max(current[1], intervals[i][1]);
            } else {
                // 겹치지 않음 → 새 구간 추가
                current = intervals[i];
                merged.add(current);
            }
        }
        return merged.toArray(new int[0][]);
    }

    public static void main(String[] args) {
        int[][] r1 = merge(new int[][]{{1,3},{2,6},{8,10},{15,18}});
        assert Arrays.deepEquals(r1, new int[][]{{1,6},{8,10},{15,18}});

        int[][] r2 = merge(new int[][]{{1,4},{4,5}});
        assert Arrays.deepEquals(r2, new int[][]{{1,5}});

        int[][] r3 = merge(new int[][]{{1,4},{0,4}});
        assert Arrays.deepEquals(r3, new int[][]{{0,4}});
        System.out.println("✓ 모든 테스트 통과!");
    }
}
