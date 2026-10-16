# CHC-COMP 2022: Competition Report
(authored by agents unless marked 🧑)
Tag: `deangelis2022chccomp`, [paper](http://arxiv.org/abs/2211.12231v1)

## scope and evidence

This report documents the fifth CHC-COMP competition for constrained Horn-clause (CHC) solvers. It covers eight tracks, six submitted solvers, benchmark construction, execution on StarExec, scoring, observed inconsistencies, and solver algorithms. The abstract states: “CHC-COMP 2022 is the fifth edition of the competition of solvers for Constrained Horn Clauses.” (Abstract, p. 1). The report says: “CHC-COMP 2022 featured 6 solvers, and 8 tracks consisting of sets of linear and nonlinear clauses with constraints over integer, real, array and ADT theories.” (Introduction, p. 2).

Inference: The paper is an evaluation protocol and tool survey, not a new soundness theorem. Its results show comparative performance on the selected benchmark suite under fixed resource limits; they do not prove that any solver is complete, that every reported SAT/UNSAT result is correct, or that the ranking generalizes to Verus workloads.

## technique 1: classify CHCs into theory and shape tracks

What it is. Tracks partition benchmarks by background theory and clause shape. A linear clause has at most one uninterpreted atom in its premise; a nonlinear clause has more than one (Section 2.1, p. 2). The tracks are LIA-lin, LIA-nonlin, LIA-lin-Arrays, LIA-nonlin-Arrays, ADT-nonlin, LIA-nonlin-Arrays-nonrecADT, LRA-TS, and LRA-TS-par (pp. 2–3). The report states: “The tracks are classified according to type of clauses included in the corresponding benchmarks.” (Section 2.1, p. 2).

When to use it. Use this classification to choose a solver backend and to avoid comparing tools on theories they do not support. For a verification pipeline, classify generated obligations before dispatching them.

How to apply it.
1. Identify the constraint theory: linear integer arithmetic, linear real arithmetic, arrays, or algebraic data types (Section 2.1, pp. 2–3).
2. Count uninterpreted atoms in each clause premise to distinguish linear from nonlinear clauses (p. 2).
3. Detect transition-system syntax: exactly one relation symbol and three linear clauses for initial, transition, and error states (p. 3).
4. Assign the benchmark to the corresponding track and submit only compatible solver configurations.

Verus form. Inference: classify each generated Verus proof obligation by the theories present in its verification condition, such as integer arithmetic, sequences/arrays, and recursive datatypes. Dispatching is external orchestration; Verus itself does not expose CHC-COMP track labels. Keep the classification as metadata and preserve the original obligation for audit.

Evidence and limits. The classification is a syntactic protocol. It does not establish that a solver handles every formula in a track equally well. LRA-TS had no solver satisfying the intended syntactic restriction in this edition (Section 6, p. 54), showing that a nominal track can have little comparative evidence.

## technique 2: resource-controlled, reproducible solver runs

What it is. Each solver-track/benchmark pair is a StarExec job. The run records CPU time, wall-clock time, memory, and a result status. The environment had 15 parallel and 20 sequential nodes, each with two quadcore CPUs, Intel Xeon E5-2609 processors, 10,240 KB cache, and 263,932,744 kB main memory (Section 2.2, pp. 3–4). The report states: “Running a solver on a track was performed by submitting a job to a StarExec node. A job is a pair consisting of a solver (with a track-specific configuration) and a benchmark.” (Section 2.2, p. 4).

When to use it. Use fixed resource envelopes when comparing verifier backends or regression versions. Record both CPU and wall-clock time because parallel portfolios can change their relationship.

How to apply it.
1. Package a solver binary and a track-specific configuration (Section 2.2, p. 4).
2. Submit one job per solver/benchmark pair to a known execution queue.
3. Set hard CPU, wall-clock, and memory limits. CHC-COMP used 600-second limits for test runs and 1,800-second limits for competition runs, with 64 GB memory (Section 2.3, pp. 4–5).
4. Preserve job-information CSV files and the exact binary/configuration archive.
5. Re-run a small random test set before the full competition run to detect configuration inconsistencies (p. 4).

Verus form. Inference: apply the same discipline to Verus by pinning the Verus commit, Rust toolchain, solver versions, command line, and timeout, then storing verification logs and generated formulas. A timeout or crash is an unknown result, not a proof failure.

Evidence and limits. The protocol makes runs repeatable within the stated machine and software environment. It does not control nondeterminism inside solvers or establish semantic correctness of outputs.

## technique 3: score SAT/UNSAT results and report unique solves

What it is. A solver's score in a track is the number of SAT or UNSAT results; unknown includes giving up, resource exhaustion, and crashes. Ties use total CPU time, except LRA-TS-par uses wall-clock time. The report says: “The result can be sat, unsat, or unknown (which includes solvers giving up, running out of resources, or crashing), and the Score is given by the number of sat or unsat results.” (Section 2.4, p. 5).

How to apply it.
1. Parse StarExec job-information CSV with the competition's `summarize.py` script (Section 2.4, p. 5).
2. Count SAT and UNSAT as solved; count UNKNOWN separately.
3. Rank by score, then CPU time (or wall-clock time for the parallel track).
4. Report `#unique`: solved benchmarks for which all other solvers returned unknown (p. 5).
5. Publish raw job data so a reviewer can recompute every score.

Verus form. Inference: use “proved,” “failed,” and “unknown/timeout” as separate CI outcomes. Count only completed proofs toward a score; report unique obligations solved by one backend. Do not interpret a timeout as evidence that the specification is false.

Evidence and limits. This score measures solver decisions, not correctness. The report itself calls for result validation and benchmark status annotations in future editions (Section 6, p. 54).

## technique 4: hardness-stratified benchmark sampling

What it is. For large tracks, the organizers estimate difficulty using previous-year winners and select a representative mixture. A benchmark is rated A if both winner and runner-up solved it, B if only the winner solved it, C if only the runner-up solved it, and D if neither solved it within the selected timeout (Section 3.5, pp. 9–10). They select at most 0.2·N from each A, B, and C category and 0.4·N from D, filling shortages from neighboring categories. The report states: “This way, we obtained a mix of ‘easy’ and ‘hard’ benchmarks with a bias towards benchmarks that were not easily solved by either of the best solvers from the previous year’s competition.” (Section 3.5, p. 10).

How to apply it.
1. Partition candidate benchmarks by repository and remove duplicates (Section 3.5, pp. 9–10).
2. Run previous-year winner and runner-up binaries with fixed short timeouts (5 s for Spacer, 10 s for Eldarica, p. 10).
3. Assign A/B/C/D according to which solvers solved each instance.
4. Choose the target count N per repository and sample the category quotas.
5. Shuffle within a category and retain the selected file list and randomization command (p. 10).

Verus form. Inference: construct a regression suite by rating proof obligations against baseline Verus configurations, then sample easy and hard cases. The resulting percentages describe the selected suite, not the full workload distribution.

Evidence and limits. LIA-lin-Arrays and LRA-TS used all unique benchmarks because they were small (p. 9). The report recommends longer hardness-estimation runs because short timeouts can misclassify difficulty (Section 6, p. 54).

## technique 5: solver algorithms represented in the competition

Eldarica uses predicate abstraction and counterexample-guided abstraction refinement (CEGAR) and invokes Princess as an SMT library (Section 7.1, pp. 55–56). Its portfolio runs three instances in parallel with different clause-splitting and abstraction options. Golem provides interpolation-based model-checking engines: IMPACT (`lawi`), SPACER (`spacer`), and transition-power abstractions (`tpa`), with preprocessing before backend solving (Section 7.2, p. 56). RInGen rewrites ADT CHCs to uninterpreted-function problems: it introduces Horn axioms for disequalities, testers, and selectors, replaces ADT sorts by free sorts and constructors by free functions, then calls VAMPIRE (Section 7.3, p. 57). The paper says: “As the proposed transformation gives a formula which is satisfiable modulo EUF iff the original CHC system is satisfiable modulo ADTs, the result of the logical solver is returned as is.” (Section 7.3, p. 57).

Ultimate TreeAutomizer represents potential counterexamples as regular tree sets, refines them with tree interpolation in a CEGAR loop, and uses tree automata to subtract spurious counterexamples (Section 7.4, pp. 57–58). Ultimate Unihorn translates CHCs into a nondeterministic recursive program with an assertion, then verifies that program with Ultimate Automizer; the translation is satisfiability-preserving according to its description (Section 7.5, p. 59).

When to use each technique. Use predicate abstraction/CEGAR for iterative invariant discovery; interpolation when SMT models can expose separating formulas; ADT-to-EUF reduction when the ADT theory is supported by a strong first-order backend; tree automata for regular sets of recursive counterexamples; CHC-to-program translation when an existing software verifier is stronger than a direct CHC engine.

Verus form. Inference: Verus directly checks Rust contracts rather than accepting CHCs as its user language. These algorithms are therefore candidate backend strategies for a Verus-to-CHC adapter, with a trusted translation obligation. The adapter must preserve satisfiability and map counterexamples back to Rust source locations.

## observed failures, trust, and product threat

The competition found 4 inconsistent results in LIA-lin-Arrays and 17 in LRA-TS. Ultimate Unihorn reported SAT while other tools reported UNSAT; a fixed version changed its LIA-lin-Arrays results from 283 SAT/66 UNSAT to 137 SAT/67 UNSAT, and LRA-TS from 134 SAT/22 UNSAT to 65 SAT/38 UNSAT (Section 5.1, pp. 52–53). These denominators are counts of reported benchmark outcomes for the original and fixed tool versions in those tracks, not accuracy rates. The report therefore recommends model/counterexample witnesses and explicit expected status annotations (Section 6, p. 54).

What is proved or measured: the report measures solver outputs, scores, times, and resource use under the competition protocol. It does not independently validate every output. Trusted elements include solver binaries, SMT backends, CHC parsers/translators, benchmark expected statuses, StarExec isolation, and the scoring script. Inference: a Verus product that trusts an unvalidated CHC translation inherits a serious soundness risk; witness checking and translation round-trip tests are needed.

What VL should not redo: the track taxonomy, StarExec job model, score/tie policy, hardness ratings, and the listed CEGAR/interpolation/ADT-reduction algorithms are already documented here. Inference: VL's contribution should be a sound Rust/Verus translation, source-level witness explanations, and maintenance measurements rather than another generic solver contest.

Threat to agent-written verified Rust. Inference: high when an agent relies on a backend result without checking the generated obligation, witness, and translation. A solver can return an inconsistent result, as the 21 observed conflicts show. The threat is lower when Verus checks the final Rust proof directly and CI preserves exact tool versions and logs.

## techniques for the catalog

- theory-and-shape track classification — route CHCs by background theory and linear/nonlinear clause structure
- reproducible resource-bounded runs — compare fixed solver/configuration jobs under explicit CPU, wall-clock, and memory limits
- SAT/UNSAT scoring with unique solves — rank solved results and expose cases only one solver can decide
- hardness-stratified benchmark sampling — select a representative easy/hard mixture using prior solver behavior
- predicate-abstraction CEGAR — refine inferred predicates from spurious counterexamples
- interpolation and transition-power engines — derive inductive constraints with interpolation-based model checking
- ADT-to-EUF reduction — eliminate ADT-specific syntax and preserve satisfiability for a first-order backend
- tree-automata CEGAR — refine regular sets of recursive counterexamples with tree interpolation
- CHC-to-program translation — reduce Horn satisfiability to assertion checking in a recursive nondeterministic program
- witness and status validation — require models/counterexamples and declared expected benchmark status before trusting scores
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
