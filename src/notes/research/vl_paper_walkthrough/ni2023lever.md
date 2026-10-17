# LEVER: Learning to Verify Language-to-Code Generation with Execution
(authored by agents unless marked 🧑)
Tag: `ni2023lever`, [paper](https://arxiv.org/abs/2302.08468)

## purpose and scope

LEVER is a learned reranker for language-to-code generation. It samples programs from a code language model, executes each program, predicts correctness from the natural-language task, program text, and execution result, then combines verifier and generator probabilities. It also aggregates candidates with identical execution results. The method is execution-based assessment, not formal verification: the paper explicitly says, in a footnote to the introduction, “Following Cobbe et al. (2021), by “verifying” we mean assessing whether a program’s functionality matches its programmer’s intent. This is distinct from the notion of formal verification in programming languages” (footnote 2, p. 2).

## technique 1: sample, execute, and deduplicate

The paper summarizes the pipeline as: “It consists of three steps: 1) Generation: sample programs from code LLMs based on the task input and few-shot exemplars; 2) Execution: obtain the execution results with program executors; 3) Verification: using a learned verifier to output the probability of the program being correct based on the NL, program and execution results” (Figure 1, p. 2).

What it is. Given input x, draw k programs with temperature sampling, execute each, and deduplicate to a set S of n unique programs. The paper chooses sampling over beam search because beam search can produce degenerated programs and is “not available or efficiently implemented for all LLMs that we test on (e.g., Codex)” (Section 2.2, pp. 2–3).

How to do it.
1. Build the few-shot prompt and sample `{ŷ_i}_{i=1}^k ~ P_LM(y|x)` (Section 2.2, p. 2).
2. Remove duplicate program strings to obtain S (Section 2.2, p. 2).
3. Execute every candidate and retain its result, including explicit error strings such as `ERROR: Time out`; the paper writes errors as “ERROR: [reason]” (Section 3.4, p. 5).

Verus form. Inference: this is an executable candidate-generation stage; a verified Rust wrapper can model each candidate as a struct containing source, result, and error status, then prove bookkeeping properties such as deduplication preserving at least one representative. Inference: execution itself is an external interpreter and must be treated as a trusted boundary unless separately verified.

Evidence and limits. The paper says, “The key observation motivating our method is that a reasonably large sample set from P_LM(y|x) often includes the correct programs” (Section 2.2, p. 2). Inference: if sampling never produces a correct program, reranking cannot recover one; the paper's “Oracle” always selects a correct program if one appears in the sample set (Section 4.2, p. 6), and it names the absence of any correct sample as the most common failure, “upper-bound is reached” (Section 5.4, p. 8).

## technique 2: execution-aware verifier

What it is. Train a binary classifier `P_theta(v | x, ŷ, E(ŷ))`, where v=1 means the candidate is correct. The input is a concatenation of task description, candidate source, and execution result; implementations use T5 or RoBERTa (Section 2.2, p. 3).

How to train it.
1. For every training input, sample and deduplicate candidate programs (Section 2.3, p. 3).
2. Compute `ẑ = E(ŷ)` and label `v = 1(ẑ = z*)`; for multi-test-case datasets, all test-case results must match the ground-truth result (Section 2.3 footnote, p. 3).
3. If a gold program exists, append `(x,y*,z*,v=1)`; omit this step for weakly supervised datasets (Section 2.3, p. 3).
4. Optimize the normalized negative log-likelihood `L_theta(x,S) = -(1/|S|) Σ log P_theta(v_i|x,ŷ_i,ẑ_i)` (Equation 4, Section 2.3, p. 3). The paper says normalization prevents examples with many unique candidates dominating learning (Section 2.3, p. 3).

Verus form. Inference: the classifier can be treated as an untrusted suggestion whose output is checked by a verified semantic checker; a Verus proof should never equate a probability score with correctness. Inference: encode the executable checker as a function with postconditions relating accepted results to a specification, and keep model training ghost or external.

## technique 3: joint reranking and execution-result aggregation

What it is. The candidate score is the product `P_R(ŷ,v=1|x) = P_LM(ŷ|x) · P_theta(v=1|x,ŷ,E(ŷ))` (Equation 3, Section 2.2, p. 3). Candidates with the same execution result are then summed: `R(x,ŷ) = Σ_{y∈S,E(y)=E(ŷ)} P_R(y,v=1|x)`; the highest-scoring result wins, with random tie breaking (Section 2.2, p. 3).

How to apply it.
1. Compute generation probability and verifier probability for every unique candidate (Equation 3).
2. Group candidates by exact execution result (Section 2.2, p. 3).
3. Sum joint scores inside each group and select a program from the highest-scoring group (Section 2.2, p. 3).
4. Evaluate with execution accuracy: the fraction of examples yielding the gold result or passing all test cases (Section 3.3, p. 4).

Verus form. Inference: exact result equality is safe only when the result representation is canonical; for structured results, prove an equivalence relation and aggregate by its canonical form. Inference: a verified implementation can prove that aggregation preserves the selected result, but it cannot prove the learned score is calibrated without assumptions about the model.

Evidence. The paper reports that execution results are crucial: removing them caused absolute drops of 6.6% on WikiTQ, 5.6% on MBPP, 3.0% on Spider, and 1.2% on GSM8k in the Codex-Davinci ablation (Section 4.2, p. 6). The paper reports these as absolute performance drops. It also says aggregation works well on Python-output datasets but only marginally benefits the SQL datasets, because an incorrect SQL program may execute to a trivial wrong result (e.g., “0” or empty table), and “such incorrect results may accumulate enough probability mass to out-weight the correct one” (Section 4.2, pp. 6–7).

## technique 4: weak supervision and calibration analysis

The method works without gold programs when a gold execution result is available: labels compare candidate execution to the result, and the paper reports an absolute drop of at most 1.1% in weakly supervised settings (Section 4.2, p. 7). Inference: this is useful when source-level specifications are unavailable but an executable oracle exists.

For calibration, sort generator, verifier, and combined scores; threshold at successive percentiles; and measure the percentage of correct programs remaining (Section 5.3, p. 8). The paper finds verifiers are generally better calibrated than generators in the lower percentiles but poorly calibrated among top-ranked programs on three of four datasets, while the combined probability “yields the best results on all four benchmarks” (Section 5.3, p. 8). Inference: use this analysis to choose a score threshold, but do not interpret calibration as a proof of semantic correctness.

## evidence and failure modes

With Codex-Davinci, LEVER improved greedy baselines by 6.6% on Spider to 17.3% on WikiTQ and achieved state-of-the-art results on all four datasets, with gains over previous best systems of 1.2% on WikiTQ to 2.0% on MBPP (Section 4.1, p. 5; I did not reproduce the 17.3% figure from Table 3, which shows Greedy 49.6 to LEVER 64.6 on dev and 53.0 to 65.8 on test). On the dev sets for InCoder-6B and CodeGen-16B, LEVER scored 54.1/11.9 and 51.0/22.1 on Spider/GSM8k, respectively, while the oracle upper bounds were 71.6/48.0 and 68.6/61.4 (Table 6, p. 6). These are dev-set execution accuracy percentages with T5-base as the verifier (Table 6 caption); Table 1 lists 1,032 Spider and 1,448 GSM8k dev examples.

The method is sensitive to inference sample size: reducing samples from 50 to 10 lowered performance by 1.8% on Spider to 5.2% on WikiTQ, while training sample size had gaps below 1% across three datasets (Section 5.2, p. 7). The main failure is absence of a correct candidate; another is an incorrect candidate with execution results of the same type and range as the correct one (Section 5.4, p. 8).

## techniques for the catalog

- execution-aware candidate sampling: sample, execute, and deduplicate multiple generated programs
- learned verifier: classify correctness from task, source, and execution result
- joint reranking: multiply generation and verification probabilities and select the highest score
- execution-result aggregation: sum scores for candidates with equivalent execution outcomes
- weakly supervised verifier training: label candidates from gold execution results without gold source
- calibration and oracle-gap analysis: measure score quality, sample sensitivity, and whether a correct candidate exists
