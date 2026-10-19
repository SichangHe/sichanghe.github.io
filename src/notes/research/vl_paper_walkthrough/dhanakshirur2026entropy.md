# Entropy Regularization: A Free Correction to Cross-Entropy for Verified Demonstrations
(authored by agents unless marked 🧑)
Tag: `dhanakshirur2026entropy`, [paper](https://arxiv.org/abs/2609.30572)

## problem and formal result
The paper studies learning from correct demonstrations when several outputs may be accepted. Cross-entropy rewards probability on the demonstrated answer; verifier risk measures probability assigned to rejected outputs. The authors explain: “Cross-entropy pertains only to the answer that happened to be demonstrated.” (section 1, p. 2).

The counterexample uses X=N, Y={1,2,3}, a true hypothesis u assigning (1/2,1/2,0), and hypotheses h_g assigning either (5/8,1/8,1/4) or (1/8,5/8,1/4). When all sampled questions are distinct, some g assigns 5/8 to every demonstrated answer, beating u's 1/2 under empirical CE while assigning 1/4 to the rejected answer 3. Proposition 3.2 shows that empirical CE fails to PAC-learn this class (section 3.2, pp. 4–5; Appendix A, pp. 15–16).

The theoretical loss is −log p(y) + λSα(p), where Sα(p)=(Σ_y p(y)^α)^(1/(1−α)), S0(p)=|supp(p)|, and S1(p)=exp(H(p)); H is Shannon entropy. Theorem 4.5 assumes a finite induced support class, a uniform lower bound η>0 on every nonzero probability, and a demonstrator h* in the hypothesis class whose support contains only correct answers. Empirical minimization PAC-learns verifier risk when λm increases to infinity and 0<αm<1 decreases to zero (section 3.1, p. 4; section 4, pp. 6–8). Corollary 4.6 gives λm=m and αm=1/m. The proof sketch states: “This transformation is crucial because even though H may be infinite and cross-entropy may overfit to the sample, the class of functions LH is finite and will generalize as the sample size increases.” (p. 8).

Inference: for VL, the idea concerns training models to produce verifier-accepted Rust programs. It does not establish the correctness of Rust programs, Verus, or their specifications.

## technique 1: diagnose CE/support mismatch
The counterexample illustrates the authors' distinction between probability on the observed answer and probability on all rejected answers (section 3.2, p. 5).

Inference: apply this diagnostic when demonstrations are correct but non-unique:
1. Define the accepted set through the downstream verifier and define risk as the probability of rejection.
2. Compare that risk with CE on demonstrated outputs.
3. Check whether greater likelihood of demonstrations coexists with greater probability of rejection, as in Proposition 3.2.
4. Consider a support-sensitive training penalty if this mismatch occurs.

Verus form: Inference: use Verus acceptance of generated Rust against fixed contracts as the acceptance criterion. Train the probability model externally and evaluate its candidates with Verus.

## technique 2: distinguish the support theorem from practical ER-CE
Theorem 4.5 penalizes Sα, an exponential of Rényi entropy (or of Shannon entropy at α=1). Practical training instead adds Shannon entropy itself to CE at demonstrated response prefixes (section 5, p. 8). Appendix H.1 writes its empirical objective as CE + λRα, using Shannon entropy at α=1 (p. 34). The authors conclude: “Shannon entropy is both the convenient choice and, over the orders we tested, an effective one.” (Appendix H.3, p. 35).

The reported training procedure is:
1. Use a correct demonstration y=(y1,…,yT) for each training problem.
2. At each demonstrated prefix, compute CE for the next demonstrated token and Shannon entropy over the next-token vocabulary distribution.
3. Average CE and the λ-weighted entropy over response positions; mask prompt tokens from both terms (section 5; Appendices D.1, E.1, F.1).
4. Train separate configurations with fixed λ values and compare verifier accuracy. The experiments do not implement the theorem's sample-size schedules.

At 7B, Appendix F.4 computes the loss in chunks of 512 response positions with gradient checkpointing and fp32 intermediates (p. 28). The authors state: “This costs one additional forward pass through the softmax and adds negligible wall-clock time relative to the transformer forward.” This describes additional computation; the study does not independently measure its cost.

Evidence: all main-paper results use greedy Pass@1. GSM8K uses Qwen2.5-1.5B-Instruct with LoRA, 1,000 training problems, 500 evaluation problems, and five seeds: 0.4912±0.0154 at λ=0 versus 0.5816±0.0161 at λ=8 (Table 1, p. 9; Appendix D). MBPP uses the same model size, 300 training problems, 200 evaluation problems, and five seeds: 0.5270±0.0103 versus 0.5710±0.0058 at λ=1 (Table 2, p. 10; Appendix E). MATH uses Qwen2.5-7B-Instruct with LoRA, samples 1,000 training problems before the stated filtering, evaluates 200 MATH-500 problems, and uses three seeds: 0.4200±0.0071 versus 0.4717±0.0118 at λ=4 (Table 3, p. 11; Appendix F). Inference: these differences are 9.04, 4.40, and 5.17 percentage points, respectively.

Inference: for a Verus task, tune the practical Shannon penalty against verifier acceptance. The theorem does not establish that fixed Shannon penalties PAC-learn this task. Keep Verus checks on generated candidates.

## technique 3: evaluate with the task verifier
The main experiments fine-tune on demonstrations, generate one greedy response per problem, and score acceptance across seeds and penalty values (section 5; Appendices D–F).

For GSM8K, Appendix D.4 checks extracted numerical answers using string matching and float tolerance <10^−4 (p. 24). MBPP extracts Python code blocks and executes dataset assertions with a 2-second timeout; exceptions and timeouts count as incorrect (Appendix E.4, p. 26). MATH extracts the last boxed expression, with an explicit final-answer pattern as fallback; it then checks normalization, numerical agreement with tolerance 10^−6, or symbolic equivalence with a 5-second timeout (Appendix F.5, p. 28).

Appendix G also evaluates sampled Pass@1: the fraction of accepted completions, using temperature 0.8, full tempered softmax without top-k or top-p truncation, eight samples per GSM8K problem and four per MBPP/MATH problem. It cautions: “Only T = 1 recovers R(h) exactly.” (Appendix G.1, p. 29). GSM8K's sampled sweep uses three seeds and a coarser λ grid; MBPP and MATH keep their main-paper grids and seed counts.

Inference: for VL, replace these task checks with Verus verification against the intended Rust contracts. Report problems, samples per problem, seeds, model, λ, and decoding settings. Count compilation or proof failures as rejected candidates.

## trusted boundary, limitations, and threat
The guarantee depends on the stated support, probability-floor, and realizability assumptions. Inference: a finite vocabulary and bounded sequence length do not alone establish a uniform positive probability floor over an unrestricted model class. The practical token-level Shannon objective also differs from the theorem's Sα objective and limiting schedules.

The paper reports important limits. On MBPP, accuracy falls from 0.5710 at λ=1 to 0.5380 at λ=6 (Table 2). Appendix H's separate GSM8K ablation uses 200 evaluation problems and three seeds; α=0.25, λ=8 reaches 0.1883 against its own 0.4717 baseline (Table 11, p. 35). The authors caution: “Finally, we have not diagnosed the mechanism of the α = 0.25, λ = 8 collapse, and we report it as an observed instability rather than as a characterized failure mode.” (Appendix H.4, p. 36).

The answer-only GSM8K control reaches 0.1120 at baseline and 0.0560 at λ=8; its small gains at weaker penalties do not survive correction for eight comparisons (Appendix I, pp. 37–38; Table 12). The conclusion states: “Second, we consider only Pass@1, the probability that a single model-generated response is correct.” (section 6, p. 11). Benefits under tree search, majority voting, and Best-of-N remain open.

Inference: objective mismatch may reduce the quality of generated program candidates, and entropy minimization may help in some settings. These results do not replace a sound verifier or specification review.

## techniques for the catalog
- support-mismatch diagnosis — compare demonstrated-output CE with probability of verifier rejection
- entropy-regularized CE — add a response-token Shannon penalty in practice; distinguish this from the theoretical Sα penalty and schedules
- verifier-based evaluation — check outputs and report acceptance with model, data sizes, seeds, and decoding settings

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "To ensure full reproducibility, we detail the hyperparameters, data processing, and evaluation metrics used in our empirical validation."): checked all paper text, study quotations, numbers, section/page references, and technique steps; corrected the counterexample description, separated theoretical Sα regularization from practical Shannon training, added evaluation denominators and reported limitations, and removed unsupported Verus claims; did not reproduce experiments, audit implementation, independently validate proofs, or test the inferred Verus applications.
