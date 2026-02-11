/**
 * 문제 037: 2D 행렬 탐색 (Search a 2D Matrix)
 *
 * [문제] 행과 열이 정렬된 m x n 행렬에서 타겟 값을 찾아라.
 * 각 행의 첫 번째 값은 이전 행의 마지막 값보다 크다.
 *
 * [아키텍트의 시선]
 * 2D 행렬을 1D로 매핑한 이진 탐색은 다차원 인덱스를
 * 선형 주소 공간으로 변환하는 것이다.
 * 가상 메모리의 페이지 테이블, 분산 해시의 일관된 해싱과 동일한 원리다.
 *
 * [시간 복잡도] O(log(m*n)) [공간 복잡도] O(1)
 */
public class P037Search2DMatrix {
    public static boolean searchMatrix(int[][] matrix, int target) {
        if (matrix.length == 0 || matrix[0].length == 0) return false;
        int m = matrix.length, n = matrix[0].length;
        int left = 0, right = m * n - 1;

        while (left <= right) {
            int mid = left + (right - left) / 2;
            int val = matrix[mid / n][mid % n]; // 1D→2D 좌표 변환
            if (val == target) return true;
            else if (val < target) left = mid + 1;
            else right = mid - 1;
        }
        return false;
    }

    public static void main(String[] args) {
        int[][] m1 = {{1,3,5,7},{10,11,16,20},{23,30,34,60}};
        assert searchMatrix(m1, 3);
        assert !searchMatrix(m1, 13);
        assert searchMatrix(new int[][]{{1}}, 1);
        assert !searchMatrix(new int[][]{{1}}, 2);
        System.out.println("✓ 모든 테스트 통과!");
    }
}
