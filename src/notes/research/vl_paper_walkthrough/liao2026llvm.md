# LLVM Translation Validation Automated with Large Language Models and Lean
(authored by agents unless marked 🧑)
Tag: `liao2026llvm`, [paper](https://doi.org/10.48550/arxiv.2609.19583)

trivet: lean proof scaffolds + llm for llvm translation validation
- 148 llvm transformations (74 valid, 74 invalid): verifies or refutes 147, 1 invalid unresolved
  - 60 loop-free symbolic-bitwidth, 27 restricted loop cases, 10 fixed-bitwidth cases where alive2 times out
- lean kernel checks every verdict, llm not trusted
  - trusted base: lean kernel, formalized llvm semantics, source/target model
- scaffolding vs unscaffolded baseline, on cases solved by both
  - +26 proofs, -75.9% mean proof time, -88% mean cost
validity is refinement, not equality, because of ub
- src ⊒ tgt: source ub permits anything; source poison permits poison or value but no target ub; defined source needs same value and no target ub
- precondition encoded as llvm.assume in src
deterministic scaffold + typed holes for llm
- split cases on 9 ub-sensitive operators/flags, auto-discharge branches where source has ub
- leave holes only for value equality and each target-ub condition
- llm fills holes with lean diagnostics, bounded repair loop
  - reject if sorry/admit, changed definitions/theorem, non-standard axioms
- verus analogue: fixed theorem/fn, focused assert obligations; refinement lattice needs explicit ghost datatype for poison/ub
counterexample certification for invalid transformations
- one concrete counterexample disproves universally quantified refinement
- llm proposes bitwidths/inputs, deterministic Decidable scaffold lets kernel evaluate
  - at most 5 candidate attempts with diagnostics retry
  - example: w1=2, w2=3, x=1: source 0, target poison, so 0 ⊒ poison is false
restricted loops by induction, not unrolling
- shape: 3-block source (preheader, self-loop body, exit), loop-free single-block target
- llm proposes invariant; prove init, preservation, exit
  - example: q + floor(x/b) = floor(n/(a*b))
- general cfgs unsupported: every cycle needs invariant cutpoint
