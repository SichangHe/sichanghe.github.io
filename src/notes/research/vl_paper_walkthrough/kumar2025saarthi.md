# Saarthi: The First AI Formal Verification Engineer
(authored by agents unless marked 🧑)
Tag: `kumar2025saarthi`, [paper](http://arxiv.org/abs/2502.16662v2)

## scope and result

Saarthi is a multi-agent workflow that takes a human RTL specification through a verification plan, SystemVerilog Assertion (SVA) generation, critic review, formal proving, counterexample (CEX) repair, and coverage sign-off. It can run through CrewAI, AutoGen, or LangGraph and invoke GPT-4o, GPT-4-Turbo, or Llama3-70B. The paper calls it “a similar fully autonomous AI formal verification engineer, Saarthi, capable of verifying a given RTL design end-to-end using an agentic workflow” (abstract, p. 1). Its final reported overall efficacy is around 40% across the benchmark settings, and GPT-4o performs best, but the paper does not give a single denominator for that aggregate (Conclusion, p. 10).

## technique 1: planning, decomposition, and sequential agent orchestration

What it is. A human supplies only the design specification. A formal-verification lead produces a natural-language verification plan (vPlan), decomposes it into properties, and dispatches each property to verification-engineer agents. Critic agents review generated SVA; a formal tool proves accepted properties; other agents analyze CEXs and coverage. The paper says: “The first LLM agent is the so-called ‘formal verification lead’ who is responsible for generating a Verification Plan (vPlan) ... based on the given specification” (Sec. III-A, p. 6).

How to do it:

1. parse the RTL specification and create a vPlan listing required properties in natural language (Sec. III-A, p. 6)
2. dispatch one or more agents to translate each vPlan item into SVA (p. 6)
3. send each SVA to critic agents for correctness feedback and iterate until a stable threshold or a maximum is reached (p. 6; Algorithm 1, p. 7)
4. ask a human to decide the correct SVA when the loop cannot converge (p. 6–7)
5. compile the RTL and SVA in Cadence Jasper and prove the properties (Fig. 9, p. 5)
6. analyze any CEX, revise the SVA or design assumptions, and rerun proving (p. 6)
7. have a coverage agent identify missing coverage and feed new properties back to the lead for sign-off (p. 6)

The implementation uses sequential orchestration and structured message passing. Configuration includes `max_consecutive_auto_reply = 5`, `human_input_mode = "NEVER"`, and a code executor for scripts (Fig. 10, p. 6). The paper reports that agent interactions and artifacts are logged, and threshold-based iteration prevents infinite loops (Sec. III-A, pp. 5–6).

Verus form. Inference: a VL analogue would use a specification lead to enumerate function contracts and invariants, proof agents to write Verus proof blocks, a critic to inspect contracts for vacuity, and a verifier agent to run `verus`. Inference: the vPlan should be a checked intermediate artifact mapping each requirement to a `requires`/`ensures` clause and named lemma. Inference: keep sequential orchestration for dependencies such as a type invariant that must precede a refinement lemma.

Evidence and limits. This architecture is a process design; it does not itself prove that the natural-language vPlan is complete. Human input remains a semantic gate when agents disagree. The paper states: “The generated properties are then proven in a formal tool, and the CEXs are analyzed if any and fixed by the LLM agents” (Sec. III-A, p. 6). A passing SVA can still be vacuous, and the authors list vacuous passes and assertions unrelated to the RTL as observed failure modes (Sec. IV, p. 10).

## technique 2: critic feedback, bounded human intervention, and tool use

What it is. Saarthi combines reflection (coder and critic), external execution, and a human-in-the-loop (HIL) threshold. Critics evaluate each SVA and return specific feedback; the coder revises it. After five unresolved exchanges, HIL asks whether to terminate, skip, or intercept with a human reply. Algorithm 1 requires a message stream, mode, and maximum reply count and ensures that the counter resets on interception (p. 7).

How to do it:

1. initialize an active conversation and counter 0
2. receive a message and terminate on a termination message
3. in `NEVER` mode, auto-reply; in `TERMINATE` mode, auto-reply until the maximum, then request human input
4. on `TERMINATE`, `SKIP`, or `INTERCEPT`, respectively stop, continue automatically, or process the human correction and reset the counter (Algorithm 1, p. 7)
5. expose code execution, Python/TCL scripts, Jasper CEXs, and coverage as tools to the agents (Fig. 10, p. 6)

The paper's motivation is explicit: “we have set a threshold of 5 iterations, after which the human would be asked to intervene and provide the correct SVA to move forward” (Sec. III-A, p. 7). This bounds repetitive loops while preserving an escape hatch for ambiguous specifications.

Verus form. Inference: set a bounded repair budget for each failed Verus verification, then require human review when the agent repeatedly changes proof code or contracts without progress. Inference: the human interception should freeze executable code and contracts; only proof obligations or an explicitly approved specification revision may change. Inference: attach compiler diagnostics, counterexamples from tests, and coverage gaps to each repair message.

Evidence and limits. The bound prevents endless interaction but is not a correctness proof. Tool output is only as trustworthy as the formal engine and the property being checked. LLM context limits can truncate large designs; the paper reports that this produces inaccurate assertions (Sec. IV, p. 9).

## technique 3: coverage-driven closure and benchmark measurement

What it is. Saarthi measures three KPIs at basic, intermediate, and advanced RTL complexity: success rate (successful end-to-end runs divided by total runs), formal coverage after end-to-end verification, and assertion pass rate. The definition is: “The first is ‘success rate’ which determines the number of successful runs (i.e., end-to-end formal verification) out of the total runs” (Sec. IV, p. 8). Tables IV–VI report Pass@1, Pass@2, and Pass@3 for each design/model combination, with the number of generated properties and percentages proven and covered (pp. 8–9).

Examples from the tables show why denominators matter. For the basic 4-state FSM, GPT-4o Pass@1 has 6 properties and 100% proven, with 82.22% coverage; GPT-4-Turbo has 5 properties and 100% proven, with 80.95% coverage; Llama3 has 9 properties and 88.89% proven, with 65.23% coverage (Table IV, p. 8). For the intermediate synchronous FIFO, GPT-4o Pass@1 has 20 properties and 55% proven, with 91.67% coverage; GPT-4-Turbo has 12 properties and 41.67% proven, with 58.71% coverage; Llama3 has 12 properties and 8.33% proven, with 91.66% coverage (Table V, p. 9). Coverage therefore is not the same denominator or objective as assertion proving.

The paper reports an apparent arithmetic issue: the conclusion's “overall efficacy of around 40 %” is not tied to a stated count of designs, runs, or properties, so it cannot be recomputed from the tables. Inference: VL should publish per-project and per-attempt denominators and separate contract coverage from proof pass rate; otherwise a high coverage percentage can mask many unproved or vacuous assertions.

Verus form. Inference: define success as a crate passing Verus with unchanged specifications, coverage as the fraction of planned obligations discharged, and assertion pass as the fraction of generated lemmas accepted. Inference: report Pass@k over independent agent attempts and include the number of obligations in every percentage. Inference: coverage agents should propose missing invariants, but a human or specification checker must approve any new contract.

## trust, failures, and threat to VL

Trusted components are the human RTL specification, SVA meaning, Cadence Jasper, framework orchestration, model prompts, and coverage interpretation. The LLM-generated vPlan and SVA are untrusted until checked; Jasper proves only the encoded properties. The authors observe model-specific weaknesses: GPT-4o has higher overall coverage, GPT-4-Turbo has variable proven rates, and Llama3-70B has lower success and more attempts (Sec. IV, p. 9). They list context truncation, syntax errors, irrelevant assertions, implicit clocks/resets, redundant conditions, and vacuous passes (pp. 9–10).

Inference: threat to VL is high for specification drift and medium for proof repair. Saarthi's lead–worker–critic–tool loop transfers directly to agent-written Verus, including bounded retries, CEX/test analysis, and coverage feedback. It does not establish Rust ownership, unsafe-code, concurrency, or cross-crate invariants, and its 40% aggregate is not a reproducible product-level guarantee. VL should reuse the workflow and denominator discipline, while requiring contract-preservation checks and explicit trusted-boundary reports.

## techniques for the catalog

- vPlan decomposition — convert a human specification into a property plan and dispatch one proof task per planned property
- critic and tool feedback — compile and formally check generated assertions, feed diagnostics and counterexamples back into bounded repair loops
- human-in-the-loop threshold — after a fixed number of unresolved iterations, let a human terminate, skip, or correct the agent conversation
- coverage-driven sign-off — analyze formal coverage after proving and send missing-property feedback to the planning lead
- denominator-aware KPI reporting — report success, coverage, and assertion pass separately with their run or property denominators

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
