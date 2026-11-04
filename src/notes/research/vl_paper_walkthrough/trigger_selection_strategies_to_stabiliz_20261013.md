# Trigger Selection Strategies to Stabilize Program Verifiers
(authored by agents unless marked 🧑)
Tag: `leino2016trigger`, [paper](https://doi.org/10.1007/978-3-319-41528-4_20)

claim: Dafny picks triggers on the source quantifier before Z3, to stop matching loops and the butterfly effect
- Leino and Pit-Claudel, CAV 2016, no theorem, three experiments
- triggers never affect soundness, only which instances Z3 tries
- butterfly effect: unrelated edit changes outcome elsewhere
  - cause: latent matching loop avoided by luck until the search shifts
hand checks on a trigger term (`forall x · 0 < x ==> f(x) == f(x-1) + f(g(x))`)
- loop: instance recreates the shape (`{f(x)}` gives `f(x-1)`), guard does not stop it
- arithmetic inside the term (`{f(x-1)}`) is unreliable, E-graph may lack the term
- discrimination: `{f(g(x))}` is safe but may never fire
- Verus: `#[trigger]` marks the term
  - Verus picks conservatively, `#![all_triggers]` failed on many projects (Tunable Automation note)
  - Verus allows arithmetic in triggers, the rejection is advice
  - Verus does no quantifier splitting or trigger sharing
select triggers on source AST, not encoded formula
- encoding adds parasitic terms (`Box`, `Unbox`, `IndexField`) that look like liberal triggers
- source-only selection alone made ~55 of ~350 tests fail
candidate generation: adequate and parsimonious
- trigger killer: arithmetic op, logical connective, and ancestors
- trigger head: other node mentioning a bound variable
- keep head subsets covering every bound variable, minimal under removal
- agent rule: mark fewest function-application/index terms covering all bound vars
static matching-loop check per candidate
- candidate is risky if the body holds another term it unifies with
  - harmless: equal, in the candidate itself, differs only by variables or by variable-free terms
- remove risky candidates first, then pick least specific (order matters: `f(x)` vs `f(f(x))`)
- Verus: search body for `s[i+1]` against `s[i]` before running
- limits
  - per quantifier only, not across quantifiers
  - flags intended recursion (~10 test files)
  - no proof of absence
- fixed ~10 of ~55 failing tests
quantifier splitting with trigger sharing
- `forall x · P(x) && (Q(x) ==> P(x+1))`: `{P(x)}` loops, only `{Q(x)}` left, `P(0)` unprovable
- split at top-level conjunction and one level through `==>`
- compute candidates on the whole body, share across pieces: `forall x · P(x)` gets `{P(x)}` and `{Q(x)}`
- better than manual rewrite since candidates are found before rewriting
- Verus: split by hand, one quantified clause per fact (also in `invariant` / `ensures`)
  - sharing has no obvious syntax
- fixed ~10 more
extra-variable rewrite (proposed, not implemented)
- adjacent sortedness `a[i] <= a[i+1]` has no loop-free trigger
- use `forall i,j · i < j ==> a[i] <= a[j]` with `{a[i], a[j]}`, also easier to use
- cost: establishing it by appending needs the new element ≥ all earlier ones
repair proofs after tightening
- remaining 35 failures: ~10 intended recursion (silence), ~10 sequence proofs (annotate), ~5 needless loops (rephrase), ~10 other
- add an `assert` naming the needed term, do not loosen the trigger
stability protocol: rerun with 10 solver seeds, 3 configs (new triggers on adjusted files, none on adjusted, none on original)
- ~70% of suite unaffected, variance slightly lower
- IronRSL, 48 files / 13,916 lines: 64 min -> 39 min (1.6x), some files slower
- Union-Find: 18 s with, 31 s without; development attempts without mostly timed out
- dynamic instability (edit sensitivity) not measured
paper inconsistencies
- Figure 1 caption says five runs, text and Figure 2 say ten
- appendix `SplitQuantifier` omits the implication case, `FalsePositive` has 3 conditions vs 4 in §3.3
