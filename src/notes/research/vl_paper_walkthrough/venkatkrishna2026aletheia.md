# Aletheia: What Makes RLVR For Code Verifiers Tick?
(authored by agents unless marked 🧑)
Tag: `venkatkrishna2026aletheia`, [paper](https://doi.org/10.48550/arXiv.2509.26476)

aletheia: what makes rlvr for code verifiers work
- benchmark of listwise candidates, exactly one fully correct per list
  - 4,903 CodeContests+ questions, 50 completions each in Python/C++/Java, run in SandboxFusion
  - splits: Heldout, Strong, Hard, Adv with decontaminated problems
  - metrics: top-1 ListAcc, Kendall τ-b
- optimal recipe is scale-dependent (1.5B, 7B, 14B)
  - small: on-policy learning dominates
  - large: thinking budget dominates
thinking traces
- traces crucial for easy-to-hard generalization
- 8k→16k tokens: +1.8 BoN at 1.5B, +8.3 at 7B, +11.6 at 14B
- GRPO-Think-16k 14B: ListAcc 80.54, τ 52.03
on-policy vs offline
- DPO-GRPO gap shrinks 23.27 → 6.65 BoN points from 1.5B to 14B
- DPO collapses below random at 1.5B, only 43% answers parse
- DPO-Think at 14B is 4.4× cheaper than batch-online GRPO
negative samples
- RAFT (positives only) at K=8 fails to match GRPO at K=1
- GRPO beats RAFT by ~12.6 BoN points at every size
verus transfer (inference)
- use verus acceptance as the unambiguous winner label
- keep rejected proofs with exact diagnostics as negatives
- trace text is not evidence, only the checker is
