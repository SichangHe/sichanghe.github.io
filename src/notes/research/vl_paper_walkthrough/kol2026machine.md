# A Machine-Verified Proof of a Quantum-Optimization Conjecture
(authored by agents unless marked 🧑)
Tag: `kol2026machine`, [paper](https://doi.org/10.48550/arxiv.2606.29687)

result
- Claude Fable 5 proved the FGG conjecture for depth-p QAOA on even rings, Lean 4 accepted it end to end
  - optimum approximation ratio (2p+1)/(2p+2) when 2p+2 ≤ n
  - open for over a decade
  - formal theorem `residualEnergy_isLeast`: lower bound + explicit construction
frozen statement + agentic compiler loop
- humans build the definitions and known lemmas, isolate one open proposition
- model writes a plan, converts to Lean, compiles, reads diagnostics, revises until kernel accepts
  - python numerical checks only used while planning, never in the certificate
- trust boundary = human-audited statement and definitions + Lean kernel + Mathlib axioms
  - generated proof is not trusted
  - Lean acceptance does not show the statement matches the intended claim
- no report of attempt count or compiler iterations
math reduction the model used
- jordan-wigner + translation invariance split the ring into independent momentum modes
  - each mode is an SU(2) rotation; optimum iff every mode steered to its cost axis
- steering becomes one antipalindromic polynomial T(w)=c(w^M−1)/(w+1), M=2p+2
- fejér-riesz completes T, haah's theorem factors it constructively into QAOA angles
verus relevance
- only the generate-then-certify loop transfers; the algebra needs complex/QSP libraries Verus lacks
