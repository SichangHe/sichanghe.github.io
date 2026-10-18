# Efficient verification of imperative programs using auto2
(authored by agents unless marked 🧑)
Tag: `zhan2016efficient`, [paper](http://arxiv.org/abs/1610.06996v3)

## scope and proof architecture

Zhan configures the Isabelle prover auto2 for a two-stage workflow: prove a functional program, then refine it to an imperative implementation with separation logic. The introduction states: “The verification process can be roughly divided into two stages: verifying a functional version of the program, and refining it to an imperative version using separation logic.” (§1, p.2) Case studies include red-black and interval trees, priority queues, union-find, Dijkstra's algorithm, and rectangle intersection.

Inference: the useful VL pattern is to separate algorithmic invariants from memory-transfer proofs, then connect them through a representation relation. A Verus development can use pure `spec fn` models and executable Rust methods with `requires`/`ensures` contracts in the same role.

## technique: saturation-based proof search

What it is. Auto2 maintains a list of facts and terms, tables for equalities and properties, and a priority queue of new items. Proof steps generate items from existing items; items with smaller propositions receive higher priority. The paper says: “Auto2 uses a saturation-based proof search mechanism.” (§2, p.2) The paper contrasts this with “the backtracking approach usual in the tactics framework” (§1, pp.1–2). Inference: the search keeps derived facts and applies all registered rules repeatedly.

When to use it. Inference: use saturation when many small domain lemmas should cooperate, especially list/set arithmetic and side conditions that recur across a proof. Add a proof step when a theorem can be triggered by a term or fact pattern.

How to apply it (paper procedure).
1. Convert the goal to contradiction form and initialize the item list with assumptions (§2, pp.2–3).
2. Register forward/backward proof steps, rewrite rules, property predicates, and well-formedness conditions during theory development (§2.1–2.3, pp.3–4).
3. Let each iteration apply current steps, score generated items, and enqueue them; insert selected equalities into the rewrite table (§2.1–2.2, p.3).
4. Generate case-analysis boxes when a proof step requests a condition; derive contradictions in each box and propagate the negation to the parent (§2.4, p.4).
5. Finish when a contradiction is derived in the initial box (§2.4, p.4).

Verus form. Inference: Verus's SMT calls are not a saturation API. The closest form is to register reusable `lemma` functions and invoke them explicitly or through triggers, with `assert` exposing intermediate facts. A separate proof-generation layer could implement a priority queue, but its result must be emitted as ordinary Verus proof code.

## technique: rewrite, property, and well-formedness tables

What they are. The rewrite table stores ground equalities and performs E-matching without rewriting the proof state destructively (§2.2, p.3). The property table records predicates such as list sortedness or tree invariants; the well-formedness table records side conditions such as `i < length xs` for indexing (§2.3, pp.3–4). A theorem proof step can look up these facts instead of reproving them.

How to apply them.
1. Register a predicate as a property and a function's argument conditions as well-formedness conditions (§2.3, pp.3–4).
2. Add forward steps for facts such as `sorted (x#xs) ∧ y ∈ set xs ⇒ x ≤ y`; add backward steps that reduce a goal to a table lookup (§3.1, p.5).
3. Add rewrite steps for operations such as list update, guarded by well-formedness (`i < length xs`) (§3.1, p.6).
4. Keep derived equalities in the rewrite table and E-match future terms against them (§2.2, p.3).

Verus form. Inference: represent properties as predicates in `spec fn` and prove side conditions with lemmas. Verus's solver context acts like a rewrite environment, but facts are not automatically indexed in user-defined tables; explicit lemma calls or `assert` statements are needed.

## technique: arithmetic normalization and difference logic

What it is. Auto2 implements a well-formed conversion for natural-number addition and subtraction. It normalizes two expressions only after all subtraction side conditions are present; if normal forms agree, it emits an equality (§3.2, pp.6–7). It also represents inequalities `a ≤ b + n` as special `NAT_ORDER` items and derives transitive inequalities. A negative self-edge yields a contradiction via the difference-logic rule (§3.3, p.7).

How to apply it.
1. Register well-formedness conditions for truncated natural subtraction, such as `a ≥ b` for `a - b` (§2.3, p.4; §3.2, p.7).
2. Normalize both sides with a conversion that returns the equality and new right-side side conditions (§3.2, p.7).
3. For inequalities, create `<a,b,n>` items, apply transitivity to compose edges, and reject `<a,a,n>` when `n < 0` (§3.3, p.7).

Verus form. Inference: use `assert` and arithmetic lemmas over integer or `nat` specifications, adding explicit bounds before subtraction. Verus's SMT can solve linear arithmetic, but the paper's incremental normalization and negative-cycle representation would require an external proof preprocessor.

## technique: functional invariant proof with guided induction

What it is. The functional stage proves list, set, map, and data-structure facts before heap reasoning. Auto2 proof scripts can supply an induction principle while the saturation engine discharges routine cases. In the union-find example, the script proves invariant preservation (including representative-domain bounds) and representative preservation with `@prop_induct`, while the final abstraction-correctness lemma is proved by plain `by auto2` (§3.4, p.8). The paper states: “The only hints that needs to be provided by the human to prove these lemmas are how to apply the induction (specified using the @prop_induct command).” (§3.4, p.8)

How to apply it.
1. Define the functional operation and its invariant, for example `ufa_compress` and `ufa_invar` (§3.4, p.8).
2. State an invariant-preservation lemma and an abstraction-correctness lemma (§3.4, p.8).
3. Use `@prop_induct` with the invariant and bounds as the induction proposition; let registered proof steps solve list and arithmetic obligations (§3.4, p.8).
4. Reuse the resulting functional facts while refining the imperative procedure (§5.3–5.4, pp.11–13).

Verus form. Inference: define the mathematical data structure as a `spec fn` or ghost type, state an inductive invariant, and write a `lemma` with recursive calls or `forall` reasoning. Verus requires the induction structure and triggers to be expressed in Rust syntax; it does not consume auto2 scripts.

## technique: separation logic assertions and frame inference

What it is. Imperative HOL represents heaps as finite maps and assertions over partial heaps. A points-to assertion owns one address; separating conjunction `P * Q` splits the address set into disjoint parts. A Hoare triple `<P> c <Q>` states that command c transforms a heap satisfying P into one satisfying Q. The frame rule preserves a disjoint R: `<P> c <Q> ⇒ <P * R> c <λx. Q(x) * R>` (§4.1–4.2, pp.8–9).

When to use it. Use spatial assertions for pointer structure and pure assertions for mathematical constraints. The paper limits programs to sequential code and simple allocation patterns (§1, p.2).

How to apply it (paper procedure).
1. Define a partial-heap assertion for each concrete object (`p ↦r a`, `p ↦a xs`) and combine disjoint objects with `*` (§4.2, p.9).
2. State Hoare triples for primitive commands and procedures, including return values and newly allocated addresses (§4.2, p.9).
3. Verify an imperative sequence forward: match the command, match its spatial precondition against the current precondition, prove pure side conditions, then replace the command with its postcondition (§5.1, pp.10–11).
4. Finish by proving a separation-logic entailment between the computed postcondition and the target (§5.1, p.11).

Verus form. Inference: model owned heap fragments with ghost maps or ownership predicates, use `requires` and `ensures` for Hoare pre/postconditions, and prove a frame lemma for untouched fragments. Verus does not have built-in separating conjunction; an encoding must make disjointness and ownership explicit.

## technique: inductive assertions and specialized matching

What it is. Linked lists and trees have recursively defined assertions. The paper states a policy of “always using assertions in the more expanded form”, with a special matching function that consults a list of inductive definitions of assertions (§5.2, p.11). For a binary tree, `btree t p` relates a functional tree to a heap pointer and recursively owns its child pointers.

How to apply it.
1. Define the inductive assertion with base and node cases (§5.2, p.11).
2. Register its definition so the specialized matcher can expand either a whole tree or a child component (§5.2, p.11).
3. Match command preconditions against any compatible expansion and infer the untouched frame (§5.1–5.2, pp.10–11).
4. Reassemble the target assertion in the final entailment (§5.1, p.11).

Verus form. Inference: use recursive `spec fn` predicates over ghost views and prove recursive lemmas about node ownership. Verus's `invariant` clauses can carry the expanded shape through loops, but automatic matching of arbitrary recursive predicates is not guaranteed.

## technique: abstraction layers for modularity

What it is. For each data structure, the paper defines a concrete assertion and an abstract assertion. For binary trees, `btree_map M p` hides the representation while exposing a map and sortedness. First prove a concrete Hoare triple, then derive an abstract triple using functional correctness and invariant lemmas (§5.3, pp.11–12). The concrete proof steps are removed from auto2 after the abstract interface is established, enforcing modularity.

How to apply it.
1. Define a concrete representation relation and prove each operation's concrete Hoare triple (§5.3, p.12).
2. Define an abstract predicate that existentially packages the representation, sortedness, and mathematical map (§5.3, p.11).
3. Derive abstract operation contracts from concrete contracts and functional lemmas (§5.3, p.12).
4. Hide the concrete proof rules so future clients use only the abstract contracts (§5.3, p.12).

Verus form. Inference: expose an abstract `spec fn` view and keep representation lemmas private to a module. Public Rust methods should have contracts over the abstract view; internal proofs can use concrete ownership predicates.

## evidence, assumptions, and trusted base

The case-study table reports 49 imperative lines and 26 theorems for union-find, 270/83 for red-black trees, 84/50 for interval trees, 33/31 for rectangle intersection, 83/53 for indexed priority queues, and 44/62 for Dijkstra's algorithm; `#Step/#Imp` ratios range from 0.64 to 3.41 (Table in §6, p.13). On a laptop with two 2.0-GHz cores and 16 GB RAM, all examples take approximately 14 minutes (§6, p.13). These denominators and hardware settings are the paper's own; they are not proof-time guarantees for Verus.

The red-black-tree development proves both functional correctness and invariant maintenance before the imperative version (§6.2, p.14). The paper says “Formal verification of interval trees and the line-sweeping algorithm for rectangle intersection appear to be new.” (§6.3, p.14), while Dijkstra verification uses simplifying assumptions: vertices are `0..n−1`, one directed edge exists per ordered pair, and the graph matrix is unchanged and kept off-heap (§6.4, pp.14–15). The union-find proof omits the component-size array's performance invariant (§6.1, p.13).

Inference: trusted elements include Isabelle's kernel and libraries, auto2's ML implementation, the registered theorem/proof steps, the separation-logic definitions, and the human-supplied induction hints. A Verus analogue additionally trusts the Verus verifier, SMT solver, Rust compiler, specifications of external libraries, and any ghost model of heap ownership. The paper verifies sequential programs with simple allocation patterns; it does not establish concurrency, unsafe Rust, FFI, or arbitrary allocation correctness.

## VL implications

Inference: VL should reuse the two-stage split, concrete-to-abstract representation relations, and modular hiding of low-level proofs. These techniques prevent every client proof from reopening pointer layout. A Verus implementation should benchmark whether explicit lemmas and solver context can replace auto2's saturation tables before building a new search engine. The paper has already verified the listed data structures and Dijkstra variant; VL should avoid redoing those as novelty claims and instead test agent-written Rust, ownership APIs, concurrency, and dependency evolution.

Inference: the product threat is moderate for sequential data structures and high when generated code crosses representation, allocation, or external-library boundaries. A successful abstract contract can remain valid while the implementation's unmodeled assumptions change. The paper's own simplifying assumptions and omitted size invariant show why a passing proof is bounded by its stated model.

## techniques for the catalog

- saturation proof search — repeatedly apply scored proof steps to a shared fact list until contradiction
- rewrite and property tables — index equalities, invariants, and well-formedness facts for E-matching
- well-formed arithmetic normalization — normalize natural subtraction only under proved side conditions
- difference logic — derive transitive inequalities and detect negative cycles
- guided inductive functional proofs — supply an induction proposition while automation proves routine cases
- forward separation refinement — match each imperative command against spatial and pure preconditions
- inductive heap assertions — expand recursive list/tree predicates to expose frame components
- abstraction-layer contracts — derive abstract Hoare triples and hide concrete representation proofs
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "While less efficient than a graph-based implementation, it is sufficient for our purposes, and also interacts better with other proof steps."): read the whole paper text and checked every quotation, the case-study table numbers, the 14-minute and hardware figures, and section and page references; changed the attribution of the first quote (introduction, not abstract), the union-find example description (the last lemma uses plain auto2, not induction), the extended quotation of the induction-hint sentence, several page references (§2 start, §4.2, §5.2), the inductive-assertion description, the interval-tree quote, and marked some statements as Inference; did not check the Verus-side claims against Verus documentation or the cited references, and the link is the arXiv link already in the study (matches the paper text).
