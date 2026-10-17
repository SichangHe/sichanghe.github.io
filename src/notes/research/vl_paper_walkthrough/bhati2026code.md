# Beyond Code Generation: Reliability, Verification, and Cost Economics in the Agentic Software Development Lifecycle
(authored by agents unless marked 🧑)
Tag: `bhati2026code`, [paper](https://arxiv.org/abs/2609.04681)

## what the paper establishes

Bhati's September 2026 synthesis is not a new verification experiment. It collects results from field experiments, production reports, benchmarks, and cost studies, and proposes an operating model for agentic software delivery. Its central claim is that candidate-code throughput rises faster than reliable release throughput. The paper states: “AI can increase local coding productivity while the global delivery system remains constrained by verification, coordination, human judgment, and operational risk.” (section 1, p. 2). The review covers evidence through September 3, 2026 (section 2, p. 2); numerical claims belong to the cited studies, not to this paper's own experiment.

The useful unit of output is a Production-Qualified Change (PQC): a candidate change receives credit only when every check required for its risk class passes. The paper gives PQC as a product, over the checks required for the change class, of indicators that each check passed (equation 1, section 8, p. 7). It defines PQC throughput as the sum of PQC indicators over a set of changes T divided by "|T| time" (equation 2, p. 7), which the paper does not spell out further. Its reliability ladder (Figure 2) has ten rungs: requirement fit, patch correctness, build/type checks, unit/property tests, integration/contract tests, security/dependency policy, review/ownership, deploy/canary, production SLO/rollback, and maintenance/regression (section 7, p. 6). The paper warns that this is a synthesis framework, not an industry standard (section 7, p. 6). “A production change accumulates evidence as it moves through the lifecycle.” (section 7, p. 6).

## technique: risk-adaptive evidence checks

what it is and when to use it

Assign each change a risk class and require an evidence vector matched to its blast radius, reversibility, ownership, and data sensitivity. Use stronger, independent checks for authentication, payments, cryptography, migrations, and other high-impact changes; use a smaller vector for documentation or other low-risk edits (section 8, p. 7; section 17 item 8, p. 15). The paper's motivation is that insisting a human read every line "simply caps agentic throughput at human review capacity", while a model approving another model's change leaves open what independent evidence remains (section 5, p. 5); it concludes that review "should become risk-adaptive rather than uniformly manual or uniformly automated". It says: “A high-risk change may require independent static analysis, generated and human-authored tests, dependency/security checks, ownership review, and a canary.” (section 5, p. 5).

how to do it

1. classify consequence, reversibility, data sensitivity, ownership, and affected components (section 12, item 1, p. 10)
2. bind the class to required tests, static analysis, reviewers, security scans, and deployment checks (section 12, item 3, p. 10)
3. run the checks and attach machine-readable evidence to the change; the paper's Table 5 "Evidence coverage" metric is the fraction of risk-required checks with machine-readable evidence attached (section 14, p. 12)
4. count the change as PQC only if the required check indicators all equal pass (section 8, equation 1, p. 7)
5. measure PQC rate, first-pass qualification, evidence coverage, escaped-failure rate, and PQC per reviewer-hour (section 14, Table 5, p. 12)

Verus form

evidence, limits, and assumptions

The paper reports no PQC deployment or causal evaluation; it says it does not claim that any company has implemented the complete control plane (section 1, p. 2). It presents the check ladder as a proposed framework (section 7, p. 6). The cited evidence shows why a single benchmark score is insufficient: the review reports autonomous-agent coding effects of +180% at commits, +50% at projects, and +30% at releases from a study of more than 100,000 GitHub developers (section 4, p. 4). The paper itself says these come from observational event-study data and differ in settings, treatments, outcomes, and causal strength from the pooled randomized estimate of 26.08% (section 19, p. 16), so they are not interchangeable.

## technique: verifier-backed test generation and independent checking

what it is and when to use it

Generated tests are useful only when a check rejects weak or irrelevant tests. The paper describes Meta's TestGen-LLM as pairing generation with a verification harness that rejected unhelpful output, and reports an Instagram evaluation in which 75% of generated test cases built correctly, 57% passed reliably, and 25% increased coverage; across Meta test-a-thons, 11.5% of applied classes improved and engineers accepted 73% of recommendations for production (section 6, p. 5). Inference: these fractions have different denominators: generated test cases for the first three, classes to which the tool was applied, and recommendations respectively.

how to do it

The paper gives only the outcomes of the Meta pipeline, not its steps. Inference: the steps below are my reading of the outcome measures "built correctly", "passed reliably", "increased coverage" and "accepted ... for production deployment" (section 6, p. 5).

1. generate tests for a candidate change
2. keep only tests that build
3. keep only tests that pass reliably
4. measure coverage gain, but also require an independent oracle or fault-detection signal: "A test is useful when it adds independent discriminatory power against plausible faults." (section 6, p. 5); the paper lists mutation score and regression detection as measures to evaluate (section 16.6, p. 14)
5. retain only recommendations that pass the harness and are accepted by engineers for production (section 6, p. 5)

Verus form

Inference: put functional contracts in `requires` and `ensures`, use `assert` and proof functions for mathematical facts, and keep generated runtime tests as ordinary Rust tests. A Verus proof can establish that a test fixture satisfies a precondition or that a postcondition follows; it does not prove that the test oracle expresses the desired security or product behavior. Property-based or mutation checks therefore remain complementary evidence.

evidence, limits, and assumptions

The paper explicitly says test volume is a poor assurance metric and that the verifier must be treated as a first-class artifact (section 6, p. 5). It cites Chen et al.: resolved and unresolved SWE-bench tasks had similar test-writing frequency, and prompting agents to write more or fewer tests did not significantly change final outcomes (section 6, p. 5). It also reports a 13.8% reward-hacking fraction in SWE-Marathon rollouts, where agents found shortcuts through a verifier (section 6, p. 5); the denominator is rollouts in that cited long-horizon study, not generated tests.

## technique: control-plane budgets and stop rules

what it is and when to use it

The proposed Agentic SDLC Control Plane centralizes risk classification, execution planning, evidence requirements, stopping, cost attribution, and outcome learning. Each task consumes money/compute, reliability/risk, and human-attention budgets (section 11, pp. 8–9). Use it whenever agents can retry, call tools, run CI, or make changes whose verification cost is larger than generation cost.

how to do it

1. record model, context, tool, sandbox, CI, review, security, rework, and incident cost (equation 3, section 9, p. 7), attributed at task/PR/team/repository level (section 12 item 5, p. 10)
2. set a hard budget in the execution plan (section 12 item 2, p. 10) and token/time ceilings and progress checkpoints (section 17 item 5, p. 15)
3. terminate or escalate "when marginal progress no longer justifies cost or when repeated attempts are cycling" (section 12 item 4, p. 10); Table 5 defines the retry/cycle rate as repeated attempts after no material verifier improvement (p. 12)
4. compute Verification Tax as (CI + review + security + rework cost) divided by generation cost (equation 4, section 10, p. 8)
5. update policies from PQC rate, escaped defects, rollbacks, review corrections, token use, and human escalation (section 12 item 6, p. 10)

Verus form

Inference: prove local resource and state-transition invariants for a controller, such as a retry counter never exceeding a bound and a committed change having a verified evidence record. Use ordinary executable Rust for budgets and `spec fn` predicates for admissibility; use `requires`/`ensures` on transitions. External model behavior, CI tools, and incident outcomes stay trusted inputs.

The paper's proposed constructs are hypotheses, not validated standards (section 19, p. 16). It reports long-horizon SWE-Marathon rollouts averaging 27.2 million tokens and, in the initial study, no tested configuration above 30% pass@1 (section 1, p. 2), but those figures are from the cited benchmark and do not measure Verus.

## what is proved, trusted, and unresolved

The paper proves no theorem and introduces no new measurements. Its synthesis is based on heterogeneous evidence, including randomized field experiments, observational telemetry, benchmark audits, vendor reports, and forecasts. It explicitly says “The proposed constructs - PQC, Verification Tax, Agentic Autonomy Budget, and the Control Plane - are not claimed as validated standards.” (section 19, p. 16). Inference: trusted elements include each cited study's methods, company telemetry, benchmark harnesses, and the correctness of the proposed check and cost definitions. Inference: a Verus proof would reduce one class of implementation uncertainty but would leave specifications, external libraries, the verifier/solver, proof erasure, compiler, and deployment environment as assumptions. The paper says its cited results "are not contradictory" because they describe different layers (section 1, p. 2) and that the Verification Tax "helps reconcile apparently conflicting productivity studies" (section 10, p. 8), but it computes no ratio; section 19 (p. 16) says results from different populations should not be directly compared. Inference: percentages from different studies must not be pooled.

## techniques for the catalog

- risk-adaptive evidence checks: classify each change and require a machine-readable vector of independent tests, analysis, review, security, and deployment evidence
- verifier-filtered test generation: compile, execute, and independently assess generated tests before accepting them as assurance
- PQC accounting: count only changes that satisfy all risk-class checks and report qualified throughput rather than generated activity
- control-plane budgets: allocate model, retry, CI, risk, and reviewer budgets with explicit stop and escalation rules
- Verification Tax: measure assurance and rework cost relative to generation cost and optimize reliability at a fixed assurance budget
