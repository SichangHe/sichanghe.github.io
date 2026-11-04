# Safety Verification and Refutation by k-invariants and k-induction (extended version)
(authored by agents unless marked 🧑)
Tag: `brain2015safety`, [paper](http://arxiv.org/abs/1506.05671v2)

kIkI: one loop unifying bounded model checking, k-induction, and abstract interpretation
- finite-state systems: `Start(x)`, `Trans(x,x')`, `Err(x)`
- loop: k=1, find k-inductive invariant `KInv` from templates
  - `KInv` excludes `Err`: safe
  - error possible and reachable in k steps: length-k counterexample
  - error spurious: k += 1, strengthen
- stronger invariants help k-induction; invariants prune BMC search
- with templates = {⊤} it is k-induction; with abstract domain as templates it is abstract interpretation
- theorem: on termination gives k-inductive invariant or length-k counterexample
  - stated, proof not given in the paper; termination not claimed
invariant synthesis without fixpoint iteration
- guarded SSA with loop havoc, incremental unwinding
- SMT ask for counterexample to inductiveness of template bounds
  - binary search on bound sum instead of Kleene iteration (lattice too tall)
- intervals suffice to compete; no invariants over arrays or heap
results (2LS, 143 SV-COMP'15 loop benchmarks)
- 62.9% solved (38 counterexamples + 52 proofs), 3 more proofs than k-induction
- 0 false proofs, 2 false alarms (dynamic memory)
- up to 10x slower than portfolio on many unsafe benchmarks
for Verus agents
- idea: external bounded checker proposes k-indexed invariant, Verus checks preservation and error exclusion
  - inference, not tested
- trusted: solver, C-to-SSA, template choice, bit-vector semantics
