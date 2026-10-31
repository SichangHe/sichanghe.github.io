# Sources for the agent evaluation procedure, by check id
(authored by agents unless marked 🧑)

L means a literature source (database record or review note). The tag after a `db:` id records reading depth: `most`, `parts`, `abstract_or_first_pages`, or `metadata_only`. Only `most` means the paper was read closely; the others provide weaker support. These citations support individual checks, not a validation of the complete procedure.

## S2
- L r7 "A proposed distributed and liveness evaluation protocol" (Independent intent packet)

## S3
- L r7 "A proposed distributed and liveness evaluation protocol"

## S4
- L r7 "A proposed distributed and liveness evaluation protocol" (Negative controls: pin a receipt; logs from another state do not certify)

## K2 (old K1)
- L db:vericoding-benchmark-2025 [most]; L db:axdafny-2026 [abstract_or_first_pages]; L a-agents "C1. The Prover Is the Judge" (names pragma Assume and SPARK_Mode => Off); L r7 "A proposed distributed and liveness evaluation protocol" (Negative controls)

## K3 (old K2)
- L db:fewer-assumptions-by-design-2026 [most]; L db:autoverus-verus-bench-2025 [most]; L db:vero-2026 [most]; L r7 "TickTock: measured replay distributions and explicit trust exemptions"

## K4 (old K3)
- L db:the-prover-is-the-judge-2026 [parts] (code excluded from proof).

## K5 (old K4)
- L a-agents "C2. Axon"; L db:axon-2026 [parts]; L db:autoverus-verus-bench-2025 [most]; L db:verusage-2025 [most]; L db:cryptoprover-2026 [parts]

## K6 (old K5)
- L db:reward-hacking-in-dafny-2026 [parts]; L db:vericoding-benchmark-2025 [most]; L db:faults-in-our-formal-2026 [most] (mechanical vacuity and unsound-axiom screens); L r7 "Synthetic-data contamination and leakage"

## K9 (old K8)
- L r7 "Synthetic-data contamination and leakage"

## R1
- L r7 "A proposed distributed and liveness evaluation protocol" (Negative controls)

## R2 (old R2+R3)
- L db:verina-2026 [most] (a test pass without a proof is not a pass); L db:cazamariposas-2025 [metadata_only]; L a-eval "Pitfalls" (verifier instability)

## M1
- L db:an-empirical-study-of-2026 [most] (equivalent, stronger, weaker)

## M2 (old M3)
- L db:intent-formalization-2026 [most] (only the user can say whether a spec is right).

## M4 (old M5)
- L db:misconceptions-in-finite-trace-2024 [parts] (weak support: shows people read temporal logic differently; the check itself is derived)

## M5 (old M6)
- L db:flp-1985 [parts]; L db:dls-partial-synchrony-1988 [parts]; L db:impossiblebench-2025 [parts] (related: impossible tasks seeded by a task author; using the idea at evaluation time is mine)

## M6 (old M7)
- L db:spec-harness-formerly-veriact-2026 [most]; L db:ironspec-2024 [most]; L db:nl2postcond-2024 [most]

## M7 (old M8)
- L db:assessing-postcondition-completeness-in-2026 [most] (deterministic programs only; the nondeterminism caveat is mine); L r7 "User-intent formalization in verification-aware languages"

## M8 (old M9)
- L r7 "User-intent formalization in verification-aware languages" (client consequences from the abstract contract)

## M9 (old M10)
- L db:vacuity-detection-in-temporal-1999 [abstract_or_first_pages]; L db:sanity-checks-in-formal-2006 [abstract_or_first_pages]

## M10 (old M11)
- L db:consistency-checking-in-requirements-2017 [metadata_only] (weak: a doctoral proposal, metadata only; smallest clashing group comes from it)

## M11 (old M12)
- L db:what-s-live-2021 [most]

## W1 (old W1+W2)
- L db:nl2postcond-2024 [most]; L db:mutdafny-2026 [most] (mutates implementation code; applying it to the model is an adaptation); L db:a-theory-of-mutations-2008 [abstract_or_first_pages]; L db:a-practical-approach-to-2001 [abstract_or_first_pages]; L db:coverage-metrics-for-formal-2006 [abstract_or_first_pages]; L r7 "MutDafny: mutation survival needs adjudication"; L r7 "A proposed distributed and liveness evaluation protocol" (Specification adequacy); L db:concur-2026 [abstract_or_first_pages] (candidate source of seeded-mutant cases, abstract only)

## W2 (old W3)
- L r7 "A proposed distributed and liveness evaluation protocol" (Specification adequacy: reverse checks)

## W3 (old W4)
- L db:liveness-checking-of-the-2023 [abstract_or_first_pages] (abstract only; a testing paper, lists known violations in PBFT, Casper FFG, early Tendermint, FaB); L r2 "LiDO, LiDO-DAG, and a 2026 liveness bug"; L a-eval "Liveness"

## L2
- L r7 "A proposed distributed and liveness evaluation protocol" (Liveness claims, built-in progress)

## L3
- L db:anvil-2024 [most] (faults eventually stop)

## L5
- L r7 "A proposed distributed and liveness evaluation protocol" (Liveness claims: implementable scheduler or network)

## L6
- L a-eval "Liveness" (agent recommendation); L r7 "A proposed distributed and liveness evaluation protocol" (Liveness claims)

## L7
- L r7 "A proposed distributed and liveness evaluation protocol" (Liveness claims: weak and strong fairness); L db:ensuring-liveness-properties-of-2020 [abstract_or_first_pages] (abstract only: fairness can lead to false conclusions)

## L8
- L db:implicit-rankings-2025 [most]; L r2 "LVR and implicit ranking functions"; L db:lion-2026 [parts]. The three allowed forms of "why it ends" are a plain summary of the first two.

## L9 (old L9+L10)
- L r7 "A proposed distributed and liveness evaluation protocol" (Liveness claims: lasso, symmetry and state constraints)

## L10 (old L11)
- L db:lion-2026 [parts]

## T1
- L db:anvil-2024 [most]; L db:igloo-2020 [parts]; L db:lion-2026 [parts] (no refinement proof from runtime to model)

## T2
- L db:fonseca-study-2017 [most]; L db:tla-trace-validation-2024 [parts]

## T4
- L db:trillium-2024 [most]; L db:lion-2026 [parts]

## T5
- L db:the-prover-is-the-judge-2026 [parts] (every obligation passed but the first packet failed against OpenSSH); L db:fonseca-study-2017 [most]

## T6
- L db:fidelity-probes-2026 [abstract_or_first_pages] (abstract only when the database was built); L db:clover-2024 [most] (related: code, contract and docs checked for agreement)

## T7
- L db:tla-trace-validation-2024 [parts]; L db:tracelink-2025 [most]; L db:ccf-smart-casual-verification-2025 [parts]; L db:elle-2020 [parts] (related: history checker)

## T8
- L db:fonseca-study-2017 [most] (all 16 bugs at the edges); L db:axon-2026 [parts] (bugs outside the proofs)

## E1 (old M2+E1)
- L db:claimcheck-2026 [abstract_or_first_pages] (abstract only, a small own test); L db:faithful-autoformalization-via-roundtrip-2026 [abstract_or_first_pages] (describes the stronger formal-English-formal loop, offered as an option); L r7 "A proposed distributed and liveness evaluation protocol" (Independent intent packet); L db:intent-formalization-2026 [most]

## E2
- L db:cryptoprover-2026 [parts] ("completion report is not evidence")

## Verdict rule
- L r7 "A proposed distributed and liveness evaluation protocol" (Per-property evidence level; model proof versus code tie)

## Hand back
- L db:beyond-compilation-2026 [parts] (compiles versus faithful as two numbers); L r7 "A proposed distributed and liveness evaluation protocol" (Scores and budgets)

## Not covered
- L r7 "A proposed distributed and liveness evaluation protocol" (Task modes, Scores and budgets); L db:clarifycodebench-2026 [parts]; L a-eval "Human studies and clarification"

## Appendix A
- L a-agents "C1. The Prover Is the Judge"; L a-agents "C4. Vericoding benchmark"; L db:axdafny-2026 [abstract_or_first_pages] (Dafny cheat patterns, abstract only); L r7 "A proposed distributed and liveness evaluation protocol" (Negative controls). Tool-specific entries also use general tool knowledge; these citations do not establish their execution results.

## Appendix B
- L r7 "A proposed distributed and liveness evaluation protocol" (Liveness claims, false-green cases)

## Appendix C
- L r7 "A proposed distributed and liveness evaluation protocol" (Negative controls)

## Appendix D
- L db:what-s-live-2021 [most]

## Appendix E
- L r7 "MutDafny: mutation survival needs adjudication" (closing paragraph, Distributed/liveness inference); L db:mutdafny-2026 [most]
