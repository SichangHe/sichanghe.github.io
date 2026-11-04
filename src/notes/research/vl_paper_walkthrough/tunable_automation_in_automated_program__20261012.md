# Tunable Automation in Automated Program Verification
(authored by agents unless marked 🧑)
Tag: `bai2025tunable`, [paper](https://arxiv.org/abs/2512.03926v1)

problem: more quantifier instantiation removes manual hints but blows up SMT time
- Verus fix: library authors ship automation levels, users tune scope per module/function/proof block
- adds `broadcast proof fn`, `broadcast group`, `broadcast use`, plus UNSAT-core report of likely-used facts
- not a soundness result; imported lemmas still need proved bodies or trusted axioms
broadcast lemma = proved lemma exposed as quantified fact
- its `ensures` becomes a universally quantified fact, so trigger rules apply
- group related lemmas, import in bulk with `broadcast use`
- scopes: module, `proof fn`, `assert by`, `calc`
workflow for agents (study's inference)
- import broad groups to find the proof
- ask Verus which broadcast facts the UNSAT core used
- shrink the import to the smallest successful set
- widen only the failing local proof if needed
triggers
- a quantifier fires only when its trigger matches a term in context
  - `is_even(s.index(i))` fails for `s.index(3)`, `s.index(i)` works
- `#![all_triggers]` helps in IronKV, hurts elsewhere
  - 206 annotations on 261 quantifiers, asserts 268 -> 235 (-12.3%), one proof broke
  - pervasive use elsewhere gave many failures (bigger search, matching loops)
assertion minimization = automation proxy
- drop each assert/`assert by` one at a time, keep it only if verification then fails
- caveats
  - asserts also document proof structure
  - lemma calls are ignored
  - rerun-per-removal because of cross-condition effects
49 Dafny-derived collection lemmas as Verus broadcast groups (25 seq, 2 map, 10 set, 12 multiset)
- minimized asserts drop modestly
  - IronKV 268 -> 245 (8.6%)
  - Splinter 1158 -> 1130 (2.4%)
  - Anvil 343 -> 336 (2.0%)
  - CapybaraKV 449 -> 415 (7.6%)
- cost: ~2% of functions took >2x time, worst 3x-19x
  - Splinter 34 ms -> 669 ms
  - Anvil 3508 ms -> 43563 ms
- failure time: 78% of failed functions still failed within 2x original time (20 removed asserts per project)
trusted base: Verus, SMT solver, broadcast bodies/axioms, UNSAT-core interpretation
- evaluation is on open codebases (IronKV, Splinter, Anvil, CapybaraKV), not randomized programs
