# Verify, Repair, Repeat, or Stop? Robust Stopping for Noisy Verify-Repair Loops in LLM Agents
(authored by agents unless marked 🧑)
Tag: `wu2026verifyrepairstop`, [paper](https://www.semanticscholar.org/paper/a459afb1d40ca7b54e88d1d4de76d9fa58287f6b)

## what is established
VRR-Stop treats verification and repair as noisy state transitions. Its key fact is that an increasing acceptance rate can coexist with declining true validity. The paper states, “When both the verifier and the repairer are noisy, repair can damage already-correct plans, and reported acceptance keeps rising while true validity falls.” (abstract, p. 1). It models verifier false acceptance ρ0, false rejection ρ1, repair success α, and repair damage β, with discrimination J=1−ρ0−ρ1 (section 3.2, p. 3). The deployment target is the sign of the expected one-more-repair gain, not a fixed number of rounds.

## technique 1: belief filtering from repeated votes
Use this when a plan is checked repeatedly but its true correctness is unavailable at deployment. For plan pk, issue M conditionally independent binary verification queries and record acceptance count Sk (section 3.1, p. 3). Maintain predictive belief b⁻k, the probability the plan is truly valid before this round. Bayes update with the binomial likelihoods (equation 5, section 4.1, pp. 4–5): valid plans accept with probability 1−ρ1, invalid plans with ρ0. Then propagate after repair as b⁻k+1=(1−β)bk+α(1−bk) (section 4.1, p. 5). The paper cautions, “Given Hk , the committed validity bk = Pr(yk = 1 | Hk ) is the posterior probability that the current plan is truly worth committing; it is not the verification pass rate” (section 4.1, p. 4).

Verus form (Inference): encode the plan state and vote count in a ghost structure, with a spec function for the posterior update and lemmas proving probabilities remain in [0,1]. `requires` can impose calibrated ρ0/ρ1/α/β bounds; `ensures` can state the recurrence and monotonicity. Verus proves arithmetic properties of the model, while calibration labels and independence are assumptions outside the proof.

## technique 2: marginal-gain stopping boundary

The motivation section states, “More repair is not always beneficial.” (section 3.4, p. 3).
Use the posterior to decide whether another repair is expected to help. Compute Gk=(1−bk)α−bkβ (equation 6, p. 5). Repair only when Gk>τ; otherwise commit (equation 4, p. 3). With τ=0, the threshold is b*=α/(α+β): below it, expected repair benefit exceeds damage; at or above it, stop. The method is one-step lookahead and deliberately does not claim optimality for long trajectories. Its assumptions are local stationarity of the four noise parameters and conditional independence of repair transitions from history given true state (sections 3.2 and 4.1, pp. 3–5).

Verus form (Inference): write a pure spec function `gain(b, alpha, beta)` and prove a lemma that `b < alpha/(alpha+beta)` implies positive gain when the denominator is positive. A verified controller can branch on a conservative rational interval for G; do not encode floating-point estimates as exact proof facts.

## technique 3: sign-identifiability and confidence radius
Estimated parameters can flip the stop/repair action. VRR-Stop computes an error radius Bk satisfying Pr(|Ĝk−Gk|≤Bk)≥1−η and declares the sign identifiable only when Ĝk−Bk>τ (definitely repair) or Ĝk+Bk≤τ (definitely stop) (equation 8, section 4.2, p. 5). Proposition 1 guarantees action agreement with probability at least 1−η under that condition. Reliability depends jointly on J and the decision margin Δk=|Gk−τ|; near-zero J defeats calibration even with a large margin (section 4.2, p. 5).

The calibration procedure fits a two-component binomial mixture by EM to repeated vote counts, then estimates α and β from at most 300 labeled before/after transitions (section 4.2, p. 5). Inference: VL should treat Bk as an input to a fail-closed policy and record the calibration population, model, and verifier; a Verus proof can establish that an interval decision is conservative but cannot establish the statistical coverage claim without a separately trusted probability argument.

## technique 4: VRR-Guard keep-best fallback
When a held-out separation test finds J near zero or equation 8 remains unidentifiable, use VRR-Guard instead of calibrated stopping (section 4.3, p. 6). Keep incumbent c0=p0, compare current candidate p with the incumbent using fresh vote counts S(p), S(c), and replace only if S(p)≥S(c)+δ. The paper gives the bound Pr[S(p)≥S(c)+δ]≤exp(−(MJ+δ)^2/(2M)) and a Kmax-round union bound (Lemma 1, section 4.3 and Appendix A.3, pp. 6, 14). With M=8 the replay ablation selected δ=5 (section 4.3, p. 6).

Verus form (Inference): represent the incumbent and candidate as ghost references and prove that replacement requires the checked margin; the statistical tail bound remains an external assumption. This fallback sacrifices gains in repair-beneficial regimes by design, preserving a near-no-repair baseline when the verifier cannot discriminate.

## evidence, limits, and relevance to VL
On GSM8K/Qwen2.5-3B prompt-mismatch stress (N=500 trajectories, M=8 votes, Kmax=5), Table 1 reports no-repair validity 0.700, fixed five-round repair 0.116, and VRR-Stop 0.722 with mean 0.72 repair rounds; the paired gain over fixed repair is 60.6 percentage points, 95% CI [+56.0,+65.0], McNemar p<2×10⁻85 (Table 1, p. 9). Under shift, Table 2 reports Llama-3-8B stress J=0.03: calibrated stopping 0.223 versus VRR-Guard 0.793; denominator is the saved-trajectory setting in that table (section 5.5, p. 10). The paper also reports sign-flip probability 0.183 for J≤0.15 and Δ≤0.10 versus 0.014 for J≥0.4 or Δ≥0.30 (N=300 calibration samples, M=8; section 5.4, p. 10).

The authors limit the model to binary validity, local stationarity, and conditionally independent votes/transitions; future work is round-varying dynamics and online mode switching (section 6, p. 11). Inference: this is directly relevant to VL proof-repair loops when a language-model critic is noisy, but a passing Verus verification is itself a substantially stronger signal than an LLM vote. VL can still use the stop criterion for deciding whether to ask for another candidate proof, while the final commit must be gated by Verus, whose trusted kernel is outside this paper.

## techniques for the catalog
- belief filtering: turn repeated verifier votes into a posterior committed-validity estimate with a binomial Bayes update
- marginal-gain stopping: repair only when expected fixes exceed expected damage, using G=(1−b)α−bβ
- sign-identifiability test: require an error interval to lie wholly on one side of the stopping threshold
- guarded keep-best: when discrimination is unidentifiable, replace the incumbent only after a vote margin δ

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
