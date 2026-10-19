# Verification and Refinement of Natural Language Explanations through LLM-Symbolic Theorem Proving
(authored by agents unless marked 🧑)
Tag: `quan2024verification`, [paper](http://arxiv.org/abs/2405.01379v4)

## method
Explanation-Refiner combines an LLM, Neo-Davidsonian event semantics, first-order logic, Isabelle/HOL, and iterative feedback. Given premise `p`, hypothesis `h`, and explanation facts `E`, validity means `p ∪ E |= h` (Section 2, p. 2). Each explanation fact becomes an axiom; the premise and hypothesis become a theorem. The paper states: “The theorem prover is implemented as a checker to identify any syntax errors and provide these error details as feedback to an LLM, enabling the LLM to iteratively correct the syntax errors over a fixed number of iterations, denoted by t.” (Section 3, p. 3).

The framework separates syntax repair from logical repair. A syntax error is corrected by sending Isabelle's diagnostic to the LLM for up to three iterations. After this bounded syntax-repair stage, the LLM proposes a rough inference and formal proof steps, and Isabelle checks the theory. Algorithm 1 proceeds to proof construction even if syntax errors remain after the repair budget. Failed proof steps and the axioms used are fed back to refine the explanation. Inference: this loop verifies the generated theory, rather than the LLM itself.

## technique 1: event-based autoformalisation

Neo-Davidsonian semantics introduces event variables and explicit Agent and Patient roles for verbs, while FOL handles static predicates. For “A wolf eating a sheep is an example of a predator hunting prey”, the paper formalises separate eating and hunting events and links them with `example(e1,e2)` (Section 3.1, pp. 3–4). The representation is intended to reduce semantic loss from direct LLM-to-FOL translation.

How to apply it.
1. Identify action verbs in each sentence, ignoring auxiliary and modal verbs (Figure 13, p. 17).
2. Convert sentences to logical forms with entities, events, and roles such as `Agent` and `Patient`.
3. Use FOL for sentences without actions; use event semantics with one event for one action and at most two events for multiple actions, as instructed in Figure 14 (p. 17).
4. Convert each explanatory fact to an Isabelle axiom, and put premise propositions in `assumes` and the target in `shows`.
5. Run Isabelle's syntax checker; classify type-unification and other syntax errors, then regenerate corrected theory text.

The paper's example uses `axiomatization where` followed by `explanation_1: "∀x. Violin x −→ Instrument x"`; its theorem proof uses `blast` (Section 3.1 and Figure 2, p. 4). Verbatim: “A proof provides a detailed step-by-step strategy that elucidates the logical connections and unification among axioms to support the reasoning process aimed at achieving the solver’s goal.” (Section 3.2, pp. 4–5).

Verus form. Inference: encode the event and role relations as `spec fn` predicates and make the target entailment a lemma with `requires` assumptions and `ensures` conclusion. Inference: event and entity types could be represented with ghost datatypes in Verus. A successful proof would establish the translated statement; it would not establish that the translation preserves the original sentence.

## technique 2: proof-strategy generation and theorem checking

The LLM first writes a natural-language rough inference identifying relevant and redundant facts, then emits formal steps in the shape `show X using Y by Z` (Section 3.2, p. 5). Isabelle's `blast` tactic discharges first-order steps when the axioms and assumptions suffice. The complete theory is submitted to Isabelle; success marks the explanation logically valid.

How to apply it.
1. Ask the LLM to state which facts are needed to derive the hypothesis.
2. Ask it to convert that strategy into Isabelle proof steps.
3. Construct a theory containing axioms, assumptions, theorem, and proof.
4. Submit it to Isabelle and record the first failing proof step or timeout.
5. If successful, retain the explanation; otherwise pass the failing step, associated axioms, and strategy to refinement.

Inference: a Verus analogue is a generated lemma skeleton followed by Verus checking; failed diagnostics can guide regeneration, but Isabelle's `blast` is not a Verus construct. Inference: acceptance should depend on the checker verifying the formal statement.

## technique 3: feedback-directed explanation refinement

When a proof fails, the framework removes facts absent from preceding proof steps or marked irrelevant, then prompts the LLM with the error, failed step, proof strategy, and relevant facts. The paper describes this as progressive correction: “This process is iterative and progressive; with each iteration, the framework addresses one or more logical errors, continually refining the explanatory sentences to ultimately yield a logically valid and verifiable explanation.” (Section 3.3, p. 5). The experiments allow at most ten explanation-refinement iterations (Section 4.3, p. 5) and three syntax-refinement iterations (Section 4.3, p. 6). Algorithm 1 sets `max_iterations ← 11`, including the initial attempt (p. 16).

Inference: for Verus proof repair, preserve the same separation: syntax/type diagnostics first, then failed lemma obligations, then regenerate only the implicated predicates or proof steps. Inference: a repair loop must cap iterations and retain the last checked artifact to avoid silently accepting an incomplete proof.

## evidence and limits

The evaluation uses 300 samples total from e-SNLI, QASC, and WorldTree, across Llama2-70b, Mixtral-8x7b, Mistral-small, GPT-3.5, and GPT-4 (Sections 4.1–4.2, p. 5). The introduction reports: “leading to an increase in logical validity using GPT-4 from 36% to 84%, 12% to 55%, and 2% to 37% (on e-SNLI, QASC, and WorldTree respectively).” (Section 1, p. 2; Figure 3, p. 6). These are percentage-point gains of 48, 43, and 35. Section 4.3 reports “maximum reductions of 68.67%, 62.31%, and 55.17% from 7.82 to 2.45, 20.27 to 7.64, and 22.91 to 10.27 across the three respective datasets” after at most three syntax-refinement iterations (p. 6). Figure 5 identifies these before/after averages of theories containing syntax errors as GPT-4's results (p. 7). On WorldTree, GPT-3.5 newly refines 29% and GPT-4 35%; Llama2-70b, Mixtral-8x7b, and Mistral-small newly refine 3%, 5%, and 5%, respectively (Section 4.3, p. 6). Figure 3's final-valid percentages also include initially valid explanations.

The ablation uses GPT-4 for autoformalisation while retaining each original model for explanation refinement and proof strategy generation (Section 4.4, pp. 6–7). For example, the authors report: “Llama2-70b with GPT-4 as the formalisation component refined explanations from 7% to 65% in the e-SNLI dataset.” (p. 7). Human evaluation of GPT-3.5 and GPT-4 finds all refined e-SNLI and WorldTree explanations factually correct; QASC factual-error rates are 2.27% and 1.82%, respectively (Section 4.5, pp. 7–8). Figure 8 reports GPT-4 non-triviality of 100%, 98.18%, and 100% on e-SNLI, QASC, and WorldTree, respectively (p. 8). Inference: these human judgments do not establish formal guarantees about factual truth or translation fidelity.

Inference: Isabelle checks entailment under the generated axioms. Applying that result to the original sentences additionally depends on translation fidelity and the suitability of those axioms. For VL, the reusable idea is diagnostic-driven proof repair; a flawed translation can still yield a proof of the wrong specification. The paper evaluates natural-language inference, rather than Rust verification.

The authors describe extracting “the exact erroneous steps from the theorem prover to effectively refine logical errors in the explanatory sentences” (Section 5.1, p. 9). Inference: VL could reuse failed-step feedback, fact pruning, and regeneration, with final acceptance dependent on Verus checking the regenerated artifact.

## techniques for the catalog
- event-semantics autoformalisation: preserve sentence roles with explicit event variables before theorem proving
- syntax-error refinement: feed Isabelle diagnostics back to an LLM for bounded correction of generated theories
- proof-strategy checking: generate `show X using Y by Z` steps and require theorem-prover success
- failed-step refinement: remove irrelevant facts and regenerate explanations from the exact failed obligation

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In some cases, the theorem prover may get stuck on a proof step, and we have set a termination time if the solving time exceeds 65 seconds."): checked all paper text, quotations, numbers, section and PDF-page references, method steps, tag, and arXiv link; corrected references, Isabelle syntax, bounded syntax-repair behavior, syntax-reduction attribution, and swapped WorldTree refinement rates, and marked recommendations as inferences; did not rerun experiments, inspect implementation code, or test the proposed Verus adaptations.
