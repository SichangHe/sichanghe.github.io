# Visored: A Controlled-Natural-Language Prover for LLM-Generated Mathematics
(authored by agents unless marked 🧑)
Tag: `zhai2026visored`, [paper](https://www.semanticscholar.org/paper/e689160adfd81f21f473dc73bab48235171d379a)

controlled-natural-language (CNL) prover whose intended user is an LLM
- input: LaTeX with structured English proof sentences
- output: accepted, or rejected with a source-local diagnostic
- optional Lean emission, kernel-checked; Visored's own verdict does not depend on Lean
core claim: make every decision with no surface trace explicit in a typed IR
- subtype, library lemma, edge-case convention, cast
spec-driven parsing
- templates live in external `.lpcsv` files (`Let`, `Assume`, `Then`, induction, cases)
  - new sentence form = new spec entry, no parser change
- out-of-vocabulary input is rejected, not coerced
  - vocabulary is the coverage boundary
well-definedness as proof obligations
- 1/x needs x != 0, sqrt x needs x >= 0, log x needs x > 0
- guards flow asymmetrically through connectives: in `a ∧ b`, a is usable when checking b
- Verus analogue (inference): `requires` clauses and branch-local `assert`
cost-bounded rule solving
- backward and forward rule databases indexed by discrimination trees
- rules fire by fee under a global budget, so cheap reliable rules go first and termination is guaranteed
- budget exhaustion returns a localized unclosed goal
- rules are added in spec files, not elaborator code
canonical normalization + target-neutral IR
- sparse emission: one private Lean lemma per step; dense: one tactic block
- cost: only 32/244 problems emitted nontrivial Lean
  - sparse blowup median ~250x, max ~24,800x (6-line CNL became 148,889 Lean lines)
evidence
- 222/244 (91%) miniF2F-valid with one Claude coding agent
  - rules were added during evaluation, so this is co-development coverage, not held-out
  - IMO 7/20 (35%), AIME 13/15, AMC 42/45, algebra 86/88
  - the 22 failures: missing AM-GM, limits, finite-field types, trig identities, one regression
trust
- Visored implementation, spec files, rule databases, UVL formatter, supporting Lean library are trusted until checked by the Lean kernel
- no machine-checked proof of Visored itself
