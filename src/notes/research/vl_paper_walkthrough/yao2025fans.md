# FANS: Formal Answer Selection for LLM Natural Language Math Reasoning Using Lean4
(authored by agents unless marked 🧑)
Tag: `yao2025fans`, [paper](https://doi.org/10.18653/v1/2025.emnlp-main.158)

## scope and result

FANS uses Lean4 as a filter for answers generated in natural-language math. Its three stages are NL-to-formal translation, formal proof generation and compiler verification, then answer selection using the verified subset. The abstract states: “given an NL math question and LLM-generated answers, FANS first translates it into Lean4 theorem statements. Then it invokes another Lean4 prover LLM to produce proofs, and finally verifies the proofs by Lean4 compiler.”

Inference: The paper proves translated Lean statements, not that the translation preserves the original question. A Lean proof can be valid for a mistranslated or vacuous theorem. The trusted boundary therefore includes the translator, translation checker, Lean prover/compiler, theorem libraries, and the answer-selection policy.

## technique 1: train a long-CoT NL-to-formal translator

Use this when inputs are natural-language questions and answers but the checker requires formal theorem statements. The authors collect 162,181 aligned NL–Lean records: 21,967 from DeepSeek-Prover-v1 statements and 140,214 from Lean-Workbook (section 2.1, page 2). They train LoT-Solver by transfer learning because no long-CoT translation corpus exists.

Steps in section 2.1 and Appendix A:

1. Collect aligned natural-language and Lean theorem statements.
2. During training, instruct the model to answer without long chain-of-thought and provide an empty placeholder.
3. During inference, request long-CoT reasoning before emitting the Lean theorem statement.
4. For an external translator, ask the base model or QwQ-32B to judge whether the formal statement faithfully represents the natural-language question.
5. Reject or fall back when translation checks fail.

The paper says: “During inference, we instruct the model to use Long CoT to answer the question.” It warns that “it is not guaranteed that the translated FL statements are perfectly consistent with the original NL statements.”

Inference: For Verus, this is analogous to translating a prose requirement into a Rust/Verus contract. Use an explicit `requires`/`ensures` schema and a second checker to compare the contract with the prose. Verus verification cannot repair a contract that omits a required condition.

## technique 2: prove each candidate and select by checker acceptance

Use this when multiple LLM answers exist and majority vote or reward models may select a fluent but false answer. For every translated theorem, call a formal prover, then submit its proof to Lean's type checker. Keep answers whose proofs compile. The paper describes Lean's role as “a type-checking system that enforces strict logical consistency.”

The paper's steps (sections 2.2–2.3, pages 2–3) are:

1. Convert every question-answer pair into a standard Lean theorem statement.
2. Prompt an open-source Lean prover with few-shot examples.
3. Compile each generated proof.
4. Select among answers with successful proofs, optionally combining the verified subset with majority vote or an outcome reward model.
5. If no proof is found, fall back to the alternate selector.

Inference: In Verus, generate candidate `proof fn` or contract bodies, run `verus`, and retain only candidates that satisfy the specified postconditions. A checker-accepted proof is evidence for the formal contract, not for the natural-language intent.

## technique 3: verified voting with a false-positive threshold

Use this when formalization can produce false positives. The authors first majority-vote only answers whose formal proofs verify; if the winner's vote count is below a preset threshold, they discard the verified selection and return to ordinary majority voting (section 2.3, page 3). This keeps a few accidentally provable translations from dominating.

The paper's limitation is explicit: “One major limitation of using formal language for answer selection is its high false positive rate and the inherent incompleteness of provers.” Inference: VL should expose translation confidence and proof coverage separately instead of treating a successful proof as an unconditional answer truth.

## technique 4: fallback and external translation checking

Use fallback when all formal proofs fail or the translator may have changed the problem. FANS can use vanilla majority voting or reward-model ranking; a stronger external LLM can inspect formalization before answer selection (sections 2.1 and 2.3, pages 2–3).

The authors compare self-checking and external checking. In Table 2, with the new translator and DeepSeek-Prover-v2, external checking gives MATH500 61.00%, while self-checking gives 57.60%, and removing false positives gives 61.80%. The denominator is MATH500's 500 problems. For Qwen2.5-Math-7B, external checking gives 88.00% on MATH500 versus 87.40% self-checking and 88.80% with false positives removed (Table 2, page 4).

Inference: For Verus, use a second model or human review to inspect contracts that verify suspiciously easily, but never let the reviewer replace the verifier. If no proof exists, report “unverified” rather than silently converting a failed proof to a trusted result.

## evidence and limitations

On Table 1's MATH500 (500 problems), Mistral-FANS reaches 36.40% versus Mistral majority vote 33.80%; DeepSeek-Math ORM+FANS reaches 63.80% versus 62.60% ORM; Qwen ORM+FANS reaches 81.80% versus 80.80%. On AMC23 (40 problems), Mistral-FANS is 15.00% versus 12.50%, and DeepSeek ORM+FANS is 32.50% versus 30.00%. The paper reports relative improvements of up to 1.91% on MATH500 and 8.33% on AMC23 in its table, while its conclusion also says “achieving at most a relative improvement of 7.9% on MATH500 Number Theory and 20% on AMC23.” These are different metrics: Table 1's “Improvement(%)” is relative percentage change for the listed benchmark columns, whereas the conclusion's figures refer to another comparison or subfield; the paper does not reconcile the discrepancy.

FANS performs best where Lean libraries are strong: Table 1 shows DeepSeek ORM+FANS Number Theory 66.13% versus 61.29% and Algebra 82.26%, unchanged from ORM. The authors state that limited Lean coverage constrains geometry and combinatorics. Inference: Verus's analogous coverage limits are its supported Rust subset, library contracts, solver automation, and specifications for external code.

## what is proved, measured, and trusted

The measured object is answer-selection accuracy on MATH500, AMC23, Minerva Math, and Olympiad Bench; the proof object is a generated Lean theorem. Training uses 162,181 records and Lean verification on CPUs with H200 model training/inference (section 3.2, page 4). Inference: FANS does not establish semantic equivalence between the original natural-language question and the formal theorem. For agent-written verified Rust, the threat is substantial: a pipeline can make untrusted outputs look rigorous if contract translation is wrong, but the same pipeline is useful when requirements are explicit and independently reviewed.

## what VL should not redo

Inference: VL should not repeat the basic pattern of filtering generated answers by proof-checker acceptance or the warning that formalization can be vacuous. New work should measure prose-to-Verus contract fidelity, false-positive rates, and fallback behavior on systems specifications rather than math answers.

## techniques for the catalog

- long-CoT formal translation: train on aligned prose/formal statements, elicit analysis at inference, and check translation fidelity
- proof-filtered answer selection: generate formal proofs and retain candidates only after compiler acceptance
- thresholded verified voting: use verified answers in voting but fall back when support is below a threshold
- external translation checking: have a stronger model or independent checker inspect formalization before trusting a proof
- principled fallback: use majority or reward-model selection when formal proving is incomplete, while exposing the result as unverified
Checked 2026-10-15 against paper yao2025fans: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
