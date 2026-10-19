# First-Class Refinement Types for Scala
(authored by agents unless marked 🧑)
Tag: `bovel2026firstclass`, [paper](https://doi.org/10.1145/3839541)

## purpose and scope

The paper makes logical refinements ordinary Scala 3 types. A refinement restricts a base type with a predicate, such as even integers or a vector whose length equals a value. The design keeps refinements in Scala's existing type checker so they participate in subtyping, type inference, bounded polymorphism, overloading, implicits, and pattern matching. The authors summarize the design as: “Here, Int with x % 2 == 0 is a regular Scala type: it participates in subtyping, generics, pattern matching, type bounds, overloading, and implicits, eliminating the two-mental-models problem.” (Section 1.1, p. 2).

The paper presents three results: a core-calculus soundness proof mechanized in Rocq, a Dotty prototype, and compilation benchmarks. Its predicates have partial-correctness semantics: a predicate that diverges never produces a false result, so the refinement check does not require global termination. Inference: this is a type-safety design under an explicit semantic convention, not a complete functional verifier for arbitrary Scala or Rust.

## technique 1: first-class refinement syntax and dependent signatures

What it is. The design adds a long form `{x: T with p(x)}` and a short form `T with p` that reuses an enclosing name. Predicates reuse ordinary Scala expression syntax within a restricted fragment; purity of called functions remains an assumption of the prototype.

When to use it. Inference: use a refinement when an API's result or argument carries a value relation that callers should use through ordinary type checking, such as vector lengths, bounds, or sortedness.

How to do it.

1. Choose a base type and a predicate over a bound value. The long form binds a fresh value name; the short form reuses the value's existing name (Section 2.1, p. 4).
2. Put the refinement in a parameter or result type. Figure 3 gives `fill` returning `{r: Vec[T] with r.len == n}`, `concat` returning a length sum, and `zip` requiring equal lengths (Section 2.1, p. 4).
3. Let ordinary subtyping and generic inference propagate the relation. Figure 1 uses `maximum[T: Ordering, U <: T]` on `List(2, 4, 6)` and checks the result against `Even` (Section 1.1, p. 3).
4. Use the refinement in overload selection. Figure 2 dispatches a sorted-list argument to an O(1) overload and an arbitrary list to an O(n) overload (Section 1.1, p. 3).

Verus form. Inference: a possible adaptation is to state vector-length relations as function preconditions and postconditions and prove preservation through concatenation and zip. The paper does not establish how this adaptation would interact with Rust type inference.

Evidence and limits. The paper's examples are type-checking examples, not a runtime benchmark. Predicates are deliberately restricted to constants, stable identifiers, field selection over immutable fields, applications, case-class constructors without initializers, Boolean operations, comparisons, and arithmetic (Section 2.2, p. 5). The implementation currently does not enforce purity of called functions: “We do not currently enforce purity of called functions: our solver assumes all functions are pure, so using an impure function in a predicate is a silent logical error.” (Section 2.2, p. 5). Inference: a Rust verifier should make purity and mutation assumptions explicit rather than relying on a solver convention.

## technique 2: partial-correctness semantics for possibly diverging predicates

What it is. A term has refinement type `{x: T with p(x)}` when every terminating evaluation produces a value satisfying `p`. Predicates themselves may diverge. The paper states: “Our system uses a partial-correctness semantics: a term e has type {x: T with p(x)} if, whenever e terminates with a value v, the predicate p(v) holds.” (Section 2.3, p. 5).

When to use it. Inference: use this semantics when requiring termination proofs for every predicate would block adoption in a general-purpose language. Keep termination obligations only where a specific entailment rule needs them.

How to do it.

1. Interpret a refinement operationally: evaluate its predicate; if it terminates, it must be true (Section 2.3, p. 6).
2. Treat a diverging predicate as vacuously satisfied, equivalent to `true` for subtyping purposes, while ruling out any terminating term of a refinement type with predicate `false` (Section 2.3, pp. 6–7).
3. Define semantic implication `Γ ⊨ p1 ⇒ p2` separately and use it in refinement subtyping (Section 2.3, p. 6).
4. Attach termination premises only to rules that need them. The paper gives `(t && false) ⇒ false` only under a termination premise and proves that dropping `true` needs none (Section 2.3, p. 6).

Verus form. Inference: an adaptation could use a total specification predicate and a separate executable check, or model partial computation explicitly. Transferring the paper's divergence convention would require its own operational argument; the paper establishes this convention for its Scala core calculus.

Evidence and limits. The Rocq mechanization proves the stated semantic lemmas, including that a diverging predicate is vacuous (Lemma 2.3, Section 2.3, p. 6). The implementation's solver nevertheless assumes termination of called predicate functions (Section 2.3, p. 7), and a termination checker is future work. Inference: the metatheory and prototype have different trust boundaries; a production checker must not silently identify them.

## technique 3: mixed-precision inference with equality facts and selfification

What it is. Instead of inferring maximally precise refinements everywhere, the type checker keeps ordinary Scala widening and recovers precision when a refinement is required. The calculus records equalities for `val` bindings; the prototype instead follows existing symbol-to-definition links on demand (Section 4.1, p. 20). Both recover precision through selfification against an expected refinement.

When to use it. Inference: use this approach when precise inference would change overload or implicit resolution, enlarge types, or make diagnostics unusable.

How to do it.

1. In the calculus, on `let x = e1`, record an equality fact `x ∼ e1` in the typing context (Section 2.4, p. 7).
2. When a later predicate mentions `x`, substitute the recorded definition as needed. The paper's `mPlusN = m + n` remains an `Int`, while the equality allows a vector-length obligation to use `m + n` (Section 2.4, p. 7).
3. When an expression `e` of type `T` is checked against a refinement, assign it `{x: T with x == e}` through selfification when `e` is a valid predicate term (Section 2.4, p. 7). The core rule additionally requires a first-order type supporting equality: Unit, True, False, Int32, or their refinements (Section 3.4, p. 15).
4. Keep unannotated code's inferred types unchanged; recover only the facts needed by a particular obligation.

Verus form. Inference: a possible adaptation is to preserve ordinary Rust types and expose local equalities through ghost facts, assertions, or helper-function postconditions when a proof obligation needs them.

Evidence and limits. The paper motivates mixed precision with backward compatibility, performance, and usability concerns (Section 2.4, p. 7). It does not report a separate failure rate for inference; the implementation benchmarks measure compilation overhead overall. Inference: the technique's benefit is supported by the unchanged behavior of code that does not use refinements, but not by a controlled comparison of inference quality.

## technique 4: runtime fallback and effect-safe argument handling

What it is. Static checking is the default. When explicitly requested, refinement pattern matching and `.runtimeChecked` evaluate a predicate at runtime (Section 2.5, pp. 7–8). Because dependent predicates can refer to earlier arguments, the compiler also hoists arguments and assigns skolems to non-variable expressions.

When to use it. Inference: use runtime checks at an explicit boundary where static entailment is unavailable, and use hoisting when evaluating a dependent predicate must not repeat an impure or effectful argument.

How to do it.

1. For a refinement pattern, test the base type and then evaluate the predicate; branch to the refined case only when it holds (Section 2.5, pp. 7–8; Section 4.1, p. 20).
2. For `.runtimeChecked`, evaluate the predicate and throw an exception if it returns false (Section 2.5, p. 8).
3. Hoist an argument referenced by a qualifier in another parameter's type or the return type into a local `val`, so the predicate does not evaluate it twice (Section 4.2, p. 20).
4. For a non-variable argument, create a fresh skolem `?k`, substitute it into the dependent return type, and add `?k == e` when `e` is in the supported predicate fragment (Section 4.2, pp. 20–21).
5. Remove skolems from escaping result types with `avoid` (Section 4.2, p. 21).

Verus form. Inference: an adaptation could use an executable wrapper that evaluates arguments once, checks a condition, and calls a verified function only on success. The wrapper would need a proof that its executable check establishes the function's precondition.

Evidence and limits. Dynamic checks support only first-order predicates that can be evaluated directly; higher-order values cannot be checked eagerly. JVM erasure also prevents direct matching against parameterized refinement types such as `List[ID]` (Section 2.5, p. 8). The paper's own purity checker rejects mutable variable references in predicates but does not yet enforce purity of called functions (Section 2.2, p. 5). Inference: a runtime fallback can hide a specification problem if the predicate is effectful, so VL should require an explicit effect boundary.

## technique 5: Rocq semantic soundness proof

What it is. The core calculus combines dependent functions and pairs, bounded polymorphism with lower and upper bounds, sums, unions, intersections, refinements, loops, and positive equi-recursive types. Integers use signed 32-bit wrapping semantics (Section 3.1, pp. 8–9). It is mechanized with a fuel-bounded definitional interpreter and semantic typing. Types are interpreted as predicates on values; semantic typing and subtyping quantify over well-formed environments.

How to do it.

1. Define a fuel-bounded evaluator returning timeout, stuck, or a value (Section 3.2, pp. 10–12, Figure 7). Fuel bounds evaluation depth rather than the total number of steps (p. 11).
2. Interpret each type as a semantic predicate over values and each term as a partial-correctness assertion (Section 3.3, pp. 12–14, Figure 8).
3. Interpret a recursive type as the intersection of all finite approximations, starting at the universal set of values. This removes any external step counter from the final value interpretation (Section 3.3, p. 13).
4. Define semantic typing, subtyping, and predicate implication (Section 3.3, pp. 13–14, Figure 8).
5. Prove weakening, substitution, avoidance, monotonicity, and distribution lemmas (Section 3.6, pp. 18–19). Recursive fold/unfold subtyping requires strict positivity: the recursive variable cannot occur in function domains or universal bounds, is absent from unions, and cannot occur inside a nested recursive type (Sections 3.5–3.6, pp. 16–19, Figure 11).
6. Prove adequacy of the inductive syntactic typing and subtyping judgments. The authors state: “The adequacy theorems show that these syntactic judgments imply their semantic counterparts.” (Theorems 3.1–3.2, Section 3.6, p. 18).
7. Conclude that well-typed terms do not get stuck and that subtyping preserves value interpretations (Section 3.6, pp. 16–18).

Verus form. Inference: a possible adaptation is to define a semantic model for a Rust API and prove its contracts and invariants against that model. This would require a separate proof; the Scala calculus's metatheory does not establish Rust API correctness.

Evidence and limits. The paper proves the core calculus only. The implementation is a prototype extension, and Scala features outside the formalized pure fragment are not covered by the theorem. The interpreter's fuel bounds evaluation depth, not total steps (Section 3.2, p. 11). Inference: a successful Rocq proof of the core does not prove the full Dotty implementation or the solver's rewrite correctness unless those components are separately related.

## technique 6: self-contained e-graph entailment solver

What it is. The prototype uses an approximately 600-line e-graph solver instead of an external SMT binary. It attempts to establish `P1 ⇒ P2` by collecting qualifiers, value equalities, and branch conditions, merging them with `true`, and checking whether `P2` becomes equivalent to `true` (Section 4.3, p. 21).

How to do it.

1. Collect only facts relevant to the predicate: qualifier predicates, `val` equalities, and branch outcomes (Section 4.1, p. 20; Section 4.3, p. 21).
2. Split disjunctive assumptions at the top level and insert facts into an acyclic e-graph that chooses one canonical representative per equivalence class (Section 4.3, p. 21).
3. Apply arithmetic, Boolean, beta, constructor-field, and `<` transitivity rewrites during canonicalization (Section 4.3, pp. 21–22).
4. Open both predicates' outermost bound variable with the same fresh free variable. Unopened bound variables never merge with other nodes; the opened free variable may participate in merges (Section 4.3, pp. 21–22).
5. Report entailment when the target predicate is equivalent to `true`.

Verus form. Inference: a VL front end could generate proof obligations and use a separate tactic or lemma library to normalize arithmetic and sequences, then require Verus to check the resulting `assert`. The e-graph itself would be trusted only if its rewrite soundness were proved or every result were replayed as a Verus proof. Inference: avoid treating a tactic success as a proof result.

Evidence and limits. The solver is intentionally less complete than full equality saturation: its canonical representative can miss an alternative simplification (Section 4.3, p. 22). The authors state: “As a consequence, several of Schmid’s benchmarks that require linear arithmetic reasoning (e.g., sumnat, arrfold) cannot be verified by our solver, and Stainless can verify functional correctness properties well beyond what refinement types alone can express.” (Section 4.4, p. 24). Table 1 also lists programs named `sumnat` and `arrfold` for First-class; the passage concerns several of Schmid's benchmarks rather than claiming that every program with these names is unsupported. This is a concrete expressiveness limit.

## measurements and denominators

Compilation overhead uses JMH: 150 single-shot warm-up iterations, 20 measurement iterations, and 10 independent runs. Each system uses its own unchecked baseline; Table 1 reports mean per-run means with 95% Student-t confidence intervals (Section 4.4, p. 22). The table contains 21 First-class rows, with absolute overheads from −1 ± 3 ms (`fansi`, baseline 187 ± 3 ms) to 14 ± 2 ms (`maxGenBig`, baseline 109 ± 2 ms) (Table 1, p. 23). The authors report: “On our benchmarks, our system (labelled “First-class” in the table) adds modest overhead: 0–12% of the baseline compilation time.” (p. 22). Inference: this is approximate; the displayed `maxGenBig` means give about 12.8%. For comparison, `intarray` has baseline/overhead 94 ± 1 / 3 ± 1 ms for First-class, 75 ± 1 / 19 ± 2 ms for Schmid, and 68 ± 1 / 45 ± 2 ms for Stainless (Table 1, p. 23).

The Fansi case replaces three run-time `require` checks with a refinement alias; its compilation-time difference is within measurement noise. The prose describes a 1,000-line library, while Table 1 lists 530 LoC for the benchmark (Section 4.4, pp. 22–23). These are the paper's two reported size descriptions.

For existing code, the authors report: “It passes unchanged: this includes compiling the Scala compiler itself (∼200 000 lines of code), its ∼10 000 compilation tests (∼300 000 lines), and a community build of 50 open-source projects (∼700 000 lines), indicating that the extension introduces no backward incompatibility.” The official compiler benchmark suite slowed by at most 4% on 11 Big benchmarks totaling about 70,000 lines and 20 Small benchmarks (Section 4.4, p. 23). Inference: these results provide evidence about compilation compatibility and overhead on the tested code; they do not establish every refinement predicate's correctness.

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
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This is exactly what the implementation does via skolems (§4.2), which hoist arguments to local bindings so that dependent result types can refer to them by name."): checked all paper text, study quotations, numbers, section/page references, technique steps, and proof/prototype limits; corrected references, the 21-row count, bound-variable handling, selfification and runtime restrictions, qualified overhead claims and Rust adaptations; did not run the artifact, compiler, benchmarks, or Rocq proofs, or independently validate Verus adaptations.
