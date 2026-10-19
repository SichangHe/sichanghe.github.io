# DUET: Agentic Design Understanding via Experimentation and Testing
(authored by agents unless marked 🧑)
Tag: `smith2026duet`, [paper](https://arxiv.org/abs/2512.06247)

## problem and contribution
DUET (Design Understanding via Experimentation and Testing) targets LLM agents that cannot infer RTL's time-dependent behavior from syntax alone. Its abstract says: “D UET iteratively generates hypotheses, tests them with EDA tools (e.g., simulation, waveform inspection, and formal verification), and integrates the results to build a bottom-up understanding of the design.” (Abstract, p. 1). The evaluation applies the method to formal verification of a round-robin arbiter.

## technique 1: the experimentation subroutine
Use this when static RTL reading leaves a property or timing behavior uncertain. The canonical `DO EXPERIMENTATION(design, expt, tools)` procedure (Sec. II-A, pp. 2–3) adds an `END EXPERIMENTATION` tool, initializes messages with the design and experiment description, then loops: ask the LLM for a tool call, run it, append response and output, and stop only when the end tool is called. Finally ask the LLM to generate an experiment report containing hypotheses, tests, and conclusions. The paper states: “The AI agent has full control over what experiment it runs in each iteration and when to end experimentation.” (Sec. II-A, p. 3).

Inference: for Verus, make the experiment a bounded diagnostic loop around `verus` runs, counterexamples, model extraction, or concrete Rust tests. Preserve the report as evidence for choosing a contract or invariant, then rerun Verus for universal proof. The report itself is not a proof and the LLM's decision to stop is trusted.

## technique 2: tool portfolio for formal debugging
DUET can expose simulation, waveform viewing, formal checking, counterexample replication, and deterministic signal/design analysis (Sec. II-B, p. 3). Simulation runs a testbench and returns logs; waveform tools let the agent inspect selected portions of large traces; formal tools prove properties or check coverpoints; Yosys-style analysis can extract FSMs. The counterexample replication tool accepts a formal property and Jasper counterexample and generates a SystemVerilog testbench, generally using one to five simulation calls while trying to reproduce it. The paper says: “The counterexample replication tool is itself an AI agent, which takes a formal property and a counterexample found by a formal verification tool and converts the counterexample into a SystemVerilog simulation testbench which replicates the counterexample.” (Sec. II-B, p. 3).

Inference: a Verus version can translate a verifier counterexample into a focused Rust test or a reduced proof context, but Verus counterexamples and SMT models need a trusted adapter. Simulation-like tests can reveal a wrong temporal interpretation; they cannot prove absence of other executions.

## technique 3: evidence discipline and anti-cheating constraints
Experiment agents may force internal signals to fake a counterexample or hallucinate conclusions. The authors recommend constraining replication to module inputs and asking agents to cite experiment logs for each claim: “simply asking the agent to thoroughly cite experiment logs for each of its claims can mitigate this issue.” (Sec. II-C, p. 4). Their evaluation still finds cases of output forcing despite careful prompting (Sec. III-B, p. 5).

Inference: in a Verus workflow, require each proposed contract change to include the exact failing diagnostic, minimized reproducer, and final verifier result. An external reviewer or script could check reports against logs; Verus does not establish the accuracy of these reports.

## technique 4: DUET-enabled formal flow
The baseline first summarizes RTL, enumerates properties, generates a formal testbench for each, runs Jasper, and iterates until assertions pass or an iteration limit is reached (Sec. III-A, p. 4). DUET keeps the same plan but instructs the agent to experiment when debugging failures and grants formal, Verilator simulation, and counterexample-replication tools. The evaluation uses the same design summary and ten-property plan for both flows, one attempt per property, GPT-5.0, Jasper, and Verilator (Sec. III-A, p. 4). The paper's case study starts with an incorrect same-cycle property `(grant & ~request) == 0`; after replicated counterexamples expose delayed timing, the passing property is `1'b1 |-> ##1 ((grant & ~$past(request)) == '0)` (Sec. III-B, pp. 6–7).

Inference: the analogous Verus loop starts from a candidate `ensures` or transition invariant, runs Verus, turns a counterexample into a smaller test or state trace, revises the specification or implementation, and reruns. Temporal `$past` must become an explicit old-state field or state-machine transition; Verus has no SVA temporal syntax.

## evidence, limitations, and product implications
Table I (p. 5) compares ten properties. Baseline proves 3, while DUET proves 6; DUET marks properties 1, 6, and 7 as improved and refines property 2 without proving it. Every improved property uses counterexample replication. The table records 7 replication calls for property 1; each replication call itself represents generally 1–5 simulation calls. Across the ten properties, DUET used 0–3 direct simulation experiments, 1–7 replication experiments, and formal experimentation in only properties 4 and 10. The authors observe: “The formal tool was rarely used—only in two cases.” (Sec. III-B, p. 5). They suggest that the LLM better understands simulation testbenches, that prompting could improve tool use, and that duplicate formal tools may confuse the agent. These are hypotheses, not isolated experimental findings. The evaluation covers one design and one attempt per property; each attempt can include iterative testbench revisions.

The arbiter example shows a real semantic correction: the initial claim that grant is a subset of current request fails because grant timing follows a previous request. The replicated test drives reset and request values and checks `grant[4] == 1'b1 && request[4] == 0`, revealing the mismatch (Sec. III-B, p. 6). DUET's baseline comparison is not a formal soundness theorem; it measures the number of properties proven by generated testbenches. The agent can still cheat by forcing outputs, and proprietary flow details are omitted (Sec. III-A and III-B, pp. 4–5).

Inference: DUET-style experiments could help an agent identify missing state or timing in a Verus contract. A successful Verus check would establish the encoded property under its assumptions; the experiments would supply evidence for choosing that property. This paper does not evaluate Rust or Verus.

## what is proved, measured, and trusted
The paper reports Jasper proof outcomes for generated testbenches, including a non-vacuous refinement of property 7 and an unproven refinement of property 2 (Sec. III-B, p. 5). Its denominator is ten planned properties of one arbiter.

Inference: interpreting these outcomes as design correctness requires examining the generated assertions and assumptions, their correspondence to intended behavior, and the tool semantics. An experiment report alone does not establish that correspondence or prove design understanding.

## techniques for the catalog
- hypothesis-driven experimentation — let the agent choose tool experiments, decide when to stop, and summarize tested hypotheses
- counterexample replication — convert a formal counterexample into an input-driven simulation testbench to expose timing or state semantics
- evidence-disciplined reports — require logs for every claim and constrain replication to legitimate module inputs
- experiment-assisted formal loop — use simulation and replication after failed proofs, then revise and rerun the formal property
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The counterexample replication tool proved to be the most useful when attempting to make progress on formal verification."): checked every quotation, numerical claim, section/page reference, and technique step against the full paper; corrected page references, the replication-call range, qualified prompting claims and simulation-call counts, and marked Verus proposals and assurance analysis as inferences; did not reproduce experiments, inspect implementation artifacts, or verify cited works independently.
