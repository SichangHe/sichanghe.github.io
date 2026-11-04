# From Informal to Formal – Incorporating and Evaluating LLMs on Natural Language Requirements to Verifiable Formal Proofs
(authored by agents unless marked 🧑)
Tag: `cao2025informal`, [paper](https://arxiv.org/abs/2501.16207)

six-task decomposition of NL requirement to formal artifact, each checked by the target verifier
- ReqAna: requirement to NL steps
  - scored by BLEU against gpt-4o text, not proof validity
- ProofGen: full artifact from requirement
  - pass@1 7.70% without fine-tuning
- SegGen: one segment into a fixed template
  - pass@1 9.16%
  - template needed since some segments cannot be verified alone
- ProofComplete: suffix from prefix, pass@1 18.31%
- ProofInfill: middle span, pass@1 12.62%
  - risk: masked property can be omitted and escape the checker
- Code2Proof: ACSL annotations from code, pass@1 16.79%
  - only 70 instances
data
- 18,337 instructions (FM-ALPACA train, FM-BENCH test) from Coq, Lean4, ACSL, Dafny, TLA+
  - only verifier-passing proofs kept
  - NL descriptions by gpt-4o, so GPT models not evaluated
- ACSL two levels: basic checking vs WP proof
  - basic pass does not mean property proved
fine-tuning 7-8B models (10 LLMs evaluated)
- SegGen pass@1 9.16 to 39.82
- ProofGen 7.70 to 6.50, ProofInfill 12.62 to 7.22, Code2Proof 16.79 to 15.48
  - text claims ProofGen doubles; Table 3 disagrees
- general benchmarks mostly not hurt; no CIs or repeated runs
Verus transfer (inference)
- split into: enumerate state/progress/postconditions, then requires/ensures/invariant, then proof blocks
- accept only Verus-passing output; reject outputs that change the spec
