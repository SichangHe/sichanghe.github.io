# Formalize Once, Edit the Rest: Efficient Lean-Based Answer Selection for Math Reasoning
(authored by agents unless marked 🧑)
Tag: `feng2026formalizeb`, [paper](https://arxiv.org/abs/2606.15972)

## scope and result

Feng and Shi propose BASE (Base-And-Substitute-Edit), a pipeline that selects among K natural-language mathematical answers by formalizing one candidate in Lean and editing only the answer-bearing part for the remaining candidates. The problem is that independent autoformalization invokes an LLM K times, even though candidate statements usually share the same theorem structure. The paper states: “We propose BASE, a base-and-edit pipeline that formalizes a single base candidate per problem and derives the remaining K−1 statements by editing the answer expression in place.” (Abstract, p. 1). It reports a roughly fivefold reduction in autoformalizer calls at K=8 and higher selection accuracy in all twelve dataset/solver settings (Abstract and Section 5.1, pp. 1, 6–7).

The system uses Lean 4 statement type-checking as its main signal. A proof-level Lean kernel check is studied separately because one-attempt prover coverage is low. The paper cautions: “A statement-level type-check certifies well-formedness of Fi rather than mathematical truth of ai.” (Section 3.4, p. 5). Therefore the method is an efficiency technique for formalization and selection, not a proof that the selected answer is mathematically correct.

## technique 1: ranked base discovery

What it is. An upstream solver emits a ranked list S(x)=(a1,…,aK), with a1 the most likely answer. BASE autoformalizes candidates in rank order until it finds the first Lean statement that type-checks. If b is the first successful rank, Fb and ab become the reusable type-checked base.

When to use it. Use this when candidates for one problem share a formal theorem skeleton and a type-checking compiler can reject malformed encodings. Rank order preserves the upstream solver's preference when multiple candidates type-check.

How to do it. (1) Generate K distinct candidates in one solver call or by independent sampling. (2) For i=1,…,K, invoke the answer-conditioned autoformalizer F(x,ai). (3) Run Lean type-checking on Fi. (4) Stop at the first success b=min{i:Fi type-checks}. (5) Keep Fb and ab as the base. (6) If no candidate type-checks, return the top-ranked candidate a1 as fallback. The paper says: “We iterate candidates in rank order; for each ai, we compute Fi = F(x, ai) and check whether Fi type-checks in Lean.” (Section 3.2, p. 4).

Evidence. Base discovery needs at most b autoformalizer calls and is approximately constant in practice because b is usually small. The measured fallback rate for Gemini K=8 is 18/1,179=1.5% overall: 6/500 (1.2%) MATH-500, 12/566 (2.1%) OlympiadBench, and 0/83 plus 0/30 for AMC-AIMO and AIME 2024 (Appendix F, Table 9, p. 14). The denominator is problems in each dataset.

Failure and assumptions. The method assumes candidate formalizations share problem-side structure. The paper says this may fail when “each candidate requires a structurally different statement.” (Limitations, p. 9). Type-checking can also accept a faithful-looking but incorrect answer encoding; the solver's rank remains a heuristic tie-breaker.

Inference: In Verus, the analogue is to choose one candidate whose Rust/specification pair verifies, then preserve its verified scaffolding while substituting answer-specific constants. Verus proof success still depends on the substituted contract and lemmas; a type-correct Rust term is not a proof of the intended property.

## technique 2: two-tier substitution cascade

What it is. Given Fb and ab, BASE derives each other candidate statement by replacing only the answer expression. Tier R1 uses exact string localization inside a structural filter. Tier R2 uses LEANSCRIBE, a learned model that predicts a contiguous answer-dependent block and a reusable function mapping any informal answer to its Lean expression.

When to use it. Use R1 for literal answer copies. Use R2 when the autoformalizer encodes the same answer as bindings, sets, intervals, products, roots, or other syntax that does not contain the original answer string verbatim.

How to do it. (1) filter the base statement to exclude comments, headers, imports, helper definitions, and text after the proof marker. (2) Find all exact occurrences of ab in the structurally filtered theorem body. (3) If there is one occurrence, substitute ai there. (4) If there are several, run the disambiguation model to select the answer slot. (5) If no occurrence exists, call LEANSCRIBE once with x, Fb, and ab. (6) Use its predicted block s and fill function f to produce f(ai). (7) Accept the edit only when the structurally filtered block occurs exactly once; otherwise return no substitution for that candidate. Algorithm 1 gives these branches, including the position filter, `DISAMBIG`, and `SUBSTITUTE` (Section 3.2, p. 4; Appendix B, p. 13).

Evidence. R1 and R2 are complementary. On MATH-500 with Gemini K=8, per-candidate Lean pass rate is 87.9% with both tiers, 67.9% with R1 only, so R2 contributes 20.0 percentage points. The corresponding gains are 8.3 points on AMC-AIMO (93.9−85.6), 22.5 on AIME 2024 (82.6−60.1), and 18.7 on OlympiadBench (86.4−67.7) (Table 3, Section 5.3, p. 7). The denominator is all candidate statements in each dataset's K=8 evaluation.

Failure and assumptions. Direct substitution fails for non-verbatim encodings. LEANSCRIBE's local block must be contiguous and unique; long answer expressions and unusual geometry remain residual failure cases (Section 5.3, p. 7). An incorrect block or fill function can alter more than the answer and invalidate the base's structural guarantee.

Inference: For Verus, a substitution cascade could edit a designated spec expression while keeping proof-relevant types and invariants fixed. The edit function would need a contract proving that it changes only the intended term; string-level replacement alone is insufficient for Rust syntax and macro expansion.

## technique 3: LeanScribe expert-iteration training

What it is. LEANSCRIBE is a Qwen3-8B model LoRA-fine-tuned to output a local answer block and a Python fill function. The training corpus is built by repeatedly retaining only predictions whose reconstructed Lean statements pass an independent Lean type-check.

When to use it. Use expert iteration when a rewriter must learn diverse formal encodings and a formal compiler can filter incorrect training examples.

How to do it. (1) Seed examples from NuminaMath by formalizing gold answers. (2) Ask the base model for a local block and fill function. (3) Reconstruct statements for alternative answers. (4) Keep only Lean-passing reconstructions. (5) Fine-tune the model on retained examples. (6) Generate predictions on harder or previously failed examples, filter again, merge, and retrain. Appendix C reports 4,186 examples: 225 seed, 699 first generated, and 3,262 hard-case examples; 3,768 train and 418 test. The final model uses Qwen3-8B LoRA rank 32, α=64, dropout 0.05, three epochs, and learning rate 1×10−4 (Appendix C, p. 13).

Evidence. The model is trained only on NuminaMath; the complete BASE pipeline reaches 96–100% gold-pass across all four benchmarks in Table 1. The authors interpret this as transfer of localization and rewriting behavior (Section 5.3, p. 7). The paper's concrete example maps `3√13` to `3 * Real.sqrt 13` and reuses the generated `fill_answer` function for another candidate (Figure 2, p. 5).

Failure and assumptions. Lean filtering establishes well-formedness of retained examples, not that the natural-language answer and Lean expression are semantically faithful. The paper reports incorrect-answer complete-proof false positives averaging about 7% (range 1–14% across cells) in the proof-level analysis (Section 5.4, pp. 7–8). Training and evaluation also assume the answer slot can be represented by one local block.

Inference: A Verus rewriter could be trained on generated spec edits filtered by Verus verification, but the filter would still certify only the encoded contract. Human or independent semantic checks are needed to detect a model that consistently formalizes the wrong question.

## technique 4: statement-level selection and proof-level separation

What it is. For each candidate, BASE records ci=1 when Lean accepts the statement and pi=1 when a prover-generated proof is accepted by the Lean kernel. Selection returns the highest-ranked candidate with ci=1, falling back to a1 if none passes. Proof generation is treated as a separate downstream stage.

When to use it. Use statement-level selection when prover pass@1 is too low or too expensive, while retaining proof checking for settings where a complete proof is available.

How to do it. (1) Type-check each base or edited statement. (2) Optionally run a prover on each type-checked statement. (3) For statement-only selection, choose min{j:cj=1}. (4) For proof-level evaluation, require a proof with no `sorry` placeholder and let the Lean kernel check it. The authors use one greedy DeepSeek-Prover-V2 attempt per candidate; Appendix E defines proof-complete as a proof accepted with no remaining `sorry`.

Evidence. Table 1 at K=8 reports BASE versus independent formalization. For Gemini 3 Pro, MATH-500 accuracy is 79.4% versus 70.2% and gold-pass is 98.7% versus 87.3%; OlympiadBench is 53.4% versus 41.7% and 99.0% versus 77.6%; AMC-AIMO is 86.7% versus 73.5% and 100.0% versus 82.9%; AIME 2024 is 63.3% versus 40.0% and 100.0% versus 66.7% (Table 1, Section 5.1, pp. 6–7). Across all twelve dataset/solver cells, BASE improves accuracy by 0.7–23.3 points and raises gold-pass to 96–100%. Reported proof-level accuracy ranges approximately 4–31%; BASE improves 11 of 12 cells, with a sign-test p=0.006. The exception is AIME-2024 with R1-Qwen3-8B (3.6%, down 7.1 points, n=28), so that cell uses fewer than the nominal 30 problems (Table 4 and Section 5.4, p.7). The paper does not explain all differences between nominal dataset sizes and reported percentage denominators (Section 5.4, pp. 7–8).

Failure and assumptions. A type-check is not mathematical truth. The paper explicitly leaves efficient proof generation for future work. The prover can produce complete proofs for incorrect formalizations if autoformalization is unfaithful; statement-level and proof-level signals therefore share a semantic bottleneck.

Inference: In Verus, this distinction maps to compiling Rust/spec code versus proving `ensures`. A successful compile or well-typed spec is weaker than a verified postcondition, and a proof can still target a miswritten specification.

## technique 5: amortized cost and drop-in integration

What it is. Independent formalization costs Θ(K) autoformalizer calls. BASE costs one or a few base-discovery calls plus one LEANSCRIBE prediction, then local edits, giving practical Θ(1) autoformalizer calls per problem. The method can replace only the formalization stage of a larger FANS-style pipeline. These savings count autoformalizer calls, not all model calls or Lean checks; edited candidates are still type-checked.

Evidence. At K=8, Table 2 gives average base-discovery calls of 1.23, 1.29, and 1.23 for MATH-500 across Gemini, Qwen3, and R1-Qwen3, versus eight independent calls. Table 6's drop-in experiment reduces calls from 4,000 to 689 (5.8×) on MATH-500, 664 to 116 (5.7×) on AMC-AIMO, and 240 to 53 (4.5×) on AIME 2024; accuracy changes from 88.2% to 88.6%, 62.7% to 61.4%, and 13.3% to 13.3%, respectively. The nominal datasets contain 500, 83, and 30 problems with K=8 candidates (Section 5.5, p. 8).

The matched-base ablation supports the authors’ structural-reuse explanation: on the matched OlympiadBench/AMC-AIMO/AIME set, independent formalization has GT-pass 81.9%, candidate pass 81.2%, and accuracy 39.3%; first verified base has 98.2%, 91.7%, and 47.1%; random verified base has 95.4%, 91.2%, and 45.6% (Table 8, Section 6, pp. 8–9).

Inference: For VL, the analogous optimization is to formalize or verify one shared Rust/spec scaffold and instantiate candidate-specific values, while counting Verus invocations and preserving proof obligations. The measurable benefit is cost reduction; it does not reduce the need to verify each edited candidate.

## additional controls and limitations

Appendix B (p.13) retains the already type-checked base without re-editing it, avoiding failures from edits that fail to reconstruct the same base. It also routes unsafe direct substitutions, such as natural-language labels, to the learned tier even if literal matching succeeds. Both controls complement the main cascade.

The drop-in FANS-style experiment is proof-level: DeepSeek-Prover-V2 generates proofs, a QwQ-32B judge filters natural-language/formal consistency, and majority voting selects among candidates passing both checks (Appendix D, pp.13–14). Its AMC-AIMO accuracy decreases from 62.7% to 61.4% despite the call reduction; the twelve-cell accuracy-improvement claim concerns the separate rank-based main experiment.

The prover-swap experiment distinguishes compiling a proof containing `sorry` from completing it: MATH-500’s raw DeepSeek-Prover-V2 pass rate is 15.1%, versus 7.3% without remaining `sorry` (Appendix E, p.14). Appendix G (p.14) excludes MATH-500 from the matched random-base control because alternate-answer substitution nearly always hits the type-check timeout there. It reports 6.3× lower pairwise character-ngram variance and correlation r=0.22 with type-check gains (n=2015, p<10⁻³), but |r|<0.05 with proof-completion gains. These are empirical associations, not a proof that shared syntax ensures semantic fidelity.

## what is proved, measured, and trusted

The paper measures statement type-check rates, answer selection accuracy, proof-complete rates, autoformalizer calls, and variance on four datasets and three upstream solvers. The key factorization is Acc = GT@K × Acc|GT@K: solver candidate coverage times verifier retention of solver-correct answers (Equation 3, Section 6). The paper does not prove the natural-language-to-Lean translation faithful, does not prove incorrect answers cannot type-check or receive proofs, and does not establish that results transfer to tasks whose candidates need different theorem structures. Trusted components include the Lean compiler and kernel, Mathlib, autoformalizer, LEANSCRIBE, upstream solver rankings, and the semantic consistency of formal statements.

Inference: For agent-written verified Rust, BASE presents a threat and an opportunity. Reusing a verified scaffold can reduce model calls and structural drift, but a wrong base specification can propagate the same mistake to every candidate. Verus proof success certifies the edited contract, not that the contract expresses the user's problem. A safe integration needs explicit answer-slot boundaries, independent semantic checks, and proof-complete verification for any result presented as a guarantee.

## BASE lessons for Verus candidate generation

Inference: for Verus candidate generation, the paper offers rank-ordered base discovery, structurally filtered local edits, compiler-filtered rewriter training, and separate accounting for type-checks versus proofs. BASE already establishes this amortization strategy for Lean, so VL should adapt its slot-preserving edits to Rust specifications and retain independent semantic checks for every edited contract.

## techniques for the catalog

- ranked base discovery — formalize candidates in solver rank order and reuse the first statement accepted by the formal compiler
- structurally filtered substitution cascade — replace a unique answer occurrence directly, otherwise use semantic localization and a fill function
- compiler-filtered expert iteration — train a rewriter on predictions retained only when reconstructed statements type-check
- statement/proof separation — distinguish compiler well-formedness from kernel-checked proof and select with the strongest available signal
- amortized formalization — pay one base and one reusable rewrite prediction instead of K independent autoformalizer calls
- shared-scaffold ablation — compare first and random verified bases to test whether reuse, rather than base quality, causes gains

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Prior work on provers typically reports pass@k with a large k, sampling many proof attempts per theorem."): read the entire supplied 15-page paper text, including references and appendices A–H, and the entire study; compared quotations, experiment values, procedures, and page references; corrected page locations and paper link/tag, qualified constant-cost and denominator claims, distinguished type-checking from completed proofs, and added substitution safeguards, prover-swap details, and matched-ablation exclusions; did not run Lean or the pipeline, inspect code or training data, reproduce reported results, validate references, or visually inspect PDF figures.
