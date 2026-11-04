# Coma, an Intermediate Verification Language with Explicit Abstraction Barriers
(authored by agents unless marked 🧑)
Tag: `paskevich2025coma`, [paper](https://doi.org/10.1007/978-3-031-91121-7_8)

Coma = continuation-passing IVL with assertions mixed into executable code
- implemented on Why3, with a proved-correct VC generator (Theorem 3)
- back end of Creusot, a deductive verifier for Rust

explicit abstraction barrier (↑) splits a routine
- code above the barrier is verified at every call site (the interface)
- code below is verified once at the definition (the implementation)
- example: wrapExit asserts 0 ≤ r < 256 above the barrier
  - callers must prove it
  - definition VC: ∀r. 0 ≤ r < 256 → φ
- path-specific contracts: put the assertion and barrier inside one branch
  - removeRoot: Empty branch is fail, so inadmissibility of Empty becomes part of the interface
- non-recursive functions can omit barriers and are inlined in caller VCs
- Verus has no equivalent
  - nearest: requires/ensures as public contract, body verified once, branch-local assert

postcondition = precondition of the continuation
- wrapper out(y) asserts the postcondition above its own barrier, then calls ret y
- callers get ∀y. y = 3·x → φ; the definition proves x+x+x = 3·x
- extended handler prototypes generate these wrappers from pre/postconditions
- in Verus an ordinary ensures suffices

two-stage VC generation
- source → higher-order recipe → first-order formula, via a Krivine-style abstract machine
- factorizing subformulas curbs exponential growth of classical weakest preconditions
- 4 VC modes
  - caller: verify calls of a defined handler
  - callee: prove a handler definition
  - full: caller + callee, the starting mode
  - null: no obligations
