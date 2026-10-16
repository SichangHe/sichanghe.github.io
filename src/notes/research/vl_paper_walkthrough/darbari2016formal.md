# Formal Modelling, Testing and Verification of HSA Memory Models using Event-B
(authored by agents unless marked 🧑)
Tag: `darbari2016formal`, [paper](https://doi.org/10.48550/arxiv.1605.04744)

## what is proved and measured
The paper formalizes the Heterogeneous System Architecture (HSA) weak-memory specification as a hierarchy of Event-B machines. Its central proof claim is refinement correctness: each more concrete machine preserves the abstract behavior, with Rodin generating and discharging proof obligations. The model is parameterized over arbitrary masters, programs, and instruction interleavings rather than one fixed execution. The paper then validates concrete litmus tests with ProB model checking, and derives regression tests from a coverage relation. The paper reports no wall-clock timings, proof-obligation counts, or percentages; its quantitative evidence is structural (15 possible register combinations in the example, all legal combinations covered and one illegal combination excluded).

## technique: refinement hierarchy for weak memory
What it is: Build a generic memory model first, then add HSA ordering and implementation detail through correctness-preserving Event-B refinements. Section II (p. 2) states: “Our approach starts at the abstract level, focusing on issue and observation of memory instructions.” The hierarchy is GM1 (Issue/Observe), GM2 (LOAD/STORE distinction), GM3 (observed values), HSAM4 (atomics and fences), HSAM5 (registers), HSAM6 (one refinement per litmus test), and HSAM7 (coverage/test generation).

When to use it: Use this when a concurrent protocol has a large nondeterministic state space but admits a simple abstract transition relation and progressively stronger invariants. Begin with behavior that must be preserved; postpone concrete instructions and registers until a later refinement.

How to do it (paper steps):
1. Define transactions and memory accesses in an Event-B context (Section IV, p. 4), then create GM1 with `Issue` and `Observe` events and invariants `issued ⊆ MEM_ACCESS` and `observed ⊆ issued`.
2. Refine events to distinguish loads and stores using a partition axiom and `IssueLoad`, `IssueStore`, `ObserveLoad`, and `ObserveStore` (Section IV, p. 4).
3. Add an abstract per-master last-observed-value map (`lov`) and observer sets; constrain observations with program order, coherent order, and happens-before rules (Section III and IV, pp. 3–5).
4. Refine again for HSA fences, acquire/release atomics, and then registers (Sections IV-A–C, pp. 5–6).
5. Instantiate fixed masters and programs for each litmus test as HSAM6, prove the refinement obligations with Rodin, and use ProB for finite-state checking (Sections II and V, pp. 2, 6).

Verus form (Inference: the paper uses Event-B, not Rust/Verus): represent each refinement state as a Rust datatype or state-machine state; executable transitions are `fn` methods with `requires` guards and `ensures` state updates, while mathematical relations and invariants are `spec fn` predicates. A Verus proof function can establish that a concrete transition simulates an abstract one; `assert` and lemmas replace Rodin proof obligations. Nondeterministic Event-B choices must become an explicit scheduler or quantified specification because executable Rust cannot choose an arbitrary event without a model.

Evidence: The abstract explicitly says, “We use the Event-B language to build a provably correct hierarchy of models from the most abstract to a detailed refinement of HSA that is close to implementation level.” The paper reports that Rodin verifies “the entire hierarchy of models using proofs to establish that each refinement is correct” (Abstract, p. 1). No denominator for proof success is supplied, so completeness of the reported proof statistics cannot be assessed.

Limits and assumptions: Event-B models arbitrary numbers of masters, but the ProB checks are finite instantiations. The model assumes the HSA ordering definitions and does not prove hardware implementation correctness. Inference: translating the hierarchy to Verus requires choosing finite representations and proving that the Rust scheduler implements every allowed abstract interleaving; those obligations are additional to the paper’s Event-B proofs.

## technique: operational observation ordering
What it is: Define weak-memory behavior through Issue and Observe events and constrain observations with three relations: program order (po), coherent order (co), and happens-before (hb). Section III-B–D (pp. 3–4) gives the relations; for example, “Memory accesses from the same master are observed in the order they are issued by all masters.”

When to use it: Use this relation-based method when visibility is easier to specify as ordering constraints than as a single global sequence. It captures legal and illegal outcomes for loads and stores without committing to one microarchitecture.

How to do it: (1) Model each memory access as issued before it can be observed. (2) Track, per master and address, the last observed store (`lov`). (3) For a store observation, update `lov` and the store’s observer set; the paper’s `ObserveStore` guards require issued, store-typed, and not-yet-observed-by-that-master. (4) For a load, return the value from `lov` and enforce po/co/hb guards. (5) Add fences: accesses before a fence must be observed before a later load, and add `after` links for the corresponding store/load relation (Section IV-A, pp. 5–6). (6) Add SC acquire loads and release stores by refining Issue/Observe events (Section IV-B, p. 6).

Verus form (Inference): encode `lov` and observer sets in ghost state or a Verus state machine, with transition preconditions for each guard and postconditions for updates. Use `requires`/`ensures` on transition functions and a state invariant proving `observed ⊆ issued`; represent po/co/hb as `spec fn` relations and prove acyclicity or ordering lemmas. Do not write Event-B’s `invariant(...)` or `modifies`; those are not Verus constructs.

Evidence: The paper’s example rules prohibit the register outcome `(p2:R1 = 1 and p2:R2 = 0 and p3:R1 = 1 and p3:R2 = 0)` because the induced ordering is cyclic (Section III, pp. 2–3). This is a logical exclusion, not a measured test rate. The model’s `ObserveLoadHappensBeforeWithFence` and `ObserveLoadAfterStoreWithFence` events provide concrete guards and actions (Section IV-A, pp. 5–6).

Limits: The paper omits some routine event details (“Similarly, we specify the two cases of LOAD observation without a FENCE ... Details are straightforward and are ommited for brevity,” Section IV-A, p. 6). Inference: a Verus implementation must supply those omitted transitions and prove their interaction, so the paper is a design pattern rather than a complete Rust proof.

## technique: executable litmus-test refinement and checking
What it is: Constrain the generic model to a fixed set of masters and program instructions, generate an Event-B context and invariant from a compact notation, and exhaustively model-check the outcome with ProB. Section V-A (p. 6) says: “To make it easier to verify litmus tests, we introduce a tool-supported notation with which the litmus test and the invariant can be represented and an Event-B context and invariant is generated automatically from this description.”

How to do it: (1) Write each thread as `st`, `ld`, and `fence` lines and state a forbidden or required register predicate (Figure 11, p. 6). (2) Generate constants mapping instruction identifiers to program positions and masters. (3) Define an invariant guarded by the set of observed loads; the example requires `{I21, I23, I31, I33} ⊆ observed` and negates the prohibited register conjunction (Section V-C, p. 6). (4) Run ProB model checking over every enabled interleaving. (5) Treat an invariant violation as a counterexample execution.

Verus form (Inference): represent a litmus program as a ghost sequence of instruction records and implement a bounded interpreter. State the expected outcome as a `spec fn` predicate over register state; prove `ensures` that any terminal execution satisfies it. For finite tests, a proof over an explicit sequence or an inductive loop invariant substitutes for ProB’s state-space enumeration. The paper’s generated Event-B context has no direct runtime Rust equivalent.

Evidence: The paper reports that when all four loads are observed, ProB verifies the invariant forbidding the outcome (Section V-C, p. 6). It gives no count of explored states or runtime, so the denominator and performance setting are unavailable.

Limits: Exhaustive checking applies to each finite litmus instantiation, not arbitrary programs. Inference: a Verus proof of one bounded interpreter run does not by itself establish the full HSA memory model; a separate refinement/simulation theorem is required.

## technique: coverage-guided legal-outcome and regression-test generation
What it is: Add a coverage relation over register combinations, prove that every legal combination is reachable and the illegal one is absent, then ask ProB to generate a concrete test for each uncovered point and for selected event coverage. Section V-D (p. 7) defines `coverage ∈ REGCOVER ↔ REGCOVER` and four combinations C0–C3 per master.

How to do it: (1) Define the register-combination universe (C0 = 00, C1 = 01, C2 = 10, C3 = 11). (2) Initialize coverage empty and add `CoverRegisterValues` when all loads are observed and a pair has not been covered. (3) Re-run exhaustive model checking with coverage enabled. (4) Select a target predicate such as all registers zero and request ProB’s `CoverRegisterValues` event (Section V-E, p. 7). (5) Export each generated sequence of `IssueLoad`, `IssueFence`, and related operations as a regression test. (6) Relax fixed instruction constraints to generate a wider class of tests while retaining masters, registers, and addresses (Section V-G, p. 8).

Verus form (Inference): maintain a ghost `Set<(Reg,Value)>` coverage state and prove an invariant that every recorded pair corresponds to a reachable terminal state. A proof function can show that adding a new pair preserves set well-formedness; a separate test generator can enumerate finite schedules outside verification. Verus proves the coverage bookkeeping and outcome predicate, not completeness of an external generator unless that generator is itself modeled and verified.

Evidence and numbers: For two masters with four register combinations each, the paper says “Coverage point 15 represents the initial value of the coverage relation. Note that otherwise all 15 possible combinations have been covered and the illegal combination is not covered.” The denominator is 16 total pairs minus one prohibited pair = 15 legal combinations; the statement is for the single illustrated litmus model, not all HSA programs. Figure 12 shows one six-instruction generated test. No test-count total or hardware regression result is reported.

Limits: Coverage is user-specified and only as complete as its chosen predicates. Inference: a product team must justify that the coverage model represents meaningful failure modes; proving all selected combinations does not prove architectural completeness.

## what stays trusted and product threat
Trusted elements include the HSA natural-language specification, Event-B/Rodin semantics, Rodin proof-condition generation and prover, ProB model checker, the translation from generated tests to hardware/software test harnesses, and the assumption that the modeled events match the implementation. The paper proves model refinement and checks finite instances; it does not prove the HSA hardware, compiler, or test harness. Inference: for VeruLaw (agents writing Rust verified with Verus), the strongest reusable idea is staged abstraction plus explicit memory-order relations and generated litmus tests. The product threat is medium for concurrent libraries: an agent could produce Rust that passes local functional contracts while violating weak-memory ordering or missing legal interleavings unless an Event-B-like state machine, po/co/hb invariants, and litmus regression suite are part of the specification. The paper does not show automatic contract synthesis for Rust, so it is a method precedent rather than a direct competing verifier.

## what VL should not redo
The paper already supplies a refinement-based operational framework for weak memory, a compact litmus notation, model checking of forbidden outcomes, and coverage-driven test extraction in one model. Rebuilding those ideas as a new generic Event-B workflow would duplicate prior work. A new VL contribution would need to connect the same obligations to executable Rust/Verus code, quantify proof effort, and validate generated tests against real implementations.

## contradictions or missing accounting
The abstract calls the approach “completely new,” but Section VI cites earlier abstract-architecture and partial-order memory-model work; that novelty claim is the authors’ opinion, not an independently measured comparison. The paper gives the 15-combination coverage count and one generated test, but no denominator for the number of model states, proof obligations, or regression tests, so scalability cannot be inferred. The text says “ommited for brevity” for several fence events, leaving implementation detail unspecified.

## techniques for the catalog
- refinement hierarchy: prove increasingly concrete weak-memory models preserve an abstract Issue/Observe specification
- po/co/hb observation ordering: encode program, coherent, and happens-before constraints on memory observations
- litmus refinement and model checking: generate fixed-thread Event-B instances and exhaustively check register outcomes
- coverage-guided test generation: track legal register combinations and use ProB to emit regression sequences
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
