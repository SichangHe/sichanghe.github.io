# Combining Type Checking and Set Constraint Solving to Improve Automated Software Verification
(authored by agents unless marked 🧑)
Tag: `cristia2024combining`, [paper](http://arxiv.org/abs/2205.01713v3)

## method and trust boundary

Cristiá and Rossi extend the set-constraint logic programming language {log} with a prescriptive Hindley–Milner-style type system. The typechecker rejects ill-typed terms before execution; the set constraint solver proves remaining relational and invariant properties. “Through the combination between type checking and CLP features {log} performs three important tasks: it type checks a program, it runs the program, and it automatically proves properties of the same program.” (section 1, p. 2). The note states that the type safety theorem holds for the {log} solver's rewrite rules (“about 60”, section 4.1) and reports two case studies. The paper calls itself “rather informal and conceptual” (section 1, p. 2); the proofs are in an on-line document (Cristiá and Rossi 2022) that is not part of this paper.

Inference: the architecture suggests a Verus front end that discharges simple shape/range obligations with Rust types and leaves semantic invariants to `proof fn`s. Verus's type system is not a set-constraint solver, so this is a design analogy rather than a drop-in implementation.

## technique: prescriptive types for set programs

What it is. Types include integers (`int`), basic types `b` (values written `b?atom`), sum types, products (`prod`), sets (`set`), and binary relations (`rel(τ1,τ2)` is shorthand for `set(prod(τ1,τ2))`) (section 3, p. 5–6). Every variable must be declared (no type inference); predicate argument types are declared by `dec_p_type` (sections 2.1 and 6). A library operation is declared with `dec_p_type`; for example, `addBook(rel(bid,title),bid,title,rel(bid,title))` constrains books, identifiers, and titles.

How to apply it.
1. Declare each predicate's argument types before its clause.
2. Declare query-variable types with `dec`.
3. Typecheck each set/relation constraint against its rule (Figure 2) and each argument term against Figure 1; these checks are unification problems (section 5, p. 11).
4. Reject a query when a term cannot unify with the declared type.
5. Keep the checker optional for compatibility, as the paper allows users to switch it on or off (section 1, p. 2).

Without types, `T` in `addBook` can be bound to any term; with the declaration `rel(bid,title)` that is ruled out. A binary-relation type alone does not ensure unique keys, because the declaration “cannot catch the error of putting in Books two ordered pairs sharing the same BID but different titles” (section 2.1, pp. 3–4). The paper cites Pierce: “Types ensure that programs ‘are free from certain kinds of misbehavior’” (section 2.1, p. 3).

Verus form. Inference: use Rust enums/structs and generic parameters to encode sums, products, and relation entries; use `requires` to constrain values not expressible as Rust types. Verus type checking catches shape errors before SMT, but semantic set properties require `spec fn` predicates and lemmas.

## technique: solver invariants after type filtering

What it is. Properties not expressible by the type system become invariant proof obligations for the constraint solver. In the library, `pfun(Books)` states that the relation is a partial function. The proof query conjoins typed states, `addBook`, `pfun(Books)`, and `¬pfun(Books_)`; unsatisfiability proves preservation (example 1, p. 4). The paper says this is known to be automatic because the formula belongs to a decidable fragment implemented in {log} (section 4.1).

How to apply it.
1. State the semantic invariant separately from declarations.
2. Encode one transition predicate for the operation.
3. Conjoin initial invariant, transition relation, and negated post-invariant.
4. Ask the set solver for satisfiability; unsatisfiable means no violating transition exists.
5. Use types to simplify redundant conjuncts. For `Books ∈ bid → title`, typechecking discharges domain/range constraints, leaving only `pfun(Books)` (example 2, p. 4).

Verus form. Inference: write `requires pfun(books)` and `ensures pfun(result)` on an executable function, define `pfun` as a `spec fn`, and prove the preservation lemma. Whether the preservation lemma is better stated as a `proof fn` or on the executable function is a Verus design choice the paper does not address.

Evidence and limits. The paper's examples are automatic satisfiability proofs; no per-example proof time is given. The paper says that if a formula belongs to an undecidable fragment, the rewriting steps “will not terminate” (section 4.1, p. 9).

## technique: operational type safety (preservation and progress)

Theorem 1 adapts Harper's type-safety theorem to CLP. (I) If a well-typed constraint rewrites to Φ, then there are types for the new variables such that the `dec` declarations of those variables conjoined with Φ are well typed. (II) A well-typed constraint is irreducible or rewrites to some Φ (section 4.2, pp. 10–11). The paper says the proof “entails to prove that each of the 60 rewrite rules present in {log} are type safe” (p. 11); the proof itself is in the on-line document, not in this paper.

How to apply it. Inference: the steps below are reconstructed from the theorem statement, not given by the paper.
1. Define typing judgments for terms, predicates, sets, and relations.
2. For each rewrite rule, assume a well-typed left side.
3. Show every generated right-side variable receives a valid type and every disjunct is well typed.
4. Show either irreducibility or existence of another rewrite (progress).
5. Compose these lemmas into the language-level theorem.

Verus form. Inference: encode syntax as a ghost enum, typing as an inductive predicate, and each rewrite as a proof lemma preserving typing. This verifies a verifier/interpreter model; it does not prove arbitrary Rust code type-safe beyond Rust's compiler guarantees.

## technique: four-phase checker and finite-type feedback

The Prolog typechecker (about 1.1 KLOC, 200 of them for error printing, section 5) has four phases: (1) check `dec` constraints, (2) analyze the logical structure of the formula (writing it into DNF), (3) typecheck each atomic constraint using the rules of Figure 2, and (4) typecheck each constraint's argument terms using the rules of Figure 1; phases 3 and 4 are solved as unification problems (figure 4 and section 5, p. 11). Finite types feed membership constraints back to the solver: the solver “retrieves the type information generated by the typechecker transforming it into suitable membership constraints” (section 5.2, p. 12). For `enum([t,f])`, `dec(Z,enum([t,f])) ∧ Z≠t ∧ Z≠f` becomes `Z∈{t,f} ∧ ...`, making unsatisfiability visible to the solver (section 5.2, p. 12).

Verus form. Inference: use finite Rust enums and exhaustive `match` to obtain analogous case elimination; add `assert` lemmas for cardinality or distinctness constraints. No separate typechecker phase is needed for ordinary Rust, but a Verus library could generate solver facts from finite enum types.

## technique: parametric polymorphism

A predicate such as `applyTo` is declared with `dec_pp_type(applyTo(rel(T,U),T,U))`, allowing any relation domain/range types that unify with `T` and `U` (section 5.1, p. 12). Apply this when one relational operation should work over many element types while retaining static shape checks.

Verus form. Inference: use generic Rust functions with type parameters and trait bounds; prove a generic `spec fn` relation lemma. Verus generics do not automatically infer arbitrary set-theoretic relation laws, so semantic assumptions remain explicit.

## empirical evidence and limitations

The Landing Gear System encoding has 7.8 KLOC and 465 proof obligations; {log} discharged 100% in roughly 290 seconds, compared with Rodin's reported 72% automatic discharge (section 5.3, p. 13); the paper credits the 290 s result to Cristiá and Rossi 2024 and the 72% to Mammar and Laleau's Rodin work. The Android Permission System has 27 properties: 24 (about 90%) were automatic in about 21 minutes; the remaining three required 500 Coq proof-command LOC, about 2% of all proof commands, while the automatic proofs covered 98% of proof effort (p. 13). The denominators are explicit; the paper does not report hardware or variance. Inference: cross-tool percentages are not directly comparable because encodings, obligations, and automation differ.

“The constraint solver is proved to be safe w.r.t. the type system.” (abstract, p. 1)

The paper states that the solver is safe with respect to the type system but gives the proof only in an on-line document. Inference: the result does not cover the Prolog implementation of the typechecker or solver, the decision procedures' correctness, or the translation of the case-study models into {log}. Inference: VL should combine Rust type structure with semantic proof obligations and preserve an explicit invariant boundary. Existing {log} work already covers optional prescriptive typing, finite-set solving, polymorphism, and case-study automation; VL should not rebuild a generic set solver.

## techniques for the catalog

- prescriptive set types — declare types for variables, sets, relations, products, and sums before constraint execution
- type-filtered invariant solving — let types discharge shape facts and a set solver prove remaining semantic invariants by unsatisfiability
- type-safety proof — prove preservation and progress for every rewrite rule
- four-phase typechecker — separate declarations, DNF structure, atomic constraints, and argument unification
- finite-type solver feedback — convert finite type declarations into membership constraints visible to the solver
- parametric polymorphism — declare relation operations with type variables that unify at each query
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Rule (7) computes the size of any extensional set by counting the elements that belong to it while taking care of avoiding duplicates."): read the whole paper text and checked every quotation, number, section and page reference, the technique steps, and the case-study figures; changed the claims that the paper proves the 60 rules (the proof is in an on-line document), the Pierce quote page (p. 3, not p. 4), the example 1 page (p. 4), the Theorem 1 statement, the type grammar, the four-phase description, the solver-limit sentence and an unsupported Verus remark; did not check the on-line technical report, the cited prior work or any Verus claims.
