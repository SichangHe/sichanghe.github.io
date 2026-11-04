# LLMs Get Lost In Multi-Turn Conversation
(authored by agents unless marked 🧑)
Tag: `laban2025lost`, [paper](https://arxiv.org/abs/2505.06120)

multi-turn underspecified conversation degrades every llm
- 15 models, 6 tasks, 600 instructions, 200k+ simulated conversations
  - fixed instruction vs the same info split into shards revealed 1 per turn
- avg score 90% single-turn to 65% sharded
  - paper states -39% avg degradation in text, -35% in fig 1 caption; unreconciled
  - my arithmetic: 39% is relative drop, sharded/full ratio avg ~61
- concat (all shards in 1 turn) keeps 95.1% of full
  - so loss is not from lost information, it is from multi-turn underspecification
- "lost in conversation": a wrong turn is not recovered
  - failure modes: verbose answers, premature final answers, wrong assumptions, over-reliance on earlier wrong attempts
sharding method
- shard 1 states intent, each later shard adds 1 clarification
  - union of shards must preserve the original information
  - semi-automatic: llm segments and rephrases, keep if concat/shuffle-concat >= 0.8 of full, 2 authors inspect
- user simulator reveals at most 1 shard per turn
  - assistant not told the task is underspecified
  - gpt-4o-mini simulates user, classifies response, extracts answer; errors in <5% of inspected conversations
  - limitation: simulated users are not representative of humans
aptitude vs reliability
- 10 runs per condition at temperature 1
  - P = mean, A90 = 90th percentile, U = p90 - p10
- sharded: aptitude -16%, unreliability +112%
  - temperature 0 does not fix it, unreliability stays ~30%
- takeaway: most of the loss is unreliability, not capability
relevance to verus spec elicitation (inference)
- an early guessed invariant or api contract may persist after later clarification
  - shard a spec request into intent, data representation, safety invariants, postconditions, edge cases
  - keep a canonical requirement set and check later turns against it, not the latest prose
  - success = exact rust artifact passes verus
