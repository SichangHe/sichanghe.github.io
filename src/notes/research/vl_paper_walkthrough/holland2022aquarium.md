# Aquarium: Cassiopea and Alewife Languages
(authored by agents unless marked 🧑)
Tag: `holland2022aquarium`, [paper](https://arxiv.org/abs/1908.00093)

## purpose and verification boundary

Aquarium separates machine descriptions from machine-independent specifications so that code blocks can be synthesized and checked for many processors. The report says: “Cassiopea is a machine description language for describing the semantics of processor instruction sets.” (Abstract, p. 1). Alewife supplies abstract specifications and is lowered to Cassiopea; synthesis itself is outside this report. The conclusion describes the intended use: “such that these abstract specifications can be lowered to concrete specifications and used for synthesis and verification against Cassiopea machine descriptions.” (Sect. 9, pp. 22-23).

## technique: executable machine semantics

What it is. Cassiopea is a register-transfer-list language. Instructions are non-Turing-complete procedures that update an explicit machine state: registers, memory regions, control registers, interrupt state, labels, and branch status. Memory is modeled as named finite regions rather than one unbounded address space. Initial states are supplied separately, which permits reasoning over all states satisfying a specification precondition.

When to use it. Use this representation when verifying low-level instruction behavior while keeping processor-dependent details explicit. It is suitable for synthesis targets because each instruction has a textual assembler form and a semantic body.

How to do it. Declare register and memory-region types with bit widths and lengths. Define operations with text and semantic bodies. Define expression evaluation (bit-vector operators, slices, reads, `fetch`) and statement execution (assignment, store, loops, branches, assertions). Give a large-step operational semantics: expressions evaluate to a value or `fail`; statements update registers and memory, or end in `crash` (for example a store through a bad pointer or a false `assert`). Treat pointers dynamically: invalid pointer use fails at runtime, and cell width is checked by `fetch`/`store`. Branching: `BRANCH(e)` with an 8-bit operand skips that many instructions, and the value 0xff means a jump to the single external label; the `branchto` predicate, usable in the postcondition, reports whether the block took that external branch. The program-level judgment does not represent failure; the paper intends that a failing program reaches a state where no postcondition can evaluate to true, and says that formalizing this explicitly was judged to add complication without useful information (Sect. 5, p. 14).

Verus form. Inference: model state as a struct and semantics as pure `spec fn` relations or result values. Keep machine operations as ghost specifications and executable wrappers; use `requires` for valid memory regions and `ensures` for state updates and non-failure. Use enums for `fail` and branch outcomes. The report’s dynamic pointer checks must become explicit preconditions or proof cases in Verus; Rust ownership does not prove the machine model automatically.

Evidence and limits. The report states: “The reader will note that the semantics rules for machines and declarations do not provide initial values for registers.” (Sect. 3, p. 3). The paper says that the semantics instead treat the starting state as an input or quantify over it, and a machine-state validity judgment (Fig. 16) rejects stores that do not match the declarations. Inference: this leaves any assumption about initial values to each specification's precondition. Pointers are not statically distinguished from plain bitvectors in Cassiopea, so well-typed programs can still `fail` or `crash` at runtime; the paper claims the type system “remains sound” because the semantics include the checks and failure states (Sect. 4, p. 10), without giving a proof.

## technique: indexed static typing

What it is. Cassiopea types carry widths (`C bit`, `C reg`), region lengths, pointer widths, and function signatures. Typing judgments transform environments for declarations and check expressions, statements, machines, specifications, and programs. Bit-vector operators are polymorphic only when operand widths agree; slices require bounds.

How to do it. Build a type environment for aliases, registers, memories, functions, procedures, and operations. Check each declaration while producing an extended environment. Check expressions recursively, enforcing width and base-type constraints. Check statements and instruction sequences against the machine environment. Reject malformed lowered output through the Cassiopea checker. Keep assembler text forms as strings but type their source register or operation separately.

Verus form. Inference: encode widths at the value level and prove width-preservation lemmas, or use const generics where practical. A `spec fn` can state that slicing preserves bounds; `proof fn` lemmas establish arithmetic side conditions. Verus does not provide this language’s indexed type system directly, so generated Rust needs explicit ghost invariants.

Evidence and limits. The report calls out a key boundary: “We do not provide (or implement) a full typechecking pass for Alewife.” (Sect. 7, p. 18). Thus Cassiopea typing is the actual rejection mechanism after lowering; malformed Alewife may survive until translation.

## technique: abstract specification frames and contracts

What it is. A Cassiopea specification names registers and memory that may change (`frame`, written `reg-modify`/`mem-modify`), then gives a Boolean precondition and postcondition. The frame makes noninterference explicit: registers and memory cells outside the listed ones (augmented with those mentioned in the postcondition) must be unchanged (Fig. 15, p. 14). Alewife adds `require`, `provide`, and block-lets for machine-independent values and initial-state references.

How to do it. Import a machine and lowering module. Declare the frame of modified registers/memory. Bind pre-state values with block-lets when a postcondition needs them. State a precondition over the initial state, execute a synthesized block, and state a postcondition including `branchto`. Lower all abstract names and symbolic constants, then type-check the complete Cassiopea specification.

Verus form. Inference: express frame conditions with `ensures` comparing unchanged fields to `old(state).field`; use `requires` for preconditions and `assert`/lemmas for postconditions. A Verus function’s `modifies` clause is not a valid construct; frame facts belong in the postcondition and invariants.

Evidence and limits. The report explains the purpose of block-lets: “To refer to values taken from the initial state (that is, the machine state of which the precondition must be true), we need a way to bind these values so their scope extends to the postcondition. The block-lets serve this purpose in Alewife”. (Sect. 6, p. 18). Inference: the approach relies on lowering modules binding every abstract object. The paper says that checking an Alewife file on its own against its `require` declarations is not defined or implemented: “However, we do not currently define or implement such a check.” (Sect. 6, p. 17), and that it is “not (yet) prepared to argue” that its rules rule out all translation-time failures (Sect. 8, p. 21).

## technique: Alewife-to-Cassiopea lowering

What it is. Alewife is a machine-independent specification language. A lowering module supplies machine-specific registers, memory, symbolic constants, and code fragments. Translation is syntax-directed and polymorphic over types, expressions, block-lets, declarations, frames, and specifications. The result is a complete Cassiopea specification checked by the Cassiopea rules.

How to do it. Take the machine, the lowering modules named by `lower-with`, and the Alewife specification. Extract integer constants (environment Σ) to resolve symbolic sizes in types. Reuse the Cassiopea environments Δ, Γ and lower Alewife types on the fly. Declarations from the lowering modules and the Alewife specification refer to each other, so the semantic rules take fixpoints and the implementation topologically sorts them by identifier references. Translate declarations, block-lets, frames, pre and postconditions; `require` declarations translate to nothing, because the lowering-module declarations are emitted in the output. Combine the result with the machine description. If a rule produces bottom (⊥), report a translation-time failure. Run Cassiopea typing and semantics on the final output.

Verus form. Inference: implement lowering as a pure compiler from an AST to a Rust verification AST; prove a refinement theorem that interpreting lowered code equals interpreting the source under the module mapping. Keep unsupported constructs as explicit translation errors. This is analogous to a verified compiler pass, but the report’s judgments and environments must be reimplemented as Rust data and lemmas.

Evidence and limits. The report emphasizes the separation: “The Cassiopea and Alewife syntax should be considered disjoint.” (Sect. 2, p. 2). Inference: translation is therefore the only intended boundary between the two languages. It can fail on unresolved or incompatible constructs, and the report does not provide synthesis or empirical success rates.

## what is trusted and what VL should reuse

Specified (not proved in this report): Cassiopea expression/statement semantics, indexed typing judgments, machine/specification/program well-formedness, and syntax-directed Alewife lowering; no soundness proof or mechanized check appears in it. Trusted: the semantic definitions, parser and implementation, lowering-module contents, assembler/linker behavior, and runtime checks for dynamic pointers. No benchmark, evaluation or theorem-prover soundness experiment is reported. Inference: for VL, the valuable pattern is a small, typed intermediate language plus a verified lowering boundary and explicit frame contracts. Agent-written verified Rust remains exposed where generated code depends on unverified lowering modules or runtime pointer assumptions; requiring a refinement proof for every lowering module is the direct mitigation. VL should reuse these contract and frame ideas rather than reproduce an entire ISA DSL unless synthesis is a product requirement.

## techniques for the catalog

- register-transfer semantics — model instruction execution over explicit registers, finite memories, labels, and branch outcomes
- indexed width typing — carry bit widths and region bounds through syntax-directed judgments
- frame contracts — state modified locations and pre/postconditions for machine blocks
- abstract-to-concrete lowering — translate Alewife specifications through machine-specific modules into typed Cassiopea
- explicit failure semantics — make invalid pointers and runtime checks part of the semantics so evaluation does not get stuck
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Since identifiers are not allowed to overlap in well-typed programs, and register identities are not strings at all, and EXTBRANCH is reserved, this usage creates no conflicts."): read the whole text (23 pages) and checked all quotations, page and section references (pdf pages equal printed pages), the technique steps and the link (arXiv 1908.00093v5 is on the paper's first page); changed the conclusion and block-let quotations and their pages, the failure/crash and branching description, the lowering environment description (Alewife reuses the Cassiopea environments), the unimplemented-check claim, and the wording that called the semantics proved; marked remaining own conclusions as Inference; did not check the Verus-form suggestions against Verus, nor any other project publication.
