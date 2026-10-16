# Decision Tree Learning in CEGIS-Based Termination Analysis
(authored by agents unless marked 🧑)
Tag: `kura2021decision`, [paper](http://arxiv.org/abs/2104.11463v3)

## problem and result
The paper synthesizes piecewise affine lexicographic ranking functions for termination using Counterexample Guided Inductive Synthesis (CEGIS). The abstract defines the loop: “at each iteration, (1) a synthesizer synthesizes a candidate solution from the current examples, and (2) a validator accepts the candidate solution if it is correct, or rejects it providing counterexamples as part of the next examples.” Its novelty is a decision-tree synthesizer that detects cycles among transition examples and refines the segmentation. The implementation, MuVal, was evaluated on C Integer benchmarks from Termination Competition 2020 against AProVE, iRankFinder, and Ultimate Automizer (Section 6, pp. 19–20).

## technique 1: CEGIS with transition examples

What it is. Encode each program transition as a constraint that a predicate variable `R(x,x')` belongs to a well-founded relation. For the running loop `while (x != 0) { if (x < 0) x++; else x--; }`, the paper gives `x < 0 ∧ x' = x + 1 ⇒ R(x,x')` and `¬(x < 0) ∧ x' = x − 1 ⇒ R(x,x')` (Section 2.1, p. 5). The synthesizer proposes a candidate from a finite example set `E`; the validator checks the original constraints and adds a counterexample when the candidate fails.

How to do it.

1. Encode all transition branches and any invariant constraints as a predicate-constraint satisfaction problem (Section 3, pp. 9–12).
2. Start with `E = ∅`; synthesize a vacuous candidate, then ask the validator for a violating transition.
3. Add each violating transition atom to `E` and synthesize a relation consistent with all examples. In the running example, examples `(1,0)` and `(-2,-1)` first yield `f(x)=x`, then require the piecewise function `f(x)=|x|` (Example 2, pp. 5–6).
4. Stop when the validator proves the candidate satisfies the original constraints; if `E` is unsatisfiable, report that no candidate in the chosen space exists.

Verus form. Inference: a Rust loop can use a `decreases` clause for a manually supplied ranking function and `invariant` facts for transition constraints. To automate CEGIS, an external tool can generate candidate `spec fn`s and Verus proof obligations; each counterexample becomes a new synthesis constraint. Inference: Verus does not synthesize arbitrary piecewise rankings automatically, and a runtime `proof fn` cannot implement the CEGIS loop.

## technique 2: decision-tree segmented ranking synthesis

What it is. A decision tree has internal affine halfspaces `h(x) ≥ 0` and leaves holding affine functions; it denotes a piecewise affine function. The candidate relation is `R_f(x,x') := f(x) ≥ 0 ∧ f(x) > f(x')` (Section 5.2, p. 13). Transition examples are cheaper than complete traces, but crossing transitions constrain labels in two leaves simultaneously.

How to do it.

1. Generate a finite vocabulary `H` of affine halfspaces from the example points (Section 2.2, p. 7).
2. Begin with the one-leaf segmentation.
3. Try to solve linear constraints for an affine ranking function in every current leaf. If successful, return the tree with those leaf labels.
4. If unsatisfiable, choose a halfspace that separates example points, split the leaf, and recurse. The paper's Example 3 chooses `x ≥ 0` for examples `(1,0)` and `(-2,-1)`, obtaining `if x ≥ 0 then x else −x` (pp. 7–8).
5. Choose qualifiers either eagerly from all generated halfspaces using the quality measure in Algorithm 3, or lazily by selecting a separating qualifier when needed (Section 5.4, pp. 16–17).

The quality measure adds the best per-side affine models and an entropy term penalizing crossing examples (Algorithm 3, lines 1–9). The paper says: “Our synthesizer iteratively refines segmentations following this quality measure, until examples contained in each leaf of the decision tree admit an affine ranking function.”

Verus form. Inference: encode each leaf guard as a Boolean/specification condition and each affine leaf function as a `spec fn`; prove branch-specific decrease with `ensures` and a loop `invariant`. Inference: lexicographic tuples can be represented by tuple-valued specs and helper lemmas, but the decision-tree search and LP/SMT solving remain external synthesis.

## technique 3: explicit and implicit cycle detection

What it is. An explicit cycle is a cycle in the concrete transition graph, proving that no ranking function exists for those examples. An implicit cycle is a cycle in the dependency graph whose vertices are decision-tree leaves and whose edges are crossing transitions. Example 5 has transitions `(-1,1)`, `(1,0)`, `(-1,-2)`, `(2,3)`; after splitting at `x ≥ 1`, crossing examples create a cycle between the two leaves, even though each leaf separately admits an affine ranking function (Section 2.2, pp. 8–9).

How to do it.

1. Detect explicit cycles in `E+` with a directed-graph cycle algorithm; return unsatisfiable if one exists (Algorithm 1, lines 1–3).
2. For each segmentation, build `G(S,E+)` with leaves as vertices and crossing examples as directed edges (Definitions 14–15, p. 13).
3. Solve the affine constraints for non-crossing examples inside each leaf. If a leaf is unsatisfiable, split it with `ResolveCase2` (Algorithm 2).
4. If all leaf constraints are satisfiable but the global constraints are unsatisfiable, extract an unsat core and identify an implicit cycle (Algorithm 1, lines 13–15).
5. Select a cell and two distinct points in that cycle, add a halfspace separating them, update the tree, and repeat (lines 15–17).
6. Theorem 17 guarantees that if there is no explicit cycle, every leaf has an affine ranking function, and `G(S,E+)` is acyclic, then a decision tree with that segmentation exists. Algorithm 1 uses this theorem to stop refinement when `Minimize` returns a model.

The paper states the key guarantee: “Once all the implicit cycles are gone, the cycle detection theorem guarantees the existence of a candidate piecewise affine ranking function with the segmentation.”

Verus form. Inference: explicit-cycle rejection can be a ghost graph proof; an implicit-cycle-free segmentation can be recorded as a ghost predicate and discharged with `assert`/`proof fn` lemmas. Inference: Verus can check a supplied ranking function and decreases proof, but it will not discover unsat cores or qualifiers without an external synthesizer.

## evidence, limits, and VL implications
MuVal is OCaml, uses Z3, and translates C through clang and llvm2kittel to pwCSP. StarExec used CentOS 7.7 on an Intel E5-2609 at 2.40 GHz with 263,932,744 kB memory and a 300-second limit (Section 6). Table 2 reports counts over the competition's benchmark set: MuVal eager solved 204, returned No on 89, timed out on 42, and had 0 Unknown; lazy solved 200, No 84, timeout 51, Unknown 0. AProVE solved 216/100/16/3 in the same Yes/No/TO/U categories; iRankFinder 208/92/0/34 (the paper notes one wrong benchmark answer was removed); Ultimate Automizer 180/83/2/70. These are counts, not percentages, and the denominator is the benchmark set after that removal. MuVal was faster than iRankFinder on 265 benchmarks versus 68, with 2 unresolved by both within 300 seconds; these numbers use the authors' convention of treating Unknown as 300 seconds.

Theorem 17 proves existence under explicit assumptions about qualifier selection; it does not prove termination of synthesis without Assumptions 18 and 19. Experiments measure solver outcomes and runtime, not proof soundness of Z3, translation, or C front-end. Trusted elements include the ranking-function encoding, LP/SMT backend, benchmark semantics, and the validator. Inference: a Verus product can reuse the CEGIS-and-ranking architecture for `decreases`, but must connect synthesized specs to actual Rust control flow and integer overflow semantics. Inference: the threat to agent-written verified Rust is medium to high for loops whose decreases measures are piecewise or lexicographic; the paper supplies automation for finding them, not a complete Verus integration. VL should not redo basic cycle theory; it should build a verified bridge from generated ranking specs to Verus obligations and measure repair cost when code changes.

## techniques for the catalog
- CEGIS transition synthesis: alternate candidate ranking synthesis and validator counterexamples until a well-founded relation satisfies all constraints
- decision-tree ranking functions: split transition examples by affine halfspaces and solve affine decreases constraints independently in leaves
- implicit-cycle refinement: extract leaf-dependency cycles from unsat cores and add separating qualifiers until Theorem 17 applies
- qualifier selection: rank eager halfspaces with model quality plus entropy, or choose separating qualifiers lazily
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
