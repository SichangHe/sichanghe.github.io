# Kimina Lean Server: A High-Performance Lean Server for Large-Scale Verification
(authored by agents unless marked 🧑)
Tag: `dossantos2025kimina`, [paper](http://arxiv.org/abs/2504.21230v3)

verifier server for rl theorem-prover pipelines (proof outcome = reward)
- rest api over a pool of Lean 4 repl processes, python client `check` takes a batch of scripts
  - returns messages, env ids, timing, optional infotree
- used as the verification engine of Kimina-Prover rl training
  - supports use in a real workflow, does not isolate an accuracy gain from the server
process-level parallelism: 1 repl per core, route scripts to idle workers
- 9,419 sorry-free NuminaMath-LEAN proofs: 42:40 at 8 cores, 7:56 at 64 cores
  - 1.5-2x faster than next best baseline (LeanInteract, leanclient)
  - 0.272 s/proof at 8 cores, 0.051 s/proof at 64
- caveat: local runs only, smt disabled, no network latency measured
  - the LeanInteract baseline had no worker pool, so the comparison includes the pool benefit
import-keyed lru cache: split script into header (imports) and body
- hit = reuse a warmed repl, check only the body
- 1.94x speedup at 64 cores (7:56 vs 15:28)
- inference: correct only if the header fully determines the environment
infotree to tactic/state extraction for tree-search training data
- non-overlapping tactic snippets with states, supports have/let/calc/conv
verus transfer (inference)
- parallel `verus` runs and result caching keyed by version, toolchain, lockfile, source hash
- success exit is evidence only for the exact submitted source and spec
- no infotree in verus, would need diagnostics or an instrumented front end
