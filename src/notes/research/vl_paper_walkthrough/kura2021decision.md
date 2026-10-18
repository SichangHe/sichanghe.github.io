# Decision Tree Learning in CEGIS-Based Termination Analysis
(authored by agents unless marked 🧑)
Tag: `kura2021decision`, [paper](http://arxiv.org/abs/2104.11463v3)

## problem and result
The paper synthesizes piecewise affine lexicographic ranking functions for termination using Counterexample Guided Inductive Synthesis (CEGIS). The abstract defines the loop: “at each iteration, (1) a synthesizer synthesizes a candidate solution from the current examples, and (2) a validator accepts the candidate solution if it is correct, or rejects it providing counterexamples as part of the next examples.” Its novelty is a decision-tree synthesizer that detects cycles among transition examples and refines the segmentation. The implementation, MuVal, was evaluated on C Integer benchmarks from Termination Competition 2020 against AProVE, iRankFinder, and Ultimate Automizer (Section 6, pp. 19–20).

## technique 1: CEGIS with transition examples

What it is. Encode each program transition as a constraint that a predicate variable `R(x,x')` belongs to a well-founded relation. For the running loop `while (x != 0) { if (x < 0) x++; else x--; }`, the paper gives `x < 0 ∧ x' = x + 1 ⇒ R(x,x')` and `¬(x < 0) ∧ x' = x − 1 ⇒ R(x,x')` (Section 2.1, p. 5). The synthesizer proposes a candidate from a finite example set `E`; the validator checks the original constraints and adds a counterexample when the candidate fails.

How to do it.

1. Encode all transition branches and any invariant constraints as a predicate-constraint satisfaction problem, pwCSP (Section 3, pp. 9–10).
2. Start with `E = ∅`; synthesize a vacuous candidate, then ask the validator for a violating transition.
3. Add the violated instance as a new example to `E` (Section 4, p. 11, formula (9); in Example 2 the examples are atoms such as `R(1,0)`) and synthesize a relation consistent with all examples. In the running example, examples `(1,0)` and `(-2,-1)` first yield `f(x)=x`, then require the piecewise function `f(x)=|x|` (Example 2, pp. 5–6).
4. Stop when the validator proves the candidate satisfies the original constraints. The paper says “If E is unsatisfiable, then E witnesses unsatisfiability of (C, R).” (Section 4, p. 11). For the positive/negative-example form passed to the decision-tree synthesizer, unsatisfiability depends on the SAT assignment chosen, so the paper adds the negation of an unsatisfiability core to `E` instead (Section 4, p. 12).

Verus form. Inference: a Rust loop can use a `decreases` clause for a manually supplied ranking function and `invariant` facts for transition constraints. To automate CEGIS, an external tool can generate candidate `spec fn`s and Verus proof obligations; each counterexample becomes a new synthesis constraint. Inference: Verus does not synthesize arbitrary piecewise rankings automatically, and a runtime `proof fn` cannot implement the CEGIS loop.

## technique 2: decision-tree segmented ranking synthesis

What it is. A decision tree has internal affine halfspaces `h(x) ≥ 0` and leaves holding affine functions; it denotes a piecewise affine function. The candidate relation is `R_f(x,x') := f(x) ≥ 0 ∧ f(x) > f(x')` (Section 5.2, p. 13). The paper calls transition examples “much cheaper to handle compared to trace examples” (Introduction, p. 2). A crossing transition (one whose endpoints lie in different leaves) constrains the labels of both leaves (Introduction, pp. 3–4).

How to do it.

1. Generate a finite vocabulary `H` of affine halfspaces from the example points (Section 2.2, p. 7).
2. Begin with the one-leaf segmentation.
3. Try to find affine leaf labels that make the piecewise function a ranking function for all examples under the current segmentation. If found, use it for the candidate relation `R(x,x') = f(x) > f(x') ∧ f(x) ≥ 0`.
4. Otherwise refine the segmentation with some halfspace in `H` and go back to step 3 (Section 2.2, p. 7, steps 1–3). The paper's Example 3 chooses `x ≥ 0` for examples `(1,0)` and `(-2,-1)`, obtaining `if x ≥ 0 then x else − x` (p. 7).
5. Algorithm 1 (Section 5.4, pp. 15–18) implements this in phases: it first rejects explicit cycles, then `ResolveCase2` (Algorithm 2) splits any leaf whose non-crossing examples have no affine (lexicographic) ranking function, then it refines further to break implicit cycles. Halfspaces are chosen either eagerly, from a finite set `H` built beforehand (intervals or octagons) by the quality measure in Algorithm 3, or lazily: label states by a MAX-SMT direction, then fit a hyperplane with weighted C-SVM and approximate its coefficients by rationals (pp. 16–17).

The quality measure (Algorithm 3, lines 1–9; p. 17) is the sum of the maximum numbers of satisfiable constraints (MaxSmt) in the two sides of the split, plus `(|E+−| + |E−+|)(1 − entropy(|E+−|, |E−+|))`. The paper says this term “is close to |E+− | + |E−+ | if almost all examples in E+− ∪ E−+ cross h in the same direction and close to 0 if |E+− | is almost equal to |E−+ |”, so it favors splits whose crossing examples all go one way. The paper says: “Our synthesizer iteratively refines segmentations following this quality measure, until examples contained in each leaf of the decision tree admit an affine ranking function.”

Verus form. Inference: encode each leaf guard as a Boolean/specification condition and each affine leaf function as a `spec fn`; prove branch-specific decrease with `ensures` and a loop `invariant`. Inference: lexicographic tuples can be represented by tuple-valued specs and helper lemmas, but the decision-tree search and LP/SMT solving remain external synthesis.

## technique 3: explicit and implicit cycle detection

What it is. An explicit cycle is a cycle in the concrete transition graph, proving that no ranking function exists for those examples. An implicit cycle is a cycle in the dependency graph whose vertices are decision-tree leaves and whose edges are crossing transitions. Example 5 has transitions `(-1,1)`, `(1,0)`, `(-1,-2)`, `(2,3)`; after splitting at `x ≥ 1`, crossing examples create a cycle between the two leaves, even though each leaf separately admits an affine ranking function (Section 2.2, p. 8).

How to do it.

1. Detect explicit cycles in `E+` with a directed-graph cycle algorithm; return unsatisfiable if one exists (Algorithm 1, lines 1–3).
2. For each segmentation, build `G(S,E+)` with leaves as vertices and crossing examples as directed edges (Definitions 14–15, p. 13).
3. Solve the affine constraints for non-crossing examples inside each leaf. If a leaf is unsatisfiable, split it with `ResolveCase2` (Algorithm 2).
4. If all leaf constraints are satisfiable but the global constraints are unsatisfiable, extract an unsat core and identify an implicit cycle (Algorithm 1, lines 13–15).
5. Select a cell and two distinct points in that cycle, add a halfspace separating them, update the tree, and repeat (lines 15–16).
6. Theorem 17 guarantees that if there is no explicit cycle, every leaf has an affine ranking function, and `G(S,E+)` is acyclic, then a decision tree with that segmentation exists. Algorithm 1 refines until `Minimize` returns a model (lines 8–9). Section 5.4 (p. 18) uses Theorem 17 to argue that an unsatisfiable constraint set must contain an implicit cycle.

The paper states the key guarantee: “Once all the implicit cycles are gone, the cycle detection theorem guarantees the existence of a candidate piecewise affine ranking function with the segmentation.”

Verus form. Inference: explicit-cycle rejection can be a ghost graph proof; an implicit-cycle-free segmentation can be recorded as a ghost predicate and discharged with `assert`/`proof fn` lemmas. Inference: Verus can check a supplied ranking function and decreases proof, but it will not discover unsat cores or qualifiers without an external synthesizer.

## evidence, limits, and VL implications
MuVal is OCaml, uses Z3, and converts C benchmarks with clang and llvm2kittel to T2-format files, which MuVal then translates to pwCSP. StarExec used CentOS 7.7 on an Intel E5-2609 at 2.40 GHz with 263,932,744 kB memory and a 300-second limit (Section 6). Table 2 columns are Yes (verified termination), No (verified non-termination), TO (timed out), and U (gave up). MuVal eager: Yes 204, No 89, TO 42, U 0; lazy: 200, 84, 51, 0. AProVE solved 216/100/16/3 in the same Yes/No/TO/U categories; iRankFinder 208/92/0/34 (the paper notes one wrong benchmark answer was removed); Ultimate Automizer 180/83/2/70. These are counts, not percentages. Inference: each row sums to 335 except iRankFinder at 334, so the benchmark set has 335 problems and the removal applies to iRankFinder's row only. MuVal was faster than iRankFinder on 265 benchmarks versus 68, with 2 unresolved by both within 300 seconds; these numbers use the authors' convention of treating Unknown as 300 seconds.

Theorem 17 states that, with no explicit cycle, an affine lexicographic function in each leaf for its non-crossing examples, and an acyclic dependency graph, a decision tree with that segmentation exists. Termination of Algorithm 1 is Theorem 20 and needs Assumptions 18 and 19 on halfspace choice. The implementation uses the relaxed lexicographic relation of Section 5.5, for which the paper says “Theorem 17 fails”; Algorithm 1 then falls back to the standard relation and restarts if no implicit cycle is found (Section 5.5, p. 18). Inference: the experiments report solver outcomes and runtime only, so they say nothing about the soundness of Z3, the translation, or the C front-end. Inference: trusted elements include the ranking-function encoding, the LP/SMT backend, benchmark semantics, and the validator. Inference: a Verus product can reuse the CEGIS-and-ranking architecture for `decreases`, but must connect synthesized specs to actual Rust control flow and integer overflow semantics. Inference: the threat to agent-written verified Rust is medium to high for loops whose decreases measures are piecewise or lexicographic; the paper supplies automation for finding them, not a complete Verus integration. VL should not redo basic cycle theory; it should build a verified bridge from generated ranking specs to Verus obligations and measure repair cost when code changes.

## techniques for the catalog
- CEGIS transition synthesis: alternate candidate ranking synthesis and validator counterexamples until a well-founded relation satisfies all constraints
- decision-tree ranking functions: split transition examples by affine halfspaces and solve affine decreases constraints independently in leaves
- implicit-cycle refinement: extract leaf-dependency cycles from unsat cores and add separating qualifiers until Theorem 17 applies
- qualifier selection: rank eager halfspaces with MaxSMT count plus entropy term, or choose hyperplanes lazily by MAX-SMT direction labels and weighted C-SVM
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Phase 2 (Line 4) detects and resolves Case 2 by using ResolveCase2 (Algorithm 2), which is a function that grows a decision tree recursively."): read the whole paper text and checked every quotation, number, section and page reference, example and algorithm step against it (Table 2 rows summed to confirm 335 benchmarks); changed: Section 3 page range, Example 3 and 5 page references, the Algorithm 1 line ranges, the unsatisfiability statement, the quality-measure description (entropy term favors one-directional crossing, not penalizes crossing), the Theorem 17 versus Theorem 20 assumptions, Table 2 column meanings and denominator, the lazy-strategy description (MAX-SMT labels plus C-SVM), added the T2 step and the Section 5.5 caveat; did not check: the cited works, the PDF figures (Fig. 7 scatter plots), Appendix A beyond a read, and all Verus-related Inference statements (the paper does not mention Verus). Tag link is the arXiv link, matching the arXiv identifier printed in the paper text.
