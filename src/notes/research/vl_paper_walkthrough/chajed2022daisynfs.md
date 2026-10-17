# Verifying the DaisyNFS concurrent and crash-safe file system with sequential reasoning
(authored by agents unless marked 🧑)
Tag: `chajed2022daisynfs`, [paper](https://www.usenix.org/conference/osdi22/presentation/chajed)

## contribution and trusted boundary
DaisyNFS is a concurrent, crash-safe NFS server whose file-system operations are verified with sequential Dafny proofs. A separately verified transaction system, GoTxn, provides concurrency and crash atomicity. The abstract states: “DaisyNFS uses GoTxn, a new verified, concurrent transaction system that extends GoJournal [9] with two-phase locking and an allocator.” (p. 447). The implementation is a Go server on a bare disk, and correctness is a concurrent, crash-safe refinement to an abstract NFS state machine (Sections 4.1–4.2, pp. 451–453).

DaisyNFS wraps a transaction around each verified file-system operation; background space reclamation uses additional transactions. GoTxn extends GoJournal with two-phase locking, so safe transactions appear atomic at commit. The file-system part uses Dafny's automation; the GoTxn proof uses Perennial and Coq (Sections 1 and 5, pp. 447–448, 453–455). The transaction restriction is material: “GoTxn cannot make arbitrary transactions appear atomic (for example, if they access global variables), and so the specification for GoTxn applies only to a carefully formalized subset of “safe” transactions that access shared state only through the transaction system.” (Section 1, p. 447).

The proof excludes the Go dispatch loop and wire encoding/decoding, and trusts the connection between the Dafny contracts and Coq theorem. It proves neither liveness nor deadlock freedom. DaisyNFS omits unstable writes, symbolic links, hard links, and paginated READDIR; FSINFO, PATHCONF, and FSSTAT are implemented without meaningful behavioral specifications (Sections 1, 3, 4.1, and 5.2, pp. 448, 450, 452, 455).

## technique: abstract NFS state machine and refinement
What it is: define an ideal NFS state and a transition for every operation, then prove that every network trace of the implementation is also a trace of the ideal server. The paper defines refinement so that after any initial states satisfying `init`, every implementation trace of requests and responses can be produced by the specification, including executions with crashes and restarts (Section 4.2, pp. 451–453).

How to apply it:
1. Define the abstract state as a map from inode numbers to byte files or directories, both with attributes; directories map byte-string names to inode numbers. It is a collection of links, not a tree (Section 4.1, p. 451).
2. Specify each operation as a nondeterministic transition predicate. The hypothetical GETSZ example requires unchanged state and relates each error to a state predicate; success returns the file length (Section 4.1, pp. 451–452).
3. Define implementation/specification initial-state relation and the visible network trace (Section 4.2, pp. 452–453).
4. Prove a forward simulation: each implementation operation preserves an abstraction relation and corresponds to an abstract transition; crashes correspond to allowed specification crash transitions (Section 5, pp. 453–454).
5. Compose the file-system refinement with the GoTxn refinement to obtain DaisyNFS correctness (Theorem 1, Section 4.2, p. 453).

Verus form: Inference: a Rust adaptation could define a ghost abstract file-system state and a relation to concrete state, with per-operation contracts and proofs of simulation steps. It would also need an execution model for crashes and recovery, and explicit assumptions about unverified parsing and network I/O. The paper does not establish that Verus supports this full proof.

## technique: simulation transfer for sequential application proofs
Simulation transfer is the paper's key method for isolating concurrency reasoning. If a layer `S` is implemented by safe transactions and its transaction bodies form a sequential refinement, Theorem 2 derives concurrent, crash-safe refinement for any program using that layer, linked with the transaction bodies and GoTxn (Section 5.1, pp. 454–455). The paper explains: “The design of DaisyNFS uses transactions, and in particular GoTxn, to simplify the proof of concurrent refinement.” (Section 5.1, p. 454).

How to apply it:
1. Define `seq_refinement` with an abstraction relation `R`, a sequential Hoare triple for every operation, initialization, and a crash condition. The crash condition concerns states related by `R`, not intermediate operation states; the Txn and NFS layers have no ephemeral state, so crashes leave them unchanged (Sections 5.1–5.2, pp. 454–455).
2. Require `safe(i(op))` for every transaction body: code cannot access global state outside the transaction-system interface (Section 5.1, p. 454).
3. Prove every transaction body is a sequential refinement and every body satisfies `safe` (Section 5.2, p. 455).
4. Use the transaction-system theorem that each safe transaction refines an atomic operation (Theorem 4, Section 6.2, pp. 455–456).
5. Apply Theorem 2 to obtain a concurrent, crash-safe refinement for the full server (Sections 5.1–5.2, pp. 454–455).

Verus form: Inference: a Rust adaptation would need an API discipline restricting both reads and writes of shared state to the transaction interface, a generic proof of transaction refinement, and per-operation sequential contracts. It would also need to justify the connection between those contracts and the generic theorem, which DaisyNFS treats as trusted (Section 5.2, p. 455).

## technique: two-phase locking proved by local reasoning
GoTxn maintains a lock per object. In the expanding phase, reads and writes acquire locks; at commit, writes are committed; in the contracting phase, locks are released. Reads may return early because locks keep values consistent until commit; abort discards buffered writes and releases locks (Section 6.1, p. 455).

The proof avoids a global conflict graph. For a transaction body `f`, it records map `J` of each object's first accessed value and footprint `Σ = dom(J)`. After `n` steps, the local invariant says the transaction holds every lock in `Σ`, and executing `n` steps of `f` from any state matching `J` on `Σ` can lead to buffered values `J′`. At commit, locking ensures the durable values still match `J`, so the observed execution can be reproduced atomically there; GoJournal atomically installs `J′`. Accesses to other global state would invalidate this argument because another thread could change that state before commit (Section 6.2, p. 456).

Allocation is an explicit exception to holding locks until commit: the allocator releases its lock early, and its state is outside the transaction footprint. Its specification therefore allows any returned address. The file system treats allocation as a hint and validates it against the durable bitmap using `ReadBit`; freeing updates both the allocator and durable bitmap (Sections 3.2 and 6.2, pp. 450–451, 456).

Verus form: Inference: a Rust proof could represent the footprint and per-object permissions with ghost state, then show that commit reproduces the transaction's observed behavior and installs its buffered map atomically. This would require a concurrency model and ownership proofs beyond a sequential postcondition; the paper does not provide a Verus implementation.

## technique: transactional file-system engineering
DaisyNFS deliberately fits each visible operation into one bounded transaction. Recursive triple-indirect blocks support files up to 512 GB (Section 7.1, p. 457). Renames lock inodes in numeric order to avoid deadlock. Source/destination lookup may discover an inode earlier in that order; before violating the order, the transaction returns an error containing the required inode set. The retry acquires this set in order as a lock hint, then compares it against the current source and destination in case they were renamed concurrently (Section 7.1.1, p. 457). This is an implementation strategy, not a proved deadlock-freedom result (Section 1, p. 448).

Large deletes may exceed GoJournal's 511-block transaction limit. DaisyNFS first removes the file from its directory and marks the file free, then runs separate `ZeroFreeSpace(ino)` transactions that reclaim and zero its blocks. `ZeroFreeSpace` is proved to have no effect on abstract file-system state and may return early to avoid overflowing a transaction (Section 7.1.2, p. 457). Growing a file checks that unused space is zero; otherwise it returns a special error and unverified glue invokes zeroing and retries. Writes past the end receive the same support. This is validation: freeing may write arbitrary data to free space; the zero-check has the strong specification needed before that space becomes visible. The authors do not prove that zeroing eventually succeeds (Section 7.1.2, pp. 457–458).

Verus form: Inference: encode bounded transaction footprints and lock-order preconditions in Rust contracts. Prove `ZeroFreeSpace` preserves the abstract file-system state as a logical no-op, and keep retry/zeroing glue within a verified API boundary. Any unverified bridge must be treated as trusted code and tested separately.

## evidence and numbers
Figure 12 reports 10,000 proof lines, 250 code lines, and 932 specification lines for the transaction-system extension, separately from GoJournal's 29,000 proof and 1,419 code lines. The file system has 6,787 proof lines, 4,051 code lines, and a 630-line specification. The paper summarizes proof overhead as about 2× for the file system versus 20× for the transaction system; the latter is not the ratio of the extension's 10,000 and 250 lines alone (Sections 1 and 8, pp. 448, 458). The NFS daemon adds 1,144 unverified Go lines; trusted Dafny interfaces add 558 lines. Proof compilation takes 12 minutes on the reported slow CI machine and 4 minutes on an eight-core laptop (Section 8 and Figure 12, p. 458).

Performance uses Linux 5.15 and Go 1.18.1 on an EC2 i3.metal with 72 cores, 512 GB RAM, and a local 1.9 TB NVMe SSD; experiments use one 36-core socket, disable turbo boost and processor sleep states, and report coefficients of variation under 5% (Section 9.1, p. 459). Relative to Linux NFS exporting ext4 in `data=journal`, DaisyNFS reaches about 60% on smallfile and comparable throughput on largefile; it also performs well on the application workload, cloning and building xv6. The 0.422 app/s label in Figure 13 is the Linux baseline, not a DaisyNFS measurement. Linux's `data=ordered` log-bypass mode is 60% faster on largefile but offers weaker crash guarantees (Section 9.1 and Figure 13, p. 459). DaisyNFS's peak multi-client smallfile throughput is 60% of Linux's; scaling is limited by a GoJournal lock serializing installation of writes into disk blocks (Section 9.2 and Figure 14, p. 459). These are workload-specific results.

Testing with CrashMonkey found no bugs after all supported two-operation tests. Protocol-level testing found bugs in unverified code and the specification: a string decoder could allocate 2^32 bytes, parsers could panic, concurrent writes could conflict, and RENAME incorrectly allowed incompatible overwrites. Figure 15 also lists allowing `.` and `..` and circular directories under “Not in RFC 1813”; it does not say that the RFC prohibits those behaviors. An inode subset type silently imposed a bound that unverified callers could violate; the fix used `uint64` and checked the bound in verified code (Section 9.3 and Figure 15, p. 460). The authors explicitly trust safe transaction use, the Dafny encoding of refinement, primitive libraries, unverified Go glue, initialization/recovery discipline, and disk persistence without corruption (Section 9.3, pp. 459–460).

## techniques for the catalog
- simulation refinement — relate concrete network traces to an abstract NFS state machine through a preserved abstraction relation
- simulation transfer — turn sequential proofs of safe transaction bodies into concurrent crash-safe refinement
- local two-phase-locking proof — track each transaction's footprint and linearization point without a global conflict graph
- transaction-safe system design — constrain shared state to a transaction API and fit each operation within bounded commit size
- validated asynchronous cleanup — split visible deletion from zeroing/reclamation proved to be a logical no-op
- Inference: refinement boundary audit — use the trusted-code discussion to enumerate encodings, interfaces, libraries, recovery assumptions, and disk behavior
