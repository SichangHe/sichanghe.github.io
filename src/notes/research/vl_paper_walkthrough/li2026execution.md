# Execution-State-Aware LLM Reasoning for Automated Proof-of-Vulnerability Generation
(authored by agents unless marked 🧑)
Tag: `li2026execution`, [paper](https://doi.org/10.1145/nnnnnnn.nnnnnnn)

## task and result

Li et al. present DrillAgent, which generates a concrete input that reaches a reported C/C++ vulnerability and triggers the specified sanitizer effect. The paper calls PoV generation “a critical task in software security, serving as a cornerstone for vulnerability validation, false positive reduction, and patch verification.” (Abstract, p. 1) They formulate generation as “an iterative hypothesis–verification–refinement process.” (Abstract, p. 1) The agent uses four fixed phases: vulnerability analysis, code instrumentation, path exploration, and crash triggering (Section 3.1, p. 3).

The evaluation uses SEC-bench. The original 200 tasks were filtered to 190 because 10 sanitizer reports lacked source-line information (Section 5.1, p. 6). A validated PoV must match both the ground-truth crash type and location; a variant PoV triggers a sanitizer crash at a different type or location (Section 5.1, p. 6). On all 190 tasks, DrillAgent produced 55 validated and 12 variant PoVs, so resolved rate was 55/190 = 28.9% and crash rate was 67/190 = 35.3% (Table 1, p. 6). On SEC-bench-60 under a $1.5/task budget, it produced 15 validated PoVs versus 6 for OpenHands, with the same Claude Sonnet 4.5 model (Table 1, p. 6). The 52.8% improvement claim compares 55 solved tasks with a leaderboard result of 36, computed as (55−36)/36 (Section 5.2, p. 6).

## technique 1: vulnerability analysis as persistent semantic context

What it is. VAAgent turns a target location, optional sanitizer report, repository, and harness into a root-cause description, crash trace, and harness command. It reasons forward from entry points for input-format prerequisites, backward from the crash for security conditions, and from generic vulnerability type to instance-specific patterns (Section 3.2, p. 4). The output is retained for every later generation round.

How to do it.

1. Extract the sanitizer backtrace into JSON and correct source line numbers so each frame points to the callee’s call site (Section 3.2, p. 4).
2. For heap bugs, also extract allocation and free traces.
3. Infer a harness command by locating the correct binary, argument parser, and required file extension.
4. Analyze root cause in three directions: forward input requirements, backward crash predicates, and vulnerability-specific conditions.
5. Save the resulting root cause, trace, and harness as context for instrumentation and both generation phases.

The motivating GPAC type-confusion example requires a fragmented MP4 with `moof`, `traf`, and `sgpd` boxes, `grouping_type == 0`, and an `sgpd` entry passed as a `GF_Box`; only then does the out-of-bounds read occur (Section 2.2, pp. 2–3). This illustrates why local code snippets are insufficient.

Verus form. Inference: represent root-cause conditions as a typed specification of input structure and state predicates. A verified parser can return a state whose `ensures` clause establishes the required format invariant; later functions can require that invariant before attempting the vulnerable operation. Verus can prove the Rust model’s conditions, but it cannot infer C/C++ runtime behavior or validate a sanitizer report without a trusted model of the foreign program.

Evidence. Removing root-cause context on the 30-task ablation set reduces validated PoVs from 30 to 15 and variant PoVs from 3 to 2 (Figure 7, p. 8). The paper concludes that high-level root-cause descriptions improve contextual retrieval (Section 5.4.1, p. 8).

## technique 2: compile two instrumented binaries and verify instrumentation

What it is. ITAgent builds one coverage-instrumented binary Pcov and one sanitizer-instrumented binary Psan from separate repository copies (Section 3.1, p. 3). It extracts build commands, injects compiler flags, retries failed compilation, and checks the resulting binary for instrumentation markers such as `__llvm` or `__sanitizer` (Section 3.3, pp. 4–5).

How to do it.

1. Read project documentation to recover the basic build procedure.
2. Inject `-fprofile-instr-generate` and `-fcoverage-mapping` for source-level coverage.
3. Inject `-fsanitize=<type>` and `-fno-omit-frame-pointer`, choosing ASan or UBSan from the vulnerability type.
4. Compile, diagnose errors, and retry to a fixed attempt limit.
5. Locate the target binary and verify instrumentation markers before using feedback.

Verus form. Inference: treat instrumentation and harness setup as trusted external components around a verified Rust service. The proof boundary should begin at a typed execution result, with an `ensures` relation that accepted feedback corresponds to a modeled event. Rust/Verus cannot prove LLVM sanitizer instrumentation unless the compiler and runtime are included in the trusted base.

The measured result is process reliability, not a proof of instrumentation completeness. A successful compilation may still have flags overridden later, which is why the marker check is required (Section 3.3, p. 5).

## technique 3: separate path exploration from crash triggering

What it is. PEAgent first generates well-formed inputs that reach the vulnerable function; CTAgent then mutates those useful inputs to satisfy the final vulnerability predicate. The paper’s algorithm records this split as two loops (Algorithm 1, p. 5).

How to do it.

1. Initialize `useful_tcs` to empty and context to vulnerability plus root cause.
2. For each of N1 path rounds, generate a test case, execute it on Pcov, collect coverage, and add it to `useful_tcs` if it reaches the last three crash-backtrace frames.
3. Update context with the test and coverage after every round.
4. Derive vulnerability-type hints from the root cause and update context with those hints and useful test cases.
5. For each of N2 crash rounds, generate a PoV, execute it, and validate it on Psan.
6. Return when sanitizer type and location match ground truth; otherwise append execution feedback and retry.

The paper uses a hybrid feedback strategy: deterministic function-level coverage is always inserted, while the agent may query line-level coverage on demand (Section 3.4, p. 5). During crash triggering, coverage explains why a candidate failed rather than expanding exploration (Section 3.5, p. 6).

Verus form. Inference: represent the path phase as a verified state transition whose postcondition says the useful input reaches a modeled target predicate. The crash phase then requires that predicate and proves an `ensures` clause for the intended safety property. Counterexamples can drive repair, but they do not replace the proof. Use executable functions for harness interaction and proof functions for mathematical lemmas.

Evidence. Disabling all execution feedback causes a severe performance drop in the ablation (Figure 7, p. 8). The authors state: “Without execution feedback, the agent actually reasons ‘blindly’ and lacks actionable signals to understand why a generated input fails.” (Section 5.4.2, p. 8)

## technique 4: classify sanitizer outcomes and report cost denominators

A crash matching type and location is a validated PoV; any other sanitizer crash is a variant. Reporting both avoids treating useful but non-matching crashes as successes. DrillAgent averages 60 LLM interactions and 100.4 tool calls per task, with 7.8 `coverage_query` calls (Section 5.2, p. 7). Average cost is $1.79 per task on SEC-bench-Full and $7.72 per validated PoV on SEC-bench-60; runtime is 11.5 and 11.8 minutes respectively (Table 2, p. 8). The $7.72 denominator is validated PoVs, not all tasks.

The paper’s main limits are C/C++ memory vulnerabilities, sanitizer-dependent validation, no guarantee of semantic completeness, and a 30-task ablation subset chosen only from tasks the full system solved (Section 5.4, p. 8; Section 6, p. 9). Generated PoVs differ substantially from ground truth, with average similarity 0.0296 across 24 solved CVEs (Section 6, p. 9); this supports behavioral validation but does not prove exploit equivalence.

Inference: for VL, the reusable pattern is execution-grounded repair around a typed proof state. A Verus agent can use compiler diagnostics and counterexamples to refine proofs, but should terminate only on a Verus-checked postcondition. The threat is high if a runtime trace is trusted as a proof of safety; it is evidence that guides proof search. DrillAgent already covers root-cause context, instrumentation validation, hybrid feedback, and two-phase refinement, so VL should adapt these to Rust/Verus proof obligations rather than copy C sanitizer assumptions.

## techniques for the catalog

- persistent root-cause context: analyze entry prerequisites and crash predicates once, then reuse the semantic context
- dual instrumentation: build separate coverage and sanitizer binaries and verify instrumentation markers
- two-phase generation: explore to the vulnerable function first, then refine near-target inputs toward the triggering effect
- hybrid execution feedback: always provide coarse source-level coverage and query fine-grained coverage when stalled
- validated versus variant outcomes: distinguish matching sanitizer type/location from other crashes and report both denominators
Checked 2026-10-15 against paper li2026execution: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
