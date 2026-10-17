# Once is Never Enough: Foundations for Sound Statistical Inference in Tor Network Experimentation
(authored by agents unless marked 🧑)
Tag: `jansen2021once`, [paper](https://www.usenix.org/conference/usenixsecurity21/presentation/jansen)

## problem
The paper addresses statistical soundness of Tor simulations. Section 5.1 distinguishes network-sampling error from simulator randomness. The authors state in the abstract (p. 3415): “The standard practice for previous research attempting to enhance Tor performance is to draw conclusions from the observed results of a single simulation for standard Tor and for each research variant.” Section 6.3 shows how ignoring uncertainty can suggest a performance improvement that the intervals do not support. The paper proposes representative network modeling, repeated independent samples, and confidence intervals (CIs).

Inference: The direct formal-verification lesson is a reproducible statistical contract: every claim must state its sampling layers, denominator, estimator, and uncertainty.

## technique 1: model and sample representative networks
Their Tor model uses measured relay attributes, user locations, and traffic characteristics, with configurable network scale s, load ℓ, and client-process scale p. Staging aggregates network data over a chosen period rather than using one static snapshot. Table 2 (p. 3422) reports 100% networks with 6,489 relays and 792,000 simultaneously active users, using at most 3.9 TiB RAM, 2 days 21 hours bootstrap, and 8 days 6 hours total simulation; the 31% model uses 932 GiB and 2 days 2 hours total. These total times include bootstrapping plus 25 simulated minutes of steady state.

Application steps (Sections 3 and 4):
1. stage hourly consensuses, daily relay descriptors, and per-country user counts for the chosen period; compute the statistics in Table 1
2. sample the full-scale relay count without replacement, weighted by running frequency; assign guard and exit flags probabilistically from their observed frequencies
3. for each relay position, sort by normalized consensus weight, divide into equal-count buckets for scale `s`, and choose each bucket's median-weight relay
4. assign relay bandwidths and locations; generate `p·s·792,000` traffic client processes using the measured user-location distribution, with each process representing `1/p` users and circuit, stream, and packet Markov models controlling traffic
5. add performance benchmarking clients; execute independently generated networks for the experiment configuration

The case study reports 100 traffic client processes at 1% scale (Table 5), rather than the smaller count given by the process-scale formula. Its warm-up exclusion is specified in Section 6.3, footnote 14.

Inference: In Verus, model a sampled network as an immutable record with a declared scale and seed; prove that experiment outputs retain those identifiers and that warm-up samples cannot enter the result. Treat the probabilistic sampling procedure as an assumption unless it is separately verified.

## technique 2: repeated independent sampling
Let X be the measured random variable (for example, time to last byte), P(X) its true distribution, and P̂_i(X) the distribution in sampled network i. Run m_i simulations in each of n independently sampled networks. Each simulation contributes ν_ij observations and an empirical distribution. Section 5.1 (p. 3422) says: “Multiple samples of each are needed to conduct a statistical inference and understand the error in these sampling processes.”

Steps (Section 5.1):
1. independently sample n networks
2. run m_i simulations per network
3. collect ν_ij observations per simulation after steady state
4. compute each simulation’s empirical inverse CDF at quantile y
5. average the m_i simulation quantiles to obtain μ̂_i(y)
6. average the n network estimates to obtain μ(y)

Section 5.2 tests three simulator seeds in each of three independently sampled 10% networks. For 50 KiB download times, network sampling causes much more variation than simulator seeds. The authors therefore suggest one simulation per independent network when computational resources are limited; the 420-simulation case study uses this approach.

Inference: In Verus, represent observations as finite sequences and prove that means use exactly the declared denominator; carry network and simulation identifiers in the type or record. Use loop invariants for count and sum preservation. Floating-point rounding and random independence require explicit treatment.

## technique 3: confidence intervals with two error layers
Section 5.1, Equations 3–5 (p. 3423), combines simulation variation and measurement-resolution error. It defines ε̂_i(y)=σ̂_i(y)·t/√(m_i−1), using Student's t value with m_i−1 degrees of freedom. Its σ̂_i uses divisor m_i for squared deviations and adds ζ_i² inside the square root; it is not the usual sample standard deviation with divisor m_i−1. The overall error is ε(y)=δ(y)+σ(y)·t/√(n−1), where δ is mean per-network error and σ uses divisor n for squared deviations of μ̂_i(y). The overall t value uses n−1 degrees of freedom (Section 5.2). The paper explains: “The width of the interval is 2 · ε(y), which we visualize at y = .5 with the downward arrows and over all quantiles with the shaded region in Figure 4b.”

Steps:
1. include resolution error ζ_i = r/√(12m_i) when measurements have resolution r
2. compute σ̂_i(y) from squared deviations of the m_i simulation quantiles, including ζ_i²
3. multiply σ̂_i(y) by the Student t value for confidence α and m_i−1 degrees of freedom, then divide by √(m_i−1)
4. compute μ(y), σ(y), and mean δ(y) across networks
5. compute ε(y) using the overall t value and report [μ(y)−ε(y), μ(y)+ε(y)] at each quantile, with α and all denominators

Inference: In Verus, specify interval arithmetic and prove all denominators nonzero; Equations 3 and 4 require `m_i>1` and `n>1`. The paper's resource-saving choice `m_i=1` does not directly define Equation 3; an implementation needs an explicit policy for within-network error. A verified checker can validate sums, counts, and interval bounds; arithmetic correctness alone cannot establish statistical coverage or independence.

## technique 4: interpret overlapping CIs
The case study compares traffic loads ℓ=1.0 and ℓ=1.2 at network scales 1%, 10%, and 30%. Table 4 reports 100 simulations per load at 1% and 10% scale, and 10 per load at 30% scale; Figures 7–8 also analyze subsets. For 1 MiB download times at 1% scale and n=100, the P90 intervals overlap across [16.5,19.5] seconds, about 3 seconds. The authors cannot conclude that higher load increases download times at their desired 95% confidence. For error rates at that same scale and n=100, however, the intervals separate and support an increase. At 10% scale, n=100 distinguishes both metrics; at 30% scale, n=5 suffices for both shown comparisons (Section 6.3, pp. 3426–3427).

The paper warns in Section 6.3 (p. 3426): “If we had followed previous work and ignored the CIs, it would have been very difficult to notice this statistical possibility.” Its recommendations are at least 10% network scale whenever possible and no fewer than 10 simulations per experiment. Inference: A dashboard should show uncertainty alongside curves and require a stated statistical comparison rule before accepting a directional claim; overlapping individual CIs alone are not a universal test of a difference.

## evidence, trust, and limits
The case study runs 420 simulations across three network scales and two traffic loads. Measurements ignore the first 20 simulated minutes to reach steady state. Reported performance includes CDFs for 1 MiB downloads and error-rate distributions. The model’s largest simulation reaches 100% network scale, 6,489 relays, and 792k users; these are model sizes, not independent real-world observations.

Section 7 (p. 3428) identifies limits: artificial packet loss is omitted beyond congestion drops; median-based relay selection may miss variation; combining users in one client process requires disabling guards and reduces location diversity.

Inference: The trusted assumptions include correctness of Tor, Shadow/TGen, measured inputs, and the sampling model. The method does not by itself prove model unbiasedness or causal comparability. VL can verify accounting, denominator consistency, interval arithmetic, and metadata provenance, but a verified program can still support an unsupported operational claim if sampling or confidence assumptions fail. These Verus/VL applications are proposals in this study, not techniques implemented or evaluated by the paper.

## techniques for the catalog
- representative network modeling — sample configurable-scale networks from measured relay and traffic distributions
- repeated independent experiments — separate network-sampling error from simulator randomness with n networks and m simulations
- quantile aggregation — estimate the true inverse CDF by averaging simulation and network quantiles
- two-layer confidence intervals — combine measurement, within-network, and across-network errors with Student’s t values
- uncertainty-aware conclusions — compare estimates and CIs across loads and network scales before drawing performance conclusions
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Although it is ideal to run multiple simulations in each of multiple sampled networks, our results indicate that it may be a better use of resources to run every simulation in an independently sampled network."): checked the entire paper including references and Appendix A, quotations, numbers, section/page references, and technique steps; corrected sampling steps, variance divisors, CI denominators, load notation, metric-specific results, and inference labels, and replaced the link with the publisher page printed in the paper; did not reproduce experiments, audit tool implementations, validate statistical coverage, or read the separate extended paper.
