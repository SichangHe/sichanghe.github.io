# Specification and verification in the field: Applying formal methods to BPF just-in-time compilers in the Linux kernel
(authored by agents unless marked 🧑)
Tag: `nelson2020bpf`, [paper](https://www.usenix.org/conference/osdi20/presentation/nelson)

## problem and architecture
Jitterbug verifies Linux Berkeley Packet Filter (BPF) just-in-time compilers (JITs) while preserving a reviewable C implementation and the existing kernel interface. Its correctness target is behavioral equivalence between a source BPF abstract machine and the target architecture machine code, plus preservation of the target calling convention. The paper calls this “the first framework to provide a precise specification of JIT correctness that is capable of ruling out real-world bugs” (abstract, p. 41). It designs and verifies a new RV32 JIT, ports five deployed JITs, finds 16 previously unknown bugs, fixes them, and upstreams the changes (abstract, p. 41).

The authors describe the deployment requirement directly: “Jitterbug is designed to meet three competing requirements: deployability of verified JITs with minimal changes to the Linux kernel; proof automation to support rapid verification of JITs; and separability of verified JITs from any verification artifacts” (section 1, p. 41). They also report that “all of these changes have been upstreamed to the Linux kernel” (abstract, p. 41).

## technique 1: stepwise JIT correctness
Inference: Use this when a compiler emits a prologue, one block per source instruction, and an epilogue, and a whole-program equivalence proof is too difficult.

Steps from sections 4.1–4.3 (pp. 46–49):

1. Model `JITCompile(codeS,ctx)` as producing target code or compilation failure. Define source and target states, partial code maps, initial/final predicates, a deterministic step function, and a nondeterministic oracle for kernel-visible inputs.
2. State assumptions: source code is safe, the JIT context satisfies `wf(codeS,ctx)`, and generated code contains the blocks returned by `EmitPrologue`, every `EmitInstruction(ctx,i,insn)`, and `EmitEpilogue`. The paper's safety predicate requires every safe source execution to terminate at a final state without undefined behavior.
3. Relate source and target states with `~ctx`; relate the initial target state to each intermediate target state with `Ictx`. For RV32, map each 64-bit BPF register to two RV32 registers or spilled memory, relate program counters through a context mapping, and track initialized registers so values after a call need not match when BPF leaves them undefined (section 4.3, pp. 48–49).
4. Model target memory as disjoint shared and internal regions. Model private internal memory as an address-to-value map and shared accesses as trace events, with the same memory model for source and target. The paper states: “the goal is to faithfully translate BPF memory accesses to ones in the target machine” (section 4.3, pp. 49–50).
5. Prove prologue correctness: emitted code establishes both relations and emits no trace. Prove per-instruction correctness: executing the source instruction and emitted target block produces the same trace and preserves the relations. Prove epilogue correctness: it returns the source value, emits no trace, preserves architectural safety, and terminates.
6. Apply the Lean metatheorem: “JIT assumptions ∧ prologue correctness ∧ per-instruction correctness ∧ epilogue correctness → JIT correctness” (Theorem 1, p. 47). This composes local obligations into whole-JIT correctness without assuming a fixed target code layout.

Inference: In Verus, represent machine states, traces, and the two relations as mathematical datatypes and `spec fn`s; use `requires` for `wf` and safety assumptions and proof functions for the per-block simulation lemmas. Use `ensures` on executable Rust blocks to preserve the relations. The paper's Lean theorem and Rosette symbolic execution do not transfer automatically to Verus; the relation and finite-step simulation must be recast as Verus proofs.

Evidence: The specification caught two bugs that an early specification and testing both missed: TAIL_CALL was limited to 32 rather than 33, and the stack was not 16-byte aligned (section 7, p. 53). The source/target model also exposed bugs in arithmetic semantics, range checks, machine flags, and register preservation (section 3.2, pp. 44–45).

## technique 2: symbolic verification of generated symbolic code
Inference: Use this when the JIT's output has symbolic instruction fields, variable-length blocks, or branch targets that depend on symbolic source/context values.

Steps from section 5 (pp. 50–52):

1. Write the JIT, source interpreter, target interpreter, assumptions, and invariants in Rosette. Symbolically evaluate the JIT to obtain a satisfiability query containing source semantics, emitted target semantics, and the stepwise obligations; discharge it with an SMT solver (Boolector in the evaluation). Symbolic evaluation requires the JIT and both interpreter executions to have no unbounded loops.
2. Construct a Skolem function `f(x)` giving the number of target steps needed for each symbolic input. Maintain the target program counter as `base + offset`; stop evaluation when the offset is concrete and leaves the emitted block, or becomes symbolic. This procedure guesses `f`; a wrong guess causes the target to get stuck or violate an invariant, so it cannot make an incorrect JIT pass (section 5, p. 50).
3. Merge states at control-flow joins but split on each concrete opcode of a symbolic instruction. This avoids path explosion while preserving opcode-specific behavior. For RV64 `LD64_IMM`, the paper reports 2,181 possible block types, of which 307 are feasible; separate-path symbolic execution is judged unsuitable (section 5, p. 51).
4. Build interpreters that accept symbolic instructions. Avoid integer indexing of register vectors; use equality and uninterpreted functions with bitvectors, and implement a symbolic x86 decoder for raw emitted bytes (section 5, p. 51).
5. Replace expensive multiplication, division, and remainder bitvector operations with uninterpreted functions. Add only the needed axioms: multiplication commutativity, remainder decomposition, high-half multiplication commutativity, and 64-bit multiplication decomposition. The authors manually proved these axioms in Lean. The metatheory and bitvector axiomatization together took 1,492 lines of Lean (sections 5, 7, p. 52).

Inference: Verus can use uninterpreted `spec fn`s and explicit axioms proved as lemmas, but its SMT backend and quantifier behavior differ from Rosette/Boolector. Treat the symbolic evaluator, target decoder, and extracted C as trusted unless separately verified. Do not claim that Verus can synthesize JIT fragments without an external synthesizer.

## technique 3: restricted DSL, extraction, and synthesis
Jitterbug uses a shallow Rosette embedding of structured C: booleans, machine integers, array access, conditionals, and switch statements. The DSL does not support address-of, dereference, goto, or switch fallthrough, so the verifier need not model full C semantics. It extracts C from verified DSL fragments plus a code template and type mapping (section 6, p. 52; Figure 9). Extraction is unverified (section 1, p. 42), and “Jitterbug does not perform any type checking for the C code” (section 6, p. 52). The authors separately validated instruction encoders: “separately verifying that the instruction encoding functions in C emitted the same bytes as their original DSL code” (section 8, p. 54).

For optimization, write a sketch of a fragment for one opcode, define the search space, and ask Rosette synthesis for the shortest fragment satisfying per-instruction correctness. For `ADD64_REG` and `SUB64_REG`, synthesis found four RV32 instructions where the manual versions used five; the shorter fragments were adopted (section 6, p. 52).

Inference: A Verus workflow can keep a verified Rust/specification subset and generate ordinary Rust only after proving the extraction correspondence. Any generator, template glue, or unsafe instruction encoder outside the proof is trusted. The synthesis pattern can guide agent-written optimized code, but each result still needs the per-instruction proof.

## evidence, trust, and limits
Figure 11 (p. 53) reports per-opcode verification on an Intel Core i7-7700K at 4.5 GHz with Boolector 3.2.1. RV32 has 16–401 seconds per opcode (mean 73, median 55); RV64 has 4–7,542 seconds (mean 116, median 24); Arm32 23–925 (mean 130, median 99); Arm64 4–110 (mean 26, median 23); x86-32 24–488 (mean 122, median 109); x86-64 5–170 (mean 33, median 27). The “Spec.” column counts lines of specification code: 336, 284, 192, 163, 185, and 182, respectively. The text explains: “The specification effort comprises writing assumptions and invariants for the implementation” (section 7, p. 53). The Rosette framework has 1,825 lines; interpreters range from 471 BPF lines to 2,299 x86 lines (Figure 10, p. 53).

The team ported Arm32 and Arm64 in one week each and x86-32/x86-64 in three weeks total; translation from C was mechanical but manual mistakes could hide bugs (section 7, p. 53). They found 16 bugs in existing JITs and two in a shared Arm64 encoding library, then added selftests (section 7, p. 53). The paper states: “The JIT context well-formedness wf and assumptions are assumed to be correct and trusted” (section 4.2, p. 48). Inference: Trust also includes DSL-to-C extraction, the C compiler, machine interpreters/decoders, SMT/Lean foundations, and the modeled kernel interfaces and BPF semantics. The paper explicitly excludes self-modifying code and assumes deterministic execution (section 4.1, p. 46), and ported JITs did not cover legacy instruction sets, TAIL_CALL, or optimized register saving (section 7, p. 53).

The specification does not cover offset-table construction or target-code layout. Of the 82 historical bugs examined, it could catch all but two, both in offset-table construction (section 4.4, p. 49). It also permits a JIT that rejects every program: “Jitterbug’s specification permits “null” JIT implementations that fail on all source programs” (section 4.4, p. 49). The authors use selftests to assess feature completeness. The specification excludes bugs in the BPF checker, code-image memory management, and kernel use of the JIT; it does not model instruction caches or memory permissions or guarantee protection against microarchitectural timing channels (section 4.4, pp. 49–50).

## techniques for the catalog
- stepwise compiler simulation — prove prologue, each emitted instruction block, and epilogue, then apply a composition theorem
- symbolic generated-code verification — merge paths, split symbolic opcodes, infer step counts, and solve source/target constraints with SMT
- restricted DSL with unverified C extraction — write a structured compiler subset, extract auditable C, and separately validate instruction encoding functions
- solver-backed optimization — synthesize the shortest opcode fragment satisfying the per-instruction correctness relation
