import java.util.*;

public class SortingSimulator {
    
    private int[] array;
    private int[] originalArray;
    private int comparisons;
    private int swaps;
    private int animationDelay;
    private boolean stepMode;
    private Scanner scanner;

    public SortingSimulator() {
        this.array = new int[0];
        this.originalArray = new int[0];
        this.comparisons = 0;
        this.swaps = 0;
        this.animationDelay = 300;
        this.stepMode = false;
        this.scanner = new Scanner(System.in);
    }

    public void setArray(int[] arr) {
        this.array = arr.clone();
        this.originalArray = arr.clone();
        this.comparisons = 0;
        this.swaps = 0;
    }

    public void randomArray(int size, int max) {
        Random rand = new Random();
        int[] arr = new int[size];
        for (int i = 0; i < size; i++) {
            arr[i] = rand.nextInt(max) + 1;
        }
        setArray(arr);
    }

    public void reset() {
        this.array = originalArray.clone();
        this.comparisons = 0;
        this.swaps = 0;
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

    private void displayState(String message, Set<Integer> comparing, Set<Integer> swapping, 
                               int pivot, Set<Integer> sorted) {
        clearScreen();
        System.out.println("═".repeat(70));
        System.out.println(" SORTING SIMULATOR ");
        System.out.println("═".repeat(70));
        System.out.println();
        
        if (message != null) {
            System.out.println("📍 " + message);
            System.out.println();
        }

        displayArray(comparing, swapping, pivot, sorted);
        System.out.println();
        displayStats();
        
        waitForInput();
    }

    private void displayArray(Set<Integer> comparing, Set<Integer> swapping, 
                               int pivot, Set<Integer> sorted) {
        if (array.length == 0) {
            System.out.println("  (empty array)");
            return;
        }

        int max = Arrays.stream(array).max().orElse(1);
        int height = 15;
        
        for (int h = height; h >= 1; h--) {
            StringBuilder row = new StringBuilder("  ");
            for (int i = 0; i < array.length; i++) {
                int barHeight = (int) Math.ceil((double) array[i] / max * height);
                if (barHeight >= h) {
                    if (sorted != null && sorted.contains(i)) {
                        row.append(" ██ ");
                    } else if (swapping != null && swapping.contains(i)) {
                        row.append(" ▓▓ ");
                    } else if (comparing != null && comparing.contains(i)) {
                        row.append(" ░░ ");
                    } else if (pivot == i) {
                        row.append(" ▒▒ ");
                    } else {
                        row.append(" ▌▌ ");
                    }
                } else {
                    row.append("    ");
                }
            }
            System.out.println(row);
        }
        
        StringBuilder indices = new StringBuilder("  ");
        StringBuilder values = new StringBuilder("  ");
        for (int i = 0; i < array.length; i++) {
            indices.append(String.format("[%2d]", i));
            values.append(String.format(" %2d ", array[i]));
        }
        System.out.println("─".repeat(4 + array.length * 4));
        System.out.println(values);
        System.out.println(indices);
        
        System.out.println();
        System.out.println("Legend: ▌▌=Normal  ░░=Comparing  ▓▓=Swapping  ▒▒=Pivot  ██=Sorted");
    }

    private void displayStats() {
        System.out.println("─".repeat(50));
        System.out.printf("Comparisons: %d | Swaps: %d | Array size: %d%n", 
                comparisons, swaps, array.length);
        System.out.println("─".repeat(50));
    }

    private void swap(int i, int j) {
        int temp = array[i];
        array[i] = array[j];
        array[j] = temp;
        swaps++;
    }

    public void quickSort() {
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" QUICK SORT ");
        System.out.println("═".repeat(70));
        
        displayState("Starting Quick Sort", null, null, -1, null);
        quickSortHelper(0, array.length - 1, new HashSet<>());
        
        Set<Integer> allSorted = new HashSet<>();
        for (int i = 0; i < array.length; i++) allSorted.add(i);
        displayState("Quick Sort complete!", null, null, -1, allSorted);
    }

    private void quickSortHelper(int low, int high, Set<Integer> sorted) {
        if (low < high) {
            int pivotIdx = partition(low, high, sorted);
            sorted.add(pivotIdx);
            quickSortHelper(low, pivotIdx - 1, sorted);
            quickSortHelper(pivotIdx + 1, high, sorted);
        } else if (low == high) {
            sorted.add(low);
        }
    }

    private int partition(int low, int high, Set<Integer> sorted) {
        int pivot = array[high];
        displayState(String.format("Partition [%d..%d], pivot = %d", low, high, pivot), 
                     null, null, high, sorted);

        int i = low - 1;

        for (int j = low; j < high; j++) {
            comparisons++;
            Set<Integer> comparing = new HashSet<>(Arrays.asList(j, high));
            displayState(String.format("Compare arr[%d]=%d with pivot %d", j, array[j], pivot), 
                        comparing, null, high, sorted);

            if (array[j] < pivot) {
                i++;
                if (i != j) {
                    Set<Integer> swapping = new HashSet<>(Arrays.asList(i, j));
                    displayState(String.format("Swap arr[%d]=%d <-> arr[%d]=%d", i, array[i], j, array[j]),
                                null, swapping, high, sorted);
                    swap(i, j);
                }
            }
        }

        if (i + 1 != high) {
            Set<Integer> swapping = new HashSet<>(Arrays.asList(i + 1, high));
            displayState(String.format("Place pivot: Swap arr[%d]=%d <-> arr[%d]=%d", 
                        i + 1, array[i + 1], high, pivot), null, swapping, -1, sorted);
            swap(i + 1, high);
        }

        return i + 1;
    }

    public void mergeSort() {
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" MERGE SORT ");
        System.out.println("═".repeat(70));
        
        displayState("Starting Merge Sort", null, null, -1, null);
        mergeSortHelper(0, array.length - 1);
        
        Set<Integer> allSorted = new HashSet<>();
        for (int i = 0; i < array.length; i++) allSorted.add(i);
        displayState("Merge Sort complete!", null, null, -1, allSorted);
    }

    private void mergeSortHelper(int left, int right) {
        if (left < right) {
            int mid = left + (right - left) / 2;
            mergeSortHelper(left, mid);
            mergeSortHelper(mid + 1, right);
            merge(left, mid, right);
        }
    }

    private void merge(int left, int mid, int right) {
        Set<Integer> merging = new HashSet<>();
        for (int i = left; i <= right; i++) merging.add(i);
        
        displayState(String.format("Merge [%d..%d] and [%d..%d]", left, mid, mid + 1, right),
                    merging, null, -1, null);

        int[] leftArr = Arrays.copyOfRange(array, left, mid + 1);
        int[] rightArr = Arrays.copyOfRange(array, mid + 1, right + 1);

        int i = 0, j = 0, k = left;

        while (i < leftArr.length && j < rightArr.length) {
            comparisons++;
            if (leftArr[i] <= rightArr[j]) {
                array[k] = leftArr[i];
                i++;
            } else {
                array[k] = rightArr[j];
                j++;
                swaps++;
            }
            k++;
            displayState(String.format("Merging: placed %d at index %d", array[k - 1], k - 1),
                        merging, null, -1, null);
        }

        while (i < leftArr.length) {
            array[k] = leftArr[i];
            i++;
            k++;
        }

        while (j < rightArr.length) {
            array[k] = rightArr[j];
            j++;
            k++;
        }
    }

    public void heapSort() {
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" HEAP SORT ");
        System.out.println("═".repeat(70));
        
        displayState("Starting Heap Sort - Building max heap", null, null, -1, null);
        
        int n = array.length;
        
        for (int i = n / 2 - 1; i >= 0; i--) {
            heapify(n, i, new HashSet<>());
        }
        displayState("Max heap built!", null, null, -1, null);

        Set<Integer> sorted = new HashSet<>();
        for (int i = n - 1; i > 0; i--) {
            Set<Integer> swapping = new HashSet<>(Arrays.asList(0, i));
            displayState(String.format("Swap root %d with arr[%d]=%d", array[0], i, array[i]),
                        null, swapping, -1, sorted);
            swap(0, i);
            sorted.add(i);
            heapify(i, 0, sorted);
        }
        sorted.add(0);
        
        displayState("Heap Sort complete!", null, null, -1, sorted);
    }

    private void heapify(int n, int i, Set<Integer> sorted) {
        int largest = i;
        int left = 2 * i + 1;
        int right = 2 * i + 2;

        if (left < n) {
            comparisons++;
            Set<Integer> comparing = new HashSet<>(Arrays.asList(largest, left));
            displayState(String.format("Heapify: Compare arr[%d]=%d with arr[%d]=%d", 
                        largest, array[largest], left, array[left]), comparing, null, -1, sorted);
            if (array[left] > array[largest]) {
                largest = left;
            }
        }

        if (right < n) {
            comparisons++;
            Set<Integer> comparing = new HashSet<>(Arrays.asList(largest, right));
            displayState(String.format("Heapify: Compare arr[%d]=%d with arr[%d]=%d", 
                        largest, array[largest], right, array[right]), comparing, null, -1, sorted);
            if (array[right] > array[largest]) {
                largest = right;
            }
        }

        if (largest != i) {
            Set<Integer> swapping = new HashSet<>(Arrays.asList(i, largest));
            displayState(String.format("Heapify: Swap arr[%d]=%d <-> arr[%d]=%d", 
                        i, array[i], largest, array[largest]), null, swapping, -1, sorted);
            swap(i, largest);
            heapify(n, largest, sorted);
        }
    }

    public void runInteractiveMode() {
        System.out.println("═".repeat(70));
        System.out.println(" SORTING ALGORITHMS SIMULATOR ");
        System.out.println("═".repeat(70));
        System.out.println();
        System.out.println("Commands:");
        System.out.println("  set <values>    - Set array (comma-separated)");
        System.out.println("  random [n] [m]  - Random array of n elements (1 to m)");
        System.out.println("  quicksort       - Run Quick Sort");
        System.out.println("  mergesort       - Run Merge Sort");
        System.out.println("  heapsort        - Run Heap Sort");
        System.out.println("  display         - Show current array");
        System.out.println("  reset           - Reset to original array");
        System.out.println("  speed <ms>      - Set animation delay");
        System.out.println("  step            - Toggle step mode");
        System.out.println("  demo            - Run demo");
        System.out.println("  quit            - Exit");
        System.out.println();

        randomArray(10, 50);
        System.out.println("Generated random array: " + Arrays.toString(array));

        while (true) {
            System.out.print("sort> ");
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

                    case "set":
                        if (parts.length > 1) {
                            String[] values = input.substring(4).split("[,\\s]+");
                            int[] arr = Arrays.stream(values)
                                    .filter(s -> !s.isEmpty())
                                    .mapToInt(Integer::parseInt)
                                    .toArray();
                            setArray(arr);
                            System.out.println("Array set: " + Arrays.toString(array));
                        }
                        break;

                    case "random":
                        int n = parts.length > 1 ? Integer.parseInt(parts[1]) : 10;
                        int m = parts.length > 2 ? Integer.parseInt(parts[2]) : 50;
                        randomArray(n, m);
                        System.out.println("Random array: " + Arrays.toString(array));
                        break;

                    case "quicksort":
                        reset();
                        quickSort();
                        System.out.println("Sorted: " + Arrays.toString(array));
                        break;

                    case "mergesort":
                        reset();
                        mergeSort();
                        System.out.println("Sorted: " + Arrays.toString(array));
                        break;

                    case "heapsort":
                        reset();
                        heapSort();
                        System.out.println("Sorted: " + Arrays.toString(array));
                        break;

                    case "display":
                        displayState("Current array state", null, null, -1, null);
                        System.out.println("Array: " + Arrays.toString(array));
                        break;

                    case "reset":
                        reset();
                        System.out.println("Reset to: " + Arrays.toString(array));
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

                    default:
                        System.out.println("Unknown command: " + cmd);
                }
            } catch (NumberFormatException e) {
                System.out.println("Error: Please enter valid integers");
            }
        }
    }

    public void runDemo() {
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" DEMO - Sorting Algorithms Comparison ");
        System.out.println("═".repeat(70));
        System.out.println();
        
        setArray(new int[]{38, 27, 43, 3, 9, 82, 10});
        System.out.println("Demo array: " + Arrays.toString(array));
        
        System.out.println("\n1. Quick Sort");
        System.out.print("Press Enter to start...");
        scanner.nextLine();
        reset();
        quickSort();
        int qComp = comparisons, qSwap = swaps;
        
        System.out.println("\n2. Merge Sort");
        System.out.print("Press Enter to start...");
        scanner.nextLine();
        reset();
        mergeSort();
        int mComp = comparisons, mSwap = swaps;
        
        System.out.println("\n3. Heap Sort");
        System.out.print("Press Enter to start...");
        scanner.nextLine();
        reset();
        heapSort();
        int hComp = comparisons, hSwap = swaps;

        System.out.println("\n" + "═".repeat(70));
        System.out.println(" COMPARISON RESULTS ");
        System.out.println("═".repeat(70));
        System.out.printf("%-12s | Comparisons | Swaps%n", "Algorithm");
        System.out.println("─".repeat(35));
        System.out.printf("%-12s | %11d | %5d%n", "Quick Sort", qComp, qSwap);
        System.out.printf("%-12s | %11d | %5d%n", "Merge Sort", mComp, mSwap);
        System.out.printf("%-12s | %11d | %5d%n", "Heap Sort", hComp, hSwap);
    }

    public static void main(String[] args) {
        SortingSimulator sim = new SortingSimulator();

        if (args.length > 0 && args[0].equals("--demo")) {
            sim.runDemo();
        } else {
            sim.runInteractiveMode();
        }
    }
}
