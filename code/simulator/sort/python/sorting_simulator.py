#!/usr/bin/env python3
"""
Sorting Algorithms Interactive Simulator
Quick Sort, Merge Sort, Heap Sort 과정을 시각화합니다.
"""

import sys
import os
import time
import random


class SortingSimulator:
    def __init__(self, array=None):
        self.array = array if array else []
        self.original_array = self.array.copy()
        self.comparisons = 0
        self.swaps = 0
        self.step_mode = False
        self.animation_delay = 0.3
        self.history = []

    def clear_screen(self):
        os.system("clear" if os.name != "nt" else "cls")

    def render_array(
        self, highlight_indices=None, pivot_idx=None, sorted_indices=None, label=""
    ):
        highlight_indices = highlight_indices or []
        sorted_indices = sorted_indices or set()

        print("\n" + "─" * 70)
        if label:
            print(f" {label} ".center(70))
            print("─" * 70)

        max_val = max(self.array) if self.array else 1
        bar_width = 50

        for i, val in enumerate(self.array):
            bar_length = int((val / max_val) * bar_width)

            if i == pivot_idx:
                marker = "P→"
                bar_char = "█"
            elif i in highlight_indices:
                marker = "→ "
                bar_char = "▓"
            elif i in sorted_indices:
                marker = "✓ "
                bar_char = "░"
            else:
                marker = "  "
                bar_char = "▒"

            bar = bar_char * bar_length
            print(f"{marker}[{i:2d}] {val:4d} │{bar}")

        print("─" * 70)
        print(f"Comparisons: {self.comparisons} | Swaps: {self.swaps}")

    def render_merge_state(self, left, right, merged, label=""):
        print("\n" + "=" * 70)
        print(f" {label} ".center(70))
        print("=" * 70)

        print(f"\n  Left:   {left}")
        print(f"  Right:  {right}")
        print(f"  Merged: {merged}")

    def quick_sort(self, low=None, high=None, depth=0):
        if low is None:
            low = 0
        if high is None:
            high = len(self.array) - 1
            self.clear_screen()
            print("=" * 70)
            print(" QUICK SORT - Starting ".center(70))
            print("=" * 70)
            self.render_array(label="Initial Array")
            if self.step_mode:
                input("\nPress Enter to start...")

        if low < high:
            pivot_idx = self._partition(low, high, depth)

            self.quick_sort(low, pivot_idx - 1, depth + 1)
            self.quick_sort(pivot_idx + 1, high, depth + 1)

        if depth == 0:
            self.clear_screen()
            print("=" * 70)
            print(" QUICK SORT - Complete! ".center(70))
            print("=" * 70)
            self.render_array(
                sorted_indices=set(range(len(self.array))), label="Sorted Array"
            )

    def _partition(self, low, high, depth):
        pivot = self.array[high]
        indent = "  " * depth

        self.clear_screen()
        print("=" * 70)
        print(f" PARTITION (depth={depth}) ".center(70))
        print("=" * 70)
        print(f"\n{indent}Range: [{low}...{high}]")
        print(f"{indent}Pivot: {pivot} (index {high})")

        self.render_array(
            highlight_indices=list(range(low, high)),
            pivot_idx=high,
            label=f"Partitioning around pivot {pivot}",
        )

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        i = low - 1

        for j in range(low, high):
            self.comparisons += 1

            if self.array[j] <= pivot:
                i += 1
                if i != j:
                    self.array[i], self.array[j] = self.array[j], self.array[i]
                    self.swaps += 1

                    self.clear_screen()
                    print("=" * 70)
                    print(
                        f" SWAP: arr[{i}]={self.array[j]} ↔ arr[{j}]={self.array[i]} ".center(
                            70
                        )
                    )
                    print("=" * 70)
                    self.render_array(highlight_indices=[i, j], pivot_idx=high)

                    if self.step_mode:
                        input("\nPress Enter to continue...")
                    else:
                        time.sleep(self.animation_delay * 0.5)

        self.array[i + 1], self.array[high] = self.array[high], self.array[i + 1]
        self.swaps += 1

        self.clear_screen()
        print("=" * 70)
        print(f" PIVOT PLACED at index {i + 1} ".center(70))
        print("=" * 70)
        self.render_array(pivot_idx=i + 1, label="Partition Complete")

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        return i + 1

    def merge_sort(self, arr=None, depth=0, start_idx=0):
        if arr is None:
            arr = self.array.copy()
            self.clear_screen()
            print("=" * 70)
            print(" MERGE SORT - Starting ".center(70))
            print("=" * 70)
            self.render_array(label="Initial Array")
            if self.step_mode:
                input("\nPress Enter to start...")

        if len(arr) <= 1:
            return arr

        mid = len(arr) // 2
        indent = "  " * depth

        self.clear_screen()
        print("=" * 70)
        print(f" DIVIDE (depth={depth}) ".center(70))
        print("=" * 70)
        print(f"\n{indent}Splitting: {arr}")
        print(f"{indent}  Left:  {arr[:mid]}")
        print(f"{indent}  Right: {arr[mid:]}")

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        left = self.merge_sort(arr[:mid], depth + 1, start_idx)
        right = self.merge_sort(arr[mid:], depth + 1, start_idx + mid)

        merged = self._merge(left, right, depth)

        for i, val in enumerate(merged):
            self.array[start_idx + i] = val

        if depth == 0:
            self.clear_screen()
            print("=" * 70)
            print(" MERGE SORT - Complete! ".center(70))
            print("=" * 70)
            self.render_array(
                sorted_indices=set(range(len(self.array))), label="Sorted Array"
            )

        return merged

    def _merge(self, left, right, depth):
        indent = "  " * depth
        merged = []
        i = j = 0

        self.clear_screen()
        print("=" * 70)
        print(f" MERGE (depth={depth}) ".center(70))
        print("=" * 70)
        print(f"\n{indent}Merging:")
        print(f"{indent}  Left:  {left}")
        print(f"{indent}  Right: {right}")

        while i < len(left) and j < len(right):
            self.comparisons += 1

            if left[i] <= right[j]:
                merged.append(left[i])
                i += 1
            else:
                merged.append(right[j])
                j += 1

        merged.extend(left[i:])
        merged.extend(right[j:])

        print(f"{indent}  Result: {merged}")

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        return merged

    def heap_sort(self):
        n = len(self.array)

        self.clear_screen()
        print("=" * 70)
        print(" HEAP SORT - Starting ".center(70))
        print("=" * 70)
        self.render_array(label="Initial Array")

        if self.step_mode:
            input("\nPress Enter to start...")

        for i in range(n // 2 - 1, -1, -1):
            self._heapify(n, i, "Building Max Heap")

        self.clear_screen()
        print("=" * 70)
        print(" MAX HEAP BUILT ".center(70))
        print("=" * 70)
        self.render_array(label="Max Heap")
        self._render_heap_tree()

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        sorted_set = set()
        for i in range(n - 1, 0, -1):
            self.array[0], self.array[i] = self.array[i], self.array[0]
            self.swaps += 1
            sorted_set.add(i)

            self.clear_screen()
            print("=" * 70)
            print(f" EXTRACT MAX: {self.array[i]} → index {i} ".center(70))
            print("=" * 70)
            self.render_array(highlight_indices=[0, i], sorted_indices=sorted_set)

            if self.step_mode:
                input("\nPress Enter to continue...")
            else:
                time.sleep(self.animation_delay * 0.5)

            self._heapify(i, 0, "Re-heapify")

        sorted_set.add(0)
        self.clear_screen()
        print("=" * 70)
        print(" HEAP SORT - Complete! ".center(70))
        print("=" * 70)
        self.render_array(sorted_indices=sorted_set, label="Sorted Array")

    def _heapify(self, heap_size, root_idx, label=""):
        largest = root_idx
        left = 2 * root_idx + 1
        right = 2 * root_idx + 2

        if left < heap_size:
            self.comparisons += 1
            if self.array[left] > self.array[largest]:
                largest = left

        if right < heap_size:
            self.comparisons += 1
            if self.array[right] > self.array[largest]:
                largest = right

        if largest != root_idx:
            self.array[root_idx], self.array[largest] = (
                self.array[largest],
                self.array[root_idx],
            )
            self.swaps += 1
            self._heapify(heap_size, largest, label)

    def _render_heap_tree(self):
        if not self.array:
            return

        print("\n  Heap Tree Visualization:")
        n = len(self.array)
        level = 0
        idx = 0

        while idx < n:
            level_size = 2**level
            indent = " " * (2 ** (4 - level))
            spacing = " " * (2 ** (5 - level))

            values = []
            for _ in range(level_size):
                if idx < n:
                    values.append(f"{self.array[idx]:3d}")
                    idx += 1
                else:
                    break

            print(indent + spacing.join(values))
            level += 1

    def reset(self):
        self.array = self.original_array.copy()
        self.comparisons = 0
        self.swaps = 0
        self.history = []

    def set_array(self, arr):
        self.array = arr.copy()
        self.original_array = arr.copy()
        self.comparisons = 0
        self.swaps = 0

    def randomize(self, size=10, max_val=50):
        self.array = [random.randint(1, max_val) for _ in range(size)]
        self.original_array = self.array.copy()
        self.comparisons = 0
        self.swaps = 0


def print_help():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                   SORTING SIMULATOR - HELP                           ║
╠══════════════════════════════════════════════════════════════════════╣
║ Commands:                                                            ║
║   set <values>    - Set array (e.g., set 5 3 8 1 9)                  ║
║   random [n] [m]  - Generate random array (n elements, max m)        ║
║   quicksort       - Run Quick Sort                                   ║
║   mergesort       - Run Merge Sort                                   ║
║   heapsort        - Run Heap Sort                                    ║
║   display         - Show current array                               ║
║   reset           - Reset to original array                          ║
║   speed <mode>    - Set speed (instant/fast/normal/slow)             ║
║   step            - Toggle step-by-step mode                         ║
║   demo            - Run demo with all algorithms                     ║
║   help            - Show this help                                   ║
║   quit            - Exit simulator                                   ║
╚══════════════════════════════════════════════════════════════════════╝
    """)


def run_demo_mode():
    print("\n" + "=" * 70)
    print(" DEMO MODE - Sorting Algorithms ".center(70))
    print("=" * 70)

    demo_array = [64, 34, 25, 12, 22, 11, 90]

    print(f"\nDemo array: {demo_array}")
    print("\nThis demo will show:")
    print("1. Quick Sort")
    print("2. Merge Sort")
    print("3. Heap Sort")

    input("\nPress Enter to start with Quick Sort...")

    sim = SortingSimulator(demo_array.copy())
    sim.animation_delay = 0.4
    sim.quick_sort()

    print(f"\nQuick Sort completed!")
    print(f"Comparisons: {sim.comparisons}, Swaps: {sim.swaps}")
    input("\nPress Enter to continue with Merge Sort...")

    sim.set_array(demo_array)
    sim.merge_sort()

    print(f"\nMerge Sort completed!")
    print(f"Comparisons: {sim.comparisons}")
    input("\nPress Enter to continue with Heap Sort...")

    sim.set_array(demo_array)
    sim.heap_sort()

    print(f"\nHeap Sort completed!")
    print(f"Comparisons: {sim.comparisons}, Swaps: {sim.swaps}")

    print("\n" + "=" * 70)
    print(" DEMO COMPLETED ".center(70))
    print("=" * 70)


def run_interactive_mode():
    print("=" * 70)
    print(" SORTING ALGORITHMS SIMULATOR ".center(70))
    print("=" * 70)

    sim = SortingSimulator([64, 34, 25, 12, 22, 11, 90])
    print_help()

    while True:
        try:
            cmd = input("\nsort> ").strip().lower()
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

        elif command == "set":
            if len(parts) < 2:
                print("Usage: set <value1> <value2> ...")
                continue
            try:
                arr = [int(x) for x in parts[1:]]
                sim.set_array(arr)
                print(f"✅ Array set: {arr}")
            except ValueError:
                print("Error: Please enter valid integers")

        elif command == "random":
            size = int(parts[1]) if len(parts) > 1 else 10
            max_val = int(parts[2]) if len(parts) > 2 else 50
            sim.randomize(size, max_val)
            print(f"✅ Random array: {sim.array}")

        elif command == "quicksort":
            sim.quick_sort()

        elif command == "mergesort":
            sim.merge_sort()

        elif command == "heapsort":
            sim.heap_sort()

        elif command == "display":
            sim.render_array(label="Current Array")

        elif command == "reset":
            sim.reset()
            print(f"✅ Reset to: {sim.array}")

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
