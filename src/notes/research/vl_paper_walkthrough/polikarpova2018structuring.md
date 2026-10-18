# Structuring the synthesis of heap-manipulating programs
(authored by agents unless marked 🧑)
Tag: `polikarpova2018structuring`, [paper](https://arxiv.org/abs/1807.07022) (arXiv:1807.07022v2, printed on the paper's first page)

## what the paper proves

The paper presents Synthetic Separation Logic (SSL), which turns a separation-logic pre/postcondition into a derivation whose proof term is an imperative program. Its abstract states: "This paper describes a deductive approach to synthesizing imperative programs with pointers from declarative specifications expressed in Separation Logic." (abstract, p.1). The central judgment is a transforming entailment, written in the paper as `P { Q | c`, where `c` is synthesized while proving that the heap described by `P` can become the heap described by `Q`. The paper states: "A synthesized program represents a proof term for a transforming entailment statement P { Q, and the synthesis procedure corresponds to a proof search." (abstract, p.1)

Inference: VL can use this architecture as a design pattern: make a Verus proof state the synthesis goal, make each proof rule emit Rust/proof code, and retain the derivation as an independently checkable artifact. The paper does not claim to synthesize Rust or Verus code, so this mapping is an inference.

The input is a symbolic heap with a pure constraint and a spatial part joined by separating conjunction. A goal has an environment of immutable program variables, a precondition, and a postcondition. Ghost variables occur in both assertions; existential variables occur only in the postcondition. The paper gives the operational consequence in the swap example: "As a result of the two reads, the ghost variables in the postcondition can now be substituted with equal program-level variables: x 7→ b2 ∗ y 7→ a2." (introduction, p.1)

Inference: In Verus, the corresponding input would be a Rust function with `requires` and `ensures`, ghost/spec values for logical data, and executable locals introduced where a proof needs a runtime read. The paper's separating conjunction `∗` would have to be encoded in Verus by ownership or predicates that state disjointness; I did not check what Verus offers for this, so this is an inference from the paper only.

## technique: proof-directed reads, writes, framing, and heap unification

When to use it: use these rules for a fixed-footprint transformation whose pre and post describe points-to cells, including swaps and existential output values. The paper's basic rules are `Emp`, `Read`, `Write`, `Frame`, and `UnifyHeaps` (Sections 2.1–2.3, pp.4–5).

How to apply it:

1. Represent the function as a goal `Γ ; P { Q`. `Γ` contains immutable program variables; values that occur in `P` but are not in `Γ` are ghosts (Section 2.1, p.4).
2. Apply `Read` to a points-to cell containing a ghost. Choose a fresh program variable, substitute it for the ghost in both pre and post, and prepend `let y = *(x + ι)` (Section 2.2, p.5).
3. Apply `Write` when the value expression contains only program-level variables. It replaces the value in the precondition's cell `⟨x, ι⟩ ↦ e'` by `e`, so that the cell matches the postcondition's, and emits `*(x + ι) = e` (Section 2.2, p.5; rule in Fig. 1, p.4).
4. Apply `Frame` to remove a shared subheap from both sides as long as this does not create new existential variables, that is, the shared subheap `R` mentions no goal existential (Section 2.2, p.5; Fig. 1, p.4).
5. Apply `UnifyHeaps` when an existential in one side can be substituted so that two subheaps match. Its substitution domain is restricted to postcondition existentials (Section 2.3, p.5).
6. Close the empty spatial goal with `Emp`, which requires no remaining existential and a valid pure implication, and emits `skip` (Section 2.2, p.4).

The paper's complete worked shape is `swap`: read `a` from `x`, read `b` from `y`, write `a` to `y`, then write `b` to `x`; the derivation is shown in Fig. 2 (p.4). For an existential output, its `pick` example unifies `x 7→ 239` with `x 7→ z`, giving `[z 7→ 239]`, then uses `Frame`, `Write`, and `Emp` (Section 2.3, p.5).

Inference: A Verus encoding should use executable Rust reads and writes, `requires`/`ensures`, and proof lemmas that establish the heap predicate before and after each mutation. A direct `Frame` rule is not a Verus construct in the cited reference; one would instead preserve unchanged ownership facts or prove a predicate-preservation lemma. This is an inference.

Evidence: the paper reports that all 22 benchmark programs were synthesized within 40 seconds and all but four in under one second (Section 6.2.2, p.23). The benchmark table reports 12 AST nodes and `< 0.1` seconds for `swap` with all optimizations (Table 1, p.21). The suite has 22 programs (Section 6.1, p.21), and all experiments ran on a "commodity laptop (2.7 GHz Intel Core i7 Lenovo Thinkpad with 16GB RAM)" (Section 6.2, p.22). Inference: Table 1 lists five Time entries of at least 1.0 s (4.8, 1.1, 31.9, 37.7, 17.2), so the text's "all but four" is loose for the insertion sort entry (1.1 s).

Assumptions and failure modes: pure validity is assumed decidable for the chosen logic (Section 2, p.3 and footnote 2: "We require decidability for making the synthesis problem tractable, but it is not required for soundness of the logic."); framing and unification are nondeterministic and may require backtracking (Section 2.3, p.5). The rules do not by themselves discover a suitable specification.

## technique: inductive predicates, opening, closing, and level-tagged recursion

When to use it: use inductive predicates for linked lists and trees, and use `Induction`, `Open`, `Close`, and `Call` to synthesize structurally recursive procedures. The paper defines `lseg(x,y,S)` with an empty clause and a nonempty clause containing a head block and a recursive tail (Section 2.5, p.7).

How to apply it:

1. Start with a goal whose precondition contains an inductive predicate. `Induction` adds a function symbol whose specification is the initial goal, creating a recursive hypothesis (Section 2.5.2, p.8).
2. Apply `Open` to a predicate in the precondition. It creates one subgoal per predicate clause, strengthens each precondition with that clause's guard and body, and combines synthesized bodies with a conditional (Section 2.5.3, pp.8–9).
3. In a recursive branch, `Read` materializes the next pointer and `Call` unifies the recursive hypothesis's precondition with the tail predicate. The example `listfree` reads `nxt2`, calls `listfree(nxt2)`, then frees the current block (Section 2.5.4, p.9; Fig. 6).
4. Apply `Close` to unfold one selected predicate clause in the postcondition. It adds that clause's guard and pure part to the post and raises the level tag of its predicate instances (Section 2.5.5, pp.9–10).
5. Keep `MaxUnfold` finite. Open and Close are disabled once a tag reaches the bound; the authors report that `MaxUnfold` taken to be 1 "suffices for most of realistic case studies" (Section 3.1, p.14).
6. Use `Free` on an unmatched precondition block and `Alloc` on an existential postcondition block; they emit `free(x)` and `let y = malloc(n)` respectively (Section 2.5.1, p.7; Fig. 12, p.13, prints the free command as `free(n)`).

Evidence: the `listfree` derivation yields the concrete recursive body in Fig. 6 (p.9), and the benchmark table includes list, tree, and BST programs. The evaluation says: "Our experiment confirms that SuSLik is capable of synthesizing programs that manipulate a range of heap data structures, including nontrivial manipulations that require reasoning about both the shape and the content of the data structure, such as insertion into a binary search tree." (Section 6.2.1, p.22)

Inference: In Verus, represent each inductive shape by a `spec fn` predicate over a sequence/set and references or ghost ownership, prove a decreases measure for recursive calls, and use `invariant` statements for loops if recursion is replaced by iteration. SSL's level tags and `Open`/`Close` are proof-search concepts, not Verus keywords. This is an inference.

Assumptions and failure modes: recursion must follow a well-founded inductive predicate; the paper checks that recursive clauses contain a points-to cell and use strictly smaller subheaps (Section 2.5.4, p.8). General loops are unsupported because discovering loop invariants would enlarge the search space (Section 7, p.23). Mutually recursive predicates, non-structural recursion such as merge sort, and large constant-size allocations are outside the implemented fragment (Section 7, pp.23–24).

## technique: call abduction

When to use it: use `AbduceCall` when a recursive callee's precondition matches a tail predicate but the caller's pointer still points at the old root. The list-copy example needs a write that changes `r 7→ x2` into `r 7→ nxt2` before the recursive call (Section 2.6, pp.11–12).

How to apply it:

1. Pick a candidate callee specification from the context and split its precondition into predicate instances `P_f` and a flat remainder `F_f` (Section 2.6, p.11).
2. Unify `P_f` with a predicate subheap in the current goal, producing a substitution `σ` (Section 2.6, p.11).
3. Apply `σ` to the callee's remainder. Compare that remainder with a current flat heap fragment `F`; synthesize an impedance-matching subprogram from `F` to `σ(F_f)` (Section 2.6, p.11).
4. Sequence this matcher before the call, then continue with the callee and the residual goal. In Fig. 9, the matcher is the assignment `*r = nxt2` on line 6 (Section 2.6, p.12).

Inference: A Verus analogue would be a lemma that changes the ghost representation of the caller's root pointer before invoking a recursive proof function; the executable assignment remains ordinary Rust and the relation between old and new ownership must be proved. This is an inference.

Assumptions and failure modes: the implementation requires the matched flat fragments to have the same shape and differ only in pointer values (footnote 8, p.11). The rule adjusts a "constant-size symbolic footprint" (Section 2.6, p.11). Separately, the paper says SuSLik does not try to discover recursive auxiliary functions (Section 6.2.1, p.23).

## technique: search control and failure pruning

When to use it: use these optimizations when rule choices cause repeated backtracking. The baseline is depth-first backtracking over SSL derivations (Section 4, pp.17–18).

How to apply it:

1. Apply invertible normalization rules eagerly. `Read`, `StarPartial`, `NullNotLVal`, and `SubstLeft` are invertible, so when all sub-derivations of such a rule fail, the search does not try other rules, because the failure was caused by an earlier choice (Section 5.1, p.18; Algorithm 4.1, line 14, p.17).
2. Run a predicate-unfolding phase before the flat-heap phase. Flat rules cannot remove or enable predicate instances; therefore the phases preserve completeness while exposing failures earlier (Section 5.2, p.18).
3. Track each rule's heap footprint and impose a total order on commuting applications. Reject a new rule application if it commutes with an earlier one in the current derivation but comes before it in the total order (Section 5.3, pp.18–19).
4. Fire early failure rules. `PostInconsistent` rejects an inconsistent pure post, `PostInvalid` rejects a pure post not implied by a predicate-free pre, and `UnreachHeap` fires when the spatial pre and post contain only points-to heaplets whose left-hand sides cannot be unified; each emits `magic`, which the search treats as failure (Section 5.4, p.19; Fig. 13, p.19).
5. Add branch abduction when a pure postcondition fails. Search atomic formulas over program variables for a guard whose conjunction with the current precondition implies the post; synthesize the else branch under the negated guard (Section 5.5.2, p.20).

Evidence: disabling all optimizations timed out 8 of 22 benchmarks (timeout 120 seconds, Table 1 caption); all three BST benchmarks timed out when even a single optimization was disabled (Section 6.2.2, p.23). Table 1 gives concrete comparisons, for example `prepend` rising from 0.2 seconds to 83.5 seconds when invertible rules are disabled, and insertion sort rising from 1.1 to 74.2 seconds with all optimizations disabled (Table 1, p.21).

Inference: A Verus synthesis tool could use the same scheduling ideas around proof-state transformations and lemma application, but Verus's solver context and ownership facts are different from SSL heaps. This is an inference.

## what remains trusted, measured, and unresolved

The paper proves SSL soundness by sized validity and induction on heap size. It defines validity only for heaps up to size `n`, then requires recursive calls on strictly smaller heaps (Section 3.2, pp.15–16). The authors state: "Theorem 3.3 states that a program derived via SSL constitutes a valid spec with its goal" (Section 3.2, p.16)

Inference: This theorem covers the paper's RAM semantics, predicates, and synthesized derivations; it does not prove the correctness of Z3, ScalaSMT, the implementation, a user's predicate definitions, or a future Rust/Verus translation. These trust boundaries are inferred from the theorem's stated premises and the tool architecture.

The implementation uses Scala and Z3 through ScalaSMT (Section 6, p.21). The authors manually inspected generated solutions and derivations and confirmed them correct (Section 6.2.1, p.22), and say third-party proof output was future work: "In the future, we plan to output SSL derivations as SL proofs, checkable by a third-party system such as VST" (footnote 14, p.22). Inference: the reported correctness inspection is evidence for these 22 cases, while independent replay checking was not yet part of the evaluation.

Inference: What VL should not redo: the paper already supplies a proof-directed heap synthesizer, recursive predicate unfolding, call abduction, and measured search optimizations. Reimplementing these as a new generic separation-logic synthesizer would duplicate its demonstrated core. VL's open work is a Verus-specific encoding and a trustworthy checker that connects generated Rust ownership and contracts to the synthesis derivation.

Threat to agent-written verified Rust: Inference: medium for pointer-heavy, structurally recursive components. The paper demonstrates automated synthesis of 22 heap programs without sketches, but it has no Rust memory model, no Verus proof language, no loops, and no non-structural recursion. Inference: it can inform a component generator for lists and trees, yet cannot by itself establish that agent-written Rust meets a product-level specification or that external APIs preserve the assumed predicates.

## techniques for the catalog

- proof-directed separation-logic synthesis — encode a heap pre/postcondition as SSL goals and synthesize reads, writes, frames, and unifications as proof rules
- inductive heap unfolding — use `Induction`, `Open`, `Close`, level tags, and `Call` to synthesize structurally recursive list/tree code
- call abduction — synthesize pointer updates that make a recursive callee's precondition match the current heap
- focused backtracking search — combine invertible rules, unfolding/flat phases, symmetry reduction, and early-failure rules to prune derivations
- branch abduction — infer a pure guard when a candidate branch cannot entail its postcondition

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Let us refer to rules that emit a sub-program as operational and to the rest (i.e., to the rules that only change the assertions) as non-operational."): I read the whole paper text (pages 1-30; the reference list only skimmed) and every claim of this study against it: the abstract, swap and footnote quotations, the Section 6.2.1 and Theorem 3.3 quotations, the rule descriptions (Emp, Read, Write, Frame, UnifyHeaps, Open, Close, Call, AbduceCall, Alloc, Free, failure rules, branch abduction), the page and section pointers, and the Table 1 numbers (swap 12 nodes, prepend 0.2 to 83.5 s, insertion sort 1.1 to 74.2 s, 8 of 22 timeouts with all optimizations off, the 40 second and 22 benchmark counts, the laptop). Changes: replaced the link with the arXiv page from the paper text; corrected the Write rule description (it rewrites the precondition cell), the Frame side condition, the free(x) command, the decidability pointer (Section 2, p.3), footnote 8 (p.11), the Section 5.3 and 5.4 page ranges, the invertible-rule and UnreachHeap wording, the quotation endings, and the AbduceCall limitation; removed claims about an unnamed Verus reference; added an Inference note that Table 1 lists five times of at least 1 s although the text says all but four; marked the VL-redo paragraph as Inference. Not checked: Verus or Rust capabilities, the VL-specific inferences, the cited prior work, the details of the Appendix A proof cases, and the semanticscholar link that was removed.
