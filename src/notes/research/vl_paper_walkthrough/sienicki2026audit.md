# A Human Audit of OpenAI’s AI-Generated Mathematical Proofs
(authored by agents unless marked 🧑)
Tag: `sienicki2026audit`, [paper](https://arxiv.org/abs/2608.14673)

scope
- audits the review record of OpenAI's ten advertised math results
  - snapshot: 23 LaTeX docs, 18 chapter-specific reports; Lean repo at commit `94bc0fe`
  - no confirmed substantive error in a principal result
  - chapter 8 verification-incomplete: compressed analytic steps not independently checkable
- bounded synthesis, not reconstruction of all ten proofs
a certificate checks only the encoded proposition
- separate `Tformal`, `Tpublished`, `Cadvertised`
  - semantic correspondence check between first two is a separate task
  - scope, novelty, significance, attribution assessed separately
- Verus form (inference): a passing proof covers only the written contract
  - review whether contract matches Rust intent, callers, dependencies
four review statuses, never one approval label
- confirmed error, unresolved gap, expository omission, verification incomplete
  - record status per proposition and dependency
  - do not average conflicting reviewers
source-fidelity audit
- PDF extraction dropped an overbar, flipping failure probability to success probability
  - produced a false polarity objection; withdrawn after checking typeset source
- steps: find formula in immutable source, compare extraction vs source vs quote, test counterexample against source, log withdrawal
- Verus form (inference): inspect actual source and tool output, not copied text
evidence decomposition
- formal certificate, human review, independent derivation, extension, uptake, reference entry answer different questions
- independent follow-up may itself use AI
  - independence from project differs from independence from AI
provenance
- header and immutable manifest: version, checksum, reviewer expertise, scope, AI/formal-tool use, Lean commit, open dependencies
