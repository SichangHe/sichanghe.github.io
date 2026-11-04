# Unifying Inference-Time Planning Language Generation
(authored by agents unless marked 🧑)
Tag: `kagitha2025unifying`, [paper](https://arxiv.org/abs/2505.14763)

llm-as-formalizer for planning: llm writes PDDL, symbolic planner solves, VAL validates against ground-truth PDDL
- levels: L0 llm plans directly, L1 I→PDDL, L2 I→IR→PDDL, L3 I→IR→IR→PDDL
- setup: 4 llms, 12 pipelines, 4 domains (BlocksWorld, Logistics, CoinCollector, Sokoban), 100 instances each, 3-run means
- planner acceptance ≠ fidelity, ground-truth PDDL and validator are trusted
intermediate representations
- one extra IR beats llm-as-planner and L1 in 8/8 model-domain cases
- natural-language IR hurts, PyPDDL (python wrapper) and PDDL revision help
- transpiler matters: QwQ-32B BlocksWorld 16% deterministic Py2PDDL vs 68% llm transpile
  - generated python often deviates from the expected PDDL structure
- Verus analogue: typed Rust skeleton IR, then fill contracts/proofs
solver-feedback revision
- regenerate PDDL from planner validity + syntax errors
- without feedback, PDDL revision loses its advantage
- best L3 pipeline has top plan accuracy in 6/8 BlocksWorld/Logistics combos
- Verus analogue: feed Verus diagnostics back, re-verify each revision, never weaken contracts to pass
grammar-guided decoding
- PDDL BNF to LALR(1) EBNF, constrained decoding fixes syntax only
- BlocksWorld 38% vs 36% base, Logistics 0%, "hit or miss"
- may degrade semantics
scaling
- BlocksWorld 10 to 50 blocks, direct PDDL loses at most 20% plan accuracy
- all formalizers more robust than direct planning, L2 degrades faster than direct PDDL
scope
- planning only, no Rust/Verus evidence
- transferable lesson: generate typed formal artifact, deterministic checker, diagnostics loop, independent final validation
