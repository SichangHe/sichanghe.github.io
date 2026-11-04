# A Case Study on the Effectiveness of LLMs in Verification with Proof Assistants
(authored by agents unless marked 🧑)
Tag: `bayazit2025effectiveness`, [paper](https://doi.org/10.1145/3759425.3763391)

setup: llm proof generation in 2 mature rocq projects
- hs-to-coq: 187 theorems; Verdi: 579 theorems
- 5 models: GPT-4o-mini, GPT-4o, o4-mini, DeepSeek Prover V2, DeepSeek R1-0528
- 4 prompt conditions: full context, no dependencies+notations, no in-file context, neither
- success = proof body accepted by SerAPI with the project's rocq version
context helps a lot
- in-file context + dependencies/notations are most useful; most models best in informed mode (some exceptions)
- GPT-4o: hs-to-coq 92/187 (49.2%) informed vs 48/187 (25.7%) neither
- GPT-4o: Verdi 177/579 (30.6%) informed vs 38/579 (6.6%) neither
- cost: mean prompt 3,379 / 6,944 tokens informed vs 152 / 174 neither
- association only; no optimal context-selection policy established
success falls with proof size
- all models except GPT-4o-mini do well on small proofs
- some proofs over 20 tactics still succeed
- identical-to-original proofs occur in both projects
  - small hs-to-coq ones may be coincidence
  - larger identical Verdi proofs suggest possible memorization, not established
llms find shorter proofs
- o4-mini, R1-0528: `constructor; intros []; auto.` replaces a long monoid-law proof
- o4-mini: applies the preceding contrapositive lemma instead of a 24-line proof
- R1-0528: case analysis on `reflect` instead of bool/prop conversions
- failure mode: repeats the same `rewrite` seemingly indefinitely
verus takeaways (inference, not evaluated)
- give agent current module, imported contracts, nearby lemmas, exact signatures
- stratify benchmarks by proof size; check semantic acceptance against the unchanged spec
