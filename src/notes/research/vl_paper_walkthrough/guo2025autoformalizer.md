# Autoformalizer with Tool Feedback
(authored by agents unless marked 🧑)
Tag: `guo2025autoformalizer`, [paper](https://arxiv.org/abs/2510.06857v1)

## scope and result
Autoformalizer with Tool Feedback (ATF) translates informal mathematics into Lean 4 statements using compiler feedback and LLM semantic judgments. The abstract says it “incorporates syntactic and consistency information as tools into the formalization process” (p.1). The required properties are compilation and semantic equivalence: “the translated statements should be semantically equivalent to the original mathematical problems” (§1, p.1). ATF uses cold-start training, expert iteration, and Direct Preference Optimization (DPO), then revises statements using the tools (§3.2, pp.5–6). Its stopping rule is: “The process stops if and only if both the syntax and consistency checks pass” (§3.2, p.5).

## technique 1: compiler syntax checking with pre-check and grouped execution

What it is. The syntax tool uses Lean 4.15 (§3.1.1, p.4). Before compilation it filters missing required libraries, statements lacking the required ending, and unmatched parentheses. Appendix A.1 explicitly lists "Invalid statements that do not end with “by sorry”." (p.12). For batching, “Statements are grouped based on import libraries” and “statements within the same group are concatenated into a single code file separated by namespaces” (§3.1.1, p.4; Figure 3). Results are mapped back by line number.

How to apply it. (1) Check required imports, the statement ending, and balanced parentheses. (2) Group statements by imports. (3) Separate statements with namespaces in a shared file. (4) Compile and map diagnostics to individual statements (§3.1.1, p.4; Appendix A.1, p.12). Appendix A.1 specifies: “we set the batch size to 20 and a timeout of 300s for each execution” and “For batches that encounter exceptions, we conduct individual calls for each statement in the batch to ensure the accuracy of the syntax check” (p.12). On 100K statements using 8 CPUs and 100GB memory, Table 5 reports 6.215 seconds per statement individually versus 0.808 seconds grouped (p.12).

Verus form. Inference: use Verus diagnostics to guide revisions and batch candidates only when diagnostics remain attributable. The paper tests Lean statements with omitted proofs, so its compilation results do not establish that verifier-guided contract repair preserves the intended requirement.

## technique 2: ensemble semantic consistency checking

What it is. The tool judges informal/formal pairs using QWQ-32B and Qwen3-32B. Acceptance requires both judges to report consistency. Appendix A.2 states: “In cases where the two models differ, the response indicating inconsistency is used as the results” (p.12). If both report inconsistency, the QWQ-32B response supplies the feedback. Inference: requiring agreement alone is an incomplete description, because agreement on inconsistency must reject the candidate.

Benchmark construction. The paper samples 800 queries and selects four syntactically valid but semantically inconsistent perturbations per query (§3.1.2, pp.4–5). Appendix A.2 names FormalMATH-All, MiniF2F, and PutnamBench; it selects 100 queries in each of eight domains, uses Gemini-2.5-Pro perturbations, and checks non-equivalence through human verification (p.12). The similarity criterion is internally inconsistent: §3.1.2 says “Character-level similarity with the positive statement is greater than 0.95” (p.5), whereas Appendix A.2 says “we reject perturbations that share a Levenshtein similarity (Zhang et al., 2017) with the original statement greater than 0.95” (p.12). The paper does not resolve this conflict.

How to apply it. (1) Ask both models to compare the informal problem and formal statement, with brief explanations. (2) Accept only if both judge it consistent. (3) Otherwise return an inconsistency explanation. (4) After revision, repeat syntax checking before consistency checking. The training rule states: “Consistency check is only permitted after syntax check passes” (§3.2, p.5). Appendix G.2 instructs the judges: “Do not consider or assess any part of the proof” (p.20).

Evidence. Table 1 (p.5) reports precision/recall of 0.8029/0.6758 for QWQ-32B, 0.7949/0.7367 for Qwen3-32B, and 0.8374/0.5967 for the ensemble. False-positive rates are 0.0829, 0.0950, and 0.0579, respectively. The authors state: “the ensemble vote approach effecively reduces the FPR to below 6%” (§3.1.2, p.5). Inference: the ensemble reduces false acceptance on this benchmark while sacrificing recall; agreement does not guarantee semantic equivalence.

Verus form. Inference: compare a requirement and its generated Verus contract using two semantic judges, requiring both to accept. Treat their feedback as approximate evidence about the contract's meaning, separately from verification of an implementation against that contract.

## technique 3: staged training for tool use and repair

What it is. ATF uses Qwen3-32B and a 178,469-entry subset of NuminaMath-1.5 (Table 2, p.5). Claude-4-Sonnet synthesizes multi-turn tool trajectories. The ordering rule includes: “Syntax check must be invoked first after revision” (§3.2, p.5). About 10% of queries are used for synthesis; paths with more than one revision are upsampled to a 24K cold-start dataset. The authors “mask the losses on tool result tokens in training to prevent the model from directly mimicking the tool executions” (§3.2, p.5).

Expert iteration. The current model attempts the remaining queries, and trajectories violating tool-ordering rules are filtered out. The authors collect successful trajectories with “revision attempts < 8” and merge them with previous rounds' data; failed queries remain for the next round. “We conduct training from the base model in each iteration” (§3.2, p.6).

DPO. Self-sampling on remaining queries produces shorter and longer trajectories for the same query. The authors choose fewer revisions as positive and more revisions as negative, “maintaining their revision attempt difference ≥ 3,” collecting 10K pairs (§3.2, p.6). They additionally mask invocation-related tokens and combine DPO with negative log-likelihood (NLL) on chosen trajectories: “we adopt the DPO loss along with a negative log-likelihood (NLL) loss” (§3.2, p.6). Inference: the stated pair-selection rule is based on revision counts; it does not explicitly require both members to be successful.

How to apply it. (1) Synthesize tool-use trajectories under the ordering rules. (2) Train invocation and repair behavior while masking tool results. (3) Generate, filter, and accumulate successful trajectories, retraining from the base model each iteration. (4) Sample preference pairs with a revision-count gap of at least three. (5) Train with DPO plus chosen-trajectory NLL, masking tool results and invocation tokens (§3.2, pp.5–6).

Verus form. Inference: collect Verus repair trajectories and apply the same training stages. For contract generation, reward fewer revisions only with evidence that the final contract preserves the requirement. This additional semantic condition is a proposed adaptation, not a tested result of this paper.

## techniques for the catalog
- batched compiler feedback: pre-check and group formal statements before compiling, then map diagnostics to each candidate
- ensemble semantic judge: require both LLM judges to accept informal/formal meaning
- staged tool-use training: cold-start, expert iteration, and DPO teach invocation, repair, and fewer repeated errors
- ordered revision loop: syntax first, consistency second, stop only after both checks pass
