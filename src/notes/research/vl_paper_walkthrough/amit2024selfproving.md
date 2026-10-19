# Models That Prove Their Own Correctness
(authored by agents unless marked 🧑)
Tag: `amit2024selfproving`, [paper](https://arxiv.org/abs/2405.15722)

## core construction

The paper defines a Self-Proving model as a learned prover that emits an answer and then interacts with a manually defined verifier. For input `x`, the model emits `y`; over `R` rounds the verifier sends queries and receives answers; it accepts or rejects. Definition 3.2 requires perfect completeness for an honest prover and bounds the acceptance probability of every incorrect input/output pair by the soundness error `s`, for every prover. Section 1 states: "This guarantee holds even against provers that have access to V ’s specification, and unbounded computational power." (PDF p. 2). Verifiability is the acceptance probability over the input distribution, model generation, and interaction randomness; soundness applies to each fixed input/output pair (Definitions 3.2 and 3.4, PDF pp. 5–6).

Inference: for verified Rust generation, the verification tool could play the manually defined verifier's role, with generated code and proof text treated as untrusted. A high average pass rate cannot replace checking each output. The paper limits its theory to capabilities verifiable within an interactive proof system (Section 1, PDF p. 2).

## technique 1: interactive proof interface and guarantees

Define a ground-truth function, or a bounded loss `ell(x,y)`. Choose a probabilistic polynomial-time verifier `V` with explicit inputs `x,y` and black-box prover access. It queries the prover over `R` rounds and decides at the end. Require perfect completeness for an honest prover and soundness against every prover. For general loss, completeness applies when `ell(x,y) = 0`; when `ell(x,y) > lambda`, acceptance has probability at most `s`. Verifiability `beta` implies approximate correctness with probability at least `beta-s` (Definitions 3.2–3.9, PDF pp. 5–8).

Inference: in a Verus application, put the required specification in the input and treat generated Rust and proof code as the output and proof. Verification acceptance would support the specified property subject to the verification tool's assumptions. Compiler diagnostics could guide repair, but this paper does not establish a sound interactive protocol for Verus or guarantees about Rust ownership, termination, or side effects.

## technique 2: Transcript Learning (TL)

TL assumes access to accepting transcripts `pi* = (y*,q1*,a1*,...,qR*,aR*)` from an honest transcript generator. Its verifier-query distributions must match the verifier's, and it must be fully supported on accepting transcripts (Definition 4.1, PDF p. 9). Algorithm 1 initializes parameters to zero, repeatedly samples an input and accepting transcript, and computes the target-token probabilities `alpha_s(theta)` and log-probability gradients `d_s(theta)`. Its update is `theta_next = theta + learning_rate * (product_s alpha_s) * (sum_s d_s)`, where `s` ranges over model-generated answer tokens, including the initial output, rather than verifier-query tokens. It returns averaged parameter iterates (Algorithm 1, PDF p. 9).

The product of token probabilities weights the log-probability gradient sum. This update estimates the gradient of transcript agreement `A(theta)`, a lower bound on verifiability (Lemma 4.2, PDF p. 10). Agreement compares prover messages under shared verifier queries (Appendix A.2, PDF pp. 24–25). Thus TL is not simply unweighted next-token training on every transcript token.

Accepting transcripts can be collected by running an efficient honest prover with the verifier in a doubly efficient interactive proof. Alternatively, backward data generation jointly samples inputs and accepting transcripts, or constructs inputs from sampled transcripts. The resulting inputs must match the inference distribution (Section 4.1.1, PDF pp. 10–11). The authors warn that backward generation can bias the training distribution toward the construction process (Section 8, PDF p. 18).

Inference: a Verus adaptation could collect accepted code and repair transcripts for fixed specifications. Applying the formal TL result would additionally require a suitable transcript generator and the probability-weighted update above; merely training on compiler logs does not establish those conditions.

## technique 3: Reinforcement Learning from Verifier Feedback (RLVF)

RLVF uses no honest transcript generator. Algorithm 2 samples an input, generates an output and responses with the current model, emulates the verifier's queries, and updates only after acceptance. Its update adds the learning rate times the sum of model-token log-probability gradients over the initial output and subsequent answers, then returns averaged parameter iterates (PDF p. 11). The paper states: "This means that the learner can first fully generate the transcript (lines 6-7), and then take backwards passes (line 9) only if the transcript was accepted by V ." (Section 4.2, PDF pp. 11–12). The quoted line numbers are the paper's own references.

Lemma 4.3 identifies the expected update direction as the verifiability gradient (PDF p. 12). RLVF is on-policy: its transcripts come from the current model. A base model needs verifiability bounded away from zero to sample accepted transcripts sufficiently often. The paper proposes learning that base with TL and improving it with RLVF (Section 4.2, PDF p. 12); it leaves a full convergence analysis of RLVF to future work (Remark 5.2, PDF p. 13).

Inference: for Verus, sample candidate proof crates for fixed specifications, check them, and update the model using accepted samples. This requires access to the model's log-probability gradients and enough accepted candidates; the optimizer does not establish verifier soundness.

## technique 4: annotations as process supervision

An annotated answer includes intermediate computation that an extractor removes before the answer reaches the verifier. During training, an annotator transforms transcripts. During inference, the model retains annotated interaction history but sends extracted answers to the verifier. TL and RLVF extend to this setting (Section 6, PDF p. 13). The paper says: "At inference time, the model is evaluated only on whether it generated the proof π correctly." (Section 6, PDF p. 13).

For GCD, annotations contain the first `T` intermediate values of the extended Euclidean algorithm's `r0`, `s0`, and quotient `q`, followed by the Bézout coefficients. The extractor retains those coefficients. Annotations shorter than the cutoff are padded as described in Appendix B.2 (PDF pp. 29–31). Figure 3 reports that models exceed the corresponding bound for inputs whose Euclidean depth is at most `T` (Section 7.2, PDF p. 15).

Inference: a Verus adaptation could use intermediate invariant calculations as model-generated annotations and extract the final proof code for checking. The extractor and final verification would need to preserve the required specification; the paper does not test this adaptation.

## evidence and convergence

The formal TL convergence theorem assumes concave agreement `A(theta)`, uniformly bounded log-probability gradients, and a parameter vector of norm below `B_Norm` with agreement at least `1-epsilon/2` with the chosen honest transcript generator. It also bounds transcript token length by `C`. With the prescribed learning rate, at least `4*C^2*B_Norm^2*B_Lip^2/epsilon^2` iterations yield expected verifiability at least `1-epsilon` (Theorem A.2, PDF pp. 26–29; informal Theorem 5.1, PDF p. 12). The formal realizability condition is high transcript agreement, not merely high verifier acceptance. The paper calls convexity and Lipschitzness simplifying assumptions (Section 5, PDF p. 12).

The experiments train a 6.3M-parameter GPT from scratch for GCD, using base 210 and pairs drawn log-uniformly from `{1,...,10^4}`. Evaluation uses 1,000 held-out input pairs (Section 7.1, PDF p. 14; Appendix B.2, PDF p. 30). The one-round verifier checks that `y = z0*x0 + z1*x1` and that `y` divides both inputs. The paper claims perfect soundness for this GCD proof system (Appendix B.1, PDF p. 29).

Table 2 reports correctness/verifiability as follows (PDF p. 14):

- baseline GPT: 99.8% / no verifiability result
- GPT+TL: 98.8% / 60.3%
- GPT+TL+RLVF: 98.9% / 78.3%
- GPT+ATL: 98.6% / 96.0%

The paper contains conflicting experimental descriptions. Section 7.1 says "a dataset of 1024K samples" (PDF p. 14), whereas Appendix B.2 says "Models in Table 2 and Fig. 3 are trained for 100K iterations on a dataset of ≈10M samples." (PDF p. 30). Section 7.1 describes RLVF improving verifiability from 40% to 79.3% over four million iterations (PDF p. 14), while Table 2 reports 78.3% and Figure 6 describes a starting model at 48% (PDF p. 17). These numbers are reported separately here; the paper does not reconcile them. The 100K TL iterations process approximately 100M samples in batches of 1,024, which differs from the number of distinct dataset samples (Section 7.1, PDF p. 14; Figure 4, PDF p. 16).

The representation study trains on 68 bases, with 17 bases for each count of distinct prime divisors from one through four. Figure 5 reports a correlation between that count and verifiability. The authors describe the difference as a few percentage points and attribute its size to using 10% as many training samples (Section 7.3 and Figure 5, PDF pp. 15–16).

## trusted boundary, limitations, and VL impact

The manually defined verifier and its soundness guarantee support rejection of incorrect outputs, independently of the learned prover. Architecture, optimization, and training-distribution assumptions support learning and average-case acceptance; they do not establish soundness (Definitions 3.2 and 3.4, PDF pp. 5–6; Theorem A.2, PDF pp. 26–29). The authors identify separate models for each ground-truth capability and bias from backward data generation as limitations (Section 8, PDF pp. 17–18).

Inference: the arithmetic experiment does not establish performance on concurrent Rust, unsafe code, quantified heap properties, or nontermination. VeruLaw could test accepting proof transcripts, verifier-based rewards, and generated intermediate annotations. Each resulting crate would still need checking against its required specification. Average-case verifiability does not imply that every generated crate verifies.

## techniques for the catalog

- self-proving verifier interface — emit an answer, then interact with a verifier whose soundness bounds false acceptance for each input/output pair
- transcript learning — optimize agreement with accepting transcripts using a probability-weighted sum of model-token log-probability gradients
- reinforcement learning from verifier feedback — emulate verifier queries and update only after an on-policy transcript is accepted
- annotated transcript learning — generate intermediate computation and extract the answer sent to the verifier
- TL convergence analysis — bound samples using transcript length, parameter norm, log-probability gradient bounds, and target error under concave agreement and realizability assumptions

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In our current learning methods, each individual ground-truth capability requires training a separate Self-Proving model."): checked all paper text, quotations, numerical results, references, algorithm steps, and the study's inferences; corrected soundness wording, TL token selection and probability weighting, page references, formal convergence assumptions, experiment inconsistencies, and the trust boundary; replaced the paper link with its arXiv identifier; did not reproduce experiments, inspect implementation code, independently prove the theorems, or validate the proposed Verus adaptations.
