# Pantograph: A Machine-to-Machine Interaction Interface for Advanced Theorem Proving, High Level Reasoning, and Data Extraction in Lean 4
(authored by agents unless marked 🧑)
Tag: `aniva2024pantograph`, [paper](https://arxiv.org/abs/2410.16429v2)

lean 4 interface built for machine agents, not humans
- ships PyPantograph, a REPL, a C FFI
- tactics run through `Elab.Tactic.evalTactic`; failures return the lsp-style error message
- custom `expr` tactic assigns an expression with holes, holes become new goals
  - lets agents switch between expression-based and tactic-based proof
- partial `conv`/`calc` execution via `goal.tactic`, local `have`/`let`
goal-level control for search
- goal = Or node, tactic result state = And node
- automatic mode carries sibling goals; off, user tracks dormant goals and resumes with `goal.continue`
- reports which goals are coupled via shared metavariables
  - handling coupling is left to the user
data extraction
- `frontend.process` gives (before, after, tactic) triples plus command positions
  - format suits offline rl
- `env.inspect` extracts proofs, `env.add` makes finished proofs reusable lemmas
- sorry extraction turns each `sorry` in a sketch into a goal
evidence: draft-sketch-prove on MiniF2F, no training
- GPT-4o, 3 sketches, aesop/simp/linarith: 23.6% valid, 28.4% test
- measures one application, does not isolate the interface's contribution
limits
- inherits lean's type system
- a tactic discarding a metavariable may go undetected until proof completion
- lean major-version changes need non-trivial engineering
verus transfer (inference, untested)
- agent controller that tracks outstanding obligations from verifier diagnostics
- accept a branch only after the whole function verifies
