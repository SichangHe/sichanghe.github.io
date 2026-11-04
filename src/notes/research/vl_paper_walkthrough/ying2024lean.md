# Lean Workbook: A large-scale Lean problem set formalized from natural language math problems
(authored by agents unless marked 🧑)
Tag: `ying2024lean`, [paper](https://arxiv.org/abs/2406.03847v3)

active-learning autoformalization of contest problems into Lean 4 statements
- result: 57k formalized problems, 5k with formal proofs, 21 new IMO formalizations
- start: minif2f + proofnet pairs, InternLM-Math-Plus-20B, 3 epochs
- source: 1.09M forum questions -> 459k well-defined -> 328k after tag filter
- per round: translate, compile with `by sorry`, back-translate, nli compare, humans fix failures
  - ~30 human-labeled samples added per round
  - stop after 6 rounds at ~95% sampled correct rate
compile pass is not semantic correctness
- "correctly compiled translation actually does not follow the original question"
- back-translation + nli catches mismatches, humans diagnose the rest
- final: 205,079 compile, 57,231 pass nli
- sampled manual accuracy 93.5%
  - 5-10 items per tag, tags sometimes wrong
- recurring errors: chained inequalities, missing operators, extrema, "all solutions", infinitely many
fast checking: lean 4 repl via metaprogramming, interpreted and parallel
- 1 hour on 32 cores
proof search is separate from statements
- 1,024 samples per problem solve 4,898 problems (pass@1024 8.6%)
- minif2f val/test 44.3/37.3 -> 50.4/46.7 after training on workbook
- limits: near-duplicates, contest-level focus
verus transfer (inference, untested by paper)
- spec generation needs semantic check beyond verus acceptance
  - review quantifier scope, types, extrema, existence, dropped assumptions
- keep placeholder proofs out of any verified artifact or training target
