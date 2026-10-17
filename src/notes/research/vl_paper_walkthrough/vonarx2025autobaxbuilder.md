# AutoBaxBuilder: Bootstrapping Code Security Benchmarking
(authored by agents unless marked 🧑)
Tag: `vonarx2025autobaxbuilder`, [paper](https://doi.org/10.48550/arXiv.2512.21132)

## problem and contribution
The paper presents AUTO BAX BUILDER, an LLM agent pipeline that creates BAX BENCH-style backend security tasks from scratch. Its output is a scenario specification, executable functional tests, and end-to-end security exploits. The authors' central design is to use execution feedback and contrastive reference implementations so that generated tests are checked against behavior rather than accepted from model text alone. Figure 1's caption states: “The LLM-based pipeline starts from scratch and produces a complete benchmark instance of scenario description”, with the instance having three parts: scenario description, test cases and end-to-end exploits (Figure 1, p. 2).

The source benchmark uses natural-language requirements and OpenAPI endpoint specifications, then evaluates implementations through REST endpoints, file-system/database interfaces, and resource measurements. Security exploits provide a concrete observation and therefore avoid static-analyzer false positives. The paper says: “These exploits are manually written unit tests that probe implementations for expected weaknesses and, upon success, demonstrate a vulnerability through concrete, observable, and undesired behavior.” (Background, p. 3)

## technique 1: propose a scenario and seed reference implementations

When to use it: use this stage when constructing a fresh, contamination-resistant benchmark or a new specification-and-test task. The orchestrator receives the desired endpoint count, names of existing scenarios, and example vulnerability names. It proposes a novel backend with a clear attack surface, checks novelty against existing scenarios, and emits a complete OpenAPI specification with descriptions and examples. Solution models then generate several implementations of that specification. The paper's Algorithm 1 gives the sequence as `S ← GENERATE SCENARIO_M(d)` followed by `s ← GENERATE INITIAL SOLUTIONS_M′(S)` (Algorithm 1, p. 4).

Step by step:

1. Set a difficulty parameter `d` and provide the orchestrator with existing scenario names and target vulnerability classes (Section 3, “Step 1: Scenario Proposal”, p. 3)
2. Ask the orchestrator to describe a novel backend and produce its OpenAPI specification (Section 3, p. 3)
3. Ask multiple solution LLMs to implement that specification; retain the resulting reference set for later execution checks (Section 3, p. 4)

Verus form: Inference: represent the scenario as a Rust API contract with executable functions and `requires`/`ensures` clauses, and create several reference implementations or ghost models. Inference: a Verus `spec fn` can express the mathematical endpoint behavior, while an ordinary Rust function carries the executable implementation; the pipeline's model-generated OpenAPI text has no direct Verus equivalent. Inference: the references must be checked by Verus proofs and runtime tests because a Verus proof establishes the written contract, not that the contract captures the intended security property.

Evidence and limits: the paper validates this construction downstream on 40 new scenarios and 28 existing BAX BENCH scenarios. It assumes that novelty checks and the chosen specification are adequate; the authors explicitly limit the demonstrated domain to web backends, REST APIs, and BAX BENCH CWE classes (Section 6, p. 9).

## technique 2: generate and refine functional tests with separated feedback

When to use it: use this loop when model-generated implementations and tests may co-adapt or when a failure could be caused by either artifact. The orchestrator first extracts explicit requirements and implicit assumptions, writes one functional test per requirement, then refines tests and solutions in separate phases. The separation is intended to prevent a solution from overfitting to a flawed test. The paper states: “By solely acting on this consolidated feedback, this design discourages solution-test co-design, which could drift from the scenario specification.” (Section 3, p. 4). The consolidated feedback is the global verdict that merges the per-solution verdicts.

Step by step:

1. Extract each functional requirement from the scenario and endpoint descriptions, and generate a test for each requirement (Section 3, “Step 2: Functional Test Generation”, p. 4)
2. Run every candidate solution against the tests and collect execution logs (Section 3, p. 4)
3. In `REFINE SOLUTIONS`, show the orchestrator only failing-solution logs, not test code, and repair type or framework errors (Section 3, p. 4)
4. In `REFINE TESTS`, give solution code, test code, and logs to the orchestrator; obtain a per-pair correctness verdict, merge verdicts into a global verdict, and refine either tests or solutions (Section 3, p. 4)
5. Repeat both loops until the orchestrator considers no further changes necessary, with each refinement step capped at 5 iterations (App. A.1, p. 13); discard a scenario unless at least one refined reference solution passes all refined functional tests (Section 3, p. 4)

Verus form: Inference: encode each requirement as an `ensures` clause on the executable function and prove the implementation against it. Inference: use a `while` loop with an explicit `invariant` for iterative refinement only if implementing the refinement engine itself in Verus; the paper's LLM loop is an external orchestration process, not a proof loop. Inference: execute ordinary Rust tests for API behavior and use Verus proofs for deterministic state properties; Verus cannot prove that an LLM's natural-language verdict is correct without a formalized verdict specification.

Evidence and limits: on 28 BAX BENCH scenarios, the generated and expert-written functional suites matched on 80.9% of evaluated solutions (Section 4.2, p. 6; confusion matrix in Figure 5, p. 7). The authors found two erroneous expert functional tests and two ambiguous specifications among disagreement cases (Section 4.2, p. 6), showing that execution feedback does not remove ambiguity in the underlying requirement.

## technique 3: generate exploits and accept only contrastive behavior

When to use it: use this method to create a security test that must distinguish a vulnerable implementation from a patched one. The orchestrator independently analyzes the scenario and each functionally correct reference solution to identify vulnerabilities. For each target it proposes an exploit, runs it, and asks for a contrastive solution modified to introduce or mitigate the vulnerability. The exploit is accepted only when it reports the vulnerable solution as insecure and the patched solution as secure. The paper says: “The exploit is accepted only if it reports the vulnerable solution as insecure and the patched solution as secure.” (Figure 3, p. 4)

Step by step:

1. Analyze the scenario and each functionally correct reference implementation and form a set of target vulnerabilities (Algorithm 1, line 6; Section 3, p. 4)
2. Generate an exploit for each target and run it against a reference implementation (Algorithm 1, lines 8–10; Section 3, p. 4)
3. Judge from execution logs whether the implementation is secure or insecure and whether the exploit's report is correct (Section 3, p. 5)
4. Modify the reference implementation, using only the natural-language vulnerability description, to introduce or mitigate the vulnerability; rerun the exploit (Section 3, p. 5; Figure 3, p. 4)
5. Return the exploit only when it classifies the vulnerable and patched implementations correctly; otherwise revise it and retry on another reference solution (Section 3, p. 5; Algorithm 7, App. C.3, p. 46)
6. Discard a modification that breaks functional tests (Section 3, p. 5)

Verus form: Inference: state the security property as a predicate over an abstract state or returned value, prove the secure implementation with `ensures`, and prove a deliberately vulnerable implementation violates the predicate through a separate executable test or proof obligation. Inference: model attacker inputs as arbitrary values satisfying the function's `requires`; use `assert` and proof functions to establish the contrastive postcondition. Inference: filesystem, database, and resource-exhaustion effects require trusted specifications or an external harness; Verus's proof cannot by itself validate an OS-level exploit.

Evidence and limits: the authors manually audited all 71 exploits generated for the 28 BAX BENCH scenarios and found one unsound exploit (Section 4.2, p. 6). In 11 of 28 scenarios (39%), generated tests covered the same vulnerability more thoroughly; in 6 of 28 (21%), they covered additional CWEs (Section 4.2, p. 6). Resource-exhaustion exploits were often spurious in both suites, so CWE-400 was excluded from the main experiments (Section 4.2, p. 6). These denominators are scenarios for coverage percentages and exploits for the 1/71 soundness result.

## technique 4: guardrails and reproducibility checks

The pipeline validates every generated artifact immediately. OpenAPI specifications are checked by a YAML verifier, test and exploit code by Python compilation, and other outputs by regular expressions. It also supplies helper functions to access files and databases, monitor resource use, and plant pseudorandom flags that an exploit must reproduce. The paper states: “Concretely, we implement guardrails that verify every LLM output immediately after generation, requiring a refinement by the orchestration LLM if the output does not match requirements.” (Section 3, p. 5)

Verus form: Inference: replace syntax guardrails with Rust compilation and Verus verification; put allowed state transitions in contracts and use a deterministic test harness for external effects. Inference: pseudorandom flags can be modeled as ghost state with a proof that the returned value equals the planted value, while the random generator itself remains trusted unless separately specified.

## measured result, trust, and product threat

The authors report 40 AUTO BAX BENCH scenarios: 10 easy, 20 medium, and 10 hard. In Table 1, the overall set averages 2.93 endpoints, 1,029 GPT-4-o-token specification length, 2.6 CWEs, and has maximum-model pass@1 of 83% and sec_pass@1 of 36%; the hard subset averages 4.7 endpoints and reaches only 25% sec_pass@1. These are model evaluations over the listed scenario sets, not proof rates. Construction cost was under USD 160 total, USD 3.9 per scenario, and approximately two hours per scenario (Section 4.3, p. 7). A disjoint-model ablation reports Spearman rank correlation greater than 0.9 for both pass@1 and sec_pass@1 (ρ = 0.93 and 0.91; App. A.4, p. 15), but this tests ranking robustness rather than security correctness (Section 4.4, p. 8).

What is proved or measured is agreement of generated tests with expert tests, exploit soundness under a manual audit, model pass rates, cost, and contamination sensitivity. Inference: what remains trusted includes the orchestrator's judgments, the reference solutions, the scenario specification, helper tools, Docker isolation, and human audit. The authors themselves note that the human audit “covers only a sample of all scenarios” and has low inter-rater agreement on exploit coverage (Section 6, p. 9). Inference: for VeruLaw, the useful transfer is a benchmark generator that round-trips specification, executable tests, and adversarial cases before measuring agent-written Rust. Inference: this creates a substantial product threat if VL evaluates only compilation or proof success, because functionally correct code can still be exploitable; the paper's strongest Claude result is 82.7% pass@1 but 36% overall sec_pass@1 on AUTO BAX BENCH (Section 4.3, p. 7; Table 1, p. 8). Inference: VL should retain a trusted, independently specified property suite and treat LLM-generated tests as candidates requiring contrastive validation.

The paper already does dynamic, contamination-aware benchmark generation, separated test/solution refinement, and contrastive exploit validation. Inference: VL should not redo those ideas as novelty claims; it should adapt them to Rust/Verus contracts and measure proof success together with behavior and security.

## techniques for the catalog

- separated functional-test refinement: refine reference solutions from logs without test code, then refine tests from merged solution-test verdicts
- contrastive exploit validation: accept a security test only when it distinguishes a vulnerable implementation from a patched implementation
- execution guardrails: compile or validate every generated artifact immediately and force refinement on failure
- contamination ablation: rebuild with disjoint models and compare pass-rate rankings using Spearman correlation
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "It could increase by at most a margin of 3.23% if all false positives were eliminated, providing an upper bound on improvement achievable through fixing unsound exploits."): read the whole paper text including the appendix and prompts; checked every quotation, number, page and section reference, and the technique steps against Section 3, Algorithms 1 and 7, Table 1 and Sections 4.2 to 4.4. Changed: the link (the old DOI fragment was wrong; the arXiv id 2512.21132 is from the paper text), the Figure 1 quotation (the original had dropped the circled numerals), the Section 3 quotation (the paper says "consolidated feedback", not "global verdict"), several page references (exploit refinement is on p. 5, cost and the 82.7% result on p. 7), and added the 5-iteration cap, rho values and the audit caveat; the trusted-components sentence is now marked as inference. Did not check: the Verus-form inferences (the author's own, not from the paper), the figure bar values, the appendix tables, or the external references.
