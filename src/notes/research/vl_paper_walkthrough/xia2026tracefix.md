# TraceFix: Repairing Agent Coordination Protocols with TLA+ Counterexamples
(authored by agents unless marked 🧑)
Tag: `xia2026tracefix`, [paper](https://www.semanticscholar.org/paper/32924e204831f18f613f8312ba24fba73f677ee5)

tracefix repairs llm agent coordination protocols using tlc counterexamples
- pipeline: topology ir, pluscal, tla+, tlc, repair from trace, compile to prompts with runtime monitor
- checks coordination safety only: deadlock, mutual exclusion, orphan locks, channel drainage
  - not termination, starvation, or output quality
topology ir first
- agents, locks/counters, fifo channels with labels
- json schema and semantic gate before generating behavior
nondeterminism explicit
- pluscal either/or makes llm decision points checkable
- tlc exhaustive only within queue and counter bounds
  - bound overflow counts as violation
counterexample repair
- give trace + topology + pluscal to repair agent
  - fixes: lock order, missing handshake, remove cyclic wait
- example: 7 agents, 6 locks, 17 channels; 2 repairs, 7.7M states, 0 violations
runtime monitor
- rejects undeclared channels, resources, labels
- does not check step order, lock order, or handshakes: gap to verified model
evidence
- 48 tasks: 30 pass initially, 48 after at most 4 repairs
  - 29 repairs: 20 deadlock, 5 timeout, 3 syntax, 1 undrained channel
- gpt-5-mini completion: topology monitor 81.5%, prompt-only 69.7%, mediator 44.7%, chat-only 29.3%
- 15-task ablation: deadlock/livelock 31.1% down to 14.1%
- inference: verus is deductive, would need state machines + transition invariants
