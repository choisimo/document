/**
 * 문제 094: 활동 선택 문제 (Activity Selection - Greedy)
 *
 * [문제] 시작/종료 시간이 주어진 활동들 중 겹치지 않는 최대 활동 수를 구하라.
 *
 * [아키텍트의 시선]
 * 탐욕 선택 속성과 최적성 증명.
 * 종료 시간 기준 정렬 -> 가장 빨리 끝나는 활동 선택 -> 남은 시간 최대화.
 * 탐욕이 최적인 이유: 교환 논증(Exchange Argument)으로 증명 가능.
 * 실무: 회의실 최대 활용, CPU 스케줄링(SJF), 자원 할당.
 *
 * [시간 복잡도] O(n log n) [공간 복잡도] O(n)
 */
import java.util.*;

public class P094ActivitySelection {
    // 종료 시간 기준 탐욕 선택
    public static List<int[]> activitySelection(int[][] activities) {
        int[][] sorted = activities.clone();
        Arrays.sort(sorted, (a, b) -> a[1] - b[1]);
        List<int[]> selected = new ArrayList<>();
        selected.add(sorted[0]);
        for (int i = 1; i < sorted.length; i++) {
            if (sorted[i][0] >= selected.get(selected.size() - 1)[1]) {
                selected.add(sorted[i]);
            }
        }
        return selected;
    }

    public static int maxActivitiesCount(int[][] activities) {
        return activitySelection(activities).size();
    }

    public static void main(String[] args) {
        int[][] acts = {{1,4},{3,5},{0,6},{5,7},{3,9},{5,9},{6,10},{8,11},{8,12},{2,14},{12,16}};
        List<int[]> selected = activitySelection(acts);
        assert selected.size() == 4; // (1,4), (5,7), (8,11), (12,16)
        // 겹침 없는지 검증
        for (int i = 1; i < selected.size(); i++) {
            assert selected.get(i)[0] >= selected.get(i - 1)[1];
        }
        int[][] acts2 = {{1,2},{2,3},{3,4}};
        assert maxActivitiesCount(acts2) == 3;
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
