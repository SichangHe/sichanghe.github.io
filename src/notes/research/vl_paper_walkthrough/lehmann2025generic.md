# Generic Refinement Types
(authored by agents unless marked 🧑)
Tag: `lehmann2025generic`, [paper](https://doi.org/10.1145/3704885)

generic refinement types (GRT) parameterize contracts by predicates, keeping SMT-decidable checking
- implemented in Flux (Rust refinement checker); core calculus λG translated to FσH
- case studies: vector bounds, Diesel ORM access control
  - 7 vector benchmarks, 12-162 lines, 0-14 spec lines, 0.14-0.51s
  - 4 RDiesel apps, 176-271 lines, 25-50 spec lines, 0.51-0.92s
  - trusted: std::vec spec 65 LOC, RDiesel lib 434 LOC; times are client verification only
horn generics: predicate params solved by constrained Horn clauses
- must occur positively (no negation/disjunction)
- MultiIdx: multiple &mut borrows from a vec while tracking available indices
  - get requires av(idx), ensures av(i) && i != idx afterwards
  - Flux infers the loop invariant "all indices excluding i to j are available"
  - soundness: wrapper prevents ops like push that invalidate borrows; unsafe inside, refined safe interface
- Verus (inference): ghost Set<usize> or spec fn, explicit loop invariant, prove disjointness before two &mut
  - Verus infers no predicate params; &strg is Flux-specific
hindley generics: predicates allowed negatively if in value-dependent position
- call-site syntactic unification fixes the predicate, so no higher-order quantifiers reach SMT
- query API: Field has projection, Query has invariant; eq/lt/gt apply projection; and/or/not compose
  - run returns only rows satisfying the query predicate
- well-formedness keeps SMT first-order; arbitrary higher-order predicates unsupported
  - e.g. max abstracting a predicate over its inputs is ill-formed
- Verus (inference): ghost spec fn eval(q, row), explicit predicate args, lemmas for and/or/not
associated refinements for traits
- trait declares predicate (in_bounds); each impl defines it (Vec: idx < len)
  - generic wrapper must carry the predicate, else it bypasses the bounds check
- refines std Vec directly, no RVec migration
- coverage partial: pop_if unsupported, dedup length not specifiable
- Verus (inference): trait spec fn plus per-impl lemma; syntax differs from Flux reft
trait-to-dictionary translation reduces associated refinements to hindley generics
- trait becomes struct, impl becomes instance, bound becomes explicit parameter
- Verus (inference): ghost dictionary param; keep ghost dispatch separate from runtime dispatch
RDiesel access control
- eval(e, r) refinement on every expression, composed structurally
- select_where returns rows satisfying Q::eval
- update_where requires forall row. eval(qry, row) => allow_update(user, row)
- insert_row requires allow_insert(user, row)
- omitting the owner conjunct makes Flux reject the code
- Verus (inference): recursive spec fn eval over query enum
  - proves policy for the modeled AST only; the DB engine boundary stays trusted
