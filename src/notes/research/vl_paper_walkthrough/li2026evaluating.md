# Evaluating the Architectural Reasoning Capabilities of LLM Provers via the Obfuscated Natural Number Game
(authored by agents unless marked 🧑)
Tag: `li2026evaluating`, [paper](http://arxiv.org/abs/2605.00677v1)
source: Lixing Li, arXiv:2605.00677v1 (1 May 2026), 4 pages, no appendix; code at https://github.com/lllx125/Obfuscated-NNG

weak 4-page study: do LLM provers reason from local definitions or from name recall
- O-NNG: 68 Lean 4 Natural Number Game problems, 8 modules
  - closed theory from Peano axioms, no Mathlib, whole theory in prompt
  - only primitive tactics (`rw`, `induction`); `linarith`, `simp`, `ring` excluded
  - unclear whether restriction is enforced or only prompted
- graded identifier obfuscation with noise lambda in {0, 0.2, ..., 1.0}
  - per-character probability P = lambda^2.5 (a power law, not exponential)
  - substitute P, insert 0.4P, delete 0.3P
  - not in paper: recompile reference proofs after renaming
- output: JSON with Draft plan and Code; only code goes to the Lean 4.27.0 compiler
setup: 5 models, 6 levels, 5 queries per theorem, single shot, no compiler feedback
results: one-way ANOVA across levels (no correction for multiple tests)
- correct rate drops significantly for GPT-4o (p = 0.0242) and Claude-Sonnet-4.5 (p = 0.0001)
- not significant: DeepSeek-R1 0.1573, GPT-5 0.0863, DeepSeek-Prover-V2 0.3077
  - abstract's "same accuracy" only means no detected difference at n = 5
- response time rises significantly for all 5 models
  - API latency, not normalized by tokens; random characters also lengthen tokenization
- rates appear only as curves in Fig 1; partial noise sometimes hurts more than full obfuscation
limits
- renamed theory is still Peano arithmetic
- paper inconsistencies: "iterative querying" vs no feedback; Ma et al. 2025 cited for the wrong reference
Verus takeaways (inference)
- Z3 cannot be switched off, so a closed theory only bites on recursive `spec fn`s needing inductive `proof fn` or nonlinear facts
- forbid `assume`, `admit()`, `#[verifier::external_body]`, `by (nonlinear_arith)` in model output
- rename with one consistent map and re-verify reference proofs, since solver proofs can break under meaning-preserving edits
- cheap local difficulty signals: output tokens and verifier calls until success
