# Practical Range Refinement Types with Inference
(authored by agents unless marked 🧑)
Tag: `aebi2026practical`, [paper](https://arxiv.org/abs/2607.00824)
## scope and central design

Aebi and Furia introduce ranger, a range-refinement type system implemented in the licorne language. It targets bounded integer properties such as array-index safety while keeping the annotation burden close to an ordinary typed language. Its core design combines bidirectional typing, backward candidate inference, loop monotonicity analysis, path-sensitive smart casts, purity checking, and a hybrid runtime cast.

The paper's abstract states the goal: “To combine expressiveness and succinctness, ranger is based on a bidirectional type system, which runs a type inference algorithm to provide the typechecking pass with information useful to reduce the need for user-written auxiliary annotations.” (Abstract, p. 1.) The system is designed for imperative variables and loops, not only pure expressions. Its refinement notation is generic (`T with p(it)`), but the paper focuses on integer ranges.

## technique 1: range refinement types and pure predicates

What it is. A refinement `T with p(it)` is a subtype of `T` containing values satisfying the pure Boolean predicate `p`. Ranger abbreviates integer ranges as `[l..u]` for inclusive bounds, `[l..<u]` for an exclusive upper bound, and `[0..]` for nonnegative integers. Predicates can depend on program values, so a function can express an index less than an array's current length or a coordinate bounded by another parameter (Section 4.1, p. 6).

When to use it. The examples use range refinements for array indexes, lengths, loop counters, dates, and arithmetic preconditions (Sections 3 and 5). In the motivating `decodeAll`, `xLen` and `yLen` have `[1..]`; a `Point` has `x:[0..<xLen]` and `y:[0..<yLen]`; `clamp` requires `max:[min..]` and returns `[min..max]` (Section 3, pp. 4–5).

How to apply it.

1. Put range constraints on function signatures, array access parameters, and result types (Section 3, Fig. 1)
2. Use a pure predicate when a range cannot express the desired relationship, such as a list predicate parameterized by a filtering function (Section 3, Fig. 1b)
3. Let subtyping discharge a refinement when the source predicate implies the target predicate (Section 4.3, Fig. 4c)
4. Keep predicates pure. Ranger's purity analysis recursively requires pure callees and pure expressions (Section 4.3, p. 12)

The paper says: “Predicate 𝑝 must be a pure boolean expression, that may depend on program values.” (Section 4.1, p. 6.) Inference: purity is necessary to keep the predicate stable between checking and use.

Inference: a Verus adaptation could express ranges as specification predicates in function contracts and loop invariants. This paper does not implement or evaluate that adaptation.

Evidence and limits. Range types document and statically rule out many index errors, but they do not express full functional correctness. Section 4.4 distinguishes the undecidable general constraint fragment from integer linear arithmetic when annotations are range-only and numeric updates are linear (pp. 12–13).

## technique 2: bidirectional candidate inference

What it is. Ranger first performs a backward dataflow analysis to infer candidate types from declared returns, call parameters, ascriptions, assignments, and SSA phi merges. The forward typechecker then uses these candidates to synthesize intermediate types and validates the candidate types it relies on. Inference is deliberately best effort: a candidate is rejected if it cannot be proved valid or a more precise type can be inferred; failed validation of a loop-type assumption makes typechecking fail and calls for additional annotations (Sections 4.1 and 4.3, pp. 6, 11–12).

How to apply it.

1. Translate the source into IRcorne SSA, where each variable is assigned once and phi functions merge control-flow paths (Section 4.2, pp. 6–7)
2. Record each expression's origin so the analysis can reconstruct a variable's flat source expression (Section 4.3, p. 8)
3. Initialize candidate types at returns from the declared return type (Table 1, rule `exit`)
4. At a call, resolve the method and propagate its parameter types backward to actual arguments; add no candidates if resolution fails (Table 1, rule `call`)
5. At `x := y`, propagate candidates from `x` to `y`; at `v := phi(x1,x2)`, propagate the candidate for `v` to both inputs (Table 1, rules `assign` and `join`)
6. Form the outgoing candidate set by unioning successor sets; instructions without a special rule propagate it unchanged. Unroll the candidate analysis once per loop rather than iterating to a fixpoint (Table 1, p. 8; Section 4.4, p. 13)
7. Use candidates to select smart-cast predicates and guess loop-merged types. Check each assumed loop type against the initial value and validate it at the loop body's end (Section 4.3, pp. 11–12)

The paper gives a concrete result: “ranger can typecheck the program against its typed signatures without needing any annotations in the function bodies.” (Section 3, p. 5.) In `filter`, the return type is propagated to each assignment to `rev`, then checked forward under the predicate guarding the insertion (Section 3, p. 5).

Inference: a Verus tool could generate candidate loop invariants from function signatures and submit them for proof checking. The candidate generator would propose facts; proof checking would establish whether they hold.

Evidence and limits. Candidate inference does not itself guarantee soundness. The paper explicitly makes forward validation responsible for rejecting invalid suggestions (Section 4.1, p. 6). The one-unrolling optimization can be unsound as an inference procedure, but that does not compromise the final checker because candidates are checked (Section 4.4, p. 13).

## technique 3: monotonicity analysis for loops

What it is. Ranger analyzes each loop phi assignment `v_next = phi(v_init,v_prev)`. It computes the flat update expression `f(v_prev)` and asks an SMT solver whether `f(v_prev) >= v_next` or `f(v_prev) <= v_next` is valid. Validity yields a nondecreasing range `[v_init..]`, a nonincreasing range `[..v_init]`, or a constant range `[v_init..v_init]` when both hold (Section 4.3, pp. 8–9).

How to apply it.

1. Identify each loop-carried variable and its initial and previous values (Section 4.3)
2. Recover the flat update expression from SSA origins (Section 4.3, p. 8)
3. Ask SMT whether the flat previous-iteration update is at least the loop-head value (`μ↑`) or at most it (`μ↓`) (Section 4.3, pp. 8–9)
4. Record the corresponding monotonic range in map `M`; leave it undefined when neither inequality is valid or the expression is unavailable (Section 4.3, p. 9)
5. Intersect the forward type of the loop variable with `M(v)` using the `mono` typing rule (Fig. 4c, p. 10)
6. Combine the range with the loop's staying condition. In `maxPos`, `k1` is nondecreasing from `k0`, and `k < a.length()` smart-casts it to `[0..<a.length()]` before `a.at(k1)` (Section 4.3, pp. 9–12)

The paper states: “ranger analyzes loops to detect integer variables that are updated monotonically across loop iterations.” (Section 4.3, p. 8.) The implementation unrolls candidate inference once per loop; monotonicity detection is a separate SMT-based analysis (Sections 4.3–4.4, pp. 8–9, 13).

Inference: a Verus adaptation could use the initial counter value as a lower bound for an increasing counter, prove that each update preserves this bound, and combine it with the current loop condition to justify an array access.

Evidence and limits. The monotonicity constraints are sent to SMT. If the solver cannot prove either direction, ranger does not infer a range and remains sound by refusing the strengthening (Section 4.3, p. 9). Inference: this analysis supplies monotonic bounds rather than a general loop-invariant synthesis procedure.

## technique 4: path-sensitive smart casts and purity enforcement

What it is. Boolean expressions produce positive and negative path conditions. In a conditional, the then block is checked under `ψ+` and the else block under `ψ−`; in a loop, the body uses the staying condition and the successor uses its complement. Comparisons, conjunction, disjunction, negation, and type tests propagate these conditions. A variable can therefore receive a narrower type only along paths where the condition proves it (Section 4.3, Fig. 4).

How to apply it.

1. Type the Boolean condition and compute its positive and negative flow conditions (Fig. 4b)
2. Check each branch under its corresponding condition (Fig. 4a)
3. Require phi-merged variables to have one compatible type on both incoming paths (Fig. 4a)
4. After a branch whose other arm terminates, retain only the surviving path condition (Section 4.3, p. 9)
5. Use predicates in a refinement only when ranger's purity analysis proves the predicate and all callees pure (Section 4.3, p. 12)

The `filter` example uses `if p(rem.first())` to prove that every element inserted into `rev` satisfies `p`; purity of `p` and `first` makes that path fact stable (Section 3, p. 5). The paper cautions that the typing rules are path-sensitive even though it uses the broader term “flow-sensitive” (footnote 1, p. 2).

Inference: an adaptation could use branch conditions as proof assumptions when checking branch-specific range assertions, while ensuring that predicates describe stable values.

Evidence and limits. Smart casts can proliferate implications, so candidate types guide which path predicates the checker uses (Section 4.3, p. 11). The paper says the checker prefers predicates that determine subtypes of candidate types (Section 4.3, p. 11). Inference: selecting fewer predicates can lose useful information and cause rejection; the selection does not establish a refinement by itself.

## technique 5: hybrid casts for dynamic checks

What it is. The `!!` hybrid cast checks only a value's base type statically and defers the refinement predicate to runtime. For example, if ranger cannot prove an index is in range under a complex condition, `k!!` can be passed to `a.at`; the runtime check enforces the range while static checking still ensures that `k` is an integer (Section 4.1, p. 6; Section 4.3, p. 11).

How to apply it.

1. Confirm statically that the expression has base type `B` (Fig. 4b, rule `hybrid-cast`)
2. Use `v!!` where a refined value is expected, as in `a.at(k!!)` (Section 4.1, p. 6)
3. Defer checking `p(v)` to runtime, represented by `≀p(v)` in the typing rule (Section 4.3, p. 11)
4. Inference: reserve hybrid casts for bounds that cannot be established statically, so that runtime checks do not replace available static proofs

Inference: an adaptation could insert and verify an executable bounds check when static verification is insufficient. It would need an explicit account of check failure; this paper does not specify a Verus implementation.

Evidence and limits. The paper says the operator “provides an unsound escape hatch for the static typing rules.” (Section 4.3, p. 11.) They preserve base-type safety but defer refinement safety, so a program using them is not statically guaranteed to satisfy the refinement.

## implementation and solver boundary

Ranger runs on a bespoke SSA IR rather than directly on the source AST. The implementation is approximately 4,400 lines for the typechecker and 1,300 lines for AST-to-IR conversion (Section 4.4, p. 12). It uses Z3 for refinement implication, monotonicity inequalities, range-bound simplification, and abstract arithmetic. General constraints are quantifier-free integer arithmetic with uninterpreted functions; range-only linear updates reduce to integer linear arithmetic (NP-complete), while the general fragment is undecidable (Section 4.4, pp. 12–13).

The arithmetic rule performs interval abstract interpretation: for example, `[a..b] + [c..d]` becomes `[a+c..b+d]` (Section 4.3, p. 11). E-graphs propagate typing information among variables equal at a program point to avoid redundant judgments (Section 4.4, p. 13). The paper states: “In all, the type checking algorithm ensures soundness, so that type inference only provides best effort suggestions.” (Section 4.3, p. 12.)

## evaluation, trust, and implications for VL

The evaluation contains 14 programs in five groups: ranger-written examples, an array map, merge sort, Index Checker examples, and LiquidJava examples. Ranger uses no auxiliary in-body annotations, while Scala uses five across the subjects (Section 5.2, pp. 14–15). Section 5.2 reports 100% expressiveness for ranger and 92% for the Checker Framework; LiquidJava reaches 100% on examples it can handle (p. 15). Table 2 totals 68 units, including 17 buggy units: ranger has 17 true positives, 51 true negatives, and no false positives or false negatives; the Checker Framework has 12 true positives, 53 true negatives, two false positives, and one false negative (p. 15). Section 5.2 reports precision of 100% for ranger, 86% for the Checker Framework, and 100% for LiquidJava on handled examples (p. 16).

The LiquidJava results contain an internal discrepancy. The prose states: “LiquidJava, in contrast, presented 7 false negatives, which gives a soundness of 76%.” (Section 5.2, p. 16.) Table 2 instead totals eight false negatives and 24 true negatives (p. 15). Its stated soundness formula, `tn/(tn + fn)`, gives 75% from those table totals. Inference: the reported 76% should not be presented as consistent with Table 2, and the paper's empirical metric should not be mistaken for a proof of type-system soundness. LiquidJava crashes on several subjects, and two more complex subjects were omitted from its comparison (Section 5.1, p. 14).

Ranger's annotation conciseness is 0.68 annotations per expressed constraint, versus 0.83 for the Checker Framework and 0.51 for LiquidJava; the LiquidJava figure excludes examples where it crashes (Section 5.2, p. 15). Ranger typechecked all 14 examples in 16 seconds, while Scala 3 took 34 seconds for translated examples; this is a basic performance sample, not a scalability benchmark (Section 5.2, p. 16).

Inference: the design relies on the compiler's translation, implementation of the typing and purity rules, external solver, and runtime checks for hybrid casts. The paper presents typing rules and experimental results; it does not provide a machine-checked soundness proof. The absence of observed false negatives in these examples does not establish soundness for all programs.

Inference: range inference could reduce annotation burden for a verified-Rust product, while hybrid casts would require accounting for runtime failure. The experiments do not measure this benefit for Rust or Verus. A Verus integration should preserve explicit loop invariants and contracts at the trust boundary, use executable checks only when the product accepts runtime failure, and require Verus to validate every inferred candidate.

Inference: VL should reuse backward candidate generation, monotonicity detection, and path-sensitive range predicates as front-end ideas, while translating each candidate into valid Verus specifications. It should not redo ranger's language-level implementation as if it were a Verus result. Such an adaptation would need to account for Rust ownership, slices, iterators, and panic behavior; the paper does not study these issues.

## techniques for the catalog

- range refinement predicates — express integer bounds and value-dependent constraints as subtypes
- bidirectional candidate inference — back-propagate signatures and phi types, then validate candidates forward
- monotonicity loop analysis — infer increasing, decreasing, or constant ranges with SMT inequalities
- smart casts — use branch and loop path conditions to narrow types flow-sensitively
- purity enforcement — restrict refinement predicates to side-effect-free functions
- hybrid runtime casts — defer an unprovable refinement to a runtime check while preserving the base type
- SSA and e-graph implementation — analyze explicit control flow and propagate equal-variable facts efficiently
- solver-backed range checking — discharge refinement implications and interval arithmetic with Z3
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The rules consist of typing judgments ⊢ using an environment Γ that is a sequence of pairs 𝑣 : 𝑇—denoting that variable 𝑣 has type 𝑇."): checked the complete paper, quotations, technique steps, numerical results, page references, authors, year, and arXiv identifier; corrected references and an inexact quotation, clarified candidate validation, marked adaptation and trust conclusions as Inference, removed unsupported recommendations and the risk rating, and recorded the LiquidJava prose/table discrepancy; did not run the implementation, reproduce experiments, or validate proposed Verus adaptations.
