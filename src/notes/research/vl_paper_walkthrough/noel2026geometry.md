# Geometry of Reason: Spectral Signatures of Valid Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `noel2026geometry`, [paper](http://arxiv.org/abs/2601.00791v2)

## what is measured

Noël tests whether transformer internal attention can classify mathematically valid reasoning without a learned verifier. The paper treats each attention matrix as a weighted token graph, computes graph-Laplacian spectra and four diagnostics, then applies one threshold. The abstract reports “85–96% single-threshold classification accuracy” and effect sizes “up to Cohen’s d = 3.30 (p < 10−116)” (Abstract, p. 1). This is a classifier of reasoning validity, not a proof of a theorem and not a replacement for Lean or Verus checking.

## technique 1: turn attention into a spectral graph

Use this when a model generates proofs or code and you need a training-free signal for ranking candidate outputs before expensive formal checking.

1. Run a transformer on a token sequence of length `N`. For each layer `ℓ` and head `h`, collect the post-softmax attention matrix `A^(ℓ,h)` (Section 3.1, p. 3).
2. Symmetrize each directed matrix: `W^(ℓ,h)=(A^(ℓ,h)+(A^(ℓ,h))^T)/2` (Equation 1, Section 3.1, p. 3).
3. Aggregate heads using attention-mass weights `α_h`, or use uniform weights as the paper's robustness check (Equation 2, p. 3).
4. Form the combinatorial Laplacian `L=D-W`, eigendecompose it, and retain eigenvalues and eigenvectors (Equation 3, p. 3).
5. Project hidden states `X^(ℓ)` onto the eigenbasis with the graph Fourier transform `X̂=(U^(ℓ))^T X^(ℓ)` (Equation 4, p. 3).

Verus form (Inference): this is an off-line ranking service around a Verus generator. Store token scores and candidate metadata in ordinary Rust; no Verus proof can establish that a neural attention matrix reflects logical validity. The verified boundary should be the final Verus compilation and specification proof, with this signal used only to choose search order.

## technique 2: compute four diagnostics

For every layer, calculate:

- Dirichlet energy `E=Tr(X^T L X)=Σ_{i<j} W_ij ||X_i-X_j||²`, where low energy means connected tokens have similar representations (Definition 3.1, p. 4).
- high-frequency energy ratio (HFER), the fraction of Fourier energy above the median eigenvalue index (Definition 3.2, p. 4). Lower HFER means concentration in smooth, low-frequency modes.
- spectral entropy `SE=-Σ p_m log p_m`, where `p_m` is the fraction of energy in mode `m` (Definition 3.3, p. 4).
- Fiedler value `λ₂`, the second-smallest Laplacian eigenvalue, which measures global graph connectivity (Definition 3.4, p. 4).

The method is explicitly training-free: “No parameters are trained.” (Figure 2, p. 4)

The paper also defines normalized smoothness `1-E/E_max` (Definition 3.5, p. 4). A higher value means smoother signals. Eigendecomposition costs `O(N³)` with standard algorithms or `O(N²k)` for the `k` smallest eigenvalues (Section 3.3, p. 4).

Inference: for Verus proof search, HFER or smoothness can rank generated proof candidates, but a candidate must still pass `verus` and its postconditions. The diagnostics do not prove memory safety, ownership, or functional correctness.

## technique 3: single-threshold validity classification

1. Extract attention and hidden states for a proof text.
2. Compute the diagnostics at each layer.
3. Select a metric and layer and calibrate one threshold `τ` on held-out examples.
4. Classify with `ŷ=1[Metric^(ℓ*) ≷ τ]` (Section 3.4, p. 4).

The authors use two protocols. Their dataset starts with 454 MiniF2F theorem-proof pairs, 154 human-valid and 300 model-invalid. After correcting labels for technically rejected but logically valid proofs, each model has approximately 187–205 valid and 249–267 invalid examples, a roughly 43%/57% split (Section 4.1, p. 5). Seven models from four families are evaluated. Nested 5-fold outer/4-fold inner cross-validation gives 82.8–85.9% accuracy across models; calibrated full-distribution accuracy is 89–95% (Sections 4.1 and 4.3, pp. 5–6). The paper explicitly says “Calibrated accuracy (89–95%) represents achievable performance when thresholds are tuned on the target distribution” (Section 4.3, p. 5), and calibrated accuracy assumes about 50 labeled examples, whereas nested CV measures no target-distribution access (Section 4.3, p. 5).

For multiple testing, 156 of 160 hypotheses (97.5%) remain significant after Benjamini–Hochberg correction for Llama-3.1-8B (Section 4.1, p. 5). The denominator is 160 metric-layer hypotheses, not 160 proofs.

Verus form (Inference): implement threshold selection outside verified code. A Rust orchestrator can sort candidates by a floating-point score, then invoke Verus on the top candidates. If reproducibility matters, record model name, layer, threshold, and calibration set as input data and prove only deterministic bookkeeping properties.

## technique 4: distinguish logical validity from compiler acceptance

The paper's control tests are designed to remove authorship and style confounds. It compares 16 model-generated proofs that are semantically correct but rejected for technical failures against 16 model-generated proofs with genuine logical errors (Section 4.2, p. 5). A second control creates 40 perturbed variants of human-valid proofs by deleting steps or substituting incorrect lemmas; on Llama-3.2-1B, final-layer HFER rises from 0.331 for valid proofs to 0.378 for perturbed proofs, with `p=1.93×10⁻9` and `d=1.10` (Section 4.2, p. 5). The abstract reports a manual audit of 51 reclaimed proofs with `κ=0.82` (Abstract, p. 1), but the text does not give a larger denominator for every model, so those figures must not be pooled.

Inference: this distinction is useful for Verus agents because a failed verification run can reflect a missing lemma, timeout, or environment issue. Spectral ranking could prioritize candidates that look logically coherent, while the Verus result remains authoritative.

## evidence, trust, and limits

Facts established by the reported experiments: seven models, four architectural families, 16× parameter range, nested-CV accuracy 82.8–85.9%, calibrated accuracy 89–95%, and effect sizes as high as `d=3.30` (Sections 4.1–4.3, pp. 5–6). The study has no Verus or Rust experiment. It assumes access to model internals and attention matrices; it uses MiniF2F, so the denominator is theorem-proof pairs rather than deployed programs. Sliding-window attention changes the selected feature from HFER to smoothness, with `d=2.09` and `p<10⁻48` (Abstract, p. 1), showing architecture dependence. The paper reports no evidence that a spectral score catches all semantic errors, and compiler rejection can be caused by technical failures.

Inference: threat to VeruLaw is low to medium. The method may reduce proof-search cost, but it cannot certify agent-written Rust and could rank a confidently wrong candidate highly. VL should test it only as a best-of-k ordering heuristic and measure verified-proof yield, timeout rate, and false-negative rate against an always-verify baseline.

## techniques for the catalog

- attention graph construction: symmetrize and aggregate transformer attention into a token graph
- spectral diagnostics: use Laplacian eigenvalues, HFER, entropy, energy, and smoothness as training-free features
- threshold validity classifier: calibrate one held-out threshold and report nested cross-validation separately
- logical-validity controls: compare technically rejected valid proofs and deliberately corrupted proofs to test what the signal tracks
Checked 2026-10-15 against paper noel2026geometry: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
