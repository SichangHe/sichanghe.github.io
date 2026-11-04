# Preguss: It Analyzes, It Specifies, It Verifies
(authored by agents unless marked 🧑)
Tag: `wang2025preguss`, [paper](https://arxiv.org/abs/2508.14532)

preguss: position paper, static analysis + LLM spec synthesis for runtime-error (RTE) freedom in large C/C++
- no implementation evaluated, no measurements, no soundness theorem
  - evaluation deferred to future work
- division: static analysis exposes all RTE assertions, LLM synthesizes interprocedural specs, deductive verifier proves
rte-guided verification units (V-Units)
- abstract interpreter (Frama-C/Eva) emits a guard for every potential UB
- V-Unit = one guard + two-layer slice (host function + callees)
  - avoids sending the whole program to the LLM
- call-site precondition checks start as `true`, updated during spec synthesis
- queue in call-graph post-order, leaves first
- unit unverified after iteration budget: high-risk RTE alert
  - not proof of a real bug
two-stage verifier-in-the-loop contract synthesis
- 1: LLM infers host precondition + auxiliary specs (loop contracts) by backward reasoning from the guard
- 2: only if guard depends on a callee result, LLM infers callee postconditions
  - callee preconditions forbidden: over-constrained ones cause spurious alarms
  - example: `id` with `ensures \result == x` proves `one` safe without `requires x != 0`
- generate, verify (Frama-C/Wp), refine from verifier feedback, stop on success or `#iter` exhausted
- host preconditions become checks at caller sites
stated limits
- mutual recursion breaks bottom-up order
- star-shaped call graphs can exceed LLM context
  - suggested fix: slice to statements relevant to the target assertion
- function pointers give incomplete call graphs
- abstract interpretation false positives
- no proof that generated specs match program intent
- turning verifier diagnostics into effective refinement prompts is open
Verus transfer (inference)
- V-Unit = function with narrow `requires`/`ensures` + `proof fn` establishing the guard
- ACSL `requires INT_MIN < x` ~ `requires x > i32::MIN`, with integer semantics and casts modeled explicitly
- a Verus pass only shows code meets the written contract, contract still needs independent review
