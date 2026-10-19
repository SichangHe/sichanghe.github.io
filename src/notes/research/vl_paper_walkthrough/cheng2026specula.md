# Specula: Scaling formal specifications for autonomous model checking of system code
(authored by agents unless marked 🧑)
Tag: `cheng2026specula`, [paper](https://arxiv.org/abs/2607.25333v2)
## paper result

Specula is an agentic pipeline that generates TLA+ models and invariants from system repositories, validates the model against code traces, model-checks safety and liveness, and reproduces violations in the implementation. The abstract calls it “a push-button agentic system that generates high-quality formal specifications for large, complex system code and uses these specifications for highly effective model checking and bug finding.” (§abstract, p.1) Its reported scale is 48 open-source systems and 249 bugs, with 207 new bugs, 42 previously known bugs, 89 reported bugs, 68 developer-confirmed bugs, and 24 fixed bugs. (§5.1, p.9)

The design addresses three risks in LLM-generated formalization: hallucinated behavior, a wrong abstraction level, and reward hacking that weakens a model until traces pass. The paper states: “Specula defines clear boundaries by pairing trace validation and model checking—the former ensures that the model admits code-level behaviors and the latter rejects invalid states.” (§1, p.2)

Inference: Specula checks an abstract TLA+ model, rather than directly checking the implementation. A passing check establishes the property only within the explored model, bounds, and fault assumptions. Trace validation and reproduction provide evidence of correspondence for observed executions, not a proof covering all implementation behaviors.

## technique 1: evidence-grounded invariant extraction

what it is. Agents extract protocol-level and code-level invariants from source, comments, documentation, issues, pull requests, commits, tests, and revision history. Each invariant is associated with a fault model and must cite concrete evidence. The paper says: “Specula enforces the AI agents to provide concrete evidence of where it derived the invariants from (e.g., code, issues, commits, and comments).” (§3.1, p.4)

how to apply it.

1. Read repository artifacts and summarize protocol invariants such as Raft election safety and log matching. (§3.1, p.4)
2. Infer implementation-specific invariants, for example monotone commit indexes, bounded capacity, and atomicity, from code and tests. (§3.1, p.4)
3. Attach evidence locations and the relevant fault model to each invariant. (§3.1, p.4)
4. Encode the properties in TLA+. (§3.1, p.4)
5. Keep protocol and implementation invariants distinct: a deliberate implementation relaxation (MongoDB's in-memory commit guarantee) should produce a code-level invariant rather than an incorrectly strong protocol invariant. (§3.1, p.4)

The evaluation reports 21.1% of generated invariants at protocol level and 78.9% at code level. (Section 5.1, p.10) The evidence-source percentages have denominator “invariants” and overlap because one invariant can have multiple sources: implementation code/comments 87.35%, issue trackers/pull requests/advisories 74.34%, prior fixes/commits/tests 42.88%, and documentation/reference literature 20.04%. (Table 2, p.10)

Verus form. Inference: the same extraction stage can propose `requires`, `ensures`, loop `invariant`, and concurrency state-machine facts, but every proposed clause must retain a source pointer. A Verus driver should freeze human requirements and reject generated contracts that weaken them. The paper's evidence lineage transfers directly as metadata; TLA+ state variables become Rust/Verus ghost views or `spec fn`s. Transferring the model to Rust/Verus requires relating its abstract state and actions to code that satisfies Rust ownership rules.

where it fails or assumes. The paper acknowledges: “Similarly, the invariants Specula extracts may not capture every property a system should hold.” (§6, p.14) Inference: VL should treat source evidence as provenance, not as proof of specification adequacy.

## technique 2: reference and scenario-based models

what it is. Specula builds a reference model at an invariant-guided abstraction level. It then projects scenario models that select, bound, coarsen, or order actions while leaving the reference unchanged during projection. The paper states: “The projection is in principle sound: any invariant violation it finds is also a violation in the reference model.” (§3.2.3, p.5)

how to apply it.

1. Choose model variables corresponding to implementation fields and data structures that affect the selected invariants. Abstract irrelevant internals such as a hash function. (§3.2.1, p.5)
2. Derive TLA+ actions from guards, branches, and state updates at selected code points. (§3.2.1, p.5)
3. Generate scenarios from fixes, issues, comments, tests, and inconsistent code paths, with cited evidence. (§3.2.2, p.5)
4. For each scenario, select actions and bound their occurrence; a bound of zero disables an action. (§3.2.3, p.5)
5. Coarsen a multi-step process into an atomic action when it is needed for the scenario but is not the targeted behavior. (§3.2.3, p.6)
6. Shape action sequences to encode the scenario's ordering assumptions while preserving relevant behavior. (§3.2.3, p.6)
7. Validate both reference and scenario models against code traces, then run TLC on each scenario model under its fault model and attempt code-level reproduction of violations. (§3.3–§3.4, pp.6–7)

The paper's example disables crashes, bounds lease reads to two, coarsens leader election, and serializes actions for an Etcd-Raft stale-read scenario (Figure 5, p.6). Scenario projections reduce state explosion but intentionally cover a subset of reference behaviors.

Verus form. Inference: scenario models can become ghost test harnesses or abstract state-machine modules, with each action represented by a verified Rust transition and `requires`/`ensures`. A scenario generator can select fault injections, message orders, and bounded repetitions, while Verus proves each transition contract. This is complementary to Verus: model checking searches interleavings; Verus proves the stated transition relation for all executions satisfying its preconditions. Inference: a projection preserving violations requires a refinement lemma, which Verus does not generate automatically.

where it fails or assumes. Inference: coarsening can hide bugs in intermediate states if the invariant depends on them. The projection claim holds only when the rewrite preserves the relevant behaviors. The reference model can still omit code behavior, which trace validation is intended to detect.

## technique 3: bidirectional trace validation and repair

what it is. Trace validation checks that instrumented code executions are admitted by the model. Specula automates instrumentation, replay harness generation, and model repair, then uses model checking to prevent overfitted repairs. The paper warns that trace validation alone only checks that code traces are admitted; a model can still admit illegal actions. (§3.3.2, p.7)

how to apply it.

1. Generate an instrumentation plan mapping every TLA+ action to a code origin, trigger, and state variables. (§3.3.1, p.6)
2. Insert trace-library calls that record action names and state snapshots. (§3.3.1, p.6)
3. Generate a TLA+ replay harness that matches each recorded code event, executes the corresponding modeled action, and checks its post-state against the recorded snapshot. (§3.3.1, p.6)
4. Run TLC against collected traces; a mismatch means the model does not conform and must be repaired. (§3.3.1, p.6)
5. Check for overfitting through weakened guards, permissive transitions, or hard-coded trace-specific state updates. (§3.3.2, pp.6–7)
6. Re-run model checking against protocol invariants to expose overfitting. The Kudu-Raft example's unconditional log truncation passes trace validation but violates State Machine Safety. (§3.3.2, p.7)
7. Repeat repairs and validation, revising invariants with evidence when needed; practical runs have a time or cost budget. (§3.5, pp.7–8)

Evidence: for 14 systems on the latest version, 136 bugs were reported; 134 were reproduced at code level and encoded as tests, while two reproduced without severe consequences and were classified as masked bugs. (§5.1.1, p.10) The paper states: “Empirically, Specula reliably reproduced 98% of the violations it judged to be real bugs.” (§3.4.1, p.7)

Verus form. Inference: instrument executable Rust at API boundaries and record runtime state projections corresponding to the formal model. A replay harness can call the same public API sequence and assert that the resulting state satisfies the model trace's projection. Keep the Verus `requires`/`ensures` contracts immutable while repairing only model or instrumentation code. An overfitted Rust harness that injects private state must be rejected; reproduction should use externally triggerable calls and controlled sleeps. What does not transfer is automatic TLA+ action matching: Verus function boundaries and ownership provide a different granularity.

where it fails or assumes. The paper states: “In essence, trace validation checks that code-level actions can occur in the model, but it does not explore whether the model also admits illegal actions.” (§3.3.2, p.7) Reproduction can fail because deterministic replay requires external control; Specula preserves the analysis and evidence for the user. (§3.4.1, p.7) Inference: neither finite trace coverage nor bounded model exploration guarantees complete conformance.

## technique 4: self-evolving loops and bounded bug reproduction

what it is. Specula treats generated invariants, models, and instrumentation as provisional and iteratively repairs them using new evidence. For an invariant violation, it distinguishes a real code bug, an incorrect model/invariant, and a reproduction failure. Reproduction follows a four-phase controlled search: client API interactions; sleeps between API calls; state preconditions such as post-crash values; and sleeps inserted in system code. (§3.4.1, p.7)

how to apply it.

1. Run TLC breadth-first to find short counterexamples and random simulation for deeper traces. (§3.4, p.7)
2. Convert a violation trace into an externally triggerable test; do not preload illegal state, call private functions, or change code logic. (§3.4.1, p.7)
3. Stop at the first reproduction phase that succeeds. (§3.4.1, p.7)
4. If reproduction fails, inspect traces and decide whether the model missed a branch or deterministic replay is intrinsically difficult; restart model repair or report evidence to the user. (§3.4.1, p.7)
5. If a violation has no observable consequence, retain it and inspect issues, tests, comments, and design documents to assess its meaning. (§3.4.2, p.7)
6. Feed every repair's evidence back into invariant, model, or instrumentation loops. (§3.5, pp.7–8)

The main 48-system evaluation found 249 bugs: 207 new and 42 previously known. Of 249, 200 (80.3%) surfaced through model checking; 187/200 (93.5%) came from BFS and 13/200 from random simulation. Figure 8 plots counterexample lengths, with a reported median of 9 steps and p90 of 18 steps; BFS returns shortest counterexamples, whereas simulation does not. (§5.1, p.9) The denominator and search mode are explicit; these are bug-finding counts, not proofs of all system behaviors.

The loops repaired instrumentation errors within three rounds; 91.3% of invariant/model errors were fixed in one iteration and none took more than four. (§5.4, p.13) The conformance-loop mistake breakdown was 17.3% invariants, 22.2% instrumentation, and 60.5% models. (§5.4, p.13)

Verus form. Inference: a VL loop can generate a Rust/Verus candidate, run `verus`, compile and execute public tests, then classify failures as contract, proof, runtime, or model mismatch. Counterexample traces can become concrete `proof fn` harnesses or executable regression tests. The anti-reward-hacking rules transfer: reject `assume`, `admit`, vacuous `ensures`, changed implementation logic, and private-state injection. Inference: unlike TLA+ simulation, Verus itself is not a bounded state explorer, so a separate state-machine or randomized harness is required for interleaving search.

## comparative evidence, cost, and limits

On five systems evaluated with SysMoBench, Specula Opus scored 100% syntax, runtime, conformance, invariant, and overall; Agent-Raw scored 81% overall and Agent-TLA+ 82%. (Table 4, p.12) In a five-system bug comparison, Specula found 62 bugs, Agent-Raw 2, and Agent-TLA+ 3; the paper attributes the difference to better models, scenario decomposition, and more invariants. (§5.2.2, p.12) Only the SysMoBench model-quality evaluation uses manually supplied, human-verified invariants and therefore does not evaluate invariant extraction. (§5.2.1, p.12)

The 48-system results combine versions: “only the highlighted results reflect the latest Specula (our v1.0 release)”; the remaining results come from earlier versions. (§5.1, p.9)

End-to-end cost across 48 systems was 1.43–9.86 hours per system, median 3.69 hours, and $19–$168 in token consumption, median $57. (§5.3, p.12) Specula is 4.8–37 times more expensive than Agent-Raw and 1.8–65 times more expensive than Agent-TLA+ on the five-system module comparison. (§5.3, p.12)

Inference: trusted elements are the source artifacts, agent interpretation, TLA+ semantics, TLC, trace instrumentation, replay harness, and human judgment that a reproduced behavior is a bug. For agent-written verified Rust, the major threat is specification drift: an `ensures` clause or ghost model can be internally consistent while omitting a required behavior. Specula's bidirectional checks and evidence lineage are useful safeguards, but they do not replace requirement review or a proof of implementation-to-model refinement.

## what VL should reuse and should not redo

Inference: VL should reuse evidence-linked invariant extraction, reference models preserved during scenario projection, bidirectional trace/model checks, anti-overfitting repair rules, and staged reproduction. These techniques directly address the failure modes of agents generating verified Rust and can wrap Verus compilation and proof checking.

Inference: VL should not redo the claim that LLMs can autonomously generate formal models and find bugs. Specula already evaluates 48 systems, gives denominators for 249 findings, compares agents, and measures repair and cost. A new VL result should target Rust ownership, Verus proof obligations, or requirement-to-contract adequacy.

## techniques for the catalog

- evidence-linked invariant extraction — derive protocol and code invariants from repository artifacts while preserving source lineage and fault models
- reference plus scenario models — build an invariant-guided reference model and bounded projections that focus model checking on documented scenarios
- bidirectional conformance — validate code traces against the model and model-check repaired models to reject overfitted permissive behavior
- controlled counterexample reproduction — replay model traces through public APIs with staged timing and fault controls, then encode successful reproductions as tests
- self-evolving repair loops — feed model, invariant, instrumentation, and reproduction evidence back into bounded iterative repair
- breadth-first plus simulation search — combine short exhaustive counterexamples with long random traces under explicit depth and fault bounds
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In essence, trace validation checks that code-level actions can occur in the model, but it does not explore whether the model also admits illegal actions."): checked all paper text, quotations, numbers, section/page references, and technique steps; corrected replay-harness semantics, reproduction references, projection wording, evaluation scope, and the paper link; marked interpretations as Inference; did not check source code, artifacts, external reports, or reproduce experiments.
