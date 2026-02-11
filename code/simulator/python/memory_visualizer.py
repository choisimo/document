"""
Memory Visualizer Module
메모리(Stack/Heap) 상태를 시각화하는 모듈
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum
import random


class MemoryRegion(Enum):
    STACK = "Stack"
    HEAP = "Heap"


@dataclass
class HeapObject:
    address: str
    obj_type: str
    data: Dict[str, Any]
    ref_count: int = 1
    gc_marked: bool = False


@dataclass
class StackFrame:
    function_name: str
    local_vars: Dict[str, Any]
    line_number: int = 0
    is_active: bool = True


@dataclass
class MemoryState:
    stack_frames: List[StackFrame] = field(default_factory=list)
    heap_objects: Dict[str, HeapObject] = field(default_factory=dict)
    next_address: int = 0x1000


class MemoryVisualizer:
    def __init__(self):
        self.state = MemoryState()
        self.history: List[MemoryState] = []

    def allocate_heap(self, obj_type: str, data: Dict[str, Any]) -> str:
        address = f"0x{self.state.next_address:04X}"
        self.state.next_address += 8
        self.state.heap_objects[address] = HeapObject(
            address=address, obj_type=obj_type, data=data
        )
        return address

    def push_stack_frame(
        self, function_name: str, local_vars: Dict[str, Any], line: int = 0
    ):
        for frame in self.state.stack_frames:
            frame.is_active = False

        frame = StackFrame(
            function_name=function_name,
            local_vars=local_vars,
            line_number=line,
            is_active=True,
        )
        self.state.stack_frames.append(frame)
        self._save_snapshot()

    def pop_stack_frame(self) -> Optional[StackFrame]:
        if not self.state.stack_frames:
            return None

        popped = self.state.stack_frames.pop()
        if self.state.stack_frames:
            self.state.stack_frames[-1].is_active = True
        self._save_snapshot()
        return popped

    def update_local_var(self, var_name: str, value: Any):
        if self.state.stack_frames:
            self.state.stack_frames[-1].local_vars[var_name] = value

    def update_heap_object(self, address: str, field: str, value: Any):
        if address in self.state.heap_objects:
            self.state.heap_objects[address].data[field] = value

    def _save_snapshot(self):
        import copy

        self.history.append(copy.deepcopy(self.state))

    def render_ascii(self) -> str:
        lines = []
        width = 70

        lines.append("=" * width)
        lines.append(" MEMORY STATE ".center(width, "="))
        lines.append("=" * width)
        lines.append("")

        lines.append("┌" + "─" * 32 + "┐   ┌" + "─" * 32 + "┐")
        lines.append("│" + " STACK ".center(32) + "│   │" + " HEAP ".center(32) + "│")
        lines.append("├" + "─" * 32 + "┤   ├" + "─" * 32 + "┤")

        stack_lines = self._render_stack()
        heap_lines = self._render_heap()

        max_lines = max(len(stack_lines), len(heap_lines), 1)
        stack_lines.extend([""] * (max_lines - len(stack_lines)))
        heap_lines.extend([""] * (max_lines - len(heap_lines)))

        for s_line, h_line in zip(stack_lines, heap_lines):
            lines.append(f"│{s_line:<32}│   │{h_line:<32}│")

        lines.append("└" + "─" * 32 + "┘   └" + "─" * 32 + "┘")
        lines.append("")

        return "\n".join(lines)

    def _render_stack(self) -> List[str]:
        lines = []
        for i, frame in enumerate(reversed(self.state.stack_frames)):
            marker = "→" if frame.is_active else " "
            lines.append(f"{marker} [{frame.function_name}]")
            for var_name, value in frame.local_vars.items():
                if isinstance(value, str) and value.startswith("0x"):
                    lines.append(f"    {var_name} ──► {value}")
                else:
                    lines.append(f"    {var_name} = {value}")
            if i < len(self.state.stack_frames) - 1:
                lines.append("  " + "─" * 28)
        return lines

    def _render_heap(self) -> List[str]:
        lines = []
        for addr, obj in self.state.heap_objects.items():
            lines.append(f"┌─ {addr} ─────────────────┐")
            lines.append(f"│ {obj.obj_type:<28} │")
            for field_name, field_value in obj.data.items():
                if field_value is None:
                    display = "null"
                elif isinstance(field_value, str) and field_value.startswith("0x"):
                    display = f"──► {field_value}"
                else:
                    display = str(field_value)
                lines.append(f"│ {field_name}: {display:<20} │")
            lines.append(f"│ refcount: {obj.ref_count:<18} │")
            lines.append(f"└{'─' * 30}┘")
            lines.append("")
        return lines

    def render_tree_structure(self, root_address: Optional[str]) -> str:
        if root_address is None:
            return "(empty tree)"

        lines = []
        self._render_tree_node(root_address, "", True, lines)
        return "\n".join(lines)

    def _render_tree_node(
        self, address: Optional[str], prefix: str, is_left: bool, lines: List[str]
    ):
        if address is None or address not in self.state.heap_objects:
            return

        obj = self.state.heap_objects[address]
        right_addr = obj.data.get("right")
        left_addr = obj.data.get("left")
        key = obj.data.get("key", "?")

        if right_addr and right_addr != "null":
            new_prefix = prefix + ("│   " if is_left else "    ")
            self._render_tree_node(right_addr, new_prefix, False, lines)

        connector = "└── " if is_left else "┌── "
        lines.append(f"{prefix}{connector}[{key}] @{address}")

        if left_addr and left_addr != "null":
            new_prefix = prefix + ("    " if is_left else "│   ")
            self._render_tree_node(left_addr, new_prefix, True, lines)


class RecursionVisualizer:
    def __init__(self):
        self.call_stack: List[Dict[str, Any]] = []
        self.max_depth: int = 0

    def push_call(self, func_name: str, args: Dict[str, Any], depth: int):
        self.call_stack.append(
            {
                "function": func_name,
                "args": args,
                "depth": depth,
                "returned": False,
                "return_value": None,
            }
        )
        self.max_depth = max(self.max_depth, depth)

    def pop_call(self, return_value: Any = None):
        if self.call_stack:
            self.call_stack[-1]["returned"] = True
            self.call_stack[-1]["return_value"] = return_value

    def render_call_stack(self) -> str:
        lines = []
        lines.append("╔" + "═" * 50 + "╗")
        lines.append("║" + " RECURSION CALL STACK ".center(50) + "║")
        lines.append("╠" + "═" * 50 + "╣")

        for i, call in enumerate(reversed(self.call_stack)):
            indent = "  " * call["depth"]
            marker = "→" if i == 0 and not call["returned"] else " "

            args_str = ", ".join(f"{k}={v}" for k, v in call["args"].items())
            line = f"{marker} {indent}{call['function']}({args_str})"

            if call["returned"]:
                line += f" → {call['return_value']}"

            lines.append("║ " + line[:48].ljust(48) + " ║")

        if not self.call_stack:
            lines.append("║" + " (empty) ".center(50) + "║")

        lines.append("╚" + "═" * 50 + "╝")
        return "\n".join(lines)


if __name__ == "__main__":
    viz = MemoryVisualizer()

    viz.push_stack_frame("main", {"bst": "BinarySearchTree"}, line=1)

    root_addr = viz.allocate_heap("Node", {"key": 5, "left": None, "right": None})
    viz.update_local_var("root", root_addr)

    viz.push_stack_frame("insert", {"node": root_addr, "key": 3}, line=10)

    left_addr = viz.allocate_heap("Node", {"key": 3, "left": None, "right": None})
    viz.update_heap_object(root_addr, "left", left_addr)

    print(viz.render_ascii())
    print("\nTree Structure:")
    print(viz.render_tree_structure(root_addr))
