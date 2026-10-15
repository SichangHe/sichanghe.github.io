# Aquarium: Cassiopea and Alewife Languages
(authored by agents unless marked 🧑)
Tag: `holland2022aquarium`, [paper](https://arxiv.org/abs/1908.00093)

## purpose and verification boundary

Aquarium separates machine descriptions from machine-independent specifications so that code blocks can be synthesized and checked for many processors. The report says: “Cassiopea is a machine description language for describing the semantics of processor instruction sets.” (Abstract, p. 1). Alewife supplies abstract specifications and is lowered to Cassiopea; synthesis itself is outside this report. The conclusion describes the intended use: “Alewife specifications can be lowered to concrete specifications and used for synthesis and verification against Cassiopea machine descriptions.” (Sect. 9, p. 24).

## technique: executable machine semantics

What it is. Cassiopea is a register-transfer-list language. Instructions are non-Turing-complete procedures that update an explicit machine state: registers, memory regions, control registers, interrupt state, labels, and branch status. Memory is modeled as named finite regions rather than one unbounded address space. Initial states are supplied separately, which permits reasoning over all states satisfying a specification precondition.

When to use it. Use this representation when verifying low-level instruction behavior while keeping processor-dependent details explicit. It is suitable for synthesis targets because each instruction has a textual assembler form and a semantic body.

How to do it. Declare register and memory-region types with bit widths and lengths. Define operations with text and semantic bodies. Define expression evaluation (bit-vector operators, slices, reads, `fetch`) and statement execution (assignment, store, loops, branches, assertions). Give a big-step operational semantics that either returns a value, updates state, or reaches `fail`. Treat pointers dynamically: invalid pointer use fails at runtime, and cell width is checked by `fetch`/`store`. Define `branchto` in the postcondition to constrain external control flow.

Verus form. Inference: model state as a struct and semantics as pure `spec fn` relations or result values. Keep machine operations as ghost specifications and executable wrappers; use `requires` for valid memory regions and `ensures` for state updates and non-failure. Use enums for `fail` and branch outcomes. The report’s dynamic pointer checks must become explicit preconditions or proof cases in Verus; Rust ownership does not prove the machine model automatically.

Evidence and limits. The report states: “The reader will note that the semantics rules for machines and declarations do not provide initial values for registers.” (Sect. 3, p. 3). This is deliberate but leaves initialization assumptions to each specification. Pointer/register distinctions are partly dynamic, so well-typed syntax does not exclude every runtime failure.

## technique: indexed static typing

What it is. Cassiopea types carry widths (`C bit`, `C reg`), region lengths, pointer widths, and function signatures. Typing judgments transform environments for declarations and check expressions, statements, machines, specifications, and programs. Bit-vector operators are polymorphic only when operand widths agree; slices require bounds.

How to do it. Build a type environment for aliases, registers, memories, functions, procedures, and operations. Check each declaration while producing an extended environment. Check expressions recursively, enforcing width and base-type constraints. Check statements and instruction sequences against the machine environment. Reject malformed lowered output through the Cassiopea checker. Keep assembler text forms as strings but type their source register or operation separately.

Verus form. Inference: encode widths at the value level and prove width-preservation lemmas, or use const generics where practical. A `spec fn` can state that slicing preserves bounds; `proof fn` lemmas establish arithmetic side conditions. Verus does not provide this language’s indexed type system directly, so generated Rust needs explicit ghost invariants.

Evidence and limits. The report calls out a key boundary: “We do not provide (or implement) a full typechecking pass for Alewife.” (Sect. 7, p. 18). Thus Cassiopea typing is the actual rejection mechanism after lowering; malformed Alewife may survive until translation.

## technique: abstract specification frames and contracts

What it is. A Cassiopea specification names registers and memory that may change (`frame`), then gives a Boolean precondition and postcondition. The frame makes noninterference explicit: state outside the listed locations should remain unchanged. Alewife adds `require`, `provide`, and block-lets for machine-independent values and initial-state references.

How to do it. Import a machine and lowering module. Declare the frame of modified registers/memory. Bind pre-state values with block-lets when a postcondition needs them. State a precondition over the initial state, execute a synthesized block, and state a postcondition including `branchto`. Lower all abstract names and symbolic constants, then type-check the complete Cassiopea specification.

Verus form. Inference: express frame conditions with `ensures` comparing unchanged fields to `old(state).field`; use `requires` for preconditions and `assert`/lemmas for postconditions. A Verus function’s `modifies` clause is not a valid construct; frame facts belong in the postcondition and invariants.

Evidence and limits. The report explains the purpose of block-lets: “To refer to values taken from the initial state (that is, the machine state of the precondition) block-lets serve this purpose in Alewife.” (Sect. 6, p. 17). The approach assumes that lowering modules correctly bind every abstract object; module-import checking is stated as not currently implemented.

## technique: Alewife-to-Cassiopea lowering

What it is. Alewife is a machine-independent specification language. A lowering module supplies machine-specific registers, memory, symbolic constants, and code fragments. Translation is syntax-directed and polymorphic over types, expressions, block-lets, declarations, frames, and specifications. The result is a complete Cassiopea specification checked by the Cassiopea rules.

How to do it. Parse an Alewife module and resolve `require`/`provide` declarations. Extract integer constants used in types. Maintain separate Alewife and Cassiopea environments; lower types and expressions on demand. Translate declarations and frames, instantiate lowering-module fragments, and combine the result with the machine description. If a rule produces bottom, report a translation-time failure. Run Cassiopea typing and semantics on the final output.

Verus form. Inference: implement lowering as a pure compiler from an AST to a Rust verification AST; prove a refinement theorem that interpreting lowered code equals interpreting the source under the module mapping. Keep unsupported constructs as explicit translation errors. This is analogous to a verified compiler pass, but the report’s judgments and environments must be reimplemented as Rust data and lemmas.

Evidence and limits. The report emphasizes the separation: “The Cassiopea and Alewife syntax should be considered disjoint.” (Sect. 2, p. 2). Translation therefore is the only sanctioned boundary. It can fail on unresolved or incompatible constructs, and the report does not provide synthesis or empirical success rates.

## what is trusted and what VL should reuse

Proved or specified: Cassiopea expression/statement semantics, indexed typing judgments, machine/specification/program well-formedness, and syntax-directed Alewife lowering. Trusted: the semantic definitions, parser and implementation, lowering-module contents, assembler/linker behavior, and runtime checks for dynamic pointers. No benchmark denominator or theorem-prover soundness experiment is reported. Inference: for VL, the valuable pattern is a small, typed intermediate language plus a verified lowering boundary and explicit frame contracts. Agent-written verified Rust remains exposed where generated code depends on unverified lowering modules or runtime pointer assumptions; requiring a refinement proof for every lowering module is the direct mitigation. VL should reuse these contract and frame ideas rather than reproduce an entire ISA DSL unless synthesis is a product requirement.

## techniques for the catalog

- register-transfer semantics — model instruction execution over explicit registers, finite memories, labels, and branch outcomes
- indexed width typing — carry bit widths and region bounds through syntax-directed judgments
- frame contracts — state modified locations and pre/postconditions for machine blocks
- abstract-to-concrete lowering — translate Alewife specifications through machine-specific modules into typed Cassiopea
- explicit failure semantics — make invalid pointers and runtime checks part of the semantics so evaluation does not get stuck
Checked 2026-10-14 against the paper by a Codex agent: audit record holland2022aquarium; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
