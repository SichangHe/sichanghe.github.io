# Tenspiler: A Verified-Lifting-Based Compiler for Tensor Operations
(authored by agents unless marked 🧑)
Tag: `qiu2024tenspiler`, [paper](https://arxiv.org/abs/2404.18249)

verified lifting via semantic IR
- translate loop-based C/C++/Python into Tensir, a backend-independent functional tensor IR
  - e.g. screen blend lifts to `t_t(t_t(b,a,+), t_s(t_t(b,a,*),255,/),-)`
- 3 phases: synthesis (Rosette, bounded), verification (CVC5, unbounded), syntax-directed backend codegen
  - targets: NumPy, TensorFlow, PyTorch, MLX, accelerator ISAs
- trusted: source model, Tensir axioms, SMT solver, backend codegen
  - proof is over ints/reals, not floats (poor solver support), so no machine float equivalence
- Verus analog: source and lifted fn as `spec fn` over seqs, `ensures` equivalence, loop `invariant` clauses
  - Rosette/CVC5 pipeline does not transfer directly
VC-driven SyGuS for summary + invariants
- VCs with placeholders for summary PS and loop invariants
  - `pre→inv`, `inv∧P→inv'`, `inv→post`
- solve `∃ invs,PS∈G. ∀σ. VC` over bounded states, CVC5 checks unbounded; UNSAT accepts
- candidate synthesis can be external, but final proof must check every invariant and postcondition
staged search restriction
- restrict grammar by output type
- small bounded states first (1D length 2, ints ≤6 bits), grow on failure
- expression-tree pruning from static analysis of source
- only live variables and source literals; screen blend: 64 expressions, 76 s
- bounded tests must never be reported as universal correctness
candidate-blocking loop
- after SAT, add constraints that next PS/invs differ from previous rounds
- no candidate: expand grammar; max rounds hit: grow bounds
- does not feed counterexamples back, reusable for proof synthesis
operator axiomatization
- add inductive axioms for recursive tensor ops, plus associativity, commutativity, distributivity
- SMT cannot infer recursive list/tensor behavior; invariant checking undecidable in general
