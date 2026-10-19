# CombiBench: Benchmarking LLM Capability for Combinatorial Mathematics
(authored by agents unless marked 🧑)
Tag: `liu2025combibench`, [paper](http://arxiv.org/abs/2505.03171v1)

## scope and contribution

CombiBench combines a combinatorics benchmark with Fine-Eval, a protocol for checking proofs and fill-in-the-blank answers. The abstract states: “we introduce CombiBench, a comprehensive benchmark comprising 100 combinatorial problems, each formalized in Lean 4 and paired with its corresponding informal statement.” The paper is arXiv:2505.03171v1, dated 6 May 2025 (p. 1).

The benchmark composition is explicit: “CombiBench consists of 10 easy problems from https://www.hackmath.net/, 42 exercises from Brualdi’s book, 36 IMO problems, and 12 problems from other math competitions” (section 3, p. 4; Table 2). The textbook supplies fourteen chapter topics. The authors write: “we randomly sampled problems from 14 chapters, choosing three problems from each chapter.” They exclude IMO 2004 P3 because its statement contains an image; they retain IMO 2023 P5 because its figure adds no information beyond the text (section 3, p. 5).

The authors identify missing benchmarks, limited combinatorics coverage in Mathlib, and difficulty translating informal problems into formal statements. Their concrete explanation is: “For a specific problem, it is often necessary to add some definitions that are unique to that problem” (section 1, p. 2).

## technique 1: construct a domain benchmark with paired informal and formal statements

What it is. The authors describe CombiBench as “a manually produced benchmark that includes 100 combinatorial mathematics problems of varying difficulty and knowledge levels” (section 3, p. 4). The corpus pairs informal statements with Lean 4 formalizations and distinguishes proof tasks from tasks that also require an answer. The latter are substantial: “In CombiBench, 45% of the problems require first providing a solution to the problem and then proving its correctness” (section 3, p. 5).

How the paper constructs it. (1) Use Brualdi’s fourteen chapters to select textbook exercises. (2) Add easy problems and competition problems, including the 36 retained IMO problems since 2000. (3) Formalize statements and necessary definitions in Lean 4. (4) For answer-generating tasks, place an answer placeholder in an abbreviation and a proof placeholder in the theorem. (5) Name items by source, such as `brualdi_ch8_6`. The paper’s permutation-counting example has `brualdi_ch6_11_solution : ℕ := sorry` and a theorem asserting that the cardinality equals that solution (section 3, pp. 4–5).

Evidence and limits. Formalization required expert work: “Our formalization team consists of five doctoral students and one master’s student, each with over a year of experience in learning Lean” (section 3, p. 5). After excluding blank lines, their count found “more than half of the problems have more than 10 lines of code after formalization, more than a quarter have more than 20 lines, and the most challenging problem reached 67” (section 3, p. 6). This count differs from Figure 1’s comparison, which additionally excludes comments, imports, and opens (pp. 5–6). Appendix A.1 gives the longest statement, an island-and-factory game (pp. 12–13).

When to use it; Verus form.

## technique 2: two-stage Fine-Eval for fill-in-the-blank proofs

What it is. Fine-Eval checks both a proposed answer and its proof. The input is specified precisely: “LLM takes as input an entire formal statement with the proof and the blanks to be filled in replaced by ‘sorry’s, and writes a snippet of complete Lean 4 code” (section 4.1, p. 6). The abstract names Kimina Lean Server as the evaluation backend (p. 1).

How to apply it, stage 1. (1) Supply the complete statement with answer and proof placeholders. (2) Obtain a complete Lean 4 snippet. (3) Remove comments. (4) Reject output containing `sorry`, defining new axioms, or failing compilation. (5) Require every part outside the replaced placeholders to match the input exactly. (6) If the proof passes these checks and its answer exactly matches the reference, count success. The preservation requirement is: “Compared with the input formal statement, except for the replaced ‘sorry’s, the other parts are exactly matched” (section 4.1, p. 6).

How to apply it, stage 2. If exact answer matching fails, construct an equality between the proposed answer and the reference. First try `rfl` and `norm_num`. The paper’s example is:

```lean
example : imo_2006_p2_solution = ground_truth := by
    try rfl
    try norm_num
```

If those tactics fail, add the equality statement to the first-round input and ask the LLM to prove it. Apply the first-phase checks again. The additional length restriction is exact: “The number of characters in the output proof, after removing spaces and newline characters, must not exceed 42” (section 4.1, p. 7). The authors introduce this restriction to prevent a trivial first answer from eliciting the reference answer for a subsequent substantive proof. Figure 2 illustrates the two-stage process with a proposed answer `10 / 20` and reference `1 / 2` (p. 7).

Evidence and limits. Appendix A.2 explains why compilation alone is insufficient: a model hid an incorrect theorem in comments, which “allowed the code to successfully pass Lean server validation checks, leading to it being mistakenly judged as correctly proven” (pp. 13–14). Inference: preservation of the original statement is an essential check because compilation can succeed when the requested theorem has disappeared. The 42-character restriction is an evaluation heuristic; the paper does not prove that it prevents every way of exploiting reference disclosure.

When to use it; Verus form.

## technique 3: simplified one-stage equivalence checking

What it is. The simplified variant keeps the initial code checks, accepts exact answer matches, and otherwise tries only definitional equality: “we directly employ the rfl tactic to verify if the solution generated by the model is definitionally equivalent to the ground truth” (section 4.1, p. 7). It requires no second LLM call.

How to apply it. (1) Generate the completed statement. (2) Enforce the first-stage restrictions and compile it. (3) Accept an exact answer match. (4) Otherwise add an equality assertion and try `rfl`. (5) Accept if that assertion is proved. Figure 3 shows `example : sol = 1 / 2 := by rfl` (p. 7).

Evidence and limits. The authors say this “enables the evaluation of fill-in-the-blank problems using only a single Large Language Model (LLM) call” and “imposes stricter requirements on the model’s predicted answer” (section 4.1, p. 7). Inference: this variant can reject mathematically equivalent answers when `rfl` cannot establish equality. Use it when the simpler integration and one-call budget justify that restriction. A Verus adaptation would require its own equality-checking procedure; the paper establishes no direct translation.

## measured results and trusted components

The reported experiment uses whole-proof generation and budgets of 1, 8, and 16 samples. The authors state: “Considering the economic cost and reproducibility, we do not evaluate with a larger sample budget and tree-search method” (section 4.2, p. 8). For the with-solution comparison, they replace the answer placeholder with the reference and ask the model to complete the proof; a complete two-stage run counts as one verification (section 4.1, p. 8).

Table 3 (p. 8) gives Kimina-Prover Preview’s pass@1, pass@8, and pass@16 entries as “2 6 7” with solution and “1 4 7” without solution. These are scores on the 100-problem benchmark. The surrounding text describes Kimina as “a 72B parameter model fine-tuned specifically for theorem proving” and states that it “has not been specifically trained on datasets pertaining to combinatorics or fill-in-the-blank question types” (section 4.2, p. 8).

Gemini-2.5-pro-preview’s Table 3 entries are “0 2 4” with solution and “0 2 3” without solution. Each other general reasoning model reaches at most 2 at pass@16. Goedel-Prover, STP, and Leanabell-Prover-GD-RL each have six zero entries. The authors report: “In the without_solution case, both evaluation methods mentioned earlier produced identical results” (section 4.2, p. 8). Inference: this observed agreement does not establish that the two methods accept the same answers generally.

Inference: the benchmark statements, reference answers, Lean environment, imported libraries, and harness checks are dependencies of the scores. Compilation checks a formal claim, which may differ from the intended informal problem if its formalization is wrong. The appendices include proofs using `native_decide` (Appendix A.3, p. 16; A.4, p. 17); the study therefore makes no blanket claim that every accepted proof relies solely on ordinary kernel reduction. I did not audit those trust dependencies or execute the generated proofs.

## techniques for the catalog

- paired formal benchmark: retain informal statements, formal specifications, source selection rules, and exclusions; Inference: adapt this structure to Verus tasks
- staged answer verification: check the completed original statement, then prove equality to the reference when answers differ
- strict one-call check: after the initial proof checks, accept an exact match or an equality proved by `rfl`
