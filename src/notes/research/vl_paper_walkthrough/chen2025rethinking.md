# Rethinking Fine-Tuning when Scaling Test-Time Compute: Limiting Confidence Improves Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `chen2025rethinking`, [paper](https://arxiv.org/abs/2502.07154)

## scope and main result

Chen, Raventós, Cheng, Ganguli, and Druckmann study supervised fine-tuning (SFT) for pass@N: sample N independent completions and accept one if an oracle verifier accepts it. They report that cross-entropy (CE) training can improve pass@1 while reducing pass@N for large N. The abstract states: “We show, surprisingly, that training with cross-entropy (CE) loss can be misaligned with pass@N in that pass@N accuracy decreases with longer training.” (Abstract, PDF p. 1.) Their explanation is overconfidence: CE concentrates probability on a few answers, while large-N search benefits from probability spread over alternatives.

The paper proposes Direct Coverage Optimization (DCO). For one prompt and completion, it multiplies the CE gradient by a factor F(N,p̂(y|x)); for N>1, F decreases as confidence rises and becomes small as confidence exceeds roughly 1/N. Inference: this attenuates gradients rather than imposing a hard probability cap. The paper summarizes the design as: “We propose a loss function that directly optimizes the pass@N coverage metric, demonstrating consistent improvement over the CE loss objective and achieving superior accuracy frontiers on MATH and MiniF2F (Sections 5.1 to 5.3).” (Introduction, PDF p. 2.)

## technique 1: measure the training/test mismatch with pass@N

what it is and when to use it. Define a verifier V(x,y) that returns one for a correct completion and zero otherwise. For a test set D, measure the probability that at least one of N independently sampled completions is accepted. The authors give the metric as “the probability that at least one of N is correct” (Problem setup, §3, PDF p. 3). Use this when deployment will spend a known sample budget and can automatically check candidates (for example, a compiler, unit tests, or a proof assistant).

how the paper does it. They fine-tune Llama-3-8B-base on 12,000 MATH problems and test on the remaining 500, using direct answers; they avoid the instruction model because of possible MATH leakage (Section 4.1, PDF p. 3). They evaluate after successive epochs at N=1, 16, 256, and 4k. Their finding is that pass@1 rises monotonically, whereas for N≥256 it decreases with additional epochs (Table 1, PDF p. 4). They explain the special case of one problem algebraically: C^N=1−(1−C^1)^N, so increasing C^1 increases every C^N; the failure appears when averaging heterogeneous problems (Section 4.2, PDF pp. 4–5).

evidence and limits. The denominator is the 500-problem MATH test set, with independent sampled completions; the model is Llama-3-8B-base fine-tuned on 12,000 training problems. The authors also report that the pattern holds for Llama-3-70B-base (Section 4.1). Pass@N requires an efficient, trusted verifier; the paper says its strategy “requires a verifier, restricting its applicability to problems where verification is feasible.” (Limitations, §6, PDF p. 10.)

Verus form. Inference: for Verus proof generation, use the Verus verifier as V and sample candidate Rust/proof continuations, running Verus on each candidate. Inference: record pass@N over a fixed benchmark and fixed N, while retaining pass@1 so that a higher single-sample rate is not mistaken for better search coverage. Inference: candidate generation and sampling would require an external harness; this paper does not evaluate Verus.

## technique 2: Direct Coverage Optimization (DCO)

what it is and when to use it. For a training pair (x,y), start with the CE objective and multiply the gradient by the pass@N-derived regularizer. The paper defines the confidence as p̂(y|x), derives F(N,p̂(y|x)), and uses an effective training budget N′. For N=1, F=1 and DCO is CE; for N>1, F falls with p̂ and attenuates updates on confident examples. Use DCO when a known pass@N verifier will be used at inference and diversity among valid candidates matters.

how it is done. (1) Choose N′ close to the intended inference budget. (2) For every training pair, compute the full completion probability p=p̂(y|x), the product of its conditional token probabilities. (3) Use loss −log[1−(1−p)^N′], whose gradient is the CE gradient multiplied by F(N′,p)=N′(1−p)^(N′−1)p/[1−(1−p)^N′] (Equations (3)–(4), §5.1, PDF p. 6). (4) Replace examples whose F is below a threshold to maintain effective batch size; Appendix B sets that threshold to 0.3 for these DCO experiments (PDF p. 19). (5) Apply weighted CE updates and evaluate a range of pass@N values. The caption states: “Note that no N ′ is optimal for all N .” (Figure 2a, PDF p. 7.) The frontier takes the maximum coverage over the trained models for each test N. Figure 6 reports that N′=256 achieves this frontier for 180≤N≤385 (§C.2, PDF p. 22).

evidence and limits. On direct-answer MATH, DCO models improve the CE curve over a broad N range and produce a Pareto frontier (Figure 2a). The curves compare models trained for four epochs at different N′ values; they do not report one universal percentage gain. The pass@N evaluation assumes independent sampling and an oracle verifier, and the authors leave best-of-N and non-mathematical coding tasks for future work (Limitations, PDF p. 10). Inference: a Verus deployment should report the verifier version, candidate timeout, and denominator for every pass@N number because these determine the measured coverage.

Verus form. Inference: implement the model-side objective in the training code, not as a Verus proof obligation. Inference: a generated candidate could be checked with `verus`, while DCO would change the generator’s parameters. Inference: keep the DCO training script and the Verus checker in separate trust boundaries; DCO cannot prove that a specification is the right one.

## technique 3: step-wise DCO for proof trees

what it is and when to use it. In interactive theorem proving, each tactic y[i] is checked before producing the next proof state x[i+1]. The paper first applies whole-proof DCO by replacing p̂(y|x) with the product of tactic probabilities over a successful k-step proof. It then proposes DCOstep, applying F(N_eff,p̂(y[i]|x[i])) independently at each step. N_eff acts as an approximate branching factor: small values favor narrow, deeper trees; large values favor wider, shorter trees.

how it is done. (1) Fine-tune a tactic model on LeanDojo proof states. (2) At each state, compute the selected tactic’s confidence. (3) Apply the Equation (4) regularizer with N_eff. (4) Sample tactic trees at test time, rejecting invalid tactics and stopping at success, timeout, or maximal depth. (5) Try several N_eff values and optionally ensemble their candidate sets. The proof-search protocol and stopping cases are specified in §5.3 (PDF p. 7). The paper relates proof probability to roughly N_eff^(−k) for a k-step proof, making N≳N_eff^k an approximate condition for finding it through sampling. Inference: the approximate scaling describes learned search behavior rather than guaranteeing a branching factor. The training data motivate testing N_eff from 1 to 32: “The mean and median lengths of the proofs in the training set are 4.2 and 2, respectively.” (§5.3, PDF p. 8.)

evidence and limits. On MiniF2F with pass@4k, CE (N_eff=1) succeeds on 37.4%, whole-proof DCO on 38.7%, and DCOstep reaches 39.0% (N_eff=4) or 39.5% (N_eff=8). On Mathlib, CE gives 55.6%; DCOstep gives 56.4% at N_eff=4, 56.1% at N_eff=8, and 56.5% at N_eff=16 (Table 2, PDF p. 8). These are proof success rates under pass@4k. The model is Qwen2.5-Math-1.5B fine-tuned on LeanDojo for three epochs; the Mathlib random test split has 2,000 theorems. The 4k-pass runs also have a 5,000-second limit per theorem and a maximum of 50 proof steps (Appendix B, PDF p. 19). An ensemble of all N_eff values reaches 62.2% on Mathlib and 43.6% on MiniF2F using 5×4k samples, compared with a CE model at 20k samples reaching 57.0% and 39.5% respectively (Table 2). The model, training data, and test budget are therefore part of every number. Inference: these results do not establish that DCO improves arbitrary proof assistants or that five models are cost-effective under a fixed wall-clock budget.

Verus form. Inference: represent each sampled Verus tactic or proof edit as a candidate state transition, invoke Verus after a complete candidate (or after a tool-supported intermediate check), and retain only candidates that verify. Inference: use a bounded search driver outside the verified Rust, while verified code exposes contracts and loop invariants in the usual Verus style. Inference: neural confidence would guide training and search rather than establish a Verus proof obligation.

## technique 4: approximate DCO for chain-of-thought

what it is and when to use it. With a reasoning trace c, the final-answer probability is p̂(y|x)=Σ_c p̂(y,c|x), which is intractable to sum exactly. DCOa estimates this marginal with Monte Carlo samples and feeds the estimate into F. Use it when correctness is judged by the final answer while many traces can reach that answer.

how it is done. Section 5.4 estimates final-answer probability by Monte Carlo marginalization and inserts it into F (§5.4, PDF p. 8). Appendix B describes the implemented batch construction: run online inference on successive batches, discard examples whose estimated success probability exceeds p_thresh, and continue until a full training batch is collected. For N′=64, it uses p_thresh=0.1, corresponding to F below 0.01 (PDF p. 19). Its compute example uses 64 generated traces per problem (PDF p. 20). Inference: reproducing these experiments requires the described filtering, beyond reweighting a fixed batch.

evidence and limits. In CoT MATH experiments, DCOa with N′=64 has lower pass@1 than CE at epochs 3 and 5, but higher pass@1 at epoch 1 (5.0±0.1 versus 4.3±0.1). It has higher pass@16 and pass@64 at all three reported epochs; at epoch 5 the reported values are 7.8±0.1, 42.8±0.5, and 64.3±0.6 versus CE’s 9.9±0.1, 40.9±0.4, and 60.9±0.6 (Table 3, PDF p. 9). The caption defines ± as “standard error of the mean”; the table does not specify evaluation-run counts. GRPO has stronger pass@1 at epoch 5 (14.6±0.1) but falls to 35.4±0.3 at pass@64 at epoch 5, illustrating overconfidence (Table 3).

Verus form. Inference: DCOa can train a generator of alternative Verus proof traces, but only the final Verus check establishes acceptance. Monte Carlo estimates and GRPO rewards stay outside the trusted Verus proof; the checker, specification, external libraries, and compiler remain trusted assumptions.

## technique 5: expert iteration with DCOstep

what it is and when to use it. Appendix C.6 tests one expert-iteration round in addition to the initial training. Inference: this is relevant when successful model-generated proofs can provide further training examples.

how it is done. After initial training, the authors search Mathlib theorems that lack proof traces in the training set: “We use pass@1k to prove those theorems.” (§C.6, PDF p. 25.) Table 6 compares expert iterations 0 and 1 over several test budgets. Inference: the successful proofs supply further training examples; the paper does not specify their count, mixing ratio with the original data, or the full retraining schedule, so a more detailed recipe cannot be recovered from this text.

evidence and limits. On the LeanDojo random test set, expert iteration 0 ensemble reaches pass@4k 62.15%; after iteration 1 it reaches 64.8%. The table’s CE baseline (N_eff=1) is 55.55% at iteration 0 and 58.55% at iteration 1; these are results on the 2,000-theorem random test split. Inference: applying the ensemble convention specified in §5.3, each ensemble entry combines five models with 4k samples per model, so it uses five times the single model’s sample budget. Inference: this gain is specific to LeanDojo and the paper’s harvesting procedure; it does not establish that generated Verus proofs improve without contamination or specification review.

Verus form. Inference: harvest only complete candidates that Verus verifies, version their dependencies, and retrain a generator on proof-state/repair traces. Inference: review contracts and external assumptions when choosing training labels.

## what is proved, measured, and trusted

The paper proves analytic lemmas about the relation between confidence and pass@N under calibration assumptions, and measures benchmark coverage and proof success. Inference: those mathematical statements about sampling do not establish generated-program safety. Inference: interpreting the experiments relies on the benchmark labels, verifier behavior, independent sampling, and implementation accuracy. The paper notes that an error in Theorem 4.2 was corrected in the revised version (Acknowledgments, PDF p. 10), so theorem version and appendix matter.

## techniques for the catalog

- verifier-aligned pass@N: sample N candidates and measure whether an executable verifier accepts at least one
- Direct Coverage Optimization: weight CE gradients by the derived factor F, attenuating updates once completion probability exceeds roughly 1/N
- step-wise DCO: regularize each proof-step confidence so N_eff controls proof-tree branching
- approximate DCO: estimate final-answer confidence by Monte Carlo marginalization over reasoning traces
- expert iteration: search previously untraced Mathlib theorems with pass@1k, then compare one further training round
