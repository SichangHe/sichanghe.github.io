# ACon^2: Adaptive Conformal Consensus for Provable Blockchain Oracles
(authored by agents unless marked 🧑)
Tag: `park2023acon2`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/park)

## what is proved and measured

ACon² treats a blockchain oracle as a prediction-consensus learner. Each oracle supplies a set-valued prediction with uncertainty; the algorithm returns labels present in at least `K−β` of `K` base sets, tolerating up to `β` Byzantine sources. The abstract states: “the consensus set provides a desired correctness guarantee under distribution shift and Byzantine adversaries.” (Abstract, p. 3313)

The formal result bounds consensus miscoverage by the sum of base-learner bounds. The practical evaluation uses USD/ETH data with global distribution shift, INV/ETH data containing a real price manipulation, and a Solidity implementation measuring gas. Inference: these results establish statistical bounds and measure implementation costs; they do not establish the Solidity implementation's full correctness.

## technique 1: threshold consensus over prediction sets

What it is. Given base sets `Ĉt,k(xt)`, define `Ĉt(xt)` as every label appearing in at least `K−β` sets: `Ĉt(xt) := {y | Σk 1[y∈Ĉt,k(xt)] ≥ K−β}` (Equation 7, Section 4.1, p. 3319). Set-valued output preserves uncertainty; an empty set signals no consensus.

When to use it. Use it when data sources may disagree, distribution shifts over time, and up to β sources may be malicious. Choose `β` as an upper bound on manipulated sources. Theorem 1 requires Assumption 1 (each source label and the unobserved consensus label have identical conditional distributions given all source features), Assumption 2 (source labels and the consensus label are conditionally independent given those features), and Assumption 3 (the manipulation bound is known), as well as base-learner bounds (Sections 3.1–3.2, pp. 3316–3318; Theorem 1, p. 3320). The adversary can change which sources it manipulates over time but does not affect the consensus label (Section 3.2–3.3, p. 3318).

How to apply it.

1. Choose `K`, desired total miscoverage `α`, and an estimate `β̂` of Byzantine sources. The paper uses `β̂=⌊K/2⌋` when a majority is assumed honest (Section 4.1, p. 3320).
2. At each time `t`, observe source features `xt` and each source's prediction set.
3. Count how many base sets contain each candidate label and retain labels with count at least `K−β̂`, using the chosen upper bound (Equation 7, p. 3319; Algorithm 1, lines 1–3, p. 3320).
4. After labels `yt,k` arrive, update each base predictor; the next consensus uses the updated sets (Algorithm 1, lines 4–6).
5. Allocate error budgets so `αk=α/K`; Theorem 1 then bounds expected time-averaged miscoverage by `α+Σk εT,k`; this approaches `α` if the base error bounds vanish (Section 4.1, pp. 3320–3321).

Verus form. Inference: represent a prediction set as a ghost `Set<Label>` or interval and define a `spec fn consensus` that filters labels by a cardinality predicate. Prove with a `proof fn` that if at least `K−β` base sets contain the true label, consensus contains it. Use `requires` to state source-count and Byzantine bounds and `ensures` for set inclusion. Verus can prove deterministic aggregation; the probabilistic coverage assumptions remain external contracts.

Evidence. The discussion following Theorem 1 states: “Intuitively, the miscoverage value of the proposed consensus learner is bounded by the sum of the miscoverage value bounds of its base learners.” (Theorem 1 discussion, p. 3320) The displayed theorem gives `V(F,T,∑αk,β,L) ≤ ∑εT,k` when each base learner has bound `Vk ≤ εT,k`. This is a worst-case bound over distributions and β-Byzantine adversaries, with denominator `T` in the miscoverage average. On USD/ETH data sampled every 60 seconds over 2021, the authors set `α=0.01`, choose `αbase=α/K`, and report pseudo-miscoverage near or below α after adaptation (Figure 5 caption, p. 3323). The pseudo-label is the median of source prices, not ground truth (Section 5, p. 3322).

Failure and assumptions. The theorem needs base correctness, bounded learner values, and assumptions in Section 3. The authors note that `β` is unknown; setting `β̂=K` satisfies the upper-bound condition but produces the entire label space, while `β̂=0` violates that condition when `β≥1` (Section 4.1, p. 3320). Inference: a Verus proof cannot establish the statistical distribution assumptions or that an oracle's observed label is truthful.

## technique 2: adaptive conformal base prediction

What it is. Each source maintains a conformal prediction set `Ĉt,k(x)={y | st,k(x,y) ≥ τt,k}` (Equation 2, p. 3316). ACon² updates both the adaptive conformal threshold and a score function. The paper uses multi-valid conformal prediction (MVP), a quantized threshold with `m` bins, and a Kalman-filter score for price regression (Section 4.2, pp. 3321–3322).

When to use it. Use adaptive conformal prediction when the data distribution changes over time and a fixed interval or quantile is unreliable. The score function may be application-specific; Kalman is computationally light for sequential prices but assumes Gaussian noise.

How to apply it.

1. Select a score function. For each source, the paper predicts a Gaussian observation distribution from prior prices and divides its density score by twice its maximum: `st,k=s̄t,k/(2smax_t,k)` (Equation 8, p. 3321).
2. Choose a threshold parameter `τt,k` and bins `[τmax(i−1)/m, τmax i/m)`, with the last bin including `τmax`; construct the set of labels whose score is at least the threshold (Section 4.2.2, p. 3321).
3. On each labeled observation, update the threshold with MVP's `updateMVP` and update the score with a gradient-descent noise update followed by a Kalman state update. Algorithm 1 applies the adaptive conformal update before the score update; the authors say the order is not critical (Section 4.1, p. 3320; Sections 4.2.1–4.2.2, pp. 3321–3322). The detailed MVP update is Algorithm 2 of the separately cited arXiv version [32], not reproduced in this paper.
4. Feed the resulting K sets into threshold consensus and repeat online.
5. For a desired α, set each base target to `α/K`; increasing K therefore requires smaller per-source error budgets (Section 4.1, pp. 3320–3321).

Verus form. Inference: encode interval/set construction and Kalman arithmetic as executable Rust with `requires` for numeric-domain assumptions and `ensures` for score/threshold updates. Use `proof fn`s to check set membership against the score predicate and to verify update ordering. Statistical coverage remains a model assumption; floating-point and gas semantics require separate trusted specifications.

Evidence. The paper cites the MVP bound `V′(F,T,α,LMVP) ≤ Σ_i f(|Si|)/|Si| √(13.6m ln m)` where `Si` contains time steps whose threshold lies in bin `Bi` and `f(n)=√((n+1)log₂²(n+2))`, subject to smooth score distributions and `√(ln m/(6.8m))≤η≤√(ln m/(6.6m))` (Lemma 2, p. 3322). On USD/ETH, pseudo-miscoverage rises after an abrupt price increase and recovers as online adaptation proceeds (Section 5.1, p. 3322). The authors state: “The downside of the Kalman filter is its strong Gaussian assumption.” They explain that this affects set size rather than base-set correctness, which holds for any score function under the adaptive predictor's conditions (Section 4.2.1, p. 3321).

Failure and assumptions. ACon² can output an empty set during initial learning or transient disagreement; the authors interpret this as “I don’t know” (Section 5.1, p. 3322). With K=1, the method assumes no adversary and follows a manipulated source (Section 5.2, p. 3324). During slow arbitrage after manipulation, Assumption 1 may fail (Section 5.2, p. 3324). Figure 8 uses a practical extension with nonzero `ν` to account for inactive arbitrage; that extension is defined in Equation 9 of [32], not in this paper (Figure 8 caption, p. 3330).

## technique 3: Solidity implementation and cost accounting

What it is. The authors implement ACon² and base prediction updates as Solidity contracts and measure gas. Consensus construction itself reads intervals; writing the consensus output costs additional gas. The paper states: “This case study in the Ethereum blockchain demonstrates that our algorithm based on online machine learning has opportunities to be implemented in operation-parsimonious blockchains, partially addressing Challenge ❺.” (Section 5.3, p. 3325)

How to apply it.

1. Attach a base prediction update to each token swap and store its prediction-set state.
2. Read the K base intervals and compute the threshold consensus set on chain.
3. If a downstream contract writes the consensus, account for its gas separately.
4. Measure repeated transactions and report mean and standard deviation; the paper averages 500 transactions (Table 2, p. 3324).

Verus form. Inference: model Solidity storage and arithmetic as Rust data structures with contracts for overflow, access control, and update ordering. A Verus proof can establish deterministic consensus and state-transition safety, but it cannot prove Ethereum gas costs or oracle input authenticity without environment models.

Evidence. Table 2 reports averages over 500 transactions: a swap uses `112,904.23 ± 5,115.41` gas, swap plus BPS uses `726,219.60 ± 31,582.52`, and ACon² aggregation uses `105,518.16 ± 257.39` gas (p. 3324). Table 3 computes whole-system costs as `K(GSwap+GBPS)+GACon2`; at the 2022-02-18 gas price, K=1,2,3 cost $35.24, $66.02, and $96.80 per transaction, compared with $4.78 baseline (Table 3, p. 3325). Inference: these transaction averages and historical dollar conversions do not establish current deployment costs.

Failure and assumptions. The reported gas study covers the authors' Solidity implementation and uses a historical gas-price setting (Section 5.3, pp. 3324–3325). Inference: product deployments must remeasure under current chain limits, token precision, and adversarial transaction ordering.

## what remains trusted and threat to VeruLaw

Theorem 1 gives a mathematical miscoverage bound conditional on base-learner bounds and Assumptions 1–3 (p. 3320). Section 5 evaluates two price datasets and a Solidity implementation (pp. 3322–3325). Inference: this leaves a gap between the statistical model and executable code; using these results in a verified system would still require justified source-distribution and manipulation assumptions, faithful numerical implementation, and a blockchain execution model. The median used for evaluation is a proxy for an unobserved consensus label, so empirical pseudo-miscoverage does not directly measure coverage of that true label.

Inference: ACon² is a low direct threat to VeruLaw's core Rust verification product. Its useful lesson is a reusable proof pattern for set-valued consensus under adversarial inputs: specify assumptions, prove deterministic aggregation, and separate statistical guarantees from code correctness. VeruLaw could verify a Rust implementation of the consensus and its state machine, but would still need externally justified probabilistic contracts. VL should not redo the ACon² theorem or empirical price study; novelty would require verified Rust implementation, stronger numerical/chain guarantees, or a new formal treatment of oracle assumptions.

## techniques for the catalog

- threshold consensus sets: retain labels appearing in at least K−β base prediction sets
- adaptive conformal updates: update per-source prediction thresholds online under distribution shift
- Kalman score construction: use sequential Gaussian state estimates as a computationally light conformity score
- error-budget composition: set αk=α/K so Theorem 1 bounds total miscoverage by the sum of base bounds
- Solidity cost validation: measure on-chain gas for base updates and consensus aggregation over repeated transactions
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "However, this assumption does not affect the correctness of base prediction sets as the correctness holds for any score function, which is a property of conformal prediction and also our choice of an adaptive conformal predictor in Lemma 2."): read the entire supplied paper, including references and Appendix A; checked quotations, numerical results, equations, assumptions, technique steps, and printed page references against it; corrected score normalization, bin endpoints, threshold comparison, error-bound wording, assumptions, citations, and the gas-study quotation; marked interpretation as Inference and used the publisher link printed on the cover; did not check code, reproduce experiments, verify proofs independently, or read the separate arXiv version containing detailed algorithms and proofs.
