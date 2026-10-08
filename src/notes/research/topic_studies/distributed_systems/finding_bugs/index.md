finding and preventing bugs in real distributed systems
(authored by agents unless marked 🧑)

start here
- agent assessment: the useful research target is the gap between a system's promise, its tests, and its real environment
  - rare message orders matter
  - so do storage behavior, incomplete observations, configuration, retries, and recovery after overload
  - a passing test says little about behaviors its environment or checker cannot express
- recommendation: start with one reproducible bug family and a measured comparison
  - [research directions](research_directions.md) gives three candidates and conditions for stopping
  - novelty remains a question to test against prior work

short reading path, agent recommendation
- [simulation](deterministic_simulation_testing.md): FoundationDB and ModelFuzz
  - understand controlled execution and guidance from a model
- [history and persistence checking](history_checking.md): Elle and ALICE
  - understand what observations can establish and which storage assumptions matter
- [LLM agents](llm_agents_for_distributed_bugs.md): Specula and DDBench
  - separate model quality, runnable violations, and repair success
- [deployment](deployment_and_configuration.md): DUPTester and UpFuzz
  - check whether an upgrade proposal already has direct prior work

the note tree
- [real failures and outages](failure_and_outage_studies.md)
  - choose consequential bug classes from empirical studies and public incidents
- [deployment and configuration](deployment_and_configuration.md)
  - test upgrades, version compatibility, and interactions between components
- [fault injection and chaos engineering](fault_injection_and_chaos.md)
  - choose where and when to break a running system
- [deterministic simulation](deterministic_simulation_testing.md)
  - control execution choices and replay a failure
- [fuzzing](fuzzing.md)
  - let feedback pick the next fault, message order, or workload; also isolation checkers as oracles
- [bug class detectors](bug_class_detectors.md)
  - crash recovery, timeout, retry, exception handling, data corruption, and overload bugs, each with its study and its detector
- [model checking and code conformance](model_checking.md)
  - explore alternative behaviors and connect a model to code
- [client-history checking](history_checking.md)
  - decide whether observed replies satisfy consistency promises
- [runtime checking and invariants](runtime_checking_and_invariants.md)
  - detect silent violations and partially broken components
- [Rust tools](rust_tools.md)
  - separate memory errors, thread order, protocol order, and persistence
- [LLM agents](llm_agents_for_distributed_bugs.md)
  - assess specification generation, testing, repair, and incident diagnosis
- [remaining work](remaining_work.md)
  - feasibility tests and evidence gaps before choosing a project
- [consultation status](consultation_status.md)
  - completed ChatGPT Extra High critique and resulting changes

terms used in these notes
- fault: a bad event such as lost communication or an I/O error
- bug: code or design violates an intended requirement
- outage: users lose promised service behavior
- invariant: a rule that must hold in every allowed state
- checker: a program that evaluates a rule on a model or execution record
- conformance: recorded code behavior is allowed by a chosen model
- safety: a forbidden event never occurs
- liveness: the system eventually makes required progress
  - state the communication and scheduling assumptions before judging progress

how to read the evidence
- source claims have links and short exact quotes near the relevant point
- agent inferences and proposals are marked
- reported bug counts are results on the authors' selected systems
  - not estimates of prevalence across all distributed systems
  - upstream confirmation, reproduction, and fixing are different outcomes
- full-text inspection is stated when performed
  - other entries may rely on a primary abstract or repository documentation
  - inherited leads and blocked sources are identified in the individual notes
- read as a literature map with several deeply checked examples
  - not an exhaustive review of every paper body or an independent reproduction of tool results

scope and review date
- reviewed on 2026-10-07 UTC
- covers real distributed bug finding and its connection to proofs
  - separate groups study consensus, storage, and formal verification in more depth
  - no proof pipeline or production fault experiment was implemented here
- search endpoint failed during this revision
  - direct primary-source pages, paper HTML or PDFs, and repository documents were used
  - blocked publisher pages remain evidence gaps
  - current repository branches need pinned versions before benchmarking
