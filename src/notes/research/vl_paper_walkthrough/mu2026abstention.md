# Verifiable abstention makes AI leak diagnosis accountable in urban water distribution networks
(authored by agents unless marked 🧑)
Tag: `mu2026abstention`, [paper](https://doi.org/10.1016/j.watres.2026)

## what the paper builds

The paper changes the operational question from forced localization to whether evidence justifies intervention. Its abstract states: “A physics-grounded executor falsifies competing leak, demand, sensor and valve hypotheses in a hydraulic twin.” The executor computes evidence in deterministic code; a separate language-model auditor can reject a package but cannot overturn a failed hard check. The abstract reports 95 of 300 forced retrieval leaks in the correct zone, 223 of 550 mixed events acted on (214 correct), four correct accepted events on the 33-leak L-Town benchmark, three correct excavation recommendations among five in a replay of 194 City D repairs, and 85 correct districts from the district-inflow tier.

The motivation is observability. Sparse sensors and field noise make many leak locations hydraulically indistinguishable. The authors measure a pressure-information ceiling before designing the gate. On City D, the median clean signature at the most informative junction is 0.0023 m; five events exceed a 0.15 m single-measurement noise scale and one exceeds a 0.45 m actionability threshold. Even an ideal gauge at every junction with five-night averaging crosses those thresholds for only 45 and 17 events, respectively (Introduction, p.2). Thus a forced answer can be precise in a benchmark while still being unjustified for dispatch.

## technique 1: deterministic executor with differential diagnosis

what it is

The executor scores a structured hypothesis space: a leak in each of K zones, a zone-wide demand anomaly, sensor fault, valve mis-state, or no actionable anomaly. Each hypothesis is fitted in a hydraulic digital twin. Surviving fits are combined into a Bayesian posterior with an Occam penalty against flexible leak explanations (Results, p.4; Methods, pp.13–15). Leak zones are tested exhaustively; an optional planner chooses which non-leak families receive extra scrutiny. This design means the LLM orchestrates tool calls but does not choose the final action.

how to do it

1. Build a fixed spatial scaffold and a per-zone leak-response library offline (Results, p.4; Methods, pp.16–17)
2. Generate leak, demand, sensor, valve, and no-anomaly hypotheses with the seeded WNTR/EPANET pipeline (Methods, p.16)
3. Fit each leak hypothesis over the severity grid and calculate residuals against the observed pressure or flow deviations (Methods, pp.15–17)
4. Evaluate non-leak hypotheses and apply the Occam penalty so an over-flexible leak fit cannot masquerade as demand (Methods, p.15)
5. Fuse surviving hypotheses into the posterior and package the numeric evidence, including top hypothesis, residual, existence mass, margin, alternative fits, and falsification status (Results, p.4; Methods, pp.14–15)
6. Pass only this structured package to the supervisor and auditor; do not pass executor prose or confidence adjectives (Methods, p.15)

The paper gives the governing principle: “Every number and every decision predicate is computed in code by the hydraulic tools, so the physics and the decision gate remain deterministic and the language models cannot loosen them.” (Introduction, p.2). The executor’s falsification is therefore a reproducible simulation operation, not an LLM assertion.

verus form

Inference: Represent each evidence package as a Rust struct with executable fields and specification predicates for bounds, residual computation, posterior arithmetic, and hypothesis-family exclusion. Use `requires` for valid network and observation inputs and `ensures` for package consistency; prove helper lemmas about mass balance and residual calculations. The hydraulic twin and numerical libraries remain trusted models unless separately specified. Inference: Verus can prove that the code computes the declared predicates, but a proof does not establish that the hydraulic model matches a real network.

what demonstrates it

On EXA7 (381 junctions, 15 zones, 30 pressure sensors), the forced retrieval localizer reaches 31.7 ± 2.0% top-1 zone accuracy over five seeds. The executor reaches 81.7 ± 5.0% (Note 7, p.4). In the mixed test set at σ=0.05 m, the supervisor acts on 40.5% of events with 96.1 ± 3.3% decision precision; tightening the residual gate reaches 100% precision at 13 ± 15% coverage (Results, p.4). The pooled disagreement on leak events is 254 correct executor decisions out of 286 (89%) (Results, p.4).

Differential diagnosis matters: pooled over five seeds there are n=600 leak and 250 confounder events; demand anomalies are typed correctly in 99 of 100 cases, sensor faults are never misclassified as leaks, and 547 of 600 leaks are typed as leaks (Results, p.4). A confounder dispatched as a leak occurs once in 250 cases with the differential head and 50 in 250 without it (Results, p.4). These denominators are event counts pooled across the five seeds, as stated in the sentence introducing them.

limits and assumptions

The digital twin is a model and the results depend on its network, sensor placement, noise, severity grid, and calibration. The authors generate all four anomaly classes with one seeded WNTR/EPANET pipeline and use σ=0.05 m unless swept (Methods, p.16). L-Town is an independently generated benchmark whose perturbed network model differs from the leak library (Methods, p.17). City D repair events are twin-simulated because real SCADA does not exist for them (Methods, p.18).

Inference: A Verus product should treat model fidelity, calibration data, and external sensor contracts as explicit assumptions and report them with every certificate. Inference: proving the executor’s equations cannot prove that a pressure signature is identifiable in deployment.

## technique 2: six-predicate goal contract and abstention

what it is

The supervisor evaluates a deterministic conjunction of six hard predicates before accepting a dispatch. Methods §“The supervisor: goal contract, abstention, and active sensing” (pp.14–15) names them: G1 leak existence mass above τe; G2 candidate region size |R|≤Rmax; G3 margin Δ≥δ over the best alternative of any family; G4 strongest rival probability ≤α; G5 fitted residual ρ≤ρmax (3 per degree of freedom); and G6 safety U=∅. Thresholds are fixed before each experiment. For EXA7 they are τe=0.5, δ=0.12, α=0.20, Rmax=60; L-Town and City D register use τe=0.5, δ=0.10, α=0.30, Rmax=80; audit experiments use τe=0.7, δ=0.15, α=0.20 (Methods, p.14).

how to do it

1. Compute all six predicates for every event in deterministic arithmetic (Methods, p.14)
2. Compare the selected hypothesis and region with the fixed thresholds (Methods, p.14)
3. Emit an acceptance certificate containing decision, contract version, thresholds, measured values, each predicate’s pass/fail, hypothesis, and region (Methods, p.14)
4. Bind the certificate to a canonical serialization of the evidence package with a cryptographic digest (Methods, p.14)
5. If any predicate fails, return the unmet predicate and request evidence or another executor round (Methods, pp.14–15)
6. If the budget is exhausted without satisfying the contract, emit a dossier of surviving hypotheses and failure reasons and abstain (Methods, p.15)

The paper emphasizes the behavior on failure: “When any predicate fails, the supervisor does not silently force a guess.” (Methods, p.15). Abstention is a first-class result, not a converted prediction.

verus form

Inference: Encode the six conditions as a `spec fn contract_ok(evidence) -> bool` and prove an acceptance function’s `ensures` that it emits `Accept` only when `contract_ok` holds, while a rejection path identifies a false predicate. Use executable Rust for certificate serialization and cryptographic hashing; prove consistency between serialized fields and the values checked. Inference: the threshold values and the meaning of “unsafe” remain policy assumptions and need independent review.

what demonstrates it

The contract dominates a plain existence-threshold baseline across the EXA7 risk-coverage curve (Results, p.4). A scalar existence score saturates, while margin, alternative-exclusion, and residual predicates hold 100% precision out to 39% coverage for a representative seed (Results, p.4). On the 33 L-Town leaks, the transfer gate accepts four and all four are correct; the reported 95% confidence interval is 39.8–100.0% (Introduction, p.2). On the 194 City D orders, it issues five excavation recommendations (2.6% coverage), of which three are correct (60%, 95% CI 14.7–94.7%) (Introduction, p.2).

The paper reports control behavior too. On a standard transfer leg, two of 50 no-leak controls pass at knife-edge existence values 0.511 and 0.610; the stricter audit preset admits none (Methods, p.18). This is a concrete example of sensitivity to threshold presets.

limits and contradictions

The predicates are “hard guarantees” of the decision rule, not statistical error guarantees (Methods, p.14). The calibration-validity and human-review deployment hooks are declared but not evaluated (Methods, p.14). The paper’s headline says 214 of 223 acted events are correct (96.0%, 95% CI 92.5–98.1%) on 550 mixed EXA7 events (Introduction, p.2); the Results gives 96.1 ± 3.3% over five seeds, which is a different aggregation and should not be merged into one denominator.

## technique 3: independent language-model auditor with reject-only authority

what it is

The auditor receives only the structured numeric summary, never executor internals or prose. It returns strict JSON accept/reject and may add a rejection, but cannot override a failed predicate. It rejects internally inconsistent packages, including unsupported assertions, fabricated alternative exclusions, and inflated evidence (Methods, p.15).

how to apply it

1. Serialize only top hypothesis, residual, existence mass, margin, alternatives, and falsification status (Methods, p.15)
2. Send the package to an independent model family with a strict JSON schema (Methods, pp.15–16)
3. Parse failures conservatively as rejection (Methods, p.16)
4. Require deterministic contract success before accepting an auditor approval (Methods, p.15)
5. Persist every call as an audit transcript and test repeated temperature-zero calls (Methods, p.15)
6. Inject corrupted packages to measure catch rate and false alarms, then test additional corruption classes beyond enumerated rules (Methods, p.15; Table S14)

verus form

Inference: Treat the auditor as an untrusted filter whose only sound operation is to return `Reject`; a Verus-verified supervisor must enforce that `Accept` implies the deterministic contract independently of the model output. The JSON parser, transcript hash, and conservative parse-failure behavior can be verified for structural properties. Inference: model-family independence reduces correlated failure risk but is not a proof of independence.

what demonstrates it

The authors stress-test unsupported assertion, fabricated exclusion, and inflated evidence corruption classes, and compare repeated temperature-zero audits (Methods, p.15). They also run 16 clean accepted packages through four further corruptions that individually pass the five enumerated rules but jointly cannot hold, comparing three auditors (Table S14, p.24). The paper does not claim that this audit establishes general semantic correctness; it measures detection of the specified inconsistencies.

## technique 4: active sensing and graded response

When a contract fails because of zone ambiguity, the executor scores hidden nodes by the spread of competing hypotheses’ twin-predicted responses and reveals the three most discriminative nodes (Methods, p.15). The sensor set is augmented, leak hypotheses are refit and reranked, and non-leak posterior mass stays unchanged. This is an information-gain approximation tied to the digital twin, not a free-form LLM choice.

The operational response has tiers: excavation, district survey, request for evidence, or abstention. In City D’s district-inflow tier, 85 events are placed in the correct district out of 194 (43.8% coverage) (Introduction, p.2). The pressure tier’s five excavation recommendations and three correct matches are much more selective. Inference: a Rust implementation can model each tier as a state machine with transitions guarded by proved predicate results and evidence requests; Verus can prove that an `Act` state is unreachable unless the contract holds.

## what is proved, measured, and trusted

Measured quantities include forced accuracy, coverage, acted precision, false dispatches on 50 no-leak controls, calibration error, risk-coverage curves, and transfer results. The same five-measurement battery is applied to four in-silico networks, L-Town, and City D (Results, p.4; Methods, pp.16–18). Statistical procedures include five-seed means and standard deviations, exact 95% Clopper–Pearson intervals for small proportions, and a paired McNemar test with p<0.001 on 600 pooled leak events (Methods, p.16).

The paper proves code-level conjunction checks and cryptographic binding of evidence. It does not prove hydraulic-model fidelity, calibration validity, LLM reasoning, sensor honesty, or real-world causal correctness of a repair order.

Inference: The threat to an agent-written verified-Rust product is high when specifications omit rival explanations, safety predicates, or abstention. It is lower when every action is guarded by a proved conjunction and model outputs can only reject. The remaining risk is specification and environment mismatch: Verus can establish that the implementation obeys its contract while the contract fails to capture the real operational hazard.

## techniques for the catalog

- deterministic differential diagnosis — fit leak and confounder hypotheses in a hydraulic twin, fuse evidence, and keep model-generated prose outside numeric decisions
- six-predicate goal contract — require existence, region, margin, rival exclusion, residual, and safety predicates before action
- machine-checkable abstention — request evidence on failure and emit a dossier rather than force a prediction
- reject-only independent auditor — let an independent LLM add rejection while deterministic code retains approval authority
- hashed evidence certificate — bind thresholds, predicate outcomes, and accepted hypothesis to canonical evidence serialization
- discriminative active sensing — reveal hidden measurements where surviving hypotheses’ twin responses differ most
