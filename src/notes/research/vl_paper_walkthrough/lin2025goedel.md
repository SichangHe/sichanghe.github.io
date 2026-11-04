# Goedel-Prover-V2: Scaling Formal Theorem Proving with Scaffolded Data Synthesis and Self-Correction
(authored by agents unless marked 🧑)
Tag: `lin2025goedel`, [paper](http://arxiv.org/abs/2508.03613v1)

goedel-prover-v2: lean 4 prover with self-correction, scaffolded data, rl
- minif2f (244 problems): 32b 88.1% pass@32, 90.4% with self-correction, 91.8% pass@1024 no correction
  - 8b: 84.6% pass@32, 86.7% with correction
- putnambench (644): 32b solves 43 pass@32, 57 with correction, 86 at pass@184 with correction
  - intro says 44 without correction, table says 43
- lean results do not establish verus performance
verifier-guided self-correction
- feed compiler errors + previous cot + proof back, 2 extra rounds in 40k-token budget
- removing compiler feedback hurts significantly, removing previous reasoning hurts less
- 128k context, 5 revisions: 92.7% pass@32, vs 92.2% for no-correction at pass@8192
  - budgets differ, no universal cost ratio
- verus analogue: keep contract fixed, route suspected spec errors elsewhere
  - accepted proof does not mean statement matches intent
scaffolded data synthesis
- formal: lean extract goal on failed proofs, add goal and its negation as training statements
  - extracted goal may be false, negation does not prove either side
- informal: qwen3-32b writes easier subproblems for unsolved, harder variants for solved
  - formalize, llm-filter trivial/incorrect, add negations of incorrect ones
  - filtering may discard valid statements
- goedel-formalizer-v2 passes 228/300 omnimath vs kimina 161/300
expert iteration and hybrid rl
- start from 50k claude sonnet 4 formalized statements, keep those passing lean syntax + llm semantic check
- rl: grpo variant, 50% whole-proof / 50% first-round correction tasks
  - no kl, clip-higher, overlong penalty, dynamic sampling on pass rate in (0, 0.75]
- model averaging (1-α)θ0 + αθ after sft and rl restores pass@n diversity
trusted base
- lean, mathlib, statement fidelity, data filters, benchmark repairs
- matholympiadbench: 360 formalizations, compiled with sorry, fidelity unproven
