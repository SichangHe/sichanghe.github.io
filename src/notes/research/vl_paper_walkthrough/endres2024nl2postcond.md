# Can Large Language Models Transform Natural Language Intent into Formal Method Postconditions?
(authored by agents unless marked 🧑)
Tag: `endres2024nl2postcond`, [paper](https://doi.org/10.1145/3660791)

## problem and result

The paper studies `nl2postcond`: prompting a large language model (LLM) to translate natural-language method descriptions into executable postcondition assertions. A postcondition relates input and output state and must hold after successful execution. The paper asks whether such generated assertions formalize intent (RQ1) and catch real bugs (RQ2). It defines two measurable properties, test-set correctness and bug-completeness, then evaluates GPT-3.5, GPT-4, and StarChat on Python EvalPlus, and GPT-4 and StarChat on Java Defects4J.

The authors define the target precisely: “A method postcondition is an assertion that relates the method’s input and output states, and holds true after any successful method execution.” (introduction, p. 2).

The authors report that GPT-4 with the simple prompt and no reference code produced a test-set-correct postcondition for 158/164 EvalPlus problems (96%); this prompt had 0.77 accept@1 and 0.96 accept@10 (Table 1, p. 9). On correct postconditions, GPT-4 reached average bug-completeness scores up to 0.85 over all generated mutants (Table 2, p. 10). On Defects4J's 525 reproducible bugs and 840 modified functions, GPT-4 produced bug-discriminating postconditions for up to 47/525 bugs in one prompt variant, and all models and prompts together distinguished 70 buggy methods from 64 unique bugs, 12.2% of 525 (Table 4 and section 4.2.2, p. 14). These are test-based measurements, not proofs of universal correctness.

## technique: formulate postcondition quality as two metrics

Test-set correctness. Given example `⟨nl, r, T⟩` with natural language `nl`, reference implementation `r`, and test inputs `T`, a candidate assertion `post` is test-set-correct when `eval(post, (i, r(i)))` is true for every `i ∈ T` (section 2.1.1, pp. 4–5). The paper takes this as a pragmatic stand-in for true correctness, “assuming that the test cases in T are sufficiently comprehensive to approximate the space of all legal inputs” (section 2.1.1, p. 5). It defines `accept@k` as the expected value of containing at least one test-set-correct postcondition when sampling subsets of size `k` from `m` generated postconditions, inspired by pass@k (section 2.1.1, p. 5).

Bug-completeness. Correctness alone accepts `true`, so the paper measures discriminative power against a set `CM` of semantically distinct code mutants. The score is the fraction of mutants for which some test input makes the mutant violate the candidate assertion: “bug-completeness-score measures the fraction of distinct code mutants that fail the correct postcondition (via associated distinct buggy input/output tests).” (section 2.1.2, p. 5).

How to apply it.

1. Choose a deterministic reference implementation and test set; treat reference outputs as expected outputs (section 2.1, p. 4).
2. Evaluate each generated assertion on every reference test to classify test-set correctness (section 2.1.1, pp. 4–5).
3. Generate distinct buggy implementations and retain only mutants differing from the reference on at least one test and from each other on at least one test (section 2.1.2, p. 5; section 3.1.4, p. 8).
4. For each correct assertion, count mutants rejected by at least one associated test and divide by `|CM|`; for a set of assertions, take the union of killed mutants (section 2.1.2, p. 5).

Verus form (Inference, not from the paper). A Verus workflow can use `requires`/`ensures` candidates and compile them into executable tests or verifier obligations. Test-set correctness remains empirical unless Verus proves the postcondition for all inputs. Bug-completeness can be implemented as mutation testing over generated Rust variants, recording the denominator and test setting exactly as this paper does.

Evidence and limits. The metrics depend on finite tests and an LLM-generated mutant distribution; the authors state that the mutant set per problem “will never represent a comprehensive set of possible bugs” (section 6, p. 20). Inference: a high score therefore means discriminative power over this mutant set, not complete specification of intent.

## technique: prompt variants for symbolic, side-effect-free assertions

The prompt design goals are that generated postconditions be symbolic (not point-wise tests), directly executable, side-effect free, and as programming-language agnostic as possible (section 2.2, p. 6). Four variants cross two axes: natural language only versus natural language plus reference code, and a base prompt versus a simple prompt that asks for an aspect of the function rather than the whole function (section 2.2, pp. 6–7). The paper observes that with the base prompt, LLMs tend to construct complex postconditions, “often approaching a fully functional implementation of the problem”, which are likely to be incorrect (section 2.2, p. 7; Figure 4, p. 7). Its motivating example shows two GPT-4 postconditions for an ambiguous duplicate-removal docstring: `all(numbers.count(i) == 1 for i in return_list)` matches the intended removal of all copies of duplicated elements, while `len(set(numbers)) == len(set(return_list))` does not (section 1.1.1, p. 2; Figure 1, p. 3).

How to apply it.

1. Supply the natural-language description and, optionally, reference code (section 2.2, pp. 6–7).
2. Tell the model to return a symbolic assertion over input and output, with no side effects and no point-based tests; the Figure 3 caption says that without this wording “the model tended to return point-based tests or code blocks with side effects” (section 2.2, p. 6; Figure 3, p. 6).
3. Choose the simple variant when correctness is the priority; choose base when broader bug-catching power is more important (sections 3.2.1–3.2.2, pp. 9–10).
4. For real projects, include class and type-related context and call-graph methods in the prompt; without file-level context, the authors found LLMs rarely produce meaningful postconditions that compile (section 4.1.3, p. 13). Inference: check that outputs parse and compile before evaluating them; Table 4 reports compile rates separately (p. 14).

Verus form (Inference, not from the paper). The target syntax can be Verus predicates in `ensures`, with ghost sequences/maps for state. The prompt must forbid runtime side effects and proof-only constructs in executable code. For Rust, include ownership and API contracts in the context so the model does not invent inaccessible fields or invalid mutable aliases.

Evidence and limits. On EvalPlus, simple prompts significantly improved correctness (paired t-test `p = 0.008`, Cohen's `d = 1.73`), while including reference code did not significantly change accept@1 (`p = 0.42`) (section 3.2.1, p. 9). Base prompts generally had higher bug-completeness scores than simple prompts, “up to a 30% difference”, so the simple prompt “may generate more correct postconditions at the expense of bug-catching power” (section 3.2.2, p. 10). The authors note that “further prompt tuning may result in different outcomes” (section 2.2, p. 6).

## technique: generate and classify a diverse mutant set

The paper uses GPT-3.5 at temperature 0.9 to generate 200 implementations per EvalPlus problem and keeps those producing a bad output on at least one test (“natural” mutants), then generates 100 additional implementations explicitly instructed to contain an error. It retains only distinct buggy codes, so no two mutants fail the same tests in the same way. The final unique mutant count ranges from 4 to 233 per problem, median 55 (section 3.1.4, p. 8).

How to apply it.

1. Prompt an LLM for many implementations satisfying the natural-language task (section 3.1.4, p. 8).
2. Run each implementation on the reference tests and retain only those producing a bad output on at least one test (section 3.1.4, p. 8).
3. Prompt again for explicitly erroneous implementations to amplify the buggy set (section 3.1.4, p. 8).
4. Deduplicate mutants by their failing behavior so no two retained mutants fail the same tests in the same way (section 3.1.4, p. 8).

Verus form (Inference, not from the paper). Mutate verified Rust implementations or contracts while preserving compilability, then run the test harness and Verus checks. Deduplicate by failing traces or input/output pairs. The method does not prove that the mutant set represents all Rust defects.

Evidence and limits. The authors compare natural against all (natural plus artificial) mutants and find completeness “consistently (though not always substantially) lower when only considering natural bugs”; artificially seeded faults “may artificially inflate the metric” (section 3.2.2, p. 10). Inference: the mutant population used as denominator should accompany every reported percentage.

## technique: benchmark generation and statistical evaluation

For EvalPlus, the authors generate 10 postconditions for each of four prompt variants, each of three models, for 164 problems: 19,680 postconditions total, at temperature 0.7 (section 3.1.3, p. 8). They evaluate GPT-3.5, GPT-4, and StarChat. Their best EvalPlus correctness result is GPT-4 simple/no-reference: 0.77 accept@1, 0.94 accept@5, 0.96 accept@10, and 158/164 problems with at least one correct postcondition (Table 1, p. 9).

For Defects4J, they use the 525 of 835 bugs that are reproducible when Java 8 functional syntax is allowed, covering 840 modified functions, and generate 10 postconditions for each of two models (GPT-4, StarChat), two prompt variants (simple prompt with natural language only, or also with the buggy function body), and each function: 33,600 postconditions (sections 4.1.1 and 4.1.3, pp. 12–13). A postcondition is bug-discriminating if it passes all trigger and regression tests on the fixed version but fails at least one on the buggy version (section 4.1.2, p. 13).

Verus form (Inference, not from the paper). Evaluate generated Verus contracts with separate compile, verifier, and behavioral-test denominators. Report model, temperature, prompt context, and number of candidate assertions; do not combine passing tests with universal proof claims.

Evidence and limits. On Defects4J, GPT-4 with buggy code in context has compile@1 0.73, test-set-correct accept@1 0.39, accept@10 0.75, and 47 distinguishable bugs out of 525; without buggy code it has 0.65, 0.32, 0.66, and 35 bugs (Table 4, p. 14). StarChat's corresponding buggy-code figures are 0.29, 0.12, 0.56, and 24 (Table 4, p. 14); the text of section 4.2.2 says StarChat distinguished “up to 25 bugs” (p. 14), which does not match Table 4. Results are lower than on EvalPlus; the authors hypothesize this is due to “(a) the comments not being completely descriptive, and (b) the increased program and object complexity in Defects4J” (section 4.2.1, p. 14).

## technique: inspect generated postcondition categories

The authors manually label 900 postconditions from 139 EvalPlus problems, all from GPT-4 with the simple prompt and no reference solution: the first two authors jointly labeled 230 postconditions from 23 problems, then the first author labeled 670 more (section 3.2.3, p. 11). Categories are type check, format check, arithmetic bounds, arithmetic equality, container property, element property, forall-element property, implication, and null check (Table 3, p. 11). The authors say these insights “may guide ranking or selection strategies” (section 3.2.3, p. 11). Arithmetic equality has average bug-completeness 0.82/0.89 for natural/all mutants, while type checks have 0.14/0.27 (Table 3, p. 11). The authors did not observe a significant relation between category and correctness (section 3.2.3, p. 12).

How to apply it.

1. Sample generated assertions from representative tasks (section 3.2.3, p. 11).
2. Label their structural property categories and measure prevalence and mutant scores per category (section 3.2.3, pp. 11–12).
3. Inference: use category and score as a selection signal while retaining semantic correctness checks.

Verus form (Inference, not from the paper). Classify Verus predicates by the state they constrain (bounds, collection relation, frame condition, alias-sensitive property) and prioritize predicates that are both proved and discriminative under mutations. Categories are analysis metadata, not proof rules.

Evidence and limits. The taxonomy “is representative of only the programs in the EvalPlusbenchmark and may not generalize across languages or program complexities” (section 6, p. 20). Inference: the natural and all-mutant averages are different populations and should not be conflated.

## technique: bug-discriminating postconditions on real projects

For each Defects4J function, the natural-language specification combines function and class-level in-file comments (primarily the function's JavaDoc), and the prompt adds class and type-related context plus methods in the buggy function's call graph, greedily included until the prompt tokens are exhausted (section 4.1.3, p. 13). They instrument both fixed and buggy versions. Assuming a comprehensive test suite, an assertion that passes the fixed version's trigger and regression tests and fails one on the buggy version is related to the bug fix (section 4.1.2, p. 13). Figure 5 shows GPT-4 generating `rVal.toString().lines().allMatch(line −> line.length() <= width)` for a line-wrapping bug in the Commons CLI project (Cli 8); Figure 2 shows two GPT-4 assertions about reversed line direction catching Math-9 (sections 1.1.2 and 4.2.3, pp. 2–3, 14–15).

Verus form (Inference, not from the paper). The same workflow can instrument Rust functions with candidate `ensures` predicates, run regression and trigger tests on fixed and buggy commits, and then ask Verus to prove the retained predicate. A candidate that catches a test failure is evidence of a useful oracle, not a universal correctness proof.

Evidence and limits. Across prompt variants and models, 64 unique Defects4J bugs were distinguished from 525 considered (12.2%), involving 70 buggy methods (section 4.2.2, p. 14). The paper does not model exceptional postconditions; most TOGA-caught bugs are “exceptional” bugs that nl2postcond fails to find (section 4.3.1, pp. 16–17).

## techniques for the catalog

- test-set correctness — check a candidate postcondition on every reference test and report accept@k over sampled candidates
- mutant bug-completeness — measure the fraction of distinct buggy implementations rejected by a correct postcondition
- prompt-axis design — vary reference-code inclusion and simple versus base assertion scope
- diverse mutant generation — combine natural and explicitly erroneous LLM implementations, deduplicated by failing behavior
- context-aware real-bug instrumentation — generate predicates from comments plus call-graph context and compare fixed versus buggy versions
- qualitative predicate taxonomy — classify generated assertions and compare categories by prevalence and mutant discrimination
- proof-plus-test pipeline (Inference, not from the paper) — treat generated assertions as proposals, then compile, test, verify, and obtain human intent validation
