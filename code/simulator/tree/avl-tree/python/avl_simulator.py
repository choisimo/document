#!/usr/bin/env python3
"""
AVL Tree Interactive Simulator
Self-balancing BST with rotation visualization.
"""

import sys
import os
import time


class AVLNode:
    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None
        self.height = 1


class AVLSimulator:
    def __init__(self):
        self.root = None
        self.step_mode = False
        self.animation_delay = 0.3
        self.rotations = 0

    def clear_screen(self):
        os.system("clear" if os.name != "nt" else "cls")

    def get_height(self, node):
        if not node:
            return 0
        return node.height

    def get_balance(self, node):
        if not node:
            return 0
        return self.get_height(node.left) - self.get_height(node.right)

    def update_height(self, node):
        if node:
            node.height = 1 + max(
                self.get_height(node.left), self.get_height(node.right)
            )

    def render_tree(self, highlight_node=None, rotation_info=None, label=""):
        print("\n" + "=" * 70)
        print(" AVL TREE ".center(70))
        print("=" * 70)

        if label:
            print(f"\n  {label}")

        if rotation_info:
            print(f"\n  🔄 {rotation_info}")

        if not self.root:
            print("\n  (empty tree)")
            return

        lines = []
        self._build_tree_string(self.root, lines, "", True, highlight_node)

        print("\n  Tree Structure:")
        for line in lines:
            print(f"  {line}")

        print(f"\n  Total rotations: {self.rotations}")

    def _build_tree_string(self, node, lines, prefix, is_last, highlight_node):
        if node is None:
            return

        connector = "└── " if is_last else "├── "
        balance = self.get_balance(node)
        balance_str = f"(bf={balance:+d})"

        highlight = " ←" if node == highlight_node else ""

        lines.append(
            f"{prefix}{connector}[{node.key}] h={node.height} {balance_str}{highlight}"
        )

        new_prefix = prefix + ("    " if is_last else "│   ")

        children = []
        if node.left:
            children.append(("L", node.left))
        if node.right:
            children.append(("R", node.right))

        for i, (side, child) in enumerate(children):
            is_last_child = i == len(children) - 1
            self._build_tree_string(
                child, lines, new_prefix, is_last_child, highlight_node
            )

    def render_rotation(self, rotation_type, pivot, child):
        print("\n" + "─" * 70)
        print(f" {rotation_type} ROTATION ".center(70))
        print("─" * 70)

        if rotation_type == "RIGHT":
            print(f"""
        Before:              After:
           {pivot.key}                  {child.key}
          /                    / \\
         {child.key}        →       ?   {pivot.key}
        / \\                        /
       ?   ?                      ?
            """)
        elif rotation_type == "LEFT":
            print(f"""
        Before:              After:
        {pivot.key}                    {child.key}
          \\                  / \\
           {child.key}   →    {pivot.key}   ?
          / \\                \\
         ?   ?                ?
            """)

    def right_rotate(self, y):
        self.rotations += 1
        x = y.left
        T2 = x.right

        if self.step_mode:
            self.render_rotation("RIGHT", y, x)
            input("\nPress Enter to perform rotation...")

        x.right = y
        y.left = T2

        self.update_height(y)
        self.update_height(x)

        return x

    def left_rotate(self, x):
        self.rotations += 1
        y = x.right
        T2 = y.left

        if self.step_mode:
            self.render_rotation("LEFT", x, y)
            input("\nPress Enter to perform rotation...")

        y.left = x
        x.right = T2

        self.update_height(x)
        self.update_height(y)

        return y

    def insert(self, key):
        self.clear_screen()
        print("=" * 70)
        print(f" INSERT({key}) ".center(70))
        print("=" * 70)

        self.render_tree(label="Before insertion")

        if self.step_mode:
            input("\nPress Enter to start...")
        else:
            time.sleep(self.animation_delay)

        self.root = self._insert_recursive(self.root, key)

        self.clear_screen()
        print("=" * 70)
        print(f" INSERT({key}) - Complete! ".center(70))
        print("=" * 70)

        self.render_tree(label="After insertion")

    def _insert_recursive(self, node, key):
        if not node:
            return AVLNode(key)

        if key < node.key:
            node.left = self._insert_recursive(node.left, key)
        elif key > node.key:
            node.right = self._insert_recursive(node.right, key)
        else:
            return node

        self.update_height(node)
        balance = self.get_balance(node)

        rotation_info = None

        if balance > 1 and key < node.left.key:
            rotation_info = f"Left-Left case at node {node.key}"
            self.clear_screen()
            print("=" * 70)
            print(" REBALANCING ".center(70))
            print("=" * 70)
            self.render_tree(highlight_node=node, rotation_info=rotation_info)
            if not self.step_mode:
                time.sleep(self.animation_delay)
            return self.right_rotate(node)

        if balance < -1 and key > node.right.key:
            rotation_info = f"Right-Right case at node {node.key}"
            self.clear_screen()
            print("=" * 70)
            print(" REBALANCING ".center(70))
            print("=" * 70)
            self.render_tree(highlight_node=node, rotation_info=rotation_info)
            if not self.step_mode:
                time.sleep(self.animation_delay)
            return self.left_rotate(node)

        if balance > 1 and key > node.left.key:
            rotation_info = f"Left-Right case at node {node.key}"
            self.clear_screen()
            print("=" * 70)
            print(" REBALANCING ".center(70))
            print("=" * 70)
            self.render_tree(highlight_node=node, rotation_info=rotation_info)
            if not self.step_mode:
                time.sleep(self.animation_delay)
            node.left = self.left_rotate(node.left)
            return self.right_rotate(node)

        if balance < -1 and key < node.right.key:
            rotation_info = f"Right-Left case at node {node.key}"
            self.clear_screen()
            print("=" * 70)
            print(" REBALANCING ".center(70))
            print("=" * 70)
            self.render_tree(highlight_node=node, rotation_info=rotation_info)
            if not self.step_mode:
                time.sleep(self.animation_delay)
            node.right = self.right_rotate(node.right)
            return self.left_rotate(node)

        return node

    def delete(self, key):
        self.clear_screen()
        print("=" * 70)
        print(f" DELETE({key}) ".center(70))
        print("=" * 70)

        self.render_tree(label="Before deletion")

        if self.step_mode:
            input("\nPress Enter to start...")
        else:
            time.sleep(self.animation_delay)

        self.root = self._delete_recursive(self.root, key)

        self.clear_screen()
        print("=" * 70)
        print(f" DELETE({key}) - Complete! ".center(70))
        print("=" * 70)

        self.render_tree(label="After deletion")

    def _delete_recursive(self, node, key):
        if not node:
            return node

        if key < node.key:
            node.left = self._delete_recursive(node.left, key)
        elif key > node.key:
            node.right = self._delete_recursive(node.right, key)
        else:
            if not node.left:
                return node.right
            elif not node.right:
                return node.left

            temp = self._get_min_node(node.right)
            node.key = temp.key
            node.right = self._delete_recursive(node.right, temp.key)

        if not node:
            return node

        self.update_height(node)
        balance = self.get_balance(node)

        if balance > 1 and self.get_balance(node.left) >= 0:
            return self.right_rotate(node)

        if balance > 1 and self.get_balance(node.left) < 0:
            node.left = self.left_rotate(node.left)
            return self.right_rotate(node)

        if balance < -1 and self.get_balance(node.right) <= 0:
            return self.left_rotate(node)

        if balance < -1 and self.get_balance(node.right) > 0:
            node.right = self.right_rotate(node.right)
            return self.left_rotate(node)

        return node

    def _get_min_node(self, node):
        current = node
        while current.left:
            current = current.left
        return current

    def search(self, key):
        self.clear_screen()
        print("=" * 70)
        print(f" SEARCH({key}) ".center(70))
        print("=" * 70)

        node = self.root
        path = []

        while node:
            path.append(node.key)

            self.clear_screen()
            print("=" * 70)
            print(f" SEARCH({key}) - Checking node {node.key} ".center(70))
            print("=" * 70)

            self.render_tree(
                highlight_node=node, label=f"Path: {' → '.join(map(str, path))}"
            )

            if self.step_mode:
                input("\nPress Enter to continue...")
            else:
                time.sleep(self.animation_delay * 0.5)

            if key == node.key:
                print(f"\n  ✅ Found {key}!")
                return node
            elif key < node.key:
                node = node.left
            else:
                node = node.right

        print(f"\n  ❌ {key} not found")
        return None

    def inorder(self):
        result = []
        self._inorder_recursive(self.root, result)
        return result

    def _inorder_recursive(self, node, result):
        if node:
            self._inorder_recursive(node.left, result)
            result.append(node.key)
            self._inorder_recursive(node.right, result)

    def clear(self):
        self.root = None
        self.rotations = 0


def print_help():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                    AVL TREE SIMULATOR - HELP                         ║
╠══════════════════════════════════════════════════════════════════════╣
║ Commands:                                                            ║
║   insert <value>  - Insert a value into AVL tree                     ║
║   delete <value>  - Delete a value from AVL tree                     ║
║   search <value>  - Search for a value                               ║
║   inorder         - Display inorder traversal                        ║
║   display         - Show current tree                                ║
║   clear           - Clear the tree                                   ║
║   speed <mode>    - Set speed (instant/fast/normal/slow)             ║
║   step            - Toggle step-by-step mode                         ║
║   demo            - Run demo                                         ║
║   help            - Show this help                                   ║
║   quit            - Exit simulator                                   ║
╚══════════════════════════════════════════════════════════════════════╝
    """)


def run_demo_mode():
    print("\n" + "=" * 70)
    print(" DEMO MODE - AVL Tree ".center(70))
    print("=" * 70)

    print("""
This demo will show:
1. Insert values that cause rotations: 10, 20, 30, 40, 50, 25
2. Show how the tree stays balanced
    """)

    input("Press Enter to start...")

    sim = AVLSimulator()
    sim.animation_delay = 0.5

    values = [10, 20, 30, 40, 50, 25]

    for val in values:
        sim.insert(val)
        input(f"\nInserted {val}. Press Enter to continue...")

    print(f"\nFinal inorder traversal: {sim.inorder()}")
    print(f"Total rotations performed: {sim.rotations}")

    print("\n" + "=" * 70)
    print(" DEMO COMPLETED ".center(70))
    print("=" * 70)


def run_interactive_mode():
    print("=" * 70)
    print(" AVL TREE SIMULATOR ".center(70))
    print("=" * 70)

    sim = AVLSimulator()
    print_help()

    while True:
        try:
            cmd = input("\navl> ").strip().lower()
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

        elif command == "delete":
            if len(parts) < 2:
                print("Usage: delete <value>")
                continue
            try:
                value = int(parts[1])
                sim.delete(value)
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

        elif command == "inorder":
            result = sim.inorder()
            print(f"Inorder traversal: {result}")

        elif command == "display":
            sim.render_tree(label="Current State")

        elif command == "clear":
            sim.clear()
            print("✅ Tree cleared")

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
