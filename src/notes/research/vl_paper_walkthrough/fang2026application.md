# Towards Tackling Application Logic Flaws through Autonomous Formal-Logic Modeling and Automated Reasoning
(authored by agents unless marked 🧑)
Tag: `fang2026application`, [paper](https://www.semanticscholar.org/paper/1bb507f587f52eac393fdef6db6cbc91f1022100)

ll-verifier: llm agents formalize protocol text into Les models, compiled to maude, model-checked against ltl goals
- targets application-logic flaws (design assumptions), not memory bugs
- 35 flaws (30 new) on 27 devices from 28 iot vendors, new ones confirmed on real devices
- 29-protocol logic-modeling bench
Les language
- guardrailed algebraic types: principals, attributes, events, states
- state-transition rules (deterministic) vs event-generation rules (non-deterministic by default)
- marking a principal untrusted makes its rules non-deterministic, threat rules override on equal premises
- compiles to maude rewrite theory then logical state machine
agent pipeline
- AgentS writes state rules, AgentE writes event rules reusing AgentS event names
- each has a guardrail agent: lark ebnf grammar check (<=3 repairs), then semantic checks (e.g. rhs-only variables)
- 3 repairs sufficed for grammar on all 29 protocols
- benchmark coverage: principals 98.3%, attributes 99.3%, rules 96.8%, properties 64.3%
  - 65.5% of flaws checked without human help, others need avg 2.3 manual fixes
- ablation vs direct maude (iRobot, Aqara, August): 27/44 rules, 27/30 attributes covered
checking
- security goal = ltl violation trace; check negation, counterexample = attack trace
- replay trace on real device, classify flaw
- soundness only within the model and threat model, no false positives in scope
  - not proved: llm model completeness, threat assumptions, implementation conformance
- cost: 462 ms average run, 2,564 lines python + 157 lines maude
verus relevance (inference)
- bounded counterexample search for attack traces, then inductive invariant proof for safety
- grammar check before verifier, verifier decides semantic correctness
