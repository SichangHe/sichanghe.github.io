# Building A Proof-Oriented Programmer That Is 64% Better Than GPT-4o Under Data Scarsity
(authored by agents unless marked 🧑)
Tag: `zhang2025building`, [paper](https://arxiv.org/abs/2502.11901)

PoPilot: Qwen2.5-Coder-14B + LoRA fine-tuned for F* proofs, F* being the closest SMT-backed relative of Verus
- F* is under 0.002% of Stack-v2 (29.6k entries), hence synthetic data
- checker is the only filter: "no extra effort such as test cases and LLM judges is required for verifying F* data"
verifier-filtered synthetic tasks
- 5 open LLMs, zero-shot, temp 0.7, write self-contained problem + answer from seed snippets
  - task types: nl-to-code, proof completion on a verified snippet, repair
- run F*: pass → train set, fail → repair set with error log
- verified answers recycled as snippets for later tasks
- table 1 (7B, pass@1 → after repair): untuned 0.25→0.30, 93K synthetic 0.48→0.52, GPT-4o 0.60→0.70
  - test set is drawn from the same generator as training, so it measures the task family only
  - the filter-rejection rate and triviality of kept properties are not reported
- Verus form (inference): filter must also reject `assume`, `admit`, `external_body`
data mixing
- add Evol, CodeAlpaca, Lean proofs (DSP-V1), RunBugRun to the F* set
- 7B pass@1: 0.48 → 0.58 with the full mixture; 14B reaches 0.74
- each row changes several things, single run, so no ranking of additives
repo-level statement synthesis
- per real definition: give context (opened modules, premises, similar examples), ask for a different type + definition, keep what F* accepts
- dedup by sequence similarity against each other, the examples, and the test set
- table 2 (1K held-out): 30.7 → 32.2 Generate@5, i.e. 15 problems, one run
- caveat: statement is model-invented, so it can be true but worthless; weak on long definitions
repair data
- mutation (syntax-tree edits, identifiers untouched, keep if checking fails) does not help alone
  - repair@5 fell 2.2 → 0.7
  - real model errors are mostly "identifier not found" and syntax errors, which mutation never produces
- model-failure repair data (wrong proof + compiler error → known correct proof) helps: repair@5 2.2 → 4.2
- repair prompt marks failing lines in place, `// Error Range Start - Line N`, then error text
- Verus mutation analogue: delete one `invariant`, `assert`, lemma call, `decreases`; never mutate `requires`/`ensures`
inference protocol
- sample 5; if all fail, repair one random failure 5 times
  - beats repairing each of 5 failures once: +4.7 vs +1.7 (tuned), +7.8 vs +0.8 (Qwen-32B)
- vs 10 fresh samples, repair wins only for the last three tuned rows (by 0.1, 0.7, 0.9) and loses for 7 of 10 untuned baselines
- small tuned model repairing GPT-4o's failures: 36.9 vs 23.9 self-repair
  - tuned model alone gets 34.0 Generate@5, so the draft's contribution is unmeasured
headline and caveats
- "64%" is not reproduced (39.4/23.9 = 1.648); "54%" is 36.9/23.9; relative gains, 1K problems, one run
- 60.6% of problems remain unsolved
- tables disagree with text (swapped labels, two sets of Qwen-32B numbers)
  - baselines' repair numbers may come from the weaker one-repair-each protocol
- F* only, no check for `admit`/`assume` is described
