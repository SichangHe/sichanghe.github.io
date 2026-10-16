# VSync: Push-Button Verification and Optimization for Synchronization Primitives on Weak Memory Models (Technical Report)
(authored by agents unless marked 🧑)
Tag: `oberhauser2021vsync`, [paper](http://arxiv.org/abs/2102.06590v1)

## scope and result
VSync extends stateless model checking to weak-memory programs containing await loops. Its central procedure is Await Model Checking (AMC), which explores execution graphs, filters redundant await iterations, and reports safety or await-termination violations. The report says, “AMC is an enhancement of stateless model checking (SMC) capable of handling programs with awaits on WMMs.” (Sec. 1, p. 3) This is explicit-state model checking, not deductive invariant verification; the formal result is a sound and terminating search for a specified program fragment.

Execution graphs contain read/write events and `po`, `mo`, and `rf` edges. A memory model is a consistency predicate `cons_M(G)`. An await is a loop that, for every polled value, either exits immediately or can loop forever in isolation (Sec. 1.1, pp. 3–4). Let `G_F` contain consistent graphs where all awaits terminate and `G_∞` the remaining graphs; await termination (AT) means `G_∞` is empty.

## technique: wasteful-iteration filtering
Use this when an await can repeat reads from the same writes, creating infinitely many graphs with no new information.

1. Represent each candidate execution as a graph and enforce `cons_M(G)`.
2. Define `W(G)` (wasteful) when an await reads the same combination of writes in two consecutive iterations (Sec. 1.2, p. 5).
3. During exploration discard every graph satisfying `W(G)`. This removes repeated failed iterations while preserving one representative of each behavior.
4. For an await read, also create a graph with no incoming `rf` edge. If no runnable thread can add a write and every completion that adds the edge is wasteful, report an AT violation (Sec. 1.3, pp. 7–8).

The report states, “AMC does not generate wasteful executions, as they do not add any additional information.” (Sec. 1.2, p. 5) Under its two principles, every graph in `G_F` has an equivalent non-wasteful representative and a finite search set; an infinite await is represented by a finite graph with an unresolved read (Sec. 1.2, pp. 5–6).

## technique: bounded-length and bounded-effect conditions
Before using AMC, establish two assumptions. The Bounded-Length Principle requires a global bound `b` on the length of all executions in `G_1`; the Bounded-Effect Principle requires failed await iterations to affect only that iteration (Sec. 1.2, pp. 6–7). Formally, `rf` edges from writes in a failed iteration may target reads in the same iteration, but not later iterations, other threads, or outside code. Then:

1. bound non-await steps and each failed iteration;
2. inspect failed-iteration writes for escaping `rf` edges;
3. remove a failed iteration to obtain a shorter graph with the same error events;
4. enumerate the finite non-wasteful set and at most one `G_∞` witness.

The authors give the bound for `G_k` as `b + (k−1)·x`, where `x` is the maximum failed-iteration length (Sec. 1.2, p. 6). Their correctness theorem states, “For programs which satisfy the Bounded-Length principle and the Bounded-Effect principle, 1) AMC terminates, 2) AMC detects every possible safety violation, 3) AMC detects every possible non-terminating await, and 4) AMC has no false positives.” (Theorem 1, p. 8)

## technique: depth-first graph exploration
VSync implements AMC on GenMC. Initialize a stack with the empty graph; pop a graph, discard it if inconsistent or wasteful, reconstruct thread-local state, and choose a runnable thread (Sec. 1.3, p. 7). For a write, push graph copies adding `rf` edges to existing reads. For a read, push one copy per possible source write and an extra copy with no `rf`; failed assertions immediately report a counterexample. This gives a concrete recipe for weak-memory synchronization checking.

## case study and optimization workflow
For existing code, replace custom assembly atomics with VSync or compiler built-ins, preserving special semantics with wrappers; normalize accesses to one size because AMC requires same-size accesses to a location (Sec. 3.3, p. 30). Model the target lock, run AMC under IMM, and inspect a counterexample graph. The DPDK v20.05 MCS lock case had a missing release barrier before the predecessor-link store; AMC produced an Alice-hangs graph. Making Alice's store release and Bob's read acquire establishes the needed synchronizes-with edge (Sec. 3.1, pp. 27–28). The internal Huawei MCS lock had a missing acquire barrier and was reproduced on real hardware (Sec. 3.2, p. 29).

For qspinlock, the authors ported Linux 4.4, replaced atomics, and searched barrier modes. Table 1 reports VSync's 7 acquire, 2 release, 1 sequentially consistent barriers and 11-minute search time; the result is marked VSync-verified, while Linux 4.4, 4.16, and 5.6 are marked not verified (Sec. 3.3, p. 31). Inference: this workflow could check Rust atomic code only after its atomics are translated to the modeled memory events; it does not prove Rust ownership or functional postconditions.

## performance evidence, trust, and limits
The microbenchmark ran each lock for 30 seconds at thread counts `{1,2,4,8,16,23,31,63,95,127}`, five repetitions, taking the median (Sec. 4.2.1, p. 35). Table 4 has 741 records: 627 (84.62%) have stability ≤1.1, 114 (15.38%) exceed 1.1, and 45 (6.07%) exceed 1.2 (Sec. 4.2.2, p. 38). Speedups are medians of optimized versus sequentially consistent throughput after filtering records above 20% instability; the paper warns that means aggregate its selected samples (Table 5, p. 39). Trusted components include GenMC, the memory-model consistency predicate, compiler/atomic translation, and the theorem's boundedness assumptions. Inference: AMC threatens manual weak-memory testing and can find serious barrier bugs, but its scope excludes unbounded client loops, escaping failed-await effects, mixed-size accesses, and deductive functional proofs; a Verus product still needs a separate model for atomics and Rust semantics.

## techniques for the catalog
- wasteful-iteration filtering: discard await graphs whose consecutive iterations read the same writes
- missing-read termination witness: represent a possible non-terminating await with a read lacking an incoming `rf` edge
- bounded-effect proof: use bounded length and non-escaping failed-iteration effects to guarantee finite, sound exploration
- weak-memory graph checking: explore `po`/`mo`/`rf` graphs under a consistency predicate to find barrier bugs
- barrier optimization search: replace atomics, enumerate barrier modes, and retain modes whose AMC checks pass

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
