# The Impact of GenAI on the Future of Requirements Engineering
(authored by agents unless marked 🧑)
Tag: `breaux2026impact`, [paper](https://arxiv.org/abs/2609.05667) (arXiv id from the paper's first page; the DOI in the earlier link is the paper's reference [10], a different article)

## central claim and limits

The abstract says, “As implementation becomes less expensive through generalist SE agents, engineering effort shifts away from writing correct code and toward expressing, curating, verifying, and evaluating requirements.” The introduction sharpens the claim: “as implementation becomes cheaper through agents, RE shifts to operational specifications, context curation, verification, and evaluation” (Introduction, p. 2). These are the authors' claims from a broad, non-systematic survey; the paper explicitly says, “This review is not systematic nor is it comprehensive” (Section 2, p. 3).

## technique 1: spec-driven development as a validation-to-verification path

What it is. Spec-driven development (SDD) turns validated requirements into executable or checkable artifacts and uses them to constrain downstream generated code, tests, and documentation. The paper states, “Spec-driven development proposes to create a path from validation to verification by turning validated requirements into executable or checkable artifacts” (Section 5.1.1, p. 12).

When to use it. Use SDD when an agent will implement or modify a system over multiple steps and the team needs a stable behavioral target. The spec should contain preconditions, postconditions, constraints, and acceptance tests, then remain connected to generated artifacts.

How it is done. Inference: first validate the requirement with stakeholders and source evidence, translate it into an executable/checkable specification, generate code, tests, and documentation from or alongside that spec, and reject outputs that violate it. The paper itself only says, “generated code, generated tests, and generated documentation must be checked against behavior intended by the spec” (Section 5.1.1, p. 12). It reports that “executable behavioral specifications encode pre-conditions and post-conditions that can accept valid behavior and reject invalid behavior” (Section 5.1.1, p. 12).

Verus form. Inference: write Rust functions with `requires` and `ensures`; use `spec fn` for mathematical predicates, `proof fn` for lemmas, and loop `invariant` clauses for iterative behavior. Keep the natural-language requirement as traceable source text and make the Verus contract the checkable artifact. Verus does not auto-derive a correct contract from prose; a human or separate translator must supply and review it. `ensures` belongs on executable/proof functions, not on `spec fn` declarations.

Evidence and limits. This section cites preliminary work and makes a proposal; it reports no controlled accuracy or coverage denominator of its own. Elsewhere it notes that LLMs struggle to generate executable behavioral specifications at repository level, “where the best model in CodeSpecBench solves only 20.2% of tasks [28]” (Section 4.3, p. 10), a figure from a cited benchmark, not this paper's experiment. The article also says auto-formalization may translate natural-language mathematics into specifications and proofs, while neuro-symbolic methods may offload parts of verification to theorem provers/model checkers (Section 5.1.1, p. 12). Inference: these are opportunities, not evidence that generated formalizations are sound.

## technique 2: bridge requirements to verification with traces and tests

What it is. Requirements verification checks whether design and code satisfy requirements. The survey distinguishes this from validation and lists test generation and trace-link discovery as bridges. It says, “Less work covers requirements verification, which concerns checking whether design specifications and code satisfy requirements” (Section 5.1.1, p. 11).

When to use it. Inference: use trace links whenever an agent changes code or a specification so each requirement can be followed to its contract, proof, test, and implementation. Use generated tests as executable checks of observable behavior, while formal proofs cover properties tests cannot exhaustively sample.

How it is done. Decompose an abstract requirement into programming tasks, design decisions, and architectural constraints; the paper notes developers currently do this manually because requirements are often too abstract for prompts (Section 5.1.1, p. 11). Inference: generate or recover links between requirement text, code, tests, and proof artifacts, run tests and the verifier, then inspect changed links when a requirement evolves. The survey lists “formal specifications from natural-language requirements [122]” among generation work (Section 2, p. 4) and “Trace recovery [59]” under traceability (Table 1, p. 3).

Verus form. Inference: put each requirement identifier in comments or module documentation adjacent to the corresponding `requires`/`ensures` and proof lemma. Use executable tests for examples and Verus contracts for universal claims. A CI script can require that changed requirement identifiers have a passing proof and test. This linkage is process infrastructure; Verus itself does not provide traceability management.

Evidence and limits. The survey reports prior studies but not a single common benchmark. It warns that generated artifacts can add unstated assumptions: “scenarios that one could generate from such stories can include additional assumptions ... which are missing or not explicitly stated in the original stories” (Section 2, p. 4). Therefore generated contracts require review for invented premises.

## technique 3: long-horizon requirements tasks and cascading-error evaluation

What it is. The paper argues that singular-task scores do not show whether requirements are useful downstream. It proposes long-horizon (multi-step) benchmarks that run elicitation, analysis, planning, implementation, tracing, and testing together. “RE therefore needs long-horizon benchmarks that evaluate requirements utility beyond singular tasks” (Section 5.1.2, p. 12).

When to use it. Use this evaluation for an agent that edits a real repository, because errors in an early requirement or plan can propagate through generated code and proofs. It tests whether the whole workflow preserves intent, rather than whether one text artifact is fluent.

How it is done. Build tasks from real repositories and requirements. The paper lists tasks where agents elicit and analyze real requirements, surface conflicts, plan an implementation, maintain traces, and test requirements satisfiability (Section 5.1.2, p. 12).

Verus form. Inference: an evaluation harness can score build success, Verus verification success, test outcomes, proof repair count, and trace preservation across a sequence of commits. Keep the proof obligations fixed or versioned so agents cannot obtain passing results by weakening specifications. This is an experiment design, not a Verus construct.

## technique 4: requirements evolution and context management

What it is. In SDD, a change request is first interpreted as a change to specification files, then propagated to affected scenarios, constraints, plans, tests, and code. The paper says, “When specifications guide implementation, a change request should first be interpreted as a proposed change to existing spec files” (Section 5.1.4, p. 14).

When to use it. Use this workflow in brownfield repositories where existing behavior must be preserved while adding functionality. Version and maintain agent-facing context files, and scope retrieved context to the current task.

How it is done. Identify the changed requirement. Compute affected artifacts and traces. Inference: update the spec, tests, proofs, and code in dependency order, and run conflict detection and verification. The paper says the goal is “to detect conflicts early, propagate accepted changes to the correct artifacts, and preserve traceability across repeated AI-driven software revisions” (Section 5.1.4, p. 14). Maintain context files and remove irrelevant instructions; the paper reports that context files can reduce development time or increase task failure depending on how they are written (Section 5.1.4, p. 14). Candidate retrieval methods include recursive summarization, hierarchical memory, and graph-based retrieval (Section 5.1.4, p. 14).

Verus form. Inference: treat contracts and proof lemmas as versioned artifacts. On a change, run Verus on all affected modules, preserve old behavior with explicit `ensures` clauses, and use `old(...)` to relate pre-state values when needed. A dependency graph can map requirements to functions and proofs; the graph itself is trusted bookkeeping and needs CI checks.

## technique 5: evaluate utility rather than fluency

What it is. Traditional text-overlap metrics and human ratings can reward fluent but incorrect requirements. The survey notes, “ROUGE ... can exhibit measured improvement when the generated text contains hallucinations” (Section 5.1.3, p. 13), and says LLM judges can be biased and in some settings only slightly better than random guessing (Section 5.1.3, p. 13).

When to use it. Use outcome metrics when evaluating generated requirements, specifications, or trace explanations. Measure whether the artifact makes the downstream system correct and useful, not whether it reads naturally.

How it is done. Define an oracle or deterministic acceptance test. Evaluate generated specs by running code, tests, model checks, and Verus proofs; score requirement preservation and final behavior. For agent tasks, the paper gives pass@k as an example: it “estimates whether at least one of k agent-generated code samples passes oracle test cases” (Section 5.1.3, p. 14; also Section 4.2.2, p. 9). Inference: report k and the number of tasks and samples, and do not treat a prose judge as proof.

Verus form. Inference: count verified functions over the total attempted, tests passed over tests run, and trace links preserved over links expected. Report pass@k with its denominator and specification version. A passing proof is evidence about the encoded contract, not about unencoded stakeholder intent.

## technique 6: auto-formalization and neuro-symbolic checking

What it is. The paper identifies a bridge from language models to formal methods: translate natural-language requirements into logical specifications, then check them with theorem provers or model checkers. It says, “Neuro-symbolic reasoning is a promising advance that combines the statistical, translation capabilities of LLMs with the formal guarantees of theorem proving and model checking” (Section 3.2, p. 8).

When to use it. Use this when requirements are written in prose but the property can be expressed in logic, contracts, temporal formulas, or an executable model. Inference: treat the generated formula as a candidate that needs review and counterexample-driven correction.

How it is done. The paper reports that translating natural-language problems into logic improved “by decomposing and chaining translations of atomic formulae needed to construct complex logic [153]” (Section 3.2, p. 7). It calls translation of natural language requirements into formal specifications “auto-formalization” and says these can be checked by model checkers and verifiers (Section 3.2, p. 8). Inference: run a model checker or verifier on the result and feed counterexamples or failed proof obligations back into the translation; the paper does not describe this loop.

Verus form. Inference: ask an agent to draft `spec fn`, `requires`, and `ensures`, then run Verus and require a human to review the resulting contract against the prose. Use counterexamples and failed obligations as repair feedback. Verus establishes the formal contract, not that the translation captured stakeholder intent.

Evidence and limits. This is a surveyed research direction, not an evaluation in this paper. The authors note that chain-of-thought improvements are limited on some tasks and that generated reasoning is not necessarily faithful (Section 3.2, p. 7).

## technique 7: agent action-observation loops with explicit skills

What it is. Generalist agents use a thought-action-observe loop: plan a tool call, observe its result, and retry or choose another action when errors appear. The paper says, “The thought-action-observe (TAO) loop introduced by ReAct [196] is the foundation of modern LLM-based agents” (Section 4.2.1, p. 9). Skills package tools with applicability conditions, execution policies, termination criteria, and reusable interfaces.

When to use it. Use a TAO loop for repository-level verification where the agent must inspect code, edit contracts, run tests, run Verus, and respond to diagnostics. Inference: define a skill for each tool sequence so the agent does not invent unsafe command order.

How it is done. Expose tools for search, editing, compilation, testing, and verification. Have the agent select a tool, execute it, observe diagnostics, and record the next action. Inference: stop on a verified artifact or a bounded failure. The paper describes skills as procedures with “explicit applicability conditions, execution policies, termination criteria, and reusable interfaces” (Section 4.2.1, p. 9).

Verus form. Inference: make `cargo check`, tests, and `verus` separate tools whose outputs are recorded as evidence. Require the final skill state to include a passing proof and unchanged specification identifiers. Tool success is evidence about the current checkout; it does not prove that the agent's requirements are complete.

Evidence and limits. The survey warns that long-horizon tasks lead to compounding errors (Section 4.2.2, p. 9) and that small changes to tool descriptions can impact tool selection reliability (Section 4.2.1, p. 9). It gives no Verus-specific success rate.

## what is proved, measured, and trusted

Proved or measured in this paper: a literature survey, a taxonomy of AI-supported RE tasks (Table 1, p. 3), and conceptual recommendations. The review is explicitly non-systematic and non-comprehensive; no new verifier, proof corpus, or benchmark result is established. Trusted: cited studies, the survey authors' interpretation, and any external LLM/tool results they discuss. The paper's recommendations for SDD, long-horizon evaluation, traceability, and utility metrics are claims for future work.

## techniques for the catalog

- spec-driven development — turn validated requirements into executable/checkable artifacts and check generated code, tests, and documentation against them
- requirement-to-proof tracing — connect each requirement to contracts, tests, proofs, and implementation changes
- long-horizon evaluation — measure multi-step agent work on real repositories with deterministic final outcomes
- evolution and context management — propagate spec changes through affected artifacts and scope agent context
- utility-based evaluation — score behavior, proof, tests, and trace preservation instead of fluency
- auto-formalization — translate prose into logic and check it with theorem provers or model checkers
- action-observation skills — package tool calls with applicability, execution, termination, and evidence rules
