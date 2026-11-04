# LEAN-GitHub: Compiling GitHub LEAN repositories for a versatile LEAN prover
(authored by agents unless marked 🧑)
Tag: `wu2024lean` , [paper](https://arxiv.org/abs/2407.17227)

corpus of lean 4 proof traces mined from github, used to train a prover
- yield is lossy at every stage
  - 237 candidate repos, 147 kept after dropping deprecated lean versions, only 61 compile unmodified
  - 8639 files, 6352 extracted (42K theorems), only 2133 files / 28K theorems have tactic info
  - released: 28597 theorems, 218866 tactics
  - figure 2 says 8369 files vs text 8639, unreconciled
  - loss causes: malformed projects, missing deps, old lean features, no tactic proofs
  - lesson: report extraction success and usable-trace success separately
- extraction engineering
  - call leanc directly instead of lake, so one failed target does not discard a project
  - patch lake to expose dependencies, add isolated files to import graph, compile in parallel
  - restructure leandojo extraction for isolated files and more parallelism
- search-state dedup
  - over 50% of intermediate states are duplicates
  - rename hypotheses by kernel storage order to unify states differing only in names
  - no dedup ablation
training and results
- fine-tune internlm-math-plus-7b on state to next-tactic pairs, giving internlm2-stepprover
  - 2 epochs, batch 512, lr 1e-5, 6h on 32 A100
- miniF2F-test
  - 48.8% pass@1, 54.5% at 64 passes
  - adding lean-github: mathlib 37.3 to 41.0, mathlib+synthetic 46.7 to 48.8
- ProofNet 18.1% pass@1, PutnamBench 5 of 640
limits
- verus analogue (verified rust proof states paired with next command) is inference, untested
- extracted data cannot show a spec matches intent
