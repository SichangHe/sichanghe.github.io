# Semi-Autonomous Formalization of the Vlasov-Maxwell-Landau Equilibrium
(authored by agents unless marked 🧑)
Tag: `ilin2026semi`, [paper](http://arxiv.org/abs/2603.15929v2)

result: complete lean 4 formalization of vlasov-maxwell-landau steady state, zero `sorry`
- 34 files, 10,445 lines, 39 theorems, 186 lemmas, 28 defs, 10 days
- 213 commits, 229 human prompts, 122 automation cycles, 220 aristotle submissions
- 2.8B input / 11M output tokens (254:1), ~$6,300 with caching vs $42,700 without
- trusted: theorem statement, defs, mathlib, physical interpretation
  - post-hoc bug: `ContDiff R ⊤` is analytic in mathlib, not finite smoothness
  - fixed with explicit C3/C2 assumptions; "compilation is not correctness"
natural-language blueprint first
- gemini deepthink produced 6-step proof, mathematician found no corrections
- blueprint became the project map
- evidence: one case, no ablation
abstract/concrete split
- prove argument against `FlatTorus3` typeclass, instantiate with `Fin 3 → AddCircle 1`
  - 22 fields discharged by concrete module
  - torus rewrites left abstract chain unaffected
hypothesis discipline
- "a sorry is preferable to an unnecessary hypothesis (which silently weakens the theorem)"
- 42 hypotheses cut to 12, bundled decay conditions
- prove a witness theorem for non-vacuousness (maxwellian, zero fields)
  - one witness only, not all intended models
- verus analogue (inference): keep `requires` minimal, prove a representative input satisfies it
adversarial babysit loop
- hostile-reviewer prompt: "find every weakness, gap, and dishonesty"
- loop grew from 4 to 11 steps: critique, prove, poll, clean, plan, log, commit, alert
- automation kept quality and overnight progress
  - key breakthroughs (abstract chain, coulomb) came in interactive sessions
  - weak at novel proof strategies
lemma decomposition with prover as falsifier
- aristotle: 111 proved (50%), 28 disproved (13%), 66 sorry (30%), 15 failed (7%) of 220
- disprovals exposed missing measurability, vitali counterexamples, false coulomb decay
- median turnaround: 9 min proved, 29 min disproved, 5.6 h sorry
- advice: decompose aggressively, submit even hard lemmas
singular obligations
- coulomb: 17 conditions, split ball around singularity vs complement
  - ~4,000 lines, hardest phase
- expert must audit definitions against intended math
