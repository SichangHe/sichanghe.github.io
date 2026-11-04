# Neurosymbolic Auditing of Natural-Language Software Requirements
(authored by agents unless marked 🧑)
Tag: `hall2026neurosymbolic`, [paper](https://arxiv.org/abs/2605.13817)

VERIMED: LLM + Z3 pipeline auditing natural-language medical-device requirements
- all requirements autoformalized into one shared typed model
  - `ρi(x) = pi(x) ⇒ qi(x)` over Boolean and linear-real variables, plus domain constraints `C(x)`
- results audit the formal model, not whether the requirements are right
  - same caveat applies to agent-written Verus contracts
4 SMT audit queries on `M = C ∧ ρ1 ∧ … ∧ ρn`
- consistency: `M` satisfiable, else unsat core
- vacuity: `C ∧ pi` unsat means trigger never occurs
- violatability: `C ∧ pi ∧ ¬qi` sat gives violating assignment
- redundancy: rest of requirements entails `ρi`
  - a review signal, not a verdict
- 64 hemodialysis requirements: 2 redundant, 39/39 conditionals non-vacuous, 64/64 violatable
ambiguity via bidirectional equivalence
- sample N=5 formalizations, check `ρa ∧ ¬ρb` and `ρb ∧ ¬ρa`
  - sat gives a witness state one reading allows and the other rejects
- feed witnesses to LLM to rewrite wording, resample until stable
- 12/64 ambiguity-sensitive, all converged
- agreement means sampling stability, not unique meaning
counterexample-guided repair
- check `M ∧ s ∧ ¬a` for scenario `s`, answer `a`; sat gives counterexample plus violated requirements
- 65 questions, up to 5 repair iterations, final accuracy
  - no feedback 55.4%
  - self-repair 58.5%
  - violated requirements only 80.0%
  - requirements + Z3 witness 98.5%
- first-attempt accuracy only 46.2-53.8% across modes
- concrete witness is the key ingredient
  - Verus analog: feed failed proof state and concrete values back to generator, with fixed repair bound
round-trip and mutation checks
- translate SMT back to text, re-formalize, compare bidirectionally
  - 64/64 pass; 144-requirement PCA spec 135/144 initially, 144/144 after one repair
- 256 injected mutations, 249/256 detected (97.3%)
  - one value-mismatch mutant indistinguishable under the schema
- mutants stayed globally satisfiable, so detection comes from semantic comparison, not consistency
trusted base
- Z3, canonical schema, LLM translations, requirement reviewers
- Claude Sonnet 4.6 generates SMT, syntactic retries capped at 5
