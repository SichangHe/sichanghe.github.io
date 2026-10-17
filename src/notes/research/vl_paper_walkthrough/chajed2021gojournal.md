# GoJournal: a verified, concurrent, crash-safe journaling system
(authored by agents unless marked 🧑)
Tag: `chajed2021gojournal`, [paper](https://www.usenix.org/conference/osdi21/presentation/chajed)

## contribution and boundaries
GoJournal is a concurrent journaling package implemented in Go and verified in Coq using Perennial 2.0 and Iris, with Goose translating Go into the verification model. The paper's aim is to let a storage application reason mostly sequentially even though the journal is concurrent and may crash. It states: “The journal guarantees the operation is atomic by delaying all writes to commit time, so the developer should not need to explicitly reason about crash safety until commit time.” (Section 1, p. 423). The verified artifact is the Go package; GoNFS is functional but unverified, while SimpleNFS is a verified core client (Sections 1 and 7, pp. 424, 434).

The API starts an operation, reads and writes buffered objects, commits, flushes, and acquires/releases lockmap locks (Figure 1, p. 425). GoJournal does not automatically provide concurrency control: objects used by an operation cannot be accessed concurrently by another thread, and clients can use the verified lock library (Section 1, p. 424). Its top-level specification requires immediate flushing after commit, although internal layers support deferred durability (Section 1, p. 424).

## technique: lifting durable ownership into a private operation view
What it is: the specification maintains a durable on-disk view and a private in-memory view for each journal operation. A logical `lifting` step transfers ownership of durable objects into the operation's private view. While owned, the caller can use sequential reasoning because concurrent operations cannot modify those objects (Section 5.2, p. 429). The paper says, “The key idea of GoJournal’s specification is to consider two view of the disk: a conceptual in-memory view that a buffered journal operation observes, as well as an on-disk view that reflects what would be on disk after a crash.” (Section 5.2, p. 429).

How to apply it:
1. Establish a representation invariant for each durable object; the paper's `file_rep(i, data)` relates inode metadata, a data block, file length, and bytes (Section 5.1, p. 428).
2. Call `Begin`; its postcondition supplies a valid operation object and an empty durable footprint (Section 5.2, p. 429).
3. Lift each owned durable predicate into an operation predicate, retaining a snapshot of the durable state for abort/crash reasoning (Section 5.2, p. 429).
4. Perform reads and writes against the operation view, then commit the resulting private representation (Sections 5.3 and 5.6, pp. 429–431).

The paper gives the lifting rule as a logical no-op: `{Pd ∗ durable_pred(op, Qd)} noop {Pop ∗ durable_pred(op, Pd ∗ Qd)}` (Section 5.2, p. 429). Ghost state, not physical memory or disk, records the ownership and views (Section 5.2, p. 429).

Verus form: Inference: a possible adaptation would model durable and private representations as ghost state, track exclusive ownership of disjoint objects, and prove that lifting preserves the durable snapshot. It would also need contracts connecting Rust buffers to disk objects. The paper does not establish this encoding in Verus.

## technique: crash-aware locking and crash framing
A normal lock invariant is insufficient because a crash can expose durable data while the lock is held. Perennial 2.0 adds a crash obligation `Ic(i)` to each lock: acquiring the lock gives the ordinary invariant `I(i)`, while the caller must preserve `Ic(i)` at every intermediate point (Section 5.4, p. 430). The paper distinguishes current generation `dk` from post-crash generation `dk+1`; ephemeral resources do not survive, so recovery must reconstruct state from durable data (Section 5.4, p. 430).

How to apply it:
1. Define `I(i)` for the running generation and `Ic(i)` for the state that must hold after a crash (Section 5.4, p. 430).
2. Prove the crash-aware lock specification for the lock implementation and lockmap stripes (Section 5.4, p. 430).
3. Acquire a lock, obtaining `I(i)` and taking on the obligation to prove `Ic(i)` on a crash at every step of the critical section (Section 5.4, p. 430).
4. For code that changes only private in-memory state, apply crash framing to temporarily remove `Ic(i)` from the local proof obligation (Section 5.5, p. 430).
5. Recover access to `durable_pred` after the private computation, use it to prove the commit crash condition, and restore the ordinary lock invariant before release (Sections 5.5–5.6, pp. 430–431).

In linear notation, the paper’s crash-framing rule is `{P} f() {Q}` implying `{Ic ∗ P} f() {Ic ∗ Q}{Ic}` (Section 5.5, p. 430). The authors explain: “In exchange, the crash condition is removed from our proof obligation: it is sufficient to prove a regular crash-free Hoare triple for f().” (Section 5.5, p. 430).

Verus form: Inference: an adaptation would need a crash predicate over a durable model and a proof that every possible crash during the critical section satisfies it. A framing lemma would need to justify proving private updates separately while retaining the durable crash obligation. This is a proposed proof structure, not a Verus result demonstrated by the paper.

## technique: atomic commit specification
Commit takes the private post-state, the operation ownership, and a durable snapshot. For `Commit(true)`, success yields the new durable representation; failure because the operation is too large to fit on disk yields the old one; on a crash either old or new may survive, but no inconsistent combination (Section 5.6, p. 431). The paper's rule is `{Qop ∗ is_op(op) ∗ durable_pred(op, Pd)} op.Commit(true) {ret ok, if ok then Qd else Pd} {Pd ∨ Qd}` (Section 5.6, p. 431).

How to apply it:
1. Prove that private reads/writes transform `file_rep_op(i,data)` to the intended `file_rep_op(i,data′)` (Section 5.7, p. 431).
2. Supply that private representation and the old durable snapshot to `Commit` (Section 5.6, p. 431).
3. Split the postcondition on return value: success gives `Qd`, failure restores `Pd` (Section 5.6, p. 431).
4. For a crash, prove the crash obligation from `Pd ∨ Qd`. On normal return, reestablish the ordinary lock invariant from either return branch before releasing the lock (Sections 5.6–5.7, p. 431).

Verus form: Inference: an adaptation would specify the normal-return and crash outcomes separately, then prove a concrete Rust WAL implementation meets those contracts under explicit disk assumptions. A model of physical write atomicity would still need justification.

## technique: layered write-ahead log with abstract state
The WAL layer atomically applies multiwrites. The logger writes a multiwrite into a log entry and then updates a header marking the entry complete. A crash before the header applies none of the updates; after it, recovery reapplies them. An installer copies entries to the disk. Group commit combines multiwrites, and absorption replaces an earlier update to the same block (Section 6.1, p. 431).

To make concurrent logging tractable, the proof uses a logical list of multiwrites with positions `memStart`, `diskEnd`, `nextDiskEnd`, and `memEnd` (Figure 6, p. 432). The external interface exports a simpler list plus `durable_lb`, a lower bound on the multiwrites guaranteed to survive a crash (Figure 7, p. 432). Monotonic counters provide lower-bound reasoning for lock-free logger and installer regions (Section 6.1, p. 432).

How to apply it:
1. Define a logical state that abstracts physical log and disk positions (Section 6.1, p. 432).
2. Track the positions advanced by the installer, logger, `Flush`, and `Commit`; prove that lower bounds used for space and trimming checks remain valid after releasing locks (Section 6.1, p. 432).
3. Expose the multiwrite list and durable lower bound to upper layers, hiding internal installation and logging positions (Section 6.1, p. 432).
4. Model a crash as discarding an arbitrary suffix starting at or beyond `diskEnd`, preserving the guaranteed durable prefix (Section 6.1, p. 432).

Verus form: Inference: a possible adaptation would represent the logical log, counters, and durable lower bound as ghost state, specify logger, installer, and recovery transitions, and prove that physical buffers implement the abstract list. The durability meaning of each disk operation would need an explicit model.

## technique: logically atomic crash specifications across layers
Perennial specifies internal methods as transition-system operations with an atomic commit point and crash behavior. A lower layer accepts a logical callback `{P} noop {Q}` that an upper-layer proof selects and “executes” at the lower layer's commit point (Section 6.2, pp. 432–433). The callback lets the CIRCULAR proof avoid knowing WAL's logical log and lets the WAL proof avoid reproving why CIRCULAR's append is atomic.

How to apply it:
1. Define each layer's abstract transition and crash transition (Section 6.2, p. 432).
2. Give lower-layer methods a callback describing the abstract state change to be made at their commit point (Section 6.2, p. 433).
3. Prove the implementation realizes the callback atomically, including its crash behavior (Section 6.2, p. 433).
4. Compose the layer specifications, preserving the public transition and crash contracts (Sections 6.2 and 8.4, pp. 433, 436).

Verus form: Inference: a possible adaptation would use a ghost callback contract and a proof connecting the concrete commit point to an abstract transition, including crash outcomes. The paper’s callback is logical, not executable code; a corresponding Verus proof rule would need separate justification.

## technique: concurrent reads within a disk block
OBJ permits operations on distinct sub-block objects to run concurrently even when they share a block. Commit serializes full-block read-modify-write operations with a commit lock; reads can run concurrently with commits. The invariant requires all recent writes to the containing block since `Read(a)` started to agree on the part storing the owned object. Thus any observed block version yields the same object value (Section 6.3, p. 433). The paper states: “As a result, regardless of what block happened to be read, the caller is guaranteed to see the correct object o.”

Verus form: Inference: an adaptation would model block versions and prove that each read’s extracted object remains unchanged across the versions it might observe. This would require a concurrency model connecting reads to those versions.

## evidence, trusted base, and limits
The authors report: “All of the proofs for Perennial, GoJournal, and SimpleNFS are checked by Coq, and we used Print Assumptions to verify that the proofs are complete.” (Section 7, p. 434). The code/proof denominator is explicit: GoJournal has 1,345 lines of Go and 25,797 lines of Coq proof, a 19× ratio; SimpleNFS has 462 lines of Go and 3,749 lines of proof, an 8× ratio (Figure 12, p. 434). Only 44 of SimpleNFS's 462 lines require explicit crash reasoning (Sections 1 and 8.3, pp. 424, 435–436). The Perennial framework itself has 20,260 lines of Coq specifications and proof (Figure 11, p. 434).

GoNFS reaches at least 90% of Linux ext4 NFS throughput on the reported NVMe and RAM-disk workloads, but under 20% on the slower SSD largefile workload without unstable writes; enabling unstable writes raises it to 90% of ext4 (Sections 1 and 8.1, pp. 423–424, 434–435). The comparison uses the Linux NFS server exporting ext4 with `data=journal`; the main GoNFS evaluation disables unstable writes (Section 8.1, p. 434). Inference: these percentages apply to those workloads and storage settings. The concurrency experiment uses increasing client counts and compares GoNFS with a serial variant (Section 8.2, p. 435).

The proof found a serious absorption race that unit tests missed; the fix introduced `nextDiskEnd` so logging and absorption cannot race over the same region (Section 8.6, p. 436). The paper explicitly assumes: “We assume that the disk writes 4KB blocks atomically, even on crash, and assume that the code executes according to the Perennial model generated by Goose.” (Section 4, p. 428). It also trusts GoNFS’s unverified concurrency control; SimpleNFS’s locking is checked (Section 4, p. 428). Inference: the result depends on these models and specifications matching the deployed system; the paper does not provide an exhaustive trusted-component inventory here.

## what VL should retain and threat assessment
GoJournal already demonstrates layered concurrent crash-safe verification, ownership lifting, crash-aware locks, crash framing, atomic callbacks, and a WAL abstraction. Inference: VL should not claim those techniques themselves as new. Inference: a Verus implementation can borrow the decomposition: durable model, private operation model, lock/resource contracts, explicit crash transition, and a narrow commit boundary. Inference: the absorption bug shows why testing alone can miss a concurrency error; this paper does not measure agent-written Rust or establish a product threat level.

## techniques for the catalog
- lifting — transfer durable ownership into a private operation view so application proofs are sequential
- crash-aware locks — pair ordinary lock invariants with obligations that hold after a crash
- crash framing — temporarily hide a durable crash obligation while proving private in-memory code
- atomic commit contracts — specify success, failure, and crash as old/new durable-state alternatives
- abstract WAL state — prove concurrent logging through logical multiwrite lists and monotone positions
- logically atomic crash specifications — compose layers through callbacks executed at abstract commit points
- sub-block concurrency invariants — require recent block versions to agree on the owned object
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "This lets the installer and logger concurrently advance their pointers (memStart and diskEnd respectively) without locks."): checked all paper text including references and artifact appendix, quotations, numbers, section and printed-page references, and technique steps; corrected the publisher link, page references, crash versus normal-return reasoning, WAL and sub-block descriptions, and unsupported trust and threat claims; marked proposed Verus adaptations as inferences; did not inspect source code, rerun proofs or benchmarks, or validate the proposed Verus encodings.
