# The Complexity of Interference: When Rely/Guarantee Does Not Work
(authored by agents unless marked 🧑)
Tag: `yatapanage2026complexity`, [paper](http://arxiv.org/abs/2609.27392v1)

## problem and contribution

Yatapanage studies Ben-Ari's concurrent mark-and-sweep collector, where a Mutator changes heap links while a Collector marks and frees nodes. Ordinary rely/guarantee conditions are hard to make compositional because the Collector's rely mentions its local `safe` set, while the Mutator cannot know that set. The abstract states: “This is accomplished by reasoning that a given property holds for all instances of a particular variable and then instantiating the variable to the local variable required.” The proposed Holds For All rule bridges the components through a universally quantified set variable rather than a shared ghost variable.

Inference: The pattern is directly relevant to concurrent Rust verification when one task's proof depends on another task's private view of shared state. It suggests proving a parametric ownership or reachability property once, then instantiating it at the consumer's local set.

## technique 1: identify the semantic interference obligation

The paper first models the Collector's Mark, Sweep, and Unmark phases and the Mutator's redirect, allocate, and remove actions (§3, pp. 4–6). A redirect must mark its new destination before another update. Otherwise the Collector can miss a newly reachable node and free it. In the paper's example, the Collector examines A, the Mutator redirects A to C and removes B→C, and C is then swept even though it is in use (§3.1, pp. 5–7).

How to apply it.
1. Write the concrete state: roots, heap, free set, marked set, and Collector-local `consid`/`safe` sets (Definitions in §3.2, pp. 7–8).
2. State the safety invariant `free ∩ reach(roots,heap) = {}` so live nodes cannot be free (§3.2, p. 7).
3. Examine an interference trace and isolate the ordering requirement. The paper says: “The essential requirement is that the Mutator must mark the destination node before performing another update, such as a deletion as in the example” (§3.1, p. 6).
4. Define a state predicate that captures the semantic reason for the ordering, rather than encoding the trace directly.

Inference: In Verus, represent the abstract heap and marked/free sets in `spec fn`s; use executable Rust only for the concrete operations. State-machine transitions can carry `requires` and `ensures` about reachability and disjointness, while `proof fn` lemmas establish preservation. The paper's VDM maps and sets are a model, not a Rust implementation.

## technique 2: the can-be-marked bridge predicate

The Collector needs a property over a set `s`: every marked node in `s` with an unmarked reachable child has either an alternative path through roots or a path through marked nodes outside `s` that will cause future discovery. This is `can-be-marked(s,σ)` (§4, pp. 7–8). A stronger predicate `all-ok(s,σ)` states that every child of a marked node in `s` is already marked. The `safe` set is the subset of Collector-`consid` that still satisfies `all-ok` when an interruption occurs (§4, pp. 8–9).

How to apply it.
1. Define `can-be-marked` universally over addresses in `marked ∩ s`, over child indices, and over reachable children (p. 8).
2. Define `all-ok` as the stronger no-unmarked-child condition (p. 8).
3. Derive the Collector rely: marked sets only grow; modified links remain reachable from roots; and if `all-ok(safe,σ)` held, then `can-be-marked(safe,σ′)` or the marked count increased (the `rely-Collector` formula, §4, p. 9).
4. Prove the Mutator's atomic transitions preserve the bridge, without mentioning `safe`.

Inference: A Verus encoding can use `spec fn can_be_marked(s: Set<Addr>, st: State) -> bool` and `spec fn all_ok(...)`; `requires`/`ensures` on transition functions state the same implications. `Set` and map operations must be represented using the Verus-supported mathematical types used by the project. `Tracked` tokens can carry permissions for concrete heap cells, but the reachability predicates remain ghost specifications.

Evidence. The paper explicitly distinguishes the predicates: “This property is stronger than can-be-marked, stating that there are no marked nodes with unmarked children” (§4, p. 8). The rely condition is then written in terms of `safe`, `can-be-marked`, and marked-count growth (§4, p. 9).

## technique 3: Holds For All reasoning

The central rule is Theorem 1, “Holds For All” (§5, pp. 9–10). Let component B satisfy `guar-B(σ,σ′)`. Suppose `p(s,σ)` holds for a variable `s`; for every `w`, `p(w,σ)` plus B implies `q(w,σ,σ′)`; and `p(s,σ)` plus `q(s,σ,σ′)` implies component A's rely. Then `rely-A(σ,σ′)` follows. The proof is a one-line instantiation: choose the particular `s` required by A from the universally quantified clause.

How to apply it.
1. Choose `p` as the property a component can maintain without seeing the other component's local variable. Here `p = all-ok`.
2. Choose `q` as the post-transition bridge. Here `q = can-be-marked ∨ (marked′ > marked)` (§5.1, p. 10).
3. Prove the universal obligation for every set `w`, not just the consumer's hidden `safe` set.
4. Instantiate `w` with `safe` to derive the Collector rely (§5, pp. 9–10).
5. Discharge the remaining rely clauses directly because they do not mention Collector-local variables (§5.2, pp. 11–12).

The paper says: “The Mutator is required to show that the third clause above holds over any variable w.” This is what removes the need for a shared `tbm` ghost variable in the Collector's rely.

Inference: In Verus, encode the universal clause as a `proof fn` whose input is an arbitrary mathematical set and whose postcondition is `q`; call it at the concrete `safe` set in a second proof. The parametric lemma should quantify over the set in a `forall` expression or use a proof function parameter, depending on the supported Verus pattern. Do not model the theorem as a runtime function.

## technique 4: atomic transition lemmas

The Mutator is split into `Change` and `MarkTbm`, each atomic. `post-Change` records either deletion or the new target in `tbm`, while preserving the marked set; `post-MarkTbm` either leaves marks unchanged when `tbm=nil` or adds `tbm`, then clears it (§5.1, pp. 10–11). Lemma 1 proves `all-ok(s,σ) ∧ post-Change ⇒ can-be-marked(s,σ′) ∧ tbm-put(s,σ′)`. Lemma 2 proves `can-be-marked ∧ tbm-put ∧ post-MarkTbm ⇒ all-ok ∨ marked-count-increased` (pp. 10–11).

Apply the sequence as follows:
1. Prove Lemma 1 for every set `s` after Change.
2. Track `tbm-put`, which says `tbm` is the only unmarked child of a marked node in `s` (§5.1, p. 11).
3. Apply Lemma 2 after MarkTbm.
4. If the qualifying set shrinks, use the increased mark count to force another Collector propagation cycle (§5.1–§5.2, pp. 11–12).

Inference: Verus transition proofs would use `requires`/`ensures` for `post_change` and `post_mark_tbm`, then `proof fn` lemmas for the two implications. The concrete `tbm` field can be ghost or executable; ownership and atomicity assumptions must be supplied by the concurrency model.

## evidence, limits, and VL implications

The paper proves the Holds For All rule and the two Mutator lemmas, but says: “The proofs are currently being mechanised and will be completed for future work” (§6, p. 12). There is no runtime benchmark, coverage denominator, or measured verification cost. Thus the formal result is a reasoning schema plus a hand proof for the Ben-Ari model, not a mechanized Rust artifact. Earlier approaches already verified this collector with PVS/Murφ and Owicki–Gries; the paper claims those proofs were non-compositional or used auxiliary variables (§6, pp. 12–13).

Inference: The threat to agent-written verified Rust is substantial for concurrent components whose specifications mention private ghost state: a local proof may pass while the bridge property is absent. Holds For All offers a way to expose the core invariant and avoid brittle cross-component references, but it does not establish Rust memory safety, scheduler fairness, atomicity, or correctness of the Verus concurrency encoding. VL should reuse the parametric bridge pattern and explicitly record these trusted assumptions.

## techniques for the catalog

- holds-for-all rule — prove a bridge property for every abstract variable and instantiate it at another component's local variable
- 
- can-be-marked invariant — express that marked children remain discoverable through an alternate path or future propagation
- 
- atomic transition lemmas — split concurrent updates into Change and MarkTbm and prove each preservation implication
- 
- safe-set rely derivation — derive a component's rely from a universally quantified guarantee without sharing its local set
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
