# VeriEquivBench: An Equivalence Score for Ground-Truth-Free Evaluation of Formally Verifiable Code
(authored by agents unless marked 🧑)
Tag: `zeng2025veriequivbench`, [paper](https://arxiv.org/abs/2510.06296)
## scope and result

The paper presents an end-to-end Dafny benchmark and evaluator for generated code plus generated specifications. Its central technique is a bidirectional equivalence score: ordinary verification checks that code satisfies the specification, while a constructed checker asks whether every behavior allowed by the specification is the code's behavior. The paper states, “Together, these two directions of implication establish mutual equivalence, ensuring both the soundness and completeness of the solution.” (Fig. 1, p. 2). A second, model-based natural-language check translates the specification back to prose so a user or judge can compare it with the original request.

The released benchmark has 2,389 formally annotated algorithmic problems: 2,174 converted LeetCode cases and 215 retained TagComp synthetic cases (Sec. 2, pp. 3–5). The paper reports that the benchmark's average cyclomatic complexity is 5.38 for LeetCode and 5.63 for TagComp, compared with 2.44 for MBPP-50/DafnySynthesis (Table 3, p. 7). These are dataset statistics, not guarantees that every generated artifact is correct.

## technique 1: bidirectional equivalence score

what it is

A one-way proof can accept a weak postcondition. The paper's binary-search example uses `ensures -1 <= idx < a.Length`; an implementation that never searches can satisfy that condition. The score therefore checks both implications. Direction one submits annotated code to Dafny, proving implementation implies the specification. Direction two creates a method in which an arbitrary result is assumed to satisfy all preconditions and postconditions, then asserts equality between that result and the implementation's output. If the specification permits extra behavior, Dafny finds a counterexample.

The paper's concrete maximum example has `ensures max >= a`, although the code returns `Max(a,b)`. It constructs `Check_Max_Spec`, assigns an arbitrary `max`, assumes the stated contract, computes `value := Max(a,b)`, and asserts `value == max` (Fig. 3, p. 6). The assertion is false when `max` is below `b`, so the underspecified contract receives no equivalence score. The paper explains, “Our equivalence score then tests the assertion that variables described by the specifications are equal to the method outputs.” (Sec. 3, p. 6).

when and how to apply it

1. Generate or receive executable code and a formal contract
   - Direction-one verification is the paper's existing annotated-program check (Sec. 3, p. 6)
2. Define a checker with the same inputs and arbitrary outputs
   - Assume the original preconditions and every generated postcondition for those outputs (Fig. 3, p. 6)
3. Call the implementation on the same inputs and assert equality of each specified result and relevant mutated state
   - The paper's example compares `value` and `max`; array properties must include length and unchanged elements (Fig. 4, p. 8)
4. Require Dafny to prove the assertion
   - Failure exposes a specification that is too weak, ambiguous, or mismatched; success proves equivalence relative to Dafny's model
5. Separately translate the formal specification to natural language and judge it against the original query
   - This catches a formally coherent but user-misaligned contract (Sec. 3, p. 6; App. C.3–C.4, pp. 21–22)

Verus form

Inference: In Verus, executable Rust should carry `requires` and `ensures` contracts, and a `proof fn` can encode the reverse implication over a specification-level result. A checker can introduce a `spec` result satisfying the contract, call the executable function in a proof context where its result is modeled, and prove equality with `assert`. Mutable arrays or slices require explicit postconditions for length and element preservation; Verus does not infer Dafny syntax such as `old(a)` automatically, so use the Verus `old(...)` expression inside `ensures` where the supported form requires it. The reverse checker is an inference because this paper implements it in Dafny, not Verus.

evidence and limits

On 50 expert-written DafnySynthesis examples, the authors report 14 failures under their score and successfully fixed eight (Sec. 4.2, p. 8). Across prior benchmarks, equivalence rates are 76.22% for DafnySynthesis, 61.29% for CloverBench, and 43.09% for DafnyBench (Table 4, p. 8). These denominators are the respective benchmark datasets; the paper does not state their item counts in the table. The score is relative to the formal verifier and model: it proves code-contract correspondence, not that the contract matches a human's unstated intent. The paper explicitly adds the natural-language translation step for that reason.

## technique 2: automatic specification and code pipeline

The pipeline makes large data without hand-writing every contract. For each LeetCode description, Claude-4-sonnet generates an initial Dafny specification. The authors resubmit up to ten times until parsing and resolution errors disappear, supply two simple examples to improve in-context learning, and restrict specifications to first-order logic so they do not encode an implementation (Sec. 2.1, p. 4). A Grok4 model rewrites the description to mirror the specification; Claude-4 judges equivalence of the original and rewrite. The specification is also translated to Python and run against the LeetCode unit tests (Sec. 2.1, p. 4).

For code generation, Claude-4 receives the query, generated specifications, and a reference Python solution. Claude-3.5 polishes the result for up to six rounds to remove syntax errors (Sec. 2.2, p. 5). The reported conversion counts are 2,584 LeetCode specifications with 90.1% syntax success and 2,174 Dafny programs at 75.8%; TagComp has 296 specifications at 98.7% and 215 Dafny programs at 71.7% (Table 2, p. 5). The denominator for each percentage is the number in that row's dataset stage.

Verus form

Inference: A Verus harness can use staged generation: ask an LLM for Rust contracts, run `verus`, feed diagnostics back for bounded repair, then run executable tests on erased code. Verus contracts should remain declarative; implementation-specific ghost definitions should be rejected if the benchmark seeks behavior specifications. This adapts the paper's staged process but changes the language, compiler, and solver.

## technique 3: scalable tag-composition data synthesis

The authors build a controlled vocabulary of over 500 tags in three categories: domain, data structure, and algorithm (Sec. 2.3, p. 5; App. A, pp. 14–18). They randomly choose 12 tags from each category, ask an LLM to select a coherent 3–8-tag subset, then ask it to generate a new problem, tests, and Python solution. Approximately 1,900 candidates are generated; only 300 passing at least 85% of their tests are retained as TagComp, and 215 also clear the weak-baseline formal pipeline (Sec. 2.3, p. 5; App. B, p. 19). The paper says, “We retain only those instances where the generated Python code passes all tests, ultimately yielding a dataset of 300 validated programs.” (App. B, p. 19). The apparent difference between “at least 85%” in Sec. 2.3 and “passes all tests” in App. B is an internal inconsistency; the denominators and filtering criteria should be reported separately rather than silently combined.

Inference: VL could compose Rust/Verus tasks from tags such as ownership, concurrency, protocol, and data structure, then require both executable tests and verifier success. Tag composition controls coverage, while the equivalence score guards against vacuous contracts.

## what is proved, measured, and trusted

The Dafny verifier proves the two logical directions for the supplied contracts; unit-test pass rates measure transformed behavior on finite tests; LLM judges measure natural-language similarity. The strongest reported end-to-end result is a warning: Claude-4-sonnet's 75.81% CloverBench result falls to zero on the paper's dataset under pass@4, while the best mutual-equivalence rate is 2.65% and may exploit simplified implementations (Sec. 4.3, p. 9). The RL baselines score 17.68% on refinement and 54% on specification generation on the validation split of 1,770 training, 200 validation, and 204 out-of-domain test examples (Sec. 4.4, p. 9).

Trusted elements include Dafny, its solver, the generated checker, the Python/LeetCode tests, and LLM translations or judgments. The paper reports 81.79% of 648 successfully executed Python-to-Dafny files passing all tests, from 1,011 attempted files (Sec. 4.1, p. 7); the 648 denominator is the subset whose format could be executed. Inference: A Verus product inherits analogous trust in the verifier, solver, compiler, erasure, test harness, and the correctness of the user-facing intent translation.

## prior work VL should not redo and product threat

The paper already supplies ground-truth-free contract completeness checking, a large tag-generated benchmark, and staged syntax repair. Rebuilding a one-way “code satisfies contract” metric or another simple LeetCode-only corpus would duplicate these contributions. Inference: The threat to agent-written verified Rust is high for specification gaming: a Rust function can satisfy a weak `ensures` clause while violating user intent, exactly as the paper's binary-search example does. The bidirectional checker and natural-language review are directly reusable defenses, but the paper does not establish that LLM translation judges are reliable for Rust systems semantics or concurrency.

## techniques for the catalog

- bidirectional equivalence score — prove code implies the contract and a constructed reverse checker proves the contract implies the code
- staged autoformalization — generate first-order contracts, repair syntax in bounded rounds, then verify code and tests
- tag-composition synthesis — combine domain, data-structure, and algorithm tags and filter generated tasks by executable and formal checks
- specification-to-language audit — translate a formal contract to natural language and compare it with the user's query
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
