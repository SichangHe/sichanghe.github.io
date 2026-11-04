# A Unit Proofing Framework for Code-level Verification: A Research Agenda
(authored by agents unless marked 🧑)
Tag: `amusuo2025unit`, [paper](https://arxiv.org/abs/2410.14818v2)

research agenda + exploratory FreeRTOS study; proposed tools not built
- unit proofing = decompose, build proofs + environment models, repair faulty proofs, maintain as code changes
- BMC (CBMC) checks each function harness within a bound
passing proofs miss real bugs
- recreated 11 FreeRTOS memory-safety CVEs (of 21) by removing the fixing validation
  - default proofs exposed 5/11; after repairing models/configs, 11/11 + new CVE-2024-38373
  - denominator = 11 reproducible cases only
- 4 fault classes
  - insufficient verification properties
  - insufficient input modeling, e.g. CVE-2018-16527 assumed packet always has header
  - insufficient function modeling, e.g. CVE-2018-16524 model skipped pointer validity check
  - out-of-date proofs, e.g. CVE-2018-16525 signature changed but proof not updated
- over-constrained models hide bugs, under-constrained give false positives
proposed tools (no evaluation)
- decomposer: estimate verification cost, replace expensive functions with models, or partition call graph
- builder: refine generic models until reachable code is covered
- repairer: fault taxonomy, program analysis + LLM reasoning
- updater: find invalidated proofs, update, reverify, compare coverage
Verus takeaways (inference)
- audit assumptions and trusted callee specs, not just verifier pass
- check an agent repair removes the real defect, not just the reported violation
- track stale contracts as code evolves
