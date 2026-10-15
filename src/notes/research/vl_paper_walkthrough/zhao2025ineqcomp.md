# Ineq-Comp: Benchmarking Human-Intuitive Compositional Reasoning in Automated Theorem Proving on Inequalities
(authored by agents unless marked 🧑)
Tag: `zhao2025ineqcomp`, [paper](https://arxiv.org/abs/2505.12680)

## purpose and construction
The paper introduces a benchmark for whether formal theorem provers can reuse elementary inequality proofs after small, human-obvious transformations. It says, "We introduce Ineq-Comp, a benchmark built from elementary inequalities through systematic transformations, including variable duplication, algebraic rewriting, and multi-step composition." (abstract, p. 1). The authors curate 75 seed problems: 25 AM-GM, 25 Cauchy-Schwarz, and 25 miscellaneous (Jensen 10, Schur 5, sum-of-squares 5, induction 5), each with a verified Lean 4 proof (Section 2.1, p. 3). Ineq-Simp contains 150 transformed problems, Ineq-Mix is an expandable rule-based generator, and Ineq-Real contains 50 contest or educational problems translated and verified in Lean 4 (Sections 2 and 2.3, pp. 3–4).

### technique
The seed set uses introductory problems solvable by standard inequalities. The paper states, "Each problem is accompanied by a verified Lean 4 proof, contributing to formal proof resources and ensuring correctness." (Section 2.1, p. 3). Seed and proof curation is performed by people with national or international Olympiad experience, and problems are kept at or below introductory Olympiad difficulty (Section 2.1, p. 4).

### steps in the paper
1. select elementary inequality statements using AM-GM, Cauchy-Schwarz, Jensen, Schur, sum-of-squares, or induction (Section 2.1, p. 3)
2. write a Lean 4 proof for each seed and check it (Section 2.1, p. 3)
3. have experienced curators review the problem and proof (Section 2.1, p. 4)
4. partition the checked seeds by technique for later analysis (Section 2.1, p. 3)

### evidence and limits
The evidence is the verified-seed count and curator description; there is no inter-rater statistic or independent proof audit denominator. Inference: Seed correctness is evidence that the benchmark's starting claims compile in Lean, not evidence that generated transformations are easy for humans or that Verus agents will transfer the technique.

### Type I duplication and composition
Given a seed `f(X) ≥ g(X)`, the paper duplicates variables as `Y`, checks the same conditions, and combines the two inequalities. If `g(X) ≥ 0`, it multiplies to obtain `f(X)·f(Y) ≥ g(X)·g(Y)`; otherwise it adds them to obtain `f(X)+f(Y) ≥ g(X)+g(Y)` (Section 2.1, p. 3). The authors call this a minimal compositionality test because a human decomposes the target into two identical seed applications.

Inference: A Verus analogue duplicates a function contract over independent inputs, proves each precondition, then uses an arithmetic lemma or nonlinear solver step to combine the two postconditions. Multiplication requires an explicit non-negativity precondition; addition does not. Inference: `ensures` clauses are contracts, while loop `invariant` clauses belong only on loops; neither is a callable proof function.

### Type II variable transformation
Type II applies one substitution `T : Rⁿ → Rⁿ` (the examples include squaring or square-rooting variables), changes the condition to `T(X) ∈ C`, and proves `f(T(X)) ≥ g(T(X))` (Section 2.1, p. 3). The transformed statement keeps the seed's structure and is expected to be easy once the substitution is recognized.

Inference: In Verus, prove the transformation's domain facts first (for example, non-negativity needed by square roots), instantiate the seed lemma or function contract at `T(X)`, and discharge algebraic side conditions with supported arithmetic reasoning. The exact Verus lemma and solver calls are an inference because the paper is Lean-specific.

## Ineq-Mix generator
Ineq-Mix applies three rule classes: compositional (addition, multiplication, max/min), variable-level (algebraic replacement), and problem-level (a monotonic function such as `exp` or `log` applied to both sides) (Section 2.2, p. 4). The authors generate 100 evaluation problems using only compositional rules; the paper says this already challenges state-of-the-art provers. A generated product target such as `f1 f2 ≥ g1 g2` may require finding intermediate inequalities from `f1 ≥ g1` and `f2 ≥ g2` (Section 2.2, p. 4).

## evaluation protocol
The paper evaluates general-purpose language models, whole-proof generators, and tree-search methods. It defines pass@N as solved when at least one of N generated proofs is correct; for tree search, budget is the number of Lean-compiler interactions (Section 3.1, p. 4). In the table's 3,200-attempt setting, Kimina-Prover-Preview-Distill-7B obtains 80% on AM-GM seeds, 44% on Type I, and 64% on Type II; these are pass@3200 percentages over the benchmark's AM-GM problem set, with the model and setting named in Table 1 (p. 5). DeepSeek-Prover-V2-7B obtains 96%, 84%, and 76% on the same three AM-GM columns at pass@3200 (Table 1, p. 5). The paper reports that on 100 Ineq-Mix problems, every whole-proof model except DeepSeek-Prover-V2-7B solves fewer than 8 under a 128-trial budget, while DeepSeek-Prover-V2-7B solves 22 (Section 3.2, p. 6).

## compositional failure diagnosis
The paper observes large seed-to-variant drops and says, "These failures persist even when the model is scaled up (Section 4.1) or provided with the formal proof of the seed problem in-context (Section 4.2)." (abstract, p. 1). It also reports that most models default to Lean's `nlinarith` with `sq_nonneg`, rather than directly applying AM-GM, Cauchy-Schwarz, or Jensen (Section 3.2, p. 6). Natural-language reasoning often names the right high-level inequality, but the generated Lean code abandons that plan and uses brute-force algebraic manipulation (Section 3.2, pp. 6–7).

## in-context and fine-tuning ablations
For in-context learning, each Type I or Type II target is prompted with the complete verified seed proof. At 128 attempts, Qwen2.5-Coder-32B-Instruct reaches 40.0% on Type II AM-GM and 20.0% on Type II Cauchy-Schwarz; DeepSeek-R1-Distill-Qwen-32B with thinking reaches 16.0% on Type I AM-GM (Section 4.2, p. 8). These percentages are pass@128 for the named subsets and models, not single-attempt accuracy.

For fine-tuning, the authors put 25 AM-GM seeds in training and 50 other seeds in a held-out set, generate 15,000 Ineq-Mix problems, retain approximately 8,000 outputs that compile in Lean, and fine-tune Goedel-Prover-SFT (Section 4.3, p. 8). Type I AM-GM in-distribution accuracy reaches 56.0% at a high generation budget, while Type II and unseen transformations show minimal out-of-distribution gains (Section 4.3, p. 8).

## what is proved, measured, and trusted
Lean verifies the 75 seed proofs and the translated Ineq-Real proofs; generated Ineq-Simp and Ineq-Mix targets are intended to be formally solvable and are checked through the benchmark pipeline. Experiments measure pass@N success and standard deviations in Table 1, plus ablation outcomes. The paper does not prove that model strategies are compositional; it infers a capability gap from measured accuracy drops and qualitative code inspection.

## techniques for the catalog
- verified seed corpus: curate human-reviewed seed statements and check every proof before generating variants
- compositional duplication: duplicate independent inputs and combine postconditions by addition or multiplication with explicit side conditions
- algebraic substitution: apply a typed variable transformation and prove transformed-domain conditions before reusing the seed proof
- rule-based composition: compose validated transformation rules into scalable, metadata-labeled targets
- pass@N evaluation: count a problem solved only when at least one of N generated proofs passes the proof checker
- transfer ablations: compare seed, transformed, in-context, in-distribution, and held-out out-of-distribution settings
