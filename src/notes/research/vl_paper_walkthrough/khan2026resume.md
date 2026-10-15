# Resume Means Resume: A Machine-Checked Conformance Contract for Checkpoint, Interrupt, and Resume Semantics in Workflow Persistence Layers
(authored by agents unless marked 🧑)
Tag: `khan2026resume`, [paper](https://doi.org/10.48550/arxiv.2608.03836)

## scope and result
The paper defines a resume-plane contract for systems that checkpoint execution, park interrupts, and resume after input, crashes, or restore. Its abstract says: "The R ESUME C ONTRACT states six properties over the persistence API — prefix continuation, effect exactly-once, fork determinism, checkpoint validity, consume-once, recovery determinism — plus fork-intent and liveness obligations." It separates what is proved, machine checked, measured, and merely implemented. The TLA+ reference model checks all six properties; TLC reports 87 generated and 59 distinct states in the reference configuration, and the scaled configuration reports 7.4×10^6 distinct states. TLAPS discharges the reference conjunction with 196 obligations. The paper explicitly says: "Not claimed: minimality or completeness of the property set; prevalence rates for any violation; that the probed frameworks represent the ecosystem; that any framework fails a property it is not measured on."

## technique 1: write an observable resume contract
What it is: define the smallest public interface and state invariants before testing implementations. A run executes ordered tasks, one task is interrupt gated, completion appends a checkpoint and advances a durable frontier, crash erases volatile state, and recovery chooses a continuation from the durable log.

When to use it: use this for any workflow that combines side effects, human approval, checkpoint persistence, retries, crash recovery, or branch creation. It makes a framework's written promise testable without depending on its internal graph representation.

How to apply it:
1. Define prefix continuation (PC): recover from the durable frontier or a deterministic reconstruction of it. Memoized replay is allowed only when effects come from the durable record (Section 3.2).
2. Define effect exactly-once (EO) as at-most-once external effects over crashes, interrupts, and resumes, then pair it with a liveness obligation for exactly-once (Section 3.2).
3. Define fork determinism (FD): a forked resume value must determine the branch outcome through a function `f` (Section 3.2).
4. Define checkpoint validity (CV): reject a schema-invalid record before storing it (Section 3.2).
5. Split consume-once into consumption count (CO-c) and effect inertness for duplicate delivery (CO-e); the paper warns that a gate can serve an effect idempotently yet consume an approval twice (Section 3.2).
6. Define recovery determinism (RD): equal durable logs must produce equal recovery decisions (Section 3.2). Add fork-intent expressibility (FI), a wire discriminator between retry and fork (Section 3.3), and weak-fairness liveness.

The paper proves the protocol limitation in a precise lemma: "On a wire protocol whose resumes carry no branch discriminator — none in the accepted traffic, transport metadata included; Remark 2 delimits the scope — no responder — deterministic or randomized — satisfies both FDι and COι." The construction gives the same durable state and wire trace for a duplicate and a deliberate fork, so the responder cannot distinguish them.

Verus form: Inference: represent the durable log, frontier, effect counters, consumed interrupt, and branch key as Rust structs; use `spec fn` predicates for PC/EO/FD/CV/CO/RD, `requires` for valid state and `ensures` for transitions, and `proof fn` lemmas for invariant preservation. Use `#[verifier(external_body)]` only for an explicitly trusted storage or OS boundary, never on the recovery function itself. The Verus guide's state-machine pattern is the natural encoding; the paper's TLA+ exhaustive model remains a separate model unless a refinement relation is proved.

Evidence and limits: the paper's fault matrix has 39 TLC runs (including the state-rebuild and separation modules). Single-fault counterexamples occur at depth 4–7; the reference row is 87/59 states with no error. The scaled row is 14.7 million generated and 7.4 million distinct states. These are exhaustive for the stated finite constants, not an unbounded proof of every fault footprint. TLAPS proves only the reference conjunction unbounded under the module assumptions. FI is not model checked because it is an API obligation.

## technique 2: separate properties with fault models
What it is: introduce one fault switch per suspected mechanism, run every switch against every property, and use clean off-diagonal rows as independence witnesses. The matrix distinguishes a replay fault (EO, PC, CO), fork-ignore (FD), invalid persistence (CV), nondeterministic recovery (EO, PC, CO, RD), double consume (EO, CO), and prefix replay (EO, PC).

How to apply it: implement the reference transition system; add one controlled fault; run TLC for each invariant; record state counts and shortest counterexample depth; add a companion module when the base atomic action cannot express a production race. The paper's CO-c witness adds a consumption counter and a second racer that reads the waiting flag before the first clearing write.

Evidence: ForkIgnore satisfies EO, PC, CV, CO, and RD while violating FD; InvalidPersist isolates CV; StateRebuild separates PC from EO; Redeliver isolates EO; CO-e is structurally implied by EO, while CO-c is independently violated. Inference: this technique tells VL which property a Rust API contract actually buys, instead of collapsing recovery into one “safe” bit.

## technique 3: deterministic conformance probes
What it is: drive framework persistence APIs with pure Python sequences and an external durable effect ledger. The paper states: "Every probe is a pure-Python protocol sequence over framework persistence APIs — no LLM calls, no timing windows." Crashes are exception-based in the matrix and reproduced with barrier-synchronized SIGKILL; effect counters and an on-disk ledger provide the oracle.

How to apply it: pin framework versions; write probes for each property; record raw and stable-view JSON; use a durable single-row effect append for crash tests; compare duplicate, fork, validity, and recovery paths. Test sequential and concurrent delivery separately. The study probes LangGraph 1.2.9, LlamaIndex Workflows 2.22.2, CrewAI 1.15.2, pydantic-graph 1.107.1, and AutoGen AgentChat 0.7.5.

Evidence: LangGraph re-executes completed work after a crash (effect ledger 1→2), its fork value is ignored, and invalid state is silently persisted; CrewAI re-executes completed effect-bearing methods; pydantic-graph cannot resume after a mid-node crash; AutoGen rejects tampered state. Cross-process consume-once duplication occurs 10/10 on both durable backends, and cross-host racers also duplicate 10/10. The paper reports no two probed frameworks sharing a conformance profile. These are pinned-path measurements, not ecosystem prevalence.

## technique 4: repair at the decision seam
R EMIT interposes at the checkpointer interface. It uses an append-only effect ledger, prefix-monotone commit gate, `⟨checkpointId, resumeIndex⟩` branch keys, validity rejection before persistence, and recovery as an order-independent function of the durable log. The paper states: "R EMIT ships as an installable package (remit-contract; MIT) with a deliberate division of labor: every contract decision is computed in Rust; Python translates types and applies verdicts."

How to apply it: keep the Rust core decision-free and expose typed exceptions through PyO3; make the veneer only extract configuration and route core verdicts; gate validity before delegating to the saver; decide fork and duplicate behavior on the durable read path. For cross-process consume, claim `(thread, checkpoint)` in a shared store with compare-and-swap before executing a node.

Evidence: Verus files report zero errors for ledger/frontier, CV, FD, RD, recovery, and executable gates; differential tests cover about 70k sequences, and the composite TLA+ correspondence explores 6,110 states/13,035 transitions at R0 and 414,675 states/1.07×10^6 transitions at scaled bounds. The shipped cross-process gate yields `{1:10}` on both durable backends and across two hosts, while the default path yields duplication. The authors explicitly omit a Verus refinement from model to compiled core. Inference: VL can reuse the seam pattern for a verified Rust recovery decision core, but must separately prove its storage and binding correspondence.

## what is proved, trusted, and left open
Proved: the FD–CO impossibility lemma, finite-state reference invariants, separation witnesses, and (with TLAPS) the reference conjunction. Machine checked: TLA+ states and Verus R EMIT components. Measured: framework behavior on pinned probes. Trusted: TLA+/TLC/TLAPS, Verus and Z3, framework persistence backends, and the stated model assumptions. Inference: the threat to agent-written verified Rust is high when retries and approvals share an undifferentiated API; a proof of task code alone cannot establish EO or CO across a store and multiple processes.

## techniques for the catalog
- resume contract — state PC, EO, FD, CV, CO-c/CO-e, RD, FI, and liveness over observable persistence APIs
- fault-matrix separation — discover property independence with one controlled fault and exhaustive finite model checking
- deterministic conformance probing — use pure API traces, durable effect ledgers, and synchronized crash injection
- verified decision seam — enforce validity, branch identity, and consume claims in a Verus-checked Rust core at the read/decision path

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
