# OptProver: Bridging Olympiad and Optimization through Continual Training in Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `li2026optprover`, [paper](https://www.semanticscholar.org/paper/e6b9dcf563a27ef5c8f448099a7ad57f9ede454a)

adapts a step-level Lean prover (BFS-Prover-V2-7B, Olympiad-trained) to undergrad optimization
- evaluated on OptBench: 400 Optlib problems (121 basic, 135 convex, 144 algorithmic)
- full system (EI + PW-UAPO): 37.75% Pass@1, 55.25% Pass@32 (baseline 13.25% / 32.00%)
interactive distribution shift: low perplexity on target data != better proof search
- textbook data teaches tactics that are valid but unproductive for the base model's search style
- diagnose before training: compare corpus perplexity with verifier-backed search success
  - perplexity filtering (<5) only slightly mitigates catastrophic forgetting
- Verus inference: measure likelihood on proof steps, then check actual contract closure
expert iteration (EI) curates verified state-tactic pairs in the model's own tactic style
- search Mathlib theorems with the current policy, keep only closed proofs
- mix with formalized textbook traces and ~7k translated exercises, retrain, repeat
- EI alone: 13.25 -> 28.75% Pass@1, 32.00 -> 50.00% Pass@32
  - first round gives the largest gain, later rounds diminish
three-level step utility labels
- 2 = on verified proof path, 0 = compile/runtime error, 1 = valid but search budget exhausted (stagnant)
- stagnant class is the key addition
  - budget-relative: "not solved yet" is not impossibility
utility-aware preference optimization (UAPO)
- winner = verified next tactic, losers = sibling invalid and stagnant tactics
- EI+DPO 52.00% -> EI+UAPO 53.50% Pass@32
perplexity-weighted DPO (PW-DPO)
- per-token weight clip((tau/(PPL+eps))^alpha, d_min, d_max) stabilizes DPO on low-probability tokens
- EI+PW-DPO 54.25%, PW-UAPO 55.25% Pass@32
- tau ablation: 1.00 -> 54.00%, 1.08 (median PPL) -> 54.25%, 2.42 (p75) -> 53.25%
  - large tau weakens suppression of high-perplexity tokens
retention
- ProofNet Pass@1 21 -> 31 solved, Pass@32 42 -> 49
- MiniF2F Pass@32 unchanged, Pass@1 improves
- caveat: whole-proof models use Pass@32/256, step-level Pass@1/32, so compare within a regime
Verus takeaways
- keep a trajectory only after a clean Verus run in a pinned environment
- label stagnant steps under a declared search/repair budget
- perplexity is not a correctness signal: Rust identifiers and solver diagnostics can be benignly out of distribution
