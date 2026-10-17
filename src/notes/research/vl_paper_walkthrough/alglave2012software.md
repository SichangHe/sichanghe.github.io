# Software Verification for Weak Memory via Program Transformation
(authored by agents unless marked 🧑)

Tag: `alglave2012software`, [paper](http://arxiv.org/abs/1207.7264v1)

## scope and result

This paper transforms a concurrent program so a verifier for sequential consistency (SC) can check executions allowed by weak memory models. It defines a generic operational machine, proves equivalence with an axiomatic model, reduces instrumentation to one delay pair per critical cycle, and implements the transformation for x86/TSO, PSO, RMO, and Power. The abstract states: “We propose a sound transformation of the program to verify, enabling SC tools to perform verification w.r.t. weak memory.” (Abstract, p. 1) The method is sound but deliberately does not claim completeness; the paper notes that weak-memory verification can be non-primitive recursive or undecidable (Introduction, pp. 1–2).

## technique 1: axiomatic execution graphs and delay pairs

What it is. A program execution is an event structure `(E,po)` plus a witness `(ws,rf)`: write serialization orders writes per address, read-from identifies the write supplying a read, and from-read (`fr`) is derived from `ws` and `rf` (§2, pp. 3–4). An architecture declares which relations are safe. An execution is valid when per-location consistency, no thin-air causal cycle, and acyclicity of the safe relations all hold. The paper gives the formula `validA(E,X) = uniproc(E,X) ∧ thin(E,X) ∧ consensus(E,X)` (§2, p. 4).

A delay pair is a relaxed program-order pair or external read-from pair: `delaysA(E,X) = {(e,e') ∈ (po ∪ rfe) | (e,e') ∉ safeA}` (§3.1, p. 6). In practice the delays are write-read pairs on x86/TSO, write-read and write-write pairs on PSO, and all po pairs except dp ones on RMO and Power; on Power also all rfe pairs (§3.1, p. 6).

How to apply it.

1. Build events for each load and store and compute `po`, `ws`, `rf`, and `fr` (§2).
2. Select the target architecture's safe relations and identify delay pairs (§3.1).
3. Check candidate executions against `uniproc`, `thin`, and `consensus`; a cycle that SC forbids but the architecture allows is a weak-memory behaviour (§2 and Fig. 1–2).

Verus form. Inference: A Verus concurrency proof can model the abstract event graph as a ghost state machine. Each transition records an event and maintains an invariant expressing allowed orderings. The executable Rust still uses atomics and fences; the graph and relations remain proof-only. Inference: this requires a memory-model specification for the target platform, which Verus's ordinary sequential contracts do not provide automatically.

Evidence and limits. The graph model covers SC, TSO, PSO, RMO, Alpha, and a fragment of Power (§2, p. 2). The paper uses the framework of its reference [5]. Inference: it detects behaviours under that model rather than proving that every concrete compiler and processor preserves the model.

## technique 2: abstract machine with buffers and queues

What it is. The transformed SC program simulates weak behaviour with an abstract machine whose state is `(m,b,q,l)`: memory `m`, a per-location write buffer `b`, a read-dependency queue `q`, and per-thread/address log `l` recording the last write to an address seen by a thread (§3.1, p. 5). Each event is split into a delayed entry `d(e)` and a flush `f(e)`. Writes enter a buffer and later flush to memory; reads enter a queue and later flush when dependencies and visibility conditions permit. The buffer is per location rather than per thread, which lets the machine model both store buffering and non-atomic caching (§3.1, p. 5).

How to apply it.

1. For every write `w`, create a nondeterministic path that puts it in the buffer or writes memory directly (§4 and Fig. 5).
2. For every read `r`, create paths that read memory, read a buffered write, or enqueue a delayed read. A delayed read stores a pointer to its location and postpones updating its destination register (§4, Fig. 5, pp. 10–11).
3. Enforce queue dependencies (`dp`) and buffer ordering when flushing events (§3.1, pp. 5–6).
4. Add the architecture protocol that permits delayed exits only for selected delay pairs and safe exits otherwise (§3.1, pp. 6–7).
5. Run the resulting program under an SC verifier.

Theorem 1 states the key equivalence: “validA (E, X) ∧ ¬(validSC (E, X)) ⇔ mns(E, path(E, X, delaysA (E, X)))” (§3.1, p. 7), where `mns` means machine not stuck. Inference: a non-SC execution valid on A corresponds to a path that the machine, augmented with the A-protocol, can read without getting stuck.

Verus form. Inference: Encode `m`, `b`, `q`, and `l` as ghost maps or sequences and prove each buffer/queue operation with `requires` and `ensures`. The Rust implementation can expose an API whose proof state records pending writes and reads; `invariant` clauses on loops preserve queue dependency and per-location order. Inference: the transformed program is an explicit operational model, so it can verify a wrapper or simulator but does not by itself prove the processor's implementation.

Evidence and limits. The equivalence theorem is supported by Coq proofs supplied with the implementation (Introduction, p. 2). The paper describes the machine's transitions in prose and omits their formal definitions "for brevity" (§3.1, p. 5); the Coq proofs are available online.

## technique 3: one critical delay per cycle

What it is. Delaying every relaxed pair is expensive. The authors characterize non-SC executions by critical cycles and prove that one selected pair per critical cycle suffices. A critical cycle has at most two accesses per processor and at most three accesses per location, with the paper's conditions: per processor at most two accesses a and b with addr(a) ≠ addr(b), and per location at most three accesses from distinct processors (§3.2, pp. 8–9, citing [4, Thm.1]).

How to apply it.

1. Find critical cycles in the abstract execution graph (§3.2).
2. Select at least one delay pair on each cycle; call the set `critsA(E,X)` (§3.2).
3. Tag an event as delayed if it is the source of a selected program-order pair, or the source or target of a selected external-read-from pair (`dpo`, `drfs`, `drft`); tag all other events as memory events (`m`) (§3.2, p. 9).
4. Execute delayed events through buffers/queues and memory events directly from memory (§3.2).
5. Flush selected pairs with the Delayed exit rule and other pairs with the Safe exit rule (§3.2).

Theorem 2 gives the reduced equivalence: “only one delay pair per critical cycle actually needs delaying” (§3.2, p. 9). For store buffering, one buffered write creates the diversion from the SC cycle; for Power's non-atomic `iriw+dps`, one delayed external read-from pair suffices (§3.2, p. 8).

Verus form. Inference: A Verus proof can maintain a ghost set of selected cycle edges and prove that each cycle has a delayed edge. A lemma can show that flushing the other edges with the safe rule preserves acyclicity. Inference: cycle-finding is likely best performed by a preprocessing tool; proving the selected set covers all cycles is a separate `proof fn` obligation.

Evidence. The paper reports SatAbs verification of the PostgreSQL excerpt in 21.34 seconds with the full transformation versus 1.29 seconds with one critical delay (§3.2, p. 9; §4, p. 11; §5, p. 14). These times use the same excerpt and tool, so the denominator is one program instance per configuration, not a broad speed average.

## technique 4: implementation and source-level transformation

The implementation converts C to a goto-program, builds an abstract event graph, over-approximates critical cycles, computes architecture-specific delay pairs, and instruments the selected instructions (§4, pp. 10–11). For `iriw+dps`, it uses "a buffer of size 2 for each variable" and adds assertions that check whether the bound is exceeded (§4, p. 11). The transformed goto program can be consumed by CImpact or SatAbs, converted back to C for CheckFence, ESBMC, Poirot, and Threader, or converted to Blender's input format or emitted as C# for MMChecker (§4, p. 11).

The transformation deliberately permits spurious cycles in the abstract graph: “spurious cycles do not impair the soundness of our method” (§4, p. 10). The paper says the buffer bound is made sound by assertions that check whether it is exceeded (§4, p. 11). Inference: without that check, the bounded simulation would not be sound.

Verus form. Inference: A Rust implementation could instrument atomic accesses with a ghost buffer and queue, then prove refinement from concrete executions to the transformed machine. Inference: this is a substantial runtime or proof-state cost and should be isolated behind a verified abstraction rather than inserted into product code.

## evidence, assumptions, and product implications

Validation uses 555 diy-generated litmus tests, each averaging 48 lines and 2–4 threads, across SC, TSO, PSO, RMO, and Power (§5, pp. 11–12). The paper says Fig. 6(b) "shows that the optimised approach allows SatAbs to verify 533 of the 555 tests, and 440 with the full approach, in more than twice the time needed for SC" (§5, pp. 12–13). The denominator is 555 tests, and the setting is SatAbs on Linux 2.6.32 64-bit machines with 3.07 GHz (§5, p. 11). Most other tools time out or return wrong results on a large majority of these tests (Fig. 7), so the result is tool-specific. In the PostgreSQL token-passing excerpt, the authors identify an mp idiom, which they say is commonly observed on Power and which they treat as the bug the developers saw, and an lb idiom, which they say is not yet implemented by Power machines (§5, p. 13). The final patch places two `lwsync` barriers, after line 8 and before line 12 (§5, p. 14).

The paper proves machine/axiomatic equivalence and transformation soundness, with Coq proof artifacts.

## techniques for the catalog

- execution-graph weak-memory model — represent events with `po`, `ws`, `rf`, `fr`, and architecture-specific safe relations
- buffer-and-queue simulation — split each event into delayed and flushed parts and run the resulting program under SC
- critical-cycle reduction — select one relaxed delay pair per critical cycle to preserve sound weak-memory behaviours
- source instrumentation — compute abstract cycles and inject buffers, queues, nondeterministic choices, and overflow assertions
- cross-tool validation — feed transformed C to multiple SC analyzers and validate against 555 litmus tests plus PostgreSQL
