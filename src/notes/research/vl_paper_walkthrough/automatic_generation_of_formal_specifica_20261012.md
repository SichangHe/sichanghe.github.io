# Automatic Generation of Formal Specification and Verification Annotations Using LLMs and Test Oracles
(authored by agents unless marked 🧑)
Tag: `faria2026automatic`, [paper](https://arxiv.org/abs/2601.12845v1)

task: LLM adds annotations to existing Dafny code, implementation unchanged
- input: code, NL requirements in comments, test methods with static `assert`
- output: pre/postconditions, invariants, ghost fns, asserts, lemmas
- loop: generate, check, repair, minimize
result on TESTDAFNY110
- multimodel (Claude Opus 4.5 + GPT-5.2) verifies 108/110 (98.2%), avg 2 attempts
  - misses: `FastModularExponentiation`, `PrimeFactorization` (manual solutions need 4 and 10 lemmas)
  - text says repair@8 but table puts 98.2% in r@10 column; clarify before reproducing
- measures Dafny contract satisfaction on a curated benchmark, not completeness of NL requirements
static tests as specification-level oracles
- keep test calls and asserts, strip all annotations from method under test
  - postcondition must imply the intended result, so weak postconditions fail
- nondeterministic outputs: assert a disjunction, e.g. `idx == 1 || idx == 2`
- add `a[..] == [1, 4, 4, 6]` style asserts as triggers
- negative tests marked `//@invalid`: uncomment each after a candidate verifies
  - if it still verifies, precondition too weak or postcondition too strong
- evidence: 7 of 165 manually analysed failed Claude attempts had verified body but failing tests
  - 4 contracts (weak pre or strong post) fixed by negative tests
- Verus form (inference): same idea with `requires`/`ensures` over `v@` views
staged generation then diagnostic repair
- direct prompt: all missing annotations in 1 shot, returns only modified code
- repair prompt: full current program + exact Dafny errors
  - forbids unproved `assume`, `decreases *`, test removal
- Dafny 4.11.0, 1 min timeout, up to 9 repairs after first try
- evidence: repair vs direct
  - Claude Opus 4.5: 90.0% at 5, 96.4% at 10
  - GPT-5.2 low reasoning: 75.5% at 5, 89.1% at 10
  - multimodel: 94.5% at 5, 98.2% at 10; direct multimodel only 57.3% at 5
- Verus form (inference): whole compilable file, reject `assume`/`admit`/`external_body`
proof-helper pattern catalogue in repair prompt
- 56% of programs need helpers beyond contracts and invariants
  - helper count is strongest difficulty signal: βH = -0.5825 vs βL = -0.0735 (lines), βA = -0.0475 (annotation lines)
  - logistic AUC 0.907 over 1,540 pairs; correlation, not causation
- patterns
  - local slice/concat assert, e.g. `assert a[..i+1] == a[..i] + [a[i]]`
  - concrete intermediate facts before the final test assert
  - recurse from sequence end when implementation iterates upward
  - non-recursive postconditions, `{:fuel N}` for concrete list tests
  - wrap complex quantifier body in predicate instead of manual trigger
- does not replace domain proof invention
dependency-aware minimization
- repair output is 63.2% larger than manual solutions
  - minimization drops 58% of annotation lines, overhead to 10.6%, 1.4s per removed line
  - direct prompting overhead only 7.9%
- algorithm: LCS diff, candidate deletions bottom-up, rerun Dafny with 10s timeout
  - commit only if success and verification time preserved
  - drop declarations with zero references
- time preserved is a heuristic, not minimality
multimodel selection
- rank by syntax valid, verified, fewer lines, shorter time
- Claude temp 0.5: $0.0441/call, 15.8s; DeepSeek $0.0007/call but 69.1% at 10
- Verus form (inference): add policy checks before ranking, fewer lines can mean opaque axioms
contract quality and trust
- 106/110 (96.4%) generated contracts logically equivalent to manual
  - 12 textually identical, 11 structurally identical, 68 semantically similar
  - 4 not equivalent: 1 too strong post, 3 weak pre; all fixed by negative tests
- acceptance rule: verifies and makes all test assertions provable (Sec. 8.2, p. 26)
  - assumes tests cover intended behavior (inference)
- trusted: Dafny, Z3, tests, reference specs, model APIs, post-processing
- models can cheat with `assume` or disabled termination; solutions "should be manually inspected" (Sec. 6.5, p. 20)
IDE tool
- Dafny AI Assistant in VS Code, retries across OpenAI/Anthropic/DeepSeek/xAI
- usability study: 7 students, 42 tasks
  - success 85.7% vs 42.1% manual, time 6.2 vs 11.1 min, SUS 74.6
  - small student sample, not production reliability
