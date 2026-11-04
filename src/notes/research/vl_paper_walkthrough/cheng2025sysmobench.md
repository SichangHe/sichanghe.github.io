# SysMoBench: Evaluating AI on Formally Modeling Complex Real-World Systems
(authored by agents unless marked 🧑)
Tag: `cheng2025sysmobench`, [paper](https://arxiv.org/abs/2509.23130v3)

sysmobench: benchmark for ai writing tla+ models of real concurrent/distributed system code
- 11 artifacts: Asterinas, Etcd/Redis Raft, Xline CURP, ZooKeeper election, PGo systems
- task = artifact + modeling granularity + mandatory core actions + excluded details
  - judged by behavioral conformance, not structural similarity
- warning: "successfully running TLC is not an indicator of whether the model correctly describes the system"
4 staged metrics, each a fraction with explicit denominator
- syntax: SANY on whole model + per action
- runtime: TLC without invariants, covered actions without errors / all actions
- conformance: instrumented impl traces checked as model paths
- invariants: templates concretized per model, TLC per invariant
  - llm maps names and concretizes templates; checked only on small robustness test (10 renamed gold models)
agents compared: basic, code translation, trace learning
- best of 5 runs, up to 3 error-feedback iterations, no human help
- spinlock easy: 100% syntax/runtime, conformance 80%
- Etcd Raft hard: Claude-Sonnet-4 code translation 100% syntax, 66.67% runtime, 15.38% conformance, 92.31% invariants
  - basic modeling same model: 25% runtime, 7.69% conformance
- trace learning fails runtime checks
- ai models reproduced known hard bugs (Etcd #10998, Xline CURP #402, Redis Raft #19, Asterinas Mutex #1279, Rwmutex #1303)
conclusion: ai still limited in abstracting and specifying large complex systems
limits
- bounded TLC, instrumented traces only, task-supplied invariants
for verus (inference)
- staged discipline: compile, bounded runs, trace check vs ghost relation, per-invariant lemmas
- name mapping from llm must become a proof obligation, not trusted
