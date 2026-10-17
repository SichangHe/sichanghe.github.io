# Push-Button Verification of File Systems via Crash Refinement
(authored by agents unless marked 🧑)
Tag: `sigurbjarnarson2016push`, [paper](https://www.usenix.org/conference/osdi16/technical-sessions/presentation/sigurbjarnarson)

## scope and result

The paper presents Yggdrasil, a toolkit that verifies file systems without implementation annotations or manual proofs. Its central correctness relation is crash refinement: from equivalent consistent initial states, each implementation operation must produce a state equivalent to some allowed specification state, after completed recovery when recovery is used. Crash-free executions must also be equivalent, and recovery must be idempotent (section 3.1, printed pages 6–7). The paper states: “Crash refinement captures the notion that even in the presence of non-determinism, such as system crashes and reordering of writes, any disk state produced by a correct implementation must also be producible by the specification” (section 1, printed page 1).

Yggdrasil takes a specification, implementation, and consistency invariants; symbolically executes each operation; asks Z3 to prove the resulting formula; visualizes counterexamples; optionally removes flushes and re-verifies; then emits C through Cython and a FUSE bridge (section 2, printed pages 2–5). The implementation language in the prototype is a subset of Python. The paper’s claim is that this turns proof into a push-button check while retaining functional and crash-safety guarantees.

## technique: specify logical behavior separately from disk representation

What it is. A specification has (1) an abstract data structure, (2) operations over that structure, and (3) an equivalence predicate between abstract and implementation states. YminLFS uses maps from directory/name to inode, inode to parent, and inode to metadata. The well-formedness invariant relates parent and child maps. The paper’s exact summary is: “a file system specification consists of three parts: an abstract data structure representing the logical layout, a set of operations over this data structure to define the intended behavior, and an equivalence predicate that defines whether a given implementation satisfies the specification” (section 2.1, printed page 3).

When to use it. Inference: use this split when several physical layouts should implement one logical API, or when a direct proof over the complete disk representation causes path explosion.

How to apply it.

1. Define abstract maps and their types, such as `Map((InoT, NameT), InoT)` and metadata maps (section 2.1, printed page 3).
2. Define a well-formedness invariant; YminLFS requires every positive child mapping to have a matching parent mapping (section 2.1, printed page 3).
3. Define read operations directly over the maps and mutating operations as atomic transactions. The paper’s `mknod` example checks that the name and inode are unused, updates child, parent, and metadata maps, and wraps updates in `with self.transaction()` (section 2.1, printed page 3).
4. Define equivalence: lookup results must match, and successful lookups must have equal metadata (section 2.1, printed page 3).

Verus form. Inference: represent the logical state with a Rust struct and write `spec fn` observers plus an `ensures` contract for each executable operation. Use `requires` for valid-state assumptions and a proof function to establish the representation invariant. Use a Verus `ghost` value or an abstract state-machine layer for the specification; do not treat the specification function as executable code.

Evidence and limits. YminLFS’s specification gives both “crash-free functional correctness” and “crash safety” in a few lines (section 2.1, printed page 3). Inference: Verus can express the logical contract, but the crash schedule and disk model still need an explicit ghost model and proofs; the paper’s automatic Python-to-SMT encoding does not carry over automatically.

## technique: crash refinement for nondeterministic storage

What it is. A system operation is modeled as `f(s, x, b)`, where `s` is state, `x` external input, and `b` a set of Boolean values describing the crash schedule. Crash-free equivalence requires equivalent consistent outputs under an all-true schedule. Crash refinement requires that for every implementation schedule there exists a specification schedule producing an equivalent consistent state. With recovery, idempotence means that completing recovery after an interrupted recovery yields the same state as completing it directly; the definition compares states after recovery completes (Definition 3, section 3.1, printed page 7): `∀s, b. r(s, true) = r(r(s, b), true)`. Inference: this does not guarantee that crashes eventually stop.

When to use it. Inference: use this relation when physical writes may reorder, be lost in a crash, or be replayed by recovery, and lock-step equivalence is too strong because it omits disk reorderings, crashes, and recovery (section 3.1, printed page 6).

How to apply it.

1. Choose the external input and model the crash schedule; an asynchronous-disk write uses `on` and `sync` Booleans to represent completion and persistence (section 3.1, printed pages 6–7).
2. Define state equivalence and consistency invariants for specification and implementation.
3. Prove crash-free equivalence.
4. Prove that each implementation schedule has a matching specification schedule; add recovery idempotence and apply recovery before comparing states (Definitions 2–4, section 3.1, printed pages 6–7).
5. Classify background operations such as garbage collection as no-ops when they preserve externally visible state (Definition 5, printed page 7).

Verus form. Inference: model the disk and crash schedule as ghost state and prove a transition-system refinement lemma. Use `requires` for equivalent consistent pre-states and `ensures` for existence of a matching abstract post-state represented by a ghost witness. Use a `proof fn` for recovery idempotence and a loop `invariant` for bounded recovery loops. Inference: a Verus adaptation would need to prove the existence of a matching specification schedule; the paper does not supply that adaptation.

Evidence and limits. YminLFS’s verifier proves the theorem for all disks with up to 2^64 blocks and every operation trace, regardless of length; after fixes, the proof took under 30 seconds (section 2.3, printed page 5). The theorem assumes the file system is the only disk user; direct adversarial disk corruption is outside it; generated `fsck` detects violations of the consistency invariants (section 2.3, printed page 5). The verifier unrolls loops and recursion without a depth bound; operations must be finite, for example by bounding loops (section 3.2, printed page 7).

## technique: consistency invariants as both proof assumptions and fsck

What it is. An implementation invariant characterizes valid on-disk images. Yggdrasil checks it after initialization, assumes it before each operation, and proves it afterward. It can generate an `fsck` checker from the same predicate. The paper says: “Yggdrasil uses consistency invariants for two purposes: push-button verification and run-time checking in the style of fsck” (section 2.2, printed page 4).

How to apply it. For YminLFS, constrain the superblock counters and mapping pointer, ensure every inode mapping points into the allocated block range, and ensure directory entries map into the inode range (section 2.2, printed pages 4–5). Run verification with those predicates as pre/post conditions, then generate the checker for external damage.

Verus form. Inference: encode the image predicate as a `spec fn invariant(state) -> bool`; place it in `requires` and `ensures` on each operation and maintain it in loop `invariant` clauses. An executable checker can return `bool` and be proved equivalent to the specification predicate. Verus proofs do not make the hardware image valid unless the disk model and all callers satisfy their contracts.

Evidence and limits. The generated checker detects inconsistencies but “cannot repair corrupted file systems” (section 2.2, printed page 4). Yggdrasil’s Yxv6 uses five invariants for 1,500 implementation lines (Figure 5, printed page 11); Inference: this count does not establish a general proof-effort ratio.

## technique: modular abstraction layers to scale SMT

What it is. Yxv6 has five layers: asynchronous disk, transactional disk, virtual transactional disk, inodes, and file system. The physical block device's relation to the asynchronous disk is assumed in Axiom 1; the next four layers are proved in Theorems 2–5. Each upper implementation is written against the lower specification, not its implementation (sections 4.1–4.2, printed pages 8–9). Separate disks for logically independent data let the solver exploit locality. The paper states: “This layered approach effectively bounds the reasoning to a single layer at a time” (section 4.1, printed page 8).

How to apply it. Start with an asynchronous-disk specification. Implement write-ahead logging as a transactional disk and prove Theorem 2. Implement block pointers over multiple data disks and prove Theorem 3. Implement inode address ranges and prove Theorem 4. Add files, directories, and symbolic links and prove Theorem 5 (section 4.2, printed pages 8–9). Then pack sparse bitmaps and inodes and place the disks in non-overlapping partitions of one disk; the paper proves this is a crash refinement in Theorem 6 (section 4.3, printed page 10). Finally, group transactions and prove the relaxed implementation refines the synchronous one (Theorem 7, section 4.4, printed page 10).

Verus form. Inference: make each layer a Rust module with a public abstract state and private representation. Give each operation `requires`/`ensures` contracts connecting representation and abstract state, and prove a refinement lemma per layer. Use Verus state-machine transition proofs when operations share ghost state. Separate ghost disks preserve the paper’s locality idea; packing can be proved as a representation refinement.

Evidence and limits. Total verification of Yxv6+sync took under one minute on one core; Yxv6+group_commit finished within 1.6 hours on 24 Intel Xeon 2.2 GHz cores, approximately 36 hours on one core (section 8, printed page 13). Inference: these measurements support this design on the reported models and hardware, not a universal solver speed claim.

## technique: validation for large searches and deferred reclamation

What it is. Because symbolic execution must terminate, Yxv6 avoids directly verifying searches that may scan many bitmap blocks. Instead, it verifies a validator that checks the returned free index and fails if it is not free. Unlink moves the file’s inode to an orphan-inodes disk in a finite operation; a later collector reclaims blocks, and reclamation is proved a no-op because it does not affect externally visible state (section 4.2, printed pages 9–10).

How to apply it. Treat the search algorithm as a black box, check its result against the bitmap, return an error if the bit is not free, and verify the checker. For deletion, move the inode to the orphan-inodes disk, then reclaim its blocks later (section 4.2, printed pages 9–10).

Verus form. Inference: treat the search result as untrusted and verify a validator that checks its range and free-bit status before allocation. Prove that orphan reclamation preserves the abstract state with a `proof fn`.

Evidence and limits. Validation guarantees allocator safety but “does not guarantee that block or inode allocation will succeed when there is enough space,” which the paper treats as quality of service (section 4.5, printed page 10).

## technique: counterexample-guided debugging and re-verification after optimization

What it is. Z3 checks the negation of each refinement formula. A satisfying model yields concrete states, input, and crash schedule; the visualizer prints source locations, pending writes, synchronized writes, and the crash point (sections 2.3 and 3.3, printed pages 5 and 7). The built-in optimizer greedily removes flushes and re-runs verification; it is explicitly untrusted (section 3.4, printed page 8).

How to apply it. Inference: remove or change one flush, run the verifier, inspect the pending-write trace, repair ordering, then re-run. For optimization, rewrite the Python AST, verify the result, and retain only transformations that pass.

Verus form. Inference: a possible adaptation is to log a concrete model from a separate crash test harness while keeping the Verus contract proof as the acceptance condition. Every optimizer output must be compiled and proved again; it cannot be accepted merely because the source transformation is syntax-preserving.

Evidence and limits. The missing-flush example exposes a superblock pointing to an unsynchronized inode map (section 2.3, printed page 5). Ylog found two confirmed Arrakis bugs: non-idempotent recovery and garbage after a crash during recovery (section 5, printed page 11). The trusted base includes the specification, verifier, visualizer, compiler, Z3, Python, gcc, FUSE, and Linux kernel; the optimizer is excluded (section 2.5, printed page 5).

## what is proved, measured, trusted, and incomplete

The paper reports per-operation and system crash refinement for Yxv6, Ycp, and Ylog (Definitions 4–6, section 3.1; sections 4–5). Empirical tests add that both Yxv6 variants passed Linux Test Project `fsstress` and SibylFS conformance tests except incomplete features such as hard links and extended attributes (section 8, printed page 12). Yxv6+group_commit was 3–150× faster than FSCQ and on average within 10× of ext4’s default configuration on the paper’s five benchmarks, SSD setting, and stated CPU (section 8, printed pages 12–13). Inference: these measurements do not guarantee performance on other hardware.

The trusted assumptions include the disk model, Z3, Python, gcc, Cython, FUSE, Linux, and the specification itself. The disk model assumes atomic single-block reads and writes, with 64-bit block addresses and 4 KB blocks unless otherwise specified (section 2.2, printed page 4). Yggdrasil handles only single-threaded code, first-order SMT theories, finite operations, and supported Python symbolic values; symbolic execution does not support exceptions, coroutines, or calls into C-library code (sections 3.2 and 6, printed pages 7 and 11). Inference: an agent-written Verus storage product faces substantial threat from crash-ordering bugs, recovery non-idempotence, and specification mistakes; Yggdrasil’s results show that explicit crash models, layered refinement, and re-verification can make those risks mechanically visible, but they do not prove external hardware, compiler, kernel, or product requirements.

## techniques for the catalog

- crash refinement — require every implementation crash state to match some allowed specification crash state

- abstract specification plus equivalence — separate logical operations from physical layout and define state equivalence

- consistency invariant as fsck — reuse the representation predicate as both a proof condition and a corruption checker

- layered refinement — prove one abstraction boundary at a time and let upper layers use lower specifications

- separate representations — use independent disks to expose locality, then prove packing refinement

- validation and orphaning — verify result checks for a black-box search and reclaim orphaned blocks without changing externally visible state

- counterexample visualizer — turn an SMT model into source-linked pending-write and crash traces

- re-verify optimization — treat transformations as untrusted and accept them only after repeating the refinement proof
