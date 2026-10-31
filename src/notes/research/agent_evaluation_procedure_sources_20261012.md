# Sources for the agent evaluation procedure, by check id
(authored by agents unless marked 🧑)

Evaluators do not need this file. It is for the human and for whoever maintains the procedure.

L means a literature source (database record or review note). P means this project: an audit, an audit brief, or the earlier evaluation plan. "mine" marks a method that is my inference. The tag after a `db:` id is the record's reading depth when the database was built: `most`, `parts`, `abstract_or_first_pages`, or `metadata_only`. Only `most` means the paper was read closely; the others are weaker support.

Paths:

The second revision (after the dry run on the election result) changed wording only, not ids: M1/M2 agreement, W1 "depends on", L2 "gives the conclusion", L9 no-tool rule, S1 order, K3/K4 details, copy command. Ids below are current as of 16 Oct.

The third revision (after the dry run on the counter result) changed wording only, not ids and not checks: T1 to T4 only set the level (T2 and T3 no longer fail a claim), L9 is n/a when no model checker exists for the model's language, "natural reading" defined, W1 witness-only kills count as survivors, S1 opens only the prompt file, `$W` replaces `work/`, K2 ignores a script's own grep, proof size defined, M6 unknown counts, L7 fairness on messages, wall-clock minus pauses. The sources of T2/T3 stay as they were; only the consequence of a fail changed, which is my choice, not a source's.

Ids in the first draft differ in places. The old id is shown in parentheses where it changed. Merges: R3 into R2; M2 into E1; W2 into W1; L10 into L9. Dropped: W5 (rename and reorder; its source is about models trained against a verifier, and re-verifying a finished proof tests solver luck, which R2 covers).

## S1
- P plan "A task packet"; P GR "one cause shared by all four"; P RV "all three" (wrong model name recorded for runs)

## S2
- P plan "A task packet" (stable id per guarantee); L r7 "A proposed distributed and liveness evaluation protocol" (Independent intent packet); P RV "where each falls short" (reading choices); P RV "all three" (request authorship unconfirmed); mine: the stop rule, one claim per sentence

## S3
- P plan "A task packet"; P plan "Checks and measurements" (items 2, 3); L r7 "A proposed distributed and liveness evaluation protocol"

## S4
- L r7 "A proposed distributed and liveness evaluation protocol" (Negative controls: pin a receipt; logs from another state do not certify); P GR "what the retries should change (recommendations)" (evaluator runs after the worker)

## S5
- P AB "facts"; P bench/check.sh. The Docker image path was found by running `docker run --rm vd-bench ls /opt`.

## S6
- P plan "A task packet" (separate task groups); P GR "problems in the current retry plan"

## K1 (old M0)
- P GR "one cause shared by all four"; P RV "what holds in all three"; P V "invalid: all four gap experiments"

## K2 (old K1)
- L db:vericoding-benchmark-2025 [most]; L db:axdafny-2026 [abstract_or_first_pages]; L a-agents "C1. The Prover Is the Judge" (names pragma Assume and SPARK_Mode => Off); L r7 "A proposed distributed and liveness evaluation protocol" (Negative controls); P bench/check.sh (grep list). Note: the db record for the-prover-is-the-judge holds only one quote, so the cheat names come from the a-agents note.

## K3 (old K2)
- L db:fewer-assumptions-by-design-2026 [most]; L db:autoverus-verus-bench-2025 [most]; L db:vero-2026 [most]; L r7 "TickTock: measured replay distributions and explicit trust exemptions"; P RV "what holds in all three"; P V "second pass: testing the twelve runs by experiment" (vstd axioms unchecked); P bench/check.sh

## K4 (old K3)
- P GR "election (`vague_bench/election/`) — never verified, and unsafe as written"; P V "valid with limits: all twelve translation runs" (a script that takes no options); L db:the-prover-is-the-judge-2026 [parts] (code excluded from proof). The strict-switch condition replaces an earlier fail rule after two dry runs.

## K5 (old K4)
- L a-agents "C2. Axon"; L db:axon-2026 [parts]; L db:autoverus-verus-bench-2025 [most]; L db:verusage-2025 [most]; L db:cryptoprover-2026 [parts]

## K6 (old K5)
- L db:reward-hacking-in-dafny-2026 [parts]; L db:vericoding-benchmark-2025 [most]; L db:faults-in-our-formal-2026 [most] (mechanical vacuity and unsound-axiom screens); L r7 "Synthetic-data contamination and leakage"; P GR "broadcast (`vague_bench/broadcast/`) — passes the checker, proves nothing"; P V "valid with limits: all twelve translation runs" (typing predicate that is true)

## K7 (old K6)
- P AB2 "what to establish" (item 4); P V "second pass: testing the twelve runs by experiment"; P V "valid with limits: all twelve translation runs" (empty cross-check directories)

## K8 (old K7)
- P V "invalid: all four gap experiments" (report lines the files contradict); P GR "what the retries should change (recommendations)" (a report counts only after the evaluator check)

## K9 (old K8)
- P GR "problems in the current retry plan"; P plan "A task packet"; L r7 "Synthetic-data contamination and leakage"

## R1
- L r7 "A proposed distributed and liveness evaluation protocol" (Negative controls); P plan "A manageable first study"; tested 13 Oct 2026 in vd-bench (Appendix C results)

## R2 (old R2+R3)
- L db:verina-2026 [most] (a test pass without a proof is not a pass); L db:cazamariposas-2025 [metadata_only]; L a-eval "Pitfalls" (verifier instability); P plan "Checks and measurements" (item 5); P GR "verdict"; P bench/check.sh

## M1
- P plan "Checks and measurements" (item 1); L db:an-empirical-study-of-2026 [most] (equivalent, stronger, weaker); P AB "what to establish" (item 3); P ABG "what to establish" (item 4); P RV "where each falls short" (a theorem graded same that is weaker)

## M2 (old M3)
- P RV "where each falls short"; P ABG "what to establish" (item 4); L db:intent-formalization-2026 [most] (only the user can say whether a spec is right). The test cases are from RV.

## M3 (old M4)
- P AB "what to establish" (item 3); P V "valid with limits: all twelve translation runs"; P RV "what holds in all three"; P GR "what the retries should change (recommendations)" (item 3)

## M4 (old M5)
- L db:misconceptions-in-finite-trace-2024 [parts] (weak support: shows people read temporal logic differently; the check itself is derived); P GR "what the retries should change (recommendations)" (item 3, behaviors as infinite sequences)

## M5 (old M6)
- L db:flp-1985 [parts]; L db:dls-partial-synchrony-1988 [parts]; L db:impossiblebench-2025 [parts] (related: impossible tasks seeded by a task author; using the idea at evaluation time is mine); P plan "What a successful result must establish"

## M6 (old M7)
- L db:spec-harness-formerly-veriact-2026 [most]; L db:ironspec-2024 [most]; L db:nl2postcond-2024 [most]; P plan "Checks and measurements" (items 2, 3)

## M7 (old M8)
- L db:assessing-postcondition-completeness-in-2026 [most] (deterministic programs only; the nondeterminism caveat is mine); L r7 "User-intent formalization in verification-aware languages"; P GR "broadcast (`vague_bench/broadcast/`) — passes the checker, proves nothing"

## M8 (old M9)
- L r7 "User-intent formalization in verification-aware languages" (client consequences from the abstract contract)

## M9 (old M10)
- L db:vacuity-detection-in-temporal-1999 [abstract_or_first_pages]; L db:sanity-checks-in-formal-2006 [abstract_or_first_pages]; P plan "Liveness needs an explicit assumption check"; P AB2 "what to establish" (item 3); P RV "where each falls short" (an example run that takes 7 steps then waits)

## M10 (old M11)
- L db:consistency-checking-in-requirements-2017 [metadata_only] (weak: a doctoral proposal, metadata only; smallest clashing group comes from it); mine: the rest

## M11 (old M12)
- P GR "what the retries should change (recommendations)" (item 3); P RV "what holds in all three"; P RV "where each falls short" (repair: completion is one atomic write); P V "valid with limits: all twelve translation runs"; L db:what-s-live-2021 [most]; P plan "Liveness needs an explicit assumption check" (assumption categories)

## W1 (old W1+W2)
- L db:nl2postcond-2024 [most]; L db:mutdafny-2026 [most] (mutates implementation code; applying it to the model is an adaptation); L db:a-theory-of-mutations-2008 [abstract_or_first_pages]; L db:a-practical-approach-to-2001 [abstract_or_first_pages]; L db:coverage-metrics-for-formal-2006 [abstract_or_first_pages]; L r7 "MutDafny: mutation survival needs adjudication"; L r7 "A proposed distributed and liveness evaluation protocol" (Specification adequacy); L db:concur-2026 [abstract_or_first_pages] (candidate source of seeded-mutant cases, abstract only); P plan "Checks and measurements" (item 3: no-op implementation); P GR "what the retries should change (recommendations)" (item 4); P V "second pass: testing the twelve runs by experiment"; P RV "where each falls short" (accepted wrong changes)

## W2 (old W3)
- L r7 "A proposed distributed and liveness evaluation protocol" (Specification adequacy: reverse checks); P plan "Checks and measurements" (item 2); P V "second pass: testing the twelve runs by experiment"

## W3 (old W4)
- L db:liveness-checking-of-the-2023 [abstract_or_first_pages] (abstract only; a testing paper, lists known violations in PBFT, Casper FFG, early Tendermint, FaB); L r2 "LiDO, LiDO-DAG, and a 2026 liveness bug"; L a-eval "Liveness"

## L1
- P plan "Liveness needs an explicit assumption check"; P RV "where each falls short"; P ABG "what to establish" (item 5)

## L2
- P RV "where each falls short" (the content assumption); P plan "Liveness needs an explicit assumption check"; L r7 "A proposed distributed and liveness evaluation protocol" (Liveness claims, built-in progress)

## L3
- P plan "Liveness needs an explicit assumption check" (reject a claim whose assumptions exclude a required run); P RV "where each falls short" (agreement only once clients stop); L db:anvil-2024 [most] (faults eventually stop)

## L4
- P RV "what holds in all three"

## L5
- L r7 "A proposed distributed and liveness evaluation protocol" (Liveness claims: implementable scheduler or network); P RV "where each falls short" (election, patient)

## L6
- L a-eval "Liveness" (agent recommendation); L r7 "A proposed distributed and liveness evaluation protocol" (Liveness claims); P plan "Liveness needs an explicit assumption check" (forever delayed enabled action); mine: the no-assumption branch

## L7
- L r7 "A proposed distributed and liveness evaluation protocol" (Liveness claims: weak and strong fairness); P plan "Liveness needs an explicit assumption check"; L db:ensuring-liveness-properties-of-2020 [abstract_or_first_pages] (abstract only: fairness can lead to false conclusions)

## L8
- L db:implicit-rankings-2025 [most]; L r2 "LVR and implicit ranking functions"; L db:lion-2026 [parts]. The three allowed forms of "why it ends" are a plain summary of the first two.

## L9 (old L9+L10)
- P plan "Checks and measurements" (item 6: an artificial cap can introduce misleading cycles); L r7 "A proposed distributed and liveness evaluation protocol" (Liveness claims: lasso, symmetry and state constraints); P V "second pass: testing the twelve runs by experiment" (TLC on supplied configs). Tested here: TLC starts in the image.

## L10 (old L11)
- P plan "Liveness needs an explicit assumption check" (deadline versus eventual); L db:lion-2026 [parts]; P RV "where each falls short"

## T1
- L db:anvil-2024 [most]; L db:igloo-2020 [parts]; L db:lion-2026 [parts] (no refinement proof from runtime to model); P plan "Checks and measurements" (item 4); P V "valid with limits: all twelve translation runs"; P RV "where each falls short" (counter: operations tied one at a time). The names whole-run proof, per-step proof, comments only, none are mine.

## T2
- P plan "Checks and measurements" (item 4); L db:fonseca-study-2017 [most]; L db:tla-trace-validation-2024 [parts]; P GR "what the retries should change (recommendations)"

## T3
- P V "what to run next (recommendations, in order)" (item 3: the Rust model allows every step); mine: the code-to-model direction

## T4
- P V "what to run next (recommendations, in order)" (item 5); P RV "where each falls short" (all three); L db:trillium-2024 [most]; L db:lion-2026 [parts]

## T5
- L db:the-prover-is-the-judge-2026 [parts] (every obligation passed but the first packet failed against OpenSSH); P plan "Checks and measurements" (item 4); L db:fonseca-study-2017 [most]

## T6
- L db:fidelity-probes-2026 [abstract_or_first_pages] (abstract only when the database was built); L db:clover-2024 [most] (related: code, contract and docs checked for agreement)

## T7
- L db:tla-trace-validation-2024 [parts]; L db:tracelink-2025 [most]; L db:ccf-smart-casual-verification-2025 [parts]; L db:elle-2020 [parts] (related: history checker)

## T8
- L db:fonseca-study-2017 [most] (all 16 bugs at the edges); L db:axon-2026 [parts] (bugs outside the proofs); P RV "where each falls short" (counter: unchecked driver); P V "valid with limits: all twelve translation runs" (public fields let unverified code break the invariant)

## E1 (old M2+E1)
- L db:claimcheck-2026 [abstract_or_first_pages] (abstract only, a small own test); L db:faithful-autoformalization-via-roundtrip-2026 [abstract_or_first_pages] (describes the stronger formal-English-formal loop, offered as an option); L r7 "A proposed distributed and liveness evaluation protocol" (Independent intent packet); P plan "A manageable first study"; L db:intent-formalization-2026 [most]

## E2
- L db:cryptoprover-2026 [parts] ("completion report is not evidence"); mine: the rule that a fail needs a reproduction

## Verdict rule
- P plan "What a successful result must establish" (report each check separately; unknown does not count as established); L r7 "A proposed distributed and liveness evaluation protocol" (Per-property evidence level; model proof versus code tie); mine: the first-match rules and the three policy choices

## Hand back
- L db:beyond-compilation-2026 [parts] (compiles versus faithful as two numbers); L r7 "A proposed distributed and liveness evaluation protocol" (Scores and budgets)

## Not covered
- L r7 "A proposed distributed and liveness evaluation protocol" (Task modes, Scores and budgets); L db:clarifycodebench-2026 [parts]; L a-eval "Human studies and clarification"

## Appendix A
- L a-agents "C1. The Prover Is the Judge"; L a-agents "C4. Vericoding benchmark"; L db:axdafny-2026 [abstract_or_first_pages] (Dafny cheat patterns, abstract only); L r7 "A proposed distributed and liveness evaluation protocol" (Negative controls). Verus entries tested. Dafny, Coq, Lean, Isabelle, TLAPS, Ivy entries are from general tool knowledge (mine) and untested.

## Appendix B
- P plan "Checks and measurements" (item 3); P GR "what the retries should change (recommendations)" (item 4); P RV "where each falls short"; L r7 "A proposed distributed and liveness evaluation protocol" (Liveness claims, false-green cases)

## Appendix C
- L r7 "A proposed distributed and liveness evaluation protocol" (Negative controls); P plan "A manageable first study"; tested

## Appendix D
- P plan "Liveness needs an explicit assumption check"; L db:what-s-live-2021 [most]

## Appendix E
- L r7 "MutDafny: mutation survival needs adjudication" (closing paragraph, Distributed/liveness inference); L db:mutdafny-2026 [most]
