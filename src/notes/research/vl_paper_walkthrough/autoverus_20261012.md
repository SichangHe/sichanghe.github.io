# AutoVerus: Automated Proof Generation for Rust Code
(authored by agents unless marked 🧑)
Tag: `yang2025autoverus`, [paper](https://doi.org/10.1145/3763174)

3-phase multi-agent pipeline for Verus
- input: 1 Rust function with specs; output: program Verus accepts
- phases: generation, refinement, debugging
generation: loop invariants + safe merge
- 1 agent adds invariants to every loop, keeps executable code unchanged
  - rules: state initial values of read vars, assigned values of written vars, use spec/proof fns
- sample 5 candidates, drop unsafe/invalid ones
  - syntax-invalid kept only if simple edit fixes it, e.g. `v[i]` to `v[i as int]`
- score (V,E): V = fns verified, E = verification errors
  - rank by V desc, then E asc
- merge ranked candidates linearly, keep a merge only if score improves
  - candidates are complementary: `N < 1000` + `b.len()==N` verifies only together
  - Houdini checks which annotation subset suffices
refinement: 4 sequential generic agents, always run
- constant-propagation: copy precondition facts into invariants
- array-length: add container lengths
- quantifier: fix quantifier invariants
- conditional-loop-invariant: make iteration-dependent facts hold every iteration
- accept a result only if valid, safe, V not lower
  - inference: monotone V protects earlier proofs but wastes calls, cannot invent domain lemmas
debugging: error-directed repair, up to 10 iterations
- pick 1 error by priority: type, bound, invariant-before-loop, then report order
- 8 error classes each with own agent
  - precondition, vector length, postcondition, invariant fail at loop start, invariant fail at loop end, assertion, arithmetic overflow, type mismatch
  - extra assertion agent writes proof fns; default agent for the rest
- accept a safe compilable candidate that raises score or cuts errors of target type without lowering V
- can add asserts and proof fns beyond invariants
  - depends on correct error classification
results on Verus-Bench (150 tasks)
- sources: 11 CloverBench, 38 Diffy, 78 MBPP, 23 Misc
  - SAFE paper's VerusBench has 139 tasks; the 11 gap likely CloverBench (inference)
- 137/150 (91.3%) with at most 3 tries
  - over half done in under 30s or 3 LLM calls
  - phase 1 alone solves a bit over half
  - 2,637 candidates, about $37 total
- GPT-4o baseline (10 min max): 67/150
trust and limits
- trusted: Verus, SMT solver, Lynette safety analysis/merge, Houdini, the spec
  - proof only shows the supplied spec holds, not user intent
- benchmark tasks, not real Rust projects
  - translated benchmarks, single-function units, random LLM sampling hurt external validity
  - newest Rust features not covered
inference: cuts effort when loop invariants and standard errors dominate
- still needs human spec review, unsafe filtering, benchmark-independent tests
