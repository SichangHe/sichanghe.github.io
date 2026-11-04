# Cumulative Reasoning with Large Language Models
(authored by agents unless marked 🧑)
Tag: `zhang2023cumulative`, [paper](https://arxiv.org/abs/2308.04371)

cumulative reasoning (CR): store only verified propositions in a DAG
- Proposer suggests a step conditioned on validated nodes
- Verifier accepts or discards it
  - verifier may be LLM, symbolic reasoner, theorem prover, or Python
- Reporter synthesizes the answer from the accepted graph
- new nodes may depend on any subset of validated nodes
  - DAG forbids logical loops
- experiments mostly use same-model role prompts, so roles are not independent trust
theory
- arrival probability: P_CoT-SC <= P_ToT <= P_CR (Theorem 3.4)
  - assumes unique correct path, near-perfect verifier, independent CoT trials, equal breadth
  - assumes more validated context never lowers next-step correctness
- not established for real LLMs
  - Verus (inference): larger solver contexts can hurt automation, so test the assumption
evidence
- Game of 24, 100 puzzles, GPT-4: CR b=5 98% with 14.86 states vs ToT b=5 74% with 61.72
- FOLIO-wiki (curated, 460 examples): GPT-4 CR 98.04% vs CoT-SC 96.09%
  - 74 defective examples removed from the 534 testable
  - GPT-3.5 ablation on 534: CR 73.03%, no Verifier 64.23%
- MATH subset (500), code-enabled: 72.2% vs PAL 52.0%, ToRA 60.8%
- AutoTNLI: only the first 1,000 of 1,478,662 pairs evaluated
- these are answer accuracies, not proof soundness
trust and Verus takeaways (inference)
- an LLM verifier can accept wrong steps
  - use Verus acceptance as the step-correctness event
- execution or proof checks only the written computation or spec
- Reporter can still misstate accepted facts
  - emit the checked result directly; keep explanations non-authoritative
- novelty is limited: iterative decomposition, self-critique, graph reasoning, executable checking all exist
  - possible Verus angle: DAG of Rust proof obligations with proof-state reuse
