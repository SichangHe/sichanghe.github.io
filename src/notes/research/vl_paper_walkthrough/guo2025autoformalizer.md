# Autoformalizer with Tool Feedback
(authored by agents unless marked 🧑)
Tag: `guo2025autoformalizer`, [paper](http://arxiv.org/abs/2510.06857v1)

## scope and result
Autoformalizer with Tool Feedback (ATF) trains a model to turn informal mathematics into Lean 4 statements while consulting syntax and semantic-consistency tools. The authors define two requirements: syntactic validity means the statement compiles, while semantic consistency means it is equivalent to the informal problem (§1, p.1). ATF has a cold-start phase for tool-call behavior, expert iteration for formalization ability, and DPO to reduce ineffective revisions (§3, pp.3–5). Its final statement is accepted only after both tools pass.

## technique 1: compiler syntax checking with pre-check and grouped execution

What it is. The syntax tool runs Lean 4 compiler checks but first filters obvious errors such as missing imports and unmatched parentheses. It then groups statements by import library, concatenates them in namespaces, executes one file, and maps line-number diagnostics back to individual statements (§3.1.1, p.4; Figure 3). The implementation uses Lean 4.15 (§3.1.1, p.4).

How to apply it. (1) Pre-check imports and delimiter balance (§3.1.1, p.4). (2) Partition statements by imports (§3.1.1, p.4). (3) Concatenate each group with namespace separators (Figure 3, p.4). (4) Compile the grouped file. (5) Map compiler line ranges to source statements and return detailed errors (§3.1.1, p.4). During generation, syntax must be called first after every revision (§3.2, p.5).

Verus form. Inference: replace the Lean compiler with `verus`/cargo verification and preserve pre-checks for imports and syntax. Return verifier diagnostics, failed assertions, and contract errors to the model. Verus does not expose the exact namespace batching API described here; a VL implementation can batch crates or modules only if diagnostics remain attributable. A compile pass establishes type and verification acceptance, not that the contract states the intended requirement.

## technique 2: ensemble semantic consistency checking

What it is. The consistency tool receives an informal/formal pair and returns a decision with a concise explanation (§3.1, p.3). The authors build 800 benchmark queries, each with one valid positive and four perturbations selected for character similarity greater than 0.95, syntactic validity, and semantic inconsistency (§3.1.2, p.4). They ask QWQ-32B and Qwen3-32B to judge, and accept only when both agree (ensemble vote, §3.1.2, p.4).

How to apply it. (1) Construct near-identical negative formalizations that change meaning (§3.1.2, p.4). (2) Prompt two independent judge models with the informal statement and candidate formal statement. (3) Accept consistency only when both outputs agree (§3.1.2, p.4). (4) Use the decision as feedback to revise the candidate; keep syntax before semantics in the loop (§3.2, p.5).

Verus form. Inference: compare the natural-language requirement with a Verus contract using two independent semantic judges, then require agreement before allowing a proof to count. The judges are a heuristic and cannot replace a proof of equivalence to an authoritative requirement. A Verus proof can certify the generated contract while both judges miss a domain change.

Evidence. On the 800-query benchmark, QWQ-32B precision/recall are 0.8029/0.6758, Qwen3-32B 0.7949/0.7367, and ensemble precision/recall 0.8374/0.5967; ensemble FPR is 0.0579 versus 0.0829 and 0.0950 for the single models (Table 1, p.4). The authors report that “the ensemble vote approach effecively reduces the FPR to below 6%” (§3.1.2, p.4). Recall drops, so this tool is conservative.

## technique 3: staged training for tool use and repair

What it is. The training data is a 178,469-entry subset of NuminaMath-1.5 (Table 2, p.5). Cold start uses Claude-4-Sonnet to synthesize multi-turn tool trajectories. Rules require syntax after every revision, consistency only after syntax passes, and termination only when both pass (§3.2, p.5). About 10% of queries are synthesized, and trajectories with more than one revision are upsampled to a 24K cold-start set; tool-result tokens are loss-masked (§3.2, p.5).

Expert iteration runs the current model on remaining queries, retains successful trajectories with fewer than eight revisions, merges them with previous data, and retrains from the base model each iteration (§3.2, p.5). DPO samples trajectories from the remainder, chooses a trajectory with fewer revisions as positive and one with at least three more revisions as negative, producing 10K pairs; tool-result and invocation tokens are masked, and DPO is combined with NLL (§3.2, p.5).

How to apply it. (1) Synthesize valid and failed tool-call trajectories. (2) Fine-tune tool-call format and revision behavior on cold-start data. (3) Iterate formalization and retain successful short trajectories. (4) Pair short/long trajectories with revision gap at least three. (5) Optimize DPO plus NLL to discourage repeated errors (§3.2, p.5).

Verus form. Inference: collect verifier-error trajectories from Verus, train a model to call verifier tools and revise contracts, then use preference pairs that reward fewer revisions only when the final contract still passes independent semantic review. Do not train on verifier output tokens as if they were model reasoning; the paper’s masking rule is directly relevant.

The abstract describes ATF as a system that “incorporates syntactic and consistency information as tools into the formalization process” (abstract, p.1). It reports that “ATF markedly outperforms a range of baseline formalizer models” (abstract, p.1).

## evidence, trust, and VL risk
ATF-32B Pass@1 syntax/consistency is 97.94/94.51 on FormalMath-Lite, 94.29/89.78 on ProverBench, and 86.69/65.38 on out-of-distribution CombiBench (Table 3, p.6; denominator is benchmark queries under one sampled output). Pass@16 reaches 100.00/99.52, 100.00/98.70, and 100.00/96.00 respectively (Table 3, p.6). Human evaluation of 100 instances per benchmark by three experts gives ATF-32B 98/95, 94/85, and 90/49 syntax/consistency percentages (Table 3, p.6). The paper reports Pearson correlation 0.746 between consistency-tool and human results (§4.2, p.7).

Ablation shows cumulative effects: on CombiBench, full ATF consistency rises 42.44% cold-start, 63.88% after expert iteration, and 65.38% after DPO; syntax-only ends at 41.68%, no-tools at 23.69% (Table 4, p.8). Average tool calls are 8.35 on CombiBench and 3.19 on FormalMath-Lite; consistency success falls from 69.5% on the first attempt to 8.8% on the eighth (Figure 5, p.9). These numbers show scaling and diminishing returns, not universal correctness.

The trusted base includes Lean compiler behavior, the two judge models, tool implementation, training data, and the mapping from informal requirements to formal statements. Inference: threat to VL is high when a verifier-guided repair loop optimizes compilation while semantic checks remain approximate. A Verus proof is stronger evidence than a Lean compile pass, but it still proves the generated contract. VL should reuse staged training and tool ordering, while requiring reviewed specifications and independent counterexamples. Existing work already establishes compiler-feedback repair; VL should measure semantic drift separately rather than report verifier pass rate as requirement fidelity.

## techniques for the catalog
- batched compiler feedback: pre-check and group formal statements before compiling, then map diagnostics to each candidate
- ensemble semantic judge: require agreement from independent LLM judges on informal/formal meaning
- staged tool-use training: cold-start, expert iteration, and DPO teach invocation, repair, and fewer repeated errors
- ordered revision loop: syntax first, consistency second, stop only after both checks pass
Checked 2026-10-14 against the paper by a Codex agent: audit record guo2025autoformalizer; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
