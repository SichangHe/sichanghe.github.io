# Agentic Neuro–Symbolic Planning and Commissioning for Human-in-the-Loop Industrial Robotics with Digital Twins
(authored by agents unless marked 🧑)
Tag: `liu2026agentic`, [paper](https://arxiv.org/abs/2606.08214)

## scope and contribution
The paper presents a robot planning and commissioning pipeline in which LLMs interpret language and generate layouts, while deterministic components verify constraints, sequence assembly, plan motions, and monitor execution. Its central design claim is: “LLMs are used for tasks that require language understanding or contextual reasoning, while all verification, sequencing, and execution remain deterministic.” (abstract, p. 1) The system uses a Specifier–Designer–Inspector (SDI) harness, LangGraph routing for failure recovery, a Unity3D digital twin for review, and a reactive robot operator.

The framework is explicitly adapted from software harnesses: “The framework adapts the Planner-Generator-Evaluator (PGE) harness pattern from software engineering into a Specifier-Designer-Inspector (SDI) architecture for industrial robotics, combined with LangGraph-based dynamic routing for failure recovery.” (abstract, p. 1)

## technique 1: SDI role separation and typed skills

What it is. The system has a neural Specifier for expanding natural language, a neural Designer for layouts, a symbolic Inspector for constraint verification and sequencing, and a reactive Operator for robot execution. Agents expose typed skills with a name, description, JSON schema, execution function, status, result data, and error set (Section III-B, pp. 4–5).

When to use it. Use this architecture when language flexibility and safety-critical checking must coexist. Keep the safety boundary in deterministic code.

How it is done. Expand a command `l` into structured specification `l̂`; generate candidate configuration `C`; run Inspector verification and sequencing; feed violation set `E` to the Designer for repair; obtain human review; preview and execute; on failure invoke recovery, re-verify, and either retry, replan, or escalate (Algorithm 1, p. 5).

Verus form. Inference: Make the neural agent return Rust code or a specification proposal through a typed schema. Run Verus in an Inspector service that returns structured proof diagnostics. Keep the Operator equivalent as a deployment layer that cannot bypass verification. A final acceptance function should return a verified artifact or `FAILURE`, never an unverified fallback.

Evidence and limits. Replacing the symbolic Inspector with an LLM critic reduced success from 98.1% to 3.8% on a 52-command subset and increased generation time from 85.3 s to 319.0 s (Section IV-C, p. 8; Table IV, p. 9). The paper reports that the LLM critic was “equivalently-prompted” and that its unreliable verdicts triggered “replan storms”. Inference: This is strong evidence against using an LLM as the final Verus verdict, but it is one 52-command robotics subset with one model (GPT-4o-mini, Section IV-A, p. 7) and does not measure Rust proof soundness.

## technique 2: composite and granular deterministic constraints

What it is. The Inspector evaluates a configuration against a constraint set `K`, either returning pass or a violation set `E`. Skills include composite verification, granular workspace, gravity, gripping, and collision checks, plus planning (sequencing and task generation) and orchestrating skills including two recovery skills (Section III-B, pp. 4–5). The six constraints (gravity, reachability, collision, contact, gripping, sequence) are defined in Section II, p. 3.

When to use it. Use composite checks for acceptance and granular checks for targeted repair feedback. Granularity prevents an agent from receiving an opaque failure that gives no repair direction.

How it is done. Define the constraint set `K` (gravity order, workspace reachability, no overlap, contact support, gripping, assembly-order dependencies); run `V(C,K)`; select violated constraints; inject only the relevant subset into the next prompt; repeat until pass or a bounded retry limit (Section II, p. 3; Section III-C, pp. 5–6; Algorithm 2, p. 5).

Verus form. Inference: Encode each Rust safety property as a separate spec predicate and define a composite predicate as their conjunction. Return a structured violation set naming failed postconditions or invariants. Use `requires` and `ensures` on verified functions; use `invariant` as a loop invariant declaration, not a call. A failed proof must propagate as an error result.

Evidence and limits. The paper says a layout that passes its final safety check is “guaranteed to satisfy every constraint in K” (Section III-C, p. 6), and `K` has six constraints.

## technique 3: adaptive generate–verify–repair with bounded retries

What it is. The Designer proposes a layout, the verifier returns failed constraints, and a selector injects only the relevant failures into the next attempt. Algorithm 2 uses one LLM call per retry and stops after `Tmax` iterations.

When to use it. Use targeted feedback for proof repair where full specifications overwhelm the agent or hide the actionable failure.

How it is done. Build a minimal prompt for the first attempt; call the model; run `V`; if it fails, compute `ϕ(E)` and build a retry prompt containing the error and selected constraints; repeat until pass or timeout (Section III-C, pp. 5–6; Algorithm 2, p. 5).

Verus form. Inference: The repair loop can propose changes to Rust or proof functions, then invoke Verus after each change. Keep a fixed retry budget and log every diagnostic. Do not weaken a specification to make a retry pass unless the change is reviewed as a new requirement.

Evidence and limits. The paper finds adaptive feedback superior to fixed feedback: LLM-AdaptLoop reaches 93.1% overall success versus 82.8% for LLM-FixedLoop on the 58 commands of Groups A–D (Table III, p. 8, which has no Group E column). Generation time was 23.7 s for AdaptLoop and 31.5 s for FixedLoop (Table III). Inference: The gain supports selective diagnostics in this robotics setting; it is not a test of proof repair.

## technique 4: human review through a digital twin

What it is. Unity3D renders the verified design and planned trajectories. The human can translate, rotate, insert, or remove objects, and a modified layout is re-verified (Algorithm 1, p. 5; Section III-D, p. 6). The digital twin is also used for pre-execution commissioning and runtime monitoring (Section III-D, p. 6).

When to use it. Use a review surface when requirements are ambiguous or physical consequences are difficult to encode completely. Human edits must enter the same verification path as generated output.

How it is done. Render `C*` after symbolic verification and sequencing; request operator review; apply human input to produce `C′`; re-run verification and sequencing; preview the trajectory; require confirmation before execution; stream encoder data back into the twin (Algorithm 1, p. 5; Section III-D, p. 6).

Verus form. Inference: Treat human edits as new input to a verified state transformation. Re-run all relevant proofs after edits, and retain the pre-edit artifact for audit. A human approval event can authorize execution but cannot replace a failed Verus proof.

Evidence and limits. In nine invalid human modifications, Rule recovered 7/9, PGE 8/9, and both LG and Hybrid 9/9 (Table V, p. 9). Inference: Table V compares orchestrators on re-verifying invalid human edits; it does not isolate the effect of the human interface, and it does not show that the encoded constraints cover every physical hazard.

The authors describe the auditability goal directly: “the digital twin makes the pipeline more interpretable and auditable while reducing trial-and-error on physical industrial robots.” (Section III-D, p. 6)

## technique 5: deterministic symbolic sequencing

What it is. The sequencer builds a directed acyclic graph from support dependencies, removes grippable sink nodes iteratively, and reverses the removal order to obtain assembly order (Section III-E, pp. 6–7; Algorithm 4, p. 7).

When to use it. Use graph sequencing whenever action order must respect dependencies and local feasibility constraints.

How it is done. Build `Gd=(V,Ed)` with an edge for each support relation; find sink nodes; reject cycles; select a sink with an unblocked lateral grip; remove it; repeat; reverse the disassembly list (Algorithm 4, p. 7).

Verus form. Inference: Represent dependencies as a finite graph and prove that each chosen node has no outgoing dependency and satisfies grip predicates. Use loop invariants to show removed nodes form a valid suffix and that the remaining graph preserves dependencies. Prove termination with a decreasing node-count measure.

Evidence and limits.

## technique 6: trajectory commissioning and deviation monitoring

What it is. The system computes collision-free planned trajectories, synchronizes robot encoder data, and compares planned and executed joint configurations with maximum deviation `δ`. It passes when `δ ≤ ε` and otherwise pauses, requests review, or replans (Sections II and III-F, pp. 3, 7).

When to use it. Use runtime monitoring when execution can drift from a statically verified plan or when actuator and environment state can change.

How it is done. Generate atomic manipulation actions; map them to joint trajectories with current state and collision scene; preview in the digital twin; collect encoder data at 50–250 Hz; align timestamps by nearest neighbor; compute deviation; trigger a pass/fail action and recovery (Section III-F, p. 7).

Verus form. Inference: Specify a correspondence between planned and observed states and prove bounds on data structures and arithmetic. Runtime measurements remain assumptions; if a bound is exceeded, return an explicit failure and do not claim the plan’s postcondition.

Evidence and limits. For 12 commands run through the full planning and control pipeline, the paper reports valid inverse kinematics and collision-free trajectories for all 12 designs, “no significant deviation” between planned and executed trajectories, and 12/12 in the Pass column of Table VII (Section IV-E and Table VII, p. 9). It reports no values of δ or ε. It also states that “the current system assumes known supply-area positions, and visual perception for object localization was not integrated” (Section V, p. 10).

## techniques for the catalog

- SDI typed roles: separate neural specification and design from symbolic verification and reactive execution
- granular constraint feedback: return named failed predicates and inject only relevant diagnostics into repairs
- bounded generate–verify–repair: iterate proposals through a deterministic checker with an explicit retry limit
- digital-twin review: render verified artifacts, accept human edits, and re-verify before execution
- symbolic dependency sequencing: build a graph, choose feasible sinks, and reverse the removal order
- trajectory monitoring: compare planned and observed trajectories with a threshold and trigger pause or replanning
