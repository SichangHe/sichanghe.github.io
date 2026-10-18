# Visual Program Distillation: Distilling Tools and Programmatic Reasoning into Vision-Language Models
(authored by agents unless marked 🧑)
Tag: `hu2023visual`, [paper](https://arxiv.org/abs/2312.03052)

## what the paper builds

Hu et al. introduce Visual Program Distillation (VPD), a data-synthesis and fine-tuning method. An LLM writes programs that call specialist vision tools; an execution engine runs them and records traces; filtering keeps executable programs that return the labeled answer; another LLM rewrites traces as natural-language chain-of-thought (CoT); a vision-language model (VLM) is fine-tuned on answers and traces. The abstract says: “VPD distills the reasoning ability of LLMs by using them to sample multiple candidate programs, which are then executed and verified to identify a correct one.” (Abstract, p. 1). The product is a single-forward-pass PaLI model that imitates the useful tool reasoning without loading those tools at inference time.

Inference: the formal-verification lesson is checker-filtered synthesis: a generator can produce many candidates, but training data is admitted only after executable checking against an oracle. The paper checks task answers, not universal program properties; the Verus adaptations below are inferences.

## technique 1: generate executable visual programs

What it is. Given image `i`, query `q`, and (when available) label `y`, VPD prompts PaLM-2 with the same kind of prompt as ViperGPT, a detailed description of the available vision modules followed by the query, and expects a Python function definition (Section 3.1, p. 3). Appendix D.1 adds that the prompt also contains a model-generated image caption (Appendix D.1, p. 20). The tools are PaLI-X for simple visual queries, PaLI-X detection (distilled from OWLv2) for object detection, the Google Cloud Depth API for depth, and PaLM-2 for external knowledge (Section 3.1, p. 4). Programs call operations such as `find`, `visual_question_answering`, `image_caption`, `expand_patch_with_surrounding`, `overlaps`, and `compute_depth`; Appendix D.1 gives their signatures and coordinate conventions (Appendix D.1, pp. 20–22).

Steps from the paper:

1. Describe tool APIs and provide query `q` to PaLM-2 (Section 3.1, p. 3).
2. Sample `k` candidate functions `z1 ... zk`; experiments use temperature `T = 0.5` and `k = 5` when labels exist (Section 3.1, p. 3).
3. For unlabeled data, use `k = 1` and skip answer filtering (Section 3.1, p. 3).
4. Pass each function and image to the execution engine (Section 3.1, p. 3).

The paper explains why this is needed: “generated programs are error-prone: they omit necessary steps, include spurious ones, and are unable to recover when the specialized models give incorrect outputs.” (Abstract, p. 1).

Verus form: Inference: represent each generated Rust candidate as an ordinary `fn` plus explicit `requires` and `ensures`; model tool calls through verified traits or wrapper functions with contracts. A generator can emit several candidates, but only a candidate compiled and proved by Verus should enter a proof corpus. Inference: Verus does not provide dynamic Python execution or arbitrary tool calls; unsupported external operations require an explicit contract and remain trusted unless separately verified.

Evidence and limits. Appendix A shows three filtered examples (spatial relation from GQA, counting from TallyQA, external knowledge from A-OKVQA) (Appendix A, Figure 8, pp. 15–16). A program may still be wrong even when it executes, because tool outputs can be wrong or ambiguous. Inference: execution is a prerequisite check for syntax and runtime behavior, not a proof that every intermediate fact is true.

## technique 2: execute programs while recording traces

What it is. The engine `phi` interprets each candidate Python function on the image, returns `y-hat`, and records every tool call, input, and output as trace `t` (Section 3.1, p. 3). The trace is the concrete sequence later converted to a rationale. This preserves grounding such as object bounding boxes instead of relying on a free-form LLM explanation.

Steps from the paper:

1. Invoke candidate `zi` with image `i` and obtain `phi(i, zi) = y-hat-i` (Section 3.1, p. 3).
2. Record intermediate calls and outputs in `ti` (Section 3.1, p. 3).
3. Keep tuples `(zi, y-hat-i, ti)` for filtering (Section 3.1, p. 3).

Verus form: Inference: make a ghost `Seq` of typed events for proof-relevant operations and a concrete wrapper for each external call. State in `ensures` that the wrapper's returned model value equals the event's abstract result, and prove append/prefix facts with `proof fn`s. Inference: erased ghost traces do not log production behavior, so a product needing audit must retain a concrete trace or separately prove that the wrapper's observable effect is complete.

The paper's example for counting buses records three detected buses and per-bus VQA checks (the figure shows "No", "Yes", then an ellipsis), then explains that one bus is not yellow (Figure 2, p. 2). The trace is evidence of what the pipeline called, not an independent truth oracle.

## technique 3: filter candidates by execution and labels

What it is. VPD discards programs that fail to execute. With human labels, it then retains one executable program whose output equals the label. If answers have benign variants, an LLM judges whether the output is correct; when several pass, the highest score from the program-generating LLM is selected (Section 3.1, p. 4). If no program passes, the sample can still train on the ground-truth label without a CoT. For unlabeled data, the top-scoring executable program is used without this correctness check (Section 3.1, p. 4).

The paper states: “When labeled data is available, it then filters for programs that produce the correct answer upon execution.” (Introduction, p. 2). Its four-stage sequence is program generation, execution, filtering, and trace-to-CoT conversion (Section 3.1, pp. 3–4).

Steps from the paper:

1. Discard every candidate that raises an execution error (Section 3.1, p. 4).
2. Compare each remaining output with the human label (Section 3.1, p. 4).
3. Use an LLM to judge ambiguous equivalent answers (Section 3.1, p. 4).
4. Keep one correct tuple, or use the label alone if none survives (Section 3.1, p. 4).

Verus form: Inference: treat Verus verification as the acceptance predicate: reject compile failures, rejected specifications, and trust escapes; retain only a candidate whose `requires`/`ensures` obligations verify. For ambiguous outputs, require an explicit specification rather than an LLM judge. Inference: if no proof passes, store the original contract or a labeled counterexample without calling the candidate verified.

Evidence. Figure 4 compares top-1 and top-5 sampling on training data. The text says: "There is a dramatic increase in success rate from 1 program to 5: +45% on GQA and A-OKVQA, +33% on OK-VQA, and +10% on TallyQA." (Section 4.2, p. 7). Figure 4 (p. 6) prints the bars: success@1 to success@5 is 43.7 to 63.7 on GQA, 57.2 to 76.6 on OK-VQA, 47.0 to 68.7 on A-OKVQA MC, and 63.4 to 69.7 on TallyQA. Inference: the quoted percentages are relative increases (63.7/43.7 is about 1.46), not percentage points; the absolute gains are about 20, 19, 22, and 6 points. The paper does not print the number of training questions behind these rates. Inference: VL should report both the number of obligations and the number of accepted proofs when applying this idea.

## technique 4: rewrite traces into faithful CoT data

What it is. For each selected tuple `(q, z, t)`, PaLM-2 rewrites the execution trace into natural-language CoT `c`. The authors hand-craft 20 conversion examples and use them as few-shot prompts (Section 3.1, p. 4). The conversion prompt gives the LLM the query, program, execution trace, and program output, asks it to use bounding box information, and tells it the rationale must lead to the most common human answer, which is not necessarily the program output (Appendix D.3, p. 23). The resulting explanation retains intermediate grounding and is used as supervision even though the deployed VLM need not call tools.

Steps from the paper:

1. Give the query, selected program, and recorded trace to the conversion LLM (Section 3.1, p. 4).
2. Use 20 hand-written `(q, z, t)` to CoT examples as few-shot context (Section 3.1, p. 4).
3. Generate a natural-language rationale that follows the trace (Section 3.1, p. 4; Appendix D.3, p. 23).
4. Omit CoT loss for samples where no program passed, while retaining label supervision (Section 3.1, p. 4; Section 4.1, p. 5, "we set Lrationale to 0 and only keep Llabel").

Verus form: Inference: convert a proof trace into structured proof steps, such as lemma invocations and `assert` facts, rather than natural-language rationale. Index each step with the exact Verus signature, imports, and preconditions. Inference: prose can explain a proof but cannot establish one; a generated explanation must remain metadata until the Rust proof verifies.

Appendix A gives concrete traces: locate the vase, locate the chair to its left, locate the bookshelf, and conclude the bookshelf is left of the chair (Appendix A, p. 15); another finds cars and counts those with brake lights (p. 16). These are complete example shapes, not universal correctness guarantees.

## technique 5: distill labels and rationales jointly

What it is. VPD fine-tunes PaLI with two cross-entropy objectives: one predicts the short answer `y-hat`, and one predicts rationale `c`. The paper writes `L = Llabel + Lrationale`; each sequence loss is normalized by sequence length so short labels and long rationales have similar weights (Section 3.2, Equations 1–2, p. 4). Task-specific prompts select short answers at test time, while the suffix "Explain the rationale to answer the question" requests a rationale (Section 3.2, p. 4).

Steps from the paper:

1. Build examples `(image, query, predicted label, CoT, task prompt)` from filtered programs (Section 3.2, p. 4).
2. Combine tasks into one multitask mixture; the academic VQA part covers VQAv2, OCR-VQA, GQA, OK-VQA, A-OKVQA, and TallyQA, plus multimodal instruction-tuning data (Section 3.2, p. 4; Section 4.1, p. 5).
3. Optimize label and rationale sequence losses with length normalization (Equations 1–2, p. 4).
4. Fine-tune PaLI-3 (5B) or PaLI-X (55B) using LoRA on attention and MLP linear layers (Section 4.1, p. 5).
5. At inference, request either a short answer or a rationale with the corresponding instruction (Section 3.2, p. 4).

Verus form: Inference: the analogue is multitask proof generation: train or prompt a model to emit both a Rust implementation and structured proof obligations, but score acceptance only after Verus checks the complete module. Keep contracts visible and reject generated `external_body` trust escapes. Inference: a low training loss on proof text is not evidence of semantic validity.

Evidence. The training mixture contains 310.5K labeled examples and 89.6K synthesized CoTs (Appendix B, Table 4, p. 17). On generalist evaluation, PaLI-X-VPD scores 64.9 on GQA versus 63.3 for PaLI-X-Instruct, 76.6 versus 75.4 on complex TallyQA, and 76.2 versus 75.0 on MMBench (Table 1, p. 6); the text gives the same +1.6, +1.2, and +1.2 (Section 4.2, p. 6). The table's metrics are benchmark scores, not percentages of verified programs. The Table 1 caption says VPD "improves performance on 8/9 tasks for both PaLI-3 and PaLI-X" (p. 6).

## technique 6: evaluate rationale quality and adaptation without labels

What it is. Human evaluators rate correctness, explainability, factuality, and consistency on 600 samples from GQA (test-dev), A-OKVQA (val), and TallyQA (simple and complex); 3 annotators evaluate each model answer (Section 4.3, p. 7). The paper also tests Hateful Memes with 8,500 labels (supervised) and with no labels (unsupervised) (Section 5, p. 8). The text and the Figure 7 caption compare generalist, program, zero-shot-CoT specialist, and supervised specialist outputs (Section 5.2, p. 9).

Evidence. Among samples with an explanation, PaLI-X-VPD rationales are factual 87.2% and consistent 97.8%; the text reports gains of "+14.6% and +10%, respectively" over PaLI-X Instruct (Section 4.3 and Figure 6(b), p. 8; the bars read 73 to 87 and 88 to 98). Explanations appear in 46% of PaLI-X-VPD answers versus 22% for Instruct (Figure 6(a)). On the Hateful Memes seen test set, supervised PaLI-X-VPD (specialist with CoT) reaches accuracy 80.8 and AUC-ROC 89.2, versus 77.6 and 88.0 for label-only fine-tuning (Table 3, p. 8). In the unsupervised setting, the generated programs score 69.7 accuracy and 70.1 AUC-ROC (Table 3, p. 8), while the text gives PaLI-X-VPD generalist 61.4% (Section 5.2, p. 9). The paper does not state the test-set size here; the human-rater denominator is 600 samples with 3 raters per sample.

Verus form: Inference: evaluate a proof agent on a fixed corpus by reporting candidate count, verifier-clean count, proof time, and specification failures. A human explanation score can assess readability but cannot substitute for Verus acceptance. Inference: an unlabeled fallback is especially unsafe for formal verification; use it to propose tests or lemmas, never to certify a proof.

## what is proved, trusted, and limited

The paper measures model accuracy, rationale quality, and data-generation success. It does not prove that generated programs are semantically correct beyond matching labels, that specialist tools are correct, or that distilled rationales remain faithful on every image. The paper says: "Since even the strongest VLMs like PaLI-X [10] and GPT-4V [49] cannot give reliable answers, fact-checking strategies for multimodal chain-of-thought data is a promising future direction." (Section 6, p. 9). It also says "programs struggles in complex scenarios when objects are occluded, or the scene contains too many objects" and suggests dense-labeling tools (Section 6, p. 9). It notes that some tasks "cannot be easily solved with one program" and points to LLM agents that plan interactively as future work (Section 6, p. 9).

Inference: trusted components include PaLM-2 generation and conversion, the Python execution engine, every specialist detector/VQA/depth/knowledge model, the human labels, the LLM ambiguity judge, and PaLI training and evaluation code. Inference: the largest product threat for agent-written verified Rust is semantic oracle drift: a checker can certify a candidate relative to a wrong contract or an untrusted external function. Inference: the useful part for VL is the admission protocol—generate many candidates, run a strict checker, preserve traces and diagnostics, and train retrieval on accepted artifacts. VL should not redo checker-filtered synthesis, execution traces, top-k sampling, or joint answer/rationale distillation as if these were new; it should make the checker Verus and report its trust boundary.

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

Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "Interestingly, the generated programs themselves get much higher accuracy (69.7%) than on the previous datasets, perhaps because PaLM-2 is better suited at analyzing a meme than typical VQA datasets."): read the whole paper text (main text, Appendices A-D, Figures 4 and 6 viewed as images) and the whole study; checked every quotation, number, section and page reference, and technique step against it. Changed: arXiv link (2312.03052) in the tag line; Figure 4 gains are relative increases (+45%, +33%, +10%), not percentage points, and now give the printed bars; complex TallyQA is 76.6 vs 75.4 (62.7 vs 61.5 is A-OKVQA DA); the 61.4 generalist Hateful Memes figure is in the Section 5.2 text, not Table 3; human-evaluation text is on p. 8, not p. 7; Equations 1-2 and all of Section 3.2 are on p. 4; Appendix A is pp. 15-16 and Appendix D.1 is pp. 20-22; added tool list details, the caption in the code prompt, the human-answer instruction in the CoT conversion prompt (D.3), and verbatim Section 6 limitation quotes; replaced a banned word; marked trusted-component and VL-recommendation sentences as Inference. Not checked: the cited external papers, the PDF figure images other than Figures 4 and 6, the full code in Appendix D beyond the signatures and prompts D.2-D.3, and the Verus adaptations (labeled Inference, not verified against any Verus documentation).
