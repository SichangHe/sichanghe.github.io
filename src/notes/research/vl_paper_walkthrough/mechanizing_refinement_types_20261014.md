# Mechanizing Refinement Types
(authored by agents unless marked 🧑)
Tag: `borkowski2024mechanizing`, [paper](https://doi.org/10.1145/3632912)

## scope and result
The paper defines λRF, a core refinement calculus combining semantic subtyping, existential types, and parametric polymorphism. Its top-level result is type safety: a closed well-typed term either is a value or can take another evaluation step. The authors mechanize this metatheory in LiquidHaskell. They state, “We present λRF, a core refinement calculus that combines semantic subtyping and parametric polymorphism.” (Abstract, p. 1)

The development is deliberately staged. First, λF is an unreﬁned System F with integers and booleans; then λRF adds refinements and existential types. This separation avoids a circular well-formedness definition and gives a smaller proof skeleton to reuse. The paper states, “Our overall strategy is to present the metatheory for λRF in two parts.” (Section 2, p. 2)

Inference: for Verus, the reusable lesson is to isolate an unrefined executable model and prove its basic safety before adding specification machinery. This can keep a large proof from depending on a circular specification judgment.

## technique: kinded polymorphism prevents lost refinements

### what it is and when to use it
Refinement types constrain values with predicates such as `Int {ν: 0 < ν}`. Naively refining any type variable is unsound: a variable refined by `false` could later be instantiated with an unreﬁned function type and lose the predicate. λRF assigns each type variable either base kind `B` or star kind `★`. A `B` variable may be refined and may only be instantiated by a base or refined base type. A `★` variable may only have the trivial refinement `true`.

The paper’s example is `max`, whose useful type is `∀ α:B. x:α → y:α → α {ν: x ≤ ν ∧ y ≤ ν}`. The base-kind restriction also prevents comparison of non-comparable function values. “Variables with the base kind B, can be refined, compared, and only substituted by base, refined types.” (Section 2.2, p. 5)

### how to apply it
1. classify each type variable as `B` or `★` when introducing it (Section 2.2, p. 5)
2. permit a refinement only when the underlying type has base kind (Section 4.1, p. 10)
3. require a `B` instantiation to be well formed at kind `B`; erase or strengthen its predicate during substitution (Sections 3.1–3.2, pp. 7–9)
4. reject a refinement on a `★` variable and reject an instantiation that violates the kind (Section 4.1, p. 10)

Inference: in Verus, encode the analogous boundary in the specification API. Use a `spec fn` or predicate over a concrete mathematical base type for refinements, and keep arbitrary Rust data or function objects outside that refinement domain. This is an inference because the paper’s kind system is not a Verus construct.

### evidence and limits
The result depends on proving preservation and progress for the kinded calculus; the paper does not report a separate bug-finding experiment. The soundness claim assumes the primitive and implication contracts listed as Requirements 1 and 2 (Section 8.4, p. 23). Arbitrary refinements are allowed in the calculus, so the authors do not prove that an SMT implementation decides them.

## technique: existential result types preserve application facts

### what it is and when to use it
For dependent application, λRF gives `f e` the existential type `∃ x:tx. t` instead of substituting the whole expression `e` into `t`. If `e` has positive type `Pos` and the identity function returns `Int {ν:ν=x}`, the result is `∃ x:Pos. Int {ν:ν=x}`. The witness variable retains the argument’s refinement while keeping arbitrary expressions out of the refinement logic. “Using the TApp-Exists rule, both of these problems are addressed.” (Section 2.2, p. 4)

### how to apply it
1. infer a dependent function type `x:tx → t` for the callee (Section 4.2, p. 12)
2. infer `tx` for the argument (Section 4.2, p. 12)
3. produce `∃ x:tx. t`, binding the argument through a fresh witness (Section 4.2, p. 12)
4. eliminate or introduce that existential with S-Bind or S-Witn when a surrounding type needs it (Section 4.3, p. 13)

Inference: a Verus analogue would keep a value in a ghost/spec variable and state the postcondition using that variable, rather than inserting an arbitrary executable expression into a quantified predicate. Verus `requires` and `ensures` can express the relation; the existential packaging itself would be modeled with a spec tuple or an existentially chosen value. This is an inference.

### evidence and limits
The authors choose existential types over A-normal form because A-normal form is not preserved by small-step evaluation and would complicate closing substitutions (Section 4.2, p. 13). The calculus still relies on subtyping and implication to eliminate witnesses, so those relations must satisfy the stated axioms.

## technique: semantic subtyping through an explicit implication contract

### what it is and when to use it
Base-type subtyping reduces to a predicate implication. Constructor rules handle function contravariance, existential witnesses, and polymorphism. Instead of formalizing an SMT solver, λRF treats implication as an abstract judgment satisfying eleven properties: reflexivity, transitivity, conjunction introduction and elimination, repetition, narrowing, weakening, two substitution properties, and strengthening. “This axiomatic approach precisely explicates the properties that are required of the implication checker in order to establish the soundness of the entire refinement type system.” (Section 4.4, p. 15)

### how to apply it
1. define the subtyping judgment for each type constructor (Section 4.3, pp. 13–14)
2. reduce a base refinement `b{x:p1}` <: `b{x:p2}` to `p1 ⇒ p2` under a fresh `b` variable (Section 4.3, p. 14)
3. require the implication oracle to satisfy Requirements 2(1)–(11), including substitution and narrowing (Section 4.4, pp. 14–15)
4. use T-Sub to coerce a term to a supertype, then use transitivity to normalize chains (Sections 4.2 and 6.1, pp. 12, 17)

Inference: Verus can use this separation as a trust boundary: model solver-supported arithmetic and logical facts as proof obligations, while stating exactly which weakening, substitution, and strengthening lemmas a library or automation layer must preserve. This is an inference; Verus does not expose the paper’s implication judgment.

### evidence and limits
The paper explicitly leaves the solver connection unproved: “In the future, we can look into either verifying that these properties hold for SMT-based checkers, or even build other kinds of implication oracles that adhere to this contract.” (Section 4.4, p. 15) Thus the mechanized theorem is conditional on Requirements 1 and 2, not a proof of Z3 correctness or completeness.

## technique: co-finite quantification for binders

### what it is and when to use it
Rules that introduce a binder quantify over every name outside a finite excluded set, rather than choosing one fresh name. For type abstraction, the premise is `∀ α′ ∉ L. α′:k, Γ ⊢ e[α′/α] : t[α′/α]`. This removes renaming obligations from mechanized substitution and inversion proofs. “This rephrasing simplifies the mechanization of metatheory by eliminating the need for renaming lemmas.” (Section 4, p. 9)

### how to apply it
1. carry an explicit finite set `L` of excluded names in the derivation constructor (Section 8.2, p. 21)
2. represent the premise as a function that accepts any name not in `L` (Section 8.2, p. 21)
3. choose `L` as the environment domain, adding names that would clash with the current proof (Section 8.2, p. 21)
4. instantiate the function only with a name proven fresh for the use at hand (Sections 4 and 8.2, pp. 9, 21)

Inference: in Verus, freshness can be represented with a spec set and a proof that a chosen identifier is outside it; this is a modeling pattern rather than a built-in binder rule. The paper’s locally nameless representation remains the more direct implementation choice for a syntax proof.

## technique: locally nameless syntax and strengthening substitution

The mechanization separates named free variables from de Bruijn bound variables. This avoids capture of free names and avoids index shifting for free variables. Type substitution into a refined variable uses `strengthen`: it conjoins the old predicate with the substituted type’s top-level refinement, pushes through existentials, and leaves function and quantified types unchanged. “Our metatheory requires that all variables bound in the environment be distinct.” (Section 3.1, p. 8)

Steps are: represent free and bound variables as distinct constructors (Section 3.1, p. 8); define substitution structurally (Figure 5, p. 8); when substituting into `α{x:p}`, call `strengthen(t, p, x)` (Section 3.2, p. 9); and prove substitution and weakening together for typing and subtyping (Section 6.2, p. 17).

Inference: a Verus syntax model should use Rust enums for terms and explicit proof lemmas for capture-free substitution. Ordinary Rust variable substitution does not carry this metatheory automatically.

## technique: inversion, transitivity, and narrowing make non-syntax-directed proofs usable

Subtyping means typing is not syntax directed. The authors first prove subtyping transitivity, then use it to invert lambda and type-abstraction typing. Narrowing replaces an environment binding by a subtype, and exact typing proves that selfification preserves subtyping and value typing. The paper says, “The narrowing lemma says that whenever we have a judgment where a binding x:tx appears in the binding environment, we can replace tx by any subtype sx.” (Section 6.3, p. 18)

Apply the proof pattern as follows: prove transitivity by case analysis on the two subtype derivations and invoke substitution and narrowing where existential witnesses require it (Section 6.1, p. 17); prove inversion by collapsing a chain of T-Sub applications and then narrowing the body context (Section 6.1, pp. 17–18); prove mutually recursive weakening and substitution for typing and subtyping (Section 6.2, p. 17); finally prove narrowing for well-formedness, subtyping, and typing (Section 6.3, p. 18).

Inference: for Verus, this is a proof architecture for context-sensitive APIs: prove weakening, substitution, and context narrowing as reusable `proof fn`s before attempting high-level preservation. The exact judgment trees are paper-specific.

## technique: reified data propositions as constructive proofs

### four-step encoding
The authors reify propositions and their derivation evidence as Haskell data, connect them with refinement-level measures, and refine constructors with premises and conclusions. The four steps are: define proposition data such as `HasTyPr`; define one evidence constructor per rule such as `TPrim` and `TSub`; define measures mapping evidence to propositions; and refine constructor input/output types so only valid derivations can be built (Section 7, pp. 18–20). The paper states, “Reﬁned data propositions encode inductive predicates in LiqidHaskell by reﬁning Haskell’s data types.” (Section 7, p. 18)

A concrete example is `oneTy`, whose type says literal 1 has `Int {v | v == 1}` and whose body is `TPrim Empty (PInt 1)`; changing it to `PInt 2` is rejected (Section 7, p. 20). This turns ordinary recursive Haskell functions into constructive proofs because constructor refinements enforce each premise and conclusion.

Inference: Verus can model this with Rust enums for derivation evidence, `spec fn` measures over those enums, and `proof fn`s that construct only evidence satisfying `ensures`. This is an inference; Verus proof functions are checked differently from LiquidHaskell constructors.

### recursive preservation, progress, and soundness
The paper encodes one-step evaluation as `Step`, evaluation sequences as `Steps`, and proves preservation by recursion over typing evidence and progress by case analysis. Soundness recursively consumes an evaluation sequence: the reflexive case calls progress, while the transitive case calls preservation on the first step and recurses on the remainder (Section 8.3, pp. 22–23). LiquidHaskell checks totality, termination, and coverage.

Inference: the Verus form is a `proof fn` over a recursive sequence datatype with `requires` describing a valid derivation and `ensures` preserving the type predicate. A recursive `spec fn` can describe the sequence; executable Rust should not call a proof function at runtime. These are inferences.

## technique: SMT-backed intrinsic invariants

LiquidHaskell measures map executable functions into its refinement logic. The paper defines `fv` for free variables, embeds `Data.Set` operations as SMT set operators, and gives substitution an intrinsic postcondition `fv(e′) ⊆ fv(vx) ∪ (fv(e) \ {x})`. The function body itself proves the property at every call. A separate `above_max` lemma proves freshness by induction over a list converted from the set (Section 8.1, pp. 20–21).

Inference: in Verus, use a `spec fn` for a mathematical set of free variables, `ensures` on a substitution function, and a separate `proof fn` for the finite-set maximum argument. Keep the set theory and solver facts explicit in the contract, because the paper’s automatic set embedding is LiquidHaskell-specific.

## appendix proof details and an internal tension

Appendix A spells out the usual induction on evaluation length for type safety, then proves progress by cases on applications, type applications, lets, and annotations. Appendix B gives the hard transitivity and inversion cases, including narrowing and substitution through existential and function types. These appendices supply the proof steps behind the dependency graph in Figure 1; they do not add a separate empirical evaluation.

The main text says, “Sadly, the definition of denotational semantics for our polymorphic calculus is not currently possible: encoding type denotations as an inductive data type (or proposition in our LiqidHaskell encoding § 8) requires a negative occurrence which is not currently admitted.” (Section 4.4, p. 14) Inference: Appendix B nevertheless invokes a “Denotational Soundness Lemma” in its proof of transitivity (Appendix B, pp. 5–6) and uses an `Ent-Pred` inversion. This appears to be a draft inconsistency or leftover proof path. It does not change the paper’s stated mechanized result, which is conditional on the axiomatized implication requirements.

## evidence, trusted assumptions, and measured cost

The mechanization was checked with LiquidHaskell 0.8.10.7.1 on a Lenovo ThinkPad T15p with an Intel Core i7-11800H and 32 GB RAM. Table 1 reports 35 files, 3,842 specification lines, 5,549 proof lines, and 29 minutes total; the paper summarizes: “Our proof is non-trivial, requiring 9,400 lines of code and 30 minutes to verify.” (Abstract, p. 2; Section 8.4, p. 23; Table 1, p. 24) The table’s 3,842 plus 5,549 equals 9,391, consistent with the rounded 9,400-line statement. The 29-minute total rounds to 30 minutes.

The proved theorem covers the λRF calculus and its operational semantics. Trusted inputs are the primitive typing/reduction conditions (Requirement 1) and the eleven implication properties (Requirement 2); the solver’s soundness and the connection from SMT implication to program evaluation remain outside the proof (Section 8.4, p. 23; Section 10, p. 25). The paper also says the mechanization is “a crucial but small fragment of the features of modern reﬁnement type checkers.” (Section 10, p. 25)

Inference: the direct threat to VeruLaw is methodological rather than an immediate implementation vulnerability. An agent that emits refinement-like contracts without tracking kind restrictions, substitution, solver assumptions, and preservation obligations could produce specifications that look precise while losing facts at instantiation. The paper’s conditional implication oracle is a concrete reminder that solver validity and specification adequacy remain trusted boundaries.

## what VL should reuse and what it should not redo

Inference: VL should reuse the staged proof architecture, base-kind restriction, existential packaging of dependent results, explicit solver contracts, co-finite binder handling, and derivation-as-data pattern. These are transferable design patterns for a Verus proof library.

Inference: VL should not redo this paper’s exact λRF calculus or its already mechanized preservation/progress lemmas unless it needs a Rust-specific semantic correspondence. A new effort should instead connect the patterns to actual Verus constructs and test whether generated proofs maintain the same assumptions under Rust ownership, external specifications, and solver changes.

## techniques for the catalog

- kinded polymorphism: restrict refinements to base-kinded variables so instantiation cannot erase predicates
- existential application typing: package dependent application results with a typed witness instead of substituting arbitrary expressions
- axiomatized semantic implication: expose the exact algebraic contract required of an SMT or other implication oracle
- co-finite quantification: quantify over every fresh name outside a finite set to remove renaming lemmas
- locally nameless substitution: separate free names and bound indices and strengthen refinements during type substitution
- inversion and narrowing: use subtyping transitivity, context narrowing, and exact typing to recover syntax-directed facts
- refined data propositions: encode judgments and derivation evidence as refined data constructors for constructive proofs
- intrinsic SMT invariants: map executable measures such as free variables into solver-supported logic and attach postconditions

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
