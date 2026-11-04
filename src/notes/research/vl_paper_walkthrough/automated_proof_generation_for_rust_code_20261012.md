# Automated Proof Generation for Rust Code via Self-Evolution
(authored by agents unless marked 🧑)
Tag: `chen2024automated`, [paper](https://arxiv.org/abs/2410.15756v3)

SAFE: self-evolving Verus proof generation, verifier filters all training data
- 45,395 MBPP/CodeNet programs, GPT-4o translates to Verus-compatible Rust, 21,398 compile (47.1%)
  - translation semantic equivalence unchecked, trusted
- bootstrapping GPT-4o proofs cost one month of nonstop calls, over 1,000 functions
- fine-tune Llama 3.1 / DeepSeekCoder over 3 proof rounds
- VerusBench (139 tasks): SAFE DeepSeekCoder 43.17% @1, 53.96% @10 vs GPT-4o raw 11.51%, 24.46%
  - 139 vs AutoVerus's 150 gap is inferred
- CodeNet-Test (1,435): 43.83% @1 vs GPT-4o 0.28%
- round 1 to 3 on VerusBench: 32.37% to 43.17% @1
- limits: small function-level programs, cross-file dependencies unsolved
translate ordinary Rust into Verus-supported Rust first
- `for`, iterators, `HashMap` unsupported; e.g. iterator to `while` loop
- keep only compiling results
spec scoring with mutation
- generate `requires`/`ensures` with GPT-4o; test against ~5 real tests and ~20 mutated wrong outputs
  - correctness = real tests accepted
  - completeness = mutated outputs rejected
- keep correctness >= 80% and completeness >= 60%, up to 3 per function
- incomplete specs are fine: goal is to stimulate proof synthesis
- spec quality matters: low-quality specs give 17.27% @1 vs 43.17%
  - weak spec example: gcd `result > 0` lets proof copy preconditions
verifier-filtered proof self-evolution
- keep only proofs with zero Verus errors, fine-tune, regenerate, repeat
error-conditioned self-debugging
- train on (rejected proof, Verus diagnostics, later verified proof)
- SAFE+ @2 49.64% vs 46.76% direct; @100 70.50% vs 59.71%
- further debug rounds add under 1%
- repair example: invariant `index` to `index + 1` bound
- no alignment between edit and error; future work
inconsistencies and trust
- failure rate on VerusBench: 20.86% per appendix, 29.50% per Table 1, intro says 79.14%
- `reveal` likely missing from fine-tuning data (authors' suspicion)
- trusted: Verus and SMT, docstrings and generated tests as intent
