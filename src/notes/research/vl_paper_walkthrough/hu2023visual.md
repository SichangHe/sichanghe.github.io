# Visual Program Distillation: Distilling Tools and Programmatic Reasoning into Vision-Language Models
(authored by agents unless marked 🧑)
Tag: `hu2023visual`, [paper](https://www.semanticscholar.org/paper/f32ea390686b1eee3ba5b53c7a85e9e9385d4b94)

## what the paper builds

Hu et al. introduce Visual Program Distillation (VPD), a data-synthesis and fine-tuning method. An LLM writes programs that call specialist vision tools; an execution engine runs them and records traces; filtering keeps executable programs that return the labeled answer; another LLM rewrites traces as natural-language chain-of-thought (CoT); a vision-language model (VLM) is fine-tuned on answers and traces. The abstract says: “VPD distills the reasoning ability of LLMs by using them to sample multiple candidate programs, which are then executed and verified to identify a correct one.” (Abstract, p. 1). The product is a single-forward-pass PaLI model that imitates the useful tool reasoning without loading those tools at inference time.

Inference: the formal-verification lesson is checker-filtered synthesis: a generator can produce many candidates, but training data is admitted only after executable checking against an oracle. The paper checks task answers, not universal program properties; the Verus adaptations below are inferences.

## technique 1: generate executable visual programs

What it is. Given image `i`, query `q`, and (when available) label `y`, VPD prompts PaLM-2 with descriptions of available modules and asks for a Python function. The available tools include PaLI-X for visual questions, PaLI-X detection, a depth API, and PaLM-2 for external knowledge (Section 3.1, pp. 3–4). Programs call operations such as `find`, `visual_question_answering`, `image_caption`, `expand_patch_with_surrounding`, `overlaps`, and `compute_depth`; Appendix D gives their signatures and coordinate conventions (Appendix D, pp. 18–20).

Steps from the paper:

1. Describe tool APIs and provide query `q` to PaLM-2 (Section 3.1, p. 3).
2. Sample `k` candidate functions `z1 ... zk`; experiments use temperature `T = 0.5` and `k = 5` when labels exist (Section 3.1, p. 3).
3. For unlabeled data, use `k = 1` and skip answer filtering (Section 3.1, p. 3).
4. Pass each function and image to the execution engine (Section 3.1, pp. 3–4).

The paper explains why this is needed: “generated programs are error-prone: they omit necessary steps, include spurious ones, and are unable to recover when the specialized models give incorrect outputs.” (Abstract, p. 1).

Verus form: Inference: represent each generated Rust candidate as an ordinary `fn` plus explicit `requires` and `ensures`; model tool calls through verified traits or wrapper functions with contracts. A generator can emit several candidates, but only a candidate compiled and proved by Verus should enter a proof corpus. Inference: Verus does not provide dynamic Python execution or arbitrary tool calls; unsupported external operations require an explicit contract and remain trusted unless separately verified.

Evidence and limits. Appendix examples show multi-step programs for spatial relations, object counting, and external knowledge (Appendix A, pp. 15–17). A program may still be wrong even when it executes, because tool outputs can be wrong or ambiguous. Inference: execution is a safety gate for syntax and runtime behavior, not a proof that every intermediate fact is true.

## technique 2: execute programs while recording traces

What it is. The engine `phi` interprets each candidate Python function on the image, returns `y-hat`, and records every tool call, input, and output as trace `t` (Section 3.1, p. 3). The trace is the concrete sequence later converted to a rationale. This preserves grounding such as object bounding boxes instead of relying on a free-form LLM explanation.

Steps from the paper:

1. Invoke candidate `zi` with image `i` and obtain `phi(i, zi) = y-hat-i` (Section 3.1, p. 3).
2. Record intermediate calls and outputs in `ti` (Section 3.1, p. 3).
3. Keep tuples `(zi, y-hat-i, ti)` for filtering (Section 3.1, p. 3).

Verus form: Inference: make a ghost `Seq` of typed events for proof-relevant operations and a concrete wrapper for each external call. State in `ensures` that the wrapper's returned model value equals the event's abstract result, and prove append/prefix facts with `proof fn`s. Inference: erased ghost traces do not log production behavior, so a product needing audit must retain a concrete trace or separately prove that the wrapper's observable effect is complete.

The paper's example for counting buses records three detector boxes and three VQA checks, then explains that one bus is not yellow (Figure 2, p. 2). The trace is evidence of what the pipeline called, not an independent truth oracle.

## technique 3: filter candidates by execution and labels

What it is. VPD discards programs that fail to execute. With human labels, it then retains one executable program whose output equals the label. If answers have benign variants, an LLM judges whether the output is correct; when several pass, the highest score from the program-generating LLM is selected (Section 3.1, p. 4). If no program passes, the sample can still train on the ground-truth label without a CoT. For unlabeled data, the top-scoring executable program is used without this correctness check (Section 3.1, p. 4).

The paper states: “When labeled data is available, it then filters for programs that produce the correct answer upon execution.” (Introduction, p. 2). Its four-stage sequence is program generation, execution, filtering, and trace-to-CoT conversion (Section 3.1, pp. 3–4).

Steps from the paper:

1. Discard every candidate that raises an execution error (Section 3.1, p. 4).
2. Compare each remaining output with the human label (Section 3.1, p. 4).
3. Use an LLM to judge ambiguous equivalent answers (Section 3.1, p. 4).
4. Keep one correct tuple, or use the label alone if none survives (Section 3.1, p. 4).

Verus form: Inference: treat Verus verification as the acceptance predicate: reject compile failures, rejected specifications, and trust escapes; retain only a candidate whose `requires`/`ensures` obligations verify. For ambiguous outputs, require an explicit specification rather than an LLM judge. Inference: if no proof passes, store the original contract or a labeled counterexample without calling the candidate verified.

Evidence. Figure 4 compares top-1 and top-5 sampling on training data. Sampling five raises the chance of at least one passing program by +45 percentage points on GQA and A-OKVQA, +33 on OK-VQA, and +10 on TallyQA (Section 4.2, p. 7). These are changes in success rate, not counts; the paper does not print the underlying denominator in the figure text. Inference: VL should report both the number of obligations and the number of accepted proofs when applying this idea.

## technique 4: rewrite traces into faithful CoT data

What it is. For each selected tuple `(q, z, t)`, PaLM-2 rewrites the execution trace into natural-language CoT `c`. The authors hand-craft 20 conversion examples and use them as few-shot prompts (Section 3.1, p. 4). The resulting explanation retains intermediate grounding and is used as supervision even though the deployed VLM need not call tools.

Steps from the paper:

1. Give the query, selected program, and recorded trace to the conversion LLM (Section 3.1, p. 4).
2. Use 20 hand-written `(q, z, t)` to CoT examples as few-shot context (Section 3.1, p. 4).
3. Generate a natural-language rationale that follows the trace (Section 3.1, p. 4; Appendix A).
4. Omit CoT loss for samples where no program passed, while retaining label supervision (Section 3.1, p. 4).

Verus form: Inference: convert a proof trace into structured proof steps, such as lemma invocations and `assert` facts, rather than natural-language rationale. Index each step with the exact Verus signature, imports, and preconditions. Inference: prose can explain a proof but cannot establish one; a generated explanation must remain metadata until the Rust proof verifies.

Appendix A gives concrete traces: locate the vase, locate the chair to its left, locate the bookshelf, and conclude the bookshelf is left of the chair (Appendix A, p. 15); another finds cars and counts those with brake lights (p. 16). These are complete example shapes, not universal correctness guarantees.

## technique 5: distill labels and rationales jointly

What it is. VPD fine-tunes PaLI with two cross-entropy objectives: one predicts the short answer `y-hat`, and one predicts rationale `c`. The paper writes `L = Llabel + Lrationale`; each sequence loss is normalized by sequence length so short labels and long rationales have similar weights (Section 3.2, pp. 4–5). Task-specific prompts select short answers at test time, while a rationale suffix requests explanations.

Steps from the paper:

1. Build examples `(image, query, predicted label, CoT, task prompt)` from filtered programs (Section 3.2, p. 4).
2. Combine free-form VQA, multiple-choice, counting, OCR, and knowledge tasks into one mixture (Section 3.2, pp. 4–5).
3. Optimize label and rationale sequence losses with length normalization (Equation 1–2, p. 5).
4. Fine-tune PaLI-3 (5B) or PaLI-X (55B) using LoRA on attention and MLP linear layers (Section 4.1, p. 5).
5. At inference, request either a short answer or a rationale with the corresponding instruction (Section 3.2, p. 5).

Verus form: Inference: the analogue is multitask proof generation: train or prompt a model to emit both a Rust implementation and structured proof obligations, but score acceptance only after Verus checks the complete module. Keep contracts visible and reject generated `external_body` trust escapes. Inference: a low training loss on proof text is not evidence of semantic validity.

Evidence. The training mixture contains 310.5K labeled examples and 89.6K synthesized CoTs (Appendix B, Table 4, p. 17). On generalist evaluation, PaLI-X-VPD scores 64.9 on GQA versus 63.3 for PaLI-X-Instruct, 62.7 versus 61.5 on complex TallyQA, and 76.2 versus 75.0 on MMBench (Table 1, p. 6). The table's metrics are benchmark scores, not percentages of verified programs. VPD improves 8 of 9 listed tasks for both PaLI backbones according to the table caption (p. 6).

## technique 6: evaluate rationale quality and adaptation without labels

What it is. Human evaluators rate correctness, explainability, factuality, and consistency on 600 samples from GQA, A-OKVQA, and TallyQA; three annotators score each model answer (Section 4.3, p. 7). The paper also tests Hateful Memes with 8,500 labels (supervised) and with no labels (unsupervised) (Section 5, p. 8).

Evidence. Among samples with an explanation, PaLI-X-VPD rationales are factual 87.2% and consistent 97.8%; the paper reports gains of 14.6 and 10 percentage points over PaLI-X-Instruct (Figure 6 and text, p. 7). In the supervised Hateful Memes test set, PaLI-X-VPD reaches accuracy 80.8 and AUC-ROC 89.2 (Table 3, p. 8). In the unsupervised setting, the generated programs score 69.7 accuracy and 70.1 AUC-ROC, while PaLI-X-VPD generalist scores 61.4 accuracy (Table 3, p. 8). These denominators are the dataset test-set sizes, which the paper does not state in the table; the human-rater denominator is explicitly 600 samples and 3 raters per sample.

Verus form: Inference: evaluate a proof agent on a fixed corpus by reporting candidate count, verifier-clean count, proof time, and specification failures. A human explanation score can assess readability but cannot substitute for Verus acceptance. Inference: an unlabeled fallback is especially unsafe for formal verification; use it to propose tests or lemmas, never to certify a proof.

## what is proved, trusted, and limited

The paper measures model accuracy, rationale quality, and data-generation success. It does not prove that generated programs are semantically correct beyond matching labels, that specialist tools are correct, or that distilled rationales remain faithful on every image. The paper itself says that even strong VLMs may give unreliable answers and calls fact-checking for unlabeled multimodal CoT a future direction (Section 6, p. 9). Occlusion and crowded scenes defeat the available programs; the authors suggest dense labeling tools (Section 6, p. 9). Static programs also do not support tasks requiring interactive planning (Section 6, p. 9).

Trusted components include PaLM-2 generation and conversion, the Python execution engine, every specialist detector/VQA/depth/knowledge model, the human labels, the LLM ambiguity judge, and PaLI training and evaluation code. Inference: the largest product threat for agent-written verified Rust is semantic oracle drift: a checker can certify a candidate relative to a wrong contract or an untrusted external function. The useful part for VL is the admission protocol—generate many candidates, run a strict checker, preserve traces and diagnostics, and train retrieval on accepted artifacts. VL should not redo checker-filtered synthesis, execution traces, top-k sampling, or joint answer/rationale distillation as if these were new; it should make the checker Verus and report its trust boundary.

Inference: a concrete adaptation is to sample five proof candidates at temperature fixed by the experiment, compile each with the same Verus revision, retain only verifier-clean modules, and index the accepted proof plus diagnostic trace. Measure acceptance per obligation, repair attempts, proof time, and failures by contract, ownership, or unsupported external API. This experiment is proposed here; VPD did not perform it.

## techniques for the catalog

- top-k program synthesis — sample multiple executable candidates so filtering can find a correct one
- execution-trace capture — record every tool call, input, output, and intermediate result
- checker and label filtering — discard runtime failures and retain a candidate matching the trusted label
- ambiguity judging — use an explicit judge for equivalent answer forms when labels are underspecified
- trace-to-CoT conversion — rewrite accepted traces into few-shot-grounded natural-language reasoning
- joint label and rationale distillation — train short answers and length-normalized explanations together
- checker-filtered proof corpus — Inference: apply the same admission pattern with Verus-verified Rust artifacts
- unlabeled fallback — use executable top-scoring programs without answer filtering, with the paper's stated trust limitation

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
