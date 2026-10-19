# ImProver: Agent-Based Automated Proof Optimization
(authored by agents unless marked 🧑)
Tag: `ahuja2024improver`, [paper](http://arxiv.org/abs/2410.04753v2)
## scope and result

ImProver rewrites an existing Lean proof to optimize a user-selected metric while preserving correctness. The abstract (p. 1) defines the task as “rewriting a proof so that it is correct and optimizes for an arbitrary criterion, such as length or declarativity.” Its agent combines symbolic proof-state annotations, output formatting, sampling, iterative error correction, and retrieval. The paper evaluates GPT-4o-based ImProver on Mathematics in Lean (MIL), Compfiles, Mathlib, and MiniF2F. It reports 100.0% correctness on the optimization tables because returning the input proof is counted as a correct output; improved accuracy measures correct outputs with positive metric improvement (§4.1.1, p. 7).

## technique 1: define an explicit optimization metric

What it is. Given theorem statement `x`, context `c`, input proof `y0`, and output proof `y`, ImProver optimizes a metric `mu(x,c,y0,y)`. Section 3.1 defines four metrics. Length counts tactic invocations. Declarativity is the ratio of explicitly typed `have` tactics to total tactic invocations. Mixed scoring gives −1 to each tactic and +5 to each declarative tactic. Completion counts errors and is used to view theorem proving as a special case.

When to use it. Inference: use an explicit metric when a correct proof needs refactoring. Correctness must take priority over metric improvement; computing a score does not establish correctness.

How to do it.

1. Choose the target metric and define its score over the theorem, context, original proof, and candidate.
2. Generate a candidate proof.
3. Verify the candidate in Lean before accepting it.
4. If it is correct, compare its score with the input; if it is incorrect, assign the error outcome used by the sampling policy.
5. Select using the correctness-first comparison (§3.2.3, pp. 4–5). Inference: include the original correct proof among the choices to preserve correctness when all rewrites fail.

Section 3.1 (p. 3) warns that a metric can be gamed: “overuse of have statements can greatly increase the declarativity of the proof, despite not being used in the proof’s deductive process whatsoever.” It therefore uses human-written examples to guide the model.

Verus form. Inference: define metrics over Rust/Verus source after `verus` accepts the candidate: proof-block length, number of explicit lemmas, or a weighted cost for `assert`, `calc`, and lemma calls. A metric must not reward adding dead ghost facts that do not help the contract. Inference: retain the original contract and executable behavior as fixed inputs; an optimization that changes either requires a separate equivalence check. The paper does not define Verus metrics.

Evidence and limits. Table 1 aggregates all datasets. For length, GPT-4o has 3.7 average improvement, 15.15 nonempty improvement, 26.36% accuracy, and 8.31% improved accuracy; ImProver has 20.96, 55.29, 100.0%, and 35.44%, respectively. Appendix B.1 (p. 17) reports 72 MIL theorems, 26 Compfiles theorems and lemmas, and 43 Mathlib proofs for the main experiments. The table does not explain its aggregation weights. Section 4.1.1 (p. 7) states: “by simply returning the initial input, we can get 100% accuracy.” Inference: improved accuracy is more informative about nontrivial rewrites; it is a rate, not a denominator. Inference: a Verus evaluation should report both verifier-preserving output rate and metric-improving verifier-preserving rate.

## technique 2: Chain-of-States prompting

What it is. Chain-of-States (CoS) adds the intermediate symbolic proof state before each tactic. Section 3.2.1 says: “we use tools from Lean metaprogramming to automatically annotate each proof state as a comment prior to each tactic.” The comments expose hypotheses and goals. The underlying proof trees also contain metavariable context and correctness information extracted from Lean elaboration and evaluation; the paper does not say that all this information appears in each comment. The extracted states are cached and inserted into the proof text as comments.

When to use it. Inference: use CoS when the tactic text alone hides the local hypotheses and goals needed to choose a repair or a structural rewrite, especially for declarative refactoring.

How to do it.

1. Parse and elaborate the existing proof with Lean.
2. Traverse the resulting `Lean.Elab.InfoTree` and collect the proof state before each tactic.
3. Use the proof trees to obtain intermediate hypotheses and goals; the trees also carry tactic-level context and correctness information.
4. Cache the extracted states.
5. Insert each state as a comment before its tactic in the prompt.
6. Ask the model to produce a complete rewritten proof using those annotations.

Verus form. Inference: a driver can capture the Verus obligation and local context at each proof command only if Verus exposes a stable machine-readable trace; otherwise, run a diagnostic-producing wrapper and serialize the available obligation text. Insert the context as prompt-only comments or metadata, never as executable Rust. Inference: because Verus has ownership and quantified invariants, the serialization should include borrow permissions, loop invariants, and triggered facts when they are available. This adapter is not in the paper.

Evidence and limits. In Table 7's MIL declarativity ablation, GPT-4o scores 4.97 improvement and 37.5% accuracy, ImProver without CoS scores 9.23 and 100.0%, and ImProver with CoS scores 16.69 and 100.0%; improved accuracy is 46.88% with CoS versus 28.12% without. Appendix B.1 (p. 17) identifies a 32-theorem MIL sample for this ablation. Inference: this supports CoS in the tested Lean setting; its effect on Verus diagnostics remains untested.

## technique 3: structured output formats and syntax guidance

What it is. ImProver tests ordinary string output, a string list representing tactics, and a string tree representing proof structure. Section 3.2.2 (p. 4) motivates these formats with ancillary or invalid output and the hypothesis that output structure may help generate structured proofs. Error messages can be forwarded as syntax guidance during refinement.

How to do it.

1. Choose a representation: plain proof text, a list of tactic strings, or a tree of strings.
2. Prompt the model to emit only that representation.
3. Parse the output and reconstruct Lean proof text.
4. Run the proof assistant and retain diagnostics for the next iteration.
5. Compare representations in a factorial ablation while holding already-selected parameters fixed.

Verus form. Inference: use a structured Rust representation such as a sequence of proof commands or an AST-like tree, then render it to Rust and run Verus. Reject outputs that contain prose or malformed syntax before verification. Inference: preserving source spans and diagnostics helps target repairs without allowing a model to alter executable code accidentally.

Evidence and limits. Table 6 reports the best/worst combinations in each testing group on a MIL length subset. Output plus CoS reaches 8.04 best improvement versus 6.31 worst; the corresponding accuracies are 64.96% and 44.53%. Table 8 compares syntax guidance: ImProver has 28.94 improvement, 48.74 nonempty improvement, 100.0% accuracy, and 59.38% improved accuracy; without syntax guidance it has 23.42, 49.97, 100.0%, and 46.88%. Section 4.2.1 (p. 10) concludes that syntax guidance “does not improve the model’s ability to optimize proofs assuming correct generations.” Inference: the nearly unchanged nonempty-improvement scores support that interpretation, but the 100% accuracy includes unchanged inputs, so improved accuracy is the relevant measure of successful new improvements. Inference: Verus diagnostics should be treated as repair hints, never as proof evidence until Verus accepts the final output.

## technique 4: best-of-n, refinement, and compound sampling

What it is. Best-of-n makes n model calls. Section 3.2.3 (p. 5) says its selection policy “first prioritizes output correctness, and secondly prioritizes the evaluated metric delta score.” The printed comparator `S(y,y')` chooses the larger metric score when both are correct and the correct candidate when only one is correct. Its final branch minimizes error count but is printed with the condition `E(y) = E(y') > 0`, leaving unequal positive error counts unspecified. Inference: choosing fewer errors whenever both fail is a natural completion of that policy, but it is not fully specified by the displayed equation. Refinement forwards prior inputs, outputs, scores, correctness, and error messages. Compound methods nest the two: `best_of_n((refinement,m),n)` and `refinement((best_of_n,m),n)`. The paper states: “there are always a total of mn iterations.”

How to do it.

1. Generate n candidates at temperature 1; §3.2.3 (p. 5) uses this setting to promote diversity.
2. Verify each candidate and compute its metric and error count.
3. Prioritize correctness, then metric score among correct candidates. Inference: resolve the incomplete both-incorrect branch by preferring fewer errors.
4. For refinement, forward the configured number of prior iterations together with diagnostics and ask for a new candidate.
5. For a compound sampler, nest best-of-n and refinement with a fixed total call budget.
6. Select parameters by the highest expected improvement score, which includes failed generations as zero improvement.

Verus form. Inference: run each candidate through Verus, use the same correctness-first ordering, and record verification time and resource failures separately from logical errors. A compound loop should cap total Verus invocations and preserve the original contract. Inference: model calls can be parallelized, but verification workers should use isolated build state.

Evidence and limits. The selected configuration is GPT-4o, string-list output, CoS, 10 retrieved examples, and five-step refinement where each iteration is best-of-3 with RAG. Table 6 gives final ImProver 34.88 improvement, 57.56 nonempty improvement, 100% accuracy, and 54.55% improved accuracy. Its preceding “+ Combos and RAG” row reports 60.61% accuracy for the best configuration; Table 14 reports the same 60.61% for five-step refinement with best-of-3 and retrieval. Inference: the final 100% accuracy must be distinguished from the sampler’s reported ability to produce correct new proofs. Appendix B.1 specifies 133 theorems for the early ablations, 55 for model/sample-count testing, and 32 for compound sampling and retrieval, so rows also differ in evaluated samples. The paper says there were over 8,640 possible combinations and uses factorial testing rather than exhaustive search. Inference: this selection is conditional on the tested subset and metric; it is not evidence that five steps or best-of-3 is optimal for Verus.

## technique 5: retrieval-augmented prompting

What it is. ImProver retrieves examples and documents with maximum marginal relevance (MMR). Example retrieval selects k proof-optimization examples for the chosen metric. Document retrieval searches separate vector databases containing the Theorem Proving in Lean handbook and Mathlib. Section 3.2.4 (p. 5) states: “The Mathlib retriever finds the top k documents that score the highest MMR score against the current theorem, the TPiL retriever finds the top k documents that score the highest MMR score against the current theorem in context and all current error messages.”

How to do it.

1. Use metric-specific proof-optimization examples and vector databases of syntactically chunked handbook and Mathlib material.
2. Retrieve k relevant optimization examples for the chosen metric.
3. Retrieve top-k Mathlib chunks using the theorem and top-k handbook chunks using the theorem in context and current errors.
4. Add them to the prompt with the current proof, CoS states, and diagnostics.
5. Generate, verify, and refine the candidate.

Verus form. Inference: index project-specific verified Rust examples, Verus guide fragments, contract patterns, and prior diagnostics. Retrieve by obligation text, API names, and error categories. Every retrieved lemma or pattern remains untrusted text until Verus verifies the generated use. The paper does not evaluate Verus retrieval.

Evidence and limits. The ablation found 10 examples best in its fixed sequence of testing groups. Table 6's “+ Example Retrieval” row has best/worst improvement 9.34/5.67 and best/worst accuracy 63.5%/67.15%; the nonmonotonic accuracy shows that a higher improvement score was the selection criterion, not raw accuracy. Inference: retrieval can increase relevant context while also increasing prompt length or distracting the model.

## technique 6: proof optimization as theorem proving

What it is. The completion metric counts errors, so an empty input proof can be supplied and the same optimization agent becomes a neural theorem prover. The paper tests this on empty proofs from MIL and MiniF2F.

Evidence. Table 9 reports percent accuracy: GPT-4o reaches 18.18% on MIL-C04 pass@15, 25% on MIL-C08 pass@15, 21.73% on MIL pass@15, and 9.02% on MiniF2F-test pass@8. ImProver reaches 45.45%, 33.33%, 39.13%, and 16.39% on the same columns. Appendix B.1 (p. 17) specifies 11 MIL-C04 exercises, 12 MIL-C08 exercises, and 23 MIL exercises in total. It does not state the MiniF2F-test item count. MiniF2F uses two refinement steps of best-of-4. Table 9 places Lean Expert Iteration’s 34.5% in the MiniF2F-test Pass@8 column, but does not establish that the external baseline used the same sample budget. Section 4.2.2 identifies it as a specialized theorem prover, unlike ImProver’s GPT-4o extension. Inference: the result shows that optimization machinery can aid generation, while specialized training can still be stronger.

Verus form. Inference: an empty `proof fn` or missing proof body can be treated as the initial candidate, but the generated Rust must preserve the executable function and contract. Verus verification is the completion test. This inference is outside the paper.

## what is proved, measured, and trusted

Lean checks whether rewritten proofs establish the theorem. Section 4.1 (p. 6) defines length improvement as percentage reduction and declarativity improvement as a score difference; incorrect outputs receive zero improvement. It defines nonempty improvement as “the improvement restricted to theorems for which some output has nonzero improvement.” It then describes this as conditional on error-free generation. Inference: these conditions differ when a correct output leaves the metric unchanged, so the study should retain the formal nonzero-improvement restriction rather than equate nonempty improvement with all correct outputs. Accuracy counts correct outputs, improved accuracy counts correct improvements, and Table 9 reports pass@k theorem-proving accuracy.

Inference: Lean and the intended theorem statement determine the meaning of proof correctness; the model and retrieval index need not be trusted for correctness when Lean checks the generated proof. The parser, metric implementation, and state extraction affect selection and prompt quality. A Verus deployment additionally depends on Verus, library specifications, and the adequacy of the target contract. A verified rewrite can optimize a poor metric or satisfy an inadequate specification. The paper does not audit these trust assumptions.

## contradictions, assumptions, and failure modes

Section 4.2 (pp. 7–8) calls the aggregate improvements “566%”, “423%”, and “778%” outperformance. Inference: Table 1 supports score ratios of approximately 5.66, 4.23, and 7.78, respectively; those percentages express ratios to the baseline, not percentage increases above it or success rates. As the authors explicitly note (p. 8), “that output may just be the same as the input.” Thus 100% accuracy does not mean every proof was improved.

The introduction (p. 2) states that “naively applying LLMs to proof optimization falls short”. The conclusion (§5, p. 10) states: “ImProver is limited by its high cost, which is exacerbated by its reliance on proprietary LLM’s.” Declarativity can be gamed by unused `have` statements, and higher-difficulty Mathlib proofs have lower improvement. Inference: Verus adds failure modes from ownership, lifetimes, concurrency, solver instability, and dependency changes. A candidate that keeps the contract true but changes performance, allocation, or panic behavior may still be a bad product rewrite.

## techniques for the catalog

- explicit proof metrics — define correctness-preserving scores for length, declarativity, mixed style, or completion
- chain-of-states prompting — extract symbolic intermediate proof states and place them before tactics in the model context
- structured output and diagnostics — constrain model output to parseable proof structures and feed verifier errors into repair
- best-of-n and iterative refinement — sample multiple candidates, select correctness first, and forward prior attempts for correction
- retrieval-augmented proof rewriting — retrieve relevant examples and library documentation with MMR before generation
- optimization-to-proving reduction — use the completion metric and an empty input proof to turn rewriting into theorem proving

## evidence references

The task definition and metrics are in Sections 1 and 3.1, PDF pages 1–3. CoS, output, sampling, and retrieval are in Sections 3.2.1–3.2.4, PDF pages 4–5. Setup and metric definitions are in Section 4.1, PDF pages 6–7. Aggregate and per-dataset results are in Tables 1–5, PDF pages 7–9; dataset counts are in Appendix B.1, PDF page 17. Ablations are in Tables 6–8, PDF pages 9–10. Neural theorem-proving results are in Table 9 and Section 4.2.2, PDF page 10. The conclusion spans PDF pages 10–11; the cost limitation is on page 10. Prompt templates are in Appendix A, PDF pages 14–16; detailed ablations are in Appendix B.2, PDF pages 18–19.
