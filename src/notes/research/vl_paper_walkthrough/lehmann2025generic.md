# Generic Refinement Types
(authored by agents unless marked 🧑)
Tag: `lehmann2025generic`, [paper](https://doi.org/10.1145/3704885)

## central technique
Generic Refinement Types (GRT) parameterize contracts by predicates while preserving automatic SMT checking. The paper's abstract describes “a way to write modular higher-order specifications that abstract invariants over function contracts, while preserving automatic SMT-decidable verification” (abstract, p. 49:1). It introduces Horn generics, Hindley generics, and associated generic refinements for Rust traits. Instantiation is algorithmic: Horn parameters use constrained Horn clauses; Hindley parameters use syntactic unification in value-dependent positions. The authors formalize a core calculus λG, translate it to the polymorphic contract calculus FσH, and implement it in Flux; the introduction says the implemented "core functional model" "focuses on Hindley parameters" (Section 1, p. 49:3).

The practical case studies are vector bounds and Diesel ORM access control. Figure 13 reports 7 vector benchmarks of 12 to 162 lines, 0–14 specification lines, and 0.14–0.51 seconds; 4 RDiesel applications of 176–271 lines, 25–50 specification lines, and 0.51–0.92 seconds (Section 6, Fig. 13, p. 49:22). The trusted std::vec specification (65 LOC) and RDiesel library (434 LOC) have no time; the caption says "trusted code does not have time". Inference: these are verifier times for client code, not end-to-end application costs.

## technique 1: Horn generic refinements for stateful APIs

What it is. A Horn generic is a predicate parameter instantiated by Horn constraint solving. It must occur positively, under conjunctions. The paper uses `MultiIdx` to expose multiple mutable borrows from a vector while tracking available indices. Its type is `MultiIdx<'a, T>[hrn available: int -> bool]`; `new` initializes availability to `|i| 0 <= i && i < vec.len`; `get` requires `av(idx)` and ensures `Self[|i| av(i) && i != idx]` after the borrow (Fig. 2, p. 49:5).

When and how. Use this when an API owns or temporarily wraps state and each operation narrows a predicate describing what remains valid. (1) Add a generic predicate to the state type. (2) Define the constructor with the initial invariant. (3) Require the predicate at each operation's input. (4) Ensure the post-state predicate removes the affected resource. (5) Let the checker infer the predicate at loops and calls. In the particle simulator (Fig. 1), "Flux infers that the inner loop has the invariant that all the indices excluding those from i to j are available", which verifies the inner `get(j)` (Section 2.1, pp. 49:4–5).

Verus form (Inference). Represent the state predicate with a ghost `Set<usize>` or a `spec fn available`. Put the membership requirement in `requires`, and the removal relation in `ensures`. Carry the set relation in a loop `invariant`; prove disjointness before taking two `&mut` borrows. Verus does not infer arbitrary predicate parameters as Flux does, so write the loop invariant and lemmas explicitly. The paper's `&strg` is Flux-specific and does not carry over.

Evidence and limits. The paper states: "Implementing this API requires internal use of unsafe code, but we can encapsulate it under a (refined) safe interface"; soundness rests on `MultiIdx` preventing operations "that can modify the underlying storage to invalidate outstanding borrows (e.g., by calling push)" (Section 2.1, p. 49:4). Positive-only Horn parameters cannot appear under disjunction or negation, which motivates Hindley generics (Section 2.2, p. 49:5).

## technique 2: Hindley generics and syntactic unification

What it is. A Hindley generic can occur negatively, under disjunction or negation, when it appears in a value-dependent position. At a call site, syntactic unification determines the function-valued predicate, so no higher-order quantifiers reach the SMT solver. The paper states that Hindley generic arguments can appear negatively "as long as they appear in a value-dependent position" (Section 2.2, p. 49:5).

How to apply it to query semantics. (1) Add a generic projection to `Field<R,V>`, such as `proj: R -> V`. (2) Give each generated field a concrete projection, e.g. `|r| r.price`. (3) Add an invariant generic to `Query<R>`. (4) Define `eq`, `lt`, and `gt` so their result predicate applies the field projection. (5) Define `and`, `or`, and `not` by composing subquery predicates, including negative occurrences. (6) Make `run` return only rows satisfying the query predicate. In Fig. 5, `item_owner.eq(owner)` gets `|i| i.owner == owner`, `item_price.lt(cost)` gets `|i| i.price < cost`, and `and` combines them; the loop assertion `item.price < cost` then follows (Section 2.2, pp. 49:6–7).

Verus form (Inference). Define a ghost query predicate `spec fn eval(q, row) -> bool` and represent query combinators as datatypes carrying proof-relevant predicates. Contracts on `run` can ensure every returned element satisfies `eval`. Since Verus does not infer higher-order ghost arguments this way, provide explicit predicate arguments and lemmas for `and`, `or`, and `not`; use `requires`/`ensures` on executable wrappers.

Evidence and limits. The system keeps SMT queries first-order and decidable by well-formedness invariants: refinement variables "are either base-sorted, or are functions that take base-sorted inputs", and refinement abstractions "are only used as generic arguments where they can be eliminated as part of constraint generation" (Section 3.2, p. 49:12). A Hindley generic not used in a generic application in input position is ill-formed, e.g. a `max` that abstracts a predicate `p` over its inputs (Section 3.2, Example 2, p. 49:15). Inference: arbitrary higher-order predicates remain outside the supported fragment.

## technique 3: associated generic refinements for traits

What it is. A trait can declare an associated predicate whose concrete definition is supplied by each implementation. For safe indexing, the trait declares `reft in_bounds(v: Self, idx: Idx) -> bool` and requires it in `index`; `Vec<T>` instantiates it as `idx < v.len` (Fig. 6, p. 49:9). This prevents a generic wrapper from bypassing an implementation's safety precondition.

How to apply it. (1) Declare the associated refinement at the trait level over generic `Self` and index types. (2) Use it in the trait method's precondition. (3) Define the concrete predicate in every implementation. (4) Let rustc's trait normalization instantiate the predicate at each call site. (5) Require generic wrappers to carry the trait predicate in their own preconditions. If only the `Vec` impl's `index` were refined, the wrapper `get` "would typecheck" and bypass the bounds check (Section 2.3, p. 49:8); with the associated generic, the uncorrected `get` does not typecheck, and the corrected wrapper takes `i: usize{ C::in_bounds(c, i) }` (Section 2.3, p. 49:9).

Verus form (Inference). Put a trait method contract on an ordinary Rust trait and define an associated proof relation, for example a `spec fn` taking `&Self` and an index. Each implementation supplies a lemma proving the relation implies its bounds. Generic wrappers require the relation explicitly. Verus trait specification syntax differs from Flux's `reft`; the invariant must be expressed with constructs documented for Verus.

Evidence and limits. The vector case refines the standard `Vec` rather than requiring a replacement `RVec`, avoiding a source-wide migration (Section 6.1, p. 49:21). Coverage is partial: the benchmarks use `new`, `push`, `pop`, `len`, `index`, and `index_mut`; `pop_if` is "not currently supported", and for `dedup` "we cannot specify the exact length of a vector after a call" (Section 6.1, p. 49:22).

## technique 4: translate traits to dictionaries

The paper shows that associated generics reduce to Hindley generics through the classic typeclass-as-dictionary translation. (1) Translate a trait to a struct whose associated types become type parameters, methods become function-valued fields, and associated refinements become a Hindley generic of the struct. (2) Translate each implementation to an instance containing its concrete refinement. (3) Translate a trait-bound function to one with an explicit trait-struct parameter. (4) Pass the implementation instance at each call site (Section 2.4, pp. 49:9–10). The paper says this shows Hindley generics provide "a solid foundation" for associated generics (Section 2.4, p. 49:9). Inference: it also gives a route to implement associated refinements in a language with ordinary higher-order ghost parameters.

Verus form (Inference). Encode the dictionary as a ghost trait object or a generic specification parameter with a method contract. Prove the concrete implementation's predicate once, then pass its relation to generic functions. Executable dynamic dispatch and ghost specification dispatch must remain separated; Verus proof functions cannot be called at runtime.

## technique 5: refined Diesel access control

RDiesel attaches an associated `eval(e, r)` refinement to every Diesel expression. Program values evaluate to themselves; fields evaluate to row projections; `Add`, `Gt`, `Eq`, and `And` compose the subexpression evaluations (Section 6.2.2, p. 49:24). `select_where` returns rows refined by `Q::eval(qry, r)`. `update_where` requires `forall row. Q::eval(qry, row) => F::allow_update(cx.user, row)`; `insert_row` requires `R::allow_insert(cx.user, row)` (Section 6.2.3, pp. 49:24–25).

How to apply it. (1) Define typed expression traits so only well-typed query compositions have `Expr` implementations (Section 6.2.1, p. 49:23). (2) Add an associated evaluation refinement to the expression trait. (3) Instantiate it for fields and program values. (4) Compose it structurally for every query constructor. (5) Make read methods return rows satisfying the refinement. (6) Add field and row policy refinements to update and insert preconditions. In Fig. 14, "if the code omitted the lines 8 and 9 then Flux would reject the code", i.e. without the owner conjunct (Section 6.2.3, p. 49:26).

Verus form (Inference). Define a recursive ghost `spec fn eval` over a query enum and policy predicates over rows and users. Give `select_where` an `ensures` relation for each returned row, and require policy implications on update/insert. Prove each query constructor's evaluation lemma by structural induction. This can establish policy preservation for the modeled query AST; it does not prove the database engine obeys the AST unless that boundary is separately trusted.

## techniques for the catalog
- Horn generic refinements: parameterize state invariants with positive predicates inferred by Horn constraints
- Hindley generic refinements: instantiate value-dependent predicates by syntactic unification, including negative occurrences
- associated trait refinements: define implementation-specific safety predicates at a generic trait boundary
- trait-to-dictionary translation: reduce associated predicates to explicit ghost function parameters
- refined query and policy APIs: compose query semantics and enforce row/field access policies in contracts
