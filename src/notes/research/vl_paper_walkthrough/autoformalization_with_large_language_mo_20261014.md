# Autoformalization with Large Language Models
(authored by agents unless marked 🧑)
Tag: `wu2022autoformalization`, [paper](https://doi.org/10.48550/arxiv.2205.12615)


## scope and result

This paper studies large language models (LLMs) translating natural-language mathematics into Isabelle/HOL theorem statements, then using the verified statements as training data for a neural theorem prover. Autoformalization is defined as translation from informal mathematics to formal specifications and proofs. The abstract reports, “we show large language models provide new prospects towards this goal.” (Abstract, p. 1.) The main evidence is on mathematical-competition problems, not Rust programs or Verus specifications.

The paper reports two distinct outcomes. In a human inspection of 150 random MATH problems, Codex produced 38 perfect formalizations, or 38/150 = 25.3% (Section 4.4, p. 6). In a theorem-proving pipeline, two rounds of expert iteration raised MiniF2F test success from the base model's 29.9% to 35.2% (Table 3, p. 8). These denominators and splits matter: the 25.3% is correctness of translations on 150 sampled problems, while 35.2% is the fraction of MiniF2F test theorems proved by a neural prover.

## technique: few-shot autoformalization

when to use

Use few-shot prompting when the target prover's syntax and library names are known but aligned natural-language/formal data are scarce. The prompt gives a small number of natural-language statements paired with Isabelle theorem statements, then asks the model to translate a new statement.

how the paper does it

1. Choose two mathematical statements and their Isabelle formalizations as prompt examples (Section 4, pp. 3–4).
2. Append the target in the fixed format: `Natural language version: $Natural_Language_Statement. Translate the natural language version to an Isabelle version:` (Section 4, p. 4).
3. For “find the answer” questions, append the answer to turn the task into a proposition. The paper writes, “To transform a question into a proposition, we append the final answer after the question:” (Section 4, p. 3), then uses “The final answer is $Answer.”
4. Decode greedily: temperature 0 and `p = 1`; the paper performs no prompt engineering or tuning in the case studies (Section 4.2, p. 4).
5. Submit the generated theorem to Isabelle syntax and proof checking. A syntactically correct statement can still be semantically wrong, so inspect correctness against the natural-language problem.

Figure 1 shows the method on an IMO problem. Codex generates an Isabelle theorem with `fixes f :: "nat => nat"`, assumes `forall n. f (f n) = n + 1987`, and aims to show `False`, correctly encoding proof by contradiction (Figure 1, p. 2). Case Study 3 shows why examples matter: Codex invents `linear f` when it has no relevant example, but formalizes the concept correctly after a related few-shot example (Section 4.2, p. 5).

what transfers to Verus

Inference: use a prompt containing paired English requirements and verified Verus contract skeletons, then ask the model to produce `requires`, `ensures`, datatype invariants, and lemma statements. Feed generated code to Verus and retain only outputs that compile and verify. Isabelle's theorem syntax does not transfer directly; Verus requires Rust types, executable bodies, and supported specification constructs. This is an inference.

evidence and limits

The experiments use 140 algebra and 120 number-theory MiniF2F problems with human Isabelle formalizations; 10 per subject are sampled for prompts, leaving 130 algebra and 110 number-theory evaluation examples (Section 4.3, p. 6). BLEU is a textual similarity measure, not proof validity. Table 1 gives Codex BLEU 57.13 for algebra and 43.33 for number theory; PaLM 8B gives 31.49 and 22.10 respectively (Table 1, p. 6). A model can obtain a high BLEU score while making a logically wrong definition choice.

## technique: evaluate translation at multiple levels

when to use

Use separate checks for syntax, semantic correctness, definition alignment, and proof success. This avoids treating compilable formal code as a correct specification.

how the paper does it

1. Collect a benchmark with paired informal statements and human formalizations (MiniF2F, 140 algebra plus 120 number theory problems; Section 4.3, p. 6).
2. Hold out prompt examples and compute BLEU against human formalizations (Table 1, p. 6).
3. Randomly sample 150 MATH problems, manually classify each output, and report both perfect translations and failure categories (Section 4.4, pp. 6–7).
4. For failures, distinguish incomplete or unclear prompts, definition/concept misalignment, missing or inconsistent assumptions, syntax/type errors, missing library definitions, and wrong function application (Table 2, p. 7).
5. Check downstream theorem-proving usefulness by running a prover on the generated statements and counting proofs accepted by Isabelle (Section 5, pp. 7–8).

Table 2's categories total 150: perfect translation 13+17+8 = 38; incomplete/ill-formed/unclear 9+3+14 = 26; definition/concept alignment 10+18+18 = 46; inconsistent/missing assumption 8+9+9 = 26; syntax/type error 7+2+11 = 20; missing Isabelle definition 0+12+3 = 15; wrong application 6+13+16 = 35; other 6+2+1 = 9. These category counts overlap because the row sum is greater than 150, so the table is not a partition; the paper does not explain the overlap. This arithmetic is a check of the paper's published table.

The authors summarize the observed errors: “The majority of the failures are due to the misalignment of informal and formal definitions.” (Section 4.4, p. 6.)

what transfers to Verus

Inference: measure Verus autoformalization with at least four denominators: generated files, parser/type-check success, verifier success, and independent semantic review against the English requirement. Report each fraction separately and classify failures such as wrong ownership preconditions, missing loop invariants, unsupported syntax, and vacuous contracts. This is an inference.

evidence and limits

The 38/150 result is a human judgment sample, not an exhaustive evaluation. The paper says 25.3% in the abstract, which matches 38/150 to one decimal place. It does not report inter-rater agreement in the cited section. BLEU scores compare strings and do not establish logical equivalence.

## technique: expert iteration from verified autoformalized statements

when to use

Use expert iteration when a prover can search for proofs of many generated statements and a proof checker can filter successful attempts. Correctly proved generated theorems become additional training data, creating a feedback loop without manually formalizing every statement.

how the paper does it

1. Generate a set `A` of autoformalized theorem statements.
2. Start with a base neural prover `M0` and run best-first proof search on every theorem in `A`.
3. Collect the successful proofs `Si` accepted by Isabelle.
4. Construct `Ai = (union over j <= i of Sj) union B`, where `B` is the original formal mathematics training set; deduplicate by problem statement (Section 5.1, p. 7).
5. Fine-tune the base model for one epoch on `Ai` to obtain `Mi`, then repeat for a fixed number of iterations.
6. Evaluate each model on held-out MiniF2F validation and test sets (Section 5.3, p. 8).

The paper states the core loop plainly: “Newly found correct proofs can then be used as the new training data to improve the neural prover.” (Section 5.1, p. 7.)

what transfers to Verus

Inference: generate candidate Verus specs or proof lemmas, run Verus as the proof checker, and fine-tune only on candidates whose exact code verifies against a non-vacuous test harness. Keep the original English requirement and executable implementation as conditioning data so the loop does not reward statements that are easy but irrelevant. Verus proof acceptance is a stronger filter than syntax, but it still cannot detect a contract that is too weak for the intended requirement. This is an inference.

evidence and limits

The training experiment starts with 3,908 Codex formalizations from MATH training problems; 3,363 are syntactically correct. In iteration 1, `M0` proves 782/3,363 = 23.3%; iteration 2 proves 1,011/3,363 = 30.1% (Section 5.3, p. 8). These are proof-search successes on the autoformalized set, not correctness rates for all generated statements.

The base model uses the PISA dataset of 2.49 million Isabelle proof steps and a 700M-parameter GPT-2-style decoder (Section 5.2, p. 7). The experiments consume 3,920 TPU hours: 3,200 for proof search, 240 for training on successful proofs, and 480 for MiniF2F evaluation (Section 5.2, p. 8). Those are resource denominators for this setup, not a general cost estimate.

## technique: proof-checker feedback and theorem-prover evaluation

The neural prover predicts the next Isabelle proof token from the proof state and previous step. If the target step contains `metis`, `meson`, or `smt`, the model emits `<hammer>` and invokes Isabelle's Sledgehammer with a 30-second timeout (Section 5.2, p. 7). Proof acceptance comes from Isabelle, not from the model's confidence.

Table 3 reports MiniF2F success rates by split: the base model is 28.3% valid and 29.9% test; after one iteration, 36.1% and 34.0%; after two, 37.3% and 35.2% (Table 3, p. 8). The reported gains are therefore +7.8 and +4.1 percentage points after one iteration, then +1.2 points on each split after the second. The paper compares 35.2% test with a prior 29.6% state of the art, a +5.6-point difference (Section 5.3, p. 8).

what transfers to Verus

Inference: use the Verus verifier as the acceptance oracle and report valid/test splits by repository, API family, and specification difficulty. Record solver timeout separately from failed proof and failed compilation. A Verus proof that passes only because the postcondition is vacuous must be rejected by an independent contract-strength test. This is an inference.

## technique: informalization and back-translation

The reverse direction translates Isabelle statements back to natural language to improve human readability and create aligned data. The paper evaluates 38 formal statements: 36 are reasonably coherent and 29 of those, 29/38 = 76%, are more-or-less correct (Section 6.2, p. 9). The standard is deliberately relaxed because a human supplies obvious context and corrects minor errors.

Inference: for Verus, back-translate verified contracts into plain-language obligations and have a reviewer compare them with the intended product requirement. This can expose a formally valid but semantically incomplete contract. The 29/38 result is evidence for this workflow's promise in Isabelle, not a result about Verus. This is an inference.

## advanced mathematics and failure boundary

The paper's advanced example asks whether an arbitrary product of compact spaces is compact. Codex outputs an Isabelle statement that confuses products of numbers, sets, and topological spaces; the correct conclusion needs `compact_space (product_topology X I)` and an index set (Section 6.1, p. 9). This demonstrates that context and library-definition alignment become harder outside competition problems.

The authors identify three core difficulties: “the model needs to (1) bridge the logical gaps left in pen-and-paper proofs, (2) assume the implicit contexts and assumptions, and (3) align informal definitions/concepts to formal ones.” (Section 6.1, p. 9.) They also warn that larger theories exceed current context windows and that generating complete theories with all definitions needs new methods (Section 7, p. 10).

Inference: the threat to agent-written verified Rust is high at the specification boundary. A model can emit compilable Verus code with an omitted precondition, an overstrong assumption, or a postcondition unrelated to the English requirement. The paper's own failure modes—missing assumptions and wrong definition alignment—are direct analogues. VL should reuse verifier-backed filtering and independent semantic review rather than redo generic few-shot prompting research. This is an inference.

## what is proved, measured, and trusted

The formal prover checks Isabelle statements and proofs, so accepted proofs have the assurance of Isabelle's kernel and libraries. The autoformalization model itself is not proved correct; 25.3% is a sampled translation correctness rate. BLEU, proof-search success, and MiniF2F rates measure different things and must not be conflated. The trusted components include the Isabelle kernel, its library definitions, the human formalizations used as references, model and prompt selection, and human classification of the 150 cases.

Inference: a VeruLaw pipeline should preserve the generated candidate, the exact Verus version and solver result, the English source, and an independently reviewed semantic mapping. It should report denominator, model, split, timeout, and contract-strength checks for every claimed rate. This is an inference.

## techniques for the catalog

- few-shot autoformalization — prompt an LLM with paired natural-language and formal examples, then decode a target theorem statement
- multi-level evaluation — separate syntax, definition alignment, human semantic correctness, and kernel-accepted proof success
- expert iteration — use proof-checker-accepted proofs of autoformalized statements as new training data over repeated rounds
- proof-oracle training — let the interactive prover, not model confidence, filter candidate proofs and expose timeout outcomes
- informalization back-translation — translate formal statements back to natural language to create aligned data and reveal missing context
- context-aware theory alignment — treat library definitions, hidden assumptions, and large-theory context as explicit failure boundaries
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
