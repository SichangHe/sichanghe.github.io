# Improving Dynamic Specification Inference with LLM-Generated Counterexamples
(authored by agents unless marked 🧑)
Tag: `balestra2026improving`, [paper](https://arxiv.org/abs/2604.10761)

## what is proved or measured

The paper adds an LLM counterexample stage to dynamic specification inference. SpecFuzzer first creates candidate Java postconditions with grammar-based fuzzing, validates them on an existing test suite, and reduces them by mutation-based clustering. The LLM then examines each surviving candidate. It returns `OK` when it believes the candidate valid, or a JUnit test intended to violate it when it believes the candidate invalid. Only compiling tests are added to the suite; SpecFuzzer is run once more. The authors evaluate 43 Java methods with ground-truth postconditions, using SMT/SAT checkers (Z3 for numeric/Boolean cases and Alloy for more complex data structures).

The abstract reports: “Our results show that state-of-the-art LLMs can generate effective counterexamples that help to discard up to 11.68% of invalid assertions inferred by SpecFuzzer.” It also reports “an improvement of up to 7% in precision of the inferred specifications, without affecting recall.” For GPT-5.1, the baseline average precision is 67.83% and the augmented average is 74.17%; recall is 54.57% for both and F1 rises from 51.39% to 53.94% (Table I, 43 methods). GPT-5.1 generated 1,009 new tests and removed 1,877 assertions from 18,605 baseline assertions, a 10.09% reduction (Table II). The denominator for that reduction is 18,605 inferred assertions, not the 1,009 tests.

## technique: targeted LLM counterexample generation

what it is and when to use it. Use an LLM to attack candidate contracts that already survived dynamic testing. This focuses model effort on false positives rather than asking it to invent all specifications. The paper states: “This approach introduces test generation after the assertions have been produced, thus focusing test generation on the task of invalidating produced assertions already validated by dynamic analysis.” (Section I, p. 1.)

how to do it, following the paper.

1. Start with a target class, method, and candidate postcondition retained by SpecFuzzer’s generate-filter-reduce pipeline (Section V-A/B, pp. 4–5).
2. Build a prompt containing the complete class, the method under test, and the postcondition. The system message asks for program-verification and testing expertise, requires `[[VERDICT]]`, and requires `OK` or `FAILED`; for `FAILED`, it requires `[[TEST]]` followed by executable JUnit (Section V-C, pp. 5–6).
3. Ask the model to reason about validity. If it judges the assertion invalid, require a test whose execution makes that postcondition false. The paper’s prompt says: “If, on the other hand, you determine that the method does NOT meet the postcondition, you MUST output a counterexample, in the form of a jUnit test case.” (Figure 3, p. 5.)
4. Compile every generated test. If compilation fails, ask the LLM to repair it, up to three attempts; discard tests still failing after three attempts (Section V-D, p. 6).
5. Add compiling tests to the original test suite and run SpecFuzzer once. The paper does not iterate until convergence; it identifies multiple iterations as future work (Section V-D, p. 6).
6. Compare the resulting assertions with ground truth using precision, recall, and F1. Precision is `|{a in A : G entails a}| / |A|`; recall is `|{g in G : (A minus I) entails g}| / |G|`, where `I` is the set of invalid inferred assertions (Section V-D, pp. 6–7).

The QueueAr example makes the mechanics concrete. A candidate says `(currentSize == front) implies (front < 1)`. The paper’s trace enqueues, dequeues, and enqueues again, leaving `currentSize == front == 1`, which violates `front < 1` (Section III, pp. 3–4). Figure 1’s generated test encodes this exact sequence. The `SimpleMethods.abs` example exposes Java integer overflow: input `Integer.MIN_VALUE` makes `result >= 0` false (Figure 4, p. 8).

Verus form. Inference: use the same stage after an agent proposes a Verus `ensures` clause or loop `invariant`. Provide the Rust function, its specification, and relevant state-model definitions to a model. Require either `OK` or a concrete Rust harness that reaches a state violating the postcondition. Compile the harness, then run Verus on the original function plus the harness or use an executable model to validate the witness. A candidate shape is:

```rust
fn push(v: &mut Vec<int>, x: int)
    ensures v@.last() == Some(x),
{
    v.push(x);
}
```

Inference: the harness must be checked against the actual executable semantics; a model-generated text explanation is not evidence. `old(...)` in a contract refers to the pre-state, and `invariant` belongs on a loop; neither should be replaced by an invented function call. A counterexample should cause a contract repair or rejection, not an automatic weakening of the implementation.

evidence and limits. GPT-5.1 improved precision in 21 of 43 methods (48.84%) and left it unchanged in the other 22 (Table I, p. 8). It produced at least one compiling test in 40 of 40 subjects where it judged something invalid; among generated tests, 87.2% compiled on average, and 27 of those 40 subjects had at least one counterexample that invalidated a targeted assertion (Section VII-C, p. 9). These are denominated by methods and generated tests, respectively. The process does not prove candidate validity when no counterexample is found: the LLM may miss a violating input and dynamic tests remain incomplete.

## technique: executable validation and ground-truth checking

what it is and when to use it. Separate a model’s judgment from evidence that the witness really invalidates a specification. Validate the generated artifact mechanically, then let the established dynamic-analysis tool execute it. Independently check reported assertions against a curated ground truth.

how to do it. Use compilation as the first filter, with three repair attempts. Execute accepted tests only in the subsequent SpecFuzzer run (Section V-D, p. 6). For evaluation, encode ground-truth assertions in SMT/SAT checkers: Z3 handles numeric or Boolean assertions, and Alloy handles more complex structures (Section VI-A, pp. 6–7). Count a true positive for RQ2 when the LLM says `FAILED` and the dynamic-analysis stage correctly discards the assertion; otherwise classify false positives/negatives as specified in Section VI-C.

Verus form. Inference: compile or type-check a generated harness, run Verus to ensure the target function still verifies under its declared contract, and execute the harness to establish a concrete violating trace. For stronger ground truth, encode the intended contract independently in a spec function or a small reference model and prove equivalence or implication with Verus lemmas. Keep the model outside the candidate contract so a circularly strengthened specification cannot become its own oracle.

evidence and limits. The paper’s GPT-5.1 RQ2 average is 55.12% precision and 90.02% recall over the subjects in Table III (p. 9): a high fraction of invalid assertions are identified, but almost half of assertions labeled invalid are actually valid. This is why only executable witnesses are allowed to remove candidates in the main workflow. Ground-truth revision is possible: the `abs(Integer.MIN_VALUE)` witness showed that an initially believed-valid ground truth assertion was wrong (Section VII-C, p. 9). Inference: independent reference models and reviewer inspection remain necessary for Verus because a compilable harness can still fail to exercise the intended state or can encode the wrong assertion.

## technique: controlled comparison and model replication

what it is and when to use it. Compare the original inference pipeline with the counterexample-augmented pipeline on the same methods, initial tests, and ground-truth denominators. Repeat with different model families to test whether gains depend on one model.

how to do it. Evaluate SpecFuzzer and SpecFuzzer+GPT on all 43 methods and report per-method `#GT`, test counts, precision, recall, and F1 (Table I). Report generated-test counts and assertion reductions (Table II). Replicate the same requests with Llama 3.3 70B and DeepSeek-R1 (Section VIII-A, p. 10).

The three-model table reports 982 GPT-5.1 tests removing 1,877 assertions (10.09%), 430 Llama tests removing 1,048 (5.63%), and 3,684 DeepSeek-R1 tests removing 2,173 (11.68%) (Table IV, p. 10). It reports precision 74.17%, 71.13%, and 75.62%, respectively. The prose says Llama recall is 51.47%, while Table IV prints 54.57%; this internal contradiction must be preserved rather than silently resolved. The baseline and augmented GPT recall are both 54.57% in Table I, because adding tests can only discard candidates and the workflow does not generate new valid assertions.

Verus form. Inference: run baseline and augmented pipelines on the same Rust/Verus benchmark, with seeded false preconditions, postconditions, and loop invariants. Report candidate count, compiles, verified witnesses, caught false contracts, missed false contracts, and repair time. Repeat across model families and temperatures. Do not use a passing Verus proof as the denominator for specification correctness; it only shows that the written contract is satisfiable by the code.

evidence and limits. The study uses 43 Java methods and three LLMs, but only one augmentation iteration. Its threats section identifies external validity (chosen SpecFuzzer and subjects), internal validity (model variation and nondeterminism), and construct validity (training-data leakage). Temperature was set to 0.1 to reduce nondeterminism (Section IX, p. 10). Inference: production VL code has different semantics, unsafe boundaries, dependencies, and environmental assumptions, so these results quantify a useful filtering mechanism rather than formal verification of Rust.

## what stays trusted and threat to VL

The Java compiler, SpecFuzzer’s dynamic semantics, Z3 and Alloy, the curated ground truth, LLM output parsing, and the implementation of the target programs remain trusted or assumed. A test that compiles but is never executed until the later SpecFuzzer run is not yet evidence that an assertion fails. A test that executes and removes a candidate shows a concrete bug in that candidate, but it does not show that all remaining candidates are valid. The reported 7-point precision improvement is an average over 43 methods; the 54.52% maximum is method-specific, and the paper does not provide a single universal gain.

Inference: the direct VL threat is agent-generated Verus contracts that pass proofs but are too strong, vacuous, or simply wrong about intended behavior. Targeted counterexample generation can cheaply falsify many such contracts before expensive proof repair. It cannot establish validity when no witness is found, and the RQ2 precision of 55.12% shows that an LLM’s invalidity label alone is unsafe. VL should retain executable witnesses, independent models, and denominator-aware reports.

## techniques for the catalog

- targeted LLM counterexample generation — ask a model to turn each surviving candidate contract into an executable violating test
- executable validation and ground-truth checking — compile witnesses, execute them in the inference tool, and compare against independently encoded ground truths
- controlled comparison and model replication — compare baseline and augmented inference on fixed subjects and repeat across model families with explicit denominators
Checked 2026-10-15 against paper balestra2026improving: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
