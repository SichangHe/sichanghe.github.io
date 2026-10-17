# Can Large Language Models Write Good Property-Based Tests?
(authored by agents unless marked 🧑)
Tag: `vikram2023property`, [paper](https://arxiv.org/abs/2307.04346)

## purpose and scope

Vikram et al. study Proptest-AI, a prompt-only method for generating Python Hypothesis property-based tests (PBTs) from API documentation (Section 3, p. 4). They compare single-stage and two-stage prompts on 40 Python library API methods from 10 libraries, using three models (GPT-4, Claude-3-Opus, Gemini-1.5-Pro), and evaluate validity, soundness, and property coverage with mutation testing (Abstract, p. 1; Section 4.1, p. 6). This is automated testing, not exhaustive proof: the paper defines PBT as checking generated inputs and says, “Although PBT cannot prove the absence of property violations” (Section 2.1, p. 3).

## technique 1: property-based test construction

The paper defines the target as: “given a function/method under test f, an input space X, and a property P, we want to validate that ∀x ∈ X : P(x, f(x))” (Section 2.1, p. 3).

What it is. Given function f, input space X, and property P, define a generator `gen` producing x∈X and a parametrized test T returning `P(x,f(x))`; run T on many generated inputs (Section 2.1, p. 3).

The paper's Hypothesis example tests Python `sorted`: `st.lists(elements=st.integers(), min_size=1)` generates nonempty integer lists, and assertions check adjacent sorted elements are nondecreasing (Figure 3, p. 3). It presents two forms: a separate generator plus `@given`, and a combined `@given(data())` function that draws dependent arguments sequentially (Section 2.1, p. 3).

How to apply it.
1. Identify the API's input space and choose Hypothesis strategies for each argument (Section 2.1, p. 3).
2. Write a parametrized test that calls the API and asserts each desired property (Section 2.1, p. 3).
3. Decorate the test with `@given` to generate many cases (Section 2.1, p. 3).
4. Include generators in the test when later arguments depend on earlier values (Section 2.1, p. 3).

Verus form. Inference: translate a property P into a `requires`/`ensures` contract and prove it for all inputs rather than sample generated inputs. Inference: use a Rust generator only for testing executable behavior; it cannot replace a universal Verus proof. Inference: dependent generators correspond to constructing values satisfying preconditions before calling the verified function.

## technique 2: single-stage and two-stage prompting

The authors state: “We propose a PBT evaluation methodology and metrics focusing on (1) the validity of the tests, (2) the soundness of the tests, and (3) the property coverage” (Section 3.2, p. 4).

What it is. Both prompt templates contain system-level instructions (the LLM is an expert Python programmer), the API documentation, user-level task instructions, and a desired output format (Section 3.1, p. 4). The single-stage “PBT Prompt” begins with Chain of Thought instructions to outline a generation strategy and a list of properties, then synthesize one Hypothesis test; its output format includes Hypothesis and API imports, a function-signature boilerplate, and an example Hypothesis PBT from the Hypothesis documentation (Section 3.1, p. 4). The two-stage method first asks the LLM to extract up to five properties, then continues the conversation and asks for one test function per property (Section 3.1, p. 4; Figure 4, p. 4).

How to apply it.
1. Insert the target API documentation into a fixed prompt template (Section 3.1, p. 4).
2. For single-stage generation, request a strategy, a property list, and a complete Hypothesis test, with imports, signature boilerplate, and an example test in the output format (Section 3.1, p. 4).
3. For two-stage generation, request a property list (at most five), then generate a separate test for each extracted property (Section 3.1, p. 4).
4. Run each test function 1,000 times and check non-assertion errors for validity and assertion errors for soundness; only valid and sound tests are used for the mutation measurement (Section 4.2, p. 7; Section 4.4, p. 8).

Evidence. For GPT-4, 54.57% of two-stage test functions were valid and 41.74% were valid and sound (306 of 733); single-stage GPT-4 gave 45.75% valid and 25.47% valid and sound (54 of 212) (Table 2, p. 7). Across all models and approaches, two-stage had higher validity than single-stage for every model (Section 4.2, p. 7). The paper attributes this “likely” to smaller test functions that test one property each; this is the authors' explanation, not a tested result. Setup: five samples per approach at temperature 0.7, 1,200 samples in total, 16 of which had no Python or were syntactically invalid (Section 4.1, p. 6).

Verus form. Inference: use the two-stage split to ask an agent for candidate `requires`/`ensures` clauses first, then generate proof functions and lemmas; human or checker review must decide whether extracted properties match the specification. Inference: chain-of-thought text is not evidence and should not enter the trusted proof base.

## technique 3: validity metric

What it is. A test is valid when 100% of test function invocations avoid run-time errors other than property assertion errors, which are evaluated under soundness (Section 3.2.1, pp. 4–5). The paper's invalid example generates `datetime.timedelta` arguments from non-negative integers with no upper bound, and the constructor raises `OverflowError` when the absolute magnitude of days exceeds 1,000,000 (Figure 5, p. 5).

How to apply it.
1. Call each generated test function 1,000 times (Section 4.2, p. 7).
2. Record any non-assertion exception as a validity failure (Section 3.2.1, p. 5).

The paper says it proposes “mitigation strategies for each of the inaccuracies” (Section 3.2, p. 4), but the text I read does not describe a repair procedure for invalid generators.

Verus form. Inference: turn generator constraints into preconditions and prove that each generated value satisfies them; bounding generator ranges (for example days) corresponds to a precondition on the constructor. Inference: runtime exception filtering is not needed for a total verified function, but panic freedom must be part of the contract where applicable.

## technique 4: soundness metric and manual alignment

What it is. A test is unsound when there exists an input/output pair that violates a property assertion but is valid given the specification (Section 3.2.2, p. 5). The paper defines a test as sound “if 100% of test function invocations do not result in assertion errors from the property checks”, filtering out executions with other runtime errors (Section 3.2.2, p. 5). Its `numpy.cumsum` example unconditionally asserts that output and input shapes match, although the documentation gives “the same shape as a if axis is not None or a is a 1-d array”; the input `array([[0]])` has shape (1, 1) and the output has shape (1,) (Figure 6 and Section 3.2.2, p. 5).

Given an assertion failure, the paper assumes that an unsound LLM-generated property is more likely than a bug in the API implementation, and writes: “This is a weak assumption” (Section 3.2.2, p. 5). It supports this with manual labeling (Section 5.2, p. 9).

How to apply it.
1. Read the API documentation for the method under test (Section 4.3, p. 7).
2. Run the property test 1,000 times and compute the fraction without assertion failures (Section 4.2, p. 7).
3. Manually label a sample of assertions as sound or unsound and compare with the execution metric (Section 4.3, pp. 7–8). In the paper, half of all valid samples were selected, evenly distributed over libraries, and raters labeled the first five assertions of each (Section 4.3, p. 7).

Evidence. Of 219 manually labeled assertions, 173 (79%) were sound; model-specific rates ranged from 74% to 83% (Table 3 and Section 4.3, p. 7). Cohen's kappa was 0.862 ± 0.133 (Section 4.3, p. 8). Comparing sample-level human labels with the execution metric, the paper reports “a precision of 100% and recall of 97.14%”, with one false negative caused by an unsound assertion that was not executed with an edge-case input in the 1,000 invocations (Section 4.3, p. 8). The paper does not state how many samples these two rates are computed over.

Verus form. Inference: soundness corresponds to proving that every assertion follows from the API contract; encode it as a lemma with `ensures`, and use counterexamples only to discover missing preconditions. Inference: a sampled assertion failure is evidence of a specification mismatch, not proof that the implementation is wrong.

## technique 5: property mutation coverage

What it is. Mutation testing measures whether a test detects injected violations. A property mutant f' of f is defined as f'(x) = mut(f(x)): it keeps the API signature, calls the original method, and mutates the output to violate one property (Section 3.2.3, p. 6). In the evaluation, GPT-4 extracts five properties per API method and generates five property mutants per property, giving 200 properties; mutants with runtime errors are filtered out (Section 4.4, p. 8; Table 4 caption, p. 8). Mutation score is the percentage of killed property mutants of a method; a property is covered if a PBT kills any of its mutants (Section 3.2.3, p. 6).

How to apply it.
1. Prompt an LLM to extract the properties from the API documentation, then to generate property mutants for each property (Section 3.2.3, p. 6).
2. Implement a mutant that violates one property, such as reversing `numpy.cumsum` output to make it decreasing (Figure 7, p. 5).
3. If the PBT is sound, run it with the call substituted by the mutant; the mutant is killed if the property assertions fail (Section 3.2.3, p. 6).
4. Report the average percent of mutants killed over all samples (Section 4.4, p. 8).

Evidence. Table 4 reports mutation scores from 43.57% to 79.78% across model/prompt combinations, with 89–480 executed mutants per cell (Table 4, p. 8). GPT-4 two-stage scored 51.88% over 480 executed mutants, while GPT-4 single-stage scored 79.78% over 89 mutants (Table 4, p. 8). Property coverage, counted over five samples per property, was 20.5% for GPT-4 two-stage, the highest in Table 5; single-stage GPT-4 reached 7% (Table 5, p. 9). Mutation score and property coverage are different metrics with different denominators.

Verus form. Inference: mutation testing can evaluate whether a generated Verus lemma suite detects deliberately weakened implementations, but a killed mutant does not establish completeness. Inference: use mutation score as a regression metric alongside verifier success.

## results, trust, and failure

GPT-4 with two-stage prompting generated a valid and sound test function in 2.4 samples on average (Section 4.2, p. 7), and its average soundness over valid test functions was 87% (Figure 10, p. 9). The study identifies hallucinated properties and missed edge cases as the soundness failures it observed (Section 4.3, p. 8). The authors list threats to validity in Section 5 (p. 9), including that the results may not generalize beyond Python and Hypothesis, and that equivalent mutants remain possible. Inference: trusted elements include API documentation, Hypothesis execution, random generation, and human labels. No formal proof of generated tests is provided.

What VL should reuse. Inference: reuse the validity/soundness/coverage decomposition, two-stage property extraction, bounded-domain generator design, and mutation-based regression. VL should not treat a passing property test as a universal contract; Verus must discharge the contract over all permitted states.

Threat to a product of agent-written verified Rust. Inference: medium threat. Property generation can improve specification discovery and test quality, but unsound inferred properties can encode the wrong behavior; requiring Verus proofs against reviewed specifications turns this from an assurance claim into a candidate-generation aid.

## techniques for the catalog

- generator-plus-property PBT: generate structured inputs and assert API properties over many runs
- two-stage property prompting: extract documented properties first, then generate one test per property
- validity screening: detect runtime errors and constrain generators to valid API domains
- soundness screening: measure assertion failures and compare them with human specification labels
- property mutation coverage: inject documented-property violations and count killed mutants
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We compared these labels to the labels resulting from our soundness metric and found that our metric has a precision of 100% and recall of 97.14%."): read the whole paper text and checked every quotation, number, table and figure reference, technique step, and section and page number (printed pages equal PDF pages) against it; changed the link to the arXiv page (the paper's DOI is a placeholder), corrected page references (most were off by one or more), fixed the Section 3.2.2 and 4.2 attributions, removed an unsupported claim about generator repair and a wrong "best samples" wording for Table 4, added model, library and setup counts, and marked the trusted-elements sentence as inference; I did not check the cited prior work, the figure images beyond their captions and visible code, or the Verus-form inferences, which are my own and not in the paper.
