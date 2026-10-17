# Verifying vMVCC, a high-performance transaction library using multi-version concurrency control
(authored by agents unless marked 🧑)
Tag: `chang2023vmvcc`, [paper](https://www.usenix.org/conference/osdi23/presentation/chang)

## what the paper proves and builds
The paper presents vMVCC, a Go in-memory transactional key-value library, and a machine-checked proof that its transactions are strictly serializable despite multi-version storage, garbage collection, sharding, and RDTSC-derived timestamps. The authors state: “vMVCC is the first MVCC-based transaction library that comes with a machine-checked proof of correctness” (abstract, p. 871). The interface is `Begin`, `Read`, `Write`, `Delete`, `Commit`, and `Abort`; `Begin` assigns a strictly increasing timestamp, reads first check the local write buffer and otherwise select the newest version before that timestamp, successful commit appends versions, and conflicts can force an update transaction to abort (§2, pp. 872–873).

The key difficulty is that a transaction linearizes when its timestamp is generated, before its body has executed. The paper says: “The key technical challenge addressed in vMVCC lies in dealing with the fact that MVCC’s linearization point happens before the transaction body runs” (introduction, p. 871). A proof must therefore update an abstract state before it knows the transaction’s writes or whether it will commit.

## technique 1: prophecy variables for an early linearization point

what it is and when to use it
Use a prophecy variable when an operation’s abstract effect must be applied at an early linearization point but depends on future execution. In vMVCC the prophecy is a future-action list containing symbolic read and commit actions. The paper states: “Intuitively, prophecy variables allow the proof to speculate about future execution” (§4.1, p. 876).

how to apply it
1. Use the prophecy’s shared future-action list, containing reads and commits with symbolic write maps, to predict a transaction’s behavior at begin time (§4.1, pp. 876–877).
2. At the timestamp linearization point, reflect predicted updates in the logical state only when the transaction’s first predicted commit is conflict-free against preceding actions. Treat inconsistent predictions as aborts so the invariants still hold (§4.3, pp. 878–879).
3. Maintain a speculative timestamp-indexed view that includes writes from transactions already linearized but not yet physically executed (§4.2, p. 877).
4. Resolve read actions when reading and commit actions when committing. Use the conflict-free invariant and conflict detection to derive contradictions for inconsistent predictions, retaining matching cases (§4.1, p. 877; §4.3, p. 879).
5. Relate the speculative view to a monotonic linear view and then to the physical version list with invariants: the linear view is a prefix of the speculative view, and the speculative last value equals the top-level logical value (§4.2, p. 878).

The concrete proof groups symbolic families of predictions instead of enumerating concrete timestamps, keys, and values (§4.1, p. 877). It treats an abort as a commit with an empty write set (§4.1, p. 877), so the same machinery handles both outcomes.

Verus form (inference)
Inference: a Verus adaptation would need a sound counterpart of the paper’s prophecy creation and resolution rules, plus the prefix, last-value, and conflict-free invariants. Merely recording a predicted future in ghost data and checking it later does not establish the early logical update. The paper supplies no Verus implementation or proof of this adaptation.

evidence, assumptions, and failure modes
The implementation has 827 Go lines and 11,117 Coq proof lines, about 13 proof lines per implementation line (Figure 10, p. 880). The authors report that Perennial had to be extended with Iris prophecy support (p. 880). Inference: using this result requires trusting the underlying logic and its prophecy-resolution rules. It does not by itself prove durability: the paper explicitly limits vMVCC to in-memory storage (§1, p. 872).

## technique 2: logical atomicity as an application interface

what it is and when to use it
Hide the internal MVCC interleavings behind a logically atomic `Run` operation. The application proves a transaction body sequentially with exclusive logical resources; the library specification states that the whole body atomically swaps an abstract map satisfying a precondition for one satisfying a postcondition. In the bank example, `xfer` owns transaction-local resources for `src` and `dst` and either aborts or returns ownership of the updated balances (§3.1, pp. 874–875).

how to apply it
1. Specify the body with ownership of the transaction-local map and a pure precondition `P(m)`. Require the resulting transaction-local map and a pure relation `Q(m,m')` when the body chooses to commit (§3.2, pp. 875–876).
2. Prove each read and write in the body using exclusive resources, so the proof can use sequential reasoning (§3.1, p. 874).
3. Give `db.Run` a logically atomic contract: during execution it swaps `m` satisfying `P` for `m'` satisfying `Q`; on abort it preserves `m` (§3.2, pp. 875–876).
4. Compose the application proof with the library contract; concurrency and version conflicts are discharged by vMVCC’s implementation proof.

The paper’s transfer implementation reads the source, returns false if funds are insufficient, writes source minus `amt`, reads destination, writes destination plus `amt`, and returns true (Figure 3, p. 874). The wrapper passes this body to `db.Run`.

Verus form (inference)
Inference: a Verus adaptation could represent the logical and transaction-local maps in ghost state and prove the body’s arithmetic relation separately. It would also need a concurrent specification that permits ownership at the linearization point; a sequential old-map/new-map postcondition alone would not reproduce the paper’s logically atomic interface. This adaptation is not demonstrated in the paper.

evidence, assumptions, and limits
The contract formalizes strict serializability: transactions observe and modify state one at a time at linearization points while preserving precedence order (§3.2, p. 876). It assumes pure `P` and `Q`; the paper notes they cannot encode ownership of other resources (§3.2, p. 876). The interface is key-value only and has no range scans (§1, p. 872).

## technique 3: proving strict timestamp monotonicity with ghost slots

what it is and when to use it
Use a ghost slot table when the logical linearization event occurs between executable instructions, as with a timestamp that is reserved and then awaited. vMVCC computes a candidate `t'`; its proof registers a ghost callback in slot `t'` and invokes callbacks as RDTSC advances. The invariant says every slot below `latest-slot` has been invoked and `latest-slot` is no greater than the real RDTSC clock (§4.5, p. 880).

how to apply it
1. Hold the chosen site’s mutex, read RDTSC as `t`, and compute the next candidate `t' >= t` with the site identifier in its low bits (§2, pp. 873–874).
2. While still holding the site mutex, register the candidate’s ghost function and prove no concurrent thread can fill that slot (§4.5, p. 880).
3. Spin until a later RDTSC value exceeds the candidate; in the proof, on each iteration invoke all newly passed slot callbacks (§2, p. 874; §4.5, p. 880).
4. Use Iris later credits to justify “unsolicited helping”, where another thread may invoke the callback (§4.5, p. 880).
5. Conclude that the callback for the transaction’s timestamp has run before the transaction proceeds, establishing strict monotonicity and the logical update.

Verus form (inference)
Inference: a Verus adaptation would need ghost slots, an invariant relating `latest_slot` to an assumed hardware clock, and a way to justify another thread performing the logical update. The paper uses Iris later credits for that last step; it does not establish an equivalent Verus construction.

evidence, bugs, and limitations
Verification exposed a garbage-collection bug: initializing `tidmin` to `MAX_U64` lets a new transaction enter after `getSafeTS` returns and receive an ID below the GC timestamp; the fix generates the safe timestamp within each site (§5.1, pp. 880–881). The authors also found a missing wait loop and greater-than versus greater-than-or-equal errors (§5.1, p. 881). The paper assumes hardware timestamps are monotonically increasing and consistent across cores and sockets (§2, p. 873). Inference: correctness of actual executions also depends on the hardware and synchronization behaving as modeled.

## technique 4: GC through a safe timestamp and abstraction weakening

what it is and when to use it
To delete old versions without invalidating the physical-to-logical relation, compute a monotonic safe timestamp lower-bounding all active and future transaction IDs, then weaken the abstraction relation below that bound (§4.2, p. 878).

how to apply it
1. While holding its mutex, each site initializes its bound with a timestamp generated within that site, then lowers it for any smaller active transaction ID. The collector takes the minimum of these per-site bounds (§5.1, pp. 880–881).
2. Set `ts_safe` to that lower bound.
3. Relax each tuple’s abstraction relation so versions whose lifetime ends before `ts_safe` are unconstrained (§4.2, p. 878).
4. Require every subsequent read or write timestamp to satisfy `t >= ts_safe`, ensuring deleted versions cannot be observed (§4.2, p. 878).
5. Delete the unconstrained physical versions.

Verus form (inference)
Inference: a Verus adaptation could carry `ts_safe` in ghost state, prove it monotonic, and require `ts >= ts_safe` on version accessors. Its abstraction relation must preserve values observable at and above the bound, including any version that starts below the bound but remains valid there. The paper does not provide this adaptation.

Inference: the bound must account for both active transactions and future allocation. Scanning only active IDs is insufficient, as the reported bug demonstrates.

## measured result, trust boundary, and product threat

Experiments ran on one AWS EC2 c5.9xlarge (36 vCPUs, 72 GB, Linux 5.15.0, Go 1.20.3), repeating each benchmark ten times for 30 seconds and reporting mean, minimum, and maximum (§6.1, p. 881). With 32 worker threads, YCSB throughput was 18.6–52 million transactions/s, reported as 38–96% of unverified Silo; TPC-C was 10.7–33 thousand transactions/s per warehouse, 25–43% of Silo (§1, p. 872). Section 6.2 explains Figure 11’s exact normalized points: 96.6% for read-only YCSB, 38.8% for write-only YCSB, 43% for one-warehouse TPC-C, and 25.7% for 32-warehouse TPC-C (p. 882). The comparison uses MemSilo, Silo’s variant without persistence (§6.2, p. 881). The denominators are Silo throughput under the same workload. The TPC-C implementation replaces customer-last-name lookup with customer-ID lookup and gives History rows randomly generated primary keys (§6.1, p. 881).

The paper identifies its verification path: “We implemented vMVCC in Go, and verified its implementation using the Perennial framework [3] (based on Iris [21–23] and Coq [33]), using Goose [4] to lift vMVCC’s Go code into Perennial” (§5, p. 880). It does not enumerate an exhaustive trusted computing base or describe SMT use. Inference: a Verus transaction library would need explicit specifications for concurrency, reclamation, and hardware assumptions. The reported implementation bugs motivate checking those details; the paper does not validate a Verus port.

## techniques for the catalog

- prophecy future-action lists: predict symbolic transaction effects at an early linearization point, maintain conflict-free speculation, and resolve read and commit actions
- logical atomicity: expose a transaction body through a map-swap contract while proving the body sequentially
- ghost timestamp slots: prove monotonic IDs and callbacks when linearization is between instructions
- safe-timestamp GC: weaken the abstraction below a monotonic lower bound before deleting old versions
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The prediction about each individual transaction and thread could be correct in its own right, but it is the combination of them that leads to a contradiction."): checked the full paper, quotations, numbers, section and page references, and technique steps; corrected reversed code/proof counts, prophecy handling, safe-timestamp computation, citations, and the publisher link; marked proposed adaptations as Inference and removed unsupported Verus and trust claims; did not inspect the artifact, rerun proofs or benchmarks, or validate Verus adaptations. The quoted sentence is from §4.3, p. 879.
