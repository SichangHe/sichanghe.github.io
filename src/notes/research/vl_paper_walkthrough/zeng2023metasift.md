# Meta-Sift: How to Sift Out a Clean Subset in the Presence of Data Poisoning?
(authored by agents unless marked 🧑)
Tag: `zeng2023metasift`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/zeng)

## problem and claims

The paper studies how to select a mostly clean base set from a training set that may contain poisoned samples. The downstream defenses it examines need a clean base set, and the paper measures how even small contamination damages them. Its central claim is that poisoning shifts the data distribution, so a model trained on one split should incur high loss on the complementary split; optimizing this split can expose clean samples.

The paper separates label-only, feature-only, and label-feature attacks (section 1, pp. 1667–1668). It reports: “Our evaluation shows that M ETA -S IFT can sift a clean base set with 100% precision under a wide range of poisoning threats.” (abstract, p. 1667). Here, PFR means poison filtering rate, AUC means area under the receiver operating characteristic curve, and ASR means attack success rate (section 2.1, p. 1669). In Table 1, Frequency Detector falls from 99.95% PFR with 0/100 poisoned base samples to 3.11% with 1/100; MNTD falls from 99.92% AUC with 0/1000 to 62.78% with 10/1000; NC's ASR rises from 18.83% to 62.67% when 30/1000 are poisoned; I-BAU's ASR rises from 12.58% to 81.82% when 8/1000 are poisoned; and MW-Net's accuracy falls from 91.18% to 81.84% with 20/100. These are the settings and denominators in Table 1 (p. 1670), not universal bounds.

The paper's human study uses 16 CIFAR-10 poisoned datasets, each with 10% manipulated data, and three experts per dataset: 48 experts total, recruited from three labeling companies (section 2.4, p. 1671). Human FNR is 8.33% for label flipping but 77.3%–91.0% for the five feature-only examples shown, and 6.00%–17.3% for the label-feature examples (Figure 3, p. 1672). The authors state: “The averaged FNR is above 86% as shown in Figure 3.” They compare this with a roughly 90% FNR for random guessing at a 10% poison ratio (section 2.4, p. 1672). Inference: that random comparison depends on how often the inspector marks samples as poisoned; the poison ratio alone does not determine FNR. These numbers are one CIFAR-10 human experiment, not evidence about all visual domains.

## technique: bilevel splitting objective

What it is. Given class-wise contaminated data (D_k), choose a balanced training split (B) whose complement produces the largest loss after training on (B). The formal objective is Eq. (3), with the inner model training in Eq. (4), equal class split sizes in Eq. (5), and (|B|\ge(1-\epsilon)|D|) in Eq. (6) (section 3.1, p. 1673). Here, ε is an upper bound on the poison ratio; the authors take ε = 0.5 under the assumption that poisons are fewer than clean samples. The adaptive analysis states the assumption per class (section 4.4, p. 1678; Appendix 6.4, p. 1682).

How to apply it:

1. Partition the dataset by class into (D_1,\ldots,D_K) (section 3.1, p. 1672).
2. For each class choose (B_k), requiring all (|B_k|) to be equal and their union to contain at least ((1-\epsilon)|D|) samples (Eq. (5)–(6)).
3. Train a model on (B) by minimizing the loss (L) (Eq. (4)).
4. Evaluate that model on (D\setminus B) and maximize the summed loss (Eq. (3)).
5. Treat the maximizing training split B as the intended clean split; the paper's exact-search formulation is intractable because it has a combinatorial outer search and nested optimization (section 3.2, p. 1673).

Verus form. Inference: specify a finite dataset, its class partition, and a selector's postcondition. Candidate properties are distinct selected indices, membership in the input, and the required class counts. These properties concern dataset accounting; they do not establish that the selected samples are clean or that optimization found the argmax.

Evidence and limits. The objective is motivated by the backdoor example: a model trained on clean data has high loss on triggered, relabeled samples (section 3.1, p. 1672). It assumes the poison minority condition and a distributional shift detectable through loss. The majority-poison adaptive experiment explicitly breaks the assumption; the paper states: “This attack design is effective as it breaks our basic assumption that the poisoned samples of each class account for less than 50% (Section 3.1).” (Appendix 6.4, p. 1682). Inference: a Verus proof of the selector's invariants cannot establish this statistical assumption or the quality of the learned split.

## technique: continuous relaxation and weight network

What it is. The binary membership variables (v_{k,i}) in Eq. (7)–(10) are relaxed to ([0,1]) weights (section 3.2, p. 1673). A weight network (S(L_i(\theta);\psi)) maps each sample's loss to a weight. Eq. (11) maximizes weighted held-out loss while Eq. (12) trains the model using weighted training loss. Hidden nodes use ReLU and the output uses a sigmoid, so weights lie in [0,1] (p. 1673).

How to apply it:

1. Replace each binary class-membership variable with a continuous weight (v_{k,i}\in[0,1]) (Eq. (7)–(10)).
2. Define (S) to consume the sample loss and emit its weight, then optimize (ψ) in Eq. (11) while optimizing (θ) in Eq. (12) (p. 1673).
3. Apply (S) to every sample, then take the same number of highest-weight samples within each class; this heuristic restores class balance (p. 1673).
4. Initialize all weights to one and stop after limited rounds, leaving most samples with high weights and implicitly preserving a large training split (p. 1673).

Verus form. Inference: specify bounded weights and the required class counts. If weights use fixed-point arithmetic, state their scale explicitly. Any proof of selection should distinguish its arithmetic model from the floating-point neural computation that supplies the weights.

Evidence and limits. The network reduces outer parameters: the authors report: “For instance, in our experiments, we found a network with 100 nodes is sufficient for high-quality weight assignment, but on the other hand, the size of the datasets considered in this paper is orders of magnitude larger.” (section 3.2, p. 1673). That is an empirical setting, not a theorem. The paper's selector is only an approximation to the combinatorial objective, and its class-balance and majority-size constraints are heuristics after relaxation.

## technique: online Sifter training with sampled hypergradients

What it is. A Sifter is the pair ((\theta,\psi)). Training starts with one epoch of ordinary all-weight-one model training, then processes each mini-batch in four steps: virtual update of \(\theta\), gradient sampling, meta-update of \(\psi\), and actual update of \(\theta\) (section 3.3, pp. 1674–1675). The paper states: “In each round of our online algorithm, the four steps are performed on one batch of data.” (p. 1675).

How to apply it:

1. Warm up \(\theta\) for one epoch with every sample weight set to one (p. 1674).
2. On a mini-batch compute the weighted gradient (g_\theta) and make the virtual update \(\theta'=\theta-\alpha g_\theta\) (Eq. (13)–(14)).
3. Train one two-layer gradient sampler \(\gamma_l\) for each candidate layer among the last layers. Each uses PReLU then Gumbel-softmax. Update its parameters using the outer objective gradient, then select a layer when its sampler output exceeds 0.5 (Eq. (15), p. 1674).
4. Compute the outer objective's sampled hypergradient, including the indirect gradient through \(\theta'\), and update \(\psi\leftarrow\psi-\beta g_\psi\) (Eq. (16)–(18), p. 1675).
5. Actual-update \(\theta\) with the updated weights \(S(L_i(\theta);\hat\psi)\) (Eq. (19), p. 1675).
6. Stop after all samples have been processed; the final pair is one Sifter (p. 1675; Algorithm 1, Appendix 6.3, p. 1682).

Verus form. Inference: verify finite batch traversal, gradient-sampler index bounds, and the sequence of updates. Treat the neural and differentiation routines through explicit specifications rather than assuming that a proof of loop accounting proves their numerical behavior.

Evidence and limits. Gradient sampling is introduced because “The process of calculating the indirect gradient of ψ has been shown to be computationally intensive [38, 39].” (p. 1675). The paper reports performance empirically rather than proving convergence. Inference: changing which layers contribute to the hypergradient can alter optimization. Eq. (11) states a maximization, but Eq. (16) describes gradient descent on that outer objective. Inference: this sign discrepancy needs resolution before implementing the equations literally. Algorithm 1 uses one warm-up pass and one updating pass; the paper repeats training with different random seeds to obtain multiple Sifters (pp. 1674–1675, 1682).

## technique: randomized dilution, multiple Sifters, and aggregation

What it is. The Identification stage uses randomized input perturbations, applies each trained Sifter, averages weights, and selects high-weight samples per class (section 3.3, p. 1675). Perturbations are random crop, rotation, horizontal flip, and Gaussian blur; section 3.3 says all four are applied simultaneously with randomly configured parameters (p. 1675).

How to apply it:

1. Train (m) Sifters independently with different random seeds (Figure 4 and p. 1674).
2. For each identification run, perturb every sample with the configured random crop, rotation, flip, and blur (p. 1675).
3. Produce m perturbed datasets and give each Sifter one perturbed dataset, yielding m weights per original sample (p. 1675). Eq. (11) defines S as a function of the classifier loss; the Identification prose instead describes assigning weights based on extracted features (pp. 1673, 1675). Inference: an implementation must resolve this wording difference rather than assume S directly consumes feature vectors.
4. Average the m weights for each original sample and choose the top-weighted samples per class (p. 1675). The formal problem uses equal counts; for the imbalanced GTSRB and PubFig evaluations, the authors instead preserve the original class distribution (Appendix 6.6, p. 1684).

Verus form. Inference: model the perturbation seed and selected index list explicitly, and prove aggregation is within the stated range and returns distinct in-range indices. Randomness, image transforms, and learned feature quality remain trusted or externally specified; a proof of index aggregation does not prove that invariance under a perturbation means cleanliness.

Evidence and limits. On CIFAR-10 with BadNets at 5% poison, Table 17 reports clean-subset upper bounds of 155×10, 274×10, 517×10, and 533×10 for 1, 3, 5, and 10 Sifters respectively; each is a 100%-precision upper bound under that setting (Appendix 6.7, p. 1684). The paper's tables report NCR 0±0 for Meta-Sift across evaluated attacks on CIFAR-10, GTSRB, and PubFig, while baseline methods have nonzero and variable NCR (Tables 5, 15, 16, pp. 1677, 1684). Table 15 gives GTSRB overhead as 5×80 seconds; Table 16 gives PubFig overhead as 5×80 seconds. The main sifting evaluation uses four datasets and 12 attack settings, primarily selecting 1000 samples and reporting means and standard deviations over three runs with different random seeds. It excludes unsuccessful attack settings, defined as ASR not exceeding 50%, and omits Smooth on PubFig and ImageNet because the original Smooth paper did not consider them (section 4.1, pp. 1675–1676). ImageNet is split into three non-overlapping random 10-class subsets because applying the method to all ImageNet at once is costly (section 4.1, p. 1675).

The ablation says combinations of augmentations matter: random crop plus Gaussian blur increases the clean set from 333×10 to 499×10, while no augmentation still yields 28×10 (Appendix 6.7, p. 1684). Too many augmentations may lose information (same section). Adaptive adversarial-noise experiments report NCR 0±0 even when noise is optimized against a clean model or five old Sifters (Appendix 6.5, pp. 1682–1683), but the assumption-breaking experiment produces nonzero NCR (Table 13, p. 1683). Its text describes poison ratios above 50%, while the table lists 50%; the study cannot resolve that discrepancy. The noise attacks are also limited tests: the Narcissus ASR drops from 100% before adaptation to 5.78% with clean-model noise or 9.81% with Sifter-based noise (Tables 4 and 14, pp. 1677, 1683). The old Sifters select only poisons for the target class after Sifter-based adaptation, but Meta-Sift trained on the modified dataset still reports zero NCR (Appendix 6.5, p. 1683).

## techniques for the catalog

- bilevel clean-split objective — train on one class-balanced split and maximize loss on its complement under a minority-poison assumption
- continuous weight relaxation — replace binary membership with bounded weights produced by a loss-conditioned network, then select equal top weights per class
- online Sifter hypergradient training — warm up a classifier and alternate virtual update, sampled hypergradient, meta-update, and actual update
- randomized Sifter aggregation — perturb samples, run multiple independently trained Sifters, average weights, and select high-weight samples with the required class distribution
- normalized corruption evaluation — divide selected-subset poison fraction by the poison fraction from random selection and multiply by 100%, retaining the attack-specific denominator
