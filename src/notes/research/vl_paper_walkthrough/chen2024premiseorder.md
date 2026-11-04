# Premise Order Matters in Reasoning with Large Language Models
(authored by agents unless marked 🧑)
Tag: `chen2024premiseorder`, [paper](http://arxiv.org/abs/2402.08939v3)

premise order alone changes llm deductive reasoning a lot
- logic benchmark: definite-clause problems, correct only if whole proof valid
  - 27,000 variants: 4-12 required rules, 5 orders, 0/5/10 distractors
  - forward order = rule order of ground-truth proof, backward = reverse, kendall tau between
- forward order best
  - gpt-4-turbo, palm 2-l: drop up to 20-30 points
  - gemini 1.0 pro, gpt-3.5-turbo: from >65% to <25% at worst
  - distractors enlarge the order effect
- failure types: wrong refutation, rule hallucination, fact hallucination
  - llm follows presented rule order, invents facts when next rule not yet applicable
- r-gsm: reordered gsm8k problems with unchanged answer, 220 pairs
  - gpt-4-turbo 94.1% -> 85.0%, gpt-3.5-turbo 67.3% -> 51.8%
  - on originally solved subset, loss 10.1% to 35.1%
  - constructed to find failures, so not an estimate for random permutation
- limits
  - tests proof text, not verus proofs, no mitigation proposed
  - inference: present premises in dependency order, vary order when evaluating verus agents
