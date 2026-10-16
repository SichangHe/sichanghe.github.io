# Valid Stopping in Adaptive Generator–Verifier Loops
(authored by agents unless marked 🧑)
Tag: `hegazy2026valid`, [paper](https://www.semanticscholar.org/paper/a9f97f4eea8dc75e1a965e0932aec5020c416dd9)

## what the paper solves

Hegazy, Jordan, and Dieuleveut study an inference-time loop in which a generator adapts to a cheap verifier while the expensive ground-truth oracle remains hidden. The verifier may be exploited: candidates can score well on the proxy while failing the oracle. The paper combines three parts: marginally valid e-values for each round, online e-Benjamini–Hochberg (e-BH) for arbitrary within-run dependence, and robust-core conformal risk control (CRC) for a non-monotone calibration parameter. The abstract states: “We study when to stop these loops while controlling the false discovery rate of the accepted proposals.” (Abstract, p. 1).

The paper summarizes the setting as “A large class of inference-time systems operates as generator–verifier loops.” (Section 1, p. 1). The target is trajectory-level false discovery rate (FDR): the expected fraction of accepted proposals that the oracle would reject, at every stopping time up to the time when `κ` proposals have been accepted. The paper explicitly permits the generator to depend arbitrarily on previous verifier feedback (Section 1, pp. 1–2; Section 2, p. 2).

Inference: for VL, this is a statistical guard around a Verus acceptance loop, not a replacement for Verus. A Verus proof checker can establish whether a specific candidate meets a specification; this paper addresses how many checker-positive candidates to accept when the checker is only a proxy for a more expensive truth oracle.

## technique 1: score-window testing with index-betting e-values

What it is. At round `t`, define a score window `W_t` from the most recent `K+1` verifier scores. Historical runs contain labels `Y_t`; the deployment run does not. The local null is that the deployment window has the distribution of incorrect proposals (`P0,t`), versus the alternative distribution of correct proposals (`P1,t`). An e-value is a nonnegative statistic with null expectation at most one (Section 2, p. 3).

The paper embeds the unlabelled deployment window among logged null windows, randomly permutes the batch, and asks a budgeted, permutation-equivariant betting strategy to assign capital to positions. If there are `n0,t` positions, the stake on the hidden deployment position is multiplied by `n0,t`. Under the null, the hidden position is uniform and independent of the ordered batch, yielding Proposition 1: `E0,t[Et] ≤ 1` (Section 4, pp. 5–6).

Steps from the paper:

1. Select logged windows with `Yt,i = 0` and form the augmented batch containing the deployment window with pseudo-label zero (Section 2, pp. 2–3; Section 4, p. 5).
2. Randomly order the batch and let `i*` denote the deployment position (Section 4, p. 5).
3. Use a batch-symmetric strategy `β` whose stakes sum to at most one (Section 4, p. 5).
4. Return `Etβ = n0,t βt,i*` (Section 4, p. 5).
5. In practice, fit an order-invariant leave-one-out likelihood-ratio score `L-hat t,-i` and use Equation (2) to normalize the deployment score by the sum of all leave-one-out scores (Section 4, p. 6).

The ideal likelihood-ratio strategy is Kelly-optimal under the alternative: “The random ordering of Wt0 is an analytical device.” (Section 4, p. 6). Proposition 2 then gives the posterior likelihood-ratio weights as the unique conditional log-growth maximizer. The paper's validity does not require a correct likelihood model; it requires the learned betting function to remain budgeted and batch-symmetric (Section 4, pp. 5–6).

Verus form: Inference: model each candidate's verifier-score history as ghost `Seq` data and define a `spec fn` for a score-window predicate. Use `proof fn`s to establish that an acceptance statistic satisfies a stated bound under a formal probabilistic model; use `requires`/`ensures` for the model's assumptions and conclusions. Inference: ordinary Verus proofs are deterministic and do not provide probability distributions or e-values, so the statistical layer must be an external, separately checked analysis. A Verus proof acceptance should still be recorded as the oracle label or a trusted proxy label, with its specification and external assumptions explicit.

Evidence and limits. Theorem 1 bounds the estimation residual by twice the maximum log likelihood-ratio estimation error over the augmented batch (Section 4.1, p. 6). Theorem 2 gives betting cost at most `Cδ E_P0[L^(1+δ)] / n0,t^δ` when a `(1+δ)` fractional moment exists; `δ=1` recovers `O(1/n0,t)`, while `δ<1` covers heavy tails (Section 4.1, pp. 6–7). Theorem 3 gives a matching `n0,t^-δ` lower bound over the stated moment class, and Corollary 1 gives convergence under finite KL divergence alone (p. 7). These are population results, not an empirical guarantee for a misspecified Verus-score model.

## technique 2: online e-BH for stopped FDR under adaptive dependence

What it is. Each round supplies a marginally valid e-value. Online e-BH allocates an error schedule `γt` with nonnegative terms summing to one and accepts indices whose e-values exceed `1/(αγs k)` for the largest feasible number `k`. It returns nested sets `Rt`. The paper uses the guarantee `E[sup_t FDP(Rt)] ≤ α` under arbitrary within-run dependence (Section 2, pp. 3–4).

Steps from the paper:

1. Choose a target FDR `α`, a target acceptance count `κ`, and a unit schedule `(γt)` (Section 2, p. 3).
2. At each round compute the valid local e-value (Section 2, pp. 2–3; Section 6.1, p. 13).
3. Find the largest `k` for which at least `k` previous or current e-values satisfy `Es ≥ 1/(αγs k)` (Equation in Section 2, p. 3).
4. Accept all indices meeting that threshold and stop at `τκ = inf{t: |Rt| ≥ κ} ∧ T` (Section 2, p. 3).
5. Use the supremum-FDP guarantee to cover every stopping time `τ ≤ τκ` (Section 2, p. 3).

Verus form: Inference: maintain a ghost accepted-index set and a loop `invariant` describing its cardinality and an abstract error budget. A `proof fn` can prove deterministic properties of the threshold calculation, while the statistical FDR theorem remains an external assumption or a separate mechanized probability proof. Inference: Verus cannot infer arbitrary dependence guarantees from an `invariant`; the model, distribution, and calibration proof must be stated outside executable Rust or encoded in a verified probabilistic library.

Limits. The guarantee controls the expected FDP relative to hidden oracle labels; it does not prove that the oracle itself captures product correctness. The construction assumes roundwise marginal validity and a fixed horizon in the main presentation, although variable-length runs are said to be extendable (Section 2, p. 2).

## technique 3: robust-core CRC for non-monotone calibration

What it is. Scaling the e-BH schedule by `λ` can make stopping earlier, but the empirical stopped-FDP loss `ℓ(λ)` is non-monotone. Standard CRC is valid for monotone losses and can fail otherwise. Robust-core CRC lifts a scalar parameter to a set `C` and uses set loss `Li(C) = supλ∈C ℓi(λ)`, which is monotone under set inclusion (Section 5, pp. 9–10).

A complete-data certificate `G` is symmetric in the loss profiles and satisfies an empirical set-loss bound. With the hidden deployment loss profile replaced by every admissible completion `w`, the robust core is the intersection `Cn = ⋂w G(ℓ1:n,w)`. The selected parameter is the most preferred member of `Cn`; if empty, use a safe fallback `λsafe` with zero loss. Theorem 4 proves `E[ℓn+1(λhatcore)] ≤ α` under exchangeability (Section 5.1, pp. 9–10).

Steps from the paper:

1. Define the ordered parameter set and bounded loss profiles (Section 5, p. 9).
2. Use the greedy complete-data selector: scan parameters from most to least preferred and include a value only when the enlarged set keeps average set loss at most `α` (Algorithm 1, p. 10).
3. Intersect the selector's output over every admissible hidden loss curve (Section 5.1, p. 10).
4. Select the largest parameter in this robust core, or the zero-loss fallback (Equation 9, p. 10).

Verus form: Inference: represent a finite calibration grid as a ghost `Seq` and each loss profile as a ghost `Map`; define set loss with a `spec fn` maximum. Use `proof fn`s to prove monotonicity under set inclusion and `assert` to establish each scan transition. Inference: the exchangeability theorem is not a Rust safety invariant; it requires an external probability model and independently checked statistical proof.

## technique 4: exact finite-grid robust-core tree scan

What it is. On a finite ordered grid, Algorithm 2 computes the robust-core intersection without enumerating every hidden loss curve. A frontier state stores calibration maxima `M` and an interval `[a,b]` of possible hidden maxima. Each grid point branches into an include state and, when possible, a skip state; identical states are merged. The scan returns the first point included by every frontier state, or the fallback (Section 5.2, pp. 10–11).

Steps from Algorithm 2 (p. 11):

1. Initialize the frontier with `(M = 0n, I = [0,0])` and scan grid points from most to least preferred (Algorithm 2, lines 1–3).
2. For state `(M,[a,b])`, update `M'` with the observed loss at the current grid point and compute `Θ = (n+1)α − Σi M'i` (lines 5–7).
3. Add an include successor when `a ≤ Θ`, with interval `[a,min(1,Θ)]` (lines 8–10).
4. Add a skip successor when `Θ < 1`, preserving `(M,[a,b])` (lines 11–13).
5. Deduplicate states; return the current grid point when all states include it, otherwise continue and finally return `λsafe` (lines 15–20).

The paper proves exactness in Lemma 1 (Section 5.2, pp. 10–11). It notes worst-case exponential frontier size up to `2^|Λ|`, while reporting practical efficiency because the scan terminates early and merges coincident states (Section 5.3, pp. 12–13).

Verus form: Inference: encode each frontier state as a ghost struct or `Map`, maintain a loop `invariant` stating that every state represents exactly its possible hidden-max interval, and use `decreases` on the remaining grid index. Prove transition soundness with `proof fn`s and preserve deduplication invariants. Inference: the hidden-loss intersection and exchangeability remain mathematical assumptions beyond ordinary Verus verification.

Evidence. The clipped-Gaussian experiment uses grid `λk = k/100`, `α=0.1`, noise `σ ∈ {0.20,0.10,0.05}`, calibration sizes from 100 through 3,000, and 100 Monte Carlo trials per point (Section 5.3, pp. 11–12). The robust-core selector approaches the highest population-safe grid point, while the envelope and stable-CRC baselines remain lower (p. 12). Figure 4 measures median selection time over 100 independent calibration datasets, each dataset's median over five repetitions, with 95% bootstrap intervals, for grids up to 250 (caption, p. 13). These timings are selection overhead, not proof-checking time.

## technique 5: end-to-end valid stoppage with independent data splits

What it is. The full method uses one independent labeled split `B-e` to fit roundwise e-values and another split `B-c` to calibrate `λ` with robust-core CRC. At `λ=1`, online e-BH already controls stopped FDR. Calibration selects a larger scale only when the robust-core guarantee permits it (Section 6, pp. 13–14).

Steps from the paper:

1. Fit leave-one-out e-values from `B-e` for every deployment score window (Section 6.1, p. 13).
2. Run online e-BH to obtain nested accepted sets and `τκ(λ)` (Equation 11, p. 13).
3. On each calibration run in `B-c`, compute the process loss `ℓi(λ) = max_{t≤τκ(λ)} FDP(Rt(λ))` (Section 6.2, p. 14).
4. Apply finite-grid robust-core CRC to select `λhatcore`, with `λ=0` as the no-discovery fallback (Section 6.2, p. 14).
5. Deploy the selected scale and stop at any unobserved-run stopping time up to `τκ`; Theorem 5 gives expected FDP at most `α` (Section 6.2, p. 14).

Verus form: Inference: keep the e-value/calibration pipeline outside the verified Rust module, but expose a checked configuration record containing `α`, `κ`, grid, data-split identities, and the accepted proof predicate. A Verus wrapper can `ensures` that accepted artifacts satisfy their deterministic proof-check result and that no runtime path bypasses the checker. Inference: the theorem's exchangeability and hidden-label assumptions must be documented as trusted statistical premises.

## evidence: synthetic and protein-design evaluation

The synthetic setup has 20 repetitions; each repetition uses 100 trajectories for e-value construction, 500 for calibration, and 350 held-out evaluation trajectories. Runs have 50 rounds, and online e-BH uses `κ=1` and a uniform `γt=1/T` schedule (Section 6.3, p. 15). At `α=0.10`, robust-core CRC and envelope CRC have mean stopped FDP 0.082 and 0.085, respectively, over the 350 evaluation runs per repetition (Section 6.3, p. 16).

The protein benchmark has 300 labeled trajectories for each generator, RFdiffusion and Proteina. Each trajectory has 30 feedback rounds. For each held-out trajectory, the other 299 are split into 199 e-value-construction trajectories and 100 calibration trajectories; AlphaFold 3 labels remain hidden during stopping and are used afterward for FDP (Section 7, p. 18). A proposal is successful only if AlphaFold 3 meets all four thresholds: motif RMSD ≤ 0.75 Å, scaffold Cα RMSD ≤ 1.5 Å, pTM ≥ 0.80, and mean pLDDT ≥ 85 (Section 7, p. 18; Appendix B.2, p. 29). The cheap verifier instead combines ESMFold metrics as `S = pLDDTmean + 100 pTM − 10 RMSDbb-ESM − 5 RMSDscaffold − 20 RMSDmotif` (Section 7, p. 17).

The paper reports stopped FDP curves for `α ∈ {0.05,0.10,0.15,0.20}` and `κ ∈ {1,5,10}` and says that larger `α` and `κ` return more designs while curves for different `κ` remain close (Figure 9, p. 18). It does not give a single pooled numerator/denominator in the figure text; the denominator is the held-out trajectory set for each generator and split described above.

Inference: the protein experiment demonstrates calibration against a withheld expensive oracle, but it does not validate the oracle's biological truth beyond its chosen thresholds. Inference: a Verus product analogue would need a similarly explicit expensive oracle or independent specification test; a cheap Verus compile pass alone is not evidence that all real-world behavior is correct.

## what is proved, trusted, and limited

The conclusion states, “The resulting procedure controls stopped FDR up to the κ-acceptance time while permitting arbitrary dependence within a run.” (Section 8, p. 19). Theorem 5 proves trajectory-level FDR under the paper's assumptions: exchangeable or i.i.d. labeled runs, independent construction and calibration splits, valid roundwise e-values, and the robust-core certificate (Section 6.2, p. 14). The proof covers arbitrary within-run dependence and adaptive generators. The experiments support the procedure on synthetic Gaussian-ring loops and MotifBench-derived protein scaffolding; they do not establish validity under distribution shift, adaptive trees/DAGs, or a misspecified oracle. The conclusion identifies both as open limitations (Section 8, pp. 19–20).

Trusted elements include the likelihood-ratio fitting rule, feature windows, score and loss definitions, exchangeability between historical and deployment runs, the ground-truth oracle, and numerical implementations of e-BH and CRC. The verifier is expressly a proxy whose failures can accumulate under adaptive search. Inference: threat to agent-written verified Rust is high if a Verus compile result is treated as the ground-truth label while specifications or external contracts are wrong; medium for the statistical stopping wrapper if its assumptions are audited; and low only for the deterministic obligations actually checked by Verus.

Inference: VL should reuse index-betting normalization, online e-BH, robust-core calibration, independent data splits, and explicit stopped-FDP accounting. It should not present this paper's statistical guarantees as a new proof-generation technique. A useful adaptation is to log every generated Rust candidate, Verus result, specification hash, external assumptions, and later independent behavioral test; calibrate acceptance thresholds on held-out projects and report denominators separately for generated, compiled, verifier-clean, and oracle-passing artifacts.

## techniques for the catalog

- index-betting e-values — normalize learned likelihood-ratio scores over a permuted null batch to preserve finite-sample validity
- leave-one-out score fitting — train order-invariant scores with each candidate removed before batch normalization
- online e-BH — aggregate roundwise e-values with alpha spending and control the supremum FDP under arbitrary within-run dependence
- robust-core CRC — lift a non-monotone scalar loss to monotone set loss and intersect certificates over hidden completions
- finite-grid tree scan — compute the robust core with frontier intervals, branching, and state deduplication
- split calibration — use independent e-value-construction and conformal-calibration runs
- stopped-FDR guarantee — control every stopping time up to the κ-acceptance time
- proxy-versus-oracle evaluation — measure cheap-verifier exploitation against a withheld expensive correctness oracle
- Verus adaptation — Inference: wrap checker acceptance in an audited statistical layer without treating it as a universal Rust proof

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
