/**
 * 문제 064: 회의실 배정 (Meeting Rooms II)
 *
 * [문제] 회의 시간표가 주어질 때, 필요한 최소 회의실 수를 구하라.
 *
 * [아키텍트의 시선]
 * 동시 리소스 사용량의 최대치를 구하는 것은 서버 용량 계획,
 * 커넥션 풀 크기 결정, 스레드 풀 최적화와 동일한 문제다.
 * 이벤트 정렬 + 스위핑 기법은 시계열 이벤트 처리의 기본이다.
 *
 * [시간 복잡도] O(n log n) [공간 복잡도] O(n)
 */
import java.util.*;

public class P064MeetingRooms {
    public static int minMeetingRooms(int[][] intervals) {
        if (intervals.length == 0) return 0;

        // 이벤트 기반 풀이: 시작 +1, 끝 -1
        int[] starts = new int[intervals.length];
        int[] ends = new int[intervals.length];
        for (int i = 0; i < intervals.length; i++) {
            starts[i] = intervals[i][0];
            ends[i] = intervals[i][1];
        }
        Arrays.sort(starts);
        Arrays.sort(ends);

        int rooms = 0, maxRooms = 0, endPtr = 0;
        for (int i = 0; i < starts.length; i++) {
            if (starts[i] < ends[endPtr]) {
                rooms++;
            } else {
                endPtr++;
            }
            maxRooms = Math.max(maxRooms, rooms);
        }
        return maxRooms;
    }

    public static void main(String[] args) {
        assert minMeetingRooms(new int[][]{{0,30},{5,10},{15,20}}) == 2;
        assert minMeetingRooms(new int[][]{{7,10},{2,4}}) == 1;
        assert minMeetingRooms(new int[][]{}) == 0;
        assert minMeetingRooms(new int[][]{{1,5},{2,6},{3,7},{4,8}}) == 4;
        System.out.println("✓ 모든 테스트 통과!");
    }
}
