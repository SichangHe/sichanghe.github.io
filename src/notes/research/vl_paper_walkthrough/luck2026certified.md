# Certified in Theory, Broken in Practice: Assumption Gaps in Cryptographic Model Certification
(authored by agents unless marked 🧑)
Tag: `luck2026certified`, [paper](https://www.usenix.org/conference/usenixsecurity26/presentation/luck)

## claim and threat model

This paper studies cryptographic model certification (CMC): a model provider proves accuracy, fairness, or differential privacy of a private ML model to an auditor using commitments and zero-knowledge proofs, without revealing the model or training data. Its central claim is that zero-knowledge soundness on a fixed audit set does not imply the property on fresh data from the same distribution. The abstract reports that "an attacker can certify that a model achieves over 99% accuracy on an audit dataset, but less than 30% accuracy on fresh samples from the same distribution" (p. 6007).

The adversary is a malicious model provider (prover); the auditor (verifier) is honest-but-curious. The provider "may submit arbitrary model parameters, and arbitrary data to the protocols requested by the auditor", and in some scenarios "can gain access to some or all of the auditor's data (mimicking many real-world scenarios where audit data is reused) prior to the audit" (Section 2, p. 6009). Model and training data are hidden from the auditor. The paper contrasts this with data poisoning: a CMC adversary can corrupt all training data and even set model parameters directly, so it "is strictly stronger than the adversary typically considered in traditional poisoning" (Section 2, p. 6009).

The gap is stated formally: prior CMC certifies `f(h, Strain, Saudit) = 1`, which does not imply `F(h, Strain) = 1 ⇔ Pr_{Stest←D}[f(h, Strain, Stest) = 1] > p` (Section 4, p. 6012). Inference: a proof that a predicate holds on supplied inputs is only as strong as the sampling and binding assumptions connecting those inputs to deployment.

## technique: data forging against fixed audits

Use this threat model to test whether an audit protocol's statement is tied to a dataset the provider has seen. In the attack game (Definition 3, p. 6013), the provider receives `Saudit`, then outputs a hypothesis and training set that pass `f` on `Saudit` but fail `F` and satisfy the provider's own utility predicate `L`.

For accuracy, Algorithm 1 takes `Saudit`, dimension `d`, and `ε > 0`. It initializes `Strain'` with the audit points and their true labels. For each audit point `r` and feature `i`, it adds `(r + ε b_i, 0)` and `(r − ε b_i, 0)`, where `b_i` is the one-hot vector in dimension `i`; time complexity is `O(|Saudit| d)`. A decision tree is then trained on `Strain'` "until leaves are homogeneous" (Section 4.1, p. 6013). Theorem 1: the tree `T` satisfies, for every `x`, "T (x) = 1 only if ||x − r||∞ < ε for some r ∈ Saudit" (p. 6013; proof in Appendix B). Thus the tree is perfectly accurate on the audit set yet predicts zero outside an `ε`-neighborhood of the audit points (p. 6014).

For fairness, Algorithm 2 gives each audit point a random label, then adds the `±ε b_i` neighbors labeled with the point's sensitive attribute `r[k]`. The model appears "completely fair" on the audit set but outside it labels points by sensitive attribute, "which results in maximally unfair decisions" (Section 4.1, p. 6014). For differential privacy, Algorithm 3 adds `n − 1` copies of each target point to the training set before it is fed to a proof of DP-SGD training such as Confidential-DPproof; this "breaks the sensitivity assumptions that differentially private stochastic gradient descent relies upon" and needs no audit-data knowledge (Section 4.1, p. 6014).

Statistical tests are not a reliable fix. Adding more copies of the audit data to the training data makes the two appear drawn from one distribution without weakening Algorithm 1; Corollary 1 states that Algorithm 1 can construct `Strain'` that, for any feature, passes Welch's t-test against `Saudit` at significance level `α` (Section 4.2, p. 6015; proof deferred to the full version).

Evaluation (Section 7, p. 6018). Six fairness benchmark datasets: ACSEmployment, Adult, COMPAS, German Credit, Default Credit, Communities & Crime. Implementation: a modified attack in Python 3.12.3 with SciKit-Learn 1.6.1. Each run splits a dataset into a 30% evaluation set, a 1000-point audit set (500 for German Credit), and an initial training set. An attack parameter `p ∈ [0, 1]` interpolates from fully honest to fully malicious. The accuracy experiments label the forged neighbors `1 − r_y` rather than 0. Extra audit copies were added to pass Welch's t-test at significance 0.05. Accuracy attacks ran on all six datasets and fairness attacks (sex as sensitive attribute) on three, reaching "close to 0 fairness gap on the audit dataset, but close to 1 fairness gap when deployed". Figures 3–4 report averages over ten runs with one-standard-deviation error bars (p. 6019). A neural-network variant reached 69.83% held-out accuracy versus 88.82% audit accuracy on ACS Employment over 10 runs (Appendix D.2, p. 6026). Inference: the text does not say which experiment produced the abstract's 99%/under-30% example.

Verus form. Inference: a Verus model can prove the decision-tree forging theorem as a property of the constructed dataset, with `requires` for finite feature vectors and `ensures` that positive leaves imply an audit-neighborhood bound. It cannot prove that a deployment distribution is independent of the training set without an explicit sampling model. Inference: the right contract must quantify over a distribution or require independently sampled inputs; a fixed `Vec` predicate is insufficient.

## technique: secure commit-sample-prove CMC template

Use this when a model provider must prove a property of a private model while preventing it from adapting the model to the audit sample. The protocol is `Πcsp = (Commit, Prove, Audit)` (Section 5.2, pp. 6015–6016).

1. Prove computes `com = Commit(h; ρ)` with uniformly random `ρ` and sends `com` to Audit
2. Audit samples `Saudit ~ D^n` and sends it to Prove
3. Prove and Audit run a ZK proof with statement `x = (com, Saudit)` and witness `w = (h, ρ)` for the relation `f(h, Saudit) = 1 ∧ com = Commit(h; ρ)`
4. Prove outputs `com`; Audit outputs the bit `b`

The paper's stated takeaway: "Sampling Saudit after h is committed ensures independence, rendering our earlier attack ineffective" (Section 5.2, p. 6016). The template does not assume the empirical predicate equals the distributional property; it requires, for every model, a false-negative bound `pfnr` with respect to `F` and a false-positive bound `pfpr` with respect to a relaxed predicate `F̃`. Theorem 2: under these bounds, if Commit and ZKP satisfy standard security properties, "the protocol Πcsp is complete with error probability pfnr , binding, zero knowledge, and F̃-relaxed knowledge sound with error probability ≈ pfpr" (Section 5.2, p. 6016; formal proof in the full version).

For accuracy (Section 5.3, p. 6016): empirical error `ℓ̂_S(h)`, true error `ℓ(h)`; `f(h, Saudit) = 1` iff `ℓ̂_S(h) ≤ t + δ`; `F(h) = 1` iff `ℓ(h) ≤ t`; `F̃(h) = 1` iff `ℓ(h) ≤ t + 2δ`. A standard concentration bound gives both `pfnr` and `pfpr` at most `2e^(−2nδ²)`. Choosing `(n, δ) = (10k, 0.02)` or `(40k, 0.01)` makes both rates ≤ 0.001 (p. 6017).

Verus form. Inference: verify a commitment-opening relation and the empirical predicate in Rust; use `requires` to state that the sample is independently drawn and `ensures` that acceptance implies the relaxed property under a separately supplied concentration lemma. Inference: Verus cannot prove random sampling quality, commitment hiding/binding, or ZK soundness unless those primitives have trusted specifications. The proof should expose the relaxed error `2δ` rather than claim exact distributional correctness.

## what the evidence establishes and leaves trusted

The formal results are Theorem 1 (decision-tree forging; proof in Appendix B) and Theorem 2 (template security; proof only in the full version). The empirical evidence covers decision trees on six datasets (accuracy) and three (fairness), plus preliminary XGBoost and neural-network experiments (Section 7, p. 6018; Appendix D). The conclusion says the paper gives "rigorous formal proofs that our attacks are effective on decision trees, and preliminary evidence that a similar approach generalizes to neural networks", and that "Characterizing a formal relationship between neural network model capacity and attack effectiveness could be a promising direction in future work" (Section 8, p. 6019).

The case study covers nine recent papers "published at top venues in both security and machine learning" and finds "six of these works are at least partially vulnerable" (Section 1, p. 6008; Table 1). This denominator is nine papers, not all CMC literature. The paper says prior constructions are not technically incorrect; rather, "the guarantees they provide may not align with the guarantees required in realistic auditing scenarios" (Section 8, p. 6019). It also names the template's practical cost: auditors "must either regularly gather fresh data ..., use additional cryptographic techniques such as secure multiparty computation to keep data hidden during the audit, or perform continuous auditing on user data" (Section 8, p. 6019). The DP-training attack has no countermeasure in the paper (Section 6.2, p. 6018; Section 8, p. 6019).

## techniques for the catalog

- data-forging attack: engineer training points around an audit set so a model passes fixed tests and fails away from them
- commit-sample-prove: commit the model before the auditor samples fresh data, then prove an empirical predicate in zero knowledge
- relaxed distributional soundness: separate empirical thresholds from true properties with explicit false-positive and false-negative bounds
- statistical-test evasion: add copies of audit points so training and audit features pass distribution tests such as Welch's t-test
- continuous deployment auditing: repeat audits on fresh user data when one pre-deployment sample cannot represent deployment
