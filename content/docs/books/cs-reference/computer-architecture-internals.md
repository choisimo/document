# Computer Architecture Internals: From Gates to Pipeline Hazards

> **Under the Hood** — How instructions flow through pipeline stages, how caches exploit spatial/temporal locality, how memory hierarchies hide latency, and how multiprocessors maintain coherence. Sources: *Computer Organization and Architecture* (Stallings, 9th ed.), *The Architecture of Computer Hardware, System Software, and Networking* (Englander), *Digital Logic and Computer Design* (Mano), *PC Hardware: A Beginner's Guide*, *Code: The Hidden Language of Computer Hardware and Software* (Petzold).

## Model assumptions

Sections 1–4 use a pedagogical five-stage, 32-bit-address RISC machine unless stated otherwise. Cache sizes, address-bit slices, latency, branch accuracy, TLB shape, reorder-buffer entries, and bandwidth are parameters of a specific microarchitecture, not architectural invariants. A numeric comparison is complete only with CPU SKU/stepping, clock policy, memory configuration, benchmark, counter names, sample count, and percentile or dispersion.

---

## 1. Instruction Pipeline: The 5-Stage RISC Model

The fundamental insight of pipelining is overlap: while one instruction executes, later instructions can be decoded or fetched. The idealized single-issue model approaches one retired instruction per cycle only after fill and in the absence of hazards, cache misses, exceptions, and multi-cycle operations.

```mermaid
flowchart LR
    subgraph CYCLE_1["Clock Cycle 1"]
        IF1["IF\nInstr 1"]
    end
    subgraph CYCLE_2["Clock Cycle 2"]
        ID2["ID\nInstr 1"]
        IF2["IF\nInstr 2"]
    end
    subgraph CYCLE_3["Clock Cycle 3"]
        EX3["EX\nInstr 1"]
        ID3["ID\nInstr 2"]
        IF3["IF\nInstr 3"]
    end
    subgraph CYCLE_4["Clock Cycle 4"]
        MEM4["MEM\nInstr 1"]
        EX4["EX\nInstr 2"]
        ID4["ID\nInstr 3"]
        IF4["IF\nInstr 4"]
    end
    subgraph CYCLE_5["Clock Cycle 5"]
        WB5["WB\nInstr 1"]
        MEM5["MEM\nInstr 2"]
        EX5["EX\nInstr 3"]
        ID5["ID\nInstr 4"]
        IF5["IF\nInstr 5"]
    end
    CYCLE_1 --> CYCLE_2 --> CYCLE_3 --> CYCLE_4 --> CYCLE_5
```

### Pipeline Register Content Between Stages

```mermaid
flowchart LR
    PC["PC\nProgram Counter"] --> IF_STAGE["IF Stage\nInstruction Memory\nPC → IR"]
    IF_STAGE --> IF_ID["IF/ID\nRegister\nIR, PC+4"]
    IF_ID --> ID_STAGE["ID Stage\nRegister File Read\nControl Signal Decode"]
    ID_STAGE --> ID_EX["ID/EX\nRegister\nRS, RT, Imm,\nControl bits"]
    ID_EX --> EX_STAGE["EX Stage\nALU Operation\nAddress Calc"]
    EX_STAGE --> EX_MEM["EX/MEM\nRegister\nALU_result,\nBranch target,\nZero flag"]
    EX_MEM --> MEM_STAGE["MEM Stage\nData Memory\nLoad/Store"]
    MEM_STAGE --> MEM_WB["MEM/WB\nRegister\nRead data,\nALU result"]
    MEM_WB --> WB_STAGE["WB Stage\nWrite to\nRegister File"]
```

---

## 2. Pipeline Hazards: Data, Control, Structural

### Data Hazard: RAW (Read After Write)

```mermaid
sequenceDiagram
    participant IF
    participant ID
    participant EX
    participant MEM
    participant WB

    Note over IF,WB: ADD R1, R2, R3 — writes R1 in WB (cycle 5)
    Note over IF,WB: SUB R4, R1, R5 — reads R1 in ID (cycle 3) ← STALE!

    rect rgb(80, 20, 20)
        Note over ID: Read R1 before ADD writes it
        Note over ID: RAW Hazard detected
    end
    
    Note over IF,WB: STALL: Insert 2 bubble NOPs
    Note over IF,WB: OR: Forwarding from EX/MEM → EX input
```

**Forwarding (bypassing) paths:**

```mermaid
flowchart TD
    EX_MEM_REG["EX/MEM Register\nALU_result (from ADD)"] -->|"Forward to EX input"| MUX_A["MUX A\nEX stage ALU input"]
    MEM_WB_REG["MEM/WB Register\nALU_result or Mem_data"] -->|"Forward to EX input"| MUX_A
    REG_FILE["Register File\nNormal read path"] --> MUX_A
    MUX_A --> ALU["ALU\nCurrent instruction"]
    HAZARD_UNIT["Hazard Detection Unit\nCompares EX/MEM.Rd, MEM/WB.Rd\nwith ID/EX.Rs, ID/EX.Rt"] -->|"ForwardA, ForwardB\nselect signals"| MUX_A
```

### Control Hazard: Branch Penalty

```mermaid
stateDiagram-v2
    [*] --> Fetch_Branch: BEQ instruction fetched
    Fetch_Branch --> Decode_Branch: Pipeline progresses
    Decode_Branch --> Evaluate_Branch: EX stage - compute condition
    Evaluate_Branch --> Branch_Taken: Zero=1, jump to target
    Evaluate_Branch --> Branch_Not_Taken: Zero=0, continue
    Branch_Taken --> Flush_2: Flush 2 instructions already fetched
    Branch_Not_Taken --> Continue: No flush needed
    Flush_2 --> [*]: 2-cycle branch penalty
```

**Branch prediction strategies:**

```mermaid
flowchart TD
    subgraph STATIC["Static Prediction"]
        ST1["Predict not-taken\nAlways fall through\nAccuracy: ~50%"]
        ST2["Predict backward taken\nForward not taken\nLoop optimization\nAccuracy: ~65%"]
    end
    subgraph DYNAMIC["Dynamic Prediction (BTB + BHT)"]
        BTB["Branch Target Buffer\nPC-indexed cache\nStores target address"]
        BHT["Branch History Table\n2-bit saturating counter\n00=strong NT, 11=strong T"]
        PHT["Pattern History Table\nGlobal/local history shift reg\nMaps history→prediction"]
        BTB --> BHT --> PHT
    end
    subgraph TOURNAMENT["Tournament Predictor (modern)"]
        LOCAL["Local predictor\nPer-branch history"]
        GLOBAL["Global predictor\nGlobal history register"]
        META["Meta-predictor\nChooses which to trust"]
        LOCAL --> META
        GLOBAL --> META
    end
```

---

## 3. Cache Architecture: SRAM Sets, Ways, Tags

```mermaid
flowchart TD
    subgraph CACHE_STRUCT["4-Way Set-Associative Cache"]
        INDEX["Address bits [11:6]\nIndex → Select set (64 sets)"]
        TAG_BITS["Address bits [31:12]\nTag → Compare all 4 ways"]
        OFFSET["Address bits [5:0]\nBlock offset (64B line)"]
        
        subgraph SET_N["Set N (4 ways)"]
            W0["Way 0\nValid | Tag | Data[64B]"]
            W1["Way 1\nValid | Tag | Data[64B]"]
            W2["Way 2\nValid | Tag | Data[64B]"]
            W3["Way 3\nValid | Tag | Data[64B]"]
        end
        
        INDEX --> SET_N
        TAG_BITS -->|"Compare"| W0 & W1 & W2 & W3
        
        HIT["Tag match + Valid\n= Cache Hit\nReturn data[offset]"]
        MISS["No match\n= Cache Miss\nFetch from L2/L3/DRAM"]
        W0 & W1 & W2 & W3 --> HIT
        W0 & W1 & W2 & W3 --> MISS
    end
```

### Cache Miss Penalty and Memory Hierarchy

```mermaid
flowchart LR
    CPU["CPU\nRegisters\n~0 cycles"]
    L1["L1 Cache\n32KB I + 32KB D\n4 cycles\nSRAM"]
    L2["L2 Cache\n256KB unified\n12 cycles\nSRAM"]
    L3["L3 Cache\n8MB shared\n40 cycles\nSRAM"]
    DRAM["Main Memory\nDRAM\n100-300 cycles\n4ns access + tRCD + tCL"]
    DISK["NVMe SSD\n50-100µs\nor HDD: 5-10ms"]
    
    CPU -->|"L1 hit 95%"| L1
    L1 -->|"L1 miss → L2"| L2
    L2 -->|"L2 miss → L3"| L3
    L3 -->|"LLC miss → DRAM"| DRAM
    DRAM -->|"Page fault → Disk"| DISK
```

### DRAM Timing Internals: Why Access is 100+ Cycles

The diagram is one timing example. Row hits omit activate/precharge, controller queues can overlap requests, refresh and contention add delay, and CPU cycles depend on frequency; therefore `tRCD + tCL + tRP` is not a universal end-to-end load latency.

```mermaid
sequenceDiagram
    participant CPU
    participant MC as Memory Controller
    participant DRAM

    CPU->>MC: Read address 0x1A2B3C4D
    MC->>DRAM: ACTIVATE (RAS): Row 0x1A2B (tRCD=14ns)
    Note over DRAM: Charge sense amplifiers latch row into row buffer
    MC->>DRAM: READ (CAS): Column 0x3C (CL=14ns)
    Note over DRAM: Column amplifiers drive data onto bus
    DRAM-->>MC: Data burst (8 transfers × 8B = 64B cache line)
    MC-->>CPU: Cache line loaded (total ~100ns = ~400 cycles @ 4GHz)
    MC->>DRAM: PRECHARGE (tRP=14ns): Close row, restore sense amps
```

---

## 4. Virtual Memory: TLB, Page Tables, Page Faults

```mermaid
flowchart TD
    subgraph VA_TRANSLATION["Virtual Address Translation (x86-64 4-level paging)"]
        VA["Virtual Address\n[63:48] sign extend\n[47:39] PML4 index\n[38:30] PDP index\n[29:21] PD index\n[20:12] PT index\n[11:0] page offset"]
        CR3["CR3 register\nPhysical addr of PML4"]
        PML4["PML4 Table\nPhysical page, 512 entries"]
        PDP["PDP Table\nPhysical page, 512 entries"]
        PD["Page Directory\nPhysical page, 512 entries"]
        PT["Page Table\nPTE: Physical addr\n+ Present/RW/User/NX bits"]
        PHYS["Physical Address\nPT.physical_page + offset"]
        CR3 --> PML4
        VA --> PML4 --> PDP --> PD --> PT --> PHYS
    end
    subgraph TLB["TLB (Translation Lookaside Buffer)"]
        TLB_ENTRY["Fully associative SRAM\nVPN → PPN + flags\n~64 L1-TLB entries\n~1024 L2-TLB entries"]
        TLB_HIT["TLB Hit\n~1 cycle"]
        TLB_MISS["TLB Miss\nHardware Page Table Walk\n~100 cycles + DRAM accesses"]
        TLB_ENTRY --> TLB_HIT
        TLB_ENTRY --> TLB_MISS
    end
```

### Page Fault Handler Flow

The sequence represents a major file/swap-backed fault. Anonymous zero-fill, copy-on-write, protection violations, and already-resident file pages follow different paths; frame allocation and I/O ordering are kernel-specific. “Page fault” alone does not imply disk access.

```mermaid
sequenceDiagram
    participant CPU
    participant MMU
    participant OS as OS Kernel
    participant DISK

    CPU->>MMU: Access virtual address VA
    MMU->>MMU: TLB miss → page table walk
    MMU->>MMU: PTE.Present = 0 → Page Not Present
    MMU->>CPU: #PF Page Fault Exception (vector 14)
    CPU->>OS: Save context, enter kernel mode
    OS->>OS: Find VMA for VA (is access legal?)
    OS->>DISK: Read page from swap/file (blocking I/O)
    DISK-->>OS: Page data loaded
    OS->>OS: Allocate physical frame
    OS->>OS: Update PTE: physical addr + Present=1
    OS->>MMU: TLB shootdown (INVLPG)
    OS->>CPU: Return from exception, retry instruction
```

---

## 5. CPU Microarchitecture: Out-of-Order Execution Internals

```mermaid
flowchart TD
    subgraph FRONTEND["Front End"]
        FETCH["Fetch Unit\nI-cache line\n→ 4-8 instructions"]
        DECODE["Decode Unit\nx86 → micro-ops (µops)\n1 CISC → 1-4 µops"]
        RENAME["Register Rename\nPhysical RF (168 entries)\nEliminate WAR/WAW hazards\nROB allocation"]
    end
    subgraph BACKEND["Back End (OoO Engine)"]
        ROB["Reorder Buffer (ROB)\nCircular queue\nIn-order commit\n~224 entries"]
        RS["Reservation Stations\n~97 entries\nWait for operands"]
        DISPATCH["Dispatch\nIssue µops to\nexecution units\nwhen operands ready"]
        subgraph EXEC_UNITS["Execution Units"]
            ALU1["ALU 0\nInteger"]
            ALU2["ALU 1\nInteger"]
            FPU["FPU\nFloating Point\nAVX/SSE"]
            LOAD["Load Unit\nD-cache read"]
            STORE["Store Unit\nStore buffer"]
        end
    end
    FETCH --> DECODE --> RENAME --> ROB & RS
    RS --> DISPATCH --> EXEC_UNITS
    EXEC_UNITS -->|"Complete\nWrite result"| ROB
    ROB -->|"In-order retire\nCommit to ARF"| ARF["Architectural\nRegister File"]
```

---

## 6. Multiprocessor Cache Coherence: MESI Protocol

```mermaid
stateDiagram-v2
    [*] --> Invalid: Cache line not cached
    
    Invalid --> Exclusive: Local read miss\nLoad from memory\nNo other caches have it
    Invalid --> Shared: Local read miss\nAnother cache also has it
    Invalid --> Modified: Local write miss\nInvalidate others\nOwn copy exclusively
    
    Exclusive --> Modified: Local write\nNo bus transaction needed
    Exclusive --> Shared: Another CPU reads\nDowngrade to Shared
    Exclusive --> Invalid: Another CPU writes\nBus invalidation
    
    Shared --> Modified: Local write\nBus invalidates others\nBecome sole owner
    Shared --> Invalid: Another CPU writes\nBus invalidation
    
    Modified --> Invalid: Another CPU reads/writes\nWrite-back to memory first\nThen transition
    Modified --> Shared: Another CPU reads\nWrite-back to memory\nShare clean copy
```

### Cache Coherence Bus Snooping

The MESI state diagram contains two edges for a read observed while in `Modified`. In the ordinary read-sharing case the owner supplies or writes back the data and moves to `Shared`; invalidation is associated with another agent obtaining write ownership. Modern systems may use directory protocols and MOESI variants rather than a shared bus.

```mermaid
sequenceDiagram
    participant CPU0
    participant BUS as Shared Bus / Interconnect
    participant CPU1
    participant MEM as Main Memory

    Note over CPU0,CPU1: CPU0 holds M state for cache line A
    
    CPU1->>BUS: BusRd (Read) for line A
    CPU0->>BUS: Snoop: see BusRd for MY Modified line
    CPU0->>MEM: Write-back modified data (M→I or M→S)
    MEM-->>CPU1: Supply clean data
    Note over CPU0,CPU1: Both now in S state
    
    CPU0->>BUS: BusRdX (Read Exclusive / Write intent)
    BUS->>CPU1: Invalidation signal
    CPU1->>CPU1: Transition S→I
    MEM-->>CPU0: Supply data (exclusive)
    Note over CPU0: CPU0 in E state, free to write → M
```

---

## 7. I/O Architecture: DMA, Interrupts, and Bus Protocols

The northbridge/southbridge topology is historical. Many current CPUs integrate the memory controller and PCIe root complex, while DMA may pass through an IOMMU; use the platform's actual block diagram before reasoning about paths or trust boundaries.

```mermaid
flowchart TD
    subgraph CPU_SIDE["CPU + Memory Side"]
        CPU2["CPU Core"]
        NORTH["Northbridge / MCH\nMemory Controller Hub"]
        DRAM2["DRAM\nDIMM Slots"]
    end
    subgraph IO_SIDE["I/O Side"]
        PCIE["PCIe Root Complex\nGen 4: 16 GT/s per lane\nx16 = 32 GB/s"]
        SOUTH["Southbridge / ICH\nI/O Controller Hub"]
        USB["USB 3.0\n5 Gbps"]
        SATA["SATA / NVMe\nStorage"]
        GBE["Gigabit Ethernet\n125 MB/s"]
    end
    CPU2 <--> NORTH
    NORTH <--> DRAM2
    NORTH <--> PCIE
    PCIE <--> SOUTH
    SOUTH <--> USB & SATA & GBE
    subgraph DMA_FLOW["DMA Transfer Flow"]
        DRV["Device Driver\nPrograms DMA descriptor:\nsrc addr, dst addr, length"]
        DMAC["DMA Controller\nMaster on bus\nDirectly writes to DRAM"]
        IRQ["Interrupt to CPU\nTransfer complete\nCPU picks up result"]
        DRV --> DMAC --> DRAM2 --> IRQ --> CPU2
    end
```

---

## 8. RISC vs. CISC: Decode Complexity Tradeoff

```mermaid
flowchart LR
    subgraph CISC["CISC (x86)"]
        C_INSTR["Variable-length instructions\n1-15 bytes\nMany addressing modes\nMemory operands allowed"]
        C_DECODE["Complex Decoder\nMicrocode ROM\nCISC → µops translation\n4-6 decoder stages"]
        C_UOPS["Internal µops\nRISC-like 3-operand\nHomogeneous execution"]
        C_INSTR --> C_DECODE --> C_UOPS
    end
    subgraph RISC["RISC (ARM/MIPS/RISC-V)"]
        R_INSTR["Fixed-length instructions\n32 bits (most)\nLoad/store architecture\nRegister operands only"]
        R_DECODE["Simple Decoder\n1-2 cycles\nDirect to execution"]
        R_EXEC["Execution Units\nDirectly execute\ndecoded instruction"]
        R_INSTR --> R_DECODE --> R_EXEC
    end
    NOTE["Modern x86 CPUs internally\noperate as RISC µop machines\n— CISC is a compatibility\nencoding layer on top"]
```

---

## 9. Floating Point: IEEE 754 Internal Representation

The implied leading `1` applies only to normal finite values. Subnormal values use an effective leading `0`; infinities and NaNs do not represent an ordinary significand.

```mermaid
flowchart LR
    subgraph FP32["32-bit Float (single)"]
        SIGN["Bit 31\nSign (1=neg)"]
        EXP["Bits 30-23\n8-bit exponent\nBias=127"]
        MANT["Bits 22-0\n23-bit mantissa\nImplied leading 1"]
    end
    subgraph FP64["64-bit Double"]
        SIGN2["Bit 63\nSign"]
        EXP2["Bits 62-52\n11-bit exponent\nBias=1023"]
        MANT2["Bits 51-0\n52-bit mantissa"]
    end
    subgraph SPECIAL["Special Values"]
        INF["Exponent=all 1s\nMantissa=0\n→ ±Infinity"]
        NAN["Exponent=all 1s\nMantissa≠0\n→ NaN (quiet/signaling)"]
        DENORM["Exponent=0\nMantissa≠0\n→ Denormalized\n(near-zero precision)"]
        ZERO["Exponent=0\nMantissa=0\n→ ±0"]
    end
```

### FPU Pipeline: Fused Multiply-Add (FMA)

```mermaid
flowchart LR
    A["Operand A\nExponent + Mantissa"] --> ALIGN["Exponent\nAlignment\nRight-shift smaller"]
    B["Operand B"] --> MULTIPLY["Mantissa\nMultiply\n53×53 bit product"]
    C["Operand C"] --> ALIGN
    ALIGN --> ADDER["105-bit\nAdder"]
    MULTIPLY --> ADDER
    ADDER --> NORMALIZE["Normalize\nLeading 1\nShift left/right"]
    NORMALIZE --> ROUND["Round\nRTZ/RNE/RUP/RDN\n(IEEE 754 modes)"]
    ROUND --> RESULT["Result\nIEEE 754 float"]
```

---

## 10. Computer Architecture Design Principles (Patterson & Hennessy)

```mermaid
mindmap
    root((Architecture Design Principles))
        Simplicity
            Fixed instruction length
            Regularity in ISA
            Favor 3-register format
        Common Case
            Optimize frequent operations
            Not the worst case
            SPEC benchmarks guide
        Smaller = Faster
            Fewer registers → faster
            Smaller caches → lower latency
            But miss rate increases
        Good Design
            Compromise when needed
            Branch delay slots
            MIPS: filled by compiler
        Parallelism
            Instruction-level pipelining
            Data-level SIMD
            Thread-level multicore
        Locality
            Temporal: reuse recently accessed
            Spatial: access nearby addresses
            Cache exploits both
```

---

## 11. Modern CPU Microarchitecture Numbers (Intel Ice Lake / AMD Zen 3)

| Resource | Intel Ice Lake | AMD Zen 3 |
|----------|----------------|-----------|
| ROB entries | 352 | 256 |
| Reservation stations | 160 | 128 |
| Physical int registers | 280 | 192 |
| L1-I cache | 32KB, 8-way | 32KB, 8-way |
| L1-D cache | 48KB, 12-way | 32KB, 8-way |
| L2 cache | 512KB, 16-way | 512KB, 8-way |
| L3 cache | 12MB, 12-way | 32MB, 16-way |
| Decode width | 5-wide | 4-wide (up to 6 µops) |
| Branch predictor | TAGE-based | Hybrid TAGE |
| FMA latency | 4 cycles | 4 cycles |
| L1-D latency | 5 cycles | 4 cycles |
| DRAM latency | ~70ns | ~70ns |

Larger out-of-order windows can expose more instruction-level parallelism, but they are one trade-off among branch prediction, front-end width, execution ports, cache/memory latency, power, and workload dependency structure. Doubling a ROB does not guarantee a proportional performance gain.
