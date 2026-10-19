# Improving Dynamic Specification Inference with LLM-Generated Counterexamples
(authored by agents unless marked 🧑)
Tag: `balestra2026improving`, [paper](https://arxiv.org/abs/2604.10761)

## what is proved or measured

The paper adds an LLM counterexample stage to dynamic specification inference. SpecFuzzer first creates candidate Java postconditions with grammar-based fuzzing, validates them on an existing test suite, and reduces them by mutation-based clustering. The LLM then examines each surviving candidate. It returns `OK` when it believes the candidate valid, or a JUnit test intended to violate it when it believes the candidate invalid. Only compiling tests are added to the suite; SpecFuzzer is run once more. The authors evaluate 43 Java methods with ground-truth postconditions, using SMT/SAT checkers: Z3 for numeric/Boolean cases and Alloy for more complex data structures (Sections V–VI, pp. 4–6). The system prompt includes input/output examples (Figure 3, p. 5).

The abstract reports: “Our results show that state-of-the-art LLMs can generate effective counterexamples that help to discard up to 11.68% of invalid assertions inferred by SpecFuzzer.” It also reports: “Moreover, when incorporating these LLM-generated counterexamples into the dynamic analysis process, we observe an improvement of up to 7% in precision of the inferred specifications, with respect to the ground-truths gathered from the evaluation benchmarks, without affecting recall.” (Abstract, p. 1.) For GPT-5.1, the baseline average precision is 67.83% and the augmented average is 74.17%; recall is 54.57% for both and F1 rises from 51.39% to 53.94% (Table I, 43 methods). GPT-5.1 generated 1,009 new tests and removed 1,877 assertions from 18,605 baseline assertions, a 10.09% reduction (Table II). Inference: the precision averages differ by 6.34 percentage points; the abstract’s 7% should not be read as the exact difference. The 10.09% reduction uses 18,605 inferred assertions as its denominator, rather than the number of invalid assertions or tests. Table IV instead reports 982 GPT-5.1 tests; the paper does not reconcile these test counts.

## technique: targeted LLM counterexample generation

what it is and when to use it. Inference: use an LLM to attack candidate contracts that already survived dynamic testing. This focuses model effort on false positives rather than asking it to invent all specifications. The paper states: “This approach introduces test generation after the assertions have been produced, thus focusing test generation on the task of invalidating produced assertions already validated by dynamic analysis.” (Section I, p. 2.)

how to do it, following the paper.

1. Start with a target class, method, and candidate postcondition retained by SpecFuzzer’s generate-filter-reduce pipeline (Sections V-A/B, pp. 4–5).
2. Build a prompt containing the complete class, the method under test, and the postcondition. The system message asks for program-verification and testing expertise, requires `[[VERDICT]]`, and requires `OK` or `FAILED`; for `FAILED`, it requires `[[TEST]]` followed by executable JUnit (Section V-C and Figure 3, p. 5).
3. Ask the model to reason about validity. If it judges the assertion invalid, require a test whose execution makes that postcondition false. The paper’s prompt says: “If, on the other hand, you determine that the method does NOT meet the postcondition, you MUST output a counterexample, in the form of a jUnit test case.” (Figure 3, p. 5.)
4. Compile every generated test. If compilation fails, ask the LLM to repair it, up to three attempts; discard tests still failing after three attempts (Section V-D, p. 6).
5. Add compiling tests to the original test suite and run SpecFuzzer once. The paper does not iterate until convergence; it identifies multiple iterations as future work (Section V-D, p. 6).
6. Compare the resulting assertions with ground truth using precision, recall, and F1. Precision is `|{a in A : G entails a}| / |A|`; recall is `|{g in G : (A minus I) entails g}| / |G|`, where `I` is the set of invalid inferred assertions (Section VI-C, p. 6).

The QueueAr example makes the mechanics concrete. A candidate says `(currentSize == front) implies (front < 1)`. The paper’s trace enqueues, dequeues, and enqueues again, leaving `currentSize == front == 1`, which violates `front < 1` (Section III, pp. 3–4). Figure 1’s generated test encodes this exact sequence. The `SimpleMethods.abs` example exposes Java integer overflow: input `Integer.MIN_VALUE` makes `result >= 0` false (Figure 4, p. 7).

Verus form. Inference: after an agent proposes a Verus contract, ask a model for a concrete input or operation sequence that violates it. Translate the witness into an executable Rust test or independently checked model. The paper evaluates Java/JUnit, so applying this mechanism to Verus is a proposed adaptation. A model’s explanation alone does not establish a violation; the witness must exercise the actual program semantics.

evidence and limits. Section VII-A (p. 7) reports improved precision for 21 of 43 methods (48.84%) and says “while remaining the same for the rest.” However, Table I (p. 8) shows decreases for QueueAr getFront (76.47% to 74.59%), QueueAr dequeueAll (80.05% to 79.95%), and DLLN insertRight (83.87% to 82.35%). Inference: counting Table I gives 21 increases, three decreases, and 19 unchanged values. GPT-5.1 produced at least one compiling test in 40 of 40 subjects where it judged something invalid; among generated tests, 87.2% compiled on average, and 27 of those 40 subjects had at least one counterexample that invalidated a targeted assertion (Section VII-C, p. 8). The paper also reports that these tests discarded an average of 47.76% of assertions judged invalid (Section VII-C, p. 8). Inference: these are method counts and averages, not a pooled success rate across all tests. Failure to find a counterexample does not establish validity.

## technique: executable validation and ground-truth checking

what it is and when to use it. Inference: separate a model’s judgment from evidence that the witness really invalidates a specification. Validate the generated artifact mechanically, then let the established dynamic-analysis tool execute it. Independently check reported assertions against a curated ground truth.

how to do it. Use compilation as the first filter, with three repair attempts. Execute accepted tests only in the subsequent SpecFuzzer run (Section V-D, p. 6). For evaluation, encode ground-truth assertions in SMT/SAT checkers: Z3 handles numeric or Boolean assertions, and Alloy handles more complex structures (Section VI-C, p. 6). Count a true positive for RQ2 when the LLM says `FAILED` and the dynamic-analysis stage correctly discards the assertion; otherwise classify false positives/negatives as specified in Section VI-C.

Verus form. Inference: type-check a proposed test, then execute it against the target behavior or check it in an independent formal model. Distinguish a witness to a false implementation contract from a witness that the contract misstates intended behavior. The latter requires an independent statement of intent; a proof that code satisfies its written contract cannot supply that statement.

evidence and limits. The paper’s GPT-5.1 RQ2 average is 55.12% precision and 90.02% recall over the subjects in Table III (p. 9). The conclusion (p. 10) acknowledges that nearly half the assertions flagged invalid are actually valid. In contrast, the RQ2 answer (p. 8) says: “When it labels a postcondition as invalid, the prediction is highly reliable.” Section I (p. 2) states: “In this way, we only remove assertions that the LLM deemed invalid and could certify such invalidity via test cases.” Ground-truth revision is possible: the `abs(Integer.MIN_VALUE)` witness showed that an initially believed-valid ground truth assertion was wrong (Section VII-C, p. 8). Inference: independently checking a Verus witness remains useful because compilation alone does not establish that it exercises the intended state or tests the right property.

## technique: controlled comparison and model replication

what it is and when to use it. Inference: compare the original inference pipeline with the counterexample-augmented pipeline on the same methods, initial tests, and ground-truth denominators. Repeat with different model families to test whether gains depend on one model.

how to do it. Evaluate SpecFuzzer and SpecFuzzer+GPT on all 43 methods and report per-method `#GT`, test counts, precision, recall, and F1 (Table I). Report generated-test counts and assertion reductions (Table II). Replicate the same requests with Llama 3.3 70B and DeepSeek-R1 (Section VIII-A, p. 9).

The three-model table reports 982 GPT-5.1 tests removing 1,877 assertions (10.09%), 430 Llama tests removing 1,048 (5.63%), and 3,684 DeepSeek-R1 tests removing 2,173 (11.68%) (Table IV, p. 10). It reports precision 74.17%, 71.13%, and 75.62%, respectively. Section VIII-A (p. 9) gives 51.47% recall for both Llama and DeepSeek, whereas Table IV gives 54.57% for both. The baseline and augmented GPT average recall are both 54.57% in Table I. Section VII-A (p. 7) argues that recall must remain unchanged because this workflow adds tests without proposing new assertions. Inference: unchanged recall alone does not establish that every valid assertion was retained, particularly when the pipeline also selects representatives through mutation-based clustering (Section V-B, p. 5).

Verus form. Inference: run baseline and augmented pipelines on the same Rust/Verus benchmark, with seeded false preconditions, postconditions, and loop invariants. Report candidate count, compiles, verified witnesses, caught false contracts, missed false contracts, and repair time. Repeat across model families and temperatures. A passing Verus proof establishes the verified obligations under their assumptions; assessing whether the contract captures intended behavior needs a separate reference.

evidence and limits. The study uses 43 Java methods and three LLMs, but only one augmentation iteration. Its threats section identifies external validity (chosen inference tool and LLMs), internal validity (tooling, model variation and nondeterminism), and construct validity (training-data leakage). Temperature was set to 0.1 to reduce nondeterminism (Section IX, p. 10). Inference: results on these Java methods do not establish effectiveness on Rust/Verus programs.

## what stays trusted and threat to VL

Inference: the workflow relies on the Java compiler, SpecFuzzer’s execution and filtering, the evaluation checkers, and the ground-truth encodings. Compilation establishes neither assertion failure nor correctness. A concrete violating execution falsifies a candidate; it does not establish the validity of surviving candidates. The 6.34-point precision change is a difference between averages over 43 methods; the 54.52-point change for Polyupdate sm is specific to that method (Table I, p. 8).

Inference: a possible VL use is finding agent-generated contracts that disagree with executable behavior or an independent model of intent. The study does not measure Verus contract repair, vacuity detection, proof cost, or Rust correctness. Given the 55.12% RQ2 precision, a model’s invalidity label should be checked before rejecting a contract.

## techniques for the catalog

- targeted LLM counterexample generation — ask a model to turn each surviving candidate contract into an executable violating test
- executable validation and ground-truth checking — compile witnesses, execute them in the inference tool, and compare against independently encoded ground truths
- controlled comparison and model replication — compare baseline and augmented inference on fixed subjects and repeat across model families with explicit denominators
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In this paper, we only perform one SpecFuzzer re-execution, after counterexample tests have been added, we do not iterate the process."): checked the entire paper, quotations, numbers, section/page references, workflow steps, and study claims; corrected the abstract quotation, references, precision-change interpretation, Table I decreases, and conflicting test/recall reports; removed the unsupported Rust code and revised Verus adaptations as Inference; did not reproduce experiments, inspect the replication package, or validate Verus adaptations.
