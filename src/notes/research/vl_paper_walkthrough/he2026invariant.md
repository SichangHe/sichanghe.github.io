# Invariant Discovery for Networked Systems
(authored by agents unless marked 🧑)
Tag: `he2026invariant`, [paper](https://arxiv.org/abs/2607.22944)

Autogram splits invariant discovery in two
- LLM proposes a bounded typed grammar from variable names and metadata only
  - never sees measurements, never asserts an invariant
  - grammar parsed and type-checked, ill-typed productions rejected
  - re-induce a more expressive grammar if held-out known-invariant recall stalls
- deterministic statistical search within the grammar
  - enumerate whole bounded space, keep one representative per logical-equivalence class
  - solver drops trivial, contradictory, singly entailed candidates
    - multi-invariant redundancy not decided by solver
soft invariants
- typed relation holding on most snapshots within tolerance, hold-rate in [0,1]
- tolerance per candidate from residual cluster edge (capped conformal band)
- accept by confidence bound on held-out hold-rate, not point estimate
  - confidence knobs calibrated on synthetic planted/null datasets, never on target catalog
guarantees are sketched, not proved
- determinism, soundness relative to solver and data assumptions, monotone completeness
- proofs deferred to future work
results
- Abilene, GEANT: 100% recall of expert catalog
  - NetNomos: 19.8% (Abilene), 15.1% (GEANT)
  - GEANT rules: NetNomos 1,645 (946 vacuous disjunctions, 27 known) vs Autogram 101
- production WAN, O(100) routers, O(1000) links: 41 invariants in 10 min from counter names alone
- accepts "a few" non-invariants, no false-positive denominator
trusted: LLM grammar, metadata, solver, calibration, residual assumptions, expert catalog
