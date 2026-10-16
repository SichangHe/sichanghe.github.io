# Leveraging Automated Unit Tests for Unsupervised Code Translation
(authored by agents unless marked 🧑)
Tag: `roziere2021leveraging`, [paper](https://www.semanticscholar.org/paper/1aed58bd07026492194672adec494dc37c894a28)

## scope and contribution

The paper introduces TransCoder-ST, which uses generated tests to reject bad pseudo-translations before self-training. Its central claim is: "To address this issue, we propose to leverage an automated unit-testing system to filter out invalid translations, thereby creating a fully tested parallel corpus." (Abstract, PDF p. 1). The method targets unsupervised Java, Python, and C++ translation where back-translation creates noisy pairs.

Inference: For VeruLaw, the direct lesson is to make Verus compilation and proof checking a data filter. A generated Rust function, specification, or proof fragment becomes training data only when the relevant checker accepts it. Unit tests are weaker than a deductive proof, so they can supplement but cannot replace Verus verification.

## technique 1: generate tests with evolutionary search and select by mutation score

The authors use EvoSuite on isolated Java functions. They describe tests as "lists of inputs and asserts testing the semantics of a program (e.g., the output of the function, the side effects on its arguments such as sorting the input list)." (Section 3.1, PDF p. 5). EvoSuite evolves candidate inputs with crossover and mutation, scores them for coverage or mutation score, and wraps the final inputs into test cases (Section 3.1, PDF p. 5).

The selection procedure is:

1. select Java functions that compile and run in isolation (Section 3.1, PDF p. 5)
2. run EvoSuite's evolutionary search; candidate inputs are repeatedly crossed over and mutated and retained by a fitness function (Section 3.1, PDF p. 5)
3. generate mutants by applying syntactic mutation operators to the original program (Section 3.1 and Appendix A.2, PDF pp. 5, 15)
4. execute the generated test suite on each mutant and mark a mutant killed when a test result differs from the original (Section 3.1, PDF p. 5)
5. compute mutation score as the ratio of killed mutants and retain only suites with score greater than 90% (Section 3.1, PDF p. 5)

The paper cautions that one generated test can be insufficient: its clamp example tests only one input even though the function has several branches (Figure 3, PDF p. 5). In the dataset, the authors additionally require at least two asserts (Section 4.1, PDF p. 7).

Inference: A Verus adaptation can generate concrete tests with Rust test functions and use mutation testing to prioritize inputs, but the sound acceptance gate remains Verus proof checking. Mutation score measures fault detection against selected syntactic mutants, not theorem validity; this distinction is not in the paper's claim and is an inference for VL.

## technique 2: translate tests and filter candidate programs by semantic agreement

The generated Java tests are translated into Python and C++ tests with identical inputs, expected outputs, and side effects (Section 3.1, PDF p. 5). The authors restrict functions to primitive, standard, array, and list types for which this mapping is clear (Section 3.1, PDF p. 5). They then use pre-trained unsupervised models to produce 20 candidates per Java function with beam search, execute the tests on each candidate, and select the first candidate that passes all tests (Section 3.1, PDF p. 5). The paper states: "If all the tests pass, the Python and C++ functions have the same semantics assessed by the generated tests." (Section 3.1, PDF p. 5).

Inference: For Verus, generate a candidate Rust translation or contract, translate or re-express the tests in the target crate, run them, and then invoke Verus on the candidate. Passing tests should be recorded as a filter signal, while the proof result should determine whether the example is trusted. A candidate that passes finite tests but fails a quantified postcondition must be discarded.

## technique 3: offline self-training from checker-filtered pseudo-labels

The offline loop creates Java↔Python, Java↔C++, and Python↔C++ pairs from every selected Java function. The model is fine-tuned on the first filtered dataset until convergence. The best checkpoints on validation data then generate a new filtered dataset, and the process repeats until validation improvement stops (Section 3.2, PDF p. 6). This creates a positive feedback loop: a better translator yields more passing examples, which provide more training signal.

Dataset sizes grow over four iterations: Java↔C++ from 27,875 to 60,495, Java↔Python from 33,496 to 45,311, and C++↔Python from 14,935 to 32,869 (Table 1, PDF p. 6). Offline iteration 3 has the best average CA@1, 63.1%, while iteration 4 falls to 59.4% despite more examples (Table 2, PDF p. 7). The authors explain that later candidates pass their generated tests but can become incompatible with the benchmark's expected types (Section 4.2, PDF p. 8).

Inference: The Verus loop can fine-tune a model on Rust functions whose specifications and proofs pass Verus, then regenerate candidates with the updated model. Validation must check intended contracts and type/trait behavior, because a checker filter tied to an incomplete test or contract can reinforce a wrong target.

## technique 4: online self-training with a cache

Online training generates filtered examples during training rather than rebuilding a complete dataset. To prevent collapse onto a few easy examples, the authors store passing examples in a cache. At each step the model either trains on a cached example or generates a new candidate; sampled examples are removed with a probability (Section 3.2, PDF p. 6). The cache is initialized with offline examples. Their concrete schedule keeps generating until at least 500 examples exist for a language pair, then samples or generates with probability 0.5, and removes sampled elements with probability 0.3, so an example is trained on about four times on average (Section 4.1, PDF p. 7).

The ablation shows why the cache matters: no-cache online training averages 59.4% CA@1, an empty cache 60.1%, and the full model with beam 20 during self-training and beam 10 at evaluation 66.3% (Table 4, PDF p. 8). The paper says: "Training online with no cache makes the training much more unstable." (Section 4.2, PDF p. 8).

Inference: A Verus implementation can maintain a cache of previously verified Rust candidates keyed by contract and environment, mix fresh generations with cached proofs, and evict examples gradually. Cache keys should include compiler, Verus, crate, and dependency versions; that versioning requirement is an inference because the paper does not use Verus.

## technique 5: checker-based evaluation and beam selection

The benchmark metric is computational accuracy CA@N: whether any of the top N generated solutions passes every associated test (Section 3.3, PDF p. 6). The paper evaluates with beam sizes 1, 10, and 20 and reports CA@1, CA@10, and CA@20 (Table 3, PDF p. 7). Online self-training reaches 66.3% CA@1 with beam 10 and 77.2% CA@20, compared with 53.7% and 70.5% for the best baseline; each percentage is over the benchmark's full validation/test function set (Table 3, PDF p. 7).

Across directions, Online ST averages 66.3% CA@1 versus 51.7% for TransCoder and reduces baseline error by 25.5%; for Python→C++, it reaches 56.7% versus 32.6%, a 35.7% error-rate reduction (Table 2 and Section 4.2, PDF pp. 7–8). These are benchmark computational-accuracy denominators, not percentages of all generated programs.

Inference: Verus should report top-k candidate proof success, compile success, and semantic-contract success separately, with the denominator being attempted benchmark tasks. Beam candidates can be checked in parallel, but the first textual candidate should not be accepted merely because it has the highest model score.

## limitations and semantic assumptions

The authors explicitly report that generated tests can disagree with benchmark tests and that passing generated tests is not perfectly correlated with benchmark performance (Section 4.2, PDF p. 8). Their factorial example differs on integer overflow: Python's arbitrary-precision result and Java's 32-bit overflow are not equivalent for input 21 (Figure 4, PDF p. 8). The paper says: "By using the test suites from EvoSuite as source of truth, we sometimes train the model to generate translations that are more rigorous but also less natural." (Section 4.2, PDF p. 8).

Inference: In VL, the contract is the source of truth only when its intended domain and overflow semantics are reviewed. Generated tests can encode accidental behavior, miss quantified cases, or disagree with a product specification. A Verus proof establishes the written contract, so product review must establish that the contract is the right one.

## what is proved, measured, and trusted

The paper measures test-passing translation accuracy and self-training gains; it does not prove full semantic equivalence. Its test suites, mutation operators, type mappings, benchmark tests, translation models, and EvoSuite implementation are trusted or assumed adequate. Inference: A Verus pipeline can reduce this trusted base by requiring proof, but still trusts the Verus verifier, Rust compiler assumptions, specifications, and any external-body or axiomatized code.

Inference: What VL should not redo is a benchmark that treats BLEU or exact text as correctness. The paper already demonstrates that checker-filtered pseudo-labels, mutation-score selection, offline/online self-training, cache stabilization, and CA@N evaluation are useful patterns. VL should adapt them to proof obligations and contract review rather than copy their finite-test-only acceptance rule.

## threat to a product of agent-written verified Rust

Inference: The threat is moderate for productivity and low for soundness when every generated artifact must pass Verus. The method shows that checker-filtered self-training can improve generation substantially, but its own limitations show how an incomplete or mismatched oracle can teach the model the wrong behavior. The principal VL risk is a valid proof of an unintended contract, not a proof bypass; contract provenance, domain assumptions, and independent review remain necessary.

## techniques for the catalog

- evolutionary test generation: evolve inputs with crossover and mutation against coverage or mutation fitness
- mutation-score filtering: retain suites only when killed-mutant ratio exceeds a threshold and assert count is adequate
- multilingual semantic filter: translate tests with inputs, outputs, and side effects, accepting candidates that pass all tests
- offline checker self-training: fine-tune on filtered pairs, regenerate with the best checkpoint, and iterate to validation convergence
- online cache self-training: generate verified examples during training while sampling and aging a cache to prevent collapse
- CA@N evaluation: count a task correct when any of the top N candidates passes all checker cases

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
