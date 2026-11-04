# Diffusion-Proof: Recipe for Formal Theorem Proving Beyond Auto-Regressive Generation
(authored by agents unless marked 🧑)
Tag: `wang2026diffusionproof`, [paper](https://doi.org/10.48550/arxiv.2606.19315)

two 7B block-diffusion models for Lean4: dLLM-Prover writes whole proofs, dLLM-Corrector repairs one failed subgoal
- prover base Fast-dLLM-V2-7B, block size 32, bidirectional attention within block, causal across blocks
- trained on 300k SFT records, curriculum sorted by proof length
- corrector trained on 128k records from proofs with top-level `have` subgoals
  - mask one 256-token block, fill with 512-token diffusion block seeing prefix and suffix
repair loop gated by Lean
- correct only if prover proof fails but skeleton and subgoal statements/usages are right
- up to 5 correction rounds, re-check every fill with Lean
results, pass@32, same-data 7B AR SFT baseline
- MiniF2F-Test 50.00% (122/244) vs 43.85%
- ProofNet-Test 7.53% (14/186) vs 5.91%
- gains are percentage points, not relative
- prover-only 48.36%, so corrector adds 4 problems on MiniF2F and 0 on ProofNet
  - ProofNet lacks subgoal decomposition
- longest 50% MiniF2F proofs: 26/108 vs 20/108 for AR
limits
- gains small, no ablation of data ratio or parser
- comparison with other systems uncontrolled (different data, RL, search)
- Lean checks proof, not that theorem statement matches intent
- Verus transfer needs Rust/Verus-trained model and verifier feedback, not a word swap
