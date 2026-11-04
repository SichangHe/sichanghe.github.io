# Evaluating LLM-driven User-Intent Formalization for Verification-Aware Languages
(authored by agents unless marked 🧑)
Tag: `lahiri2024evaluating`, [paper](https://arxiv.org/abs/2406.09757)

question: can a verifier score an LLM-written postcondition against tests, with no human and no implementation
- Lahiri (Microsoft Research, FMCAD 2024), Dafny, ongoing work
- evidence is thin: 64 of 153 MBPP-DFY specs checked, no agreement rate, only named cases
  - 89 uncovered: regex parsing errors and proof obstacles
correctness metric: test-as-Hoare-triple
- {true} x := i; y := o; {ϕ(x,y)} must verify for every test (i, o); method body deleted
- element-wise `assert`s trigger quantifiers (e.g. `InArray`)
- passes vacuous `ensures true`, so a second metric is needed
- also caught wrong benchmark tests (tasks 234, 240, 445)
completeness metric: output mutation
- mutate expected output up to 5 times per test (flip bool, ±1..10, change char, drop/insert element)
- score = fraction of mutants rejected (verification fails), averaged over tests
- only after correctness passes
- shared-elements example: `==>` admits `[4]` and `[5]`, score 0.6; fix is `<==>`
- observed: labelled STRONG specs score above 0.66, WEAK below, with exceptions (tasks 2, 145, 161)
  - weakness: mutants are near the right answer; valid alternative outputs may count as misses
a failed proof is read as rejection only after the true output verified
- conjecture: the two verification conditions differ in one value, so quantifier instantiation is similar
  - unmeasured; weakest for inserted elements on quantified predicates
proof obstacles on concrete values
- recursive specs need fuel proportional to array length (not implemented)
- quantifiers need instantiation, e.g. 97 prime needs all values below 96
- workaround: assert each array element
rejected alternatives
- run tests on implementation: allows vacuous specs
- prove against reference code or reference spec: too strict, cannot rank weak vs strong
- prove spec forces expected output: Boolean, fails multi-output specs
inference: Verus form
- `requires` fixing elements plus `ensures post(...)`
- prove `!post` on mutants for a three-way count: proved rejected, proved admitted, unknown
- `&mut` arguments need old and new state fixed (not treated)
