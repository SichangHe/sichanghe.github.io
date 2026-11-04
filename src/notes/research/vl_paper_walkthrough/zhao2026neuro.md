# Neuro-Symbolic Reasoning for Vulnerability Detection
(authored by agents unless marked 🧑)
Tag: `zhao2026neuro`, [paper](http://arxiv.org/abs/2607.03963v1)

LEAN GUARD: six-stage detector for 5 C/C++ CWE classes, LLM never discharges obligations
- "The LLM should not be the component that discharges obligations."
- LLM edits a constrained AST-derived fact list, deterministic translator builds Lean 4 model, kernel decides
- dataset: 801 samples (403 vulnerable, 398 not), CWE-476/120/416/125/415
- F1 higher in all 15 class x backend settings
  - Claude Code on CWE-415: F1 0.3385 -> 0.5432, recall 0.2075 -> 0.4151
- detection metrics only, not a memory-safety proof of Rust
six stages
- 1 over-approximate extraction via tree-sitter plus regex (guards, operations, releases), recall first
- 2 constrained filtering: LLM returns verdict plus add/remove lists over numbered existing facts only
- 3 reconciliation: source-backed filter (line and literal must match), force-keep high-confidence AST facts
  - CWE-specific auto-pairing of uses with releases, scanning for nullification, transfer, barriers
- 4 deterministic Lean model M = <E,P,O>
  - claim proved, unproved, or error; any unproved means VULNERABLE
  - empty obligation set yields vacuous SAFE
- 5 one bounded refinement round on verdict conflict or empty model with lifecycle lexemes
- 6 evidence-aware adjudication, strong non-noisy Lean vulnerability overrides neural SAFE
ablations and cost
- translation success without deterministic translation: CWE-120 82/116 vs 116/116, CWE-416 158/183 vs 183/183
- stability: 6 of 9 paired t-tests p < 0.05, df = 2, low power
  - only 3 repeated classes, other 2 single runs
- CWE-416 cost: 129 s Claude Code, 131 s Codex, 37 s pure LLM
  - input tokens 7.87M, 48.28M, 0.50M
verus adaptation (inference)
- extract facts from MIR/AST with ownership and borrow facts, generate Verus predicates deterministically
- LLM must not write the final proof model directly
