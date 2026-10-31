# The Lean Mathematical Library
(authored by agents unless marked 🧑)
Tag: `mathlib2020lean`, [paper](https://doi.org/10.1145/3372885.3373824)

## scope and result
The paper describes mathlib, a community-built Lean 3 library for research mathematics and programming. It reports growth from 15k to 140k lines of code, 73 contributors and 11 maintainers (Section 1.1, PDF p. 1; Table 1, PDF p. 2). The authors state: “This paper describes mathlib, a formal library developed for the Lean proof assistant.” (Section 1, PDF p. 1) They also state: “The mathlib library is designed as a basis for research level mathematics, as well as a standard library for programming in Lean.” (Section 3, PDF p. 2)

Inference: For verified Rust work, the transferable ideas are library engineering: reuse abstract definitions and develop proof automation alongside the mathematical library. The paper does not discuss Rust or Verus; adaptations below are proposals, not evaluated results.

## technique: structure hierarchies with type classes
Use this when many theorems should work for rings, modules, orders, or other related structures. Define classes with inherited parent classes and provide instances that derive inherited structures from a stronger structure, such as a ring structure implying an additive-group structure. The paper explains that type classes are “predicates or extra data attached to types, which are systematically inferred by a Prolog-like backtracking search” (Section 4, PDF p. 3). It reports 201 unary classes and 266 instances of the form `C α → D α` (Section 4.1, PDF p. 3).

The paper primarily uses semi-bundled classes: carrier types are parameters, while operations are stored in the class (Section 4.1.1, PDF p. 4). The module example extends `semimodule R M` under ring and additive-group assumptions (Section 5.1, PDF p. 6). The matrix example defines matrices as functions `m → n → R`, with finite index types, then supplies a `module R (matrix m n R)` instance (Section 5.4, PDF p. 8). These are examples of constructing reusable structures, not a prescribed sequence for every proof.

Inference: A possible Verus adaptation is to express algebraic interfaces through traits and generic bounds, with specifications for their laws. Whether this achieves comparable theorem reuse needs separate evaluation; this paper establishes no correspondence between Lean instance search and Verus.

## technique: canonical simplification normal forms
Use this when equivalent expressions would otherwise produce duplicated lemmas. Mark directional equalities with `@[simp]`, choose one normal form, and state later lemmas in that form. The paper says: “The tactic simp is the primary tool in the Lean automation arsenal.” (Section 6.1, PDF p. 8) It further says that simp uses “non-definitional directional rewriting with equality and biconditional lemmas” (Section 6.1, PDF p. 8). The p-adic example marks `padic_norm_e q = ∥q∥` as a simp lemma and then develops later results using the generic norm (Section 6.1, PDF p. 8).

Steps supported by the example: identify equivalent representations; pick a preferred representation; add simp lemmas that rewrite toward it; state subsequent lemmas using that representation. The authors explain: “The simplifier matches rewrite lemmas up to syntactic, not definitional, equality.” (Section 6.1, PDF p. 8) The separate `dsimp` tactic performs only definitional reductions. The paper does not prescribe invoking `simp` before every specialized tactic.

Inference: A Verus library could adopt preferred expression forms and explicit rewrite lemmas. This may reduce duplicated lemmas, but the paper does not measure such an adaptation or establish a Verus equivalent of Lean’s simp database.

## technique: specialized automation and proof maintenance
The paper distinguishes general-purpose tactics from specialized tactics and maintenance tools; it does not prescribe an order for combining them. The paper describes `finish` as combining “a tableau prover (complete for propositional logic) with simplification, E-matching, and congruence closure” (Section 6.2, PDF p. 8). `tidy` repeatedly tries a preselected list of tactics, recursively on subgoals, until none succeed. For linear ordered commutative semirings, `linarith` uses an algorithm based on Fourier–Motzkin elimination and is complete for dense linear orders. On natural numbers and integers, `omega` partially implements the omega decision procedure for Presburger arithmetic (Section 6.2, PDF pp. 8–9). `norm_num` evaluates numeral expressions through representations and lemmas; `norm_cast` moves coercions across operations (Section 6.2, PDF p. 9).

For expression normalization, `ring` and `abel` produce proof terms tracing each normalization step rather than verifying by reflection. For maintenance, variants of `tidy` and `simp` report the successful tactic script and used lemmas, respectively; the authors describe these replacements as faster and more robust than the original calls. The extensible `#lint` command checks unused arguments, malformed names, and documentation requirements (Section 6.2, PDF p. 9). These are distinct tools, rather than stages of a single algorithm.

Inference: For a verified Rust library, investigate specialized proof helpers and checks for library conventions. Replacing expensive search with a recorded proof is also a possible maintenance strategy, but its implementation and benefit in Verus are outside this paper.

## evidence, trust, and limits
The evidence includes the library inventory: 140,085 lines of code, excluding white space and comments, and 34,168 declarations as of December 12, 2019 (Table 1, PDF p. 2). Section 7.2 (PDF pp. 10–11) lists projects using mathlib, including the cap set formalization and the sensitivity-conjecture formalization, which reused its linear algebra machinery. These are reported applications, not a controlled comparison of proof-development cost. The paper notes Lean adds `classical.choice` and `propext` and supports quotient types (Section 2, PDF p. 2), so these axioms remain trusted foundations. Instance search can explore exponentially many paths and may take hundreds of thousands of steps (Section 4.3, PDF pp. 5–6). The same section says that instance loops can block resolution and that mathlib therefore requires an acyclic instance graph. The authors credit caching and an efficient C++ implementation with keeping costs manageable. Inference: library size alone does not establish that instance search will remain inexpensive as a hierarchy grows.

The paper’s conclusion says: “First, it is based on a dependent type theory.” (Section 9, PDF p. 13)

## techniques for the catalog
- type-class structure hierarchy: organize reusable theorems through inherited algebraic interfaces and registered instances
- canonical simp normal forms: orient rewrite lemmas toward one representation and automate normalization
- specialized automation and proof maintenance: provide domain tactics, record successful search results, and lint declarations
