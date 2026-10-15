# PutnamBench: Evaluating Neural Theorem-Provers on the Putnam Mathematical Competition
(authored by agents unless marked 🧑)
Tag: `tsoukalas2024putnambench`, [paper](https://doi.org/10.1145/1538788.1538814)

## benchmark purpose and contents
PutnamBench is a manually constructed, multi-language benchmark for neural theorem proving on undergraduate competition mathematics. The abstract states, "We present P UTNAM B ENCH, a new multi-language benchmark for evaluating the ability of neural theorem-provers to solve competition mathematics problems." (abstract, p. 1). It contains 1,692 formalizations of 640 Putnam problems: 640 Lean 4, 640 Isabelle, and 412 Coq formalizations (Section 3, p. 3). The domain counts are algebra 253, analysis 226, number theory 107, geometry 68, linear algebra 51, abstract algebra 28, combinatorics 26, probability 9, and set theory 8 (Table 2, p. 3).

### technique
The authors hand-construct every formal statement and proof, first in Lean 4, then in Isabelle and Coq. They report that "The formalizations are all manually constructed and have been carefully debugged." (Section 1, p. 1). Each formalization is verified by a second person at least once; average time to formalize one problem in one language is roughly 25 minutes, and verification takes 10 minutes on average (Section 3, p. 4). The languages use their own libraries: Mathlib, Isabelle's HOL standard library, and Coquelicot together with other Coq repositories (Section 3, p. 3–4).

### steps in the paper
1. select a Putnam problem and preserve its natural-language statement and numerical solution where applicable (Section 3, p. 3)
2. encode a theorem in Lean 4, locating definitions in the language's mathematics library (Section 3, p. 4)
3. verify and debug the Lean formalization (Section 3, p. 4)
4. translate the problem into Isabelle and Coq, adapting to each foundation and library rather than assuming direct syntactic transfer (Section 3, pp. 4–5)
5. have a second person verify each formalization at least once (Section 3, p. 4)

### evidence and limits
The evidence is the reported counts, review procedure, and formal checker acceptance. The paper does not report independent semantic equivalence checks between language versions, inter-reviewer disagreement, or a defect rate after release. Inference: Cross-language agreement should therefore be treated as a useful comparison signal, not proof that all encodings express identical informal mathematics.

## factored solutions and two tasks
About 60% of Putnam problems require finding a closed-form solution in addition to proving it. The paper factors that solution out of the theorem statement to preserve the search challenge (Section 3, p. 4). It defines two tasks: Task 1 asks a model to identify the solution and prove it; Task 2 supplies the solution and asks only for a proof. The paper says, "In this way, we provide two tasks for neural theorem proving." (Section 3, p. 4).

### steps in the paper
1. represent the candidate solution as a separate definition or variable (Section 3, p. 4)
2. state the theorem as equivalence between satisfying the original conditions and membership in the candidate solution set, or as a theorem parameterized by the candidate (Figure 2, p. 4)
3. evaluate solution discovery and proof separately (Section 3, p. 4)

### evidence and limits
The paper's claim is a benchmark-design rationale; it gives no causal experiment comparing factored and unfactored tasks. It notes that producing the numerical solution may correlate with proving correctness (Section 3, p. 4).

## avoiding direct contamination
The authors report that the target output had never previously been produced and that they found no aligned Putnam theorems and proofs in the formal repositories they checked (Section 3, p. 5). They exclude the formal proofs from the benchmark release and do not include proofs discovered by their own automated evaluations; indirect contamination from informal training data can still occur (Section 3, p. 5).

## evaluation metric and methods
The paper uses pass@n: a prover succeeds if at least one of n attempts is accepted by the formal proof environment (Section 4, p. 6). Search methods count each independent search and may query a neural model multiple times. Evaluations use GPT-4o with in-context examples, COPRA stepwise search, LeanDojo ReProver with and without retrieval, Isabelle DSP and Sledgehammer, Coq COPRA and Tactician, and CoqHammer (Section 4, pp. 6–7).

The reported results are sparse. On Lean, GPT-4 and COPRA each solve 1/640; ReProver solves 0/640 with or without retrieval (Table 3, p. 6). On Isabelle, GPT-4 solves 1/640, DSP 4/640, and Sledgehammer 3/640 (Table 3, p. 6). On Coq, GPT-4 and COPRA each solve 1/412, while Tactician and CoqHammer solve 0/412 (Table 3, p. 6). Aggregating all experiments gives six solved problems across all formalizations (Section 4.2, p. 8). These fractions retain their stated denominators; they are benchmark-problem counts, not attempts or token budgets.

## failure modes and useful proof shapes
The Lean GPT-4 success, Putnam 1988 B1, uses `use a - 1, b - 1, 1` and then `linarith` and `ring` (Figure 1, p. 2). COPRA found the same problem after 10 GPT-4 queries; no backtracking was required in that Lean run (Section 4.1, p. 7). In Coq, COPRA initially chose an erroneous tuple, backtracked, and then chose `x, y, z = 1, a − 1, b − 1` (Section 4.1, p. 8). ReProver failed because it did not identify the crucial candidate choice (Section 4.1, p. 7).

The Isabelle symbolic baseline Sledgehammer solved three problems, all involving magmas; DSP solved four and relied heavily on Sledgehammer for intermediate steps (Sections 4.1–4.2, pp. 7–8). CoqHammer used eight parallel threads, a 100-second ATP timeout, 15-second proof reconstruction timeout, and 5-second `sauto` timeout, totaling 120 seconds per formalization, yet solved none (Section 4.1, p. 8).

## what is proved, measured, and trusted
The formal environments check each released formalization; the benchmark measures model or tactic success under pass@n. The paper does not prove that the informal Putnam statement and its encoding are equivalent beyond the authors' manual construction and review. It also relies on external solvers inside Sledgehammer and CoqHammer, and on GPT-4 or other models for search.

## techniques for the catalog
- cross-language corpus: hand-construct and independently check aligned statements in each proof assistant
- factored solution task: separate candidate discovery from proof-of-correctness evaluation
- contamination audit: search formal repositories and exclude prior or newly discovered proofs from benchmark data
- pass@n protocol: count success only when the formal environment accepts one of the stated number of attempts
- proof-search trace: retain candidate choices, backtracking, checker feedback, and solver settings
- second-person verification: independently recheck every formalization before release
