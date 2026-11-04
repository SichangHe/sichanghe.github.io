# HybridProver: Augmenting Theorem Proving with LLM-Driven Proof Synthesis and Refinement
(authored by agents unless marked 🧑)
Tag: `hu2025hybridprover`, [paper](https://arxiv.org/abs/2505.15740)

whole-proof LLM plans, mechanical sketch repair, tactic model + Sledgehammer fills gaps (Isabelle/HOL)
- 1 whole-proof model samples 128 Isar proofs, Isabelle checks all in parallel
  - filter malformed output first
- 2 sketch builder on failure
  - check each subproof with the others replaced by `sorry`
  - keep verified subproofs, replace failed ones with `sorry`
- 3 tactic model samples tactics per `sorry`, Sledgehammer runs in parallel
  - insert, re-verify whole proof, backtrack on failure
- `sorry` is only a search placeholder, never a result
Results (miniF2F, 244 test problems)
- whole-proof alone 45.9%, tactic alone 39.3%, union 49.6%
- tactic + sketch refinement 71.3%
- full HybridProver 73.8% vs ProofAug 61.9%
- temperature 0.6-0.9 best, higher temperature gives hallucinated facts, more samples help
Training
- Qwen-Coder-7B, LoRA SFT on separate Isar (5-50 steps) and apply-style data from Isabelle STD + AFP
- GRPO with Isabelle reward
  - 1.0 pass, 0.2 syntactically valid but fails, 0.0 invalid, -0.2 `sorry`/malformed
Takeaways for Verus
- same split: LLM proposes structure, holes become separate lemmas, local fills, final full verification
  - local fragments may not compose under the full contract, so re-verify
- verifier rewards improve search but cannot fix a wrong spec
- penalize `admit` and `external_body` escapes
