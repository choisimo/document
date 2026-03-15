import java.util.*;

public class HashTableSimulator {
    
    private Integer[] table;
    private int size;
    private int count;
    private int collisions;
    private int animationDelay;
    private boolean stepMode;
    private Scanner scanner;

    public HashTableSimulator(int size) {
        this.size = size;
        this.table = new Integer[size];
        this.count = 0;
        this.collisions = 0;
        this.animationDelay = 500;
        this.stepMode = false;
        this.scanner = new Scanner(System.in);
    }

    public HashTableSimulator() {
        this(11);
    }

    private int hash(int key) {
        return ((key % size) + size) % size;
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

    private void displayState(String message, int highlightIndex, String highlightType) {
        clearScreen();
        System.out.println("═".repeat(70));
        System.out.println(" HASH TABLE SIMULATOR - Linear Probing ".toUpperCase());
        System.out.println("═".repeat(70));
        System.out.println();
        
        if (message != null && !message.isEmpty()) {
            System.out.println("📍 " + message);
            System.out.println();
        }

        displayTable(highlightIndex, highlightType);
        System.out.println();
        displayStats();
        
        waitForInput();
    }

    private void displayTable(int highlightIndex, String highlightType) {
        System.out.println("┌" + "─────────┬".repeat(size - 1) + "─────────┐");
        
        StringBuilder indexRow = new StringBuilder("│");
        StringBuilder valueRow = new StringBuilder("│");
        
        for (int i = 0; i < size; i++) {
            String indexStr = String.format(" idx:%-3d ", i);
            String valueStr;
            
            if (table[i] == null) {
                valueStr = "    -    ";
            } else {
                valueStr = String.format("   %3d   ", table[i]);
            }
            
            if (i == highlightIndex) {
                switch (highlightType) {
                    case "hash":
                        indexStr = " [" + String.format("%-3d", i) + "] H ";
                        break;
                    case "collision":
                        valueStr = " *" + (table[i] != null ? String.format("%3d", table[i]) : " - ") + "* C ";
                        break;
                    case "insert":
                        valueStr = " +" + String.format("%3d", table[i]) + "+ I ";
                        break;
                    case "found":
                        valueStr = " >" + String.format("%3d", table[i]) + "< F ";
                        break;
                    case "delete":
                        valueStr = " x" + (table[i] != null ? String.format("%3d", table[i]) : " - ") + "x D ";
                        break;
                    case "compare":
                        valueStr = " ?" + (table[i] != null ? String.format("%3d", table[i]) : " - ") + "? ? ";
                        break;
                }
            }
            
            indexRow.append(indexStr).append("│");
            valueRow.append(valueStr).append("│");
        }
        
        System.out.println(indexRow);
        System.out.println("├" + "─────────┼".repeat(size - 1) + "─────────┤");
        System.out.println(valueRow);
        System.out.println("└" + "─────────┴".repeat(size - 1) + "─────────┘");
        
        System.out.println();
        System.out.println("Legend: H=Hash, C=Collision, I=Insert, F=Found, D=Delete, ?=Compare");
    }

    private void displayStats() {
        System.out.println("─".repeat(50));
        System.out.printf("Elements: %d/%d | Load Factor: %.1f%% | Collisions: %d%n",
                count, size, (count * 100.0 / size), collisions);
        System.out.println("─".repeat(50));
    }

    public boolean insert(int key) {
        if (count >= size) {
            System.out.println("Error: Table is full!");
            return false;
        }

        System.out.println("\n" + "═".repeat(70));
        System.out.println(" INSERT(" + key + ") ");
        System.out.println("═".repeat(70));

        int hashValue = hash(key);
        displayState(String.format("hash(%d) = %d mod %d = %d", key, key, size, hashValue), hashValue, "hash");

        int idx = hashValue;
        int probeCount = 0;

        while (table[idx] != null) {
            if (table[idx] == key) {
                displayState("Duplicate key found at index " + idx + "! Ignoring.", idx, "found");
                return false;
            }
            
            probeCount++;
            collisions++;
            displayState(String.format("Collision at index %d (occupied by %d). Linear probing...", idx, table[idx]), idx, "collision");
            
            idx = (idx + 1) % size;
            
            if (idx == hashValue) {
                System.out.println("Error: Table is full (wrapped around)!");
                return false;
            }
        }

        table[idx] = key;
        count++;
        
        String msg = String.format("Inserted %d at index %d", key, idx);
        if (probeCount > 0) {
            msg += String.format(" after %d collision(s)", probeCount);
        }
        displayState(msg, idx, "insert");
        
        return true;
    }

    public int search(int key) {
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" SEARCH(" + key + ") ");
        System.out.println("═".repeat(70));

        int hashValue = hash(key);
        displayState(String.format("hash(%d) = %d mod %d = %d", key, key, size, hashValue), hashValue, "hash");

        int idx = hashValue;
        int comparisons = 0;

        while (table[idx] != null) {
            comparisons++;
            displayState(String.format("Checking index %d: value = %s", idx, table[idx]), idx, "compare");

            if (table[idx] == key) {
                displayState(String.format("FOUND %d at index %d after %d comparison(s)", key, idx, comparisons), idx, "found");
                return idx;
            }

            idx = (idx + 1) % size;
            if (idx == hashValue) break;
        }

        displayState(key + " NOT FOUND in table", -1, "");
        return -1;
    }

    public boolean delete(int key) {
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" DELETE(" + key + ") ");
        System.out.println("═".repeat(70));

        int idx = search(key);
        if (idx == -1) {
            return false;
        }

        displayState("Deleting " + key + " from index " + idx, idx, "delete");
        table[idx] = null;
        count--;
        
        rehashCluster(idx);
        
        displayState("Delete completed!", -1, "");
        return true;
    }

    private void rehashCluster(int deletedIdx) {
        int idx = (deletedIdx + 1) % size;
        
        while (table[idx] != null) {
            int value = table[idx];
            table[idx] = null;
            count--;
            
            int newHash = hash(value);
            int newIdx = newHash;
            while (table[newIdx] != null) {
                newIdx = (newIdx + 1) % size;
            }
            table[newIdx] = value;
            count++;
            
            idx = (idx + 1) % size;
            if (idx == deletedIdx) break;
        }
    }

    public void clear() {
        Arrays.fill(table, null);
        count = 0;
        collisions = 0;
    }

    public void resize(int newSize) {
        Integer[] oldTable = table;
        this.size = newSize;
        this.table = new Integer[newSize];
        this.count = 0;
        this.collisions = 0;
        
        for (Integer value : oldTable) {
            if (value != null) {
                int idx = hash(value);
                while (table[idx] != null) {
                    idx = (idx + 1) % size;
                }
                table[idx] = value;
                count++;
            }
        }
    }

    public void runInteractiveMode() {
        System.out.println("═".repeat(70));
        System.out.println(" HASH TABLE INTERACTIVE SIMULATOR ");
        System.out.println("═".repeat(70));
        System.out.println();
        System.out.println("Commands:");
        System.out.println("  insert <value>  - Insert a value");
        System.out.println("  search <value>  - Search for a value");
        System.out.println("  delete <value>  - Delete a value");
        System.out.println("  display         - Show table state");
        System.out.println("  stats           - Show statistics");
        System.out.println("  resize <size>   - Resize table");
        System.out.println("  speed <ms>      - Set animation delay");
        System.out.println("  step            - Toggle step mode");
        System.out.println("  demo            - Run demo");
        System.out.println("  clear           - Clear table");
        System.out.println("  quit            - Exit");
        System.out.println();

        while (true) {
            System.out.print("hash> ");
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

                    case "search":
                        if (parts.length > 1) {
                            int result = search(Integer.parseInt(parts[1]));
                            System.out.println("Result: " + (result >= 0 ? "Found at index " + result : "Not found"));
                        } else {
                            System.out.println("Usage: search <value>");
                        }
                        break;

                    case "delete":
                        if (parts.length > 1) {
                            delete(Integer.parseInt(parts[1]));
                        } else {
                            System.out.println("Usage: delete <value>");
                        }
                        break;

                    case "display":
                        displayState("Current table state", -1, "");
                        break;

                    case "stats":
                        displayStats();
                        break;

                    case "resize":
                        if (parts.length > 1) {
                            resize(Integer.parseInt(parts[1]));
                            System.out.println("Resized to " + size);
                        }
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
                        System.out.println("Table cleared.");
                        break;

                    default:
                        System.out.println("Unknown command: " + cmd);
                }
            } catch (NumberFormatException e) {
                System.out.println("Error: Please enter a valid integer");
            }
        }
    }

    public void runDemo() {
        clear();
        System.out.println("\n" + "═".repeat(70));
        System.out.println(" DEMO - Hash Table with Linear Probing ");
        System.out.println("═".repeat(70));
        System.out.println();
        System.out.println("Inserting values that cause collisions: 15, 26, 37, 48, 59");
        System.out.println("(All hash to index 4 with table size 11)");
        System.out.println();
        System.out.print("Press Enter to start...");
        scanner.nextLine();

        int[] values = {15, 26, 37, 48, 59};
        for (int v : values) {
            insert(v);
        }

        System.out.println("\nSearching for 37...");
        System.out.print("Press Enter to continue...");
        scanner.nextLine();
        search(37);

        System.out.println("\nDeleting 26...");
        System.out.print("Press Enter to continue...");
        scanner.nextLine();
        delete(26);

        System.out.println("\n" + "═".repeat(70));
        System.out.println(" DEMO COMPLETED ");
        System.out.println("═".repeat(70));
    }

    public static void main(String[] args) {
        HashTableSimulator sim = new HashTableSimulator();

        if (args.length > 0 && args[0].equals("--demo")) {
            sim.runDemo();
        } else {
            sim.runInteractiveMode();
        }
    }
}
