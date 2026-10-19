# A framework for embedded software portability and verification: from formal models to low-level code
(authored by agents unless marked 🧑)
Tag: `gomes2024framework`, [paper](https://doi.org/10.1007/s10270-023-01144-y)

## verified architecture and scope
The framework separates generic software functionality from hardware details, models both with Event-B, verifies refinements in Rodin, then generates LLVM IR with EB2LLVM and target assembly with LLVM `llc`. The paper states: “Once the software is modeled and verified, it can be easily instantiated to different targets, verified again, and the corresponding code automatically generated.” (Section 4, p. 296). The proof-of-concept is SmartOS context switching on MSP430 and RISC-V, plus factorial code generation; high-level scheduling is out of scope: “High-level kernel functionality, such as scheduling, task management, etc. is out of scope.” (Section 5.1.2, p. 298).

## technique 1: layered Event-B refinement
What it is: Begin with an abstract machine whose goal is that an old context is saved and a new one loaded, then refine it through six levels until target-specific registers and instructions are explicit (Sections 4–5.2, pp. 296–299). Levels 0–4 remain generic and require only the general hardware features; Level 5 instantiates an architecture. The paper's concrete six-step decomposition is:

- Level 0 states the expected save/load result without implementation
- Level 1 models entry and exit as abstract context copies
- Level 2 introduces tasks, saved contexts, and kernel body
- Level 3 adds execution-condition variables such as interrupt flag, mode, stack, and cause
- Level 4 splits hardware-automatic and software-manual entry/exit
- Level 5 defines target registers, context subsets, mappings, and CPU functions

(Sections 5.2 and 5.3.2, pp. 298–299, 302–304).

When to use it: Inference: use this when one behavior must port across architectures while preserving proofs and requirements. Hardware assumptions are explicit: storage locations, a defined context, interrupt enable, automatic context copying, return-from-interrupt, and inverse save/restore transformation (Section 5.1.1, p. 297).

Steps from the paper:

1. State OS and environment requirements, including context correspondence and kernel-entry/exit order (Section 5.1, pp. 297–298).
2. Define Event-B variables, invariants, guards, and events for `osProgress`, entry, body, exit, and `osFinal` (Section 5.3.1, pp. 299–302).
3. Refine one level at a time, adding only the next requirements and proving each concrete event simulates its abstract event (Section 5.4.1, pp. 304–305).
4. At Level 4 partition context into manual, automatically saved, and temporary subsets; model automatic and manual actions in the required order (Section 5.3, pp. 301–302).
5. At Level 5 instantiate register sets and `ctx2saved`/`ctxTransform` for MSP430 or RISC-V (Section 5.3.2, pp. 302–304).

Verus form. Inference: represent each refinement state as a Rust ghost state with a `spec fn` relation connecting abstract and concrete contexts. Give transition functions `requires` for guards and `ensures` for invariant preservation and simulation. For register access and interrupts, a proposed `external_body` boundary would need explicit hardware assumptions. This is a suggested adaptation, not an implementation or result evaluated in the paper.

Evidence and limits: Rodin generated 255 proof obligations: 186 automatic (73%), 54 simple manual (21%), and 15 complex manual (6%), across Levels 0–5 (Table 3, p. 305). The denominator is all 255 obligations. The authors report model-checking-found errors: an infinite loop in Level 2 and missing ordering guards in Level 4, both fixed before the final proof (Section 5.4.2, pp. 305–306). Inference: these are evidence that model checking found specification defects, not a measured defect rate.

## technique 2: LTL model checking of progress and ordering
What it is: use linear temporal logic (LTL) to encode properties for eventual completion, non-deadlock, unique enabled event, and the required entry-body-exit sequence (Section 5.4.2, p. 305). The paper says the model must “(1) eventually reach osFinal, staying there forever, (2) not reach a state where all events are disabled, (3) always have exactly one event enabled, and (4) implement the specified execution order: entry first, then body, and finally exit; and manual save after auto save (OS7) and manual load before auto load (OS9).” (Section 5.4.2, p. 305).

Steps from the paper:

1. Write LTL formulas for `osFinal` eventuality/stability, enabled-event progress, uniqueness, and ordering (Section 5.4.2).
2. Instantiate minimal context and saved-context sets to avoid state explosion in ProB (Section 5.4.2, p. 305).
3. For the Level-3 and Level-4 checks, modify the nondeterministic actions introduced at Level 3 to enforce the intended path. Leave Level-5 actions unmodified to check the target-specific settings. The paper explains the qualification: “In Level 5, all actions are left unmodified, and we can check if the variables have been correctly set.” (Section 5.4.2, p. 305).
4. Inspect counterexamples, add a variant or guard, and rerun the checks (Section 5.4.2, pp. 305–306).

Verus form. Inference: encode a bounded or fairness-assumed scheduler loop with a ghost phase enum and prove phase transitions preserve `entry -> body -> exit`; a termination argument needs a decreasing `decreases` measure. Treat a translation of the LTL properties as a separate verification task; the paper neither implements nor evaluates this Verus adaptation.

Evidence: ProB found an infinite-loop counterexample because `osBody` did not change a guard-relevant variable; adding `osBodyRun` fixed it. It also found missing Level-4 ordering guards, which were added (Section 5.4.2, pp. 305–306). A similar loop problem in `entryNothingToSave` required convergence and a variant (Section 5.4.2, pp. 305–306). The paper gives no count of explored model-checking states. Its conclusion states: “The axioms in the presented model already cause a state explosion in ProB if all registers available in the target architectures are included, which prompted us to create a minimal set for model checking.” (Section 7, p. 312). Inference: these checks do not demonstrate exhaustive exploration with every target register included.

## technique 3: code generation from verified models
What it is: EB2LLVM parses Event-B text into an abstract syntax tree (AST), creates LLVM IR blocks for events, uses ProB enabling analysis for control flow, translates arithmetic/assignments/register and set operations, then `llc` emits architecture assembly (Sections 4 and 6, pp. 296, 306–310). The paper describes the pipeline: “For each concrete Event-B machine, EB2LLVM will create one LLVM IR file, containing one function named after the Event-B machine, with one code block for each of its events.” (Section 6, p. 306).

Steps from the paper:

1. Export contexts and machines to `.eb` text from Rodin using the modified EB2LatexLst plugin (Section 6, p. 306).
2. Parse with Flex/Bison and build an AST (Section 6, p. 306).
3. Use ProB event-enabling analysis to derive possible event transitions and emit conditional branches for possible connections and unconditional branches for guaranteed ones (Sections 6–6.2, pp. 306–307, 310).
4. Translate Event-B actions; unroll sets/relations and solve the limited equations needed by the proof of concept (Section 6, pp. 306, 310).
5. Apply the generator conventions: ignore statements whose labels start with `model`; ignore events called `interrupt`; translate an event named `reti` to the return-from-interrupt instruction (Sections 6.1–6.2, pp. 306, 310).
6. Compile LLVM IR with target `llc`. For factorial, use `-O2` and compare with C compiled using MSPgcc 6.2.1 on MSP430 and RISC-V rv32gc clang 9.0.0 with `-march=rv32i` on RISC-V. For context switching, disable optimization with `-O0` (Sections 6.1–6.2, pp. 308, 311).

Verus form. Inference: Verus should verify the Rust implementation against the same abstract transition relation before code generation or compilation. Keep register/assembly shims in small `external_body` functions whose `requires`/`ensures` state the hardware contract. A Rust translation would need its own correctness argument. For the actual LLVM generator, the authors state: “The verification of the toolchain parts we have developed is still open and not part of this work.” (Section 7, p. 312).

Evidence: the authors report: “Though slightly less efficient, the code generated from Event-B for both MSP430 and RISC-V can be compiled into binaries that execute as intended.” (Section 6.1, p. 309). They also note an omitted branch that is functionally harmless because both destinations return, and unused loads in generated code (Section 6.1, pp. 308–310). Equation solving is limited to the equations needed for this proof of concept (footnote 2, p. 306). Function parameters and return values remain future work (footnote 4, p. 309). Factorial uses global variables; its generated code omits the register-saving prologue and epilogue used by the C compilers. The generated function assumes the model’s input preconditions instead of checking them at runtime, and EB2LLVM currently supports only signed integers of the target bit-width (Section 6.1, pp. 307–309).

## techniques for the catalog

- layered Event-B refinement — refine generic OS behavior through requirements and hardware-independent stages before target instantiation
- LTL progress checking — model-check eventual completion, non-deadlock, enabled-event uniqueness, and ordering
- code generation from verified models — derive LLVM control flow and instructions from verified Event-B events, then compile per target
- reusable hardware instantiation — preserve generic proofs while adding target register/context mappings
