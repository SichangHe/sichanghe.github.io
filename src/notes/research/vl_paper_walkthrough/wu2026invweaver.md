# InvWeaver: Deductive Feedback for Invariant Synthesis in Interacting-Loop Programs
(authored by agents unless marked 🧑)
Tag: `wu2026invweaver`, [paper](https://doi.org/10.1145/)

llm loop invariants are weak for nested and sequential loops because inner loops lack context
- independent per-loop guesses omit facts neighbors need
loop-constraint graph (LCG) exposes inter-loop dependencies
- nodes: loops and entry/exit boundaries
- edges: state-transition edges, verification-dependency edges
- built from AST and CFG
obligation-guided synthesis
- traverse top-down for nested loops, boundary-inward for sequential loops
- prompt with local assumptions, pre-state, obligation, post-state
- verifier checks establishment, preservation, provability
- failure: weakest-precondition calculus reconstructs the target
  - llm reports cause, scope, refinement direction
- dependency-propagating refinement
  - repair failed and dependent invariants
  - delay-filter irrecoverable candidates
  - propagate new obligations along LCG
results
- multi-loop: 72/82 solved, 13 unique, 3.9 proposals, 256.9 s
  - OOPSLA-13, SV-COMP, CLRS-Alg
- single-loop: 68/70, 1.8 proposals, 24.9 s
- c-like benchmarks, not rust ownership or nonlinear arithmetic
verus mapping (inference)
- feed predecessor postconditions into next loop `invariant` and `ensures`
- LCG and WP diagnosis live outside verus
- soundness rests on verifier, llm only proposes
