# Compositional Safety Verification with Max-SMT
(authored by agents unless marked 🧑)
Tag: `brockschmidt2015compositional`, [paper](http://arxiv.org/abs/1507.03851v3)

bottom-up safety proof via conditional inductive invariants
- invariant need only be inductive under an entry condition, not hold from all initial states
  - hard constraints: consecution, safety
  - soft constraints: initiation, so solver prefers fewer preconditions
  - templates: conjunction of k linear inequalities per location, k up to 3 (`MAX_CONJUNCTS`)
  - Farkas' lemma turns implications into constraints over template coefficients
- inferred entry condition becomes postcondition of predecessor component
  - components are SCCs of the CFG
  - `CheckSafe` returns only `Safe` or `Maybe`, never unsafe
  - example: `while i>0: x+=5; i-=1` gives `x+5i>=0`, propagated back to earlier loop
narrowing after failure
- exclude states already handled, then search another conditional invariant
  - yields disjunctive proofs
  - not every disjunctive invariant is reachable this way
search engineering
- weight solutions that imply the postcondition over ones disabling transitions
- memoize failed calls, strengthen transitions with proven facts
- parallel template sizes and SCC calls: ~2x faster on 4 cores
- incremental re-analysis described, not implemented
results (prototype VeryMax)
- HOLA-BENCHS 46 safe programs: Seq 44/46, Par 45/46
  - HOLA 43/46, SeaHorn 32/46, CPAchecker 33/46 and 25/46
  - mixed hardware, timeouts 200s
- NR-BENCHS 6452 array-bounds problems from Numerical Recipes abstractions: ~6105 to 6106 proved safe
  - true safe count unknown
limits
- integer programs, linear templates, no arrays or heap
- failure may mean template bound too small, not unsafe
for Verus: Max-SMT style synthesis proposes loop invariants and callee `requires`
- external synthesizer emits candidate, Verus must still prove it
