# Beyond Correctness: Exposing LLM-generated Logical Flaws in Reasoning via Multi-step Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `zheng2025beyond`, [paper](https://arxiv.org/abs/2512.23511)

## purpose and pipeline
The paper introduces Multi-step Automatic Theorem Proving (MATP), a post-hoc evaluator for reasoning traces. It translates premises, candidate conclusions, and the retained LLM reasoning sentences into first-order logic (FOL), sends formulas to the Vampire automated theorem prover, verifies each step, checks whether the trace contains a valid proof path, and assigns a fine-grained chain category. The paper describes the goal as “A post-hoc evaluation framework for LLM-generated reasoning.” (Sec. 1, p.2)

MATP evaluates a reasoning trace separately from generating it. The input is premises P, candidate conclusion C, ground-truth label L, reasoning steps S, and predicted answer A (Sec. 3.1 and Fig. 2, pp.3–4).

## technique 1: constrained natural-language-to-FOL translation
Use a controlled translation prompt when the source reasoning has no explicit formal structure. The paper's method is:

1. Ask the target LLM to produce a step-by-step reasoning process from premises alone, then a True/False decision for C (Sec. 3.2.1, p.4).
2. Split the response into sentences and remove uncertain or speculative statements containing ambiguity markers such as “possible”, “contradict”, or “not necessarily” (Sec. 3.2.1, p.4).
3. Prompt GPT-4o to translate premises, reasoning steps, and conclusions in one pass. The prompt requires one FOL formula per sentence, explicit quantifiers, indexed references to source sentences, and no extra text (Fig. 3, p.4).
4. Enforce cross-step entity and predicate consistency, reuse existing predicates before introducing new ones, and include examples that distinguish exclusive-or from inclusive-or (Sec. 3.2.2, pp.4–5).
5. Deduplicate repetitive statements after conversion to FOL (Sec. 3.2.1, p.4).
6. Convert FOL to TPTP with a deterministic Python mapping, normalize names and Unicode, repair lightweight syntax errors, and rewrite unsupported exclusive disjunction as `(¬A ∧ B) ∨ (A ∧ ¬B)` (Sec. 3.3, p.5).

The paper's prompt rule is: “Each sentence must be converted into a single FOL formula.” (Fig. 3, p.4) It also says the output must contain “first-order logic formulas with NO other texts.” (Fig. 3, p.4)

Inference: in Verus, the analogous front end would translate each natural-language proof claim into a typed spec proposition, then map it to `requires`, `ensures`, `assert`, or a `proof fn` obligation. Keep source sentence IDs in comments or a sidecar map so every obligation points back to the request. Do not treat an LLM's FOL or Rust translation as trusted until it is reviewed against the intended specification.

Evidence and failure modes: Table 4 records wrong quantifier domains, replacing “or” with conjunction, omitting a predicate needed for a candidate conclusion, using different predicates for the same concept, confusing XOR with OR, and mishandling comparative expressions (Sec. 4.4.3, pp.9–10). On the 384 PrOntoQA-OOD items, MATP execution rate (ER) is 99.06% average and execution accuracy (EA) 99.90%; on 344 ProofWriter items these are 99.53% and 99.24%; on 355 FOLIO items they are 96.06% and 70.88% (Table 1, p.7). ER is the fraction executable by Vampire; EA is agreement with the ground-truth label among executable outputs (Sec. 4.2.1, p.7). Inference: the lower FOLIO EA shows that syntactic execution does not guarantee semantic preservation.

Limits: the translation model can silently alter meaning. The implementation limits generation attempts to three per input (Sec. 4.1, p.7). Sentence-level translation evaluation uses manually annotated reference FOL for 300 premises per dataset for PrOntoQA-OOD and ProofWriter, cross-verified by three authors (Sec. 4.2.1, p.7).

## technique 2: regeneration on execution or label failure
Use bounded regeneration when an FOL translation cannot execute or its verdict disagrees with the dataset label. The paper's steps are:

1. Convert FOL to TPTP and verify C against P before checking individual reasoning steps against P (Algorithm 2, p.5).
2. If execution fails, or if the candidate conclusion's verdict disagrees with L, discard the translation and retry NL2FOL up to a fixed maximum (Sec. 3.2.3, p.5; Sec. 3.3, pp.5–6).
3. If all retries fail, return an error and exclude the input from successful analysis (Sec. 3.2.3, p.5; Sec. 3.4, p.6).
4. Provide no feedback during regeneration; an ablation instead feeds the entire previous generation back into the prompt (Sec. 3.2.3, p.5; Sec. 4.5, p.10).

The paper states, “If all retries fail, an error is returned, indicating failure to analyze the input.” (Sec. 3.2.3, p.5) In the ablation on 355 FOLIO tasks, failure counts with feedback versus without feedback are 118 versus 116 for GPT-4o and 119 versus 111 for DeepSeek-R1 (Table 5, p.10), so feedback did not improve this setting and was excluded from the actual implementation.

Inference: in Verus, bounded repair can regenerate a candidate contract or proof sketch after a compiler/verifier failure, but a successful retry must still be checked against an independent specification. Track exhausted retries as analysis failures rather than silently treating them as verified.

## technique 3: single-statement ATP verification
Use single-statement verification to classify each reasoning step as True, False, Unknown, or Error. The paper's Algorithm 1 runs the prover twice:

1. Check whether P entails S by running `ATPRun(P,S)`.
2. Check whether P entails the negation by running `ATPRun(P,¬S)`.
3. If both refutations succeed, return Error because the premises are contradictory.
4. If only the first succeeds, return True; if only the second succeeds, return False; if neither succeeds, return Unknown (Algorithm 1, Sec. 3.3, p.5).

The paper explains, “If either holds, 𝑆 is classified as True or False accordingly.” (Sec. 3.3, p.5) A False or Unknown step is recorded as a potential logical error (Sec. 3.3, p.5).

Inference: for Verus, the two checks correspond to proving a proposition and proving its negation under the same preconditions. Use a `proof fn` or `assert` to establish the intended direction; record an unproved obligation without assuming its negation. Verus's solver may not expose the same four-way result directly, so preserve an explicit result enum in an external evaluator.

Inference: ATP validity is relative to the translated premises. If NL2FOL omitted a premise or changed a predicate, the prover can return a sound result for the wrong problem.

## technique 4: proof-path construction and chain classification
Use proof-path analysis to distinguish a correct answer reached by valid reasoning from a lucky answer. After annotating every step, MATP constructs a candidate path from True steps only:

1. Initialize an empty proof path.
2. Process reasoning steps in order; add a True step only if it is Unknown relative to the facts already in the path, meaning it contributes a new fact (Algorithm 3, Sec. 3.3, p.6).
3. Check C against the resulting path and compare its truth value with L.
4. Classify the chain using answer correctness, step correctness, and proof-path existence (Sec. 3.4, p.6).

The six categories are T1 (correct answer, all steps correct, valid path), T2 (correct answer, some incorrect steps but a valid path after removing them), T3 (correct answer, all steps correct, no valid path), T4 (correct answer with incorrect steps and no valid path), F1 (incorrect answer but all steps correct), and F2 (incorrect answer with at least one incorrect step) (Sec. 3.4, p.6). The paper notes, “This allows us to distinguish between responses that are correct by chance and those based on valid reasoning.” (Sec. 3.4, p.6)

Inference: in Verus, the path is analogous to the subset of lemmas and assertions actually needed for a postcondition. Record which proof functions establish each new fact and reject a final result if no valid dependency path reaches the required contract. This is an orchestration and audit layer; Verus itself checks the proof obligations, while an external tool can classify traces.

Evidence: MATP's macro-F1 for step correctness is 94.26% on PrOntoQA-OOD, 91.24% on ProofWriter, and 84.42% on FOLIO, compared with GPT-4o baselines of 47.79%, 49.36%, and 45.17% (Table 1, p.7). The step-correctness evaluation sample consists of 20 ER-contributing tasks per dataset for each of 10 models, 600 samples total, with each step manually labeled by three authors (Sec. 4.2.2, p.7). Inference: these sampled step-label results should not be read as measurements on every benchmark instance.

The separate chain-classification dataset contains 200 PrOntoQA-OOD tasks, with 50 examples of each T1–T4 category. T2 inserts a negated premise, T3 removes key steps and adds irrelevant content, and T4 combines both changes. MATP classifies T1–T3 with 100% accuracy and T4 with 96%, for 99% overall; the two errors are attributed to NL2FOL deviations (Sec. 4.3 and Fig. 4, p.8).

## what is proved, measured, and trusted
MATP measures translation execution rate, execution accuracy, FOL BLEU, logical equivalence, step-level macro-F1, chain categories, and model-specific error patterns. Inference: the theorem prover establishes entailment relative to the generated FOL/TPTP formulas. It does not prove that the LLM's translation preserves the original natural-language meaning, that manually labeled ground truth is error-free, or that the selected benchmark samples represent production reasoning.

The benchmark contains 384 PrOntoQA-OOD, 344 ProofWriter, and 355 FOLIO tasks, with 10 target LLMs and 10,830 generated instances (Sec. 4.1, pp.6–7). GPT-4o creates NL2FOL translations; Vampire performs automated verification; experiments run on Ubuntu 22.04 with two 64-core AMD EPYC 7713 CPUs, 512 GB RAM, and two NVIDIA A100 GPUs (Sec. 4.1, p.7).

## techniques for the catalog
- constrained NL-to-FOL translation: force indexed, quantified formulas with predicate-consistency and connective rules
- bounded regeneration: retry translations after execution or label failure and record exhausted retries as errors
- single-statement ATP checking: test both a statement and its negation to classify True, False, Unknown, or Error
- proof-path chain classification: construct a dependency path from valid steps and distinguish sound, partial, lucky, and invalid reasoning
