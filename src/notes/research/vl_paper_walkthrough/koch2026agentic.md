# Agentic Agile-V: From Vibe Coding to Verified Engineering in Software and Hardware Development
(authored by agents unless marked 🧑)
Tag: `koch2026agentic`, [paper](https://arxiv.org/abs/2605.20456)

## purpose and scope

This paper proposes a process for using coding agents in software, firmware, and hardware while retaining verification evidence and human approval. Its contribution is a synthesis and process framework, not a new benchmark. The paper states: “This paper uses a bounded evidence synthesis rather than a quantitative meta-analysis.” (Section III, PDF p. 3.) The evidence sources are agentic-engineering surveys and tools, empirical productivity and pull-request studies, repository-configuration and execution studies, and hardware, firmware, and design-verification benchmarks (Section III, PDF p. 3).

The central claim is a separation of discovery, implementation, and acceptance: “Conversation is useful for discovering intent; structured artifacts are required for implementation; evidence is required for acceptance.” (Abstract, PDF p. 1.) The framework combines an Agile-V lifecycle with a task loop called SCOPE-V: Specify, Constrain, Orchestrate, Prove, Evolve, Verify (Abstract, PDF p. 1; Section V, PDF p. 4).

Inference: for VeruLaw (VL), the useful object is an evidence-gated task contract around agent-written Rust and Verus proofs. The paper does not discuss Rust or Verus, so the mapping below is an inference.

## technique 1: the conversation-to-contract gate

What it is. The paper treats conversation as an exploration phase and requires a reviewed execution brief before implementation. It identifies long-chat failure modes: “they contain superseded assumptions; constraints are often implicit; acceptance criteria are rarely executable; agents may overfit to recent turns; reviewers cannot easily audit which instruction governed a change.” (Section IV-A, PDF p. 4.) Its operational rule is explicit: “Do not let an agent implement from a long chat. Let it implement from a reviewed brief.” (Section VII-C, PDF p. 6.)

When to use it. Structure is mandatory when a task affects “public APIs, safety, security, performance, hardware behavior, regulated workflows, customer-facing behavior, shared libraries, or persistent data.” (Section VII-B, PDF p. 6.) Conversation remains appropriate for clarifying requirements, brainstorming architecture, identifying missing constraints, comparing test strategies, and exploring failure modes (Section VII-A, PDF p. 6).

How to apply it.

1. Use conversation to clarify requirements, alternatives, missing constraints, and risks (Section VII-A, PDF p. 6).
2. Convert the selected intent into a task brief with objective, scope, non-goals, affected modules, dependencies, acceptance criteria, and required evidence (Section V-B, PDF p. 4).
3. Review the brief before edits; do not use the unstructured chat as the implementation contract (Section VII-C, PDF p. 6).
4. Preserve decision-relevant context only. The paper says the goal is “not maximum context, but decision-relevant context.” (Section VII-C, PDF p. 6.)

Verus form. Inference: put the brief's objective and acceptance criteria into Rust function contracts (`requires`, `ensures`) and datatype invariants where appropriate. Keep non-goals and affected modules in the task document. A Verus proof should be required evidence, alongside tests and review; the paper's brief does not specify Verus syntax. The conversation-to-contract gate does not itself prove that a specification matches the real requirement.

Evidence and limits. The paper provides a process rationale and cites mixed evidence about repository instruction files: relevant instructions can help efficiency, while unnecessary or mismatched instructions can harm success (Section VII-C, PDF p. 6). It does not report a controlled experiment of this gate. Inference: effectiveness for VL remains to be measured.

## technique 2: SCOPE-V task loop

What it is. SCOPE-V is the paper's six-step micro-cycle inside Agile-V. The paper defines the principle: “Agile-V controls the lifecycle; SCOPE-V controls the agentic task.” (Section V-C, PDF p. 5.)

How to apply it.

1. Specify: write objective, scope, non-goals, affected modules, dependencies, acceptance criteria, and required evidence (Section V-B, PDF p. 4).
2. Constrain: state boundaries such as no unapproved public-API change, no unrelated files, no unjustified dependencies, no broad refactor in a bug fix, and explicit review for security-sensitive code; preserve hardware timing and safety constraints where relevant (Section V-B, PDF p. 4).
3. Orchestrate: require inspection first, a design summary, a plan, small implementation slices, local checks, a diff summary, and residual risks (Section V-B, PDF p. 4).
4. Prove: require evidence appropriate to the task, including unit or integration tests, regression tests, static analysis, type checks, linting, security scans, simulation, formal checks, hardware-in-the-loop results, or review checklists (Section V-B, PDF p. 4).
5. Evolve: feed validated learning into repository instructions, templates, tests, and engineering baselines, and remove stale or harmful instructions (Section V-B, PDF p. 5).
6. Verify: repeat verification before implementation, during patching, before merge, after deployment, and after field feedback (Section V-B, PDF p. 5).

Verus form. Inference: Specify becomes a Verus specification and proof obligation; Constrain becomes module boundaries, ownership discipline, and explicit preconditions; Orchestrate becomes a plan to inspect code, state invariants, implement a small slice, and run `cargo verus`; Prove becomes discharged `ensures`/invariant obligations plus executable tests; Evolve becomes maintenance of shared proof lemmas and task templates; Verify becomes repeated proof and regression runs at each lifecycle gate. Verus proof functions and specifications are erased from runtime, so runtime tests remain necessary for behavior outside the modeled specification.

Evidence and limits. The paper gives the six-step procedure, but no per-step success rate. It warns that verification debt grows when output volume exceeds verification capacity, producing “weak tests, hidden regressions, broad patches, unvalidated dependencies, undocumented behavior, and increased reviewer burden.” (Section IV-B, PDF p. 4.) Inference: a VL deployment should record proof failures, repair time, escaped defects, and review load rather than counting generated code.

## technique 3: risk-adaptive acceptance gates and evidence bundles

What it is. The paper classifies tasks as R0 exploratory, R1 routine, R2 production, and R3 high assurance. Its acceptance rule is: “Agent output is not accepted because it is plausible; it is accepted because it satisfies evidence appropriate to its risk level.” (Section IX, PDF p. 7.)

How to apply it.

1. Classify the task. R0 covers throwaway prototypes and drafts; R1 covers documentation, small refactors, and non-critical UI; R2 covers feature changes, bug fixes, public APIs, and database migrations; R3 covers security, payments, medical, firmware, hardware, and safety-related behavior (Table II, PDF p. 7).
2. Require the corresponding evidence. R0 needs a smoke test or manual run; R1 needs targeted tests, lint/type checks, and a diff summary; R2 needs regression tests, CI, static/security checks, and a rollback plan; R3 needs traceable requirements, independent tests, simulation/formal/HIL evidence as applicable, and an audit artifact (Table II, PDF p. 7).
3. Apply the human gate. R0 review is optional, R1 receives normal code review, R2 requires a reviewer, and R3 requires explicit sign-off and a release gate (Table II, PDF p. 7).
4. For R2/R3, store a minimum evidence bundle: task brief and requirement identifiers; agent plan and affected files; executed commands and test results; diff summary and residual risks; trace from acceptance criteria to tests; reviewer decision and follow-up actions; and rollback or recovery path (Section IX-A, PDF p. 7).
5. For firmware or hardware, add simulation logs, formal-check results where applicable, hardware-in-the-loop records, toolchain version, board revision, and timing/protocol evidence (Section IX-A, PDF p. 7).

Verus form. Inference: classify a public API, safety property, or production storage change as at least R2 and require a passing Verus verification run, relevant Rust tests, and a review record. For R3, require independent review or an independently authored proof/test where feasible, plus a trace from each requirement to a Verus contract or lemma and to test evidence. Keep solver output, tool versions, and the exact source revision in the bundle.

Evidence and limits. These gates are proposed controls, not experimentally validated thresholds. The paper says, “This paper is a synthesis and process proposal, not a new benchmark.” (Section X-D, PDF p. 8.) Inference: the risk levels should be calibrated against VL's actual defect and proof-repair data rather than treated as universal.

## technique 4: feature, bug-fix, testing, and hardware workflows

Feature workflow. The paper gives this sequence (Section VIII-A, PDF p. 6): write a feature brief with goal, non-goals, and acceptance criteria; identify affected modules, APIs, data structures, and tests; ask the agent to inspect and summarize current design; require a plan before edits; implement the smallest useful slice; add or update tests alongside implementation; run targeted and regression checks; produce a diff summary, evidence bundle, and residual-risk note; and require human review for architecture, security, maintainability, and edge cases.

Bug-fix workflow. The paper treats fixing as causal diagnosis: capture observed and expected behavior; provide reproduction steps, logs, environment, and version; ask for hypotheses and missing evidence; localize files and call paths; create a failing regression test where possible; apply the minimal patch; run regression and nearby tests; explain why the fix works and what it does not address (Section VIII-B, PDF p. 6).

Testing workflow. Testing must be inside the loop: identify tests, edge cases, and failure modes before implementation; run targeted tests after small changes; require CI, static analysis, type checks, security checks, and review before merge; monitor logs, defects, performance, and feedback after merge (Section VIII-C, PDF p. 6).

Hardware and firmware workflow. The input package should include board/chip revision, datasheet excerpts, registers, pinout, clocks, protocols, memory map, toolchain, simulator, formal checker, test equipment, and rollback plan. Production-risk changes require simulation, static checks, applicable formal properties, and hardware-in-the-loop evidence (Section VIII-D, PDF p. 6). The paper cautions: “For these domains, compilation is not proof. Simulation, formal checking, hardware-in-the-loop tests, timing analysis, and traceability from requirement to verification evidence are essential.” (Section II-E, PDF p. 2.)

Verus form. Inference: for a feature, write the contract and proof before broad implementation, then add executable tests. For a bug, first encode the observed failure as a test or proof counterexample, then repair the smallest code path and rerun the proof. For hardware-facing Rust, Verus can state software-level protocol and memory invariants, but timing, peripherals, silicon, and foreign code remain external assumptions; the paper does not claim otherwise.

## what is proved, measured, and trusted

The paper reports heterogeneous prior measurements, including 932,791 agent-authored pull requests across 116,211 repositories and 72,189 developers in AIDev (Section I, PDF p. 1), a 48.15% task-solving rate for OpenHands plus Claude 3.7 on GitTaskBench (Section II-D, PDF p. 2), and 0% pass@1 on evaluated system-level tasks in RealBench (Abstract, PDF p. 1). These denominators and settings belong to the cited studies; they are not measurements of Agentic Agile-V. The paper reports no new benchmark, no Verus proof count, and no causal estimate for SCOPE-V.

The framework trusts the correctness of its requirements, evidence tools, tests, formal checkers, hardware simulators, human review, and the external environments represented by those checks. Inference: Verus adds trust in the specification, Verus verifier, solver, Rust compiler, linked libraries, and hardware assumptions; a passing proof is evidence for the written contract, not proof that the contract captures the product requirement.

The paper's threats to validity are explicit: the field changes quickly; productivity studies vary by task, developer, codebase, tool, and culture; and hardware benchmarks differ in complexity and rigor (Section X-D, PDF p. 8). Inference: the threat to a product that uses agent-written verified Rust is process-level: agents can still receive an incomplete contract, misuse dependencies, or satisfy a weak specification. The proposed gates reduce these risks only when teams actually collect and review the stated evidence.

## what VL should not redo

Inference: VL should not re-invent the paper's separation of exploratory dialogue from reviewed briefs, the six SCOPE-V phases, or risk-based evidence bundles. The open work is to test these controls on Verus projects, measure proof-repair and review cost, and define which Rust/Verus artifacts satisfy each risk level.

## techniques for the catalog

- conversation-to-contract gate — turn exploratory dialogue into a reviewed brief with executable acceptance criteria before edits
- SCOPE-V loop — specify, constrain, orchestrate, prove, evolve, and verify each agentic task
- risk-adaptive acceptance — match tests, formal checks, review, and sign-off to R0–R3 task risk
- evidence bundle — preserve requirements, plans, commands, results, traces, residual risks, review, and rollback evidence
- feature workflow — implement the smallest planned slice, test alongside it, and record evidence before review
- bug-fix workflow — diagnose causally, reproduce, add a regression test, patch minimally, and explain residual scope
- hardware/firmware gate — require simulation, formal properties where applicable, HIL, timing/protocol evidence, and traceability
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
