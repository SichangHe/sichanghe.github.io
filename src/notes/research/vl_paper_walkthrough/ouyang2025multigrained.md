# Multi-Grained Specifications for Distributed System Model Checking and Verification
(authored by agents unless marked 🧑)
Tag: `ouyang2025multigrained`, [paper](https://doi.org/10.1145/3689031.3696069)

## central method
The paper verifies an evolving Java ZooKeeper implementation with TLA+ and TLC while keeping model size manageable. Fine-grained specifications expose code-level interleavings but can explode the state space; coarse specifications scale but leave model-code gaps. The solution is to write composable specifications at different granularities and compose a mixed-grained model for each verification scenario. The paper states: “The fundamental challenge is to balance the granularity of specifications and the scalability of model checking—fine-grained specifications lead to state-space explosion, while coarse-grained specifications introduce model-code gaps.” (Abstract, p. 1)

Inference: for Verus, the analogous choice is between a detailed executable-state model and abstract state-machine predicates. Keep changed or risk-heavy modules concrete, abstract stable modules behind interaction contracts, and check that the abstraction preserves every visible effect.

## technique 1: interaction-preserving coarsening

When to use: coarsen a module when its internal steps are not the verification target, but other modules depend on some of its state or messages.

Steps from the paper:

1. Partition the protocol into modules or phases. Zab's phases are Election, Discovery, Synchronization, and Broadcast (Section 3.3, p. 7).
2. Collect each module's dependency variables from its actions' enabling conditions. Recursively include variables used by that module's actions to calculate updates to those dependency variables (Appendix B.2, Definition 2, p. 15).
3. Start the interaction-variable set with dependency variables shared by modules. Recursively add variables outside a module's dependency set that any action uses to calculate an interaction variable or that module's other dependency variables (Appendix B.2, Definition 3, pp. 15–16).
4. Hide internal variables that have no external effect. In the Election example, `currentVote` is local and can be abstracted (Section 3.2, p. 6).
5. Preserve the target module's dependency variables, all interaction variables, and their updates. Omit only other variables and updates involving only those variables. The Election/Discovery example replaces eight actions with one coarse action (Section 3.2, pp. 6–7; Appendix B.2, p. 16).
6. Check invariants on the resulting mixed model with TLC. The paper's composition uses a disjunction of possible actions and existentially chooses participating servers, preserving nondeterminism (Section 3.3, p. 7).

Inference: in Verus, represent each module with a `spec fn` transition relation and define a projection onto dependency and interaction variables. Prove that coarsening preserves the projected traces after omitting steps that leave the projection unchanged. Prove invariant preservation separately. An inductive proof can cover arbitrarily long executions of the modeled transition system; it does not enumerate their traces.

Evidence and limit: the authors state: “In this work, coarse-grained and fine-grained specifications do not have abstraction-refinement relations due to model-code gaps.” (Section 3.2, p. 6) Their Interaction Preservation Theorem instead equates trace sets projected onto the target module. Appendix B defines the projection using dependency and interaction variables, removes transitions that leave it unchanged, and gives a proof sketch assuming the same projected initial state and deterministic next-state updates (pp. 15–17). Inference: applying this argument in Verus requires proving those conditions for the chosen models; a conventional refinement relation cannot simply be assumed.

## technique 2: mixed-grained composition for targeted changes

When to use: verify a local code change or bug fix without rebuilding a fully fine-grained model of the whole system.

Steps: select a fine-grained specification for each changed or concurrency-sensitive module; select conformed coarse specifications for unchanged modules; compose them through a next-state action; attach protocol and code-level invariants; run TLC; and use the model trace to replay the corresponding implementation trace (Sections 3.5.1 and 4, pp. 8–9). The paper's log-replication example uses coarse Election/Discovery, fine Synchronization, and Broadcast actions (Figure 7, p. 7).

Remix currently chooses module specifications manually. If no suitable granularity exists, developers write a new specification and add it to the framework (Section 3.5.1, p. 8). TLC reports parsing or semantic composition errors.

Inference: in Verus, make the mixed state a product of module views, with a `spec fn` projection for each module. Reuse transition lemmas for unchanged modules and prove that the changed module preserves cross-module invariants. A proof function can combine those lemmas under a conjunction invariant. Selecting the module models remains a developer decision.

Evidence: the authors report: “We detected six severe bugs that violate five types of invariants and verified their code fixes; the fixes have been merged to ZooKeeper.” (Abstract, p. 1) Two bugs were already known; four were new (Appendix A, p. 14). Their setup uses three nodes, up to four transactions, up to three node crashes, and up to three network partitions (Section 4.4, p. 10). The separate efficiency comparison uses three servers, two transactions, two crashes, and two partitions (Table 5, p. 11). Table 4 reports the fastest specification for each bug, detection times of 9–109 seconds, trace depths, distinct states, and first violated invariants (p. 11). The baseline system specification could not finish in ten days with three nodes, three transactions, up to three crashes, and up to three partitions (Section 2.3, p. 4). Inference: these measurements demonstrate the approach on ZooKeeper, without establishing detection coverage for all possible bugs.

## technique 3: deterministic conformance checking and replay

When to use: use conformance checking when a model is intended to describe existing code and model-code gaps are a primary risk.

Steps from the paper:

1. Randomly explore model-level states for a predefined time budget, for example 30 minutes, to obtain traces (Section 3.5.2, p. 8).
2. Map every model action to code events marking its beginning and end (Section 3.5.3, p. 8).
3. Instrument the implementation and have a central coordinator schedule code actions one at a time, injecting faults when needed (Section 3.5.3, p. 8).
4. Replay each sampled model trace. Report a discrepancy if a model variable differs from its code counterpart, or an enabled model action's code counterpart does not occur within 50 seconds (Section 3.5.2, p. 8).
5. For a discrepancy, revise the specification or action mapping and repeat conformance checking. For a safety violation, replay the violating trace in code to confirm and debug it (Sections 3.4 and 3.5.3, pp. 7–8).

The paper explicitly limits the checker: “Our conformance checker is not guaranteed to detect all discrepancies through random exploration, similar to prior work [35, 40, 94].” (Section 3.5.2, p. 8) It also says conformance is unsound because behavior not modeled by the specification may be missed, and that it checks safety rather than liveness (Section 3.4, p. 8).

Inference: in Verus, define a trace as a sequence of typed actions and a `spec fn` that projects an implementation event to a model event. Verify local correspondence lemmas for instrumented actions and an inductive invariant over replay. Use `ensures` to state that coordinator scheduling preserves the permitted interleaving. External Java/RPC execution remains an assumption; Verus cannot prove that an AspectJ hook intercepts every relevant event without a model of the runtime.

Evidence: conformance checking found inconsistent message types, incorrect conditional branches, and wrong variable assignments (Section 3.4, p. 7). Remix replays each model trace that violates a safety property to confirm the violation in the implementation (Section 3.5.2, p. 8). For four proposed fixes, updated mSpec-3+ models exposed invariant violations within five minutes (Section 5.3, Table 6, pp. 11–12). The final implementation orders history updates before epoch updates; the updated mixed specifications passed model checking (Section 5.4, p. 12).

## what is proved, measured, and trusted

TLC checks safety invariants over configured state spaces, subject to exploration limits. The authors define ten protocol invariants and four code-level invariant types containing eleven instances (Section 4.2, Table 2, pp. 9–10). Conformance checking compares sampled model traces with instrumented code and checks safety rather than liveness (Sections 3.4–3.5.2, p. 8). Inference: the evidence depends on the specifications, invariant definitions, action-to-code mappings, instrumentation, TLC, and runtime behaving as intended. Random trace sampling gives incomplete conformance coverage. A Verus proof can establish modeled transition and invariant properties, but the specification-to-implementation mapping still needs validation.

## what VL should reuse and what it should not redo

Inference: VL should reuse interaction-variable analysis, mixed-granularity composition, deterministic trace replay, and separate reporting of safety evidence and conformance coverage. It should not claim that a passing replay proves unmodeled behavior absent; the paper states the checker is unsound and random exploration incomplete. For agent-written verified Rust, the major threat is a coarse abstraction that hides a concurrent interleaving or a mapping that omits an externally visible event.

## techniques for the catalog

- interaction-preserving coarsening — abstract internal module steps while preserving dependency and shared interaction variables
- mixed-grained composition — combine fine specifications for changed modules with coarse specifications for stable modules
- continuous conformance checking — replay model traces against implementation traces and revise mismatches iteratively
- deterministic fault replay — coordinate code-level interleavings and inject faults to reproduce model safety violations
- modular invariant reuse — attach protocol and code-level invariants to composed specifications at the needed granularity

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "With BFS, once an invariant is violated, we can obtain the buggy trace with minimal depth."): checked all quotations, numbers, section/page references, and technique steps against the full text, including appendices and references; corrected the paper link, recursive interaction-variable rules, trace-equivalence guarantee, setup citation, Table 4 description, conformance quotation, and Verus inferences; did not execute the artifact, reproduce experiments, or independently validate the proposed Verus adaptations.
