# Verification of a Generational Garbage Collector
(authored by agents unless marked 🧑)
Tag: `wang2026generational`, [paper](http://arxiv.org/abs/2609.13186v1)

## what the paper proves

Wang, Stark, and Appel verify a multi-generation copying collector written in C with Rocq and the Verified Software Toolchain (VST). The collector supports mutable references and updateable arrays and uses OCaml-like values. The client-facing result is that collection preserves the root-reachable object graph up to a label-preserving graph isomorphism, while changing addresses, removing unreachable objects, and updating remembered-set and heap-management state. The abstract says, “We have formally verified in Rocq+VST a multi-generation collector with support for mutable references and updatable arrays, written in C and compatible with OCaml data types.” (abstract, p. 1)

The proof is modular at two boundaries. The API specification hides whether the implementation copies or marks and sweeps and hides the remembered-set representation from clients. The implementation proof is decomposed into `forward`, root forwarding, scanning, remembered-set forwarding, one-generation collection, and the outer generation loop. The paper says, “Our program and our verification are modular so that (1) the API spec is independent of the implementation (e.g., the choice of copying vs. mark-and-sweep, generational-vs-nongenerational) and (2) the specification and verification of components of the implementation (such as the forwarding function) are independent of other components.” (abstract, p. 1)

## technique: make a client-facing API a graph-preserving contract

what it is and when to use it

The mutator sees allocation, dereference, mutation, and collection operations, but not heap-management records or graph representation. Use this boundary when a component moves or reclaims memory and clients must continue to reason about logical objects rather than addresses.

how the paper does it

1. Model object memory as a directed graph. Objects have a descriptor and fields; fields may be pointers, integers, or outliers. Sharing and cycles are allowed (§2, pp. 4–5).
2. Define each operation with VST preconditions and postconditions. A specification has propositional, parameter, global, and separating-resource parts (§3, p. 10).
3. For collection, existentially return a new graph, roots, frames, heap, allocation pointer, and available space. Require `garbage_collect_relation` between old and new graphs and `frame_shells_eq` for frame addresses (Listing 11, p. 11).
4. State the observable result as `gc_graph_iso`: filter roots to graph vertices, restrict each graph to reachable vertices, and require a label-preserving isomorphism (Listing 34, p. 35).
5. Keep remembered-set and concrete heap state in hypotheses and separation predicates, not in the client-visible conclusion (§7.1, pp. 35–36).

The paper’s exact top-level conclusion is: “Consequently, the C collector may update its internal heap and remembered sets while preserving, up to isomorphism, the object graph reachable from the mutator’s roots.” (§7.4, p. 39)

Verus form

Inference: model the logical heap as a `struct` or mathematical map in a `spec fn`, and make each executable API function carry `requires` and `ensures` clauses over that model. Use `proof fn` lemmas for graph reachability and an isomorphism relation; represent ownership of concrete memory with the proof-oriented types and permissions used by Verus. Verus does not carry over VST’s `SEP`, `data_at`, `PROP`, or Rocq `LGraph` definitions, so the graph representation and framing predicates must be redesigned. Inference: keep remembered sets in private ghost state and expose only an `ensures` clause about the root-reachable abstract graph.

evidence, assumptions, limits

The adequacy evidence is a verified client, not only a verified collector. The paper states, “The most reliable way to demonstrate adequacy of a specification is to use that specification to prove correctness of clients of that API.” (§3.3, p. 16) CertiRocq clients verify integer-to-Peano conversion and packed bytestring construction; the latter requires dereferencing while a record is partially initialized (§3.3, pp. 16–17). The graph isomorphism theorem assumes graph well-formedness, valid roots, no dangling destinations, and remembered-set coverage (§7.1, pp. 35–36). The implementation is C, so the VST model also trusts explicit axioms for tagged values and cross-block pointer-range comparisons (Appendices B–C, pp. 43–45).

Inference: a VL product should expose stable abstract contracts for verified Rust components and test those contracts with representative clients. The threat is high if an agent can prove a weak contract while the client’s intended semantics are absent; the client-adequacy pattern directly detects that failure.

## technique: encode sharing and cycles in separation logic with a graph library

what it is and when to use it

Ordinary separation logic naturally describes disjoint trees. A collector manipulates shared and cyclic graphs, so a graph-to-separation-logic embedding is needed before pointer updates can be framed locally.

how the paper does it

1. Represent vertices, edges, labels, and addresses with CertiGraph’s abstract graph types (§2, p. 4).
2. Embed a graph into VST as the iterated separating conjunction (“big star”) of all graph nodes (§2, p. 4).
3. Use a focusing rule to extract one node’s array resource from `graph_rep`, perform a read or update, and reassemble the graph with a separating wand. The dereference proof explicitly sets `A := data_at ...` and returns `A ∗ (A −∗ graph_rep g)` (Listing 15, p. 16).
4. For newly allocated nodes, require `add_node_compatible` so new edges target valid existing nodes or outliers and no duplicate edge is introduced (Listing 13 and §3.2, pp. 13–14).

Verus form

Inference: represent the abstract graph as a finite map from node identifiers to labels and edge vectors, and prove a `wf_graph` predicate. A node read can require ownership of the relevant vector element and ensure that the map is unchanged; an allocation lemma can ensure a fresh identifier and preservation of `wf_graph`. Verus has no VST separating wand syntax in the cited Verus material, so use explicit ghost ownership predicates and lemmas instead of writing `A ∗ (A −∗ graph_rep g)`. Inference: preserve aliasing by making node identifiers copyable mathematical values while keeping concrete references governed by Rust ownership.

evidence, assumptions, limits

The authors identify graph reasoning as a major proof cost: “Garbage collectors manipulate graphs with sharing and (sometimes) cycles; to fit this into separation logic (where separation is the antithesis of sharing) required a graph-reasoning system such as CertiGraph.” (§9, p. 41) Their conclusion depends on the graph library and its Rocq proofs; the paper points to the open-source CertiGraph release and lists `gc_correct.v` and `verif_*` files (Appendix A, p. 43). Inference: this is reusable infrastructure for VL, but a graph model that omits cycles or aliasing would invalidate the collector contract.

## technique: prove a functional model first, then refine C to it

what it is and when to use it

Use a pure functional model when imperative pointer code is hard to reason about directly. Prove that C implements the model, then prove the model’s graph theorem separately.

how the paper does it

1. Define an inductive relation for each loop, such as `scan_vertex_while_loop` and `do_scan_relation` (Listing 27, p. 28).
2. State a C funspec whose postcondition says the output graph and heap equal the functional relation’s result (Listing 28, p. 29).
3. Prove the C body with VST loop invariants and separation resources. The paper says the postcondition of `do_scan` “contains the proposition, do_scan_relation from to 𝑣 g g'. Thus the VST proof establishes that the C code of do_scan implements the functional model defined as a relation in Rocq.” (§5.5, p. 27)
4. Prove the functional relation’s graph-isomorphism theorem independently (§7, pp. 33–39).
5. Connect the VST body proof to the theorem through bridge lemmas deriving graph-level hypotheses from `full_gc` and remembered-set predicates (§7.1, pp. 35–36).

Verus form

Inference: write a pure `spec fn` or recursive relation for each Rust loop, then give the executable function an `ensures` clause equating its abstract result to that model. Use `invariant` clauses on loops and `proof fn` lemmas for the model’s preservation and final theorem. Verus proof code is erased before execution; the executable collector remains ordinary Rust. The paper’s Rocq inductive relations and VST funspec syntax do not carry over directly.

evidence, assumptions, limits

The paper says, “In Sections 5 and 6, the VST proofs establish that the C code implements functional models written in Rocq.” (§7, p. 33) It does not print all proof scripts; Appendix A gives their file names and a `make certigc` build command (p. 43). This evidence establishes a checked refinement for the supplied source and model, not arbitrary collector implementations.

## technique: make allocation safe with an explicit availability check and root frame

what it is and when to use it

A copying collector may move any live object. Before calling it, every live local pointer must be registered in a stable root structure, and the caller must prove enough nursery space after collection.

how the paper does it

1. Test `available(ti,n)`; it means `(ti→ limit)−(ti→ alloc) ≥ n+1` (§2.1, p. 10).
2. If the test fails, store root pointers in the topmost frame, set `ti→ nalloc=n`, call `garbage_collect`, and fetch roots back (Listing 14, p. 15).
3. Prove that both branches establish `limit − alloc ≥ n`, then apply the allocation funspec (p. 15).
4. For the `uint63_to_nat` client, store `temp`, push a frame, collect, restore `temp`, and allocate the one-field constructor (Listing 17, p. 18).

The paper gives this allocation guard: “To ensure that there is enough space to allocate one or more objects whose size (including descriptors) totals 𝑛, the mutator calls the available test before allocating.” (§3.2, p. 14)

Verus form

Inference: use a Rust root-frame type whose ownership and ghost state enumerate live pointers. The allocation wrapper can require `headroom >= n`, and its collection branch can ensure the same condition after collection. Use `requires`/`ensures`, loop `invariant`, and proof lemmas for frame preservation. A Rust borrow checker may prevent some dangling local references, but it does not by itself prove that a moving collector updates every logical root; that remains a Verus contract.

evidence, assumptions, limits

The client proof demonstrates the pattern for a live temporary and for a dynamic packed bytestring loop (§3.3, pp. 16–17). The collector assumes bounded allocation requests; a request larger than the nursery aborts (§6.2, p. 33). Safe points and concurrent root discovery are future work (§8, pp. 39–40).

## technique: verify Cheney forwarding with explicit from/to invariants

what it is and when to use it

Cheney’s algorithm copies live objects from a from-space to a to-space and uses the interval between `scan` and `next` as an implicit work queue. Use it for compacting copying collection without an auxiliary queue.

how the paper does it

1. Read the value at `p`; ignore unboxed values.
2. If the pointer is in from-space, inspect its header. If the header is zero, follow the forwarding pointer in field zero.
3. Otherwise copy the header and fields to `*next`, advance `next`, mark the old header zero, install the forwarding pointer, and update `*p` (§5.1, Listing 22, pp. 20–21).
4. Optionally recurse over fields when `depth>0` and the object is scannable, giving bounded local depth-first traversal for cache locality (Listing 22, lines 21–24, p. 21).
5. Forward roots, then scan copied objects until `scan` catches `next` (Listings 25–26, pp. 25–26).
6. Maintain `forward_condition`: sufficient destination space, valid generations, marked vertices carrying forwarding pointers, and no dangling destinations (§5.3, p. 23).

The implementation’s key steps are quoted exactly: “Hd_val(v) = 0; Field(v, 0) = ptr_to_int_or_ptr((void ∗)newv); *p = ptr_to_int_or_ptr((void ∗)newv);” (Listing 22, p. 21)

Verus form

Inference: represent `scan` and `next` as indices into a verified destination buffer, and prove bounds with `requires` and `invariant`. Model a forwarding pointer with a ghost map from old node IDs to new IDs; prove that a second visit follows the map and that each copied object is marked exactly once. Use `while` loop invariants for the scan closure and `proof fn` lemmas for preservation of `forward_condition`. Raw pointer casts and pointer range tests in the C listing do not carry over; use Rust slices or a verified allocator abstraction where possible.

evidence, assumptions, limits

The paper reports that the function is proved correct and reusable across generation organizations, but says, “In this paper we do not show Rocq proofs such as the proof that forward satisfies the funspec in Listing 24.” (§5.3, p. 24) The destination must have enough space for the unmarked from-space and pointers must satisfy the C range-testing axiom (§5.3, p. 23; Appendix C, pp. 45–46). The depth-first optimization was proved but not extensively measured (§4, p. 19).

## technique: use a write barrier and remembered-set pipeline for mutation

what it is and when to use it

Generational collection relies on young objects pointing to old objects. A mutation can create an old-to-young edge, so every pointer store must record the source field. Use a remembered set when mutable references or arrays are allowed.

how the paper does it

1. Store `q` into `*p`.
2. If `q` is a pointer, decrement the nursery limit and write `p` into the generation-0 remembered-set region (Listing 30, p. 30).
3. When collecting generation `i`, iterate remembered entries. Ignore entries whose source field is in the current from-space; otherwise call `forward` on the field and copy the field address into the next generation’s remembered set (Listing 31, pp. 30–31).
4. State the indexed invariant: every old-to-young edge into generation `i` is recorded in some remembered-set component `k` with `from ≤ k ≤ i` (§7.3, pp. 37–38).
5. After resetting generation `i`, advance the invariant so pending entries begin at `i+1` (§7.3, p. 38).

The paper emphasizes the subtlety: “The remembered set records the source location, not the destination vertex.” (§7.3, p. 37)

Verus form

Inference: make `mutable_update` require a valid field location and ensure the abstract graph edge is updated plus a ghost remembered-set entry is added when the value is a pointer. Model the pipeline as a sequence or map indexed by generation. A `proof fn` can show that forwarding and promotion preserve `no_unrecorded_backward_edge`. Use a `while` invariant for the remembered-set loop. Verus cannot use the paper’s VST `heap_remset_rep` or `SEP` forms; define equivalent ghost predicates and explicit ownership of the field.

evidence, assumptions, limits

The four-line `forward_remset` body required 452 lines of Rocq/VST proof script because of pointer-range obligations, modular pointer arithmetic, graph and heap invariants, and the two interior/exterior cases (§6.1, pp. 31–32). A separate verification found a bug where line 13 used `q` instead of `p`; testing had not found it (§6.2, p. 32). The remembered-set discipline is internal and absent from the client-facing isomorphism conclusion (§7.3, pp. 37–39).

## technique: separate interior and exterior pointers

what it is and when to use it

Root boxes and outlier pointers are outside the managed graph, while object fields are interior graph edges. Distinguishing them avoids treating every root registration as a graph mutation, at the cost of two proofs for shared code.

how the paper does it

1. Define `forward_p_type` as an exterior case containing an integer, outlier, or graph vertex, or an interior case containing a vertex and field index (§5.2, pp. 22–23).
2. Give exterior pointers a one-word `data_at` resource and interior pointers an empty resource because their memory is already covered by `graph_rep` (§5.2, p. 23).
3. Prove `forward` separately for the two cases; call sites are root forwarding, to-space scanning, and remembered-set forwarding (§5.3, pp. 23–25).
4. Maintain an `outlier_rep` for valid pointers outside the heap so C comparisons remain sound (§2, pp. 9–10).

Verus form

Inference: encode `Interior` and `Exterior` as an enum in ghost state, with separate proof lemmas for each case. Keep outlier handles behind an explicit trusted or verified foreign-resource abstraction. Rust references and slices can eliminate many raw pointer comparisons, but a moving collector still needs a proven identity and relocation model.

evidence, assumptions, limits

The paper acknowledges the cost: “The correctness proof of forward is doubly long.” (§5.3, p. 25) Outliers support foreign runtime data and function pointers but significantly complicate reasoning (§9, p. 41). Traversable structures spanning the collector heap and foreign malloc arena remain future work (§8, p. 40).

## technique: prove the generation loop by induction and transitivity

what it is and when to use it

The outer collector may promote through an unbounded number of generations. Prove one-generation copying, preserve its invariants, and compose iterations by induction.

how the paper does it

1. Ensure the next generation exists, allocating a space if necessary (Listing 33, pp. 34–35).
2. Run `forward_remset`, `forward_roots`, `do_scan`, and reset for the current generation (Listing 32, p. 33).
3. If the destination has enough room, restore nursery pointers and return; otherwise continue to the next generation (Listing 33, p. 34).
4. Maintain that all younger generations have been cleared, graph soundness holds, roots are compatible, and the indexed remembered-set invariant advances (§7.4, pp. 38–39).
5. Compose graph isomorphisms with transitivity when the loop continues (§7.4, p. 39).

Verus form

Inference: use a `while` invariant stating cleared generations, `wf_graph`, `gc_graph_iso` between the original and current graph, and remembered-set coverage. Prove a one-generation lemma and use transitivity in the loop proof. Use `requires` for generation bounds and `ensures` for the final root-reachable isomorphism. A finite vector of generations gives a direct Rust representation; abort branches need explicit postconditions or a termination proof.

evidence, assumptions, limits

The theorem’s hypotheses include `graph_unmarked`, `no_unrecorded_backward_edge`, `no_dangling_dst`, root compatibility, graph soundness, remembered-set state, and heap coverage (Theorem `garbage_collect_isomorphism`, pp. 35–36). The implementation does not prove that the address-space bound prevents reaching `MAX_SPACES`; the paper explicitly says, “We have not actually proved it.” (§6.2, p. 33). Large objects bigger than the nursery abort and need a different policy (§6.2, p. 33).

## technique: strengthen a specification through client failure

what it is and when to use it

A weak contract can let an implementation proof pass while making useful clients unprovable. Use client proofs as an adequacy test, then strengthen both contract and implementation until the intended client works.

how the paper does it

1. Attempt to verify a realistic client, including packed bytestrings with arbitrary even byte values (§5.5, pp. 26–27).
2. When the client proof fails, inspect the missing semantic case rather than weakening the client.
3. Strengthen the collector specification so no-scan objects may contain arbitrary nonpointer data.
4. Re-run the implementation proof; the missing `No_scan` branch in `forward` is then exposed as a real C bug.
5. Fix the code and complete the proof.

The paper reports the causal chain: “It was not until we tried to verify a client program that used packed bytestrings [Korkut et al. 2025] that the weakness of the specification was detected.” (§5.5, p. 27) It then states, “Program verification did exactly the job that it should have.” (§5.5, p. 27)

Verus form

Inference: make client verification part of the VL acceptance path. If a client cannot prove a required behavior under a component contract, inspect whether the contract is too weak or the implementation is wrong. Keep the corrected property in a shared `spec fn` and add a proof-only regression lemma. Do not treat a passing proof of an under-specified function as evidence of product correctness.

evidence, assumptions, limits

The no-scan bug was absent from tests because no test exercised both `depth>0` and no-scan objects (§5.5, p. 27). This is direct evidence that formal client adequacy catches an input combination missed by testing. Inference: agent-written verified Rust has substantial threat from omitted semantic cases, especially when the agent can satisfy a permissive contract; client obligations and adversarial data representations should therefore be part of VL’s proof workflow.

## trusted base, measurements, and what VL should reuse

The paper proves C implementation-to-model refinement, functional graph-isomorphism theorems, API contracts, and selected CertiRocq clients. It trusts or axiomatizes the C tagged-value extension and cross-block range comparison (Appendices B–C, pp. 43–46), the Rocq/VST/CertiGraph and compiler toolchain, and the adequacy of the stated graph and client specifications. The paper gives no runtime benchmark table for this implementation; it says the local depth-first choice has not been extensively measured (§4, p. 19). It reports proof scale qualitatively and gives one precise denominator: the four-line remembered-set loop needs 452 lines of proof (§6.1, pp. 31–32). It also gives configuration numbers: nursery size is `2^16` words, word size is 8 bytes, and the calculated maximum is 43 generations (§6.2, p. 32).

Already done and reusable for VL: stable abstract API contracts; graph models for sharing and cycles; functional-model refinement; root-frame discipline; write-barrier and remembered-set invariants; one-generation plus outer-loop induction; and client adequacy as a specification test. Inference: VL should avoid redoing these as generic ideas and instead adapt them to Rust ownership, Verus ghost state, and the product’s actual agent-generated components. Inference: the largest product threat is semantic under-specification, followed by trusted foreign or unsafe operations and proof maintenance when representations change. The paper’s bugs and its 452-line loop proof show why a short executable function can require a large, explicit proof boundary.

## techniques for the catalog

- client-facing graph-isomorphism contract — specify collection by preservation of the root-reachable graph, while hiding addresses and collector internals

- graph-to-separation-logic embedding — represent shared and cyclic heap graphs with a graph library plus focused local resources

- functional-model refinement — prove imperative C code implements an inductive Rocq relation, then prove the relation’s abstract theorem

- root-frame allocation discipline — register live pointers before collection and prove post-collection headroom before allocation

- Cheney forwarding invariant — use forwarding pointers, `scan`/`next` closure, and explicit from/to-space conditions

- remembered-set write barrier — record pointer stores and maintain an indexed old-to-young edge coverage invariant

- interior/exterior pointer split — distinguish graph fields from root or outlier locations and prove each resource case

- generation-loop induction — compose one-generation isomorphisms and remembered-set preservation through the outer loop

- client adequacy feedback — strengthen contracts when realistic clients expose omitted semantic cases

- C-semantics axiomatization — isolate nonstandard tagged-value and pointer-range operations as explicit trusted assumptions
Checked 2026-10-15 against paper wang2026generational: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
