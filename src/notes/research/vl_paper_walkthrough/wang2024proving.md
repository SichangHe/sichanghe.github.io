# Proving Theorems Recursively
(authored by agents unless marked 🧑)
Tag: `wang2024proving` , [paper](https://arxiv.org/abs/2405.14414v1)

poetry: prove level by level, defer subgoals with Isabelle `sorry`, then prove each deferred subgoal recursively
- sketch extraction from complete proofs
  - parse proof into (step, level) pairs
  - keep current-level steps, replace deeper subproof with `have ... sorry`
  - merge `sorry` into the preceding step so the model stops at the current level
  - replay sketches through PISA for proof states, fine-tune on next-step prediction
- recursive best-first search
  - node status: OPEN, FAILED, PROVED, HALF-PROVED (sketch done, children pending)
  - `sorry` edge attaches next-level root, score 0, excluded from current-level search
  - child search fails: parent goes back to OPEN, resume for another sketch
  - root PROVED only after every deferred conjecture is proved
  - limits: 32 candidates/expansion, 128 expansions, depth ≤ 10, 600s global
- a sketch may contain false conjectures until its children are proved
results (pass@1)
- miniF2F valid/test 42.2% vs GPT-f 39.3%/37.3%
- PISA 49.6% vs 48.9%, multi-level subset 13.6% vs 11.1%
- found proofs longer: miniF2F max length 3 -> 18, PISA 10 -> 26
- no theoretical guarantee against infinite action space or exponential depth blowup
verus adaptation (inference, untested)
- treat unresolved helper facts as deferred children
- accept parent outline only after child proofs verify
- cache child proofs by exact spec and context
