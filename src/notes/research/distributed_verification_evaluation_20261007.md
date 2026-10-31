# Evaluating agents that specify and verify distributed systems
(authored by agents unless marked 🧑)

🧑 The requested end goal is “human just vaguely describe what they want guaranteed and agents figure out all the details and strong spec + proof”. The requested research covers “We also need to understand how to do eval” and “what existing problems are (almost like a DB of all cases that can be found)”.

My recommendation: a task succeeds only when the generated specification captures the required behavior, the executable is connected to that specification, the proof passes independent checks, and the assumptions match the task. Report these parts separately as well as the fraction passing all of them. A single weighted score can hide a missing guarantee.

Start with three distinct task groups: completion of a proof against a fixed specification; existing TLA+ to verified Rust; and plain-language intent to a specification, implementation, and proof. Comparing these groups separates proof engineering from understanding the intended guarantee.

For each case, freeze an independent hidden evaluation packet containing required guarantees, valid behaviors, forbidden behaviors, environmental assumptions, and deliberately bad implementations. Measure required-guarantee coverage, exclusion of valid behavior, rejection of bad behavior, implementation-to-model agreement, proof integrity, progress, and cost. Check that the evaluator rejects trivial claims and deliberate proof bypasses before spending heavily on agent runs.

Liveness requires checking the conditions under which progress is promised. Anvil's OSDI 2024 introduction states: “an arbitrary number of faults can happen, but eventually faults stop happening.” Its §7.2 identifies “an incomplete specification of a trusted ZooKeeper API”. [Xudong Sun et al., Anvil](https://www.usenix.org/system/files/osdi24-sun-xudong.pdf). A completed proof therefore still needs tests of trusted environment contracts and an explicit assessment of failure and scheduling assumptions.

Catalog availability does not establish that an artifact's proof was reproduced. The proposed evaluation has not yet been run.

The catalog contains 1,914 records: 1,638 TLA module variants, 102 implementation/proof directories, 167 automatic-verification input files, one suite retrieval lead, and six archive leads. Helper modules and regression tests are included, and distinct usable benchmark cases have not been counted. Exact-content duplicates are recorded as aliases. Independent review checked aggregate counts and all quotes in five selected records.

The stable specification report and benchmark report received targeted independent source review. Corrections cover the trusted executable-specification translation in SpecGym, Specula's checks against overly permissive repairs, and AutoVerus's complete task population. A previous research process unexpectedly remained active and replaced `eval_spec.md`; its expanded work is preserved, while `eval_spec_reviewed.md` is the stable report reviewed for this handoff.

The requested ChatGPT consultation at Extra High was attempted but failed before submission because temporary chat was unavailable. Built-in web search and browser Google search also failed. The reviews use available primary full texts, downloaded source repositories, and direct HTTP retrieval; no ChatGPT opinion is attributed to this work.
