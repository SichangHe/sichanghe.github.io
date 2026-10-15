# Enhancing Large Language Models in Coding Through Multi-Perspective Self-Consistency
(authored by agents unless marked 🧑)
Tag: `huang2023enhancing`, [paper](https://arxiv.org/abs/2309.17272)

## core method

Huang et al. propose Multi-Perspective Self-Consistency (MPSC) for selecting generated programs. One model produces solutions, formal-style specifications, and test cases; the outputs become vertices in a three-partite graph. Edges measure agreement between perspectives, while within-perspective similarity supplies confidence. The abstract says, “MPSC significantly boosts performance of foundation models (ChatGPT in this paper) on various benchmarks, including HumanEval (+15.91%), MBPP (+6.43%) and CodeContests (+9.37%).” (Abstract, PDF p. 1).

Inference: MPSC is a ranking and consistency signal, not a proof system. In Verus, it could prioritize candidate Rust implementations and contracts before invoking the verifier.

## technique 1: generate three perspectives

The prompt asks for (a) executable solution code, (b) preconditions and postconditions, and (c) input-output tests. The paper defines the roles: “Solutions implement the desired functionality, specifications demonstrate the intended properties in formal language, while test cases outline the expected behavior for some specific inputs.” (Section 2, PDF p. 2).

Steps:
1. Give the natural-language task to the LLM.
2. Sample many solutions, specifications, and test cases.
3. Treat each output as a vertex in its perspective set.
4. Connect vertices from different sets and score their agreement (Sections 2.1–2.3).

Their median example uses a solution that sorts a list, a specification with type preconditions and a median postcondition, and a concrete assertion. Specifications are restricted to same-language functions with preconditions and postconditions so the framework is language-agnostic (Section 2.1).

Verus form: Inference: ask for Rust plus `requires` and `ensures`, and separately ask for proof-oriented test predicates. Replace executable assertions with Verus specifications; do not call `proof fn` at runtime. The model's Python-style checks do not become Verus proofs automatically.

Limits: The paper's own quality audit finds generated verification properties poorer than solutions (Section 3.3). A specification can therefore reinforce a shared mistake.

## technique 2: inter-consistency edges

For each solution/specification/test pair, compute deterministic agreement. Table 1 defines solution–spec edges by the fraction of inputs satisfying the specification whose output matches the solution, solution–test edges by exact output equality, and specification–test edges by precondition and postcondition satisfaction (Section 2.3, PDF p. 3). The authors emphasize, “we can quantify the alignments with a code interpreter in a deterministic manner.” (Section 2.3, PDF p. 3).

Steps: execute each candidate on sampled inputs; evaluate specification predicates; set edge weights from Table 1; form the weighted graph Laplacian; penalize score differences across high-weight edges.

The optimization term is (L_{inter}=Σ W_{ij}(f_i-f_j)^2), with (L=D-W). Inference: the Verus analogue is to compile candidates and run the verifier; use proof success or counterexample agreement as edge evidence. Unlike the paper's interpreter, Verus may return unknown or require lemmas, so an unproved candidate cannot be treated as false without policy.

## technique 3: intra-consistency

Within one perspective, lexical Bayes-risk similarity and semantic structural equivalence estimate confidence. The paper states, “Intra-consistency is in fact an estimate of the LLM’s uncertainty” (Section 2.4, PDF p. 4). Lexical scores use BLEU among same-perspective outputs; semantic scores group vertices with identical weighted connections to other perspectives. The score function is trained by minimizing (L_{intra}=1/2||f-φ||^2).

Steps: cluster or compare outputs in each perspective; normalize similarity to φ; combine it with inter-consistency; use the resulting score to rank solutions. MPSC-Uniform removes this signal, while MPSC-Lexical and MPSC-Semantic retain lexical or structural signals (Section 3.1).

Verus form: Inference: cluster candidate proofs by normalized syntax or shared verified behaviors, but treat similarity as triage only. Two candidates can share an incorrect contract.

## technique 4: iterative graph optimization and reranking

The final objective is “min {α · Linter + (1 − α) · Lintra}” (Equation 3, Section 2.5, PDF p. 4). The authors solve it with an iterative propagation algorithm from Zhou et al.; each iteration updates scores using the normalized adjacency matrix and a base vector. Rank solution vertices and return the top candidate.

Evidence: With GPT-3.5-Turbo generating 200 solutions, 50 specifications, and 100 tests per task, MPSC-Label reaches Pass@1 84.29 on HumanEval versus 68.38 for GPT-3.5-Turbo, a +15.91 percentage-point change (Table 2, PDF p. 6; HumanEval test denominator is the benchmark's 164 problems). MPSC-Semantic reaches 73.23 on MBPP versus 66.80 (+6.43), and MPSC-Label reaches 11.94 on CodeContests versus 2.57 (+9.37). The paper reports Pass@k, an estimator of the chance at least one of k samples passes unit tests; scores are benchmark-level percentages, not proof rates.

Ablation Table 4 reports Pass@1 with specifications removed at 82.32 HumanEval, 73.52 HumanEval+, 70.18 MBPP, and 9.17 CodeContests; adding specifications and tests improves these numbers. The paper also reports that tests contribute more than specifications, attributing this to tests being easier to generate (Section 3.3).

## what is proved and trusted

No formal theorem proves that graph agreement implies correctness. The method trusts the interpreter, sampled tests, generated specifications, BLEU/structural proxies, and the benchmark's unit tests. Its central assumption is that consistent outputs are likely jointly correct; the authors explicitly note that consistent outputs may instead be jointly wrong (Section 2.3).

Inference: threat to agent-written verified Rust is medium-high if MPSC is used as an acceptance gate, and moderate if used only for candidate ordering. Verus verification closes the gap only after the selected code and contract compile and prove. What VL should not redo: generic multi-perspective sampling, graph ranking, and the reported benchmark comparisons. Inference: VL's novel work should connect this ranking to proof diagnostics and specification review.

## techniques for the catalog
- three-perspective generation — sample solutions, formal-style specifications, and tests for one intent
- inter-consistency graph — weight cross-perspective edges by executable agreement
- intra-consistency confidence — estimate output reliability from lexical or structural similarity
- Laplacian reranking — optimize combined graph and confidence losses to choose a candidate
Checked 2026-10-15 against paper huang2023enhancing: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
