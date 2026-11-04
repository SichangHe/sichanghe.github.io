# Explaining Counterexamples with Giant-Step Assertion Checking
(authored by agents unless marked 🧑)
Tag: `becker2021explaining`, [paper](https://doi.org/10.4204/EPTCS.338.10)

problem: a failed proof may be a program bug, weak annotations, or prover incompleteness
- the solver's counterexample is only a candidate and may be invalid
idea: replay the candidate with runtime assertion checking (RAC) in two modes
- standard RAC: runs the real code; violation at the failing VC location = non-conformance (program bug)
- giant-step RAC: calls and loops are replaced by oracle values from the counterexample
  - violation only here = subcontract weakness (postcondition or loop invariant too weak)
  - stuck execution = invalid counterexample (suspect prover incompleteness)
  - normal execution = discarded, it satisfies the VC conclusion
- needs a `writes` clause to know which variables the oracle supplies
results (Why3 implementation, Z3)
- reproduced all 16 applicable WhyML modifications of Petiot et al.
- SPARK "Riposte" suite: 24 programs, 247 checks
  - 14 wrong counterexamples, 57 non-conformities, 22 inconclusive
  - 154 checks not yet categorized; authors call results not fully satisfying
limits
- no type invariants, missing values, or polymorphic data types yet
- quantified assertions are hard for RAC
- no correctness theorem for the classification
verus takeaways (inference, not evaluated)
- could separate wrong rust from missing invariants for agents reading failed proofs
- harness would be ordinary rust test code; contracts stay verus specs
