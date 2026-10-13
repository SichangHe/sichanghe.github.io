# Views and type invariants
(authored by agents unless marked 🧑)

## short version

- specify a data structure in two layers
  - a View maps the concrete fields to a logical Seq, Map or Set
  - a type invariant says which concrete states are legal
- contracts then talk about `self@`, never about indices or pointers
- one study targets Verus directly: [VeriStruct](../vl_paper_walkthrough/veristruct_20261012.md)
- the other studies do the same job with other tools
  - Creusot plus Gillian-Rust, Rocq with Iris, Prusti, Verus linear types
- every Verus step below is my inference unless a study shows the code
- related note: [Verus overview](../topic_studies/formal_verification_rust/rust_verifiers/verus.md)
- neighbours: [specification quality checks](specification_quality_checks.md), [proof decomposition](proof_decomposition.md)

## the problem

A module such as a ring buffer has fields, indices and wrap-around arithmetic.
A client should not reason about any of that.
Without a shared abstraction, every method contract repeats the layout.
Every proof then re-derives facts like "the index is in range".

VeriStruct states the cost of skipping this.
The study says single-function synthesis misses cross-method dependencies
(the study's words, from its planner section).
The paper's claim, quoted in the [VeriStruct study](../vl_paper_walkthrough/veristruct_20261012.md):
"defining a custom view offers better abstraction, clarity, and proof efficiency" (the paper's words).

A second problem is that a contract can be sound and still too loose.
The WybeCoder study shows a heapify contract with no frame clause.
The model then wrote a selection sort that satisfied it.

## how to do it in Verus

VeriStruct shows steps 1 to 3 with Verus code.
The other steps are my inference from the other studies.

1. pick the logical type
   - `Seq<T>` for ordered contents, `Map<K,V>` for tables, `Set<T>` for membership
   - a tuple when capacity or other fixed data must be visible
   - the study: RingBuffer returns `(content, capacity)`, where content joins the wrapped slices
2. write the View
   - define `type V` and a pure `closed spec fn view(&self)`
   - use `self@` in every `requires` and `ensures`
   - keep it closed so clients cannot see layout
3. write the type invariant
   - mark it `#[verifier::type_invariant]` on a `closed spec fn inv(&self) -> bool`
   - state index bounds, non-empty storage, length agreement with the View
   - in a proof block call `use_type_invariant(&self)` to get the facts back
   - the paper, quoted in the [VeriStruct study](../vl_paper_walkthrough/veristruct_20261012.md):
     "A type invariant is a logical formula that all instances of a data structure must satisfy."
4. write each method as an abstract operation
   - `push` ensures `self@ == old(self)@.push(x)`, in my words
   - add the frame clause for what stays unchanged
   - the WybeCoder study: frame facts are `ensures` over untouched indices, often with `old(arr)`
5. prove that each method keeps the invariant
   - the invariant is assumed on entry and must hold on exit
   - the study says operations must preserve it, and bad or redundant invocations trigger repair
6. add pointer-level ownership only when needed
   - for raw pointers use a `Tracked` permission with its own View
   - the [Verus linear types study](../vl_paper_walkthrough/verus_linear_20261012.md): a permission token holds `Some(v)` or `None` for uninitialised memory
   - the XOR linked list there pairs the pointer structure, a sequence View and node permissions
7. for two-state contracts, compare whole views
   - a snapshot is `old(self)@` or a ghost copy of the View
   - write the two-state relation as a `spec fn` over old and new Views

## variants by paper

- VeriStruct, the Verus case: [study](../vl_paper_walkthrough/veristruct_20261012.md)
  - a planner decides whether the module needs a View, an invariant, specs and proofs, then calls one generator for each
  - Bitmap's generated View is a single sequence; the study says it verified
  - the study notes the LLM's simpler View may differ from the human ground truth
- Hybrid Creusot and Gillian-Rust: [study](../vl_paper_walkthrough/hybrid_rust_verification_20261012.md)
  - an `Ownable` trait maps a concrete type to a pure representation `ReprTy`
  - for `LinkedList<T>`, `ReprTy = Seq<T::ReprTy>` and `own` ties it to a separation-logic segment predicate
  - safe code sees only the Seq through `ShallowModel`
  - `#[show_safety]` generates the ownership pre and postcondition
- Corten, Rocq and Iris: [study](../vl_paper_walkthrough/corten_foundational_verification_of_rust_20261012.md)
  - a buddy allocator spec keeps an abstract `buddyRep` and hides the free lists existentially
  - `alloc` takes ownership of `self` and returns a new representation
  - the study: "allocator methods thread the single `self ↦ v` fact through every `&mut self` call"
  - the domain invariant lemmas were about 1,400 of about 2,800 Rocq lines
- Resource specifications, Prusti: [study](../vl_paper_walkthrough/resource_specifications_20261012.md)
  - the abstract state is a resource amount per owner, tied to program fields by a coupling invariant
  - the invariant is two-state and acts as an implicit postcondition on every function with a mutable reference
- Compositional iterators, Prusti: [study](../vl_paper_walkthrough/compositional_reasoning_for_side_effectf_20261012.md)
  - a snapshot abstracts a whole tree-shaped value, ignoring addresses
  - two-state predicates become ordinary ghost functions over old and new snapshots
  - the study's Verus form uses `view` functions as snapshots; it calls this an inference
- Gospel iterators: [study](../vl_paper_walkthrough/unfolding_iterators_20261012.md)
  - the abstract cursor has a ghost `visited` sequence and the invariant that it is permitted
  - a client loop invariant ties the concrete stack to that ghost prefix
- Flux, indexed types: [study](../vl_paper_walkthrough/flux_20261012.md)
  - the abstraction lives in the type: `RVec<T>[n]` carries its length as an index
  - `push` goes from `RVec<T>[n]` to `RVec<T>[n+1]` through a strong reference
  - a bounds check becomes an ordinary typed call
- Move spec inference: [study](../vl_paper_walkthrough/combining_mechanical_and_agentic_specifi_20261012.md)
  - old-state values and intermediate snapshots specify multi-address updates
  - the Verus form is the study's inference
- VeruSAGE, opacity: [study](../vl_paper_walkthrough/verusage_20261012.md)
  - NRKernel failures involve closed spec functions whose lemmas, not bodies, are the intended interface
  - the same idea applies to a closed `view`: prove lemmas about it, do not open it

## evidence

- VeriStruct: 10 of 11 modules solved, 128 of 129 functions (99.2%)
  - Node reached 11 of 12
  - the baseline asks an LLM once per iteration for all annotations, for 13 invocations
  - the baseline solves 4 of 11 modules and 52 functions
  - there is no ablation that isolates the View or the invariant, so the study does not credit either
- Hybrid: LinkedList type safety is 130 executable and 176 annotation lines, 0.24 s
  - LinkedList functional correctness is 227 annotation lines, 0.45 s
  - Vec functional correctness is 294 executable and 107 annotation lines, 2.57 s
- Corten allocator: about 300 lines of Rust, about 2,800 lines of Rocq
  - one case study; the study says most work was domain invariant design
- Resource specs: 31 functions in four applications
  - 48% fewer specification lines on average, but 35% slower verification
- Flux: 145 specification lines for 944 Rust lines, versus Prusti's 315 for 921
  - the study notes Flux cannot match Prusti on deep properties such as sortedness
- Compositional iterators: about 340 lines of common specifications
  - the study says there is no aggregate success denominator

None of these compares a View design against no View on the same tasks.
The numbers show the technique works.
They do not show it is what made the proofs succeed.

## where it fails

- the View can be wrong while every proof passes
  - the VeriStruct study says the abstraction must faithfully encode behaviour
  - tests constrain intent but do not prove untested properties (the study's inference)
- a loose contract passes
  - missing frame, permutation or length clauses let wrong code verify (WybeCoder study)
- the invariant must be re-established by every method
  - the VeriStruct study lists redundant invariant invocations as an error class
- type invariants do not cover raw pointers
  - the hybrid study: "Verus cannot verify traditional raw pointers" (the study's summary of related work)
  - use permission tokens, or a separation-logic tool for those parts
- the hybrid tools leave gaps
  - shared references, more than one lifetime and closures are unsupported
  - the study says the meta-theory leaves "small gaps in the justification of its soundness"
- snapshots are not authority
  - the Verus linear types study: a snapshot may describe old contents but cannot authorise a current read or write
- Flux-style indices handle lightweight properties only
- Corten's allocator result is memory safety and representation preservation
  - the study says it does not prove best fit, fragmentation bounds or that allocation succeeds

## open questions

- I do not know how much of VeriStruct's 99.2% comes from the planner and how much from the View and invariant
  - nobody ran that ablation
- which View shape is easier for an agent to prove against, one Seq or a tuple?
  - the VeriStruct study only says the LLM's View may differ from the human one
- can an agent check that a View is faithful without a human?
  - the study relies on unit tests the user supplies
- how should a pointer-level `Ownable` predicate map to Verus `Tracked` permissions?
  - no study shows this; step 6 is my guess
- does hiding the View with `closed` help the solver or only the reader?
  - the VeruSAGE study reports lemma-as-interface failures, not a comparison
