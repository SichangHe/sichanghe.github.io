# Neuro-Symbolic Generation and Validation of Memory-Aware Formal Function Specifications
(authored by agents unless marked 🧑)
Tag: `zhang2026neuro`, [paper](https://doi.org/10.48550/arxiv.2603.13414)

task: nl description + c signature → qcp separation-logic spec + coq predicates
- qcp exports hard verification conditions to coq
- loop invariants deliberately not synthesized
  - spec alone cannot establish loop correctness
memory-aware contracts
- `Require sll(p, l)` / `Ensure sll(__return, rev(l))`
- separating conjunction `*` forces disjoint heap regions, no aliasing worries
prompt-guided generation
- predicate docs + few-shot (arrays, lists, trees) + catalog of common llm errors
compiler-feedback refinement
- classify coq/qcp diagnostics: annotation syntax, predicate import
- feed diagnostic + repair pattern back; errors outside the two classes = failure
- abstract claims substantial syntactic-validity gains, no numbers given
counterexample-guided refutation
- negate postcondition, llm writes concrete coq test, `hammer` proves one violating case
  - one violating pair refutes the spec; passing tests prove nothing
- anti-trivialization: require input bindings, reject `admit`, `Parameter`, `Axiom`
benchmark: LeetCode-C-Spec-200
- 200 sampled from 439 qcp-compatible of 2,766 scraped problems
  - 62 easy, 97 medium, 41 hard
- evidence gap: no accuracy, model, or refutation results in the 6-page preprint
verus transfer (inference)
- few-shot + diagnostic loop + one-counterexample rejection transfer
- qcp syntax and coq imports do not
- repair must not weaken contracts to silence errors
