# Multi-Grained Specifications for Distributed System Model Checking and Verification
(authored by agents unless marked 🧑)
Tag: `ouyang2025multigrained`, [paper](https://www.semanticscholar.org/paper/e5d626ce2f7272bc2165c8c2b7610a064b5ef62a)

## central method
The paper verifies an evolving Java ZooKeeper implementation with TLA+ and TLC while keeping model size manageable. Fine-grained specifications expose code-level interleavings but can explode the state space; coarse specifications scale but leave model-code gaps. The solution is to write composable specifications at different granularities and compose a mixed-grained model for each verification scenario. The paper states: “The fundamental challenge is to balance the granularity of specifications and the scalability of model checking—fine-grained specifications lead to state-space explosion, while coarse-grained specifications introduce model-code gaps.” (Abstract, p. 1)

Inference: for Verus, the analogous choice is between a detailed executable-state model and abstract state-machine predicates. Keep changed or risk-heavy modules concrete, abstract stable modules behind interaction contracts, and check that the abstraction preserves every visible effect.

## technique 1: interaction-preserving coarsening

When to use: coarsen a module when its internal steps are not the verification target, but other modules depend on some of its state or messages.

Steps from the paper:

1. Partition the protocol into modules or phases. Zab's phases are Election, Discovery, Synchronization, and Broadcast (Section 3.3, p. 7).
2. For each action, identify dependency variables in its enabling condition, closing transitively over variables used to calculate them (Section 3.2, p. 6).
3. Define interaction variables as dependency variables shared by two modules (Section 3.2, p. 6).
4. Hide internal variables that have no external effect. In the Election example, `currentVote` is local and can be abstracted (Section 3.2, p. 6).
5. Preserve the target module's dependency variables and all interaction variables, and preserve their updates. Replace internal actions with one coarse action that has the same visible updates (Section 3.2, p. 6).
6. Check invariants on the resulting mixed model with TLC. The paper's composition uses a disjunction of possible actions and existentially chooses participating servers, preserving nondeterminism (Section 3.3, p. 7).

Verus form (Inference): represent each module as a state-machine struct with a `spec fn` transition relation and an abstract module relation over visible state. Prove a refinement-style lemma that each concrete step either corresponds to an abstract step or leaves the interaction projection unchanged. Use `requires` to state the module boundary and `ensures` to preserve shared fields. Keep local implementation fields private to the proof. A Verus proof function can establish invariant preservation for the mixed transition relation; it cannot by itself explore all executions unless the state space is bounded or the transition proof is inductive.

Evidence and limit: the authors say the coarsening “is interaction preserving” for Election and Discovery (Section 3.2, p. 6). They also warn that coarse and fine specifications “do not have abstraction-refinement relations due to model-code gaps” (Section 3.2, p. 6). The guarantee comes from shared invariants and preserved interactions, not from a general abstraction theorem.

## technique 2: mixed-grained composition for targeted changes

When to use: verify a local code change or bug fix without rebuilding a fully fine-grained model of the whole system.

Steps: select a fine-grained specification for each changed or concurrency-sensitive module; select conformed coarse specifications for unchanged modules; compose them through a next-state action; attach protocol and code-level invariants; run TLC; and use the model trace to replay the corresponding implementation trace (Sections 3.5.1 and 4, pp. 8–9). The paper's log-replication example uses coarse Election/Discovery, fine Synchronization, and Broadcast actions (Figure 7, p. 7).

Remix currently chooses module specifications manually. If no suitable granularity exists, developers write a new specification and add it to the framework (Section 3.5.1, p. 8). TLC reports parsing or semantic composition errors.

Verus form (Inference): make the mixed state a product of module views, with a `spec fn` projection for each module. Prove that unchanged modules satisfy their existing transition lemmas and that the changed module's new transition preserves cross-module invariants. A proof function can combine those lemmas under a conjunction invariant. This is modular proof reuse, not automatic model selection; the paper's manual selection policy has no Verus equivalent.

Evidence: the authors report six deep ZooKeeper bugs violating five invariant types and verified their fixes (Abstract, p. 1). They use three nodes, up to four transactions, up to three node crashes, and up to three network partitions for evaluation (Section 4, p. 9). The paper reports that the official system specification cannot finish in ten days under a three-node, three-transaction, three-crash, three-partition configuration (Introduction, p. 2), motivating the mixed approach. Table 4 reports bug-finding configurations and minimal traces, but the denominator is the six discovered bugs, not all possible bugs.

## technique 3: deterministic conformance checking and replay

When to use: use conformance checking when a model is intended to describe existing code and model-code gaps are a primary risk.

Steps from the paper:

1. Explore model-level states for a time budget, for example 30 minutes, to obtain traces (Section 3.5.2, p. 8).
2. Map every model action to code events marking its beginning and end (Section 3.5.3, p. 8).
3. Instrument the implementation and have a central coordinator schedule code actions one at a time, injecting faults when needed (Section 3.5.3, p. 8).
4. Replay each model trace and compare model variables with code counterparts, or report that an enabled model action never occurs within 50 seconds (Section 3.5.2, p. 8).
5. For a discrepancy, revise the specification or action mapping and repeat conformance checking. For a safety violation, replay the violating trace in code to confirm and debug it (Sections 3.4 and 3.5.3, pp. 7–8).

The paper explicitly limits the checker: “Our conformance checker is not guaranteed to detect all discrepancies through random exploration.” (Section 3.5.2, p. 8) It also says conformance is unsound because behavior not modeled by the specification may be missed, and that it checks safety rather than liveness (Section 3.4, p. 8).

Verus form (Inference): define a trace as a sequence of typed actions and a `spec fn` that projects an implementation event to a model event. Verify local correspondence lemmas for instrumented actions and an inductive invariant over replay. Use `ensures` to state that coordinator scheduling preserves the permitted interleaving. External Java/RPC execution remains an assumption; Verus cannot prove that an AspectJ hook intercepts every relevant event without a model of the runtime.

Evidence: the paper's conformance process found mismatched message types, wrong branches, and wrong variable assignments (Section 3.4, p. 7). It then confirmed model-checker safety traces by deterministic replay before debugging code (Section 3.5.3, p. 8). The authors found six severe bugs in ZooKeeper v3.9.1 and verified fixes (Section 5.1, p. 10); the result is a case study, not a measured defect-detection rate over a random sample.

## what is proved, measured, and trusted

TLC checks the stated safety invariants over the configured finite state spaces. Conformance compares selected model traces with instrumented code. Trusted elements include TLA+ specifications, invariant definitions, action-to-code mappings, coordinator instrumentation, TLC, the Java runtime, and the assumption that random traces cover useful behavior. Liveness is not checked. Inference: a Verus proof can reduce trust in transition and invariant code, but it does not remove the need to validate the specification-to-implementation mapping.

## what VL should reuse and what it should not redo

Inference: VL should reuse interaction-variable analysis, mixed-granularity composition, deterministic trace replay, and separate reporting of safety evidence and conformance coverage. It should not claim that a passing replay proves unmodeled behavior absent; the paper states the checker is unsound and random exploration incomplete. For agent-written verified Rust, the major threat is a coarse abstraction that hides a concurrent interleaving or a mapping that omits an externally visible event.

## techniques for the catalog

- interaction-preserving coarsening — abstract internal module steps while preserving dependency and shared interaction variables
- mixed-grained composition — combine fine specifications for changed modules with coarse specifications for stable modules
- continuous conformance checking — replay model traces against implementation traces and revise mismatches iteratively
- deterministic fault replay — coordinate code-level interleavings and inject faults to reproduce model safety violations
- modular invariant reuse — attach protocol and code-level invariants to composed specifications at the needed granularity

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
