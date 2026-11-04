# InternLM2.5-StepProver: Advancing Automated Theorem Proving via Critic-Guided Search
(authored by agents unless marked 🧑)
Tag: `wu2024internlm2`, [paper](http://arxiv.org/abs/2410.15700v2)

lean 4 stepwise prover with a learned critic ranking proof states
- critic-guided search (cg)
  - critic V(s) scores a state, replaces tactic log-likelihood as expansion priority
  - trained on preference pairs, not solved/unsolved labels
    - path pairs: later state on successful path beats earlier
    - sibling pairs: successful child beats failed sibling
  - heuristic assumption: any legal tactic on a successful path is positive
  - no stable metric for critics, a stated limitation
    - 78.0% pair accuracy on 6510 miniF2F-test pairs
- hybrid best-first (bf) + cg
  - budget split equally, union of solved results
  - miniF2F-test 59.4% (bf) to 65.6% (cg) to 65.9% (bf+cg)
  - ProofNet 22.3% bf, 23.9% cg, 27.0% bf+cg
    - bf+cg gets twice the total passes, not a fair comparison
- expert iteration for prover and critic together
  - lean-workbook-plus statements plus their negations, since autoformalization may be wrong
  - critic ranks unproven statements, next round focuses on top 50%
  - 14075 of 82275 solved (17.0%), using 1.5% of compute
    - 83.0% unsolved consume 98.5% of 21364 cpu days
  - paper also says 20000 cpu hours, unit conflict unexplained
- prompt carries the tactics leading to the current state (PROOF_BEFORE)
  - no ablation isolating it
limits
- verus transfer is inference only, not tested
  - idea: critic prioritizes proof edits, verus accepts
- benchmark pass rate says nothing about intent behind the formalization
