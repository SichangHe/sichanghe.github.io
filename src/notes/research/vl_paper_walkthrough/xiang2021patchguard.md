# PatchGuard: A Provably Robust Defense against Adversarial Patches via Small Receptive Fields and Masking
(authored by agents unless marked 🧑)
Tag: `xiang2021patchguard`, [paper](https://www.usenix.org/conference/usenixsecurity21/presentation/xiang)

## purpose and threat model
PatchGuard certifies image classification against one contiguous adversarial patch. The attacker can arbitrarily change pixels inside an unknown region, while the defender knows an upper bound on its size. The paper states: “The attacker can arbitrarily modify pixels within a restricted region, and this region can be anywhere on the image, even over the salient object.” The defended model must recover the correct label, not merely detect an attack: “we aim to recover the correct prediction, which is harder than merely detecting an attack.”

Inference: The useful design pattern for verified systems is to bound how many observations an adversary can corrupt, then use an aggregation rule whose result remains bounded after those observations are removed.

## technique 1: small receptive fields
A convolutional feature depends on a receptive field, defined as pixels having nonzero gradient to that feature. Large fields let one patch alter many local predictions. PatchGuard instead uses CNNs whose fields are small; BagNet-17 has a 17×17 field, and DS-ResNet uses an ensemble of pixel bands. The authors explain: “A small receptive field, on the other hand, limits the number of corrupted features, and we use it as the fundamental building block of robust classifiers.”

Steps from Sections 2.4 and 3.3:
1. choose a fully convolutional model and expose its final local feature tensor (Section 2.1)
2. calculate each feature’s receptive field as the pixels with nonzero gradient (Section 2.4)
3. reduce the field using small kernels (BagNet replaces 3×3 kernels with 1×1 kernels) or an ensemble of cropped/banded inputs (Section 3.3)
4. derive the maximum feature-window width from patch bound p, receptive-field size r, and stride s: w = ceil((p+r−1)/s) (Section 3.4 and Appendix B)

Inference: A Verus implementation could represent the feature map and corruption window as sequences, prove the receptive-field overlap bound, and use that bound in the aggregation proof. The neural network would remain an assumed specification unless separately modeled.

Evidence: With a 3%-pixel patch, ResNet-50 produced incorrect global predictions on 99.9% of ImageNet, 99.1% of ImageNette, and 95.5% of CIFAR-10 (Table 2). The same experiment measured additional incorrect local predictions of 24.5%, 41.1%, and 40.0%, respectively. Section 3.1 specifies the sample: “We take 5000 random ImageNet validation images and the entire validation sets of ImageNette and CIFAR-10 for the case study.”

Assumptions and limits: the patch is contiguous and its size bound is conservative; a large receptive field can make the feature-count bound too large to be useful. At a 192×192 patch on 224×224 ImageNette, every BagNet-17 feature can be affected and the defense falls to 10% random-guess accuracy (Appendix F).

## technique 2: robust masking aggregation
For each class, PatchGuard clips local evidence, finds the sliding feature window with greatest class evidence, and masks that window before summing the remaining evidence. Algorithm 1 gives the procedure. The paper states: “We then apply a mask to the suspected region for each class so that the final classification is not influenced by the adversarial features.” The algorithm extracts and clips each class feature, detects a window, computes masked evidence, and returns the class with maximum masked evidence.

Application steps (Algorithm 1 and Section 3.4):
1. select feature type (logits, confidence, or one-hot predictions) and clipping bounds; defaults are `c_l=0`, `c_h=∞`, `T=0`
2. for every class, clip its local features
3. evaluate every sliding window and choose the one with largest summed evidence
4. normalize that sum by total evidence; if it does not exceed threshold T, use an empty mask
5. subtract the selected window from the class evidence and sum what remains
6. predict the class with largest remaining sum

Inference: A Verus implementation could define the masked sum mathematically and use loop invariants to prove that the executable sum matches that definition. A separate proof could establish the evidence bound.

Evidence: Table 4 reports clean and certified robust accuracy. On ImageNette with a 1%-pixel patch, Mask-BN is 95.2% clean and 89.0% robust; Mask-DS is 92.3% and 83.1%. On ImageNet at 1%, Mask-BN is 55.1% clean and 32.3% robust. On CIFAR-10 at 2.4%, Mask-BN is 83.9% clean and 47.3% robust; Mask-DS is 84.6% and 57.7%. These are test-set percentages in Table 4.

Failure modes: larger T lowers false positives but also lowers certification. On ImageNette against a 2%-pixel patch, Table 9 reports Mask-BN-17 robust accuracy 86.7% at T=0 (100% detection false-positive rate), 79.9% at T=.2, 68.0% at T=.4, 38.7% at T=.6, 6.2% at T=.8, and 0% at T=1. The paper therefore uses T=0 for this dataset.

## technique 3: certificate by adversary dilemma
Lemma 1 bounds a target class’s masked evidence by unaffected evidence divided by 1−T. The proof enumerates four cases: exact malicious-window detection, benign-window false detection, partial overlap, and no detection. In the last case, the threshold condition gives e ≤ tT/(1−T), hence total evidence ≤ t/(1−T). The paper states: “If the upper bound of malicious class evidence is not large enough to dominate the lower bound of the true class evidence, we can certify the robustness of our defense on a given clean image.”

Algorithm 2 checks every possible malicious window and every wrong class. With `c_l=0` and `0≤T<1`, it computes each wrong-class upper bound as `SUM(clipped_wrong*(1−w))/(1−T)`. For the true class, it first zeros the malicious window, runs detection on those remaining features, and sums evidence outside both the malicious window and the detected window. If any wrong-class bound exceeds this true-class lower bound it returns False; otherwise it returns True. This reproduces the comparison in Algorithm 2, including its treatment of equal bounds. Theorem 1 states that a True result guarantees correct prediction for every adversarial image in the threat set when the windows cover the possible corruptions as required by Equation 1.

Inference: A Verus implementation could prove the four-case bound and quantify over finite windows and classes. Its certificate should imply prediction of the true label for every allowed corruption. An integer or fixed-point implementation would also need to connect its arithmetic to the mathematical bounds and handle overflow.

Evidence: Theorem 1 is conditional on the feature extractor, clipping, threshold, and threat-model bound. Section 5.2 states: “In this subsection, we present provable robustness results for our defense (computed with Algorithm 2 and Theorem 1); the results hold for any attack within the corresponding patch size constrain.” Inference: A verified-language implementation could verify the finite aggregation and certificate checker while treating the feature extractor as an external model; the connection between its numerical computation and the mathematical proof would need separate justification.

## technique 4: provable adversarial training
Appendix A trains BagNet with a mask over the region having largest true-class evidence, mimicking Algorithm 2. On ImageNet with a 2%-pixel patch, conventional training gives 54.4% clean and 13.3% robust accuracy; provable adversarial training gives 54.6% and 26.0%. On ImageNette the pair is 93.9%/83.8% versus 95.0%/86.7%; on CIFAR-10 with a 2.4%-pixel patch, 82.6%/31.7% versus 83.9%/47.3% (Table 14). The paper cautions that it does not train DS-ResNet this way because computing all local features is too expensive.

Inference: A verified-language implementation could check certificates for the resulting model without verifying the training procedure.

## what is proved, measured, and trusted
Theorem 1 proves soundness of the evidence comparison under its stated assumptions for every patch in the contiguous-window threat model. Tables 4 and 8–14 report accuracy, false positives, feature choices, receptive fields, mask sizes, training choices, and latency. Table 13 reports per-image inference times on the ImageNette validation set: ResNet-50 11.8 ms, BagNet-17 12.1 ms, DS-25-ResNet 387.9 ms, Mask-BN 16.6 ms, Mask-DS 404.4 ms. Inference: The theorem does not establish data-label correctness or numerical-rounding safety. Appendix E discusses extensions for multiple separated patches: enclosing them in one larger region, masking individual features, or using alternative aggregation.

Section 6.1 shows that DS and clipped BagNet are special cases of the framework obtained by setting T=1 (no detection) and changing feature and clipping choices; the robust-masking theorem with its `1−T` denominator does not apply at T=1. Inference: Verified-language work could reuse the spatial corruption bound and masking proof while checking model assumptions and arithmetic soundness.

## techniques for the catalog
- small receptive fields — limit the number of local features a contiguous patch can corrupt
- robust masking — detect the highest-evidence feature window and remove it before aggregation
- evidence certificate — compare bounded wrong-class evidence with a masked lower bound for the true class
- provable adversarial training — train with the certificate’s worst-case mask to improve certified accuracy
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The trade-off between the clean accuracy and the robustness can be tuned with different receptive field sizes and should be carefully balanced when deploying the defense."): checked all paper text, quotations, numbers, references, threat model, and technique steps; corrected case-study denominators, patch dimensions, certificate steps and assumptions, table references, and unsupported Verus claims; used the publisher link printed in the paper; did not check code, reproduce experiments, independently prove the theorem, or validate the proposed Verus implementations.
