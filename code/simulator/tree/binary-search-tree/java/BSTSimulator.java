import java.util.*;

public class BSTSimulator {
    
    private Node root;
    private int size;
    private int comparisons;
    private int operations;
    private List<StackFrame> callStack;
    private Map<String, HeapObject> heap;
    private int addressCounter;
    private int animationDelay;
    private boolean stepMode;
    private Scanner scanner;

    public BSTSimulator() {
        this.root = null;
        this.size = 0;
        this.comparisons = 0;
        this.operations = 0;
        this.callStack = new ArrayList<>();
        this.heap = new LinkedHashMap<>();
        this.addressCounter = 0x1000;
        this.animationDelay = 500;
        this.stepMode = false;
        this.scanner = new Scanner(System.in);
    }

    static class Node {
        int key;
        Node left;
        Node right;
        String address;
        boolean highlighted;

        Node(int key, String address) {
            this.key = key;
            this.address = address;
            this.left = null;
            this.right = null;
            this.highlighted = false;
        }
    }

    static class StackFrame {
        String functionName;
        Map<String, String> variables;
        boolean active;

        StackFrame(String functionName) {
            this.functionName = functionName;
            this.variables = new LinkedHashMap<>();
            this.active = true;
        }
    }

    static class HeapObject {
        String address;
        String type;
        Map<String, String> fields;
        boolean highlighted;

        HeapObject(String address, String type) {
            this.address = address;
            this.type = type;
            this.fields = new LinkedHashMap<>();
            this.highlighted = false;
        }
    }

    private String allocateAddress() {
        String addr = String.format("0x%04X", addressCounter);
        addressCounter += 8;
        return addr;
    }

    private void pushStackFrame(String name, Map<String, String> vars) {
        for (StackFrame frame : callStack) {
            frame.active = false;
        }
        StackFrame frame = new StackFrame(name);
        if (vars != null) {
            frame.variables.putAll(vars);
        }
        callStack.add(frame);
    }

    private void popStackFrame() {
        if (!callStack.isEmpty()) {
            callStack.remove(callStack.size() - 1);
            if (!callStack.isEmpty()) {
                callStack.get(callStack.size() - 1).active = true;
            }
        }
    }

    private void updateStackVariable(String name, String value) {
        if (!callStack.isEmpty()) {
            callStack.get(callStack.size() - 1).variables.put(name, value);
        }
    }

    private void syncHeapWithTree() {
        heap.clear();
        syncHeapRecursive(root);
    }

    private void syncHeapRecursive(Node node) {
        if (node == null) return;

        HeapObject obj = new HeapObject(node.address, "Node");
        obj.fields.put("key", String.valueOf(node.key));
        obj.fields.put("left", node.left != null ? node.left.address : "null");
        obj.fields.put("right", node.right != null ? node.right.address : "null");
        obj.highlighted = node.highlighted;
        heap.put(node.address, obj);

        syncHeapRecursive(node.left);
        syncHeapRecursive(node.right);
    }

    private void clearScreen() {
        System.out.print("\033[H\033[2J");
        System.out.flush();
    }

    private void waitForInput() {
        if (stepMode) {
            System.out.print("\n[Press Enter to continue...]");
            scanner.nextLine();
        } else {
            try {
                Thread.sleep(animationDelay);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private void displayState(String message) {
        clearScreen();
        System.out.println("═".repeat(70));
        System.out.println(" BST SIMULATOR - Step-by-Step Visualization ".toUpperCase());
        System.out.println("═".repeat(70));
        System.out.println();
        
        if (message != null && !message.isEmpty()) {
            System.out.println("📍 " + message);
            System.out.println();
        }

        displayMemory();
        System.out.println();
        System.out.println("─".repeat(70));
        System.out.println(" TREE STRUCTURE ");
        System.out.println("─".repeat(70));
        displayTree();
        System.out.println();
        System.out.println("─".repeat(70));
        System.out.println(" CALL STACK ");
        System.out.println("─".repeat(70));
        displayCallStack();

        waitForInput();
    }

    private void displayMemory() {
        System.out.println("┌" + "─".repeat(32) + "┐   ┌" + "─".repeat(32) + "┐");
        System.out.println("│" + centerString(" STACK ", 32) + "│   │" + centerString(" HEAP ", 32) + "│");
        System.out.println("├" + "─".repeat(32) + "┤   ├" + "─".repeat(32) + "┤");

        List<String> stackLines = renderStack();
        List<String> heapLines = renderHeap();

        int maxLines = Math.max(stackLines.size(), heapLines.size());
        maxLines = Math.max(maxLines, 1);

        while (stackLines.size() < maxLines) stackLines.add("");
        while (heapLines.size() < maxLines) heapLines.add("");

        for (int i = 0; i < maxLines; i++) {
            System.out.printf("│%-32s│   │%-32s│%n", 
                truncate(stackLines.get(i), 32), 
                truncate(heapLines.get(i), 32));
        }

        System.out.println("└" + "─".repeat(32) + "┘   └" + "─".repeat(32) + "┘");
    }

    private List<String> renderStack() {
        List<String> lines = new ArrayList<>();
        for (int i = callStack.size() - 1; i >= 0; i--) {
            StackFrame frame = callStack.get(i);
            String marker = frame.active ? "→ " : "  ";
            lines.add(marker + "[" + frame.functionName + "]");
            for (Map.Entry<String, String> var : frame.variables.entrySet()) {
                String value = var.getValue();
                if (value != null && value.startsWith("0x")) {
                    lines.add("    " + var.getKey() + " ──► " + value);
                } else {
                    lines.add("    " + var.getKey() + " = " + value);
                }
            }
            if (i > 0) {
                lines.add("  " + "─".repeat(28));
            }
        }
        if (lines.isEmpty()) {
            lines.add("  (empty)");
        }
        return lines;
    }

    private List<String> renderHeap() {
        List<String> lines = new ArrayList<>();
        syncHeapWithTree();

        for (HeapObject obj : heap.values()) {
            String highlight = obj.highlighted ? " *" : "";
            lines.add("┌─ " + obj.address + highlight + " ───────────┐");
            lines.add("│ " + obj.type);
            for (Map.Entry<String, String> field : obj.fields.entrySet()) {
                String value = field.getValue();
                if (value.startsWith("0x")) {
                    lines.add("│ " + field.getKey() + ": ──► " + value);
                } else {
                    lines.add("│ " + field.getKey() + ": " + value);
                }
            }
            lines.add("└" + "─".repeat(28) + "┘");
            lines.add("");
        }
        if (lines.isEmpty()) {
            lines.add("  (empty)");
        }
        return lines;
    }

    private void displayTree() {
        if (root == null) {
            System.out.println("  (empty tree)");
            return;
        }
        List<String> lines = new ArrayList<>();
        buildTreeString(root, "", true, lines);
        for (String line : lines) {
            System.out.println("  " + line);
        }
    }

    private void buildTreeString(Node node, String prefix, boolean isLeft, List<String> lines) {
        if (node == null) return;

        if (node.right != null) {
            buildTreeString(node.right, prefix + (isLeft ? "│   " : "    "), false, lines);
        }

        String marker = node.highlighted ? " ◄" : "";
        lines.add(prefix + (isLeft ? "└── " : "┌── ") + "[" + node.key + "]" + marker + " @" + node.address);

        if (node.left != null) {
            buildTreeString(node.left, prefix + (isLeft ? "    " : "│   "), true, lines);
        }
    }

    private void displayCallStack() {
        if (callStack.isEmpty()) {
            System.out.println("  (empty)");
            return;
        }

        for (int i = callStack.size() - 1; i >= 0; i--) {
            StackFrame frame = callStack.get(i);
            String marker = frame.active ? "→ " : "  ";
            StringBuilder varsStr = new StringBuilder();
            for (Map.Entry<String, String> var : frame.variables.entrySet()) {
                if (varsStr.length() > 0) varsStr.append(", ");
                varsStr.append(var.getKey()).append("=").append(var.getValue());
            }
            System.out.printf("  %s%s(%s)%n", marker, frame.functionName, varsStr);
        }
    }

    private String centerString(String s, int width) {
        int padding = (width - s.length()) / 2;
        return " ".repeat(Math.max(0, padding)) + s + " ".repeat(Math.max(0, width - s.length() - padding));
    }

    private String truncate(String s, int maxLen) {
        if (s.length() <= maxLen) return s;
        return s.substring(0, maxLen - 3) + "...";
    }

    public void insert(int key) {
        operations++;
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" INSERT(" + key + ") - Starting ");
        System.out.println("═".repeat(70));

        Map<String, String> vars = new LinkedHashMap<>();
        vars.put("key", String.valueOf(key));
        vars.put("root", root != null ? root.address : "null");
        pushStackFrame("insert", vars);

        displayState("insert(" + key + ") called");

        root = insertRecursive(root, key, 0);

        popStackFrame();
        displayState("insert(" + key + ") completed! Root = " + (root != null ? root.address : "null"));
    }

    private Node insertRecursive(Node node, int key, int depth) {
        comparisons++;

        if (node == null) {
            String addr = allocateAddress();
            Node newNode = new Node(key, addr);
            displayState("node is null → Create new Node(" + key + ") at " + addr);
            return newNode;
        }

        node.highlighted = true;
        displayState("Comparing: " + key + " vs " + node.key + " (at " + node.address + ")");
        node.highlighted = false;

        if (key < node.key) {
            displayState(key + " < " + node.key + " → Go LEFT");

            Map<String, String> vars = new LinkedHashMap<>();
            vars.put("node", node.left != null ? node.left.address : "null");
            vars.put("key", String.valueOf(key));
            pushStackFrame("insert (left of " + node.key + ")", vars);

            node.left = insertRecursive(node.left, key, depth + 1);

            popStackFrame();
            displayState("Returned from left subtree, updated " + node.address + ".left");

        } else if (key > node.key) {
            displayState(key + " > " + node.key + " → Go RIGHT");

            Map<String, String> vars = new LinkedHashMap<>();
            vars.put("node", node.right != null ? node.right.address : "null");
            vars.put("key", String.valueOf(key));
            pushStackFrame("insert (right of " + node.key + ")", vars);

            node.right = insertRecursive(node.right, key, depth + 1);

            popStackFrame();
            displayState("Returned from right subtree, updated " + node.address + ".right");

        } else {
            displayState(key + " == " + node.key + " → Duplicate! Ignoring...");
        }

        return node;
    }

    public boolean search(int key) {
        operations++;
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" SEARCH(" + key + ") - Starting ");
        System.out.println("═".repeat(70));

        Map<String, String> vars = new LinkedHashMap<>();
        vars.put("key", String.valueOf(key));
        vars.put("root", root != null ? root.address : "null");
        pushStackFrame("search", vars);

        displayState("search(" + key + ") called");

        boolean result = searchRecursive(root, key, 0);

        popStackFrame();
        String resultMsg = result ? "FOUND! ✓" : "NOT FOUND ✗";
        displayState("search(" + key + ") completed! Result: " + resultMsg);

        return result;
    }

    private boolean searchRecursive(Node node, int key, int depth) {
        comparisons++;

        if (node == null) {
            displayState("Reached null → Key " + key + " not found!");
            return false;
        }

        node.highlighted = true;
        displayState("Checking node at " + node.address + ": key = " + node.key);

        if (key == node.key) {
            displayState("FOUND! " + key + " == " + node.key);
            node.highlighted = false;
            return true;
        }

        node.highlighted = false;

        if (key < node.key) {
            displayState(key + " < " + node.key + " → Search LEFT");

            Map<String, String> vars = new LinkedHashMap<>();
            vars.put("node", node.left != null ? node.left.address : "null");
            vars.put("key", String.valueOf(key));
            pushStackFrame("search (left of " + node.key + ")", vars);

            boolean result = searchRecursive(node.left, key, depth + 1);

            popStackFrame();
            return result;

        } else {
            displayState(key + " > " + node.key + " → Search RIGHT");

            Map<String, String> vars = new LinkedHashMap<>();
            vars.put("node", node.right != null ? node.right.address : "null");
            vars.put("key", String.valueOf(key));
            pushStackFrame("search (right of " + node.key + ")", vars);

            boolean result = searchRecursive(node.right, key, depth + 1);

            popStackFrame();
            return result;
        }
    }

    public void delete(int key) {
        operations++;
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" DELETE(" + key + ") - Starting ");
        System.out.println("═".repeat(70));

        Map<String, String> vars = new LinkedHashMap<>();
        vars.put("key", String.valueOf(key));
        vars.put("root", root != null ? root.address : "null");
        pushStackFrame("delete", vars);

        displayState("delete(" + key + ") called");

        root = deleteRecursive(root, key, 0);

        popStackFrame();
        displayState("delete(" + key + ") completed!");
    }

    private Node deleteRecursive(Node node, int key, int depth) {
        if (node == null) {
            displayState("Node not found for deletion: " + key);
            return null;
        }

        comparisons++;
        node.highlighted = true;
        displayState("Checking node at " + node.address + ": key = " + node.key);
        node.highlighted = false;

        if (key < node.key) {
            displayState(key + " < " + node.key + " → Delete from LEFT subtree");
            node.left = deleteRecursive(node.left, key, depth + 1);
            return node;

        } else if (key > node.key) {
            displayState(key + " > " + node.key + " → Delete from RIGHT subtree");
            node.right = deleteRecursive(node.right, key, depth + 1);
            return node;

        } else {
            displayState("FOUND node to delete: " + node.key + " at " + node.address);

            if (node.left == null && node.right == null) {
                displayState("CASE 1: Leaf node → Simply remove");
                size--;
                return null;
            }

            if (node.left == null) {
                displayState("CASE 2a: No left child → Replace with right child");
                size--;
                return node.right;
            }

            if (node.right == null) {
                displayState("CASE 2b: No right child → Replace with left child");
                size--;
                return node.left;
            }

            displayState("CASE 3: Two children → Find in-order successor");

            Node successor = findMin(node.right);
            displayState("In-order successor: " + successor.key + " at " + successor.address);

            node.key = successor.key;
            displayState("Copied successor key to current node, now delete successor");

            node.right = deleteRecursive(node.right, successor.key, depth + 1);
            return node;
        }
    }

    private Node findMin(Node node) {
        while (node.left != null) {
            node = node.left;
        }
        return node;
    }

    public List<Integer> inorder() {
        List<Integer> result = new ArrayList<>();
        inorderRecursive(root, result);
        return result;
    }

    private void inorderRecursive(Node node, List<Integer> result) {
        if (node != null) {
            inorderRecursive(node.left, result);
            result.add(node.key);
            inorderRecursive(node.right, result);
        }
    }

    public void clear() {
        root = null;
        size = 0;
        comparisons = 0;
        operations = 0;
        heap.clear();
        callStack.clear();
        addressCounter = 0x1000;
    }

    public void runInteractiveMode() {
        System.out.println("═".repeat(70));
        System.out.println(" BST INTERACTIVE SIMULATOR ");
        System.out.println("═".repeat(70));
        System.out.println();
        System.out.println("Commands:");
        System.out.println("  insert <value>  - Insert a value into BST");
        System.out.println("  search <value>  - Search for a value");
        System.out.println("  delete <value>  - Delete a value");
        System.out.println("  inorder         - Display inorder traversal");
        System.out.println("  tree            - Display tree structure");
        System.out.println("  memory          - Display memory state");
        System.out.println("  speed <ms>      - Set animation delay (ms)");
        System.out.println("  step            - Toggle step-by-step mode");
        System.out.println("  demo            - Run demo sequence");
        System.out.println("  clear           - Clear tree");
        System.out.println("  quit            - Exit simulator");
        System.out.println();

        while (true) {
            System.out.print("bst> ");
            String input = scanner.nextLine().trim().toLowerCase();
            String[] parts = input.split("\\s+");

            if (parts.length == 0 || parts[0].isEmpty()) continue;

            String cmd = parts[0];

            try {
                switch (cmd) {
                    case "quit":
                    case "exit":
                        System.out.println("Goodbye!");
                        return;

                    case "insert":
                        if (parts.length > 1) {
                            int value = Integer.parseInt(parts[1]);
                            insert(value);
                        } else {
                            System.out.println("Usage: insert <value>");
                        }
                        break;

                    case "search":
                        if (parts.length > 1) {
                            int value = Integer.parseInt(parts[1]);
                            boolean found = search(value);
                            System.out.println("Result: " + (found ? "Found" : "Not found"));
                        } else {
                            System.out.println("Usage: search <value>");
                        }
                        break;

                    case "delete":
                        if (parts.length > 1) {
                            int value = Integer.parseInt(parts[1]);
                            delete(value);
                        } else {
                            System.out.println("Usage: delete <value>");
                        }
                        break;

                    case "inorder":
                        System.out.println("Inorder: " + inorder());
                        break;

                    case "tree":
                        displayTree();
                        break;

                    case "memory":
                        displayMemory();
                        break;

                    case "speed":
                        if (parts.length > 1) {
                            animationDelay = Integer.parseInt(parts[1]);
                            System.out.println("Animation delay set to " + animationDelay + "ms");
                        } else {
                            System.out.println("Current speed: " + animationDelay + "ms");
                        }
                        break;

                    case "step":
                        stepMode = !stepMode;
                        System.out.println("Step mode: " + (stepMode ? "ON" : "OFF"));
                        break;

                    case "demo":
                        runDemo();
                        break;

                    case "clear":
                        clear();
                        System.out.println("Tree cleared.");
                        break;

                    default:
                        System.out.println("Unknown command: " + cmd);
                }
            } catch (NumberFormatException e) {
                System.out.println("Error: Please enter a valid integer");
            } catch (Exception e) {
                System.out.println("Error: " + e.getMessage());
            }
        }
    }

    public void runDemo() {
        clear();
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" DEMO MODE - BST Operations ");
        System.out.println("═".repeat(70));
        System.out.println();
        System.out.println("This demo will:");
        System.out.println("1. Insert values: 5, 3, 7, 1, 4, 6, 8");
        System.out.println("2. Search for value 4");
        System.out.println("3. Delete value 5 (root with two children)");
        System.out.println();
        System.out.print("Press Enter to start demo...");
        scanner.nextLine();

        int[] values = {5, 3, 7, 1, 4, 6, 8};
        for (int value : values) {
            insert(value);
        }

        System.out.println("\n" + "═".repeat(70));
        System.out.println(" SEARCH DEMONSTRATION ");
        System.out.println("═".repeat(70));
        System.out.print("\nPress Enter to search for value 4...");
        scanner.nextLine();
        search(4);

        System.out.println("\n" + "═".repeat(70));
        System.out.println(" DELETE DEMONSTRATION ");
        System.out.println("═".repeat(70));
        System.out.print("\nPress Enter to delete root (5) - Case 3: Two children...");
        scanner.nextLine();
        delete(5);

        System.out.println("\n" + "═".repeat(70));
        System.out.println(" DEMO COMPLETED ");
        System.out.println("═".repeat(70));
        System.out.println("\nFinal tree structure:");
        displayTree();
    }

    public static void main(String[] args) {
        BSTSimulator sim = new BSTSimulator();

        if (args.length > 0 && args[0].equals("--demo")) {
            sim.runDemo();
        } else {
            sim.runInteractiveMode();
        }
    }
}
