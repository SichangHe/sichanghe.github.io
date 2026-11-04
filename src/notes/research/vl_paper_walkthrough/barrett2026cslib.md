# CSLib: The Lean Computer Science Library
(authored by agents unless marked 🧑)
Tag: `barrett2026cslib`, [paper](https://arxiv.org/abs/2602.04846)

white paper / roadmap, not an evaluation
- no theorem counts or benchmarks; 2026-27 milestones are expectations
- pillar 1: reusable Lean formalization of CS models, logics, algorithms, data structures, complexity
  - existing: operational semantics, program equivalence, automata, linear logic, sorting/searching
- pillar 2: Boole, an IVL for imperative code with Lean specs
  - front ends envisioned: Rust, Python, C++, Java
Boole workflow
- write `requires`, loop `invariant`, `assert`; VC generator emits Lean goals per loop-free path
- prove manually or with hammers
  - Lean-SMT: translate goal to SMT, get solver certificate, replay step by step in Lean
- prototype extends Strata Core dialect; shown only on a small loop-sum example
TCB minimization
- embed Boole and VC generation inside Lean
- aim: verified transpilation from front ends, VCs readable and tied to source
- intended TCB: language semantics + Lean kernel
- Verus transfer (inference): list trusted compiler/verifier/solver/translator; translator needs its own preservation argument
AI role
- AI is advisory only; every committed change gets manual GitHub review
  - AI formalizations may be buggy even when proofs are sound; AI proofs may be incomprehensible
- formalizations serve as training data, proposed AI/human "flywheel"
- Verus transfer (inference): verifier checks proofs, human checks contracts match intent
