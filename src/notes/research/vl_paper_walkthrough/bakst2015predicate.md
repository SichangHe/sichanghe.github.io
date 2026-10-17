# Predicate Abstraction for Linked Data Structures
(authored by agents unless marked 🧑)
Tag: `bakst2015predicate`, [paper](https://arxiv.org/abs/1505.02298)

## scope and results

Bakst and Jhala introduce Alias Refinement Types (Art), a separation-logic subset that separates physical heap shape from logical data properties. The abstract states the two components explicitly: “(1) Alias Types, which reason about the physical shape of heap structures, and (2) Refinement Types, which use simple predicates from an SMT decidable theory to capture the logical or semantic properties of the structures.” (abstract, p.1). The tool infers refinements for imperative linked structures. In the paper's setup (§4, pp.14–15), the user supplies type definitions, functions with unrefined signatures, refined specifications for top-level functions, and predicate templates [31]; Art infers the intermediate refinements (loop and helper-function contracts) and inserts `fold`/`unfold`/`concr`/`pad` heap annotations itself (§2, p.5; Appendix E, pp.43–47).

Art's evaluation has two dimensions, expressiveness and automation (§4, p.15). Table 1 contains eight structure families (singly, doubly, cyclic, and sorted lists; binary tree; max heap; binary search tree; red-black tree), their procedures, lines of code, and verification time in seconds (Table 1, p.15). The tested properties are length, keys, sortedness, traversal order, heap order, BST, and red-black invariants (§4, p.15). Table 2 compares eight procedure rows (singly-list `rev`; sorted-list `rev`, `double`, `pairwiseSum`, `insSort`, `mergeSort`, `quickSort`; BST `del`), plus three data-structure definitions, against VCDryad. The Table 2 totals are 63 Art "Annotation" tokens versus 428 VCDryad "Annotation" tokens, and 168 versus 253 "Specification" tokens. The caption defines the Art annotation column as "manually-provided predicate templates" and VCDryad's as loop invariants plus intermediate-function specifications, and says: “Art Annot totals include only unique predicate templates across benchmarks.” The Art per-row entries sum to 85, not 63, because of that de-duplication. The paper reports overall Art annotations “about 34% of those required by VCDryad” and, for intermediate function specifications, “about 21% of the annotation required by VCDryad” (§4, p.16, after Table 2). Inference: the 34% matches (168+63)/(253+428) = 231/681; I could not reproduce 21% from Table 2 (63/428 is about 15%, 85/428 about 20%), so cite the paper's 21% as its own claim. These denominators are token counts for the listed procedures, not percentages of all programs or proof time.

## technique 1: split physical alias shape from logical refinement

What it is: Art types describe ownership, reachability, nullness, and links in an alias/heap component, while refinement predicates describe values stored in those locations. This avoids a monolithic assertion that mixes pointer shape and data facts. Heap binders name pure snapshots of mutable data so refinements can relate values across updates (§1, p.2; §2, p.6).

How to apply it:

1. Give each reference a physical alias type describing the location and reachable heap. A list type is iso-recursive and records a head cell plus an optional tail reference (§2, p.4).
2. Attach a logical predicate variable `κ` to the stored data type. For an unknown output, use a template such as `list<κ>` (§2, pp.3–5).
3. Use heap binders for old snapshots and strongly update the data field after a call. In `absR`, the result of `abs` refines the field and the heap type records the update (§2, p.3).
4. Generate logical subtyping constraints while the physical system checks shape and alias safety.

Evidence: the `absR` example infers a nonnegative data field after updating a reference (Fig. 2, p.3). The authors attribute this to the separation: “This is possible because the κ variables denote pure formulas, as reasoning about the heap shape is handled by the alias type system.” (§2, p.3).

Inference: in Verus, model the logical view with `spec fn` over a ghost `Seq`, `Set`, or mathematical map, and use executable Rust ownership plus `requires` to state valid references. Use `ensures` for the updated logical value and a `proof fn` for the relation between old and new views. Verus does not have Art's alias-type syntax or heap binders, so the physical/logical split must be encoded through Rust references, ghost snapshots, and explicit contracts. Inference: preserve the split at module boundaries; do not ask a single giant `ensures` formula to encode both pointer reachability and all data invariants.

## technique 2: path-sensitive constraint generation and predicate abstraction

What it is: Art first replaces unknown refinements with templates containing fresh `κ` variables. It symbolically traverses the program, extending the environment with branch guards and generating Horn clauses at calls and returns. A predicate-abstraction Horn solver computes a least-fixpoint solution for the `κ`s (§2, p.3; §3.2, pp.13–14).

How to apply it:

1. Provide unrefined signatures and a set of predicate templates; leave intermediate refinements unknown (§3.2, p.13; §4, pp.14–15).
2. Convert mutable variables to SSA names so a refinement such as `ν == x` is not invalidated by later assignment (§2, p.3).
3. On each branch, add the guard to the path environment. At each call and return, emit a subtyping constraint from actual to expected refinement (§2, p.3).
4. Decompose heap subtyping field by field, producing Horn implications over pure predicates; the paper says this "crucially allows the predicate abstraction to sidestep reasoning about reachability and the heap" (§3.2, pp.13–14).
5. Solve the Horn system by abstract interpretation in the predicate-abstraction domain generated from the user-supplied predicate templates. If a solution exists, substituting it for each `κ` gives a typing derivation for the program (§3.2, p.13; §3.3, p.14).

The paper formalizes this as `CGen`, which returns constraints plus post-statement type and heap environments (§3.2, p.14; Fig. 9, p.13 shows only the field-read and field-write cases). Section 3.3 (p.14) states, citing [31], that a satisfiable constraint set yields a type derivation; the main text does not prove this. The separation-logic soundness theorems are proved in Appendix D (pp.26–43).

## technique 3: fold and unfold for recursive linked structures

What it is: `unfold(&x)` exposes a recursive list's head and tail so fields can be read or strongly updated. `fold(&x)` reassembles the exposed heap into a summarized recursive list and generates constraints relating the head and tail predicates (§2, pp.4–5).

How to apply it:

1. Before accessing a recursive object, unfold its alias type into a head cell and a distinct tail heap (§2, p.5).
2. Perform the field update; the result receives a fresh logical binder and the inferred predicate from the called function.
3. If the tail is null, fold the head directly into the recursive summary. If non-null, recursively verify the tail, then fold both head and tail (§2, p.5).
4. Solve the generated head/tail implications. In `absL`, constraints `κ1 ⇒ κ3` and `κ3 ⇒ κ3` solve, together with the earlier constraints, to `κ3 = 0 ≤ ν`, proving every list datum is nonnegative (§2, p.5).

The paper says the user does not write these annotations: “In Art, the user does not write fold and unfold annotations; these may be inferred by a straightforward analysis of the program” (§2, p.5, pointing to Appendix E). Appendix E (pp.43–47) describes the inference function `F`; it also inserts `concr` before field accesses and `pad` where a sub-heap domain is too small, and it states that soundness does not depend on the particular algorithm. The physical type system guarantees distinctness; the logical solver handles the data predicate.

Two details the steps above omit. First, `fold` is not plain heap subtyping: when `xn` is null the unfolded tail `&t` is unreachable, so the tail need not be a subtype of the folded one; the paper handles this with the folding relation (rules F-base, F-ref, F-?ref, Fig. 7, p.10; §3.1, pp.12–13). Second, for recursive properties such as list length, measures are encoded as uninterpreted functions, and their defining equations are added as instantiation constraints at each `fold` and `unfold` (§2, p.7); for `insert` this yields `κ4 = len(ν) = 1 + len(x0)` (§2, p.8).

## technique 4: strongly update collections while preserving shape

Art's strong update tracks that a call changes the logical type at an existing heap location. `absR` updates one field; `absL` recursively updates every list cell (§2, pp.3–5). After `unfold`, "the head structure and (if next is not null) the newly unfolded tail structure are unique and distinct", so the head can be strongly updated (§2, p.5). Art also forbids dereferencing references that point into the cells of a folded structure, which lets it update heap binders locally (§2, pp.6–7). The paper limits Art to "tree-like" ownership structures (§4, p.16).

Inference: this technique applies when the physical type shows the target location is uniquely held; it does not apply to arbitrary shared graphs without an appropriate physical discipline. In Verus, use mutable borrows to obtain exclusive access, snapshot the old logical view with `old(...)` in the postcondition, and prove that the new view satisfies the strengthened predicate. Shared `Arc`-like structures require a separate ghost ownership protocol; the paper's alias types should not be treated as a direct model of Rust sharing.

## technique 5: inferred intermediate contracts for data-structure algorithms

The automation target is not only local fields. Art infers refinement types (pre- and postconditions) for intermediate procedures used by a top-level specification, given manually provided predicate templates (§4, pp.14–16). In Table 2 the compared procedures are `rev`, `double`, `pairwiseSum`, `insSort`, `mergeSort`, `quickSort`, and BST `del`. For example, Art uses 18 "Annotation" tokens (predicate templates) for `mergeSort` and 18 for `quickSort`, while VCDryad uses 79 and 140 respectively (Table 2, p.16). These are the listed procedure-level token counts, not a claim that all programs have this ratio.

Inference: for Verus, preserve human-approved top-level `ensures` clauses and synthesize only intermediate `requires`/`ensures`, loop `invariant`s, and `proof fn` lemmas. Verus must check each generated contract; an inferred contract that is too strong can make callers appear easy by making the callee uncallable, so candidate preconditions need satisfiable test calls. The paper itself does not study adversarial or vacuous specifications.

## technique 6: soundness through separation-logic interpretation

The type system is interpreted as separation-logic assertions. The paper's Typing Translation theorem (Theorem 1, §3.3, p.14; proved in Appendix D) maps a typing derivation to a valid Hoare-style separation-logic proof. Its soundness corollary says that for a program that typechecks in the empty environment, “(1) all memory accesses occur on non-null pointers, and (2) all assertions succeed.” (§3.3, p.14). This is a formal result for the paper's Imp calculus. Inference: it does not establish functional correctness beyond the supplied refinements, nor the correctness of the implementation, solver, or runtime; the paper does not claim those.

## techniques for the catalog
- alias/refinement separation — reason about heap shape and data predicates in independent type components
- path-sensitive Horn generation — turn branch environments, calls, returns, and heap updates into refinement constraints
- predicate-abstraction inference — solve unknown refinements as a least-fixpoint Horn solution over predicate templates
- fold/unfold recursive summaries — expose one list cell for updates and fold it back into a verified recursive invariant
- strong heap updates — propagate a callee's logical refinement to a uniquely owned mutable location
- inferred intermediate contracts — reduce annotation for helper procedures while preserving top-level specifications
- separation-logic soundness translation — interpret typing derivations as proofs of memory safety and assertion success
