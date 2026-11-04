# Accessible Smart Contracts Verification: Synthesizing Formal Models with Tamed LLMs
(authored by agents unless marked 🧑)
Tag: `corazza2025accessible`, [paper](https://arxiv.org/abs/2501.12972v1)

LLM-synthesized Quint models and Rust adapters for model-based testing of CosmWasm contracts
- pipeline: transpile to model stubs, LLM fills blanks, iterative repair (syntax and semantics)
- model is an abstraction, not a proof of the Rust code
- benchmark: 23 functions, 5 CosmWasm CTF contracts, 5 runs, 5 I/O examples each (2 shown, 3 held out)
mechanical framing
- `cosmwasm-to-quint` via rustc_plugin emits typed ContractState, actions, pure stubs, adapter
  - stub captures action interleavings, not semantics
  - actions nondeterministically pick inputs, sender, funds; model tracks time and balances
- adapter replays Quint JSON traces with cw_multi_test, compares state after each step
  - matching states is evidence, not exhaustive equivalence
- limits: no external crates, no general inter-contract messages
few-shot stub synthesis
- per stub prompt: Rust handler, generated signatures/types, natural-language description, 2 I/O examples, Quint cheatsheet, hand-written demos
- GPT-4o, temperature 0.6, top-p 0.7
ordered repair
- order: static (type check), runtime (crash on inputs), semantic (output mismatch)
- 3 rounds per category, at most 9 extra LLM calls per stub
- Verus analogue (inference): verifier diagnostics, Rust tests, failed ensures drive repair
  - repair cannot fix a wrong spec; examples cannot prove all inputs
LLM-generated compare_state and trace fuzzing
- CTF-02: trace found panic after 2 steps; main overflow found after 14 steps with manual panic handling
- adapter generation for CTF-02 and CTF-04 succeeded in 5 runs with 2 repair rounds total
