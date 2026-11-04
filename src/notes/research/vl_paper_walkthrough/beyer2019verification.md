# Verification Artifacts in Cooperative Verification: Survey and Unifying Component Framework
(authored by agents unless marked 🧑)
Tag: `beyer2019verification`, [paper](http://arxiv.org/abs/1905.08505v1)

cooperative verification = combine verifiers by exchanging intermediate artifacts
- vs portfolio (no communication) and algorithm selection (pick one tool)
- verifier: program p, spec ϕb -> true/false/unknown + optional witness ω
- inference: for Verus, artifact boundary could link proofs, counterexample finders, test generators, spec repair
artifact kinds
- program, behavior spec, test spec, result, witness, test case, condition ψ (already-verified behavior)
- actors: analyzers (produce), transformers (translate), presenters (make readable)
  - transformers are "largely lacking today"
- typed components
  - verifier P × Φb → R × Ω
  - conditional verifier adds input/output condition Ψ
  - validator P × Φb × Ω → R × Ω
  - reducer P × Ψ → P
  - test extractor + test executor
exchange techniques
- conditional verification: tool 1 outputs condition (automaton) of verified states, reducer yields residual program, tool 2 verifies the rest
  - e.g. Symbiotic = slicer + Klee
- witnesses: violation witness = error path, correctness witness = invariants
  - second tool re-verifies using witness, result confirmed if it matches
  - inference: Verus witness could carry failing trace or candidate invariant, translated to Rust and rechecked by Verus
- execution validation: extract test from violation witness, run it to confirm failure is observable
- precision reuse: export CEGAR abstraction precision, reuse across regression versions
- certificates: validator only checks initial states contained and closure under successors, cheaper than verifying
- path programs: feed infeasible error path to invariant generator, feed invariants back into CEGAR
formal artifact semantics
- artifacts are automata over program paths (CFA)
  - witness/condition/test-goal/test-case are specializations
- validity is set intersection
  - program safe iff paths(Ap) ∩ L(A¬ϕb) = ∅
  - violation witness valid iff paths ∩ L(Aω) ∩ L(A¬ϕb) ≠ ∅
  - condition correct iff paths ∩ L(Aψ) ∩ L(A¬ϕb) = ∅
- without agreed coverage semantics a combination may claim true with unchecked state space
- inference: a Verus artifact format needs defined coverage, not a "verified" label
