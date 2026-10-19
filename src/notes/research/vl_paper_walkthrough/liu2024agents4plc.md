# Agents4PLC: Automating Closed-Loop PLC Code Generation and Verification in Industrial Control Systems Using LLM-Based Agents
(authored by agents unless marked 🧑)
Tag: `liu2024agents4plc`, [paper](https://arxiv.org/abs/2410.14209)

## scope and result
Agents4PLC generates Structured Text (ST) PLC code from natural-language requirements through retrieval, planning, coding, debugging, and validation agents. The authors distinguish their code-level verification from LLM4PLC's specification-level verification (Section I, p. 2). Their abstract says, “We first establish a comprehensive benchmark for verifiable PLC code generation area, transitioning from natural language requirements to human-written-verified formal specifications and reference PLC code.” (Abstract, p. 1). The paper is arXiv:2410.14209v2, dated 25 December 2024 (p. 1); the link above uses that identifier.

## technique 1: staged generation with compiler and formal validation
The workflow proceeds as follows (Section III-A, p. 3; Section III-B, pp. 4–5; Figure 2, p. 4):

1. Retrieval Agent analyzes the requirement and retrieves relevant PLC documents, programming references, and ST code. It searches a vector database and can access web search and internal databases.
2. Planning Agent receives the requirement and retrieved information, generates actionable plans in a structured automata-like format, and ranks them for sequential execution.
3. Coding Agent converts a selected plan into ST code. RAG supplies PLC documentation and validated ST samples; prompts supply compiler requirements, validation criteria, module roles, and operational constraints.
4. Validation Agent compiles the code. Compiler errors go to Debugging Agent, which produces syntactic fixing advice from error locations and reasons.
5. After successful compilation, Validation Agent checks functional properties. For failures, Debugging Agent produces semantic fixing advice by examining the violated property, its cause, and likely responsible code.
6. Debugging Agent's fixed-code component combines advice, generated code, the active plan, and RAG resources to repair the code and return it to validation. Section III-A also describes debugging advice returning to Coding Agent; Section III-B-4 explicitly assigns fixed-code generation to Debugging Agent.
7. Successful validation ends generation. Otherwise, the workflow iterates until it exceeds a predefined loop threshold, when Planning Agent supplies another plan. Figure 2 depicts selecting the next plan when the iterative turn equals the threshold.

The authors describe code generation directly: “The Coding Agent is pivotal in converting the detailed plans from the upstream agent into ST code, ensuring compliance with both syntactic and semantic requirements.” (Section III-B-3, p. 4). For debugging, they write, “The use of RAG for code generation also proves effective during the debugging phase.” (Section III-B-4, p. 5). Syntactic and semantic fixing use step-by-step Chain-of-Thought; the debugging optimization also describes reusing previously generated patches in a self-RAG context (Section III-B-4, p. 5).

Figure 3 (p. 4) illustrates PB1/PB2 Boolean inputs and an LED output with `LED := PB1 AND NOT PB2;`. Its displayed property requires LED to be true at cycle end if PB1 is true and PB2 false at the same cycle end. Inference: this one implication does not alone specify every input combination. For a Verus adaptation, generation could produce Rust and contracts, compilation and Verus could supply the prerequisite check for acceptance, and repair could consume their diagnostics. Retrieval and planning guide generation; verifier results establish whether the checked obligations hold.

## technique 2: property generation and translation-based formal checking
When users supply no formal specifications, Validation Agent uses an LLM to generate them. The authors state, “These specifications are derived from user input, industry standards, and general safety requirements, and they are structured to meet the format required by formal verification tools.” (Section III-B-5, p. 5). Section III-B-5 (p. 6) also describes using CoT for specification generation.

The translation component converts generated ST into representations compatible with tools such as SMV or CBMC. The paper allows LLM-driven translation or specialized tools such as PLCverif; it describes integrating PLCverif for translation supporting model checking and bounded model checking. It warns about inconsistencies between original ST and translated code and about state explosion, while saying PLCverif may help alleviate the latter (Section III-B-5, pp. 5–6). Background and related work name nuXmv and PLCverif as backend verifiers (Section II-B-2, p. 2; Section VI-B, p. 10).

Inference: generated properties need an authority independent of the generator to establish that they express the intended requirements. For Verus, checking generated Rust directly would avoid this ST translation boundary. If a translation is retained, its correctness becomes another assumption unless established separately. Repair prompts can include the failing obligation and source location, but repaired proofs still need verifier checks.

## evidence and denominators
The benchmark contains 23 tasks: 16 easy tasks with 58 properties, including 53 non-trivial properties, and seven medium tasks with 43 properties, including 38 non-trivial properties. Models are CodeLlama 34B, DeepSeek V2.5, GPT-4o, and GPT-4o-mini; retrieval uses text-embedding-ada-002. CodeLlama runs on one NVIDIA A800 80GB PCIe GPU with pretrained LoRAs from LLM4PLC; the other models use online APIs (Section IV and Section V-A, p. 6).

Metric definitions are inconsistent. Section IV (p. 6) describes pass rate through pass@k, requiring a generated result to compile and meet functional requirements, and verifiable rate through syntax acceptance by the target verification language. Section V-A (p. 7) instead says, "where “verifiable rate” means the framework can generate verifiable model for at least 80% of the given properties, and “pass rate” means that least 80% of the generated code can compile." Inference: these descriptions do not establish a single unambiguous functional-success criterion; the following figures are reported table results, not independently established correctness rates.

Table III (p. 10) gives Agents4PLC the following results:

- DeepSeek V2.5, GPT-4o, and GPT-4o-mini each compile 16/16 easy tasks and 7/7 medium tasks. CodeLlama compiles 5/16 easy tasks (31.3%) and 1/7 medium tasks (14.3%).
- GPT-4o has the highest easy verifiable rate, 11/16 (68.8%), and pass rate, 8/16 (50.0%).
- GPT-4o and DeepSeek V2.5 each have medium verifiable rate 3/7 (42.9%); GPT-4o has the highest medium pass rate, 2/7 (28.6%).

These are task denominators. The prose's 68% easy and 42.3% medium verifiable rates, and its claim that every model compiles all medium tasks, conflict with Table III (Section V-A, p. 7). Table III also gives LLM4PLC/GPT-4o an easy verifiable count of zero but a pass count of two, and ChatDev verification/pass entries are NA despite numeric claims in the prose. Inference: these discrepancies limit comparisons based on the reported metrics.

Efficiency Table I (p. 8) counts attempts among cases that eventually compile; it does not report elapsed times. The authors exclude PLCverif from this efficiency evaluation (Section V-B, p. 7). For Agents4PLC, DeepSeek V2.5, GPT-4o, and GPT-4o-mini pass syntax on the first attempt for 16/16 easy and 7/7 medium cases. CodeLlama passes 4/5 eventually compiling easy cases on the first attempt and the remaining case on the second; its one eventually compiling medium case passes on the first attempt. Inference: the 4/5 figure measures first-attempt success among compiling cases, not syntax success over the easy benchmark.

In Table II (p. 8), the full one-shot+RAG+syntax-hint configuration has easy syntax 16/16, pass 8/16 (50.0%), and verifiable 11/16 (68.8%). Removing RAG gives easy pass 11/16 (68.8%) and verifiable 12/16 (75.0%). For medium tasks, the full configuration has syntax 7/7, pass 2/7 (28.6%), and verifiable 3/7 (42.9%); removing RAG reduces pass to 1/7 (14.3%). Inference: RAG's measured effect depends on the task subset. The authors caution that frequent first-attempt success may prevent these experiments from fully capturing debugging effectiveness (Section V-C, p. 9).

The practical study uses UWinTech, links monitoring/control points to a simulation model, and uploads generated ST to a control station. It lists four tasks and illustrates LED control, motor control, and temperature/relay updates (Section V-D and Figures 4–6, p. 9). Inference: these demonstrations do not establish Rust/Verus proof performance or unrestricted industrial deployment correctness.

## proved, trusted, and product threat
Inference: the evidence supports reported benchmark outcomes and practical demonstrations subject to the metric inconsistencies above. A formal result depends on the chosen properties, ST translation, verifier assumptions, and their relationship to the requirements. Human-written reference specifications and automatically generated properties are different sources of obligations; neither source alone proves that all intended behavior is covered. For VL, the transferable idea is a bounded generation/repair workflow driven by compiler and verifier feedback. Claims about preserving intended contracts or proving Rust require separate evidence. A human/specification authority boundary and direct Verus checks would address different risks from role separation and RAG alone.

## techniques for the catalog
- role-separated closed loop: retrieval and planning guide coding; compiler and formal verification results drive debugging
- RAG plus domain prompts: use PLC references, validated ST samples, compiler requirements, and operational constraints in generation and repair
- property generation: generate verifier-format specifications when users supply none; Inference: separately establish their agreement with intended requirements
- translation-based model checking: translate ST for model checking or BMC, acknowledging translation inconsistency and state explosion
- bounded repair: iterate fixes until validation succeeds or the loop threshold triggers another plan

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Each model is provided with user requirements, code skeletons, and natural language specifications to generate ST code."): read the full paper text and study; checked quotations, numbers, section/page references, workflow, and catalog; corrected repair ownership, CodeLlama denominators, table values and locations, efficiency interpretation, and unsupported details; recorded inconsistent metric definitions and table/prose results; did not reproduce experiments or inspect linked code, benchmark artifacts, or cited papers.
