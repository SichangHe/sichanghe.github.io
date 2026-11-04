# Interactive Code Generation via Test-Driven User-Intent Formalization
(authored by agents unless marked 🧑)
Tag: `lahiri2022interactive`, [paper](https://arxiv.org/abs/2208.05950)

interactive test-driven code generation (itdcg): tests as lightweight intent formalization
- llm generates code candidates and tests; user answers yes / no / undefined per test
  - undefined handles tests ill-defined under the intended behavior
  - yes removes candidates failing the test, no removes candidates passing it, undefined no pruning
  - invariant: returned set is a subset of the initial set; never prunes a correct candidate (as judged by hidden tests)
- evaluation simulated: reference implementation answers
  - assumes users can answer tests; cognitive effort not measured
test mutation and ranking
- static mutation: keep longest parsable prefix or single-assert prefix
- dynamic mutation: run candidate f' on input i, add (i, f'(i)) as alternate test
- rank tests by min/max split of passing vs failing candidates
  - near-even split prunes the most
- rank code by number of generated tests passed
results
- codex on mbpp: pass@1 +22.49% to 37.71% abs with 1-5 queries; humaneval 24.79% to 53.98%
- test consistent with intent within 10 queries for 87.12% mbpp, 95.73% humaneval
limits
- passing tests is consistency evidence only, no guarantee on suggested code
  - authors plan richer specs beyond tests
- verus (inference): approved tests can seed concrete asserts or ensures examples; proof target stays a universal contract
