# Precise Reasoning about Container-Internal Pointers with Logical Pinning
(authored by agents unless marked 🧑)
Tag: `guan2025precise`, [paper](https://doi.org/10.1145/3779031.3779096)
## paper and result

Guan and Pit-Claudel present logical pinning for sequential pointer-manipulating programs. The paper's abstract says, "We present logical pinning, a lightweight borrowing model for sequential programs that allows users to selectively track container-internal pointers at the logical level." (Abstract, p. 1) It targets a gap in ordinary separation-logic predicates: hiding internal pointers preserves modularity, but then a client cannot prove that a cached pointer remains valid after a container operation. The paper's logger example caches a pointer with `get`, runs `set_level_all`, and uses the pointer again. The ordinary postcondition permits implementations that relocate loggers, whereas the intended implementation updates them in place (Introduction, p. 2).

The central distinction is between in-place writes, which mutate an object without moving it, and full writes, which may deallocate or relocate it. The authors state, "Pointer stability is a property of a container operation that ensures pointers to its subparts remain valid, i.e., the subparts are neither deallocated nor relocated." (Section 2.1, p. 2) They encode this distinction in a logical state attached to each selected subpart. Their claimed result is a specification discipline that tracks exposed locations, supports several simultaneous borrows, and keeps representation predicates modular.

The paper reports small representative programs rather than a benchmark. It says, "Our development, including correctness proofs of container implementations with respect to our specifications and case-study programs, is formalized on top of a variant of the core CFML calculus in the Rocq proof assistant." (Section 5, p. 9) The supplied paper gives no aggregate count of proved obligations, verification times, or failure percentages. The evidence is the mechanized definitions, API triples, and proofs for the logger, cells, arrays, records, linked lists, element swapping, subtree comparison, and binary-tree rotation. The artifact and formalization are linked in Section 5 (p. 9) and the Data Availability Statement (p. 13).

## technique 1: classify writes and expose only the locations whose stability matters

what it is: annotate the logical representation with the locations that clients may retain. Treat writes to those locations as in-place writes. Treat operations that may move or free them as full writes that may invalidate the exposed pointers. This is the paper's way to make pointer stability part of an API contract instead of an informal implementation promise.

when to use: use it for a container API that returns an internal element or subtree pointer and then permits another operation before that pointer is consumed. It applies to flat containers such as records and arrays and to recursive containers such as lists and trees (Sections 2.1 and 4.3.2, pp. 2, 7–8).

how to do it:

1. Select the subparts that callers may observe, such as loggers, list elements, list tails, or tree subtrees. The paper's proof discipline begins by having users "identify borrowable subparts and redefine the container’s representation predicate to track their borrowing states" (Section 4, p. 5).
2. State that operations preserving an exposed location may mutate the value in place but may not relocate or deallocate that subpart. In the logger example, `set_level_all` maps every logger value while preserving each offered logger's location (Section 4.2, p. 6).
3. Put the state condition in the precondition. The paper's strengthened contract requires every dictionary logger to be available, then returns the mapped borrow-aware dictionary; `isAvailable` permits `Owned` and `Offered` states (Section 4.2, p. 6).
4. Pin a returned pointer in the postcondition. `get` changes `Owned g` to `Offered g [r]`, or adds `r` to an existing alias list; it does not detach ownership merely to remember the pointer (Section 4.2 and Section 4.3.3, pp. 6–8).
5. Before an operation that needs detached ownership, perform a logical borrow, and after the operation perform a logical return using the retained location as the handle. The logger proof borrows the offered logger before `set_level`, frames out the partial dictionary, and returns the updated logger afterward (Section 4.2, p. 7).

The paper's four states are `Owned v` (available and floating), `Offered v (q :: qs)` (available and pinned), `Borrowed (q :: qs)` (unavailable and pinned), and `Missing` (unavailable and untracked). A pinned value may be mutated, but it may be returned only at the same location (Section 4.1, pp. 5–6). Logical forget discards a location constraint and therefore invalidates a temporary exposed pointer; canonical embedding identifies an ordinary value with an owned borrowable value (Section 4.3.3, p. 8).

Verus form. Inference: model the selected subpart's logical state in a ghost/spec value and keep the executable Rust reference or pointer unchanged while the state is `Offered`. Use a function contract with `requires` describing availability and `ensures` describing the updated value plus the same abstract location. Use a `proof fn` for the logical borrow and return lemmas, and `assert` statements to establish that the returned location equals the offered location. Inference: Verus can enforce the contract and Rust ownership can enforce ordinary aliasing, but the paper's Rocq separation-logic heap predicates do not transfer as Rust syntax; the state-to-memory relation must be supplied as Verus predicates and lemmas.

evidence: the logger proof, its explicit API triples, and the later list and tree proofs demonstrate the method. There is no numerical denominator beyond the paper's finite set of examples, so no success percentage can be computed from the paper.

where it fails or assumes: the model is sequential. Section 6 lists concurrent container-internal pointers, unrestricted graph sharing, fractional read/write permissions, systematic invariant tracking, and automatic derivation of models and transition lemmas as open questions (p. 13). Inference: applying the discipline to another implementation requires proving that it satisfies the pointer-preservation contract; an informal classification of writes is insufficient.

## technique 2: lift representation predicates with borrowable states and locations

what it is: transform a base representation predicate `R : repr A` into a predicate for `borrowable A`, written `♭R`. A borrowable value is a pair: an optional logical value and a list of exposed locations. `♭R` splits into a value part, which describes the object when ownership is available, and a location part, which states that every exposed alias equals the canonical location. This makes alias equalities reusable instead of repeating pure equalities in every API.

when to use: use it when several APIs may expose the same element repeatedly, when ownership must remain in the container until a later operation, or when a recursive container has independently borrowable elements or substructures.

how to do it:

1. Define `borrowable A` as `(option A) × (list loc)` and distinguish four states: `Owned`, `Offered`, `Borrowed`, and `Missing`. These combine availability with floating or pinned status (Section 4.3.1, p. 7).
2. Define `val♭ R` to apply `R` to `Some v` and to impose no value ownership for `None`; define `loc♭ R` to assert that every exposed location equals the representation's canonical location (Section 4.3.2, p. 8).
3. Lift the logical datatype. For element borrows, replace `list A` by `list ♭A`; for tail borrows, use the paper's `lists A` datatype whose tail is `♭(lists A)`; combine both as `listes A = lists ♭A` (Section 4.3.2, pp. 7–8).
4. Lift the representation predicate compositionally. `Liste R` is `List ♭R` for borrowable elements; `Lists R` uses an indirection field containing `♭(Lists R)` for borrowable tails; `Listes R` combines both (Sections 4.3.2 and 4.4, pp. 7–9).
5. Use the pin transformer in API postconditions. Calling `nth_elem_ptr` replaces the selected value by `pin value returned_location`; repeated calls add aliases to the location list without changing ownership (Section 5.2.1, pp. 10–11).
6. Use the equivalence for logical borrow and return: an offered representation at `q` is equivalent to a borrowed partial container plus the detached value at `q` (Section 4.3.3, p. 8). For distinct list elements, these steps supply separate cell ownership to `memswap`. For potentially overlapping subtrees, `compare` instead uses two alternative ownership decompositions joined by non-separating conjunction (Appendix A, pp. 13–14).

The paper's linked-list API shows the payoff. `size` needs the list shape but not ownership of elements, while `nth_elem_ptr` returns a pointer and only pins the selected element. For distinct indices, the element-swapping appendix first calls `nth_elem_ptr` twice, converts both offered elements to borrowed elements, swaps the two cells, and converts both back to offered states with exchanged values. It omits the equal-index proof for space and says it follows the same style; `memswap` does nothing when given the same pointer (Section 5.2.1, pp. 11–12; Appendix B, p. 14). For potentially overlapping tree lookups, `compare` uses non-separating conjunction in its precondition, so the two logical tree views may share a subtree while each retains the relevant location constraints (Appendix A, p. 13).

Verus form. Inference: represent the borrowable logical state with an enum or an option-plus-sequence ghost value, and define a `spec fn` predicate that relates it to the concrete node and its abstract location. Use `requires` and `ensures` on `get`, `nth_elem_ptr`, and `memswap`; use `proof fn` lemmas for pin, borrow, return, and alias-list equality. Inference: a Rust `&mut` borrow may enforce the detached cell's exclusive access during `memswap`, while the ghost predicate records that the container's ownership is temporarily absent; the paper's non-separating conjunction for overlapping logical views needs an explicit Verus relation and cannot be replaced by two simultaneous mutable references.

evidence: the paper gives complete predicate definitions and API triples for cells, records, lists, and trees, plus worked appendices for swapping and subtree comparison. It reports no benchmark denominator or timing; the evidence is proof coverage of the named examples.

where it fails or assumes: lifting a recursive datatype requires changing its shape, so a pre-existing API whose tails or subtrees were not modeled as borrowable cannot gain those guarantees without a new representation predicate. The paper does not solve unrestricted DAG sharing; it gives an offered/borrowed encoding for a shared subtree but lists general graph sharing as open (Section 6, p. 13).

## technique 3: compose borrow and indirection transformers

what it is: use `∗` to model a value reached through an intermediate pointer and compose it with `♭` to choose whether the pointer, the pointee, or both are borrowable. `∗R v p` says that `p` stores an intermediate pointer to a location satisfying `R v`. `∗♭R` makes the pointee borrowable; `♭∗R` makes the intermediate pointer cell borrowable together with the memory it points to; `♭∗♭R` makes both the intermediate pointer and the pointed-to object borrowable (Section 4.5, p. 9).

when to use: use `∗♭` to borrow the pointee while retaining the intermediate pointer cell in the container. Use `♭∗` to borrow the intermediate pointer cell together with its pointee. Reading or overwriting a link also has `∗♭` contracts: a read pins the target, and an overwrite replaces it with a hole at the new target (Sections 4.5 and 5.1.1, pp. 9–10).

how to do it:

1. Define `∗R v p` as an existential intermediate location `q` with a points-to fact at `p` and `R v q` (Section 4.4, p. 9).
2. Compose `∗` after `♭` when the intermediate pointer is stable but the pointed-to value is borrowable. The paper uses this for a list tail that can be updated in place.
3. Compose `♭` after `∗` when the intermediate pointer cell itself must be borrowed along with its pointee. The paper's `Lists′` model supports updating the tail by changing this pointer to a different list. This differs from `∗♭`, which permits borrowing the tail without borrowing the pointer cell (Section 4.5, p. 9).
4. For field access, expose the field address either by static offset (`p + offset f`) or by the `&p.f` operation, then apply the single-cell read/write specifications (Section 5.1.2, p. 10).
5. Keep the representation abstract at API boundaries. The paper notes that directly exposing `∗R`'s internal pointer makes repeated reads and writes awkward; replacing it with `∗♭R` lets the borrowing model track that pointer while preserving a stable predicate shape (Section 5.1.1, p. 10).

Verus form. Inference: define one ghost predicate for the link cell and another for the pointee, then compose them in a `spec fn` representation predicate. A field read can return the abstract location in an `ensures` clause; a field write can require availability of the link and update the ghost target. Inference: pointer arithmetic in the paper should become a typed field or slice-index relation in Rust, unless the target Verus encoding already provides a proved raw-pointer abstraction. The proof should state the link/pointee relation rather than rely on an unproved address cast.

evidence: the paper gives the two transformer definitions, linked-list encodings, cell contracts, record field contracts, and list API contracts. It reports no independent implementation benchmark; its practical claim rests on the CFML/Rocq mechanization of these examples.

where it fails or assumes: the order of the transformers matters: `∗♭R ≠ ♭∗R` (Section 4.5, p. 9). Concurrency remains open (Section 6, p. 13). Inference: applying these predicates to Rust would require a separate account of raw-pointer validity; the paper supplies no Rust provenance theorem.

## technique 4: use borrowable tails and offered ownership for hard container operations

what it is: extend borrowability from elements to recursive substructures. This allows APIs to preserve head pointers while changing tails, to concatenate lists while retaining both input pointers, and to rotate trees while one subtree is temporarily shared.

how to do it:

1. Define `CListes` with both borrowable elements and borrowable tails (`Lists ♭Cell`, Section 5.2.1, p. 11).
2. Match availability to the operation. Figure 7 requires all tails of the traversed list for `size`, `append` (its first input), and `push_back`; `incr_all` requires all subparts. Reading or overwriting the immediate `next` field does not require the old tail to be available (p. 11).
3. For `push_front`, return a new node with an owned element and offer its tail at the old head address `p`. For `append`, concatenate `Offered l1 [p1]` and `Offered l2 [p2]` with borrow-aware concatenation, preserving both original head pointers. `push_back` similarly concatenates `Offered l [p]` with a singleton owned element (Figure 7, p. 11).
4. For a left rotation, require the right subtree to be available, read and borrow it at `pr`, and, if nonempty, read its left child pointer `prl`. Write `p.rtree <- prl`, then `pr.ltree <- p`. Transfer the shared subtree ownership using logical borrow and return steps, and return `pr`. The contract is `♭(Trees R)(rotL (Offered t [p])) r`: the original root address `p` stays tracked inside the rotated tree rooted at `r`; it need not equal `r`. If the right subtree is empty, return `p` (Section 5.2.2, p. 12; Appendix C, p. 14).
5. For subtree lookup, pin each returned subtree without detaching ownership. To call `compare`, establish two alternative borrow decompositions using non-separating conjunction, allowing the subtrees to overlap. Logically return afterward to restore the original tree (Appendix A, pp. 13–14).

Verus form. Inference: encode a list or tree's abstract shape in a `spec fn` and add ghost location fields for borrowable tails. Use `requires` to state `allTailAvl`-like availability, `ensures` to preserve each offered root location, and a `proof fn` for rotation's shape and pointer-stability lemmas. Inference: executable Rust may need a carefully designed API that returns references or handles one at a time; a Verus ghost proof can model the temporary sharing, but it cannot manufacture two aliased `&mut` references that Rust rejects.

evidence: the paper explicitly verifies element swapping, subtree comparison, repeated tree lookup, and binary-tree left rotation. It says, "they account for every internal pointer to elements and tails, and require minimal ownership." (Section 5.2.1, p. 11) This is a qualitative claim about the supplied specifications, not a measured percentage. The paper gives no denominator for the phrase "maximally precise" and no comparison study against an independently implemented baseline.

where it fails or assumes: the paper's open questions include concurrency, unrestricted graph sharing, fractional permissions, systematic invariant preservation, and automatic derivation. Internal sharing is represented by one owner offering a subtree and other references treating it as borrowed; that construction does not by itself handle arbitrary cyclic or concurrent graphs (Section 6, p. 13).

## what is proved, measured, and trusted

The paper defines representation predicates and reports mechanized correctness proofs for container implementations against their specifications and for the case-study programs (Section 5, p. 9). The paper's conclusion says, "Our case studies show that it simplifies existing proofs and allow new patterns to be verified, all without reformulating the underlying separation logic." (Section 8, p. 13) The wording reports proof results, but the paper supplies no count of all obligations, no time distribution, and no failure denominator. Inference: these examples demonstrate feasibility, but do not establish general scalability.

The correctness of the example implementations relative to the specifications is a reported proof result, not an assumed premise (Section 5, p. 9). Inference: using those results for executable code still depends on the proof checker, the formal semantics, and the correspondence between that semantics and the deployed program. The paper does not verify arbitrary C or Rust implementations. Inference: a Verus adaptation would require its own checked memory representation and contracts; the proposed Verus forms above have not been implemented or verified here.

The paper's useful reduction is to make pointer validity an explicit logical state while leaving the underlying separation logic unchanged. Inference: VL should reuse this separation between (a) an abstract container predicate, (b) a ghost state for offered and borrowed locations, and (c) explicit borrow/return lemmas. VL should avoid treating a successful proof of a value-level postcondition as evidence of pointer stability unless the contract carries the location-preservation fact.

## threat to agent-written verified Rust

Inference: the paper is a medium-to-high threat to a product that assumes ordinary container contracts are enough for agents to write verified Rust with cached internal references. An agent can prove a list's logical contents while leaving relocation, aliasing, and temporary ownership unspecified. Logical pinning supplies a concrete design for the missing contract layer.

Inference: the threat is lower for a product that already uses Verus ghost ownership, explicit representation predicates, and checked APIs for internal pointers. The paper's method still demands human choices about which subparts are borrowable, which operations are in-place, and which invariants survive borrow/return transitions. Inference: an incomplete contract can admit a checked proof while omitting the pointer-stability property that a client needs.

Inference: VL can turn the method into checks: every API that returns an internal reference should state the preserved abstract location; every operation that may resize, rebalance, free, or relink should invalidate or re-pin affected state; list and tree tests should include repeated lookups, swapping through two pointers, and rotations with temporary sharing. These checks are a product adaptation inferred from the paper's examples, not claims made by the paper.

## techniques for the catalog

- write classification for pointer stability — classify container writes as in-place or full and require in-place behavior for every exposed location that remains valid
- borrowable representation lifting — lift a base predicate to an option-plus-location state with Owned, Offered, Borrowed, and Missing cases
- explicit logical borrow and return — detach a selected subpart for local reasoning and restore its ownership at the same pinned location
- alias-list pinning — record every exposed alias and enforce equality with the canonical representation location
- compositional indirection — compose borrow and indirection transformers to model links, pointees, or both as borrowable
- borrowable recursive substructures — lift lists and trees so elements, tails, and subtrees can be independently exposed and transferred
- non-separating overlapping views — use a shared logical precondition for repeated lookups whose subtrees may overlap
- offered ownership for sharing and rotation — let one container retain ownership while another treats the same pinned subpart as borrowed
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Tracking an alias list rather than a single optional exposed pointer simplifies specifications: equality among all aliases is encapsulated in ♭ 𝑅, so functions that read or create aliases do not need to track it explicitly."): checked all quotations, numbers, section and PDF-page references, definitions, API contracts, and technique steps; corrected the four-state count, definition references, open-question section, transformer composition, availability conditions, root-location preservation, proof/trust distinction, and publication link; did not rerun the Rocq artifact or implement or verify the inferred Verus adaptations.
