# Formalize Once, Edit the Rest: Efficient Lean-Based Answer Selection for Math Reasoning
(authored by agents unless marked 🧑)
Tag: `feng2026formalize`, [paper](https://arxiv.org/abs/2606.15972)

## What the paper proves and measures

Feng and Shi study answer selection when an upstream language model samples (K) candidate mathematical answers. Their target is the cost of translating each natural-language candidate into a Lean 4 theorem statement. The paper's central claim is that candidate statements usually share the problem structure and differ in the answer expression, so one type-checked statement can be reused. “Existing Lean-based answer-selection work uses an autoformalization model to generate a formal statement in Lean for each candidate answer independently, incurring a significant computational cost.” (abstract, p. 1)

The proposed BASE (Base-And-Substitute-Edit) pipeline receives a ranked list (S(x)=(a_1,ldots,a_K)) from an upstream solver. It formalizes candidates in rank order until it finds the first statement that Lean accepts, then edits that base statement for the remaining candidates and selects the highest-ranked edited statement that type-checks. The paper reports four benchmarks (MATH-500, OlympiadBench, AMC-AIMO, and AIME 2024), three solvers (Gemini 3 Pro, Qwen3-8B, and DeepSeek-R1-0528-Qwen3-8B), and (K=8). Across the resulting 12 dataset–solver cells, BASE improves end-to-end accuracy by 0.7–23.3 percentage points and raises gold-statement pass rates to 96–100% (Table 1, §5.1). At (K=8), the reported mean reduction is 5.4×, with 4.5–6.5× reductions depending on solver and dataset (Table 2, §5.2). “BASE simultaneously improves selection accuracy and reduces formalization cost—a Pareto improvement that holds on all 12 (dataset, solver) configurations across four benchmarks and three solvers, cutting autoformalizer calls by about 5× at K=8, with the reduction expected to become larger as K grows.” (abstract, p. 1)

## technique 1: rank-ordered base discovery

When to use it: use base discovery when several candidates instantiate one problem and their formal statements should share a theorem scaffold. The upstream solver must provide an order, because BASE uses the order both for finding a base and as the selection tie-breaker (§3.1).

Steps in the paper:

1. Generate (K) distinct answers in one solver call and order them from highest to lowest solver confidence (§3.1).
2. For (i=1,ldots,K), call the answer-conditioned autoformalizer (F) to produce (F_i=F(x,a_i)), then run Lean's type checker (§3.2).
3. Let (b=min{i:F_i	ext{ type-checks}}). Keep (F_b) and (a_b) as the base pair. If no candidate type-checks, return the top-ranked (a_1), a fallback that occurred in 1.5% of problems overall (§3.2).
4. Reuse (F_b)'s structure for every other candidate; do not invoke (F) independently for all (K) candidates (§3.2).

The paper's cost model is at most (b) autoformalizer calls for discovery, with (b) approximately 1.5 in its experiments (Table 2, §5.2). The baseline makes exactly (K=8) calls per problem. “Base discovery requires at most b autoformalizer calls, and since recent autoformalizers (Wang et al., 2025) achieve a high compilation rate, b is typically small and thus the base discovery effectively costs only Θ(1) autoformalizer calls in practice.” (§3.2, p. 4)

Verus form (Inference): represent the candidate answer as a ghost/specification value and keep a verified Rust function or theorem statement whose common inputs are unchanged. A Verus implementation would use `requires` and `ensures` on executable functions, and `proof fn` lemmas to show that replacing the answer expression preserves the common scaffold. Lean's generated theorem text and Lean type checker do not carry over; Verus checks Rust syntax and contracts through its verifier. The rank order and fallback are ordinary executable control flow, while the proof obligations establish each edited candidate's contract.

## technique 2: two-tier answer-expression substitution

When to use it: use the cascade after a base has type-checked, because answers can occur verbatim or can be encoded structurally. The paper explicitly warns that tuple, interval, set, and symbolic answers often have no exact substring match (§3.3).

Steps in the paper:

1. Gate the base statement to its theorem body, excluding comments and headers, and find positions where the base answer (a_b) occurs (§3.2, Algorithm 1).
2. If there is one position, directly substitute the candidate (a_i). If there are several, use the disambiguation model conditioned on the statement to choose the answer slot (Algorithm 1, lines 1–7).
3. If direct matching fails, call LEANSCRIBE once with the problem, base statement, and base answer. It predicts a contiguous local block (s) and a fill function (f) mapping an informal candidate to the corresponding formal expression (§3.3).
4. Check that the predicted block is a singleton gated match, then replace (s) with (f(a_i)) for each remaining candidate. Return failure for that candidate if the block cannot be uniquely located (Algorithm 1, lines 8–11).

The paper's example uses the problem “Find the distance between (2, −6) and (−4, 3).” The base answer (3\sqrt{13}) appears in Lean as `3 * Real.sqrt 13`; LEANSCRIBE emits a Python function that maps another answer such as (2\sqrt{13}) to its corresponding Lean expression (Figure 2, p. 5). “Editing only this block preserves the verified base structure, and the reusability of f allows the cost of a single model call to be amortized across all K−1 candidates.” (§3.3, p. 5)

Verus form (Inference): use a typed answer enum or a specification-level answer value, and write a proof lemma that the generated expression denotes the candidate value. A direct substitution tier corresponds to constructing a new value in the same Rust data structure. A learned fill function would remain an untrusted executable generator until its output is checked by Verus; the verifier should prove the resulting function's postcondition rather than trust a Python rewriter. Verus has no Lean theorem-string replacement primitive, so this is a workflow analogy, not a direct port.

## technique 3: Lean-filtered expert iteration for the rewriter

When to use it: use this training method when the rewriter must learn diverse encodings and can cheaply reject invalid predictions with a compiler. The paper seeds training from NuminaMath, then repeatedly adds only predictions whose reconstructed statements pass Lean type-checking (§3.3).

Steps in the paper:

1. For seed problems, autoformalize the gold answer, ask a base model to predict a local block and fill function, reconstruct the statement, and retain only type-checking reconstructions (§3.3).
2. Train LEANSCRIBE by supervised fine-tuning on that seed set.
3. At each later iteration, use the current checkpoint on a broader set, emphasizing previously failed examples, and add newly type-checked predictions.
4. Supervised-fine-tune again as the dataset grows (§3.3).

“To train L EAN S CRIBE, we construct a training dataset via a Lean-filtered expert iteration, inspired by prior work training reasoning models or theorem provers.” (§3.3, p. 5) The ablation on MATH-500 with Gemini and (K=8) reports that disabling R2 lowers per-candidate pass rate from 87.9% to 67.9%, a 20.0-point contribution; the four benchmark contributions range from 8.3 to 22.5 points (Table 3, §5.3). The authors say transfer to all benchmarks is indicated by 96–100% GT-pass, while residual failures cluster in very long expressions and unusual geometric constructions (§5.3).

Verus form (Inference): the same loop can generate Rust proof candidates, compile them with Verus, retain only verified candidates, and fine-tune or prompt the generator on the accepted proof/specification pairs. Verus acceptance proves the supplied contract for the retained code; it does not prove that the contract captures the intended requirement. A Rust generator should emit source and proof code using supported Verus constructs, then run `verus` as the filter.

## technique 4: separate statement-level and proof-level signals

The paper distinguishes Lean type-checking from proving the resulting theorem. Type-checking establishes a well-formed proposition; a prover and Lean kernel are needed for proof-level evidence. BASE selects the highest-ranked candidate whose statement type-checks, because single-attempt proof coverage is low. “Proof-level verification, while more rigorous, remains too limited in coverage to serve as a practical selection signal.” (§3.4, p. 5)

The proof experiment uses DeepSeek-Prover-V2-7B with one greedy pass per candidate. Proof-level accuracy is 4–31% versus much higher statement-level results (Table 4, §5.4). BASE improves 11 of 12 proof-level cells, with a sign-test (p=0.006); the exception is AIME 2024 with R1-Qwen3-8B, where (n=28) (§5.4). The paper reports an average incorrect-candidate complete-proof false-positive rate of approximately 7%, ranging from 1–14% across cells (§5.4). “The per-candidate false-positive rate—an incorrect answer receiving a complete proof—is a low ∼7% on average (1–14% across cells), arising when the autoformalizer renders an incorrect answer as a statement that type-checks and admits a proof.” (§5.4, p. 7)

Verus form (Inference): use a two-stage pipeline in which Verus compilation first rejects malformed contracts, then proof completion establishes the postconditions. Treating compilation as correctness would be unsound for the same reason as in the paper: a well-typed specification can still describe the wrong answer. For high-assurance VL, select only proofs whose Verus postconditions match an independently reviewed specification, and preserve the solver's rank as a tie-breaker rather than as evidence of truth.

## assumptions, evidence, and boundaries

The shared-base method assumes that all candidates have the same problem-side structure and differ in a local answer expression. The paper states that this holds for its tasks but may fail when candidates require structurally different statements (§6). It also leaves proof-generation efficiency to future work and notes that autoformalization faithfulness remains a challenge (§6). “This work focuses on the efficiency of statement-level autoformalization for K candidate answers, and we use statement-level type-checking as the selection signal due to the limitation of provers.” (§6, p. 9)

The experiments use one RTX PRO 6000 GPU, vLLM, greedy decoding, Mathlib 4, and a 60-second per-statement Lean timeout (§4.2). The comparison keeps prompts, verifier components, and selection rule identical between independent formalization and BASE (§4.3). In a FANS-style integration, BASE reduces calls by 4.5–5.8× while accuracy changes from 88.2 to 88.6 on MATH-500, 62.7 to 61.4 on AMC-AIMO, and remains 13.3 on AIME 2024 (Table 6, §5.5). The paper's factorization (Acc=GT@K\cdot Acc\mid GT@K) shows that BASE changes verifier retention, not the solver's candidate list (Table 7, §6).

Inference: for a VL product that generates many verified Rust candidates, the strongest reusable idea is amortizing the common specification and proof scaffold while checking each changed answer locally. The threat is bounded by structural divergence, generator misformalization, false-positive proofs, and the correctness of the supplied specification. A product should measure those failure modes separately instead of reporting a single compile rate.

## techniques for the catalog

- rank-ordered base discovery: find the first type-checked formalization in candidate rank order and reuse its scaffold
- two-tier substitution cascade: use gated exact substitution first, then a learned localization-and-fill function for structural encodings
- Lean-filtered expert iteration: retain only rewriter outputs whose reconstructed statements pass the formal checker and fine-tune repeatedly
- statement/proof signal separation: distinguish well-formedness checks from kernel-checked proofs and report both denominators
- shared-scaffold integration: factor verifier accuracy into candidate coverage and conditional retention to isolate the effect of reuse
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
