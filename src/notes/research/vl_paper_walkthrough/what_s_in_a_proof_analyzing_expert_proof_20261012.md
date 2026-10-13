# What’s in a Proof? Analyzing Expert Proof-Writing Processes in F* and Verus
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## study design and evidence

Jain et al. instrumented VSCode extensions for F* and Verus and recorded more than 18,000 events from eight experts solving four small to medium tasks. The introduction frames the setting this way: proof-oriented programming languages (POPLs) “weave formal logic into ordinary source code”. Events include every edit, verifier invocation, active error, pause, documentation lookup, hover, and comment toggle. A taxonomy labels edits as specification, proof, implementation, structure, comment, or test, then derives behavioral features. The tasks are BinarySearch, Sublist, Intersection, and MaxDifference; each task is attempted by two F* and two Verus participants, with one extra F* session. Completion is judged by supplied tests and the verifier. The sample is deliberately small: F* completes 7/8 sessions and Verus 6/8, and the authors caution that clusters and agent results are exploratory.

## technique 1: instrument proof work as a stateful process

what and when. Final source snapshots hide planning, failed attempts, pauses, and verifier interaction. Instrument the editor and language server so every code save and solver query is timestamped, then classify events into Spec, Impl, Proof, Structure, Comment, and Test states. Use this when designing proof assistants or training agents from expert behavior rather than only successful final files.

how to apply. Hook Language Server calls, edits, and VSCode actions into a database. On each event, attach a state tag based on language-specific keywords. Cross-check samples against screen recordings. Compute task duration, correctness, verifier frequency, active-error count, pause fraction, early specification ratio, and defer fraction. The study finds F* users spend 55–65% of time on specification/proof and Verus about 60% on proof; F* invokes the verifier 3.39 times/minute on average and Verus 9.11. Average active errors are 1.49 (F*) and 1.9 (Verus), but some participants let Verus active errors spike to 35–40 (§5.2.2; the paper does not say these were the unsuccessful sessions).

verus form. Verus already exposes verifier diagnostics, so a VL workflow can log each `cargo verus` invocation, edited `requires`/`ensures`, loop invariant changes, and active diagnostics. This is an inference from the study's telemetry design, not a claim that telemetry itself proves anything. Logs should be treated as process evidence and should not enter the proof trust base.

## technique 2: specification-first decomposition with temporary holes

what it is. Start with high-level preconditions and postconditions, split the task into independently checkable subgoals, and defer details with `assume(false)`, comments, or equivalent holes. Implement and prove one subgoal at a time, then replace holes with real invariants and assertions. P8 summarizes the method: “Start with the requires/ensures, then add assume(false), then add invariants and asserts. When stuck, search for the underlying cause of the failure by adding more precise assume and assert.”

how to apply. Write the API contract first. Choose subgoals with a well-defined purpose; the paper's example is P1 splitting Intersection (T3) into deduplication and intersection (§6.1.1). Add temporary assumptions to keep unrelated code from producing noise. Invoke the verifier on the focused fragment, then strengthen the specification or replace one assumption. Revisit the contract after implementation exposes missing facts. In F*, experts chose representations (for example `Seq` versus `List` for T3) with proof complexity in mind (§6.1.2). Separately, P8, a Verus participant, reported replacing a subrange invariant with a direct “for all” invariant that worked immediately.

verus form. Put the skeleton in Rust/Verus with `requires`, `ensures`, and loop invariants. Use `assume(false)` only during scaffolding; the gate that keeps it out of the accepted branch is the study's suggestion, not the paper's. Commenting out unrelated sections is a practical alternative, but final verification must remove every hole. The paper reports experts aligning specification structure with the implementation (§6.1.2); that this matters more in Verus is the study's inference.

evidence and limits. Telemetry and timelines show successful sessions invest in specifications early and return to them. The study reports that P2's F* Intersection solution reused library lemmas and was three times shorter than P4's from-scratch proof. Decomposition is a behavioral recommendation, not a causal experiment; participant expertise and task choice confound outcomes.

## technique 3: keep verifier feedback measured and the error frontier clean

Rapidly invoking the verifier is not equivalent to productive interaction. K-means features define `verify_fq` (invocations per minute), `clean_state` (fraction of time with zero active errors), `pause_frac` (gaps over five seconds), and `defer`. F* sessions cluster into Spec-first Planners, Balanced, and Rapid-verifiers. Planners have early_spec 0.74, clean_state 0.07, and 100% success (Table 3); Rapid sessions have verify_fq 6.54, clean_state 0.01, and 67% success. Verus shows the same qualitative planner-versus-rapid split, with planner success 100% (a singleton cluster, which the paper treats as exploratory) and rapid success 60% (Table 4).

how to apply. After each focused verifier run, pause to interpret the error, fix one cause, and return to a clean state before expanding scope. Delay or hide unrelated failures. Treat a rising invocation rate plus persistent errors as a trigger for decomposition, representation review, or lemma search rather than another blind retry. The authors' case study contrasts P7's dense verification and specification churn, which failed after 45 minutes, with P8's complete skeleton, temporary assumptions, one-subgoal-at-a-time repair, and deliberate pauses.

verus form (inference). A VL agent can maintain a diagnostic frontier: run Verus on a selected module or function, retain only actionable diagnostics, and refuse to call the verifier repeatedly without a changed hypothesis. This can reduce token and solver waste, but it does not replace proof checking.

## technique 4: retrieve and reuse libraries, then specialize agents

Experts search documentation and adapt existing lemmas. The recommended copilot retrieves lemmas and examples conditioned on the current subgoal, offers task plans, interprets verifier messages, and uses specialized agents for lemma search, proof sketching, syntax, and feedback. The F* case study implements two agents with AutoGen and GraphRAG: a Proof Expert writes a specification-first roadmap covering representations, helper functions, and lemmas; a Syntax Expert turns it into valid F* and iterates with verifier feedback. On T4 and T1 it obtains verified solutions in 8 and 7 verifier loops; the baseline o4-mini fails within 30 loops, suggesting a 3.75× reduction, although this is only two tasks and one model setup.

verus form (inference). A Verus copilot can retrieve `verus` library lemmas and prior proof patterns, have a planner draft contracts/invariants, then a syntax/proof agent edit Rust, and route diagnostics back to the planner. Keep the verifier as authority and require a clean final run.

## what is measured, trusted, and already done

Measured facts are telemetry counts, session outcomes, cluster features, and the two-task F* agent demonstration. The verifier, tests, event instrumentation, automated annotations, screen-recording cross-checks, and researchers' clustering are trusted as measurement machinery; the paper does not claim causal proof that a strategy causes success. Small sample size, task simplicity, participant selection, annotation errors, and researcher thematic coding limit generalization. The paper already establishes that final code alone misses critical proof-development signals; VL should not redo a one-shot “LLM writes proof” study without process telemetry, deliberate baselines, or larger maintenance tasks.

Inference: for agent-written verified Rust, the threat is workflow failure rather than kernel unsoundness: agents can thrash in edit-verify loops, keep many active errors, or choose a representation that makes the intended proof opaque. The authors conclude that “formal proofs often depend on abundant informal information and intermediate reasoning steps”. The study supports an inference that specification-first planning, bounded errors, and subgoal decomposition may improve throughput, but it does not show that these practices guarantee correctness or scale to VeruLaw workloads.

## techniques for the catalog

- proof-process telemetry: record edits, verifier calls, diagnostics, pauses, lookups, and comments as annotated states
- specification-first decomposition: draft contracts, split subgoals, and replace temporary assumptions incrementally
- clean-error frontier: keep active verifier errors bounded and interpret each changed obligation before retrying
- representation-aware specification: choose data structures and quantifier forms that match implementation and solver behavior
- library retrieval: retrieve and adapt existing lemmas and documentation for the current proof state
- planner/syntax agent split: have one agent design specifications and another produce language-correct proof code under verifier feedback

Audited 2026-10-12 against the paper: checked task list, session counts (7/8, 6/8), time shares, verifier rates 3.39 and 9.11 per minute, active errors 1.49 and 1.9, Tables 3 and 4 values, P8 quote, the 8 and 7 loop counts and 3.75x figure, and the P2 and P4 line counts. Changed: the opening quotation was spliced across words and is now verbatim and attributed to the introduction; the 35-40 active errors were not tied to unsuccessful sessions; the Seq/List choice is F* but the for-all invariant remark is from Verus participant P8; the subgoal-boundary advice and assume(false) gating were not in the paper and are now marked as study suggestions; the Verus singleton planner cluster is flagged; one unmarked inference is now marked.
