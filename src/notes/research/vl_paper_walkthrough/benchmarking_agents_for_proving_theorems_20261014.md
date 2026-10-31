# Benchmarking Agents for Proving Theorems in Quantum Algorithms and Quantum Information
(authored by agents unless marked 🧑)
Tag: `zhang2026benchmarking`, [paper](https://arxiv.org/abs/2607.21533)

## what the paper builds

The paper introduces two Lean 4 benchmark suites: Lean-QuantumAlg-Bench (QAlg-Bench), with 36 theorem-completion tasks, and Lean-QIT-Bench (QIT-Bench), with 40 tasks. The abstract states: “Every task compiles in a fixed environment and is evaluated by deterministic proof checking and targeted semantic review, with difficulty weights assigned before model execution.” (Abstract, p. 1). The suites cover six fields: state and operator methods (SOM), circuit and algebraic algorithms (CAA), simulation/signal processing/learning (SSL), quantum channels and representations (QCR), geometry/symmetry/distinguishability (GSD), and information measures/entanglement (IME) (Section 3.1, pp. 3–4; Tables 2–3, pp. 8, 11).

The measured quantity is verified theorem completion, not informal answer quality. For task i, the paper defines a difficulty d_i from 1 to 10 and an acceptance bit v_i, then computes score = 100 times the sum of d_i v_i divided by the sum of d_i (Equation 1, p. 4). Completion is the unweighted fraction of accepted tasks (Section 4, p. 5). The highest recorded scores are 60.4/100 on QAlg-Bench and 59.6/100 on QIT-Bench (Abstract, p. 1; Section 7.2, p. 15).

## technique: construct theorem-completion tasks from source mathematics

What it is. Researchers turn established quantum results into theorem-sized Lean targets, while agents help translate the statement. The paper says: “Researchers first convert source problems into theorem-sized tasks. Agents assist in translating these statements into Lean, while researchers retain responsibility for the mathematical choices.” (Section 3.1, p. 3).

Inference: Use this decomposition when a systems-verification corpus needs repeatable proof tasks rather than unconstrained formalization. Select results with scientific relevance, theorem-sized scope, and a viable representation; exclude duplicates, auxiliary declarations, and claims that cannot fit the task contract (Section 3.1, p. 3).

Steps from the paper.

1. Select source results from established quantum-algorithm and quantum-information literature (Section 3.1, p. 3).
2. Convert each result to a theorem-sized task and make assumptions explicit (Section 3.1, p. 3).
3. Have researchers determine the scope, assumptions, and conclusion; have agents assist with Lean translation (Section 3.1, p. 4).
4. Add benchmark-local definitions needed to state the theorem and expose a theorem signature whose body is missing; provide no hints (Section 3.1, p. 4).
5. Assign each admitted task to one fixed field and record its difficulty (Section 3.1, pp. 3–4; Appendix A, p. 19).

Inference: In Verus, the analogue is a Rust function with a precise `requires`/`ensures` contract and a proof body left for the agent. Benchmark-local definitions can be Rust datatypes, executable functions, and `spec fn` definitions. The source theorem's assumptions become `requires`; its conclusion becomes `ensures`; the executable body remains constrained to the benchmark's allowed edit region. Lean theorem syntax does not carry over, and a Verus task must use constructs accepted by the Verus version documented in the local Verus reference.

Evidence. The inventory contains concrete scopes and counts, including 36 QAlg tasks and 40 QIT tasks (Tables 4–5, pp. 19–20). The task list includes, for example, Walsh–Hadamard decoding, QFT unitarity, product-formula error scaling, Choi positivity, and entanglement concentration (Tables 4–5, pp. 19–20).

Limits. The paper says the task sets “do not provide complete coverage of either domain,” that field sizes and library maturity are unequal, and that difficulty values are not objective measurements of proof complexity (Section 7.1, p. 14). Inference: A Verus benchmark built this way would measure the selected contracts and APIs, not all systems-verification ability; its task difficulty would need calibration against Rust proof structure and solver behavior.

## technique: compile every task in a fixed environment

What it is. Candidate statements and supporting definitions are assembled in one fixed Lean environment and compiled before inclusion. Submission acceptance independently recompiles the submitted theorem and rejects new axioms, `sorry`, or edits outside the theorem body. The complete acceptance rule is: “Submission-side acceptance applies the same discipline: the independent final verification recompiles the submitted theorem in the fixed environment and accepts it only when the proof introduces no new axioms, contains no sorry placeholder, and leaves all files outside the theorem body unchanged.” (Section 3.1, p. 4).

Steps from the paper.

1. Assemble the statement and supporting definitions in the fixed environment (Section 3.1, p. 4).
2. Compile and screen every admitted task before adding it to a suite (Section 3.1, p. 4).
3. Supply the theorem statement and definitions, plus consultation-only library references under LAD; permit edits only to the theorem body (Section 3.1, p. 4; Appendix A, p. 19).
4. Independently recompile the final submission after the model invocation (Section 3.1, p. 4; Appendix A, p. 19).
5. Accept only if no new axioms or `sorry` occur and files outside the theorem body are unchanged (Section 3.1, p. 4).

Inference: For Verus, run `verus` on a fresh workspace containing the fixed Rust source, then run an independent verification from the submitted theorem-body patch. The acceptance predicate should reject unverifiable code, disallowed axioms or external-body escapes, and modifications outside the designated proof region. A Verus `proof fn` is erased and is not a runtime function; executable code and specifications must remain in their respective supported forms.

Evidence. The benchmark records a final acceptance bit after independent checking, and four timed-out invocations still passed final Lean verification (Section 4, p. 5). Appendix A states that tasks run in fresh isolated workspaces, one attempt per task, with a 30-minute invocation limit and no external network access (Appendix A, p. 19).

What is proved and what remains trusted. Lean's kernel checks that an accepted proof term has the theorem statement as its type relative to imported definitions (Section 2, p. 2; Section 3.2, p. 4). The paper warns that this does not prove the formal statement matches the intended science: “It does not, however, guarantee that the statement faithfully captures the scientific claim that motivated the task.” (Section 3.2, p. 4). Inference: In Verus, the analogous proof establishes the encoded contract relative to Verus, its solver, trusted specifications, and any permitted external assumptions; it does not establish that the contract captures the product requirement.

## technique: separate mechanical checking from semantic review

What it is. All tasks receive universal compilation checks, while selected high-risk statements receive manual comparison against the motivating mathematics. The review checks objects and quantifiers, explicit and implicit assumptions, dimensions, index and tensor ordering, and conclusion direction and strength (Section 3.2, p. 4).

Steps from the paper.

1. Treat Lean compilation and automated checks as universal mechanical guarantees (Section 3.2, p. 4).
2. Identify statements whose translation carries elevated semantic risk (Section 3.2, p. 4).
3. Compare each selected formal signature and supporting definitions with the mathematical specification (Section 3.2, p. 4).
4. Inspect objects, quantifiers, assumptions, dimensions, index/tensor ordering, and conclusion direction/strength (Section 3.2, p. 4).
5. Resolve discrepancies before inclusion (Section 3.2, p. 4).

Inference: A Verus version should review whether `requires` predicates include every precondition, whether integer and machine-word types preserve the intended domain, whether ownership and aliasing encode the intended state transition, and whether `ensures` is strong enough. A passing verifier run cannot substitute for this review.

Evidence and failure mode. The paper gives a concrete semantic relaxation: its entanglement-concentration task models protocols by product-Kraus separable operations rather than full finite-round LOCC syntax, so the target is a relaxation of the motivating claim (Section 7.1, p. 14). It also says the targeted comparison is not a benchmark-wide semantic-validity rate (Section 3.2, p. 4).

## technique: compare baseline with library-augmented deduction

What it is. The same task is run in two access conditions. Baseline supplies the statement and definitions. Library-augmented deduction (LAD) supplies the same task plus a verified domain library for consultation (Section 3.1, p. 4). The abstract reports: “LAD improves both score and completion rate in all eight model–benchmark comparisons, with gains of up to 15.9 points, providing evidence that verified libraries can strengthen domain-specific proof agents.” (Abstract, p. 1). Section 4.1 qualifies this observation: “These single-run differences describe the recorded runs; the unmatched execution details prevent their interpretation as estimates of an access-condition effect.” (p. 5).

Steps from the paper.

1. Record the suite version, model and agent setting, access condition, budget, retry policy, and execution environment; settings are fixed within a run, while historical condition pairs are not fully matched (Section 4, p. 4).
2. Run the baseline with the statement and supporting definitions (Section 3.1, p. 4).
3. Run LAD with the same task and a verified reference library available only for consultation (Section 3.1, p. 4).
4. Record score and completion separately, because score weights tasks by pre-execution difficulty while completion weights all tasks equally (Section 4, p. 5).
5. Compare conditions descriptively and disclose unmatched execution details (Section 4.1, p. 5).

Evidence. The eight LAD–baseline score changes in Table 1 are all positive. Examples include GPT-5.5's QIT score change of +36.4%, DeepSeek V4-Pro's QAlg change of +42.5%, and MiniMax M3's QAlg change of +100.0%; the table defines each as (L−B)/B from unrounded values and the denominator is the corresponding baseline score (Table 1, p. 6). The absolute MiniMax QAlg scores are 6.4 baseline and 12.8 LAD, so the 100% ratio is a low-baseline doubling (Section 4.1, p. 6).

Limit. The authors state that historical baseline and LAD executions are not fully matched, so the differences cannot be interpreted as an access-condition effect (Section 4, p. 4; Section 7.1, p. 15). Inference: For Verus, a fair LAD experiment would expose a pinned, trusted crate of reusable lemmas or specifications while keeping model, budget, workspace, and task fixed; the result would still be descriptive unless runs were matched and repeated.

## technique: difficulty-normalized and field-level evaluation

What it is. The score weights each accepted theorem by a pre-execution difficulty from 1 to 10. Field scores apply the same equation within each partition. QAlg denominators are SOM=67, CAA=105, SSL=93; QIT denominators are QCR=80, GSD=138, IME=109 (Section 4.2, pp. 6–7; Table 8, p. 22).

Steps from the paper.

1. Assign model-assisted difficulty before execution using two rubric reviews of proof structure, theory dependencies, Lean engineering, and mathematical technique; score each axis from 1 to 4, map the combined rubric to 1–10, and freeze the resulting weight (Section 7.1, p. 14; Appendix A, p. 19).
2. Adjudicate assignments differing by more than one point (Section 7.1, p. 14; Appendix A, p. 19).
3. Compute suite score as 100 times the difficulty-weighted accepted-task sum divided by the suite difficulty denominator (Equation 1, p. 4).
4. Partition tasks into fixed fields and repeat the calculation within each field (Section 4.2, pp. 6–7).
5. Report task counts and denominators with each field profile (Section 4.2, pp. 6–7).

Evidence. The paper warns that a single difficulty-10 task can move the score of the field with the smallest denominator by roughly 15 points, and that suite-wide scores hide field weaknesses (Section 4.2, pp. 6–7). GPT-5.5's baseline QIT field scores are QCR 75.0, GSD 50.0, and IME 12.8; its LAD scores are 87.5, 80.4, and 12.8 (Table 8, p. 22). Inference: For Verus, fields could separate memory safety, concurrency, crash recovery, and functional refinement, but denominators must be reported because a few high-weight tasks can dominate a field.

## technique: report resource cost with the score

What it is. Economic cost is the mean API list-price-equivalent dollars among tasks with reconstructable prices divided by the difficulty-weighted score for that same subset. Time cost is mean model invocation seconds per task over the full suite divided by the overall score; model invocation includes agent-triggered Lean checks but excludes independent final verification (Section 4, p. 5).

Steps from the paper.

1. Fix the pricing schedule and execution-time definition; the paper uses 2026-07-20 prices generally and 2026-07-22 prices for Kimi K3 (Section 4, p. 5).
2. Report unavailable ratios as N/A; both ratios require a positive score denominator, and zero is reserved for observed zeros (Section 4, p. 5).
3. Compute cost per score point and report units, denominators, and missing values (Section 4, p. 5; Figure 2 caption, p. 5).
4. Interpret total expenditure, elapsed time, and intrinsic model speed separately from the ratios (Section 4.1, p. 6).

Inference: A Verus study should separately record solver time, model time, retry count, and engineer repair time. A cost per verified-contract point is meaningful only with its task denominator and fixed hardware/tool setting.

## techniques for the catalog

- theorem-completion benchmark: convert source results to theorem signatures with explicit assumptions, fixed definitions, and an agent-completed body
- fixed-environment acceptance: compile every task and independently recompile submissions while rejecting new axioms, placeholders, and out-of-scope edits
- semantic-risk audit: manually compare selected high-risk formal statements with their source mathematics after universal mechanical checks
- library augmentation comparison: compare a task containing the statement and supporting definitions with the same task plus a verified reference library; disclose unmatched execution details
- weighted field scoring: freeze rubric-based difficulty, compute difficulty-normalized scores, and expose field denominators and task counts
- cost-per-proof reporting: divide recorded monetary and invocation-time costs by verified score with explicit missing-value rules
