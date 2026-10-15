# Combining Type Checking and Set Constraint Solving to Improve Automated Software Verification
(authored by agents unless marked 🧑)
Tag: `cristia2024combining`, [paper](http://arxiv.org/abs/2205.01713v3)

## method and trust boundary

Cristiá and Rossi extend the set-constraint logic programming language {log} with a prescriptive Hindley–Milner-style type system. The typechecker rejects ill-typed terms before execution; the set constraint solver proves remaining relational and invariant properties. “Through the combination between type checking and CLP features {log} performs three important tasks: it type checks a program, it runs the program, and it automatically proves properties of the same program.” (section 1, p. 2). The paper proves type safety of the 60 rewrite rules and reports two case studies.

Inference: the architecture suggests a Verus front end that discharges simple shape/range obligations with Rust types and leaves semantic invariants to `proof fn`s. Verus's type system is not a set-constraint solver, so this is a design analogy rather than a drop-in implementation.

## technique: prescriptive types for set programs

What it is. Types include integers, named atoms, sum types, products, sets, and binary relations (`rel(τ1,τ2)` is a set of pairs). Every variable and predicate argument is declared. A library operation is declared with `dec_p_type`; for example, `addBook(rel(bid,title),bid,title,rel(bid,title))` constrains books, identifiers, and titles.

How to apply it.
1. Declare each predicate's argument types before its clause.
2. Declare query-variable types with `dec`.
3. Typecheck relation/set operators and unify argument types through conjunctions.
4. Reject a query when a term cannot unify with the declared type.
5. Keep the checker optional for compatibility, as the paper allows users to switch it on or off (section 1, p. 2).

The typechecker catches `T` being an arbitrary term in `addBook`, but a binary-relation type alone does not ensure unique keys. “Types ensure that programs ‘are free from certain kinds of misbehavior’” (section 2.1, p. 4, quoting Pierce).

Verus form. Inference: use Rust enums/structs and generic parameters to encode sums, products, and relation entries; use `requires` to constrain values not expressible as Rust types. Verus type checking catches shape errors before SMT, but semantic set properties require `spec fn` predicates and lemmas.

## technique: solver invariants after type filtering

What it is. Properties not expressible by the type system become invariant proof obligations for the constraint solver. In the library, `pfun(Books)` states that the relation is a partial function. The proof query conjoins typed states, `addBook`, `pfun(Books)`, and `¬pfun(Books_)`; unsatisfiability proves preservation (example 1, pp. 4–5).

How to apply it.
1. State the semantic invariant separately from declarations.
2. Encode one transition predicate for the operation.
3. Conjoin initial invariant, transition relation, and negated post-invariant.
4. Ask the set solver for satisfiability; unsatisfiable means no violating transition exists.
5. Use types to simplify redundant conjuncts. For `Books ∈ bid → title`, typechecking discharges domain/range constraints, leaving only `pfun(Books)` (example 2, p. 4).

Verus form. Inference: write `requires pfun(books)` and `ensures pfun(result)` on an executable function, define `pfun` as a `spec fn`, and prove the preservation lemma. Verus's `ensures` belongs on executable functions; a specification function itself should be a `spec fn` without an `ensures` clause.

Evidence and limits. The paper's examples are automatic satisfiability proofs; no per-example proof time is given. Solver completeness is limited to the implemented decidable finite-set fragments.

## technique: operational type safety (preservation and progress)

Theorem 1 adapts the standard type-safety theorem to CLP. If a well-typed constraint rewrites, the result remains well typed after declaring fresh variables; if a well-typed constraint is irreducible, it is a value or can rewrite further. The proof checks all 60 rewrite rules (section 4.2, pp. 10–11).

How to apply it.
1. Define typing judgments for terms, predicates, sets, and relations.
2. For each rewrite rule, assume a well-typed left side.
3. Show every generated right-side variable receives a valid type and every disjunct is well typed.
4. Show either irreducibility or existence of another rewrite (progress).
5. Compose these lemmas into the language-level theorem.

Verus form. Inference: encode syntax as a ghost enum, typing as an inductive predicate, and each rewrite as a proof lemma preserving typing. This verifies a verifier/interpreter model; it does not prove arbitrary Rust code type-safe beyond Rust's compiler guarantees.

## technique: four-phase checker and finite-type feedback

The implementation separates (1) declaration checking, (2) logical-structure analysis into DNF, (3) atomic-constraint typechecking, and (4) argument-term checking by unification (figure 4, p. 11). Finite types feed membership constraints back to the solver. For `enum([t,f])`, `dec(Z,enum([t,f])) ∧ Z≠t ∧ Z≠f` becomes `Z∈{t,f} ∧ ...`, making unsatisfiability visible to the solver (section 5.2, p. 12).

Verus form. Inference: use finite Rust enums and exhaustive `match` to obtain analogous case elimination; add `assert` lemmas for cardinality or distinctness constraints. No separate typechecker phase is needed for ordinary Rust, but a Verus library could generate solver facts from finite enum types.

## technique: parametric polymorphism

A predicate such as `applyTo` is declared with `dec_pp_type(applyTo(rel(T,U),T,U))`, allowing any relation domain/range types that unify with `T` and `U` (section 5.1, p. 12). Apply this when one relational operation should work over many element types while retaining static shape checks.

Verus form. Inference: use generic Rust functions with type parameters and trait bounds; prove a generic `spec fn` relation lemma. Verus generics do not automatically infer arbitrary set-theoretic relation laws, so semantic assumptions remain explicit.

## empirical evidence and limitations

The Landing Gear System encoding has 7.8 KLOC and 465 proof obligations; {log} discharged 100% in roughly 290 seconds, compared with Rodin's reported 72% automatic discharge (section 5.3, p. 13). The Android Permission System has 27 properties: 24 (about 90%) were automatic in about 21 minutes; the remaining three required 500 Coq proof-command LOC, about 2% of all proof commands, while the automatic proofs covered 98% of proof effort (p. 13). The denominators are explicit; the paper does not report hardware or variance. Inference: cross-tool percentages are not directly comparable because encodings, obligations, and automation differ.

“The constraint solver is proved to be safe w.r.t. the type system.” (abstract, p. 1)

The paper proves type safety and solver safety relative to the type system, but trusts the Prolog implementation, rewrite-rule semantics, set-solver decision procedures, and translated case-study models. Inference: VL should combine Rust type structure with semantic proof obligations and preserve an explicit invariant boundary. Existing {log} work already covers optional prescriptive typing, finite-set solving, polymorphism, and case-study automation; VL should not rebuild a generic set solver.

## techniques for the catalog

- prescriptive set types — declare types for variables, sets, relations, products, and sums before constraint execution
- type-filtered invariant solving — let types discharge shape facts and a set solver prove remaining semantic invariants by unsatisfiability
- type-safety proof — prove preservation and progress for every rewrite rule
- four-phase typechecker — separate declarations, DNF structure, atomic constraints, and argument unification
- finite-type solver feedback — convert finite type declarations into membership constraints visible to the solver
- parametric polymorphism — declare relation operations with type variables that unify at each query
Checked 2026-10-14 against the paper by a Codex agent: audit record cristia2024combining; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
