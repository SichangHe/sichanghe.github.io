# FMC: Formalization of Natural Language Mathematical Competition Problems
(authored by agents unless marked 🧑)
Tag: `xie2025formalization`, [paper](http://arxiv.org/abs/2507.11275v1)

## purpose and result

The paper builds a training-free pipeline that turns natural-language Olympiad problems into Lean statements, checks syntax with Lean, checks semantic alignment by translating the Lean statement back to natural language, and retries failed items with error feedback. Its input is 6,980 problems crawled from IMOmath; after removing geometry and splitting multi-subproblem items, 4,798 remain. The final aligned set contains 3,922 natural-language problems and 9,787 Lean statements. The abstract states: “We propose an enhanced autoformalization pipeline based on large language models with error feedback, achieving a fully automatic and training-free formalization approach.” (Abstract, p. 1)

The paper reports 4,481/4,798 (93.39%) formal-verification passes and 3,922/4,798 (81.74%) consistency passes. Table 1 gives the decompositions: 4,287 first-pass and 194 error-feedback formal-verification passes; 3,631 first-pass and 291 error-feedback consistency passes. The denominator is the 4,798 retained problems. The authors report 64.46% of examples rated above average or higher by a language-model quality assessment, but this is a model judgment rather than a proof of mathematical correctness. The pipeline cost 161,037,099 tokens: 22,492,280 prompt tokens and 138,544,819 completion tokens (Dataset Construction, §4.3, p. 6).

## technique: source, filter, and normalize the corpus

Use official Olympiad statements as the natural-language source. The paper crawls PDF files from IMOmath, applies Mathpix OCR, then uses regular expressions to extract problem text into JSON. The source collection covers 11 international competitions and 42 national or regional contests from 1959–2011. This produces 6,980 problems before filtering (Data Collection, §4.1, p. 5).

Filter geometry because the authors observed that LLM formalization frequently omits implicit geometric constraints. Their example has positive segment lengths and angle bounds but omits the triangle-angle sum, angle-bisector, circumcircle, and intersection constraints; it passed both syntax and consistency checks despite being wrong (Data Preprocessing, §4.2, p. 5). Split a problem with several subproblems into separate records, each retaining shared conditions and one subgoal. The DeepSeek-R1 model performs both filtering and splitting, leaving 4,798 problems (Data Preprocessing, §4.2, p. 5).

Inference: For Verus training data, the same procedure would make each source problem a separate specification record, with explicit preconditions and one postcondition. OCR and regular-expression extraction are data-engineering steps and do not become Verus proofs. The geometry exclusion is a dataset policy, not a Verus limitation; a Verus encoding can represent geometry only if the developer supplies suitable mathematical types and axioms.

## technique: few-shot formal translation with sampling

For each retained natural-language problem, prompt a translation model to emit a Lean theorem. The initial prompt contains two fixed aligned examples, one algebra and one number-theory example. This is in-context few-shot learning: there are no gradient updates or fine-tuning (Translation, §3.1, p. 3). The pipeline uses DeepSeek-R1 as the translation model. It sets temperature to 1.0 and samples each input five times because stochastic outputs can provide useful diversity (Translation, §3.1, p. 4). If a statement has no proof, the generated Lean uses the placeholder `:= by sorry`, allowing Lean to detect a missing proof without treating the placeholder as a syntax error (Translation, §3.1, p. 4).

The paper's practical sequence is therefore: construct the prompt with the two examples; generate up to five candidates at temperature 1.0; retain candidates that can be checked; pass failures to the feedback loop described below. Table 7 compares one sample with five on the 57-item non-geometry subset. Sample@1 has 36 first formal-verification passes, 5 second passes, 28 first consistency passes, and 6 second passes, for 59.65%. Sample@5 has 51, 4, 44, and 8 respectively, for 91.22% (Table 7, p. 8). These percentages use 57 as denominator; 36+5+28+6=75 counts stage events, so the table's pass-rate definition is cumulative over item outcomes rather than the sum of those four cells.

Inference: In Verus, the analogous prompt should emit a Rust/Verus function contract (`requires`, `ensures`) and proof body, then sample multiple candidate contracts or proofs. Verus has no Lean `sorry` mechanism that establishes a theorem; an unproved placeholder would have to remain an explicit trusted escape hatch and should not count as verified. The sampling and temperature policy is external orchestration.

## technique: executable syntax checking as a verification gate

Each generated theorem, including its Mathlib imports, is sent as JSON through standard input to Lean 4's interactive Read-Eval-Print Loop. A Python subprocess invokes the REPL and parses compilation or type errors. This confirms syntactic correctness and returns structured error messages for retry (Formal Verification, §3.2, p. 4). The formal-verification gate is deliberately weaker than semantic correctness: Lean accepts a well-typed statement even when its statement omits conditions or changes the goal.

On all 4,798 retained problems, 4,481 statements pass this gate (93.39%): 4,287 on the first attempt (89.35% of 4,798) and 194 after error feedback (4.04% of 4,798) (Table 1, p. 6). The paper's geometry case demonstrates the limitation: a malformed formalization can pass both formal verification and the model-based consistency check (Data Preprocessing, §4.2, p. 5).

Inference: A Verus implementation would compile the candidate Rust/Verus module and treat verifier success as the syntax/type/contract gate. The corresponding evidence is a successful Verus verification run, but it proves only the emitted contract, not that the contract captures the natural-language requirement. Verus proof functions are erased from executable code; the runtime program still needs ordinary tests for behavior outside the specification.

## technique: backtranslation and semantic consistency checking

After a theorem passes Lean syntax checking, send the Lean statement to DeepSeek-R1 to translate it back into natural language. Compare that backtranslation with the original problem. The paper explains: “Comparing the consistency between two natural language problem descriptions is a comparatively simple task.” (Backtranslation, §3.3, p. 4) The consistency prompt asks the model to judge the same mathematical essence, including both conditions and goals, and to provide a brief rationale that can be fed into another retry. The output format is restricted because DeepSeek-R1 can otherwise produce extensive analysis (Consistency Check, §3.4, p. 4).

A candidate is retained only if the backtranslation is judged semantically consistent. On 4,798 items, 3,922 pass (81.74%): 3,631 first-pass (75.68%) and 291 after error feedback (6.07%) (Table 1, p. 6). In the 57-item few-shot experiment, the consistency results are 44 first and 8 second passes with few-shot, versus 45 first and 2 second passes zero-shot; the reported overall rates are 91.22% and 82.46% (Table 5, p. 7). The method can still accept wrong statements: the geometry example passed both checks while omitting essential constraints (Data Preprocessing, §4.2, p. 5).

Inference: For Verus, backtranslation can inspect whether a Rust contract's `requires` and `ensures` preserve the natural-language requirement. It is a review signal, not a proof obligation. A stronger deployment would require a human or independently formalized specification for high-risk contracts because the paper's consistency model sometimes affirms mismatched statements.

## technique: error-feedback retry

When either Lean verification or consistency checking fails, place the corresponding error information into a revised prompt and ask the translation model to try again. The paper describes this as “iterative prompt refinement driven by error feedback.” (Introduction, p. 2) For missing proofs, the error can be the explicit `sorry` placeholder; for syntax errors, it is Lean's compiler output; for semantic failures, it is the consistency model's rationale (Translation, §3.1; Formal Verification, §3.2; Consistency Check, §3.4).

The ablation separates useful semantic feedback from less useful compiler feedback. On the 57-item subset with five samples, error feedback yields 4 second formal-verification passes and 8 second consistency passes, for 91.22%. Without error feedback, the corresponding counts are 3 and 0, for 80.70% (Table 6, p. 7). The authors report a 10.52 percentage-point improvement for consistency checking. They also note that formal-verification error messages had limited impact: second-pass successes were 4 with feedback versus 3 without (Effect of Error Feedback, §5.3, p. 7).

Inference: In Verus, feed verifier diagnostics such as failed postconditions, invariant obligations, and type errors into a second generation prompt. Preserve the original contract and require the retry to state which obligation it changed. The paper does not establish that such retries preserve the intended theorem; a passing retry can repair syntax while silently weakening a contract.

## technique: model and prompt ablations

The authors compare DeepSeek-R1, GPT-4o-mini, and Claude 3.7 Sonnet on 100 randomly sampled original problems, including geometry. DeepSeek-R1 obtains 58% formal-verification pass and 43% final consistency pass, GPT-4o-mini 34% and 11%, and Claude 3.7 Sonnet 31% and 27%; token counts and times are averages (Table 2, p. 7). A cross-model matrix keeps the consistency checker fixed and reports formal-verification/consistency pairs, exposing model-specific effects (Table 3, p. 7). The consistency evaluation of DeepSeek-R1 formalizations reports accuracy 74.1%, precision 69.8%, recall 93.8%, and F1 80.0%; GPT-4o-mini has 74.1%, 77.4%, 75.0%, and 76.2%; Claude-3.7 has 58.6%, 57.4%, 96.9%, and 72.1% (Table 4, p. 7).

Inference: A Verus system should measure compiler success, semantic-review agreement, proof time, and contract defects separately. Mixing these denominators would overstate correctness.

## technique: benchmark theorem provers on the generated corpus

To measure difficulty, the paper evaluates 1,000 randomly sampled formal statements from the 9,787 Lean statements, with each verification task run 32 times. FMC pass rates are 16.4% for Kimina-Prover, 15.7% for Goedel-Prover, and 13.0% for DeepSeek-Prover-V1.5-RL (Table 8, p. 8). The comparison includes MiniF2F, ProofNet, and FormalMATH under the same reported setup. These are prover pass rates, not evidence that the autoformalization is semantically correct.

Inference: For Verus, a useful benchmark would publish the exact generated Rust/Verus statements, fixed verifier settings, repeated runs, and denominator for each task. It should distinguish compiling contracts from completed proofs and report failures by category.

## what is proved, trusted, and limited

Lean proves that retained statements are syntactically and type correct; it does not prove that they encode the source problem. The consistency model supplies a semantic filter but is itself fallible, as shown by the accepted geometry error. The dataset quality ratings are model-generated. Trusted components therefore include the source statements and OCR extraction, regex preprocessing, prompt examples, model behavior, Lean and Mathlib, the Python subprocess, the backtranslation checker, and the interpretation of `sorry` cases. The paper excludes all geometry and uses only five samples per problem because of resource and time limits (Conclusion, p. 8).

The paper claims 81.74% formalization accuracy while Table 1 defines that number as 3,922 consistency passes divided by 4,798 retained inputs. This is an internally clear ratio, but “accuracy” should not be read as independently audited mathematical equivalence. The 91.22% few-shot and error-feedback figures use the 57-item subset, whereas the 93.39% and 81.74% figures use all 4,798 items; these denominators must not be compared as if they were one experiment.

Inference: The threat to agent-written verified Rust is substantial at the specification boundary. An agent can produce Verus code that verifies against an incomplete or weakened contract, reproducing the paper's geometry failure in systems form. The paper's error-feedback loop and backtranslation are useful safeguards for generating candidate contracts, but they do not replace an independently checked requirement or a proof that the contract is adequate.

## techniques for the catalog

- corpus extraction and filtering — crawl authoritative problem PDFs, OCR them, split subproblems, and remove classes whose implicit constraints are systematically missed
- few-shot sampled translation — prompt with aligned examples and sample multiple formal statements at a controlled temperature
- verifier subprocess gate — compile each candidate in the target proof assistant and retain diagnostics for retries
- backtranslation consistency check — translate accepted formal statements back to natural language and compare conditions and goals
- error-feedback retry — place compiler or semantic-check failures into a revised prompt for iterative correction
- model and sampling ablations — compare models, prompts, and sample counts with explicit denominators and stage metrics
- theorem-prover benchmark — run fixed repeated trials on a random formal subset to measure generated-dataset difficulty
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
