 import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.StringTokenizer;

public class Main {
    public static class Node {
        int key; Node left, right;
        Node (int key) { this.key = key; }
    }

    private static final BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
    private static StringTokenizer st;

    private static String next() throws Exception {
        while (st == null || !st.hasMoreTokens()) {
            String line = br.readLine();
            if (line == null) {
                return null;
            }
            st = new StringTokenizer(line);
        }
        return st.nextToken();
    }

    protected static Node insert(Node tree, int x) {
        if (tree == null) {
            return new Node(x);
        }

        if (x < tree.key) { tree.left  = insert(tree.left, x);} 
        else if (x > tree.key)          { tree.right = insert(tree.right, x);}
        return tree;
    }

    protected static Node findMin(Node tree) {
        while (tree.left != null) {
            tree = tree.left;
        }
        return tree;
    }

    protected static Node delete(Node tree, int x) {
        if (tree == null) {
            return tree;
        }
        if (x < tree.key) {
            tree.left = delete(tree.left, x);
        } else if (x > tree.key) {
            tree.right = delete(tree.right, x);
        } else {
            // 삭제할 노드 찾음
            if (tree.left == null) {
                return tree.right;
            } else if (tree.right == null) {
                return tree.left;
            } else {
                // 두 자식이 모두 있는 경우
                Node minNode = findMin(tree.right);
                tree.key = minNode.key;
                tree.right = delete(tree.right, minNode.key);
            }
        }
        return tree;
    }

    // 전위 순회
    static void preorder(Node t, StringBuilder sb){
        if (t == null) return;
        if (sb.length() > 0) sb.append(' ');
        sb.append(t.key);
        preorder(t.left, sb); preorder(t.right, sb);
    }
    // 중위 순회
    static void inorder(Node t, StringBuilder sb){
        if (t == null) return;
        inorder(t.left, sb);
        if (sb.length() > 0) sb.append(' ');
        sb.append(t.key);
        inorder(t.right, sb);
    }
    // 후위 순회
    static void postorder(Node t, StringBuilder sb){
        if (t == null) return;
        postorder(t.left, sb); postorder(t.right, sb);
        if (sb.length() > 0) sb.append(' ');
        sb.append(t.key);
    }

    public static void main(String[] args) throws Exception {
        String token = next();
        if (token == null) return;
        int n = Integer.parseInt(token);

        Node treeRoot = null;
        for (int i = 0; i < n; i++) {
            treeRoot = insert(treeRoot, Integer.parseInt(next()));
        }

        int m = Integer.parseInt(next());
        StringBuilder output = new StringBuilder();

        for (int i = 0; i < m; i++) {
            int command = Integer.parseInt(next());
            int value = Integer.parseInt(next());
            treeRoot = delete(treeRoot, value);

            StringBuilder traversal = new StringBuilder();
            if (command == 0) {
                preorder(treeRoot, traversal);
            } else if (command == 1) {
                inorder(treeRoot, traversal);
            } else if (command == 2) {
                postorder(treeRoot, traversal);
            }

            output.append(traversal);
            if (i + 1 < m) {
                output.append('\n');
            }
        }

        System.out.print(output.toString());
    }
}