# From Resource Flow to Executable Tests: Petri-Net-Guided LLM Test Generation for Concurrent Stateful Rust APIs
(authored by agents unless marked 🧑)
Tag: `zhang2026resource`, [paper](http://arxiv.org/abs/2607.21530v1)

## scope and claimed contribution

The paper presents SyncPetri, a workflow for generating executable tests for concurrent, stateful Rust APIs. It models resources, lifecycle conditions, causal dependencies, conflicts, and boundary mutations in a colored Petri net. It then gives the model-produced scenario to an LLM as a constrained intermediate representation, repairs generated Rust structurally, shapes scheduler harnesses around model conflicts, and judges executions with structural, outcome, invariant, and liveness oracles. The authors state: “We present a Petri-net-guided methodology for test generation over concurrent stateful Rust APIs.” (Abstract, p. 1.) They explicitly position this as testing rather than automatic verification: “not fully automatic concurrency verification, but a testing architecture that trades some modeling effort for stronger semantic control over generated tests.” (Introduction, p. 2.)

Inference: for VL, the useful lesson is a separation boundary: a formal model and executable oracle constrain what an agent may mean, while an LLM supplies Rust syntax and scaffolding. The paper does not prove the target library correct; it detects executions that violate a model supplied by a human.

## technique 1: colored resource-flow model

What it is. The API abstraction is (A=(R,O,Σ,Ω)), where resources, operations, typed arguments/results, and observation classes are explicit. It is compiled to a colored Petri net (N_A=(P,T,F,χ,λ,g,u,M_0)). Places carry typed token multisets such as `LiveSender`, `Open`, `Permit`, `Cap`, `Buf`, and `Obs`. A transition is enabled only when its guard is true and all input tokens are present; firing consumes input tokens and applies its update. Table 1 gives the bounded MPSC places, including “Permit(s,c) Sender s holds a reserved permit on channel c” and “Cap(c,n) Channel c has n unreserved buffer slots.” (Section 2, Table 1, p. 2.)

When to use it. Use this model for APIs whose behavior depends on ownership, lifecycle, capacity, buffered state, or concurrent handles. The paper lists Tokio `mpsc`, `watch`, `broadcast`, and `Semaphore` as examples. It targets four fault families: precondition enforcement, post-state inconsistency, race sensitivity, and liveness/blocking. (Sections 2 and 2.1, pp. 2–3.)

How to do it.

1. Define resource sorts, operations, typed results, and observation classes. (Section 3.1.)
2. Define places and the initial marking (M_0). Add guards and token-update functions to each transition. (Section 3.1.)
3. Reuse transition schemas where possible. The paper gives `clone`, `reserve`, `close`, and `consume`; a near-legal mutation violates exactly one guard or token condition. (Section 3.3.)
4. Check reachability by firing enabled transitions. The paper’s running example reserves a capacity-one MPSC permit, producing `Permit(P0,c)` and `Cap(c,0)` before the close/commit race. (Section 2.2.)

Verus form. Inference: represent the abstract marking as a ghost/spec state, with token counts and resource identities in `Seq`, `Set`, or maps; define `spec fn enabled` and transition functions; use `requires` for guards, `ensures` for token conservation and post-state updates, and `invariant` clauses in a loop or proof. A Rust adapter can update concrete Tokio objects, while a proof function relates a marked event to the abstract transition. The paper is not about Verus, so the exact encoding and any Tokio contracts are an inference. Do not treat the Petri net as a runtime verifier or call proof code from production code.

Evidence and limits. The paper reports no theorem that the model is complete for an implementation. It requires manually authored resource models, adapters, and scenario invariants (Introduction, p. 2). The model can therefore omit a relevant resource or encode an incorrect contract. Inference: this is a specification-trust boundary for VL; the model and adapter remain trusted inputs unless separately verified.

## technique 2: legal, near-legal, and partial-order scenarios

What it is. A scenario is (S=(E,≺,#,η,β,Φ)): events, necessary causal edges, conflict pairs, transition mapping, bindings, and expected outcome predicates. Legal traces reach uncommon markings. Near-legal traces consist of a legal prefix followed by one event that violates exactly one precondition. Partial-order scenarios leave independent events unordered and preserve only necessary causality. The paper says: “These begin as legal event sets, but independent steps are left unordered.” (Section 4.1, p. 4.)

How to do it. Algorithm 1 starts at (M_0), computes enabled and near-legal candidates, chooses a depth-maximizing enabled transition, adds causal edges induced by token production/consumption, adds conflicts induced by shared resources, and fires the transition. For a near-legal family, it selects one candidate at the mutation point and stops. For a partial-order family, it removes unnecessary order edges while preserving causality. (Section 4.2, Algorithm 1, p. 4.) Score legal prefixes with marking novelty, structural coverage, and conflict exposure. Score boundary candidates with the paper’s `MutScore`, which rewards a one-condition violation, stale-resource reuse, and placement near a conflict frontier. (Section 4.2.)

Running example. The seven events are reserve, spawn, permit-send, close, receive, ordinary try-send, and receive-end. The required edges include (e_1≺e_2≺e_3), (e_1≺e_4), and (e_4≺e_5≺e_6≺e_7); (e_3) and (e_4) are a conflict pair. The allowed classes include `SendOk` for the permit send, `ClosedLike` for the post-close ordinary send, and `End` for final receive. (Section 2.2.)

Verus form. Inference: encode events and order as ghost sequences or relations, and prove that each generated prefix preserves the transition preconditions. A `proof fn` can establish that one abstract firing preserves a marking invariant; a loop invariant can establish that every emitted event has a predecessor-complete causal prefix. Partial-order enumeration itself is a generator concern; Verus can verify each concrete harness against its selected abstract linearization. The paper does not provide Verus code.

Failure boundary. A near-legal test checks one specified boundary, not arbitrary invalid input. Inference: a VL generator should preserve the one-fault mutation rule so that a failure remains diagnosable.

## technique 3: adapter and local-faithfulness contract

The adapter schema is (A_d=(Ctor,Step,Spawn,Mark,Assert,Cleanup,Γ,ρ_d)). It constructs objects, maps modeled transitions to Rust operations, packages spawned tasks, emits markers, instantiates assertions, bounds teardown, maps concrete results to observation classes, and abstracts concrete state to a marking. The paper states: “We do not require a full bisimulation between implementation and model.” (Section 3.2, p. 3.) Instead, each legal modeled step must produce a concrete result and an observation in its allowed token class; each near-legal step must produce an explicitly classified error outcome.

How to apply it. Define one adapter per API family. Map concrete outcomes through (Γ) into the finite observation classes used by (Φ). Keep the contract local to event boundaries, rather than reconstructing hidden implementation state. Add bounded cleanup so hanging tasks become liveness failures. Inference: a Verus version would give the adapter’s `step` a `requires` clause corresponding to the abstract marking, and `ensures` relating its postcondition and observation token to the transition result. If the adapter uses `external_body`, that function becomes trusted and the guarantee stops at the boundary; the paper does not discuss Verus trust annotations.

## technique 4: constrained LLM concretization and repair

The LLM receives a typed prompt (P(S,A_d)=(Hdr,Res,Ev,Ord,Conf,Obs,Out,Ban)). It includes resource declarations, typed events, order edges, concurrency hints, expected outcomes, and banned behaviors such as invented events or weakened assertions. The generated artifact (Y=(c,μ,a)) contains Rust code, event-marker mapping, and assertions. Admission requires compilation, one marker for every event, and no invented events. (Section 5.1.)

Algorithm 2 retries up to a bound: build the prompt, call the LLM, feed compiler diagnostics back on compilation failure, feed structural diagnostics back when marker coverage is incomplete, and return only an artifact that passes. The paper’s rule is: “the LLM may choose syntax, helper names, and local scaffolding, but it may not invent new semantic events, relax order constraints, or redefine the expected outcome classes.” (Section 5.1, p. 5.)

Inference: for VL, this is a practical agent protocol. Give the model a typed scenario, force explicit markers and assertions, compile, and repair only compiler or structural defects. A Verus adaptation would add proof obligations and reject generated code until `requires`, `ensures`, loop invariants, and proof blocks compile. The scenario remains the semantic authority; generated Rust remains an implementation candidate.

## technique 5: conflict-first schedule shaping

The model supplies a ready frontier of events whose predecessors have run. For each candidate, `prio` rewards the number of uncovered conflict partners and rare transitions and penalizes already seen prefixes. Algorithm 3 repeatedly chooses the highest-priority ready event, inserts yield or barrier hooks around conflicting incomparable pairs, and emits a bounded set of harness variants. Loom then explores micro-interleavings within each selected skeleton; the Petri layer chooses which skeletons receive budget. (Section 6, Algorithm 3.)

Inference: this can focus Verus-backed concurrency tests on semantically meaningful races while leaving scheduler search unchanged. It does not prove all schedules were explored. The paper explicitly says the improvement is above Loom, not inside Loom (Section 6).

## technique 6: layered semantic oracle and failure triage

The trace records markers and observations. Four layers are conjoined: structural order/coverage (O_{str}), allowed outcome classes (O_{out}), global invariants (O_{inv}), and bounded termination (O_{live}). Classification is `ConcretizationError` when structure fails, `SemanticFailure` when structure passes but semantic layers fail, and `Pass` otherwise. (Section 7, Table 3.) This prevents a malformed generated test from being reported as an API bug.

Inference: a Verus-oriented oracle can check ghost event traces and postconditions, but runtime observations, scheduler behavior, and Tokio internals remain outside a pure proof unless separately specified. The paper’s oracle depends on local faithfulness, immediate marker emission, and no spurious markers (Section 7); violating these assumptions invalidates its soundness intuition.

## evidence, trust, and product threat

The evaluation is preliminary and has one bounded Tokio MPSC subject, one seven-event scenario, and one repaired generated runner. Table 4 reports compilation passed, two legal schedules, three runtime executions, 14 records per execution, and no evaluator findings. The paper says each execution emits the same 14 records, split evenly across the two schedules (Section 8.2–8.3, Table 4). The authors report no mutant corpus, pure-prompt baseline, or schedule-exploration comparison (Section 8.6). Thus denominators are 2 schedules and 3 executions for this one scenario, not a broad benchmark.

What is proved or measured is feasibility of carrying one modeled scenario through generation, compilation, execution, and oracle checking. What stays trusted is the Petri model, adapter, scenario invariants, expected classes, generated test harness assumptions, Tokio/Loom/runtime behavior, compiler, and LLM output until checked. Inference: the direct threat to a product that emits agent-written verified Rust is medium for test quality and specification drift, but low as evidence of proof automation: this paper supplies a testing architecture, not a proof that generated Rust satisfies a Verus contract. The strongest reusable idea is to make an agent produce code only from a typed semantic artifact and to classify structural generation failures separately from implementation failures.

## contradictions and prior work VL should not redo

The paper’s central claim is intentionally narrow: it does not replace Loom or eliminate modeling effort. Its evaluation supports feasibility, not statistical superiority. Inference: VL should not redo generic claims that Petri nets express causality/conflict, that LLMs can emit Rust, or that Loom explores interleavings. A new VL contribution would need a verified relation between a concrete Rust/Verus state machine and the model, plus evidence across multiple APIs or mutants.

## techniques for the catalog

- colored resource-flow Petri net: model ownership, capacity, lifecycle, conflicts, and observations as typed token transitions
- legal and near-legal scenario synthesis: generate deep legal prefixes and one-condition boundary mutations with partial-order conflicts
- local-faithfulness adapter: map abstract events to concrete Rust operations and classify observations without requiring full bisimulation
- constrained LLM concretization: compile and structurally repair generated Rust while forbidding invented events and weakened assertions
- conflict-first schedule shaping: allocate Loom or deterministic scheduler budget to high-conflict partial-order harnesses
- layered semantic oracle: separate structural concretization errors from outcome, invariant, and liveness failures
Checked 2026-10-15 against paper zhang2026resource: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
