# Autoformalization with Large Language Models
(authored by agents unless marked 🧑)
Tag: `wu2022autoformalization`, [paper](https://arxiv.org/abs/2205.12615)

## scope and result

This paper studies large language models (LLMs) translating natural-language mathematics into Isabelle/HOL theorem statements, then using the verified statements as training data for a neural theorem prover. Autoformalization is defined as translation from informal mathematics to formal specifications and proofs. The abstract reports, “we show large language models provide new prospects towards this goal.” (Abstract, p. 1.) The main evidence is on mathematical-competition problems (MATH and MiniF2F), not Rust programs or Verus specifications. The models are PaLM and Codex.

The paper reports two distinct outcomes. In a human inspection of 150 random MATH problems, Codex produced 38 perfect formalizations, or 38/150 = 25.3% (Section 4.4, p. 6). In a theorem-proving pipeline, two rounds of expert iteration raised MiniF2F test success from the base model's 29.9% to 35.2% (Table 3, p. 8). These denominators and splits matter: the 25.3% is correctness of translations on 150 sampled problems, while 35.2% is the fraction of MiniF2F test theorems proved by a neural prover.

## technique: few-shot autoformalization

when to use

Inference (the paper does not state a rule of use): use few-shot prompting when the target prover's syntax and library names are known but aligned natural-language/formal data are scarce. The prompt gives a small number of natural-language statements paired with Isabelle theorem statements, then asks the model to translate a new statement.

how the paper does it

1. Choose example pairs of a natural-language statement and its Isabelle formalization for the prompt. For the case studies the paper randomly selects two statements (Section 4.2, p. 4; Figure 2, p. 4). For the BLEU and 150-problem experiments it randomly samples 10 problems per subject (Section 4.3, p. 6; Appendix A.1 and A.2, pp. 16–19).
2. Append the target in the fixed format: `Natural language version: $Natural_Language_Statement. Translate the natural language version to an Isabelle version:` (Section 4, p. 4).
3. For “find the answer” questions, append the answer to turn the task into a proposition. The paper writes, “To transform a question into a proposition, we append the final answer after the question:” (Section 4, p. 3), then uses “The final answer is $Answer.”
4. Decode greedily: temperature 0 and `p = 1`; the paper performs no prompt engineering or tuning in the case studies (Section 4.2, p. 4).
5. Inference (the paper does not list this as a step): submit the generated theorem to Isabelle for syntax checking; the paper does count syntactically correct outputs (3,363 of 3,908, Section 5.3, p. 8). A syntactically correct statement can still be semantically wrong, so inspect correctness against the natural-language problem, as the paper does by hand in Section 4.4.

Figure 1 shows the method on an IMO problem. Codex generates an Isabelle theorem with `fixes f :: "nat \<Rightarrow> nat"`, assumes `\<forall> n. f (f n) = n + 1987`, and aims to show `False`, correctly encoding proof by contradiction (Figure 1, p. 2). Case Study 3 shows why examples matter: Codex invents `linear f` when it has no relevant example, but formalizes the concept correctly after the prompt adds a tangentially related example about a line (Section 4.2, pp. 5–6; Appendix B.3, p. 22).

what transfers to Verus

Inference: use a prompt containing paired English requirements and verified Verus contract skeletons, then ask the model to produce `requires`, `ensures`, datatype invariants, and lemma statements. Feed generated code to Verus and retain only outputs that compile and verify. Isabelle's theorem syntax does not transfer directly; Verus requires Rust types, executable bodies, and supported specification constructs. This is an inference.

evidence and limits

The experiments use 140 algebra and 120 number-theory MiniF2F problems with human Isabelle formalizations; 10 per subject are sampled for prompts, leaving 130 algebra and 110 number-theory evaluation examples (Section 4.3, p. 6). Table 1 gives Codex BLEU 57.13 for algebra and 43.33 for number theory; PaLM 8B gives 31.49 and 22.10 respectively (Table 1, p. 6). Within PaLM, BLEU rises with size (8B, 64B, 540B), and Codex scores highest (Section 4.3, p. 6). Inference: BLEU is a textual similarity measure, not proof validity, so a model could obtain a high BLEU score while making a logically wrong definition choice.

## technique: evaluate translation at multiple levels

when to use

Inference (the paper does not state a rule of use): use separate checks for syntax, semantic correctness, definition alignment, and proof success. This avoids treating compilable formal code as a correct specification.

how the paper does it

1. Collect a benchmark with paired informal statements and human formalizations (MiniF2F, 140 algebra plus 120 number theory problems; Section 4.3, p. 6).
2. Hold out prompt examples and compute BLEU against human formalizations (Table 1, p. 6).
3. Randomly sample 150 MATH problems, manually classify each output, and report both perfect translations and failure categories (Section 4.4, pp. 6–7).
4. For failures, distinguish incomplete or unclear prompts, definition/concept misalignment, missing or inconsistent assumptions, syntax/type errors, missing library definitions, and wrong function application (Table 2, p. 7).
5. Check downstream theorem-proving usefulness by running a prover on the generated statements and counting proofs accepted by Isabelle (Section 5, pp. 7–8).

Table 2's rows are not a partition of the 150 problems (50 each from algebra, number theory and intermediate algebra, Section 4.4, p. 6): perfect translation 13+17+8 = 38; incomplete/ill-formed/unclear 9+3+14 = 26; definition/concept alignment 10+18+18 = 46; inconsistent/missing assumption 8+9+9 = 26; syntax/type error 7+2+11 = 20; missing Isabelle definition 0+12+3 = 15; wrong application 6+13+16 = 35; other 6+2+1 = 9. These sum to 215, not 150, and the column sums are 59 (algebra), 76 (number theory) and 80 (intermediate algebra) against 50 problems each. Inference: a problem can therefore be counted under several failure categories; the paper does not explain the overlap. This arithmetic is my check of the paper's published table.

The authors summarize the observed errors: “The majority of the failures are due to the misalignment of informal and formal definitions.” (Section 4.4, p. 6.)

what transfers to Verus

Inference: measure Verus autoformalization with at least four denominators: generated files, parser/type-check success, verifier success, and independent semantic review against the English requirement. Report each fraction separately and classify failures such as wrong ownership preconditions, missing loop invariants, unsupported syntax, and vacuous contracts. This is an inference.

evidence and limits

The 38/150 result is a human judgment sample of Codex output (Section 4.4, p. 6), not an exhaustive evaluation. The paper says 25.3% in the abstract, which matches 38/150 to one decimal place. It does not report inter-rater agreement in the cited section. Inference: BLEU scores compare strings and do not establish logical equivalence.

## technique: expert iteration from verified autoformalized statements

when to use

Inference (the paper does not state a rule of use): use expert iteration when a prover can search for proofs of many generated statements and a proof checker can filter successful attempts. Correctly proved generated theorems become additional training data, creating a feedback loop without manually formalizing every statement.

how the paper does it

1. Generate a set `A` of autoformalized theorem statements.
2. Start with a base neural prover `M0`. For each iteration i = 1 ... N, use the model `M(i-1)` with best-first search to prove as many theorems as possible in `A` (Section 5.1, p. 7).
3. Collect the set of successful proofs `Si`.
4. Construct `Ai = (union over j <= i of Sj) union B`, where `B` is the paper's “formal mathematics problems” (Section 5.3 names PISA and the successful proofs as the concatenated data, p. 8); when taking the union of successful proofs, deduplicate by problem statement (Section 5.1, p. 7).
5. Fine-tune `M0` on `Ai` “for exactly one epoch” to get `Mi` (Section 5.1, p. 7). The paper runs N = 2 iterations.
6. Evaluate each model on held-out MiniF2F validation and test sets (Section 5.3, p. 8).

The paper states the core loop plainly: “Newly found correct proofs can then be used as the new training data to improve the neural prover [6, 37, 38].” (Section 5.1, p. 7.)

what transfers to Verus

Inference: generate candidate Verus specs or proof lemmas, run Verus as the proof checker, and fine-tune only on candidates whose exact code verifies against a non-vacuous test harness. Keep the original English requirement and executable implementation as conditioning data so the loop does not reward statements that are easy but irrelevant. Verus proof acceptance is a stronger filter than syntax, but it still cannot detect a contract that is too weak for the intended requirement. This is an inference.

evidence and limits

The training experiment starts with 3,908 Codex formalizations from MATH training problems; 3,363 are syntactically correct. In iteration 1, `M0` proves 782 theorems, 23.3% of 3,363; iteration 2 gives 1,011 successful proofs, 30.1% (Section 5.3, p. 8; the paper states the denominator 3,363 only for the first figure, and 1,011/3,363 = 30.06% matches the second). These are proof-search successes on the autoformalized set, not correctness rates for all generated statements.

The base model uses the PISA dataset of 2.49 million Isabelle proof steps and a GPT-2-style decoder-only transformer with 700M non-embedding parameters (Section 5.2, pp. 7–8). The experiments consume 3,920 TPU hours: 3,200 for proof search, 240 for training on successful proofs, and 480 for MiniF2F evaluation (Section 5.2, p. 8). Those are resource denominators for this setup, not a general cost estimate.

## technique: proof-checker feedback and theorem-prover evaluation

The neural prover predicts the next Isabelle proof token from the proof state and previous step. If the target step contains `metis`, `meson`, or `smt`, the model emits `<hammer>` and invokes Isabelle's Sledgehammer with a 30-second timeout (Section 5.2, p. 7). Inference: proof acceptance comes from Isabelle, not from the model's confidence.

Table 3 reports MiniF2F success rates by split: the base model is 28.3% valid and 29.9% test; after one iteration, 36.1% and 34.0%; after two, 37.3% and 35.2% (Table 3, p. 8). The reported gains are therefore +7.8 and +4.1 percentage points after one iteration, then +1.2 points on each split after the second. The paper compares 35.2% test with a prior 29.6% state of the art, a +5.6-point difference (Section 5.3, p. 8).

what transfers to Verus

Inference: use the Verus verifier as the acceptance oracle and report valid/test splits by repository, API family, and specification difficulty. Record solver timeout separately from failed proof and failed compilation. A Verus proof that passes only because the postcondition is vacuous must be rejected by an independent contract-strength test. This is an inference.

## technique: informalization and back-translation

The reverse direction translates Isabelle statements back to natural language, which the paper motivates by human readability and by creating aligned data for back-translation (Section 6.2, p. 9). The paper only motivates back-translation; it does not train with it, and concludes that “the model is better at informalization than formalization, showing the prospect of backtranslation style algorithms.” (Section 6.2, p. 9.) An Isabelle expert selected 38 formal theorems, lemmas and definitions, which Codex translated. For these 38 statements: 36 are reasonably coherent and 29 of those, 29/38 = 76%, are more-or-less correct, against the 25% success rate of formalization in Section 4.4 (Section 6.2, p. 9). The standard is deliberately relaxed because a human supplies obvious context and corrects minor errors.

Inference: for Verus, back-translate verified contracts into plain-language obligations and have a reviewer compare them with the intended product requirement. This can expose a formally valid but semantically incomplete contract. The 29/38 result is evidence for this workflow's promise in Isabelle, not a result about Verus. This is an inference.

## advanced mathematics and failure boundary

The paper's advanced example asks whether an arbitrary product of compact spaces is compact. Codex outputs an Isabelle statement that confuses products of numbers, sets, and topological spaces; the correct conclusion needs `compact_space (product_topology X I)` and an index set (Section 6.1, p. 9). This demonstrates that context and library-definition alignment become harder outside competition problems.

The authors identify three core difficulties: “the model needs to (1) bridge the logical gaps left in pen-and-paper proofs, (2) assume the implicit contexts and assumptions, and (3) align informal definitions/concepts to formal ones.” (Section 6.1, p. 9.) They also warn that larger theories exceed current context windows and that generating complete theories with all definitions needs new methods (Section 7, p. 10).

## what is proved, measured, and trusted

The paper uses Isabelle to check proofs found by the prover (Section 5.1, p. 7). The autoformalization model itself is not proved correct; 25.3% is a sampled translation correctness rate from manual evaluation (Section 4.4, p. 6). BLEU, proof-search success, and MiniF2F rates measure different things and must not be conflated. Inference: the trusted components include the Isabelle checker and its library definitions, the human formalizations used as references, the choice of model and prompt, and the human classification of the 150 cases; the paper does not enumerate a trusted base.

## techniques for the catalog

- few-shot autoformalization — prompt an LLM with paired natural-language and formal examples, then decode a target theorem statement
- multi-level evaluation — separate syntax, definition alignment, human semantic correctness, and kernel-accepted proof success
- expert iteration — use proof-checker-accepted proofs of autoformalized statements as new training data over repeated rounds
- proof-oracle training — let the interactive prover, not model confidence, filter candidate proofs (Sledgehammer is run with a 30 second timeout)
- informalization back-translation — translate formal statements back to natural language, which the paper proposes as a prospect for creating aligned data but does not run as training
- context-aware theory alignment — Inference: treat library definitions, hidden assumptions, and large-theory context as explicit failure boundaries; the paper reports these as limitations (Sections 6.1 and 7), not as a technique
