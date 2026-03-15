# Android & Mobile Internals: Binder IPC, ART Runtime & Rendering Pipeline

> Under the Hood: How Android's Binder IPC transports method calls through kernel memory, how ART compiles DEX to native code, how the SurfaceFlinger compositor orchestrates frame production, how Jetpack Compose's recomposition engine tracks state changes — the exact kernel interfaces, JIT pipelines, and rendering data flows.

---

## 1. Android Architecture: Layer Stack

```mermaid
flowchart TD
    subgraph "Android System Stack"
        APP["Application Layer\nJava/Kotlin, ART VM"]
        FRAMEWORK["Android Framework\nActivity Manager, Window Manager,\nView System, Content Providers"]
        BINDER["Binder IPC Layer\n(kernel driver: /dev/binder)\nCross-process method calls"]
        HAL["Hardware Abstraction Layer\nCamera, Audio, Sensors\n(HIDL/AIDL interfaces)"]
        KERNEL["Linux Kernel\nDrivers, Memory, Scheduling\n(modified: Binder, ION allocator, etc.)"]
        HW["Hardware\nCPU, GPU, DSP, Camera ISP"]
        APP --> FRAMEWORK --> BINDER --> HAL --> KERNEL --> HW
    end
```

---

## 2. Binder IPC: Kernel-Level Message Passing

Binder is Android's primary IPC mechanism — all cross-process calls (Activity→Service, App→System Services) go through the Binder kernel driver.

```mermaid
sequenceDiagram
    participant APP as App Process\n(Client)
    participant DRV as /dev/binder\n(Kernel Driver)
    participant SYS as System Server\n(Server)

    Note over APP: Call Activity.startActivity()
    APP->>DRV: ioctl(BINDER_WRITE_READ)\n  BC_TRANSACTION:\n    target=0 (ServiceManager handle)\n    code=START_ACTIVITY\n    data=[Intent parcel]

    Note over DRV: Copy parcel from client user space\n→ kernel buffer\n→ map to server process mmap region\n(ONE copy, not two!)
    DRV->>SYS: Wake up server thread pool\n  BR_TRANSACTION:\n    sender_pid=client_pid\n    data=[Intent parcel] (already in server mmap!)

    Note over SYS: Deserialize Intent parcel\nExecute startActivity logic
    SYS->>DRV: BC_REPLY: result
    DRV->>APP: BR_REPLY: result
    Note over APP: Return from startActivity()
```

### Binder Memory Mapping (Zero-Copy Design)

```mermaid
flowchart LR
    subgraph "Physical Memory"
        BUF["Shared kernel buffer\n(1 page = 4KB)"]
    end
    subgraph "Client Process Virtual Address Space"
        C_STACK["Client stack\n(parcel constructed here)"]
        C_MMAP["mmap region\n(NOT mapped for client)"]
    end
    subgraph "Server Process Virtual Address Space"
        S_MMAP["mmap region\n→ same physical page as kernel buffer\n(direct memory-mapped)"]
    end
    C_STACK -->|ioctl: 1 copy to kernel buffer| BUF
    BUF -->|already visible via mmap| S_MMAP
    Note["Total: 1 memcpy client→kernel\n0 memcpy kernel→server\nOther IPC (pipes, sockets): 2 copies"]
```

---

## 3. ART: Android Runtime JIT and AOT

```mermaid
flowchart TD
    subgraph "ART Compilation Pipeline"
        APK["APK: classes.dex\n(Dalvik bytecode)"]
        
        INSTALL["At Install: dex2oat\n(AOT compilation)\n→ .odex (Optimized DEX)\nGlobal methods: interpreted\nHot profiles: compiled to native"]
        
        JIT["At Runtime: JIT Compiler\nProfiles hot methods\n(method call count + loop count)\n→ Compile to native machine code\n→ Save to /data/misc/profiles/"]
        
        BGDEX["Background dex2oat\n(after device idle/charging)\nUse collected JIT profiles\n→ Compile profile-guided AOT\nNext boot: runs at native speed"]
        
        APK --> INSTALL --> JIT --> BGDEX
    end
```

### DEX Bytecode to Native: Method JIT Pipeline

```mermaid
sequenceDiagram
    participant INTERP as Interpreter
    participant JIT as JIT Compiler
    participant CODE as Code Cache

    INTERP->>INTERP: Execute method bytecodes
    Note over INTERP: Hot threshold: 10000 invocations
    INTERP->>JIT: CompileMethod(method_id)
    Note over JIT: 1. Build HIR (High-level IR)\n   from DEX bytecodes
    Note over JIT: 2. Optimize:\n   null-check elimination\n   bounds-check elimination\n   inline virtual calls (devirtualize)\n   loop unrolling
    Note over JIT: 3. Lower to LIR (machine-specific IR)
    Note over JIT: 4. Register allocation (linear scan)
    Note over JIT: 5. Emit ARM64/x86 machine code
    JIT->>CODE: Store compiled code (8MB default)
    CODE-->>INTERP: Direct jump to native code
```

---

## 4. Android View System: Measure/Layout/Draw

```mermaid
sequenceDiagram
    participant APP as Application Thread
    participant VT as ViewRootImpl
    participant WMS as WindowManagerService
    participant SF as SurfaceFlinger

    APP->>VT: requestLayout() / invalidate()
    Note over VT: Schedule traversal on next Vsync\n(Choreographer.postFrameCallback)
    VT->>VT: performMeasure()\n  View.measure(): width/height spec propagation\n  MeasureSpec: EXACTLY|AT_MOST|UNSPECIFIED
    VT->>VT: performLayout()\n  View.layout(): position assignment\n  left, top, right, bottom\n  recursive DFS
    VT->>VT: performDraw()\n  Canvas commands → DisplayList\n  (not drawn yet — recorded!)
    VT->>SF: queueBuffer() [via BufferQueue]\nSubmit DisplayList to GPU
    Note over SF: Next Vsync: composite all layers\nSubmit frame to display
```

### DisplayList Recording vs Execution

```mermaid
flowchart TD
    subgraph "View Drawing: Two-Phase"
        RECORD["Phase 1: Record (CPU)\nView.draw(Canvas)\n→ Canvas operations stored as DisplayList:\n  DrawBitmap(x,y,bitmap)\n  DrawText(x,y,paint)\n  DrawRect(bounds,paint)\n(no actual pixel writes!)"]
        REPLAY["Phase 2: Replay (GPU via HWUI)\nDisplayList → GPU commands:\n  OpenGL ES / Vulkan draw calls\n  Run on GPU thread\n(hardware accelerated since API 14)"]
        RECORD -->|RenderThread| REPLAY
    end
```

---

## 5. SurfaceFlinger: Display Compositor

```mermaid
flowchart TD
    subgraph "SurfaceFlinger Composition"
        LAYERS["Multiple Layers:\n  Status bar (always on top)\n  Navigation bar\n  App window\n  Wallpaper"]
        HWCOMPOSE["HWComposer HAL:\n  Ask hardware to compose layers\n  If HW can handle all: GPU idle!\n  (overlay planes, DRM/KMS)"]
        GLES["Fallback: GLES Composition\n  Render all layers to single framebuffer\n  GPU: blend each layer\n  Compositing shader per layer"]
        DISPLAY["Display: Front buffer\n(FrameBuffer/HDMI)\nSwap at Vsync"]
        LAYERS --> HWCOMPOSE
        HWCOMPOSE -->|too complex| GLES
        HWCOMPOSE --> DISPLAY
        GLES --> DISPLAY
    end
    subgraph "Triple Buffering"
        B1["Buffer 1: Display (front)"]
        B2["Buffer 2: GPU rendering (back)"]
        B3["Buffer 3: App preparing next frame"]
        B1 --> B2 --> B3 --> B1
        Note["Triple buffering prevents\nGPU stalling for display swap\n(vs double: GPU waits for vsync)"]
    end
```

---

## 6. Jetpack Compose: Recomposition Engine

```mermaid
flowchart TD
    subgraph "Compose Runtime Internals"
        TREE["Composition Tree\n(SlotTable: array of slots\neach slot = composable invocation + state)"]
        
        STATE["State<T> change:\nmutableStateOf(value)\n→ SnapshotStateObserver notified\n→ Recomposer invalidates affected scopes"]
        
        RECOMP["Recomposition Scope:\n  trackable region around composable\n  reads State → subscribes to changes\n  only re-runs if its inputs changed"]
        
        SMART["Smart Recomposition:\n  @Composable params stable?\n  (Immutable / @Stable annotation)\n  If all inputs unchanged → SKIP recompose\n  (memo-ized by default for stable types)"]
        
        STATE --> RECOMP --> SMART --> TREE
    end
```

### Compose Slot Table Memory Layout

```mermaid
flowchart LR
    subgraph "SlotTable (Array-of-Arrays)"
        S0["Slot 0: Group header\n(key=hash(composable), size=5)"]
        S1["Slot 1: MyButton state\n(remember { MutableState(0) })"]
        S2["Slot 2: Text node\n(value='Click count: 0')"]
        S3["Slot 3: Icon node"]
        S4["Slot 4: padding modifier"]
        S0 --> S1 --> S2 --> S3 --> S4
    end
    Note["On recomposition: gap buffer technique\n  insert/remove slots O(N) but with gap\n  moved to current position → amortized fast"]
```

---

## 7. Android Memory Management: zRAM and Low Memory Killer

```mermaid
flowchart TD
    subgraph "App Memory Lifecycle"
        FG["Foreground app\n(protected, never killed)"]
        VIS["Visible (background but visible activity)"]
        CACHED["Cached (no visible activity)\n→ LMK target when pressure"]
        DEAD["Killed by LMK\n(process removed from process table)"]
        FG --> VIS --> CACHED --> DEAD
    end
    subgraph "Memory Pressure Response"
        NORMAL["Normal: all cached apps alive"]
        MEDIUM["Medium pressure: GC triggered in apps\nTrim memory signals sent"]
        CRITICAL["Critical: LMK kills lowest-priority cached apps\nStarting from least recently used"]
        FATAL["Fatal: Even visible apps killed\n→ restart from savedInstanceState"]
        NORMAL --> MEDIUM --> CRITICAL --> FATAL
    end
    subgraph "zRAM Swap"
        ZRAM["Inactive pages compressed with zstd\nStored in RAM (compressed)\nAvoids slow NAND flash swap\nTypical: 3GB physical → 4.5GB effective\n(~1.5× compression ratio)"]
    end
```

---

## 8. Dalvik/DEX Format Internals

```mermaid
flowchart LR
    subgraph "DEX File Format"
        HEADER["Header:\n  magic=dex\n035\n  SHA-1 checksum\n  file_size\n  various offsets"]
        STRPOOL["String Pool:\n  sorted array of strings\n  binary search for lookup\n  shared across all classes"]
        TYPEIDS["Type IDs:\n  indices into string pool\n  one per class/primitive"]
        METHODIDS["Method IDs:\n  (class_idx, proto_idx, name_idx)\n  compact 16-bit representation"]
        CLASSDEFS["Class Defs:\n  superclass, interfaces\n  static fields, instance fields\n  direct methods, virtual methods"]
        BYTECODE["Bytecode:\n  16-bit opcodes\n  register-based VM\n  (vs stack-based JVM bytecode)\n  typically 20-50% smaller than JVM"]
        HEADER --> STRPOOL --> TYPEIDS --> METHODIDS --> CLASSDEFS --> BYTECODE
    end
```

---

## 9. Camera Pipeline: ISP and HAL3

```mermaid
sequenceDiagram
    participant APP as Camera App
    participant CAM2 as Camera2 API
    participant HAL as Camera HAL3\n(vendor implementation)
    participant ISP as Image Signal Processor

    APP->>CAM2: CaptureRequest\n(fps=30, ISO=100, AF=CONTINUOUS)
    CAM2->>HAL: processCaptureRequest(request)
    HAL->>ISP: Configure: AE target, AWB gains,\nLens focus distance, shutter speed

    ISP->>ISP: RAW sensor data → RGB:\n  Black level subtraction\n  Lens shading correction\n  Demosaicing (Bayer → RGB)\n  White balance (AWB gains)\n  Noise reduction (NNI/TNI)\n  Edge enhancement\n  Tone mapping (HDR)

    ISP->>HAL: YUV frame + metadata\n(3A stats: AF, AE, AWB)
    HAL->>CAM2: onCaptureCompleted + buffer
    CAM2->>APP: ImageReader: JPEG/RAW/YUV frame
```

---

## 10. Bluetooth/WiFi Low-Level Stack

```mermaid
flowchart TD
    subgraph "BLE GATT Communication"
        APP["Android App\nBluetoothGattCallback"]
        GATT["GATT Layer\n(Generic Attribute Profile)\nServices → Characteristics → Descriptors"]
        ATT["ATT Layer\n(Attribute Protocol)\nHandle-based read/write\nNotification subscriptions"]
        HCI["HCI\n(Host Controller Interface)\nCommands over UART/USB to Bluetooth chip"]
        LL["Link Layer\n(in Bluetooth chip)\nChannel hopping (2402-2480 MHz, 40 channels)\nADV_IND/CONNECT_IND packets\nCRC-24 error detection"]
        APP --> GATT --> ATT --> HCI --> LL
    end
    subgraph "WiFi 802.11 Internals"
        CSMA["CSMA/CA:\n  Carrier Sense: is channel free?\n  Random backoff: wait 0-CW slots\n  CW doubles on collision\n  NAV (Network Allocation Vector): defer"]
        AMPDU["A-MPDU (frame aggregation):\n  Bundle up to 64 frames into 1 TX\n  Single preamble overhead\n  Block ACK for all 64\n  → reduces overhead dramatically"]
    end
```

---

## Summary: Android Internals Data Flows

```mermaid
block-beta
    columns 2
    block:App
        ART_B["ART Runtime\nDEX → JIT native\nGC (concurrent/compacting)"]
        COMPOSE_B["Compose Recomposition\nSlotTable + SnapshotState\nSmart skip with @Stable"]
    end
    block:System
        BINDER_B["Binder IPC\n1-copy kernel mmap\nThread pool + proxy/stub"]
        WMS_B["Window/Surface Manager\nZ-order layers\nVsync scheduling"]
    end
    block:Rendering
        VIEW_B["View System\nMeasure→Layout→Draw\nHWUI DisplayList→GPU"]
        SF_B["SurfaceFlinger\nHW Composer overlay\nTriple buffer"]
    end
    block:Kernel
        LMK_B["Low Memory Killer\nOOM score priority\nzRAM compression"]
        SCHED_B["Linux Scheduler\nCFS for CPU\ncpuset isolation\nbig.LITTLE aware"]
    end
```
