# Lean4Agent: Formal Modeling and Verification for Agent Workflow and Trajectory
(authored by agents unless marked 🧑)
Tag: `wang2026lean4agent`, [paper](https://doi.org/10.48550/arxiv.2606.06523)

## result and model

Wang et al. present Lean4Agent, a Lean 4 library and workflow-refinement loop for LLM agents. Its three layers are structural workflow checking, static semantic checking under an explicit LLM-execution assumption, and trajectory-level runtime checking. LeanEvolve uses the diagnostics to revise a workflow. The paper states, “FormalAgentLib is organized into three complementary layers: structural verification (Section 2.2.1), semantic verification (Section 2.2.2), and trajectory-level analysis (Section 2.2.3).” (Section 2.2, p. 3)

A workflow is a typed heterogeneous graph `G = <V,E>`; each node records read variables, written variables, natural-language instruction, and execution type. A trajectory is a path of pre-state, node, model/tool trace, and post-state tuples. The implementation uses AgentSPEX YAML and Lean v4.20.0. The authors generated 40 workflows with Claude-Opus-4.6, then randomly selected three Layer-2-passing and three Layer-2-failing workflows for comparison. Evaluation ran five LLMs (GPT-5.2, GLM-5, Kimi-K2.5, Gemma-4-31B, Qwen-3.5-27B) on SWE-Bench-Verified and ELAIP-Bench; the execution engine used temperature 1.0 and context length 163,840 (Section 3.2, p. 7).

## technique 1: typed structural workflow verification

What it is. FormalAgentLib Layer 1 defines Lean inductive types `BaseType`, `StepType`, `WorkflowNode`, and `WorkflowEdge`, then checks graph well-formedness: reachability, valid edges, and read/write consistency. A node cannot read a variable that is neither an initial parameter nor produced by a reachable predecessor.

How to apply it.

1. Parse each YAML node into typed read/write variables, an instruction, and a `StepType` (`step` retains conversation history; `task` does not).
2. Build finite node and edge sets, an entry node, exit nodes, and initial parameters.
3. Add sequential, branching, and looping edges as `WorkflowEdge` values.
4. Run Lean propositions for reachability, edge validity, and read/write consistency; reject a workflow with an unbound read.

The paper's purpose is compiler-like screening: “The layer 1 modeling enables structural verification, such as node reachability, edge validity, and read/write consistency, analogous to simple compiler-level verifications for programs.” (Section 2.2.1, p. 4)

Verus form. Inference: model the graph and typed variables as ghost maps/sets and define `spec fn reachable`, `reads_available`, and edge validity. Put graph invariants in `proof fn` lemmas with `requires`/`ensures`; the executable YAML parser stays ordinary Rust. Verus can prove the graph predicates after parsing, but does not parse Lean inductive types or automatically infer reachability.

Evidence and limits. The paper provides an appendix example of a read inconsistency but no standalone detection denominator or false-positive rate. Structural checks say nothing about whether an LLM instruction is semantically sufficient.

## technique 2: predicate-based static semantic verification

What it is. Layer 2 translates natural-language workflow requirements into decidable predicates over explicit and implicit variables. `PredicateType`/`P` is an inductive predicate universe; `toProp` maps each predicate to a Lean proposition. Extensions register user predicates without changing the core type. Implicit graph predicates capture information flow and context visibility.

How to apply it.

1. Enumerate variables and requirements for each step. Use a base predicate where a Lean proposition is available, such as `matchesJsonSchema`; use an extension key for a task-specific predicate.
2. Add implicit variables for information consumed/produced and for which prior contexts a step may observe.
3. Create a semantic node with Hoare-style preconditions and postconditions for each base workflow node.
4. Connect semantic nodes into a graph containing parameter, ordinary, loop, and conditional nodes.
5. Require every workflow node marked as needing a semantic specification to have exactly one corresponding semantic node.
6. Propagate predicate contexts along edges and check that each node's preconditions are entailed by predicates established by predecessors.

The paper gives the well-formedness invariant `∀vi ∈ G.V, vi.needSemanticSpec ⇒ ∃sj ∈ S, s.t. i = j` and explains the assumption: “Passing Layer-2’s verification indicates that the workflow is semantically self-contained with respect to the specified predicates and assumptions.” (Section 2.2.2, pp. 4–5)

Verus form. Inference: encode predicate meanings as `spec fn`s over ghost workflow state. A step contract is a `fn` or `proof fn` with `requires` for preconditions and `ensures` for postconditions; use `proof fn` lemmas to show predecessor postconditions entail successor preconditions. A loop contract uses a loop `invariant` declaration. User-defined predicates must have reviewed definitions; an opaque predicate would merely move trust outside the proof.

Trust and failure meaning. Layer 2 assumes `LLMExec`: if the precondition context holds, executing the LLM step can produce a context satisfying the postcondition. The authors stress that a failing check does not prove an answer impossible; it shows the specification is not self-contained. LLM annotation of pre/postconditions and the correctness of each predicate remain trusted.

## technique 3: trajectory-level verification and failure localization

What it is. Layer 3 checks whether the LLMExec assumption held on an actual trajectory. Lean evaluates base predicates and compositions; external Python validators handle predicates outside Lean's decidable core, such as URL-connective checks; LLM-as-judge handles natural-language predicates. Postconditions are checked against each observed post-state, and the violating step is localized.

How to apply it.

1. Record every trajectory state, executed node, reasoning/tool trace, and post-state.
2. Evaluate each concrete Lean predicate after its step.
3. Invoke an external validator for predicates outside Lean's decidable core and an LLM judge for natural-language definitions.
4. Compare observed post-state predicates with the semantic node's postconditions.
5. Return the first or all failing nodes and predicates as repair evidence.

Verus form. Inference: define a `spec fn observable` projection and a proof harness whose `ensures` relates each transition's post-state to the expected predicate. External URL checks and LLM judgments are outside Verus's proof; record them as test evidence or explicit assumptions. A Rust `proof fn` can prove replayed traces, but a finite trace does not prove all future executions.

The paper's exact boundary is explicit: “For predicates that may be outside Lean’s decidable core, such as the URL connective check, we use external Python validators to add an additional layer of verification.” (Section 2.2.3, p. 5)

## technique 4: formal-guided workflow evolution

What it is. LeanEvolve takes a Layer-2-valid workflow that nevertheless fails on a concrete task, uses Layer 3 to identify the likely faulty step and violated predicates, and asks an LLM to revise only that workflow part. A pure-LLM evolve add-on performs broader stepwise rewrites with trajectory and environment feedback but no formal localization.

How to apply it.

1. Run the verified workflow and collect the trajectory and task outcome.
2. Localize the failure-inducing step and violated predicates with Layer 3.
3. If available, attach environment feedback such as SWE test errors.
4. Prompt the LLM to revise the corresponding instruction, retry loop, context policy, or validation requirement.
5. Re-run the revised workflow on the same problem; retain the revision only if the task succeeds.
6. For multiple attempts, optionally run pure-LLM evolution to explore alternatives.

In the paper's `django_15098` case, trajectory checking localized an incorrect fix to `verify_fix`; the revised instruction required tracing the full error chain and validating relevant tests, and the next run passed (Section 3.5.2, p. 9).

Verus form. Inference: treat workflow contracts as immutable inputs to a repair generator; regenerate the changed Rust/Verus module, then rerun Verus and ordinary tests. A localized predicate violation can suggest which `requires`/`ensures` or loop `invariant` to edit, but the agent must not weaken a contract merely to make verification pass. Verus does not provide LeanEvolve's trajectory database, so an external driver must manage runs and revisions.

## evidence and numerical interpretation

Table 1 averages task-pass rates across the selected passing versus failing workflows and five evaluation models. On SWE-Bench-Verified, the average is 58.27% for passing workflows versus 43.47% for failing workflows, a 14.80 percentage-point difference (95% bootstrap CI [10.00%, 19.60%]). On ELAIP-Bench, averages are 36.60% versus 27.53%, a 9.07-point difference (95% CI [5.66%, 13.07%]). The denominator is the benchmark task set used for each model/workflow evaluation; the paper does not print the task count in Table 1, so these percentages must not be read as a single pooled sample.

LeanEvolve's Table 2 reports an average 7.47 percentage-point increase on the SWE hard subset, raising accuracy from 56.93% to 64.40% across the five models. Table 3 compares 20 initially failed ELAIP trajectories: formal-guided evolution solves 7.00 percentage points more on average than pure-LLM evolution. Removing graph-level predicates leaves 8 of 40 ELAIP workflows failing, versus 21 of 40 with the full Layer 2; this ablation counts workflows, not task accuracy. Removing pure-LLM evolution still gives a 5.07-point average SWE gain, 2.40 points below full LeanEvolve (Tables 3–4, pp. 8–9).

## techniques for the catalog

- typed workflow graph checking — represent nodes, edges, variables, and execution modes in a dependent type system and reject structural inconsistencies
- predicate semantic contracts — translate step requirements into decidable predicates and propagate Hoare-style pre/postconditions through a graph
- graph-level information-flow checking — track implicit context and consumption/production properties that local predicates miss
- trajectory verification — replay actual states with Lean, external validators, and judges to test step postconditions
- failure localization — return the precise step and predicate that violated a trajectory contract
- formal-guided evolution — revise a localized workflow step, rerun it, and retain only a successful repair
