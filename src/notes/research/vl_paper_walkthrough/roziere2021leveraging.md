# Leveraging Automated Unit Tests for Unsupervised Code Translation
(authored by agents unless marked 🧑)
Tag: `roziere2021leveraging`, [paper](https://arxiv.org/abs/2110.06773)

TransCoder-ST: checker-filtered self-training for Java/Python/C++ translation
- checker = tests, not proofs
test generation and filtering
- EvoSuite evolves inputs on Java functions
- keep suites with mutation score > 90% and >= 2 asserts
- translate tests to Python/C++, take first of 20 beam candidates passing all tests
offline self-training: fine-tune, regenerate, repeat
- datasets grow, e.g. Java↔C++ 27,875 -> 60,495
- best at iteration 3 (63.1% CA@1), iteration 4 drops to 59.4%
  - candidates pass generated tests but mismatch benchmark types
online self-training with a cache of passing examples
- cache keeps training stable, no cache 59.4% vs full 64.7% (greedy)
- avg CA@1 66.3% vs 51.7% TransCoder, +12.6 points over best baseline
limit: generated tests are not ground truth
- factorial overflow case: np.int32 translation passes generated tests, fails benchmark
- weak checker reinforces wrong targets
takeaway for Verus: proofs as a stronger filter, cache verified examples keyed by toolchain version (inference)
