# Evaluating Frontier LLMs on PhD-Level Mathematical Reasoning: A Benchmark on a Textbook in Theoretical Computer Science about Randomized Algorithms
(authored by agents unless marked 🧑)
Tag: `cao2025evaluating`, [paper](https://arxiv.org/abs/2512.13978)

## what is measured

Cao et al. evaluate GPT-5-Thinking, Grok-4, Gemini-3-Pro, and Claude-Sonnet-4.5-Thinking on exercises from Motwani and Raghavan's Randomized Algorithms. The introduction describes the corpus as “the full set of end-of-chapter exercises” (§1, p. 1). The abstract states: “We tasked each model with generating formal LaTeX proofs for a series of lemmas and exercises spanning the textbook.” This study checks the paper's account; it does not independently establish that the exercise collection is complete.

The correctness labels come from an LLM verifier with sampled human review. Section 4.5, p. 9, states: “Given the scale of the benchmark, we used Claude-Sonnet-4.5 for automatic proof checking.” Its prompt requires “Mathematically correct (no logical errors)”, “Complete (all steps are justified)”, and “Rigorous (meets formal mathematical standards)” (§4.5, p. 10). Inference: LaTeX proof generation and LLM judgments measure a different outcome from successful checking by Verus or a proof assistant.

Table 1, p. 2, reports 253 questions across fourteen chapters and accuracy values of “47.4%”, “33.2%”, “62.1%”, and “66.4%” for GPT, Grok, Gemini, and Claude respectively. Its caption says: “Count denotes the number of questions.” Inference: the reported accuracies use the common 253-question denominator, not a separate denominator obtained by adding each model's outcome counts. The table is internally inconsistent: its Gemini total row gives 157 correct, 53 failed, and 42 incorrect, summing to 252; Claude's gives 168, 5, and 89, summing to 262. These are the paper's reported values, not independently validated results. The abstract's approximate percentages should not replace the table's model-specific figures.

## technique 1: prepare statements before generating proofs

what it is: separate exercise collection, statement transcription, and human statement review from proof generation. Section 4, p. 7, describes “a clear separation between problem formalization and reasoning”.

when to use it: Inference: use this separation when a proof task originates in screenshots or depends on referenced lemmas, so input errors can be inspected before evaluating reasoning.

how to do it:
1. collect screenshots, merge problems spanning pages, append referenced results, and retype poor images (§4.1, p. 8). The paper states: “We manually appended referenced lemmas or theorems to make problem statements self-contained.”
2. transcribe images into LaTeX with Claude Sonnet 4.5 and temperature 0.2 (§4.2, p. 8; Appendix A; Algorithm 1)
3. review the statements before proof generation (§4.3, p. 8): “A researcher manually reviewed all formalized statements.” The stated checks concern hallucinated variables, formula syntax, and semantic equivalence to the images
4. partition generation work by chapter and model (§4.4, p. 8), then request a complete proof. The prompt says: “Include all necessary steps and justifications” (§4.4, p. 9)
5. retry timeouts with doubled limits, beginning at 300 seconds and stopping at a 1200-second ceiling (§4.4, p. 8; Algorithm 4). Algorithm 4 retains successful responses and records other failures or exhausted timeouts

Inference: a Verus adaptation would prepare Rust/Verus specifications, review their intended meaning, and then generate proof code. A successful checker run would establish the checked obligations relative to the specifications and trusted assumptions; it would not establish that the specification matches the original exercise.

## technique 2: use automated judgments with sampled human review

what it is: an AI verifier assigns binary proof labels, followed by a human audit of a random sample. The verification prompt says: “Output "1" if the proof is correct, complete, and rigorous” and “Output "0" if the proof has any errors, gaps, or issues” (§4.5, p. 10).

when to use it: Inference: this can reduce manual review work for a large collection, but acceptance depends on the verifier and the chosen audit tolerance.

how to do it:
1. supply each generated proof and its formalized statement to Claude-Sonnet-4.5 (§4.5, pp. 9–10; Algorithm 2)
2. parse the verifier's single-digit result and retain it by problem and generating model (Algorithms 2–3)
3. sample triplets for human review (§4.6, p. 10): “To assess the accuracy of the automated verifier, we randomly sample 20% of all (Problem, Proof, Verdict) triplets for human review.”
4. compare human and AI judgments. Section 4.6 states: “If ∆ ≤ 20%, we accept the model’s assessment for the full dataset and compute the final accuracy accordingly.” Otherwise, the batch evaluation is rerun

Table 1 distinguishes correct, failed, and incorrect outcomes, while Algorithm 3 separately stores failed proof attempts and binary verification results. Inference: this supports separating generation failures from rejected proofs; it does not support redefining every incomplete proof as a generation failure. The verification prompt explicitly rejects proofs with gaps.

Inference: for Verus, use checker outcomes for proof acceptance and human review for specification adequacy. Report trusted assumptions and unchecked bodies separately. An LLM's favorable verdict cannot substitute for running the checker.

## technique 3: report results by chapter

what it is: Table 1 reports each model's correct, failed, and incorrect counts by chapter. Its caption describes these as “the number of verifiably Correct answers, the number of Failed solutions, and the number of verifiably Incorrect answers” (p. 2).

when to use it: Inference: chapter-level reporting can identify topics requiring closer examination, provided the counts reconcile with the question totals.

how to do it:
1. retain chapter identifiers while preparing questions (§4.4, p. 8)
2. report question counts and model outcome counts per chapter (Table 1, p. 2)
3. distinguish this chapter breakdown from the qualitative style observations in §4.4, p. 9. The latter states: “GPT-5-Thinking and Grok-4 tend to produce proofs primarily in natural English, focusing on high-level reasoning.” The paper does not present a separate quantified breakdown by proof technique

## techniques for the catalog

- statement preparation — separate transcription, dependency resolution, and human review from proof generation
- sampled verifier audit — assess binary AI proof judgments using a random human-reviewed subset
- chapter reporting — retain question counts and outcome counts by chapter
- Inference: checker boundary — use Verus results and explicit trusted assumptions when adapting this design to verified Rust
