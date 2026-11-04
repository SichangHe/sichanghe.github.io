# Logic-LM: Empowering Large Language Models with Symbolic Solvers for Faithful Logical Reasoning
(authored by agents unless marked 🧑)
Tag: `pan2023logic` , [paper](https://arxiv.org/abs/2305.12295)

LLM formalizes, solver reasons, interpreter answers
- claim: "faithful as long as the problem formulation is correct", since the solver is deterministic
- solver per task: Pyke (LP), Prover9 (FOL), python-constraint (CSP), Z3 (SAT)
  - datasets: PrOntoQA, ProofWriter, FOLIO, LogicalDeduction, AR-LSAT
- prompt = grammar + 2 demos in `SYMBOLIC_FORMULA ::: NL_STATEMENT` format
- headline gain 39.2% over standard and 18.4% over CoT is relative, not accuracy points
  - GPT-4: 24.98% and 10.44%
  - 39.2/18.4 could not be reproduced from Table 2
executable is not correct
- Exe_Rate = grammar correctness; Exe_Acc = accuracy of executable samples
- GPT-4 Exe_Rate: 100 PrOntoQA, 99.0 ProofWriter, 79.9 FOLIO, 100 LogicalDeduction, 32.6 AR-LSAT
- GPT-4 Exe_Acc: 83.2, 79.6, 80.4, 87.6, 60.0
- semantic errors that still execute
  - "below" vs "above" swapped, giving `Dan > Eve`
  - constant `WildTurkey(eastern)` instead of predicate `EasternWildTurkey`
  - invalid `Rating(subway, y) ∧ y > 9`
- inference: verifier success must not be read as the contract capturing the requirement
solver-error self-refinement
- feed back erroneous form + solver error + demos of common repairs, up to a max number of rounds
- Exe_Rate +5.01 on average
  - FOLIO GPT-4 Exe_Rate 79.9 to 85.8, but accuracy 80.4 to 79.9
  - accuracy stagnates while Exe_Rate keeps rising: error message alone does not fix a wrong formulation
- inference: a Verus agent must preserve the original spec during repair
  - a proof obligation can vanish because the contract was weakened
