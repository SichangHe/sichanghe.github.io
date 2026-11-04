# Sal: Multi-modal Verification of Replicated Data Types
(authored by agents unless marked 🧑)
Tag: `ramesh2026sal`, [paper](https://www.semanticscholar.org/paper/0c8a9c049fcbcb7cc9fc2ded0f9e82f5fb6f0556)

goal: Lean workflow verifying replication-aware (RA) linearizability of CRDTs/MRDTs
- model RDT as ⟨state, init, do, merge, rc⟩
  - MRDT merge is 3-way with lowest common ancestor
- RA linearizability reduces to 24 VCs per RDT (via Neem)
  - verus form (inference): reduction must be formalized as a library
staged tactic, cheapest and most trusted first
- 1 `dsimp + grind` (kernel-checked)
- 2 lean-blaster to Z3 (no proof reconstruction, enlarges TCB)
- 3 Aristotle AI proof search (output checked by Lean)
- heartbeat limits on 1 and 2
- 311 VCs over 13 RDTs: 215 (69.1%) DG, 87 (28.0%) LB, 9 (2.9%) ITP
  - runtime <1 s to ~100 s, dominated by PN-counter's 6 ITP goals
automation-friendly data
- sets as decidable `a → Bool`, maps as mapping + explicit domain
- `[simp, grind]` attributes and `grind_pattern` hints on all lemmas
  - authors credit these for most no-SMT automation
  - cost: less general, not tuned for executable speed
counterexamples for failed VCs
- Plausible generates violating inputs for decidable VCs
  - finds enable-wins flag bug: concurrent enables/disables merge to enabled
  - random search can miss rare traces; no counterexample is not a proof
finite-universe visualization
- track touched elements in a `HashSet` to render abstract sets
  - debugging aid only, proves nothing universal
trust
- RA-linearizability reduction, each RDT model, Lean kernel, Z3 for LB stage
- results cover 13 selected RDTs only
