# Bounded Quantifier Instantiation for Checking Inductive Invariants
(authored by agents unless marked 🧑)
Tag: `feldman2017bounded`, [paper](https://doi.org/10.23638/LMCS-15(3:18)2019)

bounded-horizon instantiation checks ∀*∃* invariants over EPR transitions
- skolemize I ∧ δ ∧ ¬I', instantiate universals only with ground terms of depth ≤ k
- unsat at bound k = inductive, sound for every k
- sat = only "not known to be inductive", never a refutation
  - inductiveness of ∀*∃* invariants is undecidable even for EPR, so a fixed bound is incomplete
- for each inductive invariant some finite k suffices (compactness), but no single k for all
- bound 0 complete for universal invariants; examples need k = 1 or 2
manual instrumentation removes quantifier alternation
- add derived relation r encoding existential ψ, with quantifier-free update code, rewrite conditions to use r
- must prove instrumented δ̂ covers original δ under r=ψ
- then a universal invariant over r gives the original invariant
- labor-intensive and error-prone
bound 1 often suffices in practice
- conjecture: an EPR transition touches only a small horizon (elements pointed to by program variables)
- implemented as guarded quantifiers ∀x.(x=c1 ∨ ... )→θ plus Z3 model-based instantiation
  - cost O(#Consts · #∀)
- all correct examples pass at bound 1, in ≤ ~2 s (client-server 58 ms, learning switch 2 s)
- baseline Z3 times out (60 s) on incorrect cases, bound 1 returns partial models
partial models diagnose failure
- finite bounded model suggests an infinite counterexample or a missing axiom
  - ring election: open infinite ring, fixed by maximal-ID axiom ∃n1.∀n2.n2≤n1
- a model only suggests, never proves, an infinite counterexample
Verus relevance (inference)
- bounded instantiation as diagnostic mode, never as the accepting check
- derived relation = ghost state proved consistent with executable state
