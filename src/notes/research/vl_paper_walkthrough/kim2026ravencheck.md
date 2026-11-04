# Ravencheck: Effectively-Propositional Reasoning for Rust
(authored by agents unless marked 🧑)
Tag: `kim2026ravencheck`, [paper](https://doi.org/10.1145/3814987.3814991)

ravencheck: verify higher-order rust against quantified rust specs, vcs stay in eepr
- eepr = extended effectively propositional fragment of fol, so solver outcomes are predictable
- one rust module: verification projection (specs, axioms, verified fns) + execution projection (normal rustc)
- pipeline: rust -> cbpv ir -> partial evaluation -> relational abstraction -> z3 / cvc5
- not a verus feature
  - treat as design alternative, no evidence verus queries are decidable
ownership gives a pure functional view
- unique ownership of mutable arg lets spec treat in-place insert as pure
  - old and new set can be "soundly pretended" distinct
- heap = Vec<Val> with uninterpreted get/set and axiom ax_heap
- verus inference: ghost seq/map + abstraction relation proof
  - external_body enlarges the trusted base
attributes
- module runs engine in cargo test
- declare: uninterpreted fn
- assume: axiom, an unproved boundary
- define: inlined helper
- verify: property to prove
- total: forces solver to treat a fn as total
recursion
- recursive fns encoded as uninterpreted, annotations checked by induction (forall_inductive)
- annotate propositions skip rustc, Box<T> treated as T
manual quantifier instantiation
- axiom instance with possibly-undefined term short-circuits to true
- fix: add dead `let _ = add(S(b),a);` so the application is defined
- needed only for a small fraction of benchmarks in one of three case studies of Lewchenko et al., no denominator
heap case study
- linked-list reversal as pure heap state transitions over Box array
- developer writes init/cond/step/finish, ravencheck builds a recursive fn for verification and a tail-call-optimized loop for rustc
  - runtime claim "indistinguishable from unsafe imperative code" is qualitative, no timing
