# PutnamBench: Evaluating Neural Theorem-Provers on the Putnam Mathematical Competition
(authored by agents unless marked 🧑)
Tag: `tsoukalas2024putnambench`, [paper](https://arxiv.org/abs/2407.11214v2)

## benchmark purpose and contents
PutnamBench is a manually constructed, multi-language benchmark for neural theorem proving on undergraduate competition mathematics. The abstract states, "We present P UTNAM B ENCH, a new multi-language benchmark for evaluating the ability of neural theorem-provers to solve competition mathematics problems." (abstract, p. 1). It contains 1,692 formalizations of 640 Putnam problems: 640 Lean 4, 640 Isabelle, and 412 Coq formalizations (Section 3, p. 3). The domain counts are algebra 253, analysis 226, number theory 107, geometry 68, linear algebra 51, abstract algebra 28, combinatorics 26, probability 9, and set theory 8 (Table 2, p. 3).

Inference: For VeruLaw (VL), the benchmark's main contribution is a reproducible, checker-backed task matrix across languages and domains. It is a model-evaluation design, not a formal-verification technique for a running Rust system.

## constructing aligned formalizations
### technique
The authors hand-construct formal statements, first in Lean 4, then in Isabelle and Coq; Coq covers a subset. They report that "The formalizations are all manually constructed and have been carefully debugged." (Section 1, p. 2). These are statements rather than a corpus of completed proofs: "We do not include any of the formal proofs in our benchmark." (Section 3, p. 5). Each formalization is verified by a second person at least once; average time to formalize one problem in one language is roughly 25 minutes, and the paper reports 10 minutes on average for verification (Section 3, p. 4). The languages use their own libraries: Mathlib, Isabelle's HOL standard library, and Coquelicot together with other Coq repositories (Section 3, pp. 3–5).

### steps in the paper
1. select a Putnam problem and preserve its natural-language statement and numerical solution where applicable (Section 3, p. 3)
2. encode a theorem in Lean 4, locating definitions in the language's mathematics library (Section 3, p. 4)
3. formalize in Isabelle, then Coq where supported, adapting to each foundation and library; the paper states, "We first produced formalizations in Lean 4, and then proceeded with our formalization effort in Isabelle and then Coq." (Section 3, p. 4)
4. have a second person verify each formalization at least once: "Each formalization was verified by a second person at least once" (Section 3, p. 4)

### Verus form
Inference: A VL corpus should keep source requirements, Rust/Verus contracts, implementation code, and proof artifacts linked by a stable problem identifier. A second verifier should independently compile the artifact with the stated Verus and solver versions. Inference: Verus does not share Lean's, Isabelle's, or Coq's libraries, so translating a theorem requires adapting definitions and available lemmas; this is a design implication, not a result measured by this paper.

### evidence and limits
The evidence is the reported corpus counts and manual review procedure; the released theorem statements need not have completed proofs. The paper does not report independent semantic equivalence checks between language versions, inter-reviewer disagreement, or a defect rate after release. Inference: Cross-language agreement should therefore be treated as a useful comparison signal, not proof that all encodings express identical informal mathematics.

## factored solutions and two tasks
About 60% of Putnam problems require finding a closed-form solution in addition to proving it. The paper factors that solution out of the theorem statement to preserve the search challenge (Section 3, p. 4). It defines two tasks: Task 1 asks a model to identify the solution and prove it; Task 2 supplies the solution and asks only for a proof. The paper says, "In this way, we provide two tasks for neural theorem proving:" (Section 3, p. 4).

### steps in the paper
1. represent the candidate solution as a separate definition or variable (Section 3, p. 4)
2. state the theorem as equivalence between satisfying the original conditions and membership in the separately defined solution set (Figure 2, p. 4)
3. offer Task 1 (find the solution and prove correctness) and Task 2 (prove a supplied solution correct); the paper does not report a separate comparison of these tasks (Section 3, p. 4)

### Verus form
Inference: For VL, separate synthesis of a candidate implementation or invariant from verification of its contract. Use a Rust value, function, or specification parameter for the candidate, then state `requires` and `ensures` over that candidate. This exposes whether an agent discovered the construction or merely checked a supplied one. Inference: The paper does not prescribe Verus syntax for factoring solutions.

### evidence and limits
The paper's claim is a benchmark-design rationale; it gives no causal experiment comparing factored and unfactored tasks. It notes that producing the numerical solution may correlate with proving correctness (Section 3, p. 4). Inference: VL should report the two tasks separately and avoid interpreting proof-only success as full synthesis success.

## avoiding direct contamination
The authors report that the target output had never previously been produced and that they found no aligned Putnam theorems and proofs in the formal repositories they checked (Section 3, p. 5). They exclude the formal proofs from the benchmark release and do not include proofs discovered by their own automated evaluations; indirect contamination from informal training data can still occur (Section 3, p. 5).

Inference: For VL, keep held-out source programs and contracts private until evaluation, search existing verified repositories for aligned artifacts, and record whether generated examples entered training. This is a contamination-control recommendation inferred from the benchmark design, not a measured VL result.

## evaluation metric and methods
The paper uses pass@n: a prover succeeds if at least one of n attempts is accepted by the formal proof environment (Section 4, p. 6). Search methods count each independent search and may query a neural model multiple times. Evaluations use GPT-4o with in-context examples, COPRA stepwise search, LeanDojo ReProver with and without retrieval, Isabelle DSP and Sledgehammer, Coq COPRA and Tactician, and CoqHammer (Section 4, pp. 6–8). The paper labels its model GPT-4 but specifies, "We use GPT-4o for all our evaluations" (footnote on p. 6).

The reported results are sparse. On Lean, GPT-4 and COPRA each solve 1/640; ReProver solves 0/640 with or without retrieval (Table 3, p. 6). On Isabelle, GPT-4 solves 1/640, DSP 4/640, and Sledgehammer 3/640 (Table 3, p. 6). On Coq, GPT-4 and COPRA each solve 1/412, while Tactician and CoqHammer solve 0/412 (Table 3, p. 6). Across all experiments, six distinct benchmark problems are solved: "Aggregating over all experiments performed in all languages, we find that a total of 6 problems in P UTNAM B ENCH are successfully proven." (Section 4.2, p. 8). These fractions retain their stated denominators; they are benchmark-problem counts, not attempts or token budgets.

Inference: VL should report pass@n with the exact attempt budget, checker version, model temperature, retrieval setting, and denominator. A proof accepted by Verus is the success criterion; natural-language plausibility is not.

## failure modes and useful proof shapes
The Lean GPT-4 success, Putnam 1988 B1, uses `use a - 1, b - 1, 1` and then `linarith` and `ring` (Figure 1, p. 2). COPRA found the same problem after 10 GPT-4 queries; no backtracking was required in that Lean run (Section 4.1, p. 7). In Coq, COPRA initially chose an erroneous tuple, backtracked, and then chose `x, y, z = 1, a − 1, b − 1` (Section 4.1, p. 8). The authors suggest that ReProver's smaller model "may not be as readily capable of such understanding." This is their possible explanation for failing to choose the witnesses, not a demonstrated cause (Section 4.1, p. 7).

Inference: For VL, benchmark traces should retain candidate choices, failed branches, and checker feedback. This distinguishes a search failure from an arithmetic-proof failure and enables targeted repair training.

The Isabelle symbolic baseline Sledgehammer solved three problems, all involving magmas; DSP solved four and relied heavily on Sledgehammer for intermediate steps (Sections 4.1–4.2, pp. 7–8). CoqHammer used eight parallel threads, a 100-second ATP timeout, 15-second proof reconstruction timeout, and 5-second `sauto` timeout, totaling 120 seconds per formalization, yet solved none (Section 4.1, p. 8). Inference: Solver settings and parallelism must be part of VL's result record because cross-system defaults are not comparable.

## what is proved, measured, and trusted
The benchmark measures model or tactic success under pass@n using acceptance by the formal proof environment. The authors define the metric as producing "a successful proof, as determined by the formal proof environment, given a budget of n proof attempts." (Section 4, p. 6). Manual review concerns the formal statements; it does not supply proofs of every theorem. The paper does not prove that the informal Putnam statement and its encoding are equivalent beyond the authors' manual construction and review. It also relies on external solvers inside Sledgehammer and CoqHammer, and on GPT-4 or other models for search.

Inference: VL's trusted base includes Verus, Rust, SMT solvers, verifier configuration, the encoded contract, and benchmark harness. Inference: Agent-written verified Rust threatens a product when the contract omits behavior, the candidate construction is wrong but satisfies a weak specification, trusted or external code is misconfigured, or evaluation data leak. The six distinct solved problems among 640 benchmark problems indicate difficulty for the evaluated methods under their stated budgets; they do not estimate product failure probability.

## what VL should not redo
PutnamBench already establishes multi-language formalization, factored-solution tasks, second-person checking, contamination investigation, pass@n accounting, and per-language baselines. Inference: VL should reuse these controls and focus new work on executable Rust contracts, Verus-specific libraries, and product-relevant threat scenarios. The paper does not provide such a Rust corpus or a Verus translation, so those remain necessary extensions.

## techniques for the catalog
- cross-language corpus: hand-construct statements in Lean 4 and Isabelle, with a subset in Coq, and have a second person check each formalization
- factored solution task: separate candidate discovery from proof-of-correctness evaluation
- contamination audit: search formal repositories for aligned theorems and proofs, and omit formal proofs from the benchmark
- pass@n protocol: count success only when the formal environment accepts one of the stated number of attempts
- Inference: retain proof-search traces and solver settings for VL; the paper illustrates candidate choices, backtracking, and checker feedback, but does not specify a trace-retention protocol
- second-person verification: have another person recheck every formalization at least once
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Another unique benefit is that it includes problems in Lean 4, Isabelle, and Coq, the three most popular formal proof frameworks."): checked quotations, corpus and result counts, page and section references, construction steps, evaluation methods, and inference labels; corrected the paper link, statement-versus-proof distinction, introduction page, proposed-task wording, ReProver causal claim, and distinct-problem denominator; did not rerun experiments, inspect repository artifacts, or validate Verus recommendations.
