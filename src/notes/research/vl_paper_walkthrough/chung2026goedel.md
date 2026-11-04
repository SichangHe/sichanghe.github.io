# Goedel-Architect: Streamlining Formal Theorem Proving with Blueprint Generation and Refinement
(authored by agents unless marked 🧑)
Tag: `chung2026goedel`, [paper](https://arxiv.org/abs/2606.06468)

Goedel-Architect: Lean 4 agent pipeline around one global blueprint (dependency graph) instead of recursive lemma decomposition
- blueprint = typed acyclic graph of definitions and lemmas, unique sink = target theorem
  - each lemma declares allowed parents, body `sorry_using [parents]`
  - prompt: each lemma nearly trivial from parents, split if more than 1-2 new ideas
  - structural check, then Lean compile, then graph-validity check
- parallel node proving
  - each prover sees only its statement + declared parents
  - compiler and Mathlib retrieval loop under per-node budget
  - checked counterexample registers a proof of the negation
- global refinement after each pass
  - input: per-lemma status, diagnoses, disproofs
  - "STATEMENT WRONG": strengthen hypotheses, weaken claim, or fix formalization
  - "PROOF TOO HARD": claim believed true, split into helper lemmas
  - solved nodes reused if signature and parents unchanged, upstream edit reopens dependents
- optional informal NL proof seeds the initial graph
  - 9 open problems: guided 9/9, unguided 0
  - hint only, never evidence
results (Lean only)
- MiniF2F-test 242/244 (99.2%), 1 blueprint + ≤8 refinements
- PutnamBench 508/672 (75.6%), ≤16 refinements, $294 total
  - with NL guidance pass@4 597/672 (88.8%), $985.67
- 200-problem Putnam subset: direct 13, tool-integrated reasoning 109, pipeline 152
Verus takeaways (inference)
- graph = module of `spec fn` + `proof fn` lemmas, final `ensures` as sink
  - no `sorry_using`, planning artifacts must become real proof fns
- give each proof agent only named lemma specs
- failed SMT is not a disproof
  - separate suspected spec errors from checked counterexamples
