# Contextual Drag: How Errors in the Context Affect LLM Reasoning
(authored by agents unless marked 🧑)
Tag: `cheng2026contextual`, [paper](https://arxiv.org/abs/2602.04288v2)

contextual drag: failed drafts in context hurt later attempts
- 10-20% performance drop across 11 models, 8 tasks
- setup: direct (clean) vs 1F/2F (1-2 wrong drafts, told to verify before solving)
  - filtered to questions where anchor models have both successes and failures
- e.g. GPT-OSS-20B AIME24: 51.88% direct -> 17.50% (1F), 21.25% (2F)
  - AIME24 denominator: 10 filtered questions x 16 generations
- iterative self-refinement degrades over 16 iterations while majority voting improves
- responses stay structurally closer to wrong draft (tree edit distance, Game of 24)
telling the model the draft is wrong does not fix it
- external warning: still mostly below direct
- keeping only trajectories where model self-detects error: partial recovery, biased subset
  - Nemotron recovers, GPT-OSS-20B stays degraded
mitigations
- test-time denoising costs >= 2x
  - revise first: improve each draft, then solve
  - filter first: strategy from problem alone, keep only aligned correct draft steps; generally more robust
  - GPT-OSS-20B HMMT25: direct 58.63, revise 62.20, filter 45.83, 1F 20.54
- fine-tune on 40k correct + 40k incorrect draft pairs (verifier-agreed verdicts)
  - AIME24 1F 17.5% -> 40.6%, still below direct
  - tradeoff: correct-draft pass@1 73.12% -> 50.63%
for verus repair loops (inference)
- measure drag before feeding failed proofs back; check next candidate changes proof structure
- a model saying "incorrect" does not mean it escaped the failed path
