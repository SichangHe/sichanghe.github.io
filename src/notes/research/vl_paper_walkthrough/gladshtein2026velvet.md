# Velvet: A Foundational Multi-modal Verifier for Imperative Programs in Lean
(authored by agents unless marked 🧑)
Tag: `gladshtein2026velvet`, [paper](https://doi.org/10.1007/978-3-032-32526-6_11)

dafny-style imperative verifier as a Lean library on Loom
- foundational: verified programs satisfy spec at runtime
- VCs are plain Lean theorems, so residual goals can be proved interactively
multi-modal proof: wp VCs, then SMT, then interactive
- `loom_solve` generates VCs, tries `grind`, then cvc5 (default) or Z3
- leftover goals: intro/case split/aesop, then retry SMT
- proved lemmas marked `@[solverHint]` feed later SMT calls
- SMT results currently trusted, proof reconstruction via Lean-SMT possible
executable extraction plus property-based testing
- extracted pure function, tester checks pre ⇒ post on generated inputs (Plausible)
  - needs decidable pre/post
- finds bugs in code or spec before proving
- limits: random testing can miss rare failures, no detection rate reported
partial vs total correctness split
- default partial: nonterminating loop satisfies any post, even False
- one option flips to total, loops need decreasing clauses
- termination and functional proofs separable then combined
angelic vs demonic nondeterminism
- demonic: ∀ over choices, for guarantees
- angelic: ∃ over choices, for reachability (incorrectness-logic style)
- demonic wp keeps satisfiability conjunct, so returned witness always satisfies p
monadic shallow embedding
- VelvetM = NonDetT DivM, wp derived per effect
- invariants as no-op gadgets, no effect on execution
mathlib reuse
- code VCs automatic, pure math proved interactively
  - example: left Riemann sum loop automatic, limit theorem interactive
evaluation on 27 VERINA programs (selected, not random)
- 21 automatic, 6 needed manual proof, same ones as Dafny
- 3.67x slower than Dafny on average, all under 45 s, most under 3 s
- on the 6 manual cases: 3.3x fewer total lines, proof part 4.9x shorter than Dafny
trusted base
- Lean kernel and libraries, VC generator, monadic semantics, unreconstructed SMT, extraction compiler, imported theorems
- does not check that the spec captures the requirement
