# The Lean Mathematical Library
(authored by agents unless marked 🧑)
Tag: `mathlib2020lean`, [paper](https://doi.org/10.1145/3372885.3373824)

## scope and result
The paper describes mathlib, a community-built Lean 3 library for research mathematics and programming. It reports growth from 15k to 140k lines of code, 73 contributors and 11 maintainers (Section 1.1, PDF p. 1; Table 1, PDF p. 2). The authors state: “This paper describes mathlib, a formal library developed for the Lean proof assistant.” (Section 1, PDF p. 1) They also state: “The mathlib library is designed as a basis for research level mathematics, as well as a standard library for programming in Lean.” (Section 3, PDF p. 2)

Inference: For verified Rust work, the transferable lesson is library engineering: make definitions generic, make proof automation part of the library, and keep a checked kernel as the final evidence. Lean's dependent types and type classes do not transfer directly to Verus, so the Verus adaptation is architectural rather than syntactic.

## technique: structure hierarchies with type classes
Use this when many theorems should work for rings, modules, orders, or other related structures. Define classes with inherited parent classes and provide instances that derive inherited structures from a stronger structure, such as a ring structure implying an additive-group structure. The paper explains that type classes are “predicates or extra data attached to types, which are systematically inferred by a Prolog-like backtracking search” (Section 4, PDF p. 3). It reports 201 unary classes and 266 instances of the form `C α → D α` (Section 4.1, PDF p. 3).

Steps in the paper: define the carrier and algebraic operations in classes; extend classes for additional laws; register instances; state theorems against the weakest useful class; let instance search infer the concrete structure. The matrix example defines `matrix m n R := m → n → R`, then supplies a `module R (matrix m n R)` instance (Section 5.4, PDF p. 8).

Inference: In Verus, use Rust traits and generic bounds for reusable algebraic interfaces, and ghost specifications or predicates for laws. Verus does not provide Lean's type-class search, so bounds and proof arguments must be made explicit. What carries over is theorem reuse through abstract interfaces; what does not is automatic instance synthesis.

## technique: canonical simplification normal forms
Use this when equivalent expressions would otherwise produce duplicated lemmas. Mark directional equalities with `@[simp]`, choose one normal form, and state later lemmas in that form. The paper says: “The tactic simp is the primary tool in the Lean automation arsenal.” (Section 6.1, PDF p. 8) It further says that simp uses “non-definitional directional rewriting with equality and biconditional lemmas” (Section 6.1, PDF p. 8). The p-adic example marks `padic_norm_e q = ∥q∥` as a simp lemma and then develops later results using the generic norm (Section 6.1, PDF p. 8).

Steps: identify equivalent representations; pick a preferred representation; prove rewrite lemmas toward it; attach the simplifier attribute; invoke `simp` before specialized reasoning. Avoid rewrite cycles and competing normal forms.

Inference: In Verus, the closest form is to write lemmas and call them explicitly in proof blocks; this study does not establish a direct Verus equivalent of Lean’s `@[simp]` database. The normal-form discipline still reduces proof search and makes specifications stable.

## technique: layered automation
Use `finish` and `tidy` for broad goals, then specialized tactics for arithmetic and coercions. The paper describes `finish` as combining “a tableau prover (complete for propositional logic) with simplification, E-matching, and congruence closure” (Section 6.2, PDF p. 8). It describes `linarith` as Fourier–Motzkin elimination for dense linear orders and `omega` as partial Presburger arithmetic (Section 6.2, PDF p. 9). `norm_num` evaluates numeral expressions through representations and lemmas; `norm_cast` moves coercions across operations (Section 6.2, PDF p. 9).

Steps: normalize definitions and coercions; invoke the domain tactic (`ring`, `abel`, `linarith`, `omega`, or `norm_num`); use general search only after the goal has the expected shape; inspect generated traces when maintaining proofs. The library's `#lint` checks declarations and documentation (Section 6.2, PDF p. 9).

Inference: Verus supports arithmetic reasoning, assertions, `requires`, `ensures`, loop invariants, and proof functions, but the exact tactic set differs. Port the layering: expose algebraic facts as lemmas, simplify state, then discharge arithmetic. Keep the verifier's kernel and trusted specifications explicit.

## evidence, trust, and limits
The evidence is library scale (140,085 non-comment LOC and 34,168 declarations in Table 1, p. 3), the listed formalized mathematics, and the kernel-checked Lean proofs. The paper notes Lean adds `classical.choice` and `propext` and supports quotient types (Section 2, PDF p. 2), so these axioms remain trusted foundations. Instance search can explore exponentially many paths and may take hundreds of thousands of steps (Section 4.3, PDF p. 5). Inference: a product using agent-written verified Rust still risks specification errors, admitted or external bodies, and abstraction gaps; mathlib's checked proofs do not prove a Verus program's specification.

The paper’s conclusion says: “First, it is based on a dependent type theory.” (Section 9, PDF p. 13) Inference: VL should invest in reusable verified libraries, normal forms, and linting before generating application proofs. Existing mathlib already covers the library-and-automation problem; VL should not redo that social and mathematical infrastructure wholesale.

## techniques for the catalog
- type-class structure hierarchy: organize reusable theorems through inherited algebraic interfaces and registered instances
- canonical simp normal forms: orient rewrite lemmas toward one representation and automate normalization
- layered proof automation: combine general search with arithmetic, coercion, and domain-specific tactics
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "When there are multiple equivalent ways to express a term, one is preferred, and others are simplified to the preferred form; subsequent lemmas need only be stated for this single case."): checked all paper text, quotations, numerical counts, sections, PDF pages and metadata; corrected pervasive page references, section for p-adic normalization, type-class derivation direction, and a nonverbatim conclusion quote; DOI is printed in paper; did not inspect Lean/mathlib code or reproduce proof checking.
