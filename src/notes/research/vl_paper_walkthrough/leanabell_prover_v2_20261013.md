# Leanabell-Prover-V2: Verifier-integrated Reasoning for Formal Theorem Proving via Reinforcement Learning
(authored by agents unless marked 🧑)

Audit: audited 2026-10-13 against the paper; checked numbers in Tables 1-6, pages, quotations, steps of techniques 1-7 and Verus forms; fixed unsupported claim that Lean statements are fixed text and a Lean-feedback description, an invented per-failed-trajectory reading of the 32-# budget, an unmarked inference on zero advantage and on the 1.7K/3.8K link, hand-set for pre-defined power values, and removed a wrong doubt about Qwen-2.5-72B; external_body and solver timeouts in Verus forms unchecked.

source: Ji, Liu, Wang, Zhang, Yue, Shi, Sun, Zhang, Zhou, Gai (Kuaishou), arXiv:2507.08649v1, 11 Jul 2025; 24 pages with appendices A-D. Page numbers below are the printed ones.

## what the paper is, in one paragraph

The paper post-trains two existing 7B Lean 4 whole-proof models so that, inside one chain of thought, the model writes a proof, receives the Lean 4 compiler's verdict, and rewrites the proof. The training has two stages: supervised fine-tuning on synthesized failed-then-corrected traces, then reinforcement learning whose reward is the compiler's pass/fail. The abstract's statement of the mechanism: “Leanabell-Prover-V2 directly optimizes LLM reasoning trajectories with multi-turn verifier interactions, together with feedback token masking for stable RL training and a simple reward strategy.” (Abstract, p.1). The two resulting models are called Leanabell-Prover-V2-KM (from Kimina-Prover-Preview-Distill-7B) and Leanabell-Prover-V2-DS (from DeepSeek-Prover-V2-7B) (Section 3.1, p.8).

## what is measured and what stays trusted

Nothing is proved about the method; everything is a pass rate. A problem counts as solved at pass@k when at least one of k sampled proofs compiles in Lean 4.9.0 (Section 3, p.7: “All experimental results are conducted with Lean 4.9.0, using the same testing environment as the DeepSeek Prover series (Xin et al., 2024; Ren et al., 2025).”). Benchmarks: MiniF2F-test, ProofNet-test (186 problems, Section 3.2, p.10) and ProverBench (325 problems, 15 of them from AIME 24 and 25, Table 5 caption, p.13).

Inference: what stays trusted is the Lean 4 kernel with Mathlib, and the formal statements themselves. The training statements come from an autoformalizer, not from humans: “We translate the natural language math problems into formal statements by utilizing the public Kimina-Autoformalizer-7B (Wang et al., 2025).” (Section 2.3, p.7). Inference: a wrongly formalized training statement still gives a valid training signal for proof search (the reward only asks whether the stated theorem is proved), so the method does not depend on the statements being faithful; it would matter only if the same pipeline were used to produce results one relies on.

## technique 1: verifier call inside the chain of thought

what it is: a text protocol that makes the compiler a tool the model addresses in the middle of its reasoning. The model wraps a candidate proof in `<code>` and `</code>`; the harness compiles it and appends the result between `<interpreter>` and `</interpreter>`; the model continues from there. The paper frames the compiler as a tool: “We conceptualize the Lean 4 verifier as a specialized tool that the LLM learns to interact with.” (Section 2.1, p.3).

when to use it: when the model is too weak to get a proof right in few samples and the checker is cheap enough to call per attempt. The paper's motive is small models under a small sampling budget (Introduction, p.2).

how it is done:
1. the prompt asks for step-by-step reasoning and tells the model where code goes and where the compiler output will appear (Figure 2, p.4). The prompt text: “The compilation results will be placed between <interpreter> and </interpreter>.”
2. the model emits its reasoning and a whole proof between the code markers (Section 2.3, RL Framework, p.6)
3. the harness compiles the proof. On success the proof is returned as the answer (Section 2.3, p.6)
4. on failure the harness puts the error text between the interpreter markers, appends it to the previous output, and feeds the whole thing back as the next prompt: “However, for compilation failed cases, we need to place the compilation error information between <interpreter></interpreter> delimiters, then concatenate it with the previous round’s long COT to serve as a reflection prompt for the prover model, acting as input for a new round regeneration.” (Section 2.3, p.6)
5. the error text is short: a failure line, a line number and the compiler message, e.g. `Compilation failed. Find an error at line 12 no goals to be solved` (Figure 4, p.6)

the paper's example (Appendix D, Figures 12-13, pp.22-23): for `Irrational x -> Irrational (x * y)` with `y : ℚ`, `h : y ≠ 0`, the first attempt builds `hy : (y : ℝ) ≠ 0` and calls `hx.mul_rat hy`; the compiler answers with an application type mismatch saying `hy` has the cast type but the uncast one is expected; the second attempt replaces the line with `have hy : y ≠ 0 := h` and compiles.

Verus form. Inference: the protocol carries over unchanged, since Verus is also a batch checker that returns located error text. The unit between the code markers would be a whole Rust file containing the fixed signature with its `requires` and `ensures` plus the candidate body, loop `invariant` and `decreases` clauses, `assert(...) by { ... }` blocks and `proof fn` helpers; the interpreter block would hold the Verus error list (failed postcondition, invariant not satisfied before loop or at end of loop body, failed precondition at a call, failed assertion, with spans). What changes: (a) the paper does not say whether a Lean attempt's statement is checked against the prompt's (the model writes the whole code block, Figure 12), whereas a Verus attempt rewrites the file and can weaken `ensures`, strengthen `requires`, or insert `assume(false)` or `#[verifier::external_body]`; the harness would have to diff the specification and reject those constructs before counting an attempt as a success. (b) the paper's feedback examples (Figures 4 and 12) carry one error message with a line number and no goal state; Verus reports several independent failed obligations at once, so the reflection step may have more than one error to address. (c) a Verus run can time out or flip with small edits; a binary reward then becomes noisy. None of this is in the paper.

evidence: Table 3 (p.12), MiniF2F-test, 32 samples. Scoring only the first code block (“Vanilla”) gives 64.7% for V2-KM and 75.4% for V2-DS; allowing one compiler-feedback round with a rollout size of 1 for it (“32-1”, iteration 1) gives 68.4% and 76.6%. The paper states these differences as 3.7 and 1.2 points (Section 3.1, p.10), which matches the table. The paper does not print the number of MiniF2F-test problems.

limits: the history is concatenated raw, so context grows per round; the paper lists pruning as undone work: “In our verifier-integrated reasoning iteration cycles, we simply concatenate the history of long CoTs and feedback errors in a straightforward manner.” (Section 4, Future Work, p.14).

## technique 2: cold-start data from verified failed-to-corrected pairs

what it is: a way to manufacture supervised traces of the protocol in technique 1 when no model yet produces them. A stronger general model repairs the small model's failed proofs; only repairs that compile are kept.

when to use it: before RL, to teach the output format and a first notion of repair. The paper found a small set enough for format.

how it is done (Section 2.2, pp.3-5):
1. generate several proofs per statement with the base prover (Kimina or DeepSeek 7B)
2. compile them and separate failures from successes
3. give each failed proof with its compiler error to Claude-3.7-Sonnet with a rewrite prompt (Figure 7, p.17). The prompt asks for an error analysis first, then the complete corrected code
4. compile the rewrites and keep those that pass: “Once we obtain rewritten proofs that pass verification, we successfully construct a set of high-quality training data in the form of “incorrect-corrected” pairs.” (Section 2.2, p.4)
5. turn the pairs into four kinds of training sample (pp.4-5), about 7K in total by the paper's counts:
   - failed then corrected, input is the statement, output is reasoning + failed proof + rewritten proof (about 2K)
   - failed then corrected, input is statement + reasoning + failed proof, output is the rewritten proof (about 2K)
   - succeeded, input is the statement, output is reasoning + proof (about 2K)
   - succeeded, input is statement + reasoning, output is the proof (about 1K)
6. fine-tune: batch size 128, learning rate 2e-5, three epochs (Section 2.2, Training Setup, p.5)

Verus form. Inference: the same four steps work with Verus as the filter in steps 2 and 4. A pair would be (file that fails Verus, Verus errors, file that passes) for one fixed signature and specification. Step 4 needs the extra check from technique 1 that the corrected file has the same `requires`/`ensures` and no `assume`, `admit` or `external_body`; the paper does not describe such a check for Lean statements. The "succeeded" samples correspond to files that verify on the first try.

evidence: only a format check is reported: “After this lightweight training, we examine the format of the model’s output and find that the model already satisfy the corresponding formatting requirements.” (Section 2.2, p.5). No pass rate is given for the model after cold start alone, so the paper does not separate the gain of fine-tuning from the gain of RL.

limits: the repair teacher is a much larger closed model; the count of rewrites that failed re-verification is not given.

## technique 3: feedback token masking

what it is: tokens of the compiler output are excluded from the training loss, in both fine-tuning and RL. The model is trained to produce what follows the feedback, not the feedback.

when to use it: whenever a training sequence contains text the model did not and should not generate.

how it is done: in each of the four sample kinds, the span supplied by the verifier is masked from the loss (Section 2.2, p.5, Figure 3): “Given that Lean 4 verification information is not generated by the model itself, we apply a feedback token masking strategy that focuses solely on predicting the rewritten portions, thereby reducing potential interference during the supervised fine-tuning (SFT) stage.” The same mask is kept in RL (Section 2.3, p.7).

Verus form. Inference: identical; mask the Verus diagnostics. Without the mask a model would be rewarded for predicting error messages, including predicting "verified" for its own output.

evidence: none in isolation; the paper has no run without the mask.

## technique 4: RL with pass/fail reward on the multi-turn trajectory

what it is: policy-gradient training (the DAPO algorithm) where one sample is a whole trajectory of technique 1 and the reward is whether the final proof compiles, plus a small reward for obeying the format.

how it is done (Section 2.3, pp.6-7):
1. for each statement sample a group of trajectories (rollout size 24)
2. reward: “The 𝑅format is set to a smaller value (such as 0.2) compared to 𝑅failed /𝑅success (such as 1.0).” (Reward Design, p.7)
3. advantage of a trajectory = its reward minus the group mean, divided by the group standard deviation (Eq. 4, p.7)
4. keep only groups where some but not all trajectories are valid (the constraint under Eq. 3, p.7); Inference: a group with all or none valid has equal rewards and so zero advantage, unless the format reward differs within it
5. optimize the clipped objective with clip ratios 0.2 below and 0.28 above, token-level loss, feedback tokens masked (p.7)
6. during training the model reflects on compiler feedback once per trajectory (Section 3.1, p.9)
7. hyperparameters: maximum token length 16K, batch size 128, learning rate 1e-6, temperature 0.6 for the Kimina model and 0.7 for the DeepSeek model (Training Setup, p.7)

loss aggregation matters (Appendix C, p.21). Averaging the loss per sample and then across samples, as in GRPO, made training collapse; the paper's explanation: “The averaging process effectively reduces the learning signal from longer responses, as each token in these responses contributes less to the overall loss.” Summing over all tokens of the group and dividing by the total token count (DAPO) was stable.

Verus form. Inference: the reward would be that Verus reports zero errors on a file whose specification is unchanged and which contains no assumption escape, the format reward would cover a well-formed file between the markers. A graded reward such as the number of verified functions or the drop in error count is tempting for Verus because its output lists obligations separately; the paper's own attempt at graded rewards did not help (technique 7), which is a caution, not a refutation, for a different verifier.

evidence (MiniF2F-test; the paper's “improvement” figures are differences in percentage points):
- Table 1 (p.11): V2-KM 68.4% at 32 and 70.4% at 128, against its base 63.1% and 67.2%; V2-DS 76.6% at 32 and 78.2% at 128, against its base 75.6% ± 0.5% and 76.2%
- Table 2 (p.12), 32 samples, same RL algorithm and reward with and without verifier feedback: Kimina base 63.1%, vanilla RL 65.5%, this method 68.4%; DeepSeek base 75.6%, vanilla RL 75.6%, this method 76.6%
- ProofNet-test, Table 4 (p.12): V2-KM 13.4% at 32 and 18.2% at 128 against base 10.3% and 11.8%; V2-DS 23.7% and 25.2% against base 23.0% ± 0.4% and 25.4% ± 0.7%
- ProverBench, Table 5 (p.13), all 325: V2-KM 39.8% and 42.9% against base 30.2% and 34.8%; V2-DS 47.8% and 48.7% against base 49.0% ± 0.3% and 50.8% ± 0.5%, i.e. lower than its base. On the 15 AIME problems V2-DS solves 2/15 at 128 against 1/15 for its base

limits: the gain shrinks on the stronger base. The paper's reason: “Therefore, for very strong base models (such as DeepSeek-Prover-V2-7B), our RL framework may suffer from limited active training prompts used during training, making our benefit shows a diminishing trend.” (Section 4, Limitations, p.13). Tables 1, 4 and 5 give the paper's own models as single numbers with no standard deviation. Inference: several DS-base differences (1.0 point at 32 against a base σ of 0.5; ProofNet −0.2 against σ 0.7) are within about two standard deviations of the base model's figure, so they do not establish a difference.

## technique 5: choose training problems by measured pass rate

what it is: a difficulty filter. Only statements the current model solves sometimes are used for RL.

how it is done (Section 2.3, Training Setup, p.7):
1. take natural-language problems (NuminaMath) and autoformalize them
2. with the fine-tuned model, sample 8 proofs per statement and compute pass@8
3. keep the band: “Subsequently, we select formal statements achieving pass rates in the range of 1/8 to 1/2 to constitute our training dataset.”
4. result: 3.8K statements for the Kimina model, 1.7K for the DeepSeek model

Verus form. Inference: for a corpus of Verus tasks (signature + specification, body and proof removed), run the current agent 8 times per task and keep tasks solved 1 to 4 times. Tasks never solved give no reward to learn from; tasks always solved give none either. The same filter is useful outside RL for building an evaluation set that separates agent versions.

limits: the paper names the cost of this filter itself (Section 4, Limitations): problems solved none or all of the time are filtered out, so strong base models have few active prompts. Inference: the 1.7K against 3.8K statements is consistent with this, but the paper does not draw that link. The proposed remedy, giving hints such as decomposed subgoals or partial proofs for never-solved problems (“Partial rollout”, Section 4, pp.13-14), is not implemented.

## technique 6: repeat the verifier round at inference, optionally branching

what it is: at test time, compile after every code block and loop until success or an iteration cap, although training used a single round. Optionally sample several continuations per failed attempt.

how it is done (Section 3.1, pp.9-10; Table 3, p.12): budget “32-#” means, in the Table 3 caption's words, 32 rollouts in the first round, followed by # rollouts in each subsequent verifier calling iteration.

evidence, MiniF2F-test, Table 3: V2-KM with one regeneration per round: 68.4%, 68.8%, 69.2% after 1, 2, 3 rounds; with 4 regenerations and one round: 68.8%. V2-DS: 76.6% in every cell (rounds 1-3 and “32-4”). The paper says of the DS model: “Unfortunately, we do not observe improvements on Leanabell-Prover-V2-DS.” (p.10).

Verus form. Inference: this is the ordinary generate-check-repair loop of Verus agents; the paper adds only that a model trained for one round still gains a little from more rounds when it is weak (0.8 points over two extra rounds) and nothing when it is strong.

## technique 7 (negative result): graded rewards from the proof's tactic trace

what it is: extra reward terms computed from the tactic list with before/after goal states that the Lean tooling returns (Figure 9, p.19), added only when the proof succeeds (Eq. 8, p.20).

the three terms (Appendix B, pp.18-20; the text says five main aspects but describes these three):
- tactic count: Eq. 5 sets the reward equal to the number of tactics
- automation level: the mean of a pre-defined “power” value per tactic (Figure 10, p.20; `ring`, `linarith`, `nlinarith` high, `intro`, `have` low)
- state-change efficiency: per tactic, max(0, 1 − goals after / goals before)

evidence, Table 6 (p.21), Kimina base, MiniF2F-test, 32 samples: base 63.1%; success/failure reward only 68.4%; adding tactic count with weight 1.0 gives 69.2%; automation level 68.0%; state change 67.2%. The paper's reading: “We find that when using 𝑅tactic count , we achieve slight gains, but the other two rewards (i.e., 𝑅automation and 𝑅state change ) both perform slightly worse than using the simple 𝑅failed and 𝑅success reward strategy.” (p.20).

Verus form. Inference: Verus has no tactic trace; the nearest analogues are proof size (lines of `assert` and `proof fn`), number of failed obligations, and solver resource count. The paper's result suggests starting with the binary reward.

## where the paper disagrees with itself

- First-attempt quality. Table 3's “Vanilla” row scores the first code block of the trained model: V2-DS 75.4%, below its base's 75.6% ± 0.5% in Table 1; V2-KM 64.7%, below the 65.5% of vanilla RL in Table 2. Inference: at equal count of first attempts the reported gains over vanilla RL (Table 2) come from the extra compile-and-regenerate round at test time, which costs up to 32 more generations and 32 more compiler calls that the base at “pass@32” does not get. The paper labels both as sample budget 32 (Table 1 caption, p.11, states the one-regeneration setting but not the extra cost).
- The tactic-count reward. Appendix B says fewer tactics indicate better reasoning, but Eq. 5 as printed rewards more tactics, and Eq. 8 adds it with a positive weight. The main text says the graded rewards gave no favorable results (Section 2.3, p.7), while Table 6 shows the tactic-count variant 0.8 points above the binary reward.
- Section 2.2 announces four scenarios; the first two carry the same label (failed, then corrected) and differ only in what is input and what is output.
- Section 3 describes Figure 5's validation curve as pass@32; the figure's axis says “Test Score avg@32”.
- The abstract's “3.2%” and “2.0%” are absolute point differences at 128 samples (70.4 − 67.2 and 78.2 − 76.2), and they match Table 1.

## what was already done, so VL need not redo it

- the tag protocol, the cold-start recipe and the masked, pass/fail-rewarded RL loop are specified well enough above to reuse; code, data and models are stated as released (Abstract, p.1)
- the comparison RL with verifier feedback in context against RL without it under one algorithm and reward exists for Lean (Table 2)
- graded rewards from proof-trace features were tried and did not beat pass/fail (Table 6)
- sample-level loss averaging was tried and collapsed on long trajectories (Appendix C)

Inference: not done, and open for Verus: any of this on program verification, where the model may alter the statement; any measurement at equal total generation and checker cost; any training with more than one feedback round.

## how much this threatens VL

Inference: low and indirect. The paper is about competition mathematics in Lean with 7B models and reports gains of 1 to 5 points on MiniF2F-test, vanishing on the stronger base. It does not touch Rust, specifications or program proofs. Its relevance is as a recipe a competitor (or VL) could apply to train a small, cheap Verus repair model from verifier-filtered traces; the evidence here says such training helps weak models noticeably and strong models little, and frontier general models already do the in-context repair loop without this training.

## techniques for the catalog

- verifier-in-thought protocol: let the model wrap a whole candidate in code markers mid-reasoning, append the checker's verdict in interpreter markers, and continue from the concatenated history
- verified repair pairs for cold start: have a stronger model rewrite failed proofs from their errors, keep only rewrites the checker accepts, and format them as four input/output splits for fine-tuning
- feedback token masking: exclude checker-produced tokens from the loss in fine-tuning and RL so the model learns the repair, not the error text
- pass/fail trajectory reward: reward a multi-turn trajectory 1.0 for a compiling final proof plus about 0.2 for correct format, with group-normalized advantage
- mixed-outcome group filter: train only on prompts whose sampled group has both passing and failing trajectories
- token-level loss for long trajectories: average the policy loss over all tokens of the group, not per sample first, to avoid collapse when lengths vary widely
- pass-rate band selection: keep training problems the current model solves between 1 in 8 and 1 in 2 tries
- test-time feedback rounds with branching: repeat compile-and-rewrite beyond the single round used in training and optionally sample several rewrites per failure
- binary before graded reward: tactic-count, automation-level and goal-reduction reward terms did not reliably beat pass/fail in the paper's test
