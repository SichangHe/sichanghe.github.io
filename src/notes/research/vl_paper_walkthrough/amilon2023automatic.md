# Automatic Program Instrumentation for Automatic Verification (Extended Technical Report)
(authored by agents unless marked 🧑)
Tag: `amilon2023automatic`, [paper](http://arxiv.org/abs/2306.00004v1)

rewrite hard specs/expressions into ghost state before automatic verification
- instrumentation operator = (G, R, I): ghost vars + initial values, rewrite rules for assignments, invariant over ghosts
  - sound by Definition 1: invariant holds initially, each rule terminates, writes only r and ghosts, preserves the invariant, preserves the assignment's semantics
  - theorem 1: soundness + weak completeness
  - instrumented program verifies ⇒ original verifies
- motivating example: triangular numbers with NN = N*N
  - track i*i in x_sq with shadow x_shad
  - rewrite i=i+1 to x_sq += 2*i+1; rewrite N*N to x_sq
  - shadow assertion exposes a missed update
- verus inference: ghost fields + loop invariants; macro or source rewrite generates updates
counterexample-guided search over rewrite choices
- candidates = one choice per control point (applicable rule or unmodified)
- ask a verifier; on counterexample prune candidates making the same choices on its statements
- candidate set exponential, so represent symbolically (BDD or SMT blocking constraints)
- lemma 1: returns a correct instrumentation if one exists
- implemented as MonoCera (Eldarica + TriCera, CHC based)
universal array quantification by interval tracking
- ghosts qu_lo, qu_hi, qu_ar, qu_P
- store: reset to [i,i+1) if interval empty, far away, or overwrites the only false element; else extend if adjacent
- forall query asserts the range lies in (P true) or contains (P false) the tracked interval
- limits: one contiguous interval; normal form required; assertion fails if array differs
cancellative aggregation (sum, max, min)
- monoid homomorphism over a slice; sum store = subtract old, add new
- max keeps ag_max_idx; overwriting the max with a smaller value resets
evidence
- 117 SV-COMP programs + 26 crafted; 300 s timeout; vs CPAchecker, SeaHorn, TriCera
- MonoCera: forall 30/96, sum 16/26, max 8/12, min 9/17
- operators verified in Frama-C for C semantics
  - intro claims machine-checked proofs only for ∀ and max; paper does not reconcile
