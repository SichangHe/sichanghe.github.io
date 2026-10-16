# First-Class Refinement Types for Scala
(authored by agents unless marked 🧑)
Tag: `bovel2026firstclass`, [paper](https://doi.org/10.1145/3839541)

## purpose and scope

The paper makes logical refinements ordinary Scala 3 types. A refinement restricts a base type with a predicate, such as even integers or a vector whose length equals a value. The design keeps refinements in Scala's existing type checker so they participate in subtyping, type inference, bounded polymorphism, overloading, implicits, and pattern matching. The authors summarize the design as: “Here, Int with x % 2 == 0 is a regular Scala type: it participates in subtyping, generics, pattern matching, type bounds, overloading, and implicits” (Section 1.1, p. 2).

The paper has three distinct results: a core-calculus soundness proof mechanized in Rocq, a Dotty prototype, and compilation benchmarks. Its predicates have partial-correctness semantics: a predicate that diverges never produces a false result, so the refinement check does not require global termination. Inference: this is a type-safety design under an explicit semantic convention, not a complete functional verifier for arbitrary Scala or Rust.

## technique 1: first-class refinement syntax and dependent signatures

What it is. The design adds a long form `{x: T with p(x)}` and a short form `T with p` that reuses an enclosing name. Predicates reuse ordinary Scala expression syntax but are restricted to a pure fragment.

When to use it. Use a refinement when an API's result or argument carries a value relation that callers should use through ordinary type checking, such as vector lengths, bounds, or sortedness.

How to do it.

1. Choose a base type and a predicate over a bound value. The long form binds a fresh value name; the short form reuses the value's existing name (Section 2.1, pp. 4–5).
2. Put the refinement in a parameter or result type. Figure 3 gives `fill` returning `{r: Vec[T] with r.len == n}`, `concat` returning a length sum, and `zip` requiring equal lengths (Section 2.1, p. 4).
3. Let ordinary subtyping and generic inference propagate the relation. Figure 1 uses `maximum[T: Ordering, U <: T]` on `List(2, 4, 6)` and checks the result against `Even` (Section 1.1, p. 3).
4. Use the refinement in overload selection. Figure 2 dispatches a sorted-list argument to an O(1) overload and an arbitrary list to an O(n) overload (Section 1.1, p. 3).

Verus form. Inference: represent a refined Rust value with a `spec fn` predicate over the value and put the relation in `requires` and `ensures`. For a vector length API, use a ghost length or sequence and prove `ensures result.len() == n`; use `proof fn` lemmas for concatenation and equal-length zip. Inference: Verus contracts do not automatically become Rust subtypes or participate in Rust overload resolution, so an agent must preserve the relation through explicit function contracts and proof calls.

Evidence and limits. The paper's examples are type-checking examples, not a runtime benchmark. Predicates are deliberately restricted to constants, stable identifiers, field selection over immutable fields, applications, constructors without initializers, Boolean operations, comparisons, and arithmetic (Section 2.2, p. 5). The implementation currently does not enforce purity of called functions: “our solver assumes all functions are pure, so using an impure function in a predicate is a silent logical error.” (Section 2.2, p. 5). Inference: a Rust verifier should make purity and mutation assumptions explicit rather than relying on a solver convention.

## technique 2: partial-correctness semantics for possibly diverging predicates

What it is. A term has refinement type `{x: T with p(x)}` when every terminating evaluation produces a value satisfying `p`. Predicates themselves may diverge. The paper states: “Our system uses a partial-correctness semantics: a term e has type {x: T with p(x)} if, whenever e terminates with a value v, the predicate p(v) holds.” (Section 2.3, p. 5).

When to use it. Use this semantics when requiring termination proofs for every predicate would block adoption in a general-purpose language. Keep termination obligations only where a specific entailment rule needs them.

How to do it.

1. Interpret a refinement operationally: evaluate its predicate; if it terminates, it must be true (Section 2.3, p. 6).
2. Treat a diverging predicate as vacuously satisfied, equivalent to `true` for subtyping purposes, while preventing a terminating computation from being typed as `false` (Section 2.3, pp. 6–7).
3. Define semantic implication `Γ ⊨ p1 ⇒ p2` separately and use it in refinement subtyping (Section 2.3, p. 6).
4. Attach termination premises only to rules that need them. The paper gives `(t && false) ⇒ false` only under a termination premise and proves that dropping `true` needs none (Section 2.3, p. 6).

Verus form. Inference: Verus specifications are mathematical and do not have the same runtime divergence interpretation. A corresponding design would use a total `spec fn` predicate and a separate executable check, or model a partial computation with an explicit result type. Use `requires`/`ensures` to state the relation and a `proof fn` to prove entailment. Inference: treating divergence as truth would be unsound for an executable Rust API unless the divergence behavior is represented explicitly and never erased.

Evidence and limits. The Rocq mechanization proves the stated semantic lemmas, including that a diverging predicate is vacuous (Lemma 2.3, Section 2.3, p. 6). The implementation's solver nevertheless assumes termination of called predicate functions (Section 2.3, p. 7), and a termination checker is future work. Inference: the metatheory and prototype have different trust boundaries; a production checker must not silently identify them.

## technique 3: mixed-precision inference with equality facts and selfification

What it is. Instead of inferring maximally precise refinements everywhere, the type checker keeps ordinary Scala widening and recovers precision when a refinement is required. It records equalities for `val` bindings and selfifies an expression against its expected refinement.

When to use it. Use this approach when precise inference would change overload or implicit resolution, enlarge types, or make diagnostics unusable.

How to do it.

1. On `let x = e1`, record an equality fact `x ∼ e1` in the typing context (Section 2.4, p. 7).
2. When a later predicate mentions `x`, substitute the recorded definition as needed. The paper's `mPlusN = m + n` remains an `Int`, while the equality allows a vector-length obligation to use `m + n` (Section 2.4, p. 7).
3. When an expression `e` of type `T` is checked against a refinement, assign it `{x: T with x == e}` through selfification (Section 2.4, p. 7).
4. Keep unannotated code's inferred types unchanged; recover only the facts needed by a particular obligation.

Verus form. Inference: use ghost equalities and `assert`/lemma steps to relate a local value to its defining expression; preserve ordinary Rust types and put the recovered fact in a proof context. Use `ensures` on helper functions to expose equalities. Inference: Rust has no implicit selfification, so VL would need a transformation that inserts ghost facts or proof calls at contract boundaries.

Evidence and limits. The paper motivates mixed precision with backward compatibility, performance, and usability concerns (Section 2.4, p. 7). It does not report a separate failure rate for inference; the implementation benchmarks measure compilation overhead overall. Inference: the technique's benefit is supported by the unchanged behavior of code that does not use refinements, but not by a controlled comparison of inference quality.

## technique 4: runtime fallback and effect-safe argument handling

What it is. Static checking is the default. If the solver cannot discharge a predicate, refinement pattern matching and `.runtimeChecked` evaluate it at runtime (Section 2.5, pp. 7–8). Because dependent predicates can refer to earlier arguments, the compiler also hoists arguments and assigns skolems to non-variable expressions.

When to use it. Use runtime checks at an explicit boundary where static entailment is unavailable, and use hoisting when evaluating a dependent predicate must not repeat an impure or effectful argument.

How to do it.

1. For a refinement pattern, test the base type and then evaluate the predicate; branch to the refined case only when it holds (Section 2.5, p. 7).
2. For `.runtimeChecked`, evaluate the predicate and signal failure if it returns false (Section 2.5, p. 8).
3. Hoist an argument referenced by another parameter's qualifier into a local `val`, so the predicate does not evaluate it twice (Section 4.2, p. 20).
4. For a non-variable argument, create a fresh skolem `?k`, substitute it into the dependent return type, and add `?k == e` when `e` is in the supported predicate fragment (Section 4.2, pp. 20–21).
5. Remove skolems from escaping result types with `avoid` (Section 4.2, p. 21).

Verus form. Inference: use an executable wrapper that checks a precondition and then calls a verified function whose `requires` states the same predicate. Preserve one evaluation of effectful arguments in ordinary Rust; use ghost values only for proof relations. Inference: Verus's `requires` is checked statically and does not supply a general runtime refinement cast, so the wrapper must report failure before calling the verified function.

Evidence and limits. The paper's own purity checker rejects mutable references in predicates but does not yet enforce purity of called functions (Section 2.2, p. 5). Inference: a runtime fallback can hide a specification problem if the predicate is effectful, so VL should require an explicit effect boundary.

## technique 5: Rocq semantic soundness proof

What it is. The core calculus is mechanized with a fuel-bounded definitional interpreter and semantic typing. Types are interpreted as predicates on values; semantic typing and subtyping quantify over well-formed environments and terminating evaluations.

How to do it.

1. Define a fuel-bounded evaluator returning timeout, stuck, or a value (Section 3.2, pp. 12–13).
2. Interpret each type as a semantic predicate over values and each term as a partial-correctness assertion (Section 3.3, pp. 14–15).
3. Define semantic typing, subtyping, and predicate implication (Section 3.3, pp. 15–16).
4. Prove weakening, substitution, avoidance, monotonicity, and distribution lemmas (Section 3.6, pp. 18–19).
5. Prove adequacy of the syntax-directed typing and subtyping rules. The paper states: “Theorem 3.1 (Adeqacy of typing). If Γ ⊢ a : A then Γ ⊨ a : A.” (Section 3.6, p. 19).
6. Conclude that well-typed terms do not get stuck and that subtyping preserves value interpretations (Section 3.6, p. 18).

Verus form. Inference: the analogous VL proof should define a ghost semantic model for the Rust API, prove function contracts and data-structure invariants, and use `proof fn` lemmas for weakening and substitution-like transformations. Inference: Verus can verify a concrete Rust implementation against contracts, but it does not mechanize Scala's type calculus or replace Rocq's language metatheory.

Evidence and limits. The paper proves the core calculus only. The implementation is a prototype extension, and Scala features outside the formalized pure fragment are not covered by the theorem. The interpreter's fuel bounds evaluation depth, not total steps (Section 3.2, p. 13). Inference: a successful Rocq proof of the core does not prove the full Dotty implementation or the solver's rewrite correctness unless those components are separately related.

## technique 6: self-contained e-graph entailment solver

What it is. The prototype uses an approximately 600-line e-graph solver instead of an external SMT binary. It decides `P1 ⇒ P2` by collecting qualifiers, value equalities, and branch conditions, merging them with `true`, and checking whether `P2` becomes equivalent to `true` (Section 4.3, p. 21).

How to do it.

1. Collect only facts relevant to the predicate: qualifier predicates, `val` equalities, and branch outcomes (Section 4.1, p. 20; Section 4.3, p. 21).
2. Insert facts into an acyclic e-graph that chooses one canonical representative per equivalence class (Section 4.3, p. 21).
3. Apply arithmetic, Boolean, beta, constructor-field, and `<` transitivity rewrites during canonicalization (Section 4.3, pp. 21–22).
4. Open bound variables with fresh free variables and keep them from merging with other nodes (Section 4.3, p. 22).
5. Report entailment when the target predicate is equivalent to `true`.

Verus form. Inference: a VL front end could generate proof obligations and use a separate tactic or lemma library to normalize arithmetic and sequences, then require Verus to check the resulting `assert`. The e-graph itself would be trusted only if its rewrite soundness were proved or every result were replayed as a Verus proof. Inference: avoid treating a tactic success as a proof result.

Evidence and limits. The solver is intentionally less complete than full equality saturation: its canonical representative can miss an alternative simplification (Section 4.3, p. 22). The authors report that Schmid's and Stainless's SMT solvers verify linear arithmetic benchmarks such as `sumnat` and `arrfold` that their e-graph cannot (Section 4.4, p. 24). This is a concrete expressiveness limit.

## measurements and denominators

Compilation overhead uses JMH: 150 warm-up iterations, 20 measurement iterations, and 10 independent runs; Table 1 reports the mean of per-run means with 95% Student-t confidence intervals (Section 4.4, p. 22). On the listed benchmarks, the first-class prototype adds 0–12% of baseline compilation time; Schmid adds 20–38% and Stainless at least 56% on supported benchmarks (Section 4.4, p. 22). The table contains 20 First-class rows, with overheads from −1 ± 3 ms (`fansi`) to 14 ± 2 ms (`maxGenBig`) (Table 1, p. 23). The Fansi case is a 1,000-line library where replacing three runtime checks with a refinement alias changed compilation time within measurement noise (Section 4.4, p. 22).

For unchanged code, the full Dotty continuous-integration suite passed: about 200,000 lines of compiler code, 10,000 compilation tests totaling about 300,000 lines, and a community build of 50 projects totaling about 700,000 lines. The official benchmark suite slowed by at most 4% on 11 Big and 20 Small benchmarks (Section 4.4, p. 24). These denominators describe compilation compatibility and overhead; they do not establish that every refinement predicate is semantically correct.

## what is proved, trusted, and left unresolved

The Rocq theorem covers the core calculus's typing and subtyping rules under the operational, partial-correctness semantics. The Dotty integration and e-graph solver are implementation artifacts with separate assumptions. Called functions' purity and termination are trusted by the prototype solver; the authors identify purity enforcement and a termination checker as future work (Sections 2.2–2.3, pp. 5–7). Inference: a product must keep the contract/specification, solver rewrites, erasure, compiler, and external libraries in its trust inventory.

## what VL should reuse and threat to agent-written verified Rust

Inference: VL can reuse first-class API contracts, mixed-precision fact recovery, explicit purity restrictions, runtime fallback wrappers, and a small proof-replay layer. The core design suggests keeping ordinary Rust types stable while exposing ghost facts only where a contract needs them.

Inference: the threat to agent-written verified Rust is greatest at the solver boundary. A model may exploit an impure specification function, rely on an unproved arithmetic rewrite, or widen a type while preserving compilation. VL should keep `spec fn` predicates pure and reviewable, require Verus to check `ensures`, and treat solver or tactic output as a candidate proof step rather than authority.

## techniques for the catalog

- first-class refinement contracts — make value predicates ordinary API types that compose with subtyping and generic use
- partial-correctness predicates — interpret a refinement over terminating results and isolate termination-sensitive entailment rules
- mixed-precision inference — retain ordinary inferred types while recording equalities and selfifying values when precision is needed
- runtime refinement checks — fall back to predicate evaluation at explicit pattern or checked-call boundaries
- semantic soundness mechanization — prove typing and subtyping adequacy with a fuel-bounded interpreter and semantic types
- e-graph entailment — normalize collected equality, branch, and qualifier facts to discharge predicate implications
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
