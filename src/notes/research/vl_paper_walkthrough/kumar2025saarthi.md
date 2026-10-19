# Saarthi: The First AI Formal Verification Engineer
(authored by agents unless marked 🧑)
Tag: `kumar2025saarthi`, [paper](https://arxiv.org/abs/2502.16662v2)

## scope and result

Saarthi is a multi-agent workflow for RTL formal verification, with a human design specification, a verification plan, SystemVerilog Assertion (SVA) generation, critic review, formal proving, counterexample (CEX) analysis, and coverage feedback (Sec. III-A, pp. 6–9). It supports CrewAI, AutoGen, or LangGraph and models including GPT-4o, GPT-4-Turbo, and Llama3-70B (p. 7). The authors describe it as autonomous: “To overcome the aforementioned challenges and use GenAI for problem-solving, we introduce a fully autonomous AI formal verification engineer, Saarthi, capable of verifying a given RTL design end-to-end using an agentic workflow” (Introduction, p. 2). However, the workflow requests human intervention after unresolved iterations (Sec. III-A, p. 9). The conclusion reports “an overall efficacy of around 40 %” and says GPT-4o outperforms the other models (p. 12); it does not specify how that aggregate is calculated.

## technique 1: planning, decomposition, and sequential agent orchestration

What it is. A human provides the design specification. A formal verification lead produces a natural-language verification plan (vPlan) and assigns follow-up tasks to verification-engineer agents. Those agents translate vPlan items into SVA. Critic agents review the properties, a formal tool proves them, and agents analyze CEXs and coverage (Sec. III-A, p. 8). The paper defines the lead's task: “The first LLM agent is the so-called “formal verification lead” who is responsible for generating a Verification Plan (vPlan) (i.e., a list of the properties necessary to verify the given design written in the natural English language) based on the given specification” (p. 8).

How to do it:

1. analyze the design specification and create a vPlan listing required properties in natural language (Sec. III-A, p. 8)
2. assign agents to translate each vPlan item into SVA (p. 8)
3. have critic agents evaluate the properties and return feedback for SVA revisions (p. 8)
4. ask a human to supply the correct SVA if the feedback loop remains unresolved after five iterations (pp. 8–9)
5. compile the design and SVA in a formal tool, then prove properties; the paper names Cadence Jasper (Fig. 9, p. 6; Fig. 10, p. 7; Conclusion, p. 12)
6. have LLM agents analyze and fix any CEXs (Sec. III-A, p. 8)
7. after all properties are proven, have another agent analyze formal coverage and send missing-property feedback to the lead (p. 8)

The implementation uses sequential orchestration for this verification process (Sec. III-B, p. 9). Figure 10 shows configuration examples including `max_consecutive_auto_reply = 5`, `human_input_mode = "NEVER"`, and a script executor (p. 7). Section III-A describes logging, critic feedback, and threshold monitoring that triggers human intervention (p. 8).

Verus form. Inference: a VL analogue could use a specification lead to enumerate function contracts and invariants, proof agents to write Verus proof blocks, a critic to inspect contracts for vacuity, and a verifier agent to run `verus`. Inference: the vPlan should map each requirement to a `requires`/`ensures` clause and named lemma. Inference: sequential orchestration could handle dependencies such as a type invariant needed by a refinement lemma.

Evidence and limits. Inference: this architecture does not establish that the natural-language vPlan is complete; human intervention supplies a decision when agents cannot finalize an SVA. The paper states: “The generated properties are then proven in a formal tool, and the CEXs are analyzed if any and fixed by the LLM agents” (Sec. III-A, p. 8). The authors report “syntactically incorrect or semantically irrelevant assertions” and “vacuous passes in formal properties” among the model failure modes (Sec. IV, p. 11).

## technique 2: critic feedback, bounded human intervention, and tool use

What it is. Saarthi combines coder–critic reflection, external execution, and human-in-the-loop (HIL) intervention. Section III-A specifies five unresolved iterations before a human is asked to provide the correct SVA (pp. 8–9). Algorithm 1 separately describes message handling with configurable mode and maximum automatic replies; it resets the counter on human interception (p. 9).

How to do it, following Algorithm 1 (p. 9):

1. initialize an active conversation and counter 0
2. receive a message and stop the conversation if it is a termination message
3. in `NEVER` mode, auto-reply without requesting human input
4. in `TERMINATE` mode, auto-reply and increment the counter while it is below the maximum; at or above the maximum, request human input
5. for human choices `TERMINATE`, `SKIP`, or `INTERCEPT`, respectively stop the conversation, auto-reply, or process a human reply and reset the counter

Figure 10 connects a code executor and Python/TCL automation to formal tools, CEXs, and coverage (p. 7). The stated motivation for HIL is: “We call this approach “Human-in-the-Loop (HIL) AI” that uses human feedback to ensure the entire flow is exercised and does not get stuck at any point” (Sec. III-A, p. 9). Inference: this is a fallback for unresolved agent interactions, not a correctness proof or a bound on total verification time. The prose below Algorithm 1 says `NEVER` mode “terminates automatically”; the algorithm instead calls `ProcessAutoReply` in that mode and stops on a termination message (p. 9).

Verus form. Inference: set a bounded repair budget for each failed Verus verification, then request human review when revisions make no progress. Inference: preserve executable code and contracts during proof repair unless a specification revision is explicitly approved. Inference: attach verifier diagnostics and relevant test failures to repair messages; the paper does not evaluate this Verus adaptation.

Evidence and limits. The authors warn: “LLMs have context length and input token restrictions that can lead to truncated critical information in large RTL designs, resulting in inaccurate assertions” (Sec. IV, p. 10). Inference: tool feedback checks the encoded property; it cannot by itself establish that the property captures the intended requirement.

## technique 3: coverage feedback and benchmark measurement

What it is. After proving properties, Saarthi analyzes formal coverage and requests missing properties from the lead (Sec. III-A, p. 8). Its benchmark uses basic, intermediate, and advanced RTL designs and three KPIs: end-to-end success rate, formal coverage, and generated-assertion pass rate (Sec. IV, pp. 9–10). The paper defines the first KPI: “The first is “success rate” which determines the number of successful runs (i.e., end-to-end formal verification) out of the total runs” (p. 9). Tables IV–VI report Pass@1, Pass@2, and Pass@3 columns containing property counts, percentages proven, and coverage (pp. 10–11). The paper does not define those Pass@k labels as independent attempts or cumulative success probabilities.

For the basic 4-state FSM, GPT-4o Pass@1 has 6 properties, 100% proven, and 82.22% coverage; GPT-4-Turbo has 5 properties, 100% proven, and 80.95% coverage; Llama3 has 9 properties, 88.89% proven, and 65.23% coverage (Table IV, p. 10). For the intermediate synchronous FIFO, GPT-4o Pass@1 has 20 properties, 55% proven, and 91.67% coverage; GPT-4-Turbo has 12 properties, 41.67% proven, and 58.71% coverage; Llama3 has 12 properties, 8.33% proven, and 91.66% coverage (Table V, p. 10). Inference: these examples show that coverage and assertion-proving percentages measure different things; the coverage percentage alone does not establish that all generated assertions were proven.

The conclusion reports “an overall efficacy of around 40 %” (p. 12), without a calculation connecting it to the three KPIs. Inference: that omission prevents checking the aggregate's derivation from the reported tables; it is not evidence of an arithmetic error.

Verus form. Inference: define success as a crate passing Verus with unchanged specifications, coverage as the fraction of planned obligations discharged, and assertion pass rate as the fraction of generated lemmas accepted. Inference: define Pass@k explicitly and publish per-project and per-attempt denominators. Inference: a coverage agent could propose missing invariants, with human or specification-checker approval of new contracts. These are proposed VL measurements and controls, not measurements established by the RTL benchmark.

## trust, failures, and threat to VL

Inference: applying the workflow requires trust in the supplied specification, the meaning of the generated properties, the formal tool, orchestration, and coverage interpretation. Generated vPlans and SVA require checking against the intended behavior; formal proofs alone address their encoded properties.

The authors report: “Saarthi performs the best with the GPT-4o model and the worst with the Llama3-70B model” (Sec. IV, p. 10). They describe GPT-4-Turbo's assertion-proving results as more variable and Llama3-70B as needing more attempts. The failure discussion includes context truncation, prompt deviations, temperature sensitivity, implicit clocks/resets, misinterpreted RTL, syntax errors, irrelevant assertions, vacuous passes, redundant conditions, and signals absent from the specification (pp. 10–12).

Inference: Saarthi's lead–worker–critic–tool workflow suggests a structure for agent-written Verus proofs, including bounded repair and feedback about missing requirements. This paper does not evaluate Verus, Rust ownership, unsafe code, concurrency, or cross-crate invariants. Inference: transferring the workflow to VL would require contract-preservation checks and explicit reporting of what remains trusted; the reported efficacy does not establish a VL success rate.

## techniques for the catalog

- vPlan decomposition — convert a human specification into a natural-language property plan and assign SVA generation tasks (Sec. III-A, p. 8)
- critic and tool feedback — review generated assertions, prove them, and analyze CEXs in an iterative workflow (Sec. III-A, p. 8; Fig. 10, p. 7)
- human-in-the-loop threshold — request human help after unresolved iterations; Algorithm 1 defines terminate, skip, and intercept choices (Sec. III-A, p. 9)
- coverage feedback — after proving properties, analyze formal coverage and send missing-property feedback to the lead (Sec. III-A, p. 8)
- Inference: denominator-aware KPI reporting — define attempt semantics and publish the denominators needed to interpret success, coverage, and assertion pass rates

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The iteration control system uses threshold-based monitoring to prevent infinite loops, automatically triggering human intervention when resolution cannot be achieved autonomously."): checked the complete paper text, study quotations, numbers, references, workflow, HIL algorithm, and benchmark claims; corrected page references and quotations, removed unsupported repair details and the arithmetic-error claim, distinguished algorithm behavior from accompanying prose, and marked proposed VL adaptations and conclusions as inferences; did not reproduce experiments, inspect implementation code, or independently validate the formal proofs or coverage calculations.
