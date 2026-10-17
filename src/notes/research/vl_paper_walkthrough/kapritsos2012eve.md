# All about Eve: Execute-Verify Replication for Multi-Core Servers
(authored by agents unless marked 🧑)
Tag: `kapritsos2012eve`, [paper](https://www.usenix.org/system/files/conference/osdi12/osdi12-final-190.pdf)

link from the fetch record

## purpose and contribution

Eve is a replicated state-machine architecture for multi-core servers. Traditional state-machine replication agrees on request order and then executes; Eve executes requests concurrently and verifies the resulting state and outputs afterward. The abstract states: “replicas first execute groups of requests concurrently and then verify that they can reach agreement on a state and output produced by a correct replica; if they can not, they roll back and execute the requests sequentially.” (abstract, p. 237)

The design deliberately allows nondeterministic interleavings and independent execution at replicas. Safety depends on agreement on a resulting state/output, not on an identical instruction schedule. The paper reports a TPC-W speedup of 6.5× over sequential execution and 4.7× over Remus primary-backup, while approaching the 7.5× speedup of an unreplicated server (section 1, p. 238). These are measurements for the authors' prototype and workload, not universal bounds.

## technique: execute then verify with rollback

What it is. The execution stage accepts a batch, partitions it into parallel groups, executes those groups independently at each replica, and computes a token containing a state/output hash. The verification stage runs an agreement protocol over tokens. Matching enough tokens commits; otherwise replicas roll back and re-execute sequentially. The paper summarizes the invariant: “at the end of the verification stage, all correct replicas that have executed the ith batch of requests are guaranteed to have reached the same final state and produced the same outputs.” (section 4.2, p. 240)

How to apply it.

1. Have a primary group client requests into a numbered batch and send the batch, plus values needed to make nondeterministic calls consistent (section 4.1, pp. 239–240).
2. Run the deterministic mixer at every execution replica to produce the same ordered parallel batches (section 4.1, pp. 239–240).
3. Execute each parallel batch concurrently in that order (section 4.1, pp. 239–240).
4. Compute a token containing the batch sequence number, the hash of its resulting application state and outputs, and the previous batch hash; send it to verifiers (section 4.1, p. 240).
5. Run the configured agreement protocol over tokens. If enough match, commit that state/output and repair diverging replicas by state transfer. If agreement fails, roll back; execute sequentially to ensure progress (sections 4.2 and 6.1, pp. 240, 243).

Inference: A Verus implementation would model the committed state as a ghost/specification value and make each executable transition carry an `ensures` clause relating its post-state to that value. A proof lemma can show that a matching token implies equal abstract states, while a rollback branch restores the last committed state. Verus `proof fn`s and `spec fn`s can establish these facts, but a cryptographic hash collision assumption and the hash implementation remain trusted unless modeled and proved. The proposed proof would also need to encode and verify the quorum protocol.

Evidence and limits. Eve's safety does not depend on a perfect mixer when the unreplicated parallel program is correct. The paper says: “Note that if the underlying program is correct under unreplicated parallel execution, then delaying agreement until after execution and, when necessary, falling back to sequential re-execution guarantees that replication remains safe and live even if the mixer allows interfering requests in the same group.” (section 1, p. 237) False negatives reduce performance by causing divergence and rollback; false positives reduce parallelism by serializing requests. Inference: safety still depends on the verifier's quorum assumptions, correct token chaining, and a correct sequential fallback. Correlated faults can defeat the correctness guarantee, as the paper notes for more than `u` identical concurrency faults (section 6.3, p. 244).

## technique: conflict-aware deterministic mixing

What it is. The mixer is a deterministic partitioning function that places requests likely to conflict into different parallel batches. A conflict is shared object access in read/write or write/write mode. The paper's experiment uses table names as read and write keys for each transaction (section 5.1, p. 241).

How to apply it.

1. Define application-level keys that predict objects each request reads and writes (section 5.1, p. 241).
2. Start a parallel batch with empty read and write hash tables (section 5.1, p. 241).
3. Scan requests in order; map each request's accessed objects to read or write keys (section 5.1, p. 241).
4. Check read/write and write/write conflicts against keys already in the candidate group (section 5.1, p. 241).
5. Add a nonconflicting request and its keys; on conflict, try another existing group or create a new one (section 5.1, p. 241).
6. Run the same mixer at every replica so grouping and order are deterministic (section 4.1, pp. 239–240).

The paper permits imperfect classification because verification catches divergent outcomes. It says: “because the mixer can safely misclassify requests, we need not explicitly capture additional conflicts potentially generated through database triggers or view accesses that may be invisible to us.” (section 5.1, p. 241)

Inference: In Verus, represent each request's read and write footprint as a mathematical set and prove that the mixer preserves a disjointness predicate for requests placed in one group. The executable mixer can use Rust maps or arrays, with a `spec fn` describing set membership and proof lemmas connecting the implementation to that specification. The disjointness proof is an optimization guarantee, not the main safety theorem, because the execute-verify fallback handles misclassification.

Evidence and limits. The TPC-W mixer took 10 student-hours to build and observed no rollbacks in the reported workload (section 5.1, p. 241). This denominator is one TPC-W mixer implementation and workload; it does not establish a general construction cost. A mixer that omits a conflict can cause rollback and lower throughput but should not violate safety under Eve's assumptions.

## technique: Merkle-tree state certificates and incremental repair

What it is. Eve stores only semantically relevant application state in a copy-on-write Merkle tree. The root represents the state and allows replicas to compare compact tokens, transfer only changed portions, and roll back at fine granularity. The paper states: “To achieve efficient state comparison and fine-grained checkpointing and rollback, Eve stores the state using a copy-on-write Merkle tree, whose root is a concise representation of the entire state.” (section 5.2, p. 241)

How to apply it.

1. Annotate application objects that belong to the replicated state and mark them dirty when modified (section 5.2, p. 241).
2. Exclude semantically irrelevant state, such as network handles, and wrap structures whose representation can vary while meaning remains equal (section 5.2, p. 241).
3. At batch end, scan existing modified objects in deterministic tree order and scan their references deterministically. Put an unseen referenced object in the next empty slot; repeat for newly added objects (section 5.2.1, p. 242).
4. Hash subtrees in parallel and combine their hashes into the root (section 5.2.1, p. 242).
5. Include the current and previous batch hashes in the token; reject a token whose previous hash does not match the committed predecessor (sections 4.1 and 6.1, pp. 240, 243).
6. If the agreed token differs from the local token without a view change, transfer state changed since the last stable sequence. On a view change, roll back to the sequence indicated by the agreed token, check the restored state, and request state transfer if it differs (section 6.1, p. 243).

Eve postpones adding newly created objects until batch end, then scans deterministic references; this makes tree placement independent of allocation order (section 5.2.1, pp. 241–242). For set-like Java structures, wrappers emit deterministic sorted lists, using a comparator or `(requestId, count)` ordering when no comparator exists (section 5.2.2, p. 242).

Inference: In Verus, define a ghost tree model and prove that each executable update changes exactly the modeled reachable objects. Use `ensures` to relate the returned root to the model and lemmas to show hash-chain continuity. A cryptographic collision-resistance premise is still an assumption unless the proof uses an injective mathematical abstraction instead of the concrete hash. Rust ownership can help ensure unique mutation, but the paper's Java object graph and garbage collection details require a different model.

Evidence and limits. Incremental transfer repairs only state changed since the last stable sequence (section 6.1, pp. 242–243). The prototype manually annotates state inclusion and dirty updates (section 5.2, p. 241). Inference: omitted annotations can invalidate the intended equivalence. The paper also reports a mark-and-sweep scan to let Java garbage collection reclaim tree objects (section 5.2.2, p. 242); this is an implementation concern, not a proof of application correctness.

## technique: quorum agreement and chained tokens

What it is. Verification replicas agree on a token representing an execution replica's state/output pair. For asynchronous Byzantine tolerance, Eve uses `nE = u + max(u,r) + 1` execution replicas and `nV = 2u + r + 1` verification replicas, giving liveness despite `u` omission or commission failures and safety despite `r` commission failures plus arbitrary omission failures (section 6.1, pp. 242–243).

How to apply it.

1. An execution replica sends `VERIFY(υ,n,T,e)`, where `T` contains hashes for the resulting state/outputs of batch `n` and its predecessor (section 6.1, p. 243).
2. A verifier accepts the message only if the predecessor hash matches its committed predecessor. After `max(u,r)+1` matching VERIFY messages, it marks the sequence preprepared and sends PREPARE (section 6.1, p. 243).
3. After `nV−u` matching PREPARE messages, it marks the sequence prepared and sends COMMIT. After `nV−u` matching COMMIT messages, it marks the sequence committed and sends VERIFY-RESPONSE (section 6.1, p. 243).
4. An execution replica waits for `r+1` matching VERIFY-RESPONSE messages. Without a view change, it commits and releases outputs if its token matches, or performs incremental state transfer if it differs (section 6.1, p. 243).
5. If agreement fails, verifiers change view and select the highest sequence prepared by at least `nV−u` verifiers. Execution replicas roll back to that sequence, check the restored state against the token, rotate the primary, and execute the new primary’s first batch sequentially (section 6.1, p. 243).

Inference: A Verus proof would encode quorum counts and authenticated messages as state-machine data, then prove that any committed certificate contains at least one correct execution token under the stated fault bound. Verus can prove arithmetic quorum lemmas and token-chain invariants, but cryptographic MAC unforgeability and network delivery assumptions remain axioms or external proofs.

The paper gives a concrete concurrency/omission theorem: “When configured with nexec = 2u + 1 and r = 0, asynchronous Eve is safe, live, and correct despite up to u concurrency or omission faults.” (Theorem 1, section 6.3, p. 244) The proof sketch relies on `u+1` matching tokens for safety and sequential re-execution for liveness. If more than `u` correlated concurrency faults produce the same wrong state/output, safety and liveness remain but correctness is no longer guaranteed (section 6.3, p. 244).

## technique: extra protection mode for concurrency bugs

What it is. With `r=0`, Eve enters extra protection mode after `k` consecutive batches with all execution replicas matching and timely. After receiving the minimum responses needed for progress, verifiers wait up to a short timeout for every replica. All matching responses commit; otherwise, including on timeout, Eve rolls back and re-executes sequentially. If re-execution yields all matching, timely responses, Eve commits and remains in the mode; otherwise it exits to preserve liveness. During good intervals, with no faults or timeouts other than concurrency bugs, this provides best-effort protection against concurrency bugs affecting up to `nE−1` execution replicas (section 6.3, p. 244).

Inference: This adaptive policy can be modeled in Verus as a ghost counter and a transition invariant: after `k` clean rounds, require a stronger all-replica agreement predicate, and reset it after a failed round. The policy improves best-effort fault masking but does not increase the formal fault bound; the paper calls it protection during good intervals.

The prototype supports only in-memory state, omits asynchronous extra protection mode, and does not handle finalizers that modify replicated state (section 7, p. 245). Section 6.2 describes synchronous primary-backup, whose safety and liveness depend on timing assumptions. Asynchronous Eve preserves safety despite arbitrary network delays, reordering, or loss; liveness requires synchronous intervals with bounded message delivery and processing delays (section 3, p. 239). Read-only requests can bypass verification when enough client replies match; otherwise they are retried as regular requests (section 6, p. 242).

## evaluation and trusted boundary

The evaluation uses a key-value store microbenchmark and H2 with the TPC-W browsing workload (section 7, pp. 244–245). It varies request execution time, object size, and mixer false-positive/false-negative rates. For H2 on Xen in a two-node primary-backup configuration, Remus peaks at 235 requests/s while Eve peaks at 1,225 requests/s (section 7.5 and figure 10, p. 248). Inference: those peak values give a ratio of about 5.2, whereas sections 1 and 7.5 report 4.7×; the paper does not reconcile these numbers. The introduction reports 73 manifestations of an H2 concurrency bug in 750,000 requests on an unreplicated server (section 1, p. 238). The detailed two-replica experiment uses 16 execution threads: with all requests in each batch allowed to run in parallel, 73 bug manifestations occurred, 60 were fixed by rollback, and 13 affected both replicas identically and escaped detection. The original mixer prevented every manifestation in that experiment (section 7.4 and figure 9, pp. 247–248). The reported 82% masking rate refers to 60 of 73 manifestations under the mixer that groups all requests, not to all requests.

What is argued or measured. The paper describes agreement protocols under explicit fault models and gives a proof sketch for Theorem 1 on concurrency/omission faults (section 6.3, p. 244). It refers the full view-change discussion to its extended technical report (section 6.1, p. 243). It measures throughput, latency, bandwidth, rollback behavior, and bug masking using a key-value store and H2 (section 7, pp. 244–248). Inference: what remains trusted includes the application's sequential correctness, state annotations, hash/MAC assumptions, agreement implementation, hardware/runtime behavior, and the correspondence between a Merkle root and semantic state.

Inference: For a product that emits agent-written Verus Rust, Eve suggests verifying the state abstraction, token construction, and sequential fallback contract. The paper does not evaluate Verus or establish the reliability of such a product.

## techniques for the catalog

- execute-verify replication: execute batches concurrently, agree on state/output tokens, and roll back to sequential execution when agreement fails
- deterministic conflict mixer: partition requests by read/write footprints into parallel groups using deterministic key tables
- Merkle state certificate: hash semantically relevant state with a copy-on-write tree for comparison, rollback, and incremental transfer
- chained quorum tokens: require matching authenticated tokens whose previous-batch hash is committed before accepting a new state
- sequential fallback: use deterministic re-execution for progress under the stated fault assumptions after a failed optimistic round
- extra protection mode: after clean rounds, wait for all replica responses to mask additional concurrency faults during good intervals
