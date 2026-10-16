# Klever: Verification Framework for Critical Industrial C Programs
(authored by agents unless marked 🧑)
Tag: `zakharov2023klever`, [paper](http://arxiv.org/abs/2309.16427v1)

## purpose and workflow

Klever is a framework for applying SV-COMP-compatible automatic verification tools to large critical C programs. The paper's problem is scale plus missing operational support: industrial programs have hundreds or thousands of KLOC, interact with environments, evolve across versions/configurations, and need result triage. Its main contribution is a workflow covering “program decomposition; environment modeling; stating requirement specifications; presenting verification results and enabling their triage.” (Section 1, p. 3).

The workflow is: configure a job; decompose source into moderate fragments; generate environment models; generate and solve verification tasks; process results; and analyze them. The paper states, “The main contribution of the paper is an approach and its implementation in the Klever verification framework, tailored to apply verification tools to large industrial programs.” (Section 1, p. 3) The authors summarize the automation as: “The Klever software verification framework uses SV-COMP compliant verification tools as backends and automates the following steps (they are considered in detail in corresponding subsections below):” followed by decomposition, environment generation, task generation, scheduling, preliminary processing, and expert assessment (Section 2, p. 4). Project adaptations supply configurations, specifications, and plugins without changing target source or build processes (Section 2, pp. 4–5).

## technique 1: graph-guided, iterative program decomposition

What it is. Extract file-level fragments from a large program and verify each separately, while composing selected helper fragments back into target fragments when that reduces environment-modeling effort. Klever's Project Fragment Generator (PFG) uses call graphs, build-command graphs, configuration, and optional JSON refinement.

When to use it. Use this when verifying the whole program exceeds resources and logically connected components such as kernel modules or plugins provide natural boundaries. The authors call file-level decomposition a “golden mean” because it reduces computation while keeping environment modeling manageable (Section 2.1, p. 5).

How to do it.

1. Build a Clade build base containing an oriented call graph, build-command graph, macro/type dependencies, and source files (Section 2.1, pp. 5–7).
2. Choose project-specific decomposition and composition tactics from configuration (Fig. 3, p. 7).
3. Construct a file graph, then have the decomposition tactic produce a fragment graph whose nodes are file sets and whose edges represent calls between fragments (Section 2.1, p. 8).
4. Apply an optional JSON decomposition specification to add or remove files, functions, or directories, using names or regular expressions (Section 2.1, p. 8).
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
5. Use sequential composition `.`, nondeterministic choice `|`, and jump actions to express loops and recursion (Section 2.2.1, p. 13).
6. Generate C environment code or write the model directly, then verify the fragment under that model (Section 2.2, pp. 10–13).

Verus form. Inference: encode the scenario state as a Verus state machine or ghost state, with transitions carrying `requires` conditions and `ensures` updates. Use executable Rust stubs for modeled external calls, with explicit contracts for values and global state. Inference: thread scheduling, callbacks, and nondeterministic choice need a model; Verus contracts alone do not prove that the model matches Linux or hardware.

Evidence and limits. The paper says precise models are crucial to avoid missed faults and false alarms after decomposition (Section 2.2, p. 10), but gives no completeness metric for model coverage. Its scenario semantics is limited to parallel shared-memory programs and assumes interaction events in a scenario happen in one thread/process (Section 2.2.1, p. 12). In the Linux experiment, environment-model inaccuracy caused 123 of 246 memory-safety false alarms (50%) for Linux 5.5 and 128 of 253 (51%) for Linux 5.12-rc3 (Table 6, p. 36); the denominator is all memory-safety false alarms in that version.

## technique 3: encode requirements as reachability properties

What it is. Weave specification code into the program so a domain rule becomes unreachability of `__VERIFIER_error()`. The paper's API example tracks a module reference counter and raises an error on decrement before increment or on a nonzero final counter (Sections 2.3, pp. 17–20).

How to do it.

1. Identify the API state to track and initialize a model variable, such as `ldv_module_refcounter = 0` (Fig. 13, p. 19).
2. Write model functions that update the state according to each API operation; use nondeterminism for conditional success (`ldv_undef_int()`) (Fig. 13, p. 19).
3. Call `ldv_assert()` at forbidden states; define it to call `__VERIFIER_error()` or dereference NULL (Section 2.3, p. 18).
4. Bind original functions to model functions with aspect rules (`around: call(...)`) (Fig. 14, p. 20).
5. Use a property such as `CHECK( init(main()), LTL(G ! call(__VERIFIER_error())) )` (Fig. 15, p. 21).
6. Keep weakly related requirements in separate checks because many tools stop after the first violation (Section 2.3, p. 18).

Verus form. Inference: represent the tracked API state as a ghost or executable field and put forbidden-state conditions in `requires`/`ensures` contracts on the modeled API wrappers. A verified wrapper can ensure that a successful operation preserves the counter invariant; a final-state function can require zero. Inference: Verus does not use LTL reachability or aspect weaving as described here, so a Rust implementation needs explicit wrapper calls and state-machine transitions.

Evidence and limits. The authors state that some requirements, such as races, cannot be expressed as added C statements and require verifier-specific mechanisms (Section 2.3, p. 18). Combining unrelated properties can starve resource allocation and hide later faults after the first violation (Section 2.3, p. 18). The requirement specification therefore remains a model and can be wrong.

## technique 4: generate reproducible verification tasks and schedule them

What it is. For each fragment/specification pair, weave and preprocess source and models, merge them into one C file, attach a property, task definition, and benchmark definition, then run tasks under profiles and resource isolation.

How to do it.

1. CIF weaves source with requirement and environment aspects and preprocesses it; CIL merges files into `cil.i` (Section 2.4.1, p. 20).
2. Select a verifier profile that maps a requirement specification to tool options; add new profiles and binaries when integrating a backend (Section 2.4.2, p. 21).
3. Create a task from `cil.i`, a property file, task-definition file, and benchmark-definition file (Section 2.4.3, pp. 21–22).
4. Let Klever Core generate tasks in parallel; let Scheduler distribute resources, respect priorities, cancel jobs, and try a lower speculative limit before reserving the maximum (Section 2.5, p. 22).
5. Use BenchExec to isolate runs and measure/limit CPU and memory, with VerifierCloud for parallel execution across machines (Section 2.5, pp. 22–23).

Verus form. Inference: the equivalent VL pipeline should generate a stable verification manifest per Rust fragment, Verus configuration, and specification, then record tool version, solver settings, limits, and source revision. Contracts at fragment boundaries can make unit assumptions explicit. Inference: resource scheduling and reproducibility metadata are engineering controls outside Verus's proof calculus.

Evidence and limits. The paper reports no separate task-generation correctness proof. In its evaluation each task had 5 minutes of CPU and 5 GB of memory on an 8-vCPU, 64-GB Debian 9 VM (Section 4, p. 34). Increasing the timeout from 5 to 15 minutes for one requirement produced 5 additional Safes and 1 additional Unsafe, from about 3,300 Safes and 14 Unsafes originally, while CPAchecker CPU time rose from 15 to 25 hours (Section 4.1.3, p. 39). These are one configuration's results.

## technique 5: process witnesses, coverage, and expert triage

What it is. Convert machine witnesses and coverage into a source-linked internal representation, hide irrelevant trace details, preserve model-state annotations, and let experts classify warnings across versions/configurations. This makes “Safe,” “Unsafe,” and “Unknown” actionable rather than raw tool output.

How to do it.

1. Extend CPAchecker violation witnesses with missing path details and internal notes such as allocation sites (Section 2.6, p. 23).
2. Translate witnesses to Klever's internal format, map expressions back to `cil.i` and original source lines, parse `NOTE`/`ASSERT` comments, and mark irrelevant trace parts (Section 2.6, pp. 23–24).
3. Merge per-task GCOV reports and compute line/function statistics by source subdirectory; use coverage to find uninvoked entry points and weak environment models (Section 2.6, p. 24).
4. Present results as they arrive, visualize witnesses and coverage, and attach expert marks with descriptions, tags, and history (Section 2.7, pp. 24–26).
5. Match similar witnesses and marks across versions/configurations, and compare jobs as file/result sets (Section 2.7.2, p. 26).

Verus form. Inference: store each Verus verification result with source revision, exact contract, tool/solver version, model assumptions, and proof status. A trace adapter can map solver counterexamples to Rust source locations; coverage can identify functions never exercised by the environment model. Inference: a Verus proof result alone does not produce a complete runtime witness or establish coverage of external behavior.

Evidence. In the Linux study, Klever generated 31,444 tasks for Linux 5.5 and 31,886 for Linux 5.12-rc3. For memory safety, Linux 5.5 yielded 280 Unsafe (14%), 910 Safe (44%), and 869 Unknown (42%) out of 2,059 tasks; Linux 5.12-rc3 yielded 278 (13%), 901 (42%), and 962 (45%) out of 2,141 tasks (Table 4, p. 35). For API usage, the corresponding totals are 35,003 tasks (85+29,033+5,885) for Linux 5.5 and 36,397 tasks (110+29,319+6,968) for Linux 5.12-rc3; the table's percentages are rounded from these denominators. Code coverage totals were 365/957 lines (38%) and 17.8/52.7 thousand functions (34%) for Linux 5.5, and 364/941 lines (39%) and 17.5/51.7 thousand functions (34%) for Linux 5.12-rc3 (Table 9, p. 39). Overall wall time was 10 hours for memory safety and 71 hours for API usage on Linux 5.5, versus 11 and 85 hours on Linux 5.12-rc3; CPU time totals differ because tasks ran in parallel (Table 10, p. 40).

The authors manually assessed Unsafes. For Linux 5.5, 34 of 280 memory-safety Unsafes (12%) were faults and 246 (88%) false alarms; API usage had 30 of 85 (35%) faults and 55 (65%) false alarms (Table 5, p. 36). Across Linux 5.5, 64 faults were revealed; 41/64 occurred on seldom-executed error paths and 52/64 required complicated environment interaction (Section 4.1.2, pp. 37–38). Twenty faults were fixed by developers, 11 were also identified by other means, and 14 commits were backported to stable branches (Section 4.1.2, p. 37).

## what is proved, measured, and trusted

Klever proves only the properties its backend can establish under the generated source and environment model. The paper does not prove that decomposition, models, specifications, or result triage are semantically complete. Unknowns include tool and component failures; for memory safety, CPAchecker caused 557 of 869 Unknowns (64%) in Linux 5.5 and 595 of 962 (62%) in Linux 5.12-rc3 (Table 7, p. 38). Timeouts were 510/557 (92%) and 526/595 (88%) of those CPAchecker Unknowns (Table 8, p. 38).

Trusted elements include CIL/CIF transformations, Clade graphs, environment models, requirement instrumentation, CPAchecker, solver assumptions, BenchExec isolation, and expert classification. Inference: a Verus adaptation would additionally trust Rust/Verus front-end translation, solver soundness, proof erasure, external APIs, and the correctness of each generated model. The high false-alarm rates show that environment and backend precision materially affect product confidence.

## implications for VeruLaw

Inference: the most transferable idea is the end-to-end verification service, not a new verification logic: partition a large Rust/Verus codebase, model external interactions, generate reproducible proof jobs, isolate resources, and make results auditable across revisions. Inference: VL should not redo generic fragment scheduling, environment modeling, or witness/coverage triage as novel concepts; Klever already provides those patterns and a 2,059–2,141-module evaluation.

Inference: the threat to agent-written verified Rust is high for systems with external callbacks, drivers, or rapidly changing dependencies. A passing proof can be conditional on an incomplete environment model, while a failed proof can be an Unknown rather than a code defect. For self-contained sequential Rust with explicit contracts, the environment-model threat is lower, but the paper offers no Verus-specific evidence.

## techniques for the catalog

- graph-guided decomposition: split large source trees with call/build graphs, configurable tactics, and manual refinement
- scenario environment modeling: encode callbacks, interrupts, globals, and external calls as transition-system actions and rendezvous signals
- reachability specifications: weave model state and error calls so API rules become unreachability properties
- reproducible task generation: assemble merged source, property, task, and benchmark files under verifier profiles and resource limits
- witness and coverage triage: source-link traces, merge coverage, classify warnings, and compare marks across versions
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
