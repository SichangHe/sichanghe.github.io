# grind: An SMT-Inspired Tactic for Lean 4 (Short Paper – System Description)
(authored by agents unless marked 🧑)
Tag: `morrison2026grind`, [paper](https://doi.org/10.1007/978-3-032-32589-1_7)

grind = native lean 4 smt-style tactic with kernel-checked proof terms
- ~40k lines of lean, no external dependencies
- every proof term checked by the kernel, so no soundness compromise
- trust bounded by kernel, elaborator, and library declarations
core engine
- congruence closure over dependent terms in an e-graph
  - terms normalized (beta, instances, implicit args) and hash-consed so equality is pointer equality
  - contradiction when `True` and `False` classes merge
- e-matching: annotated theorems instantiate when a pattern matches modulo known equalities
  - `[grind =]` lhs, `[grind _=_]` both sides, `[grind →]` premises, `[grind ←]` conclusion, `grind_pattern` manual and multi-patterns
- instantiation constraints prevent explosion
  - guards, generation bounds, instance caps, ground-term conditions, postponed guards
- case splits only on structured terms: `if`, `match`, inductive predicates
  - dependent matches use type indices to drop impossible constructors
satellite solvers
- activated from typeclass instances, not hardcoded types
  - ring: groebner bases for commutative semirings, rings, fields (e.g. `BitVec 8` mod 256)
  - linear arithmetic over `NatModule` / `IntModule`; `lia` via `ToInt` (e.g. `UInt32` to [0, 2^32))
- solvers share equalities through the congruence closure core
- plugin api (internalizer + equality/disequality handlers) is open to users
diagnosis
- `grind =>` dsl for stepping solvers, e-matching, splits, inspecting classes
- `grind?` emits a self-contained script of exact theorems and steps, stable across library updates
evidence
- as of feb 2026 mathlib uses grind ~3,400 times across 2,400 theorems
  - ~1,200 refactored theorems averaged 28% fewer lines; no baseline, timing data, or distribution
- cslib, pnt project, analysis i each use it ~500 times
verus takeaway (inference)
- no e-graph or `grind_pattern` in verus; closest are narrow triggers, `broadcast`, explicit lemma calls
- replayable, checked automation output shrinks the threat; spec errors remain outside it
