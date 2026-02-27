# Mathematical Computing Internals: Numerical Methods, Linear Algebra & Optimization

> Under the Hood: How floating-point arithmetic loses precision, how matrix decompositions factor linear systems, how gradient descent navigates loss landscapes, how FFT reduces O(N²) to O(N log N), how numerical integration accumulates error — the exact algorithms, mathematical guarantees, and computational mechanics.

---

## 1. Floating-Point Arithmetic: IEEE 754 Internals

```mermaid
flowchart TD
    subgraph "IEEE 754 Double Precision (64-bit)"
        BITS["64 bits:\n  bit 63: sign (1 bit)\n  bits 52-62: exponent (11 bits) biased by 1023\n  bits 0-51: mantissa / fraction (52 bits)"]
        VALUE["value = (-1)^sign × 2^(exp-1023) × 1.mantissa\n(implicit leading 1 in normalized form)"]
        RANGE["Range: ±5×10⁻³²⁴ to ±1.8×10³⁰⁸\nPrecision: ~15-17 significant decimal digits\nEpsilon: 2⁻⁵² ≈ 2.22×10⁻¹⁶"]
        BITS --> VALUE --> RANGE
    end
    subgraph "Special Values"
        INF["+∞: exp=all_ones, mantissa=0\n1/0 = +∞ (not exception)"]
        NAN["NaN: exp=all_ones, mantissa≠0\n0/0 = NaN, sqrt(-1) = NaN\nNaN ≠ NaN (always!)"]
        DENORM["Denormalized: exp=0\n→ implicit leading 0 instead of 1\nGradual underflow near 0"]
        INF --> NAN --> DENORM
    end
```

### Catastrophic Cancellation

```mermaid
flowchart TD
    subgraph "Example: Quadratic Formula"
        EQ["x = (-b ± sqrt(b²-4ac)) / 2a\nb=1000, a=0.001, c=0.001"]
        NAIVE["Naive: x₁ = (-1000 + sqrt(1000000-0.000004)) / 0.002\n       = (-1000 + 999.999998) / 0.002\n       = 0.000002 / 0.002\n       = 0.001  ← WRONG (cancelled digits!)"]
        STABLE["Stable: use x₂ = -b-sqrt(b²-4ac) / 2a\nthen x₁ = c / (a × x₂)  (from Vieta's formulas)\n       = 0.001 / (0.001 × -1000.000002)\n       ≈ -1e-6  ← Correct!"]
        EQ --> NAIVE
        EQ --> STABLE
    end
```

**Machine epsilon**: The smallest ε such that `1.0 + ε ≠ 1.0` in floating point. For doubles, ε ≈ 2.22×10⁻¹⁶. Adding 1e16 to 1.0 gives 1e16 (the 1 is lost!).

---

## 2. Matrix Decompositions: LU, QR, SVD

### LU Decomposition (Gaussian Elimination)

Factors matrix A = L × U where L is lower triangular, U is upper triangular. Used to solve Ax = b via forward/back substitution in O(N³).

```mermaid
flowchart LR
    subgraph "LU Factorization: Gaussian Elimination"
        A["A = [4  3]\n     [6  3]"]
        ELIM["Elimination step:\n  m₂₁ = a₂₁/a₁₁ = 6/4 = 1.5\n  Row 2 -= 1.5 × Row 1:\n  [6,3] - 1.5×[4,3] = [0, -1.5]"]
        LU["L = [1    0 ]\n     [1.5  1 ]\nU = [4   3 ]\n     [0  -1.5]"]
        SOLVE["Solve Ax=b: LUx=b\n1. Ly=b (forward sub, O(N²))\n2. Ux=y (backward sub, O(N²))"]
        A --> ELIM --> LU --> SOLVE
    end
```

### Partial Pivoting: Numerical Stability

```mermaid
flowchart TD
    PROB["Without pivoting:\n  small pivot a₁₁ → large multiplier m\n  amplifies rounding errors\n  Condition number blows up"]
    FIX["Partial Pivoting:\n  before each elimination step,\n  swap rows to maximize |pivot|\n  Permutation matrix P tracks swaps\n  PA = LU"]
    PROB --> FIX
```

### SVD: Singular Value Decomposition

A = U × Σ × Vᵀ — the fundamental matrix decomposition:

```mermaid
flowchart TD
    subgraph "SVD Components"
        U["U: m×m orthogonal\n(left singular vectors\n= principal directions of output space)"]
        SIGMA["Σ: m×n diagonal\n(singular values σ₁≥σ₂≥...≥σₙ≥0\n= importance of each direction)"]
        VT["Vᵀ: n×n orthogonal\n(right singular vectors\n= principal directions of input space)"]
        U --> SIGMA --> VT
    end
    subgraph "Applications"
        PCA["PCA: SVD of data matrix\n(data - mean)\nSingular vectors = principal components\nσᵢ² proportional to variance explained"]
        LSQ["Least Squares: Ax≈b\nx = V × Σ⁺ × Uᵀ × b\n(pseudoinverse: replace σᵢ with 1/σᵢ\nif σᵢ > threshold, else 0)"]
        COMPRESS["Image compression:\nkeep top k singular values\nA_k = Σᵢ₌₁ᵏ σᵢ uᵢ vᵢᵀ\nRank-k approximation\n(Eckart-Young theorem: optimal)"]
        PCA --> LSQ --> COMPRESS
    end
```

---

## 3. Fast Fourier Transform: Butterfly Network

DFT: `X[k] = Σₙ₌₀ᴺ⁻¹ x[n] × e^(-2πi×k×n/N)` — naively O(N²).

FFT (Cooley-Tukey) reduces to O(N log N) by **divide and conquer**:

```mermaid
flowchart TD
    subgraph "FFT Divide and Conquer (N=8)"
        X["DFT of x[0..7]"]
        XE["DFT of x[0,2,4,6] (even)\n= X_even[k]"]
        XO["DFT of x[1,3,5,7] (odd)\n= X_odd[k]"]
        COMBINE["Combine:\n  X[k]   = X_even[k] + W^k × X_odd[k]\n  X[k+N/2] = X_even[k] - W^k × X_odd[k]\n  W = e^(-2πi/N) (twiddle factor)"]
        X --> XE --> COMBINE
        X --> XO --> COMBINE
    end
    subgraph "Butterfly Diagram"
        B["Two inputs: a, b\nOne twiddle: W\nOutputs:\n  a + W×b  (sum)\n  a - W×b  (diff)\nAll N log N butterflies\ncomputed in-place"]
    end
```

### FFT Memory Access Pattern

```mermaid
flowchart LR
    subgraph "Bit-Reversal Permutation (pre-processing)"
        P["Input re-ordered by bit-reversed index:\nn=0(000)→0, n=1(001)→4, n=2(010)→2,\nn=3(011)→6, n=4(100)→1, ...\nAllows in-place butterfly with\nsequential memory access in passes"]
    end
    subgraph "Pass Structure"
        PASS1["Pass 1: span=2 butterflies (N/2 butterflies)"]
        PASS2["Pass 2: span=4 butterflies (N/4 groups)"]
        PASS3["Pass 3: span=8 butterflies (N/8 groups)"]
        PASSn["... log₂(N) passes total"]
        PASS1 --> PASS2 --> PASS3 --> PASSn
    end
```

---

## 4. Numerical Integration: Error Analysis

### Trapezoidal Rule vs Simpson's Rule

```mermaid
flowchart TD
    subgraph "Quadrature Rules"
        TRAP["Trapezoidal Rule:\n∫ₐᵇ f(x)dx ≈ h/2 × (f(a) + 2f(a+h) + ... + f(b))\nError: O(h²) per step, O(h²) global"]
        SIMP["Simpson's Rule:\n∫ₐᵇ f(x)dx ≈ h/3 × (f(a) + 4f(a+h) + 2f(a+2h) + ...)\nError: O(h⁴) per step, O(h⁴) global\n(uses parabola, not line fit)"]
        GAUSS["Gaussian Quadrature:\nOptimally place N nodes + weights\nExact for polynomials of degree ≤ 2N-1\n(using Legendre polynomial roots as nodes)"]
        TRAP --> SIMP --> GAUSS
    end
    subgraph "Adaptive Quadrature"
        ADAPT["Adaptive: estimate local error\n  compute I(a,b) with coarse N\n  compute I(a,b) with fine 2N\n  if |I_coarse - I_fine| < tol: done\n  else: bisect [a,b] and recurse\nConcentrates effort on\ncurvy/singular regions"]
    end
```

---

## 5. Linear Programming: Simplex Method Internals

Optimize `cᵀx` subject to `Ax ≤ b, x ≥ 0`.

```mermaid
flowchart TD
    subgraph "Simplex Algorithm"
        INIT["Start at a basic feasible solution\n(corner of feasible polytope)"]
        CHECK["Check optimality:\nare all reduced costs ≥ 0?\n(current vertex is optimal)"]
        PIVOT["Select entering variable:\nmost negative reduced cost\n(steepest edge heuristic)"]
        RATIO["Ratio test:\nminimum ratio min(bᵢ/aᵢⱼ) for aᵢⱼ>0\n→ leaving variable (prevents cycling)"]
        MOVE["Pivot: swap entering ↔ leaving\n(Gauss-Jordan elimination on tableau)\nMove to adjacent vertex"]
        INIT --> CHECK
        CHECK -->|not optimal| PIVOT --> RATIO --> MOVE --> CHECK
        CHECK -->|optimal| DONE["Optimal solution found"]
    end
```

**Worst case vs average case**: Simplex is exponential in the worst case (Klee-Minty cube) but polynomial in practice. Interior-point methods (IPM) are polynomial O(N³·⁵) in theory but simplex often faster in practice for sparse LP.

---

## 6. Gradient Descent: Loss Landscape Navigation

```mermaid
flowchart TD
    subgraph "Gradient Descent Variants"
        BGD["Batch GD:\n  grad = (1/N) Σ ∇L(xᵢ, yᵢ, θ)\n  Uses ALL N samples per step\n  Exact gradient, slow per step"]
        SGD["Stochastic GD:\n  grad = ∇L(x₁, y₁, θ)\n  Uses 1 sample per step\n  Noisy gradient, fast per step\n  Noise helps escape local minima!"]
        MINI["Mini-batch GD:\n  grad = (1/B) Σᵦ ∇L(xᵢ, yᵢ, θ)\n  B = 32-512 samples\n  GPU-vectorized, practical standard"]
        BGD --> MINI
        SGD --> MINI
    end
    subgraph "Adam Optimizer Internal State"
        ADAM["θ_t+1 = θ_t - α × m̂_t / (√v̂_t + ε)\nwhere:\n  g_t = ∇L (current gradient)\n  m_t = β₁×m_{t-1} + (1-β₁)×g_t  (1st moment/momentum)\n  v_t = β₂×v_{t-1} + (1-β₂)×g_t²  (2nd moment/RMS)\n  m̂_t = m_t / (1-β₁ᵗ)  (bias correction)\n  v̂_t = v_t / (1-β₂ᵗ)  (bias correction)\nTypical: β₁=0.9, β₂=0.999, α=0.001, ε=1e-8"]
    end
```

### Learning Rate Scheduling

```mermaid
flowchart LR
    subgraph "Warmup + Cosine Decay Schedule"
        WU["Warmup (0→T_warm):\n  lr = lr_max × t/T_warm\n  Avoids large gradient steps\n  at random initialization"]
        COS["Cosine Decay (T_warm→T_max):\n  lr = lr_min + 0.5×(lr_max-lr_min)×\n  (1 + cos(π×(t-T_warm)/(T_max-T_warm)))\n  Smooth decay to lr_min\n(used in BERT, GPT training)"]
        WU --> COS
    end
```

---

## 7. Monte Carlo Methods: Convergence and Variance Reduction

```mermaid
flowchart TD
    subgraph "Basic Monte Carlo Integration"
        MC["∫ f(x) dx over [a,b]\n≈ (b-a)/N × Σᵢ f(xᵢ)  where xᵢ ~ Uniform[a,b]\nError: O(1/√N) — rate independent of dimension!\n(vs Simpson's O(h⁴) degrading in higher dims)"]
    end
    subgraph "Variance Reduction Techniques"
        IS["Importance Sampling:\nSample from q(x) ∝ |f(x)|\nEstimator: (1/N) Σ f(xᵢ)/q(xᵢ)\nLower variance when q matches f's peaks"]
        CV["Control Variates:\ng(x) known integral, correlated with f\nestimate f-g, add E[g]\nVar[f-g] < Var[f] when Cov(f,g)>0"]
        QUASI["Quasi-Monte Carlo:\nLow-discrepancy sequences (Halton, Sobol)\nbetter than uniform random sampling\nO(1/N) error rate for smooth f\n(vs O(1/√N) for random)"]
        IS --> CV --> QUASI
    end
```

---

## 8. Graph Algorithms: Mathematical Foundations

### Shortest Path: Dijkstra and Bellman-Ford

```mermaid
flowchart TD
    subgraph "Dijkstra Internal Mechanics"
        INIT["dist[source]=0, dist[v]=∞ for all v\nmin-heap H = {(0, source)}"]
        LOOP["Extract min (u, d_u) from H\nFor each neighbor v:\n  if d_u + w(u,v) < dist[v]:\n    dist[v] = d_u + w(u,v)\n    push (dist[v], v) to H"]
        TERM["Terminate when H empty\nCorrect for non-negative weights\nO((V+E) log V) with binary heap"]
        INIT --> LOOP --> TERM
    end
    subgraph "Bellman-Ford: Negative Weights"
        BF["Relax ALL edges V-1 times:\n  for i in 1..V-1:\n    for each edge (u,v,w):\n      dist[v] = min(dist[v], dist[u]+w)\nV-th relaxation: if any dist improves\n→ negative cycle detected\nO(VE) time"]
    end
```

### Maximum Flow: Ford-Fulkerson and Augmenting Paths

```mermaid
flowchart LR
    subgraph "Residual Graph"
        G["Original graph:\nCapacity(S→A)=10, Cap(A→T)=10"]
        RG["Residual graph:\nForward: S→A cap=10-flow\nBackward: A→S cap=flow\n(allows 'undoing' flow)"]
        G --> RG
    end
    subgraph "Edmonds-Karp (BFS augmentation)"
        BFS["BFS in residual graph\nFind shortest augmenting path S→T\nAugment by bottleneck capacity\nRepeat until no path found\nO(VE²) — polynomial!"]
    end
```

---

## 9. Eigenvalues: Power Iteration and QR Algorithm

```mermaid
flowchart TD
    subgraph "Power Iteration (Dominant Eigenvalue)"
        PI["Start: random vector v₀\nIterate: v_{t+1} = A×v_t / ||A×v_t||\nConverges to eigenvector of largest |λ|\nRate: |λ₂/λ₁|ᵗ — fast if eigenvalues well-separated"]
    end
    subgraph "QR Algorithm (All Eigenvalues)"
        QR["Initialize: A₀ = A\nRepeat:\n  Factor: Aₜ = Qₜ × Rₜ  (QR decomposition)\n  Update: A_{t+1} = Rₜ × Qₜ  (reversed product)\nConverges: Aₜ → upper triangular\nDiagonal = eigenvalues\nProduct of Qᵢ = eigenvectors\nO(N³) per iteration, fast convergence"]
    end
```

---

## 10. Information Theory Foundations

```mermaid
flowchart TD
    subgraph "Entropy and KL Divergence"
        ENTROPY["Shannon Entropy:\nH(X) = -Σ P(x) log₂ P(x) [bits]\nMeasures: average information per symbol\nUniform dist: H = log₂(N) [maximum]\nOne certain outcome: H = 0 [minimum]"]
        
        CROSS["Cross-Entropy:\nH(P,Q) = -Σ P(x) log Q(x)\n= H(P) + KL(P||Q)\nLoss function in ML classification:\n= -log Q(correct_class)\n(minimizing cross-entropy = maximizing\nlog-likelihood of true distribution P)"]
        
        KL["KL Divergence:\nKL(P||Q) = Σ P(x) log(P(x)/Q(x))\nNon-symmetric: KL(P||Q) ≠ KL(Q||P)\nKL(P||Q)=0 iff P=Q\nUsed in VAE loss, RL policy optimization"]
        
        ENTROPY --> CROSS
        ENTROPY --> KL
    end
    subgraph "Data Compression: Huffman Coding"
        HUFF["Build min-heap of symbol frequencies\nRepeatedly merge two lowest-freq nodes\nLeft branch: 0, right branch: 1\nFrequent symbols → short codes\nOptimal prefix-free code\nApproaches entropy H(X) bits/symbol"]
    end
```

---

## 11. Numerical Stability: Condition Numbers

```mermaid
flowchart TD
    subgraph "Condition Number κ(A)"
        DEF["κ(A) = ||A|| × ||A⁻¹||\n= σ_max / σ_min  (ratio of largest to smallest singular value)\nMeasures: how much relative error in b\namplifies relative error in x for Ax=b"]
        INTERP["κ(A) = 1: perfectly conditioned (orthogonal matrix)\nκ(A) = 100: losing ~2 decimal digits of precision\nκ(A) = 10¹⁵: near singular — useless results\nRule: lose ≈ log₁₀(κ) decimal digits"]
        DEF --> INTERP
    end
    subgraph "Preconditioning"
        PREC["Replace Ax=b with M⁻¹Ax = M⁻¹b\nChoose M ≈ A so M⁻¹A ≈ I\n→ κ(M⁻¹A) << κ(A)\nCommon: diagonal scaling M=diag(A)\nJacobi preconditioner\nImproves convergence of iterative solvers (CG, GMRES)"]
    end
```

---

## Summary: Mathematical Computing Properties

| Algorithm | Complexity | Numerical Issues | Mitigation |
|---|---|---|---|
| Gaussian elimination | O(N³) | Pivot blowup | Partial pivoting |
| FFT | O(N log N) | Round-off accumulation | Double precision |
| Conjugate Gradient | O(N√κ) iterations | κ large → slow convergence | Preconditioning |
| Power iteration | O(N² per iter) | Slow if λ₁≈λ₂ | Deflation |
| QR eigenvalue | O(N³ per iter) | Non-Hermitian → complex eig | Hessenberg reduction |
| Monte Carlo | O(1/√N) | Variance proportional to f² | Importance sampling |
| Backprop | O(N params) | Vanishing/exploding gradients | Layer norm, gradient clip |
