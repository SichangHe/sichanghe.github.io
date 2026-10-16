# Verification and Refinement of Natural Language Explanations through LLM-Symbolic Theorem Proving
(authored by agents unless marked 🧑)
Tag: `quan2024verification`, [paper](http://arxiv.org/abs/2405.01379v4)

## method
Explanation-Refiner combines an LLM, Neo-Davidsonian event semantics, first-order logic, Isabelle/HOL, and iterative feedback. Given premise `p`, hypothesis `h`, and explanation facts `E`, validity means `p ∪ E |= h` (Section 2, p. 3). Each explanation fact becomes an axiom; the premise and hypothesis become a theorem. The paper states: “The theorem prover is implemented as a checker to identify any syntax errors and provide these error details as feedback to an LLM” (Section 3, p. 4).

The framework separates syntax repair from logical repair. A syntax error is corrected by sending Isabelle's diagnostic to the LLM for up to three iterations. Once a syntactically valid theory exists, the LLM proposes a rough inference, formal proof steps, and a theorem prover check. Failed proof steps and the axioms used are fed back to refine the explanation. This is an autoformalise-check-repair loop, not a proof of the LLM itself.

## technique 1: content-preserving autoformalisation

Neo-Davidsonian semantics introduces event variables and explicit Agent and Patient roles for verbs, while FOL handles static predicates. For “A wolf eating a sheep is an example of a predator hunting prey”, the paper formalises separate eating and hunting events and links them with `example(e1,e2)` (Section 3.1, pp. 4–5). The representation is intended to reduce semantic loss from direct LLM-to-FOL translation.

How to apply it.
1. Parse each sentence into entities, events, and semantic roles.
2. Generate predicates for nouns, events, and roles such as `Agent` and `Patient`.
3. Encode static relations directly in FOL; encode event relations with quantified event variables.
4. Convert each explanatory fact to an Isabelle axiom, and put premise propositions in `assumes` and the target in `shows`.
5. Run Isabelle's syntax checker; classify type-unification and other syntax errors, then regenerate corrected theory text.

The paper's example has `axiom explanation_1: "∀x. Violin x −→ Instrument x"` and an Isabelle theorem whose proof uses `blast` (Figure 2, p. 5). Verbatim: “A proof provides a detailed step-by-step strategy that elucidates the logical connections and unification among axioms to support the reasoning process aimed at achieving the solver’s goal” (Section 3.2, p. 5).

Verus form. Inference: encode the event and role relations as `spec fn` predicates and make the target entailment a lemma with `requires` assumptions and `ensures` conclusion. Inference: unlike Isabelle's untyped text generation, Verus requires Rust types and explicit quantifier domains; event structures should be ghost datatypes. Inference: the LLM-generated translation remains untrusted until Verus checks the resulting lemma.

## technique 2: proof-strategy generation and theorem checking

The LLM first writes a natural-language rough inference identifying relevant and redundant facts, then emits formal steps in the shape “show X using Y by Z” (Section 3.2, p. 5). Isabelle's `blast` tactic discharges first-order steps when the axioms and assumptions suffice. The complete theory is submitted to Isabelle; success marks the explanation logically valid.

How to apply it.
1. Ask the LLM to state which facts are needed to derive the hypothesis.
2. Ask it to convert that strategy into Isabelle proof steps.
3. Construct a theory containing axioms, assumptions, theorem, and proof.
4. Submit it to Isabelle and record the first failing proof step or timeout.
5. If successful, retain the explanation; otherwise pass the failing step, associated axioms, and strategy to refinement.

Inference: a Verus analogue is a generated lemma skeleton followed by `cargo verus` checking; failed diagnostics can guide regeneration, but Isabelle's `blast` is not a Verus construct. The trusted result is the checker’s proof, not the LLM's proposed steps.

## technique 3: feedback-directed explanation refinement

When a proof fails, the framework removes facts absent from preceding proof steps or marked irrelevant, then prompts the LLM with the error, failed step, proof strategy, and relevant facts. The paper describes this as progressive correction: “This process is iterative and progressive; with each iteration, the framework addresses one or more logical errors” (Section 3.3, p. 6). The loop is capped at ten explanation-refinement iterations in the experiments and three syntax-refinement iterations (Sections 3.1 and 4.3, pp. 5–7).

Inference: for Verus proof repair, preserve the same separation: syntax/type diagnostics first, then failed lemma obligations, then regenerate only the implicated predicates or proof steps. Inference: a repair loop must cap iterations and retain the last checked artifact to avoid silently accepting an incomplete proof.

## evidence and limits

The evaluation uses 300 samples total from e-SNLI, QASC, and WorldTree, across Llama2-70b, Mixtral-8x7b, Mistral-small, GPT-3.5, and GPT-4 (Section 4.1, p. 6). GPT-4's initially valid explanations increase from 36% to 84% on e-SNLI, 12% to 55% on QASC, and 2% to 37% on WorldTree (Abstract, p. 1; Figure 3, p. 7). These percentages use the dataset/model panels' explanation counts; the paper does not state a separate denominator for each plotted bar beyond the 300-sample corpus. The authors report average syntax-error reductions after at most three iterations of 68.67% (7.82 to 2.45), 62.31% (20.27 to 7.64), and 55.17% (22.91 to 10.27) on e-SNLI, QASC, and WorldTree respectively (Section 4.3, p. 8). GPT-4 refines 29% of WorldTree explanations and GPT-3.5 35%; open models refine 3%, 5%, and 5% for Llama2-70b, Mixtral-8x7b, and Mistral-small (Section 4.3, p. 8).

The paper reports an ablation using GPT-4 only for autoformalisation while retaining each original model for refinement, showing that translation quality materially affects downstream refinement (Section 4.4, p. 8). Human evaluation reports near-perfect factuality and non-triviality for GPT-4 on the displayed subsets, but these plots are not a proof guarantee (Figure 8, p. 10).

What is proved is the Isabelle theory's entailment for the generated axioms and proof steps. What remains trusted includes Isabelle, its parser and tactics, the event-semantics schema, LLM translation, and dataset annotations. Inference: for VL, the strongest reusable idea is diagnostic-driven proof repair; the natural-language explanation task itself is peripheral. Inference: threat to a product generating verified Rust is medium: an external checker can reject false proof obligations, but a flawed autoformalisation can prove the wrong specification, and Isabelle's logic does not model Rust ownership, unsafe code, or memory ordering.

Existing work already studies LLM self-refinement and autoformalisation; this paper's distinct contribution is combining a theorem prover's exact failed step with iterative fact pruning and regeneration (Section 5, pp. 10–11). VL should reuse that feedback loop and require the final Verus checker to validate every regenerated artifact.

## techniques for the catalog
- event-semantics autoformalisation: preserve sentence roles with explicit event variables before theorem proving
- syntax-error refinement: feed Isabelle diagnostics back to an LLM for bounded correction of generated theories
- proof-strategy checking: generate `show X using Y by Z` steps and require theorem-prover success
- failed-step refinement: remove irrelevant facts and regenerate explanations from the exact failed obligation

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
