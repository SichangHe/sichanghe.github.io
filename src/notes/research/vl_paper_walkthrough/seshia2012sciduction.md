# Sciduction: Combining Induction, Deduction, and Structure for Verification and Synthesis
(authored by agents unless marked 🧑)
Tag: `seshia2012sciduction`, [paper](http://arxiv.org/abs/1201.0979v1)

position paper: learned candidates plus a deductive checker under a structure hypothesis
- instance = triple H, I, D
  - H: structure hypothesis, restricted form of the artifact
  - I: inductive engine learning from examples
  - D: lightweight deductive engine answering queries
    - may solve a special case, run in o(T(n)), or solve a decidable problem where the original is undecidable
- soundness is conditional: valid(H) implies sound(P)
  - H valid if a solution exists in the full class then one exists in the restricted class
  - invalid H gives a best-effort heuristic procedure
  - no general method to check H validity (conclusion §6)
- evidence is per-application, no common benchmark or aggregate number
structure-constrained invariant generation (related-work example, ABC)
- H: constants, equivalences, implications, clauses, k-cuts
- keep every candidate consistent with simulation traces, prove survivors with SAT
  - failure to find an invariant fails the proof, never accepts a buggy system
- Verus form (inference)
  - candidates as predicates generated outside Verus, selected one inserted as loop invariant
  - Verus checks initialization, preservation, postcondition, traces only filter or rank
  - generator must handle ownership and ghost state, absent from the paper
active induction-deduction loop (reading of §2.2, not given by the paper)
- pick H, ask D for an example, label it, update I, ask D if a consistent artifact exists, repeat
- Verus form: counterexample-guided driver proposes invariants or lemmas, runs verus, parses errors, refines
  - heuristic proposal is not a proof until Verus checks it
component-library synthesis (malware deobfuscation)
- H: loop-free compositions from a finite bit-vector component library
- I learns from distinguishing inputs, D is an SMT solver
- sound if the library contains an equivalent program, else unrealizable or consistent-but-wrong output
- both example benchmarks deobfuscated in under 0.5 s
other applications
- GameTime timing analysis: 9 basis paths predict the timing of 256 paths, probabilistically sound under valid H
- switching-logic synthesis: hyperbox guards learned by binary search, simulator as reachability oracle
- simulation is evidence for candidate generation, not proof of all executions
