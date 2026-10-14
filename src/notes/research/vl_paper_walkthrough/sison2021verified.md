# Verified Secure Compilation for Mixed-Sensitivity Concurrent Programs
(authored by agents unless marked 🧑)
Tag: `sison2021verified`, [paper](https://doi.org/10.1017/s0956796821000162)

This paper formalizes a compiler that preserves confidentiality when concurrent threads reuse memory for values whose sensitivity changes over time. The source is a While language with mutex locks; the target is a small RISC language with registers and lock instructions. Isabelle/HOL proves the semantics, refinement, and noninterference theorems. The abstract states: “Here we demonstrate, using Isabelle/HOL, that it is feasible to verify that a compiler preserves noninterference, the strictest kind of confidentiality property, for mixed-sensitivity concurrent programs.” (abstract, p.1)

## technique: value-dependent concurrent noninterference

What it is: concurrent value-dependent noninterference (CVDNI) compares two executions whose memories agree on what is observable at the current mode state. A location can be High or Low depending on control variables, and locks determine which variables a thread may read or write. The property is a two-run relation, not a single-run assertion. The paper explains that mixed-sensitivity programs “might reuse memory shared between their threads to hold data of different sensitivity levels at different times.” (abstract, p.1)

When to use it: use CVDNI when a system has shared mutable state, concurrency, and classifications that change with data or mode. It is appropriate for a device or service where the same buffer carries both secret and public events at different times.

How to do it:
1. Define a mode state containing lock ownership and assumptions about which variables are readable or writable (section 2.2, pp.5–8).
2. Define low-equivalent memories modulo that mode. Low-classified non-control variables need agree when readable; control variables and mode state have stronger equality requirements (Definitions 2.1–2.3, pp.6–7).
3. Define strong low bisimulation modulo modes. Pair configurations at equal low observations and require each step in one run to match a step in the other while preserving the relation (Definition 2.4, pp.8–9).
4. Add closedness under globally consistent changes so environmental writes to locations allowed by the mode cannot break the witness relation (Definition 2.6, p.10).
5. Use per-thread compositional security and a sound-mode-use side condition to derive whole-system security (Theorem 2.8, pp.11–12).

Verus form (Inference): represent the mode and memory view as ghost state. Define a `spec fn low_equiv` over two memories and a mode, then prove each Rust operation preserves it under `requires` lock-ownership conditions. For a concurrent protocol, a Verus state machine can expose mode transitions and shared resources. CVDNI is a relational proof, so one usually proves a lemma over two ghost executions or uses a relational product state; it is not a single `ensures` clause on one run.

Evidence and limits: the paper gives a touchscreen worker example and formal definitions, then proves compositionality in Isabelle. Its confidentiality guarantee assumes mode compliance, lock discipline, and no secret-dependent branching for the compiler application. Inference: a Verus adaptation must model the actual memory allocator, channels, and hardware interfaces or treat their contracts as trusted assumptions.

## technique: cube-shaped secure refinement

What it is: secure refinement relates abstract and concrete local configurations while preserving a source noninterference witness and a concrete coupling invariant. The cube checks a concrete step, an abstract sequence of steps, and a second related execution simultaneously. The paper says, “The essence of the proof technique is to require that a number of conditions—analogous to those for strong-low-bisim-mm—be imposed on the nominated R and I.” (section 2.3, p.13)

How to do it:
1. Nominate `R`, relating each abstract configuration to a concrete configuration.
2. Nominate `I`, a coupling invariant relating pairs of concrete configurations that arise from a pair related by the source bisimulation `B` (section 2.3, p.13).
3. Prove `preserves-modes-mem R`: related configurations have equal mode state and complete shared memory (Definition 2.13, p.14).
4. Prove `closed-others R`: identical environment changes allowed by the mode preserve `R` (Definition 2.14, p.14).
5. Prove `cg-consistent I`, symmetry of `I`, and the cube-shaped coupling-invariant preservation condition (Definition 2.15, p.14).
6. Derive a concrete bisimulation from `B`, `R`, and `I`; Theorem 2.17 proves strong-low-bisimulation is preserved (pp.14–15).

Verus form (Inference): make `R` a ghost relation between source and target abstract states and `I` a predicate over two target states. Each compiler step lemma should preserve `R`; paired-step lemmas should preserve `I` and low equivalence. Rust code does not retain the source AST at runtime, so the relation is ghost-only. The cube itself is a proof obligation, not an executable data structure.

Evidence and limits: the relation requires equality of all shared memory, which is stronger than ordinary functional refinement (section 2.3, p.14). It assumes the source language's bisimulation witness and mode semantics are already established. Inference: this is a security-preserving compiler proof pattern, not a general theorem that any semantics-preserving compiler preserves confidentiality.

## technique: decompose the cube with a pacing function

What it is: the decomposition principle replaces the large cube with an ordinary square simulation plus separate security obligations for timing, termination, and coupling. A pacing function `abs-steps` says how many abstract steps correspond to one concrete step. The paper states: “The decomposition requires the verifier to nominate a new parameter, called abs-steps or the pacing function.” (section 2.4, p.15)

How to do it:
1. Prove square-shaped refinement: every concrete step from `c` is matched by `abs-steps a c` abstract steps from related `a`, ending in a related pair (Definition 2.18, p.15).
2. Prove stopping consistency: paired concrete configurations stop together, preventing termination leaks (Definition 2.19, p.16).
3. Prove pacing consistency: related abstract/concrete pairs use the same `abs-steps`, preventing timing leaks (Definition 2.19, p.16).
4. Prove `I` remains closed under lockstep concrete execution and preserves mode equality (Definition 2.19, p.16).
5. Apply Theorem 2.20, which derives the original cube-shaped secure refinement from these obligations.

Verus form (Inference): define a ghost `spec fn abs_steps(src, dst) -> nat` and prove a lemma that one target operation corresponds to that many source specification transitions. A loop or state-machine invariant can carry the coupling relation and mode equality. Timing is usually abstract in Verus; to model the paper's guarantee, include an explicit step counter or cost ghost state and prove equality across paired executions.

Evidence: the authors re-proved a secret-branch refinement in Isabelle. The abstract program has 9 imperative commands; the refined program has 16 commands with padding. The original theory has about 4.6K lines, including about 3.6K proof lines; the decomposed proof has about 2K proof lines, a reported 44% reduction (section 2.4, pp.16–17). The paper says, “We use proof size as a proxy for proof effort.” (section 2.4, p.17) This comparison has one example and no independent timing denominator.

## technique: compile expressions only when locks make them stable

What it is: the compiler tracks register contents as expressions over shared variables and tracks assumptions that other threads cannot write those variables. It rejects programs whose expression evaluation can race. The paper states, “The wr-compiler’s approach to preserving the contents of shared memory is to ensure ... that expression evaluation is race-free.” (section 5.1, p.31)

How to do it:
1. Maintain a register record `Φ` mapping registers to expressions and an assumption record `S` containing no-write and no-read/write assumptions (section 5.1, p.31).
2. Define `var-stable S v` when `v` and all control variables that classify `v` are protected by `S` (Definition 5.1, p.32).
3. Define `regrec-stable C` when every variable in every register expression is stable under the accompanying assumptions (Definition 5.2, p.32).
4. Before compiling, run recursive stability checks. Reject an input if it reads an unstable variable, writes a lock-governed shared variable without the required lock, or has branches and loops whose lock assumptions do not converge (section 5.1.1, pp.32–33).
5. When compiling `unlock(k)`, flush register entries mentioning variables made unstable by releasing `k` (section 5.1.2, p.33).
6. Prove Lemma 5.4: every successful compilation returns only stable register records (section 5.1.2, p.33).

Verus form (Inference): represent `Φ` and `S` as ghost maps and sets. A wrapper for a shared read should require a lock token and ensure the returned value equals the memory value at the read point. On unlock, a proof function should invalidate or remove cached expressions. The executable Rust cache and lock implementation must satisfy these ghost-state transitions; `external_body` would leave the crucial compiler property unproved and should not be used for the verified function.

Evidence and limits: compilation can return `failed = True` when it detects a race or expression depth beyond the modeled register-allocation limit (section 5.1, p.31). This is a rejection policy, not evidence that arbitrary source programs compile. Inference: VL should treat lock-discipline checking as an input gate and report rejected programs separately from verified compilations.

## technique: preserve a no-high-branching restriction

What it is: the compiler assumes the source has no conditional branch whose condition depends on High data. The source bisimulation includes equal program commands and equal conditional results in paired memories (Definition 5.5, p.34). The target relation adds `pc-security`, requiring equal program counters and program texts (Definition 5.6, p.34).

How to do it:
1. Require a source confidentiality witness satisfying `no-high-branching` (section 5.2, p.34).
2. Compile expressions to loads, operations, and moves; compile conditionals to jumps whose target is determined by the same low-observable condition (section 4, pp.28–30; section 5.3, pp.35–40).
3. Define `Iwr` so related target states have equal program counters and compatible register expressions (section 5.3.3, pp.39–40).
4. Prove that the target bisimulation satisfies `pc-security` and therefore preserves per-thread confidentiality (Theorem 5.24, pp.43–44).

Verus form (Inference): keep secret-dependent branch avoidance as a specification predicate over control flow, or prove that branch conditions depend only on low data. A state machine can expose a ghost program counter and require paired states to take the same transition. Verus cannot infer this policy from arbitrary Rust code; it must be stated and proved for each branch.

Evidence and limits: the compiler's theorem explicitly assumes `com-secure` with `no-high-branching`, no locks initially, and successful stability checks (Theorem 5.24, p.43). Inference: programs with deliberate constant-time secret branches would need a different source theorem and are outside this compiler result.

## technique: compose per-thread compiler proofs into whole-system security

What it is: the paper proves per-thread confidentiality and local mode compliance, then invokes a whole-system refinement theorem. The compiler's target uses the same lock semantics as the source, so global mode compatibility follows from the same no-locks-held initial condition (Lemmas 5.25–5.26, pp.44–45).

How to do it:
1. Prove every source thread is `com-secure` with no high branching and no locks held initially.
2. Compile every thread successfully and prove `compile-cmd-input-reqs`.
3. Initialize each target register bank and mode state consistently; the paper uses an empty compilation record and registers initialized to zero (Definitions 5.20 and 6.3, pp.42, 52).
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
4. Use Theorem 6.2 to derive whole-system While confidentiality (p.51).
5. Execute the Isabelle `compile-cmd` on all three threads and define their RISC texts as the compiled instruction lists (section 6.3, p.52).
6. Apply Theorem 5.24 and Theorem 5.22 or 5.27. Theorem 6.4 concludes whole-system confidentiality for the RISC model with zero-initialized registers (pp.52–53).

Verus form (Inference): encode each component as a Rust module with a Verus state machine for lock-protected buffers and a ghost sensitivity classification. Prove that copying an event preserves the classification predicate and that output to a Low sink cannot depend on High input. Hardware and OS isolation assumptions need explicit trusted interfaces or separate proofs.

Evidence and limits: the paper reports formal Isabelle proofs for the While theorem (Theorem 6.2) and the compiled RISC theorem (Theorem 6.4), with three proof routes for the latter (section 6.3, pp.52–53). It models a single-place input buffer and treats private memory as shared variables under a permanently held lock (sections 6.1.2–6.1.3, pp.48–50). Inference: the case study establishes an end-to-end formal result for this model and assumptions; it does not validate a deployed CDDC hardware implementation.

## what is proved, measured, and trusted

The paper proves CVDNI compositionality, soundness of cube refinement, soundness of the decomposition principle, compiler refinement, per-thread confidentiality preservation, and whole-system confidentiality for the CDDC model. The only quantitative proof-effort result is the single refinement example's reduction from about 3.6K to about 2K proof lines, reported as 44%; the denominators are proof lines in that Isabelle theory, not programs or compiler runs. The case study has three modeled threads, and all three pass the compiler's stability checks, but no larger success-rate denominator is reported.

Trusted or assumed elements include Isabelle/HOL and its kernel, the source and target semantics, lock-discipline specifications, the source CVDNI proofs, imported hardware and OS behavior, initial no-locks-held conditions, no-high-branching, and the compiler's rejection of unstable inputs. The authors explicitly separate semantics preservation from security preservation. Inference: for agent-written verified Rust, the main product threat is a mismatch between the ghost sensitivity and lock model and the deployed code or hardware; a Verus proof of an abstract model alone does not close that gap. The paper's method is valuable because it makes those assumptions explicit and turns compiler-induced timing, termination, and race changes into named proof obligations.

## techniques for the catalog

- value-dependent noninterference: compare low-observable behavior of paired concurrent executions under a changing mode state
- cube secure refinement: relate source and target configurations with a refinement relation and concrete coupling invariant
- decomposition with pacing: replace the cube by square simulation plus equal stopping, equal pacing, and lockstep coupling obligations
- stable expression compilation: track register expressions and reject source programs that evaluate unstable shared data
- no-high-branching preservation: carry equal control-flow and program-counter relations from source to target
- whole-system composition: combine per-thread confidentiality, lock compliance, and no-locks-held initialization into a system theorem
- mixed-sensitivity case study: classify shared buffers by control-dependent sensitivity and compile three verified threads to RISC
Checked 2026-10-14: audit record sison2021verified; paper-study comparison complete; gate executed; experiments not rerun
