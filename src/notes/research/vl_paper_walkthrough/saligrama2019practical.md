# A Practical Analysis of Rust's Concurrency Story
(authored by agents unless marked 🧑)
Tag: `saligrama2019practical`, [paper](http://arxiv.org/abs/1904.12210v1)

## scope
Inference: This paper reports an implementation study of concurrent hashmaps, examining which Rust type-system mechanisms prevent data races and where unsafe code is needed. Inference: It is not a formal-verification paper: there are no contracts, proof obligations, or machine-checked invariants. Its useful lesson for verified Rust is where a verifier must model invariants that the compiler cannot express. The authors say: “In this work, we implement a hashmap, a very common data structure, and add increasingly sophisticated concurrency support to it.”

## technique: compare progressively stronger concurrency designs
What it is. Implement the same map with increasingly concurrent representations, then inspect compiler friction, safety boundaries, and performance. The sequence is (1) standard hashmap under a reference-counted reader-writer lock, (2) custom hashmap with per-bucket locks, and (3) mostly lock-free bucket lists with epoch memory reclamation, both from scratch and with Crossbeam.

How to use it. Keep map behavior constant, change one concurrency mechanism at a time, and record where ownership and lifetime checks accept or reject the design. For lock-free code, list the invariants that justify raw-pointer aliasing and safe reclamation. The paper's implementation strategy states: “We started out using the hashmap provided by the standard library, wrapped in a reference-counted reader-writer lock”.

Verus form. Inference: model each design with the same abstract map spec and a transition-system invariant. Prove lock protection with tracked ownership, and prove bucket-level disjointness for sharded locks. For lock-free lists, use a Verus state machine and ghost ownership for node reachability and reclamation epochs. The paper gives no Verus code; these are translations of its engineering observations.

## technique: rely on ownership, borrowing, Send, and Sync
Rust ownership gives each value one owner and drops it when its scope ends. Borrowing provides either one mutable reference or multiple immutable references, with compiler-checked lifetimes. `Send` marks values safe to transfer to another thread; `Sync` marks shared references safe across threads. Marker traits compose through members, so a type is `Send` or `Sync` when its fields satisfy the corresponding property.

When to use it. Keep shared mutable state behind a type whose API requires the necessary lock or atomic mechanism. Let the compiler reject code that sends non-`Send` values to a new thread or aliases mutable and immutable references.

Quote: “Rust uses its type system to force programmers to ensure that concurrent mutations of their data is done in a safe manner.” (Why Rust, p. 2)

Verus form. Inference: Verus's Rust ownership remains executable Rust behavior, while `requires`/`ensures` and tracked ghost resources state the stronger functional and concurrency promises. `Send`/`Sync` checks are compiler facts that a Verus proof may rely on only through specified library contracts; they do not prove linearizability or map correctness.

## technique: encapsulate unsafe pointers behind a safe API
Unsafe blocks permit raw pointers, casts, and multiple mutable aliases when a manually maintained invariant justifies them. The paper emphasizes that unsafe code can be localized: a linked-list implementation may be unsafe while the public hashmap API remains safe.

How to use it. (1) Identify the invariant that the type system cannot check, such as exclusive lock ownership or safe epoch reclamation. (2) Keep raw-pointer operations in a small module. (3) Expose methods whose signatures prevent callers from violating the invariant. (4) Audit every conversion from `Box` to raw pointer and every deallocation. The paper's warning is concrete: constructing a `Box` with `Box::from_raw` and then letting it drop frees the allocation; `mem::forget` avoids that drop, while borrowing with `&*node` avoids creating ownership.

Quote: “Unsafe is necessary for managing raw pointers, and for safely sharing data when sophisticated invariants that are outside the compiler’s knowledge are maintained.” (Unsafe and Encapsulation, p. 12)

Verus form. Inference: use a narrow wrapper with `external_body` only for genuinely trusted foreign or low-level operations, and put the actual verified wrapper contract on the safe function. Prove pointer validity, unique ownership, and deallocation conditions with tracked resources and invariants. Do not treat an `unsafe` block as a proof; it is a boundary where the proof must account for the missing compiler checks.

## technique: epoch-based reclamation with lifetime pinning
Lock-free readers may still hold pointers to deleted nodes. Epoch reclamation delays freeing until no reader can still access the node. Crossbeam's API forces a thread to pin an epoch in a stack variable before atomic operations; the pin must outlive values read through atomics.

How to use it. Pin before load, perform atomic reads and updates while the pin is live, release all references, then unpin so retired nodes can be reclaimed. The authors report that Crossbeam “allowed us to write a safe remove method for our linked list using epoch-based reclamation without any bugs on the first try.”

Verus form. Inference: represent a pin as a tracked token whose lifetime dominates every borrowed node reference. A state-machine invariant relates retired nodes to active tokens; reclamation requires proving that no token can reach the node. This is a design pattern for Verus, not a feature claimed by the paper.

## evidence and limits
The paper's qualitative observations cover explicit lock protection, epoch lifetimes, automatic drop, ownership, raw pointers, option/result handling, atomics, and compiler diagnostics. It reports that Concache had nearly linear read throughput as readers and writers increased, but write throughput gradually decreased; the included performance graph supplies no numerical table or denominators in the extracted text. The authors say they are “still unsure about the peculiar dip in the graph” and suspect CPU use or thread spawning. Therefore no precise speedup claim can be reconstructed from this paper alone.

Inference: The trusted base is Rust's compiler and standard/concurrency libraries, plus manually justified invariants inside unsafe code. The study did not prove absence of logical races, linearizability, or reclamation bugs; it reports implementation experience. Inference: agent-written verified Rust remains most threatened at raw-pointer arithmetic, atomic ordering, and memory reclamation boundaries. Existing VL should not redo Rust's ownership/Send/Sync explanation; it should target formal contracts for the invariants this compiler cannot express and test whether safe encapsulation shrinks proof scope.

## techniques for the catalog
- design progression: compare lock, sharded-lock, and epoch-based lock-free implementations under one map specification
- ownership and markers: use ownership, borrowing, `Send`, and `Sync` to reject unsafe sharing at compile time
- unsafe encapsulation: isolate raw pointers and expose a safe API whose contracts preserve manually checked invariants
- epoch reclamation: pin an epoch across atomic reads and delay freeing until all pins that could reach a node are gone
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
