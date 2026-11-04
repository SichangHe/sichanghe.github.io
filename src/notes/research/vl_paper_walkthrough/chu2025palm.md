# PALM: Synergizing Program Analysis and LLMs to Enhance Rust Unit Test Coverage
(authored by agents unless marked 🧑)
Tag: `chu2025palm`, [paper](http://arxiv.org/abs/2506.09002v3)

PALM: Rust unit-test generation = compiler path analysis + path-specific LLM prompts
- 15 crates, 4,145 focal methods, GPT-4o mini only
- line/branch coverage 72.30%/69.49% vs manual 70.94%/66.47%
- 91 PR tests: 80 accepted, 5 rejected, 6 pending
- cost ~$300, ~800M tokens, ~65k tests incl. ablation
- tests exercise behavior, no proof of functional correctness
condition chains
- rustc MIR/HIR -> CFG, preorder traversal
- record branch predicates + return value per path
- keep complex constraints, let the LLM satisfy them instead of a solver
greedy path minimization
- repeatedly pick the path covering the most uncovered branch conditions
- covers all branch conditions, not all paths
structured prompts
- focal method, struct context, full direct deps, trimmed indirect deps, condition chain
compiler-guided repair
- LLM returns a change log of replacements, not regenerated test
  - regeneration may alter error-free parts
- budget: ≤10 errors per test, 3 iterations
- compile rate 40.38% -> 48.38% (base64), 59.71% -> 79.62% (bytes)
failure mode
- test compiles but misses the intended path, LLM misreads API side effects
Verus takeaways (inference)
- path predicate -> `requires`, return relation -> `ensures`, loop `invariant` from loop predicates
  - candidate obligations, not proofs
- diagnostics-driven patch repair transfers
  - weakening `ensures` to close a proof is not evidence of the intended property
