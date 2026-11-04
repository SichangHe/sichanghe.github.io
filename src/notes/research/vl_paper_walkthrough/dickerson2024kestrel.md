# KestRel: Relational Verification Using E-Graphs for Program Alignment
(authored by agents unless marked 🧑)
Tag: `dickerson2025kestrel`, [paper](https://doi.org/10.1145/3720474)

relational verification of 2 programs needs a good alignment of their loops
- naive concatenation leaves 2 unrelated loops, overwhelms Dafny/SeaHorn
- good alignment exposes shared loop invariants
- CoreRel: relational calculus with paired commands, sequences, conditionals, loops
  - loop alignment adds runoff loops for iterations taken by 1 side
  - Coq-formalized metatheory
e-graph equality saturation builds many alignments at once
- start from naive paired embedding, saturate with algebraic realignment rules
  - rules: decomposition, reassociation, commutation, loop alignment, stuttering
- every extracted term equivalent to the original by construction
- limits: saturation stops at bound/timeout; rule vocabulary limits reachable alignments
two-stage extraction picks the candidate
- stage 1: syntactic, minimize unfused loops
- stage 2 only if stage 1 fails to verify: simulated annealing over neighboring e-node choices
- cost from execution traces on sampled initial states, since verification is too expensive as a metric
  - cost = 0.5 * unmerged loop ratio + 0.5 * runoff iteration ratio
  - ablation: combined cost solved 5 benchmarks where fusion-only or runoff-only failed
backend verifies the extracted program
- Dafny with Houdini-style invariant elimination over Daikon + built-in predicates
- also SeaHorn via translation to array C
- user hints sometimes needed (ADT axioms, complex relations)
evidence: 31 benchmarks, Dafny, 5 min timeout
- Dafny failed naive alignment on 26 loop benchmarks; KestRel verified all but 3
- 5 successes needed semantic extraction beyond syntactic candidate
- failures: data-alignment (guards), loop-tiling (new inner loops), static-caching (complex invariants)
takeaways for Verus (inference, not evaluated)
- search outside the verifier, accept only candidates Verus proves, so heuristics need not be trusted
- trace-sampled cost only guides search, never a proof assumption
- relational proofs need paired harness with ghost relational loops
