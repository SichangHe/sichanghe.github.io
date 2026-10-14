# ImProver: Agent-Based Automated Proof Optimization
(authored by agents unless marked 🧑)
Tag: `ahuja2024improver`, [paper](http://arxiv.org/abs/2410.04753v2)
## scope and result

ImProver rewrites an existing Lean proof to optimize a user-selected metric while preserving correctness. The abstract defines the task as “rewriting a proof so that it is correct and optimizes for an arbitrary criterion, such as length or declarativity.” Its agent combines symbolic proof-state annotations, output formatting, sampling, iterative error correction, and retrieval. The paper evaluates GPT-4o-based ImProver on Mathematics in Lean (MIL), Compfiles, Mathlib, and MiniF2F. It reports 100.0% correctness on the optimization tables because returning the input proof is counted as a correct output; improved accuracy measures the stricter case where the output is correct and changes the metric.

Inference: this is directly relevant to VeruLaw as a post-generation repair and refactoring loop. A Verus candidate can be rewritten for shorter proof code, more explicit intermediate facts, or a project-specific metric, with Verus rerunning after each rewrite. The paper is about Lean and does not establish that its prompt or metric choices transfer to Rust ownership, concurrency, or Verus specifications.

## technique 1: define an explicit optimization metric

What it is. Given theorem statement `x`, context `c`, input proof `y0`, and output proof `y`, ImProver optimizes a metric `mu(x,c,y0,y)`. Section 3.1 defines four metrics. Length counts tactic invocations. Declarativity is the ratio of explicitly typed `have` tactics to total tactic invocations. Mixed scoring gives −1 to each tactic and +5 to each declarative tactic. Completion counts errors and is used to view theorem proving as a special case.

When to use it. Use a metric when a correct proof still has a maintenance, readability, or training-data defect. A metric must be computed from the candidate and must be checked only after the candidate verifies.

How to do it.

1. Choose the target metric and define its score over the theorem, context, original proof, and candidate.
2. Generate a candidate proof.
3. Verify the candidate in Lean before accepting it.
4. If it is correct, compare its score with the input; if it is incorrect, assign the error outcome used by the sampling policy.
5. Keep a candidate only when the policy's correctness-first comparison prefers it.

The paper warns that a metric can be gamed: “overuse of have statements can greatly increase the declarativity of the proof, despite not being used in the proof’s deductive process whatsoever.” It therefore uses human-written examples to guide the model.

Verus form. Inference: define metrics over Rust/Verus source after `verus` accepts the candidate: proof-block length, number of explicit lemmas, or a weighted cost for `assert`, `calc`, and lemma calls. A metric must not reward adding dead ghost facts that do not help the contract. Inference: retain the original contract and executable behavior as fixed inputs; an optimization that changes either requires a separate equivalence check. The paper does not define Verus metrics.

Evidence and limits. Table 1 aggregates all datasets. For length, GPT-4o has 3.7 average improvement, 15.15 nonempty improvement, 26.36% accuracy, and 8.31% improved accuracy; ImProver has 20.96, 55.29, 100.0%, and 35.44%, respectively. Each percentage is over the dataset used for that row, but the paper does not print the item count in the table. The authors explicitly say accuracy can be 100% by returning the input, so improved accuracy is the more informative denominator for nontrivial rewrites. Inference: a Verus evaluation should report both verifier-preserving output rate and metric-improving verifier-preserving rate.

## technique 2: Chain-of-States prompting

What it is. Chain-of-States (CoS) adds the intermediate symbolic proof state before each tactic. Section 3.2.1 says: “we use tools from Lean metaprogramming to automatically annotate each proof state as a comment prior to each tactic.” States include hypotheses, goals, metavariables, and correctness information extracted from Lean elaboration and evaluation. The annotations are cached and inserted into the proof text as comments.

When to use it. Use CoS when the tactic text alone hides the local hypotheses and goals needed to choose a repair or a structural rewrite, especially for declarative refactoring.

How to do it.

1. Parse and elaborate the existing proof with Lean.
2. Traverse the resulting `Lean.Elab.InfoTree` and collect the proof state before each tactic.
3. Record context, metavariable state, state modification, and correctness.
4. Cache the extracted states.
5. Insert each state as a comment before its tactic in the prompt.
6. Ask the model to produce a complete rewritten proof using those annotations.

Verus form. Inference: a driver can capture the Verus obligation and local context at each proof command only if Verus exposes a stable machine-readable trace; otherwise, run a diagnostic-producing wrapper and serialize the available obligation text. Insert the context as prompt-only comments or metadata, never as executable Rust. Inference: because Verus has ownership and quantified invariants, the serialization should include borrow permissions, loop invariants, and triggered facts when they are available. This adapter is not in the paper.

Evidence and limits. In Table 7's MIL declarativity ablation, GPT-4o scores 4.97 improvement and 37.5% accuracy, ImProver without CoS scores 9.23 and 100.0%, and ImProver with CoS scores 16.69 and 100.0%; improved accuracy is 46.88% with CoS versus 28.12% without. The denominator is the fixed MIL subset for this ablation, whose item count is not printed in the table. The result supports CoS in this Lean setting, not a universal benefit for Verus diagnostics.

## technique 3: structured output formats and syntax guidance

What it is. ImProver tests ordinary string output, a string list representing tactics, and a string tree representing proof structure. The goal is to reduce ancillary text and make the generated proof parseable. Error messages can be forwarded as syntax guidance during refinement.

How to do it.

1. Choose a representation: plain proof text, a list of tactic strings, or a tree of strings.
2. Prompt the model to emit only that representation.
3. Parse the output and reconstruct Lean proof text.
4. Run the proof assistant and retain diagnostics for the next iteration.
5. Compare representations in a factorial ablation while holding already-selected parameters fixed.

Verus form. Inference: use a structured Rust representation such as a sequence of proof commands or an AST-like tree, then render it to Rust and run Verus. Reject outputs that contain prose or malformed syntax before verification. Inference: preserving source spans and diagnostics helps target repairs without allowing a model to alter executable code accidentally.

Evidence and limits. Table 6 reports the best/worst combinations in each testing group on a MIL length subset. Output plus CoS reaches 8.04 best improvement versus 6.31 worst; the corresponding accuracies are 64.96% and 44.53%. Table 8 compares syntax guidance: ImProver has 28.94 improvement, 48.74 nonempty improvement, 100.0% accuracy, and 59.38% improved accuracy; without syntax guidance it has 23.42, 49.97, 100.0%, and 46.88%. The authors conclude error forwarding mainly improves correct generation, not metric optimization conditional on correctness. Inference: Verus diagnostics should be treated as repair hints, never as proof evidence until Verus accepts the final output.

## technique 4: best-of-n, refinement, and compound sampling

What it is. Best-of-n makes n independent calls and chooses with a correctness-first comparator. If both candidates are correct, it chooses the larger metric score; if only one is correct, it chooses that one; if both fail, it chooses the one with fewer errors. The paper gives this comparator as `S(y,y')`. Refinement repeatedly forwards recent attempts, scores, correctness, and errors. Compound methods nest the two, for example `best_of_n((refinement,m),n)` and `refinement((best_of_m),n)`; both use `m*n` total iterations.

How to do it.

1. Generate n candidates at temperature 1; the paper uses temperature 1 to create diversity without excessive randomness.
2. Verify each candidate and compute its metric and error count.
3. Apply the comparator: correctness first, then metric among correct candidates, otherwise fewer errors.
4. For refinement, forward the configured number of prior iterations together with diagnostics and ask for a new candidate.
5. For a compound sampler, nest best-of-n and refinement with a fixed total call budget.
6. Select parameters by the highest expected improvement score, which includes failed generations as zero improvement.

Verus form. Inference: run each candidate through Verus, use the same correctness-first ordering, and record verification time and resource failures separately from logical errors. A compound loop should cap total Verus invocations and preserve the original contract. Inference: model calls can be parallelized, but verification workers should use isolated build state.

Evidence and limits. The selected configuration is GPT-4o, string-list output, CoS, 10 retrieved examples, and five-step refinement where each iteration is best-of-3 with RAG. Table 6 gives this combination 34.88 improvement, 57.56 nonempty improvement, 100% accuracy, and 54.55% improved accuracy on the MIL ablation subset. The paper says there were over 8,640 possible combinations and uses factorial testing rather than exhaustive search. Inference: this selection is conditional on the tested subset and metric; it is not evidence that five steps or best-of-3 is optimal for Verus.

## technique 5: retrieval-augmented prompting

What it is. ImProver retrieves examples and documents with maximum marginal relevance (MMR). Example retrieval selects k proof-optimization examples for the chosen metric. Document retrieval searches separate vector databases containing the Theorem Proving in Lean handbook and Mathlib. The Mathlib query uses the current theorem; the handbook query uses the theorem, context, and current error messages.

How to do it.

1. Chunk and embed the example and document corpora.
2. For the current theorem and metric, compute MMR scores.
3. Retrieve the top k examples and relevant handbook and library chunks.
4. Add them to the prompt with the current proof, CoS states, and diagnostics.
5. Generate, verify, and refine the candidate.

Verus form. Inference: index project-specific verified Rust examples, Verus guide fragments, contract patterns, and prior diagnostics. Retrieve by obligation text, API names, and error categories. Every retrieved lemma or pattern remains untrusted text until Verus verifies the generated use. The paper does not evaluate Verus retrieval.

Evidence and limits. The ablation found 10 examples best in its fixed sequence of testing groups. Table 6's “+ Example Retrieval” row has best/worst improvement 9.34/5.67 and best/worst accuracy 63.5%/67.15%; the nonmonotonic accuracy shows that a higher improvement score was the selection criterion, not raw accuracy. Inference: retrieval can increase relevant context while also increasing prompt length or distracting the model.

## technique 6: proof optimization as theorem proving

What it is. The completion metric counts errors, so an empty input proof can be supplied and the same optimization agent becomes a neural theorem prover. The paper tests this on empty proofs from MIL and MiniF2F.

Evidence. Table 9 reports percent accuracy: GPT-4o reaches 18.18% on MIL-C04 pass@15, 25% on MIL-C08 pass@15, 21.73% on MIL pass@15, and 9.02% on MiniF2F-test pass@8. ImProver reaches 45.45%, 33.33%, 39.13%, and 16.39% on the same columns. The denominators are the respective dataset splits; item counts are not printed. Lean Expert Iteration reaches 34.5% on MiniF2F-test pass@8, but the paper identifies it as a specialized theorem prover, unlike ImProver's GPT-4o extension. Inference: the result shows that optimization machinery can aid generation, while specialized training can still be stronger.

Verus form. Inference: an empty `proof fn` or missing proof body can be treated as the initial candidate, but the generated Rust must preserve the executable function and contract. Verus verification is the completion test. This inference is outside the paper.

## what is proved, measured, and trusted

Lean checks whether rewritten proofs are correct. The study measures average metric improvement, nonempty improvement conditional on nonzero change, correctness accuracy, improved accuracy, ablation scores, and pass@k theorem-proving accuracy. The examples demonstrate shorter or more declarative Lean proofs, but no formal semantic equivalence proof beyond Lean rechecking the theorem.

The trusted boundary includes Lean, its metaprogramming and elaboration traces, the retrieval index, the proprietary GPT-4o model, prompt parser, metric implementation, and the theorem statements themselves. Inference: a Verus deployment adds Verus, Rust compilation, library and external-body specifications, erasure, and the adequacy of the target contract. A rewrite can be formally correct yet optimize a badly chosen metric or a specification that misses the product requirement.

## contradictions, assumptions, and failure modes

The paper reports 100.0% ImProver accuracy in Tables 1–5, yet explains that unchanged input proofs count as correct. Improved accuracy is therefore the denominator for nontrivial success. The reported 566%, 423%, and 778% outperformance claims compare aggregate improvement scores, while the underlying datasets and metric denominators differ; they are relative score comparisons, not success-rate percentages. The paper's 100% values should not be read as 100% successful rewrites.

The authors state that “naively applying LLMs to proof optimization falls short” and that ImProver is expensive because it relies on proprietary LLMs. Declarativity can be gamed by unused `have` statements, and higher-difficulty Mathlib proofs have lower improvement. Inference: Verus adds failure modes from ownership, lifetimes, concurrency, solver instability, and dependency changes. A candidate that keeps the contract true but changes performance, allocation, or panic behavior may still be a bad product rewrite.

## transfer notes for VL implementation

The reusable components are verifier-first candidate selection, state-rich prompts, structured output parsing, iterative error correction, retrieval of project examples, and explicit metrics. The paper has already established these ideas for Lean proof rewriting; VL should not repeat a generic Lean optimization benchmark. Inference: VL should measure whether these controls reduce Verus proof repair time and preserve contracts across dependency upgrades, with denominators for accepted rewrites, metric-improving rewrites, verifier calls, and human interventions.

Product relevance for ahuja2024improver. Inference: ImProver creates a material maintenance threat because it can automatically rewrite proof code and potentially accelerate agent-written verification. The verifier still checks the final Rust artifact, so the direct runtime-safety risk comes from contract inadequacy or an optimizer that is allowed to change executable code. Retrieval and metric gaming can produce formally accepted but less maintainable proofs; product controls need contract-preserving diffs, resource budgets, and review of metric definitions.

## techniques for the catalog

- explicit proof metrics — define correctness-preserving scores for length, declarativity, mixed style, or completion
- chain-of-states prompting — extract symbolic intermediate proof states and place them before tactics in the model context
- structured output and diagnostics — constrain model output to parseable proof structures and feed verifier errors into repair
- best-of-n and iterative refinement — sample multiple candidates, select correctness first, and forward prior attempts for correction
- retrieval-augmented proof rewriting — retrieve relevant examples and library documentation with MMR before generation
- optimization-to-proving reduction — use the completion metric and an empty input proof to turn rewriting into theorem proving

## evidence references

The task definition and metrics are in Sections 1 and 3.1, PDF pages 1–3. CoS, output, sampling, and retrieval are in Sections 3.2.1–3.2.4, PDF pages 4–5. Setup and metric definitions are in Section 4.1, PDF pages 6–7. Aggregate results and denominators are in Tables 1–5, PDF pages 7–9. Ablations are in Tables 6–8, PDF pages 9–10. Neural theorem-proving results are in Table 9 and Section 4.2.2, PDF page 10. The conclusion and cost limitation are in Section 5, PDF page 10.
Checked 2026-10-13: audit record ahuja2024improver; paper-study comparison complete; gate executed; experiments not rerun
