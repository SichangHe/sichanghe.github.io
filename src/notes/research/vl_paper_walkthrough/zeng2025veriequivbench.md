# VeriEquivBench: An Equivalence Score for Ground-Truth-Free Evaluation of Formally Verifiable Code
(authored by agents unless marked 🧑)
Tag: `zeng2025veriequivbench`, [paper](https://arxiv.org/abs/2510.06296)
## scope and result

The paper presents an end-to-end Dafny benchmark and evaluator for generated code plus generated specifications. Its central technique is a bidirectional equivalence score: ordinary verification checks that code satisfies the specification, while a constructed checker asks whether every behavior allowed by the specification is the code's behavior. The paper states, “Together, these two directions of implication establish mutual equivalence, ensuring both the soundness and completeness of the solution.” (Fig. 1, p. 2). A second, model-based natural-language check translates the specification back to prose so a user or judge can compare it with the original request.

The released benchmark has 2,389 formally annotated algorithmic problems: 2,174 converted LeetCode cases and 215 retained TagComp synthetic cases (Sec. 2, pp. 3–5). Table 3 reports average cyclomatic complexity of 5.38 for LeetCode, 5.63 for TagComp, and 2.44 for MBPP-50 (p. 7). Section 4.1 uses MBPP-50 as a comparison to DafnySynthesis. The benchmark includes strong auto-formalized specifications that do not pass verification and weaker, incomplete specifications accompanying verifiable code (Sec. 2, p. 3).

## technique 1: bidirectional equivalence score

what it is

A one-way proof can accept a weak postcondition. The paper's binary-search example uses `ensures -1 <= idx < a.Length`; an implementation that never searches can satisfy that condition. The score therefore checks both implications. Direction one submits annotated code to Dafny, proving implementation implies the specification. Direction two creates a method in which an arbitrary result is assumed to satisfy all preconditions and postconditions, then asserts equality between that result and the implementation's output. This tests whether the specification permits results different from the implementation's output. Inference: Failure to prove equality alone does not establish a semantic defect; the paper also reports unresolved checks and timeouts (App. G.4, pp. 37, 39).

The paper's concrete maximum example has `ensures max >= a`, although the code returns `Max(a,b)`. It constructs `Check_Max_Spec`, assigns an arbitrary `max`, assumes the stated contract, computes `value := Max(a,b)`, and asserts `value == max` (Fig. 3, p. 6). Inference: For example, with `a = 0`, `b = 1`, and arbitrary `max = 0`, the assumption holds but the equality fails. This underspecified contract receives no equivalence score. The paper explains, “Our equivalence score then tests the assertion that variables described by the specifications are equal to the method outputs.” (Sec. 3, p. 6).

when and how to apply it

1. Generate or receive executable code and a formal contract
   - Direction-one verification is the paper's existing annotated-program check (Sec. 3, p. 6)
2. Define a checker with the same inputs and arbitrary outputs
   - Assume the original preconditions and every generated postcondition for those outputs (Fig. 3, p. 6)
3. Call the implementation on the same inputs and assert equality of its output and the arbitrary result
   - Figure 3 compares `value` and `max` (p. 6); the paper separately reports array specification issues in Figure 4 (p. 8)
4. Require Dafny to prove the assertion to award the equivalence score (Sec. 3, p. 6)
5. Separately translate the formal specification to natural language and judge it against the original query
   - This catches a formally coherent but user-misaligned contract (Sec. 3, p. 6; App. C.3–C.4, pp. 21–22)

Verus form

Inference: A Rust/Verus adaptation would need to check both that the implementation satisfies its contract and that the contract uniquely determines the modeled result and relevant state changes. The paper implements the checker in Dafny and does not establish how to implement that reverse check in Verus.

evidence and limits

On 50 expert-written DafnySynthesis examples, the authors report 14 failures under their score and successfully fixed eight (Sec. 4.2, p. 8). Across prior benchmarks, equivalence rates are 76.22% for DafnySynthesis, 61.29% for CloverBench, and 43.09% for DafnyBench (Table 4, p. 8). These denominators are the respective benchmark datasets; the paper does not state their item counts in the table. The score is relative to the formal verifier and model: it proves code-contract correspondence, not that the contract matches a human's unstated intent. The paper explicitly adds the natural-language translation step for that reason.

## technique 2: automatic specification and code pipeline

The pipeline makes large data without hand-writing every contract. For each LeetCode description, Claude-4-sonnet generates an initial Dafny specification. The authors resubmit up to ten times until parsing and resolution errors disappear, supply two simple examples to improve in-context learning, and restrict specifications to first-order logic so they do not encode an implementation (Sec. 2.1, p. 4). A Grok4 model rewrites the description to mirror the specification; Claude-4 judges equivalence of the original and rewrite. The specification is also translated to Python and run against the LeetCode unit tests (Sec. 2.1, p. 4).

For code generation, Claude-4 receives the query, generated specifications, and a reference Python solution. Claude-3.5 polishes the result for up to six rounds to remove syntax errors (Sec. 2.2, p. 5). The reported conversion counts are 2,584 LeetCode specifications with 90.1% syntax success and 2,174 Dafny programs at 75.8%; TagComp has 296 specifications at 98.7% and 215 Dafny programs at 71.7% (Table 2, p. 5). Inference: These percentages correspond to denominators of 2,869 original LeetCode problems (2,641 training and 228 test) and 300 retained TagComp Python problems (Sec. 2, p. 3).

Verus form

Inference: A Verus pipeline could similarly generate declarative contracts, repair them using verifier diagnostics for a bounded number of rounds, and test the executable implementation. This is an adaptation; the paper does not evaluate Verus.

## technique 3: scalable tag-composition data synthesis

The authors build a controlled vocabulary of over 500 tags in three categories: domain, data structure, and algorithm (Sec. 2.3, p. 5; App. A, pp. 14–18). They randomly choose 12 tags from each category, ask an LLM to select a coherent 3–8-tag subset, then ask it to generate a new problem, tests, and Python solution. Approximately 1,900 candidates are generated; only 300 passing at least 85% of their tests are retained as TagComp, and 215 also clear the weak-baseline formal pipeline (Sec. 2.3, p. 5; App. B, p. 19). The paper says, “We retain only those instances where the generated Python code passes all tests, ultimately yielding a dataset of 300 validated programs.” (App. B, p. 19). Section 2.3 instead says, “but only retain the 300 that pass at least 85%of their tests” (p. 5); Figure 7 also labels the threshold 85% (p. 19). Inference: These passages conflict on the filtering threshold.

## what is proved, measured, and trusted

In successful equivalence checks, the Dafny verifier proves the two logical directions for the supplied contracts; unit-test pass rates measure transformed behavior on finite tests; LLM judges measure natural-language similarity. The introduction reports, “The best-performing model, Claude-4-sonnet, which solves 75.81% of the problems on CloverBench, fails on all instances in our dataset, even under the pass@4 evaluation metric.” (p. 3). Section 4.3 identifies the evaluated synthetic set as TagComp (p. 8). GPT has the highest mutual-equivalence rate, 2.65%, but the authors report that these solutions often simplify the implementation and fail to satisfy user requirements (Sec. 4.3, p. 9). The RL baselines score 17.68% on refinement and 54% on specification generation on the 200-example validation set; the split also contains 1,770 training and 204 out-of-domain test examples. The 54% measures improvement over the weak baseline using the spec superior score, rather than complete equivalence (Sec. 4.4, pp. 9–10).

Inference: The evaluation relies on Dafny, its solver, the generated checker, the Python/LeetCode tests, and LLM translations or judgments. The paper reports 81.79% of 648 successfully executed Python-to-Dafny files passing all tests, from 1,011 attempted files (Sec. 4.1, p. 7); the 648 denominator excludes 297 syntax errors, 62 verification errors, and four timeouts (App. G.1, Table 12, p. 36). Inference: A Verus product inherits analogous trust in the verifier, solver, compiler, erasure, test harness, and the correctness of the user-facing intent translation.

## techniques for the catalog

- bidirectional equivalence score — prove code implies the contract and a constructed reverse checker proves the contract implies the code
- staged autoformalization — generate first-order contracts, repair syntax in bounded rounds, then verify code and tests
- tag-composition synthesis — combine domain, data-structure, and algorithm tags and filter generated tasks by executable and formal checks
- specification-to-language audit — translate a formal contract to natural language and compare it with the user's query
