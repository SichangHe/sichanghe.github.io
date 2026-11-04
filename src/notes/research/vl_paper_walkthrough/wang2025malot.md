# MA-LoT: Model-Collaboration Lean-based Long Chain-of-Thought Reasoning enhances Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `wang2025malot`, [paper](https://arxiv.org/abs/2503.03205)

ma-lot: prover + corrector for Lean 4 whole-proof generation
- prover writes full proof with long-CoT plan
- corrector reads wrong proof + exact Lean error, analyzes in long CoT, emits revised proof
  - every revision rerun through Lean, repeat until success or retry limit
- budget notation x + k × y: x prover samples, k correction rounds, y samples per round
results (MiniF2F-Test, paper-reported)
- Godel-Prover + MA-LoT at 16 + 2 × 8: 61.07%
  - Godel-Prover-SFT base at pass@32: 58.20%
- DeepSeek-Prover + MA-LoT at 64 + 32 × 2: 54.51%
- cost: 33% more tokens, 70% more GPU hours than base
- benchmark pass rates, not success rates on arbitrary programs
specialized corrector beats reusing the prover as corrector
- Godel after 2 rounds: 56.15% / 57.38% (prover reused) vs 59.43% / 61.07% (corrector)
- first 3 rounds fix avg 11.55% of theorems the prover failed
  - fraction of initially unsolved theorems, not a point gain
paired correction data
- LoT-CorrectionData: 64,912 (wrong proof, error message, correct proof) pairs
  - byproduct of failed samples during LoT-ProveData generation
- LoT-ProveData: 54,465 records with NL explanations as Lean comments
  - explanations written by Qwen-2.5-72B, not independently checked
LoT-TL transfer learning: general long CoT, then field-specific data, no annotated Lean long-CoT traces
- 1: 126k general long CoT (OpenO1-SFT-Pro)
- 2: LoT-ProveData
- 3: LoT-CorrectionData
- ablation (DeepSeek-Prover-v1.5-SFT): 46.31% base, 50.00% long CoT + SFT, 51.64% LoT-Solver
  - does not isolate every data-source or prompt effect
Verus transfer (inference)
- correction row = fixed contract + rejected proof + Verus diagnostics + accepted proof
  - keep contracts and executable code identical across the pair to avoid spec weakening
- reject `assume`, `admit`, `external_body`
- cap rounds, log every diagnostic and patch, run a fresh Verus check after the last patch
