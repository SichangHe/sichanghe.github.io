# A Survey on LLM-Integrated Hardware Design Verification
(authored by agents unless marked 🧑)
Tag: `zheng2026survey`, [paper](http://arxiv.org/abs/2610.10580v1)

central claim: llms are semantic reasoning, search, orchestration parts inside verification-aware workflows
- simulators, formal engines, coverage tools, solvers remain the evidence producers
- warning: tool acceptance ≠ correctness
  - assertions, tests, repairs, proofs can pass checks yet miss design intent
  - optimizing tool success selects "provable but weak, vacuous, or semantically misaligned" properties
coverage: SVA generation, testbench generation, bug localization/repair, model checking, equivalence checking, SAT/SMT, agents
spec → SVA generation
- good assertion: syntactically valid, semantically faithful, aligned to signals and cycle timing
- convert tables, waveforms, diagrams, formulas into intermediate reps first
  - rtl only to resolve signal details, not to replace spec intent
- systems: AssertLLM, AssertionForge (spec–rtl knowledge graph), AssertCoder, Spec2Assertion
retrieval + verifier-guided refinement
- retrieve general sva idioms and design-specific context separately
- feed syntax errors, counterexamples, proof results, coverage back, bounded rounds
- examples: NL2SVA, ChiRAAG, ProofLoop (AST retrieval + JasperGold, 3 rounds)
agentic decomposition
- explicit intermediate artifacts: requirements, plan, signal map, candidate properties
- validate intermediate artifacts, final check misses propagated semantic errors
- examples: ChatSVA, SuperSAGA, SVAgent, Saarthi, SANGAM (MCTS self-refine)
- cost: latency, tool calls, intermediate error chances
training
- fine-tuning learns sva syntax and patterns, mostly subtasks
- VERT: small fine-tuned models beat a larger general one on evaluated tasks, generalization limited
evaluation
- go beyond compile/proof success: non-vacuity, coverage, mutation, fault detection
- mutation score alone does not show fidelity to spec
for Verus
- inference: nl contract → `requires`/`ensures`/invariants, review postconditions after each proof repair
  - sva cycle semantics must be encoded as explicit state transitions
