#!/usr/bin/env python3
"""
Hash Table (Linear Probing) Interactive Simulator
메모리와 충돌 해결 과정을 시각화하며 해시 테이블의 동작을 학습합니다.
"""

import sys
import os
import time


class HashTableSimulator:
    def __init__(self, initial_size=11):
        self.table_size = initial_size
        self.table = [None] * self.table_size
        self.count = 0
        self.total_collisions = 0
        self.step_mode = False
        self.animation_delay = 0.3
        self.operation_log = []

    def hash_function(self, key):
        return key % self.table_size

    def is_prime(self, n):
        if n < 2:
            return False
        if n == 2:
            return True
        if n % 2 == 0:
            return False
        for i in range(3, int(n**0.5) + 1, 2):
            if n % i == 0:
                return False
        return True

    def next_prime(self, n):
        if n <= 2:
            return 2
        candidate = n if n % 2 != 0 else n + 1
        while not self.is_prime(candidate):
            candidate += 2
        return candidate

    def clear_screen(self):
        os.system("clear" if os.name != "nt" else "cls")

    def render_table(self, highlight_idx=None, probing_path=None):
        probing_path = probing_path or []

        print("\n" + "=" * 70)
        print(" HASH TABLE STATE ".center(70))
        print("=" * 70)

        print("\n┌" + "─" * 8 + "┬" + "─" * 12 + "┬" + "─" * 45 + "┐")
        print("│ Index  │   Value    │ Status                                      │")
        print("├" + "─" * 8 + "┼" + "─" * 12 + "┼" + "─" * 45 + "┤")

        for i in range(self.table_size):
            value_str = str(self.table[i]) if self.table[i] is not None else "(empty)"

            if i == highlight_idx:
                status = "◀── INSERTING HERE"
                marker = "→"
            elif i in probing_path:
                status = f"collision #{probing_path.index(i) + 1}"
                marker = "○"
            elif self.table[i] is not None:
                status = "occupied"
                marker = "●"
            else:
                status = "empty"
                marker = " "

            print(f"│ {marker} {i:4d} │ {value_str:^10} │ {status:<43} │")

        print("└" + "─" * 8 + "┴" + "─" * 12 + "┴" + "─" * 45 + "┘")

        load_factor = self.count / self.table_size
        print(f"\n📊 Statistics:")
        print(f"   • Table Size: {self.table_size}")
        print(f"   • Elements: {self.count}")
        print(f"   • Load Factor: {load_factor:.2%}")
        print(f"   • Total Collisions: {self.total_collisions}")

    def render_hash_calculation(self, key, hash_value):
        print("\n" + "─" * 70)
        print(" HASH CALCULATION ".center(70))
        print("─" * 70)
        print(f"""
    ┌─────────────────────────────────────────────┐
    │  hash({key}) = {key} mod {self.table_size}              
    │           = {hash_value}                    
    └─────────────────────────────────────────────┘
        """)

    def render_linear_probing(self, key, start_idx, probing_path, final_idx):
        print("\n" + "─" * 70)
        print(" LINEAR PROBING PROCESS ".center(70))
        print("─" * 70)

        if not probing_path:
            print(f"\n   ✅ Index {start_idx} is empty! No collision.")
        else:
            print(f"\n   ⚠️ Collision detected at index {start_idx}!")
            print(f"\n   Probing sequence:")
            for i, idx in enumerate(probing_path):
                existing_val = self.table[idx] if idx != final_idx else None
                print(
                    f"   {i + 1}. Index {idx}: {'OCCUPIED by ' + str(existing_val) if existing_val else 'EMPTY ✓'}"
                )
            print(f"\n   → Final position: Index {final_idx}")

    def insert(self, key):
        if self.count >= self.table_size:
            print("❌ Error: Table is full!")
            return False

        hash_value = self.hash_function(key)
        idx = hash_value
        probing_path = []
        collisions = 0

        self.clear_screen()
        print("=" * 70)
        print(f" INSERT({key}) - Starting ".center(70))
        print("=" * 70)

        self.render_hash_calculation(key, hash_value)

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        while self.table[idx] is not None:
            probing_path.append(idx)
            collisions += 1
            self.total_collisions += 1

            self.clear_screen()
            print("=" * 70)
            print(f" INSERT({key}) - Probing ".center(70))
            print("=" * 70)

            print(f"\n⚠️ Collision at index {idx} (occupied by {self.table[idx]})")
            print(
                f"   Trying next: ({idx} + 1) mod {self.table_size} = {(idx + 1) % self.table_size}"
            )

            self.render_table(probing_path=probing_path)

            if self.step_mode:
                input("\nPress Enter to continue...")
            else:
                time.sleep(self.animation_delay)

            idx = (idx + 1) % self.table_size

            if idx == hash_value:
                print("❌ Table is full (wrapped around)!")
                return False

        self.table[idx] = key
        self.count += 1

        self.clear_screen()
        print("=" * 70)
        print(f" INSERT({key}) - Complete ".center(70))
        print("=" * 70)

        self.render_linear_probing(key, hash_value, probing_path, idx)
        self.render_table(highlight_idx=idx, probing_path=probing_path)

        self.operation_log.append(
            f"INSERT {key} at index {idx} (collisions: {collisions})"
        )

        return True

    def search(self, key):
        hash_value = self.hash_function(key)
        idx = hash_value
        probing_path = []
        comparisons = 0

        self.clear_screen()
        print("=" * 70)
        print(f" SEARCH({key}) - Starting ".center(70))
        print("=" * 70)

        self.render_hash_calculation(key, hash_value)

        while self.table[idx] is not None:
            comparisons += 1
            probing_path.append(idx)

            if self.table[idx] == key:
                self.clear_screen()
                print("=" * 70)
                print(f" SEARCH({key}) - Found! ".center(70))
                print("=" * 70)
                print(
                    f"\n✅ Found {key} at index {idx} after {comparisons} comparison(s)"
                )
                self.render_table(highlight_idx=idx, probing_path=probing_path[:-1])
                return idx

            idx = (idx + 1) % self.table_size

            if idx == hash_value:
                break

            if self.step_mode:
                self.render_table(probing_path=probing_path)
                input("\nPress Enter to continue...")

        self.clear_screen()
        print("=" * 70)
        print(f" SEARCH({key}) - Not Found ".center(70))
        print("=" * 70)
        print(f"\n❌ {key} not found in table after {comparisons} comparison(s)")
        self.render_table(probing_path=probing_path)
        return -1

    def delete(self, key):
        idx = self.search(key)
        if idx == -1:
            print(f"\n❌ Cannot delete: {key} not in table")
            return False

        self.table[idx] = None
        self.count -= 1

        print(f"\n✅ Deleted {key} from index {idx}")
        print(
            "⚠️ WARNING: Simple deletion breaks probe sequences. Use TOMBSTONE in production!"
        )
        self.render_table()
        self.operation_log.append(f"DELETE {key} from index {idx}")
        return True

    def resize(self, new_size=None):
        if new_size is None:
            new_size = self.next_prime(self.table_size * 2)

        old_table = self.table
        old_size = self.table_size

        self.table_size = new_size
        self.table = [None] * new_size
        self.count = 0
        self.total_collisions = 0

        print(f"\n🔄 Resizing table: {old_size} → {new_size}")

        for value in old_table:
            if value is not None:
                self.insert(value)

        print(f"\n✅ Resize complete! New size: {new_size}")

    def display(self):
        self.render_table()

    def stats(self):
        print("\n" + "=" * 70)
        print(" HASH TABLE STATISTICS ".center(70))
        print("=" * 70)

        load_factor = self.count / self.table_size

        print(f"""
    ┌────────────────────────────────────────────┐
    │ Table Size:        {self.table_size:>20}  │
    │ Elements:          {self.count:>20}  │
    │ Empty Slots:       {self.table_size - self.count:>20}  │
    │ Load Factor:       {f"{load_factor:.2%}":>20}  │
    │ Total Collisions:  {self.total_collisions:>20}  │
    └────────────────────────────────────────────┘
        """)

        clusters = []
        current_cluster = 0
        for val in self.table:
            if val is not None:
                current_cluster += 1
            else:
                if current_cluster > 0:
                    clusters.append(current_cluster)
                current_cluster = 0
        if current_cluster > 0:
            clusters.append(current_cluster)

        if clusters:
            print(f"    Cluster Analysis:")
            print(f"    • Number of clusters: {len(clusters)}")
            print(f"    • Largest cluster: {max(clusters)}")
            print(f"    • Average cluster size: {sum(clusters) / len(clusters):.2f}")


def print_help():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                    HASH TABLE SIMULATOR - HELP                       ║
╠══════════════════════════════════════════════════════════════════════╣
║ Commands:                                                            ║
║   insert <value>  - Insert a value into hash table                   ║
║   search <value>  - Search for a value                               ║
║   delete <value>  - Delete a value                                   ║
║   display         - Show current table state                         ║
║   stats           - Show statistics                                  ║
║   resize [size]   - Resize table (auto or specify size)              ║
║   clear           - Clear the table                                  ║
║   speed <mode>    - Set speed (instant/fast/normal/slow)             ║
║   step            - Toggle step-by-step mode                         ║
║   demo            - Run demo sequence                                ║
║   help            - Show this help                                   ║
║   quit            - Exit simulator                                   ║
╚══════════════════════════════════════════════════════════════════════╝
    """)


def run_demo_mode():
    print("\n" + "=" * 70)
    print(" DEMO MODE - Hash Table with Linear Probing ".center(70))
    print("=" * 70)

    print("""
This demo will:
1. Create a hash table of size 11
2. Insert values: 15, 26, 37, 48, 59, 70 (all hash to similar indices)
3. Show collision handling with linear probing
4. Search for value 37
5. Display final statistics
    """)

    input("Press Enter to start demo...")

    sim = HashTableSimulator(initial_size=11)
    sim.animation_delay = 0.5

    demo_values = [15, 26, 37, 48, 59, 70]

    for val in demo_values:
        sim.insert(val)
        time.sleep(0.5)

    print("\n" + "=" * 70)
    print(" Searching for 37... ".center(70))
    print("=" * 70)
    time.sleep(1)
    sim.search(37)

    time.sleep(1)
    sim.stats()

    print("\n" + "=" * 70)
    print(" DEMO COMPLETED ".center(70))
    print("=" * 70)


def run_interactive_mode():
    print("=" * 70)
    print(" HASH TABLE INTERACTIVE SIMULATOR ".center(70))
    print(" (Linear Probing) ".center(70))
    print("=" * 70)

    print("\nEnter initial table size (default: 11, will use next prime):")
    try:
        size_input = input("Size: ").strip()
        if size_input:
            initial_size = int(size_input)
        else:
            initial_size = 11
    except ValueError:
        initial_size = 11

    sim = HashTableSimulator(initial_size)
    print(f"\n✅ Created hash table with size {sim.table_size}")
    print_help()

    while True:
        try:
            cmd = input("\nhash> ").strip().lower()
        except EOFError:
            break
        except KeyboardInterrupt:
            print("\n")
            break

        if not cmd:
            continue

        parts = cmd.split()
        command = parts[0]

        if command == "quit" or command == "exit":
            print("Goodbye!")
            break

        elif command == "help":
            print_help()

        elif command == "insert":
            if len(parts) < 2:
                print("Usage: insert <value>")
                continue
            try:
                value = int(parts[1])
                sim.insert(value)
            except ValueError:
                print("Error: Please enter a valid integer")

        elif command == "search":
            if len(parts) < 2:
                print("Usage: search <value>")
                continue
            try:
                value = int(parts[1])
                sim.search(value)
            except ValueError:
                print("Error: Please enter a valid integer")

        elif command == "delete":
            if len(parts) < 2:
                print("Usage: delete <value>")
                continue
            try:
                value = int(parts[1])
                sim.delete(value)
            except ValueError:
                print("Error: Please enter a valid integer")

        elif command == "display" or command == "show":
            sim.display()

        elif command == "stats":
            sim.stats()

        elif command == "resize":
            if len(parts) >= 2:
                try:
                    new_size = int(parts[1])
                    sim.resize(new_size)
                except ValueError:
                    print("Error: Please enter a valid integer")
            else:
                sim.resize()

        elif command == "clear":
            sim.table = [None] * sim.table_size
            sim.count = 0
            sim.total_collisions = 0
            print("✅ Table cleared")

        elif command == "speed":
            if len(parts) < 2:
                print("Usage: speed <instant/fast/normal/slow>")
                continue
            mode = parts[1]
            speeds = {"instant": 0, "fast": 0.1, "normal": 0.3, "slow": 0.8}
            if mode in speeds:
                sim.animation_delay = speeds[mode]
                print(f"✅ Speed set to {mode}")
            else:
                print("Unknown speed mode. Use: instant, fast, normal, slow")

        elif command == "step":
            sim.step_mode = not sim.step_mode
            print(f"✅ Step-by-step mode: {'ON' if sim.step_mode else 'OFF'}")

        elif command == "demo":
            run_demo_mode()

        else:
            print(f"Unknown command: {command}. Type 'help' for available commands.")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        run_demo_mode()
    else:
        run_interactive_mode()
