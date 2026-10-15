# DeepSeek-Prover: Advancing Theorem Proving in LLMs through Large-Scale Synthetic Data
(authored by agents unless marked 🧑)
Tag: `xin2024deepseekprover`, [paper](http://arxiv.org/abs/2405.14333v1)

## purpose and pipeline

DeepSeek-Prover builds a large Lean 4 training corpus by translating informal competition mathematics into formal statements, filtering the translations, generating proofs, checking them in Lean, and iterating model training. The paper's abstract states: “After fine-tuning the DeepSeekMath 7B model on this synthetic dataset, which comprises 8 million formal statements with proofs, our model achieved whole-proof generation accuracies of 46.3% with 64 samples and 52% cumulatively on the Lean 4 miniF2F test” (abstract, PDF page 1). The source pool contains 869,659 cleaned natural-language problems, mostly high-school and undergraduate algebra and number theory (section 3.1, PDF page 4).

The pipeline has four stages: autoformalization, model scoring and hypothesis rejection, statement proving, and iterative enhancement (section 3, PDF page 3). A distinctive scalability device proves a statement and its negation concurrently, terminating when either succeeds. Lean 4 v4.7.0-rc2 is the verifier (footnote in section 3, PDF page 3).

Inference: for VL, the transferable idea is a closed data loop in which natural-language requirements become Rust/Verus contracts, invalid contracts are rejected before proof search, verified proof bodies become training data, and the model is retrained only on artifacts replayed by Verus.

## technique 1: autoformalize natural-language problems

What it is. DeepSeek-Prover converts an informal problem with answers into only the core Lean declaration. The authors initialize from DeepSeekMath-Base 7B and fine-tune on MMA, whose Lean 4 mathlib statements were back-translated into natural-language descriptions by GPT-4 (section 3.1, PDF page 4). The paper gives the prompt shape:

“Mathematical Problem in Natural Language:
{$informal_statement_with_answers}
Translate the problem to Lean 4 (only the core declaration):” (section 3.1, PDF page 4).

How to apply it. (1) Collect and clean a broad natural-language problem set. (2) Fine-tune an initially weak model on aligned natural-language/formal pairs. (3) Prompt the model with the problem and answer information. (4) Require only the core formal declaration, keeping syntax consistent. (5) Compile the declaration with the proof assistant. The authors chose problems with explicit conditions and goals because they are easier to formalize, emphasizing algebra and number theory and using less combinatorics, geometry, and statistics (section 3.1, PDF page 4).

Verus form. Inference: prompt a model to emit a Rust function signature plus `requires` and `ensures`, or a `spec fn` for pure mathematical content. Require the contract and executable skeleton separately so that generated prose cannot silently become an assumption. Run Verus immediately and retain the exact source and dependency revision. Lean notation and typeclasses do not carry over; Rust integer widths, ownership, and overflow behavior must be explicit.

Evidence and failure. The data-creation source has 869,659 problems, but only 712,073 statements remain after filtering (sections 3.1–3.2, PDF pages 4–5). The paper's autoformalization can encode a different theorem. In a matrix determinant example, a universal hypothesis over all nonzero `a`, `b`, and `c` was inconsistent; the authors derive `False` by instantiating the hypothesis at two triples and simplify the determinants (case study 5.2, PDF page 9). This is a contract-risk warning for VL: compiling syntax does not show that the contract matches the requirement.

## technique 2: score statements and reject vacuous hypotheses

What it is. The authors filter two defects: statements that are too trivial and statements that are provable only because their hypotheses are inconsistent. A scoring prompt classifies each statement as “excellent,” “good,” “above average,” “fair,” or “poor”; fair and poor statements are excluded (section 3.2, PDF page 4). The second test asks whether the statement can be proved with `False` as its conclusion. If it can, the hypotheses are inconsistent and the statement is rejected.

The paper's concrete test is:

“example (θ : R) (h0 : ∀ z : C, z ^ 2 = -1 ∧ z ^ 3 = -1 ∧ z ^ 6 = 1) (h1 :
    Real.tan θ = 2 * Real.sqrt 3) : False := by
  simpa using h0 1” (section 3.2, PDF page 5).

How to apply it. (1) Score each formal statement with few-shot examples from valid miniF2F statements. (2) Discard fair and poor scores. (3) Replace the original conclusion by `False`, preserving all hypotheses. (4) Ask the prover to derive `False`. (5) If it succeeds, reject the original statement as vacuous. (6) Keep only high-scored statements that survive this rejection. This produced 712,073 high-quality formal statements (section 3.2, PDF page 5).

Verus form. Inference: for each generated contract, create a temporary proof obligation whose goal is `false` under the same `requires` clauses. If Verus can prove `false`, the preconditions are inconsistent and the contract is vacuous; reject it. This is a proof-side sanity check, not a complete satisfiability decision. A Verus `proof fn` can establish contradiction with `assert(false)` only when the assumptions truly imply it; do not mark the check with `external_body`. A language-model score can rank usefulness but cannot replace this contradiction check.

Evidence and limitation. Table 3 trains on equal amounts of high- and low-scored proof data: high-score data reach 48.8% miniF2F-valid and 42.6% miniF2F-test at pass@128, versus 41.4% and 38.1% for fair/poor data (Table 3, PDF page 7). Scoring therefore correlates with downstream performance in this setting. It does not prove that every high-score statement is semantically faithful; the case study shows a separate universal-quantifier error.

## technique 3: prove a statement and its negation concurrently

What it is. Autoformalization yields false or unprovable statements, and brute-force proof attempts waste time until a timeout. The paper reports that at least 20% of statements remained incorrect after filtering (section 3.3, PDF page 5). For each candidate Γ ⊢ P, DeepSeek-Prover concurrently searches for Γ ⊢ ¬P. It stops as soon as one side has a valid Lean proof. A proof of the negation establishes that the original proposition is false under the same context.

How to apply it. (1) Start two bounded proof workers with the identical context, one targeting P and one targeting ¬P. (2) Give each up to k attempts, stopping that worker early on success. (3) Race the workers. (4) If P succeeds, retain the theorem-proof pair. (5) If ¬P succeeds, retain a proof of the negation as a data-augmentation example and discard P as a positive theorem. (6) If both fail, mark the candidate unresolved. The authors say this “serves as a form of data augmentation, enriching the dataset with both propositions and their negations” (section 3.3, PDF page 5).

Verus form. Inference: for a fixed Rust contract, run Verus on the intended postcondition and on an explicitly constructed negated property in a separate proof harness. Keep the two proof results distinct; a proof that a contract is false does not prove the implementation's desired behavior. Negating a postcondition involving quantifiers, mutation, or ownership may require a ghost model and cannot be done by textual `!` substitution. Race only independent verifier jobs; do not change executable code between them.

Evidence and limits. The method is justified by saving search on incorrect statements, but the paper does not report a direct time-savings denominator or a comparison with sequential search. The negation may itself be difficult, and a timeout on both sides gives no classification. Lean's classical logic and the exact formal statement determine whether the pair P/¬P is exhaustive.

## technique 4: iterative enhancement and expert iteration

What it is. Valid theorem-proof pairs from one cycle fine-tune the same DeepSeek-Prover, which then generates better formal statements and proofs in the next cycle. The cycle repeats until improvements become marginal (section 3.4, PDF page 5). The model is DeepSeekMath-Base 7B with global batch size 512, learning rate 1 × 10−4, and 6,000 warmup steps (section 4.1, PDF page 6).

How to apply it. (1) Generate and filter statements. (2) Generate proofs and verify them in Lean. (3) Fine-tune on the verified theorem-proof pairs. (4) Use the updated model to generate the next statement and proof round. (5) Measure on a held-out benchmark after every round. (6) Stop when gains are marginal. The authors call this expert iteration and also compare synthetic-data scale.

Evidence. At pass@128 on miniF2F-test, iteration 0 reaches 34.0%, then iterations 1–4 reach 39.3%, 41.4%, 45.1%, and 46.3% respectively (Table 4, PDF page 8). A model trained on 3.108B tokens of autoformalized statements reaches 42.6% miniF2F-test, versus 31.2% for 0.238B tokens of Mathlib data (Table 2, PDF page 7). Increasing synthetic data from 1,000 to 8,066,621 examples raises miniF2F-test pass@128 from 24.18% to 40.16% (Table 5, PDF page 8).

Verus form. Inference: use verified Verus proof bodies as expert data, keeping contracts fixed and splitting by project or time so later rounds cannot train on evaluation obligations. Re-run Verus after dependency resolution and reject any example that relies on untrusted proof escape hatches. Track proof success, verification time, and contract changes separately; more data can amplify a systematic contract error.

## technique 5: proof generation with kernel validation and pass@k

What it is. DeepSeek-Prover generates complete Lean proofs for filtered statements; Lean validates each candidate. The metric pass@k means at least one valid proof among the first k generated attempts (section 4.2, PDF page 6). The model is compared with GPT-4, DeepSeekMath-Base, and tree-search systems.

How to apply it. (1) Fix a formal theorem statement. (2) Sample k complete proofs. (3) Compile and kernel-check each proof. (4) Count success if any proof verifies. (5) Report k and benchmark denominator. (6) Increase k only when compute budget permits; use cumulative pass rates for scaling curves.

Results. On miniF2F-test's 244 problems, DeepSeek-Prover reaches 46.3% at 64 samples and 52.0% cumulative; GPT-4 reaches 23.0% at 64 samples and Hypertree Proof Search reaches 41.0% (Table 1, PDF page 7). DeepSeek-Prover's miniF2F-test values rise from 30.0% greedy to 50.0% at 65,536 generation times (Table 1, PDF page 7). On FIMO, the text inconsistently says the benchmark contains 149 formal problems (section 4.2, PDF page 6) while the abstract and introduction report 148; the method proves 4 at 100 attempts and one additional at 4,096 (section 4.2, PDF page 6).

Verus form. Inference: apply pass@k to fixed Rust functions and contracts, compiling every candidate with Verus. Report the number of obligations in the denominator and the number of candidate bodies per obligation. A verified body is evidence of the stated contract only; the contract itself remains a trusted requirement. Whole-proof generation does not eliminate the need for Verus's solver, library specifications, and Rust compilation.

## what is proved, measured, and trusted

Lean's formal verifier checks the accepted theorem-proof pairs. The experiments measure pass@k on miniF2F-valid (244 problems), miniF2F-test (244), and FIMO, plus ablations by data score, iteration, and corpus size. The reported 8 million proof data points, 46.3% at 64 samples, and 52.0% cumulative miniF2F-test are Lean-specific (abstract and Table 1, PDF pages 1 and 7). The FIMO denominator is internally inconsistent: the paper says 149 in section 4.2 but 148 in the abstract and introduction, so its “4” and “5” solved counts cannot be assigned one unambiguous denominator.

Trusted components include Lean 4, the fixed Mathlib commit 64528268b3c2cf578639bc479828882a9ecd3a82 (footnote in section 3.1, PDF page 4), the autoformalized statement itself, source problem interpretation, and the model-generated filtering labels. A Lean proof does not establish that the natural-language problem was formalized faithfully; the determinant case explicitly illustrates this gap.

Inference: threat to a product of agent-written verified Rust is high at the contract boundary and medium for proof generation. The pipeline's quality gates and dual proving are valuable, but a vacuous or over-general Rust contract can pass exactly as a false Lean statement can. VL should require human- or specification-level review of generated `requires`/`ensures`, then use Verus as the final proof gate. The product should preserve rejected contradictions and negation proofs as diagnostics, not silently discard them.

## what VL should reuse and avoid redoing

Inference: VL should reuse quality scoring as triage, contradiction-based hypothesis rejection, dual positive/negative search where a meaningful negation model exists, verified expert iteration, and pass@k reporting. It should not redo a Lean miniF2F benchmark or claim the 52.0% result transfers to Rust systems. The next useful VL measurement is a corpus of real Rust contracts with independently reviewed requirements, where the system reports how often it detects inconsistent preconditions before proof search and how much verified proof data each iteration adds.

## techniques for the catalog

- autoformalization: translate natural-language problems into core formal declarations with a structured prompt
- statement scoring: classify generated statements and remove fair or poor candidates
- hypothesis rejection: prove `False` under the candidate assumptions and reject vacuous statements
- dual positive and negative proving: search for a statement and its negation concurrently to save work and augment data
- iterative expert enhancement: fine-tune on verifier-accepted theorem-proof pairs and repeat until gains level off
- pass@k proof evaluation: count a problem solved when one of k generated proofs passes the kernel
Checked 2026-10-15 against paper xin2024deepseekprover: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
