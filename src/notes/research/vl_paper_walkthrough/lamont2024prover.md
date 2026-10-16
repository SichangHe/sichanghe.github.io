# 3D-Prover: Diversity Driven Theorem Proving With Determinantal Point Processes
(authored by agents unless marked 🧑)
Tag: `lamont2024prover`, [paper](https://arxiv.org/abs/2410.11133)

## scope and result

3D-Prover filters language-model tactic candidates before executing them in Lean. It addresses two sources of wasted proof-search work: semantically equivalent tactics and tactics that fail in the prover. The authors report that “approximately 75-85% of tactics result in an execution error” on their miniF2F experiments (Section 1, PDF p. 2). Their filter learns a representation of each goal–tactic pair that predicts success, execution time, and the resulting proof state or error, then uses a determinantal point process (DPP) to select a fixed-size subset balancing quality and semantic diversity.

The method augments an existing tactic generator. It is evaluated with ReProver (about 300M parameters) and InternLM2.5-Step-Prover (7B) on miniF2F and, additionally, LeanDojo. The paper's abstract claims “an increase in the overall proof rate, as well as a significant improvement in the tactic success rate, execution time and diversity.” (Abstract, PDF p. 1.) It also says, “3D-Prover allows for a direct tradeoff between search objectives, with hyperparameters controlling the weighting of error, time and diversity in the filtering process.” (Section 1, PDF p. 2.)

Inference: the direct VeruLaw analogue is a pre-execution filter for generated Verus edits or proof hints. Verus candidates still need an actual Verus run; a learned transition model can prioritize and diversify attempts but cannot establish correctness.

## technique 1: learn transition-aware tactic representations from synthetic traces

What it is. A proof attempt yields transitions `(g, t, s, τ, o)`: goal, tactic, success status, execution time, and prover output. The output is a new subgoal, an error message, or proof success (Section 2.1, PDF p. 3). A transition model consists of an encoder `E(g,t)=e`, a predictor `P(e)=(ŝ, τ̂)` for status and time, and a decoder `D(e,g)=ô` for environment output. The authors define `ξ(g,t)=(P(E(g,t)),D(E(g,t),g))` (Equation 1, Section 2.1, PDF p. 3).

When to use it. Use this model when executing candidate tactics is expensive and previous proof attempts provide enough traces to learn which candidates are likely to fail, be slow, or duplicate another path.

How to do it.
1. Run an existing prover and record each goal–tactic transition, including status, time, and exact environment output (Section 2.1).
2. Tokenize and combine the goal and tactic, then encode them with a Transformer encoder (Section 2.2 and Figure 2, PDF p. 4).
3. Mean-pool tactic token embeddings into a unit-norm representation `e`; the combined model lets tactic tokens attend to the goal (Section 2.2).
4. Predict status with a sigmoid output, time with a real-valued output, and environment output with a Transformer decoder conditioned on `e` and `g` (Section 2.2).
5. Minimize the weighted sum `αs Ls + ατ Lτ + αo Lo`, using binary cross-entropy for status, mean squared error for time, and cross-entropy for output (Equation 2, PDF p. 4).
6. Split the synthetic transitions into train and test data, reweight status classes if errors dominate, and evaluate output with BLEU, ROUGE-L, and top-4 exact-match (Section 2.2, PDF pp. 4–5).

The reported implementation trains on 498,236 transitions from one ReProver attempt on miniF2F-valid, with a random 95%/5% train/test split, AdamW at 10^-5, batch size 1, and two epochs. Error examples are about 75% of the data, so classes are reweighted (Section 2.2, PDF p. 5).

Verus form. Inference: collect `(source revision, Verus goal/diagnostic, candidate edit, verification status, elapsed time, resulting diagnostics)` from repeated Verus runs. Encode the current verification context and candidate edit, predict whether the edit will verify and how costly it will be, and decode likely diagnostics. The Verus state may include multiple SMT obligations rather than Lean subgoals, so the serialization must preserve the exact diagnostics and source location. Inference: use predictions only to rank candidates; do not treat predicted success as a proof.

Evidence. On unseen miniF2F-valid transitions, the full COMBINED representation has output BLEU 0.33, ROUGE-L 0.39, top-4 0.32, status F1 0.88, TPR 0.85, TNR 0.97, and time MSE 0.16 (Table 1, PDF p. 5). The no-tactic baseline has BLEU 0.17, ROUGE-L 0.22, top-4 0.13, F1 0.22, TPR 0.14, TNR 0.96, and MSE 0.37. The separate tactic-only representation is weaker than the goal-aware combined representation, supporting the paper's claim that goal context helps predict transition effects.

Limits and assumptions. The training data comes from one ReProver pass and may not cover transitions the generator never proposes. The output decoder predicts text or subgoals, not a proof of that output. Metrics mix classification, regression, and text overlap; a high status F1 does not imply exact environment simulation. The paper's experiments use Lean and do not test Verus diagnostics.

## technique 2: use a k-DPP to select high-quality, diverse tactics

What it is. For each candidate tactic, the transition encoder supplies a unit diversity vector `ϕi`; a quality score `qi` combines the base model logit with predicted success and time. The filter builds `L = BᵀB`, with columns `qiϕi`, then samples a fixed-size subset with a k-DPP. The DPP probability is proportional to `det(LA)`, which rewards both large quality vectors and linearly diverse directions (Section 1.2, PDF p. 3; Figure 3, PDF p. 6).

How to do it.
1. Ask the underlying policy for N candidates for the current goal. In the main ReProver setup, N = 64 (Section 3.1, PDF p. 7).
2. Compute `ϕi = E(g, ti)` and predictions `(si, τi) = P(ϕi)` for each candidate (Algorithm 1, PDF p. 6).
3. Normalize predicted times across the candidate set and temperature-scale the base policy probabilities (Algorithm 1).
4. Set `qi = mi + λs si + λτ τi`, where `mi` is the temperature-scaled policy score and λs and λτ weight predicted success and speed (Algorithm 1).
5. Form `B=[q1ϕ1,…,qNϕN]` and `L=BᵀB` (Algorithm 1).
6. Compute the eigenvalues and eigenvectors of L and sample a size-K subset with the k-DPP procedure of Kulesza and Taskar (Algorithm 1).
7. Execute only the selected tactics in the prover, then continue the outer proof search with their resulting states (Section 3.1).

The temperature θ controls how strongly policy quality affects sampling. Higher θ flattens the policy distribution and increases the relative diversity bias (Section 3). K controls the breadth/depth tradeoff: larger K explores more branches, while smaller K permits deeper search along fewer branches (Section 3.1.1, PDF p. 8).

Verus form. Inference: generate up to N candidate Rust/specification edits, embed each edit with a learned representation of its expected Verus diagnostic transition, and use the same k-DPP selection to avoid trying equivalent edits. A quality score can include model likelihood, predicted verification success, and predicted compile/solver time. The selected edits must then be checked by Verus. Inference: candidate embeddings should be trained from actual Verus runs, because lexical diversity does not guarantee different SMT obligations or executable behavior.

Evidence. On miniF2F-test, ReProver with K = 8 reaches 24.4% pass@1 with 3D-Prover versus 22.4% Top-K and 19.0% random, a reported +8.9% relative gain; values are means over four runs, with 23.7–24.9% for 3D-Prover (Table 2, PDF p. 7). At K = 16, results are 27.3% versus 26.5% Top-K and 25.4% random (+3.0%); at K = 32, 28.2% versus 27.8% and 27.4% (+1.4%). On miniF2F-valid, a single run gives 25.0%, 29.1%, and 28.7% for K = 8, 16, and 32, compared with Top-K 21.7%, 26.6%, and 27.9% (Table 2).

For InternLM2.5 on miniF2F-test, BFS pass@1 is 45.7% with 3D-Prover K = 8 versus 44.3% Top-K, a +3.2% relative gain; pass@2 is 47.3% versus 44.9% (+5.3%). With Critic Guided search, pass@1 is 45.7% versus 43.7% no filtering (+4.6%), and pass@6 is 53.1% versus 49.0% (+8.4%) (Table 3, PDF p. 8). These are means and extrema over the runs stated in the table; the no-filtering BFS reference is 44.8% in the surrounding text.

Limits and assumptions. DPP selection does not rescue a weak base generator: it can only choose from its candidate set. The paper reports relative gains, not a universal improvement across all models or K values. It does not provide a comprehensive hyperparameter sweep; the main ReProver result uses λs = λτ = 0 and θ = 1 without tuning (Section 3.1, PDF p. 7).

## technique 3: tune the filter toward success, diversity, or speed

What it is. The λs and λτ terms alter the quality score, while θ alters the policy-versus-diversity balance. The authors evaluate separate objectives after establishing proof-rate gains: tactic success rate, unique subgoals per successful tactic, and execution time (Section 3.1.2, PDF pp. 8–10).

How to do it.
1. Choose a primary search objective and set λs, λτ, and θ accordingly (Section 3.1.2).
2. For success, increase λs so predicted success scales `qi` (Table 5).
3. For path diversity, increase θ so policy logits matter less and DPP directions matter more (Table 6).
4. For speed, increase λτ so predicted fast tactics receive larger quality scores (Table 7).
5. Measure the chosen objective on the same miniF2F-valid transitions and retain proof rate as a separate outcome (Tables 5–7).

Verus form. Inference: if solver latency or compile failures dominate, train time and status predictors from Verus runs and increase their weights. If proof search repeats equivalent obligation sets, increase the diversity temperature. Record objective-specific metrics separately because a fast candidate can be less likely to verify, and a diverse candidate can be slower.

Evidence. With no filtering, tactic success is 27.7% ± 0.2%. At K = 8, 3D-Prover gives 43.3% ± 0.1% with λs = 0.1 and 56.5% ± 0.1% with λs = 0.5; Top-K is 39.0% ± 0.1% and random is 33.4% ± 0.1% (Table 5, PDF p. 9). For successful tactics producing unique subgoals, no filtering is 67.8% ± 0.3%; at K = 8, 3D-Prover is 90.1% ± 0.1% with θ = 1 and 91.1% ± 0.1% with θ = 4 (Table 6). For execution time at K = 8, Top-K is 206 ± 0.8 ms, random 198 ± 0.9 ms, and 3D-Prover is 155 ± 0.5 ms with λτ = 0.1 and 136 ± 0.5 ms with λτ = 1.0 (Table 7). All three tables report means with standard errors over miniF2F-valid transitions; the denominator is the transition set, not the number of solved theorems.

Limits and assumptions. Optimizing a secondary metric can alter proof rate and search depth. The authors note that preferring fast tactics may avoid powerful but slow automation such as `simp`, which can expose underlying proof arguments but may also reduce immediate success (Section 3.1.2). Their reported scale is limited: InternLM is tested only to pass@2 for BFS and pass@6 for Critic Guided, ReProver to pass@4 on miniF2F-test, and LeanDojo has one run per approach (Conclusion, PDF p. 10).

## technique 4: validate semantic representations with a syntax-only ablation

What it is. Replace the transition encoder with an autoencoder trained to reconstruct the tactic text. This creates embeddings that capture syntax but not predicted environment effects. Comparing it with the transition model tests whether semantic representations, rather than generic tactic similarity, cause the improvement (Section 3.1.2, PDF p. 8).

How to do it.
1. Train the normal transition model on status, time, and output targets (Section 2).
2. Train a same-size autoencoder only to reconstruct original tactic tokens (Section 3.1.2).
3. Run identical DPP filtering and K values using each embedding source.
4. Compare pass@1 under the same miniF2F-valid setup (Table 4).

Verus form. Inference: train a syntax-only baseline that reconstructs Rust edits, then compare it with embeddings trained to predict Verus verification outcomes. If semantic embeddings outperform syntax-only embeddings under identical DPP settings, the gain is evidence that the filter models proof-state effects rather than merely edit wording.

Evidence. On miniF2F-valid, the autoencoder gives pass@1 23.0%, 27.9%, and 27.0% at K = 8, 16, and 32, while the transition model gives 25.0%, 29.1%, and 28.7% (Table 4, PDF p. 8). The authors conclude that selecting for diversity with respect to predicted semantics improves proof performance.

## what is proved, measured, and trusted

Lean executes each selected tactic and supplies the resulting state or error. The learned transition model, DPP implementation, candidate generator, search algorithm, benchmark harness, and Lean environment are experimental infrastructure. The paper measures prediction metrics, proof pass rates, tactic success, unique-subgoal frequency, and execution time. It does not prove that the learned embeddings represent all semantic distinctions or that a DPP-selected tactic is globally optimal.

Inference: in VeruLaw, the trusted acceptance boundary must remain Verus verification of the final source. A 3D-Prover-style filter can reduce wasted solver calls and increase diversity, but model-predicted success, elapsed time, or semantic distance cannot certify Rust safety or functional correctness. The specification and external-library assumptions remain part of the trusted boundary.

## threat to a product of agent-written verified Rust

Inference: the method could increase throughput and proof coverage by preventing the agent from spending its budget on duplicate or predictably failing edits. It also raises an operational risk: a filter that favors fast candidates may suppress a slow but necessary lemma, while a diversity objective may select many novel but irrelevant edits. Product evaluation should therefore report verified pass rate, solver time, duplicate-obligation rate, and missed-proof cases under fixed budgets. The paper's Lean-only, limited-run results do not establish how the tradeoff behaves for Verus or production Rust.

## techniques for the catalog

- transition trace mining — learn status, time, and environment-output effects from synthetic proof transitions
- goal-aware tactic embeddings — encode a goal and candidate tactic into a unit semantic vector
- quality prediction — estimate tactic success probability and execution time before execution
- k-DPP tactic filtering — sample a fixed-size subset whose determinant balances quality and semantic diversity
- objective weighting — tune error and time weights to select reliable or fast candidates
- temperature diversity control — flatten model scores to favor diverse proof paths
- syntax-only ablation — compare semantic transition embeddings with a tactic-reconstruction autoencoder
- proof-search evaluation — compare pass@k against no-filtering, Top-K, and random baselines with stated runs
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
