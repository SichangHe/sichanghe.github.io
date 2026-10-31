# Enhancing Large Language Models in Coding Through Multi-Perspective Self-Consistency
(authored by agents unless marked 🧑)
Tag: `huang2023enhancing`, [paper](https://arxiv.org/abs/2309.17272)

## core method

Huang et al. propose Multi-Perspective Self-Consistency (MPSC) for selecting generated programs. One model produces solutions, formal-style specifications, and test cases; the outputs become vertices in a three-partite graph. Edges measure agreement between perspectives, while within-perspective similarity supplies confidence. The abstract says, “MPSC significantly boosts performance of foundation models (ChatGPT in this paper) on various benchmarks, including HumanEval (+15.91%), MBPP (+6.43%) and CodeContests (+9.37%).” (Abstract, PDF p. 1).

Inference: MPSC is a ranking and consistency signal, not a proof system. In Verus, it could prioritize candidate Rust implementations and contracts before invoking the verifier.

## technique 1: generate three perspectives

The prompt asks for (a) executable solution code, (b) preconditions and postconditions, and (c) input-output tests. The paper defines the roles: “Solutions implement the desired functionality, specifications demonstrate the intended properties in formal language, while test cases outline the expected behavior for some specific inputs.” (Section 1, PDF p. 2).

Steps:
1. Give the natural-language task to the LLM.
2. Sample many solutions, specifications, and test cases.
3. Treat each output as a vertex in its perspective set.
4. Connect vertices from different sets and score their agreement (Sections 2.1–2.3).

Their median example uses a solution that sorts a list, a specification with type preconditions and a median postcondition, and a concrete assertion. Specifications are restricted to same-language functions with preconditions and postconditions so the framework is language-agnostic (Section 2.1).

Verus form: Inference: ask for Rust plus `requires` and `ensures`, and separately ask for proof-oriented test predicates. Replace executable assertions with Verus specifications; do not call `proof fn` at runtime. The model's Python-style checks do not become Verus proofs automatically.

Limits: The paper's own quality audit finds generated verification properties poorer than solutions (Section 3.3). A specification can therefore reinforce a shared mistake.

## technique 2: inter-consistency edges

For each solution/specification/test pair, compute deterministic agreement. Table 1 (PDF p. 4) defines the solution–specification edge as E_x[1(pre(x) → post(x, g(x)))], the expected value over inputs of whether the solution's output satisfies the postcondition whenever the precondition holds. The solution–test edge is 1 if g(x_j) = y_j, and the specification–test edge is 1 if the precondition and the postcondition both hold on the test pair. Any other vertex pair gets weight 0 (Section 2.3). Appendix B Listing 2 implements the solution–specification edge as the fraction of generated inputs on which the postcondition passes. The authors say, “we can quantify the alignments with a code interpreter in a deterministic manner” (Section 2.3, PDF p. 3).

Steps: run each solution on the test inputs and on generated inputs; evaluate the specification predicates; set edge weights from Table 1; form the weighted graph Laplacian (the experiments use the symmetric normalized form, footnote 3); penalize score differences across high-weight edges.

The optimization term is L_inter = Σ W_ij (f_i − f_j)^2 = f^T L f, with L = D − W (Eq. 1). Inference: the Verus analogue is to compile candidates and run the verifier; use proof success or counterexample agreement as edge evidence. Unlike the paper's interpreter, Verus may return unknown or require lemmas, so an unproved candidate cannot be treated as false without policy.

## technique 3: intra-consistency

Within one perspective, lexical Bayes-risk similarity and semantic structural equivalence estimate confidence. The paper states, “Intra-consistency is in fact an estimate of the LLM’s uncertainty” (Section 2.4, PDF p. 4). Lexical scores sum BLEU between a vertex and the other outputs in its perspective (Bayes-risk view with a uniform hypothesis distribution). Semantic scores group vertices that have identical weighted connections to the same third-party vertices (structural equivalence classes) and multiply the class size by the sizes of the neighbor sets in the other two perspectives. The score function f is pulled toward φ by the loss L_intra = 1/2 ||f − φ||^2 (Eq. 2); f is not a trained network but the solution of the optimization in Section 2.5.

Steps: cluster or compare outputs in each perspective; normalize similarity to φ; combine it with inter-consistency; use the resulting score to rank solutions. MPSC-Uniform sets φ to a constant and removes this signal, while MPSC-Lexical and MPSC-Semantic use the lexical and structural signals (Sections 2.4, 3.1). MPSC-Label instead uses the public example test cases in the docstrings as silver labels, so φ = C · 1[v is a label] (Section 3.1).

Verus form: Inference: cluster candidate proofs by normalized syntax or shared verified behaviors, but treat similarity as triage only. Two candidates can share an incorrect contract.

## technique 4: iterative graph optimization and reranking

The final objective is “min {α · Linter + (1 − α) · Lintra}” (Equation 3, Section 2.5, PDF p. 5). The authors solve it with the iterative algorithm of Zhou et al. (2003b) (Appendix A, Algorithm 1): start from f = φ, then repeat f ← α T f + (1 − α) φ with T = D^(-1/2) W D^(-1/2) until the change is below a threshold. Appendix A shows this converges to the closed-form solution (1 − α)(I − αT)^(-1) φ. The weight α is set to 0.01 when the mean edge weight is below 0.16 (sparse graph) and 0.95 otherwise (Appendix E). Rank the solution vertices by f and return the top candidate.

Evidence: With GPT-3.5-Turbo generating 200 solutions, 50 specifications, and 100 tests per task, MPSC-Label reaches Pass@1 84.29 on HumanEval versus 68.38 for GPT-3.5-Turbo, a +15.91 percentage-point change (Table 2, PDF p. 6). MPSC-Semantic reaches 73.23 on MBPP versus 66.80 (+6.43), and MPSC-Label reaches 11.94 on CodeContests versus 2.57 (+9.37). MPSC-Label on HumanEval, HumanEval+ and CodeContests uses the public example tests in the docstring as silver labels; MBPP has no such tests, so no MPSC-Label result is reported there (Table 2, footnote 5). Without labels, MPSC-Semantic gets 83.38 on HumanEval (+15.00). The paper reports Pass@k, an estimator of the chance at least one of k samples passes unit tests; for the selection methods it uses its own variant that tests the top-k scored solutions and takes an expected value over ties (Appendix C). Scores are benchmark-level percentages, not proof rates. A binned analysis finds “a positive correlation between the number of edges and the overall performance of our framework” (Section 3.3).

Ablation Table 4 (PDF p. 7, MPSC-Semantic Pass@1) gives full MPSC 83.38 HumanEval, 73.54 HumanEval+, 73.23 MBPP, 10.09 CodeContests; without specifications 82.32, 73.52, 70.18 and 9.17; without test cases 78.30, 68.49, 72.00 and 8.71; without both 68.38, 58.75, 66.80 and 2.57. The paper says “test cases contribute more to the improvements than specifications” and attributes this to test cases being easier to generate accurately (Section 3.3). Inference: Table 4 does not support this on MBPP, where removing specifications (70.18) hurts more than removing test cases (72.00), and Table 5 gives MBPP test cases 34.64% accuracy versus 53.70% for specifications.

## what is proved and trusted

The paper gives no theorem that graph agreement implies correctness; its proofs (Appendix A) only cover convergence of the iterative algorithm to the closed-form minimizer. The method trusts the interpreter, sampled tests, generated specifications, BLEU/structural proxies, and the benchmark's unit tests. Its central assumption is stated as “An underlying assumption is that a pair of outputs exhibiting consistency are either both correct or both incorrect.” (Section 2.3, PDF p. 4). The paper's own audit shows the generated specifications and tests are individually weaker than the solutions (Table 5, Section 3.3), so the edges can carry shared errors.

## techniques for the catalog
- three-perspective generation — sample solutions, formal-style specifications, and tests for one intent
- inter-consistency graph — weight cross-perspective edges by executable agreement
- intra-consistency confidence — estimate output reliability from lexical or structural similarity
- Laplacian reranking — optimize combined graph and confidence losses to choose a candidate
