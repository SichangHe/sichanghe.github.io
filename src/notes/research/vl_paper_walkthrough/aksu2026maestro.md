# Maestro Order: A Model-Agnostic Orchestration Harness
(authored by agents unless marked 🧑)
Tag: `aksu2026maestro`, [paper](http://arxiv.org/abs/2606.23983v1)

## what the paper establishes

Maestro Order is an orchestration harness for unreliable solvers. It composes four primitives, decompose, ensemble, verify, and recurse, behind a common interface and chooses where to spend a compute budget. The harness is intended to make reliability a property of the organization around a model, rather than a claim about one model. The abstract states: “The harness treats any model as a black-box base solver behind a uniform interface, layers a verifier ensemble whose discrimination is measured online, and allocates verification and voting to the stages with the highest marginal reliability per unit cost.” (abstract, PDF p. 1)

The paper's quantitative results are a faithful Monte Carlo simulation of a parameterized solver/verifier model, not measurements from deployed language models. Its simulated base solver emits a correct candidate with probability p; a verifier accepts correct candidates with beta and wrong candidates with alpha; verifier discrimination is Lambda = beta/alpha. Each point uses 20,000–40,000 trials, with Monte Carlo reliability noise about plus or minus 0.004 and expected-call noise about plus or minus 0.1 (section 12, PDF p. 6).

## technique 1: use a common solver interface and shared, replayable state

what it is and when to use it

The solver interface exposes `solve(task, ctx) -> {answer, score, trace, cost}`. Models, tools, and sub-harnesses all implement it, allowing the controller to treat a whole subtree as one solver (section 4, PDF p. 2). A shared blackboard stores tasks, candidates, verdicts, state, and the final answer or abstention (Figure 2, PDF p. 3). Inference: use this when heterogeneous generators and checkers must be composed, replayed, and costed uniformly.

how to do it

1. Give each task an id, type, input, and dependencies.
2. Give the run a maximum-call budget, target reliability, and marginal-rate threshold.
3. Record every candidate's answer, self-score, trace, and realized cost.
4. Record each verifier's accept/reject result, score, estimated beta, and estimated alpha.
5. Maintain running log odds, calls, and coverage, then emit either an answer or `ABSTAIN` (Figure 2, PDF p. 3).
6. Key calls by input and configuration so retries are idempotent and cached (section 11, PDF p. 5).

The paper says: “Given fixed seeds and backend versions, a solve is replayable bit-for-bit from its trace.” (section 5, PDF p. 3)

Verus form

Inference: Represent the blackboard as an executable Rust struct with explicit states such as `Candidate`, `Verdict`, `Accepted`, `Rejected`, and `Abstained`. Use Verus `requires` and `ensures` to prove that a state transition consumes at most the remaining budget, preserves trace identity, and requires a successful check before commitment. Inference: use `spec fn` predicates for well-formed records and `proof fn` lemmas for accounting; the paper's JSON-like schema is not Verus code.

evidence and limits

The harness requires deterministic replay up to declared randomness, not deterministic model outputs. It also requires every call's model id, decoding parameters, seed, prompt hash, tool versions, tokens, latency, and cost to be recorded (section 11, PDF p. 5).

## technique 2: use verification checks as likelihood-ratio amplification

what it is and when to use it

A verifier has completeness beta, the probability it accepts a correct candidate, and false-acceptance alpha, the probability it accepts a wrong one. Their ratio Lambda is the verifier's discrimination. Under the paper's odds law, each conditionally independent accepted verification check multiplies correctness odds by Lambda. The paper motivates this with tasks where checking is cheaper and more reliable than generation (section 1, PDF p. 1).

how to do it

1. Generate a candidate.
2. Run a verifier ensemble and require every prerequisite check to accept for all-accept amplification.
3. If any prerequisite check rejects, regenerate or refine rather than commit.
4. After k accepted prerequisite checks, update log odds by the sum of their log Lambda values.
5. Algorithm 1 returns the first candidate accepted by every verifier; after T unsuccessful attempts it abstains. The controller separately applies a calibrated confidence threshold (Algorithms 1–2, PDF p. 4; section 6, PDF p. 3).

The simulation trace uses a base correctness of 0.55 and Lambda = 6. One prerequisite check reaches 0.880, two reach 0.978, three reach 0.996, and four reach 0.999, at expected calls 3.8, 7.4, 11.7, and 17.3 respectively (Table 2, PDF p. 5). The paper reports that “verification amplifies reliability geometrically” (abstract, PDF p. 1).

Verus form

evidence and limits

For a simulated weak base (p0 = 0.55, Lambda = 6), Table 5 lists verification costs of 7.4 calls for a 0.97 target, 11.7 for 0.99, and 17.3 for 0.999. The voting comparator uses a different base reliability, p = 0.62; its approximate costs are 60, 90, and 160 calls, computed by a normal approximation (Table 5, PDF p. 7). The first row of Table 5 labels 3.8 calls as reaching 0.90, while Table 2 gives 0.880 for the same one-check configuration (PDF pp. 5 and 7). Inference: that row does not establish attainment of 0.90. These costs are simulation results or analytical approximations, not Verus or deployed-model measurements. The paper warns that verifier gaming can drive effective Lambda toward 1 when generators optimize against a fixed checker (section 15, PDF p. 8).

## technique 3: allocate budget by greedy marginal log odds per cost

what it is and when to use it

The controller chooses among voting, another prerequisite check, refinement, and decomposition. It estimates each mechanism's increase in calibrated log odds divided by its additional cost, then applies the highest-rate action until the budget or target is reached. Algorithm 2 selects the largest estimated marginal rate and stops when it is at most lambda (section 7 and Algorithm 2, PDF p. 4).

how to do it

1. Run one base solve and initialize calibrated log odds.
2. Estimate the marginal rate of every available mechanism.
3. Choose the mechanism with the largest estimated rate.
4. Apply it, update the blackboard and log odds, and repeat.
5. Stop when the budget is exhausted, the confidence target is met, or every marginal rate is at or below the configured threshold.
6. Combine the accepted evidence or abstain (Algorithm 2, PDF p. 4).

Verus form

Inference: This controller is ordinary executable Rust with a proof obligation for budget conservation and monotonic evidence accumulation. Use `requires` to require nonnegative remaining budget and `ensures` to show the next action is one of the configured mechanisms and total cost does not exceed the cap. Inference: the greedy choice itself is a policy claim; Verus can prove that the implementation selects the maximum recorded rate, but not that this is globally optimal under uncertain estimates.

evidence and limits

The paper's Figure 3 reports simulation trajectories: verify-only reaches 0.999 at about 17 calls, a hybrid at about 23, while vote-only remains below 0.98 at 60 calls for the stated weak base and Lambda = 6. These trajectories are from the parameterized simulation (section 13 and Figure 3, PDF p. 6). Their controller is greedy, and section 16 says the constrained optimum could be solved more globally when marginal estimates are reliable (PDF p. 9).

## technique 4: measure and calibrate verifier discrimination online

what it is and when to use it

Maestro does not assume a verifier's quality. It updates beta and alpha from later-revealed ground truth, held-out checks, tool oracles, or human spot checks, then computes estimated Lambda. It also calibrates raw model and judge scores with a monotone map such as isotonic or Platt calibration and specifies expected calibration error (ECE) as a metric (section 7, PDF p. 4). Section 13 reports qualitative calibration in the simulation and says ECE would be reported for real models; it gives no numerical ECE result (PDF p. 7).

how to do it

1. Collect verifier decisions on examples whose correctness is eventually known.
2. Estimate beta and alpha separately from those labeled decisions.
3. Compute estimated Lambda and the corresponding log-odds gain.
4. Fit a monotone confidence calibration map on held-out examples.
5. Use calibrated log odds for prerequisite checks and abstention, never raw self-reported confidence.
6. Monitor Lambda over time; demote a verifier drifting toward 1, rotate a held-out checker, or raise the abstention threshold (sections 7–8, PDF p. 4; section 15, PDF p. 8).

The paper says: “Measure Λ, do not assume it.” (section 8, PDF p. 4)

Verus form

evidence and limits

The paper's simulation assumes fixed beta, alpha, p, and correlation gamma within each run, while its limitations state that real systems violate those clean assumptions and require a full real-model evaluation (section 16, PDF p. 9). The reported Monte Carlo outputs therefore validate implementation of the equations, not deployment performance.

## technique 5: fail closed, verify decomposition, and refine on rejected evidence

fail-closed operation

The harness treats malformed candidates, tool errors, timeouts, and verifier crashes as rejections (section 5, PDF p. 3). The paper states: “Tool/model errors are treated as rejections (fail closed), never as silent acceptances; timeouts count toward cost and trigger escalation or abstention rather than a guess.” (section 11, PDF p. 5) Inference: implement this by recording the error and its cost, preventing commitment, and retrying under the budget, escalating, or abstaining.

decomposition with verification

The paper treats decomposition as risky because serial errors compound. The planner emits a typed directed acyclic graph of subtasks, each with input/output types, dependencies, and a verifier. Static type compatibility is checked before model calls; the recombination step itself requires verification. The paper says: “Decompose only when the split is clean and checkable.” (section 9, PDF p. 5)

Steps: propose a split only when subtasks are independent or cleanly ordered; require each subtask to have an individual verifier; verify every result before it flows downstream; verify recombination; allocate more checks to high-fan-out or critical-path nodes; decline the split in favor of a monolithic solve when no clean check exists.

refinement and abstention

On verifier rejection, Maestro returns feedback to the solver and resamples. It abstains when accumulated calibrated log odds stay below a threshold, or escalates to a stronger and more expensive sub-organization (section 6, PDF p. 3). Inference: use failed Verus diagnostics as repair context only after preserving the failed candidate and source state, so the agent cannot erase evidence of an unsafe attempt.

## technique 6: diversify solver pools and use robust executable verifiers

The paper separates voting from verification. Voting helps when individual correctness exceeds one half and errors are diverse, but correlated errors impose a ceiling. In the Gaussian-copula simulation with p = 0.6, correlation gamma = 0.05 approaches a reliability limit near 0.87, while gamma = 0.2 approaches 0.71, regardless of committee size (section 13, PDF p. 6; Figure 4c, PDF p. 7). The finite committee with 255 members is still approaching the 0.87 limit; the reported finite-size plateau is near 0.85. Section 15 recommends distinct prompts, temperatures, tools, and ideally models to reduce shared blind spots (PDF p. 8).

For programs, the paper recommends executing candidates in a sandbox against unit tests, property-based tests, type checkers, and sanitizers. For mathematics, it recommends re-evaluating expressions, checking units and boundary cases, or machine-checking a proof. These verifiers have false-acceptance tied to the checked specification rather than to the generator (section 8, PDF p. 4). Inference: Verus itself is a high-value executable verifier for Rust proof obligations, but tests and contract review remain needed because a verifier can faithfully prove a vacuous or wrong contract.

## what is proved, measured, and trusted

The paper attributes the reliability laws to the companion Odds Law report; this paper supplies the harness design, pseudocode, engineering guidance, and parameterized Monte Carlo results (sections 1–3, PDF pp. 1–2). It does not present a Verus proof or an independent formal verification of the harness. The simulation reproduces the closed-form verification curve within plus or minus 0.004 for the tested verification-check counts and verifiers (section 13, PDF p. 6). The paper does not establish absolute correctness rates for GPT, Rust, Verus, or a live product. Inference: applying the results requires trusting the simulator, the model of conditional independence or correlation, calibration data, verifier implementations, sandbox isolation, source and trace hashes, and the semantic correctness of the candidate task.

The paper's catalog already includes model-agnostic interfaces, verifier ensembles, log-odds prerequisite checks, greedy budget allocation, online discrimination measurement, fail-closed execution, typed decomposition, refinement, and abstention.

## techniques for the catalog

- uniform solver interface: compose models, tools, and sub-harnesses through a common answer, trace, score, and cost record
- likelihood-ratio verification checks: amplify candidate odds by requiring calibrated independent verifier acceptance
- marginal-rate controller: spend budget on the mechanism with the greatest log-odds gain per unit cost
- online verifier calibration: estimate completeness, false acceptance, discrimination, and drift from later-known outcomes
- fail-closed orchestration: turn errors, timeouts, malformed candidates, and crashes into rejection or abstention
- verified decomposition and refinement: split only into typed, checkable subtasks and regenerate after rejected evidence
- diversity and executable checking: reduce correlated errors and prefer tests, type checks, execution, or machine proofs over plausibility judgments
