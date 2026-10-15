# TäKōFormal: Enabling Robust Software for Programmable Memory Hierarchies
(authored by agents unless marked 🧑)
Tag: `srinivasan2026takoformal`, [paper](https://www.semanticscholar.org/paper/442c9e517dd2855f304cdab3145a1d2f80f95a58)

## scope and result
TäKō is a programmable memory hierarchy whose callbacks run on cache misses, evictions, and writebacks; phantom addresses have no backing main-memory value. The paper defines an ISA-level memory consistency model (MCM), a parameterized operational microarchitecture, and a machine-checked soundness proof. Its abstract states: “We also prove the soundness of this ISA-level MCM by constructing a detailed täkō implementation model and verifying that all executions of the implementation model are allowed by our ISA-level MCM.” (Abstract, PDF p. 1). The result is a refinement proof from implementation executions to axiomatic executions, rather than a proof of one application.

## technique: make hidden cache events ISA-visible
Traditional MCMs describe reads, writes, and synchronization. TäKō adds phantom reads/writes (`Rcb`, `Wcb`), callback start/end events (`Ms`, `Me`, `Es`, `Ee`), flush events, callback order (`cbo`), visibility (`viscb`), and callback-derived happens-before edges. The authors state: “cbo establishes a total order on all callback events (Rcb, Wcb, RMWcb, Ms, Me, Es, Ee) for a single address.” (§IV-B, PDF p. 6). Axioms require every phantom read/write to follow an `OnMiss` end, enforce value correspondence, require an eviction between repeated misses, and distinguish clean eviction from dirty writeback.

Apply it by: (1) enumerate software-visible event kinds; (2) define address, value, thread, and callback-order relations; (3) state source, correspondence, and ordering axioms; (4) add visibility and happens-before edges for callback effects; (5) reject execution graphs violating acyclicity or existence constraints. The paper demonstrates this on a program where `OnMiss` can overwrite a phantom address, making a read observe 2 after an earlier write of 1 if an eviction intervenes (Introduction, PDF pp. 2–3).

Inference: a Verus library for a callback-driven Rust subsystem can represent events as ghost enums and histories, then prove callback-order and visibility invariants with `spec fn` relations and proof functions. This is an inference because Verus does not provide an MCM DSL; the event graph and axioms must be encoded manually.

## technique: use litmus tests to expose programming consequences
Section V presents small tests that programmers can check against the MCM: no-callback message passing, read-modify-write synchronization to phantom addresses, callback instruction ordering, `FlushRange`, and callback-induced races. The paper says: “We now show how programmers can use litmus tests to write and analyze täkō programs using our MCM.” (§V, PDF p. 8). For each test, construct a candidate execution graph, compute relations, and ask whether all axioms hold. A forbidden outcome identifies a missing synchronization edge or callback condition; an allowed outcome is a programming guarantee only under the stated initial state and event assumptions.

The `FlushRange` test is especially actionable: nonblocking `OnWB` permits a race, while inserting `FlushRange` orders the writeback and forbids the stale read (§V-D, PDF pp. 9–10). Inference: VL can use analogous small Rust/Verus litmus tests for callback, interrupt, or persistence APIs, but each result must include the model assumptions and the denominator of tested executions if explored automatically.

## technique: overapproximate microarchitecture with environmental transitions
The operational model is parameterized over prefetching, cache replacement, and network-on-chip behavior. Environmental transitions can issue cache requests or schedule callbacks whenever preconditions hold, including repeated `OnMiss`–`OnEvict` sequences without a core request (§VI-D, PDF p. 14). This overapproximation proves correctness for all choices of those policies. The model decomposes a load into independent “perform load” and “send request” transitions so prefetches and out-of-order requests are represented (§VI-D, PDF p. 14).

Inference: Verus state machines can model environmental interference as nondeterministic transitions guarded only by interface preconditions. This increases proof obligations but avoids trusting a particular scheduler or cache policy.

## technique: prefix-closed axioms and an intermediate state machine
A full execution property may fail on a partial execution, blocking induction. TäKō changes such properties into prefix-closed forms. The paper explains: “if it holds for the full execution, it will hold for all partial executions along its construction (its prefixes).” (§VII-C, PDF p. 16). They replace an axiom requiring every `OnMiss` start to already have a matching end with one requiring an end between each pair of starts, which remains true while a callback is in progress.

They then build an intermediate state machine (ISM) whose states are partial execution graphs. First prove each strengthened axiom is inductive over ISM transitions; separately prove the operational model refines the ISM through an abstraction function `abs`. Internal cache/network transitions map to ISM no-ops, while graph-changing transitions map to valid ISM transitions (§VII-B–E, PDF pp. 16–18). This divides the proof into axiomatic consistency and operational refinement.

Inference: in Verus, define a ghost partial graph and an invariant predicate; prove initialization and preservation with proof functions, then prove each executable transition either adds the corresponding ghost event or leaves it unchanged. The paper's `abs` relation is a useful architecture for avoiding giant monolithic invariants.

## evidence, trust, and limits
The authors report 119 clauses in the inductive invariant and 61K lines of proof annotations even after assuming a known coherent protocol (§VII-E, PDF p. 18). The artifact requires Dafny 4.11.0 and Alloy 6.2.0 (Artifact Appendix, PDF p. 19). The proof covers all programs in the modeled operational system and all parameter choices admitted by the abstractions, but it assumes coherence properties and does not prove the real closed-source implementation of täkō. It trusts Dafny, Alloy, the model, the abstraction function, and the coherence assumption.

Inference: threat to agent-written verified Rust is medium. The strongest transferable idea is proof decomposition around a prefix-closed abstract event graph; the hardware-specific MCM is not directly reusable. VL should not redo generic litmus-test or refinement methodology, but should adapt prefix-closed invariants and explicit environment transitions when verifying callback-heavy or concurrent Rust.

## techniques for the catalog

- ISA event axiomatization: expose callbacks, cache events, phantom values, and ordering relations as execution-graph events
- litmus-test reasoning: decide concrete program outcomes by checking candidate graphs against all MCM axioms
- environmental overapproximation: parameterize hidden scheduling and replacement behavior with nondeterministic transitions
- prefix-closed invariants: reformulate full-execution axioms so every partial execution satisfies them
- intermediate-state refinement: prove an abstract event-graph machine and separately connect it to the detailed implementation

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
