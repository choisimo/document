import java.util.*;

public class HeapSimulator {
    
    private List<Integer> heap;
    private boolean isMaxHeap;
    private int animationDelay;
    private boolean stepMode;
    private Scanner scanner;

    public HeapSimulator() {
        this.heap = new ArrayList<>();
        this.isMaxHeap = true;
        this.animationDelay = 500;
        this.stepMode = false;
        this.scanner = new Scanner(System.in);
    }

    private int parent(int i) { return (i - 1) / 2; }
    private int left(int i) { return 2 * i + 1; }
    private int right(int i) { return 2 * i + 2; }

    private boolean compare(int a, int b) {
        return isMaxHeap ? a > b : a < b;
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

    private void displayState(String message, Set<Integer> highlight, Set<Integer> comparing, Set<Integer> swapping) {
        clearScreen();
        System.out.println("═".repeat(70));
        System.out.println(" HEAP SIMULATOR - " + (isMaxHeap ? "MAX" : "MIN") + " HEAP ");
        System.out.println("═".repeat(70));
        System.out.println();
        
        if (message != null) {
            System.out.println("📍 " + message);
            System.out.println();
        }

        displayTree(highlight, comparing, swapping);
        System.out.println();
        displayArray(highlight, comparing, swapping);
        
        waitForInput();
    }

    private void displayTree(Set<Integer> highlight, Set<Integer> comparing, Set<Integer> swapping) {
        if (heap.isEmpty()) {
            System.out.println("  (empty heap)");
            return;
        }

        int height = (int) Math.ceil(Math.log(heap.size() + 1) / Math.log(2));
        int maxWidth = (int) Math.pow(2, height) * 4;
        
        System.out.println("─".repeat(70));
        System.out.println(" TREE VIEW ");
        System.out.println("─".repeat(70));

        Queue<Integer> queue = new LinkedList<>();
        queue.offer(0);
        int level = 0;
        
        while (!queue.isEmpty() && level < height) {
            int levelSize = queue.size();
            int spacing = maxWidth / (int) Math.pow(2, level + 1);
            StringBuilder line = new StringBuilder();
            StringBuilder connectors = new StringBuilder();
            
            line.append(" ".repeat(spacing / 2));
            connectors.append(" ".repeat(spacing / 2));
            
            for (int i = 0; i < levelSize; i++) {
                int idx = queue.poll();
                
                if (idx < heap.size()) {
                    String nodeStr;
                    if (swapping != null && swapping.contains(idx)) {
                        nodeStr = String.format("[%d]!", heap.get(idx));
                    } else if (comparing != null && comparing.contains(idx)) {
                        nodeStr = String.format("(%d)?", heap.get(idx));
                    } else if (highlight != null && highlight.contains(idx)) {
                        nodeStr = String.format("<%d>*", heap.get(idx));
                    } else {
                        nodeStr = String.format(" %d  ", heap.get(idx));
                    }
                    
                    line.append(String.format("%-4s", nodeStr));
                    
                    int leftIdx = left(idx);
                    int rightIdx = right(idx);
                    
                    if (leftIdx < heap.size()) {
                        connectors.append("/");
                    } else {
                        connectors.append(" ");
                    }
                    connectors.append("  ");
                    if (rightIdx < heap.size()) {
                        connectors.append("\\");
                    } else {
                        connectors.append(" ");
                    }
                    
                    queue.offer(leftIdx);
                    queue.offer(rightIdx);
                } else {
                    line.append("    ");
                    connectors.append("    ");
                    queue.offer(heap.size());
                    queue.offer(heap.size());
                }
                
                if (i < levelSize - 1) {
                    line.append(" ".repeat(spacing - 4));
                    connectors.append(" ".repeat(spacing - 4));
                }
            }
            
            System.out.println(line);
            if (level < height - 1) {
                System.out.println(connectors);
            }
            level++;
        }
    }

    private void displayArray(Set<Integer> highlight, Set<Integer> comparing, Set<Integer> swapping) {
        System.out.println("─".repeat(70));
        System.out.println(" ARRAY VIEW ");
        System.out.println("─".repeat(70));
        
        if (heap.isEmpty()) {
            System.out.println("  []");
            return;
        }

        StringBuilder indices = new StringBuilder("Index: ");
        StringBuilder values = new StringBuilder("Value: ");
        StringBuilder markers = new StringBuilder("       ");
        
        for (int i = 0; i < heap.size(); i++) {
            indices.append(String.format("[%2d] ", i));
            values.append(String.format(" %2d  ", heap.get(i)));
            
            if (swapping != null && swapping.contains(i)) {
                markers.append("  !  ");
            } else if (comparing != null && comparing.contains(i)) {
                markers.append("  ?  ");
            } else if (highlight != null && highlight.contains(i)) {
                markers.append("  *  ");
            } else {
                markers.append("     ");
            }
        }
        
        System.out.println(indices);
        System.out.println(values);
        System.out.println(markers);
        System.out.println();
        System.out.println("Legend: * = Highlight, ? = Comparing, ! = Swapping");
    }

    private void swap(int i, int j) {
        int temp = heap.get(i);
        heap.set(i, heap.get(j));
        heap.set(j, temp);
    }

    public void insert(int value) {
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" INSERT(" + value + ") ");
        System.out.println("═".repeat(70));

        heap.add(value);
        int idx = heap.size() - 1;
        
        Set<Integer> highlight = new HashSet<>(Collections.singletonList(idx));
        displayState("Inserted " + value + " at index " + idx, highlight, null, null);

        while (idx > 0 && compare(heap.get(idx), heap.get(parent(idx)))) {
            int parentIdx = parent(idx);
            
            Set<Integer> comparing = new HashSet<>(Arrays.asList(idx, parentIdx));
            displayState(String.format("%d > parent %d at index %d", 
                        heap.get(idx), heap.get(parentIdx), parentIdx), null, comparing, null);
            
            Set<Integer> swapping = new HashSet<>(Arrays.asList(idx, parentIdx));
            displayState(String.format("Swap arr[%d]=%d <-> arr[%d]=%d", 
                        idx, heap.get(idx), parentIdx, heap.get(parentIdx)), null, null, swapping);
            
            swap(idx, parentIdx);
            idx = parentIdx;
        }
        
        highlight = new HashSet<>(Collections.singletonList(idx));
        displayState("Insert complete! " + value + " is now at index " + idx, highlight, null, null);
    }

    public Integer extract() {
        if (heap.isEmpty()) {
            System.out.println("Heap is empty!");
            return null;
        }

        System.out.println("\n" + "═".repeat(70));
        System.out.println(" EXTRACT " + (isMaxHeap ? "MAX" : "MIN") + " ");
        System.out.println("═".repeat(70));

        int extracted = heap.get(0);
        Set<Integer> highlight = new HashSet<>(Collections.singletonList(0));
        displayState("Extracting root: " + extracted, highlight, null, null);

        if (heap.size() == 1) {
            heap.remove(0);
            displayState("Heap is now empty", null, null, null);
            return extracted;
        }

        heap.set(0, heap.remove(heap.size() - 1));
        displayState("Moved last element " + heap.get(0) + " to root", highlight, null, null);

        heapifyDown(0);

        displayState("Extract complete! Removed " + extracted, null, null, null);
        return extracted;
    }

    private void heapifyDown(int idx) {
        int n = heap.size();

        while (true) {
            int target = idx;
            int leftIdx = left(idx);
            int rightIdx = right(idx);

            if (leftIdx < n && compare(heap.get(leftIdx), heap.get(target))) {
                target = leftIdx;
            }
            if (rightIdx < n && compare(heap.get(rightIdx), heap.get(target))) {
                target = rightIdx;
            }

            if (target == idx) break;

            Set<Integer> comparing = new HashSet<>(Arrays.asList(idx, target));
            displayState(String.format("Heapify: Compare arr[%d]=%d with arr[%d]=%d", 
                        idx, heap.get(idx), target, heap.get(target)), null, comparing, null);

            Set<Integer> swapping = new HashSet<>(Arrays.asList(idx, target));
            displayState(String.format("Heapify: Swap arr[%d]=%d <-> arr[%d]=%d", 
                        idx, heap.get(idx), target, heap.get(target)), null, null, swapping);
            
            swap(idx, target);
            idx = target;
        }
    }

    public void buildHeap(int[] arr) {
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" BUILD HEAP ");
        System.out.println("═".repeat(70));

        heap.clear();
        for (int val : arr) {
            heap.add(val);
        }
        
        displayState("Initial array loaded: " + heap, null, null, null);

        for (int i = heap.size() / 2 - 1; i >= 0; i--) {
            Set<Integer> highlight = new HashSet<>(Collections.singletonList(i));
            displayState("Heapifying from index " + i, highlight, null, null);
            heapifyDown(i);
        }

        displayState("Build complete! Heap: " + heap, null, null, null);
    }

    public Integer peek() {
        if (heap.isEmpty()) {
            System.out.println("Heap is empty!");
            return null;
        }
        Set<Integer> highlight = new HashSet<>(Collections.singletonList(0));
        displayState("Top element: " + heap.get(0), highlight, null, null);
        return heap.get(0);
    }

    public void clear() {
        heap.clear();
    }

    public void setHeapType(boolean maxHeap) {
        this.isMaxHeap = maxHeap;
        if (!heap.isEmpty()) {
            int[] arr = heap.stream().mapToInt(Integer::intValue).toArray();
            buildHeap(arr);
        }
    }

    public void runInteractiveMode() {
        System.out.println("═".repeat(70));
        System.out.println(" HEAP / PRIORITY QUEUE SIMULATOR ");
        System.out.println("═".repeat(70));
        System.out.println();
        System.out.println("Commands:");
        System.out.println("  insert <value>  - Insert a value");
        System.out.println("  extract         - Extract max/min");
        System.out.println("  peek            - View top element");
        System.out.println("  build <values>  - Build heap from values");
        System.out.println("  type <max/min>  - Switch heap type");
        System.out.println("  display         - Show heap state");
        System.out.println("  speed <ms>      - Set animation delay");
        System.out.println("  step            - Toggle step mode");
        System.out.println("  demo            - Run demo");
        System.out.println("  clear           - Clear heap");
        System.out.println("  quit            - Exit");
        System.out.println();

        while (true) {
            System.out.print("heap> ");
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
                            insert(Integer.parseInt(parts[1]));
                        } else {
                            System.out.println("Usage: insert <value>");
                        }
                        break;

                    case "extract":
                        Integer extracted = extract();
                        if (extracted != null) {
                            System.out.println("Extracted: " + extracted);
                        }
                        break;

                    case "peek":
                        Integer top = peek();
                        if (top != null) {
                            System.out.println("Top: " + top);
                        }
                        break;

                    case "build":
                        if (parts.length > 1) {
                            String[] values = input.substring(6).split("[,\\s]+");
                            int[] arr = Arrays.stream(values)
                                    .filter(s -> !s.isEmpty())
                                    .mapToInt(Integer::parseInt)
                                    .toArray();
                            buildHeap(arr);
                        } else {
                            System.out.println("Usage: build <values>");
                        }
                        break;

                    case "type":
                        if (parts.length > 1) {
                            setHeapType(parts[1].equals("max"));
                            System.out.println("Switched to " + (isMaxHeap ? "Max" : "Min") + " Heap");
                        }
                        break;

                    case "display":
                        displayState("Current heap state", null, null, null);
                        break;

                    case "speed":
                        if (parts.length > 1) {
                            animationDelay = Integer.parseInt(parts[1]);
                            System.out.println("Delay set to " + animationDelay + "ms");
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
                        System.out.println("Heap cleared.");
                        break;

                    default:
                        System.out.println("Unknown command: " + cmd);
                }
            } catch (NumberFormatException e) {
                System.out.println("Error: Please enter valid integers");
            }
        }
    }

    public void runDemo() {
        clear();
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" DEMO - Heap Operations ");
        System.out.println("═".repeat(70));
        System.out.println();
        System.out.println("Demo will:");
        System.out.println("1. Insert: 30, 20, 40, 10, 50, 25, 35");
        System.out.println("2. Extract top 3 elements");
        System.out.println();
        System.out.print("Press Enter to start...");
        scanner.nextLine();

        int[] values = {30, 20, 40, 10, 50, 25, 35};
        for (int v : values) {
            insert(v);
        }

        System.out.println("\nExtracting top 3 elements...");
        System.out.print("Press Enter to continue...");
        scanner.nextLine();

        for (int i = 0; i < 3; i++) {
            Integer val = extract();
            System.out.println("Extracted: " + val);
        }

        System.out.println("\n" + "═".repeat(70));
        System.out.println(" DEMO COMPLETED ");
        System.out.println("═".repeat(70));
    }

    public static void main(String[] args) {
        HeapSimulator sim = new HeapSimulator();

        if (args.length > 0 && args[0].equals("--demo")) {
            sim.runDemo();
        } else {
            sim.runInteractiveMode();
        }
    }
}
