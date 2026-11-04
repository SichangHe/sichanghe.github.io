# Reality Is the Final Verifier: On Two Key Gaps in Agentic Software Engineering
(authored by agents unless marked 🧑)
Tag: `krentsel2026reality`, [paper](https://www.semanticscholar.org/paper/78658443c0bc5d9138c50f1b6536c338987bfdc4)

position paper, no new benchmark
- synthesizes prior incidents and formal-methods literature
inner loop: change implementation P until evaluator E(P, R, M) = pass
- R = requirements approximating stakeholder intent I
- M = environment model approximating real world W
- even a formal proof of P against R under M cannot guarantee stakeholders accept deployed behavior
two gaps are external to the inner loop
- requirement gap: I vs R (omission, ambiguity, conflict, change)
- model gap: W vs M (hardware, dependencies, workloads, failures)
- strengthening R does not repair an unrepresentative M
- formal methods "shift the gaps but do not close them"
- more reviewer agents do not help if they share the same incomplete artifacts
- evidence: kv store got 6x throughput by regenerating predictable benchmark values, passing correctness tests (one incident)
fix: outer assurance-revision loop
- use deployment evidence (monitors, logs, incidents, stakeholder judgment) to revise R, M, or E, then rerun inner loop
- humans keep authority over high-stake judgments (design claim, not tested)
- limit exposure meanwhile: staged rollout, sandbox, least privilege, rollback
- needs interpretable logs and monitors that cover relevant behavior
assurance as resource allocation
- human review for ambiguity, authority boundaries, surprising outcomes, high consequence
- agents triage logs, draft monitors, propose revisions
- cascaded evaluators: cheap checks first, then simulation, proof, real deployment evidence
- gaps narrow when intent is authoritative, world has a stable formal interface, or a reference implementation exists
Verus implications (inference)
- Verus proves only the encoded contract, not that it matches I or that external assumptions match W
- list each assumption (`requires`, trusted external contract) with deployment evidence
- monitor findings trigger spec review, never auto-weakening of `ensures`
