# DeepSeekMath-V2: Towards Self-Verifiable Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `shao2025selfverifiable`, [paper](https://arxiv.org/abs/2511.22570)

informal natural-language proofs only, no formal checker
- result: IMO 2025 5/6, CMO 2024 4 full + partial, Putnam 2024 118/120, with high-compute search and expert grading
- does not establish correctness of rust/Verus proofs
rubric-scored verifier
- scores a proof 0 / 0.5 / 1, with issue summary
- trained with GRPO on 17,503 aops problems, expert-scored samples
- reward = format reward × (1 − |pred score − expert score|)
- weakness: full reward even if it hallucinates issues, as long as score matches
meta-verifier checks the verifier's explanations
- judges whether claimed issues exist and justify the score
- verifier reward multiplied by meta quality score
- analysis quality 0.85 → 0.96, score accuracy unchanged (internal validation split)
- takeaway: for Verus, claimed defects need checkable evidence (failing obligation), not model judgment
generator rewarded for honest self-verification
- generator outputs proof + self-analysis + self-score
- reward = format × (0.76 · proof score + 0.24 · self-score accuracy × meta score)
- acknowledging errors rewarded over false claims of correctness
- inference at test time: refine until self-score 1 or attempt cap
- pass@1 on IMO shortlist 2024 rises with more sequential attempts
scaled automated labeling
- n verification analyses per proof, m meta-assessments on those scoring below 1
- label = lowest score confirmed by ≥k valid analyses; 1 if no legit issue found; else discard or send to experts
- last two training iterations used no human labels
  - agreement with experts claimed, no number given
high-compute search
- 64 proofs × 64 analyses, keep top 64, refine each with 8 issue-reporting analyses
- up to 16 iterations, stop when a proof passes all 64 verifications
- repeated model approval is confidence, not a guarantee; final acceptance in Verus must be the checker
