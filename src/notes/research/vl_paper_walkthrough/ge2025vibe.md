# A Survey of Vibe Coding with Large Language Models
(authored by agents unless marked 🧑)
Tag: `ge2025vibe`, [paper](https://doi.org/10.48550/arxiv.2510.12399)

## paper focus and evidence boundary

Ge et al. survey the emerging workflow in which a human states intent, an LLM coding agent edits a project, and the human judges observable results. The paper defines Vibe Coding as an engineering methodology, formalizes the interaction as a constrained Markov decision process (CMDP), surveys model, agent, environment, and feedback techniques, and proposes five composable development models. It is a survey: most benchmark numbers and named systems are reported from cited papers, not new experiments in this paper. The authors write, “Drawing from systematic analysis of over 1000 research papers, we survey the entire vibe coding ecosystem.” (abstract, p. 1)

For VL, the useful content is the feedback and assurance pipeline: compile and static-analysis feedback, tests, runtime diagnostics, formal verification hooks, self-refinement, context retrieval, and human approval. The paper does not teach a Verus proof or machine-checked Rust contract. Inference: the Verus mappings below are design translations, not claims made by Ge et al.

## technique: formalize agent development as a constrained interactive process

scope and trigger

Use this model when an agent repeatedly changes a stateful repository and a human’s intent, project constraints, and execution evidence jointly determine the next action.

paper procedure

1. Define the triad `V = <H, P, Aθ>`. `H` translates domain requirements to instructions and evaluates outputs; `P` contains code, data, and domain knowledge; `Aθ` maps instructions, project context, and execution environment to outputs (§3.1, pp. 7–8).
2. Define the CMDP `VMDP = <SP, AH→Aθ, TAθ|P, RH, γ>`, where project state supplies the state space, human instructions trigger actions, project specifications constrain transitions, human evaluation supplies reward, and γ is the discount factor (§3.1, p. 8).
3. At each generation step, retrieve and filter a context subset `K` from project information, then generate code autoregressively under a context-window limit (§3.1, pp. 8–9).
4. Let human supervision split accepted output from a correction or new requirement. Full acceptance terminates; a correction causes local refinement; a new requirement expands the instruction set (Equation 4, p. 9).
5. Preserve monotonic requirement growth `I_k ⊆ I_{k+1}` and optimize weighted stage rewards while satisfying the context limit (Equations 5–6, p. 10).

The paper’s exact statement is: “The collaboration among the three parties can be modeled as a Constrained Markov Decision Process (Constrained MDP) [34].” (§3.1, p. 8)

Verus form

Inference: represent the project state and requirements as ghost state, define a `spec fn` transition relation, and use `requires`/`ensures` on each agent action wrapper. Encode safety constraints as predicates that every transition must preserve. A Verus `proof fn` can establish monotonic requirements and preservation of an abstract contract across edits, but the LLM itself remains outside the proof. Inference: VL should treat compiler, test, and Verus results as typed observations in the transition model rather than as unstructured text.

evidence and limits

The formal equations are a conceptual model; the paper does not prove convergence to the human’s ideal output. The objective uses an unobserved ideal `Y*` and a reward function `R`, so its quality depends on human evaluation and context retrieval. Inference: this is a planning abstraction, not evidence that a deployed agent is safe.

## technique: context engineering under a fixed proof-relevant budget

scope and trigger

Use context engineering when a repository is too large for the model window or when generated code must follow local APIs, specifications, and rules.

paper procedure

1. Treat code, databases, domain documents, tool definitions, historical memory, and current tasks as separate context components (§3.1, pp. 8–9).
2. Build a retrieval strategy with assembly, retrieval, filtering, and ranking functions `F = {A, Retrieve, Filter, Rank}`.
3. Optimize expected output reward subject to `|C_F(τ)| ≤ L_max` (Equation 3, p. 9).
4. In the Context-Enhanced Model, build a vector index at project initialization or allow manual references; retrieve code snippets, documentation, and rules for each request (§8.6, p. 35).
5. Combine context enhancement with unconstrained, conversational, planning-driven, or test-driven workflows (§8.6, p. 35).

The survey says, “Core technologies of this model include retrieval-augmented generation, codebase vector indexing, documentation loading, and rule constraints.” (§8.6, p. 35)

Verus form

Inference: index Verus specifications, `requires`/`ensures`, invariants, trusted-boundary notes, and neighboring proof lemmas together with source code. Retrieval should prioritize the exact contract and its implementation, then relevant lemmas, then tests. A Verus proof can reject an implementation when the retrieved contract is inconsistent, but retrieval itself is not verified. Inference: VL should record which context items were used for each proof attempt so a passing proof can be audited against the intended requirement.

evidence and limits

The paper presents CEM as a taxonomy and design recommendation, not a controlled ablation. It claims better consistency in large-codebase maintenance, cross-file changes, and refactoring (§8.6, p. 35), but supplies no denominator or independent measurement for those claims. Context truncation can omit a security or proof assumption. Inference: context omission is a direct threat to agent-written verified Rust because Verus may prove a locally valid but globally incomplete contract.

## technique: compiler and static-analysis feedback as a repair loop

scope and trigger

Use this loop whenever generated code can be compiled or analyzed incrementally. It supplies objective diagnostics before or alongside execution.

paper procedure

1. Run a compiler or interpreter and capture either binary success or detailed error locations and reasons (§7.1.1, p. 26).
2. Add static analysis for coding rules, complexity, vulnerability, or specification checks. The survey names GCC and Python interpreters, Black, nuXmv, OClint, srcSlice, Frama-C, and Slither (§7.1.2, p. 26).
3. Feed diagnostics, relevant project context, and prior attempts to the agent; use a review or debugging agent to produce a structured repair prompt (§7.1.1, p. 26).
4. Repeat compile/analyze/repair until the quality gate passes. Multi-agent variants assign coding, static-analysis, and fuzzing roles; AutoSafeCoder is given as an example (§7.1.2, p. 26).
5. Combine compilation, static analysis, tests, runtime traces, and formal verification feedback rather than relying on one signal (§7.1.3, p. 27).

A key source sentence is: “Current systems employ comprehensive verification through multiple layers: syntactic correctness checking through compilers like GCC and Python interpreters, specialized tools including Black for formatting and nuXmv for formal verification, code complexity analysis utilizing OClint and srcSlice.” (§7.1.2, p. 26)

Verus form

Inference: run `cargo verus` after each material edit and feed exact failing obligations, source locations, and missing invariants to the agent. Keep lint, dependency, and unsafe-code checks in the same gate. A successful compiler run is only a syntax/type fact; a successful Verus run proves the stated contracts. The wrapper should preserve proof logs and the commit that produced them.

evidence and limits

The survey reports static-warning prioritization accuracy of 69–81% and one study’s 81.13% precision and 94.64% recall for inspecting thousands of warnings (§7.1.2, p. 26). These denominators are the warnings in the cited study, not all software warnings. It reports CompCoder compilation success increasing from 44.18% to 89.18% in its three-stage pipeline (§7.1.3, p. 27), but gives no common benchmark denominator in this survey. The paper warns that coarse compiler messages, context limits, false positives, and workflow inconsistency reduce benefit (§7.1.1, p. 26).

## technique: test-driven generation and execution feedback

scope and trigger

Use test-driven development (TDD) when executable acceptance criteria can express the required behavior and humans can author trustworthy tests.

paper procedure

1. Humans write failing tests and acceptance criteria before implementation.
2. The agent writes code to pass them.
3. Run unit or integration tests and return pass/fail, expected-versus-actual values, tracebacks, and runtime information.
4. Iterate generation and repair until the selected suite passes, then refactor while preserving tests. The survey identifies the classic red-green-refactor cycle (§8.5, p. 34).
5. For candidate selection, filter by test outcomes, use dual-execution agreement, or train a verifier/reranker (§7.2.2, p. 28).
6. For repository tasks, use a sandboxed interactive environment in which edits and tests produce rewards only when the evaluation condition passes (Table 4, pp. 27–28).

The paper states, “TDM employs test cases as precise constraints on AI, where tests serve as specifications, explicitly defining objective success criteria.” (§8.5, p. 34)

Verus form

Inference: write executable tests for functional behavior and Verus specifications for safety and invariants. Have the agent implement only after the contract and adversarial tests exist. Keep tests as evidence complementary to proofs: a test covers examples; Verus quantifies over the contract’s domain. A test harness can run `cargo test` and Verus in one gate, but passing tests cannot discharge an unproved proof obligation.

evidence and limits

The survey reports CodeT at 65.8% pass@1 on HumanEval (§7.2.1, p. 27), AlphaCode generating millions of programs and filtering by test outcomes (§7.2.1, p. 27), and SWE-Gym with 2,438 verified instances from 11 repositories and 64,689 raw instances (Table 4, p. 27). It also states that generated self-tests can be unreliable, tests can miss edge cases, and large candidate sets are expensive (§7.2.1, p. 27). Therefore test passing is not proof of semantic completeness.

## technique: self-refine with execution, critique, and memory

scope and trigger

Use self-refinement when a first agent output is often wrong but reliable external feedback is available.

paper procedure

1. Generate an initial answer or program.
2. Ask the model to critique that output using specified criteria.
3. Refine the output from the critique and iterate (§7.4.1, pp. 31–32).
4. For code, execute the program and provide tests, traces, or compiler errors; execution gives objective feedback (§7.4.1, p. 31).
5. In Reflexion-style systems, separate Actor, Evaluator, and Self-Reflection modules; store trajectory history as short-term memory and reflections as long-term memory (§7.4.3, p. 32).
6. Convert sparse rewards into specific natural-language feedback before the next attempt (§7.4.3, p. 32).

The survey gives the core sequence: “Self-Refine enabling LLMs to improve outputs through structured three-step processes: generating initial responses, prompting models to critique own outputs, and refining responses based on feedback.” (§7.4.1, p. 31)

Verus form

Inference: use the Verus verifier as the Evaluator. Give the agent the failing obligation and a bounded set of relevant lemmas; ask it to propose an invariant or contract edit, then rerun verification. Store successful repairs with the exact error and proof context as long-term memory. A proof result is objective only relative to the current specification, so human review must approve contract changes.

evidence and limits

The survey reports Self-Refine gains of 8.7 points in code optimization and 13.9 points in readability for GPT-4 (§7.4.1, p. 31), Reflexion 91% pass@1 on HumanEval versus GPT-4’s 80% (§7.4.3, p. 32), and about 20% absolute improvement across diverse tasks for Self-Refine (§7.4.3, p. 32). These are cited-study metrics with task-specific denominators. The authors also report that self-correction works mainly with reliable external feedback and may require large-scale fine-tuning (§7.4.1, p. 31).

## technique: integrate security analysis before, during, and after generation

scope and trigger

Use layered security feedback for generated production code, especially where outcome-only review can miss leaks, races, or vulnerabilities.

paper procedure

1. Before generation, detect security-sensitive prompt terms such as authentication, file upload, and SQL query; inject secure coding guidance or templates (§9.2.2, p. 37).
2. During streaming, run in-flight SAST over incomplete code and return vulnerability findings to the model for self-correction (§9.2.2, p. 37).
3. Execute generated code in an instrumented sandbox with just-in-time DAST, leak and exception monitoring, and fuzzing of new APIs or data functions (§9.2.2, p. 37).
4. Maintain a system-level threat model and inspect changes for new attack surfaces or policy violations (§9.2.2, p. 38).
5. Have a human interpret findings, resolve ambiguity, and make the final risk decision (§9.2.3, p. 38).

The paper’s architectural requirement is: “A robust Vibe Coding ecosystem must integrate automated analysis directly into the ‘prompt-generate-validate’ cycle.” (§9.2.2, p. 37)

Verus form

Inference: treat Verus contracts, unsafe-block reviews, dependency audits, and sandbox execution as separate layers. Before generation, retrieve the security and trust-boundary specifications. During generation, verify incrementally where possible. After generation, run tests, fuzzing, and dynamic checks in isolation. Require human approval for `external_body`, axiomatized models, changed contracts, or new unsafe code. These are VL recommendations inferred from the paper’s layered architecture.

evidence and limits

The paper presents this as an architecture proposal and says detailed real-time specifications are not standardized (§9.2.3, p. 38). It reports a cited finding of a tenfold increase in security warnings and technical debt within six months of autonomous-agent adoption (§9.3.1, p. 38), but does not provide the study’s denominator in the survey text. Inference: this statistic should not be generalized to all products without reading the cited source.

## technique: choose a development model by required assurance

scope and trigger

Use the taxonomy to select how much human control, up-front structure, testing, and context retrieval a project needs.

paper procedure

1. Classify the workflow on human quality control, structured constraints, and context-management capability (§8.1, p. 33).
2. Use UAM only for disposable prototypes and low-risk utilities; it accepts functionality without deep code inspection (§8.2, p. 33).
3. Use ICCM for iterative human review: agent generates, human understands and reviews, tests validate, and the human accepts or corrects (§8.3, pp. 33–34).
4. Use PDM when architecture matters: humans prepare technical specifications, coding rules, and implementation plans before incremental agent work (§8.4, p. 34).
5. Use TDM when tests are the primary machine-checkable constraints (§8.5, p. 34).
6. Layer CEM onto any model for retrieval of project code, documentation, and rules (§8.6, p. 35).

The paper’s summary is: “in TDM, machines verify while humans define standards.” (§8.1, p. 33)

Verus form

Inference: VL should use a PDM+CEM+TDM baseline for verified Rust: humans define architecture and proof obligations, retrieval supplies exact local contracts, tests and Verus check behavior, and humans approve changes to specifications. UAM is inappropriate for safety-critical verified components because a passing test or proof can still target the wrong contract. ICCM can handle low-risk maintenance when a human reads each proof change.

evidence and limits

Table 5 labels TDM as strict constraints, strict code quality, high maintainability, and no technical-debt risk, while UAM is fast but low quality and high risk (p. 35). This is the authors’ qualitative framework, not a controlled comparison. The paper explicitly says the five models are composable rather than mutually exclusive (§8.1, p. 33).

## what is proved, what remains trusted, and product threat

The paper proves no Verus theorem and reports no new formal-verification experiment. It surveys methods and cited results: compiler/static analysis, unit and integration tests, formal-verification feedback, self-refinement, security analysis, and context retrieval. Its formal CMDP and taxonomy are conceptual models. The cited benchmark percentages have task-specific denominators; they cannot be read as universal reliability rates. Generated tests, reward models, retrieval, human judgments, static analyzers, compilers, LLM behavior, sandbox isolation, and the correctness of the target specification remain trusted or partially trusted.

Already done that VL should not redo as generic ideas: iterative compile/test/repair; multi-layer static, dynamic, and formal feedback; TDD as machine-checkable constraints; self-refine and reflection memory; retrieval-based context engineering; and human final arbitration. Inference: VL’s useful contribution is to bind these ideas to Verus contracts, exact proof logs, trust-boundary accounting, and regression checks that prevent contract weakening. Inference: the largest threat to agent-written verified Rust is specification drift or omission. A proof can pass after an agent weakens `ensures`, retrieves incomplete context, or tests only generated examples. The survey’s own warning that generated tests may be unreliable makes proof-plus-test-plus-human contract review necessary.

## techniques for the catalog

- constrained agent process — model human intent, project state, agent actions, transition constraints, and execution feedback as a CMDP
- context engineering — retrieve and rank code, specifications, rules, tools, memory, and tasks under a context-window limit
- compiler repair loop — compile, return structured diagnostics, and iteratively repair with project context
- static-analysis feedback — combine syntax, complexity, vulnerability, fuzzing, and specification analyzers in a multi-agent gate
- test-driven generation — author acceptance tests first, generate implementation, and iterate through red-green-refactor
- execution candidate filtering — select or rerank generated programs by test outcomes, dual execution, or learned verifiers
- self-refine cycle — generate, critique, refine, and repeat using execution traces or other reliable feedback
- reflection memory — separate actor, evaluator, and reflection roles and store trajectory and long-term lessons
- layered security loop — inject secure context, scan in flight, sandbox and fuzz execution, and maintain a threat model
- assurance taxonomy — choose UAM, ICCM, PDM, TDM, and CEM according to human control and constraint needs
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
