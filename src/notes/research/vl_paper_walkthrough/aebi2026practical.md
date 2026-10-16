# Practical Range Refinement Types with Inference
(authored by agents unless marked 🧑)
Tag: `aebi2026practical`, [paper](https://doi.org/10.48550/arxiv.2607.00824)
## scope and central design

Aebi and Furia introduce ranger, a range-refinement type system implemented in the licorne language. It targets bounded integer properties such as array-index safety while keeping the annotation burden close to an ordinary typed language. Its core design combines bidirectional typing, backward candidate inference, loop monotonicity analysis, path-sensitive smart casts, purity checking, and a hybrid runtime cast.

The paper's abstract states the goal: “To combine expressiveness and succinctness, ranger is based on a bidirectional type system, which runs a type inference algorithm to provide the typechecking pass with information useful to reduce the need for user-written auxiliary annotations.” (Abstract, p. 1.) The system is designed for imperative variables and loops, not only pure expressions. Its refinement notation is generic (`T with p(it)`), but the paper focuses on integer ranges.

## technique 1: range refinement types and pure predicates

What it is. A refinement `T with p(it)` is a subtype of `T` containing values satisfying the pure Boolean predicate `p`. Ranger abbreviates integer ranges as `[l..u]` for inclusive bounds, `[l..<u]` for an exclusive upper bound, and `[0..]` for nonnegative integers. Predicates can depend on program values, so a function can express an index less than an array's current length or a coordinate bounded by another parameter (Section 4.1, p. 6).

When to use it. Use a range refinement for array indexes, lengths, loop counters, dates, sorted elements, and arithmetic preconditions. In the motivating `decodeAll`, `xLen` and `yLen` have `[1..]`; a `Point` has `x:[0..<xLen]` and `y:[0..<yLen]`; `clamp` requires `max:[min..]` and returns `[min..max]` (Section 3, pp. 4–5).

How to apply it.

1. Put range constraints on function signatures, array access parameters, and result types (Section 3, Fig. 1)
2. Use a pure predicate when a range cannot express the desired relationship, such as a list predicate parameterized by a filtering function (Section 3, Fig. 1b)
3. Let subtyping discharge a refinement when the source predicate implies the target predicate (Section 4.3, Fig. 4c)
4. Keep predicates pure. Ranger's purity analysis recursively requires pure callees and pure expressions (Section 4.3, p. 12)

The paper says: “Predicate 𝑝 must be a pure boolean expression, that may depend on program values.” (Section 4.1, p. 6.) Purity prevents a refinement predicate from observing mutable state that could change between checking and use.

Verus form (inference). Encode a range as a specification predicate over an integer or sequence index and put it in `requires`/`ensures`. For an array, state `0 <= i < a.len()` in the contract and preserve it in loop invariants. Verus predicates must be written with valid specification syntax; ranger's `with` notation is not a Verus construct.

Evidence and limits. Range types document and statically rule out many index errors, but they do not express full functional correctness. General refinement constraints can make the solver problem undecidable; ranger's practical fast path relies on quantifier-free linear arithmetic (Section 4.4, p. 12).

## technique 2: bidirectional candidate inference

What it is. Ranger first performs a backward dataflow analysis to infer candidate types from declared returns, call parameters, ascriptions, assignments, and SSA phi merges. The forward typechecker then uses these candidates to synthesize intermediate types and checks every candidate for validity. Inference is deliberately best effort: an invalid candidate is rejected, and failed inference requires an annotation or a less demanding program shape (Sections 4.1 and 4.3, pp. 6–9).

How to apply it.

1. Translate the source into IRcorne SSA, where each variable is assigned once and phi functions merge control-flow paths (Section 4.2, pp. 6–7)
2. Record each expression's origin so the analysis can reconstruct a variable's flat source expression (Section 4.3, p. 8)
3. Initialize candidate types at returns from the declared return type (Table 1, rule `exit`)
4. At a call, propagate callee parameter types backward to actual arguments (Table 1, rule `call`)
5. At `x := y`, propagate candidates from `x` to `y`; at `v := phi(x1,x2)`, propagate the candidate for `v` to both inputs (Table 1, rules `assign` and `join`)
6. On other instructions, union successor candidates and continue backward; unroll each loop once rather than computing a fixpoint (Table 1 and Section 4.4, p. 12)
7. Run the forward typechecker with these candidates, rejecting any that cannot be proved (Section 4.3, pp. 11–12)

The paper gives a concrete result: “ranger can typecheck the program against its typed signatures without needing any annotations in the function bodies.” (Section 3, p. 5.) In `filter`, the return type is propagated to each assignment to `rev`, then checked forward under the predicate guarding the insertion (Section 3, p. 5).

Verus form (inference). A tool could synthesize candidate loop invariants or postconditions from function signatures and then ask Verus to check them. Candidates must remain suggestions; Verus's checked proof is the soundness gate. A backward pass that does not reach a fixpoint is safe only when every inferred candidate is subsequently validated, as ranger does.

Evidence and limits. Candidate inference does not itself guarantee soundness. The paper explicitly makes forward validation responsible for rejecting invalid suggestions (Section 4.1, p. 6). The one-unrolling optimization can be unsound as an inference procedure, but that does not compromise the final checker because candidates are checked (Section 4.4, p. 12).

## technique 3: monotonicity analysis for loops

What it is. Ranger analyzes each loop phi assignment `v_next = phi(v_init,v_prev)`. It computes the flat update expression `f(v_prev)` and asks an SMT solver whether `f(v_prev) >= v_next` or `f(v_prev) <= v_next` is valid. Validity yields a nondecreasing range `[v_init..]`, a nonincreasing range `[..v_init]`, or a constant range `[v_init..v_init]` when both hold (Section 4.3, pp. 8–9).

How to apply it.

1. Identify each loop-carried variable and its initial and previous values (Section 4.3)
2. Recover the flat update expression from SSA origins (Section 4.3, p. 8)
3. Ask SMT whether the update is always at least the next value (`μ↑`) or at most it (`μ↓`) (Section 4.3, p. 9)
4. Record the corresponding monotonic range in map `M`; leave it undefined when neither implication is valid or the expression is unavailable (Section 4.3, p. 9)
5. Intersect the forward type of the loop variable with `M(v)` using the `mono` typing rule (Fig. 4c, p. 10)
6. Combine the range with the loop's staying condition. In `maxPos`, `k1` is nondecreasing from `k0`, and `k < a.length()` smart-casts it to `[0..<a.length()]` before `a.at(k1)` (Section 4.3, pp. 9–12)

The paper states: “ranger analyzes loops to detect integer variables that are updated monotonically across loop iterations.” (Section 4.3, p. 8.) The analysis avoids general fixpoint computation and is therefore deterministic.

Verus form (inference). State monotonicity as a loop invariant, such as `old(k) <= k` for an increasing counter, together with the bound needed by the array access. Verus requires an explicit invariant or lemma; it does not provide ranger's automatic monotonicity map.

Evidence and limits. The monotonicity constraints are sent to SMT. If the solver cannot prove either direction, ranger does not infer a range and remains sound by refusing the strengthening (Section 4.3, p. 9). The method handles simple monotone updates, not arbitrary loop invariants.

## technique 4: path-sensitive smart casts and purity enforcement

What it is. Boolean expressions produce positive and negative path conditions. In a conditional, the then block is checked under `ψ+` and the else block under `ψ−`; in a loop, the body uses the staying condition and the successor uses its complement. Comparisons, conjunction, disjunction, negation, and type tests propagate these conditions. A variable can therefore receive a narrower type only along paths where the condition proves it (Section 4.3, Fig. 4).

How to apply it.

1. Type the Boolean condition and compute its positive and negative flow conditions (Fig. 4b)
2. Check each branch under its corresponding condition (Fig. 4a)
3. Require phi-merged variables to have one compatible type on both incoming paths (Fig. 4a)
4. After a branch whose other arm terminates, retain only the surviving path condition (Section 4.3, p. 10)
5. Use predicates in a refinement only when ranger's purity analysis proves the predicate and all callees pure (Section 4.3, p. 12)

The `filter` example uses `if p(rem.first())` to prove that every element inserted into `rev` satisfies `p`; purity of `p` and `first` makes that path fact stable (Section 3, p. 5). The paper cautions that the typing rules are path-sensitive even though it uses the broader term “flow-sensitive” (footnote 1, p. 2).

Verus form (inference). Write branch-specific assertions or invariants that establish the refined state after the condition. A Verus proof can call a pure `spec fn` in a predicate, while executable predicates used at runtime need separate executable definitions. Do not encode a mutable function as a pure specification predicate.

Evidence and limits. Smart casts can proliferate implications, so candidate types guide which path predicates the checker uses (Section 4.3, p. 11). This is a performance heuristic validated by final checks, not an approximation that may silently drop required facts.

## technique 5: hybrid casts for dynamic checks

What it is. The `!!` hybrid cast checks only a value's base type statically and defers the refinement predicate to runtime. For example, if ranger cannot prove an index is in range under a complex condition, `k!!` can be passed to `a.at`; the runtime check enforces the range while static checking still ensures that `k` is an integer (Section 4.1, p. 6; Section 4.3, p. 11).

How to apply it.

1. Confirm statically that the expression has base type `B` (Fig. 4b, rule `hybrid-cast`)
2. Replace the expression with `v!!` and attach the desired refinement `B with p(it)` (Section 4.1)
3. Compile the runtime check represented by `≀p(v)` and handle failure according to the language's error semantics (Section 4.3, p. 11)
4. Use this escape hatch only where static reasoning is impractical; ordinary statically provable bounds should remain refined without a cast (Section 4.1)

Verus form (inference). A runtime assertion can be modeled as an executable check whose postcondition establishes the range, but this changes the guarantee from compile-time rejection to runtime failure. Verus `requires` expresses a precondition and does not itself insert a runtime check; a product must implement and verify the check separately.

Evidence and limits. The paper calls hybrid casts “an unsound escape hatch for the static typing rules.” (Section 4.3, p. 11.) They preserve base-type safety but defer refinement safety, so a program using them is not statically guaranteed to satisfy the refinement.

## implementation and solver boundary

Ranger runs on a bespoke SSA IR rather than directly on the source AST. The implementation is approximately 4,400 lines for the typechecker and 1,300 lines for AST-to-IR conversion (Section 4.4, p. 12). It uses Z3 for refinement implication, monotonicity inequalities, range-bound simplification, and abstract arithmetic. General constraints are quantifier-free integer arithmetic with uninterpreted functions; range-only linear updates reduce to integer linear arithmetic (NP-complete), while the general fragment is undecidable (Section 4.4, p. 12).

The arithmetic rule performs interval abstract interpretation: for example, `[a..b] + [c..d]` becomes `[a+c..b+d]` (Section 4.3, p. 11). E-graphs propagate typing information among equal SSA variables to avoid redundant judgments (Section 4.4, p. 12). These optimizations affect speed and presentation, while final type checks remain the soundness condition.

## evaluation, trust, and implications for VL

The evaluation contains 14 programs in five groups: ranger-written examples, an array map, merge sort, Index Checker examples, and LiquidJava examples. Ranger uses no auxiliary in-body annotations, while Scala uses five across the subjects (Section 5.2, pp. 14–15). Across the table's units, ranger has 100% expressibility on the encoded constraints, 0 false negatives, and 100% precision; the Checker Framework expresses 92%, has one false negative, and 86% precision; LiquidJava reaches 100% on examples it can run but crashes on several and has seven false negatives, giving 76% soundness on its tackled units (Section 5.2, p. 15, Table 2). These percentages use the table's true/false positive and negative counts, not all possible Java programs.

Ranger's annotation conciseness is 0.68 annotations per expressed constraint, versus 0.83 for the Checker Framework and 0.51 for LiquidJava; the LiquidJava figure excludes examples where it crashes (Section 5.2, p. 15). Ranger typechecked all 14 examples in 16 seconds, while Scala 3 took 34 seconds for translated examples; this is a basic performance sample, not a scalability benchmark (Section 5.2, p. 16).

Proved by the checker: the accepted range refinements, flow conditions, arithmetic abstractions, and purity checks for the modeled licorne program. Trusted or assumed: licorne's operational behavior, the SSA translation, Z3 and its theories, runtime behavior of hybrid casts, and the correctness of library signatures such as array access. The paper does not provide a machine-checked metatheory in the excerpted implementation paper; its evidence is the type-system design and experiments.

Inference: the threat to an agent-written verified-Rust product is medium. Range inference can reduce annotation burden for bounds and loop indices, but hybrid casts and unchecked library contracts can turn static absence of errors into runtime failure. A Verus integration should preserve explicit loop invariants and contracts at the trust boundary, use executable checks only when the product accepts runtime failure, and require Verus to validate every inferred candidate.

Inference: VL should reuse backward candidate generation, monotonicity detection, and path-sensitive range predicates as front-end ideas, while translating each candidate into valid Verus specifications. It should not redo ranger's language-level implementation as if it were a Verus result. The open engineering problem is mapping Rust ownership, slices, iterators, and panic behavior to these range contracts without weakening the proof.

## techniques for the catalog

- range refinement predicates — express integer bounds and value-dependent constraints as subtypes
- bidirectional candidate inference — back-propagate signatures and phi types, then validate candidates forward
- monotonicity loop analysis — infer increasing, decreasing, or constant ranges with SMT inequalities
- smart casts — use branch and loop path conditions to narrow types flow-sensitively
- purity enforcement — restrict refinement predicates to side-effect-free functions
- hybrid runtime casts — defer an unprovable refinement to a runtime check while preserving the base type
- SSA and e-graph implementation — analyze explicit control flow and propagate equal-variable facts efficiently
- solver-backed range checking — discharge refinement implications and interval arithmetic with Z3
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
