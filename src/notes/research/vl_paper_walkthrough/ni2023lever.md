# LEVER: Learning to Verify Language-to-Code Generation with Execution
(authored by agents unless marked 🧑)
Tag: `ni2023lever`, [paper](https://arxiv.org/abs/2302.08468)

core idea
- learned reranker over sampled programs, using execution results
  - "verify" = matches intent, not formal verification
- pipeline: sample k programs, execute, dedupe, score with a learned verifier
  - verifier input: task + program + execution result (t5 or roberta classifier)
  - score = P_LM(y|x) · P_verifier(correct|x,y,result)
  - sum scores of candidates with the same execution result, pick the top group
- execution results matter most
  - removing them: -6.6% WikiTQ, -5.6% MBPP, -3.0% Spider, -1.2% GSM8k
  - works without gold programs, at most -1.1%
results
- sota on Spider, WikiTQ, MBPP, GSM8k with codex
  - +1.2% (WikiTQ) to +2.0% (MBPP) over prior best
- 50 -> 10 inference samples costs 1.8% (Spider) to 5.2% (WikiTQ)
limits
- reranking cannot help if no sample is correct
  - most common failure
- wrong programs with trivial shared results (0, empty table) out-vote the right one
- probability score is not a correctness proof
takeaway for verus
- treat the learned score as an untrusted hint, let verus decide acceptance
