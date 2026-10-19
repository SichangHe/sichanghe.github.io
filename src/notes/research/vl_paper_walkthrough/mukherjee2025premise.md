# Premise-Augmented Reasoning Chains Improve Error Identification in Math Reasoning with LLMs
(authored by agents unless marked 🧑)
Tag: `mukherjee2025premise`, [paper](https://arxiv.org/abs/2502.02362)

## scope and central idea

Mukherjee et al. study reference-free checking of mathematical chain-of-thought. They convert a Linear Reasoning Chain (LRC) into a Premise Augmented Reasoning Chain (PARC), a directed acyclic graph whose nodes are steps and whose edges identify the premises used by each step. Their pipeline separates mathematical checks in isolation, logical checks under premises, and graph traversal to identify propagated errors (§§3.1–3.3, pp. 3–5). The authors define the latter: “An accumulation error occurs when a reasoning step is valid in isolation but is built upon one or more erroneous premises from earlier steps.” (§3.3.1, p. 4)

The abstract reports: “The accuracy of error identification improves by 6% to 16% absolute when step-by-step verification is carried out in PARC under the premises.” (p. 1) This is a headline claim, not a range covering every model/dataset result: Table 3 includes a decrease for Llama 3.1 8B on MATH, from 60.2 to 54.88 (p. 8). Inference: the evidence supports an empirical verification aid, not a guarantee of correctness.

## technique: define minimal sufficient premises

What it is. For step s_i, the premise set P_i contains prior steps. The paper calls it “the necessary and sufficient subset of prior steps” (§3.1, p. 3). It requires verifiability, F(s_i | P_i)=1, and minimality: removing any member makes the step unverifiable (§3.1, pp. 3–4). The prompts also allow the question and fundamental mathematical principles as Step 0 (Table 13, p. 17).

How to apply it. Keep the original ordered steps and their indices. For each step, ask which earlier steps and whether Step 0 supply the information needed to verify it. Table 18 specifies: “A step qualifies as a premise if the next step directly relies on information from that step.” It also requires: “A step cannot be a premise to itself” (p. 20). Link the selected premises to the current step. Minimality is a formal requirement; Algorithm 1 does not implement a separate removal test for each selected premise (p. 4).

Evidence and limits. The authors prioritize recall: “Since marking an extra step as a premise will not hurt the verifiability of the step, missing one will hurt its verifiability and all subsequent steps that rely on this step as a premise.” (§5.1, p. 6) Table 1 reports Llama 3.1 70B recall of 97.55, 96.82, 96.73 and 96.46 on GSM8K, MATH, Orca-Math and MetaMathQA respectively. Qwen 2.5 32B and GPT-4o do not exceed 90 on every dataset: their MATH recalls are 88.55 and 89.78 (p. 6). Metrics are computed per data point and then averaged across the dataset (§5.1, pp. 6–7).

Verus form. Inference: represent proof facts and lemmas as nodes, record which premises each obligation uses, and restrict generated proof context to those dependencies. A removal test could investigate whether a selected fact is necessary, but this is a proposed adaptation, not an implemented PARC procedure or a result about Verus.

## technique: aggregative and dyadic premise mapping

What they are. Aggregative mapping asks for all premises of a step using the question, the complete prefix and the current step. The authors describe premises being “collectively identified by querying an LLM with the complete reasoning context up to the step.” (§3.2.1, p. 4) Dyadic mapping instead evaluates each earlier-step/current-step pair, then collects the earlier steps classified as premises (§3.2.2, p. 4).

How to apply them. For aggregative mapping, submit one premise-identification prompt per step and collect the returned step indices. For dyadic mapping, ask whether each earlier step is a premise of the current step and collect positive decisions. The zero-shot aggregative prompt says: “Generate ONLY the premises and nothing else.” Its output format is one premise per line, with a step number and explanation (Table 18, p. 20).

Evidence and limits. On the positive GSM8K split, GPT-4o aggregative mapping has precision 89.38, recall 93.66 and F1 91.47; dyadic mapping has 75.32, 99.01 and 85.55. On synthetic negatives, its F1 falls from 88.72 to 72.84 under dyadic mapping (Table 2, p. 6). These are split-specific premise-identification metrics, averaged per data point, not scores on a split of positive links. The authors report that dyadic mapping has quadratic time complexity in the number of steps and “often led the model to incorrectly classify second- or higher-order dependencies as premises, even when the current step did not directly rely on them.” (§5.1, p. 7) Inference: the GPT-4o example shows a recall/precision tradeoff; it does not establish that dyadic mapping always increases recall.

Verus form. Inference: aggregative mapping could select a set of proof facts in one pass; dyadic mapping could propose dependencies by testing pairs. Neither proposal establishes that the selected facts suffice for a Verus proof. The resulting obligations still need verification.

## technique: separate native and accumulation errors

What it is. The paper defines native errors as faults inherent to the current step, including mathematical errors and logical inconsistencies. An accumulation error is locally valid reasoning built on an incorrect premise (§3.3.1, p. 4).

How to apply it. First test mathematical correctness using the current step alone. Then test logical consistency under the selected premises and question, assuming the premises are correct. Table 17 states: “You should not check whether the premises are correct, assume they are correct.” (p. 19) Algorithm 1 combines the mathematical and logical error decisions, then assigns accumulation errors to otherwise correct steps with an incorrect premise (p. 4). The prose specifies: “A Depth-First Search (DFS) traversal is performed” (§3.3.2, p. 5).

Evidence and limits. Figure 2 illustrates a gas-law solution with a mathematical error at step 6 and an accumulation error at step 7 (p. 5). For evaluation, the authors “merge these two error categories into a single error type Error, while keeping Accumulation Error separate.” (§5.2, p. 7) The two merged categories are Mathematical Error and Logical Inconsistency. Table 5 reports Llama 3.1 70B accumulation-error accuracy on the GSM8K negative split rising from 12 with full context to 57.54 with model premises, while correct-step accuracy falls from 96.79 to 88.78 (p. 8).

Verus form. Inference: keep separate records for an obligation's local validity under assumed premises and for whether those premises have been established. A locally valid conditional argument can remain unusable when a required premise fails. The paper does not test this mapping to Verus.

## technique: premise-conditioned error identification

What it is. The baseline is a zero-shot classifier that receives the question, prior solution and current step, with definitions of the error types. PARC instead separates mathematical and logical checks as above and derives accumulation labels from the dependency graph (§3.3.2, p. 5; Tables 14–17, pp. 18–19). Thus, accumulation classification in PARC is a graph operation following local checks.

How to apply it. Extract premises, run the separate local checks, and propagate incorrect-premise status through the graph. Compare either model-generated premises or the dataset's oracle premise annotations. These oracle annotations were generated by o1-Preview, with a subset manually inspected; they are not wholly human-authored ground truth (§4, p. 6). The authors describe the end-to-end setting as “first identifying the relevant premises and subsequently utilizing them.” (§5.2, p. 7)

Evidence and limits. The authors “first normalize the accuracy by the number of steps in a datapoint, and later normalize across the dataset.” (§5.2, p. 7) Table 3 reports GPT-4o average accuracy under full context versus model premises as 68.52 versus 79.82 on GSM8K, 66.52 versus 76.45 on MATH, 68.55 versus 72.96 on Orca-Math, and 69.41 versus 79.41 on MetaMathQA (p. 8). The table does not specify per-split item counts or a formula for the overall Avg column. The paper acknowledges “a drop of accuracy for correct steps” under premise-based checking (§5.2, p. 7).

Table 4 compares oracle and model premises. GPT-4o oracle-premise averages are 78.74, 76.79, 75.56 and 82.88 on the four datasets; model-premise averages are 79.82, 76.45, 72.96 and 79.41 (p. 8). Inference: the oracle/model gap depends on the dataset; oracle premises do not uniformly improve accuracy.

ProcessBench checks identification of the first incorrect step rather than subsequent accumulation errors: “For incorrect solutions, the task is to identify the first incorrect step in the chain; all subsequent steps are automatically deemed irrelevant by design of the benchmark.” (§5.3, p. 9) On its GSM8K split, Qwen 2.5 32B F1 rises from 59.8 to 70.0 and Llama 3.1 70B from 66.1 to 78.6; Qwen 2.5 7B falls from 47.2 to 47.0 and Qwen 2.5 72B from 75.6 to 74.1 (Table 6, p. 9). On MATH, Table 7 reports Qwen 2.5 32B F1 of 35.9 versus 66.5 and a displayed delta of +30.7; Llama 3.1 70B has 32.6 versus 58.3 and +25.7 (p. 9). Inference: the rounded Qwen values subtract to 30.6; the study preserves the table's reported delta rather than resolving that discrepancy.

Verus form. Inference: use premise links to construct proof obligations with explicit assumptions, then verify those obligations and their dependencies. Treat natural-language error labels as diagnostics. PARC's empirical classification results do not establish the correctness of a generated Rust specification or proof.

## datasets, trust and VL implications

PERL uses GSM8K, MATH, Orca-Math and MetaMathQA. Section 4 describes source datasets of 8,500, 12,500 and 200K problems for the first three respectively (p. 5). It describes sampling 1,000 examples from the test splits of GSM8K/MATH and training splits of Orca-Math/MetaMathQA, generating chains with Llama-3.1-8B-Instruct, selecting 50 positive and 50 negative chains, and creating further negatives with GPT-4o. The authors explain: “When introducing errors, we ensured that the subsequent steps were appropriately modified to reflect the impact of the initial error.” (§4, p. 6) Appendix A.2 reports 607 retained chains: 203 positive, 214 negative and 190 synthetic negative (p. 14).

For annotations, the authors use o1-Preview for both premises and errors. They report two authors inspecting 10% of generated data. Among 71 inspected samples, they report: “only 4 out of 71 had a discrepancy and 5 out of 71 had issues in error annotations.” The first count concerns premises, the second errors (§4, p. 6). These are the paper's reported sampling figures; it does not reconcile 71 inspected samples with the final 607-chain total. The authors also report: “The average performance of all models on synthetically generated negatives is consistently higher compared to the performance on true negatives” (§5.2, p. 8). Inference: synthetic perturbations and model-generated reference labels limit what these results establish about naturally occurring errors.

The paper mentions formal proof assistants as an alternative, but says this “requires a challenging auto-formalization of natural language text” (§1, p. 2). Inference: in VL, PARC could organize proof obligations and explain error propagation, while Verus checking remains necessary. Premise extraction cannot by itself establish that a specification captures the intended behavior or that every required assumption has been justified.

## techniques for the catalog

- minimal premise extraction: identify necessary and sufficient premises and represent their dependencies as a DAG
- aggregative mapping: request all premises for a step using its question and complete prefix
- dyadic mapping: evaluate earlier-step/current-step pairs separately, then collect the predicted premises
- native and accumulation taxonomy: separate local mathematical or logical faults from errors inherited through incorrect premises
- premise-conditioned verification: check calculations in isolation and logic under premises, then traverse dependencies to label accumulation errors

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For incorrect solutions, the task is to identify the first incorrect step in the chain; all subsequent steps are automatically deemed irrelevant by design of the benchmark."): checked every study quotation, number, section/page reference and technique against the full paper, including references and appendices; corrected recall claims, page references, premise-label provenance, averaging descriptions, unsupported procedure steps and claims of uniform improvement; marked Verus adaptations and other conclusions as Inference; did not reproduce experiments, inspect code or independently validate annotations or Verus proposals.
