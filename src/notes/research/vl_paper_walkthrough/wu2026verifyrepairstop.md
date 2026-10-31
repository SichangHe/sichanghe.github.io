# Verify, Repair, Repeat, or Stop? Robust Stopping for Noisy Verify-Repair Loops in LLM Agents
(authored by agents unless marked 🧑)
Tag: `wu2026verifyrepairstop`, [paper](https://arxiv.org/abs/2607.17641)

## what is established
VRR-Stop treats verification and repair as noisy state transitions. Its key fact is that an increasing acceptance rate can coexist with declining true validity. The abstract states, “When both the verifier and the repairer are noisy, repair can damage already-correct plans, and reported acceptance keeps rising while true validity falls, so existing methods lack a principled basis for deciding when repair should stop.” (p. 1). It models verifier false acceptance ρ0, false rejection ρ1, repair success α, and repair damage β, with discrimination J=1−ρ0−ρ1 (section 3.2, p. 3). The deployment target is the sign of the expected one-more-repair gain, not a fixed number of rounds.

## technique 1: belief filtering from repeated votes
Use this when a plan is checked repeatedly but its true correctness is unavailable at deployment. For plan pk, issue M conditionally independent binary verification queries and record acceptance count Sk (section 3.1, pp. 2–3). Maintain predictive belief b⁻k, the probability the plan is truly valid before this round. Bayes update with the binomial likelihoods (equation 5, section 4.1, p. 4): valid plans accept with probability 1−ρ1, invalid plans with ρ0. Then propagate after repair as b⁻k+1=(1−β)bk+α(1−bk) (section 4.1, p. 4). The paper cautions, “Given Hk , the committed validity bk = Pr(yk = 1 | Hk ) is the posterior probability that the current plan is truly worth committing; it is not the verification pass rate, which can rise merely through false acceptance.” (section 4.1, p. 4).

Inference: a possible Verus form is to encode the plan state and vote count in a ghost structure, with a spec function for the posterior update and lemmas proving probabilities remain in [0,1]. `requires` can impose calibrated ρ0/ρ1/α/β bounds; `ensures` can state the recurrence, provided the Bayes denominator is positive. Verus proves arithmetic properties of the model, while calibration labels and independence are assumptions outside the proof.

## technique 2: marginal-gain stopping boundary

The motivation section states, “More repair is not always beneficial.” (section 3.4, p. 3).
Use the posterior to decide whether another repair is expected to help. Compute Gk=(1−bk)α−bkβ (equation 6, p. 4). Repair only when Gk>τ; otherwise commit (equation 4, p. 3). With τ=0 and α+β>0, the threshold is b*=α/(α+β): below it, expected repair benefit exceeds damage; at or above it, stop. At Kmax, commit the current plan (section 4.1, p. 4). The method is one-step lookahead and deliberately does not claim optimality for long trajectories. Its assumptions are local stationarity of the four noise parameters and conditional independence of repair transitions from history given true state (sections 3.2 and 4.1, pp. 3–4).

Inference: a possible Verus form is to write a pure spec function `gain(b, alpha, beta)` and prove a lemma that `b < alpha/(alpha+beta)` implies positive gain when the denominator is positive. A verified controller can branch on a conservative rational interval for G; do not encode floating-point estimates as exact proof facts.

## technique 3: sign-identifiability and confidence radius
Estimated parameters can flip the stop/repair action. The reliability analysis assumes an error radius Bk satisfying Pr(|Ĝk−Gk|≤Bk)≥1−η and identifies the action when Ĝk−Bk>τ (repair) or Ĝk+Bk≤τ (commit) (equation 8, section 4.2, p. 4). Proposition 1 guarantees action agreement with probability at least 1−η, conditional on that interval attaining its stated coverage. Reliability depends jointly on J, calibration sample size, and the decision margin Δk=|Gk−τ|; near-zero J can defeat calibration even with a large margin (section 4.2, p. 5). The paper explicitly distinguishes the experiments: “In the experiments, VRR-Stop acts directly on the sign of Ĝk ; Eq. (8) and Proposition 1 serve as reliability-analysis tools for the flip-risk evaluation in the experiments.” (section 4.2, p. 5). Algorithm 1 presents an intended deployment procedure using the interval test; the experiments evaluated Stop and Guard separately, without an online mode switch (pp. 5, 9).

The calibration procedure fits a two-component binomial mixture by EM to repeated vote counts, then estimates α and β from at most 300 labeled before/after transitions (section 4.2, p. 4). The prior is the initial-plan validity rate on calibration folds, and all estimates use five-fold cross-fitting (Appendices A.4 and B, pp. 9–10).

## technique 4: VRR-Guard keep-best fallback
When a held-out separation test finds J near zero or equation 8 remains unidentifiable, use VRR-Guard instead of calibrated stopping (section 4.3, p. 5). Keep incumbent c0=p0 and its recorded acceptance count. Query each new candidate M times and replace the incumbent only if S(p)≥S(c)+δ; retain the new count with the new incumbent (equation 9 and Algorithm 1, pp. 5, 9). Commit the incumbent at termination, rather than the last repair. These comparisons assume verifier noise remains stationary within a trajectory. For a truly valid incumbent and a truly invalid candidate, conditionally independent queries, and J≥0, Lemma 1 gives Pr[S(p)≥S(c)+δ]≤exp(−(MJ+δ)^2/(2M)); the Kmax-round union bound multiplies this by Kmax (section 4.3 and Appendix A.3, pp. 5, 8). With M=8 the replay ablation selected δ=5 (section 4.3, p. 5).

Inference: a possible Verus form is to represent the incumbent and candidate as ghost references and prove that replacement requires the checked margin; the statistical tail bound remains an external assumption. This fallback sacrifices gains in repair-beneficial regimes by design, preserving a near-no-repair baseline when the verifier cannot discriminate.

## techniques for the catalog
- belief filtering: turn repeated verifier votes into a posterior committed-validity estimate with a binomial Bayes update
- marginal-gain stopping: repair only when expected fixes exceed expected damage, using G=(1−b)α−bβ
- sign-identifiability test: require an error interval to lie wholly on one side of the stopping threshold
- guarded keep-best: when discrimination is unidentifiable, replace the incumbent only after a vote margin δ
