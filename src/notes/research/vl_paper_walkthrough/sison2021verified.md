# Verified Secure Compilation for Mixed-Sensitivity Concurrent Programs
(authored by agents unless marked 🧑)
Tag: `sison2021verified`, [paper](https://arxiv.org/abs/2010.14032)

This paper formalizes a compiler that preserves confidentiality when concurrent threads reuse memory for values whose sensitivity changes over time. The source is a While language with mutex locks; the target is a small RISC language with registers and lock instructions. Isabelle/HOL proves the semantics, refinement, and noninterference theorems. The abstract states: “Here we demonstrate, using Isabelle/HOL, that it is feasible to verify that a compiler preserves noninterference, the strictest kind of confidentiality property, for mixed-sensitivity concurrent programs.” (abstract, p.1)

## technique: value-dependent concurrent noninterference

What it is: concurrent value-dependent noninterference (CVDNI) compares two executions whose memories agree on what is observable at the current mode state. A location can be High or Low depending on control variables, and locks determine which variables a thread may read or write. The property is a two-run relation, not a single-run assertion. The paper explains that mixed-sensitivity programs “might reuse memory shared between their threads to hold data of different sensitivity levels at different times.” (abstract, p.1)

When to use it: use CVDNI when a system has shared mutable state, concurrency, and classifications that change with data or mode. It is appropriate for a device or service where the same buffer carries both secret and public events at different times.

How to do it:
1. Define a mode state `mds`: ghost state mapping each of AsmNoW, AsmNoRW, GuarNoW, GuarNoRW to a set of shared variables, for which the thread assumes exclusive write (or read and write) permission or guarantees it respects such permission, typically granted by a locking scheme (section 2.2, pp.7–8).
2. Define low-equivalent memories modulo that mode. Low-classified non-control variables need agree when readable; control variables and mode state have stronger equality requirements (Definitions 2.1–2.3, p.8).
3. Define strong low bisimulation modulo modes. Pair configurations at equal low observations and require each step in one run to match a step in the other while preserving the relation (Definition 2.4, p.9).
4. Add closedness under globally consistent changes so environmental writes to locations allowed by the mode cannot break the witness relation (Definition 2.6, p.9).
5. Use per-thread compositional security and a sound-mode-use side condition to derive whole-system security (Theorem 2.8 and Definitions 2.10–2.12, pp.10–12).

Verus form (Inference): represent the mode and memory view as ghost state. Define a `spec fn low_equiv` over two memories and a mode, then prove each Rust operation preserves it under `requires` lock-ownership conditions. For a concurrent protocol, a Verus state machine can expose mode transitions and shared resources. CVDNI is a relational proof, so one usually proves a lemma over two ghost executions or uses a relational product state; it is not a single `ensures` clause on one run.

Evidence and limits: the paper gives a touchscreen worker example (Figure 1, p.5) and formal definitions. The compositionality theorem (Theorem 2.8) is from Murray et al. (2016b); this paper reports proving in Isabelle/HOL that it holds for any INIT and EXTRA parameters (p.10) and proves the global modes compatibility invariant for While (section 3.3, pp.25–27). Its confidentiality guarantee assumes mode compliance, lock discipline, and, for the compiler application, no secret-dependent branching. The whole-system property also compares runs under the same fixed schedule, so it models only schedulers whose decisions never depend on secrets (section 2.2, p.11). Inference: a Verus adaptation must model the actual memory allocator, channels, and hardware interfaces or treat their contracts as trusted assumptions.

## technique: cube-shaped secure refinement

What it is: secure refinement relates abstract and concrete local configurations while preserving a source noninterference witness and a concrete coupling invariant. The cube checks a concrete step, an abstract sequence of steps, and a second related execution simultaneously. The paper says, “The essence of the proof technique is to require that a number of conditions—analogous to those for strong-low-bisim-mm (Definition 2.4)—be imposed on the nominated R and I” (section 2.3, p.13).

How to do it:
1. Nominate `R`, relating each abstract configuration to a concrete configuration.
2. Nominate `I`, a coupling invariant relating pairs of concrete configurations that arise from a pair related by the source bisimulation `B` (section 2.3, p.13).
3. Prove `preserves-modes-mem R`: related configurations have equal mode state and complete shared memory (Definition 2.13, p.14).
4. Prove `closed-others R`: identical environment changes allowed by the mode preserve `R` (Definition 2.14, p.14).
5. Prove `cg-consistent I`, symmetry of `I`, and the cube-shaped coupling-invariant preservation condition (Definition 2.15, p.14).
6. Derive a concrete bisimulation `B_C of B R I` from `B`, `R`, and `I` (Definition 2.16); Theorem 2.17 states that strong-low-bisim-mm is preserved (p.15). The paper credits the soundness theorem to Murray et al. (2016b).

Verus form (Inference): make `R` a ghost relation between source and target abstract states and `I` a predicate over two target states. Each compiler step lemma should preserve `R`; paired-step lemmas should preserve `I` and low equivalence. Rust code does not retain the source AST at runtime, so the relation is ghost-only. The cube itself is a proof obligation, not an executable data structure.

Evidence and limits: the paper says the restrictions on refinement are tighter than those on strong-low-bisim-mm, in that R must preserve the shared memory in its entirety, not just observable memory (section 2.3, p.14). It assumes the source language's bisimulation witness and mode semantics are already established. Inference: this is a security-preserving compiler proof pattern, not a general theorem that any semantics-preserving compiler preserves confidentiality.

## technique: decompose the cube with a pacing function

What it is: the decomposition principle replaces the large cube with an ordinary square simulation plus separate security obligations for timing, termination, and coupling. A pacing function `abs-steps` says how many abstract steps correspond to one concrete step. The paper states: “The decomposition requires the verifier to nominate a new parameter, called abs-steps or the pacing function.” (section 2.4, p.15)

How to do it:
1. Prove square-shaped refinement: every concrete step from `c` is matched by `abs-steps a c` abstract steps from related `a`, ending in a related pair (Definition 2.18, p.15).
2. Prove stopping consistency: paired concrete configurations stop together, preventing termination leaks (Definition 2.19, p.16).
3. Prove pacing consistency: related abstract/concrete pairs use the same `abs-steps`, preventing timing leaks (Definition 2.19, p.16).
4. Prove `I` remains closed under lockstep concrete execution and preserves mode equality (Definition 2.19, p.16).
5. Apply Theorem 2.20 (p.17), which derives the original cube-shaped secure refinement from these obligations.

Verus form (Inference): define a ghost `spec fn abs_steps(src, dst) -> nat` and prove a lemma that one target operation corresponds to that many source specification transitions. A loop or state-machine invariant can carry the coupling relation and mode equality. Timing is usually abstract in Verus; to model the paper's guarantee, include an explicit step counter or cost ghost state and prove equality across paired executions.

Evidence: the authors re-proved a secret-branch refinement in Isabelle. The abstract program has 9 imperative commands; the refined program has 16 commands with padding. The original theory has about 4.6K lines, including about 3.6K proof lines; the decomposed proof has about 2K proof lines, a reported 44% reduction (section 2.4, pp.16–17). The paper says, “We use proof size as a proxy for proof effort.” (section 2.4, p.17) This comparison has one example and no independent timing denominator.

## technique: compile expressions only when locks make them stable

What it is: the compiler tracks register contents as expressions over shared variables and tracks assumptions that other threads cannot write those variables. It rejects programs whose expression evaluation can race. The paper states, “The wr-compiler’s approach to preserving the contents of shared memory is to ensure:” followed by two items, the second being “That expression evaluation is race-free—that is, free of any race conditions with other threads that would render the calculated expression inaccurate.” (section 5.1, p.31)

How to do it:
1. Maintain a register record `Φ` mapping registers to expressions and an assumption record `S` containing no-write and no-read/write assumptions (section 5.1, p.31).
2. Define `var-stable S v` when `v` and all control variables that classify `v` are protected by `S` (Definition 5.1, p.32).
3. Define `regrec-stable C` when every variable in every register expression is stable under the accompanying assumptions (Definition 5.2, p.32).
4. Before compiling, run recursive stability checks. Reject an input if it reads an unstable variable, writes a lock-governed shared variable without the required lock, or has branches and loops whose lock assumptions do not converge (section 5.1.1, pp.32–33).
5. When compiling `unlock(k)`, flush register entries mentioning variables made unstable by releasing `k` (proof of Lemma 5.4, p.34).
6. Prove Lemma 5.4: every successful compilation returns only stable register records (section 5.1.2, p.33).

Verus form (Inference): represent `Φ` and `S` as ghost maps and sets. A wrapper for a shared read should require a lock token and ensure the returned value equals the memory value at the read point. On unlock, a proof function should invalidate or remove cached expressions. The executable Rust cache and lock implementation must satisfy these ghost-state transitions; `external_body` would leave the crucial compiler property unproved and should not be used for the verified function.

Evidence and limits: compilation can return `failed = True` when it detects a race or expression depth beyond the limit assumed by the register-allocation model (section 5.1, p.32; Appendix B). This is a rejection policy, not evidence that arbitrary source programs compile. Inference: VL should treat lock-discipline checking as a prerequisite check on inputs and report rejected programs separately from verified compilations.

## technique: preserve a no-high-branching restriction

What it is: the compiler assumes the source has no conditional branch whose condition depends on High data. The source bisimulation includes equal program commands and equal conditional results in paired memories (Definition 5.5, p.34). The target relation adds `pc-security`, requiring equal program counters and program texts (Definition 5.6, p.34).

How to do it:
1. Require a source confidentiality witness satisfying `no-high-branching` (section 5.2, p.34).
2. Compile expressions to loads, operations, and moves; compile expressions to Load, Op and MoveK instructions and conditionals to a conditional jump Jz after expression evaluation (section 4, pp.28–29; section 5.3.1, p.35; section 5.3.2, p.37); in the proof, no-high-branching with memory preservation ensures the branch outcome is the same on both sides (Lemma 5.14, p.40).
3. Define `Iwr` to relate only target configurations with the same program counter and the same RISC program text (Definition 5.13, section 5.3.3, p.39); it places no constraint on registers or memory.
4. Prove that the target bisimulation satisfies `pc-security` and therefore preserves per-thread confidentiality (Theorem 5.24, p.44).

Verus form (Inference): keep secret-dependent branch avoidance as a specification predicate over control flow, or prove that branch conditions depend only on low data. A state machine can expose a ghost program counter and require paired states to take the same transition. Verus cannot infer this policy from arbitrary Rust code; it must be stated and proved for each branch.

Evidence and limits: the compiler's theorem explicitly assumes `com-secure` with `no-high-branching`, no locks held initially, and the input requirements `compile-cmd-input-reqs` together with a successful compilation (Theorem 5.24, p.44). Inference: programs with deliberate constant-time secret branches would need a different source theorem and are outside this compiler result.

## technique: compose per-thread compiler proofs into whole-system security

What it is: the paper proves per-thread confidentiality and local mode compliance, then invokes a whole-system refinement theorem. The compiler's target uses the same lock semantics as the source, so local mode compliance comes from Lemma 5.25 and global modes compatibility from Lemma 5.26 under the same no-locks-held, `mds0` initial conditions (pp.44–45).

How to do it:
1. Prove every source thread is `com-secure` with no high branching and no locks held initially.
2. Compile every thread successfully and prove `compile-cmd-input-reqs` and local mode compliance for the source thread (Theorem 5.22 assumes both).
3. Initialize each target register bank and mode state consistently; the paper uses an empty compilation record C0 (Definition 5.20, p.42) and, in the case study, registers initialized to zero (Theorem 6.4, p.52).
4. Apply Theorem 5.22 or Theorem 5.27 to obtain `sys-secure` for the concurrent target system (pp.42–45).
5. If some target threads are handwritten RISC, prove their per-thread security directly and use the mixed composition option described after Theorem 5.24 (section 5.4.2, pp.43–45).

Verus form (Inference): give each Rust thread a state-machine instance with lock and mode resources, prove its local low-bisimulation relation, then prove a composition lemma over the shared resources. The target of the paper is a compiler, whereas VL generates Rust directly; the reusable part is the proof architecture, not the Isabelle theorem statements.

Evidence: Theorem 5.22 requires a list-length equality, successful compilation for each source thread, input requirements, and local mode compliance, then concludes whole-system security (p.42). The theorem has no empirical success fraction; it is conditional on all premises.

## case study: cross-domain desktop compositor

What it is: the case study models a Cross Domain Desktop Compositor HID switch with three concurrent components: an input driver, a switch, and an overlay driver. Shared buffers and device interfaces use mutex locks. Keyboard data is High when a control variable indicates the High domain and Low otherwise; mouse data remains Low (section 6.1.3, pp.49–50).

How to do it:
1. Model the three components and their shared buffers in While, protecting accesses with locks (sections 6.1–6.1.2, pp.46–49).
2. Give mixed-sensitivity locations value-dependent classifications. For example, input-event data is High only when the event is a keyboard event and the indicated domain is High; otherwise it is Low (section 6.1.3, pp.49–50).
3. Verify each While thread with the adapted security type system, local mode compliance, and no-high-branching (section 6.2, pp.50–51).
4. Use Theorem 2.8 with Lemma 3.20 to derive whole-system While confidentiality, stated as Theorem 6.2 (pp.51–52).
5. Execute the Isabelle `compile-cmd` on all three threads and define their RISC texts as the compiled instruction lists (section 6.3, p.52).
6. Prove Theorem 6.4, whole-system confidentiality for the RISC model with zero-initialized registers (p.52), by any of three routes: Option 1 uses Theorem 5.22 or 5.27; Option 2 uses Theorem 5.24, Lemma 5.25 and Theorem 2.8; Option 3 uses Theorem 2.23 directly (p.53).

Verus form (Inference): encode each component as a Rust module with a Verus state machine for lock-protected buffers and a ghost sensitivity classification. Prove that copying an event preserves the classification predicate and that output to a Low sink cannot depend on High input. Hardware and OS isolation assumptions need explicit trusted interfaces or separate proofs.

Evidence and limits: the paper reports formal Isabelle proofs for the While theorem (Theorem 6.2) and the compiled RISC theorem (Theorem 6.4), with three proof routes for the latter (section 6.3, pp.52–53). It models a single-place input buffer and treats private memory as shared variables under a permanently held lock (sections 6.1.2–6.1.3, pp.48–50). Inference: the case study establishes an end-to-end formal result for this model and assumptions; it does not validate a deployed CDDC hardware implementation.

## what is proved, measured, and trusted

The paper proves soundness of the decomposition principle (Theorem 2.20), the global modes compatibility invariant for While, compiler refinement, per-thread and whole-system confidentiality preservation, and whole-system confidentiality for the CDDC model. The CVDNI compositionality theorem and the soundness of cube refinement (Theorem 2.17) are from Murray et al. (2016b); this paper adapts them to INIT and EXTRA parameters. The only quantitative proof-effort result is the single refinement example's reduction from about 3.6K to about 2K proof lines, reported as 44%; the denominators are proof lines in that Isabelle theory, not programs or compiler runs. The case study has three modeled threads, and all three pass the compiler's stability checks, but no larger success-rate denominator is reported.

Assumptions the paper states include: schedulers whose decisions never depend on secrets (p.11); an execution environment that stops threads from seeing each other's program location, program text and registers (pp.21, 29); initial no-locks-held conditions and `mds0`; no-high-branching; sufficient registers for the register allocation scheme (Appendix B); no weak-memory effects (section 7.5, pp.55–56); and, for the case study, per-thread proofs from Sison (2020) with thread-private memory modelled as shared variables under permanently held locks (pp.48, 51). Inference: Isabelle/HOL and its kernel, and the correctness of the semantics as models of real hardware, are trusted as well. The authors explicitly separate semantics preservation from security preservation. Inference: for agent-written verified Rust, the main product threat is a mismatch between the ghost sensitivity and lock model and the deployed code or hardware; a Verus proof of an abstract model alone does not close that gap. Inference: the paper's method is valuable because it makes those assumptions explicit and turns compiler-induced timing, termination, and race changes into named proof obligations.

## techniques for the catalog

- value-dependent noninterference: compare low-observable behavior of paired concurrent executions under a changing mode state
- cube secure refinement: relate source and target configurations with a refinement relation and concrete coupling invariant
- decomposition with pacing: replace the cube by square simulation plus equal stopping, equal pacing, and lockstep coupling obligations
- stable expression compilation: track register expressions and reject source programs that evaluate unstable shared data
- no-high-branching preservation: carry equal control-flow and program-counter relations from source to target
- whole-system composition: combine per-thread confidentiality, lock compliance, and no-locks-held initialization into a system theorem
- mixed-sensitivity case study: classify shared buffers by control-dependent sensitivity and compile three verified threads to RISC
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "To preserve security for mixed-sensitivity concurrent programs, CVDNI-preserving refinement demands small-step preservation of the contents of all shared memory locations including those that control value-dependent classifications and implement locks."): read the whole paper (arXiv v2, printed pages 1–63 including appendices) and checked every quotation, page and section reference, definition and theorem number, proof-line figures and technique steps against it; changed page references to the arXiv printed page numbers, corrected one quotation that used an unmarked ellipsis and one that dropped words, fixed several steps (mode state description, Iwr, case-study routes, Theorem 5.24 page, register initialisation), narrowed claims about what this paper proves versus what it takes from Murray et al. (2016b), added the scheduler and environment assumptions, marked inferences, replaced the DOI link with the arXiv link given in the paper text; did not check the Isabelle theories (not provided), the cited external works, or the Verus-form suggestions beyond marking them as Inference.
