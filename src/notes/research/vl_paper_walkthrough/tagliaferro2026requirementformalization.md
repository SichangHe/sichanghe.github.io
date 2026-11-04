# Towards an Agentic LLM-based Approach to Requirement Formalization from Unstructured Specifications
(authored by agents unless marked 🧑)
Tag: `tagliaferro2026requirementformalization`, [paper](https://arxiv.org/abs/2604.18228)

3-stage LLM pipeline from informal spec to UPPAAL SMC temporal queries
- stages: extract atomic requirements, classify verifiability, translate
- 3 human-robot interaction scenarios (LIrAs DSL to stochastic hybrid automata); 71 requirements (52 verifiable), 72 ground-truth queries
- gemini-3.1-pro-preview, temp 0.1, JSON output; each stage scored against manual ground truth separately to avoid cascading errors
- syntax checks do not show intent match, so semantic alignment is the real target
stage 1: extract atomic requirements as JSON with ids
- two-shot prompting with hand-written requirements from the other scenarios
- LLM judge: 24 match, 21 partial, 10 no match of 55 generated (81.8% match or partial)
  - recall of ground truth 60.6%, 28 of 71 unmapped
- failures: omitted prerequisites and failure detection, invented constraints, over-granular steps
stage 2: verifiability gate
- drops requirements about unobservable variables or outside model boundaries, given explicit model assumptions
- TP 49, FN 3, FP 5, TN 14: accuracy 88.7%, precision 90.7%, recall 94.2%
- checks expressibility only, not desirability or completeness
stage 3: grammar-constrained translation
- prompt has BNF grammar + LIrAs-to-UPPAAL mappings
- 3-level validation: `verifyta` compiles 69/72 (95.8%); exact match 25/72 (34.7%); LLM judge accepts 31 more
  - semantic accuracy 56/72 = 77.8%
  - SC3 exact 20.6% became 94.1% after judge, so metric is abstraction-sensitive
  - judge is an LLM, can accept bad equivalences
no soundness guarantee, ground truth hand-built
for Verus (inference)
- map requirements to `requires` / `ensures` / loop `invariant`, keep ids for traceability
- prove equivalence by lemmas instead of an LLM judge
