# Program Synthesis from Polymorphic Refinement Types
(authored by agents unless marked 🧑)
Tag: `polikarpova2015program`, [paper](http://arxiv.org/abs/1510.08419v3)

## scope and contribution

Polikarpova, Kuraj, and Solar-Lezama present Synquid, a synthesizer for recursive functional programs whose specifications are polymorphic refinement types. The paper's central claim is that refinement types combine expressive specifications with decidable checking and can be decomposed while searching. The abstract states: “We present a method for synthesizing recursive functions that provably satisfy a given specification in the form of a polymorphic refinement type.” (§abstract, p.1) The system uses a core ML-like language with conditionals, algebraic data types, pattern matching, parametric polymorphism, and fixpoints, with quantifier-free arrays, uninterpreted functions, and linear integer arithmetic as its refinement logic (§2, p.3).

Inference: the directly reusable lesson for Verus is to make a specification drive candidate generation and local proof obligations, rather than generate Rust first and verify only at the end.

## technique: polymorphic refinement-type specifications

What it is. A type has a base type refined by a predicate over a distinguished result variable ν, and dependent function types can mention earlier arguments. For example, the paper gives `replicate :: n : Nat → x : α → {ν : List α | len ν = n}` (§1, pp.1–2). `Nat` is `{ν : Int | ν ≥ 0}` and `len` is a list measure. Parametricity supplies an implicit content guarantee: because α is abstract, the implementation cannot construct α values other than its x argument (§1, p.2).

When to use it. Use a refinement type when the desired behavior is an inductive relation such as length, sortedness, set membership, or a representation invariant, and when the property can be expressed in the decidable refinement logic. The specification is concise for operations whose abstract effect is simple even when their representation is complex (§4.3, p.15).

How to apply it (paper procedure).
1. Define data constructors with refined result types and define measures such as `len`, `keys`, or `size`; a measure can also be the termination metric (§2, p.3; Example 2, pp.4–5).
2. Write a dependent function signature whose result refinement states the postcondition (for example, `insert :: x: α → t: BST α → {BST α | keys ν = keys t + [x]}`; §2, p.4).
3. Supply a component environment (constructors, library functions, local variables) and a qualifier set; Synquid extracts an initial qualifier set from goal and component types, although extra predicates may be supplied by the user (§2, p.3).
4. Let synthesis decompose the goal and infer unknown refinements; every candidate is finally checked by refinement subtyping (§2, p.3).

Verus form. Inference: encode the postcondition as `ensures` on an executable Rust function, represent measures as `spec fn` over mathematical views, and use `requires` for preconditions. Use `forall`/`exists` only where supported by the Verus guide; do not assume Synquid's polymorphic type inference exists in Verus. A Rust function's type parameters and trait bounds carry the parametric part, while explicit `ensures` clauses carry refinements. The paper's dependent result type itself does not carry over syntactically.

Evidence and limits. Synquid synthesized and fully verified all 64 benchmarks (§4.2, p.14), including sorting, binary-search trees, AVL trees, and red-black trees. The paper reports that all but seven benchmarks finished within five seconds, and only three failed to terminate within a two-minute timeout under shared default bounds (§4.2, pp.14–15). The refinement logic cannot express some nested representation-specific transformations or filtering examples (§4.3, p.15). Its type variables are restricted to scalar types, a deliberate decidability restriction (§3, p.7).

## technique: specification decomposition and round-trip checking

What it is. Synquid alternates top-down propagation of the goal with bottom-up inference of subterm types. Its “round-trip” checker strengthens an E-term with an over-approximate goal for each subterm, then checks the inferred result against the original goal. The paper explains: “A round-trip type checker starts with a top-down phase, just as a bidirectional one would; when it encounters an E-term, it applies the corresponding strengthening rule and discards the inferred type.” (§3.2, p.8)

When to use it. Use decomposition when a constructor, lambda, application, conditional, or match exposes independent obligations. It prevents a failed global check from discarding useful information and detects errors at variable and application sites (§3.2, p.8). For a known conditional guard, pass the goal to both branches with guard and negated-guard path conditions (§1, p.2).

How to apply it (paper procedure).
1. Normalize candidates into the E/I-term form: variables and applications are E-terms; lambdas, fixpoints, conditionals, and matches are I-terms. Branching is kept out of application arguments (§3, p.6).
2. Start with the top-level goal schema and apply checking rules to I-terms. For a lambda, bind its argument and check the body; for a conditional, infer the Boolean guard and check branches under complementary path conditions (Fig. 4, p.8).
3. At an E-term, propagate an over-approximate type to operands, infer their precise types, and issue a subtyping constraint. Function application uses a contextual type to retain the precise argument type (§3.2, pp.8–9).
4. Reject when subtyping or type consistency is unsatisfiable. Type consistency additionally rejects impossible partial applications; the paper's `append xs` example is rejected because `len xs = 6 ∧ len r ≥ 0 ∧ len ν = len xs + len r ∧ len ν = 5` is unsatisfiable (§3.4, p.10).

Verus form. Inference: mirror the decomposition with helper proof functions and local lemmas. Put path conditions in `requires`/`ensures`, use `assert` at application boundaries, and expose a mathematical view of data structures. Verus has no Synquid E/I-term checker, so decomposition is a proof-organization pattern rather than a compiler algorithm; `assert` and lemma calls replace inferred contextual types.

Evidence and limits. Removing round-trip checking caused 33 of 64 benchmarks to time out, according to the ablation in §4.2 (p.15). The completeness theorem is relative to bottom-up liquid inference and a weakened termination rule (§3.3, p.9), so it is not an unrestricted completeness result.

## technique: liquid abduction for branches and matches

What it is. Instead of enumerating guards first, Synquid analyzes a candidate branch and abduces the weakest liquid path condition under which the branch satisfies the goal. The paper states: “The idea comes from condition abduction: instead of starting with the guard, for which no information can be extracted from the goal type, start by analyzing one of the branches and use logical abduction to infer the weakest assumption under which the branch fulfills the goal type.” (§3.4, p.10)

When to use it. Use it for conditionals whose correct guard can be inferred from a branch's postcondition, such as `replicate`'s `n ≤ 0` base case or BST insertion's empty-tree case. Liquid formulas restrict the search to conjunctions of instantiated qualifiers, making abduction finite (§3.4, p.10).

How to apply it (paper procedure).
1. Choose a branch-free E-term candidate for the first branch and check it against the goal under an unknown path predicate P.
2. Generate Horn constraints for P and use the greatest-fixpoint solver to find the weakest liquid valuation satisfying them (§3.4, p.10; §3.6, p.11).
3. If P is inconsistent, discard the candidate; if P is true, no branch is needed; otherwise synthesize the guard with type `{Bool | ν = P}`, check the first branch under P, and synthesize the second under `¬P` (§3.4, p.10; §3.7, p.12).
4. For a pattern match, first try match abduction when the scrutinee is a variable with a scalar constructor; fall back to ordinary matching if the restriction fails (§3.4, p.10).

Example. For `replicate`, trying `Nil` yields constraints whose weakest assignment is `P0 ↦ n ≤ 0`; Synquid then synthesizes the remaining branch under `¬(n ≤ 0)` and recursively applies `replicate` with a strictly smaller n (§2, pp.3–4).

Verus form. Inference: write the guard explicitly in Rust and prove each branch's `ensures`; use `if` plus branch-local `assert` and lemmas. Verus will not synthesize a weakest guard. A reusable lemma can characterize the branch condition, but its statement and proof must be supplied manually.

Evidence and limits. With naive breadth-first Horn search instead of MUSFIX, 37 of 64 benchmarks timed out (§4.2, p.15). Liquid abduction excludes guards containing function composition; wrapper components are required (§3.4, p.10). Match abduction is limited to variable scrutinees and datatypes with at least one scalar constructor (§3.4, p.10).

## technique: incremental liquid constraint solving and MUSFIX

What it is. Local liquid checking keeps subtyping constraints, Horn constraints, type assignments, and liquid assignments incrementally. When scalar subtyping produces a Horn implication, the solver strengthens predicate unknowns. MUSFIX computes a greatest-fixpoint assignment by enumerating minimal unsatisfiable subsets (MUSes), rather than breadth-first enumerating all qualifier subsets (§3.5–3.6, pp.11–12).

When to use it. Use this architecture when type shapes and refinements become known at different times, and when abduction produces many candidate predicates. Incremental unification allows early errors. The paper says: “This novel feature of local liquid type checking, which we call incremental unification, is crucial for early error detection.” (§3.5, p.11).

How to apply it (paper procedure).
1. Replace polymorphic type variables with fresh free variables and create fresh predicate unknowns for refinements (§3.5, p.11).
2. Decompose each subtyping constraint by unification, function/domain decomposition, datatype decomposition, or scalar refinement implication (Fig. 6, p.11).
3. Add scalar implications to the Horn set and invoke `Horn` after each new constraint; terminate when all constraints are between free type variables (§3.5, p.11).
4. On an invalid implication, enumerate MUSes of qualifiers plus the negated consequent, partition each MUS into predicate valuations, strengthen the current assignment, and recurse (§3.6, p.12).

Verus form. Inference: the analogue is staged lemma proving: first establish structural equalities and ownership facts, then invoke arithmetic or set lemmas, and retain each fact as a proof invariant. Verus's SMT backend can discharge quantifier-free arithmetic, but there is no user-facing predicate-unknown/MUSFIX API; implementing MUSFIX would require an external synthesis layer that emits Rust proof obligations.

Evidence and limits. MUSFIX is the largest ablation effect: replacing it with breadth-first search timed out 37/64 benchmarks; round-trip removal timed out 33/64 (§4.2, p.15). The solver's precision is limited to the supplied qualifier set (§3.6, p.12), and the paper's soundness depends on decidable validity checks in its refinement logic (§3.1, p.7).

## technique: termination weakening and invariant inference

What it is. Recursive calls receive a termination-weakened type requiring strictly smaller arguments. Primitive well-founded orders and user-defined datatype measures are combined lexicographically (§3.2, p.9). In BST insertion, polymorphic recursion plus Horn solving infers an inductive sortedness invariant: the recursive call under key y is instantiated with a type restricted by `y < ν` (§2, pp.4–5).

How to apply it (paper procedure).
1. Mark a datatype measure such as `size` or `len` as a well-founded termination metric (§2, p.3).
2. At a recursive fixpoint, weaken the recursive function's argument type to require a strict decrease (§3.2, p.9).
3. During recursive application, propagate the caller's path and constructor refinements; solve the resulting polymorphic subtype to infer the strengthened invariant (§2, pp.4–5).
4. Reject candidates whose termination proof cannot be shown (§3.3, p.9).

Verus form. Inference: use a `decreases` clause on the recursive function and prove strict decrease with `assert` or a lemma. State the BST invariant in `requires`/`ensures` and prove it for each constructor branch. Verus does not infer the invariant automatically; the invariant must be written in the specification.

Evidence and limits. The paper reports that Synquid synthesized BST, AVL, and red-black-tree operations whose invariant discovery was beyond the compared Hoare-style tools (§4.3, p.15). Completeness is only for bounded application/match depth and a weakened termination checker (§3.7, p.12).

## what is proved, measured, and trusted

The paper proves soundness and relative completeness theorems for round-trip checking (§3.3, pp.9–10), and reports full verification of 64/64 benchmarks (§4.2, p.14). Measurements include AST sizes, specification sizes, and synthesis times in Table 1; “-” denotes a two-minute timeout or out-of-memory (Table 1 caption, p.13). Comparison times came from different hardware, and the authors say only order-of-magnitude differences are significant (§4.3, p.15). The trusted base includes the refinement-logic validity/SMT solver, the datatype and measure declarations, supplied components and qualifiers, and the implementation of Synquid. Inference: for VL, all Rust compiler, Verus, SMT, external-body lemmas, and trusted specifications would remain in the trusted computing base.

The paper does not claim that every program is synthesizable: examples outside its logic were not expressible, guard and match abduction have syntactic restrictions, and search is bounded. The paper also says its type-based specifications can be more concise than implementations, but this does not establish that writing the refinements is cheaper for arbitrary Rust APIs. Inference: agent-written verified Rust faces a high threat when specifications are underspecified or qualifiers omit a needed invariant; Synquid's fully verified benchmark results do not measure errors in a production-scale, effectful Rust codebase.

## what VL should reuse and avoid redoing

Inference: VL should reuse the separation between structural decomposition, local SMT obligations, explicit termination measures, and invariant-carrying views. A synthesis front-end could emit Verus skeletons and proof obligations from a refinement-like contract. VL should not reimplement a general Synquid clone before measuring whether Verus's existing `requires`, `ensures`, `decreases`, `assert`, `invariant`, `spec fn`, and lemma mechanisms cover its workload. The paper's ablation already establishes that local checking and efficient abduction are decisive for scale; a VL implementation should benchmark those costs rather than assume enumeration is adequate.

## techniques for the catalog

- polymorphic refinement specifications — express recursive behavior as dependent, parametric result refinements checked in decidable logic
- round-trip type checking — propagate goal types down and inferred types back up to reject candidates locally
- liquid condition abduction — infer weakest qualifier-bounded branch predicates from a branch's required postcondition
- incremental liquid solving — interleave type-shape unification with refinement constraints for early rejection
- MUSFIX greatest-fixpoint solving — enumerate minimal unsatisfiable subsets to solve liquid Horn constraints efficiently
- measure-based termination — attach well-founded datatype measures and require strict decrease on recursive calls
- polymorphic invariant inference — use recursive type instantiation and Horn constraints to infer data-structure invariants
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
