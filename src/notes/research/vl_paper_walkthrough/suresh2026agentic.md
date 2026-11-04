# Agentic Separation Logic Specification Synthesis
(authored by agents unless marked 🧑)
Tag: `suresh2026agentic`, [paper](https://arxiv.org/abs/2605.27531)

spec-agent synthesizes pre/postconditions for large C++ repos
- pseudo-oracle: fuzzing rejects wrong specs via counterexamples, cannot prove correctness
  - no full C++ verifier; accepted specs may be weaker than the strongest spec
- eval: BDE 651 functions, BlazingMQ 508, all with unit tests
  - best model Qwen3-Coder-Next: 85.87% test-valid on BDE, 77.73% on BMQ
  - abstract's "85%" holds only for best model on BDE
  - 2 experts reviewed all harnesses + 100 sampled specs per repo, agreed
  - only 2 repos, unit-test-survivor denominators for fuzz table
pick target logic per function from static + dynamic features
- tree-sitter finds loops, conditionals, induction variables
- heap tracing of existing tests finds heap access
- rule: loop → first-order logic (quantify over collections); heap allocation → separation logic; both → FOSL
- inference for Verus: front-end triage before asking LLM for contract
  - loops hint quantified predicates, heap/pointer APIs hint ownership lemmas
candidate acceptance = fuzz-valid and at least as expressive as target
- prompt: source, docs, target grammar, up to 10 correct examples; unit tests withheld
- lattice Prop ⊑ FOL, Prop SL ⊑ FOSL; below-target candidate rejected with structural diagnostic
test-to-fuzz harness lifting
- coding agent keeps fixtures/setup, replaces hard-coded inputs with fuzzer params
- spec compiled to runtime assertions
  - bounded quantifiers → loops
  - points-to inspects observed heap; ⋆ checks footprint disjointness
- libFuzzer violation + assertion fed to next LLM attempt
- inference: fuzz finds mistakes, cannot replace a Verus proof of ownership facts
counterexample-guided refinement
- gains fast in first 5 attempts, plateau by ~20
- cost: ~170s inference + ~400s testing per accepted BDE function
