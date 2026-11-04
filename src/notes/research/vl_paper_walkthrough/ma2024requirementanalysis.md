# Towards Practical Requirement Analysis and Verification: A Case Study on Software IP Components in Aerospace Embedded Systems
(authored by agents unless marked 🧑)
Tag: `ma2024requirementanalysis`, [paper](https://arxiv.org/abs/2404.00795)

case study: 5 aerospace c components (CAST), IMP |= FM |= KL
- goal: nl requirements to ltl, verify with cbmc, cpachecker, trace+klee
- sizes small (50-140 loc + harness); case study, not benchmark
requirement mining in 3 steps
- filter temporal descriptions (llm classifier; no config or score reported)
- standardize to code-level names, no math in prose, TRUE/FALSE returns
- translate to ltl (X, U, G, F)
  - example: `G(reLen != 19 -> F(cntLenRd' = cntLenRd+1 && totalLenRd' = totalLenRd+1 && reVal = FALSE))`
- no translation-accuracy measurement; time constraints need explicit time model
assume/assert harness
- main inits inputs, `__ASSUME` preconditions, calls ip, `__ASSERT` postconditions; macros map to each tool
- one harness per distinct precondition set; inspect union for coverage
- overly strong assume hides buggy executions
- functional properties still needed manual input
results
- safety: all three tools pass on 3 components; overflows in Fg333sa* confirmed manually as potential defects
- pre/post: cbmc 20/30, cpachecker 18/30; trace+klee 17/20 temporal
  - failures from multiple loops, floats, quantifiers
- trace verification samples executions: not exhaustive
trust gap
- tools check supplied properties, not whether llm/hand translation preserves intent
- silently dropped precondition or wrong state field would still verify
verus transfer (inference)
- harness = proof fn with requires/ensures; temporal needs explicit state machine, history var, loop invariant
- IMP |= FM |= KL is a product requirement, not shown achieved
