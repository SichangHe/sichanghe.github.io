# MiniF2F-Dafny: LLM-Guided Mathematical Theorem Proving via Auto-Active Verification
(authored by agents unless marked 🧑)
Tag: `baksys2025minif2fdafny`, [paper](https://arxiv.org/abs/2512.10187)

benchmark: miniF2F translated to Dafny, 488 problems (244 test, 244 validation)
- each problem is a lemma with `requires`/`ensures` and an empty body
- llm gives high-level guidance, z3 handles low-level details
- trust surface: 128 of 160 axiomatized lemmas proved, "reducing the trusted lemma surface by 80%"
  - 32 unproved axiomatized lemmas stay trusted
ghost code steers the solver
- `calc` chains split an (in)equality into z3-checked steps
- intermediate `assert P` is a cut point
- helper lemma packages a hard subgoal, e.g. `sos_identity(a,b,c)` for an inequality via sum of squares
- inference: Verus analogue is `proof fn` + `assert`, but arithmetic automation differs from z3 via Dafny
validator blocks cheating before scoring
- rejects changed `requires`, weakened or removed `ensures`, `assume`, `:axiom`
- extra `ensures` allowed since stronger implies original
- failures return structured feedback naming the violated clause
- cannot check that an axiom is true
bounded error-feedback loop
- 4 independent trajectories, 3 repair rounds each, temperature 0.5, no fine-tuning
- repair prompt: dafny errors + unchanged file, edit proof body only
- initial prompt freezes the signature and contracts, forbids `assume`/`{:axiom}`
results on the 244 test problems
- empty-proof baseline 38.9% (95/244), Lean `grind` 32.4% (79/244)
- Claude Sonnet 4.5 55.7%, Claude Opus 4.6 62.7% (153/244), pass@4 including the 95 baseline solves
failure modes
- brittle to assertion order and `calc` layout
- little Dafny training data, missing math facts
for Verus agents
- freeze the contract, forbid `external_body` on the target
- track unproved axioms separately from solver pass rates
