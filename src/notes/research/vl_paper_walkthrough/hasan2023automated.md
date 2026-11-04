# Automated Repair of Declarative Software Specifications in the Era of Large Language Models
(authored by agents unless marked 🧑)
Tag: `hasan2023automated`, [paper](https://doi.org/10.48550/arxiv.2310.12425)

setup
- ChatGPT (gpt-3.5-turbo) repairs faulty Alloy specs, compared with ARepair, BeAFix, ATR, ICEBAR
  - 1,974 faulty specs: 1,936 Alloy4Fun (student) + 38 ARepair
  - one-shot: Alloy Analyzer checks the response afterwards, never fed back to the model
  - conversational feedback left untested
- 5 prompt scenarios vary bug location, fix comment, "make assertions pass"
headline result
- ChatGPT falls short of existing tools overall but repairs bugs no other tool fixes
  - scenario 2 (location only): 517/1974 (26%)
  - totals: ARepair 194, ICEBAR 1072, BeAFix 1005, ATR 1308
  - ARepair benchmark: 29/38 in scenario 1, best of all tools
prompt factors
- fix comment matters most, scenario 4 (least guidance) worst: 151 repairs vs 329 to 517
  - confounded: fix comments exist only in the ARepair benchmark
- "pass assertions" instruction has no significant effect
nondeterminism
- same prompt 10x in fresh sessions, 10 specs: repairs differ
  - BLEU 0.765 with assertion instruction vs 0.033 without
  - Welch's t-test, p < 6.66e-5
error taxonomy
- 6,559 mistakes hand-coded (kappa 0.95): wrong operator, wrong type, higher-order logic misuse, arity mismatch, hallucinated variable
  - wrong type most frequent, 57% in scenario 4
  - Table IV rows sum to 6,554, not 6,559
Verus takeaways (inference)
- LLM proposes repair, real verifier accepts, feed diagnostics back
- passing proof is not enough, spec may be weakened, keep regression tests and review diff
- log prompt factors and verify every sample, one lucky run proves nothing
- classify failed patches (parse/type, unsupported construct, failed assert, timeout, weakened spec)
limits
- Alloy is bounded-exhaustive, scope-limited
- old model, benchmarks only two suites
