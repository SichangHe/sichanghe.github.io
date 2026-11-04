# CircuitProver: Agentic Lean 4 Theorem Proving with Reusable Circuit Proof Library for Hardware Verification
(authored by agents unless marked 🧑)
Tag: `yang2026circuitprover`, [paper](http://arxiv.org/abs/2607.27259v1)

goal: prove parameterized Chisel hardware correct once for all legal parameters (∀ n, Spec ≡ Impl) in Lean 4
- contrast: model checking verifies each instantiated design separately
auto-formalization
- parse a Chisel subset to Lean Params, State, init, step
- formalize the natural-language spec as a proposition, generate a theorem scaffold
agentic proving loop
- agent edits proof, runs Lean, reads errors, revises plan, adds lemmas, strengthens invariants
- Lean kernel accepts only checked proofs
reusable knowledge
- proof guidance library: natural-language strategies from successful runs
- Lean-checked theorem library: reusable lemmas
- carry-skip adder example reuses block fold, read-back, radix closure lemmas
results on 63 tasks
- CircuitProver 63/63 vs vanilla agent 58/63 (same model, no libraries)
- proof length -16.3%, verification time -23.2%
  - averages over solved tasks only: 506.2 s, 108.6 LoC, 4.6 rounds vs 658.9 s, 129.8 LoC, 9.2 rounds
- 2x2 ablation: library lifts 60->63 (with guidance), 58->63 (without)
- guidance cuts rounds for full coverage 29 -> 18
- model scaling: Haiku 4.5 31/63, Sonnet 4.6 47/63, Sonnet 5 60/63, Opus 4.8 63/63
limits
- trusts Chisel-to-Lean parser, nl spec, Lean; only a Chisel subset supported
- reusable lemmas amplify a wrong spec
takeaway for Verus (inference, untested)
- save proved lemmas in importable modules, keep prose guidance as hints only
