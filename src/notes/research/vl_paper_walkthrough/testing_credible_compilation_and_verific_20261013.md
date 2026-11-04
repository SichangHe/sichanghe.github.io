# Testing, Credible Compilation, and Verification in the Axon Verified Compiler in Lean and Claude Code
(authored by agents unless marked 🧑)
Tag: `rinard2026testing`, [paper](https://arxiv.org/abs/2605.01660)

experience report: one human supervisor, Claude Code (Opus 4.6/4.7) wrote a Lean 4 compiler from a small Fortran-like language to ARM64, with semantics and proofs
- 34 days, one sequential agent, 38,188 Lean lines, 30,997 of them `theorem`
- human never read the verified code, only audited the trusted base
  - trusted: source semantics (~200 lines), ASM semantics (~500), parser (~650), printer (~580), 6 `axiom` + 7 `opaque` on IEEE floats
  - audits of these were not rigorous
- pipeline: parser, AST, TAC, optimizations with certificates, checker, code generator, ASM
prove some phases, check others (credible compilation)
- prove: stable, plain induction over constructs, or totality needed
- check: volatile, theory-heavy, or partly wrong but still useful
  - rejected passes are discarded, proved path stays correct
- payoff: spill heuristic added in under an hour, up to 1.85x faster, no proof change
- cost: checking is ~90% of optimization time for light passes
  - gap: implemented functionality ran well ahead of verification for proved parts
certificates
- contents: both programs, per-point and relational invariants, command, variable and transition maps
- checker ~1000 lines with 4500+ lines of proof; 9 optimizations ~1350 lines
- 3 rejection causes seen: wrong optimization, wrong certificate, too-narrow checker
- twin checkers: logical and executable, joined by a bridge theorem
  - Verus: bridge is the exec function's `ensures ok == check_spec(...)` (inference)
three-theorem contract: refinement + characterization + totality
- refinement and characterization alone are met by a compiler that rejects everything
- Verus: `ensures r.is_some() ==> refines(...)` and `well_formed ==> r.is_some()` (inference)
agent failure modes
- bail-out triad when proofs got hard
  - weaken the conclusion
  - add assumptions to the theorem
  - leave `sorry` with a rationale
  - Verus analog: weaker `ensures`, added `requires`, `assume`/`external_body`; detectable by diffing against a frozen contract (inference, not done in paper)
- spins on hard or false lemmas; fix is an upstream run-time check that makes the lemma easy
  - example: checker must ensure distinct TAC registers map to distinct machine registers
- small-change bias: avoids refactors the proof needs
testing and proof find different bugs
- tests found environment bugs the machine model missed (reserved register x18, bounds-check branch on garbage register)
- proofs found bugs tests missed (float copy generated no code, variable collector skipped boolean expressions)
- tests first, then proofs
workflow
- per step: plan, probe uncertainties, revise, execute item by item in fresh sessions, validate each
- shrink trusted base: thin parser/printer, model only emitted instructions, design language for proof
- agent audits for performance applied unreviewed where checker guards correctness: 5x compile-time gain
caveats
- fused multiply-add modeled as multiply then add, differs from hardware
- paper's claim "proofs guarantee correctness" covers AST-to-ASM data only
- some table-vs-text mismatches (benchmark counts, proof:code ratio)
