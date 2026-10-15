# Whatever Remains Must Be True: Filtering Drives Reasoning in LLMs, Shaping Diversity
(authored by agents unless marked 🧑)
Tag: `kruszewski2025whatever`, [paper](https://www.semanticscholar.org/paper/5c4fd9ac3b3afd38e0ef46f3f9c8aa842f52590a)

The paper studies how to train proof-generating language models when a verifier can label a candidate correct. Its claim is that ordinary RLVR tends toward reverse-KL, which concentrates probability on a few correct modes, while the ideal target distribution filters incorrect outputs and preserves the base model's relative probabilities among correct outputs. It introduces Distributional Matching with Verifiable Rewards (DMVR) and an `α`-divergence policy-gradient method (`α`-DPG) to control precision versus diversity.

## technique 1: define a verifier-filtered target distribution

What it is. For prompt `x`, base policy `πbase(y|x)`, and binary verifier `v(y,x)`, define `p_x(y) ∝ πbase(y|x) v(y,x)` (Eq. 8, §3, p.4). This removes every incorrect candidate while retaining the base distribution's relative weights among correct candidates. The paper says, “This distribution filters out all incorrect responses, leaving out only correct ones with the same relative probabilities as the reference LLM” (§3, p.4).

When to use it. Use this when the verifier is reliable and candidate diversity matters, such as theorem proving where a rare derivation may be needed. The construction requires nonzero verifier acceptance for normalization. It preserves only diversity already present in the base model; it cannot invent a proof absent from that distribution.

How to apply it.

1. Sample candidate proofs from the base or current policy (§2, pp.3–4)
2. Run each candidate through the Lean verifier, assigning `v=1` only when Lean accepts the proof (§4, p.6)
3. Form the unnormalized weight `P_x(y)=πbase(y|x)v(y,x)` (Appendix E, p.18)
4. Estimate `Z_x=Σ_y P_x(y)` with importance sampling; with proposal `q=πbase`, use the sample mean of verifier outputs (Appendix E, Eqs. 27–30, p.18)
5. Normalize to obtain the conceptual target `p_x=P_x/Z_x`; train an autoregressive policy to approximate it (§3, p.4)

Inference: in Verus, the verifier can be `verus` compilation plus checks for residual trusted declarations, and `p_x` can filter candidate Rust/Verus patches. This does not formalize model training in Verus; it is an engineering use of a verified reward signal. A correct Verus result still depends on the candidate's contracts and trusted external specifications.

Evidence and limits. The Lean experiments use 10,000 solvable training problems from Lean Workbook and 200 unseen test problems (§4, p.6), with Lean4/Mathlib `v4.9.0`. The paper does not report a single numeric table in the text for every model's pass@1/pass@256 point; results are plotted in Figures 1–2. Therefore claims about “state-of-the-art” refer to the plotted test-set comparison, not an independently reproduced denominator for each point.

## technique 2: understand RLVR as reverse-KL and avoid mode collapse

What it is. RLVR uses pseudo-reward `v(y,x) − β log(πθ(y|x)/πbase(y|x))` (Eq. 2, §2, p.3). The paper defines a softened target `p_{x,β}(y) ∝ πbase(y|x) exp(v(y,x)/β)` and proves that the RLVR gradient is proportional to minimizing `D_KL(πθ || p_{x,β})` (Lemma 1, Eqs. 9–10, §3.1, pp.4–5). As `β→0+`, `p_{x,β}` converges in total variation to the verifier-filtered target (Lemma 2 and Appendix C, Eqs. 11 and 19, pp.4, 17).

When to use it. Use this analysis to diagnose why a proof model becomes accurate at one-sample pass rate but loses useful alternatives at larger sampling budgets. It is a training-objective diagnosis, not a proof of any particular model's correctness.

How to apply it.

1. Keep a binary proof verifier and a frozen base policy (§2, p.3)
2. Choose the KL penalty `β`; `β=0` reduces to REINFORCE (§2, p.3)
3. Track both pass@1 and pass@k; the paper defines pass@k as `1 − ((n−c choose k)/(n choose k))` for `n` samples with `c` correct (Eq. in §4, p.6)
4. If pass@1 rises while pass@256 falls, treat this as mode concentration and adjust the divergence or sampling strategy

Inference: for Verus proof agents, measure one-patch correctness and multi-sample coverage separately. A verifier reward can improve the first while harming discovery of diverse proof repairs. This follows the paper's metric logic but is not a Verus experiment.

Evidence. The paper reports that no single method dominates all `k` values in Figure 2 (§4.1, p.7). It says, “there is no single model that dominates all others across all values of k indicating a Pareto trade-off between precision (pass@1) and coverage (pass@256)” (§4.1, p.7). Difficulty transitions in Figure 3 classify easy as at least 80% correct, medium as 20–80%, and hard as below 20% over sampled sequences (§4.1, p.8). The transition matrices show that high-α training and GRPO make many medium problems easy but also make some hard problems unsolved; α=0.25 is more conservative (§4.1, p.8).

## technique 3: train with α-DPG and clipped pseudo-rewards

What it is. `α`-DPG minimizes an `f`-divergence between policy and filtered target. The α family interpolates from Forward KL (α→0, mass-covering) to Reverse KL (α→1, mode-seeking), with squared Hellinger at α=0.5 (§3.2, p.5). The pseudo-reward is given in Eq. 12; to control variance, the implementation clips the parenthetical factor to `M` and uses the rescaled reward in Eq. 13 (§3.2, p.5). The baseline is the leave-one-out per-context average (§3.2, p.5).

How to apply it.

1. Set α according to the desired precision/coverage point (§3.2, p.5)
2. Estimate `p_x/πθ` from verifier-weighted samples and the partition-function estimate (Appendix E, p.18)
3. Compute the clipped pseudo-reward with `M=10` in the reported experiments (§4, p.6)
4. Subtract the leave-one-out baseline and apply the score-function gradient (Eq. 7 and §3.2, pp.4–5)
5. Evaluate pass@1 and pass@256 and choose a Pareto point rather than optimizing only one metric (§4.1, p.7)

Inference: a Verus-oriented implementation can use α as a configurable training policy over candidate verified Rust proofs. The Verus verifier remains the reward oracle; no α-DPG construct exists in Verus itself. Keep candidate traces and verifier outputs so training cannot silently treat compilation failures as successes.

Evidence and denominators. Training uses one node with 4 A100 GPUs and 28 CPUs for proof assessment; each method uses 512 responses per step for 200 iterations (about three epochs), max response length 1,024, temperature 1, and nucleus `p=0.99` (§4, p.6). For α-DPG, the reported settings are `M=10`, float16, and lower bound `Z_x ≥ 10^-4` (§4, p.6). The partition-function ablation compares online estimation from 4 samples with offline estimation from 128 base-model samples and reports no clear advantage for precomputation (Appendix E.1, p.18). These are setup denominators and hyperparameters, not proof-success percentages.

The qualitative result is that low α (for example 0.25) gives the highest plotted coverage while improving precision over SFT, and high α (at least 0.995) reaches RL-like precision while usually retaining higher coverage (§4.1, p.7). The paper's abstract claims that α-DPG “achieves state-of-the-art performance along the coverage–precision Pareto frontier, outperforming all prior methods on the coverage axis” (Abstract, p.1). Exact point values must be read from the plotted curves; the text does not supply a complete numeric table.

## technique 4: measure proof diversity by tactics and premises

What it is. For each problem, generate 256 proof sequences and count tactic and premise choices at every proof state. Compute Simpson diversity `1 − Σ p_i²` and Shannon entropy `−Σ p_i ln p_i`, then aggregate across problems (§4.1, p.8). A tactic is a command such as `intro`, `apply`, or `rw`; a premise is a lemma such as `mul_comm` or `mul_assoc` (§4.1, p.8).

Use it by logging proof traces, counting choices under each model, and reporting diversity beside pass@1/pass@256. The paper reports that greater tactic/premise diversity generally correlates with higher pass@256 and anticorrelates with pass@1 (§4.1, p.8). It also samples 16 solutions for one test problem and computes self-perplexity and base-model perplexity; GRPO produced 16 identical sequences for that problem (§4.1, p.9).

Inference: for Verus, analogous diversity units are lemma selections, invariant shapes, solver settings, and contract decompositions. Diversity should be computed only over semantically valid candidate proofs; syntactic variety in rejected Rust is not useful coverage.

## trust, contradictions, and product implications

The verifier is Lean's kernel plus the theorem statement and Mathlib version. The training code, model, reward extraction (last Lean code block), partition-function estimate, and base model remain trusted. Appendix A says LLMs assisted with code, debugging, mathematical statements, proofreading, and the illustration, while the authors take responsibility (Appendix A, p.16). Inference: this creates a direct threat to agent-written verified Rust only if VL confuses verifier acceptance with requirement correctness or drops candidate diversity; the paper does not establish that α-DPG improves Verus.

The paper's theoretical result is conditional: the filtered distribution preserves diversity already in `πbase`, and α-DPG approximates it within a restricted autoregressive family. It does not show that training discovers novel proofs. The authors explicitly say, “The true source of diversity loss, therefore, lies not in the target distribution itself, but in the divergence used to approximate it with gradient descent within a restricted parametric family” (§6, p.10). Inference: VL should retain a diverse candidate pool and use verifier-backed selection, then test whether accepted Rust proofs cover distinct repair strategies.

What VL should not redo: the paper already derives the RLVR/reverse-KL correspondence, the verifier-filtered target, α-divergence interpolation, pass@k evaluation, and tactic/premise entropy analysis. A useful new study would port these measurements to Verus, report exact proof and repair denominators, and test whether candidate diversity survives Rust ownership and solver constraints.

## techniques for the catalog

- verifier-filtered target — zero-weight incorrect proofs while preserving base probabilities among correct proofs
- RLVR reverse-KL diagnosis — identify mode-seeking concentration by relating KL-control gradients to a softened filtered target
- α-DPG interpolation — tune a clipped f-divergence between mass-covering and mode-seeking behavior
- online partition estimate — estimate verifier acceptance with sampled importance weights and a lower-bounded `Z`
- pass@k frontier — report single-sample precision and multi-sample coverage together
- proof-trace diversity — measure Shannon and Simpson diversity over tactics and premises

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
