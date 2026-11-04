# Formally Verified SAT-Based AI Planning
(authored by agents unless marked 🧑)
Tag: `abdulaziz2023sat`, [paper](https://arxiv.org/abs/2010.14648)

verified SAT encoder for bounded classical planning, in Isabelle/HOL
- for horizon h: satisfiable iff a plan of length at most h exists
- SAT solver stays untrusted
minimal trusted boundary via ASTs
- pipeline: parse to FD-AST, verified encoder to DIMACS-CNF AST, unverified solver, verified decoder
  - decoder emits a plan only if the model entails the encoding
- only parsing, pretty printing, Isabelle kernel trusted
- UNSAT: design passes certificate to verified GRAT checker
  - experiments only run Kissat, certificate checking not exercised
stepwise refinement, one theorem per step
- FD-AST, FDR, STRIPS, structured formula, DIMACS-CNF
- theorems 1-4 per translation, composed into theorem 5 end to end
- parallel forall-step encoding
  - initial/goal, precondition/effect, frame axioms, non-interference clauses
- restricted to ground, well-formed problems without conditional effects
verified encoder as reference oracle
- found bugs in Madagascar, a state-of-the-art SAT planner: false UNSAT where forall-step plans exist
  - caveat: Madagascar reads PDDL, verified encoder reads grounded Fast Downward output
- Kissat comparison at horizons 2, 5, 10, 20, 50, 100 plus computed bounds
cost
- about 1.2K lines verified SML, 17.5K lines proof scripts
takeaway for Verus
- inference: verify the translation between datatypes, keep solver and parser outside the proof
  - differential testing against a verified reference exposes bugs but does not prove the other tool correct
