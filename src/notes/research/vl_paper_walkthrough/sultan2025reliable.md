# Reliable Proof Generation with LLMs via Analogical Retrieval and Symbolic Verification: A Case Study in Euclidean Geometry
(authored by agents unless marked 🧑)
Tag: `sultan2025reliable`, [paper](https://arxiv.org/abs/2505.14479)

retrieval of analogous solved proofs + symbolic verifier with first-error feedback
- reliable = proofs formally verified by a symbolic verifier
- FormalGeo-7k (6,981 problems); eval on 50 problems, 10 per difficulty level
analogical retrieval
- abstract names → `<word>`, numbers → `<num>`
- Jaccard on construction and condition + exact goal match, fed to a 3-layer regressor predicting proof similarity
  - trained on 655K pairs
- top analogies' full proofs become few-shot examples (5 in main runs)
- Verus analogue (inference): index proofs by normalized API calls, predicates, contract shapes
  - check type compatibility before reuse
context narrowing
- theorem dictionary from analogies only
  - top-100 analogies: 26.66 theorems cover 96% of proofs; random: 66.98 cover 88%
  - ~2.5K vs ~18K tokens; baseline ~3x cost
- Verus analogue (inference): pair with a dependency check so missing facts error out
first-error verifier feedback
- 3 tiers: undefined theorem/bad signature, premise not deduced, valid steps but goal unmet
- Z3 checks steps and final answer; workaround for trig via symbolic variables
- Verus analogue (inference): same tiers from Verus diagnostics; feed back only the first
budget: 3 independent runs × 5 verifier-guided attempts = 15
results (50 problems each)
- no retries, 1 run: o1 10→48%, GPT-5 44→64%, Gemini-2.5-Flash 22→48%, Claude Sonnet 4.6 28→60%
- 3 runs × 5 attempts: o1 52→80%, GPT-5 88→96%, Gemini 72→86%, Claude 78→86%
- verifier feedback alone on analogy method: o1 48→68%, GPT-5 64→96%
- ablations (Gemini, Claude; 3 runs)
  - retrieved examples + full dictionary 78%, random examples + random narrowed dictionary 72%, full method 86%
caveats
- abstraction is simple; only geometry; acceptance trusts encoded theorem dictionary
- token savings do not predict Verus verification time
