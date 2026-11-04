# Ivy: A Multi-modal Verification Tool for Distributed Algorithms
(authored by agents unless marked 🧑)
Tag: `mcmillan2020ivy`, [paper](https://doi.org/10.1007/978-3-030-53291-8_12)

ivy verifies distributed algorithms via modular isolates with decidable VCs
- isolate = reactive module with hidden implementation state + temporal interface spec
  - spec code interleaved via before/after; ghost code must terminate, then erased
  - implementation can't touch visible state, so slicing it away is sound
- design goal: decidable reasoning while maximizing expressiveness and performance
- verus analogue (inference, not in paper): private state + spec of visible state + proof lemmas
inductive invariant tactic: Z3 on a VC checked to be in decidable fragment FAU first
- VC = init establishes, actions preserve, invariant implies no assertion fails
  - invariant need hold only between actions
- outside FAU: ivy points at the function cycle or quantifier use
- false VC: finite counter-model turned into an execution trace, used to strengthen the invariant
- no benchmark numbers reported
eager abstraction: strengthen transitions with axiom instances, Boolean-abstract predicates, model-check with ABC
- false property gives abstract counterexample; user adds terms or invariants
- single-exponential bound, terminates with proof or counterexample
liveness-to-safety: FO-LTL liveness reduced to no fair cycle revisits a saved state
- infinite-state systems also need dynamic abstraction
- fairness via `$happened$`, saved state via `$was$`
manual tactics: mark axiom `explicit`, instantiate by hand to avoid quantifier alternation
- verus analogue: proof lemma specializing a forall to a concrete value
testing + extraction
- randomized spec-based tests, inputs satisfy assumptions, outputs checked vs guarantees
  - SMT generates inputs; found bugs in RISC-V cache and QUIC, no counts given
- compositional claim: a failing system has a failing local component test
- extraction needs computability conditions; reported comparable to OCaml/Go (older compiler, no numbers here)
