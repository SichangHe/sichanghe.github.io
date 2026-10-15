# StarMalloc: A Formally Verified, Concurrent, Performant, and Security-Oriented Memory Allocator
(authored by agents unless marked 🧑)
Tag: `reitz2024starmalloc`, [paper](https://doi.org/10.48550/arxiv.2403.09435)

## scope and result

StarMalloc is a concurrent C memory allocator designed from hardened_malloc and verified in F★/Steel concurrent separation logic, then extracted to C. The paper combines a layered heap model, generic reusable data-structure predicates, ownership-transfer contracts, security postconditions, and specification-guided implementation. It also reports performance, security tests, Firefox integration, and proof effort.

The paper claims: “In this work, we present StarMalloc, a verified, security-oriented, concurrent memory allocator that can be used as a drop-in replacement in real-world projects.” (Abstract, PDF p. 1). Its implementation has 26,000 lines of F★ and extracts to about 4,300 lines of C (Section 5, PDF p. 16); Table 2 reports 26,102 lines excluding whitespace and comments, so the two counts use different rounding or inclusion conventions. The allocator has 27 size classes for 16-byte multiples through a 4-kilobyte page, four arenas in the evaluation configuration, and per-size-class locks (Sections 3.1 and 6.1, PDF pp. 6 and 18).

## technique 1: layered separation-logic specifications

What it is. Steel contracts combine separation-logic ownership with dependent types and ordinary `requires`/`ensures` clauses. A predicate describes which memory a component owns; separating conjunction means disjoint ownership. The frame rule lets a local proof preserve unrelated memory. Concurrent separation logic extends this to thread safety. The paper’s allocator contract is `malloc : Steel ... emp ... null_or_slarray`, with a postcondition that a non-null result has length at least the requested size (Section 4.1, PDF pp. 8–9).

How to apply it. (1) Define an abstract ownership predicate for each resource, such as an allocated array or a lock-protected size class. (2) State a function’s precondition as the ownership it consumes and its postcondition as ownership it returns. (3) Add dependent value properties with `requires` and `ensures`, such as returned length or alignment. (4) Prove local operations under the frame rule, carrying unrelated resources unchanged. (5) Compose layers only through interfaces, keeping representation details abstract.

Verus form. Inference: use Rust data types and `spec fn` predicates for abstract ownership and value relations, `requires`/`ensures` on functions, and proof lemmas for frame-like preservation. Verus does not use Steel’s `slprop` effect indices; ownership must be represented with Verus ghost state and supported proof-oriented APIs. Inference: a lock contract can expose a ghost state predicate and transfer it across acquire/release transitions.

Evidence and limits. The paper proves memory safety, functional correctness, and thread safety for the modeled allocator. It does not prove that an attacker model is defeated: the authors state that proving attack effectiveness “would require an attacker model that is, to the best of our knowledge, beyond what current state-of-the-art in program verification can do” (Section 4.3, PDF p. 15). OS system calls are modeled/axiomatized, so their real behavior remains trusted.

## technique 2: generic combinators for reusable heap proofs

What it is. The authors avoid repeating proofs by defining generic predicates and lemmas once, then instantiating them. `starseq` folds a sequence into a separating conjunction indexed by position. `sldep` ties ownership of a mutable metadata object to a predicate that depends on its current mathematical contents. `slrefine` combines ownership with a pure well-formedness property. These abstractions connect bitmaps, slots, slabs, linked lists, and size classes without exposing representation at every layer.

How to apply it. (1) Choose a mathematical sequence for fixed-size metadata. (2) Define a generic fold predicate `starseq p s` that owns each element through predicate `p`. (3) Prove generic lemmas to extract one index and update one element. (4) Tie concrete metadata to its abstract sequence with a dependent predicate (`sldep`). (5) Define well-formedness separately with a pure predicate (`is_list`, bounds, acyclicity, partition). (6) Refine ownership with that property (`slrefine`). (7) Instantiate the generic predicates for each allocator layer; reuse the lemmas without reproving them.

The paper says: “This reduces both code duplication and the proof effort; we only need to perform proofs on the generic version, instantiations come at no extra cost.” (Section 4.2, PDF p. 10). The method supports representation replacement: linked lists were replaced by doubly-linked lists by changing `arraylist_sl` and operations with the same interface, while proofs above and below remained unchanged (Section 4.2, PDF p. 12).

Verus form. Inference: encode generic folds as recursive `spec fn`s over `Seq` or bounded arrays, and prove reusable lemmas for indexing and updates. Use abstract predicates in module contracts, keeping concrete arrays behind `pub` interfaces. Verus’s executable Rust and specification sequences differ from F★’s `slprop`; the transfer is a design pattern, not a direct translation.

Evidence and limits. The generic libraries comprise bitmaps, static linked lists, queues, AVL trees, frozen arrays, and separation-logic helpers. Table 2 reports reusable-library components totaling 12,827 lines (1,520 bitmap, 2,754 list, 494 queue, 4,283 AVL, 3,692 miscellaneous); these are code-size denominators, not proof-success percentages.

## technique 3: model allocator architecture in ownership layers

What it is. StarMalloc models regular allocations as arenas, size classes, page-sized slabs, and fixed-size slots. Slot metadata is a bitmap; metadata lives in a separate mapped region. A slab predicate ties bitmap bits to ownership of slot slices. Slabs are partitioned into empty, partial, and full lists; an AVL tree records large allocations above 4 kilobytes. Each size class has a lock protecting its metadata; a frozen array permits concurrent read-only access to initialized size-class descriptors.

How to apply it. (1) Separate large and regular allocations by page-size threshold. (2) For regular allocations, map a fixed virtual region and divide it into compile-time arenas. (3) Round requests to one of 27 size classes (or a generic configured list). (4) Represent each slab as a page and each slot as a fixed slice; update the bitmap under the size-class lock. (5) Maintain disjoint metadata lists and prove that they partition all slabs. (6) For free, validate region membership, derive arena/size-class/slot by pointer arithmetic, update metadata, and quarantine an empty slab. (7) For large allocations, insert the mapped pointer and length into the AVL map and use it to validate `free` and call `munmap`.

Verus form. Inference: use bounded arrays and index/range lemmas for slots and slabs, ghost maps for large-allocation extents, and a state-machine or lock API for per-size-class ownership. Pointer arithmetic and OS calls need explicit external specifications; a Verus proof cannot assume C `mmap` behavior without a contract.

Evidence and limits. The implementation is 26,102 F★ lines and approximately 4,300 extracted C lines. The paper proves allocator invariants for the modeled operations, but does not prove the OS, C ABI, or arbitrary clients. The design assumes fixed page size, alignment, bounded metadata, and valid system-call specifications.

## technique 4: security mechanisms as localized specification extensions

What it is. Security defenses are represented by extra predicates and postconditions while preserving upper-layer interfaces. Segregated metadata limits overwrite damage. Free zeroes memory; allocation checks that the memory remains zero and returns `NULL` if corrupted. Empty slabs enter a FIFO quarantine and are returned to the OS; guard pages use `PROT_NONE`; canaries detect small overflows at free time.

How to apply it. (1) Add a zero-content conjunct to `malloc`’s postcondition: every returned byte below the requested size equals zero. (2) Add a `Quarantine` status and fourth list to slab metadata; move empty slabs there and reclaim them FIFO after a configured delay. (3) Add a `Guard` status and fifth list; prove the required guard-page pattern and expose only an abstract guard predicate. (4) Keep slot/slab predicates unchanged where possible so clients retain the same contracts. (5) Test representative use-after-free and heap-corruption exploits against the extracted allocator.

The zeroing contract is explicit: the postcondition requires “(∀ (i:nat{i < size}). get (h1.[r]) i == 0)” (Section 4.3, PDF p. 14). The guard predicate is monotone: once a slab is marked guard, the proof does not recover ordinary ownership (Section 4.3, PDF p. 15).

Verus form. Inference: state zeroedness and quarantine status in ghost predicates and `ensures`; model a guard page as an abstract resource whose only allowed transition is introduction. External `mmap`, `madvise`, and signal behavior need `external_body`-style trusted contracts only at the boundary, never on the function being verified. Inference: canary checks prove detection behavior under a memory model; they do not prove all attacks are prevented.

## technique 5: specification-guided implementation and verified specialization

What it is. The implementation follows the specification’s abstraction boundaries. Complex bitmap or list code is hidden behind interfaces, making VCs smaller and permitting independent module builds. F★ normalization specializes generic code at compile time from a client-provided size-class list, replacing error-prone C macros while leaving proofs unchanged.

How to apply it. (1) Write the abstract contract and predicates first. (2) Implement each layer against that interface. (3) Keep optimization changes inside a module whose interface remains unchanged. (4) Parameterize static configuration (size classes, arenas) as pure values. (5) Normalize the configured value before C extraction; inspect the generated C and re-run verification. (6) Maintain a separate trusted model for OS calls and extraction boundaries.

The paper reports: “the entire verification of StarMalloc only requires 30-40 minutes on a modern laptop” (Section 5, PDF p. 16), while implementation effort was two person-years (Section 6.4, PDF p. 20). The authors say static specialization is verified because F★’s normalizer is part of the typechecker, but extraction itself remains a trusted tool boundary.

Verus form. Inference: use generic Rust functions over const parameters or type parameters, prove them once, and instantiate configurations with compile-time constants. Keep implementation details private behind contracts; use `spec fn` models for configuration. Verus proof reuse depends on stable contracts, while F★ normalization and KaRaMeL extraction have different trust and compilation semantics.

## evidence and measured behavior

The performance setup was a 4-core/8-thread Intel Xeon E5-1620 at 3.60 GHz, 12 GB RAM, Linux 6.1, glibc 2.38, performance governor, and `vm.max_map_count` raised to 1,048,576 (Section 6.1, PDF p. 18). Table 1 normalizes execution time and RSS to hardened_malloc = 1.0 across 30 listed benchmarks; StarMalloc is within 0.84×–1.38× of hardened_malloc on most real-world applications, with redis at 16.379× because the implementation repeatedly mmaps allocations just over one page. Firefox 118.0.2 ran the complete JetStream2 suite with 5.1% overhead versus hardened_malloc and 12.1% versus glibc (Section 6.3, PDF p. 20). These percentages have the Firefox/JetStream2 run as denominator; they are not averages over the 30 Table 1 rows.

Security testing caught the cited use-after-free cases, a bzip2 CVE, and three how2heap exploits; the paper does not state the total number of attempted exploits, so no detection percentage can be computed. Proof effort is reported as two person-years and 26,102 F★ lines, not as a proof-obligation success fraction.

## proof boundary and VL risk

Proved: modeled memory safety, functional allocator behavior, thread safety, zeroing postconditions, and preservation of the layered data-structure invariants. Trusted or assumed: F★/Steel soundness, SMT solving, KaRaMeL extraction and C compiler behavior, OS calls (`mmap`, `munmap`, `madvise`, locks), page alignment, ABI compatibility, and the adequacy of the attacker model. The paper explicitly limits its security claim to inherited defensive design and tested exploits; it does not prove that every attack is impossible.

Inference: the threat to agent-written verified Rust is high for low-level allocators because a passing proof can rely on incorrect foreign-function or hardware contracts, stale configuration assumptions, or an incomplete attacker model. The strongest reusable lesson is the architecture: specify ownership and functional behavior in layers, isolate mutable representations behind interfaces, and make security mechanisms contract extensions. VL should not redo generic bitmap/list/AVL proof libraries or the specification-guided modularity idea. A new Verus contribution would need Rust-native extraction evidence, explicit trusted-boundary accounting, and measured proof maintenance under configuration and dependency changes.

## techniques for the catalog

- layered separation logic — specify ownership, values, and thread safety with compositional predicates and contracts
- generic heap combinators — define reusable sequence, dependent-ownership, and refinement predicates, then instantiate them across data structures
- allocator invariant layers — tie slots, bitmaps, slabs, lists, size classes, arenas, and large-allocation maps into modular ownership contracts
- localized hardening proofs — add zeroing, quarantine, guard-page, and canary predicates without changing unrelated interfaces
- specification-guided extraction — implement to contracts, specialize static parameters by verified normalization, and extract to C behind explicit trust boundaries

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
