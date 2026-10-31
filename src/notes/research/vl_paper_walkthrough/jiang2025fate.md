# FATE: A Formal Benchmark Series for Frontier Algebra of Multiple Difficulty Levels
(authored by agents unless marked 🧑)
Tag: `jiang2025fate`, [paper](https://arxiv.org/abs/2511.02872v4)

## what FATE provides

Jiang et al. introduce FATE-H and FATE-X and expand the existing FATE-M, forming a graded Lean benchmark series in abstract and commutative algebra. FATE-M is textbook-level; FATE-H targets honors or graduate exams; FATE-X targets PhD qualifying exams or beyond. FATE-H and FATE-X each contain 100 problems, while FATE-M was expanded from 141 to 150. The paper's central finding is that current theorem-proving models collapse on the harder formalization tasks: the best reported model reaches 3% pass@64 on FATE-H and 0% on FATE-X (Abstract and Table 1, pp. 1, 6).

This is a benchmark and diagnostic methodology rather than a new prover.

## technique 1: progressive benchmark curation

what it is: construct difficulty-controlled formal tasks from expert-selected algebra problems, then formalize and review them in Lean (Section 3.1, pp. 4–5). FATE-H and FATE-X begin with 400 natural-language candidates, 200 per difficulty category; 100 from each category are formalized.

when to use it: Inference: use this workflow when a benchmark must test abstraction and research-level structure instead of only contest tricks or library recall.

how to do it:

1. collect problems from textbooks, public qualifying exams, research papers, and the Stacks Project; classify 200 candidates each as H or X (Section 3.1, p. 4)
2. have experienced Mathlib contributors formalize 100 per category in Lean (Section 3.1, p. 5)
3. have two mathematically and Lean-qualified reviewers check and correct every formalization, with external Lean-community assistance (Section 3.1, p. 5)
4. enforce one `sorry` in the final theorem’s proof, self-contained Mathlib dependencies, comments containing the natural-language statements, and fixed universe levels (Section 3.2, p. 6)
5. validate difficulty with case studies, human solving, and professor assessment rather than a single model score (Section 3.2, p. 5)

The paper reports human accuracy of 73% on FATE-H and 21% on FATE-X for PhD students or postdocs given five non-overlapping natural-language problems in 2.5 hours. Seven of ten algebra professors rated the problems appropriate for or harder than qualifying exams (Section 3.2, p. 5). The 73% and 21% are natural-language solving accuracies; seven of ten counts expert opinions.

evidence and limits: 38% of FATE-X problems require new definitions, averaging 2.4 definitions in that subset (Section 3.2, p. 5). The new definitions are supplied before the problem statement. The authors expect models to derive supporting lemmas and, when needed, formulate further definitions. Their formalization standard states: “each Lean file has only one sorry after the final theorem” (Section 3.2, p. 6). Difficulty ratings remain expert judgments; no objective complexity metric is proved. Inference: a Verus benchmark should similarly separate textbook data-structure contracts from tasks requiring new predicates or state-machine abstractions, and should independently review every Rust/Verus specification.

## technique 2: verifier-backed pass@k evaluation

what it is: generate complete Lean proofs repeatedly, check their statements, and verify candidates that pass those checks with the Lean kernel. `pass@64` counts a problem as solved when at least one valid proof appears among 64 independent attempts, with a 64k-token limit.

when to use it: Inference: use when stochastic whole-proof generation is the system under test and a binary kernel decision is needed. Keep `k`, token limit, and benchmark denominator explicit.

how to do it:

1. present each formal theorem statement and prompt to generate a whole proof (Section 4.1, p. 6)
2. generate 64 independent attempts per problem; parallelize verification through the Lean REPL (Section 4.1, p. 6)
3. remove comments, extract Lean components, and standardize imports to `import Mathlib`; reject `axiom`, `opaque`, `unsafe`, or `unsound`, missing or reordered original definitions/instances/lemmas, and a changed theorem statement (Section F.1.2, p. 34)
4. compile the complete candidate, including helper lemmas, and reject `sorry` or compilation errors; use a 300-second timeout and Mathlib 4.13.0/4.16.0/4.19.0 for M/H/X respectively (Sections 4.1 and F.1.2, pp. 6, 34)
5. record whether each problem has a valid proof among its 64 attempts, then average over the 100-problem H and X sets

The paper states: “Every proof is rigorously checked by the Lean kernel to confirm it contains no sorry or compilation errors.” (Section 4.1, p. 6). Table 1 reports, with the denominator of 100 problems for each H and X set, best H accuracy 3.0% (3/100) and X accuracy 0.0% (0/100). FATE-M rates use its 150-problem denominator; for example, DeepSeek-Prover-V2-671B is 62.7% (Table 1, p. 6).

evidence and limits: all models receive up to 64 attempts, so pass@64 is not a single-sample probability. It measures existence among attempts, not proof length, cost, or reliability under a fixed verifier-call budget.

## technique 3: two-stage natural-language/formal diagnosis

what it is: evaluate the model's intermediate natural-language proof separately from its final Lean code. Experts judge natural-language pass@1; the kernel measures formal pass@64. This compares mathematical reasoning with translation and implementation under different sampling budgets.

how to do it:

1. capture the model's natural-language reasoning and formal output under the original whole-proof prompt (Section 4.3.1, p. 7)
2. have algebra PhDs or postdocs first understand the reference proof, then assess only the natural-language argument; reconstruct the final proof using relevant arguments throughout the output (Section F.2, pp. 35–36)
3. attribute natural-language failures to Gap, Hallucination, Reasoning Problem, or No Progression; these categories can overlap (Sections 4.3.1 and C.3, pp. 7, 23–25)
4. independently run all formal candidates through Lean and compute pass@64
5. compare the two rates and test prompt variants that remove or reorder the formalization requirement (Section 4.3.2, pp. 7, 23)

Table 2 uses 100-problem denominators for both FATE-H and FATE-X. DeepSeek-R1 has 71.0% NL pass@1 and 0.0% FL pass@64 on H, and 33.0% NL versus 0.0% FL on X. DeepSeek-Prover-V2 has 39.0% NL versus 3.0% FL on H and 9.0% versus 0.0% on X (Table 2, p. 7). The authors conclude: “Rather, the critical challenge lies in the translation and implementation of a correct natural language proof into an absolutely precise formal language.” (Section 4.3.3, p. 8).

evidence and limits: the manual NL labels are expert judgments and pass@1, whereas formal rates are automated pass@64; comparing them is diagnostic, not a like-for-like accuracy estimate. Prompt ablation on DeepSeek-R1/FATE-X gives 33% baseline, 43% pure math, 39% math output, and 32% math-before-Lean (Table 7, p. 23).

## technique 4: formalization error taxonomy and counting

what it is: manually classify mathematically correct but formally incorrect attempts into Mathlib hallucinations, Lean proficiency issues, general capability issues, and misalignment with preceding reasoning.

how to do it:

1. select outputs whose natural-language proof was judged correct but whose Lean proof failed
2. inspect each failed formalization and count distinct errors by category (Section 4.4, p. 8)
3. use the number of outputs with a correct intermediate natural-language proof as the denominator, not all benchmark problems (Table 3, p. 8)
4. report category counts and examples; use them to target retrieval, type guidance, or prompting

The paper defines Mathlib hallucinations as follows: “Errors in this category involve the generation of non-existent or incorrectly used Lean theorems or definitions;” (Section 4.4, p. 8). Table 3's denominators are 39 mathematically correct intermediate proofs for DeepSeek-Prover-V2 and 71 for DeepSeek-R1 on FATE-H: Mathlib hallucination occurs in 35/39 and 70/71; Lean proficiency in 36/39 and 70/71; general capability (non-header) in 19/39 and 18/71; misalignment in 3/39 and 0/71. Header errors are unavailable for DeepSeek-Prover-V2 because its output lacks headers. Categories can overlap, so percentages need not sum to 100%.

evidence and limits: the analysis identifies library retrieval and accurate type information as plausible interventions, but does not test a retrieval system. The FATE-X case study examined DeepSeek-R1 alone and reports that it seldom generated lemmas about the supplied definitions’ general mathematical properties (Section D.2, p. 28). Inference: for Verus, analogous categories should include wrong `requires`/`ensures`, unsupported syntax, missing ownership facts, and specification/code mismatch; each category should retain the candidate and exact verifier diagnostic.

## techniques for the catalog

- progressive expert curation — collect, formalize, review, and difficulty-label advanced algebra problems in a graded series
- kernel-backed pass@k — count a problem solved only when one of k independent full proofs passes the trusted kernel
- two-stage diagnosis — compare expert natural-language correctness with automated formal proof correctness
- formalization error taxonomy — count library hallucination, prover proficiency, general capability, and reasoning-alignment failures with their true denominators
