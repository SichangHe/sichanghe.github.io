# Ineq-Comp: Benchmarking Human-Intuitive Compositional Reasoning in Automated Theorem Proving on Inequalities
(authored by agents unless marked 🧑)
Tag: `zhao2025ineqcomp`, [paper](https://arxiv.org/abs/2505.12680)

## purpose and construction
The paper introduces a benchmark for whether formal theorem provers can reuse elementary inequality proofs after small, human-obvious transformations. It says, "We introduce Ineq-Comp, a benchmark built from elementary inequalities through systematic transformations, including variable duplication, algebraic rewriting, and multi-step composition." (abstract, p. 1). The authors curate 75 seed problems: 25 AM-GM, 25 Cauchy-Schwarz, and 25 miscellaneous (Jensen 10, Schur 5, sum-of-squares 5, induction 5), each with a verified Lean 4 proof (Section 2.1, p. 4). Ineq-Simp contains 150 transformed problems, Ineq-Mix is an expandable rule-based generator, and Ineq-Real contains 50 contest or educational problems translated and verified in Lean 4 (Sections 2 and 2.3, pp. 3–5).

### technique
The seed set uses introductory problems solvable by standard inequalities. The paper states, "Each problem is accompanied by a verified Lean 4 proof, contributing to formal proof resources and ensuring correctness." (Section 2.1, p. 4). Seed and proof curation is performed by people with national or international Olympiad experience, and problems are kept at or below introductory Olympiad difficulty (Section 2.1, p. 4).

### steps in the paper
1. select elementary inequality statements using AM-GM, Cauchy-Schwarz, Jensen, Schur, sum-of-squares, or induction (Section 2.1, p. 4)
2. write a Lean 4 proof for each seed and check it (Section 2.1, p. 4)
3. use curators with national or international math Olympiad experience (Section 2.1, p. 4)
4. partition the checked seeds by technique for later analysis (Section 2.1, p. 4)

### evidence and limits
The paper reports the verified-seed count and curator qualifications (Section 2.1, p. 4). Inference: It does not report an inter-rater statistic or an independent proof audit denominator. Inference: Seed correctness is evidence that the benchmark's starting claims compile in Lean, not evidence that generated transformations are easy for humans or that Verus agents will transfer the technique.

### Type I duplication and composition
Given a seed `f(X) ≥ g(X)`, the paper duplicates variables as `Y`, checks the same conditions, and combines the two inequalities. If `g(X) ≥ 0`, it multiplies to obtain `f(X)·f(Y) ≥ g(X)·g(Y)`; otherwise it adds them to obtain `f(X)+f(Y) ≥ g(X)+g(Y)` (Section 2.1, p. 4). The authors call this a minimal compositionality test because a human decomposes the target into two identical seed applications.

Inference: A Verus analogue duplicates a function contract over independent inputs, proves each precondition, then uses an arithmetic lemma or nonlinear solver step to combine the two postconditions. Multiplication requires an explicit non-negativity precondition; addition does not. Inference: `ensures` clauses are contracts, while loop `invariant` clauses belong only on loops; neither is a callable proof function.

### Type II variable transformation
Type II applies one substitution `T : Rⁿ → Rⁿ` (the examples include squaring or square-rooting variables), changes the condition to `T(X) ∈ C`, and proves `f(T(X)) ≥ g(T(X))` (Section 2.1, p. 4). The transformed statement keeps the seed's structure and is expected to be easy once the substitution is recognized.

Inference: In Verus, prove the transformation's domain facts first (for example, non-negativity needed by square roots), instantiate the seed lemma or function contract at `T(X)`, and discharge algebraic side conditions with supported arithmetic reasoning. The exact Verus lemma and solver calls are an inference because the paper is Lean-specific.

## Ineq-Mix generator
Ineq-Mix applies three rule classes: compositional (addition, multiplication, max/min), variable-level (algebraic replacement), and problem-level (a monotonic function such as `exp` or `log` applied to both sides) (Section 2.2, p. 4). The authors generate 100 evaluation problems using only compositional rules; the paper says this already challenges state-of-the-art provers. A generated product target such as `f1 f2 ≥ g1 g2` may require finding intermediate inequalities from `f1 ≥ g1` and `f2 ≥ g2` (Section 2.2, p. 4).

For Ineq-Mix, Appendix B requires a fixed number of real variables and adds strict positivity of each variable; 65 of the 75 seeds qualify after small modifications (p. 14). A tag records whether the right-hand side is positive. Composition rules distinguish operations that need positive right-hand sides from those that do not (Table 4, p. 15). To keep combined conditions feasible, the framework composes problems only when at least one has no assumptions beyond variable positivity, or when their variable sets are disjoint before lifting (Appendix B, pp. 16–17). Variable transformations that are not one-to-one are restricted to problems with no additional assumptions (p. 16). Statement transformations also have domain conditions: `exp` and cubing need no positive-right-hand-side condition; square root, squaring, and `log` do (Table 6, p. 16).

## evaluation protocol
The paper evaluates general-purpose language models, whole-proof generators, and tree-search methods. It defines pass@N as solved when at least one of N generated proofs is correct; for tree search, budget is the number of Lean-compiler interactions (Section 3.1, p. 5). In the table's 3,200-attempt setting, Kimina-Prover-Preview-Distill-7B obtains 80% on AM-GM seeds, 44% on Type I, and 64% on Type II; these are pass@3200 percentages over the benchmark's AM-GM problem set, with the model and setting named in Table 1 (p. 6). DeepSeek-Prover-V2-7B obtains 96%, 84%, and 76% on the same three AM-GM columns at pass@3200 (Table 1, p. 6). The paper reports that on 100 Ineq-Mix problems, every whole-proof model except DeepSeek-Prover-V2-7B solves fewer than 8 under a 128-trial budget, while DeepSeek-Prover-V2-7B solves 22 (Section 3.2, p. 6).

## compositional failure diagnosis
The paper observes large seed-to-variant drops and says, "These failures persist even when the model is scaled up (Section 4.1) or provided with the formal proof of the seed problem in-context (Section 4.2)." (Section 1, contribution 2, p. 3). It also reports that most models default to Lean's `nlinarith` with `sq_nonneg`, rather than directly applying AM-GM, Cauchy-Schwarz, or Jensen (Section 3.2, p. 6). Natural-language reasoning often names the right high-level inequality, but the generated Lean code abandons that plan and uses brute-force algebraic manipulation (Section 3.2, pp. 6–7).

Table 2 (Section 4.1, p. 8) reports pass@32 percentages for DeepSeek-Prover-V2-671B of 88.0% on seeds, 68.33% on Type I, and 70.67% on Type II. Goedel-Prover-V2-32B reaches 90.0%, 68.0%, and 83.0%, respectively. Inference: Scaling improves these models' absolute accuracy but does not remove their seed-to-variant differences under this evaluation.

## in-context and fine-tuning ablations
For in-context learning, each Type I or Type II target is prompted with the complete verified seed proof. At 128 attempts, Qwen2.5-Coder-32B-Instruct reaches 40.0% on Type II AM-GM and 20.0% on Type II Cauchy-Schwarz; DeepSeek-R1-Distill-Qwen-32B with thinking reaches 16.0% on Type I AM-GM (Section 4.2, p. 8). These percentages are pass@128 for the named subsets and models, not single-attempt accuracy.

For fine-tuning, the authors put 25 AM-GM seeds in training and 50 other seeds in a held-out set (Section 4.3, Figure 3, p. 9). The paper gives inconsistent data counts and results. Section 4.3 (p. 9) reports 15k generated problems and says, "We retained approximately 8k compilable outputs and fine-tuned Goedel-Prover-SFT on this data." It reports Type I AM-GM accuracy of 56.0% at a high generation budget. Appendix D.4 (p. 18) instead describes augmenting the 25 AM-GM seeds into 100 problems, generating 5000 composed problems, and querying Qwen2.5-Coder-32B-Instruct with seed proofs in context and a budget of 64 per problem. It states, "We get 4k verified proofs in the end, and the dataset is named Dcomp ." The appendix mixes these proofs with 5k Goedel-Prover-SFT training examples to reduce degradation from fine-tuning on the synthetic data alone. Table 8 (p. 18) reports Type I AM-GM pass@3200 rising from 4.0% to 64.0%, while Type II AM-GM rises from 24.0% to 28.0%; held-out results vary, with some decreases. Inference: The paper does not reconcile the main-text and appendix counts or the 56.0% and 64.0% results.

## what is proved, measured, and trusted
The paper reports verified Lean 4 proofs for all 75 seeds (Section 2.1, p. 4) and manually translated and verified Ineq-Real problems (Section 2.3, p. 5). For Ineq-Mix, it states, "All generated problems are guaranteed to be mathematically valid and formally solvable." (Section 2.2, p. 4). Inference: This construction claim does not establish that a generated formal proof for every target was individually checked. Experiments measure pass@N success and standard deviations in Table 1 (p. 6), plus ablation outcomes. Inference: The capability diagnosis rests on measured accuracy differences and qualitative code inspection, rather than a proof that a model's internal reasoning is or is not compositional.

## techniques for the catalog
- verified seed corpus: curate seed statements and proofs with experienced mathematicians and verify each seed proof in Lean 4
- compositional duplication: duplicate independent inputs and combine postconditions by addition or multiplication with explicit side conditions
- algebraic substitution: apply a typed variable transformation and prove transformed-domain conditions before reusing the seed proof
- rule-based composition: enforce positivity, domain, and feasibility conditions when combining inequalities or transforming their variables and statements
- pass@N evaluation: count a problem solved only when at least one of N generated proofs passes the proof checker
- transfer ablations: compare seed, transformed, in-context, in-distribution, and held-out out-of-distribution settings
