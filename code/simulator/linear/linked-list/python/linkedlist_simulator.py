#!/usr/bin/env python3
"""
Linked List Interactive Simulator
Singly/Doubly Linked List 연산을 시각화합니다.
"""

import sys
import os
import time


class Node:
    def __init__(self, data):
        self.data = data
        self.next = None
        self.prev = None
        self.address = id(self)


class LinkedListSimulator:
    def __init__(self, doubly=False):
        self.head = None
        self.tail = None
        self.size = 0
        self.doubly = doubly
        self.step_mode = False
        self.animation_delay = 0.3

    def clear_screen(self):
        os.system("clear" if os.name != "nt" else "cls")

    def render_list(self, highlight_node=None, label=""):
        print("\n" + "=" * 70)
        print(f" {'DOUBLY ' if self.doubly else ''}LINKED LIST ".center(70))
        print("=" * 70)

        if label:
            print(f"\n  {label}")

        if not self.head:
            print("\n  HEAD → NULL")
            print("\n  (empty list)")
            return

        print("\n  Visual representation:")
        print()

        if self.doubly:
            self._render_doubly(highlight_node)
        else:
            self._render_singly(highlight_node)

        print(f"\n  Size: {self.size}")

    def _render_singly(self, highlight_node):
        current = self.head
        nodes_line = "  HEAD → "

        while current:
            marker = "→" if current == highlight_node else " "
            nodes_line += f"{marker}[{current.data}] → "
            current = current.next

        nodes_line += "NULL"
        print(nodes_line)

    def _render_doubly(self, highlight_node):
        if not self.head:
            print("  HEAD → NULL ← TAIL")
            return

        current = self.head
        forward_line = "  HEAD ⇄ "

        while current:
            marker = "→" if current == highlight_node else " "
            forward_line += f"{marker}[{current.data}] ⇄ "
            current = current.next

        forward_line += "NULL ← TAIL"
        print(forward_line)

    def render_memory(self, highlight_node=None):
        print("\n" + "─" * 70)
        print(" MEMORY STATE ".center(70))
        print("─" * 70)

        print("\n  ┌────────────────────────────────────────────────────────────┐")
        print("  │                          HEAP                               │")
        print("  ├────────────────────────────────────────────────────────────┤")

        current = self.head
        idx = 0
        while current:
            marker = "→" if current == highlight_node else " "
            addr = hex(current.address)[-6:]

            next_addr = hex(current.next.address)[-6:] if current.next else "NULL"

            if self.doubly:
                prev_addr = hex(current.prev.address)[-6:] if current.prev else "NULL"
                print(
                    f"  │{marker} {addr}: data={current.data:4}, prev={prev_addr}, next={next_addr} │"
                )
            else:
                print(
                    f"  │{marker} {addr}: data={current.data:4}, next={next_addr}                  │"
                )

            current = current.next
            idx += 1

        if idx == 0:
            print("  │  (empty)                                                    │")

        print("  └────────────────────────────────────────────────────────────┘")

    def insert_front(self, data):
        self.clear_screen()
        print("=" * 70)
        print(f" INSERT FRONT ({data}) ".center(70))
        print("=" * 70)

        new_node = Node(data)
        print(f"\n  Creating new node with data: {data}")
        print(f"  Address: {hex(new_node.address)[-6:]}")

        self.render_list(label="Before insertion")

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        if not self.head:
            self.head = new_node
            self.tail = new_node
        else:
            new_node.next = self.head
            if self.doubly:
                self.head.prev = new_node
            self.head = new_node

        self.size += 1

        self.clear_screen()
        print("=" * 70)
        print(f" INSERT FRONT ({data}) - Complete! ".center(70))
        print("=" * 70)

        self.render_list(highlight_node=new_node, label="After insertion")
        self.render_memory(highlight_node=new_node)

    def insert_back(self, data):
        self.clear_screen()
        print("=" * 70)
        print(f" INSERT BACK ({data}) ".center(70))
        print("=" * 70)

        new_node = Node(data)
        print(f"\n  Creating new node with data: {data}")

        self.render_list(label="Before insertion")

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        if not self.head:
            self.head = new_node
            self.tail = new_node
        else:
            self.tail.next = new_node
            if self.doubly:
                new_node.prev = self.tail
            self.tail = new_node

        self.size += 1

        self.clear_screen()
        print("=" * 70)
        print(f" INSERT BACK ({data}) - Complete! ".center(70))
        print("=" * 70)

        self.render_list(highlight_node=new_node, label="After insertion")
        self.render_memory(highlight_node=new_node)

    def insert_at(self, index, data):
        if index < 0 or index > self.size:
            print(f"❌ Invalid index: {index}")
            return

        if index == 0:
            self.insert_front(data)
            return

        if index == self.size:
            self.insert_back(data)
            return

        self.clear_screen()
        print("=" * 70)
        print(f" INSERT AT INDEX {index} ({data}) ".center(70))
        print("=" * 70)

        new_node = Node(data)
        print(f"\n  Creating new node with data: {data}")
        print(f"  Target index: {index}")

        self.render_list(label="Before insertion")

        current = self.head
        for i in range(index - 1):
            current = current.next

            if self.step_mode:
                self.clear_screen()
                print("=" * 70)
                print(f" Traversing to index {i + 1} ".center(70))
                print("=" * 70)
                self.render_list(highlight_node=current)
                input("\nPress Enter to continue...")

        new_node.next = current.next
        if self.doubly:
            new_node.prev = current
            if current.next:
                current.next.prev = new_node
        current.next = new_node

        self.size += 1

        self.clear_screen()
        print("=" * 70)
        print(f" INSERT AT INDEX {index} - Complete! ".center(70))
        print("=" * 70)

        self.render_list(highlight_node=new_node, label="After insertion")
        self.render_memory(highlight_node=new_node)

    def delete_front(self):
        if not self.head:
            print("❌ List is empty!")
            return None

        self.clear_screen()
        print("=" * 70)
        print(" DELETE FRONT ".center(70))
        print("=" * 70)

        data = self.head.data
        print(f"\n  Removing node with data: {data}")

        self.render_list(highlight_node=self.head, label="Node to delete")

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        if self.head == self.tail:
            self.head = None
            self.tail = None
        else:
            self.head = self.head.next
            if self.doubly:
                self.head.prev = None

        self.size -= 1

        self.clear_screen()
        print("=" * 70)
        print(f" DELETE FRONT - Removed {data} ".center(70))
        print("=" * 70)

        self.render_list(label="After deletion")
        self.render_memory()

        return data

    def delete_back(self):
        if not self.head:
            print("❌ List is empty!")
            return None

        self.clear_screen()
        print("=" * 70)
        print(" DELETE BACK ".center(70))
        print("=" * 70)

        data = self.tail.data
        print(f"\n  Removing node with data: {data}")

        self.render_list(highlight_node=self.tail, label="Node to delete")

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        if self.head == self.tail:
            self.head = None
            self.tail = None
        elif self.doubly:
            self.tail = self.tail.prev
            self.tail.next = None
        else:
            current = self.head
            while current.next != self.tail:
                current = current.next
            current.next = None
            self.tail = current

        self.size -= 1

        self.clear_screen()
        print("=" * 70)
        print(f" DELETE BACK - Removed {data} ".center(70))
        print("=" * 70)

        self.render_list(label="After deletion")
        self.render_memory()

        return data

    def search(self, data):
        self.clear_screen()
        print("=" * 70)
        print(f" SEARCH ({data}) ".center(70))
        print("=" * 70)

        current = self.head
        index = 0

        while current:
            self.clear_screen()
            print("=" * 70)
            print(f" SEARCH ({data}) - Checking index {index} ".center(70))
            print("=" * 70)

            self.render_list(
                highlight_node=current, label=f"Checking node at index {index}"
            )

            if current.data == data:
                print(f"\n  ✅ Found {data} at index {index}!")
                return index

            if self.step_mode:
                input("\nPress Enter to continue...")
            else:
                time.sleep(self.animation_delay * 0.5)

            current = current.next
            index += 1

        print(f"\n  ❌ {data} not found in list")
        return -1

    def reverse(self):
        if not self.head or not self.head.next:
            print("Nothing to reverse")
            return

        self.clear_screen()
        print("=" * 70)
        print(" REVERSE LIST ".center(70))
        print("=" * 70)

        self.render_list(label="Before reverse")

        if self.step_mode:
            input("\nPress Enter to start...")
        else:
            time.sleep(self.animation_delay)

        prev = None
        current = self.head
        self.tail = self.head

        while current:
            next_node = current.next
            current.next = prev
            if self.doubly:
                current.prev = next_node

            self.clear_screen()
            print("=" * 70)
            print(" REVERSING... ".center(70))
            print("=" * 70)

            print(f"\n  Processing node: {current.data}")
            print(
                f"  prev → current → next: {prev.data if prev else 'NULL'} → {current.data} → {next_node.data if next_node else 'NULL'}"
            )

            if self.step_mode:
                input("\nPress Enter to continue...")
            else:
                time.sleep(self.animation_delay)

            prev = current
            current = next_node

        self.head = prev

        self.clear_screen()
        print("=" * 70)
        print(" REVERSE - Complete! ".center(70))
        print("=" * 70)

        self.render_list(label="After reverse")

    def clear(self):
        self.head = None
        self.tail = None
        self.size = 0


def print_help():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                  LINKED LIST SIMULATOR - HELP                        ║
╠══════════════════════════════════════════════════════════════════════╣
║ Commands:                                                            ║
║   insertf <data>   - Insert at front                                 ║
║   insertb <data>   - Insert at back                                  ║
║   insertat <i> <d> - Insert data at index                            ║
║   deletef          - Delete from front                               ║
║   deleteb          - Delete from back                                ║
║   search <data>    - Search for data                                 ║
║   reverse          - Reverse the list                                ║
║   display          - Show current list                               ║
║   memory           - Show memory state                               ║
║   type <s/d>       - Switch singly(s)/doubly(d) linked list          ║
║   clear            - Clear the list                                  ║
║   speed <mode>     - Set speed (instant/fast/normal/slow)            ║
║   step             - Toggle step-by-step mode                        ║
║   demo             - Run demo                                        ║
║   help             - Show this help                                  ║
║   quit             - Exit simulator                                  ║
╚══════════════════════════════════════════════════════════════════════╝
    """)


def run_demo_mode():
    print("\n" + "=" * 70)
    print(" DEMO MODE - Linked List ".center(70))
    print("=" * 70)

    print("""
This demo will show:
1. Insert elements: 1, 2, 3 (at back)
2. Insert 0 at front
3. Insert 5 at index 2
4. Search for 3
5. Reverse the list
    """)

    input("Press Enter to start...")

    sim = LinkedListSimulator(doubly=False)
    sim.animation_delay = 0.4

    for val in [1, 2, 3]:
        sim.insert_back(val)
        time.sleep(0.3)

    input("\nPress Enter to insert 0 at front...")
    sim.insert_front(0)

    input("\nPress Enter to insert 5 at index 2...")
    sim.insert_at(2, 5)

    input("\nPress Enter to search for 3...")
    sim.search(3)

    input("\nPress Enter to reverse list...")
    sim.reverse()

    print("\n" + "=" * 70)
    print(" DEMO COMPLETED ".center(70))
    print("=" * 70)


def run_interactive_mode():
    print("=" * 70)
    print(" LINKED LIST SIMULATOR ".center(70))
    print("=" * 70)

    sim = LinkedListSimulator(doubly=False)
    print_help()

    while True:
        try:
            list_type = "doubly" if sim.doubly else "singly"
            cmd = input(f"\n{list_type}> ").strip().lower()
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

        elif command == "insertf":
            if len(parts) < 2:
                print("Usage: insertf <data>")
                continue
            try:
                data = int(parts[1])
                sim.insert_front(data)
            except ValueError:
                print("Error: Please enter a valid integer")

        elif command == "insertb":
            if len(parts) < 2:
                print("Usage: insertb <data>")
                continue
            try:
                data = int(parts[1])
                sim.insert_back(data)
            except ValueError:
                print("Error: Please enter a valid integer")

        elif command == "insertat":
            if len(parts) < 3:
                print("Usage: insertat <index> <data>")
                continue
            try:
                index = int(parts[1])
                data = int(parts[2])
                sim.insert_at(index, data)
            except ValueError:
                print("Error: Please enter valid integers")

        elif command == "deletef":
            sim.delete_front()

        elif command == "deleteb":
            sim.delete_back()

        elif command == "search":
            if len(parts) < 2:
                print("Usage: search <data>")
                continue
            try:
                data = int(parts[1])
                sim.search(data)
            except ValueError:
                print("Error: Please enter a valid integer")

        elif command == "reverse":
            sim.reverse()

        elif command == "display":
            sim.render_list(label="Current State")

        elif command == "memory":
            sim.render_memory()

        elif command == "type":
            if len(parts) < 2:
                print("Usage: type <s/d>")
                continue
            list_type = parts[1]
            if list_type == "s":
                sim = LinkedListSimulator(doubly=False)
                print("✅ Switched to singly linked list")
            elif list_type == "d":
                sim = LinkedListSimulator(doubly=True)
                print("✅ Switched to doubly linked list")
            else:
                print("Unknown type. Use: s (singly), d (doubly)")

        elif command == "clear":
            sim.clear()
            print("✅ List cleared")

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
