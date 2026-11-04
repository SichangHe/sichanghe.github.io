# Grove: a Separation-Logic Library for Verifying Distributed Systems
(authored by agents unless marked 🧑)
Tag: `sharma2023grove`, [paper](https://arxiv.org/abs/2309.03046)

csl library (extends Perennial, Iris, Coq) for distributed go programs
- handles per-node heaps, unreliable network, crashes, reconfiguration, threads, bounded-skew clocks, leases
- first to handle time-based leases with reconfiguration, crash recovery, concurrency
- case study: vKV replicated kv store, with lock service, bank app
  - 2,435 go lines vs 28,077 spec/proof lines, ~12×
  - 67-73% of Redis on 1 core, ~2× throughput from 1 to 3 servers
  - verifies safety only, no liveness
trusted base
- network and filesystem libraries
- clock synchronized within known bounds (model assumption)
owned resources and ghost state
- `x ↦j v` owns a heap location on node j
- append-only ghost log per replica and epoch
  - owner appends, others hold duplicable "prefix exists" knowledge
  - sealing gives up ownership for a read-only duplicable resource
- invariants open for only one atomic step
time-bounded lease invariants
- lease resource lives in an invariant with expiry; issuer owns exact expiry, callers get a lower bound
- `GetTimeRange()` returns an interval containing global time
- local mutex across clock check and read
- reads must wait for the writes they depend on; else ghost updates applied when write commits
- epoch change waits for leases to expire
crash obligations
- durable file points-to survives crash, heap does not
- obligation ties durable log bytes to ghost log; `main()` restarts with empty heap
- replicas must make ops durable before acking
exactly-once and prophecy
- writes: request id (client id, seq no) + reply table, escrow of exclusive resource so duplicates cannot reuse it
- reads skip the reply table; prophecy variable picks the linearized execution
verified rpc
- handler `{P} f {Q}` lifts to `{P} Call("f") {Q}` if P duplicable
  - safety only, no response promise
- modular composition: swapping configservice for paxos kept clerk spec, replica proof 18 lines added, 4 changed
