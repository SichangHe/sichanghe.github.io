# Specula: Scaling formal specifications for autonomous model checking of system code
(authored by agents unless marked 🧑)
Tag: `cheng2026specula`, [paper](https://doi.org/10.48550/arxiv.2607.25333)
## paper result

Specula is an agentic pipeline that generates TLA+ models and invariants from system repositories, validates the model against code traces, model-checks safety and liveness, and reproduces violations in the implementation. The abstract calls it “a push-button agentic system that generates high-quality formal specifications for large, complex system code and uses these specifications for highly effective model checking and bug finding.” (§abstract, p.1) Its reported scale is 48 open-source systems and 249 bugs, but the evidence depends on generated specifications, model-code conformance, and developer confirmation.

The design addresses three independent risks in LLM-generated formalization: hallucinated behavior, a wrong abstraction level, and reward hacking that weakens a model until traces pass. The paper states: “Specula defines clear boundaries by pairing trace validation and model checking—the former ensures that the model admits code-level behaviors and the latter rejects invalid states.” (§1, p.2)

Inference: Specula checks an abstract TLA+ model, not the Rust implementation directly. A passing model check proves the TLA+ invariant for the explored model and fault model; it does not prove that the implementation satisfies the invariant unless trace validation and reproduction establish the relevant correspondence.

## technique 1: evidence-grounded invariant extraction

what it is. Agents extract protocol-level and code-level invariants from source, comments, documentation, issues, pull requests, commits, tests, and revision history. Each invariant is associated with a fault model and must cite concrete evidence. The paper says: “Specula enforces the AI agents to provide concrete evidence of where it derived the invariants from (e.g., code, issues, commits, and comments).” (§3.1, p.4)

how to apply it.

1. Read repository artifacts and summarize protocol invariants such as Raft election safety and log matching. (§3.1, p.4)
2. Infer implementation-specific invariants, for example monotone commit indexes, bounded capacity, and atomicity, from code and tests. (§3.1, p.4)
3. Attach evidence locations and the relevant fault model to each invariant. (§3.1, p.4)
4. Encode each invariant as a TLA+ predicate over model variables. (§3.1, pp.3–4)
5. Keep protocol and implementation invariants distinct: a deliberate implementation relaxation (MongoDB's in-memory commit guarantee) should produce a code-level invariant rather than an incorrectly strong protocol invariant. (§3.1, p.4)

The evaluation reports 21.1% of generated invariants at protocol level and 78.9% at code level. (Section 5.1, p.10) The evidence-source percentages have denominator “invariants” and overlap because one invariant can have multiple sources: implementation code/comments 87.35%, issue trackers/pull requests/advisories 74.34%, prior fixes/commits/tests 42.88%, and documentation/reference literature 20.04%. (Table 2, p.10)

Verus form. Inference: the same extraction stage can propose `requires`, `ensures`, loop `invariant`, and concurrency state-machine facts, but every proposed clause must retain a source pointer. A Verus driver should freeze human requirements and reject generated contracts that weaken them. The paper's evidence lineage transfers directly as metadata; TLA+ state variables become Rust/Verus ghost views or `spec fn`s. What does not transfer is TLA+'s unconstrained state-space abstraction: a Verus contract must also respect Rust ownership and executable behavior.

where it fails or assumes. Agents may infer an invariant that is too strong or too weak, and repository artifacts may conflict. The self-evolving loop handles failures, but no theorem guarantees that the final invariant captures the real requirement. Inference: VL should treat source evidence as provenance, not as proof of specification adequacy.

## technique 2: reference and scenario-based models

what it is. Specula builds an immutable reference model at an invariant-guided abstraction level, then projects scenario models that enable only relevant actions and bound or coarsen irrelevant behavior. The paper states: “The projection is in principle sound: any invariant violation it finds is also a violation in the reference model.” (§3.2.3, p.5)

how to apply it.

1. Choose model variables corresponding to implementation fields and data structures that affect the selected invariants. Abstract irrelevant internals such as a hash function. (§3.2.1, p.5)
2. Derive TLA+ actions from guards, branches, and state updates at selected code points. (§3.2.1, p.5)
3. Generate scenarios from fixes, issues, comments, tests, and inconsistent code paths, with cited evidence. (§3.2.2, pp.5–6)
4. For each scenario, select actions and bound their occurrence; a bound of zero disables an action. (§3.2.3, p.5)
5. Coarsen multi-step protocols into one atomic action when intermediate states do not affect the target invariant. (§3.2.3, p.6)
6. Shape action sequences to encode the scenario's ordering assumptions while preserving relevant behavior. (§3.2.3, p.6)
7. Run TLC on the scenario model under its fault model, then map violations back to the immutable reference model and code. (§3.2.3–§3.4, pp.5–8)

The paper's example disables crashes, bounds lease reads to two, coarsens leader election, and serializes actions for an Etcd-Raft stale-read scenario (Figure 5, p.6). Scenario projections reduce state explosion but intentionally cover a subset of reference behaviors.

Verus form. Inference: scenario models can become ghost test harnesses or abstract state-machine modules, with each action represented by a verified Rust transition and `requires`/`ensures`. A scenario generator can select fault injections, message orders, and bounded repetitions, while Verus proves each transition contract. This is complementary to Verus: model checking searches interleavings; Verus proves the stated transition relation for all executions satisfying its preconditions. Inference: a projection preserving violations requires a refinement lemma, which Verus does not generate automatically.

where it fails or assumes. Coarsening can hide bugs in intermediate states if the invariant depends on them. The projection claim holds only when the rewrite preserves the relevant behaviors. The reference model can still omit code behavior, which trace validation is intended to detect.

## technique 3: bidirectional trace validation and repair

what it is. Trace validation checks that instrumented code executions are admitted by the model. Specula automates instrumentation, replay harness generation, and model repair, then uses model checking to prevent overfitted repairs. The paper warns that trace validation alone only checks that code traces are admitted; a model can still admit illegal actions. (§3.3.2, p.7)

how to apply it.

1. Generate an instrumentation plan mapping every TLA+ action to a code origin, trigger, and state variables. (§3.3.1, p.6)
2. Insert trace-library calls that record action names and state snapshots. (§3.3.1, p.6)
3. Generate a replay harness that consumes each model action, invokes the corresponding code operation, and compares post-state snapshots. (§3.3.1, p.6)
4. Run TLC against collected traces; a mismatch means the model does not conform and must be repaired. (§3.3.1, p.6)
5. Reject repairs that weaken guards, add permissive transitions, or hard-code trace states. (§3.3.2, p.7)
6. Re-run model checking against protocol invariants to expose overfitting. The Kudu-Raft example's unconditional log truncation passes trace validation but violates State Machine Safety. (§3.3.2, p.7)
7. Repeat model generation, instrumentation, and validation until the loops converge. (§3.5, pp.8–9)

Evidence: for 14 systems on the latest version, 136 violations were reported; 134 were reproduced at code level and encoded as tests, while two reproduced without severe consequences and were classified as masked bugs. (§5.1.1, p.10) The abstract reports that 98% of violations judged real bugs were reliably reproduced. (§3.4.1, p.8)

Verus form. Inference: instrument executable Rust at API boundaries and record ghost or runtime state projections. A replay harness can call the same public API sequence and assert that the resulting state satisfies the model trace's projection. Keep the Verus `requires`/`ensures` contracts immutable while repairing only model or instrumentation code. An overfitted Rust harness that injects private state must be rejected; reproduction should use externally triggerable calls and controlled sleeps. What does not transfer is automatic TLA+ action matching: Verus function boundaries and ownership provide a different granularity.

where it fails or assumes. Trace validation cannot detect model behaviors that code never exercises. Model checking is the second boundary, but its state depth and fault model are finite. Reproduction may fail for nondeterministic timing; Specula reports such cases rather than silently accepting them.

## technique 4: self-evolving loops and bounded bug reproduction

what it is. Specula treats generated invariants, models, and instrumentation as provisional and iteratively repairs them using new evidence. For an invariant violation, it distinguishes a real code bug, an incorrect model/invariant, and a reproduction failure. Reproduction follows a four-phase controlled search: client API interactions; sleeps between API calls; state preconditions such as post-crash values; and sleeps inserted in system code. (§3.4.1, pp.8–9)

how to apply it.

1. Run TLC breadth-first to find short counterexamples and random simulation for deeper traces. (§3.4, p.8)
2. Convert a violation trace into an externally triggerable test; do not preload illegal state, call private functions out of context, or change code logic. (§3.4.1, p.8)
3. Stop at the first reproduction phase that succeeds. (§3.4.1, p.8)
4. If reproduction fails, inspect traces and decide whether the model missed a branch or deterministic replay is intrinsically difficult; restart model repair or report evidence to the user. (§3.4.1, p.8)
5. If a violation has no immediate observable consequence, inspect issues, tests, comments, and design documents before discarding it. (§3.4.2, p.8)
6. Feed every repair's evidence back into invariant, model, or instrumentation loops. (§3.5, pp.8–9)

The main 48-system evaluation found 249 bugs: 207 new and 42 previously known. Of 249, 200 (80.3%) surfaced through model checking; 187/200 (93.5%) came from BFS and 13/200 from random simulation. BFS counterexamples had median length 9 and p90 length 18. (§5.1, p.9) The denominator and search mode are explicit; these are bug-finding counts, not proofs of all system behaviors.

The loops repaired instrumentation errors within three rounds; 91.3% of invariant/model errors were fixed in one iteration and none took more than four. (§5.4, p.13) Across conformance-loop repairs, 17.3% were invariant mistakes, 22.2% instrumentation mistakes, and 60.5% model mistakes. (§5.4, p.13)

Verus form. Inference: a VL loop can generate a Rust/Verus candidate, run `verus`, compile and execute public tests, then classify failures as contract, proof, runtime, or model mismatch. Counterexample traces can become concrete `proof fn` harnesses or executable regression tests. The anti-reward-hacking rules transfer: reject `assume`, `admit`, vacuous `ensures`, changed implementation logic, and private-state injection. Inference: unlike TLA+ simulation, Verus itself is not a bounded state explorer, so a separate state-machine or randomized harness is required for interleaving search.

## comparative evidence, cost, and limits

On five systems evaluated with SysMoBench, Specula Opus scored 100% syntax, runtime, conformance, invariant, and overall; Agent-Raw scored 81% overall and Agent-TLA+ 82%. (Table 4, p.12) In a five-system bug comparison, Specula found 62 bugs, Agent-Raw 2, and Agent-TLA+ 3; the paper attributes the difference to better models, scenario decomposition, and more invariants. (§5.2.2, p.12) These comparisons use five systems and manually supplied invariants, not the full 48-system run.

End-to-end cost across 48 systems was 1.43–9.86 hours per system, median 3.69 hours, and $19–$168 in token consumption, median $57. (§5.3, p.12) Specula is 4.8–37 times more expensive than Agent-Raw and 1.8–65 times more expensive than Agent-TLA+ on the five-system module comparison. (Table 5, p.12)

Trusted elements are the source artifacts, agent interpretation, TLA+ semantics, TLC, trace instrumentation, replay harness, and human judgment that a reproduced behavior is a bug. Inference: for agent-written verified Rust, the major threat is specification drift: an `ensures` clause or ghost model can be internally consistent while omitting a required behavior. Specula's bidirectional checks and evidence lineage are useful safeguards, but they do not replace requirement review or a proof of implementation-to-model refinement.

## what VL should reuse and should not redo

Inference: VL should reuse evidence-linked invariant extraction, immutable reference models plus scenario projections, bidirectional trace/model checks, anti-overfitting repair rules, and staged reproduction. These techniques directly address the failure modes of agents generating verified Rust and can wrap Verus compilation and proof checking.

Inference: VL should not redo the claim that LLMs can autonomously generate formal models and find bugs. Specula already evaluates 48 systems, gives denominators for 249 findings, compares agents, and measures repair and cost. A new VL result should target Rust ownership, Verus proof obligations, or requirement-to-contract adequacy.

## techniques for the catalog

- evidence-linked invariant extraction — derive protocol and code invariants from repository artifacts while preserving source lineage and fault models
- reference plus scenario models — build an invariant-guided reference model and bounded projections that focus model checking on documented scenarios
- bidirectional conformance — validate code traces against the model and model-check repaired models to reject overfitted permissive behavior
- controlled counterexample reproduction — replay model traces through public APIs with staged timing and fault controls, then encode successful reproductions as tests
- self-evolving repair loops — feed model, invariant, instrumentation, and reproduction evidence back into bounded iterative repair
- breadth-first plus simulation search — combine short exhaustive counterexamples with long random traces under explicit depth and fault bounds
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
