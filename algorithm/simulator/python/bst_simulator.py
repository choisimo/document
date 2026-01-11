#!/usr/bin/env python3
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, List, Callable, Any
from enum import Enum
import time
import sys
import os

from memory_visualizer import MemoryVisualizer, RecursionVisualizer


class SimulationSpeed(Enum):
    INSTANT = 0
    FAST = 0.3
    NORMAL = 0.7
    SLOW = 1.5


@dataclass
class SimulationStep:
    description: str
    code_line: str
    action: Callable[[], None]
    highlight_node: Optional[str] = None


class BSTSimulator:
    def __init__(self, speed: SimulationSpeed = SimulationSpeed.NORMAL):
        self.memory = MemoryVisualizer()
        self.recursion = RecursionVisualizer()
        self.root_address: Optional[str] = None
        self.speed = speed
        self.step_mode = False
        self.current_step = 0
        self.steps: List[SimulationStep] = []
        self.paused = False

    def clear_screen(self):
        os.system("cls" if os.name == "nt" else "clear")

    def wait(self):
        if self.step_mode:
            input("\n[Press Enter to continue...]")
        else:
            time.sleep(self.speed.value)

    def display_state(self, message: str = "", highlight: Optional[str] = None):
        self.clear_screen()
        print("=" * 70)
        print(" BST SIMULATOR - Step-by-Step Visualization ".center(70))
        print("=" * 70)
        print()

        if message:
            print(f"📍 {message}")
            print()

        print(self.memory.render_ascii())

        print("\n" + "─" * 70)
        print(" TREE STRUCTURE ".center(70, "─"))
        print("─" * 70)
        print(self.memory.render_tree_structure(self.root_address))

        print("\n" + "─" * 70)
        print(" RECURSION STACK ".center(70, "─"))
        print("─" * 70)
        print(self.recursion.render_call_stack())

        self.wait()

    def insert(self, key: int):
        print(f"\n{'=' * 70}")
        print(f" INSERT({key}) - Starting ".center(70))
        print(f"{'=' * 70}")

        self.memory.push_stack_frame(
            "insert", {"key": key, "root": self.root_address}, line=1
        )
        self.recursion.push_call("insert", {"key": key}, depth=0)

        self.display_state(f"insert({key}) called")

        self.root_address = self._insert_recursive(self.root_address, key, depth=0)

        self.memory.pop_stack_frame()
        self.recursion.pop_call(self.root_address)

        self.display_state(f"insert({key}) completed! Root = {self.root_address}")

    def _insert_recursive(self, node_addr: Optional[str], key: int, depth: int) -> str:
        if node_addr is None:
            new_addr = self.memory.allocate_heap(
                "Node", {"key": key, "left": None, "right": None}
            )

            self.display_state(
                f"node is None → Create new Node({key}) at {new_addr}",
                highlight=new_addr,
            )

            return new_addr

        node = self.memory.state.heap_objects[node_addr]
        node_key = node.data["key"]

        self.display_state(f"Comparing: {key} vs {node_key} (at {node_addr})")

        if key < node_key:
            self.display_state(f"{key} < {node_key} → Go LEFT")

            left_addr = node.data.get("left")

            self.memory.push_stack_frame(
                f"insert (left of {node_key})",
                {"node": left_addr, "key": key},
                line=depth + 1,
            )
            self.recursion.push_call(
                "insert", {"node": left_addr, "key": key}, depth=depth + 1
            )

            new_left = self._insert_recursive(left_addr, key, depth + 1)

            self.memory.update_heap_object(node_addr, "left", new_left)

            self.memory.pop_stack_frame()
            self.recursion.pop_call(new_left)

            self.display_state(
                f"Returned from left subtree, updated {node_addr}.left = {new_left}"
            )

        elif key > node_key:
            self.display_state(f"{key} > {node_key} → Go RIGHT")

            right_addr = node.data.get("right")

            self.memory.push_stack_frame(
                f"insert (right of {node_key})",
                {"node": right_addr, "key": key},
                line=depth + 1,
            )
            self.recursion.push_call(
                "insert", {"node": right_addr, "key": key}, depth=depth + 1
            )

            new_right = self._insert_recursive(right_addr, key, depth + 1)

            self.memory.update_heap_object(node_addr, "right", new_right)

            self.memory.pop_stack_frame()
            self.recursion.pop_call(new_right)

            self.display_state(
                f"Returned from right subtree, updated {node_addr}.right = {new_right}"
            )
        else:
            self.display_state(f"{key} == {node_key} → Duplicate! Ignoring...")

        return node_addr

    def search(self, key: int) -> bool:
        print(f"\n{'=' * 70}")
        print(f" SEARCH({key}) - Starting ".center(70))
        print(f"{'=' * 70}")

        self.memory.push_stack_frame(
            "search", {"key": key, "root": self.root_address}, line=1
        )
        self.recursion.push_call("search", {"key": key}, depth=0)

        self.display_state(f"search({key}) called")

        result = self._search_recursive(self.root_address, key, depth=0)

        self.memory.pop_stack_frame()
        self.recursion.pop_call(result)

        result_msg = "FOUND! ✓" if result else "NOT FOUND ✗"
        self.display_state(f"search({key}) completed! Result: {result_msg}")

        return result

    def _search_recursive(self, node_addr: Optional[str], key: int, depth: int) -> bool:
        if node_addr is None:
            self.display_state(f"Reached None → Key {key} not found!")
            return False

        node = self.memory.state.heap_objects[node_addr]
        node_key = node.data["key"]

        self.display_state(f"Checking node at {node_addr}: key = {node_key}")

        if key == node_key:
            self.display_state(f"FOUND! {key} == {node_key}")
            return True

        if key < node_key:
            self.display_state(f"{key} < {node_key} → Search LEFT")

            left_addr = node.data.get("left")

            self.memory.push_stack_frame(
                f"search (left of {node_key})",
                {"node": left_addr, "key": key},
                line=depth + 1,
            )
            self.recursion.push_call(
                "search", {"node": left_addr, "key": key}, depth=depth + 1
            )

            result = self._search_recursive(left_addr, key, depth + 1)

            self.memory.pop_stack_frame()
            self.recursion.pop_call(result)

            return result
        else:
            self.display_state(f"{key} > {node_key} → Search RIGHT")

            right_addr = node.data.get("right")

            self.memory.push_stack_frame(
                f"search (right of {node_key})",
                {"node": right_addr, "key": key},
                line=depth + 1,
            )
            self.recursion.push_call(
                "search", {"node": right_addr, "key": key}, depth=depth + 1
            )

            result = self._search_recursive(right_addr, key, depth + 1)

            self.memory.pop_stack_frame()
            self.recursion.pop_call(result)

            return result

    def delete(self, key: int):
        print(f"\n{'=' * 70}")
        print(f" DELETE({key}) - Starting ".center(70))
        print(f"{'=' * 70}")

        self.memory.push_stack_frame(
            "delete", {"key": key, "root": self.root_address}, line=1
        )
        self.recursion.push_call("delete", {"key": key}, depth=0)

        self.display_state(f"delete({key}) called")

        self.root_address = self._delete_recursive(self.root_address, key, depth=0)

        self.memory.pop_stack_frame()
        self.recursion.pop_call(self.root_address)

        self.display_state(f"delete({key}) completed!")

    def _delete_recursive(
        self, node_addr: Optional[str], key: int, depth: int
    ) -> Optional[str]:
        if node_addr is None:
            self.display_state(f"Node not found for deletion: {key}")
            return None

        node = self.memory.state.heap_objects[node_addr]
        node_key = node.data["key"]

        self.display_state(f"Checking node at {node_addr}: key = {node_key}")

        if key < node_key:
            self.display_state(f"{key} < {node_key} → Delete from LEFT subtree")

            left_addr = node.data.get("left")
            new_left = self._delete_recursive(left_addr, key, depth + 1)
            self.memory.update_heap_object(node_addr, "left", new_left)
            return node_addr

        elif key > node_key:
            self.display_state(f"{key} > {node_key} → Delete from RIGHT subtree")

            right_addr = node.data.get("right")
            new_right = self._delete_recursive(right_addr, key, depth + 1)
            self.memory.update_heap_object(node_addr, "right", new_right)
            return node_addr

        else:
            self.display_state(f"FOUND node to delete: {node_key} at {node_addr}")

            left_addr = node.data.get("left")
            right_addr = node.data.get("right")

            if left_addr is None and right_addr is None:
                self.display_state(f"CASE 1: Leaf node → Simply remove")
                del self.memory.state.heap_objects[node_addr]
                return None

            if left_addr is None:
                self.display_state(f"CASE 2a: No left child → Replace with right child")
                del self.memory.state.heap_objects[node_addr]
                return right_addr

            if right_addr is None:
                self.display_state(f"CASE 2b: No right child → Replace with left child")
                del self.memory.state.heap_objects[node_addr]
                return left_addr

            self.display_state(f"CASE 3: Two children → Find in-order successor")

            successor_addr = self._find_min(right_addr)
            successor_key = self.memory.state.heap_objects[successor_addr].data["key"]

            self.display_state(
                f"In-order successor: {successor_key} at {successor_addr}"
            )

            self.memory.update_heap_object(node_addr, "key", successor_key)

            self.display_state(
                f"Copied successor key to current node, now delete successor"
            )

            new_right = self._delete_recursive(right_addr, successor_key, depth + 1)
            self.memory.update_heap_object(node_addr, "right", new_right)

            return node_addr

    def _find_min(self, node_addr: str) -> str:
        node = self.memory.state.heap_objects[node_addr]
        left_addr = node.data.get("left")

        if left_addr is None:
            return node_addr
        return self._find_min(left_addr)

    def inorder_traversal(self) -> List[int]:
        result = []
        self._inorder_recursive(self.root_address, result, depth=0)
        return result

    def _inorder_recursive(
        self, node_addr: Optional[str], result: List[int], depth: int
    ):
        if node_addr is None:
            return

        node = self.memory.state.heap_objects[node_addr]

        self.display_state(f"Inorder: Visiting {node.data['key']} at {node_addr}")

        self._inorder_recursive(node.data.get("left"), result, depth + 1)
        result.append(node.data["key"])
        self._inorder_recursive(node.data.get("right"), result, depth + 1)


def run_interactive_mode():
    print("=" * 70)
    print(" BST INTERACTIVE SIMULATOR ".center(70))
    print("=" * 70)
    print()
    print("Commands:")
    print("  insert <value>  - Insert a value into BST")
    print("  search <value>  - Search for a value")
    print("  delete <value>  - Delete a value")
    print("  inorder         - Display inorder traversal")
    print("  tree            - Display tree structure")
    print("  memory          - Display memory state")
    print("  speed <mode>    - Set speed (instant/fast/normal/slow)")
    print("  step            - Toggle step-by-step mode")
    print("  demo            - Run demo sequence")
    print("  quit            - Exit simulator")
    print()

    sim = BSTSimulator(speed=SimulationSpeed.NORMAL)

    while True:
        try:
            cmd = input("bst> ").strip().lower().split()

            if not cmd:
                continue

            command = cmd[0]

            if command == "quit" or command == "exit":
                print("Goodbye!")
                break

            elif command == "insert" and len(cmd) > 1:
                try:
                    value = int(cmd[1])
                    sim.insert(value)
                except ValueError:
                    print("Error: Please enter a valid integer")

            elif command == "search" and len(cmd) > 1:
                try:
                    value = int(cmd[1])
                    found = sim.search(value)
                    print(f"Result: {'Found' if found else 'Not found'}")
                except ValueError:
                    print("Error: Please enter a valid integer")

            elif command == "delete" and len(cmd) > 1:
                try:
                    value = int(cmd[1])
                    sim.delete(value)
                except ValueError:
                    print("Error: Please enter a valid integer")

            elif command == "inorder":
                result = sim.inorder_traversal()
                print(f"Inorder: {result}")

            elif command == "tree":
                print(sim.memory.render_tree_structure(sim.root_address))

            elif command == "memory":
                print(sim.memory.render_ascii())

            elif command == "speed" and len(cmd) > 1:
                speed_map = {
                    "instant": SimulationSpeed.INSTANT,
                    "fast": SimulationSpeed.FAST,
                    "normal": SimulationSpeed.NORMAL,
                    "slow": SimulationSpeed.SLOW,
                }
                if cmd[1] in speed_map:
                    sim.speed = speed_map[cmd[1]]
                    print(f"Speed set to {cmd[1]}")
                else:
                    print("Valid speeds: instant, fast, normal, slow")

            elif command == "step":
                sim.step_mode = not sim.step_mode
                print(f"Step mode: {'ON' if sim.step_mode else 'OFF'}")

            elif command == "demo":
                run_demo_mode(sim)

            else:
                print("Unknown command. Type 'help' for usage.")

        except KeyboardInterrupt:
            print("\nUse 'quit' to exit")
        except Exception as e:
            print(f"Error: {e}")


def run_demo_mode(sim: Optional[BSTSimulator] = None):
    if sim is None:
        sim = BSTSimulator(speed=SimulationSpeed.NORMAL)

    print("\n" + "=" * 70)
    print(" DEMO MODE - BST Operations ".center(70))
    print("=" * 70)
    print()
    print("This demo will:")
    print("1. Insert values: 5, 3, 7, 1, 4, 6, 8")
    print("2. Search for value 4")
    print("3. Delete value 5 (root with two children)")
    print()
    input("Press Enter to start demo...")

    for value in [5, 3, 7, 1, 4, 6, 8]:
        sim.insert(value)

    print("\n" + "=" * 70)
    print(" SEARCH DEMONSTRATION ".center(70))
    print("=" * 70)
    input("\nPress Enter to search for value 4...")
    sim.search(4)

    print("\n" + "=" * 70)
    print(" DELETE DEMONSTRATION ".center(70))
    print("=" * 70)
    input("\nPress Enter to delete root (5) - Case 3: Two children...")
    sim.delete(5)

    print("\n" + "=" * 70)
    print(" DEMO COMPLETED ".center(70))
    print("=" * 70)
    print("\nFinal tree structure:")
    print(sim.memory.render_tree_structure(sim.root_address))


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        run_demo_mode()
    else:
        run_interactive_mode()
