#!/usr/bin/env python3
"""
Heap / Priority Queue Interactive Simulator
Max Heap, Min Heap 연산을 시각화합니다.
"""

import sys
import os
import time


class HeapSimulator:
    def __init__(self, heap_type="max"):
        self.heap = []
        self.heap_type = heap_type
        self.step_mode = False
        self.animation_delay = 0.3
        self.comparisons = 0
        self.swaps = 0

    def clear_screen(self):
        os.system("clear" if os.name != "nt" else "cls")

    def compare(self, a, b):
        self.comparisons += 1
        if self.heap_type == "max":
            return a > b
        else:
            return a < b

    def parent(self, i):
        return (i - 1) // 2

    def left_child(self, i):
        return 2 * i + 1

    def right_child(self, i):
        return 2 * i + 2

    def render_heap_array(self, highlight_indices=None, label=""):
        highlight_indices = highlight_indices or []

        print("\n" + "─" * 70)
        if label:
            print(f" {label} ".center(70))
        print("─" * 70)

        print("\n  Array representation:")
        print("  Index: ", end="")
        for i in range(len(self.heap)):
            marker = "→" if i in highlight_indices else " "
            print(f"{marker}[{i}]", end=" ")
        print()

        print("  Value: ", end="")
        for i, val in enumerate(self.heap):
            marker = "→" if i in highlight_indices else " "
            print(f"{marker}{val:3d}", end=" ")
        print()

    def render_heap_tree(self, highlight_indices=None):
        if not self.heap:
            print("  (empty heap)")
            return

        highlight_indices = highlight_indices or []

        print("\n  Tree representation:")

        n = len(self.heap)
        level = 0
        idx = 0
        max_level = 0
        temp = n
        while temp > 0:
            max_level += 1
            temp = (temp - 1) // 2

        while idx < n:
            level_size = 2**level
            indent = " " * (2 ** (max_level - level + 1))
            spacing = " " * (2 ** (max_level - level + 2))

            values = []
            for _ in range(level_size):
                if idx < n:
                    marker = "→" if idx in highlight_indices else " "
                    values.append(f"{marker}{self.heap[idx]:3d}")
                    idx += 1
                else:
                    break

            print(indent + spacing.join(values))
            level += 1

        print("\n" + "─" * 70)
        print(
            f"  {self.heap_type.upper()} HEAP | Size: {len(self.heap)} | Comparisons: {self.comparisons} | Swaps: {self.swaps}"
        )

    def render_state(self, highlight_indices=None, label=""):
        highlight_indices = highlight_indices or []

        print("=" * 70)
        print(f" {self.heap_type.upper()} HEAP STATE ".center(70))
        print("=" * 70)

        self.render_heap_array(highlight_indices, label)
        self.render_heap_tree(highlight_indices)

    def insert(self, value):
        self.clear_screen()
        print("=" * 70)
        print(f" INSERT({value}) - Starting ".center(70))
        print("=" * 70)

        self.heap.append(value)
        idx = len(self.heap) - 1

        print(f"\n  Added {value} at index {idx}")
        self.render_state(highlight_indices=[idx], label="After Insertion")

        if self.step_mode:
            input("\nPress Enter to start bubble-up...")
        else:
            time.sleep(self.animation_delay)

        while idx > 0:
            parent_idx = self.parent(idx)

            self.clear_screen()
            print("=" * 70)
            print(
                f" BUBBLE-UP: Comparing index {idx} with parent {parent_idx} ".center(
                    70
                )
            )
            print("=" * 70)

            print(f"\n  heap[{idx}] = {self.heap[idx]}")
            print(f"  heap[{parent_idx}] = {self.heap[parent_idx]}")

            self.render_state(highlight_indices=[idx, parent_idx], label="Comparing...")

            if self.compare(self.heap[idx], self.heap[parent_idx]):
                self.heap[idx], self.heap[parent_idx] = (
                    self.heap[parent_idx],
                    self.heap[idx],
                )
                self.swaps += 1

                print(f"\n  ✓ Swapped! {self.heap[parent_idx]} ↔ {self.heap[idx]}")

                if self.step_mode:
                    input("\nPress Enter to continue...")
                else:
                    time.sleep(self.animation_delay)

                idx = parent_idx
            else:
                print(f"\n  ✓ Heap property satisfied. No swap needed.")
                break

            if self.step_mode:
                input("\nPress Enter to continue...")
            else:
                time.sleep(self.animation_delay)

        self.clear_screen()
        print("=" * 70)
        print(f" INSERT({value}) - Complete! ".center(70))
        print("=" * 70)
        self.render_state(label="Final State")

    def extract(self):
        if not self.heap:
            print("❌ Heap is empty!")
            return None

        self.clear_screen()
        print("=" * 70)
        print(
            f" EXTRACT {'MAX' if self.heap_type == 'max' else 'MIN'} - Starting ".center(
                70
            )
        )
        print("=" * 70)

        root = self.heap[0]
        print(f"\n  Extracting root: {root}")

        self.render_state(highlight_indices=[0], label="Root to Extract")

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        last = self.heap.pop()

        if not self.heap:
            print(f"\n✅ Extracted {root}. Heap is now empty.")
            return root

        self.heap[0] = last
        print(f"\n  Moved last element ({last}) to root")

        self.render_state(highlight_indices=[0], label="After Moving Last to Root")

        if self.step_mode:
            input("\nPress Enter to start bubble-down...")
        else:
            time.sleep(self.animation_delay)

        self._heapify_down(0)

        self.clear_screen()
        print("=" * 70)
        print(f" EXTRACT - Complete! Returned {root} ".center(70))
        print("=" * 70)
        self.render_state(label="Final State")

        return root

    def _heapify_down(self, idx):
        while True:
            target = idx
            left = self.left_child(idx)
            right = self.right_child(idx)

            if left < len(self.heap) and self.compare(
                self.heap[left], self.heap[target]
            ):
                target = left

            if right < len(self.heap) and self.compare(
                self.heap[right], self.heap[target]
            ):
                target = right

            if target == idx:
                break

            self.clear_screen()
            print("=" * 70)
            print(f" BUBBLE-DOWN: index {idx} → {target} ".center(70))
            print("=" * 70)

            print(f"\n  Comparing with children:")
            if left < len(self.heap):
                print(f"    Left child [{left}]: {self.heap[left]}")
            if right < len(self.heap):
                print(f"    Right child [{right}]: {self.heap[right]}")
            print(
                f"  → {'Swap' if self.heap_type == 'max' else 'Swap'} with index {target}"
            )

            self.heap[idx], self.heap[target] = self.heap[target], self.heap[idx]
            self.swaps += 1

            self.render_state(highlight_indices=[idx, target], label="After Swap")

            if self.step_mode:
                input("\nPress Enter to continue...")
            else:
                time.sleep(self.animation_delay)

            idx = target

    def peek(self):
        if not self.heap:
            print("❌ Heap is empty!")
            return None
        return self.heap[0]

    def build_heap(self, array):
        self.heap = array.copy()
        self.comparisons = 0
        self.swaps = 0

        self.clear_screen()
        print("=" * 70)
        print(" BUILD HEAP - Starting ".center(70))
        print("=" * 70)

        print(f"\n  Input array: {array}")
        self.render_state(label="Initial (Not a Heap)")

        if self.step_mode:
            input("\nPress Enter to start heapify...")
        else:
            time.sleep(self.animation_delay)

        for i in range(len(self.heap) // 2 - 1, -1, -1):
            self.clear_screen()
            print("=" * 70)
            print(f" HEAPIFY from index {i} ".center(70))
            print("=" * 70)

            self.render_state(highlight_indices=[i], label=f"Heapifying subtree at {i}")

            if self.step_mode:
                input("\nPress Enter to continue...")
            else:
                time.sleep(self.animation_delay)

            self._heapify_down_quiet(i)

        self.clear_screen()
        print("=" * 70)
        print(" BUILD HEAP - Complete! ".center(70))
        print("=" * 70)
        self.render_state(label="Valid Heap")

    def _heapify_down_quiet(self, idx):
        while True:
            target = idx
            left = self.left_child(idx)
            right = self.right_child(idx)

            if left < len(self.heap) and self.compare(
                self.heap[left], self.heap[target]
            ):
                target = left

            if right < len(self.heap) and self.compare(
                self.heap[right], self.heap[target]
            ):
                target = right

            if target == idx:
                break

            self.heap[idx], self.heap[target] = self.heap[target], self.heap[idx]
            self.swaps += 1
            idx = target

    def heap_sort(self):
        if not self.heap:
            print("❌ Heap is empty!")
            return []

        original = self.heap.copy()
        sorted_array = []

        self.clear_screen()
        print("=" * 70)
        print(" HEAP SORT - Starting ".center(70))
        print("=" * 70)

        self.render_state(label="Initial Heap")

        if self.step_mode:
            input("\nPress Enter to start...")
        else:
            time.sleep(self.animation_delay)

        while self.heap:
            val = self.extract()
            sorted_array.append(val)

            if self.step_mode:
                input(f"\nExtracted {val}. Press Enter to continue...")
            else:
                time.sleep(self.animation_delay * 0.5)

        self.heap = original

        self.clear_screen()
        print("=" * 70)
        print(" HEAP SORT - Complete! ".center(70))
        print("=" * 70)

        if self.heap_type == "max":
            print(f"\n  Sorted (descending): {sorted_array}")
            print(f"  Sorted (ascending): {sorted_array[::-1]}")
        else:
            print(f"\n  Sorted (ascending): {sorted_array}")

        return sorted_array


def print_help():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                     HEAP SIMULATOR - HELP                            ║
╠══════════════════════════════════════════════════════════════════════╣
║ Commands:                                                            ║
║   insert <value>  - Insert a value into heap                         ║
║   extract         - Extract max/min from heap                        ║
║   peek            - View top element without removing                 ║
║   build <values>  - Build heap from array (e.g., build 5 3 8 1 9)    ║
║   sort            - Perform heap sort                                 ║
║   display         - Show current heap                                 ║
║   type <max/min>  - Switch between max/min heap                       ║
║   clear           - Clear the heap                                    ║
║   speed <mode>    - Set speed (instant/fast/normal/slow)             ║
║   step            - Toggle step-by-step mode                          ║
║   demo            - Run demo                                          ║
║   help            - Show this help                                    ║
║   quit            - Exit simulator                                    ║
╚══════════════════════════════════════════════════════════════════════╝
    """)


def run_demo_mode():
    print("\n" + "=" * 70)
    print(" DEMO MODE - Heap / Priority Queue ".center(70))
    print("=" * 70)

    print("""
This demo will show:
1. Build a max heap from array [3, 1, 4, 1, 5, 9, 2, 6]
2. Insert a new value (8)
3. Extract max values
    """)

    input("Press Enter to start...")

    sim = HeapSimulator("max")
    sim.animation_delay = 0.4

    sim.build_heap([3, 1, 4, 1, 5, 9, 2, 6])

    input("\nPress Enter to insert 8...")
    sim.insert(8)

    input("\nPress Enter to extract max...")
    val = sim.extract()
    print(f"\n  Extracted: {val}")

    input("\nPress Enter to extract another max...")
    val = sim.extract()
    print(f"\n  Extracted: {val}")

    print("\n" + "=" * 70)
    print(" DEMO COMPLETED ".center(70))
    print("=" * 70)


def run_interactive_mode():
    print("=" * 70)
    print(" HEAP / PRIORITY QUEUE SIMULATOR ".center(70))
    print("=" * 70)

    sim = HeapSimulator("max")
    print_help()

    while True:
        try:
            prompt = f"heap({sim.heap_type})> "
            cmd = input(f"\n{prompt}").strip().lower()
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

        elif command == "extract":
            sim.extract()

        elif command == "peek":
            val = sim.peek()
            if val is not None:
                print(f"Top element: {val}")

        elif command == "build":
            if len(parts) < 2:
                print("Usage: build <value1> <value2> ...")
                continue
            try:
                arr = [int(x) for x in parts[1:]]
                sim.build_heap(arr)
            except ValueError:
                print("Error: Please enter valid integers")

        elif command == "sort":
            sim.heap_sort()

        elif command == "display":
            sim.render_state(label="Current State")

        elif command == "type":
            if len(parts) < 2:
                print("Usage: type <max/min>")
                continue
            heap_type = parts[1]
            if heap_type in ["max", "min"]:
                sim.heap_type = heap_type
                sim.heap = []
                print(f"✅ Switched to {heap_type} heap (heap cleared)")
            else:
                print("Unknown type. Use: max, min")

        elif command == "clear":
            sim.heap = []
            sim.comparisons = 0
            sim.swaps = 0
            print("✅ Heap cleared")

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
                print("Unknown speed mode")

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
