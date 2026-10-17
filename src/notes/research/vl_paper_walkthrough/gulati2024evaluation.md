# An Evaluation Benchmark for Autoformalization in Lean4
(authored by agents unless marked 🧑)
Tag: `gulati2024evaluation`, [paper](http://arxiv.org/abs/2406.06555v1)

## benchmark and question

This tiny paper measures how well large language models convert natural-language mathematical theorem statements into Lean4 statements. It contributes 101 formal/informal theorem pairs from mathlib4 across 17 topics and evaluates GPT-3.5, GPT-4, and Gemini Pro. The authors motivate the task directly: “Generating formal statements is tedious, but the impressive advances in LLMs’ capabilities show a promising future for autoformalized, verifiable systems” (Section 1, p. 1)

Inference: for VeruLaw, the paper is evidence about proposal generation, not proof of Rust correctness. The benchmark's correction-effort measure is useful for measuring how much human repair an agent-generated Verus specification needs before the verifier can check it.

## technique 1: paired formal/informal benchmark construction

What it is. Each dataset item contains a Lean4 theorem statement, its natural-language informalization, and a topic label. The 101 items cover Algebra (9), Analysis (8), Category Theory (6), Combinatorics (6), Computability (4), Field Theory (9), Geometry (8), Group Theory (6), Information Theory (5), Linear Algebra (5), Logic (5), Model Theory (6), Number Theory (5), Probability (6), Representation Theory (3), Set Theory (5), and Topology (5) (Appendix B, Table 1).

When to use it. Use paired data when evaluating whether a model can translate human requirements into a proof assistant's language, and retain topic labels to expose domain-specific failures.

How to do it.

1. Select existing theorem statements from a trusted formal library (Section 2).
2. Produce or retain a natural-language version paired with each statement.
3. Record the mathematical topic and preserve the ground-truth Lean4 text.
4. Prompt models only with the natural-language statement, then grade the result by hand (Section 2: "manually evaluated"; the 0-4 correction-effort scale). The paper does not say how the ground-truth statement enters the grading; its Appendix C examples show the ground truth next to each model output.
5. Inference: keep hard topics represented and report per-topic results, not only one overall score (the paper reports Figure 1 per topic).

Verus form. Inference: build the same dataset from Rust function specifications or theorem statements, with a canonical Verus version and a natural-language requirement. Include preconditions, postconditions, data-structure invariants, and executable code context, because unlike a standalone Lean theorem, Verus checks program behavior.

## technique 2: zero-shot prompting and output normalization

The prompt is intentionally simple: “I am providing you with a mathematical statement in natural language. I want you to formalize it in the Lean4 language.” (Appendix C, p. 4) Each model receives each natural-language item without demonstrations. The authors trim responses to only formal Lean statements before grading (Section 2).

Steps.

1. Present the natural-language theorem and the fixed instruction to the model.
2. Generate one output per model/item pair (Inference: the paper does not state the number of samples per item or the decoding settings).
3. Remove explanatory prose and retain only the proposed Lean statement.
4. Give the normalized output to a human evaluator.

Inference: a Verus pipeline should preserve the entire agent response for audit, then extract candidate Rust/Verus code in a separate field. It should compile the candidate and retain compiler diagnostics; trimming output alone does not establish that the code type-checks.

## technique 3: correction-effort rubric

What it is. Outputs receive a 0–4 score based on the edits needed to make them accurate Lean4 formalizations. Score 0 is flawless; score 4 requires as much effort as formalizing from scratch. This avoids brittle string or perplexity matching. The paper says: “Correction effort refers to the amount of necessary adjustments or modifications required to transform the generated formalization output of an LLM into an accurate and fully correct Lean4 formalization.” (Section 1, p. 1)

How to apply it.

1. Inspect the generated statement and judge how far it is from an accurate, fully correct Lean4 formalization (Section 1). Inference: the ground-truth statement is the natural reference for this judgment; the paper does not spell out the procedure.
2. Estimate the edits needed to obtain a correct formalization.
3. Assign 0 for a flawless output, 1 for minor changes (Appendix C: "near perfect with minor changes necessary"), through 4 for as much effort as formalizing from scratch (Section 2).
4. Record per-item and per-topic scores, not only the mean (Inference: the paper shows per-topic means in Figure 1 and does not publish per-item scores in the text).
5. Compare score histograms (Appendix D shows one per model) to reveal both easy successes and maximum-effort failures.

Verus form. Inference: define a rubric that separately scores syntax/type errors, missing or incorrect `requires`/`ensures`, wrong quantifier or ownership assumptions, and proof-body repair. A candidate should also be run through `verus`; a low edit score without a passing proof is not evidence of correctness.

## technique 4: topic-stratified analysis

The paper reports average correction effort per topic and model (Figure 1, p. 2) and overall score histograms per model (Appendix D, p. 6). GPT-3.5 and GPT-4 both average 2.238; Gemini Pro averages 2.248. Gemini has the most scores of 0 and 1, while GPT-4 and Gemini also have more score-4 instances (Section 2). The authors report that all models did well in Information Theory and Logic but struggled with Category Theory and Model Theory.

Steps.

1. Compute each model's score per item.
2. Group scores by the 17 topic labels.
3. Report mean score per model and topic (as in Figure 1); Appendix D's histograms are per model over all items, not per topic.
4. Inspect hard examples qualitatively; Appendix C contrasts a simple Hamming-distance item (problem 8, all models score 1) with a category-theory injectivity item (problem 99, GPT-3.5=2, GPT-4=3, Gemini Pro=2; the appendix text calls the Gemini model "Bard").
5. Treat topic difficulty as a hypothesis, because the dataset does not label theorem difficulty and topic counts differ.

Inference: for VL, stratify by Rust feature and verification pattern—ownership, concurrency, arithmetic, memory safety, and API contracts—rather than reporting one aggregate pass rate.

## what the evidence means

The dataset denominator is 101 theorem pairs; model means are over those items, but the paper does not give per-topic denominators in the main results beyond Table 1's topic counts. It uses manual evaluation rather than compiling every output as an automated pass/fail. The authors explicitly note that perplexity or string matching is not robust because structurally different outputs can be equivalent (Section 1).

The paper concludes: “our findings indicate that even the most sophisticated models currently fall short in achieving accurate autoformalization.” (Section 3, p. 2) It hypothesizes that internet frequency and intrinsic description difficulty affect topic performance, and proposes labeling problem difficulty to correct correlation (Section 2). These are hypotheses, not measured causal explanations.

What is measured: human-assessed correction effort on 101 Lean4 statements for three named models. What stays trusted: the mathlib ground truth, informalization quality, model prompts, human graders, and the assumption that the rubric scores semantic correctness. No proof of the generated formalizations is reported, and the paper does not evaluate Verus, Rust, compilation, or proof search.

Inference: threat to agent-written verified Rust is high at the specification boundary. A model can produce plausible but semantically wrong contracts, especially for advanced domains; a Verus compile-and-proof check is therefore mandatory. Existing VL work should reuse stratified correction measurement and avoid treating language-model fluency or text similarity as verification evidence.

## techniques for the catalog

- paired formal/informal corpus — benchmark translation with canonical formal statements, natural-language statements, and topic labels
- zero-shot code prompting — present each requirement with a fixed instruction and retain the candidate formal code
- correction-effort grading — score the edits needed to reach a correct formalization on a 0–4 scale
- topic-stratified evaluation — report per-domain means and distributions to expose where autoformalization fails
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "I am providing you with a mathematical statement in natural language. I want you to formalize it in the Lean4 language."): read the whole paper (3 pages plus appendices A-D) and the whole study; checked every quotation, the 101 count and the Table 1 topic counts (they sum to 101), the 0-4 scale, the averages 2.238 and 2.248, the Information Theory/Logic versus Category Theory/Model Theory finding, the Appendix C scores for problems 8 and 99, and the link (arXiv 2406.06555v1, from the paper text); changed the claim that distributions are plotted by topic (Figure 1 is per-topic means, Appendix D histograms are per model), labeled the ground-truth comparison, one-output-per-item and minimum-edit steps as inference because the paper does not state them, and dropped the closing period inside the first quotation; did not check the HuggingFace benchmark, the cited works (Jiang et al. 2023, Pichai and Hassabis 2023), or the figure values beyond the text.
