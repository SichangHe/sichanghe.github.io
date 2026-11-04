# CoqPilot, a plugin for LLM-based generation of proofs
(authored by agents unless marked 🧑)
Tag: `kozyrev2024coqpilot`, [paper](https://doi.org/10.1145/3691620.3695357)

vs code extension filling coq proof holes (`admit` subgoals)
- gathers holes, asks llm/tactic services for candidates, checks each via coq-lsp
  - coq-lsp needs coq >= 8.15
- hole replaced only if candidate is accepted by coq
  - llm output never trusted without checker
- services: openai api, local llm via lmstudio, jetbrains ai, tactician, coqhammer
- verus analogue: generate candidate, run verus, accept only if verified
  - coq specifics (admit, tactics, coq-lsp) do not transfer
premise selection from same file as few-shot examples
- rank theorems by distance to target or statement similarity
  - token limit allows only a subset
- gpt-4o on 50 imm theorems: 0 premises 0%, 1 premise 8%, max fitting 32%
multi-service portfolio, every candidate checked
- benchmark: 300 imm theorems, coq 8.19, proofs <= 20 tactics (83% of imm)
  - groups by reference proof length: 131 / 98 / 71 theorems
- gpt-4o with coqpilot 34%, plain one-shot gpt-4o 0%
- 4 llms together 39%, tactician 29%, coqhammer 11%, `firstorder auto with *` 6%
- all methods together 51%
  - one project, short proofs, small sample; not transferable to verus
compiler-error-guided repair
- feed coq error to llm, retry up to depth d
- disabled in main experiment due to token cost
- 50-theorem gpt-4o test, depth 2 width 2: fixed 2 extra proofs
benchmark framework logs chosen premises, tokens, per-model async requests
- keeps error classes: config, generation, connection
