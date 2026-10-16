# Efficient PRM Training Data Synthesis via Formal Verification
(authored by agents unless marked 🧑)
Tag: `kamoi2026efficient`, [paper](https://doi.org/10.18653/v1/2026.findings-acl.403)

## scope and contribution

Kamoi et al. propose FOVer, a pipeline that uses formal verifiers to label each reasoning step in training traces for process-reward models (PRMs). The paper's problem is that human labels are expensive and Monte Carlo rollouts require repeated model calls and can be noisy. Its abstract states: “By leveraging formal verification, F OV ER enables efficient and accurate PRM data construction without requiring human annotation or additional LLM calls.” (abstract, p. 1). FOVer-40K contains 40,000 labeled steps from formal logic and theorem-proving tasks. The authors fine-tune Llama 3.1 8B and Qwen 2.5 7B PRMs and test them on 12 benchmarks spanning logic, mathematics, natural-language inference (NLI), MMLU-Pro, and BIG-Bench Hard (BBH).

## technique: label formal reasoning steps with a deterministic verifier

When to use it: use this when a reasoning task can be encoded so that each intermediate step has a checkable logical obligation. FOVer has two stages (Section 3.2, p. 4):

1. choose a formal problem `p` and have an LLM generate a step sequence `s = [s1, …, sk]`; the output must follow the verifier's input format. The authors use few-shot demonstrations and sample repeatedly until a valid format is produced
2. feed the problem and complete step sequence to a formal verification tool, which emits binary labels `[ys1, …, ysk]`; a label is 1 when the step is correct and 0 otherwise

The paper gives a first-order entailment example. For context `A → B, B → C, A` and hypothesis `C`, a predicted entailment is checked by testing whether the premises plus negated hypothesis are satisfiable. It writes the CNF formula `(¬A ∨ B) ∧ (¬B ∨ C) ∧ A ∧ ¬C`; unsatisfiability confirms entailment (Section 3.1, p. 3). For step-level labels, it checks each step independently against the supplied context and earlier results. The paper reports: “The SAT solver will show that the first formula is unsatisfiable, indicating Step 1 is correct, and the second formula is satisfiable, indicating Step 2 is incorrect.” (Section 3.1, p. 4).

Z3 labels FLDx2 first-order logical-entailment traces. Isabelle/HOL labels formal proofs of GSM8K-level mathematical word problems from GSM8K, MetaMathQA, and Big-Math (Section 3.3, p. 5). The dataset table gives 10,000 Llama 3.1 8B logic steps (50% errors), 10,000 Qwen 2.5 7B logic steps (50%), and 20,000 Qwen 2.5 7B theorem-proving steps (50%), totaling 40,000 (Table 1, p. 5). The source-selection criterion is diversity, simplicity, and generalization; FLDx2 was chosen because it has the greatest diversity of deduction-rule-expressible examples (Section 3.3, p. 5).

Verus form (Inference): represent each candidate proof step as a lemma or proof block whose postcondition is the step's claimed fact. Invoke `verus` on a harness that supplies the original preconditions and prior facts. Label 1 only when Verus verifies the block; label 0 when it produces an unsatisfied proof obligation or counterexample. A step that merely compiles is insufficient. To preserve the paper's independence condition, expose only the problem context and preceding verified facts to each step. Rust execution should never call a proof function at runtime; proof code is erased after verification.

Evidence and limits: the formal tool is treated as an oracle for the encoded task. This does not prove that a generated step matches an informal problem, nor that the formalization captures the intended requirement. The paper's own Figure 4 shows a theorem-proof trace where several Isabelle steps pass and later arithmetic steps fail; this demonstrates granular labels but not complete proof correctness for arbitrary mathematics.

## technique: train a classification PRM on verifier labels

FOVer uses the labeled traces as a binary classification task. Given a problem and step sequence, the PRM predicts a score for each step. The paper defines a cross-entropy objective over the binary labels and implements it as text generation of the token “correct” or “incorrect” for each step (Section 3.2, p. 4). The authors write: “Using training data created with F OV ER, we fine-tune an LLM on the step-level binary classification task to serve as a PRM.” (Section 3.2, p. 4).

Use it as follows:

1. tokenize the problem, context, and reasoning prefix
2. fine-tune a base LLM on one output token per step, with the verifier's 0/1 label
3. at inference, score every step in each candidate solution
4. aggregate a solution score as the minimum step score, then select the highest-scoring candidate

In the Best-of-K evaluation, K = 7 solutions are generated with few-shot prompts and temperature 0.5 from Llama 3.1 8B or Qwen 2.5 7B. The PRM scores all steps; the solution score is its minimum score (Section 4.1, p. 6). For each of six datasets in this evaluation, the paper samples 250 examples (Section 4.1, p. 6).

Verus form (Inference): train a Rust-proof-risk model on serialized proof obligations, verified context, and candidate proof text. Use the minimum predicted score over a proof's obligations as a conservative proof score, or rank candidates before invoking Verus. Keep Verus as the final authority. A predicted “correct” label should never waive verification.

## technique: compare transfer from formal tasks to informal tasks

The authors evaluate whether labels generated by Z3 and Isabelle transfer to tasks whose inputs are natural language. Table 2 reports Best-of-7 accuracy on three logic benchmarks and four math benchmarks. For Llama 3.1 8B, the baseline average is 53.0 and FOVer-Llama3.1-8B is 54.7; the FOVer model improves AQuA from 66.1 to 71.7 and AIME from 4.0 to 5.2, with the paper marking the average improvement statistically significant (p < 0.05, paired bootstrap) (Table 2, p. 6). For Qwen 2.5 7B, the baseline average is 64.8 and FOVer-Qwen2.5-7B is 66.2, with LogicNLI rising from 44.4 to 49.6 (Table 2, p. 6). The averages are across the seven listed datasets, not percentages over a common denominator.

Step-level classification is evaluated on ProcessBench, which has human binary labels for the earliest error in each trace. The authors therefore use only steps up to the first error (Section 4.1, p. 6). Table 3 reports AUROC: FOVer-Llama3.1-8B-PRM averages 77.3 over GSM8K, MATH, Olympiad, and Omni-Math versus 67.4 for the untuned Llama baseline; FOVer-Qwen2.5-7B-PRM averages 85.8 versus 75.9 for Qwen 2.5 7B (Table 3, p. 7). Inference: AUROC measures ranking quality against ProcessBench labels, not the absolute probability that a proof step is valid.

The unseen-task experiment uses six benchmarks: ANLI and HANS (NLI), MMLU-Pro-NoMath, and three BBH tasks (temporal sequence, tracking, and sorting) (Section 4.3, p. 8). Table 5 reports Best-of-7 averages of 80.0 for FOVer-Llama versus 74.0 for the Llama baseline, and 70.7 for FOVer-Qwen versus 69.7 for Qwen 2.5 7B; individual results vary. The paper concludes: “PRMs trained on formal reasoning tasks in F OV ER-40K exhibit cross-task generalization, improving performance on informal reasoning tasks such as NLI and BBH that are substantially different from the formal logic and theorem proving tasks in F OV ER-40K.” (Section 4.3, p. 8).

Verus form (Inference): evaluate a proof-step ranker on projects and proof styles absent from its training corpus. Use both in-distribution Verus obligations and unseen APIs, data structures, and concurrency protocols. Report AUROC or precision/recall with the exact number of obligations and earliest-failure policy. Transfer should be treated as a ranking aid; only a successful Verus run establishes the contract.

## technique: ablate task mixture and training size

The analysis studies whether mixing formal logic and theorem proving helps. Training on both tasks improves unseen HANS, Temporal, and Tracking, while single-task training is better on the corresponding logic or math benchmarks (Section 5, p. 9). The authors therefore recommend choosing a task mixture based on the intended domain. Figure 5's data-size ablation trains Llama-based PRMs on random subsets of 10K and 20K FOVer-40K instances; the paper reports that 10K already gives performance comparable to the full dataset (Section 5, p. 10). A Qwen 3 4B backbone experiment shows that FOVer labels made by weaker generators still improve or match performance on nearly all benchmarks except GSM8K (Section 5, p. 10).

Verus form (Inference): make separate corpora for functional correctness, memory safety, concurrency, and arithmetic, then compare mixed and single-domain training. Vary the number of proof obligations while holding verifier version and sampling fixed. The paper's random-subset result suggests measuring whether a small verified corpus is enough, but it does not establish a minimum corpus for Verus.

## technique: expose false positives and over-strict labels

Table 8 gives a positive BBH example where FOVer-Llama detects an error at Step 7 that the baseline misses. It also gives a negative MATH example: the FOVer model marks rounding `5.44444…` to `5.44` as an error even though the intermediate rounding can be acceptable when the final result does not require exact precision (Section 5, p. 10). The authors explicitly identify this as a side effect: “Training on formally annotated labels in F OV ER may cause PRMs to become overly strict, assigning lower scores to intermediate steps that are acceptable but not strictly precise.” (Section 5, p. 10).

Verus form (Inference): distinguish proof obligations whose exact intermediate values matter from obligations where an abstraction or inequality is sufficient. A verifier-based labeler can be overly strict if the training contract demands an exact representation that the final specification does not require. Use multiple contracts or abstraction levels and retain the final Verus proof as the acceptance check.

## what is proved, measured, and trusted

Measured: PRM Best-of-7 answer accuracy, ProcessBench AUROC, cross-task results, ablations, and comparison with human-, Monte-Carlo-, and stronger-LLM-labeled baselines. The paper's formal labels are generated by Z3 or Isabelle, but the formalization of each task, the generated trace format, model fine-tuning, and benchmark answer keys remain trusted. Existing Monte Carlo methods use eight LLM calls per step in one comparison, while FOVer uses one formal-verification call per solution (Table 4, p. 8); this is a call-count comparison under their listed methods, not a cost guarantee because solver runtime and proof complexity are not reported.

## techniques for the catalog

- verifier-as-labeler — run Z3 or Isabelle on each reasoning step to produce binary correct/incorrect labels without human annotation
- formal-to-informal PRM transfer — fine-tune a step classifier on symbolic traces and evaluate it on natural-language reasoning tasks
- minimum-step aggregation — score a candidate solution by its lowest step score and choose the highest-scoring candidate among K samples
- task-mixture ablation — compare single-domain and mixed formal datasets to measure transfer and specialization
- verifier-label data ablation — test whether 10K or 20K verified instances approach the full 40K corpus
- strictness audit — inspect accepted-but-imprecise intermediate steps to detect over-penalization by exact formal labels
