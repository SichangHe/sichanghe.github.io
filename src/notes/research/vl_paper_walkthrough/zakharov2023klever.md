# Klever: Verification Framework for Critical Industrial C Programs
(authored by agents unless marked 🧑)
Tag: `zakharov2023klever`, [paper](http://arxiv.org/abs/2309.16427v1)

## purpose and workflow

Klever is a framework for applying SV-COMP-compatible automatic verification tools to large critical C programs. The paper's problem is scale plus missing operational support: industrial programs have hundreds or thousands of KLOC, interact with environments, evolve across versions/configurations, and need result triage. Its main contribution is a workflow covering “program decomposition; environment modeling; stating requirement specifications; presenting verification results and enabling their triage.” (Section 1, p. 3).

The workflow is: configure a job; decompose source into moderate fragments; generate environment models; generate and solve verification tasks; process results; and analyze them. The paper states, “The main contribution of the paper is an approach and its implementation in the Klever verification framework, tailored to apply verification tools to large industrial programs.” (Section 1, p. 3) The authors summarize the automation as: “The Klever software verification framework uses SV-COMP compliant verification tools as backends and automates the following steps (they are considered in detail in corresponding subsections below):” followed by decomposition, environment generation, task generation, scheduling, preliminary processing, and expert assessment (Section 2, p. 4). Project-specific adaptations consist of configurations, specifications and plugins (Section 2, p. 4), and “Klever does not introduce any changes to the program’s source code or build processes.” (Section 2, p. 5)

## technique 1: graph-guided, iterative program decomposition

What it is. Extract file-level fragments from a large program and verify each separately, while composing selected helper fragments back into target fragments when that reduces environment-modeling effort. Klever's Project Fragment Generator (PFG) uses call graphs, build-command graphs, configuration, and optional JSON refinement.

When to use it. Use this when verifying the whole program exceeds resources and logically connected components such as kernel modules or plugins provide natural boundaries. The authors say decomposition decreases the demand for computational resources but increases the effort for environment modeling, and call file-level decomposition a “golden mean” that in their experience gives useful verification results with moderate environment-modeling effort (Section 2.1, p. 5).

How to do it.

1. Build a Clade build base containing an oriented call graph, build-command graph, and macro/type definitions (Section 2.1, pp. 5–7); the build base also holds the original source files (Appendix A.1, p. 45).
2. Choose project-specific decomposition and composition tactics from configuration (Fig. 3, p. 7).
3. Construct a file graph, then have the decomposition tactic produce a fragment graph whose nodes are file sets and whose edges represent calls between fragments (Section 2.1, p. 7).
4. Apply an optional JSON decomposition specification to add or remove files, functions, or directories, using names or regular expressions (Section 2.1, pp. 7–8).
5. Mark target nodes from configured file/function/directory selectors (Section 2.1, p. 8).
6. For each target, run the composition tactic to add helper fragments and produce final fragments (Fig. 3, p. 7).
7. Re-run after code changes; automatic build-tree selection is more stable than manually listing files (Section 2.1, p. 9).

Verus form. Inference: treat a Rust crate/module graph as the input and generate verification units whose public functions and contracts are preserved at fragment boundaries. Use `requires` and `ensures` on boundary functions to describe assumptions and guarantees; use `spec fn` predicates for dependency summaries. Inference: Verus does not provide Klever's graph extraction or C build-base semantics, so those generators and their soundness remain outside the Verus proof.

Evidence and limits. In the Linux evaluation, target fragments were loadable modules: 2,059 modules and 3,383 C files for Linux 5.5, and 2,141 modules and 3,645 files for Linux 5.12-rc3 (Table 3, p. 34). The framework reports no proof that a fragment boundary preserves all whole-program properties. Manual listings are unstable when source layout changes; tactic-based selection still depends on an unchanged build arrangement (Section 2.1, p. 9).

## technique 2: model the environment as interaction scenarios

What it is. Supply an entry point, models of influential external functions, and initialized external globals. The paper requires that an environment model “should correctly initialize external global variables.” (Section 2.2, p. 9) Express interactions as scenario transition systems whose actions are C base blocks, rendezvous signals, or jumps. This models callbacks, interrupts, library calls, and shared-memory threads around a fragment.

How to do it.

1. Define the fragment interface as global variables, function declarations, macros, and type definitions; add environment variables/functions/macros/types and external-function/thread scenario sets (Section 2.2.1, pp. 11–12).
2. Represent each scenario as `⟨V,A,R,α0⟩`: labels, actions, transition relation, and initial action (Section 2.2.1, p. 12).
3. Write base-block actions as a C precondition and C statements, with one control entry and exit and no `goto`, incomplete loop, or newly declared variable (Section 2.2.1, p. 12).
4. Connect scenarios with named signal send/receive actions using Hoare-style rendezvous synchronization; transfer matching label vectors and enforce pre/postconditions (Section 2.2.1, pp. 12–13).
5. Use sequential composition `.`, nondeterministic choice `|`, and jump actions to express loops and recursion (Section 2.2.1, pp. 12–13).
6. Generate C environment code from the intermediate model, or write the model directly in C, then verify the fragment under that model (Sections 2.2 and 2.2.2, pp. 9–16).

Verus form. Inference: encode the scenario state as a Verus state machine or ghost state, with transitions carrying `requires` conditions and `ensures` updates. Use executable Rust stubs for modeled external calls, with explicit contracts for values and global state. Inference: thread scheduling, callbacks, and nondeterministic choice need a model; Verus contracts alone do not prove that the model matches Linux or hardware.

Evidence and limits. The paper says precise models are crucial for high-quality verification results and even more important to avoid missing faults and false alarms after decomposition (Section 2.2, p. 9), but gives no completeness metric for model coverage. Its notation “limits an application scope to parallel programs with shared memory” (Section 2.2.1, p. 11), and it assumes all interaction events in a scenario happen in the same thread or process (Section 2.2, p. 10). The implemented translator is simplified: it allows only scenario models that receive signals as first and last actions, produces sequential code, and misses interleavings of actions from different scenario models (Section 2.2.2, p. 15), so the rendezvous signals in step 4 are not fully realized in generated code. In the Linux experiment, environment-model inaccuracy caused 123 of 246 memory-safety false alarms (50%) for Linux 5.5 and 128 of 253 (51%) for Linux 5.12-rc3 (Table 6, p. 36); the denominator is all memory-safety false alarms in that version.

## technique 3: encode requirements as reachability properties

What it is. Weave specification code into the program so a domain rule becomes unreachability of `__VERIFIER_error()`. The paper's API example tracks a module reference counter and raises an error on decrement before increment or on a nonzero final counter (Section 2.3, pp. 17–20).

How to do it.

1. Identify the API state to track and initialize a model variable, such as `ldv_module_refcounter = 0` (Fig. 13, p. 19).
2. Write model functions that update the state according to each API operation; use nondeterminism for conditional success (`ldv_undef_int()`) (Fig. 13, p. 19).
3. Call `ldv_assert()` at forbidden states; the Fig. 13 comment says it “calls __VERIFIER_error() or dereferences NULL” (Fig. 13, p. 19).
4. Bind original functions to model functions with aspect rules (`around: call(...)`) (Fig. 14, p. 20).
5. Use a property such as `CHECK( init(main()), LTL(G ! call(__VERIFIER_error())) )` (Fig. 15, p. 21).
6. Keep weakly related requirements in separate checks; the authors do not recommend checking them together because tools find it hard to share resources fairly between requirements and “most verification tools stop after they find a first violation of a checked property” (Section 2.3, p. 18).

Verus form. Inference: represent the tracked API state as a ghost or executable field and put forbidden-state conditions in `requires`/`ensures` contracts on the modeled API wrappers. A verified wrapper can ensure that a successful operation preserves the counter invariant; a final-state function can require zero. Inference: Verus does not use LTL reachability or aspect weaving as described here, so a Rust implementation needs explicit wrapper calls and state-machine transitions.

Evidence and limits. The authors state that for some requirements, such as data races, it may be hard or even impossible to express them with added C code, so specific means of verification tools are needed (Section 2.3, p. 18). Checking weakly related requirements with one property can hide later faults after the first violation (Section 2.3, p. 18). Inference: a requirement specification is itself a model and can be wrong; the paper's Table 6 attributes 22 of 55 (40%) Linux 5.5 and 25 of 77 (32%) Linux 5.12-rc3 API-usage false alarms to inaccurate requirement specifications (p. 36).

## technique 4: generate reproducible verification tasks and schedule them

What it is. For each fragment/specification pair, weave and preprocess source and models, merge them into one C file, attach a property, task definition, and benchmark definition, then run tasks under profiles and resource isolation.

How to do it.

1. CIF weaves source with requirement and environment aspects and preprocesses it; CIL merges files into `cil.i` (Section 2.4.1, p. 20).
2. Select a verifier profile that maps a requirement specification to tool options; add new profiles and binaries when integrating a backend (Section 2.4.2, p. 21).
3. Create a task from `cil.i`, a property file, task-definition file, and benchmark-definition file (Section 2.4.3, pp. 21–22).
4. Let Klever Core generate tasks in parallel; let Scheduler distribute resources, respect priorities, cancel jobs, and try a lower speculative limit before reserving the maximum (Section 2.5, p. 22).
5. Use BenchExec to isolate runs of Klever Core and verification tools and to measure and limit CPU and memory on a single machine; the Scheduler can also solve tasks in parallel using VerifierCloud (Section 2.5, pp. 22–23). At the moment CPAchecker is the only supported backend (Section 2.4.2, p. 21).

Verus form.

Evidence and limits. The paper reports no separate task-generation correctness proof. In its evaluation each task had 5 minutes of CPU and 5 GB of memory on an 8-vCPU, 64-GB Debian 9 VM (Section 4, p. 34). Increasing the timeout from 5 to 15 minutes for one requirement produced 5 additional Safes and 1 additional Unsafe, from about 3,300 Safes and 14 Unsafes originally, while CPAchecker CPU time rose from 15 to 25 hours (Section 4.1.3, p. 39). The paper adds that further increasing the CPU time limit gave similar improvements with degradation in CPU time (p. 39). These are results for one requirement specification.

## technique 5: process witnesses, coverage, and expert triage

What it is. Convert machine witnesses and coverage into a source-linked internal representation, hide irrelevant trace details, preserve model-state annotations, and let experts classify warnings across versions/configurations. This makes “Safe,” “Unsafe,” and “Unknown” actionable rather than raw tool output.

How to do it.

1. Extend CPAchecker violation witnesses with missing path details and internal notes such as allocation sites (Section 2.6, p. 23).
2. Translate witnesses to Klever's internal format, map expressions back to `cil.i` and original source lines, parse `NOTE`/`ASSERT` comments, and mark irrelevant trace parts (Section 2.6, pp. 23–24).
3. Merge per-task GCOV reports and compute line/function statistics by source subdirectory; use coverage to find entry points that environment models should additionally invoke and to judge environment-model quality (Section 2.6, pp. 23–24).
4. Present results as they arrive, visualize witnesses and coverage, and attach expert marks with descriptions, tags, and history (Section 2.7, pp. 24–26).
5. Match similar witnesses and marks across versions/configurations, and compare jobs as file/result sets (Section 2.7.2, p. 25).

Verus form. Inference: store each Verus verification result with source revision, exact contract, tool/solver version, model assumptions, and proof status. A trace adapter can map solver counterexamples to Rust source locations; coverage can identify functions never exercised by the environment model. Inference: a Verus proof result alone does not produce a complete runtime witness or establish coverage of external behavior.

Evidence. In the Linux study, Klever generated 31,444 tasks for Linux 5.5 and 31,886 for Linux 5.12-rc3. For memory safety, Linux 5.5 yielded 280 Unsafe (14%), 910 Safe (44%), and 869 Unknown (42%) out of 2,059 tasks; Linux 5.12-rc3 yielded 278 (13%), 901 (42%), and 962 (45%) out of 2,141 tasks (Table 4, p. 35). Inference: for API usage, the Table 4 rows sum to 35,003 (85+29,033+5,885) for Linux 5.5 and 36,397 (110+29,319+6,968) for Linux 5.12-rc3, i.e. 17 requirement specifications times 2,059 and 2,141 modules, and the table's percentages are rounded from these denominators. Adding the memory-safety rows gives 37,062 and 38,538 results, which does not equal the 31,444 and 31,886 “successfully generated” tasks stated in Section 4.1 (p. 35); the paper does not explain the difference. Code coverage totals were 365/957 lines (38%) and 17.8/52.7 thousand functions (34%) for Linux 5.5, and 364/941 lines (39%) and 17.5/51.7 thousand functions (34%) for Linux 5.12-rc3 (Table 9, p. 39). Overall wall time was 10 hours for memory safety and 71 hours for API usage on Linux 5.5, versus 11 and 85 hours on Linux 5.12-rc3; CPU time of CPAchecker and Klever components is reported separately and is larger than overall time (Table 10, p. 40), which Inference: reflects parallel execution on 8 virtual cores. The authors say it took about 7.4 days in total to get all verification results (Section 4.3, p. 39).

The authors manually assessed Unsafes. For Linux 5.5, 34 of 280 memory-safety Unsafes (12%) were faults and 246 (88%) false alarms; API usage had 30 of 85 (35%) faults and 55 (65%) false alarms (Table 5, p. 36). Across Linux 5.5, 64 faults were revealed; 41/64 occurred on seldom-executed error paths and 52/64 required complicated environment interaction (Section 4.1.2, pp. 37–38). Twenty faults were fixed by developers, 11 were also identified by other means, and 14 commits were backported to stable branches (Section 4.1.2, p. 37).

## what is proved, measured, and trusted

Inference: Klever proves only the properties its backend can establish under the generated source and environment model. The paper does not prove that decomposition, models, specifications, or result triage are semantically complete. Unknowns include tool and component failures; for memory safety, CPAchecker caused 557 of 869 Unknowns (64%) in Linux 5.5 and 595 of 962 (62%) in Linux 5.12-rc3 (Table 7, p. 38). Timeouts were 510/557 (92%) and 526/595 (88%) of those CPAchecker Unknowns (Table 8, p. 38).

Inference: trusted elements include CIL/CIF transformations, Clade graphs, environment models, requirement instrumentation, CPAchecker, solver assumptions, BenchExec isolation, and expert classification. A Verus adaptation would additionally trust Rust/Verus front-end translation, solver soundness, proof erasure, external APIs, and the correctness of each generated model. Inference: the high false-alarm rates (88% and 91% of memory-safety Unsafes, Table 5, p. 36) show that environment and backend precision materially affect product confidence.

## techniques for the catalog

- graph-guided decomposition: split large source trees with call/build graphs, configurable tactics, and manual refinement
- scenario environment modeling: encode callbacks, interrupts, globals, and external calls as transition-system actions and rendezvous signals
- reachability specifications: weave model state and error calls so API rules become unreachability properties
- reproducible task generation: assemble merged source, property, task, and benchmark files under verifier profiles and resource limits
- witness and coverage triage: source-link traces, merge coverage, classify warnings, and compare marks across versions
