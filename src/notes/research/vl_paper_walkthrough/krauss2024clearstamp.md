# ClearStamp: A Human-Visible and Robust Model-Ownership Proof based on Transposed Model Training
(authored by agents unless marked 🧑)
Tag: `krauss2024clearstamp`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/krauss-clearstamp)

## scope and result

ClearStamp is a model-ownership proof for a neural network. Inference: it is a security mechanism rather than a proof of Rust program behavior. The owner embeds one or more visible secret images in a model, later extracts them with secret keys, and lets a person inspect the result. The paper's central claim is that embedding and the model's useful task are entangled: removing the watermark damages useful accuracy. The authors state, “This paper introduces ClearStamp, the first DNN watermarking method designed for intuitive human assessment.” (Abstract, p. 5269.) They report experiments on MNIST, CIFAR-10, GTSRB and CIFAR-100 with CNN, ResNet-18, ResNet-34, ViT and VGG11 architectures (Introduction, p. 5270).

Inference: for VeruLaw, this is an example of a claim about an artifact's provenance and tamper evidence, not a replacement for a Verus functional contract. A Verus proof could make the extraction and comparison code memory-safe and contract-correct, while the learned model, training process and visual judgement remain trusted inputs.

## technique 1: reverse a model into a transposed watermark path

What it is and when to use it. A transposed model reverses the original model's layer order and operation as far as possible. It maps a normal output-like key to an input-like image secret. Use it when a model owner wants a white-box, multi-bit watermark that a person can recognize.

How the paper does it. Section 4.2 (p. 5274), referring to Section 2 (p. 5271), gives these construction rules: for a linear layer written as `y = x · wᵀ + b`, compute `(y − b) · w`; approximate batch-normalization reversal using fixed mean zero and variance one; transpose pooling with nearest-neighbor interpolation; transpose convolutions with deconvolutions, retaining settings such as kernel size and stride while potentially adjusting padding; keep dropout and activations in their ordinary form; and handle skip connections by freezing one branch and solving for the other. For a skip connection, the authors write, “To transpose the skip connection, we freeze one part of the connection, such as b, during transposed training.” The frozen value becomes part of the key. The branches share layer parameters (Section 4.1, p. 5273). Footnote 5 (p. 5274) states, “Please note that the transposed model can be generated solely from the weights of the original model and does not require any additional parameters.”

Verus form. Inference: represent the supported tensor operation as executable Rust functions, with `spec fn` definitions for matrix and shape relations and `requires`/`ensures` contracts for each transposed operation. Prove the implemented linear transformation with a `proof fn`; model dimensions and frozen skip-branch values can be ghost state. The paper calls `(y − b) · w` an accurate reversal, but substitution gives `x · wᵀ · w`, which equals `x` only under additional conditions. A general inverse claim is therefore unsupported. A deconvolution contract would cover the implemented discrete indexing and padding model. The paper does not provide a Rust or Verus encoding, and ReLU and lossy pooling are not mathematical inverses, so a Verus proof can establish the chosen approximation's contract but cannot recover information discarded by the forward network.

Evidence and limits. The authors evaluate several model families and say the watermark is “model and dataset-agnostic” (Abstract, p. 5269), across the listed four datasets and seven architectures. Inference: these experiments do not establish a theorem for arbitrary networks. Skip connections require an estimate for the frozen branch: the authors first train an unwatermarked model for a few epochs (Section 4.2, p. 5274). Batch normalization loses information in the transposed path; in the small-model experiment its fine-tuned SSIM is 0.85 (Section 5.3, p. 5277).

## technique 2: watermark hardening followed by constraint training

What it is and when to use it. ClearStamp treats the watermark as a constraint after first overfitting the reverse path. This is the training procedure to use when the main task must retain accuracy while the watermark survives later model changes.

Steps from Sections 4.1 and 4.4 (pp. 5273–5275):

1. Construct the shared transposed model and choose key-secret pairs.
2. In “watermark hardening,” train only the transposed path until the secret is reproduced. The paper suggests a structural similarity index (SSIM) above 0.95 and combines that threshold with a maximum of 10,000 epochs (footnote 3, p. 5273); Section 5.1 (p. 5276) instead describes optimizer updates as hardening steps and Table 2 reports those steps.
3. In “constraint training,” alternate optimization of the ordinary forward loss and the transposed loss. The transposed loss combines SSIM and mean squared error (Section 4.3, p. 5275; Section 5.1, p. 5276).
4. Distribute the model. A third party may fine-tune or prune it.
5. Feed each key through transposed inference, compare the output with its secret, and decide by human inspection or an assisting machine (Section 4.1, pp. 5273–5274).

The paper describes the rationale precisely: “After overfitting the transposed model to the watermark in the watermark hardening phase (step 1 of Fig. 2), the watermarking task can be considered as a constraint to the main task in step 2 in Fig. 2.” Sequential optimization avoids choosing a weighted-sum loss; the authors note that weighted sums require tuning when loss scales differ (Section 7.4, p. 5286).

Verus form. Inference: a Verus wrapper can state a desired training-step contract such as preserving `watermark_quality >= target` while bounding a main-task loss; proving it would require additional mathematical assumptions or checked conditions that this paper does not supply. It can also specify deterministic key lookup and image comparison. This study supplies no proof of gradient-descent convergence, SSIM's perceptual meaning, or legal sufficiency. The neural weights and optimizer are external state; they would be trusted or checked by separate numeric models.

Evidence and limits. On MNIST with the stated CNN and five epochs, Table 2 (p. 5276) reports 10.22% untrained accuracy, 7,000 hardening steps at SSIM 0.95, then 88.37% accuracy and SSIM 0.95 after constraint training for one key. With eleven keys, the corresponding values are 89.10% and 0.91. The table caption says these experiments use a CNN, learning rate 0.001 and five epochs; the surrounding default-setup text says 0.0001, so the paper itself presents inconsistent learning-rate descriptions. Inference: this discrepancy must be resolved before reproducing the result.

## technique 3: entangle many key-secret pairs and distribute them through dropout

What it is and when to use it. Multiple keys increase capacity and make a watermark harder to erase. Dropout in the transposed path forces information into many parameters rather than allowing a small subset to memorize the secret.

Steps from Sections 4.2–4.3 (pp. 5274–5275): choose random key vectors in a range overlapping ordinary forward outputs (the experiments use −10 to 10); make secrets input-shaped images with text or other content in the normal input range; for architectures lacking inherent dropout, insert dropout after each convolutional and linear layer except the final transposed output; train all key-secret pairs as one batch; first harden the watermark, then alternate forward and transposed optimization during constraint training. The paper says, “This method compels the model to grasp the underlying structure of the secrets and integrate the watermark throughout all layers.”

Verus form. Inference: model each key-secret pair as an element of a ghost sequence and specify that training handles every element. Prove sequence bounds, deterministic key generation for a fixed seed, and that dropout masks are applied only in the proof's training model. Runtime Rust would not execute proof-only ghost state; the learned parameter-distribution claim remains empirical.

Evidence and limits. Table 2 (p. 5276) reports ten keys at hardening SSIM 0.93 after 10,000 steps, followed by constraint-training accuracy 87.69% and SSIM 0.91. Eleven keys give hardening SSIM 0.92 after 10,000 steps, followed by accuracy 89.10% and SSIM 0.91. Appendix 7.3 (p. 5285) reports similar image quality for 20 keys but gives no numerical SSIM for that experiment. Keys whose value range is separated from normal outputs weaken entanglement; the authors therefore require overlap. Dropout raises hardening time as its rate increases (Section 4.2, p. 5274).

## technique 4: test robustness by preserving useful accuracy

What it is and when to use it. Inference: the security test should ask whether a watermark remains human-visible while an attacker keeps the model useful, rather than treating one SSIM cutoff as the whole decision. Apply fine-tuning, pruning, cross-dataset changes, and adaptive erasure, then inspect both task accuracy and extracted images.

The paper's steps are: establish a default watermarked model; fine-tune for two and then four epochs at the original or one-tenth learning rate, including unseen test data; prune parameters at increasing percentages; optionally fine-prune after fine-tuning; and attempt adaptive erasure using an existing or random key (Sections 5.2–5.4, pp. 5276–5279 and Appendix 7.3, pp. 5285–5286).

Evidence. Table 3 (p. 5277) reports eleven-key MNIST results: same-rate fine-tuning gives 88.64% accuracy and 0.90 SSIM after two epochs, then 87.42% and 0.88 after four; one-tenth-rate fine-tuning gives 88.56% and 0.92, then 89.86% and 0.93; unseen-data fine-tuning gives 96.31% and 0.92, then 97.02% and 0.92. For pruning, Section 5.2 (p. 5277) reports 78.56% accuracy and 0.69 SSIM at 60% pruning, 50.1% and 0.47 at 80%, and 26.76% at 90% pruning, where the watermark cannot be clearly identified. Appendix 7.3 (p. 5286) reports an adaptive existing-key attack reducing accuracy from 89.10% to 76.32% while SSIM falls to 0.02 after six update steps; a random-key attack reduces accuracy to 74.81% with SSIM 0.04 after four steps.

The authors explain the adaptive attack result: “However, the entangled parameters force the adversary to sacrifice main task accuracy.” (Appendix 7.3, p. 5285.) Inference: this is evidence only for the tested architectures, attacks and training budgets. An attacker with a different objective, architecture-specific exploit, or access to retraining data could fall outside the study. Human recognition is also a trust boundary: the authors explicitly caution that low SSIM can still leave recognizable images (Section 5.1, p. 5275).

## what is proved, measured, and trusted

The paper measures image similarity, classification accuracy, pruning/fine-tuning behavior, capacity and qualitative visibility. It does not provide a formal proof of ownership, a cryptographic soundness theorem, or a proof that an extracted image has one unique owner. Inference: the assessment relies on PyTorch, GPU execution, optimizer arithmetic, the model architecture, secret-key confidentiality, the ground-truth secret, and the human evaluator. A product using agent-written verified Rust would face threat from incorrect tensor kernels, accidental key disclosure, data-dependent training failures, and a false legal conclusion drawn from a visually plausible output. Verus can reduce implementation bugs in the extraction and audit pipeline, but it does not certify the learned weights or ownership claim.

Section 5.5 (pp. 5279–5280) measures capacity by encoding bits as black or white patches, thresholding extracted channel values at 0.53, and decoding each patch by pixel majority. The authors embed an 8,544-bit license in ResNet-18 using 100-bit images; (7,4) Hamming encoding expands it to 14,952 bits. After fine-tuning they report bit error rate (BER) 6.46% without error correction and 4.45% with it. Inference: the 4.45% figure concerns the error-corrected experiment and does not demonstrate exact recovery.

## what VL should not redo

The paper already supplies a concrete reverse-training construction, multi-key capacity experiment, four-dataset/seven-architecture evaluation, and adaptive-erasure experiment. Inference: VL should not repeat those as if they establish general formal verification. A useful new direction would be to specify and verify the small deterministic extraction, key management, and evidence-recording layer, then test whether the recorded evidence remains valid across model serialization and dependency upgrades.

## techniques for the catalog

- transposed model generation: reverse supported layers, share weights, and freeze one branch of a skip connection when inversion is ambiguous
- watermark hardening and constraint training: overfit the reverse path, then alternate forward and reverse losses so useful accuracy and the watermark are jointly retained
- multi-key entanglement with dropout: batch many key-secret pairs and distribute them through the model to raise capacity and erase resistance
- accuracy-coupled robustness testing: evaluate fine-tuning, pruning and adaptive erasure while recording both task accuracy and extracted-secret visibility
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "During these experiments, we use fine-tuning with 1/10 of the original learning rate as the default model modification approach."): checked all paper text, quotations, numbers, section and printed-page references, and technique steps against the study; corrected the publisher link, transposition and dropout descriptions, training sequence, references, numerical reporting, and unsupported inverse claim; added capacity details and distinguished Verus inferences; did not reproduce experiments, inspect source code, or verify Rust/Verus proposals.
