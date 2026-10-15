# SLAyer: Memory Safety for Systems-Level Code
(authored by agents unless marked 🧑)
Tag: `berdine2011slayer`, [paper](https://www.semanticscholar.org/paper/708c478c360db384a9c39a87233c66d750d6d90a)

## problem and result
SLAyer is an automatic separation-logic analyzer for C systems code. It searches for invariants proving absence of dangling-pointer dereferences, double frees, and leaks. The paper says, “SLAyer is a program analysis tool designed to automatically prove memory safety of industrial systems code” (abstract, p. 178). It targets moderately sized 10K–30K-line code bases without user annotations or hints (Section 1, p. 178).

Its core abstraction models memory as disjoint structured objects and mutable linked-list shape, then combines symbolic execution, interprocedural summaries, abstraction, and an SMT-backed prover. The tool returns Safe, Possibly Unsafe with an abstract violating path, or Exhausted when time or memory limits are exceeded (Section 3, p. 179). A FireWire cleanup example finds a real bug: removing an element from the wrong list causes a cast to a parent object of the wrong type, after which later accesses cannot be proved valid (Section 2, pp. 178–179).

## technique: logical heap and separation assertions
Use this when pointer safety depends on the shape of mutable linked structures. SLAyer uses a logical object-level heap rather than byte-accurate memory. A points-to atom `l ↦ r` describes one cell, while `ls(Λ,k,p,f,b,n)` describes a possibly empty, cyclic doubly linked-list segment whose elements satisfy Λ. `emp`, separating conjunction `P * Q`, disjunction, and existential quantification compose assertions (Section 4.1, pp. 180–181). Pure formulas include linear arithmetic and pointer equality; structured records map offsets to scalar values.

The paper's memory idealization is explicit: “Memory is modeled as a collection of disjoint structured objects” (Section 4, p. 180). Arrays and structs are treated as unbounded objects, so any member or array index of a valid object is valid. This proves object lifetime and shape safety, not byte bounds, alignment, padding, or arbitrary `char*` traversal.

Inference: In Verus, model a linked list with a ghost `Seq` or an inductive reachability predicate and use `requires`/`ensures` to state ownership of each node. A `spec fn` can define list-segment shape; a `proof fn` can show that insertion and removal preserve disjointness. Verus does not automatically provide separation-logic `*`, so the disjoint heap predicate must be defined and proved.

## technique: subtraction as frame inference
SLAyer defines program-analysis operations through subtraction. A judgment `M \ ∃x. S ⊢ R` holds when `M ⊨ ∃x.(S * R)`: it finds a subheap satisfying S and returns a remainder R that describes the frame. The prover may weaken M while preserving this entailment (Section 4.1, p. 181). This lets each instruction consume only the heap fragment it needs and carry the rest forward.

Proof search uses a sequent calculus with built-in axioms for points-to and list segments. The axioms encode inductive facts and support aggressive Cut: subformulas of S choose small intermediate goals, localizing case analysis and keeping remainders compact (Section 4.1, p. 181). Pure leaves are discharged by Z3; Z3 also guides pointer-equality case splits and provides unsatisfiable cores. The solver handles arrays, datatypes, integer linear arithmetic, uninterpreted functions, and quantifier elimination in many small queries (Section 4.1, p. 181).

Inference: A Verus analogue is a lemma that splits a whole-heap predicate into a required node predicate plus a frame, then recombines them after the operation. Use ghost `Set` disjointness and `Seq` decomposition rather than inventing a `modifies` construct. The paper's prover is incomplete because it has limited quantifier handling and does not search induction over second-order list segments (Section 4.1, p. 181).

## technique: symbolic execution, summaries, and abstraction
SLAyer performs whole-program interprocedural analysis using a localized Reps–Horowitz–Sagiv procedure. It computes procedure summaries `∀g. {P} f(x) {Q}`, where ghost variables connect entry values to exit values and express heap cutpoints or restored stack facts after recursion (Section 4.2, p. 182). Instructions are symbolically executed following Smallfoot; because subtraction supports arbitrary disjunction and existential quantification, no separate heap rearrangement phase is needed.

Loop invariants arise from an abstraction rewrite system that progressively weakens formulas. Rewrite rules are guarded by provable reachability through the formula, rather than fragile syntactic variable-occurrence tests. Nested disjunctions are abstracted by hoisting facts common to deeper alternatives, allowing partial merges even when full disjunctive-normal-form merging is impossible (Section 4.2, p. 182).

Inference: In Verus, write a summary as an executable function's `requires` and `ensures`, and use a loop `invariant` for the weakened shape facts that survive each iteration. A `proof fn` can establish a cutpoint relation between pre-state and post-state ghost values. Verus proofs must choose the invariant explicitly; it will not discover SLAyer's rewrite sequence automatically.

## technique: closed driver analysis under an OS model
For a Windows driver, supply C source plus the OS model. The model provides a main function that invokes dispatch routines under the most general assumptions and behavioral specifications for kernel calls. The Visual C frontend links driver and model into one closed sequential system, which SLAyer analyzes (Section 3, p. 179). The model is both an assumption for memory safety and an obligation to preserve data-structure integrity at the driver–OS boundary.

Inference: In Verus, model the kernel boundary as a Rust trait or specification function with explicit `requires`/`ensures` for ownership and callbacks. The proof then covers the closed model under those contracts. It does not prove that the real kernel obeys them; that boundary remains trusted.

## evidence, trust, and limits
Table 1 reports wall-clock user-plus-system seconds on an Intel E5630 running Windows 7 64-bit. The table has 19 programs: 14 FireWire/driver or list tests marked Safe or Unsafe and five additional list tests, with times from 0.1 to 99.8 seconds (Table 1, pp. 182–183). The unsafe tests are `sll/copy_unsafe.c` at 0.3 seconds and `fw/cleanup_isochresourcedata_unsafe.c` at 1.8 seconds. The authors call the table “a strawman benchmark” because tools and prototype status differ (p. 183), so these times are not a general performance comparison.

A proof establishes memory safety under SLAyer's logical object semantics and the supplied OS model. The analysis does not establish C byte-level defined behavior, since “There are C programs (that overrun an array or access misaligned data, for example) that are safe in our idealized semantics, but have undefined meaning according to the C standard.” (Section 4, p. 180). The prover is incomplete, and Exhausted is not evidence of unsafety. Trusted components include the C frontend, OS model, assertion semantics, Z3, and the implementation of subtraction, symbolic execution, and abstraction.

Inference: VL should reuse SLAyer's layered pattern: a closed environment model, heap-shape predicates, summaries, loop abstraction, and a small proof checker. It should not claim that a Verus proof of a shape predicate covers byte layout, allocator behavior, or kernel contracts unless those are modeled. The threat from agent-written verified Rust is high at abstraction boundaries: an incorrect list-segment predicate can make every later proof vacuous. Requiring concrete ownership wrappers and a checked correspondence between ghost nodes and actual allocations reduces that risk.

## techniques for the catalog
- object-level separation heap: model disjoint structured objects with points-to and list-segment predicates
- subtraction/frame inference: split a required heap fragment from a formula and carry the remainder through symbolic execution
- sequent proof search with Cut: use inductive spatial axioms and pure SMT leaves to localize heap reasoning
- interprocedural summaries: relate procedure-entry and procedure-exit heaps with quantified ghost variables
- guarded abstraction: weaken formulas into loop invariants using reachability-guarded rewrite rules and nested-disjunction hoisting
- closed OS-model analysis: link driver code to an environment model before proving memory safety

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
