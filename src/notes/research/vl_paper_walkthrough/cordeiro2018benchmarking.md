# Benchmarking of Java Verification Tools at the Software Verification Competition (SV-COMP)
(authored by agents unless marked 🧑)
Tag: `cordeiro2018benchmarking`, [paper](http://arxiv.org/abs/1809.03739v2)

## scope and contribution

The paper proposes a Java category for SV-COMP, reusing SV-COMP and BenchExec to make tool comparisons reproducible. Its stated contribution is a “standard Java benchmark format and respective benchmarking infrastructure” (abstract, p. 1). It defines task structure, properties, execution limits, result scoring, tool integration, and an initial benchmark collection. The evaluated tools are JPF, SPF, JayHorn, and JBMC (abstract, p. 1). No experiment in this paper verifies Rust or Verus code.

## technique 1: a typed verification-task contract

What it is. A task is a Java program paired with a specification. A run is non-interactive execution of a verifier on one task. The paper defines the result as “a triple (answer, witness, time)” (Section 2.1, p. 2). The answer is TRUE when no path violates the specification, FALSE when some path violates it, and UNKNOWN when the tool crashes, times out, runs out of memory, or cannot decide (Table 1, p. 2). Time is total CPU time consumed by the verifier and child processes; a time-limit termination is UNKNOWN (Section 2.1, p. 2).

When to use it. Use this contract when comparing agents or verifier configurations so that every run has the same input, verdict vocabulary, evidence field, and resource measurement. The paper says the Java category was needed because tools were “very difficult to compare in practice” without a common benchmark set and standardized, reproducible evaluation (Section 1, p. 1).

How to do it.

1. Write a Java 1.8 program and a task-definition YAML listing every source file; all listed files must compile on the Java 8 source path (Section 2.2, p. 2).
2. Require a root-package `Main` class with public static `void main(String[])`; put a copyright and license header in `Main.java` (Section 2.2, p. 2).
3. Put the expected property in a `.prp` file and run the verifier non-interactively on that task (Sections 2.1 and 2.3, pp. 2–3).
4. Translate tool output to TRUE, FALSE, or UNKNOWN and record witness and CPU time (Section 2.1, p. 2; Section 3, p. 3).
5. Keep benchmarks in the shared repository before the contribution deadline; permit a training period in which tools can tune on the tasks, and remove contentious or misclassified tasks (Section 2.2, p. 2).

Verus form. Inference: represent each benchmark as a Rust crate or module with a deterministic entry function, a `requires`/`ensures` contract, and a harness that records whether Verus verifies or reports a counterexample. Inference: the paper’s three-valued result maps naturally to proved, refuted, and unknown/timeout, while a Verus proof artifact or failing verification log can occupy the witness field. Inference: YAML task manifests can list Rust source files and feature flags, but Java compilation and `Main`-class requirements do not carry over.

Evidence and limits. The paper’s initial suite has 368 tasks: 177 JBMC-regression (89 safe, 88 unsafe, average 25 LOC), 104 JPF-regression (52/52, average 52 LOC), 23 JayHorn-recursive (14/9, average 35 LOC), and 64 minepump (8/56, average 62 LOC), totaling 163 safe and 205 unsafe with average 40 LOC (Table 3, p. 4). These denominators are the paper’s counts. The authors explicitly say this is “a good start” but not representative of the breadth of Java verification challenges (Section 4, p. 4). Inference: a VL benchmark should report both class balance and source-size distribution, and should treat this suite as a seed rather than product coverage.

## technique 2: property and nondeterminism normalization

What it is. The Java category uses `CHECK( init(Main.main()), LTL(G assert) )`, where `G` means globally and `assert` is true when every assertion holds (Section 2.3, p. 3). The only admissible nondeterminism comes from methods in `org.sosy_lab.sv_benchmarks.Verifier`; those methods model `java.util.Random` as nondeterministic values constrained to the same range (Section 2.2, p. 2). The helper also supplies `assume`, implemented as `Runtime.getRuntime().halt(1)`, so assumptions do not create nontermination (Section 2.2, p. 2).

When to use it. Normalize environmental behavior when tools otherwise disagree about random values, time, system calls, or termination. The paper bans library methods that make system calls, with narrowly granted exceptions such as a nondeterministic timestamp for `new java.util.Date()` (Section 2.2, p. 3).

How to do it. Replace each uncontrolled random or external operation with a benchmark-provided stub; constrain its output range; express safety as an assertion; encode the assertion property in the property file; and use `assume` or an entry-point return to restrict nondeterminism without introducing a busy loop (Section 2.2, p. 2; Section 2.3, p. 3). The paper warns that `while(!condition);` could make a program appear nonterminating if termination becomes a future category (Section 2.2, p. 2).

Verus form. Inference: use `spec fn` models for pure nondeterministic choices, `requires` to constrain their ranges, and explicit `assume`-style proof preconditions in a harness; avoid Rust OS calls in benchmark kernels. Inference: safety assertions become `ensures` clauses or `assert` statements inside `proof fn`; Verus does not use Java LTL syntax, so a temporal “globally” claim must be reduced to an invariant over every loop iteration or recursive call.

Evidence and limits. The property checks assertion safety only; it does not establish termination, liveness, or behavior of disallowed system calls. JayHorn is sound only for single-threaded Java without dynamic class loading and complex static initializers (tool description, p. 1). Inference: VL claims should state the supported execution model and assumptions rather than treating UNKNOWN as a proof failure.

## technique 3: reproducible resource-controlled execution

What it is. BenchExec supplies a tool interface, resource measurement, logs, structured XML results, and comparison plots. Integrating a verifier requires a Python `tool-info` module that runs it and translates output, plus an XML benchmark definition specifying categories and command-line options (Section 3, p. 3). A run uses GNU/Linux x86-64 (Ubuntu 18.04), 15 GB RAM, 900 seconds CPU time, and at most eight CPU units; if CPU is idle, wall time is capped at 900 seconds (Section 2.4, p. 3).

How to do it. Install the verifier in BenchExec’s base directory; add its tool-info module and XML definition; invoke `bin/benchexec spf.xml`; optionally select task subsets or override limits; preserve the timestamped logs and `.xml.bz2` result files; generate HTML tables, scatter plots, and quantile (cactus) plots with the table generator (Section 3 and Section 5, pp. 3–4). A cactus plot’s x-axis is the number of fastest solved tasks and its y-axis cumulative time (Section 5, p. 4).

Verus form. Inference: wrap `verus` or a VL orchestration command in BenchExec’s tool-info interface, map successful verification to TRUE and failed obligations to FALSE or UNKNOWN according to a declared policy, and retain proof logs as witnesses. Inference: pin compiler, Verus, SMT solver, CPU, memory, and timeout versions; otherwise comparisons can confound verifier changes with resource changes.

Evidence and limits. The infrastructure generates comparable measurements but does not itself establish semantic soundness. The authors note that Java tools should later emit witness files and that Java witness checkers still need development (Conclusion, p. 5): “witness checkers for Java verifiers also need to be developed in order to check validity of the verification results”. Inference: an agent-written verified-Rust product remains threatened by unsound wrappers, unsupported language features, or a forged result unless independent witness checking or proof replay is added.

## technique 4: correctness-weighted scoring

What it is. SV-COMP assigns points per task: UNKNOWN gets 0; a correct FALSE gets +1; an incorrect FALSE gets −16; a correct TRUE gets +2; an incorrect TRUE gets −32 (Table 2, p. 3). The paper explains that the larger TRUE reward and penalty reflect that proving correctness is usually harder than finding a bug (Section 2.5, p. 3).

How to use it. Compute scores from the declared verdict and ground-truth classification, retain the denominator (all tasks in the category), and report score together with solved-task count and runtime plots. Penalize false alarms and missed bugs heavily enough that a fast but unsound tool cannot win by guessing.

Verus form. Inference: score a VL verifier per proof obligation or benchmark, with a positive reward for checked proofs and a strong penalty for accepting an invalid contract; retain a separate UNKNOWN for timeout or unsupported constructs. Inference: because Verus produces proof obligations rather than Java assertions, the unit of scoring must be declared (crate, function, or obligation) before results are compared.

Evidence and limits. The paper reports the framework and benchmark results but the extracted text contains no aggregate score table for the four tools; therefore no tool ranking or percentage can be inferred from this paper alone. Inference: VL should publish the complete per-task result archive, not only a headline score.

## what is proved, measured, and trusted

The paper defines and measures task verdicts, CPU time, memory and processor limits, benchmark composition, and score calculations. It does not prove that any verifier implementation is sound. Trust includes each verifier, its Java front end and models, BenchExec’s measurement and output parser, benchmark classifications, Java 1.8 and OS behavior, and the absence of witness checking in this Java category. Inference: for VL, Verus’s trusted base, SMT solver, compiler model, external-body declarations, and benchmark harness must be listed explicitly; a green run is evidence only under those assumptions.

## contradictions, omissions, and product implications

The benchmark table totals correctly: 177 + 104 + 23 + 64 = 368, and safe plus unsafe is 163 + 205 = 368. The paper calls the set representative enough to launch a category while also stating it is not fully representative; this is a scope limitation rather than a numerical contradiction. No denominator is supplied for any tool’s aggregate success rate in the extracted paper, so percentages should not be invented. The initial category has no Java witness checking even though witness validation is identified as necessary future work (Section 2.1 and Conclusion, pp. 2 and 5).

Inference: VL should already implement the reusable parts—versioned task manifests, explicit assumptions, fixed resource limits, structured logs, independent result checking, and correctness-weighted reporting—because these are engineering patterns rather than Java-specific research. Inference: VL should not redo the paper’s Java-specific category design, `Main` conventions, or LTL encoding. Inference: the threat to an agent-written verified-Rust product is medium for evaluation integrity: benchmark normalization and scoring are straightforward, but unsupported Rust semantics, unsound harness assumptions, and missing proof witnesses can invalidate an apparently successful agent output.

## techniques for the catalog

- typed verification-task contract — define versioned tasks, explicit TRUE/FALSE/UNKNOWN semantics, witnesses, and resource-aware runs
- property and nondeterminism normalization — replace uncontrolled environment behavior with constrained benchmark stubs and explicit safety properties
- reproducible BenchExec execution — integrate each verifier through a runner and manifest, fixed limits, logs, and comparable plots
- correctness-weighted scoring — reward correct proofs and bug finds while heavily penalizing false alarms and missed bugs
Checked 2026-10-14 against the paper by a Codex agent: audit record cordeiro2018benchmarking; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
