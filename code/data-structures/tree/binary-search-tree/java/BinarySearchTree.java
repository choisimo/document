import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.StringTokenizer;

public class BinarySearchTree<T extends Comparable<T>> {

    private static class Node<T> {
        T key;
        Node<T> left;
        Node<T> right;

        Node(T key) {
            this.key = key;
        }
    }

    private Node<T> root;
    private int size;

    public void insert(T key) {
        root = insertRecursive(root, key);
        size++;
    }

    private Node<T> insertRecursive(Node<T> node, T key) {
        if (node == null) {
            return new Node<>(key);
        }

        int cmp = key.compareTo(node.key);
        if (cmp < 0) {
            node.left = insertRecursive(node.left, key);
        } else if (cmp > 0) {
            node.right = insertRecursive(node.right, key);
        }

        return node;
    }

    public void insertIterative(T key) {
        Node<T> newNode = new Node<>(key);
        if (root == null) {
            root = newNode;
            size++;
            return;
        }

        Node<T> current = root;
        while (true) {
            int cmp = key.compareTo(current.key);
            if (cmp < 0) {
                if (current.left == null) {
                    current.left = newNode;
                    size++;
                    return;
                }
                current = current.left;
            } else if (cmp > 0) {
                if (current.right == null) {
                    current.right = newNode;
                    size++;
                    return;
                }
                current = current.right;
            } else {
                return;
            }
        }
    }

    public boolean search(T key) {
        return searchRecursive(root, key);
    }

    private boolean searchRecursive(Node<T> node, T key) {
        if (node == null) return false;

        int cmp = key.compareTo(node.key);
        if (cmp == 0) return true;
        if (cmp < 0) return searchRecursive(node.left, key);
        return searchRecursive(node.right, key);
    }

    public void delete(T key) {
        root = deleteRecursive(root, key);
    }

    private Node<T> deleteRecursive(Node<T> node, T key) {
        if (node == null) return null;

        int cmp = key.compareTo(node.key);
        if (cmp < 0) {
            node.left = deleteRecursive(node.left, key);
        } else if (cmp > 0) {
            node.right = deleteRecursive(node.right, key);
        } else {
            if (node.left == null) return node.right;
            if (node.right == null) return node.left;

            Node<T> successor = findMin(node.right);
            node.key = successor.key;
            node.right = deleteRecursive(node.right, successor.key);
        }

        return node;
    }

    private Node<T> findMin(Node<T> node) {
        while (node.left != null) {
            node = node.left;
        }
        return node;
    }

    public List<T> inorder() {
        List<T> result = new ArrayList<>();
        inorderRecursive(root, result);
        return result;
    }

    private void inorderRecursive(Node<T> node, List<T> result) {
        if (node != null) {
            inorderRecursive(node.left, result);
            result.add(node.key);
            inorderRecursive(node.right, result);
        }
    }

    public List<T> preorder() {
        List<T> result = new ArrayList<>();
        preorderRecursive(root, result);
        return result;
    }

    private void preorderRecursive(Node<T> node, List<T> result) {
        if (node != null) {
            result.add(node.key);
            preorderRecursive(node.left, result);
            preorderRecursive(node.right, result);
        }
    }

    public List<T> postorder() {
        List<T> result = new ArrayList<>();
        postorderRecursive(root, result);
        return result;
    }

    private void postorderRecursive(Node<T> node, List<T> result) {
        if (node != null) {
            postorderRecursive(node.left, result);
            postorderRecursive(node.right, result);
            result.add(node.key);
        }
    }

    public List<List<T>> levelOrder() {
        List<List<T>> result = new ArrayList<>();
        if (root == null) return result;

        Queue<Node<T>> queue = new LinkedList<>();
        queue.offer(root);

        while (!queue.isEmpty()) {
            int levelSize = queue.size();
            List<T> level = new ArrayList<>();

            for (int i = 0; i < levelSize; i++) {
                Node<T> node = queue.poll();
                level.add(node.key);

                if (node.left != null) queue.offer(node.left);
                if (node.right != null) queue.offer(node.right);
            }

            result.add(level);
        }

        return result;
    }

    public int size() {
        return size;
    }

    public int height() {
        return heightRecursive(root);
    }

    private int heightRecursive(Node<T> node) {
        if (node == null) return -1;
        return 1 + Math.max(heightRecursive(node.left), heightRecursive(node.right));
    }

    public boolean isValidBST() {
        return isValidBSTHelper(root, null, null);
    }

    private boolean isValidBSTHelper(Node<T> node, T min, T max) {
        if (node == null) return true;
        if (min != null && node.key.compareTo(min) <= 0) return false;
        if (max != null && node.key.compareTo(max) >= 0) return false;
        return isValidBSTHelper(node.left, min, node.key) &&
               isValidBSTHelper(node.right, node.key, max);
    }

    public String visualize() {
        if (root == null) return "(empty tree)";
        StringBuilder sb = new StringBuilder();
        visualizeHelper(root, "", true, sb);
        return sb.toString();
    }

    private void visualizeHelper(Node<T> node, String prefix, boolean isLeft, StringBuilder sb) {
        if (node.right != null) {
            visualizeHelper(node.right, prefix + (isLeft ? "│   " : "    "), false, sb);
        }
        sb.append(prefix).append(isLeft ? "└── " : "┌── ").append(node.key).append("\n");
        if (node.left != null) {
            visualizeHelper(node.left, prefix + (isLeft ? "    " : "│   "), true, sb);
        }
    }

    public static void main(String[] args) throws Exception {
        PrintWriter out = new PrintWriter(System.out);

        out.println("=".repeat(60));
        out.println("Binary Search Tree - Java Demo");
        out.println("=".repeat(60));

        BinarySearchTree<Integer> bst = new BinarySearchTree<>();
        int[] elements = {5, 3, 7, 1, 4, 6, 8};

        out.print("\nInsertion order: [");
        for (int i = 0; i < elements.length; i++) {
            out.print(elements[i]);
            if (i < elements.length - 1) out.print(", ");
        }
        out.println("]\n");

        for (int elem : elements) {
            bst.insert(elem);
        }

        out.println("Tree Structure:");
        out.println(bst.visualize());

        out.println("Size: " + bst.size());
        out.println("Height: " + bst.height());
        out.println("Is Valid BST: " + bst.isValidBST());

        out.println("\nInorder (sorted): " + bst.inorder());
        out.println("Preorder: " + bst.preorder());
        out.println("Postorder: " + bst.postorder());
        out.println("Level Order: " + bst.levelOrder());

        out.println("\nSearch 4: " + bst.search(4));
        out.println("Search 10: " + bst.search(10));

        out.println("\nAfter delete(5) - root deletion:");
        bst.delete(5);
        out.println(bst.visualize());

        out.flush();
    }
}
