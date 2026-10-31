# Grove: a Separation-Logic Library for Verifying Distributed Systems
(authored by agents unless marked 🧑)
Tag: `sharma2023grove`, [paper](https://arxiv.org/abs/2309.03046)

## scope and result
Grove is a concurrent separation-logic library for distributed Go programs. It handles independent heaps, unreliable messages, crashes, reconfiguration, thread concurrency, clocks synchronized within known bounds, and leases. The paper extends concurrent separation logic (CSL) with time-bounded invariants, distributed crash reasoning, append-only-log and epoch resources, and a verified RPC library. The authors build and verify vKV, a replicated key-value store, plus supporting libraries and a toy bank application (Sections 1–3).

The abstract states: “Grove is a concurrent separation logic library for verifying distributed systems.” It also says: “Grove is the first to handle time-based leases, including their interaction with reconfiguration, crash recovery, thread-level concurrency, and unreliable networks.” (Abstract, PDF p. 1.) The paper reports that vKV reaches “67-73% of Redis on a single core” and “about 2× the throughput when going from 1 to 3 servers” (Abstract, p. 1). These are performance measurements, not proof of liveness: “Grove cannot verify liveness properties, such as ensuring that the system will respond or otherwise make progress.” (Introduction, p. 2.)

## technique 1: owned resources and ghost state
What it is. CSL specifications have a precondition and postcondition, and assertions describe ownership as well as facts. Owning a heap location excludes other threads from accessing it. Grove provides resources for per-node heaps, network state, files, and proof-only (ghost) state. Section 3.2 states, “Grove generalizes concurrent separation logic (CSL) [26, 39] to reason about distributed systems.” (p. 8.) Separating conjunction combines disjoint resources; a function must establish its promised postcondition using the resources available to its proof.

How it works (Sections 3.2.1–3.2.3, pp. 8–9). A node-indexed resource `x ↦j v` owns a heap location on node j. An append-only ghost list records accepted operations for each replica and epoch. Its owner may append entries; other threads can hold duplicable knowledge that a particular prefix exists. Sealing gives up mutable ownership in exchange for a duplicable read-only resource that prevents further appends in that epoch. A replication invariant owns the committed log and records that every replica has accepted its prefix. Ordinary invariants can be opened temporarily, but their resources must be returned within one physically atomic code step.

Evidence. Figure 17 reports 2,435 verified Go lines and 28,077 specification/proof lines, summarized as a 12× ratio in Section 6 (p. 18). Section 5.5 says, “The bank code and proof refer only to the simple interfaces and specifications provided by the vKV and lock service clerks.” (p. 18.) This composition proves safety; the bank prototype does not recover locks held by a crashed bank node (Section 2.3.4, p. 7).

Inference: a Verus adaptation would need to preserve exclusive ownership, duplicable knowledge, and the restrictions on ghost-state updates. The paper establishes these rules for Grove, not a Verus encoding.

## technique 2: time-bounded lease invariants
What it is. A lease promises that a fact remains unchanged until expiration. Grove puts the promised resource inside a time-bounded invariant and tracks expiration separately. Each node's `GetTimeRange()` returns an interval containing global time. The introduction says, “Leases allow a leader to execute read-only operations quickly, without having to contact replicas to confirm that it is still the leader.” (p. 1.) In vKV, a lease protects the current epoch, allowing reads on any replica (Sections 2.2.3 and 3.4).

How it works (Sections 3.4–3.5, p. 10; Section 4.3, p. 14). Creating the invariant gives up ownership of its protected resource. The issuer retains exact expiration ownership and supplies callers with a duplicable lower bound on expiration. The issuer may extend expiration or reclaim the resource after expiry. A caller can open an unexpired invariant for at most one atomic step. Grove permits proof steps at the instant of `GetTimeRange()`, including opening the lease invariant when the later comparison will succeed. vKV holds a local mutex across the clock check and local read, so a pause between them does not change the local state. Ordinary writes remain possible during a lease; changing the configuration epoch requires waiting for outstanding leases to expire.

The read must also wait for the writes on which its result depends to commit. If they are already committed, the proof linearizes the read at `GetTimeRange()`. Otherwise, it records ghost updates for the primary's proof to apply when the preceding write commits. If reconfiguration changes the epoch before the dependency can commit, the server tells the client to retry (Section 4.3, p. 14).

Evidence. Section 5.2 lists five changes when adding leases, including a helper thread that extends leases and a versioned-state-machine interface (p. 17). Section 3.1 states, “This assumes that node clocks are synchronized to within known bounds (on the order of less than a second, for the purposes of vKV’s use of leases).” (p. 8.) Section 7 reports that three servers achieve 1.7× single-server throughput with 5% writes and 2.3× with no writes (p. 20).

Inference: a Verus adaptation would need an explicit relation between clock observations and global time, plus rules for extending, opening, and expiring leases. A predicate asserting only that the lease is currently valid would not explain delayed reads or pending write dependencies.

## technique 3: crashes and durable state
What it is. Grove extends Crash Hoare Logic to multiple nodes with a crash obligation. Durable file ownership survives a crash; heap contents do not. The paper states, “File points-to resources are durable, so ownership of them usually appears in the crash obligation of a node.” (Section 3.8, p. 12.) A replica's obligation ties its durable log bytes to the accepted ghost log, requiring operations to be durable before they are acknowledged to other nodes.

How it works. Each node may crash independently, including during recovery. Its `main()` restarts with an empty heap and retained durable state (Section 3.1, p. 7). The storage library buffers appends while a background thread writes and syncs them; replica handlers use `Wait()` to ensure durability before replying (Section 2.2.4, p. 5). The crash obligation connects the log file and ghost history throughout execution and recovery (Section 3.8, p. 12). vRSM commits only after all replicas acknowledge an operation. The separate paxos library used by configservice requires a majority instead (Sections 2.2.1 and 2.2.5).

Inference: a Verus adaptation would need explicit crash and recovery transitions and a durable-state predicate. A persistence assumption must match the actual storage primitive; an ordinary function postcondition alone does not describe arbitrary interruptions.

## technique 4: exactly-once and prophecy for uncertain linearization
What it is. Write retries need duplicate detection and a way to transfer exclusive proof resources. Read retries instead re-execute reads, potentially producing different replies. Grove uses escrow for the former proof and prophecy variables for the latter. The paper says, “Grove enables the vRSM proof to address this challenge by providing support for prophecy variables [1, 27], which was initially added to Perennial to support vMVCC [10].” (Section 3.7, p. 11.)

How it works. The exactlyonce clerk assigns a request ID consisting of a client ID and sequence number. The replicated state machine stores replies and returns the saved reply for a duplicate write (Section 2.2.8, p. 6). In the proof, the client deposits the exclusive key resource into an invariant whose alternative is an exclusive token. It sends duplicable knowledge of that invariant, so retries and new primaries can learn about the same deposit. The server handling the fresh committed request uses the token to take the resource; duplicates cannot take it again (Section 3.6, p. 11).

Reads bypass the reply table to avoid disk logging. A prophecy variable predicts the eventual response. The proof linearizes the first execution matching that prediction and tracks re-execution with ghost state. When the client receives a response, resolving the prediction either confirms the chosen result or gives a contradiction (Section 3.7, pp. 11–12). This is separate from the escrow argument for write deduplication.

Inference: a Verus adaptation would need separate arguments for write deduplication and selection of a read execution. Merely introducing a ghost prediction would not establish the soundness of prophecy reasoning.

## technique 5: verified RPC and modular composition
What it is. The network permits loss, duplication, and reordering. Grove's RPC contract lifts a handler specification `{P} f {Q}` to `{P} rpcClient.Call("f") {Q}` when P is duplicable. It does not require Q to be duplicable: each handler invocation produces a fresh Q (Section 3.3, p. 9). This is a safety contract and does not promise a response.

How it works. For ApplyAsBackup, the precondition is knowledge that the operation belongs at the specified index, rather than exclusive permission to apply it once. The postcondition supplies a lower bound on that backup's accepted log. The primary collects these bounds from every replica and updates the committed-log invariant (Sections 3.3 and 4.1, pp. 10 and 12). Higher-level components use these specifications without inspecting lower-level implementations.

Evidence. Replacing the original in-memory configservice with paxos required little change to its clients: “Across this change, configservice’s clerk API and specification (Figure 5) remained unchanged, except for clerks now taking multiple network addresses as input for the multiple configservice servers.” (Section 5.3, p. 17.) The replica proof needed 18 lines added and 4 changed, largely for the address-list change (pp. 17–18).

Inference: a Verus adaptation could separate handler proofs from caller proofs through component contracts, but would also need to justify those contracts against its network and crash model.

## what is proved, measured, and trusted
Section 5.1 lists crash-idempotence of replica `main()`, safe reconfiguration for valid servers, clerk initialization, and linearizable Put/Get/CondPut operations as vKV's top-level specifications (p. 17). The network and filesystem libraries are marked “Trusted” in Figure 17 (p. 18). Clock synchronization within known bounds is a model assumption (Section 3.1, p. 8). Grove extends Perennial, based on Iris and Coq; Section 6 describes a distributed composition soundness theorem under Grove's execution model (p. 18).

The performance setup uses eight CloudLab servers: up to three replicas, four clients, and one configuration-service server. Each has an Intel Xeon E5-2630v3, eight cores, 64 GB RAM, an SSD, and a gigabit network card (Section 7, p. 18). YCSB uses uniformly random keys and 128-byte values; measurements follow 20 seconds of warmup and last one minute (pp. 18–19). The introduction reports 95%-read throughput rising from 463,491 requests/s on one server to 816,252 on three (p. 2). The Redis comparison uses one core and no backups for vKV, with Redis configured to make writes durable before replying (p. 19). These measurements do not establish liveness.

## techniques for the catalog
- owned distributed resources — assign exclusive per-node state and duplicable ghost knowledge, then prove functions compositionally
- time-bounded lease invariants — guard reads and reconfiguration with an expiry proof tied to a bounded clock interval
- crash obligations — relate durable files to ghost logs and reconstruct volatile state after crashes
- exactly-once escrow and read prophecy — transfer write resources once and select a matching read execution
- verified RPC contracts — prove unreliable communication once and compose clients from stable specifications
