# Lean Workbook: A large-scale Lean problem set formalized from natural language math problems
(authored by agents unless marked 🧑)
Tag: `ying2024lean`, [paper](http://arxiv.org/abs/2406.03847v3)
## pipeline purpose
Lean Workbook addresses sparse formal-language data by iteratively translating contest problems into Lean 4 statements and filtering errors. The final release contains about 57K formal-informal pairs, 5K with formal solutions, and 21 new IMO statements (abstract, p. 1). The paper says: “We use Lean compiler and Natural Language Inference (NLI) to check if it is a valid formalization.” (introduction, p. 2). The paper reports that “Manual examination reports an accuracy of 93.5% of a random sample of the Lean Workbook.” (introduction, p. 2) The work formalizes statements, not proofs; it uses `by sorry` placeholders during data construction (section 2, p. 2).

## technique: active-learning autoformalization
Start with MiniF2F and ProofNet pairs, add bidirectional formal↔natural translation and multitask Lean data, and fine-tune InternLM-Math-Plus-20B for three epochs at learning rate 4e−5 on 32 A100 GPUs (section 4.1, pp. 3–4). Extract 1,088,678 forum questions with Qwen-1.5-14B-Chat, retain 327,870 well-defined tagged questions, translate them, and iterate. The extraction prompt preserves assumptions, answers, and tags; a second prompt removes ill-defined questions (section 4.1, p. 4).

Each iteration: translate natural language to Lean; compile the statement with `by sorry`; back-translate Lean to natural language; ask NLI whether original and back-translation are the same; send compile failures or NLI disagreements to human experts; add corrected examples to the next training round. The paper states: “Each iteration will add an average of about 30 human-labeled samples into the training data, addressing the current model’s weakness.” (section 4.2, p. 5). Six rounds add 341 labeled samples and stop when sampled correctness approaches 95% (section 4.2, p. 5).

Inference: for Verus, replace Lean statement compilation with parsing and specification checks, and replace NLI with a semantic comparison of Rust/Verus specs against source requirements. A placeholder proof may help data generation, but must be excluded from any verified artifact or training target intended to claim proof.

## technique: fast compile checking with a REPL
Lean Workbook builds a Lean 4 read-eval-print loop using runtime metaprogramming so statement checks run interpreted and in parallel. The authors report completion in one hour on 32 CPU cores under Lean v4.8.0-rc1 and matching Mathlib4 (section 4.2, p. 5). This is a throughput technique: it catches type conflicts, malformed functions, chained inequalities, and other syntax/typing errors before semantic review.

Inference: a Verus pipeline could maintain a persistent verifier process, compile many small candidate modules in parallel, and cache imported crates. Compilation acceptance proves syntactic/type validity, not that the formal statement matches the natural-language requirement.

## technique: two-stage semantic filtering
Compilation alone accepts statements that are well typed but mistranslated. Back-translation plus NLI checks semantic agreement; failures go to human diagnosis. The authors define compile pass number (CPN), NLI pass number (NPN), and sampled human correct-translation rate (section 5.1, p. 6). Their diagnostic table gives reusable corrections: expand chained `a >= b >= c > 0` into conjunctions; add missing multiplication operators; encode triangle inequalities explicitly; represent all solutions as disjunctions; encode maxima with `IsGreatest`; and represent infinitely many numbers with `∀ N, ∃ n > N, ...` (table 2, p. 7).

Inference: Verus specification generation should similarly separate parser/verifier acceptance from semantic equivalence. A reviewer must inspect quantifier scope, units/types, extrema, existence, and omitted assumptions; these errors are specification threats even when Rust compiles.

## evidence and data limits
After six rounds, 205,079 translations compile and 57,231 pass NLI. Sampling 5–10 items per common tag gives weighted accuracy 0.935; table 1 reports, for example, inequality 10/10, algebra 9/10, number theory 9/10, and trigonometry 4/5 (section 5.2, table 1, p. 7). Sampling 1,024 proofs per problem solves 4,898 problems, reported as Pass@1024 8.6% (section 5.2, p. 7). Adding Lean Workbook raises CPN/NPN from 136,670/37,122 for the first model to 205,079/57,231 for the final model, and to 228,928/82,893 after fine-tuning on the workbook (table 3, p. 8). MiniF2F accuracy rises from 44.3/37.3 validation/test to 50.4/46.7 (table 4, p. 8).

The paper notes denominator and scope limits: sampled tag accuracy is not full-dataset accuracy; tags can be wrong; integer division and minimal/maximal statements remain difficult; the dataset is contest-focused and has deduplication problems (sections 5.2–6, pp. 7–8). Proofs are not established by the pipeline because statements use `sorry`. Trusted components include Lean parser/compiler, Mathlib environment, Qwen extraction/NLI judgments, human labels, and the sampled manual estimate. Inference: threat to agent-written verified Rust is high at the specification boundary and low at proof checking: this pipeline can supply useful training pairs, but it cannot establish that an agent's implementation meets an intended requirement without a semantic review stage.

## what VL should reuse and avoid
Inference: reuse iterative error-driven labeling, persistent verifier workers, bidirectional translation checks, and explicit error taxonomies. Avoid using compile success or NLI alone as proof evidence; keep statement data separate from verified proof data. Existing Lean Workbook work already supplies a large contest autoformalization corpus and identifies recurring semantic errors, so VL should not recreate these generic filters without adapting them to Rust ownership, mutation, and quantified invariants.

## techniques for the catalog
- active-learning autoformalization — iteratively add corrected verifier examples to improve translation
- persistent compile filtering — run fast parallel statement checks in a reusable verifier process
- back-translation NLI — compare source and reconstructed natural language before human acceptance
- error-pattern diagnosis — convert recurring type, quantifier, extrema, and missing-assumption errors into training examples
- sampled semantic audit — estimate correctness by tag while recording denominators and residual failure modes
- proof/data separation — use placeholders for statement data, never as evidence of a completed proof
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
