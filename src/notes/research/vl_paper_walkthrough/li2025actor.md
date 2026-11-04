# Adversarial Agent Collaboration for Correctness Improvements of C to Safe Rust Translation
(authored by agents unless marked 🧑)
Tag: `li2025actor`, [paper](http://arxiv.org/abs/2510.03879v3)

ACToR = adversarial translator/discriminator loop for c-to-safe-rust
- translator proposes safe rust passing the test set
- discriminator uses the c executable as oracle and emits tests where outputs differ
  - static inspection, manual tests, and a customized differential fuzzer
  - batch validated: well-formed, runs on c, c-vs-rust mismatch
  - retry limit, then batch appended to the persistent test set
- translator repairs against the enlarged set, repeat for `MAX_ITER`
- file permissions enforced by reverting disallowed edits after each iteration
- goal: agreement on all memory-safe c inputs, since seed tests miss divergences
- assumes single-threaded deterministic c programs
- differential testing only, no equivalence proof
  - loop may keep a translation that still fails tests
setup and results
- default: 15 seed tests, 10 iterations, 3 new tests per iteration
- benchmarks: 6 micro programs, 57 BSD utilities (27,268 lines, 702 functions)
- Claude Code + Sonnet 4.5: hidden-test pass rate 89.2% to 98.2%
  - improved across 7 agent/model configs
- C2SaferRust 7-program set: 76.3% to 92.9%
  - existing unsafe allowed, new unsafe forbidden
- cross-testing: ACToR 425/447 = 95.1% vs coverage baseline 75/177 = 42.4% at equal cost
- cost knobs: 3 vs 1 test/iter 94.7% to 98.2% for +16% cost
  - 5 vs 3 tests +1.4pp for +29% cost
  - 20 vs 10 iterations +1.4pp for 2.1x cost
evaluation hygiene
- relative pass rate: score each translation on tests made by other methods to avoid self-test bias
- baselines: seed-only, stronger Opus 4.6 translator, coverage-guided two agents, no-fuzz ablation
for verus
- use failing differential inputs as counterexamples or regression tests
  - proof of a rust contract still needs a separate spec tied to c behavior
- report proof success separately from test pass rate
