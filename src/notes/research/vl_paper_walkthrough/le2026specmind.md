# SpecMind: Cognitively Inspired, Interactive Multi-Turn Framework for Postcondition Inference
(authored by agents unless marked 🧑)
Tag: `le2026specmind`, [paper](https://www.semanticscholar.org/paper/c46c8b1a2de32f1da11018119cdd30cc961b74ad)

SpecMind: multi-turn LLM loop for postcondition inference (Python functions)
- four design ideas
  - exploration-submission decoupling
    - assert probes get feedback but never replace the answer
    - only submissions update the best-so-far candidate
  - structured history of prior candidates, feedback, scores in every prompt
  - best-so-far tracking, return the best submission not the last
  - model decides when to stop (threshold tau or budget mu)
feedback signals
- correctness: passes all known-correct executions
- completeness: fraction of mutants rejected
  - a trivial True postcondition passes tests but has 0 completeness
- on a stalled hard case, give one uncaught mutant and 4 extra attempts
results
- EvalPlus, 164 problems, Llama 4 Scout, tau=90, mu=12
  - Exploratory: 99.4% correctness, 89.6% completeness, 7.2 attempts, 1.7 submissions
  - single-pass nl2postcond: 73.3% correctness, 36.0% completeness
- 23 hard cases of 159
  - enhanced feedback: 22/23 correct, completeness 56.2% -> 85.1%
- FixEval, 384 bugs, mu=10: distinguishes 39.58% of buggy versions vs 27.86% random sampling
- cost: 8,299 tokens, 0.25 cents per instance
limits
- tests and mutants are proxies, no guarantee for arbitrary inputs
- generalization to Rust or larger systems not shown
- model-controlled stop can stop on mistaken confidence
Verus adaptation (inference)
- submission = candidate ensures, assert = ghost probe
- verify only submissions, keep raw diagnostics in history
- stopping must never accept an unverified candidate
