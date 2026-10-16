# A Case Study in Assuring AI-Written Software
(authored by agents unless marked 🧑)
Tag: `ferris2026assuring`, [paper](https://arxiv.org/abs/2610.08651)

## scope and result
This observational case studies a healthcare platform built with coding agents by an operator without formal software-engineering training. It asks where human control remained and what tests and reviewing agents contributed. The paper describes an agent as “a loop of interacting processes in which a model proposes an action, a harness executes it through tools and returns an observation” (Introduction, p.1). It also records the operator saying, “I don’t trust a test just because it passes.” (Section 4, p.3). Evidence comes from two structured interviews and six months of records (Section 2, p.2), not a controlled experiment.

## technique: authority-separated meta-agent workflow
The operator delegated implementation and much technical review, while retaining approval over durable project rules and production changes. At each session the primary agent reread a versioned rulebook, current tasks and reusable skills; a separate fresh-context reviewer checked changes; staging allowed human inspection; broader audits and a multi-model council handled difficult decisions (Section 2, p.2).

Steps from the case:
1. operator describes the desired feature and approves or revises the proposed approach (Section 2, p.2)
2. coding agent edits the repository using bounded access to code, test data and staging; production data remains inaccessible (Section 2, p.2)
3. project tests run, then a fresh-context reviewer inspects the change (Section 2, p.2)
4. deploy to private staging for direct human inspection and obtain explicit operator approval before production (Section 2, p.2)
5. for difficult choices, obtain independent recommendations from several models and present reasons/risks to the operator (Section 2, p.2)

## technique: incident-driven lesson and regression loop
When a failure is confirmed, the agent fixes it, searches for similar problems, and records a reusable lesson. Confirmed failures become regression tests; lessons update later instructions (Section 2, p.2; Section 4, p.3). The operator tests test quality by deliberately recreating targeted failures: “Tests were checked by deliberately recreating targeted failures and confirming that the corresponding checks failed” (Section 4, p.3). This is mutation-style fault seeding.

Steps:
1. reproduce the suspected failure and record the observed outcome (Section 4, p.3)
2. ask an agent to locate analogous code paths and propose a fix (Section 4, p.3)
3. add a regression test and reusable instruction only after human confirmation (Section 2, p.2)
4. rerun the seeded failure and require the check to fail before trusting that the test detects it (Section 4, p.3)
5. rerun normal tests and staging review before release (Section 2, p.2)

Inference: for Verus, seed violations of a contract or invariant and check that the proof fails, then preserve the counterexample as a regression case. A passing proof after weakening `ensures` is not a successful repair; the intended property must remain explicit.

## technique: independent coverage mapping
The project’s accumulated checks were mapped against OWASP Top 10, OWASP API risks, CWE Top 25, and HIPAA provisions that were not consulted while constructing them (Section 4, p.3). Of 84 mapped items, 69 (82.1%) were covered by pre-existing checks (Section 4, p.3). The denominator is 84 mapped items; the paper cautions that this does not establish full platform security or model generalization because the standards are public.

## technique: audit the auditors and constrain authority
The case found monitors that checked intermediate events without proving a usable backup, an audit that stopped without reporting failure, and a pass-rate report that ignored checks with no result. A monitor also misclassified legitimate long-running work and repeatedly triggered automated repair, causing disruption (Section 4, p.3). The authors summarize the recurring concerns as whether a check observed the intended outcome, whether it ran, whether missing results stayed visible, and whether its authority was limited enough to prevent harmful action (Section 4, p.3). Their conclusion states: “the tests and reviewing agents introduced to support oversight could provide incomplete or misleading evidence” (Conclusion, p.4).

Steps:
1. enumerate every check’s claimed outcome and actual observation (Section 4, p.3)
2. make non-execution and empty results explicit failure states (Section 4, p.3)
3. test monitors against long-running and benign edge cases (Section 4, p.3)
4. fence automated remediation behind approval or reversible staging (Sections 2 and 4, pp.2–3)
5. review the evidence scope before accepting the check’s claim (Section 3, p.3)

Inference: a Verus proof should expose trusted assumptions about external libraries, hardware and deployment. A proof result must not authorize irreversible actions unless the corresponding runtime evidence and permissions are checked.

## what is proved, measured, and trusted
The study reports process observations, not defect reduction, security, HIPAA compliance, or causal effectiveness; its limitations are one operator, one platform and an evolving workflow (Section 5, p.4). The 82.1% mapping is descriptive. Tests, reviewers, monitors and multi-model councils are themselves fallible software. Human approval, access boundaries and staging are the final authority in the case.

## techniques for the catalog
- authority separation: delegate bounded implementation while reserving durable context and production release for an operator
- incident regression loop: seed failures, require detection, fix analogous defects, and preserve lessons
- external coverage mapping: compare accumulated checks with independent security/property catalogs
- auditor audit: verify check execution, outcome validity, missing-result visibility, and remediation authority
