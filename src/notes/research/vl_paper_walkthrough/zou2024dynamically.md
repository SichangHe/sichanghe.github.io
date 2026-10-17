# Using Dynamically Layered Definite Releases for Verifying the RefFS File System
(authored by agents unless marked 🧑)
Tag: `zou2024dynamically`, [paper](https://www.usenix.org/conference/osdi24/presentation/zou)

## scope and result
The paper presents RefFS, a concurrent in-memory file system, and MoLi, a Coq-mechanized framework for proving both safety and termination. Its liveness target is termination under fair scheduling. The central object is an acyclic waits-for graph: vertices are actions that blocked threads await, and edges are waits-for dependencies. The paper states, “This paper presents RefFS, a concurrent file system with a mechanized proof of both safety and liveness properties.” (section 1, p. 629). It reports a protocol-level proof of the Linux VFS directory locking scheme (no code proofs) whose specification attempt exposed a deadlock flaw, confirmed and fixed (sections 1 and 4.4, pp. 630, 635), and a 33.7K-line Coq RefFS proof (Table 1, p. 641).

Inference: for agent-written verified Rust, the useful lesson is to make progress obligations explicit alongside memory-safety and functional invariants. A Verus development would need a ghost model of lock ownership, dependencies, and a well-founded progress measure; Verus does not directly provide MoLi's Coq termination logic.

## technique: definite releases and metric-decreasing busy waits

What it is. A definite release D specifies an eventual state transition from ownership to release. The paper gives the exact example: “definite release of a ticket lock can be formalized as (owner = t.i) ; (owner = t.i + 1)” (section 4.1, p. 632). A thread that spins on a lock relies on the holder's definite release, and the holder guarantees release. The paper notes that this protocol alone does not avoid circular reasoning; LiLi's fix is to require that the releasing thread not wait for any definite release, which breaks for nested locking, and section 4.2 relaxes it with layers (a release may wait only for a higher-numbered one).

When to use it. Use it for lock primitives and ad-hoc busy-wait loops where termination depends on another thread eventually changing state. The paper's simplified path lookup acquires `cur`, performs lookup, and releases it; its footnote says this simplification omits reference counting and is repaired in section 6.

How to apply it.
1. Define each awaited action as a state transition that must eventually occur (section 4.1).
2. State a rely condition that another thread fulfills that action and a guarantee that the current thread, once it has acquired the lock, fulfills its own release (section 4.1).
3. For a blocking lock, choose a well-founded metric: the paper uses 0 when the lock is available and 1 otherwise for RefFS locks (section 6.2, p. 640); for the ticket lock of Figure 2b it suggests t.i - cur.owner (section 5.3, p. 637).
4. Prove the four conditions of the WHILE rule for a blocked loop: blocked condition (a holder enables the awaited action), dependency condition (the layer of the waiter's own enabled actions stays below the awaited one), metric decrease when the awaited action is fulfilled, and metric non-increase (sections 5.3 and 6.2, pp. 637, 640). For a loop that is not blocked, tokens must decrease on each iteration instead (section 5.3).

Verus form. Inference: represent ownership and a lock's queue in ghost state, expose a `tracked` invariant over the lock state, and prove each loop with a `decreases` measure. Use `requires`/`ensures` on proof-relevant functions and `invariant` clauses on loops; the concrete lock operation remains ordinary Rust. The paper's temporal `;` relation and fair-scheduler assumption need an explicit ghost transition model rather than a direct Verus primitive.

Evidence and limits. MoLi's soundness is proved on paper; the mechanized framework itself is in Coq, while “a mechanized Coq proof is left as future work” for MoLi's soundness (section 1, p. 630). The evaluation runs xfstests, which reports no bugs (section 7.3, p. 642). The termination proof assumes a fair scheduler and a sequentially consistent hardware model; the abstraction of RefFS, VFS, FUSE, the C compiler, and the glibc C implementation of a lock and memory allocator are trusted (section 7.3, p. 642). RefFS does not consider crashes; MoLi does not cover termination of crash recovery, interrupts, or exceptions.

## technique: hierarchical layering for nested locks

What it is. Nested locking makes release of a first lock depend on release of a second. The paper's unlink example locks `parent`, looks up `child`, locks `child`, then unlocks `parent` (Figure 3, p. 633). It assigns each inode a layer equal to its path distance from root, and permits a definite release to wait only for a higher-numbered one. “Layering decouples the dependency between definite releases and enables modular reasoning for Fig. 3.” (section 4.2, p. 634).

How to apply it.
1. Define the hierarchy function as path distance from the root, and prove the file-system well-formedness invariant that each inode has one parent (section 4.2).
2. Require every release dependency to point from a lower to a higher layer (section 4.2).
3. Prove each lock independently: a thread blocked in `lock(parent)` relies only on the definite release of `parent`; the extra obligation is that the layer of each lock it already owns is lower than the layer of the lock requested (sections 4.2 and 7.2).
4. Reuse that local proof at every lock statement (section 7.2, p. 641).

Verus form. Inference: encode `layer(inum, fs)` as a `spec fn`; maintain parent uniqueness as a `invariant` on the ghost file-tree map; prove an ordering lemma that a held ancestor has a smaller layer. Verus can carry the acyclicity argument as an integer decrease/order proof, but does not carry Coq's MoLi rules automatically.

Evidence. The paper measures proof size: the non-layered approach (LiLi's) needs 3K LOC for a lock statement in RefFS while the layered approach requires less than 0.4K LOC (section 7.2, p. 641). This is a proof-effort comparison, not a runtime speed claim.

## technique: dynamic layering with ghost dependency state

What it is. Rename can acquire two directories in an order that changes with ancestry. The paper introduces a temporary ghost dependency `TDep = None` or `(inum1, inum2)`, set only while `rename_mutex` is held. Dynamic layer is the longest waits-for path; the second inode in `TDep` gets one more than the maximum of its parent layer and the first inode's hierarchical layer (section 4.3, p. 634). The paper says, “We introduce a temporary dependency TDep, a globally unique value that tracks the lock dependency introduced by lock_rename.” (section 4.3, p. 634).

How to apply it.
1. Serialize the operation that changes the dynamic order with a global mutex (Figure 5, section 4.3).
2. After acquiring the first lock, set `TDep` to the upcoming pair; clear it after acquiring the second. When the second directory is an ancestor, no `TDep` is needed because the dependency already follows the parent-child chain (Figure 5 and section 4.3, pp. 634-635).
3. Define the dynamic layer from the hierarchy plus `TDep` and prove the dependency condition: while a thread waits, the layer relation of an ongoing dependency stays unchanged despite state changes (sections 4.3 and 5.3).
4. Use that only the holder of `rename_mutex` can set `TDep`, and that `TDep` is `None` when nobody holds it; the paper argues that the new edge does not point from a child to its ancestor and that removing it creates no cycle (section 4.3, ppp. 634-635).

Verus form. Inference: put `TDep` in a `Ghost`/tracked state protected by a lock invariant; use a `spec fn` for the longest-path bound and lemmas showing each edge raises the layer. Rust code must update the ghost value at the same program points as Figure 5; the ghost updates do not execute.

Evidence and limits. The VFS proof follows Linux's directory-locking documentation; the flaw was in commit 28ecee, where inode pointer order is not transitive with parent-child order (Figure 6), and the paper says it found the flaw when it failed to define the dynamic layering (sections 1 and 4.4, pp. 630, 635). Dynamic layering handles dynamic-order deadlocks, and definite actions in general cover ad-hoc synchronization (section 7.4, p. 642), but MoLi does not prove termination of crash recovery and does not support interrupts or exceptions (section 7.3, p. 642). RefFS is in-memory and uses simplified exclusive reads.

## technique: non-atomic abstract operations and refinement

MoLi models non-atomic implementations with atomic abstract operations. RefFS's `MKDIR` groups path traversal into an abstract operation; `lookup` and `do_mkdir` are atomic transitions in the abstract model (section 6.1, p. 640; the paper groups the loop body of lines 3-6 into an atomic block). Ghost `TDep` is updated around the concrete locks of `rename` (Figure 10, section 6.2, p. 640). Inference: this separation lets a Verus proof expose a compact abstract state while proving concrete lock and reference-count code refines it; the abstraction itself remains trusted, exactly as the paper reports.

## techniques for the catalog
- definite releases: specify eventual ownership-to-release transitions and prove a 0/1 waiting metric decreases
- hierarchical layering: assign path-depth layers so nested lock dependencies only wait upward
- dynamic layering: track temporary lock-order edges in ghost state and prove the waits-for graph stays acyclic
- abstract-operation refinement: verify concrete non-atomic code against atomic abstract file-system transitions
