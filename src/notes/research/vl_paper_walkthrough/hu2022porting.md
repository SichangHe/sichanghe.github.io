# Towards Porting Operating Systems with Program Synthesis
(authored by agents unless marked 🧑)
Tag: `hu2022porting`, [paper](https://www.semanticscholar.org/paper/4ca2cf2889fdfd84efdd4879a981445762e933a4)

## problem and architecture

The paper presents Aquarium, a synthesis-and-verification pipeline for machine-dependent operating-system assembly. It separates an OS-level specification from a processor model, specializes the specification to a target architecture, then searches for an instruction sequence that satisfies the resulting contract. The motivation is that machine-dependent blocks are small, isolated, and implement a machine-independent operation even though their registers and instructions differ.

The paper's four steps are explicit: “Step 1: Writing a Machine Independent Specification. An OS developer writes an Alewife specification for some piece of OS functionality”; “Step 2: Writing Machine Descriptions. A computer architect produces a machine model B written in Cassiopea”; “Step 3: Lowering to Machine-Dependent Specifications”; and “Step 4: Synthesis and Verification.” (Figure 2 description, §2, pp. 5–6) Alewife supplies abstract state, preconditions, postconditions, let-bindings, and frame conditions. Cassiopea describes registers, memory, operations, and invariants for an instruction set. Lowering modules instantiate abstract names such as word size, registers, memory offsets, scratch registers, and permissions.

Inference: A Verus version would use a machine-independent Rust specification layer, architecture-specific ghost state and external contracts, and a lowering module that maps abstract state to a target representation. The paper synthesizes assembly; Verus normally verifies Rust, so the synthesis target and executable semantics would differ.

## Alewife contracts and memory model

An Alewife block has one entry, no backward branch into the block, and at most one outgoing branch. Its contract has four parts: preconditions, postconditions, let-bindings evaluated in the initial state, and frame conditions (§3, pp. 6–8). A precondition grants assumptions; a postcondition constrains final state; a frame condition lists additional state that may change. By default, state not named by the postcondition must retain its initial value (§3, p. 9). The running `disp_check` example reads a dispatcher pointer, compares a saved program counter against a critical-region bound, and sets an output register to one or zero.

The memory model gives each region a finite length, element bit width, and pointer width. A pointer is a region-and-offset pair; regions do not overlap, so pointers into different regions cannot alias (§3, pp. 7–8). Symbolic lengths are later concretized by lowering. A zero-length region models only region existence. Cassiopea additionally treats runtime type, pointer, alignment, and bounds errors as failure paths that symbolic execution must exclude, and its finite-state, forward-branch-only semantics make complete path exploration possible (§4, pp. 11–13; Appendix A.4). The paper says, “Frame conditions are more than synthesis heuristics that help to prune the search space; they are a useful shorthand to materially affect the specification.” (§3, p. 9)

Inference: In Verus, the closest form is a `struct` or ghost map representing disjoint regions, with `requires` for pointer validity and `ensures` plus frame-style equalities for unchanged fields. Verus ownership can enforce some separation properties, but the Cassiopea region-and-offset semantics do not carry over automatically. Any unsafe pointer or external memory model needs an explicit trusted contract.

## Cassiopea machine descriptions

Cassiopea is an RTL-style language. A machine description declares state, bitvector and pointer types, registers, memory, instruction operations (`defop`), pure functions, and invariants. The authors model 34 ARM operations, 37 MIPS operations, 37 RISC-V operations, and 56 x86_64 operations; Table 1 gives the corresponding description sizes as 933, 495, 618, and 567 lines (§7.2, pp. 26–27). These are subsets of the ISAs selected for the use cases, not complete architectural models. MIPS and RISC-V encode register zero invariants; ARM models conditional flags; x86_64 models flags as one-bit registers.

Inference: A Verus project should state which ISA subset and invariants its Rust model covers. A verified Rust implementation can rely only on modeled instructions and contracts; unmodeled instructions, microarchitectural effects, and hardware behavior remain outside the proof.

## lowering and specialization

A lowering file maps each Alewife abstract declaration to machine state and supplies machine- or OS-specific frame permissions. The compiler consumes an Alewife file, Cassiopea description, and lowering file and produces a machine-dependent specification (§5, pp. 13–16). Lowering also concretizes symbolic bit widths, memory lengths, and abstract functions. The process is reusable: the same Alewife specification can target multiple architectures while only the lowerings change.

The evaluation supplied 35 machine-independent specifications and 35 × 4 = 140 lowerings, one for each of four architectures (§7.3, p. 27). The reported effort was 434 lines of Alewife plus 67 lines of manual lowering, allowing 383 lines of synthesized code; the paper gives a manual-lowering-to-synthesized-code ratio of 0.175. Including all 588 lines of automatable lowering gives an upper-bound ratio of 1.71, and including the machine-independent specifications gives 1.31 specification lines per synthesized line (§7.3, pp. 27–28). These denominators are lines of code, not verification time or defects.

Inference: For Verus, lowering is analogous to an architecture module that supplies type widths, register invariants, and external function specifications. Keep this mapping explicit so a proof cannot silently reuse a contract from another target.

## syntax-guided synthesis and CEGIS

The synthesis engine represents a candidate assembly program as a sequence of symbolic instructions whose control variables choose opcodes and operands. It symbolically executes the sequence to obtain correctness constraints and runs counterexample-guided inductive synthesis (CEGIS). “The CEGIS loop iterates guess and verify phases until it either obtains a correct program or fails.” (§6.1, p. 17) In the guess phase the solver chooses control-variable values. In the verify phase it searches for an initial state satisfying the precondition that makes the candidate violate the postcondition. A counterexample causes another guess; no counterexample establishes that candidate against the modeled contract.

The engine searches from smaller to larger programs and returns the first specification-satisfying sequence it finds. Different satisfying programs can be returned on different runs, and incomplete specifications permit functionally different results (§6, p. 16). Symbolic execution explores every terminating path; values are DAGs, with backward value-set simplification, structural merging, and special handling for symbolic pointers (§6.2, pp. 17–19). Memory reads at symbolic offsets use guarded if-then-else expressions. Pointers in the same region merge offsets; pointers from different regions do not merge, limiting infeasible branches.

Inference: A Verus-assisted synthesis loop can generate candidate Rust expressions or proof lemmas, compile them, and let Verus produce counterexamples or failed obligations. The CEGIS guarantee applies only to the modeled transition system and specification; it does not certify that the specification captures the OS requirement.

## search optimizations

The paper teaches four optimization techniques. Read/write constraints allow an operation to read only registers named by the specification or written by an earlier operation (§6.3.1, p. 19). State gating removes registers and operations irrelevant to preconditions, postconditions, and frame conditions, while retaining implicitly accessed control state (§6.3.2, pp. 19–20). Dependency constraints first query whether a post-state location is uniquely determined by the pre-state; if so, further SMT queries identify which input variables affect it, and candidate programs are constrained to exhibit those dependencies (§6.3.3, p. 20). Rule-based decomposition rewrites a specification into smaller subgoals, alternates rule application with syntax-guided synthesis, and composes successful subprograms (§6.3.4, pp. 20–21).

The measured optimization results use the paper's 35 synthesis use cases. Read/write constraints have a geometric-mean speedup of 1.6× for the subset whose baseline exceeds 100 seconds, with a maximum 12× and a worst-case 5.0× slowdown. Dependency analysis has geometric-mean speedup 1.4×, maximum 35×, and worst-case 2.5× slowdown. Rule-based decomposition has geometric-mean speedup 2.0× and reaches 75× when an 1800-second timeout is counted as the baseline; its worst-case slowdown is 3.8×. State gating has geometric-mean speedup 4.5×, maximum 290×, and worst-case 1.6× slowdown. Combined, optimizations reduce total time from 38,130 to 1,511 seconds (25× average total reduction), with geometric-mean speedup 9.2×; one timed-out baseline case finishes in just over one second, reported as 1,380× (§7.6, pp. 31–32). The denominators and settings are the use-case suite, baseline engine, and optimization-enabled engine; timeout treatment is stated only for the 75× and 1,380× comparisons.

Inference: Verus proof search can borrow the same pruning principle: restrict candidate lemmas to fields in the contract, gate irrelevant ghost state, infer data dependencies before generating assertions, and decompose a large proof into named sublemmas. These are search heuristics, so they preserve soundness only when every generated obligation is still checked.

## additional validation techniques

The paper also uses failed synthesis as a machine-model test. It constructs machine-dependent specifications that should be unrealizable—for example, forcing arithmetic instructions to change ARM flag fields that the instructions must preserve—and treats successful synthesis as evidence of an error in the Cassiopea description (§8.8, p. 40). This is a negative test of the formalization, not proof that the model is complete.

The authors tried an accumulation strategy across instruction-length stages: retain the last candidate from an n-operation search as a prefix when searching n+k operations, and fall back to a full n+k search if no prefix extends to a solution (§8.6, p. 38). It gave up to 7× speedup on two use cases but could double time in the worst case. They also tested multiple counterexamples per CEGIS iteration and candidate buckets; both reduced iterations in some settings but increased variance or total time overall (§8.6, pp. 38–39).

Inference: Verus proof generation can apply the negative-model test by adding deliberately impossible contracts and checking that no executable implementation or proof can satisfy them. Accumulating partially successful proof candidates across larger functions is an orchestration optimization, not a Verus soundness mechanism.

## validation, limits, and trusted parts

The validation starts from eight complete procedures in Barrelfish and OS/161, split into 50 blocks: 35 synthesis use cases and 15 out-of-scope blocks (§7, pp. 22–23). All 35 specifications lower successfully for all four architectures, yielding 140 machine-dependent specifications; the engine verifies handwritten assembly and synthesizes and verifies assembly for all 140. Every synthesis execution finished within a 30-minute timeout with optimizations enabled (§1, p. 4). This is feasibility evidence for selected blocks, not a claim that all OS code is synthesizable.

The authors report that the method currently handles roughly four or five instructions with pure inductive synthesis and up to twelve for some well-structured specifications with decomposition; a roughly 100-instruction MIPS exception handler remains outside the practical scale (§8.5, pp. 36–37). It does not model concurrency or time, does not reason about synthesized-code performance, and leaves machine-specific startup, drivers, memory barriers, and concurrency primitives to other tools or handwritten blocks (§8.5, pp. 37–38). Security coverage stops at ISA-level functional correctness: the paper says, “Synthesis and verification do nothing to address such issues.” for microarchitectural Spectre, Meltdown, and Rowhammer effects (§8.7, p. 39).

Inference: The threat to agent-written verified Rust is high at the specification boundary and moderate in solver search. A passing proof can still encode the wrong API contract, incomplete hardware model, or incorrect lowering. Trusted components include Cassiopea semantics, Alewife specifications and lowerings, SMT solvers, the synthesis compiler, the Rust/assembly compiler, and hardware; the paper validates neither their implementation correctness nor the completeness of its ISA subsets.

## techniques for the catalog

- layered machine-independent specification — describe OS behavior once with abstract state, pre/postconditions, and frame conditions
- formal ISA modeling — encode registers, memory, instructions, bitvectors, and machine invariants in an executable RTL model
- runtime-error exclusion — model invalid pointer, alignment, bounds, and type operations as failure and require candidates to avoid every failure path
- architecture lowering — instantiate abstract declarations and permissions for each target machine
- CEGIS assembly synthesis — alternate candidate guessing with SMT counterexample checking until a specification-satisfying sequence is found
- symbolic execution with structural merging — summarize all terminating paths while canonicalizing symbolic values and pointers
- read/write pruning — constrain each candidate instruction to registers available from the contract or earlier writes
- state gating — remove irrelevant registers and operations from the search model
- dependency constraints — infer pre-state variables that determine post-state locations and require candidates to preserve those dependencies
- rule-based decomposition — split a large contract into smaller subgoals and synthesize/combine blocks iteratively
- unrealizable-specification model testing — ask synthesis to satisfy deliberately impossible behavior and use a solution as evidence of an ISA-model error
- candidate accumulation — reuse a nearly correct shorter candidate as a prefix for longer searches, with a full-search fallback

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
