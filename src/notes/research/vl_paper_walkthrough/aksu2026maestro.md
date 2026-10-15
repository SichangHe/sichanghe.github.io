# Maestro Order: A Model-Agnostic Orchestration Harness
(authored by agents unless marked 🧑)
Tag: `aksu2026maestro`, [paper](http://arxiv.org/abs/2606.23983v1)

## what the paper establishes

Maestro Order is an orchestration harness for unreliable solvers. It composes four primitives, decompose, ensemble, verify, and recurse, behind a common interface and chooses where to spend a compute budget. The harness is intended to make reliability a property of the organization around a model, rather than a claim about one model. The abstract states: “The harness treats any model as a black-box base solver behind a uniform interface, layers a verifier ensemble whose discrimination is measured online, and allocates verification and voting to the stages with the highest marginal reliability per unit cost.” (abstract, PDF p. 1)

The paper's quantitative results are a faithful Monte Carlo simulation of a parameterized solver/verifier model, not measurements from deployed language models. Its simulated base solver emits a correct candidate with probability p; a verifier accepts correct candidates with beta and wrong candidates with alpha; verifier discrimination is Lambda = beta/alpha. Each point uses 20,000–40,000 trials, with Monte Carlo reliability noise about plus or minus 0.004 and expected-call noise about plus or minus 0.1 (section 12, PDF p. 12). This scope is essential when applying the design to VL.

## technique 1: put every solver and verifier behind typed, replayable interfaces

what it is and when to use it

The solver interface exposes `solve(task, ctx) -> {answer, score, trace, cost}`. Models, tools, and sub-harnesses all implement it, allowing the controller to treat a whole subtree as one solver (section 4, PDF p. 3). A shared blackboard stores tasks, candidates, verdicts, state, and the final answer or abstention (Figure 2, PDF p. 3). Use this when heterogeneous generators and checkers must be composed, replayed, and costed uniformly.

how to do it

1. Give each task an id, type, input, and dependencies.
2. Give the run a maximum-call budget, target reliability, and marginal-rate threshold.
3. Record every candidate's answer, self-score, trace, and realized cost.
4. Record each verifier's accept/reject result, score, estimated beta, and estimated alpha.
5. Maintain running log odds, calls, and coverage, then emit either an answer or `ABSTAIN` (Figure 2, PDF p. 3).
6. Key calls by input and configuration so retries are idempotent and cached (section 11, PDF p. 11).

The paper says: “Given fixed seeds and backend versions, a solve is replayable bit-for-bit from its trace.” (section 5, PDF p. 3)

Verus form

Inference: Represent the blackboard as an executable Rust struct with explicit states such as `Candidate`, `Verdict`, `Accepted`, `Rejected`, and `Abstained`. Use Verus `requires` and `ensures` to prove that a state transition consumes at most the remaining budget, preserves trace identity, and cannot turn a rejection into an acceptance. Inference: use `spec fn` predicates for well-formed records and `proof fn` lemmas for accounting; the paper's JSON-like schema is not Verus code.

evidence and limits

The harness requires deterministic replay up to declared randomness, not deterministic model outputs. It also requires every call's model id, decoding parameters, seed, prompt hash, tool versions, tokens, latency, and cost to be recorded (section 11, PDF pp. 10–11). Inference: without these fields a VL attestation cannot explain which verifier evidence produced a verdict or reproduce a failed proof run.

## technique 2: use verifier gates as likelihood-ratio amplification

what it is and when to use it

A verifier has completeness beta, the probability it accepts a correct candidate, and false-acceptance alpha, the probability it accepts a wrong one. Their ratio Lambda is the verifier's discrimination. Under the paper's odds law, each independent accepted gate multiplies correctness odds by Lambda. This is useful when checking is cheaper or more reliable than generation.

how to do it

1. Generate a candidate.
2. Run a verifier ensemble and require every gate to accept for all-accept amplification.
3. If any gate rejects, regenerate or refine rather than commit.
4. After k accepted gates, update log odds by the sum of the gates' log Lambda values.
5. Return the candidate only after the calibrated posterior clears a target, otherwise abstain (Algorithm 1 and section 6, PDF pp. 4–5).

The simulation trace uses a base correctness of 0.55 and Lambda = 6. One gate reaches 0.880, two reach 0.978, three reach 0.996, and four reach 0.999, at expected calls 3.8, 7.4, 11.7, and 17.3 respectively (Table 2, PDF p. 10). The paper reports that “verification amplifies reliability geometrically” (section 13, PDF p. 12).

Verus form

Inference: A VL gate can run Verus on the candidate Rust and require a successful verifier result before accepting it. Prove the orchestration logic with a Verus state-machine invariant that a committed candidate has a recorded verifier pass, source hash, verifier configuration, and no failed gate. Inference: Verus can prove the bookkeeping and transition policy, but it cannot prove the empirical value of Lambda or that a generated contract is semantically adequate without a formalized intent relation.

evidence and limits

For a simulated weak base (p0 = 0.55, Lambda = 6), the paper's Table 5 estimates verification costs of about 3.8 calls for 0.90 reliability, 7.4 for 0.97, 11.7 for 0.99, and 17.3 for 0.999. A voting-only comparator with p = 0.62 needs approximately 27, 60, 90, and 160 calls for those targets (Table 5, PDF p. 13). These are simulation values under specified probabilities, not Verus or model measurements. The paper warns that verifier gaming can drive effective Lambda toward 1 when generators optimize against a fixed checker (section 15, PDF p. 15).

## technique 3: allocate budget by greedy marginal log odds per cost

what it is and when to use it

The controller chooses among voting, another gate, refinement, and decomposition. It estimates each mechanism's increase in calibrated log odds divided by its additional cost, then applies the highest-rate action until the budget or target is reached. Algorithm 2 gives the rule as `arg max_m Delta ell(m) / Delta cost(m)` and stops when the rate falls below lambda (section 7, PDF p. 5).

how to do it

1. Run one base solve and initialize calibrated log odds.
2. Estimate the marginal rate of every available mechanism.
3. Choose the mechanism with the largest estimated rate.
4. Apply it, update the blackboard and log odds, and repeat.
5. Stop when the budget is exhausted, the confidence target is met, or every marginal rate is below the configured threshold.
6. Aggregate the accepted evidence or abstain (Algorithm 2, PDF p. 5).

Verus form

Inference: This controller is ordinary executable Rust with a proof obligation for budget conservation and monotonic evidence accumulation. Use `requires` to require nonnegative remaining budget and `ensures` to show the next action is one of the configured mechanisms and total cost does not exceed the cap. Inference: the greedy choice itself is a policy claim; Verus can prove that the implementation selects the maximum recorded rate, but not that this is globally optimal under uncertain estimates.

evidence and limits

The paper's Figure 3 reports simulation trajectories: verify-only reaches 0.999 at about 17 calls, a hybrid at about 23, while vote-only remains below 0.98 at 60 calls for the stated weak base and Lambda = 6. The authors emphasize that these are generated by the parameterized simulation. Their controller is greedy, and section 16 says the constrained optimum could be solved more globally when marginal estimates are reliable (PDF p. 16). Inference: VL should expose the controller's threshold, estimates, and stopping reason in its attestation and should treat the policy as a tunable operating point.

## technique 4: measure and calibrate verifier discrimination online

what it is and when to use it

Maestro does not assume a verifier's quality. It updates beta and alpha from later-revealed ground truth, held-out checks, tool oracles, or human spot checks, then computes estimated Lambda. It also calibrates raw model and judge scores with a monotone map such as isotonic or Platt calibration and reports ECE (section 7, PDF p. 5).

how to do it

1. Collect verifier decisions on examples whose correctness is eventually known.
2. Estimate beta and alpha separately, preserving the input distribution and verifier operating point.
3. Compute estimated Lambda and the corresponding log-odds gain.
4. Fit a monotone confidence calibration map on held-out examples.
5. Use calibrated log odds for gates and abstention, never raw self-reported confidence.
6. Monitor Lambda over time; demote a verifier drifting toward 1, rotate a held-out checker, or raise the abstention threshold (sections 7 and 15, PDF pp. 5 and 15).

The paper says: “Measure Λ, do not assume it.” (section 8, PDF p. 6)

Verus form

Inference: In VL, keep calibration data and verifier versions as immutable evidence records. Use Verus to prove that a calibration record's counts match its labeled decisions and that a gate uses only the selected calibration map. Inference: statistical confidence intervals, distribution shift, and estimates of beta/alpha require a statistical model outside ordinary Verus arithmetic; the product should report uncertainty rather than presenting the estimate as a proof.

evidence and limits

The paper's simulation assumes fixed beta, alpha, p, and correlation gamma within each run, while its limitations state that real systems violate those clean assumptions and require a full real-model evaluation (section 16, PDF p. 16). The reported Monte Carlo outputs therefore validate implementation of the equations, not deployment performance. Inference: a VL verifier that passes current repositories can still be gamed by future generators or fail after a model, prompt, dependency, or codebase shift.

## technique 5: fail closed, gate decomposition, and refine on rejected evidence

fail-closed operation

The harness treats malformed candidates, tool errors, timeouts, and verifier crashes as rejections. The paper states: “Failure handling. Tool/model errors are treated as rejections (fail closed), never as silent acceptances.” (section 11, PDF p. 11) The operational steps are to detect the error, record it and its cost, prevent commitment, and either retry under the budget, escalate, or abstain.

Inference: For VL, a failed Verus run, compiler error, timeout, missing dependency, or malformed proof artifact must not become a passing project verdict. Use a Verus state invariant that only `Verified` states contain a successful verifier result tied to the exact source hash.

decomposition with verification

The paper treats decomposition as risky because serial errors compound. The planner emits a typed directed acyclic graph of subtasks, each with input/output types, dependencies, and a verifier. Static type compatibility is checked before model calls; the recombination step is itself gated. The paper says: “Decompose only when the split is clean and checkable.” (section 9, PDF p. 9)

Steps: propose a split only when subtasks are independent or cleanly ordered; require each subtask to have an individual verifier; verify every result before it flows downstream; gate recombination; allocate more checks to high-fan-out or critical-path nodes; decline the split in favor of a monolithic solve when no clean check exists.

Inference: For VL, decompose a Rust project by modules or functions only when each module has a contract and the integration proof checks representation and ownership assumptions. Verus `requires`, `ensures`, loop `invariant`, and `proof fn` lemmas can express local obligations; the paper's typed DAG and gate policy must be implemented as ordinary Rust orchestration.

refinement and abstention

On verifier rejection, Maestro returns feedback to the solver and resamples. It abstains when accumulated calibrated log odds stay below a threshold, or escalates to a stronger and more expensive sub-organization (section 6, PDF p. 5). Inference: use failed Verus diagnostics as repair context only after preserving the failed candidate and source state, so the agent cannot erase evidence of an unsafe attempt.

## technique 6: diversify solver pools and use robust executable verifiers

The paper separates voting from verification. Voting helps when individual correctness exceeds one half and errors are diverse, but correlated errors impose a ceiling. In the Gaussian-copula simulation with p = 0.6, correlation gamma = 0.05 approaches a reliability limit near 0.87, while gamma = 0.2 approaches 0.71, regardless of committee size (section 13, PDF p. 13). Use distinct prompts, temperatures, tools, models, or seeds to reduce shared blind spots.

For programs, the paper recommends executing candidates in a sandbox against unit tests, property-based tests, type checkers, and sanitizers. For mathematics, it recommends re-evaluating expressions, checking units and boundary cases, or machine-checking a proof. These verifiers have false-acceptance tied to the checked specification rather than to the generator (section 8, PDF p. 6). Inference: Verus itself is a high-value executable verifier for Rust proof obligations, but tests and contract review remain needed because a verifier can faithfully prove a vacuous or wrong contract.

## what is proved, measured, and trusted

The formal claims in this paper concern the odds-law algebra and the controller design, while the reported numbers come from the parameterized Monte Carlo simulation. The simulation reproduces the closed-form gate curve within plus or minus 0.004 for the tested gate counts and verifiers (section 13, PDF p. 12). The paper does not establish absolute correctness rates for GPT, Rust, Verus, or a live product. Trusted components include the simulator, the model of conditional independence or correlation, calibration data, verifier implementations, sandbox isolation, source and trace hashes, and the semantic correctness of the candidate task.

Inference: the threat to agent-written verified Rust is high in the gate and specification boundary. A controller can make a trustworthy record that Verus passed, yet the underlying contract may omit behavior, rely on an unsound external assumption, or be accepted by a checker whose effective false-acceptance has drifted. Inference: VL should combine fail-closed Verus results, contract adequacy checks, diverse tests, calibration, source-attached traces, and explicit abstention.

The paper's catalog already includes model-agnostic interfaces, verifier ensembles, log-odds gates, greedy budget allocation, online discrimination measurement, fail-closed execution, typed decomposition, refinement, and abstention. Inference: VL should not redo these as if they were new. A useful extension is to measure their behavior on actual Verus proof generation, including contract-vacuity attacks, solver correlation, dependency upgrades, and repair cost.

## techniques for the catalog

- uniform solver interface: compose models, tools, and sub-harnesses through typed answers, traces, scores, and costs
- likelihood-ratio verification gates: amplify candidate odds by requiring calibrated independent verifier acceptance
- marginal-rate controller: spend budget on the mechanism with the greatest log-odds gain per unit cost
- online verifier calibration: estimate completeness, false acceptance, discrimination, and drift from later-known outcomes
- fail-closed orchestration: turn errors, timeouts, malformed candidates, and crashes into rejection or abstention
- gated decomposition and refinement: split only into typed, checkable subtasks and regenerate after rejected evidence
- diversity and executable checking: reduce correlated errors and prefer tests, type checks, execution, or machine proofs over plausibility judgments

Checked 2026-10-15 against the paper by a Codex agent for maestro_order_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
