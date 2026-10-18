# CHC-COMP 2022: Competition Report
(authored by agents unless marked 🧑)
Tag: `deangelis2022chccomp`, [paper](https://doi.org/10.4204/EPTCS.373.5)

## scope and evidence

This report documents the fifth CHC-COMP competition for constrained Horn-clause (CHC) solvers. It covers eight tracks, six submitted solvers (five competing, plus Spacer hors concours because one organizer co-develops it, Section 4, p. 52), benchmark construction, execution on StarExec, scoring, observed inconsistencies, and solver algorithms. Page numbers below are the printed EPTCS 373 page numbers (pp. 44–62). The abstract states: “CHC-COMP 2022 is the fifth edition of the competition of solvers for Constrained Horn Clauses.” (Abstract, p. 44). The Introduction says: “CHC-COMP 2022 featured 6 solvers, and 8 tracks consisting of sets of linear and nonlinear clauses with constraints over linear integer arithmetic, linear real arithmetic, arrays, algebraic data types, and a few combinations of such theories.” (Section 1, p. 44).

Results (Table 6, p. 53): Golem won LIA-lin, LIA-nonlin, LRA-TS and LRA-TS-par; Eldarica won LIA-lin-Arrays, LIA-nonlin-Arrays and the new LIA-nonlin-Arrays-nonrecADT track; RInGen won ADT-nonlin (the winners paragraph of Section 6, p. 54, lists LIA-lin-Arrays twice, a typo). Spacer, hors concours, has the highest score in Tables 8–13 but is not ranked.

Inference: The paper is an evaluation protocol and tool survey, not a new soundness theorem. Its results show comparative performance on the selected benchmark suite under fixed resource limits; they do not prove that any solver is complete, that every reported SAT/UNSAT result is correct, or that the ranking generalizes to Verus workloads.

## technique 1: classify CHCs into theory and shape tracks

What it is. Tracks partition benchmarks by background theory and clause shape. A linear clause has at most one uninterpreted atom in its premise; a nonlinear clause has more than one (Section 2.1, p. 45). The tracks are LIA-lin, LIA-nonlin, LIA-lin-Arrays, LIA-nonlin-Arrays, ADT-nonlin, LIA-nonlin-Arrays-nonrecADT (new in 2022), LRA-TS, and LRA-TS-par (pp. 45–46). The report states: “The tracks are classified according to type of clauses included in the corresponding benchmarks.” (Section 2.1, p. 45).

When to use it. Use this classification to choose a solver backend and to avoid comparing tools on theories they do not support. For a verification pipeline, classify generated obligations before dispatching them.

How to apply it.
1. Identify the constraint theory: linear integer arithmetic, linear real arithmetic, arrays, or algebraic data types (Section 2.1, pp. 45–46).
2. Count uninterpreted atoms in each clause premise to distinguish linear from nonlinear clauses (p. 45).
3. Detect transition-system syntax: exactly one uninterpreted relation symbol and exactly three linear clauses encoding initial states, transitions, and error states (p. 46).
4. Assign the benchmark to the corresponding track and submit only compatible solver configurations (Table 5, p. 52, lists which solvers entered which track).

Verus form. Inference: classify each generated Verus proof obligation by the theories present in its verification condition, such as integer arithmetic, sequences/arrays, and recursive datatypes. Dispatching is external orchestration; Verus itself does not expose CHC-COMP track labels. Keep the classification as metadata and preserve the original obligation for audit.

Evidence and limits. The classification is a syntactic protocol. It does not establish that a solver handles every formula in a track equally well. The report says: “no solver requiring the syntactic restriction on the form of the clauses included in the LRA-TS track has been submitted.” (Section 6, p. 54), and proposes to discontinue LRA-TS and LRA-TS-par from CHC-COMP 2023. Inference: a nominal track can have little comparative evidence.

## technique 2: resource-controlled, reproducible solver runs

What it is. Each solver-track/benchmark pair is a StarExec job. The run records CPU time, wall-clock time, memory, and a result status. The environment had 15 parallel and 20 sequential nodes, each with two quadcore CPUs, Intel Xeon E5-2609 processors, 10,240 KB cache, and 263,932,744 kB main memory (Section 2.2, p. 46). The two queues are chcpar.q and chcseq.q; LRA-TS-par jobs ran on chcpar.q, and two jobs of every other track ran in parallel on a chcseq.q node (p. 46). The report states: “Running a solver on a track was performed by submitting a job to a StarExec node. A job is a pair consisting of a solver (with a track-specific configuration) and a benchmark.” (Section 2.2, p. 46).

When to use it. Inference: use fixed resource envelopes when comparing verifier backends or regression versions, and record both CPU and wall-clock time because parallel portfolios can change their relationship.

How to apply it.
1. Package a solver binary and a track-specific configuration (Section 2.2, p. 46; binaries are on StarExec, Section 4, p. 52).
2. Submit one job per solver/benchmark pair to a known execution queue.
3. Set hard CPU, wall-clock, and memory limits. CHC-COMP used 600 s CPU, 600 s wall-clock and 64 GB for test runs (p. 46), and 1800 s CPU, 1800 s wall-clock and 64 GB for competition runs; LRA-TS-par had only a 1800 s wall-clock and 64 GB limit (Section 2.3, p. 47).
4. Preserve job-information CSV files (the scoring script reads them, Section 2.4, p. 47) and, Inference, the exact binary/configuration archive.
5. Run an optional test run first, on a small set of randomly selected benchmarks, to check configurations and identify possible inconsistencies (Section 2.3, p. 46).

Verus form. Inference: apply the same discipline to Verus by pinning the Verus commit, Rust toolchain, solver versions, command line, and timeout, then storing verification logs and generated formulas. A timeout or crash is an unknown result, not a proof failure.

Evidence and limits. Inference: the protocol makes runs repeatable within the stated machine and software environment, but does not control nondeterminism inside solvers or establish semantic correctness of outputs. The report does not claim repeatability checks.

## technique 3: score SAT/UNSAT results and report unique solves

What it is. A solver's score in a track is the number of SAT or UNSAT results; unknown includes giving up, resource exhaustion, and crashes. Ties use total CPU time, except LRA-TS-par uses wall-clock time. The report says: “The result can be sat, unsat, or unknown (which includes solvers giving up, running out of resources, or crashing), and the Score is given by the number of sat or unsat results.” (Section 2.4, p. 47).

How to apply it.
1. Parse the StarExec job-information CSV with the competition's `summarize.py` script (Section 2.4, p. 47).
2. Count SAT and UNSAT as solved; count UNKNOWN separately.
3. Rank by score, then CPU time (or wall-clock time for the parallel track).
4. Report `#unique`: the number of sat or unsat results for benchmarks on which all other solvers returned unknown (p. 47).
5. Inference: publish raw job data so a reviewer can recompute every score; the report does not state that it did this.

Verus form. Inference: use “proved,” “failed,” and “unknown/timeout” as separate CI outcomes. Count only completed proofs toward a score; report unique obligations solved by one backend. Do not interpret a timeout as evidence that the specification is false.

Evidence and limits. Inference: this score measures solver decisions, not correctness. The report itself proposes result validation (witness-weighted scores) and benchmark status annotations for future editions (Section 6, p. 54).

## technique 4: hardness-stratified benchmark sampling

What it is. For large tracks, the organizers estimate difficulty using previous-year winners and select a representative mixture. A benchmark is rated A if both winner and runner-up solved it, B if only the winner solved it, C if only the runner-up solved it, and D if neither solved it within the set timeout; the winner and runner-up are those of the same track in CHC-COMP 2021 (Section 3.5, p. 49). For each repository r, the organizers choose a maximum N_r from the number of unique benchmarks and their knowledge of the repository, then pick at most 0.2·N_r benchmarks each with rating A, B and C, and 0.4·N_r with rating D. If there are too few A, the rest is picked equally from B and C; if too few B or C, the remainder comes from D (p. 49). The report states: “This way, we obtained a mix of “easy” and “hard” instances with a bias towards benchmarks that were not easily solved by either of the best solvers from the previous year’s competition.” (Section 3.5, p. 49).

How to apply it.
1. Partition candidate benchmarks by repository and keep unique ones (Section 3.2 and Table 1, pp. 47–48).
2. Run previous-year winner and runner-up binaries with fixed short timeouts (5 s for Spacer, 10 s for Eldarica, the latter higher to compensate for JVM start-up, p. 49).
3. Assign A/B/C/D according to which solvers solved each instance.
4. Choose the target count N per repository and sample the category quotas (Tables 2–4, pp. 50–51).
5. Shuffle within a category with `cat <rating-Y-benchmark-list> | sort -R | head -n <num>`; the selected set is published on GitHub and StarExec (p. 49).

Verus form. Inference: construct a regression suite by rating proof obligations against baseline Verus configurations, then sample easy and hard cases. The resulting percentages describe the selected suite, not the full workload distribution.

Evidence and limits. For LIA-lin-Arrays and LRA-TS, “consisting of a small amount of benchmarks, all unique benchmarks were selected” (Section 3.5, p. 49). At HCVS it was suggested to “increase the amount of time given to the solvers to get a more accurate evaluation of the hardness of the benchmarks” (Section 6, p. 54).

## technique 5: solver algorithms represented in the competition

Eldarica uses predicate abstraction and counterexample-guided abstraction refinement (CEGAR) and invokes Princess as an SMT library (Section 7.1, p. 55). Its competition configuration `-portfolio` runs three instances in parallel: `-splitClauses:0 -abstract:off`, `-splitClauses:1 -abstract:off`, and default options (p. 55). Golem provides interpolation-based model-checking engines: `lawi` (a re-implementation of IMPACT), `spacer` (a re-implementation of SPACER, able to solve nonlinear systems), and `tpa` (a new algorithm “based on doubling abstractions using Craig interpolants”), with basic preprocessing new in 2022 (Section 7.2, pp. 55–56). Golem used only `spacer` on LIA-nonlin and a portfolio of all three engines on LIA-lin and LRA-TS (p. 56). RInGen rewrites ADT CHCs to uninterpreted-function problems: it introduces Horn axioms for disequalities, testers, and selectors, replaces ADT sorts by free sorts and constructors by free functions, then calls VAMPIRE (Section 7.3, pp. 56–57). The paper says: “As the proposed transformation gives a formula which is satisfiable modulo EUF iff the original CHC system is satisfiable modulo ADTs, the result of the logical solver is returned as is.” (Section 7.3, p. 56).

Ultimate TreeAutomizer represents potential counterexamples as regular tree sets, refines them with tree interpolation in a CEGAR loop, and uses tree automata to subtract spurious counterexamples (Section 7.4, p. 57). Ultimate Unihorn translates CHCs into a nondeterministic recursive program with an assertion, then verifies that program with Ultimate Automizer; per the description, the program is correct if and only if the CHC set is satisfiable, and the translation is described as “yet unpublished” (Section 7.5, p. 58).

When to use each technique. Inference: use predicate abstraction/CEGAR for iterative invariant discovery; interpolation when SMT models can expose separating formulas; ADT-to-EUF reduction when the ADT theory is supported by a strong first-order backend; tree automata for regular sets of recursive counterexamples; CHC-to-program translation when an existing software verifier is stronger than a direct CHC engine.

Verus form. Inference: Verus directly checks Rust contracts rather than accepting CHCs as its user language. These algorithms are therefore candidate backend strategies for a Verus-to-CHC adapter, with a trusted translation obligation. The adapter must preserve satisfiability and map counterexamples back to Rust source locations.

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
