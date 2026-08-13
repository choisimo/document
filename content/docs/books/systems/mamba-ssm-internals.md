# Mamba: Linear-Time Sequence Modeling with Selective State Spaces — Under the Hood
> Source: *Mamba: Linear-Time Sequence Modeling with Selective State Spaces* — Albert Gu & Tri Dao (arXiv:2312.00752v2, CMU + Princeton)

## Paper and measurement boundary

- This document explains arXiv:2312.00752v2, not every later Mamba-family architecture or implementation.
- Complexity is stated in sequence length while holding model dimensions and batch shape explicit; linear asymptotics do not guarantee lower latency for every length or device.
- GPU SRAM/HBM capacity and bandwidth figures are hardware examples. Record GPU model, precision, kernel, batch, sequence length and warm-up for performance claims.
- Distinguish equations derived from the paper, implementation observations, and empirical quality results. Reproduce the named benchmark before generalizing a result.

## Overview

Mamba replaces self-attention blocks with input-dependent selective state-space layers and presents algorithms whose work scales linearly with sequence length for fixed dimensions. Standard full attention has quadratic score computation in sequence length, while actual memory and latency depend on training versus autoregressive inference, kernels and model shape. The paper's hardware-aware scan reduces selected HBM traffic; it does not imply that all expanded state lives only in SRAM throughout every implementation.

---

## 1. The Fundamental Tradeoff: Context Compression

The following diagram contrasts simplified representatives; hybrids and optimized attention variants need separate analysis.

```mermaid
flowchart LR
    subgraph Transformer
        attn["Self-Attention\nStores full KV cache\nO(L) memory per layer\nO(L²) compute\nCan selectively attend anywhere"]
    end
    subgraph RNN
        rnn["Recurrence\nFixed-size hidden state h\nO(1) memory per step\nO(L) compute\nCannot selectively forget"]
    end
    subgraph Mamba
        ssm["Selective SSM\nInput-dependent state transitions\nO(1) inference memory\nO(L) compute\nCAN selectively remember/forget"]
    end

    Transformer -->|"too slow"| gap["efficiency gap"]
    RNN -->|"too rigid"| gap
    gap -->|"solved by"| Mamba
```

The efficiency vs. effectiveness axis can be understood as a **state compression problem**:
- Attention: does not compress (stores all context) → effective but O(L²)
- LTI SSM: compresses to fixed-size state → fast but cannot select relevant content
- Mamba (S6): input-dependent compression → fast AND content-aware

---

## 2. State Space Model Mathematics

### 2.1 The Continuous System

A structured SSM maps a 1D input sequence x(t) → y(t) through a hidden state h(t):

```
h'(t) = A·h(t) + B·x(t)    (state update)
y(t)  = C·h(t)              (output projection)
```

Where **A ∈ ℝᴺˣᴺ** is the state transition matrix, **B ∈ ℝᴺˣ¹** is the input projection, **C ∈ ℝ¹ˣᴺ** is the output projection.

### 2.2 Discretization — ZOH Rule

The continuous parameters (Δ, A, B) are converted to discrete parameters (Ā, B̄) using Zero-Order Hold:

```
Ā = exp(Δ·A)
B̄ = (Δ·A)⁻¹ · (exp(Δ·A) − I) · Δ·B
```

**Δ (timescale/step size)** is a learnable parameter that controls how much the model "samples" from the input at each discrete time step. Large Δ → more weight on current input; small Δ → rely more on hidden state.

```mermaid
flowchart LR
    cont_params["Continuous params\n(Δ, A, B)"]
    zoh["Zero-Order Hold:\nĀ = exp(Δ·A)\nB̄ = ZOH formula"]
    disc_params["Discrete params\n(Ā, B̄, C)"]
    recurrence["Recurrence mode:\nhₜ = Ā·hₜ₋₁ + B̄·xₜ\nyₜ = C·hₜ"]
    convolution["Convolution mode:\ny = x * K\nK = (CB, CAB, ..., CᴬᵏB, ...)"]

    cont_params --> zoh --> disc_params
    disc_params --> recurrence
    disc_params --> convolution
    recurrence -->|inference| out["O(1) per step"]
    convolution -->|training| train["O(L log L) parallel"]
```

### 2.3 Dual Computation Paths

```mermaid
stateDiagram-v2
    [*] --> Mode
    Mode --> ConvMode: Training (full sequence visible)
    Mode --> RecMode: Inference (token-by-token)
    ConvMode --> Parallel: Compute global kernel K\nFFT-based O(L log L)\nAll tokens processed simultaneously
    RecMode --> Sequential: Maintain hidden state h\nO(1) per new token\nOnly h + xₜ needed
```

**Critical property**: S4 (classical SSM) can switch modes because **A, B, C, Δ are time-invariant constants** — the convolution kernel K is the same for all positions.

---

## 3. The Selection Mechanism — S6

### 3.1 The Problem with LTI (Linear Time Invariance)

```mermaid
flowchart TD
    input["Input: [A, B, C, D, -, -, A]"]
    task["Task: Copy only token A, ignore others"]

    lti["LTI SSM: A,B,C,Δ = constants\nCannot distinguish relevant vs. irrelevant tokens\nSame recurrence dynamics for every token"]
    select["S6 (Selective): B,C,Δ = f(xₜ)\nDifferent dynamics per token\nCan gate out irrelevant inputs"]

    input --> task
    task --> lti
    task --> select

    lti -->|"fails Selective Copying"| fail["All tokens treated equally"]
    select -->|"passes Selective Copying"| pass["Filters irrelevant, retains relevant"]
```

### 3.2 Making Parameters Input-Dependent

The key change from S4 → S6: **B, C, Δ become functions of the current input xₜ**:

| Parameter | S4 (LTI) | S6 (Selective) | Tensor shape |
|-----------|----------|----------------|--------------|
| A | (D, N) constant | (D, N) constant | Fixed |
| B | (D, N) constant | **B = Linearₙ(x)** | (B, L, N) |
| C | (D, N) constant | **C = Linearₙ(x)** | (B, L, N) |
| Δ | (D,) constant | **Δ = Broadcast(Linear₁(x))** | (B, L, D) |

```mermaid
sequenceDiagram
    participant Input as xₜ ∈ ℝᴰ
    participant Linear as Linear Projections
    participant SSM as Selective SSM
    participant State as Hidden State hₜ

    Input->>Linear: project input
    Linear-->>SSM: Bₜ = Linearₙ(xₜ)
    Linear-->>SSM: Cₜ = Linearₙ(xₜ)
    Linear-->>SSM: Δₜ = softplus(param + Linear₁(xₜ))
    SSM->>SSM: Discretize: Āₜ = exp(Δₜ·A), B̄ₜ = ZOH(Δₜ,A,Bₜ)
    SSM->>State: hₜ = Āₜ·hₜ₋₁ + B̄ₜ·xₜ
    State-->>SSM: yₜ = Cₜ·hₜ
```

**Consequence**: The model is now **time-varying** — the recurrence parameters change at every step. This breaks the LTI equivalence to convolution, requiring a new computation strategy.

---

## 4. Hardware-Aware Selective Scan — The GPU Algorithm

### 4.1 The Memory Hierarchy Problem

```mermaid
block-beta
  columns 1
  block:gpu["GPU Memory Hierarchy"]:1
    sram["SRAM (on-chip): ~20MB, ~19 TB/s bandwidth\nFast but tiny"]
    hbm["HBM (off-chip): ~80GB, ~2 TB/s bandwidth\nSlow but large"]
  end
  note1["Naive approach: materialize full state h ∈ ℝ^(B,L,D,N)\nB=batch, L=seq len, D=channels, N=state dim\nFor L=1000, D=1024, N=16: ~50GB → doesn't fit in SRAM"]
```

**Root cause of the bottleneck**: The expanded state h has shape (B, L, D, N) — a factor of N (~16–64) larger than input/output (B, L, D). Writing this to HBM on every step is bandwidth-bound.

### 4.2 The Solution: Kernel Fusion + SRAM-Only State

```mermaid
flowchart TD
    subgraph Standard["Naive Approach (slow)"]
        load1["Load (Δ,A,B,C) from HBM"]
        discretize1["Discretize → (Ā,B̄) — write to HBM"]
        scan1["Load (Ā,B̄) from HBM for scan"]
        state1["Compute h — materialize in HBM (LARGE)"]
        output1["Compute y — write to HBM"]
    end

    subgraph Fused["Mamba Fused Kernel (fast)"]
        load2["Load (Δ,A,B,C) from HBM to SRAM"]
        fused["All in SRAM:\n• discretize Δ → Ā,B̄\n• run recurrence scan\n• compute y = C·h"]
        write2["Write only y ∈ (B,L,D) back to HBM\nNever materialize expanded h in HBM"]
    end

    Standard -->|"memory bandwidth bottleneck"| slow["3-10× slower"]
    Fused -->|"all heavy computation in SRAM"| fast["3× faster on A100"]
```

### 4.3 Parallel Scan Algorithm

Even though the recurrence `hₜ = Āₜ·hₜ₋₁ + B̄ₜ·xₜ` appears sequential, it can be parallelized using **prefix scan** (Blelloch 1990):

```mermaid
flowchart TD
    seq["Sequence: h₀, h₁, h₂, h₃, h₄, h₅, h₆, h₇"]

    subgraph "Parallel Scan (O(log L) depth)"
        step1["Step 1: pairs (0,1)(2,3)(4,5)(6,7)\nCompute Ā₁h₀+B̄₁x₁, etc."]
        step2["Step 2: pairs (0..1,2..3)(4..5,6..7)\nMerge prefix computations"]
        step3["Step 3: global prefix\nAll hₜ known simultaneously"]
    end

    seq --> step1 --> step2 --> step3
    step3 --> out["All outputs in O(L) work, O(log L) depth"]
```

**Key property**: An associative binary operator exists for the (Ā, B̄x) recurrence, enabling prefix scan. Each merge operation: `(Ā₂, B̄₂x₂) ∘ (Ā₁, B̄₁x₁) = (Ā₂·Ā₁, Ā₂·B̄₁x₁ + B̄₂x₂)`.

### 4.4 Recomputation for Backpropagation

```mermaid
sequenceDiagram
    participant Forward
    participant SRAM
    participant HBM

    Forward->>SRAM: load (Δ,A,B,C,x)
    SRAM->>SRAM: compute all intermediate h states
    SRAM->>HBM: save only y (small), discard h (large)
    Note over Forward: Backward pass needs intermediate h
    Forward->>SRAM: reload (Δ,A,B,C,x) from HBM
    SRAM->>SRAM: recompute h on the fly during backward
    Note over SRAM: Extra compute but saves N× memory
```

This is the same technique as FlashAttention's recomputation — trade compute for memory. Mamba achieves the **same memory footprint as FlashAttention** despite operating on a larger expanded state.

---

## 5. Mamba Block Architecture

### 5.1 Single Block Design

```mermaid
flowchart TD
    input["Input x ∈ ℝ^(B,L,D)"]
    norm["LayerNorm"]
    linear1["Linear: D → E·D (expand, E=2)"]
    linear2["Linear: D → E·D (gating branch)"]
    conv["Causal Conv1D (local convolution)"]
    silu["SiLU activation"]
    s6["Selective SSM (S6)"]
    gate["Element-wise × (gating)"]
    proj["Linear: E·D → D (project back)"]
    residual["+ Residual connection"]

    input --> norm
    norm --> linear1
    norm --> linear2
    linear1 --> conv --> silu --> s6
    s6 --> gate
    linear2 --> gate
    gate --> proj --> residual
    input --> residual
```

**Parameter count for one block** with expansion E=2:
- Input/output projections: 2ED² + ED² = 3ED²
- SSM parameters: Δ, A, B, C projections — much smaller, ~D·N

### 5.2 Full Mamba Architecture

```mermaid
flowchart TD
    embed["Token Embedding: vocab → D"]
    b1["Mamba Block 1"]
    b2["Mamba Block 2"]
    dots["..."]
    bn["Mamba Block n"]
    norm_final["Final LayerNorm"]
    head["LM Head: D → vocab"]

    embed --> b1 --> b2 --> dots --> bn --> norm_final --> head
    b1 -->|"residual stream"| b2
    b2 -->|"residual stream"| dots
```

**vs. Transformer**: No MHA blocks, no separate MLP blocks. Mamba block integrates both the mixing (SSM) and transformation (gating) in a single homogeneous unit.

---

## 6. Selection Mechanism Interpretations

### 6.1 Connection to Gating in RNNs

The Δ parameter with softplus activation has a deep connection to LSTM forget gates:

```mermaid
flowchart LR
    delta_small["Small Δₜ\n(Δ→0)"]
    delta_large["Large Δₜ\n(Δ→∞)"]

    delta_small -->|"Ā = exp(Δ·A) ≈ I"| forget_not["Keep hidden state\n(remember context)"]
    delta_large -->|"Ā → 0 (for A<0)"| forget_yes["Reset hidden state\n(ignore context, focus on current input)"]
    delta_large -->|"B̄ = ZOH ≈ A⁻¹Bₜ"| attend["Current token fully attended"]
```

When Δ is large: the model **attends** to the current token. When Δ is small: the model **passes** the hidden state unchanged. This is the mechanism that enables **selective copying and induction heads**.

### 6.2 Selective Copy Task — Data Flow

```mermaid
sequenceDiagram
    participant Tokens
    participant Δ
    participant State as Hidden State h
    participant Output

    Tokens->>Δ: token A (relevant) → Δ large
    Δ->>State: Ā≈0: reset state, B̄ large: write A into h
    Tokens->>Δ: token - (irrelevant) → Δ small
    Δ->>State: Ā≈I: keep A in h unchanged
    Tokens->>Δ: token A (relevant again)
    Δ->>State: write A again
    State->>Output: recall A from h at output position
```

---

## 7. Memory Layout — Tensor Dimensions

```mermaid
block-beta
  columns 3
  B["B (batch)"] L["L (sequence)"] D["D (channels/d_model)"]
  block:input["Input x"]:3
    xshape["(B, L, D)"]
  end
  block:expanded["Expanded state h (SRAM only)"]:3
    hshape["(B, L, D, N)\nN = SSM state dim (~16-64)\nNEVER written to HBM"]
  end
  block:output["Output y"]:3
    yshape["(B, L, D)"]
  end
  block:params["Selective params"]:3
    bshape["B: (B,L,N)"] cshape["C: (B,L,N)"] dshape["Δ: (B,L,D)"]
  end
```

**Memory savings vs. naive**: Instead of writing (B,L,D,N) to HBM (~N× larger), only (B,L,D) is written. For N=16, that's 16× less memory bandwidth per layer.

---

## 8. Performance Characteristics

### 8.1 Complexity Comparison

| Model | Training FLOPs | Inference Memory | Inference per step |
|-------|---------------|-----------------|-------------------|
| Transformer | O(L²·D) | O(L·D) KV cache | O(L·D) growing |
| SSM (S4) | O(L·D·N·log L) | O(D·N) constant | O(D·N) constant |
| Mamba (S6) | O(L·D·N) | O(D·N) constant | O(D·N) constant |

```mermaid
graph LR
    subgraph "Inference Memory per token"
        transformer_mem["Transformer: KV cache grows with L\nAt L=100K: ~10GB just for cache"]
        mamba_mem["Mamba: fixed hidden state h\nAt any L: O(D·N) = constant"]
    end
```

### 8.2 Throughput — 5× vs Transformers

```mermaid
flowchart LR
    trans_inf["Transformer inference:\n1. Load K,V cache (grows with context)\n2. Compute attention over all past tokens\n3. Bandwidth-limited by cache size"]
    mamba_inf["Mamba inference:\n1. Load only current state h (fixed size)\n2. One matrix-vector multiply per token\n3. Cache-friendly, constant bandwidth"]

    trans_inf -->|"L=1000 context"| slow2["~10ms per token"]
    mamba_inf -->|"L=1000 context"| fast2["~2ms per token (5× faster)"]
```

---

## 9. Why A Must Remain Constant

Making A input-dependent would destroy the associativity of the scan operator, eliminating the parallel scan parallelization:

```mermaid
flowchart TD
    assoc{"Is (Āₜ, B̄ₜxₜ) ∘ (Āₜ₋₁, B̄ₜ₋₁xₜ₋₁) associative?"}
    yes["YES — because A is diagonal/fixed\nMerge operator is well-defined\nParallel scan O(log L) depth achievable"]
    no["NO — if A is input-dependent\nMerge requires full left-right order\nCannot parallelize beyond O(L)"]

    assoc -->|"A constant"| yes
    assoc -->|"A input-dependent"| no
```

The authors keep A fixed (as a diagonal matrix of negative reals), while making B, C, Δ input-dependent. This is the minimal change that enables selectivity while preserving hardware efficiency.

---

## 10. Data Flow Summary — Forward Pass

```mermaid
sequenceDiagram
    participant Input as x ∈ (B,L,D)
    participant LinearProj as Linear Projections
    participant Discretize as Discretizer (ZOH)
    participant Scan as Parallel Scan (SRAM)
    participant Output as y ∈ (B,L,D)

    Input->>LinearProj: project x → B:(B,L,N), C:(B,L,N), Δ:(B,L,D)
    LinearProj->>Discretize: compute Ā=exp(Δ·A), B̄=ZOH(Δ,A,B)
    Note over Discretize: All in SRAM — no HBM writes
    Discretize->>Scan: Ā:(B,L,D,N), B̄:(B,L,D,N), C:(B,L,N)
    Scan->>Scan: Parallel prefix scan\nhₜ = Āₜhₜ₋₁ + B̄ₜxₜ
    Scan->>Output: yₜ = Cₜ · hₜ\nwrite (B,L,D) to HBM
```

---

## Key Invariants

| Property | Classical S4 | Mamba S6 |
|----------|-------------|----------|
| Parameters | Time-invariant | Input-dependent (B,C,Δ) |
| Computation mode | Conv (train) + RNN (infer) | Scan (train) + RNN (infer) |
| State materialization | Can use convolution kernel K | SRAM-only fused kernel |
| Selectivity | No content-awareness | Full content-aware gating |
| Inference memory | O(D·N) | O(D·N) |
| Training complexity | O(L log L) | O(L) |
| Backprop strategy | Standard | Recomputation (like FlashAttention) |

Mamba demonstrates that the Transformer's quadratic complexity is not a fundamental requirement for powerful sequence modeling — it is an artifact of not compressing context selectively. By making compression content-aware via input-dependent parameters and computing efficiently via SRAM-resident parallel scan, Mamba achieves O(L) training, O(1) inference, and Transformer-matching quality.
