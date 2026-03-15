#!/usr/bin/env python3
"""
Stack / Queue Interactive Simulator
Stack (LIFO), Queue (FIFO) 연산을 시각화합니다.
"""

import sys
import os
import time
from collections import deque


class StackSimulator:
    def __init__(self, max_size=10):
        self.stack = []
        self.max_size = max_size
        self.step_mode = False
        self.animation_delay = 0.3
        self.operations = 0

    def clear_screen(self):
        os.system("clear" if os.name != "nt" else "cls")

    def render(self, highlight_top=False, label=""):
        print("\n" + "=" * 40)
        print(" STACK (LIFO) ".center(40))
        print("=" * 40)

        if label:
            print(f"\n  {label}")

        print("\n    ┌" + "─" * 12 + "┐")

        for i in range(self.max_size - 1, -1, -1):
            if i < len(self.stack):
                marker = "→" if (i == len(self.stack) - 1 and highlight_top) else " "
                top_marker = " ← TOP" if i == len(self.stack) - 1 else ""
                print(f"  {marker} │ {self.stack[i]:^10} │{top_marker}")
            else:
                print(f"    │ {'':^10} │")

            if i > 0:
                print("    ├" + "─" * 12 + "┤")

        print("    └" + "─" * 12 + "┘")
        print(f"\n  Size: {len(self.stack)}/{self.max_size}")

    def push(self, data):
        self.clear_screen()
        print("=" * 40)
        print(f" PUSH({data}) ".center(40))
        print("=" * 40)

        if len(self.stack) >= self.max_size:
            print("\n  ❌ Stack Overflow! Stack is full.")
            self.render()
            return False

        print(f"\n  Pushing {data} onto stack...")
        self.render(label="Before push")

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        self.stack.append(data)
        self.operations += 1

        self.clear_screen()
        print("=" * 40)
        print(f" PUSH({data}) - Complete! ".center(40))
        print("=" * 40)

        self.render(highlight_top=True, label="After push")
        return True

    def pop(self):
        self.clear_screen()
        print("=" * 40)
        print(" POP ".center(40))
        print("=" * 40)

        if not self.stack:
            print("\n  ❌ Stack Underflow! Stack is empty.")
            self.render()
            return None

        print(f"\n  Popping top element...")
        self.render(highlight_top=True, label="Before pop")

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        data = self.stack.pop()
        self.operations += 1

        self.clear_screen()
        print("=" * 40)
        print(f" POP - Returned {data} ".center(40))
        print("=" * 40)

        self.render(label="After pop")
        return data

    def peek(self):
        if not self.stack:
            print("❌ Stack is empty!")
            return None

        self.render(highlight_top=True, label=f"Top element: {self.stack[-1]}")
        return self.stack[-1]

    def is_empty(self):
        return len(self.stack) == 0

    def is_full(self):
        return len(self.stack) >= self.max_size

    def clear(self):
        self.stack = []
        self.operations = 0


class QueueSimulator:
    def __init__(self, max_size=10):
        self.queue = deque()
        self.max_size = max_size
        self.step_mode = False
        self.animation_delay = 0.3
        self.operations = 0

    def clear_screen(self):
        os.system("clear" if os.name != "nt" else "cls")

    def render(self, highlight_front=False, highlight_rear=False, label=""):
        print("\n" + "=" * 60)
        print(" QUEUE (FIFO) ".center(60))
        print("=" * 60)

        if label:
            print(f"\n  {label}")

        front_str = "FRONT →"
        rear_str = "← REAR"

        print(f"\n  {front_str}", end=" ")

        if not self.queue:
            print("[ empty ]", end=" ")
        else:
            for i, item in enumerate(self.queue):
                if i == 0 and highlight_front:
                    print(f"[→{item}←]", end=" ")
                elif i == len(self.queue) - 1 and highlight_rear:
                    print(f"[→{item}←]", end=" ")
                else:
                    print(f"[{item}]", end=" ")

        print(f"{rear_str}")

        print("\n  Visual:")
        print("    ┌" + "─" * 6 * min(self.max_size, 8) + "┐")

        items_str = ""
        for i in range(min(self.max_size, 8)):
            if i < len(self.queue):
                marker = (
                    "→"
                    if (i == 0 and highlight_front)
                    or (i == len(self.queue) - 1 and highlight_rear)
                    else " "
                )
                items_str += f"{marker}{self.queue[i]:^4}│"
            else:
                items_str += f"{'':^5}│"

        print(f"    │{items_str}")
        print("    └" + "─" * 6 * min(self.max_size, 8) + "┘")

        print(f"\n  Size: {len(self.queue)}/{self.max_size}")

    def enqueue(self, data):
        self.clear_screen()
        print("=" * 60)
        print(f" ENQUEUE({data}) ".center(60))
        print("=" * 60)

        if len(self.queue) >= self.max_size:
            print("\n  ❌ Queue Overflow! Queue is full.")
            self.render()
            return False

        print(f"\n  Adding {data} to rear of queue...")
        self.render(label="Before enqueue")

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        self.queue.append(data)
        self.operations += 1

        self.clear_screen()
        print("=" * 60)
        print(f" ENQUEUE({data}) - Complete! ".center(60))
        print("=" * 60)

        self.render(highlight_rear=True, label="After enqueue")
        return True

    def dequeue(self):
        self.clear_screen()
        print("=" * 60)
        print(" DEQUEUE ".center(60))
        print("=" * 60)

        if not self.queue:
            print("\n  ❌ Queue Underflow! Queue is empty.")
            self.render()
            return None

        print(f"\n  Removing from front of queue...")
        self.render(highlight_front=True, label="Before dequeue")

        if self.step_mode:
            input("\nPress Enter to continue...")
        else:
            time.sleep(self.animation_delay)

        data = self.queue.popleft()
        self.operations += 1

        self.clear_screen()
        print("=" * 60)
        print(f" DEQUEUE - Returned {data} ".center(60))
        print("=" * 60)

        self.render(label="After dequeue")
        return data

    def front(self):
        if not self.queue:
            print("❌ Queue is empty!")
            return None

        self.render(highlight_front=True, label=f"Front element: {self.queue[0]}")
        return self.queue[0]

    def rear(self):
        if not self.queue:
            print("❌ Queue is empty!")
            return None

        self.render(highlight_rear=True, label=f"Rear element: {self.queue[-1]}")
        return self.queue[-1]

    def is_empty(self):
        return len(self.queue) == 0

    def is_full(self):
        return len(self.queue) >= self.max_size

    def clear(self):
        self.queue = deque()
        self.operations = 0


def print_help():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                  STACK / QUEUE SIMULATOR - HELP                      ║
╠══════════════════════════════════════════════════════════════════════╣
║ Mode Commands:                                                       ║
║   stack           - Switch to Stack mode                             ║
║   queue           - Switch to Queue mode                             ║
║                                                                      ║
║ Stack Commands (LIFO):                                               ║
║   push <data>     - Push data onto stack                             ║
║   pop             - Pop data from stack                              ║
║   peek            - View top element                                 ║
║                                                                      ║
║ Queue Commands (FIFO):                                               ║
║   enqueue <data>  - Add data to rear of queue                        ║
║   dequeue         - Remove data from front of queue                  ║
║   front           - View front element                               ║
║   rear            - View rear element                                ║
║                                                                      ║
║ Common Commands:                                                     ║
║   display         - Show current state                               ║
║   clear           - Clear the data structure                         ║
║   speed <mode>    - Set speed (instant/fast/normal/slow)             ║
║   step            - Toggle step-by-step mode                         ║
║   demo            - Run demo                                         ║
║   help            - Show this help                                   ║
║   quit            - Exit simulator                                   ║
╚══════════════════════════════════════════════════════════════════════╝
    """)


def run_demo_mode():
    print("\n" + "=" * 60)
    print(" DEMO MODE - Stack & Queue ".center(60))
    print("=" * 60)

    print("""
This demo will show:
1. Stack operations: push 1, 2, 3 then pop twice
2. Queue operations: enqueue A, B, C then dequeue twice
    """)

    input("Press Enter to start with Stack...")

    stack = StackSimulator()
    stack.animation_delay = 0.4

    for val in [1, 2, 3]:
        stack.push(val)
        time.sleep(0.3)

    input("\nPress Enter to pop from stack...")
    stack.pop()
    time.sleep(0.3)
    stack.pop()

    input("\nPress Enter to continue with Queue...")

    queue = QueueSimulator()
    queue.animation_delay = 0.4

    for val in ["A", "B", "C"]:
        queue.enqueue(val)
        time.sleep(0.3)

    input("\nPress Enter to dequeue...")
    queue.dequeue()
    time.sleep(0.3)
    queue.dequeue()

    print("\n" + "=" * 60)
    print(" DEMO COMPLETED ".center(60))
    print("=" * 60)


def run_interactive_mode():
    print("=" * 60)
    print(" STACK / QUEUE SIMULATOR ".center(60))
    print("=" * 60)

    stack = StackSimulator()
    queue = QueueSimulator()
    current_mode = "stack"
    current = stack

    print_help()

    while True:
        try:
            prompt = f"{current_mode}> "
            cmd = input(f"\n{prompt}").strip()
        except EOFError:
            break
        except KeyboardInterrupt:
            print("\n")
            break

        if not cmd:
            continue

        parts = cmd.split()
        command = parts[0].lower()

        if command == "quit" or command == "exit":
            print("Goodbye!")
            break

        elif command == "help":
            print_help()

        elif command == "stack":
            current_mode = "stack"
            current = stack
            print("✅ Switched to Stack mode")

        elif command == "queue":
            current_mode = "queue"
            current = queue
            print("✅ Switched to Queue mode")

        elif command == "push" and current_mode == "stack":
            if len(parts) < 2:
                print("Usage: push <data>")
                continue
            try:
                data = int(parts[1])
                stack.push(data)
            except ValueError:
                stack.push(parts[1])

        elif command == "pop" and current_mode == "stack":
            stack.pop()

        elif command == "peek" and current_mode == "stack":
            stack.peek()

        elif command == "enqueue" and current_mode == "queue":
            if len(parts) < 2:
                print("Usage: enqueue <data>")
                continue
            try:
                data = int(parts[1])
                queue.enqueue(data)
            except ValueError:
                queue.enqueue(parts[1])

        elif command == "dequeue" and current_mode == "queue":
            queue.dequeue()

        elif command == "front" and current_mode == "queue":
            queue.front()

        elif command == "rear" and current_mode == "queue":
            queue.rear()

        elif command == "display":
            current.render(label="Current State")

        elif command == "clear":
            current.clear()
            print(f"✅ {current_mode.capitalize()} cleared")

        elif command == "speed":
            if len(parts) < 2:
                print("Usage: speed <instant/fast/normal/slow>")
                continue
            mode = parts[1]
            speeds = {"instant": 0, "fast": 0.1, "normal": 0.3, "slow": 0.8}
            if mode in speeds:
                current.animation_delay = speeds[mode]
                print(f"✅ Speed set to {mode}")
            else:
                print("Unknown speed mode")

        elif command == "step":
            current.step_mode = not current.step_mode
            print(f"✅ Step-by-step mode: {'ON' if current.step_mode else 'OFF'}")

        elif command == "demo":
            run_demo_mode()

        else:
            print(
                f"Unknown command or wrong mode: {command}. Type 'help' for available commands."
            )


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        run_demo_mode()
    else:
        run_interactive_mode()
