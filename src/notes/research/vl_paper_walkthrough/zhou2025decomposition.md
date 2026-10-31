# Solving Formal Math Problems by Decomposition and Iterative Reflection
(authored by agents unless marked 🧑)
Tag: `zhou2025decomposition`, [paper](http://arxiv.org/abs/2507.15225v1)

## scope and result
The paper presents Delta Prover, an agent around Lean 4 that combines iterative proof repair with reflective decomposition. Its stated aim is to use a general-purpose model without formal-data fine-tuning: “thereby eliminating the need for bespoke training data or model adaptation” (§1, p. 3). The authors report 95.9% on the 244-problem miniF2F-test set and 85.0% on its IMO subset (Figure 1, p. 2; §4.1, p. 11; Table 1, p. 12). Table 1 identifies the model and comparison setting: “Delta Prover (Our Approach)” is training-free, has sample budget 16,384, and accuracy 95.9%; the same stock Gemini 2.5 Pro 05-06 with Best-of-N is 49.1% at that budget (§4.2, p. 12). The reported budget is the maximum cost among successful attempts: “The final sample budget is then the maximum of these values across all solved problems.” (§4.2, p. 12). These are Lean results; the paper reports no Verus experiments.

## technique: iterative proof repair

what it is and when to use it

Each round starts a fresh candidate, then repairs that trajectory using Lean feedback. Inference: this is useful when a model has a plausible proof but makes syntax, tactic, or library-name errors. The paper says, “The LLM repeatedly attempts formal proof steps, progressively refining its output based on textual feedback from the Lean 4 environment until a complete and verified proof is achieved.” (§2, p. 4).

how to apply it

1. Give the formal statement `S` and, if absent, ask the model to produce an informal statement `s` (Algorithm 1, lines 2–4, p. 6).
2. Prompt an initial candidate `P` with explicit formatting conventions, Lean 4-only requirements, and documentation/examples for tactics such as `linarith`, `ring`, and `omega` (§2.1.1, p. 5; Appendix A, Figure 9, p. 22).
3. Run `(S,P)` through the Lean 4 kernel. If it verifies, return it (Algorithm 1, lines 5–10, p. 6).
4. On failure, pass the failed proof, kernel tactic state/error, and retrieved theorem or definition information to the model. For unknown or incorrect identifiers, retrieval uses the errored name (§2.1.1, pp. 5–6; Algorithm 1, lines 11–13, p. 6): “we retrieve relevant theorems/definitions based on the errored name and include them in the prompt.”
5. Repeat for a configured number of rounds and repairs; return failure after the limits (Algorithm 1, lines 5–17, p. 6).

The retrieval component addresses exact Mathlib names and signatures. The paper’s example starts with `AntitoneOn.sum_le_integral_Icc`, retrieves `AntitoneOn.sum_le_integral_Ico`, and supplies its signature to the next prompt (Appendix B, p. 23). A second example records two corrections: an erroneous `mul_div_cancel_left`, then `simp`, then `norm_num` after Lean reports that `simp` is insufficient (Appendix B, p. 24).

Verus form (Inference:)

Inference: a Verus adaptation could run the verifier after each candidate, then return diagnostics, failed proof code, and relevant library facts to the model. This would require Verus-specific prompts and retrieval; the paper does not test this adaptation.

what evidence and limits

On miniF2F-test, the result denominator is 244 problems (§4.1, p. 11). In the isolated repair ablation, total budget is fixed at 1,024 and the authors vary rounds `m` and repairs `n`; the reported trend is that “accuracy generally improves as the number of repairs n increases for a fixed total budget m × n” (§4.3, pp. 12–13). With `n=1`, the algorithm becomes Best-of-N; the authors report that repair “consistently outperforms BoN sampling” as total budget grows (§4.3, p. 13). These experiments use Gemini 2.5 Pro 05-06 at temperature 1 (§4.1, p. 11). The method can still fail after the configured limits (Algorithm 1, line 17, p. 6). Inference: retrieval is useful only when it returns applicable facts; the paper does not isolate retrieval’s effect in an ablation.

## technique: reflective decomposition and consolidation

what it is and when to use it

When a direct proof is too difficult, Delta Prover asks the model for an informal plan, turns that plan into a DSL sketch, solves extracted sub-problems separately, and regenerates the sketch when any sub-problem remains unsolved. The paper defines the purpose plainly: “For complex problems, the LLM initially formulates a high-level proof sketch using a novel Domain-Specific Language (DSL, detailed below), guided by a natural language outline.” (§2, p. 4).

how to apply it

1. Generate an informal, step-by-step proof plan from `(S,s)` (Algorithm 2, line 3, p. 8; Appendix A, Figure 8, p. 21).
2. Generate DSL sketch `D`, supplying DSL examples and warnings about auto-formalization traps such as implicit assumptions and quantifier scope (§2.1.2, pp. 6–7; Figure 7, p. 20).
3. Run `D` in the Play environment. Its `show ... by` mechanism extracts formal sub-problem statements, or reports an illegal draft (§2.1.2, p. 7; Algorithm 2, lines 5–10, p. 8).
4. Solve every extracted statement with the iterative repair loop. Record solved pairs and unsolved statements (Algorithm 2, lines 11–20, p. 8).
5. Feed unsolved statements or kernel errors back to the model and regenerate `D` until all are solved or the maximum decomposition attempts is reached (Algorithm 2, lines 21–31, p. 8).
6. Substitute the sub-proofs into the sketch and append the DSL’s concluding commands to produce the whole proof (Algorithm 3, lines 5–10, p. 9).

The DSL has four concrete operations: `suppose` introduces hypotheses, `define` introduces expressions whose types are inferred, `ShowBy` records proofs while allowing Mathlib tactics, and `conclude` reconstructs the integrated proof (§2.2, p. 9). Implementation uses a `PlayM` monad over `TacticM`, saved proof states, and Lean’s delaborator (§2.2, p. 7): “we introduce an additional monad layer, PlayM, built upon TacticM, to record and manage intermediate proof states.”

Verus form (Inference:)

Inference: a Verus adaptation could represent intermediate claims as separate proof functions, preserve each claim’s assumptions, solve them separately, and verify the assembled proof. The paper does not establish how its Lean DSL would handle Rust ownership, mutable borrows, or executable state.

what evidence and limits

The paper’s focused experiment is IMO 2019 Problem 1. Pure iterative correction failed after 1,024 API calls. Delta Prover’s first decomposition made 83 sub-problems, each averaging four API calls, for approximately 83 × 4 = 332 calls (§4.3, p. 13). The authors state: “Each sub-problem required, on average, 4 API calls to be solved.” (§4.3, p. 13). Inference: the approximate 332-call result for this one problem does not establish a general bound or isolate the benefit of revising a decomposition, since the first decomposition succeeded. The authors identify improper decomposition as a challenge: “some decomposed sub-problems will again become the proof bottleneck.” (§2.1.2, p. 6).

## what is proved, measured, and trusted

Lean’s kernel checks proof candidates; the paper measures benchmark success rates, API/sample budgets, and repair/decomposition ablations. The benchmark statements were corrected before evaluation: “We use its Lean 4 version [51] and fix errors in the statements similar to [33, 41].” (§4.1, p. 11). Inference: proof checking depends on Lean’s kernel and the assumptions in the formal statements. The model, retrieval, and prompts guide search; they do not replace final proof checking. A verified proof does not establish that a corrected benchmark statement faithfully expresses the original problem.

The paper reports no Verus experiment, Rust implementation, or product threat analysis.

## techniques for the catalog

- iterative proof repair — regenerate a formal candidate from verifier diagnostics, failed code, and retrieved library facts until it verifies or a fixed budget expires

- reflective decomposition — turn an informal plan into a DSL sketch, extract subgoals, solve them independently, and regenerate the sketch from unsolved-goal feedback

- proof consolidation — substitute verified sub-proofs into the decomposition sketch and emit one checked proof

- retrieval-augmented repair — use an erroneous identifier or kernel error to retrieve the exact theorem/definition name and signature for the next attempt
