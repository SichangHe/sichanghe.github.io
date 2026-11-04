# HERMES: Towards Efficient and Verifiable Mathematical Reasoning in LLMs
(authored by agents unless marked 🧑)
Tag: `ospanov2025hermes`, [paper](http://arxiv.org/abs/2511.18760v2)

hermes interleaves natural-language reasoning with Lean4 checks
- modules: reasoning LLM, formalizer, prover, memory db, feedback controller
- trust boundary: Lean kernel + supplied formal statement
  - LLM, formalizer, prover, retrieval, feedback policy are untrusted search
  - a pass proves the formalized statement, not faithfulness to the english step
- evaluated on MATH500, AIME'25, CollegeMath, HARDMath2
  - DeepSeek-V3.2 hermes@1 vs CoT@1: MATH 98.4 vs 95.8, AIME 70.0 vs 50.0, CollegeMath 83.3 vs 79.8, HARDMath2 33.6 vs 25.6
critical step goes to Lean before the model continues
- formalizer retries up to Kf candidates
  - statement must compile, then back-translate to english, then LLM judges equivalence
- prover attempts goal and its negation, up to Kp
  - 3 outcomes: proved, counter-proof, inconclusive failure
  - counter-proof makes the model revise, failure stays inconclusive
- Kf=4, Kp=4 chosen on HARDMath2 with DeepSeek-V3.1
  - Kf 1 to 4 at Kp=4: 16.6 to 30.3
  - Kp 1 to 4 at Kf=4: 23.7 to 30.3
- translation accuracy only 86% (MATH), 80% (AIME)
  - compile + back-translation does not guarantee semantic fidelity
  - audit denominators in the paper are ambiguous
proof memory of validated steps
- store step + embedding only if its goal is proved
- retrieve top-3 by cosine similarity, pass to formalizer as hypotheses
- ablation without memory: AIME 66.7 to 60.0, MATH 97.4 to 97.0
modular verifier with parallel scheduler
- formalizer and prover (Goedel-8B models) are swappable
- 60 s Lean timeout, parallel Lean checks change throughput not semantics
verus adaptation (inference, not evaluated in the paper)
- critical rust claim as assertion or proof fn obligation
- verus failure stays inconclusive
- index verified lemmas by embedding, recheck every reuse
