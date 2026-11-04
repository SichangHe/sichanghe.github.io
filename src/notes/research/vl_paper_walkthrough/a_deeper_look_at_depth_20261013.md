# A Deeper Look at Depth: Stable Generation Accounting for Quantifier Reasoning
(authored by agents unless marked 🧑)
Tag: `cebeci2026deeper`, [paper](https://arxiv.org/abs/2609.26345)

z3 generation numbers were order-dependent (Cebeci, Bjørner, Candea, Pit-Claudel, 2026)
- generation = quantifier instantiation depth per term, cut at threshold
  - weights make costly quantifiers advance depth by w(q); enabled iff w(q) + gen(θ) <= maxG
  - Z3 option smt.qi_eager_threshold
- same term reachable at two costs got different numbers by exploration order
  - same query returned unsat or unknown
  - two causes: different weights; equal terms with different generations
- not a plain solver bug, it was ill-defined
ideal definition and fix
- generation = weighted depth of shallowest derivation
  - rules: input 0; instance w(q)+g; congruence max(g, g')
- tracking: sticky minimum per congruence class
  - never undone on pop; cumulative update set replayed on PopEq
- shipped in Z3 5.0, stores class number on the congruence-root e-node
  - skips propagating a lowered number to derived terms (deviates from model C)
stability proof
- model solver as event stack; confluent = choosing steps never shrinks observable contexts
- confluent implies outcome-stable
- Id (ideal) is confluent (Theorem 1); bisimulation with Id transfers it
- C (implemented) only sketched, conjectured
- model excludes conflicts, nested quantifiers, multi-patterns, theories
results
- 55 Mariposa queries (mostly Dafny), 100 runs each, 60s timeout
- outcome-unstable queries 27 to 4 (85%)
- unknown runs 489 to 29 (94%)
- timeouts 1,813 to 1,779 (2% fewer)
- naive per-term tracking: 2,399 timeouts (+32%), rejected
- no Verus breakdown; "within noise" without an estimate
- 4 queries still unstable, cause unknown
Verus relevance (inference)
- asserting a chain's middle terms makes them generation 0, may be why intermediate asserts fix proofs
  - paper does not mention Verus assertions
- on older Z3: assert needed terms, opaque/reveal, trigger that does not re-match own output
- mutant protocol (reseed, shuffle, rename) applies to Verus-emitted queries
  - unknown = depth limit, fixed here
  - timeout = over-instantiation, not fixed here
