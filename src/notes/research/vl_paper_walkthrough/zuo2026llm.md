# From LLM-Generated Conjectures to Lean Formalizations: Automated Polynomial Inequality Proving via Sum-of-Squares Certificates
(authored by agents unless marked 🧑)
Tag: `zuo2026llm`, [paper](https://doi.org/10.1016/j.jsc.2011.08.002)

NSPI: LLM proposes SOS structure, symbolic computation repairs it exactly, Lean checks it
- target: unconstrained nonnegativity f(x) ≥ 0 over R^n; 522 benchmark problems (PolyIneqBench)
- SOS certificate f = ∑ fᵢ² = vᵀGv with PSD Gram matrix G is sufficient, not complete
  - nonnegative non-SOS polynomials are out of scope
neural SOS conjecturer
- training data: polynomial–SOS pairs from PSD Gram matrices
  - computation-driven: spectral shift, factor construction, LMI optimization
  - structure-driven: controlled sparsity/coefficient patterns
- SFT cold start, then curriculum RL
- sample several structures, rank by coefficient-reconstruction error
- pass rate within 1 hour falls with variable count n
  - 44.1% (n=3), 40.3% (4), 36.7% (5), 29.5% (6)
  - 26.7% (7), 21.7% (8), 15.0% (9), 11.7% (10)
symbolic correction
- Newton refinement of G minimizing ‖f̂ − vᵀGv‖, then rational recovery
- exact equality must pass before trusting numeric output
- failures: ill-conditioned starts, failed rational recovery, non-PSD after rounding
Lean template
- fill fixed theorem with polynomial + exact square list
- discharge expansion equality, then nonnegativity of each square
- Lean kernel checks; LLM, Newton, rational recovery, harness remain outside trust boundary
Verus takeaway (inference)
- LLM proposes only coefficients; exact checker via proof fn equality + square lemmas decides
- PSD via factorization G = LᵀDL, no floating-point premise
- Verus has no real-algebra solver, so certificates need explicit arithmetic lemmas
