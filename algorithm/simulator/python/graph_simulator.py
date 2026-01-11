#!/usr/bin/env python3
"""
Graph Algorithms Interactive Simulator
BFS, DFS, Dijkstra 알고리즘을 시각화합니다.
"""

import sys
import os
import time
import heapq
from collections import deque, defaultdict


class GraphSimulator:
    def __init__(self):
        self.graph = defaultdict(list)
        self.weighted = False
        self.directed = False
        self.step_mode = False
        self.animation_delay = 0.3

    def clear_screen(self):
        os.system("clear" if os.name != "nt" else "cls")

    def add_edge(self, u, v, weight=1):
        self.graph[u].append((v, weight))
        if not self.directed:
            self.graph[v].append((u, weight))
        if weight != 1:
            self.weighted = True

    def remove_edge(self, u, v):
        self.graph[u] = [(node, w) for node, w in self.graph[u] if node != v]
        if not self.directed:
            self.graph[v] = [(node, w) for node, w in self.graph[v] if node != u]

    def clear_graph(self):
        self.graph = defaultdict(list)
        self.weighted = False

    def get_nodes(self):
        nodes = set(self.graph.keys())
        for neighbors in self.graph.values():
            for node, _ in neighbors:
                nodes.add(node)
        return sorted(nodes)

    def render_graph(self, visited=None, current=None, path=None, distances=None):
        visited = visited or set()
        path = path or []

        print("\n" + "=" * 70)
        print(" GRAPH STATE ".center(70))
        print("=" * 70)

        nodes = self.get_nodes()

        print("\n  Adjacency List:")
        for node in nodes:
            marker = "→" if node == current else ("✓" if node in visited else " ")
            neighbors = self.graph[node]

            if self.weighted:
                neighbor_str = ", ".join([f"{v}(w={w})" for v, w in neighbors])
            else:
                neighbor_str = ", ".join([str(v) for v, _ in neighbors])

            dist_str = ""
            if distances and node in distances:
                d = distances[node]
                dist_str = f" [dist={d if d != float('inf') else '∞'}]"

            print(f"  {marker} {node}: [{neighbor_str}]{dist_str}")

        print("\n" + "─" * 70)

        if visited:
            print(f"  Visited: {sorted(visited)}")
        if path:
            print(f"  Path: {' → '.join(map(str, path))}")

    def render_traversal_state(self, algorithm, current, visited, queue_or_stack, path):
        self.clear_screen()
        print("=" * 70)
        print(f" {algorithm} - Step ".center(70))
        print("=" * 70)

        print(f"\n  Current Node: {current}")
        print(f"  Visited: {sorted(visited)}")

        structure_name = "Queue" if algorithm == "BFS" else "Stack"
        print(f"  {structure_name}: {list(queue_or_stack)}")
        print(f"  Path: {' → '.join(map(str, path))}")

        self.render_graph(visited=visited, current=current, path=path)

    def bfs(self, start):
        if start not in self.graph and start not in self.get_nodes():
            print(f"❌ Node {start} not in graph")
            return []

        visited = set()
        queue = deque([start])
        path = []

        self.clear_screen()
        print("=" * 70)
        print(" BFS (Breadth-First Search) - Starting ".center(70))
        print("=" * 70)
        print(f"\n  Starting from node: {start}")
        self.render_graph()

        if self.step_mode:
            input("\nPress Enter to start...")
        else:
            time.sleep(self.animation_delay)

        while queue:
            current = queue.popleft()

            if current in visited:
                continue

            visited.add(current)
            path.append(current)

            self.render_traversal_state("BFS", current, visited, queue, path)

            if self.step_mode:
                input("\nPress Enter to continue...")
            else:
                time.sleep(self.animation_delay)

            for neighbor, _ in sorted(self.graph[current]):
                if neighbor not in visited:
                    queue.append(neighbor)

        self.clear_screen()
        print("=" * 70)
        print(" BFS - Complete! ".center(70))
        print("=" * 70)
        print(f"\n  Traversal Order: {' → '.join(map(str, path))}")
        self.render_graph(visited=visited, path=path)

        return path

    def dfs(self, start):
        if start not in self.graph and start not in self.get_nodes():
            print(f"❌ Node {start} not in graph")
            return []

        visited = set()
        stack = [start]
        path = []

        self.clear_screen()
        print("=" * 70)
        print(" DFS (Depth-First Search) - Starting ".center(70))
        print("=" * 70)
        print(f"\n  Starting from node: {start}")
        self.render_graph()

        if self.step_mode:
            input("\nPress Enter to start...")
        else:
            time.sleep(self.animation_delay)

        while stack:
            current = stack.pop()

            if current in visited:
                continue

            visited.add(current)
            path.append(current)

            self.render_traversal_state("DFS", current, visited, stack, path)

            if self.step_mode:
                input("\nPress Enter to continue...")
            else:
                time.sleep(self.animation_delay)

            for neighbor, _ in sorted(self.graph[current], reverse=True):
                if neighbor not in visited:
                    stack.append(neighbor)

        self.clear_screen()
        print("=" * 70)
        print(" DFS - Complete! ".center(70))
        print("=" * 70)
        print(f"\n  Traversal Order: {' → '.join(map(str, path))}")
        self.render_graph(visited=visited, path=path)

        return path

    def dijkstra(self, start, end=None):
        if start not in self.graph and start not in self.get_nodes():
            print(f"❌ Node {start} not in graph")
            return {}, {}

        distances = {node: float("inf") for node in self.get_nodes()}
        distances[start] = 0
        previous = {node: None for node in self.get_nodes()}
        visited = set()
        pq = [(0, start)]

        self.clear_screen()
        print("=" * 70)
        print(" DIJKSTRA'S ALGORITHM - Starting ".center(70))
        print("=" * 70)
        print(f"\n  Starting from node: {start}")
        if end:
            print(f"  Target node: {end}")
        self.render_graph(distances=distances)

        if self.step_mode:
            input("\nPress Enter to start...")
        else:
            time.sleep(self.animation_delay)

        while pq:
            current_dist, current = heapq.heappop(pq)

            if current in visited:
                continue

            visited.add(current)

            self.clear_screen()
            print("=" * 70)
            print(f" DIJKSTRA - Processing node {current} ".center(70))
            print("=" * 70)
            print(f"\n  Current: {current} (distance: {current_dist})")
            print(f"  Priority Queue: {sorted(pq)}")

            self.render_graph(visited=visited, current=current, distances=distances)

            if self.step_mode:
                input("\nPress Enter to continue...")
            else:
                time.sleep(self.animation_delay)

            if end and current == end:
                break

            for neighbor, weight in self.graph[current]:
                if neighbor in visited:
                    continue

                new_dist = current_dist + weight

                if new_dist < distances[neighbor]:
                    distances[neighbor] = new_dist
                    previous[neighbor] = current
                    heapq.heappush(pq, (new_dist, neighbor))

                    print(f"\n  → Updated distance to {neighbor}: {new_dist}")

        self.clear_screen()
        print("=" * 70)
        print(" DIJKSTRA - Complete! ".center(70))
        print("=" * 70)

        print("\n  Shortest distances from", start, ":")
        for node in sorted(distances.keys()):
            d = distances[node]
            d_str = str(d) if d != float("inf") else "∞ (unreachable)"
            print(f"    → {node}: {d_str}")

        if end and distances[end] != float("inf"):
            path = []
            current = end
            while current is not None:
                path.append(current)
                current = previous[current]
            path.reverse()
            print(f"\n  Shortest path to {end}: {' → '.join(map(str, path))}")
            print(f"  Total distance: {distances[end]}")

        return distances, previous

    def create_sample_graph(self, graph_type="simple"):
        self.clear_graph()

        if graph_type == "simple":
            edges = [(0, 1), (0, 2), (1, 3), (1, 4), (2, 5), (3, 6), (4, 6), (5, 6)]
            for u, v in edges:
                self.add_edge(u, v)

        elif graph_type == "weighted":
            self.weighted = True
            edges = [
                (0, 1, 4),
                (0, 2, 2),
                (1, 2, 1),
                (1, 3, 5),
                (2, 3, 8),
                (2, 4, 10),
                (3, 4, 2),
                (3, 5, 6),
                (4, 5, 3),
            ]
            for u, v, w in edges:
                self.add_edge(u, v, w)

        elif graph_type == "tree":
            edges = [(1, 2), (1, 3), (2, 4), (2, 5), (3, 6), (3, 7)]
            for u, v in edges:
                self.add_edge(u, v)


def print_help():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║                    GRAPH SIMULATOR - HELP                            ║
╠══════════════════════════════════════════════════════════════════════╣
║ Commands:                                                            ║
║   add <u> <v> [w]   - Add edge (u,v) with optional weight            ║
║   remove <u> <v>    - Remove edge (u,v)                              ║
║   sample <type>     - Load sample graph (simple/weighted/tree)       ║
║   bfs <start>       - Run BFS from start node                        ║
║   dfs <start>       - Run DFS from start node                        ║
║   dijkstra <s> [e]  - Run Dijkstra from s (optionally to e)          ║
║   display           - Show current graph                             ║
║   clear             - Clear the graph                                ║
║   directed          - Toggle directed/undirected mode                ║
║   speed <mode>      - Set speed (instant/fast/normal/slow)           ║
║   step              - Toggle step-by-step mode                       ║
║   demo              - Run demo                                       ║
║   help              - Show this help                                 ║
║   quit              - Exit simulator                                 ║
╚══════════════════════════════════════════════════════════════════════╝
    """)


def run_demo_mode():
    print("\n" + "=" * 70)
    print(" DEMO MODE - Graph Algorithms ".center(70))
    print("=" * 70)

    print("""
This demo will show:
1. BFS on a simple graph
2. DFS on the same graph
3. Dijkstra's algorithm on a weighted graph
    """)

    input("Press Enter to start with BFS...")

    sim = GraphSimulator()
    sim.animation_delay = 0.4
    sim.create_sample_graph("simple")

    print("\nSample Graph:")
    sim.render_graph()
    input("\nPress Enter to run BFS from node 0...")

    sim.bfs(0)

    input("\nPress Enter to continue with DFS...")

    sim.dfs(0)

    input("\nPress Enter to continue with Dijkstra...")

    sim.create_sample_graph("weighted")
    print("\nWeighted Graph:")
    sim.render_graph()
    input("\nPress Enter to run Dijkstra from node 0 to node 5...")

    sim.dijkstra(0, 5)

    print("\n" + "=" * 70)
    print(" DEMO COMPLETED ".center(70))
    print("=" * 70)


def run_interactive_mode():
    print("=" * 70)
    print(" GRAPH ALGORITHMS SIMULATOR ".center(70))
    print("=" * 70)

    sim = GraphSimulator()
    print_help()

    while True:
        try:
            cmd = input("\ngraph> ").strip()
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

        elif command == "add":
            if len(parts) < 3:
                print("Usage: add <u> <v> [weight]")
                continue
            try:
                u, v = int(parts[1]), int(parts[2])
                w = int(parts[3]) if len(parts) > 3 else 1
                sim.add_edge(u, v, w)
                print(
                    f"✅ Added edge ({u}, {v})"
                    + (f" with weight {w}" if w != 1 else "")
                )
            except ValueError:
                print("Error: Please enter valid integers")

        elif command == "remove":
            if len(parts) < 3:
                print("Usage: remove <u> <v>")
                continue
            try:
                u, v = int(parts[1]), int(parts[2])
                sim.remove_edge(u, v)
                print(f"✅ Removed edge ({u}, {v})")
            except ValueError:
                print("Error: Please enter valid integers")

        elif command == "sample":
            graph_type = parts[1] if len(parts) > 1 else "simple"
            if graph_type in ["simple", "weighted", "tree"]:
                sim.create_sample_graph(graph_type)
                print(f"✅ Loaded {graph_type} sample graph")
                sim.render_graph()
            else:
                print("Unknown graph type. Use: simple, weighted, tree")

        elif command == "bfs":
            if len(parts) < 2:
                print("Usage: bfs <start>")
                continue
            try:
                start = int(parts[1])
                sim.bfs(start)
            except ValueError:
                print("Error: Please enter a valid integer")

        elif command == "dfs":
            if len(parts) < 2:
                print("Usage: dfs <start>")
                continue
            try:
                start = int(parts[1])
                sim.dfs(start)
            except ValueError:
                print("Error: Please enter a valid integer")

        elif command == "dijkstra":
            if len(parts) < 2:
                print("Usage: dijkstra <start> [end]")
                continue
            try:
                start = int(parts[1])
                end = int(parts[2]) if len(parts) > 2 else None
                sim.dijkstra(start, end)
            except ValueError:
                print("Error: Please enter valid integers")

        elif command == "display":
            sim.render_graph()

        elif command == "clear":
            sim.clear_graph()
            print("✅ Graph cleared")

        elif command == "directed":
            sim.directed = not sim.directed
            print(f"✅ Graph mode: {'directed' if sim.directed else 'undirected'}")

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
