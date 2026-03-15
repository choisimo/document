import java.io.*;
import java.util.*;

public class Main {
    public static class Node {
        int key; 
        Node left, right;
        Node (int key) {
            this.key = key;
        }
    }

    // 호출 횟수
    protected static long cnt = 0;

    /**
     * 이진 탐색 트리에 노드 삽입
     * @param tree 이진 탐색 트리의 루트 노드
     * @param x 삽입할 키 값
     */
    protected static Node insert(Node tree, int x) {
        cnt++;
        // tree가 null인 경우
        if (tree == null) {
            return new Node(x);
        }
        // x가 tree.key보다 작은 경우 왼쪽 서브트리에 삽입
        if (x < tree.key) { tree.left = insert(tree.left, x); }
        else { tree.right = insert(tree.right, x); }
        return tree;    
    }

    public static void main(String[]  args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        
        // n 이 0 이하인 경우
        if (n <= 0) {
            System.out.println(0);
            return;
        }

        cnt = 0;
        Node treeRoot = null;
        for (int i = 0; i < n; i++) {
            int x = sc.nextInt();
            treeRoot = insert(treeRoot, x);
        }
        System.out.print(cnt);
    }
}
