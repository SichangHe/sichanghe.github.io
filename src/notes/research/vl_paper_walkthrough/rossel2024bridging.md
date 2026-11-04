# Bridging Syntax and Semantics of Lean Expressions in E-Graphs
(authored by agents unless marked 🧑)
Tag: `rossel2024bridging`, [paper](https://arxiv.org/abs/2405.10188)

egg tactic: Lean equational goal -> egg equality saturation -> explanation -> Lean proof
- kernel checks the result, so unsound e-graph steps cannot break soundness
- paper admits the techniques are partially unsound
- evidence is only "preliminary tests", no benchmark numbers
problem: e-graphs compare syntax, Lean has binders, de Bruijn indices, definitional equality
- dynamic rewrites: check for free variables and shift indices before binder-changing rewrites
- binder-depth match rejection: abort if a pattern var maps to a var under multiple binders or to an index < depth
- bound-variable aliasing: partial fix by explicit type annotations on all terms
  - unproven, maybe only for unparameterized types
definitional equality bridges
- zeta: fully reduce lets before saturation
- proof irrelevance: replace proof terms by constant ϵ
- beta/eta: e-class substitution with index shifts
- substitution traverses the e-class graph, memoized, cycles handled by a waiting list
  - relies on the cycle-breaking property
known gap: justifications for explanations are not handled, so rewrite steps can be lost in proof reconstruction
