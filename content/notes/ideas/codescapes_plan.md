# [Project Idea] CodeScapes: 3D Code Execution Visualization

## Overview
**CodeScapes** transforms abstract code execution flow into physical 3D structures. Mapping memory addresses to a 2D plane and time to the vertical Z-axis creates "sculptures" that reveal patterns in algorithms, memory leaks, and stack behaviors that are invisible in traditional log-based debugging.

---

## User Review Required
> [!NOTE]
> This is a greenfield project proposal. Please review the architecture and tech stack choices.

- **Tech Stack**: Proposed **Python** for the profiler (MVP) and **React + Three.js** for valid visualization.
- **Data Format**: A custom JSON/Binary format will be defined for the "Voxel Stream".

---

## Proposed Architecture (Enhanced)

The system consists of three decoupled layers, now optimized for performance and scalability:

### 1. Data Collection Layer (The "Probe")
Captures memory and execution events from the running program.
- **Role**: Hooks into the target runtime (e.g., Python `sys.settrace`, JVM Agent).
- **Data Points**: Timestamp, Memory Address, Operation Type (READ/WRITE/ALLOC/FREE), Value.

### 2. Data Preprocessing Layer (The "Compressor") - **[NEW]**
Optimizes raw data for 3D rendering to handle large execution traces.
- **VRLE (Voxel Run-Length Encoding)**: Merges continuous time steps where memory state doesn't change into single "long" voxels (reducing object count).
- **Binary Schema (12 bytes/voxel)**:
    - `Address_XY` (4 bytes): Hilbert X (16b) + Y (16b).
    - `Time_Start` (4 bytes): Start Z-index.
    - `Duration` (2 bytes): Height of the voxel (VRLE).
    - `Op_Type` (1 byte): READ(0), WRITE(1), FREE(2).
    - `Intensity` (1 byte): Heatmap weight.
- **Sparse Matrix**: Only records active memory cells.
- **Hilbert Curve Mapping**: Pre-calculates 2D coordinates from 1D addresses to preserve locality.
- **Output**: Binary `VoxelStream.bin` for fast loading.

### 3. Visualization Layer (The "Gallery")
Renders the voxel data in a 3D environment using advanced techniques.
- **Engine**: **Three.js** (via React Three Fiber).
- **Rendering**: Uses **InstancedMesh** to render tens of thousands of voxels with a single draw call.
- **Visual Style "Voxel Heatmap"**:
    - **Read**: Translucent Blue.
    - **Write**: Opaque Red/Orange (emitting light on high frequency).
    - **Free**: Grey Wireframe.
- **Modes**:
    - **Algo-Mode**: 2:1 step visualization. Features **Ghosting Effect** (fade past layers) to emphasize flow.
    - **Leak-Mode**: Debugging view. Features **X-Ray View** (hide 'Free' blocks, glow 'Allocated' blocks) to spot memory towers.
    - **Axis Labels**: Guides showing memory address ranges on the Hilbert Plane.

---

## Technology Stack

### Core Components
| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Target Lang (MVP)** | **Python** | Easy to hook with `sys.settrace` and `memory_profiler`. |
| **Preprocessing** | **Rust or Python** | Python for MVP, Rust for high-performance compression later. |
| **Frontend** | **Next.js + React** | Modern web standard. |
| **3D Engine** | **React-Three-Fiber** | **InstancedMesh** support is critical for performance. |
| **Data Format** | **Binary (Fast)** | Custom binary format for fast GPU loading (ArrayBuffer). |

---

## Proposed Changes (Implementation Steps)

### Phase 1: The Profiler (Data Collection)
Create a Python module (`codescapes_profiler`) to trace code.

#### [NEW] `profiler/tracer.py`
- Implements `sys.settrace`.
- Captures memory events and raw timestamps.

### Phase 1.5: The Compressor (Preprocessing)
Process raw traces into render-ready binary streams.

#### [NEW] `compressor/encoder.py`
- Implements **Hilbert Curve** mapping.
- Implements **VRLE (Run-Length Encoding)** to collapse static time-steps.
- Outputs `visual.bin`.

### Phase 2: The Viewer (Web Application)
High-performance 3D viewer.

#### [NEW] `web/src/components/VoxelSystem.tsx`
- Uses `InstancedMesh`.
- Parses `ArrayBuffer` from `visual.bin`.
- Manages material states (Read/Write/Free colors).

#### [NEW] `web/src/stores/ViewModeStore.ts`
- Toggles between `Algo-Mode` and `Leak-Mode`.

---

## Verification Plan

### Automated Tests
- **Mapper Logic**: Unit tests for Hilbert Curve mapping (ensure adjacent addresses map to adjacent 2D points).
- **Profiler Integration**: Run the profiler on a known script (e.g., `bubble_sort.py`) and assert that the output JSON contains expected Read/Write events.

### Manual Verification
1.  **Visual Proof**:
    - Run `bubble_sort.py` with the profiler.
    - Load the data into the web viewer.
    - **Expected Result**: See the characteristic "weaving" pattern of bubble sort in the 3D structure.
2.  **Memory Leak Test**:
    - Run a script that perpetually appends to a list without clearing.
    - **Expected Result**: A structure that grows wider or has a solid column extending infinitely upwards (never turning grey/freed).
