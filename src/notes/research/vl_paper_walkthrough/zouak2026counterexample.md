# Counterexample Generation via Per-Theorem Symbolic Verifiers: When Imitation Hurts and Reinforcement Repairs
(authored by agents unless marked 🧑)
Tag: `zouak2026counterexample`, [paper](https://arxiv.org/abs/2610.02444)

SYMCE: false conjectures `H1 ∧ … ∧ Hk → Q` with an executable Python verifier per theorem
- model outputs witness satisfying remaining hypotheses and falsifying Q
- verifier returns one bool per hypothesis + one for negated conclusion, run in sandbox
- median oracle time 132 ms
data construction
- 6,748 undergrad theorems, drop one hypothesis each → 18,262 candidates
- Gemini 3.1 Pro filters, writes verifier + witness, up to 5 retries with error feedback
- 4,707 verifier-backed records kept (3,485 theorems)
- split: SFT 1,000, test 201, RLVR 3,506
- witness schema from verifier + canonical witness added to prompt as output-shape prior
- audit of 177 witnesses: 99/101 accepted and 74/76 rejected confirmed (false-accept 2.0%)
imitation hurts calibration
- Qwen3-4B counterexample-only SFT: truth recognition on 347 true theorems 0.27 → 0.00
- model asserts 70% of true theorems are false
sparse outcome RLVR repairs it
- GRPO, rewards -1/0/+1 on verifier-confirmed negation only
- truth recognition 0.65 (SYMCE prompt), 0.84 (explicit classification)
- dense reward gets 0.34 / 0.73 at same counterexample success (0.502 vs 0.497)
  - cause: hypothesis-only witness worth α+γ = .35 vs abstention -.20
- 4 seeds, truth-prompt metric 0.33 ± 0.04 dense vs 0.66 ± 0.04 sparse
transfer with unchanged prompts, sparse RLVR vs SFT
- GSM8K .88 vs .82
- MATH-500 .65 vs .55
- MMLU-college-math .72 vs .54
- AIME-2024 .08 vs .07
Verus takeaway (inference)
- reward terminal verified success only; partial credit for compiling lemmas risks plausible-but-invalid proofs
- schema can fix output shape but is not evidence of verification
