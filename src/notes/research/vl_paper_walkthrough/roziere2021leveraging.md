# Leveraging Automated Unit Tests for Unsupervised Code Translation
(authored by agents unless marked 🧑)
Tag: `roziere2021leveraging`, [paper](https://arxiv.org/abs/2110.06773)

## scope and contribution

The paper introduces TransCoder-ST, which uses generated tests to reject bad pseudo-translations before self-training. Its central claim is: "To address this issue, we propose to leverage an automated unit-testing system to filter out invalid translations, thereby creating a fully tested parallel corpus." (Abstract, PDF p. 1). The method targets unsupervised Java, Python, and C++ translation where back-translation creates noisy pairs.

## technique 1: generate tests with evolutionary search and select by mutation score

The authors use EvoSuite on isolated Java functions. They describe tests as "lists of inputs and asserts testing the semantics of a program (e.g., the output of the function, the side effects on its arguments such as sorting the input list)." (Section 3.1, PDF p. 5). EvoSuite evolves candidate inputs with crossover and mutation, scores them for coverage or mutation score, and wraps the final inputs into test cases (Section 3.1, PDF p. 5).

The selection procedure is:

1. select Java functions that compile and run in isolation (Section 3.1, PDF p. 5)
2. run EvoSuite's evolutionary search; candidate inputs are repeatedly crossed over and mutated and retained by a fitness function (Section 3.1, PDF p. 5)
3. generate mutants by applying syntactic mutation operators to the original program (Section 3.1 and Appendix A.2, PDF pp. 5, 15)
4. execute the generated test suite on each mutant and mark a mutant killed when a test result differs from the original (Section 3.1, PDF p. 5)
5. compute mutation score as the ratio of killed mutants and retain only suites with score greater than 90% (Section 3.1, PDF p. 5)

The paper cautions that one generated test can be insufficient: of its clamp example (a single test case), it says "This test case is not sufficient to test the semantics of the function thoroughly but could be part of a suitable test suite." (Figure 3 caption, PDF p. 5). In the dataset, the authors additionally require at least two asserts (Section 4.1, PDF p. 7).

## technique 2: translate tests and filter candidate programs by semantic agreement

The generated Java tests are translated into Python and C++ tests with identical inputs, expected outputs, and side effects (Section 3.1, PDF p. 5). The authors restrict functions to primitive, standard, array, and list types for which this mapping is clear (Section 3.1, PDF p. 5). They then use pre-trained unsupervised models to produce 20 candidates per Java function with beam search, execute the tests on each candidate, and select the first candidate that passes all tests (Section 3.1, PDF p. 5). The paper states: "If all the tests pass, the Python and C++ functions have the same semantics assessed by the generated tests." (Section 3.1, PDF p. 5).

Inference: For Verus, generate a candidate Rust translation or contract, translate or re-express the tests in the target crate, run them, and then invoke Verus on the candidate. Passing tests should be recorded as a filter signal, while the proof result should determine whether the example is trusted. A candidate that passes finite tests but fails a quantified postcondition must be discarded.

## technique 3: offline self-training from checker-filtered pseudo-labels

The offline loop creates Java↔Python, Java↔C++, and Python↔C++ pairs from every selected Java function. The model is fine-tuned on the first filtered dataset until convergence. The best checkpoints on validation data then generate a new filtered dataset, and the process repeats until validation improvement stops (Section 3.2, PDF p. 6). This creates a positive feedback loop: a better translator yields more passing examples, which provide more training signal.

Dataset sizes grow over four iterations: Java↔C++ from 27,875 to 60,495, Java↔Python from 33,496 to 45,311, and C++↔Python from 14,935 to 32,869 (Table 1, PDF p. 6). Offline iteration 3 has the best average CA@1, 63.1%, while iteration 4 falls to 59.4% despite more examples (Table 2, PDF p. 7). The authors explain that later candidates pass their generated tests but can become incompatible with the benchmark's expected types (Section 4.2, PDF p. 8).

Inference: The Verus loop can fine-tune a model on Rust functions whose specifications and proofs pass Verus, then regenerate candidates with the updated model. Validation must check intended contracts and type/trait behavior, because a checker filter tied to an incomplete test or contract can reinforce a wrong target.

## technique 4: online self-training with a cache

Online training generates filtered examples during training rather than rebuilding a complete dataset. To prevent collapse onto a few easy examples, the authors store passing examples in a cache. At each step the model either trains on a cached example or generates a new candidate; sampled examples are removed with a probability (Section 3.2, PDF p. 6). The cache is initialized with offline examples. Their concrete schedule always generates new examples while the cache holds fewer than 500 examples for any language pair, and otherwise samples from the cache or generates new examples (training on them once and caching them), each with probability 0.5, and removes sampled elements with probability 0.3, so an example is trained on about four times on average (Section 4.1, PDF p. 7).

The ablation shows why the cache matters: with greedy decoding at evaluation, no-cache online training averages 59.4% CA@1 and an uninitialized cache 60.1%, versus 64.7% for the full model (self-training beam 20) under the same greedy evaluation; the 66.3% figure for the full model uses beam 10 at evaluation (Table 4, PDF p. 8). The paper says: "Training online with no cache makes the training much less stable." (Section 4.2, PDF p. 8).

Inference: A Verus implementation can maintain a cache of previously verified Rust candidates keyed by contract and environment, mix fresh generations with cached proofs, and evict examples gradually. Cache keys should include compiler, Verus, crate, and dependency versions; that versioning requirement is an inference because the paper does not use Verus.

## technique 5: checker-based evaluation and beam selection

The benchmark metric is computational accuracy CA@N: whether any of the top N generated solutions passes every associated test (Section 3.3, PDF p. 6). The paper evaluates with beam sizes 1, 10, and 20 and reports CA@1, CA@10, and CA@20 (Table 3, PDF p. 8). Online self-training reaches 66.3% CA@1 with beam 10 and 77.2% CA@20, compared with 53.7% and 70.5% for the best baseline (Table 3, PDF p. 8). The paper evaluates "on the full validation and test sets of TransCoder" (Section 3.3, PDF p. 6).

Across directions, Online ST averages 66.3% CA@1 (beam 10) versus 51.7% for TransCoder (Table 2); the paper reports an average gain of 12.6 points over the best baseline per pair and direction, an error-rate reduction of 25.5%; for Python→C++, it reaches 56.7% versus 32.6%, a 35.7% error-rate reduction (Table 2 and Section 4.2, PDF pp. 7–8). These are benchmark computational-accuracy denominators, not percentages of all generated programs.

Inference: Verus should report top-k candidate proof success, compile success, and semantic-contract success separately, with the denominator being attempted benchmark tasks. Beam candidates can be checked in parallel, but the first textual candidate should not be accepted merely because it has the highest model score.

## limitations and semantic assumptions

The authors explicitly report that generated tests can disagree with benchmark tests and that passing generated tests is not perfectly correlated with benchmark performance (Section 4.2 "Limitations", PDF p. 9). Their factorial example differs on integer overflow: the text says the Java implementation (with long integers) "would return a negative number for the input 21 due to integer overflow while the Python implementation would return 21! correctly"; Figure 4 shows the Java int version and a Python translation using np.int32 that passes the generated tests but fails some benchmark tests (PDF p. 9). The paper says: "By using the test suites from EvoSuite as source of truth, we sometimes train the model to generate translations that are more rigorous but also less natural." (Section 4.2, PDF p. 9).

## what is proved, measured, and trusted

The paper measures test-passing translation accuracy and self-training gains; it does not prove full semantic equivalence. Inference: the paper's results rest on the adequacy of its test suites, mutation operators, type mappings, benchmark tests, translation models, and EvoSuite implementation, none of which it verifies formally. A Verus pipeline can reduce this trusted base by requiring proof, but still trusts the Verus verifier, Rust compiler assumptions, specifications, and any external-body or axiomatized code.

## techniques for the catalog

- evolutionary test generation: evolve inputs with crossover and mutation against coverage or mutation fitness
- mutation-score filtering: retain suites only when killed-mutant ratio exceeds a threshold and assert count is adequate
- multilingual semantic filter: translate tests with inputs, outputs, and side effects, accepting candidates that pass all tests
- offline checker self-training: fine-tune on filtered pairs, regenerate with the best checkpoint, and iterate to validation convergence
- online cache self-training: generate verified examples during training while sampling and aging a cache to prevent collapse
- CA@N evaluation: count a task correct when any of the top N candidates passes all checker cases
