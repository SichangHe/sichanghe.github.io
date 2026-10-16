# Predicate Abstraction for Linked Data Structures
(authored by agents unless marked 🧑)
Tag: `bakst2015predicate`, [paper](https://arxiv.org/abs/1505.02298)

## scope and results

Bakst and Jhala introduce Alias Refinement Types (Art), a separation-logic subset that separates physical heap shape from logical data properties. The abstract states the two components explicitly: “(1) Alias Types, which reason about the physical shape of heap structures, and (2) Refinement Types, which use simple predicates from an SMT decidable theory to capture the logical or semantic properties of the structures.” (abstract, p.1). The tool infers refinements for imperative linked structures rather than requiring a complete loop-invariant and intermediate-contract annotation.

Art's evaluation has two dimensions. Table 1 contains eight structure families (singly, doubly, cyclic, and sorted lists; binary tree; max heap; binary search tree; red-black tree), their procedures, lines of code, and verification time in seconds (Table 1, p.15). The tested properties are length, keys, sortedness, traversal order, heap order, BST, and red-black invariants. Table 2 compares nine selected procedures against VCDryad. The total is 63 Art annotation tokens versus 428 VCDryad annotation tokens, and 168 versus 253 specification tokens; the paper reports overall Art annotations “about 34% of those required by VCDryad” and, for intermediate function specifications, “about 21% of the annotation required by VCDryad” (Table 2, p.16). These denominators are token counts for the listed procedures, not percentages of all programs or proof time.

## technique 1: split physical alias shape from logical refinement

What it is: Art types describe ownership, reachability, nullness, and links in an alias/heap component, while refinement predicates describe values stored in those locations. This avoids a monolithic assertion that mixes pointer shape and data facts. Heap binders name pure snapshots of mutable fields so refinements can relate values across updates (§1, p.2).

How to apply it:

1. Give each reference a physical alias type describing the location and reachable heap. A list type is iso-recursive and records a head cell plus an optional tail reference (§2, p.4).
2. Attach a logical predicate variable `κ` to the stored data type. For an unknown output, use a template such as `list<κ>` (§2, pp.3–5).
3. Use heap binders for old snapshots and strongly update the data field after a call. In `absR`, the result of `abs` refines the field and the heap type records the update (§2, p.3).
4. Generate logical subtyping constraints while the physical system checks shape and alias safety.

Evidence: the `absR` example infers a nonnegative data field after updating a reference (Fig. 2, p.3). The authors attribute this to the separation: “This is possible because the κ variables denote pure formulas, as reasoning about the heap shape is handled by the alias type system.” (§2, p.3).

Inference: in Verus, model the logical view with `spec fn` over a ghost `Seq`, `Set`, or mathematical map, and use executable Rust ownership plus `requires` to state valid references. Use `ensures` for the updated logical value and a `proof fn` for the relation between old and new views. Verus does not have Art's alias-type syntax or heap binders, so the physical/logical split must be encoded through Rust references, ghost snapshots, and explicit contracts. Inference: preserve the split at module boundaries; do not ask a single giant `ensures` formula to encode both pointer reachability and all data invariants.

## technique 2: path-sensitive constraint generation and predicate abstraction

What it is: Art first replaces unknown refinements with templates containing fresh `κ` variables. It symbolically traverses the program, extending the environment with branch guards and generating Horn clauses at calls and returns. A predicate-abstraction solver computes a least-fixpoint solution for the `κ`s (§2, pp.3–4; §3.2, p.14).

How to apply it:

1. Provide unrefined signatures and a set of predicate templates; leave intermediate refinements unknown.
2. Convert mutable variables to SSA names so a refinement such as `ν == x` is not invalidated by later assignment (§2, p.3).
3. On each branch, add the guard to the path environment. At each call and return, emit a subtyping constraint from actual to expected refinement (§2, p.3).
4. Decompose heap subtyping field by field, producing Horn implications over pure predicates (§3.2, p.14).
5. Solve the Horn system by predicate abstraction over the user-supplied predicate domain. If a solution exists, substitute it for each `κ` and typecheck the program (§3.2, p.14).

The paper formalizes this as `CGen`, which returns constraints plus post-statement type and heap environments (Fig. 9, p.13). It proves that a satisfiable constraint set yields a valid typing derivation and then translates typing derivations to separation-logic proofs (§3.3, pp.14–15).

Inference: Verus does not infer `requires` or `ensures` this way. A VL tool can generate candidate `spec fn` predicates and contract clauses, run Verus, and refine candidates from diagnostics, but that synthesis loop is outside Verus. Inference: branch guards should become explicit assumptions in proof blocks; a candidate that is not implied by the guard must be rejected rather than assumed.

## technique 3: fold and unfold for recursive linked structures

What it is: `unfold(&x)` exposes a recursive list's head and tail so fields can be read or strongly updated. `fold(&x)` reassembles the exposed heap into a summarized recursive list and generates constraints relating the head and tail predicates (§2, pp.4–6).

How to apply it:

1. Before accessing a recursive object, unfold its alias type into a head cell and a distinct tail heap (§2, p.5).
2. Perform the field update; the result receives a fresh logical binder and the inferred predicate from the called function.
3. If the tail is null, fold the head directly into the recursive summary. If non-null, recursively verify the tail, then fold both head and tail (§2, pp.5–6).
4. Solve the generated head/tail implications. In `absL`, constraints `κ1 ⇒ κ3` and `κ3 ⇒ κ3` infer `κ3 = 0 ≤ ν`, proving every list datum is nonnegative (§2, p.6).

The paper says the user does not write these annotations: “The annotations unfold and fold allow Art to manage updates to collections such as lists. In Art, the user does not write fold and unfold annotations; these may be inferred by a straightforward analysis of the program.” (§2, p.5). The physical type system guarantees distinctness and reachability; the logical solver handles the data predicate.

Inference: Verus has no `fold`/`unfold` commands. Represent a recursive structure with a ghost view function and prove lemmas that expose one-step head/tail facts, then re-establish a `#[verifier::type_invariant]` or function `ensures`. Loop or recursion summaries require explicit `invariant` clauses and `decreases` measures. Inference: a VL generator should keep the view lemma separate from the mutation proof so a shape failure cannot be hidden by weakening a data predicate.

## technique 4: strongly update collections while preserving shape

Art's strong update tracks that a call changes the logical type at an existing heap location, without changing its physical identity. `absR` updates one field; `absL` recursively updates every list cell. The technique applies when the alias type proves that the target location is unique and reachable. It does not apply to arbitrary shared graphs without an appropriate physical discipline.

Inference: in Verus, use mutable borrows to obtain exclusive access, snapshot the old logical view with `old(...)` in the postcondition, and prove that the new view satisfies the strengthened predicate. Shared `Arc`-like structures require a separate ghost ownership protocol; the paper's alias types should not be treated as a direct model of Rust sharing.

## technique 5: inferred intermediate contracts for data-structure algorithms

The automation target is not only local fields. Art infers preconditions and postconditions for intermediate procedures used by a top-level specification. In the Table 2 benchmark, `rev`, `double`, `pairwiseSum`, `insSort`, `mergeSort`, `quickSort`, and BST deletion are compared with VCDryad. For example, Art uses 18 annotation tokens for `mergeSort` and 18 for `quickSort`, while VCDryad uses 79 and 140 respectively (Table 2, p.16). These are the listed procedure-level token counts, not a claim that all programs have this ratio.

Inference: for Verus, preserve human-approved top-level `ensures` clauses and synthesize only intermediate `requires`/`ensures`, loop `invariant`s, and `proof fn` lemmas. Verus must check each generated contract; an inferred contract that is too strong can make callers appear easy by making the callee uncallable, so candidate preconditions need satisfiable test calls. The paper itself does not study adversarial or vacuous specifications.

## technique 6: soundness through separation-logic interpretation

The type system is interpreted as separation-logic assertions. The paper's Typing Translation theorem maps a typing derivation to a valid Hoare-style separation-logic proof, and its soundness corollary says that a closed, typechecked program has no null memory accesses and all programmer assertions succeed (§3.3, pp.14–15). This is a formal result for the calculus and implementation model. It does not establish functional correctness beyond the supplied refinements, nor the correctness of the compiler, solver, or runtime.

Inference: Verus provides a different proof pipeline: executable Rust plus specifications are translated to SMT obligations, and `proof fn` code discharges lemmas. The Art lesson is to keep a semantic interpretation for each ghost view and to make the trusted boundary explicit. Inference: the trusted base for a VL product includes Verus, its SMT backend, Rust compilation/unsafe abstractions, external API specifications, and the generated model. A successful proof of an incorrect view remains a successful proof of the wrong property.

## limits, prior work, and product threat

Art is limited to “tree-like” ownership structures. The paper allows sharing and cycles in examples but says the system rejects a singly linked list that traverses deeply and returns a pointer to an unboundedly deep cell (§4, p.16). The authors suggest enriching alias typing with zippers and magic wands; this is future work, not an implemented capability. The evaluation also omits incomparable benchmarks and single-function implementations from Table 2 (§4, p.15).

No earlier local walkthrough study covers this exact alias/refinement split. Existing Verus notes already cover explicit contracts, invariants, ghost state, and proof lemmas; VL should adapt these patterns rather than reimplement Art's imperative language or claim automatic heap predicate abstraction. Inference: threat to an agent-written verified-Rust product is high for wrong views, missing ownership cases, and unsupported sharing; medium for proof-generation mistakes when Verus checks all obligations; and lower for the specific null-dereference obligations that the verifier actually proves. Inference: product evaluation should report denominator, structure family, annotation effort, and proof time separately, because Art's 21% figure is only intermediate-annotation tokens over the Table 2 subset.

## techniques for the catalog
- alias/refinement separation — reason about heap shape and data predicates in independent type components
- path-sensitive Horn generation — turn branch environments, calls, returns, and heap updates into refinement constraints
- predicate-abstraction inference — solve unknown refinements as a least-fixpoint Horn solution over predicate templates
- fold/unfold recursive summaries — expose one list cell for updates and fold it back into a verified recursive invariant
- strong heap updates — propagate a callee's logical refinement to a uniquely owned mutable location
- inferred intermediate contracts — reduce annotation for helper procedures while preserving top-level specifications
- separation-logic soundness translation — interpret typing derivations as proofs of memory safety and assertion success
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
