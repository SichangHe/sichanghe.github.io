# Imandra CodeLogician: Neuro-Symbolic Reasoning for Precise Analysis of Software Logic
(authored by agents unless marked 🧑)
Tag: `lin2026codelogician`, [paper](http://arxiv.org/abs/2601.11840v2)

llm autoformalizes code into pure-functional IML, ImandraX reasons over it
- no Verus; all Verus mappings are inference
- trusted: ImandraX semantics and solver
  - not guaranteed: llm translation fidelity, abstraction choice, axioms
  - "functionally equivalent to the source program at the chosen level of abstraction" is a design goal, not a theorem
verification goals (VGs) + counterexamples
- VG = boolean-valued IML function encoding a property, proved for all inputs
- counterexample reveals missing preconditions, modeling gaps, or spec errors
  - loop: encode predicate, verify, inspect witness, fix model, rerun
- example: order-ranking transitivity lemma on a trading venue
region decomposition
- partition input space into symbolic regions: path constraints, invariant output, sample witness
- side conditions restrict the domain, basis functions make selected functions atomic
- witnesses become generated tests
  - discount example: 4 regions (Premium/Standard x amount vs 100)
- region count can explode, abstraction choices affect what is covered
autoformalization with explicit unknowns
- imperative code to pure IML: thread state as arguments, loops to recursion, systems to state machines
- unknown libs: opaque functions, documented axioms, sound approximations
  - Verus analogue: `external_body`, explicit `assume` as trusted boundary
dependency-aware incremental formalization
- project metamodel of modules/imports/status
- formalize bottom-up in topological order, recompute only changed modules and dependents
interaction counterexamples and numeric invariants
- LSE expiry example: bounded message-prefix predicate finds uncross/expiry coincidence at time 2700
- fee arithmetic: negative-trade and float counterexamples to conservation
  - fix: Python `float` to `Decimal`, 3 goals reverified
weak evidence
- 50-model benchmark with llm-as-judge: llm-only 0.186 state-space, 0.490 coverage
  - weaker than kernel-checked proofs
