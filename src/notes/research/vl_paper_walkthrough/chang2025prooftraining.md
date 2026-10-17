# Towards Understanding and Enhancing Security of Proof-of-Training for DNN Model Ownership Verification
(authored by agents unless marked 🧑)
Tag: `chang2025prooftraining`, [paper](https://www.usenix.org/conference/usenixsecurity25/presentation/chang-yijia-verification)

## problem and formal model

Chang et al. (USENIX Security 2025) study proof-of-training (PoT), where a verifier decides whether a claimant really trained a DNN. An honest prover has training algorithms, their inputs (training data), and a model trajectory; a malicious prover stole a model and submits a forged record. The paper splits existing PoT schemes into retraining-based (does the trajectory come from retraining on the data and algorithms?) and statistics-based (do trajectory statistics meet pre-specified requirements?). Retraining-based schemes were already broken by prior attacks [18, 19]; the authors add an attack on the statistics-based scheme in Section 3.3.4. They propose a verifier that does not receive training data and relies on trajectory matching and data-fidelity evaluation.

The authors frame formal methods as a way to characterize attacker capabilities and derive security criteria. They state, “Formal methods are techniques used to model a complex system as logical entities, so that we can examine the security of this system in a more thorough fashion than piecemeal enumeration.” The model sorts attacks into weak attacks (detected by existing PoT schemes), strong attacks (outside attacker capabilities), and non-trivial attacks (Section 2).

Formal objects (Section 3.1). A training trajectory is TT = {M1, ..., Mn}, the saved model states. Each update is Mi+1 = Mi + TA,i(Mi, Di) + zi, with zi a B-bounded noise from accelerator devices such as GPUs. Definition 3 defines the training record as a quadruple (IA, TA, TT, D): initialization algorithm, training algorithms, trajectory, datasets. Only the proof sent to the verifier drops the data: it is {IA, TA, TT} (Section 5). Training algorithms are submitted as executable programs.

Attacker model (Section 3.2). Goal: make the verifier approve the forged record rather than the honest one while spending less effort than honest training; cost is measured as running time on a fixed machine (Definition 4). Capabilities: access to the target model, access to the honest training datasets (and the ability to sample new ones from the same distribution), and full knowledge of the initialization and training algorithms, including the random seed. Incapabilities, which serve as security assumptions: Assumption 1 says the attacker cannot find a cheaper algorithm sequence that takes the initial model to the target model without utilizing the target model; Assumption 2 says it cannot find data that makes a given algorithm output a given value more cheaply than running that algorithm. The paper notes that full dataset access differs from the statistics-based scheme [8], which assumes the attacker's dataset is much smaller (for example no greater than 10%) than the honest prover's. The conclusions hold only inside these assumptions.

## technique: classify attacks by capabilities

What it is. After excluding weak attacks (incorrect record structure; dishonest initialization), the paper classifies the remaining attacks along two axes: forward or reverse direction (is the trajectory made after, or before, the algorithms and data in the record) and forgery object (algorithm manipulation, if data are honestly sampled; data fabrication otherwise). Table 1 gives four types: forward algorithm manipulation (Attack 1), reverse algorithm manipulation (Attack 2), reverse data fabrication (Attacks 3 and 4); forward data fabrication is listed but has no instance, because the paper argues the attacker has little motivation to fabricate data going forward. Section 2 states the key distinction for data fabrication: “The other type is data fabrication attacks, under which the key distinction between training records is the data distribution.”

How to apply it (steps follow the paper's three-step procedure in Section 2, with the checklist in step 4 added by the study).

1. Write down what the verifier receives and what the malicious prover can access.
2. Mark attacks requiring impossible capabilities as strong and attacks caught by current PoT checks as weak.
3. For each remaining attack, specify what is manipulated (initialization, algorithm, data, or trajectory) and its cost relative to honest training.
4. Inference: check whether the attack uses final-model knowledge (Attack 1: loss L' = L(Di) + a·d(Mi, M)), a trajectory built before the algorithms (Attacks 2-4), interpolation (Attack 3), or backward optimization (Attack 4).

Verus form (Inference: the paper's model is information-theoretic, not Rust). Encode capabilities as ghost predicates over a record and prove that each attack trace satisfies the declared capability assumptions. Use `requires` on attack constructors and `ensures` to state which record fields are changed. This makes assumptions explicit but does not prove that a real attacker cannot obtain omitted information.

Evidence and limits. Attack 3 forms Mi = (1 - ai)M1 + ai·M with ai rising from 0 to 1; Attack 4 sets Mm = M and generates Mi-1 from Mi by optimization toward M1, so it works backward. In Section 3.3.4 the authors modify the setting of the statistics-based scheme [24] (attacker has the initial model and a large dataset; model states are saved every 5 epochs instead of every epoch). On CIFAR10 with convolutional networks, honest training and Attack 4 gave the same value on every one of the scheme's six trajectory properties except property 2 (maximum distance between two model states in successive checkpoints). The existing scheme claims the honest record should have the smaller value; the authors measured 0.021 for the honest record and 0.019 for the forged one, and conclude the scheme fails to distinguish them. This is one setting, not a failure rate.

## technique: mutual-information criterion

What it is. Section 4 states Theorem 1 formally: if the malicious prover conducts algorithm manipulation attacks at lower cost than honest training and Assumptions 1-2 hold, then I(D; TT,[i:i+k]) > I(D(M); TT(M),[i:i+k]) for length-k trajectory fragments (Section 2 gives an informal version without fragments). The proof is in Appendix B: it reduces mutual information to the entropy of the training-algorithm outputs, then argues the forward-direction forgery has lower output entropy (it uses the target model), and the reverse-direction forgery has near-zero output entropy (a constant output). For data fabrication, Section 4 argues in prose: the best synthetic data a verifier can find for an honest record is the real training data D, sampled from the target distribution, whereas for a forged record the best synthetic data deviates far from it. The paper concludes that one criterion detects both attack types: whether data of high fidelity exist that support approximate retraining of the submitted trajectory.

How to apply it.

1. Treat the submitted training algorithm and trajectory as a channel from data to model states.
2. Search for synthetic data S such that executing the submitted algorithm over S produces a similar trajectory.
3. Measure whether S resembles the target distribution using a held-out test set.
4. Rank proofs by synthetic-data fidelity; the highest fidelity is selected as honest.

The paper explains, “The higher the fidelity of synthetic data, the more likely it is that the training record is from the honest prover.” Direct mutual-information estimation is impractical for high-dimensional trajectories, so trajectory matching is the operational substitute.

Verus form (Inference). Prove a finite, abstract relation between a data sequence, transition function, and trajectory, and state a contract that high-fidelity synthetic data implies approximate replay. Mutual information, neural training, and distribution similarity are statistical quantities outside ordinary Verus arithmetic; use an explicit trusted oracle or interval estimator and mark its assumptions.

Evidence and limits. The paper's ResNet-18 example has 270000-dimensional model states and “hundreds or even thousands” of states per trajectory (Section 4), motivating the indirect criterion. Theorem 1 covers algorithm manipulation only and depends on Assumptions 1-2 and the lower-cost premise. Inference: the extension to data fabrication and the claim that the criterion is universal rest on the prose argument in Section 4, not on a theorem, and no bound for arbitrary algorithms or distributions is given.

## technique: generic three-stage PoT verifier

What it is. The prover sends {IA, TA, TT} without training data. The verifier is assumed honest and holds a test dataset Dtest with a distribution similar to the training data (from a public dataset, or data on which the target model has high confidence). Verification runs in three stages: structure and initialization check, trajectory-matching data synthesis, and data evaluation. The paper says of the two criterion-based steps, “These two steps do not rely on the training data and thus can help to address the data privacy concern.”

How to apply it.

1. Stage 1, structure and initialization check. Verify the record structure. If IA samples a random model, apply a Kolmogorov-Smirnov test to check whether M1 is truly sampled from the distribution specified in IA. If IA uses an existing well-trained model, check whether that model has a corresponding honest training record.
2. Stage 2, data synthesis. Use TA and TT as teacher information. Optimize a small synthetic dataset S so that a student model trained with TA on S has a trajectory close to TT, using a trajectory-matching algorithm. The teacher trajectory is the prover's; the verifier trains the student.
3. Stage 3, data evaluation. Train t new models from different initializations on S and measure their average accuracy on Dtest. Among competing proofs from different provers, output the one with the highest average accuracy as the honest one.

Verus form (Inference). The structure check can be a verified parser with a Rust datatype and `requires`/`ensures`. A replay checker can prove deterministic transition consistency for a bounded number of checkpoints. KS tests, gradient optimization, and average accuracy require numerical or statistical contracts and remain trusted components.

Evidence and limits. The verifier is selected by comparison among proofs, so a single proof gets no absolute pass or fail. Inference: an isolated proof's score alone is therefore not a completeness guarantee. The method depends on trajectory matching converging, on the verifier's honesty, and on Dtest being representative. In the experiments (Section 6) t = 3 and trajectory matching runs 300 iterations.

## technique: trajectory matching

What it is. Trajectory matching comes from data distillation. Its key idea is to train a teacher model on D and a student model on S and to encourage consistent trajectories. In PoT the teacher trajectory is the prover's, and the verifier trains the student on synthetic data. The distance between teacher and student model states is the objective; the synthetic set is then tested for fidelity (Stage 3).

How to apply it (Appendix A, Algorithm 1). Initialize S by sampling from a distribution DI. Repeat for T iterations: sample a fragment of length K from the prover's trajectory, say from Mi to Mi+K; initialize a synthetic model as Mi; run K steps of the prover's training algorithms TA,i+k on S; compute a loss between the resulting model and Mi+K; update S with respect to that loss. The paper instantiates this with the memory-efficient algorithm of Cui et al. [22] (Section 6.1).

Verus form (Inference). A bounded replay can be expressed as a recursive proof over a sequence of model states, with a lemma that equal inputs and deterministic updates preserve equality. Neural floating-point optimization cannot be proved by this abstraction; verify only the checker and record-structure portions.

Evidence and limits. Small synthetic datasets can fail to converge for larger models: for ResNet34 the authors report that SDS=10 (CIFAR10) and SDS=100 (CIFAR100) were too small to converge, with loss “NAN” (Section 6.2.1; the cells are empty in Table 2). Inference: a low-fidelity score may then reflect optimizer capacity rather than fraud. The paper also notes larger SDS lowers efficiency and leaves that trade-off to future work.

## technique: information-theoretic attack analysis

Section 4 draws an analogy with a communication system: the training algorithms are like a channel, with training data as the input and the training trajectory as the output. By Shannon's channel coding theorem [25], the mutual information between channel input and output measures the optimal capability to recover the input from the output. The paper therefore argues that it should be harder to recover training data from the trajectory of a malicious record, which has smaller mutual information. This motivates recoverability, measured by the fidelity of synthetic data, as the security signal. The proof of Theorem 1 depends on Assumptions 1-2 and on the forged attack costing less than honest training.

Verus form (Inference). Use this analogy only to organize specifications. A Verus proof can show deterministic information-preserving transformations or bounds on a finite encoding, but not Shannon mutual information of a neural training distribution without a formal probability library and explicit finite assumptions.

## techniques for the catalog

- capability-based attack modeling: classify weak, strong, and non-trivial forgery methods from explicit attacker assumptions
- mutual-information criterion: distinguish honest and forged records by recoverability of high-fidelity training data
- trajectory matching: synthesize data that reproduces a submitted model-state trajectory
- three-stage verifier: check structure and initialization, synthesize data, then evaluate fidelity on held-out data
- statistical provenance limits: treat test-set representativeness, optimizer convergence, and neural training as trusted assumptions
