# SquirrelFS: Using the Rust Compiler to Check File-System Crash Consistency
(authored by agents unless marked 🧑)
Tag: `leblanc2025squirrelfs`, [paper](https://doi.org/10.1145/3769109)

## scope and result

SquirrelFS is a persistent-memory file system that uses Rust typestate to enforce crash-consistency ordering at compile time. Its Synchronous Soft Updates (SSU) mechanism makes every system call durable before return and adds atomic rename recovery. The implementation has 7,500 lines of Rust (Sec. 3.4, p. 4). The central claim is: “If the compilation is successful, it indicates that the ordering-based invariants hold throughout the file system” (Sec. 3, p. 3). This is a targeted ordering guarantee, not full functional verification.

## technique 1: synchronous soft updates with explicit ordering rules

What it is. SSU adapts soft updates to persistent memory by making operations synchronous, eliminating cross-operation dependency cycles, and adding a persistent rename pointer. It enforces three rules: never point to an uninitialized structure; never reuse a resource before clearing all old pointers; and never reset an old pointer before setting the new pointer (Sec. 3.1, p. 3). Every update is durable before the next step.

How to apply it:

1. make each system call durable before returning; `fsync` becomes a no-op (Sec. 3.4, p. 5)
2. initialize and durably allocate a resource before linking a directory entry to it (Sec. 3.4, p. 5)
3. on deallocation, clear links first and zero the object only afterward (p. 5)
4. for rename, persist a destination-to-source rename pointer, make the destination valid, invalidate the source, clear the pointer, and deallocate the source; recovery either rolls back before the atomic point or completes after it (Sec. 3.1, pp. 3–4)
5. use cache-line flushes and store fences to make each step durable and ordered under the x86 persistent-memory model (Sec. 3.4, p. 5)

The paper states: “All modifications must be durable before proceeding to the next step” (Sec. 3.1, p. 4). SSU provides metadata crash atomicity but not atomic file-data operations; the authors say data operations could use copy-on-write (Sec. 3.1, p. 4).

Verus form. Inference: model each transition as a Verus function with `requires` describing the typestate and `ensures` describing the post-state, durability flag, and pointer ordering. Inference: use loop `invariant` for recovery scans and `decreases` for termination; prove that rename recovery establishes either the source or destination state. Inference: a `#[verifier::external_body]` flush primitive would be a trusted hardware boundary and must carry an explicit specification of persistence ordering.

Evidence and limits. The mechanism assumes byte-addressable low-latency persistent memory, x86 crash atomicity for aligned 8-byte-or-smaller writes, cache-line flushes, and store fences (Sec. 3.4, p. 5). It does not guarantee data atomicity or properties requiring arbitrary sets of objects.

## technique 2: dual typestate parameters and ownership-consuming transitions

What it is. Persistent objects carry two zero-sized generic state parameters. Persistence typestate is Dirty, InFlight, or Clean; operational typestate records which operations have occurred and controls what comes next (Sec. 3.2, p. 4). Methods consume an object and return it with a new type. For example, `flush(self) -> Inode<InFlight, S>` and `fence(self) -> Inode<Clean, S>`; `commit_dentry` requires `Inode<Clean, Init>` and returns a committed dentry (Listing 2, p. 4).

How to apply it:

1. define persistent structures with persistence and operational state parameters
2. expose each legal transition only on the source-state instantiation
3. consume `self` in the transition and return the destination-state object
4. require all prerequisite objects as typed parameters; a call with `Inode<Free>` where `Inode<Init>` is required must fail compilation (Listing 1, p. 3)
5. keep independent operations reorderable by encoding a partial order, not a total order (Sec. 3.2, p. 4)
6. use Rust ownership and locking so each resource has one owner and one typestate at a time (Sec. 3.2, p. 4)

The paper explains: “the partial order is encoded in the function signatures of its associated functions” (Sec. 3.2, p. 4). The mkdir example initializes a new inode, sets the dentry name, increments the parent link count, and commits the dentry only after those prerequisites (Sec. 3.3, p. 4).

Verus form. Inference: retain typestate phantom parameters for compile-time API misuse checks, then add Verus contracts to prove the transition implementation and metadata invariants. Inference: a transition should have an `ensures` clause relating old and new fields; use `old(...)` in specifications where pre-state values are needed. Inference: ownership can simplify alias reasoning, but Verus proofs still need explicit invariants for maps, page ranges, and locks.

Evidence and limits. The compiler catches ordering errors quickly, but transition bodies themselves are not verified. The authors found a wrong-address cache-line flush inside a transition that typestate did not catch (Sec. 5.7, p. 10).

## technique 3: Alloy model plus compiler and dynamic testing

What it is. The authors develop an Alloy transition-system model alongside Rust. Each typestate transition maps roughly one-to-one to an Alloy next-state predicate. Alloy explores bounded traces, while a syntax-based checker verifies that every mutable structure is mentioned to avoid unconstrained frame changes (Secs. 3.5 and 4.1, pp. 5–7).

How to apply it:

1. represent typestate and persistent objects as Alloy signatures and relations
2. encode each operation as a next-state predicate, including concurrent operations and crash transitions (Sec. 3.5, p. 5)
3. assert sanity and consistency invariants: legal link counts, no pointers to uninitialized objects, no pointers from freed objects, and no rename-pointer cycles (Sec. 5.7, p. 10)
4. bound traces to two operations, ten persistent objects, and 30 steps for routine checking (p. 10)
5. run a syntax checker that requires every mutable structure to appear in each transition's frame (Sec. 4.2, p. 7)
6. compile Rust typestate code and run handwritten tests, xfstests, and Chipmunk crash fuzzing for properties outside the model (Sec. 4.2, p. 7; Sec. 5.7, p. 10)

Verus form. Inference: translate the Alloy state relation into Verus ghost maps and transition lemmas, then use `assert` and `invariant` to prove frame conditions. Inference: bounded Alloy traces remain useful as counterexample generation for Verus specifications, but cannot replace unbounded proofs. Inference: keep dynamic crash testing for volatile indexes and hardware interactions outside the Verus model.

Evidence. Alloy found missing rename recovery and incorrect dependency rules for `.` and `..` entries (Sec. 4.1, pp. 7–8). Chipmunk ran the modified test generators for approximately 24 hours and found no ordering-related crash bugs, but found four bugs in unchecked code: three volatile-index rebuild bugs and one wrong-address cache flush (Sec. 5.7, p. 10). SquirrelFS passed all 67 supported generic xfstests (p. 10). These denominators are explicit; unsupported xfstests were excluded.

## performance, trust, and limits

The evaluation uses a two-socket 32-core machine, 128 GB RAM, and a 128 GB Intel Optane module under Debian Bookworm and Linux 6.3 (Sec. 5.1, p. 7). SquirrelFS has approximately 10-second compile time including typestate checking, compared with about 11 hours for FSCQ and 1.8 hours for VeriBetrKV (10 minutes parallelized) (Sec. 5.6, p. 10). It is within 10% of the fastest system on Filebench webserver and webproxy and is 8% and 13% better on fileserver and varmail respectively (Sec. 5.3, p. 8). Mounting an empty or initialized 128 GB device takes about 5.5 seconds; full utilization takes 55.5 seconds (Table 2, p. 10).

The trusted base includes the unmodified Rust compiler, typestate transition bodies, x86 persistence semantics, Linux VFS locking, Alloy's bounded model, and test generators. The paper explicitly contrasts the approach with full verification: “our typestate-based approach can only check ordering-based invariants” (Sec. 3.5, p. 5). It cannot express universally quantified properties over unknown-size sets, such as all pages having a state; the authors resorted to range typestate, which centralizes more logic in transitions (Sec. 4.3, pp. 7–8).

Inference: threat to VL is moderate. Typestate is a practical complement to Verus for API protocols and ownership states, but it cannot establish arithmetic, data-structure, or whole-system invariants. VL should combine typestate-shaped APIs with Verus contracts and model-based counterexample generation. The SquirrelFS experience shows that unchecked transition code and volatile indexes remain bug-prone even when ordering is statically enforced.

## techniques for the catalog

- synchronous soft updates — make persistent updates durable in order and use a rename pointer to obtain crash-atomic rename
- dual typestate APIs — encode persistence and operation states in generic parameters and consume values across legal transitions
- ownership-enforced partial orders — use Rust ownership and typed function signatures to prevent out-of-order updates at compile time
- Alloy plus compiler checking — model bounded crash traces, compile typestate code, and use frame-condition checks to find design errors
- layered testing — combine xfstests and crash fuzzing for volatile and transition-body bugs outside typestate coverage

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
