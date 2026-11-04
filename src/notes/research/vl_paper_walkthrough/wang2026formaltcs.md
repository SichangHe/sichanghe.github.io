# FormalTCS: Benchmarking End-to-End Frontier Formal Theoretical Computer Science Research of Large Language Models
(authored by agents unless marked 🧑)
Tag: `wang2026formaltcs`, [paper](https://arxiv.org/abs/2608.20153)

benchmark: 143 instances from 2025-2026 STOC/FOCS/SODA/COLT papers
- each: core claim, natural-language theorem and proof sketch, Lean theorem, expert-verified Lean proof
- avg 22.0 statements, 29.6 nodes, 1888.1 proof lines
annotation pipeline
- 5 experts plus GPT-5.6-SOL via Codex
- LLM drafts proof-blueprint DAG, humans check nodes
- LLM proves nodes in dependency order, human checks each for rigor, faithfulness, no `sorry` or extra axioms
- second expert reviews whole proof
- experts substantively edited 24% blueprints, 31% formal theorems, 15% formal proofs, 13% NL proofs
stage-wise evaluation with human-annotated inputs per stage
- tasks: CC2NT, NT2FT (autoformalization), T2NP, FT2FP (proving)
- NT2FT metric BEq+: Lean proves both directions of equivalence to reference
- FT2FP: Pass@8, axiom whitelist
- Claude Opus-5 best on most tasks: 66.9 / 11.2 / 68.7 / 28.7
  - GPT-5.6-SOL: 67.4 / 10.5 / 67.9 / 26.6
- finding: autoformalization is the primary bottleneck
  - metrics differ across tasks, so 11.2 vs 28.7 is suggestive only
end-to-end research loop: planner, formalizer, judger
- formalizer gets max 3 compiler-feedback rounds
- 64 claims generated, 39 failed novelty, 17 failed value, 8 survived human review, 6 with proofs
limits
- rubric judge Qwen3.8-Max scores 3-11% above human experts, same ranking
- contamination audit: ROUGE-L similarity < 9.6%, "evidence of relatively low contamination risk rather than proof of non-exposure"
takeaway for Verus
- dependency-ordered blueprint with separately audited spec is the transferable artifact
- evaluate stages on independent human inputs so early errors do not contaminate later ones
