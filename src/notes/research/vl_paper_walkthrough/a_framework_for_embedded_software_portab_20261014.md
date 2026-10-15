# A framework for embedded software portability and verification: from formal models to low-level code
(authored by agents unless marked 🧑)
Tag: `gomes2024framework`, [paper](https://doi.org/10.1007/s10270-023-01144-y)

## verified architecture and scope
The framework separates generic software functionality from hardware details, models both with Event-B, verifies refinements in Rodin, then generates LLVM IR with EB2LLVM and target assembly with LLVM `llc`. The paper states: “Once the software is modeled and verified, it can be easily instantiated to different targets, verified again, and the corresponding code automatically generated.” (Section 4, p. 296). The proof-of-concept is SmartOS context switching on MSP430 and RISC-V, plus factorial code generation; high-level scheduling is out of scope (Section 5.1, p. 297).

## technique 1: layered Event-B refinement
What it is: Begin with an abstract machine whose goal is that an old context is saved and a new one loaded, then refine it through six levels until target-specific registers and instructions are explicit (Sections 4–5.2, pp. 296–299). Generic Levels 0–4 use only hardware assumptions; Level 5 instantiates an architecture. The paper's concrete six-step decomposition is:
- Level 0 states the expected save/load result without implementation
- Level 1 models entry and exit as abstract context copies
- Level 2 introduces tasks, saved contexts, and kernel body
- Level 3 adds execution-condition variables such as interrupt flag, mode, stack, and cause
- Level 4 splits hardware-automatic and software-manual entry/exit
- Level 5 defines target registers, context subsets, mappings, and CPU functions
(Section 5.2, pp. 298–302).

When to use it: use this when one behavior must port across architectures while preserving proofs and requirements. Hardware assumptions are explicit: storage locations, a defined context, interrupt enable, automatic context copying, return-from-interrupt, and inverse save/restore transformation (Section 5.1.1, p. 297).

Steps from the paper:
1. State OS and environment requirements, including context correspondence and kernel-entry/exit order (Section 5.1.2, pp. 297–298).
2. Define Event-B variables, invariants, guards, and events for `osProgress`, entry, body, exit, and `osFinal` (Section 5.2, p. 298).
3. Refine one level at a time, adding only the next requirements and proving each concrete event simulates its abstract event (Section 5.4.1, p. 304).
4. At Level 4 partition context into manual, automatically saved, and temporary subsets; model automatic and manual actions in the required order (Section 5.3, pp. 301–302).
5. At Level 5 instantiate register sets and `ctx2saved`/`ctxTransform` for MSP430 or RISC-V (Section 5.3.2, pp. 302–304).

Verus form (inference): represent each refinement state as a Rust ghost state with a `spec fn` relation connecting abstract and concrete contexts. Give transition functions `requires` for guards and `ensures` for invariant preservation and simulation. Rust register access and interrupts need an `external_body` boundary with explicit assumptions; Verus cannot automatically reuse Event-B/Rodin proof obligations or infer architecture semantics.

Evidence and limits: Rodin generated 255 proof obligations: 186 automatic (73%), 54 simple manual (21%), and 15 complex manual (6%), across Levels 0–5 (Table 3, p. 305). The denominator is all 255 obligations. The authors report model-checking-found errors: an infinite loop in Level 2 and missing ordering guards in Level 4, both fixed before the final proof (Section 5.4.2, pp. 305–306). Inference: these are evidence that model checking found specification defects, not a measured defect rate.

## technique 2: LTL model checking of progress and ordering
What it is: encode temporal properties for eventual completion, non-deadlock, unique enabled event, and the required entry-body-exit sequence (Section 5.4.2, p. 305). The paper says the model must “(1) eventually reach osFinal, staying there forever, (2) not reach a state where all events are disabled, (3) always have exactly one event enabled, and (4) implement the specified execution order.” (Section 5.4.2, p. 305).

Steps from the paper:
1. Write LTL formulas for `osFinal` eventuality/stability, enabled-event progress, uniqueness, and ordering (Section 5.4.2).
2. Instantiate minimal context and saved-context sets to avoid state explosion in ProB (Section 5.4.2, p. 305).
3. Check generic levels, modifying nondeterministic actions only where the authors intend architecture-specific determinism (Section 5.4.2).
4. Inspect counterexamples, add a variant or guard, and rerun the checks (Section 5.4.2, pp. 305–306).

Verus form (inference): encode a bounded or fairness-assumed scheduler loop with a ghost phase enum and prove phase transitions preserve `entry -> body -> exit`; a termination argument needs a decreasing `decreases` measure. Verus can prove safety and terminating executions, but unbounded LTL liveness and ProB's state exploration need separate assumptions or tools.

Evidence: ProB found an infinite-loop counterexample because `osBody` did not change a guard-relevant variable; adding `osBodyRun` fixed it. It also found missing Level-4 ordering guards, which were added (Section 5.4.2, pp. 305–306). The paper gives no count of model-checking states or post-fix exhaustive runs, so a numerical coverage rate is unavailable.

## technique 3: proof-guided model-to-code generation
What it is: EB2LLVM parses Event-B text into an AST, creates LLVM IR blocks for events, uses ProB enabling analysis for control flow, translates arithmetic/assignments/register and set operations, then `llc` emits architecture assembly (Sections 4 and 6, pp. 296, 306–310). The paper describes the pipeline: “For each concrete Event-B machine, EB2LLVM will create one LLVM IR file, containing one function named after the Event-B machine, with one code block for each of its events.” (Section 6, p. 306).

Steps from the paper:
1. Export contexts and machines to `.eb` text from Rodin using the modified EB2LatexLst plugin (Section 6, p. 306).
2. Parse with Flex/Bison and build an AST (Section 6, p. 306).
3. Use ProB event-enabling analysis to derive possible event transitions and emit conditional/unconditional branches (Section 6, pp. 306–308).
4. Translate Event-B actions; unroll sets/relations and solve the limited equations needed by the proof of concept (Section 6, pp. 306, 310).
5. Compile LLVM IR with target `llc` and compare or run the generated assembly (Section 6.1, pp. 307–310).

Verus form (inference): Verus should verify the Rust implementation against the same abstract transition relation before code generation or compilation. Keep register/assembly shims in small `external_body` functions whose `requires`/`ensures` state the hardware contract. Generated Rust does not inherit Event-B proofs unless the translation itself is verified; this paper's LLVM generator is trusted engineering.

Evidence: factorial generated binaries execute as intended on MSP430 and RISC-V, but the paper notes an omitted branch that is functionally harmless because both destinations return, and unused loads in generated code (Section 6.1, pp. 308–310). The authors explicitly limit EB2LLVM's equation solving and say function parameters/return values are future work (footnote 4, p. 307; Section 6.1, p. 307).

## what is proved, trusted, and relevant to VL
The formal result covers the Event-B models, their refinement obligations, selected LTL properties, and the modeled target instantiations. Trust remains in Rodin/ProB, EB2LLVM, LLVM/`llc`, hardware assumptions, manually supplied proofs, and the faithfulness of generated code. Inference: for VL, the reusable pattern is abstract protocol plus machine-specific refinement plus explicit proof obligations before emitting Rust. Inference: threat to agent-written verified Rust is high for low-level portability if generation is trusted blindly; the paper's own generator observations show that verified model intent does not automatically prove every emitted instruction sequence.

## techniques for the catalog
- layered Event-B refinement — refine generic OS behavior through requirements and hardware-independent stages before target instantiation
- LTL progress checking — model-check eventual completion, non-deadlock, enabled-event uniqueness, and ordering
- proof-guided code generation — derive LLVM control flow and instructions from verified Event-B events, then compile per target
- reusable hardware instantiation — preserve generic proofs while adding target register/context mappings
Checked 2026-10-14 against the paper by a Codex agent: audit record gomes2024framework; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
