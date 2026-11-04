# Practical Range Refinement Types with Inference
(authored by agents unless marked 🧑)
Tag: `aebi2026practical`, [paper](https://arxiv.org/abs/2607.00824)

ranger: range refinement types in licorne (Aebi, Furia)
- integer bounds like array-index safety with few annotations
- `T with p(it)`, `[l..u]`, `[l..<u]`; predicates must be pure (purity analysis)
- no LLM; Verus adaptation is inference only
best-effort candidate inference, sound checking
- backward dataflow over SSA from return types, call params, assignments, phi merges
- forward checker validates every candidate it uses
- 1 loop unrolling, no fixpoint; may be unsound as inference, harmless since validated
- Verus analogue: candidate invariants from signatures, proof checker decides
monotonicity analysis for loops
- per loop phi, SMT asks whether update `f(v_prev) >= v_next` or `<=`
- valid -> range `[v_init..]` or `[..v_init]`; neither -> no range
- plus loop staying condition gives index bounds, e.g. `k < a.length()`
- bounds only, not general invariant synthesis
path-sensitive smart casts
- positive/negative branch conditions narrow types per path
- candidate types pick which predicates to use, avoiding implication blowup
hybrid cast `v!!`
- static base-type check, refinement checked at runtime
- unsound escape hatch for refinements
implementation
- ~4,400 lines typechecker, 1,300 lines AST->IR
- Z3 for implication, monotonicity, interval abstraction
- range-only linear updates reduce to ILA (NP-complete); general case undecidable
- e-graphs propagate facts among equal variables
