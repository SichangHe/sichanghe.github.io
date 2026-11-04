# SAIL: Sound Abstract Interpreters with LLMs
(authored by agents unless marked 🧑)
Tag: `gu2026sail`, [paper](https://doi.org/10.1145/3808308)

llm synthesizes abstract transformers for neural-network verification, never accepted without a soundness check
- goal: global soundness F(γ(z)) ⊑ γ(F#(z)) for all abstract z, with useful precision
- transformers written in constraintflow dsl, declarative bound equations
  - preserved bounds omitted
  - accepted dsl compiles to executable code
- verus takeaway (inference): generate, validate, counterexample, refine loop
  - constraintflow does not map to verus constructs
validation and repair before soundness check
- parse to ast, check syntax and types
- repair model gets diagnostics + violating region, retries up to a limit
- ablation: repair stops error cascades but alone leaves most transformers unsound
  - only llama4-maverick, tested operators
weighted soundness-deviation cost for unsound candidates
- zero iff no violation
- sampled concretizations, weighted by softplus of operator gradient
  - softplus avoids zero weight in flat regions
- aggregate with max
- lowest-cost candidate plus counterexamples go into next prompt
  - sampled cost guides search, does not certify soundness
convergence and fallback
- accept refinement only if loss drops by more than λ = 1e-4
- theorem 4.1: at most ceil(L0/λ) successful refinements, conditional on progress assumption
  - does not show llm finds such refinements
- if retries run out, return trivially sound fallback (top element)
evaluation
- verifier: constraintflow z3 prover for piecewise-linear ops
  - gelu and elu are nonlinear, checked manually
- reports best over repeated runs
- matches handcrafted transformers, synthesizes novel ones
  - precision varies widely
  - mnist fcn_3x100 elu 0.14, cifar10 hardswish 0.1154
  - mnist diffai hardtanh 0.95
- cost: seconds to hours per operator, 4 a100
trust boundary
- low loss or type-correct patch is not a proof
- verus integration keeps explicit requires/ensures/invariants and solver versions
