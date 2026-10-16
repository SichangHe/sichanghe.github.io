# Deciding and Interpolating Algebraic Data Types by Reduction (Technical Report)
(authored by agents unless marked 🧑)
Tag: `hojjat2018deciding`, [paper](http://arxiv.org/abs/1801.02367v1)

## scope and result

This paper decides quantifier-free recursive algebraic data type (ADT) constraints by reducing them to equisatisfiable formulas over equality with uninterpreted functions (EUF) and linear integer arithmetic (LIA). It also derives Craig interpolants from EUF+LIA interpolants and extends the method to ADT size constraints through incremental unfolding. The abstract says: “We show that the reduction approach gives rise to both decision and Craig interpolation procedures in (extensions of) ADTs.” (abstract, p. 1)

The target is a practical solver architecture: reuse mature EUF and LIA engines instead of implementing a native ADT solver. The paper's introduction states: “The reduction can be implemented with little effort, and is widely applicable since EUF and LIA are supported by virtually all SMT solvers.” (section 1, p. 1) The reduction is structure-preserving but can introduce auxiliary integer functions for constructor identity and depth.

Inference: this is directly relevant to Verus proofs over enums, recursive specs, and sequences when a backend needs ADT satisfiability or interpolants. It does not describe Verus, and a translation from Verus `Seq`/`Map` values to these ADT encodings would be an additional trusted layer.

## technique: flatten ADT formulas

First put the ADT formula into negation normal form and flat form. Flatness means constructors and selectors occur only in equations `g(x1,...,xn) ≈ x0`, with variables as arguments and result; introduce fresh variables to eliminate nested terms (section 4, pp. 3–4). The list example introduces variables for `blue`, `red`, and `cons(y,nil)` before reduction (Example 2, p. 3).

Apply the reduction in this order:

1. convert the formula to negation normal form (section 4-A, p. 4)
2. flatten every constructor/selector occurrence with fresh sorted variables (section 4-A, p. 4)
3. replace each ADT variable `x:σ` by an integer variable `x̃` (section 4-A, p. 3)
4. recursively apply constructor, selector, tester, equality, and disequality rules in positive positions (Table I, p. 4)
5. add range constraints `In_σ(x̃)` for finite sorts (Table I, p. 4)
6. solve the resulting EUF+LIA formula with an existing solver (Theorem 1, p. 5)

## technique: encode constructors, selectors, testers, and acyclicity

For each constructor `f:σ1×…×σn→σ0`, introduce an integer-valued uninterpreted function `f̃`, a constructor-ID function `ctorId_σ`, and a depth function `depth_σ`. `CtorSpec_f` asserts that `f̃` reconstructs the result, selectors recover each argument, the constructor ID is `Id_f`, and the result depth exceeds each child depth (Table I, p. 4). The depth inequalities prevent cyclic terms.

Translate a constructor equation with `CtorSpec_f`; translate a selector equation with the selector function plus a disjunction over every constructor of the result sort; translate `is_f(x)` with an existential constructor specification and `¬is_f(x)` with the disjunction of all other constructors (Table I, p. 4). Translate equalities and disequalities by renaming the integer variables. The paper's soundness theorem is explicit: “The reduct φ̃ of a flat ADT formula φ in NNF is satisfiable (over EUF+LIA) if and only if φ is satisfiable (over ADTs).” (Theorem 1, section IV-B, p. 5)

The proof maps ADT terms injectively to integers in one direction and constructs an injective term assignment from the EUF+LIA model in the other, using dependency edges and depth to ensure no term contains itself (section IV-B, pp. 5–6).

Inference: a Verus encoding could map an enum constructor to a ghost tag and fields, with a recursive `spec fn` describing selectors and a well-founded depth measure. The paper's EUF functions are solver artifacts; they should not be exposed as executable Rust operations.

## technique: optimize the reduction

Selector expansion can be simplified to `f̃_j(x̃)=ỹ` when the selector is guarded by a constructor test or constructor equation that already identifies the head constructor (section IV-C, p. 6). Enumeration sorts can map each nullary constructor directly to its integer ID, and testers become arithmetic comparisons (section IV-C, p. 6). These optimizations reduce redundant disjunctions and make interpolation easier.

The authors measured reduction size on 8,000 randomly generated ADT benchmarks from a cited suite; 4,422 were unsatisfiable. Average formula size was 76 subexpressions after parsing, 337 after reduction, and 34 after reduction plus EUF+LIA simplification. Thus raw reduction increased size by a factor of 4.5, while simplification more than offset it. Of the 4,422 unsatisfiable cases, 4,334 simplified directly to `false`; the remaining 3,666 problems averaged size 74 (section IV-D, pp. 6–7). The most complicated case took about 1 second and average solving time was 43 ms, dominated by parsing and preprocessing (section IV-D, p. 6). The paper says a larger solver comparison was still ongoing, so these are not a head-to-head speedup result.

## technique: generate Craig interpolants through the reduction

For an unsatisfiable partition `φA ∧ φB`, first compute an EUF+LIA interpolant `Ĩ` over the reduced formulas. Then translate `Ĩ` back to ADT syntax by replacing integer equalities with ADT equalities, `ctorId` predicates with testers, and depth functions with an ADT extension or an elimination strategy (section V, pp. 6–7). The list example obtains the interpolant `x.head != z.head` for a shared variable `x` (Example 6, p. 7).

The translation must handle finite-sort range predicates and auxiliary functions. Infinite ADT sorts can be treated as fresh uninterpreted sorts because the reduction does not use arithmetic over them; finite sorts need constructor-ID mappings to avoid uninterpretable cardinality constraints (section V, pp. 6–7).

Inference: Verus could consume an interpolant as a ghost lemma or candidate invariant over enum tags and sequence fields. Interpolant translation is a synthesis aid, not a proof of the Rust implementation; the concrete-to-ADT abstraction still needs a Verus refinement lemma.

## technique: handle ADT size constraints with unfolding

Adding a size operator introduces two problems: some sizes have no constructor terms, and some sizes have too few distinct terms to satisfy disequalities (section VI-A, p. 7). Replace `depth_σ` with `size_σ`, constrain sizes to the semilinear size image `S_σ`, and change constructor specifications so the result size is `1 + Σ child sizes` (Table II, p. 7). Add the rule `|x|≈y ⇒ size_σ(x̃)=y ∧ y∈S_σ` (Table II, p. 7).

Reduction alone is sound for refuting satisfiability but not complete for proving it. Incremental unfolding repairs this:

1. set `φ0 = φ` (section VI-A, p. 7)
2. choose an ADT variable `x` in the current formula (section VI-A, p. 7)
3. conjoin one constructor equation for every constructor of `x`'s sort, using fresh child variables (section VI-A, p. 7)
4. reduce the partial formula to EUF+LIA and inspect a model (section VI-A, p. 7)
5. stop when the reduct is unsatisfiable, or when every original variable's integer value is represented by an unfolded term (Lemma 2, p. 7)

Lemma 2 proves unsatisfiable reducts imply original unsatisfiability and that a model covering every variable with unfolded terms yields an ADT model (section VI-A, p. 7). For the positive-natural-number ADT, unfolding `x` and `y` three times detects that two distinct size-3 values cannot exist (Example 9, p. 7).

## technique: characterize when unfolding terminates

Define a sort as expanding when, beyond some size bound, every nonempty size level contains arbitrarily many constructor terms (Definition 1, p. 8). Unfolding is complete for satisfiability on expanding ADTs. The paper gives a dependency graph whose vertices are sorts and constructors; edges connect a constructor's result sort to argument sorts. An ADT is non-expanding exactly when the graph has a simple unary-constructor cycle that is the only cycle path and contributes unboundedly to the size image (Theorem 2, pp. 8–10).

Use the criterion as follows:

1. build the bipartite sort/constructor dependency graph (section VI-C, p. 8)
2. find strongly connected components and simple cycles (Theorem 2, pp. 8–10)
3. check whether a cycle has only unary constructors, is the unique return path, and yields unbounded but sparsely populated sizes (Theorem 2, pp. 8–10)
4. classify such ADTs as non-expanding and use explicit counters or length-completion formulas instead of relying on unfolding (section VII, p. 10)

## evidence, limits, and trust

The reduction's main evidence is Theorem 1's equisatisfiability proof and the interpolation construction (sections IV–V, pp. 5–7). The benchmark evidence uses 8,000 random formulas, with the denominators and transformations reported above; no correctness percentage or comparison against native ADT solvers is reported. Size-constraint handling has a soundness lemma and a completeness characterization for expanding ADTs, but reduction alone is explicitly incomplete for arbitrary size constraints (section VI-A, p. 7).

Trusted components are the EUF+LIA solver, the correctness of flattening and reduction implementation, the semilinear size-image computation, interpolation extraction and reverse translation, and the abstraction from Verus data to ADTs. Assumptions include absolutely free constructors, well-defined nonempty sorts, quantifier-free input, and the supported ADT signature. The report's conclusion says integration with Eldarica and richer quantifier reasoning remained future work (section VII, p. 10).

Inference: threat to VL is moderate. ADT reduction can improve solver portability and generate candidate interpolants for recursive data proofs, but it does not address ownership, aliasing, mutable memory, or executable Rust semantics. VL should reuse flattening, constructor-ID/depth encodings, guarded-selector simplification, incremental unfolding, and expanding-ADT diagnostics. It should not treat EUF+LIA satisfiability as a complete proof of an arbitrary Verus recursive specification without checking the abstraction and size assumptions.

## techniques for the catalog

- flat ADT reduction — flatten recursive constructors and reduce constructor, selector, tester, and equality constraints to EUF+LIA
- constructor/depth encoding — use uninterpreted constructor functions, IDs, selectors, and depth inequalities to enforce free acyclic terms
- reduction optimization — simplify guarded selectors and encode finite enumerations directly as integer IDs
- ADT interpolation — compute EUF+LIA interpolants and translate IDs, equalities, and depth facts back to ADT predicates
- size-aware unfolding — add semilinear size constraints and incrementally unfold variables until a model is represented or contradiction appears
- expanding-ADT criterion — classify when unfolding is complete using unary-cycle structure in the sort/constructor dependency graph
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
