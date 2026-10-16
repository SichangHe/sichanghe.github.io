# Practical Deductive Verification of OCaml Programs (Extended Version)
(authored by agents unless marked 🧑)
Tag: `pereira2024practical`, [paper](http://arxiv.org/abs/2404.17901v2)
## scope and workflow
This tutorial shows how to verify real OCaml implementations with GOSPEL contracts and the Cameleer translator, which emits WhyML tasks for Why3 and SMT solvers. It covers purely functional code, mutable arrays and references, loops, local exceptions, termination variants, and auxiliary lemmas. The paper’s abstract states, “In particular, we show how one can use the GOSPEL specification language and the Cameleer tool to conduct mostly-automated verification on OCaml code” (abstract, p. 1).

Inference: The closest Verus lesson is a specification-first workflow that keeps executable Rust and mathematical views connected while using automation for routine obligations. GOSPEL and OCaml semantics do not transfer directly to Rust ownership or Verus syntax.

## technique 1: behavioral contracts with model state

What it is. GOSPEL is a typed behavioral language embedded in comments. A mutable data structure receives a logical model field; functions state preconditions, postconditions, and the mutable model state they change. The stack example models `view : 'a list`, then specifies `push` and `pop` against the pre-state `old s.view`. The paper explains, “The term old s.view represents the pre-state of model view, i.e., the value of this field at the moment the function is called” (section 2, p. 3).

How to do it.
1. Declare an abstract type and a model field representing its mathematical contents (section 2, pp. 2–3).
2. Mark the model field mutable when implementations update it in place.
3. Write a function contract with `requires` for entry assumptions and `ensures` for the result and post-state.
4. State the set of model fields changed by the call using the paper’s `modifies` clause (section 2, p. 3).
5. Use `old` to refer to the pre-state in postconditions; require nonempty state before `pop`.

Verus form. Inference: model fields map to ghost/spec state or a mathematical view function over owned Rust data. Use Verus `requires` and `ensures`; use `old(...)` in postconditions where the Verus construct is available, and state frame effects through the function’s tracked ownership and `ensures` rather than importing GOSPEL’s `modifies` syntax. Keep executable fields and ghost views synchronized with an invariant. This is an inference because the paper targets OCaml/Cameleer.

Evidence and limits. GOSPEL’s formal semantics are defined by translation into Separation Logic (section 2, p. 2), but the tutorial does not provide a separate soundness proof of Cameleer. Its model abstraction is independent of representation, which supports linked lists or ring buffers (section 2, p. 3). Inference: a Verus model view similarly lets VL verify an API without fixing a concrete representation, provided representation invariants are proved.

## technique 2: Cameleer-to-Why3 VC generation and task splitting

What it is. Cameleer accepts an OCaml implementation annotated with GOSPEL, translates OCaml AST to WhyML and Why3 logic, and offers Alt-Ergo, Z3, and CVC5. The Why3 IDE displays generated VCs per top-level definition and allows transformations such as splitting conjunctions. The paper says, “One can also apply proof transformations on nodes, for instance to split a larger VC into its conjunctive clauses” (section 3.1, p. 7).

How to do it.
1. Put implementation and GOSPEL contracts in an `.ml` file.
2. Run `cameleer file.ml`; this launches the Why3 session (section 3.1, p. 7).
3. Select a top-level definition and inspect its generated VCs.
4. Run an SMT solver on a VC; green status indicates discharge, with solver time and proof-step count shown (section 3.1, p. 7).
5. Split a large VC into conjunctive tasks, then focus on precondition, variant-decrease, or postcondition tasks (section 3.1, p. 7).
6. Read the WhyML task’s assumptions and goal when automation fails.

Verus form. Inference: Verus users already receive SMT obligations, but VL can imitate the task browser: group obligations by function and split conjunctions into named subgoals while preserving the original proof. Use `assert`, `assert forall`, `requires`, `ensures`, and loop `invariant`; do not write a Verus `invariant(...)` call. Solver timing and proof steps are diagnostic evidence, not proof claims.

Evidence. For the array `find` example, “Cameleer generates 6 VCs, after splitting the formula generated for the find function. All are immediately discharged by Alt-Ergo” (section 3.2, p. 9): denominator six VCs, setting the `find` function, solver Alt-Ergo. For the Boyer–Moore majority function, “The Cameleer-Why3 pipeline generates a total of 25 VCs for function mjrty” (section 5.1, p. 18); they are discharged using Alt-Ergo, Z3, and CVC5. For merge, all three solvers timed out after one second on every split condition except the variant decrease (section 3.1, p. 8), demonstrating that splitting alone does not guarantee automation.

## technique 3: recursive predicates, variants, and proved lemmas

What it is. Recursive specifications must terminate and often need lemmas that connect data-structure operations to the predicate. The merge example defines `sorted_list` recursively and annotates it with `variant l`; `merge_aux` uses a lexicographic pair `variant l1, l2`. When SMT solvers time out, GOSPEL lemmas are introduced and proved by induction rather than assumed.

How to do it.
1. Define the recursive predicate over the mathematical data, with base cases and recursive cases (section 3.1, p. 6).
2. Add a variant that strictly decreases on every recursive call; for lists, structural size is used (section 3.1, p. 6).
3. State function preconditions that capture sortedness and ordering relationships among accumulator and input lists.
4. If VCs remain, add lemmas expressing needed algebraic facts. The paper uses `sorted_mem` for prepending to a sorted list and `sorted_append` for concatenating two sorted lists (section 3.1, pp. 8–9).
5. Prove each lemma by induction in Why3; then let SMT solvers use the proved lemmas to close implementation VCs (section 3.1, p. 9).

The paper emphasizes, “However, contrarily to axioms, lemmas are not assumed: these must be proved correct at definition time” (section 3.1, p. 8).

Verus form. Inference: write recursive `spec fn` definitions only when termination is accepted by Verus, and express decreases through the supported recursive-function mechanism rather than a runtime call. State algebraic facts as `proof fn` or lemmas with `ensures`, and call them only in proof contexts. Do not mark the function being verified `external_body`; an external body would remove the evidence this technique requires. For list append or sortedness, use Verus `seq`, quantified `forall`, and `assert`/`ensures` in forms present in the Verus notes.

Evidence and limits. Merge’s initial run timed out at one second for every split condition except the supplied variant decrease (section 3.1, p. 8); after two lemmas, Alt-Ergo discharged the remaining VCs (section 3.1, p. 9). The tutorial gives no denominator for the number of merge VCs or total proof time, so no success percentage can be inferred.

## technique 4: exceptional postconditions and loop invariants

What it is. Cameleer handles OCaml local exceptions by requiring both normal and exceptional postconditions. In linear search, `Found i` returns an index while `Not_found` establishes that no array position contains the target. A loop invariant states that all already-scanned positions differ from the target.

How to do it.
1. Write the loop over indices and use a local exception to exit with a result (section 3.2, p. 9).
2. Add `invariant forall j. 0 <= j < i -> a.(j) <> x` for the scanned prefix (section 3.2, p. 9).
3. Specify the normal postcondition `a.(i) = x`.
4. Specify an exceptional postcondition `raises Not_found -> forall i. 0 <= i < length a -> a.(i) <> x` (section 3.2, p. 9).
5. Inspect initialization and preservation tasks when an invariant is wrong. The paper’s incorrect `j <= i` invariant fails initialization and preservation; changing it to `j < i` makes initialization vacuous with hypotheses `0 <= j` and `j < 0` (section 3.2, pp. 9–10).

Verus form. Inference: encode normal and exceptional outcomes as a result enum or `Result` return value, with branch-specific `ensures`; Rust panics are not a direct proof-level substitute for OCaml exceptions. Use a loop `invariant` over the scanned prefix and prove initialization, preservation, and termination. Keep the exact bound (`j < i`) explicit. Verus does not use GOSPEL `raises` clauses.

Evidence. The correct `find` contract yields six VCs, all discharged by Alt-Ergo (section 3.2, p. 9). The incorrect invariant still proves the postcondition but fails two invariant obligations—initialization and preservation—showing why each generated task must be inspected rather than trusting a single green result.

## technique 5: Boyer–Moore majority proof with counting specifications

What it is. The tutorial verifies an imperative majority algorithm using constant extra space, references `cand` and `k`, two loops, local exceptions, and a recursive counting function. Three invariants connect the candidate and counter to vote counts in the scanned prefix; multiplication replaces division in formulas because SMT solvers handle it better.

How to do it.
1. Require a nonempty array.
2. First pass: when `k = 0`, set `cand` to the current vote and `k := 1`; increment `k` for equal votes and decrement otherwise (section 5.1, pp. 13–14).
3. Maintain `0 <= k <= numof_eq a cand 0 i` (section 5.1, p. 14).
4. Maintain `2 * (numof_eq a cand 0 i - k) <= i - k` and, for every other candidate `c`, `2 * numof_eq a c 0 i <= i - k` (section 5.1, p. 14).
5. If `2*k > n`, return `cand`; otherwise run a second counting loop with invariant `k = numof_eq a cand 0 i && 2*k <= n` (section 5.1, pp. 14–15).
6. Define `numof` recursively over a half-open range and attach `variant b - a`; define `numof_eq` by specializing it to array equality (section 5.1, pp. 15–16).
7. Prove `numof_bounds`, `numof_append`, `numof_left_add`, and `numof_left_no_add` by induction, then use them to close the 25 generated VCs (section 5.1, pp. 16–18).

Verus form. Inference: use a ghost sequence or quantified array slice to represent `numof_eq`; define a terminating `spec fn` for counting and prove range bounds and append decomposition with `proof fn` lemmas. Encode the three loop invariants in Verus `invariant` clauses and use arithmetic identities that avoid division when they improve solver behavior. Rust array indexing requires explicit bounds; include those in `requires` or loop invariants.

Evidence. The algorithm “uses at most 2M comparisons and constant extra space” (section 5.1, p. 13), where `M` is the number of votes; this is a complexity claim, not a verification denominator. The Cameleer-Why3 pipeline generates exactly 25 VCs for `mjrty`; Alt-Ergo, Z3, and CVC5 discharge them (section 5.1, p. 18). The paper does not state how many proof attempts each solver performs or the time per VC.

## technique 6: purely functional recursive algorithms

The same pipeline verifies immutable tree and list algorithms by specifying mathematical traversals and recursive variants. In the same-fringe example, an enumeration function has a variant based on the remaining tree traversal and postconditions relating the output sequence to tree elements (section 4.1, pp. 11–12). The paper reports 11 VCs for `same_fringe` (section 4.1, p. 13), but gives no solver-by-solver denominator beyond that total.

Inference: Verus can represent immutable structures with `Seq` and recursive `spec fn`s, then prove extensional properties independently of the executable representation. This is useful for agent-written Rust libraries whose core algorithms are functional even when storage is mutable.

## what is proved, trusted, and left open
The tutorial demonstrates mechanically checked contracts for merge, array search, same-fringe comparison, and Boyer–Moore majority, with the stated VC counts above. Trust remains in OCaml parsing/typechecking, Cameleer’s OCaml-to-WhyML translation, Why3 transformations, solver implementations, library specifications, and axioms. In the merge example, preorder laws supplied as axioms are assumptions, while the sortedness lemmas are proved; confusing the two changes what is trusted. Inference: VL must label axiomatized facts and `assume` statements as trusted inputs and keep them separate from proved Verus lemmas.

The paper does not establish that every OCaml program can be verified automatically: merge requires auxiliary induction lemmas, and solver timeouts occur at a one-second limit. It also does not measure user effort, total development time, or bug-finding rates. Inference: for agent-written verified Rust, the main threat is incomplete specifications and incorrect invariants that produce a green proof of the wrong property. The highest-value product behavior is therefore displaying the exact task, model view, invariant initialization/preservation obligations, and trusted assumptions.

What VL should not redo: generic contract syntax, VC splitting, solver orchestration, recursive-variant obligations, and induction transformations are established by GOSPEL/Cameleer/Why3. Inference: VL should concentrate on Rust ownership-aware model views, precise exception/result contracts, and source-level explanations that preserve Verus semantics.

## techniques for the catalog
- model-state contracts — specify mutable APIs through abstract views, preconditions, postconditions, and pre-state values
- VC task splitting — translate annotated code to solver tasks and split conjunctions into focused obligations
- variants and proved lemmas — ensure recursive termination and discharge automation gaps with induction-proved facts
- exceptional postconditions — specify normal and exceptional outcomes separately and verify both
- prefix loop invariants — reason about scanned array prefixes with exact strict bounds
- counting-function invariants — use recursive range counts, arithmetic-friendly inequalities, and decomposition lemmas for majority proofs
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
