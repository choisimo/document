/**
 * 문제 010: 파스칼의 삼각형 (Pascal's Triangle)
 * [문제] n개 행의 파스칼 삼각형을 생성하라.
 * [아키텍트의 시선] 메모이제이션과 데이터 생성 패턴.
 * row[j] = prev[j-1] + prev[j]. 이전 결과로 다음을 생성.
 * 실무: 조합론, 확률 계산, 다항 계수.
 * [시간 복잡도] O(n^2) [공간 복잡도] O(n^2)
 */
import java.util.*;

public class P010PascalsTriangle {
    public static List<List<Integer>> generate(int numRows) {
        List<List<Integer>> triangle = new ArrayList<>();
        for (int i = 0; i < numRows; i++) {
            List<Integer> row = new ArrayList<>();
            for (int j = 0; j <= i; j++) {
                if (j == 0 || j == i) {
                    row.add(1);
                } else {
                    row.add(triangle.get(i-1).get(j-1) + triangle.get(i-1).get(j));
                }
            }
            triangle.add(row);
        }
        return triangle;
    }

    public static void main(String[] args) {
        List<List<Integer>> result = generate(5);
        assert result.get(0).equals(Arrays.asList(1));
        assert result.get(1).equals(Arrays.asList(1, 1));
        assert result.get(2).equals(Arrays.asList(1, 2, 1));
        assert result.get(3).equals(Arrays.asList(1, 3, 3, 1));
        assert result.get(4).equals(Arrays.asList(1, 4, 6, 4, 1));
        System.out.println("\u2713 모든 테스트 통과!");
    }
}
