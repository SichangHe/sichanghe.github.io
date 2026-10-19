# MA-LoT: Model-Collaboration Lean-based Long Chain-of-Thought Reasoning enhances Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `wang2025malot`, [paper](https://arxiv.org/abs/2503.03205)

## scope and result

MA-LoT is a Lean 4 proof-generation framework with two collaborating roles: a prover writes a complete proof draft and a corrector reads the Lean verifier's error feedback and repairs that draft. Long chain-of-thought (Long CoT) supplies high-level natural-language planning before Lean code. Its LoT-Transfer Learning (LoT-TL) pipeline transfers general natural-language reasoning into Lean by training on ordinary Long CoT, then field-specific theorem and correction data without explicitly annotated Lean Long CoT traces.

The paper reports 61.07% MiniF2F-Test accuracy for Godel-Prover + MA-LoT at a budget of 16 prover samples plus two correction rounds of eight samples, and 54.51% for DeepSeek-Prover + MA-LoT at 64 + 32 × 2 (Table 1, p. 7). The cumulative MA-LoT row reaches 63.93% MiniF2F-Test, but uses a different cumulative budget. Inference: these benchmark pass rates do not establish success rates over arbitrary Lean programs.

Inference: the method suggests storing verifier feedback in training data and assigning repair to a corrector trained on failed proofs. Each revised proof still goes to Lean for verification (§2.3.2, pp. 5–6).

## technique 1: LoT-ProveData and LoT-CorrectionData

What it is. The authors compile LoT-ProveData with 54,465 records. Each record contains a Lean 4 theorem statement, a verified proof with natural-language explanations as comments, and a natural-language statement (§2.2.1, p. 4). They compile LoT-CorrectionData with 64,912 correct/incorrect Lean proof pairs, the incorrect proof's Lean error messages, and natural-language statement and proof. The two datasets train complementary roles: whole-proof planning and error analysis.

The paper states: “During proof generation for the ProverData, some incorrect proofs were also produced. We recorded these alongside their error messages to form LoT-CorrectionData (LoT-CD), consisting of 64,912 records of correct-incorrect Lean4 proof pairs with error messages of the incorrect proof.” (§2.2.1, p. 4)

When to use it. Inference: use paired failures when a verifier emits actionable diagnostics and a model must learn a repair operation while allowing it to rewrite the proof. Keep the wrong proof, exact error, corrected proof, and theorem statement together to retain their relationship.

How to do it.

1. collect Lean proofs from DeepSeek-Prover-v1 and Lean-Workbook annotated using TheoremLlama and DeepSeek-Prover-v1.5-RL (§2.2.1, p. 4)
2. ask Qwen-2.5-72B to analyze proofs and write natural-language explanations; insert them as Lean comments (§2.2.1, p. 4)
3. generate natural-language theorem statements for records lacking them (§2.2.1, p. 4)
4. preserve verified theorem/proof/comment triples as LoT-ProveData (§2.2.1, p. 4)
5. record incorrect proofs produced during proof generation with their Lean error messages and pair them with correct proofs as LoT-CorrectionData (§2.2.1, p. 4)

Verus form. Inference: make each correction row contain a fixed Rust function and `requires`/`ensures`, the rejected proof body, Verus diagnostics, and an accepted proof body. Inference: keep contracts and executable statements byte-identical between wrong and corrected rows so the model learns proof repair rather than specification weakening. Inference: use Verus constructs such as `assert`, loop `invariant`, `decreases`, and lemma functions; reject `assume`, `admit`, and `external_body` escape hatches.

Evidence and limits. Inference: these dataset counts do not measure acceptance rates. The paper does not report how many candidate proofs were discarded, how many verifier errors were ambiguous, or whether generated natural-language explanations were independently checked. Inference: explanations should be treated as auxiliary supervision; Lean acceptance remains the evidence.

## technique 2: LoT-TL transfer learning for field-specific Long CoT

What it is. LoT-TL has three stages (§2.2, pp. 4–5). First, obtain field-specific SFT and correction data. Second, train general natural-language Long CoT on OpenO1-SFT-Pro, a 126k-record math/science dataset, with a system prompt requiring Long CoT. Third, train on LoT-ProveData, then LoT-CorrectionData. The main text specifies a **WITHOUT** Long Chain-of-Thought system prompt and a placeholder (§2.2.3, p. 5). Appendix F distinguishes the correction-data format: it keeps the wrong proof and verifier messages inside Long CoT, uses a **WITH** Long Chain-of-Thought prompt, and suppresses natural-language error analysis (pp. 25–27). At inference, a prompt enables Long CoT analysis.

The paper says: “The pipeline intends to make LLMs have the ability to perform Lean4 field-specific Long CoT reasoning.” (§2.2, p. 4)

When to use it. Inference: use this transfer recipe when field-specific long-reasoning traces are scarce but ordinary reasoning traces and verified proof pairs exist. It separates learning to plan from learning the field's syntax and error semantics.

How to do it.

1. train a base model on 126k general Long CoT examples with next-token prediction (§2.2.2, p. 4)
2. train on LoT-ProveData with the no-Long-CoT prompt and placeholder (§2.2.3, p. 5)
3. train on LoT-CorrectionData; the Appendix F.2 example includes the wrong proof and diagnostics but suppresses natural-language error analysis (§2.2.3, p. 5; Appendix F.2, pp. 26–27)
4. sort curriculum data as in Wang et al. (2024) to stabilize training (§2.2.3, p. 5)
5. enable Long CoT with the inference system prompt (§2.2.3, p. 5)

Verus form. Inference: after general Long CoT training, train Rust and Verus code completion with a placeholder, then rejected/accepted Verus pairs with diagnostics and no generated error analysis. Inference: at inference, request a plan containing contract interpretation, invariant candidates, and proof steps, followed by compilable Verus code. Inference: the placeholder does not establish reasoning soundness.

Evidence and limits. Table 3's DeepSeek-Prover-v1.5-SFT ablation gives 46.31% MiniF2F-Test for the base, 46.72% after Long CoT, 50.00% after Long CoT + SFT, and 51.64% for LoT-Solver at pass@64 (p. 7). The no-Long-CoT LoT-Solver is 49.18%; fine-tuning the RL model on the SFT dataset without Long CoT gives 48.36% (§3.6.3, p. 9). Inference: these comparisons support field-specific alignment and Long CoT, but do not isolate every data-source or prompt effect.

## technique 3: prover-corrector interaction under Lean feedback

What it is. The prover uses whole-proof generation and a high-level plan. It submits the complete proof to Lean. If Lean rejects it, the corrector receives the wrong proof and verifier feedback, analyzes the failure in Long CoT, and emits a revised proof. The paper states: “After receiving a wrong proof and Lean verifier feedback, the corrector model will systematically analyze them in Long CoT.” (§2.3.2, p. 5)

The framework explicitly separates roles: “MA-LoT separates the cognitive process into two distinct tasks: high-level proof planning and writing, as well as fine-grained correction based on verifier feedback.” (§1, p. 3)

When to use it. Inference: use separate models or separately prompted roles when proof planning and diagnostic repair require different behavior. A corrector should be trained on failure traces and should see exact verifier output, rather than a prose summary.

How to do it.

1. give the prover the natural-language statement and Lean statement (§2.3.1, p. 5)
2. ask it to analyze the theorem, draft tactics, and write complete Lean code (§2.3.1, p. 5)
3. run the proof through the Lean evaluator (§2.3.1, p. 5)
4. if rejected, pass the proof and Lean error message to the corrector (§2.3.2, p. 5)
5. let the corrector rethink the strategy and emit a revised proof (§2.3.2, p. 5)
6. submit each revised proof to Lean and repeat until success or the retry limit (§2.3.2, pp. 5–6)

Verus form. Inference: use a prover to draft a Verus function and a corrector to inspect diagnostics such as failed postconditions, invariant failures, or arithmetic triggers. Inference: the corrector should edit proof code while preserving executable statements and contracts. Inference: cap rounds, record every diagnostic and patch, and run a fresh Verus check after the final patch.

Evidence and limits. Table 2 reports cumulative correction. With DeepSeek-Prover-v1.5, pass@64 rises from 51.64% for the prover to 53.28%, 54.51%, and 55.33% after three rounds. With Godel-Prover-SFT at pass@16, it rises from 54.92% to 59.43%, 61.07%, and 61.89% (p. 7). The paper says the first three rounds correct an average of 11.55% of theorems the prover cannot answer (§3.4, p. 8), but this is a claim about initially unsolved theorems. Inference: it is not an absolute 11.55 percentage-point gain; it averages the fractions of initially unsolved theorems recovered for the two base models. With the prover reused as corrector, Godel reaches only 56.15% and 57.38% after two rounds, compared with 59.43% and 61.07% for the corrector (Table 2, p. 7). Inference: this supports the specialized correction setup.

## technique 4: budget allocation and efficiency measurement

What it is. MA-LoT expresses sampling as `x + k × y`: x whole-proof prover samples, k correction rounds, and y correction samples per round. The caption says one correction round costs approximately half the whole-proof generation budget (Table 1, p. 7). In the efficiency study, MA-LoT generates 33% more tokens and costs 70% more GPU hours than the base; the authors enlarge the base sample budget to 1.7× for a compute-hour comparison (§3.5, p. 8).

Table 4 compares Godel-Prover-SFT at pass@32 with MA-LoT-Godel at 16 + 2 × 8. Average generated tokens are 492.10 versus 657.54; MiniF2F-Test is 58.20% versus 61.07% (p. 7). The paper states: “The table shows that despite having a smaller sampling budget, MA-LoT still outperforms the base model by 4.93%, which indicates that MA-LoT is a better way to allocate computation power.” (§3.5, p. 8) Inference: 61.07% minus 58.20% is 2.87 percentage points, or approximately 4.93% relative improvement. Section 3.5 says the base budget was enlarged to 1.7 times, while Table 4 labels it pass@32; the table does not explain this discrepancy.

Verus form. Inference: report proof success against both equal-sample and equal-compute baselines, disclosing CPU/GPU time, verifier calls, tokens, and rounds. Inference: optimize allocation by measuring marginal gain per correction round, not by assuming that more rounds always help.

## trust, limits, and threat to VL

The main benchmark is MiniF2F. Appendix D also reports a small ProofNet comparison: MA-LoT(Goedel) reaches 15.47% under the stated 16+16 metric, versus 12.15% for Goedel-Prover at pass@32 (p. 14). Inference: these Lean results do not establish performance on Rust, unsafe memory, concurrency, or system specifications; verifier acceptance also does not establish that the theorem statement expresses the intended requirement.

Inference: threat to VL is high for verifier-feedback integration and moderate for transfer-learning claims. MA-LoT gives VL a concrete correction-data schema and role-separated loop. It does not eliminate specification errors or prove that an agent's Rust contract reflects the user's intent. VL should not redo a generic “generate and retry” system without preserving wrong proof, verifier message, corrected proof, and compute denominator. A useful extension is to build Verus correction data with contract-preservation checks and dependency-version replay.

## techniques for the catalog

- paired correction data — store accepted and rejected proofs together with exact Lean diagnostics and theorem context
- LoT transfer learning — transfer general Long CoT through field-specific proof and correction SFT without annotated formal traces
- prover-corrector collaboration — separate whole-proof planning from verifier-guided repair and rerun the checker after each patch
- correction-round budgeting — express prover samples and repair rounds explicitly and compare both equal-sample and equal-compute settings
- role-specialization ablation — compare a dedicated corrector with a prover reused as corrector to measure diagnostic-repair specialization

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "By coordinating a prover and a corrector model through Long CoT, MA-LoT produces more structured, coherent, and insightful proofs."): read the full paper including appendices; checked quotations, numbers, page and section references, training and correction steps, and budgets; corrected training-format distinctions, references, the RL ablation description, and relative versus percentage-point gains; marked extrapolations as Inference; did not reproduce experiments, execute Lean proofs, inspect code or datasets, or validate Verus adaptations.
