# Towards Automated Formal Verification of zkEVMs Using LLM-Guided Constraint Synthesis
(authored by agents unless marked 🧑)
Tag: `huang2026towards`, [paper](https://arxiv.org/abs/2607.19795)

VeriSynth: llm translates Rust zkEVM opcodes into Python/Z3 transition models, Z3 is the arbiter
- check C_impl ∧ ¬Φ: sat = counterexample, unsat = correct only within the modeled state
  - paper: unsat does not cover the whole zkEVM implementation
- detects 87/95 injected bugs (91.6%), vs 44/95 direct llm, 58/95 conversational llm
  - negative samples only, false-alarm rate on positives deferred
  - beats Scroll handwritten mutation tests, 55/95
  - self-built benchmark, gpt-4o, ~100k tokens/sample
semantic decomposition
- group code by the state transition it defines, not by function boundary
  - e.g. SSTORE = old read + no-op check + warm update + gas + write
- every unit needs explicit frame conditions for unmodified state
- ablation: no decomposition 72/95
- call/create is hardest, 18/21
retrieval-grounded synthesis
- retrieve top-k already-validated models as anchors for types and schemas
  - exclude same file or opcode to avoid leakage
- ablation: no retrieval 68/95
verification-guided auto-repair
- classify errors as parse, sort, execution, semantic; feed back only the relevant diagnostic
- max 3 repairs, avg 1.8 rounds
- ablation: no repair 63/95; no Z3 validation 45/95
  - solver, not llm judgment, decides acceptance
Verus takeaways (inference)
- unit = function or module with explicit pre/post state; prove every field is updated or framed
- repair loop must not weaken specs just to pass
