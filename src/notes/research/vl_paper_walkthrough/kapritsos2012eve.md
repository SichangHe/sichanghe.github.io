# All about Eve: Execute-Verify Replication for Multi-Core Servers
(authored by agents unless marked 🧑)
Tag: `kapritsos2012eve`, [paper](https://www.usenix.org/system/files/conference/osdi12/osdi12-final-190.pdf)

## purpose and contribution

Eve is a replicated state-machine architecture for multi-core servers. Traditional state-machine replication agrees on request order and then executes; Eve executes requests concurrently and verifies the resulting state and outputs afterward. The abstract states: “replicas first execute groups of requests concurrently and then verify that they can reach agreement on a state and output produced by a correct replica; if they can not, they roll back and execute the requests sequentially.” (abstract, p. 237)

The design deliberately allows nondeterministic interleavings and independent execution at replicas. Safety is recovered by requiring agreement on a resulting state/output, not on an identical instruction schedule. The paper reports a TPC-W speedup of 6.5× over sequential execution and 4.7× over Remus primary-backup, while approaching the 7.5× speedup of an unreplicated server (section 1, p. 238). These are measurements for the authors' prototype and workload, not universal bounds.

Inference: For VeruLaw, Eve is a useful pattern for verified concurrent services: run an optimistic fast path, compute a compact certificate of the resulting abstract state, and fall back to a deterministic path when certificates do not agree. The paper's replication protocol is not itself a Rust or Verus proof; translating it requires proving that the certificate commits exactly the state relevant to the service contract.

## technique: execute then verify with rollback

What it is. The execution stage accepts a batch, partitions it into parallel groups, executes those groups independently at each replica, and computes a token containing a state/output hash. The verification stage runs an agreement protocol over tokens. Matching enough tokens commits; otherwise replicas roll back and re-execute sequentially. The paper summarizes the invariant: “at the end of the verification stage, all correct replicas that have executed the ith batch of requests are guaranteed to have reached the same final state and produced the same outputs.” (section 4.2, p. 240)

How to apply it.

1. Have a primary group client requests into a numbered batch and send the batch, plus values needed to make nondeterministic calls consistent (section 4.1, pp. 239–240).
2. Run the deterministic mixer at every execution replica to produce the same ordered parallel batches (section 4.1, pp. 239–240).
3. Execute each parallel batch concurrently in that order (section 4.1, pp. 239–240).
4. Compute a token from the application state and outputs, including the previous batch hash, and send it to verifiers (section 4.1, pp. 239–240).
5. Run the configured agreement protocol over tokens. If enough match, commit and release responses; otherwise roll back to the latest committed sequence and execute sequentially (sections 4.2 and 6, pp. 240–243).

Inference: A Verus implementation would model the committed state as a ghost/specification value and make each executable transition carry an `ensures` clause relating its post-state to that value. A proof lemma can show that a matching token implies equal abstract states, while a rollback branch restores the last committed state. Verus `proof fn`s and `spec fn`s can establish these facts, but a cryptographic hash collision assumption and the hash implementation remain trusted unless modeled and proved. Verus has no built-in quorum agreement protocol; the quorum logic must be encoded as state-machine transitions and proved.

Evidence and limits. Eve's safety does not depend on a perfect mixer when the unreplicated parallel program is correct. The paper says “then delaying agreement until after execution and, when necessary, falling back to sequential re-execution guarantees that replication remains safe and live even if the mixer allows interfering requests in the same group.” (section 1, p. 238) False negatives reduce performance by causing divergence and rollback; false positives reduce parallelism by serializing requests. Inference: safety still depends on the verifier's quorum assumptions, correct token chaining, and a correct sequential fallback. Correlated faults can defeat the correctness guarantee, as the paper notes for more than `u` identical concurrency faults (section 6.3, p. 244).

## technique: conflict-aware deterministic mixing

What it is. The mixer is a deterministic partitioning function that places requests likely to conflict into different parallel batches. A conflict is shared object access in read/write or write/write mode. The paper's experiment uses table names as read and write keys for each transaction (section 5.1, p. 241).

How to apply it.

1. Define application-level keys that conservatively identify objects each request reads and writes (section 5.1, p. 241).
2. Start a parallel batch with empty read and write hash tables (section 5.1, p. 241).
3. Scan requests in order; map each request's accessed objects to read or write keys (section 5.1, p. 241).
4. Check read/write and write/write conflicts against keys already in the candidate group (section 5.1, p. 241).
5. Add a nonconflicting request and its keys; on conflict, try another existing group or create a new one (section 5.1, p. 241).
6. Run the same mixer at every replica so grouping and order are deterministic (section 4.1, pp. 239–240).

The paper permits imperfect classification because verification catches divergent outcomes. It says: “because the mixer can safely misclassify requests, we need not explicitly capture additional conflicts potentially generated through database triggers or view accesses that may be invisible to us.” (section 5.1, p. 241)

Inference: In Verus, represent each request's read and write footprint as a mathematical set and prove that the mixer preserves a disjointness predicate for requests placed in one group. The executable mixer can use Rust maps or arrays, with a `spec fn` describing set membership and proof lemmas connecting the implementation to that specification. The disjointness proof is an optimization guarantee, not the main safety theorem, because the execute-verify fallback handles misclassification.

Evidence and limits. The TPC-W mixer took 10 student-hours to build and observed no rollbacks in the reported workload (section 5.1, p. 241). This denominator is one TPC-W mixer implementation and workload; it does not establish a general construction cost. A mixer that omits a conflict can cause rollback and lower throughput but should not violate safety under Eve's assumptions.

## technique: Merkle-tree state certificates and incremental repair

What it is. Eve stores only semantically relevant application state in a copy-on-write Merkle tree. The root hashes the state and allows replicas to compare compact tokens, transfer only changed portions, and roll back at fine granularity. The paper states: “To achieve efficient state comparison and fine-grained checkpointing and rollback, Eve stores the state using a copy-on-write Merkle tree, whose root is a concise representation of the entire state.” (section 5.2, p. 241)

How to apply it.

1. Annotate application objects that belong to the replicated state and mark them dirty when modified (section 5.2, p. 241).
2. Exclude semantically irrelevant state, such as network handles, and wrap structures whose representation can vary while meaning remains equal (section 5.2, p. 241).
3. At batch end, scan modified objects and add newly reachable objects to deterministic tree slots (section 5.2.1, pp. 241–242).
4. Hash subtrees in parallel and combine their hashes into the root (section 5.2.1, pp. 241–242).
5. Include the current and previous batch hashes in the token; reject a token whose previous hash does not match the committed predecessor (sections 4.1 and 6.1, pp. 239 and 242).
6. On divergence, use the Merkle tree to transfer only changed nodes, or roll back to the latest stable root (section 6.1, pp. 242–243).

Eve postpones adding newly created objects until batch end, then scans deterministic references; this avoids nondeterministic allocation order (section 5.2.1, pp. 241–242). For set-like Java structures, wrappers emit deterministic sorted lists, using a comparator or `(requestId, count)` ordering when no comparator exists (section 5.2.2, p. 242).

Inference: In Verus, define a ghost tree model and prove that each executable update changes exactly the modeled reachable objects. Use `ensures` to relate the returned root to the model and lemmas to show hash-chain continuity. A cryptographic collision-resistance premise is still an assumption unless the proof uses an injective mathematical abstraction instead of the concrete hash. Rust ownership can help ensure unique mutation, but the paper's Java object graph and garbage collection details require a different model.

Evidence and limits. Incremental transfer repairs only state changed since the last stable sequence (section 6.1, pp. 242–243). The prototype manually annotates state inclusion and dirty updates, so omitted annotations can invalidate the intended equivalence. The paper also reports a mark-and-sweep scan to let Java garbage collection reclaim tree objects (section 5.2.2, p. 242); this is an implementation concern, not a proof of application correctness.

## technique: quorum agreement and chained tokens

What it is. Verification replicas agree on a token representing an execution replica's state/output pair. For asynchronous Byzantine tolerance, Eve uses `nE = u + max(u,r) + 1` execution replicas and `nV = 2u + r + 1` verification replicas, giving liveness despite `u` omission or commission failures and safety despite `r` commission failures plus arbitrary omission failures (section 6.1, pp. 242–243).

How to apply it.

1. An execution replica sends `VERIFY(υ,n,T,e)`, where `T` hashes batch `n` and batch `n−1` (section 6.1, pp. 242–243).
2. A verifier accepts the message only if the prior hash is already committed, then waits for `max(u,r)+1` matching tokens to mark the batch preprepared (section 6.1, pp. 242–243).
3. Verifiers exchange PREPARE and COMMIT messages; matching quorum certificates cause a VERIFY-RESPONSE (section 6.1, pp. 242–243).
4. On a committed response, mark the sequence stable and release client outputs; on mismatch, perform incremental state transfer; on view change, roll back and execute the next batch sequentially (section 6.1, pp. 242–243).

Inference: A Verus proof would encode quorum counts and authenticated messages as state-machine data, then prove that any committed certificate contains at least one correct execution token under the stated fault bound. Verus can prove arithmetic quorum lemmas and token-chain invariants, but cryptographic MAC unforgeability and network delivery assumptions remain axioms or external proofs.

The paper gives a concrete crash/omission theorem: “When configured with nexec = 2u + 1 and r = 0, asynchronous Eve is safe, live, and correct despite up to u concurrency or omission faults.” (Theorem 1, section 6.3, p. 244) The proof sketch relies on `u+1` matching tokens for safety and sequential re-execution for liveness. If more than `u` correlated concurrency faults produce the same wrong state/output, safety and liveness remain but correctness is no longer guaranteed (section 6.3, p. 244).

## technique: extra protection mode for concurrency bugs

What it is. With `r=0`, Eve enters extra protection mode after `k` consecutive batches with all execution replicas matching and timely. In that mode verifiers wait briefly for every replica; all matching responses commit, while a mismatch triggers rollback and sequential execution. If sequential re-execution again yields all matching responses, Eve remains in the mode; otherwise it exits to preserve liveness (section 6.3, p. 244).

Inference: This adaptive policy can be modeled in Verus as a ghost counter and a transition invariant: after `k` clean rounds, require a stronger all-replica agreement predicate, and reset it after a failed round. The policy improves best-effort fault masking but does not increase the formal fault bound; the paper calls it protection during good intervals.

The prototype supports only in-memory state, omits asynchronous extra protection mode, and does not handle finalizers that modify replicated state (section 7, p. 245). Section 6.2 separately describes synchronous primary-backup, whose safety and liveness depend on timing assumptions (section 3, p. 239). Read-only requests can bypass verification when enough client replies match; otherwise they are retried as regular requests (section 6, p. 242).

## evaluation and trusted boundary

The evaluation uses a key-value store microbenchmark and H2 with the TPC-W browsing workload (section 7, pp. 244–245). It varies request execution time, object size, and mixer false-positive/false-negative rates. For H2 on Xen in a two-node primary-backup configuration, Remus peaks at 235 requests/s while Eve peaks at 1,225 requests/s (figure 10, p. 248), a denominator of the measured browsing workload and configuration. The paper reports that a previously undiagnosed H2 concurrency bug manifested 73 times in 750,000 requests on an unreplicated server; Eve's mixer eliminated all manifestations, and an intentionally weakened mixer enabled detection and correction 82% of the times the bug manifested (section 1, p. 238). The 82% denominator is the bug manifestations under that altered mixer, not all requests.

What is proved or measured. The paper proves protocol-level safety/liveness theorems under explicit fault models and measures throughput, latency, bandwidth, rollback behavior, and bug masking on two applications. Inference: what remains trusted includes the application's sequential correctness, state annotations, hash/MAC assumptions, agreement implementation, hardware/runtime behavior, and the correspondence between a Merkle root and semantic state.

Inference: The threat to a product that emits agent-written Verus Rust is moderate. Eve shows that post-execution checking can make optimistic concurrency safe even when static conflict analysis is imperfect, but it also exposes a large trusted boundary around state extraction and certificates. Existing VL work should not redo generic rollback or quorum replication; a product opportunity is to generate and verify the exact state abstraction and sequential fallback contract, then measure certificate failures during dependency and workload changes.

## techniques for the catalog

- execute-verify replication: execute batches concurrently, agree on state/output tokens, and roll back to sequential execution on disagreement
- deterministic conflict mixer: partition requests by read/write footprints into parallel groups using deterministic key tables
- Merkle state certificate: hash semantically relevant state with a copy-on-write tree for comparison, rollback, and incremental transfer
- chained quorum tokens: require matching authenticated tokens whose previous-batch hash is committed before accepting a new state
- sequential fallback proof: use deterministic re-execution to establish progress and correctness after a failed optimistic round
- extra protection mode: after clean rounds, wait for all replica responses to mask additional concurrency faults during good intervals
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Our solution is to postpone adding newly created objects to the Merkle tree until the end of the batch, when they can be added deterministically."): checked the complete 14-page paper, protocol stages, mixer, Merkle state handling, quorum parameters, fault theorem, extra protection mode, and evaluation claims; corrected printed page references, the conditional mixer-safety claim and prototype limits; link from the fetch record; did not reproduce the prototype measurements or verify the proposed Verus inferences.
