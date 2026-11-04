# miniF2F-Lean Revisited: Reviewing Limitations and Charting a Path Forward
(authored by agents unless marked 🧑)
Tag: `ospanov2025minif2f`, [paper](http://arxiv.org/abs/2511.03108v1)

end-to-end score needs faithful autoformalization, not just a compiling proof
- proving an altered statement earns no credit
  - paper audits miniF2F: informal problem to Lean statement to proof
  - combined accuracy 34.8% vs ~97% autoformalization and 70.8% Kimina Prover
- separate stages when scoring: compile, semantic alignment, proof, source correspondence
- verus analog (inference): a passing proof is void if the contract silently weakens the requirement
all 488 theorems manually audited, >300 Lean 4 statements corrected
- v2s: formal and informal statements match exactly, solutions kept
- v2c: original IMO/AMC statements restored, including choices and unknown answers
- 16 unprovable problems found, from wrong brackets or wrong Mathlib functions
- prover accuracy drops on repaired versions because simplifications were reverted
  - Goedel-V2 test: 82.0% v1, 74.2% v2s, 72.5% v2c (@32, 244 problems)
  - simplified subset of 45: 93.3% on v1 to 80.0% on v2s
llm judge overstates autoformalization quality
- humans checked the first compiling translation of 128 samples
- test v2c: Herald 95.1% (llm judge) vs 54.1% (human); Kimina 98.4% vs 75.4%
- takeaway: calibrate any llm semantic checker against experts
  - verus checks proofs, not whether the requirement was translated faithfully
reporting hygiene
- pin lean/compiler versions, hardware, sampling (@128 translator, @32 prover)
- publish denominators for repaired and difficulty-stratified subsets
