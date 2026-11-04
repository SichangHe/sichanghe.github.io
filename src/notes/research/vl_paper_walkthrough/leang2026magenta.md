# Magenta: Closing the Loop Between Mathematical Reasoning and Lean Verification
(authored by agents unless marked 🧑)
Tag: `leang2026magenta`, [paper](http://arxiv.org/abs/2609.11319v2)

training-free pipeline: reasoner -> formaliser -> prover -> Lean/SafeVerify verifier, plus learned statement judge Js and error judge Je
- core idea: attribute each verification failure to the responsible component, route feedback there
- result: 93 problems (AIME 2025/2026, HMMT Feb 2026), 4 models each reach 100% with Magenta
  - standalone overall: 74.19% (K2-Horizon-7B), 84.95% (K2-Horizon-375B), 91.40% (Qwen3.8-27B), 84.95% (GPT-5.6-Sol)
  - K2-Horizon-7B + Magenta solves 6/6 IMO 2026
  - Lean only, no Verus evidence
statement adjudication: a verified proof only proves the generated statement
- proof of s does not imply s faithfully encodes problem q and answer a
- flow: elaborate with Lean, then Js judges fidelity, only then prove
  - budget exhausted: fail the pair, never prove an unfaithful claim
- ablation, AIME 2026 with Goedel formaliser
  - with Js: Ver 63.3%, VerCor 63.3%, false-certification rate 0.0%
  - without Js: Ver 36.7%, VerCor 20.0%, FCR 45.5%
  - FCR = 1 - VerCor/Ver
- Js is learned, so the result is a soft certificate: sound for s, relevant to q only as far as s is faithful
- Verus analogue (inference): judge the requires/ensures contract against the requirement before verifying
  - keep contract text and judge decision as artifacts
  - judge is a semantic layer, not a replacement for Verus
error attribution and routed repair
- Je labels failure MATH (reasoning/answer wrong) or SYNTAX (Lean code wrong)
  - SYNTAX: keep chain, answer, statement; repair proof from diagnostic
  - MATH: send failed attempt + diagnostic to reasoner, restart statement generation
  - stop on verified proof or exhausted reasoner/statement/proof budgets
- diagnostic-conditioned repair beats independent resampling (K2-Horizon-7B)
  - AIME 2026: 30/30 vs 29/30
  - IMO 2026: 6/6 vs 1/6 despite 8-16 samples per problem
  - the 1 AIME failure had a wrong initial answer, so more proof samples cannot fix it
- limits
  - no confusion matrix for Je
  - one model, fixed budgets, 6 IMO problems
- Verus analogue (inference): SYNTAX = verifier diagnostic, MATH = suspected contract/algorithm error
  - Je is an external model, must never bypass final verification
budget-aware cost accounting
- Pass_u(β) = fraction of problems verified with proof tokens u(q) ≤ β
- Leanstral: full AIME 2026 coverage at ~6e4 reasoner tokens vs 9e5 for Codex
  - proofs ~half as long: 1.1e4 vs 2e4 tokens
  - but ~3e2 internal calls at median coverage, up to 3e3 at full coverage
  - Codex external count is a lower bound, internal work hidden
- lesson: report external calls, internal verifier calls, wall time, proof size, retries separately
