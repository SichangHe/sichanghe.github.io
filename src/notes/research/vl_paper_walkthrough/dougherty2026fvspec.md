# FVSpec: Real-World Property-Based Tests as Lean Challenges
(authored by agents unless marked 🧑)
Tag: `dougherty2026fvspec`, [paper](https://doi.org/10)

fvspec: real python property-based tests (pbt) to lean `Impl.lean` + `Spec.lean` with `sorry`
- 7,413 distinct pbts from 497 repos, 2,623 (35%) formalized into 9,415 specs
- tests written without verification intent, so sampled from production code
- a pbt can omit preconditions or encode a bug, not ground truth
corpus mining
- crawl hypothesis dependency graph, drop gpl/agpl/lgpl/mpl, find `@given` with ripgrep
- 54,345 pbts found in 24 hours, sha-256 dedup of normalized text
- median pbt is 10 loc, exercises 2.8x its length in project code
agentic transpilation
- tree-sitter extracts function plus local dependency closure
- one theorem per pbt assertion, lean lsp errors fed back in a repair loop
- 59% complete impl, 41% signature-only stub
- mean 8 theorems per sample, median structural faithfulness 0.65
pre-validation and axiom audit
- drop unit-typed tautologies, ill-typed names, leaked specs
- record axiom dependencies, since lean can be gamed by changing the question
effectful code as uninterpreted interface: db, socket, clock become abstract axioms threaded as theorem parameters
- cannot witness timing, memory, or side-effect ordering
- hidden side effects behind a pure signature give a compiling but mismatched theorem
baselines: 3 models with lean lsp, 70% proved on easy, 49% on hard
- difficulty labels from claude haiku, not human-calibrated
- structural faithfulness heuristic, dependency coverage 1.0 when none resolved (40.3% of samples)
verus transfer (inference)
- rust/verus version is the open gap: ownership-aware translation, trusted external contract accounting
- reject `external_body` on the verified function
- report compile, full proof, trusted axioms, faithfulness separately
