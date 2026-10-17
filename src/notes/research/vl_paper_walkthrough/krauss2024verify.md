# Verify your Labels! Trustworthy Predictions and Datasets via Confidence Scores
(authored by agents unless marked 🧑)
Tag: `krauss2024verify`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/krauss-verify)

## problem and claimed contribution

The paper treats a sample plus its assigned label as a Sample Label Mapping (SL-Mapping). A mapping can be a human label in a training set or a model prediction at inference. LabelTrust scores how similar the sample is to a small, expert-checked reference set for the claimed class. The same mechanism is used to filter a training set and to flag predictions for review. The authors state: “The correctness of this mapping is crucial regardless of its origin, e.g., from domain experts in the dataset labeling phase or from predictions by a trained model during inference.” (Introduction, p. 2955)

Inference: the technique is a statistical detector, not a formal proof of the label. It assumes that a small clean reference set represents each class. Its output is a confidence score used to prioritize human action. The paper’s central claim is: “We propose LabelTrust, a general tool to generate a confidence score for an SL-Mapping.” (Introduction, p. 2956)

## technique: few-shot Siamese confidence scoring

What it is. A Siamese network has two copies of the same feature encoder with shared weights. Each encoder maps one record to an embedding; a decision network maps the pair of embeddings to a number in [0,1]. The target is 1 when the records have the same class and 0 otherwise. Binary cross entropy (BCE) trains the decision output. The paper says: “The fundamental concept of a Siamese network is depicted in Fig. 1 and involves guiding the two data records through identical networks, each sharing the same architecture and weights - effectively functioning as "siamese twins".” (Background, p. 2957)

Inference: use this when only a few trusted examples per class can be inspected, when the primary model or dataset is untrusted, and when the required result is a ranking or alert rather than a proof that a prediction is correct. The authors report using 2–35 reference samples per class in their experiments (Introduction, p. 2956).

How to do it, following the paper’s method:

1. Have a domain expert choose x samples for every one of n classes, and check that each is correctly labeled and free of triggers or other poisoning (Sect. 3.1, p. 2960). This is the reference dataset.
2. Expand that set into a Siamese training set by repeatedly making a positive pair from two records of one class (target 1) or a negative pair from records of two classes (target 0) (Sect. 3.1, p. 2960).
3. Train the shared encoder and decision network. The MNIST/ResNet-18 evaluation uses BCE, Adadelta with learning rate 1.0, one epoch, and batch size 64 (Sect. 4.1, p. 2962). The smaller CNN experiment changes the learning rate to 0.1 (Sect. 4.2, p. 2964).
4. For an SL-Mapping (s,l), pair s with each of the x reference records for label l (Sect. 3.1, p. 2960).
5. Run the network on those pairs and average their scores. A high average means similarity to the claimed class; a low average means the mapping is unusual (Sect. 3.1, p. 2960).
6. Choose a threshold for the action. The paper evaluates 0.99, 0.5, and 0.01; the threshold is selected by the user’s goal of identifying trustworthy or untrustworthy mappings rather than by the application category (Sect. 4.1, p. 2962; footnote 5, p. 2961).

Inference: a Verus implementation could treat neural scores as external inputs and prove that a nonempty reference set is used, the scores are averaged correctly, and threshold decisions follow the configured rule. This would require an explicit numerical representation and contracts for the score provider. Such a proof would not establish that a high score means a correct label; the paper does not model or verify these properties.

Evidence. In Table 1 (MNIST, ResNet-18 Siamese encoder, test-set denominators are the MNIST test samples or generated pairs), ACC-Testset at threshold 0.99 rose from 59.56 for x=2 to 81.74 for x=20. For unpoisoned mappings at the same threshold, ACC rose from 92.52 to 97.36 while false-rejection rate fell from 72.98 to 22.94. For the pixel-trigger poison test, the average confidence was 0.0088 at x=2 and the true-rejection rate was 100.00% at thresholds 0.99 and 0.5 (Table 1, p. 2963). Inference: these empirical percentages do not establish universally guaranteed bounds.

## technique: offline dataset cleaning with a refeed loop

What it is. LabelTrust scores every mapping in an untrusted labeled dataset, keeps high-scoring samples as the provisional clean set, and sends low-scoring leftovers to an expert. The expert may discard a poisoned or mislabeled sample or add a verified benign sample to the reference set. The complete dataset is rescored after retraining, including samples previously called clean. The paper explicitly says: “The expert can refeed clean samples from the leftovers, that were not considered in the ground truth so far into the reference dataset and rerun the whole process, including Siamese model training and confidence scoring of the whole dataset.” (Sect. 3.1, p. 2961)

How to do it:

1. Start with x expert-checked examples per class and train the Siamese network (steps 1–3, Sect. 3.1).
2. Pair each dataset sample with references for its assigned label, average the scores, and apply a high threshold when only very similar samples should be accepted (steps 4–5, Sect. 3.1).
3. Put accepted samples in the provisional clean set and inspect leftovers. Discard confirmed poison or refeed confirmed clean leftovers (step 6, Sect. 3.1).
4. Add the selected clean leftovers to the reference set, retrain from scratch, and rescore all samples. Repeat until the expert has inspected all samples or a predetermined filtered fraction yields acceptable model performance (Sect. 3.1–3.2, pp. 2960–2961).

The reported experiment poisoned approximately 10% of the samples in each MNIST training batch, producing 5,625 poisoned samples out of 60,000 (Sect. 4.3, p. 2964 and footnote 7). With threshold 0.99 and x=10, round 1 retained 37,717 and left 22,283; it identified 5,616 true leftovers and 16,667 benign false leftovers, with TRR 99.84 and ACC 72.20 in Table 3 (p. 2965). After five refeed rounds (x=35), it retained 50,009 and left 9,981, with 5,615 true leftovers, 4,366 false leftovers, TRR 99.82, and ACC 92.70. The model trained after the first filtering had main-task accuracy 92.97 and backdoor accuracy 3.42, compared with 98.36 and 100.0 before filtering (Table 3, p. 2965).

Inference: a Verus implementation could prove that every output sample came from the input, every accepted item satisfied the threshold rule, accepted and leftover indices are disjoint, and every refeed item was marked as expert-verified. These bookkeeping properties would leave detector accuracy and the correctness of expert judgments as assumptions.

## technique: online prediction confidence

What it is. Use the same clean reference set to assess a deployed model’s output for an unseen sample. Form the mapping from input to predicted label, pair the input with references of that predicted class, and average the Siamese scores. A low score prompts human verification; a high score indicates similarity to the reference set. The authors state: “The yielded confidence score enables an user to decide if a model prediction is trustworthy.” (Sect. 3.2, p. 2961)

The paper’s online experiment trained ResNet-18 on MNIST with a pixel trigger in 10% of each batch, then scored mispredictions. For the default setting, mean/median scores were 0.3006/0.0182 for benign-test-set mispredictions and 0.0052/5.83×10^-7 for backdoored-test-set mispredictions (Appendix 7.3, Table 4, p. 2971). Blend and clean-label backdoors and FMNIST and IIC datasets were also tested in that table. Clean-label backdoors are not expected to be filtered during offline cleaning because their training mappings are clean; the paper says they can be identified during inference (Sect. 4.4, p. 2965).

Inference: a Verus implementation could prove the online wrapper’s data flow: the predicted label selects the reference slice, the slice is nonempty, the returned mean is within the score range, and an alert is raised exactly when the score is below the configured threshold. The prediction itself and the neural score remain trusted inputs. A proof that the alert detects a particular attack would require assumptions connecting the score to that attack; this paper provides empirical evaluations instead.

## alternative loss and implementation details

Appendix 7.2 gives two replaceable training losses. Contrastive loss minimizes Euclidean embedding distance for same-class pairs and maximizes it toward margin m for different-class pairs. Triplet loss uses an anchor, a same-class positive, and a different-class negative, and minimizes `max(0, d(a,p)-d(a,n)+m)`. The paper says: “LabelTrust could also be used with Contrastive or Triplet loss, but respective experiments were omitted within this paper.” (Appendix 7.2, p. 2971) Thus these are proposed options, not measured results. Inference: a Verus proof can check arithmetic properties of a fixed-point loss implementation and preservation of nonnegative distances, but not convergence of gradient training without a formal numerical model.

Runtime evidence comes from ten runs of the Table 1 line (3) setup, averaged: Siamese training took 34.56 seconds, pairing took 7.62×10^-4 seconds, and inference for ten samples took 0.0056 seconds (Sect. 4.5, p. 2966). The denominator is ten runs for these timings, not per all possible datasets or hardware.

## assumptions, contradictions, and boundaries

The approach assumes an expert can provide representative, correctly labeled, poison-free samples for every class; complex subclasses may require separate classes or more references (Sect. 5, p. 2966). It assumes the system runs in a secure environment and that an adversary cannot see the reference set or Siamese model while crafting attacks (Sect. 3, p. 2959; Sect. 5, p. 2966). Colored IIC data was harder: with x=10, ACC-Testset at threshold 0.99 was 52.06, unpoisoned ACC was 84.62 with FRR 85.10, and poison TRR was 99.48 (Table 2, p. 2964). Inference: these results show that detection and false-rejection performance vary across the tested datasets; architectural independence does not imply equal accuracy.

The paper contains conflicting figures. It says: “Following the five refeed rounds detailed in Tab. 3, an expert would have reviewed only 350 samples manually, a fraction of 0.0058% compared to 60.000 samples that would have been reviewed without assistance from LabelTrust, and would only sacrifice 9,981 samples (16,63%) as leftovers, if he stops after refeed round five (line (6) in Tab. 3).” (Sect. 4.3, p. 2965) Its conclusion claims “only 0.0058% of the dataset needs manual evaluation to clean 83.73% of a dataset” (Sect. 7, p. 2968). Inference: 350/60,000 is 0.5833%, so the printed manual-inspection percentage is smaller by a factor of 100; 50,009/60,000 is 83.35%, not 83.73%. Table 3 reports initial ACC 72.20, while the preceding discussion says “The seemingly low accuracy of 71.86 is caused primarily by the unpoisoned samples falsely classified as leftovers.” (Sect. 4.3, p. 2964). The online benign median also differs: Sect. 4.4 reports “mean and median confidence score of 0.30 and 0.0018” (p. 2966), whereas Table 4 gives 0.3006 and 0.0182 (p. 2971). The evidence above uses the tables and preserves these discrepancies.

## what is proved, trusted, and relevant to VL

Nothing in the paper is a formal proof: its evidence is test-set accuracy, false-rejection rate, true-rejection rate, confidence distributions, and runtime on specified datasets, models, attack constructions, and denominators. Inference: applying the method requires trusting expert labels, reference-set integrity, and the execution of training and scoring, alongside the paper’s restricted adversary model. For VL, the reusable lesson is a contract-and-review pipeline around an untrusted learned or heuristic component. Verus can prove deterministic bookkeeping, threshold and averaging code, ownership of samples, and refeed-loop invariants. It cannot prove that a learned score tracks semantic correctness unless the learned component is replaced by a proved specification with a sound abstraction.

Inference: agent-written verified Rust poses a product threat if a statistical confidence score is mistaken for a proof. A VL workflow should record the score model, reference-set provenance, threshold, denominator, and unresolved assumptions as explicit evidence, and require a human or separately verified rule for high-consequence decisions. LabelTrust’s refeed loop is useful as triage and data-quality control, but it does not remove the need to verify the code that consumes its decisions.

Inference: the paper already covers the dual use of a few-shot Siamese detector, thresholded filtering, expert refeeding, online prediction scoring, and alternative Siamese losses. VL should not redo those as an unqualified novelty claim; it should instead formalize the surrounding data-flow and decision contracts or test whether those contracts remain valid under dependency and model changes.

## techniques for the catalog

- few-shot Siamese scoring — train shared encoders on expert-checked positive and negative pairs, then average scores against references for a claimed label
- thresholded dataset cleaning — classify mappings as clean or leftovers, inspect leftovers, and retrain after adding verified samples
- refeed loop — iteratively add expert-confirmed leftovers to the reference set and rescore the entire dataset
- online prediction confidence — score a deployed model’s predicted label against clean references and alert on low scores
- contrastive or triplet training — substitute distance-based pair or triplet losses for BCE as untested alternatives discussed in Appendix 7.2
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The updated reference dataset of each round is then used to retrain the Siamese network from scratch and reevaluate the whole dataset, resulting in a new set of clean and leftover samples."): checked the full paper, quotations, numerical results, page and section references, technique steps, assumptions, and catalog entries; corrected references, the poisoning description, quotation punctuation, and the publisher link, documented conflicting figures, removed unsupported Verus code, and marked proposed applications as inferences; did not reproduce experiments or verify implementation code or Verus proofs.
