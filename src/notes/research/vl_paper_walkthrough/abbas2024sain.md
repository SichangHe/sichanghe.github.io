# SAIN: Improving ICS Attack Detection Sensitivity via State-Aware Invariants
(authored by agents unless marked 🧑)
Tag: `abbas2024sain`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/abbas)

## purpose and result

SAIN detects attacks that evade invariants whose bounds are pooled across all industrial-control-system (ICS) states. The paper's central claim is explicit: “SAIN first generates invariant templates by identifying the PLC program states, state transitions, and the inter-dependencies among sensing, actuation, and configuration variables within each state” (abstract, p. 6597). It then partitions benign traces by state, quantifies templates with tighter ranges, and checks them in the programmable-logic-controller (PLC) runtime. The evaluation uses a Fischertechnik manufacturing plant and a Tennessee Eastman chemical-plant simulator, 17 attacks, 12 days of traces, and real PLC code. The abstract reports average false positives of 2% and runtime overhead of 3% (p. 6597).

The threat model assumes an attacker can compromise level-2-or-higher entities and send malicious PLC-variable updates, but cannot alter PLC firmware, spoof the air-gapped level-0/1 network, or touch physical devices (threat model, p. 6599). Inference: these assumptions make SAIN useful for remote request integrity, but do not cover a physical attacker or compromised sensors.

## technique 1: derive an FSM from PLC code

Use this when a PLC program is state-driven and its state transitions are expressed in case blocks and conditions. The paper's method is:

1. parse PLC source into tokens and construct an abstract syntax tree (AST) using Parsing Expression Grammar (PEG); the AST represents identifiers, dependencies, and control flow (Section 5.1.1, p. 6601)
2. extract each function block and each case block from the AST (Algorithm 1, p. 6602)
3. define one FSM state for each case block, build its control-flow graph and data-flow graph, combine them into a program-dependence graph, and identify transition conditions (Algorithm 1, lines 4–11)
4. add each condition as an FSM edge and return the FSM (Algorithm 1, lines 11–14)

The paper states, “SAIN first leverages the PLC program to identify the states that are defined and implemented to control ICS operations” (Section 5, p. 6601). Its example uses a delivery robot with states S1–S8 and transition conditions such as reaching target positions. Inference: in Verus, represent the controller as an enum state and a pure transition/specification function; prove that each executable transition satisfies its precondition with `requires` and its post-state with `ensures`. The parser, PLC runtime, and generated FSM remain trusted unless modeled and verified; Verus does not automatically prove that an arbitrary C/PLC parser extracted the right FSM.

Evidence is architectural and experimental rather than a parser soundness proof: the implementation includes a static-analysis tool for ST/SCL that extracts state signatures and invariant templates (Section 6, p. 6605). Inference: a Verus implementation should prove determinism or disjointness of transition predicates, because the paper assumes the PLC program implements a correct FSM (threat model, p. 6599).

## technique 2: generate state signatures and state-specific invariants

Use state signatures to identify the current state cheaply at runtime. The steps are:

1. traverse the FSM with depth-first search to enumerate paths (Section 5.2.1, p. 6603)
2. collect transition variables and their values/ranges on each path
3. combine conditions leading to each state into a signature; if several paths reach a state, retain several signatures
4. remove repetitive conditions, store the signature table, and compare signatures with live PLC variables (Algorithm 2, p. 6603)

The paper defines the signature idea as follows: “An ICS state signature consists of a set of PLC variables and the unique values they take for the ICS to transition to that specific state” (Section 5.2.1, p. 6603). At runtime Algorithm 3 loads signatures at startup, compares each with live variables, and marks a matching state. The accompanying text explains that after initial identification, the monitor tracks transitions instead of rechecking every signature (Section 5.4, p. 6605).

For each state, derive two intra-state forms. A single-variable invariant bounds one variable. A multi-variable invariant puts variables that influence an actuator on the left and the actuator on the right; the program-dependence graph identifies incoming-only actuator nodes and their predecessors (Section 5.2.2, p. 6603). Also derive inter-state invariants from transition conditions. The paper's concrete S3 example says: “If both \"H_Sensor\" and \"R_Sensor\" are within their respective target ranges [H_Target-H_Offset, H_Target+H_Offset] and [R_Target-R_Offset, R_Target+R_Offset] and both \"H_Actuator\" and \"R_Actuator\" are FALSE, then li_StepCase = 210” (Section 5.2.3, p. 6604).

Inference: in Verus, model signatures as predicates over an immutable state snapshot and prove that matching at most one signature implies a unique state. Encode each invariant as a boolean predicate used in `requires`/`ensures`; use `assert` and proof functions for implications. `invariant(...)` is a loop-invariant declaration, not a function call. The paper's runtime string expression parser is outside the proof unless reimplemented and verified.

## technique 3: quantify templates from state-partitioned traces

Use this when code yields symbolic bounds but benign execution traces contain the system-specific numeric ranges. The paper first defines templates such as “# < V < #”, partitions the complete trace at points where transition conditions become true, and creates one sub-trace per state (Section 5.3, p. 6604). It then supplies unresolved templates and state-specific traces to Quantminer, which instantiates concrete bounds. Its S3 example yields H_Sensor [0,885] for actuator start, H_Sensor [890,910] for actuator stop, R_Sensor [40,691] and [695,705], plus the inter-state condition with the two stop ranges (Section 5.3, p. 6604).

Inference: the paper's method calibrates bounds from data; it does not deductively prove physical safety. In Verus, treat mined bounds as explicit constants or assumptions and prove that a verified controller preserves them; do not claim Verus has proved the mining process or that observed extrema are complete. A possible specification is a state-indexed `spec fn allowed(s, v) -> bool` and a transition function with `ensures allowed(new_state, new_value)`.

## technique 4: monitor remote updates

Use the monitor when updates enter through server applications or an HMI. SAIN performs use-definition-chain analysis to find functions that access PLC variables, instruments those functions, and invokes SMONITOR on calls (Section 5.4, p. 6604). Using the current state, it checks single-variable intra-state invariants, then multi-variable invariants. If the updated variable appears in transition conditions, it checks inter-state invariants. “If an invariant violation is detected, the monitor denies the variable update request and alerts the operator” (Section 5.4, p. 6605).

Inference: Verus can verify a Rust monitor's decision function with a contract that accepted updates satisfy state predicates and rejected updates leave the state unchanged. The external HMI, C runtime instrumentation, PLC hardware, network, and alert delivery remain trusted. The paper's optimization—after initial identification, track transitions and check only current-state invariants—reduces work but relies on correct transition tracking.

## evidence, limits, and product relevance

The paper collected 12 days continuously: first two days quantify invariants, next eight measure false alarms, and attacks run during the last two (Section 7.1, p. 6605). SAIN detects and mitigates all 17 attacks; Feng et al. detects 5/17 (29%) and VetPLC 6/17 (35%) (Table 5 and Section 7.2.2, p. 6607). On the Fischertechnik plant, false positives are 2% for SAIN, versus 51% for Feng et al. and 25% for VetPLC. On the chemical plant, the rates are 1%, 2%, and 1%, respectively (Table 6, p. 6607). Table 7 reports offline generation times for each testbed; Table 9 reports scan-cycle times with and without the monitor (p. 6608). The paper states that the monitor “complies with the maximum allowed scan cycle time limits” (Section 7.3.3, p. 6609).

The paper requires invariant regeneration when PLC code changes and notes that incomplete benign traces can produce overly tight bounds and false positives (Section 8, p. 6609). It also states: “An attacker who has physical access to ICS devices such as sensors and actuators can spoof physical sensor and actuator values and bypass SAIN’s detection” (Section 8, p. 6610). The threat model assumes correct PLC control code and a correct extracted FSM (Section 3, p. 6599). Inference: SAIN is relevant to VeruLaw for agent-written control software that accepts remote state updates: it supplies a reusable pattern for state-indexed contracts and transition checks, but its mined thresholds, parser, hardware boundary, and threat assumptions need separate verification. VL should not present state extraction, state-aware predicates, or runtime enforcement as new ideas.

The paper provides experimental evidence on two testbeds, rather than a formal correctness proof. Inference: PLC correctness, FSM extraction, trace representativeness, Quantminer, runtime and hardware, and the threat-model assumptions remain trust dependencies. The abstract reports “run-time overhead of 3%” (p. 6597); Table 9 reports average scan cycles of 37.1 ms versus 36 ms normally for Fischertechnik, and 5.56 ms versus 5 ms normally for the chemical plant (p. 6608). Inference: these values imply approximately 3.1% and 11.2% overhead, respectively, so the abstract's headline does not describe both testbeds individually.

## techniques for the catalog

- state-aware FSM extraction — parse PLC code into AST, control/data graphs, and transition-labelled states
- state signatures — identify a current state from unique transition-variable conditions
- state-indexed invariant templates — derive single-variable, multi-variable, and inter-state predicates per state
- trace partitioning and quantification — split benign traces by state and mine concrete bounds
- runtime invariant monitor — instrument update paths, validate current-state predicates, and deny violating requests
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "We use the traces from the first two days to quantify the invariants and the last eight days to evaluate whether SAIN causes false alarms (i.e., false positives)."): checked all quotations, numbers, section and page references, technique steps, threat assumptions, evaluation results, and limitations; corrected the publisher link, page references, runtime-state explanation, false-positive scope, code-update limitation, and claims about proof and overhead; did not reproduce experiments, inspect source code, or independently verify the Verus suggestions, which are marked as inferences.
