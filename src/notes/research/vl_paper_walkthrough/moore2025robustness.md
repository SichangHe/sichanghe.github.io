# Evaluating Autoformalization Robustness via Semantically Similar Paraphrasing
(authored by agents unless marked 🧑)
Tag: `moore2025robustness`, [paper](http://arxiv.org/abs/2511.12784v3)

setup: paraphrase NL statements, check whether autoformalization stays invariant
- benchmarks: MiniF2F (Isabelle/HOL), ProofNet (Lean 4)
- models: GPT-4o-mini, Claude-3.7-sonnet
- stage 1: LLM writes NL from each formal statement (paraphrase)
  - similarity to ground-truth NL by SBERT cosine (64-72% MiniF2F, 62-78% ProofNet), TTR, length
  - meaning preservation judged by embeddings, not proved
- stage 2: each paraphrase set formalized by both models
  - Pass@K, K in 1,2,5,10, temperature 0
  - BLEU = semantic fidelity proxy, compilation = syntactic validity
  - paper does not say how Pass@1/2/5 derive from 10 outputs, nor item counts
results: paraphrasing shifts performance, direction depends on model and paraphraser
- Claude formalizing Lean 4 compilation, ground truth vs Claude paraphrase
  - Pass@1 37.46 to 47.16
  - Pass@10 59.56 to 67.11
- GPT-4o-mini formalizing Lean 4 compilation falls under paraphrasing
  - Pass@1 9.70 to 7.27 (GPT paraphrase), 7.00 (Claude paraphrase)
  - BLEU still rises; explanation (strict type system) untested
- Isabelle, Claude formalizing: Claude paraphrase Pass@10 70.90 (best) but Pass@1 8.20 vs 10.66 ground truth
  - GPT paraphrase Pass@10 53.28, below ground truth 57.79
limits
- evidence is sensitivity, not systematic degradation
- compilation shows code runs, not that it matches the source
- no error-category analysis; only 2 models; low-similarity/ambiguous requests unexplored
takeaways for Verus agents
- test spec generation by fixing the contract, varying the NL, comparing normalized specs and verifier outcomes
- report fidelity and verifier pass separately, with K, model, temperature, denominator
- a verifying candidate can still encode a wrong property
