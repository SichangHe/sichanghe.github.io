# Constrained Path Reasoning: Measuring When Committed Stages Earn Their Cost
(authored by agents unless marked 🧑)
Tag: `li2026cpr`, [paper](https://arxiv.org/abs/2607.17240)

## what is proposed and measured

Constrained Path Reasoning (CPR) treats LLM reasoning as a sequence of committed intermediate states. A state is a token prefix together with any explicit artifact it encodes, such as a subgoal, formal program or tool result. Trusted invariants constrain later search hard; model-generated states remain provisional until validated and can be revised or rolled back. The paper's abstract states, “Model-generated states supply hypotheses; trusted execution earns constraint strength.” (Abstract, p. 1)

The abstract says, “trusted or validated invariants can constrain hard, while other proposals remain soft and revisable.” (Abstract, p. 1)

The case study is LLM-assisted convexification of non-convex QCQPs. It measures residual-guided repair, nested stage packages, a feedback-conditioned action choice, and endpoint probes. The main ablation uses 30 problems with three samples per arm and 270 unique LLM calls. A result is usable only when it is 10^-6-feasible and within 0.05R of a best-known 26-start oracle (Section 6, PDF p. 8; Table 2, PDF p. 9).

## technique 1: represent reasoning as a provenance-aware constrained path

what it is: each stage proposes a next state, selects it, and conditions the next search. The paper writes, “At each step, the model’s heuristic search proposes a local continuation or intermediate artifact, selects one, and conditions subsequent search on it.” (Introduction, PDF p. 1) Constraints combine trusted invariants `I_k` with model proposals `C^b_k`; proposal weight is finite until a verifier certifies it (Section 2.1, PDF pp. 2–3).

Inference: when to use: use staged paths when a long endpoint transition can be factored into executable or checkable operators, such as formalization → solver execution → residual check → repair. Keep a proposed state soft when its provenance is only model text; use hard support only for a trusted law or independently verified contract.

how to do it:
1. Define the state `s_k` and input `x`; make the model's successor distribution explicit as a proposal/score → select → condition loop (Equation 1, Section 2.1, PDF p. 2)
2. Separate trusted invariants `I_k` from the generated proposal `C^b_k`, and attach a validation strength λ to the proposal (Equation 2–3, PDF p. 2)
3. Mark a proposal support-preserving only if it retains continuations extendable to a correct answer; retain revision, rollback or escape while it is uncertified (Section 2.1, PDF p. 3)
4. Log artifact validity, downstream utility, cost, induced regularity, feedback, candidate concentration, provenance and corrigibility at each interface (Introduction, PDF p. 1)
5. Price the path by total cost divided by usable outputs, `C_use = E[C]/Pr(U=1)`, and compare nested path packages with fixed executors, local contracts and a usable-endpoint criterion (Equation 10 and Accounting protocol, PDF p. 5)

Evidence: the paper proposes four mechanisms—transition factorization, state-space contraction, regularity induction and feedback/correction (Section 2.2, PDF pp. 3–4). It measures entropy, usable yield and cost rather than assuming a committed stage helps. In the LLM ablation, formalization plus deterministic execution raises usable yield from 41.1% to 90.0%, while convexification lowers it to 20.0% (Table 2, PDF p. 9).

Inference: a Verus agent can use a path of parsed specification, generated Rust, Verus checking, counterexample diagnosis and repair. Encode trusted properties in `requires`/`ensures` and loop `invariant` clauses; keep a model-proposed lemma or invariant provisional until `verus` proves the unchanged contract. Verus has no CPR abstraction, so the state ledger, provenance and rollback controller are orchestration around ordinary Rust and proof functions.

## technique 2: residual-guided endpoint triage and bounded repair

what it is: after a surrogate solver returns `x_c`, compute a scalar residual for violations of the original constraints, then classify the endpoint as NEAR-FEASIBLE, REPAIR or REJECT using an analytical or calibrated residual bound. The paper defines `r(x)` as the maximum inequality violation and absolute equality violation (Equation 11, PDF p. 5).

how to do it:
1. Assume a residual bound `dist(x,F) <= κ r(x)^θ` on a residual tube (Definition 1, PDF p. 6)
2. Choose acceptance tolerance ε and repair radius β with 0 < ε ≤ β (Proposition 1, PDF p. 6)
3. Set thresholds `(ε/κ)^(1/θ)` and `(β/κ)^(1/θ)`; classify below the first as NEAR-FEASIBLE, between them as REPAIR, and above the second as REJECT (Proposition 1, PDF p. 6)
4. If using calibration, obtain feasible projection proxies from a fixed multistart protocol, fit θ̂ by log–log regression, set κ̂ to the 95th percentile of `d/r^θ̂`, and use held-out proxy coverage (Section 4.2, PDF p. 7)
5. Run a bounded local correction on REPAIR endpoints; for deployment the paper also corrects a NEAR-FEASIBLE endpoint that still exceeds the numerical tolerance (16 such points plus 37 REPAIR points give its 53 attempts); require numerical feasibility after correction (Section 4.2, PDF p. 7)

Evidence: on 325 SDR-relaxed endpoints, the fitted proxy relation is `d_e ≈ 0.145 r^1.046`, 95% bootstrap slope CI [1.019,1.062], R²=.977; an independent 80-problem check gives slope 1.024 (Section 5, PDF p. 7). On 360 held-out instances, residual triage yields 28.3% feasible outputs with 53 repair attempts, versus repair-all's 35.0% with 299 attempts; it recovers `(28.3−16.9)/(35.0−16.9)=63.0%` of repair-all's additional yield using `53/299=17.7%` of attempts, with 77.4% repair precision (Table 1, PDF p. 8). The calibrated relation covers 342/360 = 95.0% of held-out projection proxies (Section 5, p. 7).

Inference: for Verus, a residual can be a failed postcondition count, counterexample distance or a typed diagnostic category. A controller can route small residuals to a bounded lemma repair and reject large residuals, but only Verus proves `ensures`; an LLM-calibrated score is not a proof. A repair budget should be explicit in Rust state and checked by `requires`/`ensures` on proof or orchestration functions.

## technique 3: nested stage ablation with shared calls

what it is: evaluate direct generation (D), formalization plus deterministic execution (F), F plus convexification (FC), and FC plus residual verification/repair (FCV) as nested packages sharing upstream calls. This localizes the cost and failure mode of each commitment.

how to do it:
1. Generate 30 QCQPs with literal coefficients and three samples per arm using fixed gpt-5.5 settings and schema-enforced JSON (Section 6, PDF p. 8)
2. Define D as direct numeric output; F as a formal program executed by SLSQP; FC as F plus SDR or one-shot inner majorization; FCV as FC plus residual triage and bounded repair (Section 6, PDF p. 8)
3. Share the same F calls across F, FC and FCV, and count all 270 unique calls (Table 2, PDF p. 9)
4. Require the common usable criterion: 10^-6 feasibility and objective gap ≤0.05R from the best-known oracle (Section 6, PDF p. 8)
5. Report returned coverage, feasibility precision, input/output tokens and LLM-plus-executor wall time per usable output (Table 2, PDF p. 9)

Evidence: D has 41.1% usable yield, F 90.0%, FC 20.0% and FCV 21.1%; F uses 14.4k input and 1.1k output tokens per usable output and 39 seconds, while D uses 31.0k input and 14.6k output tokens and 610 seconds (Table 2, PDF p. 9). F exactly transcribes all 90 programs; its remaining failures are feasible local solutions with a large oracle gap. Random initialization lowers F usable yield from 90.0% to 73.0%, assigning 17.0 points to initialization (Section 6, PDF p. 9). SDR is usable on 18/18 tight cases and 0/34 loose cases; OSM is feasible in 38/38 but usable in 0/38, exposing relaxation leakage and over-contraction (Section 6, PDF p. 9). FCV returns 57/90 = 63.3% of answers, all feasible, while FC returns every answer but only 62.2% of them are feasible; usable yield changes only 20.0%→21.1% (Section 6 and Table 2, PDF p. 9).

Inference: the Verus analogue is to compare direct code, code with a specification, code plus generated lemmas and code plus counterexample repair while sharing earlier model calls. Record compile, parse, Verus-proof and semantic-test outcomes separately. A verified intermediate lemma may improve proof search, but its cost and failure rate must be charged; a stronger invariant that excludes valid states is over-contraction.

## technique 4: feedback-conditioned keep, repair, switch or rollback

what it is: after a committed state, expose execution status, residual, objective, bound and gap, then choose among four actions: keep/repair, switch SDR↔OSM, roll back to the formal non-convex program, or abstain (Section 7, PDF p. 9).

how to do it:
1. Present state-only information for one call and state-plus-feedback for a paired call over 60 states and 120 independent calls (Section 7, PDF p. 9)
2. Ask for an A–D allocation and execute the selected action against ground truth (Section 7, PDF p. 9)
3. Measure allocation entropy, reported usable/feasible mass and selected-action usable yield; bootstrap paired changes by problem (Table 3, PDF p. 10)
4. Compare the learned selector with deterministic rules such as always-C and a feasible endpoint within 0.05R of the SDR bound (Section 7, PDF p. 10)

Evidence: feedback lowers reported allocation entropy 1.092→0.679 nats and raises selected-action usable yield 18.3%→36.7%, a +18.3-point paired change [8.3,30.0] (Table 3, p. 10). It changes 16/60 selections: 11 improve usability, 5 are neutral, 0 harmful. However, always-C and the SDR-bound rule reach 54/60 = 90.0%, versus 36.7% for the selector, while 60 post-feedback controller calls take 633.5 seconds (Section 7, p. 10). Six entropy-expanding pairs gain usable allocation mass and 28 concentrating pairs lose it; Inference: concentration alone is not a success criterion (Section 7, p. 10).

Inference: a Verus repair controller can map diagnostics to keep, strengthen, rollback or abstain. The selected action must still invoke Verus; a diagnostic policy may be worse than a simple deterministic rule and should be measured against that rule. Rollback preserves corrigibility when a generated invariant was too strong.

## technique 5: endpoint probes for provenance and executable validation

what it is: probe whether a committed state changes endpoint distributions and whether the change preserves acceptable mass. The paper's self-proposal pilot elicits a provisional state in the receiving call, while a cross-trajectory transplant supplies a surrogate state generated elsewhere.

how to do it:
1. Run repeated direct and same-call self-proposal outputs, then execute endpoints deterministically (Discussion, PDF p. 10)
2. For transplants, condition receiving calls on another trajectory's surrogate state and compare endpoint entropy, feasibility and acceptable mass (Discussion, PDF p. 10)
3. Treat concentration as useful only when executable utility and provenance remain acceptable; keep unverified transplanted states revisable (Section 2.2 and Discussion, pp. 4, 10)

Evidence: the 24-output pilot has equal two-repeat collision entropy (0.629 nats) in both conditions, usable yield 25.0% direct versus 8.3% self-proposal, and only 1/8 deterministically confirmed endpoint checks (Discussion, p. 10). In the six-problem transplant, endpoint entropy falls 1.301→0.512 (ΔH=.789 [0.172,1.482]), but acceptable mass falls 30.6%→2.8% while feasibility rises 33.3%→86.1% (Discussion, p. 10). The paper reports that the transplant "concentrates feasible, objective-poor endpoints" (Discussion, p. 10); its acceptable-mass interval is [−61.1, 0.0] pp and the per-problem entropy sign test gives p = 0.125 on six problems (App. G, p. 19). Inference: a state can make outputs look regular and feasible while moving them away from the objective, but six problems is thin evidence.

Inference: in Verus, test whether a generated invariant or ghost state actually improves proof obligations on the same source trajectory. Never promote an LLM-generated lemma to a hard assumption merely because it reduces proof search entropy; require a verified `proof fn` and preserve a rollback candidate.

## trusted boundary, limits and product threat

The trusted elements are executable solvers, numerical feasibility checks, fixed seeds and best-known oracle comparisons. Calibration uses projection proxies with `d_e ≥ dist` (Section 4.2, p. 7); the paper says its calibrated thresholds "operate within empirical support" and that the fitted relation is summarized by held-out coverage (Section 4.2, p. 7; App. C, Remark 2). Inference: it is not a proof of the power law beyond the calibrated residual range. The convexification results rely on literal transcription, feasible initialization and cheap reliable local solves; the paper says certificate-driven or initialization-poor regimes can reverse stage ordering (Section 6, p. 8). Inference: Verus checking can certify a Rust contract, but the contract's intent, external specifications and controller policy remain trusted assumptions.

What VL should not redo: the paper already gives a stage-accounting protocol, residual triage, shared-call nested ablations, deterministic baselines for the feedback action choice (always-C, an SDR-bound rule) and provenance probes. Inference: VL should spend effort on contracts and semantic review rather than treating lower proof entropy or a passing local check as sufficient. The product threat is over-constraining generated proofs: an agent may obtain a fast proof by excluding valid states or by trusting a transplanted, unverified invariant. The remedy is explicit rollback, unchanged contracts and independent Verus checks.

## techniques for the catalog

- provenance-aware constrained path — represent reasoning as staged states with trusted invariants hard and model proposals soft until validation
- residual-guided triage — map a residual bound to near-feasible, bounded-repair and reject decisions
- shared-call stage ablation — price nested formalization, transformation and verification stages with common calls and localized failures
- feedback action controller — choose keep, repair, switch, rollback or abstain from executable diagnostics and compare deterministic baselines
- endpoint provenance probe — measure entropy and acceptable mass together with executable utility before strengthening a commitment
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "FCV returns 57/90 = 63.3% of answers with 100% feasibility, versus 62.2% for FC, and changes usable yield from 20.0% to 21.1%."): I read the whole paper text (main text and appendices A-H) and the whole study, and checked every quotation, number, table and page reference, and each technique step against it. I changed: the definition of a state; the page reference for Equation 10 and the accounting protocol (p. 5, not pp. 4-5) and the claim of fixed prompts (the protocol names fixed executors, local contracts and a usable-endpoint criterion); the repair step (NEAR-FEASIBLE points above numerical tolerance are also corrected); the Direct arm token costs (31.0k input, 14.6k output; the study had 46.7k/31.0k, and 46.7% is its precision); the FC versus FCV feasibility comparison; the six/28 pairs, which concern usable allocation mass, not executed utility; the transplant caveats; the calibration sentence; an unsupported claim of placebo-like controls for the action choice (the paper has deterministic baselines); and marked own conclusions "Inference:". I did not check the Verus analogies (inferences, not paper claims), the external references, the GitHub release or the supplement, and I did not rerun any experiment or the proofs in Appendix C.
