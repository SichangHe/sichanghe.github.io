# Touring the MetaCoq Project (Invited Paper)
(authored by agents unless marked 🧑)
Tag: `sozeau2021touring`, [paper](http://arxiv.org/abs/2107.07670v1)

## takeaway

Inference: MetaCoq reduces the trusted implementation of Coq by reifying Coq's syntax and type theory in Coq, proving metatheory, implementing a type checker whose correctness and completeness are proved, and proving erasure to an untyped lambda calculus. The paper's key product lesson is to make the verifier's input language, algorithms, and extraction steps explicit and machine-checked.

"MetaCoq is a collaborative project that aims to tackle these difficulties to provide the first fully-certified realistic implementation of a type checker for the full calculus underlying the Coq proof assistant." (abstract, p. 13)

Inference: this is a survey of a large formal development, not an empirical comparison. It reports no success-rate denominator or benchmark table. Its evidence consists of mechanized theorems, extracted examples, and explicit limitations and assumptions.

## technique 1: reify the implementation's syntax and stateful API

What it is. MetaCoq.Template defines Coq inductive datatypes for terms, local contexts, and global declarations, closely matching Coq's OCaml kernel representation. It then supplies a TemplateMonad API for manipulating the global environment and invoking the checker.

How to do it.
1. Define a raw term datatype containing de Bruijn variables, named variables, sorts, casts, products, lambdas, lets, applications, constants, inductives, constructors, cases, projections, (co-)fixpoints, and primitive values (§2, pp. 15–16).
2. Define local contexts as lists of typing assumptions/definitions and global contexts as mappings from names to declarations (§2, p. 16).
3. Define quotation/unquotation between Coq terms and the reified representation, preserving the kernel's shape (§2, p. 15).
4. Encapsulate global-environment updates and proof obligations in a monad; provide an interpreter and an extraction-friendly variant (§2.1, p. 16).
5. Build plugins such as parametricity and induction derivation on this API, so their implementations can themselves become proof targets (§2.1, p. 16).

"We need a monadic abstraction to encapsulate the handling of the global state of the C OQ system that is being manipulated." (§2.1, p. 16)

Verus form. Inference: encode an AST as Rust enums and environments as immutable maps or ghost sequences; use spec functions for lookup, substitution, and well-formedness. A Rust API can return a result carrying a value and a proof-relevant ghost predicate, while executable proof values are erased. Verus does not provide dependent inductive types or Coq's universe checker, so the type-indexing and proof irrelevance must be modeled explicitly.

Evidence and limits. The paper says the syntax “corresponds closely to C OQ’s internal syntax” (§2, p. 15), but exact correspondence is a modeling claim backed by the formal definitions, not a measured byte-for-byte comparison. Quotation, OCaml interpretation, and the host compiler are part of the trusted integration unless separately verified.

## technique 2: specify PCUIC and prove its metatheory

What it is. PCUIC is the Polymorphic Cumulative Calculus of (Co-)Inductive Constructions underlying Coq. MetaCoq defines reduction, alpha-cumulativity, typing, contexts, and inductive declarations as predicates in Coq, then proves properties needed by the checker and erasure.

How to do it.
1. Define one-step reduction for beta, iota, zeta, (co-)fixpoint, delta, and congruence rules; close it under alpha-equivalence and a universe relation (§2.2.1, pp. 17–18).
2. Define typing and cumulativity judgments inductively over well-formed global/local contexts (§2.2.2, pp. 18–19).
3. Define parallel reduction and use a triangle property to prove confluence (§3.2.3, pp. 20–21).
4. Prove subject reduction: reduction preserves typing; prove principality: any two types of a term have a common more-principal type (§3.2.2–§3.2.4, pp. 20–22).
5. Prove strengthening (thinning) where unused context variables can be removed, or record where the proof is blocked by undirected conversion (§3.3, pp. 21–22).

"To verify the sanity of the specification we develop the meta-theory (§3) of the PCUIC calculus and show that it enjoys type preservation (§3.2.2) and principality (§3.2.4) of types, along with the expected confluence of reduction (§3.2.3) and proof that conversion is a congruence." (§1.2, p. 15)

Inference: these theorems are prerequisites for trusting a checker: subject reduction supports preservation across evaluation, confluence makes conversion coherent, and principality lets inference choose a canonical type. They do not prove the OCaml Coq kernel correct until the implementation is related to this specification.

Verus form. Inference: represent typing and reduction as ghost relations over ASTs and environments; prove preservation as a lemma whose precondition is a typing derivation and whose postcondition is a typing derivation for the reduced term. Use recursive `spec fn`s and well-founded measures rather than executable proof code. Verus's ordinary Rust type system cannot directly express the dependent judgments, so this is a proof-model layer around the executable checker.

## technique 3: recover principality with bidirectional typing

What it is. Undirected conversion made strengthening and principality difficult. MetaCoq reifies a bidirectional presentation that separates synthesis (infer a type from a term) from checking (check a term against an expected type). The resulting derivations are canonical and move conversion to a controlled phase.

How to do it.
1. Define a synthesis judgment where the term is input and a type is output (§3.4, p. 22).
2. Define a checking judgment where term and expected type are inputs (§3.4, p. 22).
3. Add one phase-change rule for cumulativity rather than allowing many conversion rules throughout a derivation (§3.4, p. 22).
4. Prove equivalence with the original PCUIC typing relation (§3.4, p. 22).
5. Use the bidirectional form to derive strengthening and principality by straightforward induction (§3.4, p. 22).

"The crux of these argument is that bidrectional typing derivations are ”canonical” for a given term, and move uses of the conversion rule to the top of the derivation, where they are strictly necessary." (§3.4, p. 22)

The method also found a real Coq bug: the dependent `match` rule compared universe instances and parameters by convertibility when cumulativity was required, causing a loss of subject reduction. The fix stores the eliminator's universe instance and parameters in the match node and checks cumulativity against the reconstructed expected type (§3.5, pp. 22–23).

Inference: this is a practical verification workflow: designing a canonical algorithmic judgment can expose specification ambiguities that ordinary theorem proving hides. The bug discovery is evidence of specification value, not a quantified bug-detection rate.

Verus form. Inference: implement `synth(term, ctx) -> Result<Type, Error>` and `check(term, expected, ctx) -> Result<(), Error>` as Rust functions, with `requires` that contexts are well formed and `ensures` that success returns a valid judgment. Keep conversion as a separate lemma/function and state the phase-change rule explicitly. Verus cannot make a dependent result type carry a Coq proof term, so use ghost predicates or an enum carrying a witness plus a specification relation.

## technique 4: decide universe constraints and conversion with verified algorithms

What it is. The checker has separate algorithms for universe consistency, weak-head reduction, and conversion. Each is developed with a termination argument and connected to PCUIC's declarative judgments.

Universe constraints. Universe variables obey tropical-algebra constraints over `(N, max, +k, ≤)`. The paper's algorithm builds a constraint graph and assigns each variable the weight of its longest simple path from `Type@{0}` (§4.1, p. 23). It handles arbitrary `+k ≤ l'+k'` constraints, more expressively than the current Coq implementation (§4.1, p. 23).

Reduction. A weak-head reduction stack machine computes weak-head normal forms. Its definition assumes strong normalization for well-typed terms; the paper calls this the only axiom used in the development (§4.1, p. 23).

Conversion. The algorithm incrementally reduces both terms to weak-head normal forms, compares heads, tries to unify arguments for equal constants, and unfolds only when needed. It is a dependently typed program taking well-typed terms, with a lexicographic termination measure, and returns a proof of convertibility or non-convertibility (§4.1, pp. 23–24).

"In other words it is proven sound and complete by construction." (§4.1, p. 24)

Verus form. Inference: encode universe constraints as a finite graph and prove longest-path consistency with arithmetic lemmas; encode conversion as a recursive function over a decreasing fuel/measure with a ghost proof that the measure decreases. Verus `decreases` clauses can justify recursion, while `requires`/`ensures` state soundness and completeness relative to a separately defined relation. Strong normalization, foreign compiler behavior, and the exact Coq conversion semantics remain assumptions unless modeled.

## technique 5: build a correct and complete type checker over the algorithms

What it is. Type inference follows the head constructor of a raw term and returns either an inferred type with a squashed proof or a type error. Type checking is inference followed by conversion; global environments are checked with a monad that verifies inductive declarations, positivity, and universe constraints.

How to do it.
1. Require a well-formed global and local context (§4.2, p. 24).
2. Pattern-match on the term head and recursively infer subterm types (§4.2, p. 24).
3. Return `ret` with a sigma-type containing the inferred type and a squashed proof, or `raise` on failure (§4.2, p. 24).
4. Run the conversion test against an expected type to obtain the checking judgment (§4.2, p. 24).
5. For global environments, build a constraint graph, run positivity and context-cumulativity checks, and return either an error or a proof-bearing well-formed environment (§4.3, p. 24).

The paper says the extracted inference function “returns an error or an infered type, just like in C OQ’s implementation.” (§4.2, p. 24)

Inference: squashing proofs into `Prop` prevents computational code from inspecting proof shape; extraction therefore removes proof arguments while preserving the decision result. The completeness argument depends on the bidirectional presentation and the metatheory above.

Verus form. Inference: use an executable Rust `Result<Type, Error>` and ghost predicates for `WellTyped` and `WellFormedEnv`. Prove that `Ok` implies typing and that every declaratively typable input produces `Ok` under the checker preconditions. Use `proof fn`s only in verification; never call them from runtime code. The global-environment graph and positivity checks need explicit data structures and lemmas.

## technique 6: verify type and proof erasure before extraction

What it is. Erasure traverses a well-typed PCUIC term. Types and proofs are replaced by a dummy constructor; computational terms are recursively copied into an untyped call-by-value lambda calculus. The theorem preserves observations of evaluated values.

How to do it.
1. Require a well-formed environment and a well-typed term (§5, pp. 24–25).
2. If a subterm's type is `Prop` or `Type`, or the subterm proves a proposition, emit dummy `□`; otherwise recursively erase its structure (§5, p. 25).
3. Prove that if the source term reduces to a value under weak call-by-value, the erased term reduces to an observationally equivalent value (§5, p. 25).
4. Prune unused environment definitions and remove dummy pattern matches as verified optimization passes (§5, p. 25).
5. Feed the untyped term to CertiCoq and CompCert for certified assembly generation (§5, p. 25).

"The result of erasure hence contains no type information anymore, and all propositional content is replaced with ." (§5, p. 25)

Verus form. Inference: implement erasure as a Rust recursive function over an AST with a `decreases` measure and prove a simulation relation between source and target evaluation. Use a ghost typing predicate to justify the branch that emits `□`; do not claim that runtime Rust types preserve erased proofs. The paper's observational equivalence is a semantic relation that must be defined and proved; `ensures` over a final AST alone is insufficient.

Evidence and limits. The extracted checker successfully checked the HoTT prelude, including a large adjoint-equivalence proof (§4.2, p. 24). The paper reports no runtime benchmark denominator for that example. The erasure theorem is conditional on well-typedness and well-formed environments, and the entire reduction argument assumes strong normalization.

## what is proved, measured, and trusted

- proved
  - PCUIC confluence, subject reduction, principality, and conversion congruence (§3, pp. 19–22)
  - type-checker soundness and completeness with respect to the specification (§4, pp. 23–24)
  - erasure preservation of observations for well-typed closed terms (§5, p. 25)
  - verified environment checking and two erasure optimizations (§4.3 and §5, pp. 24–25)
- measured or demonstrated
  - extracted checker runs on the HoTT library prelude (§4.2, p. 24)
  - project scale of about 100k lines of OCaml and Coq code (§6, p. 25)
  - no denominator for bug-finding rate, checker throughput, or extraction success percentage
- trusted or assumed
  - strong normalization; the paper calls it the only axiom in the checker development (§4.1, p. 23)
  - correctness of unformalized guard checking, because it relies on oracles (§6.1, p. 26)
  - omitted eta conversion, SProp, module system, and template polymorphism (§6.1, pp. 25–26)
  - Coq/OCaml runtime, extraction and compiler integration, and the formal theory's consistency foundation
  - Inference: in VL, Verus, Z3, Rust compilation, FFI, and hardware would add analogous trust components

## limitations and product implications

Inference: the paper explicitly omits eta conversion, SProp, module-system checking, and template polymorphism; therefore “full calculus” in the abstract is bounded by the supported PCUIC subset (§6.1, pp. 25–26). It also says guard-checking correctness is assumed, so the trusted base is reduced rather than eliminated.

Inference: VL should not redo MetaCoq's general metatheory, bidirectional type-checking pattern, or erasure theorem. The reusable product lesson is to specify the language that agent-written Rust proofs actually use, verify the checker or proof-producing translator against that specification, and enumerate every unverified boundary. The threat to agent-written verified Rust is medium to high: a proof can be valid relative to a wrong specification or an unverified erasure/compiler boundary. MetaCoq shows a route to reducing that risk, but its own explicit omissions show why the trust inventory must remain concrete.

## techniques for the catalog

- reified kernel API — model syntax, contexts, environments, and stateful proof-assistant operations as datatypes and a monad
- mechanized PCUIC metatheory — prove confluence, subject reduction, principality, strengthening, and conversion congruence
- bidirectional typing — separate synthesis from checking to obtain canonical derivations and expose specification bugs
- universe graph consistency — decide tropical-algebra universe constraints with longest-simple-paths
- proof-producing conversion — combine weak-head reduction, unification, controlled unfolding, and a termination measure
- complete type checker — return an inferred type plus a squashed proof or an error, then check conversion
- verified erasure — erase types/proofs to untyped lambda calculus and prove observational preservation
- trust-base inventory — record strong normalization, guard checking, omitted features, extraction, and compiler assumptions explicitly

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
