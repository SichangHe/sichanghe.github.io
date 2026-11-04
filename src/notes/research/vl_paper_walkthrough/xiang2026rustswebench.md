# Evaluating and Improving Automated Repository-Level Rust Issue Resolution with LLM-based Agents
(authored by agents unless marked 🧑)
Tag: `xiang2026rustswebench`, [paper](http://arxiv.org/abs/2602.22764v1)

Rust-SWE-bench: 500 real Rust issue-resolution tasks from 34 repos (>1,000 stars)
- construction: merged PR linked to issue, modifies tests, fail-to-pass, no pass-to-pass regression
  - plus pinned Cargo index snapshots and manual check of issue clarity, test integrity, solution leakage
- avg 993.6 files, 128k lines per repo; fixes edit 9.8 files, 139.9 lines
- resolved = one patch applies and passes held-out tests
  - empirical patch success, not formal correctness
- baselines: 4 agents x 4 LLMs
  - best baseline OpenHands + Claude-Sonnet-3.7 resolves 106/500 (21.2%)
  - SWE-agent 75/500 (15.0%), Agentless 36/500 (7.2%) with same model
  - cost per task: OpenHands $3.81, SWE-agent $3.48
issue reproduction is the bottleneck
- 44.5% of tasks fail at reproduction in the best configuration
RustForger: isolated workspace + Trace command
- isolated workspace: sandboxed Cargo workspace, target project linked as local dependency
- Trace: AST instrumentation of selected functions, emits JSON call graph, restores source after
  - skips closures, proc macros, tests
  - uses scoped immutable references to respect borrowck and lifetimes
  - non-serializable values get placeholders
- 143/500 (28.6%) with Claude, +34.9% relative over OpenHands
  - 200-task ablation: full 30.3 solved, 25.0 without Trace, 22.0 without reproduction workspace
  - Trace used in 71.3% of successes
  - overhead: ~1.65% tokens, 40 s first build, ~12 s per call
takeaways for Verus
- fail-to-pass filtering transfers
  - inference: Verus task = baseline verification failure then passing proof under `cargo verus`
  - paper defines no Verus tasks
- scope: issue repair in open-source repos, says nothing about spec matching intent
