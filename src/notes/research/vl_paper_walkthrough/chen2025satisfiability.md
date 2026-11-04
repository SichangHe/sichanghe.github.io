# LLM-based Satisfiability Checking of String Requirements by Consistent Data and Checker Generation
(authored by agents unless marked 🧑)
Tag: `chen2025satisfiability`, [paper](https://arxiv.org/abs/2506.16639)

LLM proposes an outcome, LLM-generated checkers validate it
- outcome: UNSAT, or SAT plus a concrete string
  - budget exhausted returns UNKNOWN with the best saved outcome
- SMT checkers prove UNSAT and validate strings
- Python checkers validate a string only, cannot prove UNSAT
- hybrid: Python for strings, SMT for UNSAT
- failure mode: flawed LLM answer agrees with flawed checker
  - the authors: "While feedback helps, it cannot fully eliminate the risk."
checker generation
- independent per-requirement generation (IND) beats batched (BATCH)
  - gap largest for small models
- 340 requirement sets, 12 categories
  - Python checker testing accuracy 100% for GPT-4o, GPT-4o-mini, DeepSeek-V3
  - SMT checker testing accuracy over 75% for GPT-4o and DeepSeek-V3 in IND, below 20% for Llama3.1-8b
  - testing = 5 satisfying + 5 violating strings per requirement, not full correctness
feedback loop
- validate, report violated requirements, retry with counterexamples
- SMT-generated data not returned directly
  - may be unrealistic, and the SMT checker may itself be wrong
- Hybrid+VFE with ground-truth checkers
  - F1 82.59–94.64% across 4 LLMs, GPT-4o 94.64%
  - counterexamples without explanations can lower generation success
- end to end with generated checkers
  - over 95% of upper-bound GSR in three verifiers
  - over 60% of upper-bound F1 in all
limits
- labels needed manual resolution: CVC5 left 56 of 340 UNKNOWN
- manually built checkers and samples may be wrong
- checker agreement does not show formal predicates capture the English
- Verus transfer (inference): prove a Rust checker's true result implies all formal predicates hold, cannot derive predicates from English
