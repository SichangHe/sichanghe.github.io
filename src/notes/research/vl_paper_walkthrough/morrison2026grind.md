# grind: An SMT-Inspired Tactic for Lean 4 (Short Paper – System Description)
(authored by agents unless marked 🧑)
Tag: `morrison2026grind`, [paper](https://doi.org/10.1007/978-3-032-32589-1_7)

## scope

The paper presents `grind`, a native Lean 4 tactic that combines congruence closure, E-matching, and theory solvers while producing kernel-checked proof terms. Its central claim is: “grind works natively in the Calculus of Inductive Constructions, producing kernel-checkable proof terms without any soundness compromises” (Abstract, p. 106).

## technique 1: native congruence closure over dependent terms

`grind` keeps equivalence classes of terms in an E-graph. Once two terms are equal, congruence derives equality of larger applications. The example `example (f : Nat → Nat) (h : a = b) : f (f b) = f (f a) := by grind` is solved by deriving `f a = f b` and then the nested equality (Sect. 2, p. 108). Before insertion, terms are normalized by beta reduction, canonicalization of instances and implicit arguments, and hash-consing so that structural equality reduces to pointer equality (Sect. 2, p. 108). The paper adds: “The congruence closure procedure handles the full Calculus of Inductive Constructions, extending earlier work” (Sect. 1, p. 107).

Steps (reconstructed by the study author from the paper's prose; the paper gives no numbered procedure): (1) normalize incoming Lean expressions; (2) hash-cons structurally equal terms; (3) merge classes when an equality is known; (4) apply congruence to applications; (5) detect contradiction when the classes containing `True` and `False` merge (Sect. 2, p. 108). Inference: a Verus analogue is to expose equalities with `assert` and `proof fn` lemmas so Z3 can rewrite nested terms; Verus does not expose grind’s E-graph API, so this algorithm belongs in automation rather than user-facing Rust syntax.

## technique 2: E-matching with theorem annotations

Instead of treating every theorem as an unrestricted rewrite, grind annotates a theorem with patterns and instantiates it when the E-graph contains a matching term modulo known equalities. The paper’s example is `@[grind =] theorem fg : f (g x) = x`; a hypothesis `a = g c` lets the pattern match `f a` even without a literal `f (g c)` term (Sect. 2, p. 108). The paper says: “Whenever the E-graph contains terms that match a pattern modulo known equalities, grind instantiates the theorem and asserts the result as a new fact” (Sect. 2, p. 108).

The paper explains, “The attribute [grind =] selects the left-hand side of the equation, f (g x), as the E-matching pattern” (Sect. 2, p. 108). The annotation families encode common directions: `[grind =]` selects the left side, `[grind _=_]` selects both sides, bare `[grind]` automatically selects indexable subexpressions covering quantified variables, `[grind →]` extracts premise patterns for forward reasoning, and `[grind ←]` extracts conclusion patterns for backward reasoning (Sect. 2, p. 108). `grind_pattern` supplies manual patterns, including multi-patterns that require all components to match before instantiation, when no built-in idiom fits (Sect. 2, p. 108).

Steps (reconstructed by the study author from the paper's prose; the paper gives no numbered procedure, and step 6 is the study author's addition): (1) annotate a theorem or invoke automatic pattern selection; (2) index terms headed by constants; (3) match modulo E-graph equalities; (4) instantiate the theorem; (5) assert its result as a new fact; (6) repeat until the goal closes or resource limits are reached. Inference: in Verus, the closest form is a carefully scoped `broadcast`/trigger strategy and explicit lemma calls; use only constructs documented for Verus, and treat trigger choices as an inference from this paper rather than a Verus feature claim.

## technique 3: instantiation constraints to control explosion

The paper prevents redundant theorem instances with constraints. For `shiftLeft_add`, the pattern `m ≪ (n + k)` is constrained by `m = 0` so it is not instantiated when the dedicated zero theorem already handles the case (Sect. 2, pp. 108–109). Other constraints include generation bounds, instance-count limits, structural conditions such as requiring a ground term, and guards that postpone instantiation until a proposition holds (Sect. 2, p. 109).

Steps (reconstructed by the study author from the paper's prose): (1) choose a theorem pattern; (2) state a constraint on matched variables or terms; (3) reject matches violating the constraint; (4) cap count or generation depth; (5) postpone guarded matches until their proposition is known. Inference: for Verus, keep quantifier triggers narrow and expose only the facts needed by a proof context; this is a design recommendation derived from grind’s constraint mechanism, not a claim that Verus has `grind_pattern`.

## technique 4: structure-directed case splitting and dependent matches

Grind splits only on structured expressions—`if`, `match`, and inductive predicates—not arbitrary Boolean variables. An inductive predicate marked `[grind]` supports both case analysis on hypotheses and constructor introduction (Sect. 2, p. 109). In the BigStep example, splitting propagates `B s` or its negation into congruence closure and applies the corresponding constructors (Sect. 2, p. 109).

For indexed vectors, dependent pattern matching uses type indices to eliminate impossible constructors. The paper explains that a vector of length `n+1` must be `cons`, so impossible `nil` branches disappear; grind tracks heterogeneous equalities and casts in the E-graph and then combines head equalities with linear arithmetic (Sect. 2, p. 109). Inference: Verus users can encode analogous datatype cases with `match`, `assert` facts about discriminants, and lemmas over recursive datatypes; the dependent-index and cast handling is Lean-specific and does not carry over unchanged.

## technique 5: typeclass-parametrized satellite solvers

Each solver activates from algebraic typeclass instances instead of hardcoded numeric types. The ring solver reduces polynomial equalities using Groebner bases for commutative semirings, rings, and fields; the paper’s examples include a fourth-power identity and `BitVec 8`, where arithmetic is modulo characteristic 256 (Sect. 3, p. 110). The linear arithmetic solver handles `NatModule` and `IntModule` structures and ordered variants. A `lia` solver handles linear integer arithmetic for types admitting `ToInt`; `UInt32` is mapped to `[0, 2^32)` (Sect. 3, p. 110).

Steps (reconstructed by the study author; the paper states only that a solver activates automatically for any type providing the required instances and that solvers share equalities through the congruence closure core, and the numbered sequence is the study author's gloss): (1) inspect typeclass instances; (2) activate the matching satellite solver; (3) normalize the theory expression; (4) produce equalities or inequalities; (5) share results through congruence closure; (6) let other satellites consume the new facts. Theory combination is demonstrated by a ring solver deriving an equality, congruence closure rewriting two applications of `f`, and linear integer arithmetic closing the result (Sect. 3, p. 111).

Inference: Verus/Z3 has arithmetic theories over Rust integer models, but not Lean’s typeclass-polymorphic solver activation. A Verus frontend could select lemma libraries by Rust trait or specification type, while keeping arithmetic proof obligations in `assert` and `ensures`; the paper does not establish that this architecture is available in Verus.

## technique 6: plugin extensibility

The built-in solvers use a plugin interface also available to users. A plugin declares an internalizer called when terms enter the E-graph and equality handlers called on equalities and disequalities (Sect. 3, p. 111). Because the interface is defined in Lean, a domain solver can be added without privileged access to grind internals (Sect. 3, p. 111).

## technique 7: interactive diagnosis and stable scripts

When automation fails, `grind =>` exposes a DSL for invoking individual solver steps, E-matching, case splits, equivalence-class inspection, and new hypotheses. `grind?` emits a self-contained script listing the exact theorems and steps used; the paper gives a two-step example that instantiates only `trig_identity` and then invokes the ring solver (Sect. 4, p. 111). The generated script does not depend on environment annotations, improving stability across library updates (Sect. 4, p. 111).

## evidence, limits, and trust

As of February 2026, Mathlib used grind approximately 3,400 times across 2,400 theorems; about 1,200 were initially authored with grind and about 1,200 were refactored after its release. Those refactors averaged a 28% reduction in lines of code, with approximately 50 theorems reduced by at least 10 lines (Sect. 6, p. 112). Inference: the denominator for usage is the stated 2,400 theorems and for the line reduction the approximately 1,200 refactored theorems; the paper does not say whether the 28% is a per-theorem or aggregate average, and it reports no randomized baseline, proof-time data, or distribution. CSLib, the Prime Number Theorem project, and Analysis I each used grind around 500 times (Sect. 6, p. 112).

The implementation is about 40,000 lines of Lean and has no external dependencies (Sect. 1, p. 107). The paper states that every proof term is checked by Lean’s kernel (Sect. 1, p. 107). Inference: the paper’s claims are therefore bounded by Lean’s kernel, elaborator, library declarations, and the correctness of the generated proof terms. Inference: for agent-written verified Rust, the threat is reduced when every automation result is replayable and checked, but specification errors, incorrect Rust/Verus modeling, and untrusted external code remain outside this evidence.

## techniques for the catalog

- native congruence closure: maintain equality classes over normalized dependent terms and propagate equality through applications
- annotated E-matching: instantiate lemmas only when indexed patterns match modulo known equalities
- constrained instantiation: use guards, structural conditions, bounds, and count limits to prevent redundant theorem generation
- structure-directed splitting: split `if`, `match`, and inductive constructors while propagating branch facts
- typeclass-parametrized theories: activate ring, order, and arithmetic solvers from algebraic interfaces rather than hardcoded types
- solver plugins: extend automation through internalizers and equality/disequality handlers at a narrow API boundary
- replayable diagnostics: inspect solver state interactively and emit self-contained proof scripts for stable maintenance
