# FormalJudge: A Neuro-Symbolic Paradigm for Agentic Oversight
(authored by agents unless marked 🧑)
Tag: `zhou2026formaljudge`, [paper](https://arxiv.org/abs/2602.11136)

judge agent trajectories by compiling intent into Dafny facts checked by Z3
- llm confined to atomic fact extraction, solver does all logical composition
  - "confines probabilistic reasoning to atomic extraction while delegating all logical inference to the deterministic solver" (§3.1)
- avg +16.6 pp over llm-as-a-judge on VitaBench, Agent-SafetyBench, Deceivers, 7 agent models
top-down atomic decomposition
- split intent into facts f_i: (I, τ) → {0,1}
  - each binary, grounded in observable evidence, context-minimal
- ask llm only the yes/no atomic questions
context-aware extraction
- parse structured fields (json, numbers, labels) deterministically first
- llm only for semantic facts, over a projected minimal context
- extraction faithfulness stays trusted
  - Verus can prove properties of supplied values, not that nl extraction is faithful
layered Dafny proof
- 3 layers: atomic constants, derived predicates, safety predicates
- verdict = conjunction of predicates, decided by Z3
formal feedback refinement
- return spec + violated constraints to the agent, regenerate, 3 rounds
- Agent-SafetyBench, Claude-4.5-Opus: 70.7% → 99.8%
  - few-shot 83.5%, CoT 85.5% at round 3
  - Qwen-7B 30.8% → 49.4%, Qwen-14B 34.3% → 74.2%
- Deceivers (200 deceptive + 200 honest trajectories per config)
  - FormalJudge 91-96% across agent sizes
  - llm judges 78-85% on 7B agents, 62-71% on 72B agents
limits
- residual errors from llm decomposition and extraction; formal step "cannot resolve" nl translation
- trusted: extracted facts, intent-to-predicate mapping, trajectory parser, Dafny, Z3, ground truth
