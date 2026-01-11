#!/usr/bin/env python3
"""
Binary Search Interactive Simulator
이진 탐색 알고리즘을 시각화합니다.
"""

import sys
import os
import time


class BinarySearchSimulator:
    def __init__(self, array=None):
        self.array = sorted(array) if array else []
        self.comparisons = 0
        self.step_mode = False
        self.animation_delay = 0.3

    def clear_screen(self):
        os.system("clear" if os.name != "nt" else "cls")

    def set_array(self, array):
        self.array = sorted(array)
        self.comparisons = 0

    def render_array(self, low=None, high=None, mid=None, target=None, found_idx=None):
        print("\n" + "=" * 70)
        print(" BINARY SEARCH STATE ".center(70))
        print("=" * 70)

        if target is not None:
            print(f"\n  Target: {target}")

        print("\n  Index: ", end="")
        for i in range(len(self.array)):
            print(f"[{i:2d}]", end=" ")
        print()

        print("  Value: ", end="")
        for i, val in enumerate(self.array):
            print(f" {val:2d} ", end=" ")
        print()

        print("         ", end="")
        for i in range(len(self.array)):
            if i == found_idx:
                print(" ✓  ", end=" ")
            elif i == mid:
                print(" ↑  ", end=" ")
            elif low is not None and high is not None:
                if i == low:
                    print(" L  ", end=" ")
                elif i == high:
                    print(" H  ", end=" ")
                elif low <= i <= high:
                    print(" ·  ", end=" ")
                else:
                    print(" x  ", end=" ")
            else:
                print("    ", end=" ")
        print()

        if low is not None and high is not None:
            print(f"\n  Search range: [{low}...{high}]")
            if mid is not None:
                print(f"  Mid index: {mid}, Mid value: {self.array[mid]}")

        print(f"\n  Comparisons: {self.comparisons}")

    def render_search_step(self, low, high, mid, target, comparison_result):
        print("\n" + "─" * 70)
        print(" COMPARISON ".center(70))
        print("─" * 70)

        mid_val = self.array[mid]

        if comparison_result == "equal":
            print(f"\n  array[{mid}] = {mid_val} == {target}")
            print("  ✅ FOUND!")
        elif comparison_result == "less":
            print(f"\n  array[{mid}] = {mid_val} < {target}")
            print(f"  → Target is in RIGHT half")
            print(f"  → New search range: [{mid + 1}...{high}]")
        else:
            print(f"\n  array[{mid}] = {mid_val} > {target}")
            print(f"  → Target is in LEFT half")
            print(f"  → New search range: [{low}...{mid - 1}]")

    def search(self, target):
        if not self.array:
            print("❌ Array is empty!")
            return -1

        self.comparisons = 0
        low = 0
        high = len(self.array) - 1

        self.clear_screen()
        print("=" * 70)
        print(f" BINARY SEARCH for {target} ".center(70))
        print("=" * 70)

        print(f"\n  Searching for: {target}")
        print(f"  Array (sorted): {self.array}")

        self.render_array(low=low, high=high, target=target)

        if self.step_mode:
            input("\nPress Enter to start...")
        else:
            time.sleep(self.animation_delay)

        iteration = 0
        while low <= high:
            iteration += 1
            mid = (low + high) // 2
            mid_val = self.array[mid]
            self.comparisons += 1

            self.clear_screen()
            print("=" * 70)
            print(f" ITERATION {iteration} ".center(70))
            print("=" * 70)

            print(f"\n  low = {low}, high = {high}")
            print(f"  mid = ({low} + {high}) // 2 = {mid}")

            self.render_array(low=low, high=high, mid=mid, target=target)

            if mid_val == target:
                self.render_search_step(low, high, mid, target, "equal")

                self.clear_screen()
                print("=" * 70)
                print(f" BINARY SEARCH - Found {target} at index {mid}! ".center(70))
                print("=" * 70)
                self.render_array(found_idx=mid, target=target)

                return mid

            elif mid_val < target:
                self.render_search_step(low, high, mid, target, "less")

                if self.step_mode:
                    input("\nPress Enter to continue...")
                else:
                    time.sleep(self.animation_delay)

                low = mid + 1

            else:
                self.render_search_step(low, high, mid, target, "greater")

                if self.step_mode:
                    input("\nPress Enter to continue...")
                else:
                    time.sleep(self.animation_delay)

                high = mid - 1

        self.clear_screen()
        print("=" * 70)
        print(f" BINARY SEARCH - {target} not found! ".center(70))
        print("=" * 70)
        print(f"\n  Searched through {self.comparisons} comparisons")
        print(f"  {target} would be inserted at index {low}")
        self.render_array(target=target)

        return -1

    def search_recursive(self, target, low=None, high=None, depth=0):
        if low is None:
            low = 0
            high = len(self.array) - 1
            self.comparisons = 0

            self.clear_screen()
            print("=" * 70)
            print(f" RECURSIVE BINARY SEARCH for {target} ".center(70))
            print("=" * 70)
            self.render_array(low=low, high=high, target=target)

            if self.step_mode:
                input("\nPress Enter to start...")

        indent = "  " * depth

        if low > high:
            print(f"\n{indent}Base case: low ({low}) > high ({high})")
            print(f"{indent}→ Return -1 (not found)")
            return -1

        mid = (low + high) // 2
        mid_val = self.array[mid]
        self.comparisons += 1

        self.clear_screen()
        print("=" * 70)
        print(f" RECURSIVE CALL (depth={depth}) ".center(70))
        print("=" * 70)

        print(f"\n{indent}search(arr, {target}, low={low}, high={high})")
        print(f"{indent}  mid = {mid}, arr[mid] = {mid_val}")

        self.render_array(low=low, high=high, mid=mid, target=target)

        if mid_val == target:
            print(f"\n{indent}  ✅ Found! Returning {mid}")
            return mid

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        if mid_val < target:
            print(f"\n{indent}  {mid_val} < {target}, searching right half")
            return self.search_recursive(target, mid + 1, high, depth + 1)
        else:
            print(f"\n{indent}  {mid_val} > {target}, searching left half")
            return self.search_recursive(target, low, mid - 1, depth + 1)

    def lower_bound(self, target):
        if not self.array:
            return 0

        low = 0
        high = len(self.array)
        self.comparisons = 0

        self.clear_screen()
        print("=" * 70)
        print(f" LOWER BOUND for {target} ".center(70))
        print("=" * 70)
        print("\n  Finding first index where array[i] >= target")

        while low < high:
            mid = (low + high) // 2
            self.comparisons += 1

            self.clear_screen()
            print("=" * 70)
            print(f" LOWER BOUND - mid={mid} ".center(70))
            print("=" * 70)

            self.render_array(low=low, high=high - 1, mid=mid, target=target)

            if self.step_mode:
                input("\nPress Enter to continue...")
            else:
                time.sleep(self.animation_delay)

            if self.array[mid] < target:
                low = mid + 1
            else:
                high = mid

        self.clear_screen()
        print("=" * 70)
        print(f" LOWER BOUND = {low} ".center(70))
        print("=" * 70)
        print(f"\n  First index where array[i] >= {target} is {low}")
        self.render_array(
            found_idx=low if low < len(self.array) else None, target=target
        )

        return low

    def upper_bound(self, target):
        if not self.array:
            return 0

        low = 0
        high = len(self.array)
        self.comparisons = 0

        self.clear_screen()
        print("=" * 70)
        print(f" UPPER BOUND for {target} ".center(70))
        print("=" * 70)
        print("\n  Finding first index where array[i] > target")

        while low < high:
            mid = (low + high) // 2
            self.comparisons += 1

            self.clear_screen()
            print("=" * 70)
            print(f" UPPER BOUND - mid={mid} ".center(70))
            print("=" * 70)

            self.render_array(low=low, high=high - 1, mid=mid, target=target)

            if self.step_mode:
                input("\nPress Enter to continue...")
            else:
                time.sleep(self.animation_delay)

            if self.array[mid] <= target:
                low = mid + 1
            else:
                high = mid

        self.clear_screen()
        print("=" * 70)
        print(f" UPPER BOUND = {low} ".center(70))
        print("=" * 70)
        print(f"\n  First index where array[i] > {target} is {low}")
        self.render_array(
            found_idx=low if low < len(self.array) else None, target=target
        )

        return low


def print_help():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                 BINARY SEARCH SIMULATOR - HELP                       ║
╠══════════════════════════════════════════════════════════════════════╣
║ Commands:                                                            ║
║   set <values>      - Set array (e.g., set 1 3 5 7 9 11)             ║
║   search <target>   - Binary search (iterative)                      ║
║   searchr <target>  - Binary search (recursive)                      ║
║   lower <target>    - Find lower bound                               ║
║   upper <target>    - Find upper bound                               ║
║   display           - Show current array                             ║
║   speed <mode>      - Set speed (instant/fast/normal/slow)           ║
║   step              - Toggle step-by-step mode                       ║
║   demo              - Run demo                                       ║
║   help              - Show this help                                 ║
║   quit              - Exit simulator                                 ║
╚══════════════════════════════════════════════════════════════════════╝
    """)


def run_demo_mode():
    print("\n" + "=" * 70)
    print(" DEMO MODE - Binary Search ".center(70))
    print("=" * 70)

    print("""
This demo will show:
1. Binary search for existing element (7)
2. Binary search for non-existing element (6)
3. Lower bound and upper bound
    """)

    input("Press Enter to start...")

    sim = BinarySearchSimulator([1, 3, 5, 7, 9, 11, 13, 15])
    sim.animation_delay = 0.5

    print(f"\nArray: {sim.array}")
    input("\nPress Enter to search for 7...")

    sim.search(7)

    input("\nPress Enter to search for 6 (not in array)...")

    sim.search(6)

    input("\nPress Enter to find lower bound of 7...")

    sim.lower_bound(7)

    print("\n" + "=" * 70)
    print(" DEMO COMPLETED ".center(70))
    print("=" * 70)


def run_interactive_mode():
    print("=" * 70)
    print(" BINARY SEARCH SIMULATOR ".center(70))
    print("=" * 70)

    sim = BinarySearchSimulator([1, 3, 5, 7, 9, 11, 13, 15])
    print(f"\nDefault array: {sim.array}")
    print_help()

    while True:
        try:
            cmd = input("\nbsearch> ").strip().lower()
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
                print(f"✅ Array set (sorted): {sim.array}")
            except ValueError:
                print("Error: Please enter valid integers")

        elif command == "search":
            if len(parts) < 2:
                print("Usage: search <target>")
                continue
            try:
                target = int(parts[1])
                sim.search(target)
            except ValueError:
                print("Error: Please enter a valid integer")

        elif command == "searchr":
            if len(parts) < 2:
                print("Usage: searchr <target>")
                continue
            try:
                target = int(parts[1])
                sim.search_recursive(target)
            except ValueError:
                print("Error: Please enter a valid integer")

        elif command == "lower":
            if len(parts) < 2:
                print("Usage: lower <target>")
                continue
            try:
                target = int(parts[1])
                sim.lower_bound(target)
            except ValueError:
                print("Error: Please enter a valid integer")

        elif command == "upper":
            if len(parts) < 2:
                print("Usage: upper <target>")
                continue
            try:
                target = int(parts[1])
                sim.upper_bound(target)
            except ValueError:
                print("Error: Please enter a valid integer")

        elif command == "display":
            sim.render_array()

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
