# SquirrelFS: Using the Rust Compiler to Check File-System Crash Consistency
(authored by agents unless marked 🧑)
Tag: `leblanc2024squirrelfs`, [paper](https://arxiv.org/abs/2406.09649)

This study checks arXiv:2406.09649v1, dated 14 June 2024 on the paper’s first page. Page references count PDF pages from the title page.

## scope and result

SquirrelFS is a persistent-memory file system that uses Rust typestate to enforce crash-consistency ordering at compile time. Its Synchronous Soft Updates (SSU) mechanism makes every system call durable before return and adds atomic rename recovery. The implementation has 7,500 lines of Rust (Sec. 3.4, p. 6). The central claim is: “If the compilation is successful, it indicates that the ordering-based invariants hold throughout the file system: in other words, the checking is complete.” (Sec. 3, p. 4). This is a targeted ordering guarantee, not full functional verification.

## technique 1: synchronous soft updates with explicit ordering rules

What it is. SSU adapts soft updates to persistent memory by making operations synchronous, eliminating cross-operation dependency cycles, and adding a persistent rename pointer. It enforces three rules: never point to an uninitialized structure; never reuse a resource before clearing all old pointers; and never reset an old pointer before setting the new pointer (Sec. 3.1, p. 5). Updates must be durable before dependent steps; independent updates can share a fence (Sec. 3.3, p. 6).

How to apply it:

1. make each system call durable before returning; `fsync` becomes a no-op (Sec. 3.4, p. 7)
2. initialize and durably allocate a resource before linking a directory entry to it (Sec. 3.4, p. 7)
3. on deallocation, clear links first and zero the object only afterward (Sec. 3.4, p. 7)
4. for rename, persist a destination-to-source rename pointer, make the destination valid, invalidate the source, clear the pointer, and deallocate the source; recovery either rolls back before the atomic point or completes after it (Sec. 3.1, p. 5)
5. use cache-line flushes and store fences to make each step durable and ordered under the x86 persistent-memory model (Sec. 3.4, p. 7)

The paper states: “All modifications must be durable before proceeding to the next step.” (Sec. 3.1, p. 5). SSU provides metadata crash atomicity but not atomic file-data operations; the authors say data operations could use copy-on-write (Sec. 3.1, p. 5).

Verus form. Inference: model each transition as a Verus function with `requires` describing the typestate and `ensures` describing the post-state, durability flag, and pointer ordering. Inference: use loop `invariant` for recovery scans and `decreases` for termination; prove that rename recovery establishes either the source or destination state. Inference: a `#[verifier::external_body]` flush primitive would be a trusted hardware boundary and must carry an explicit specification of persistence ordering.

Evidence and limits. The mechanism assumes byte-addressable low-latency persistent memory, x86 crash atomicity for aligned 8-byte-or-smaller writes, cache-line flushes, and store fences (Sec. 3.4, p. 7). SSU does not guarantee data atomicity. Separately, Rust typestate cannot directly check that all members of a variable-sized set have a given state (Sec. 4.3, p. 10).

## technique 2: dual typestate parameters and ownership-consuming transitions

What it is. Persistent objects carry two zero-sized generic state parameters. Persistence typestate is Dirty, InFlight, or Clean; operational typestate records which operations have occurred and controls what comes next (Sec. 3.2, pp. 5–6). Methods consume an object and return it with a new type. For example, `flush(self) -> Inode<InFlight, S>` and `fence(self) -> Inode<Clean, S>`; `commit_dentry` requires `Inode<Clean, Init>` and returns a committed dentry (Listing 2, p. 6).

How to apply it:

1. define persistent structures with persistence and operational state parameters
2. expose each legal transition only on the source-state instantiation
3. consume `self` in the transition and return the destination-state object
4. require all prerequisite objects as typed parameters; a call with `Inode<Free>` where `Inode<Init>` is required must fail compilation (Listing 1, p. 4)
5. keep independent operations reorderable by encoding a partial order, not a total order (Sec. 3.2, pp. 5–6)
6. use Rust ownership and locking so each resource has one owner and one typestate at a time (Secs. 3.2 and 3.4, pp. 6, 8)

The paper explains: “As we discussed previously (§2), an object’s typestate is encoded in generic type parameters in its definition, and the partial order is encoded in the function signatures of its associated functions.” (Sec. 3.2, pp. 5–6). The mkdir example initializes a new inode, sets the dentry name, increments the parent link count, and commits the dentry only after those prerequisites (Sec. 3.3, p. 6).

Verus form. Inference: retain typestate phantom parameters for compile-time API misuse checks, then add Verus contracts to prove the transition implementation and metadata invariants. Inference: a transition should have an `ensures` clause relating old and new fields; use `old(...)` in specifications where pre-state values are needed. Inference: ownership can simplify alias reasoning, but Verus proofs still need explicit invariants for maps, page ranges, and locks.

Evidence and limits. The compiler catches ordering errors quickly, but transition bodies themselves are not verified. The authors found a wrong-address cache-line flush inside a transition that typestate did not catch (Sec. 5.7, pp. 13–14).

## technique 3: Alloy model plus compiler and dynamic testing

What it is. The authors develop an Alloy transition-system model alongside Rust. Each typestate transition maps roughly one-to-one to an Alloy next-state predicate. Alloy explores bounded traces. A separate syntax-based checker checks that each transition mentions every mutable structure, helping detect missing frame conditions; it cannot detect all issues (Secs. 3.4, 4.1, and 4.3, pp. 8–10).

How to apply it:

1. represent typestate and persistent objects as Alloy signatures and relations
2. encode each operation as a next-state predicate, including concurrent operations, crashes, and recovery (Sec. 3.4, p. 8)
3. assert sanity and consistency invariants: legal link counts, no pointers to uninitialized objects, no pointers from freed objects, no rename-pointer cycles, and at most one rename pointer targeting each directory entry (Sec. 5.7, p. 13)
4. bound traces to two operations, ten persistent objects, and up to 30 steps in the reported evaluation (Sec. 5.7, p. 13)
5. run a syntax checker that checks that each transition explicitly mentions all mutable structures (Sec. 4.3, p. 10)
6. compile Rust typestate code and run handwritten tests, xfstests, and Chipmunk crash fuzzing for properties outside the model (Sec. 4.2, pp. 9–10; Sec. 5.7, pp. 13–14)

Verus form. Inference: translate the Alloy state relation into Verus ghost maps and transition lemmas, then use `assert` and `invariant` to prove frame conditions. Inference: bounded Alloy traces remain useful as counterexample generation for Verus specifications, but cannot replace unbounded proofs. Inference: keep dynamic crash testing for volatile indexes and hardware interactions outside the Verus model.

Evidence. Alloy found missing rename recovery and incorrect dependency rules for `.` and `..` entries (Sec. 4.2, p. 9). With unsupported system calls removed from Chipmunk’s test generators, the authors ran its full systematically generated suite and fuzzed for approximately 24 hours. Chipmunk found no ordering-related crash bugs, but found four bugs in unchecked code: three volatile-index rebuild bugs and one wrong-address cache flush (Sec. 5.7, pp. 13–14). SquirrelFS passed all 67 supported generic xfstests; the remaining tests require unsupported system calls or arguments (Sec. 5.7, p. 13).

## performance, trust, and limits

The evaluation uses a two-socket 32-core machine, 128 GB RAM, and a 128 GB Intel Optane module under Debian Bookworm and Linux 6.3 (Sec. 5.1, p. 11). SquirrelFS has approximately 10-second compile time including typestate checking, compared with about 11 hours for FSCQ and 1.8 hours for VeriBetrKV (10 minutes parallelized) (Sec. 5.6, p. 13). It is within 10% of the fastest system on Filebench webserver and webproxy and is 8% and 13% better on fileserver and varmail respectively (Sec. 5.3, pp. 11–12). On the 128 GB device, Table 2 reports 5.80 seconds for mkfs, 5.51 seconds for a normal empty mount, and 30.50 seconds for a normal full mount. Recovery scans take 5.76 seconds for an empty device and 55.50 seconds for a full device; these measurements use cleanly unmounted images with an additional recovery scan (Sec. 5.5, Table 2, p. 13).

The paper warns that incorrect ordering rules, buggy trusted implementation code, or compiler bugs can still cause crash-consistency bugs (Sec. 1, p. 2). The implementation assumes x86 persistence semantics and relies on VFS locking (Sec. 3.4, pp. 7–8). Alloy and testing provide additional evidence rather than a proof of the implementation. The paper explicitly contrasts the approach with full verification: “In contrast, our typestate-based approach can only check ordering-based invariants.” (Sec. 3.5, p. 8). It cannot express universally quantified properties over unknown-size sets, such as all pages having a state; the authors resorted to range typestate, which centralizes more logic in transitions (Sec. 4.3, p. 10).

Inference: VL could combine typestate APIs for operation ordering with Verus contracts for transition bodies and metadata invariants, using bounded models to find specification errors. The reported four Chipmunk bugs illustrate the limits of ordering checks: they occurred in transition code and volatile-structure rebuilding (Sec. 5.7, p. 14).

## techniques for the catalog

- synchronous soft updates — make persistent updates durable in order and use a rename pointer to obtain crash-atomic rename
- dual typestate APIs — encode persistence and operation states in generic parameters and consume values across legal transitions
- ownership-enforced partial orders — use Rust ownership and typed function signatures to prevent out-of-order updates at compile time
- Alloy plus compiler checking — model bounded crash traces, compile typestate code, and use frame-condition checks to find design errors
- layered testing — combine xfstests and crash fuzzing for volatile and transition-body bugs outside typestate coverage

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Each typestate operation on such a range performs the operation on all pages in the range."): checked all paper text, study quotations, numbers, section and PDF-page references, technique steps, and stated limits; corrected the checked version’s year and link, references, mount measurements, model-checking description, and testing scope; did not check source code, reproduce experiments, or validate the proposed Verus adaptations.
