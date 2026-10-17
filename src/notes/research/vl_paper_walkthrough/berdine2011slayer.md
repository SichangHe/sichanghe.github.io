# SLAyer: Memory Safety for Systems-Level Code
(authored by agents unless marked 🧑)
Tag: `berdine2011slayer`, [paper](https://www.semanticscholar.org/paper/708c478c360db384a9c39a87233c66d750d6d90a) (link from the fetch record; the paper text gives no DOI, only CAV 2011, LNCS 6806, pp. 178-183)

## problem and result
SLAyer is an automatic separation-logic analyzer for C systems code. It searches for invariants proving absence of dangling-pointer dereferences, double frees, and memory leaks (Section 1, p. 178). The paper says, “SLAyer is a program analysis tool designed to automatically prove memory safety of industrial systems code” (abstract, p. 178). It targets moderately sized 10K–30K-line code bases without user annotations or hints (Section 1, p. 178).

Its core abstraction models memory as disjoint structured objects and mutable linked-list shape, then combines symbolic execution, interprocedural summaries, abstraction, and an SMT-backed prover. The tool returns Safe, Possibly Unsafe with an abstract violating path, or Exhausted when time or memory limits are exceeded (Section 3, p. 179). A FireWire cleanup example finds a real bug: an element is removed from the wrong list, the code then assumes `listEntry` points into an `ISOCH_RESOURCE_DATA` when it points into a `CROM_DATA`, so `IsochResourceData` is set to a parent object of the wrong type and SLAyer cannot verify later accesses to it; the paper says this is a real bug, "now fixed in the Windows 8 codebase" (Section 2, pp. 178–179).

## technique: logical heap and separation assertions
Use this when pointer safety depends on the shape of mutable linked structures. SLAyer uses a logical object-level heap rather than byte-accurate memory. A points-to atom `l ↦ r` describes one cell, while `ls(Λ,k,p,f,b,n)` describes a possibly-empty, possibly-cyclic segment of a doubly-linked list whose elements satisfy Λ. `emp`, separating conjunction `P * Q`, disjunction, and existential quantification compose assertions (Section 4.1, pp. 180–181). Pure formulas include linear arithmetic and pointer equality; structured records map offsets to scalar values.

The paper's memory idealization is explicit: “Memory is modeled as a collection of disjoint structured objects” (Section 4, p. 180). Arrays and structs are treated as unbounded objects, so any member or array index of a valid object is valid. This proves object lifetime and shape safety, not byte bounds, alignment, padding, or arbitrary `char*` traversal.

Inference: In Verus, model a linked list with a ghost `Seq` or an inductive reachability predicate and use `requires`/`ensures` to state ownership of each node. A `spec fn` can define list-segment shape; a `proof fn` can show that insertion and removal preserve disjointness. Verus does not automatically provide separation-logic `*`, so the disjoint heap predicate must be defined and proved.

## technique: subtraction as frame inference
SLAyer defines program-analysis operations through subtraction. A judgment `M \ ∃x. S ⊢ R` holds when `M ⊨ ∃x.(S * R)`: it finds a subheap satisfying S and returns a remainder R that describes the frame. The prover may weaken M while preserving this entailment (Section 4.1, p. 181). Inference: this lets each instruction consume only the heap fragment it needs and carry the remainder forward.

Proof search uses a sequent calculus with built-in axioms for points-to and list segments. The axioms encode inductive facts and support aggressive Cut: subformulas of S choose small intermediate goals, localizing case analysis and keeping remainders compact (Section 4.1, p. 181). Pure leaves are discharged by Z3; Z3 is also used to reason about pointer equality, which guides application of spatial proof rules, and some case splits are directed by unsatisfiable cores extracted by Z3. The solver handles arrays, datatypes, integer linear arithmetic, uninterpreted functions, and quantifier elimination in many small queries (Section 4.1, p. 181).

The paper says the prover is not complete, “due (in part) to limited treatment of quantiﬁers and not attempting to ﬁnd proofs using induction over the second-order list segments” (Section 4.1, p. 181).

Inference: A Verus analogue is a lemma that splits a whole-heap predicate into a required node predicate plus a frame, then recombines them after the operation. Use ghost `Set` disjointness and `Seq` decomposition rather than inventing a `modifies` construct.

## technique: symbolic execution, summaries, and abstraction
SLAyer performs whole-program interprocedural analysis using a localized Reps–Horowitz–Sagiv procedure. It computes procedure summaries `∀g. {P} f(x) {Q}`, where ghost variables connect entry values to exit values and express heap cutpoints or restored stack facts after recursion (Section 4.2, pp. 181–182). Instructions are symbolically executed following Smallfoot; because subtraction supports arbitrary disjunction and existential quantification, no separate heap rearrangement phase is needed.

Loop invariants arise from an abstraction rewrite system that progressively weakens formulas. Rewrite rules are guarded by provable reachability through the formula, rather than fragile syntactic variable-occurrence tests. Nested disjunctions are abstracted by hoisting facts common to deeper alternatives, allowing partial merges even when full disjunctive-normal-form merging is impossible (Section 4.2, p. 182).

Inference: In Verus, write a summary as an executable function's `requires` and `ensures`, and use a loop `invariant` for the weakened shape facts that survive each iteration. A `proof fn` can establish a cutpoint relation between pre-state and post-state ghost values. Verus proofs must choose the invariant explicitly; it will not discover SLAyer's rewrite sequence automatically.

## technique: closed driver analysis under an OS model
For a Windows driver, supply C source plus the OS model. The model provides a main function that invokes dispatch routines under the most general assumptions and behavioral specifications for kernel calls. The Visual C frontend links driver and model into one closed sequential system, which SLAyer analyzes (Section 3, p. 179). The model is both an assumption for memory safety and an obligation to preserve data-structure integrity at the driver–OS boundary.

Inference: In Verus, model the kernel boundary as a Rust trait or specification function with explicit `requires`/`ensures` for ownership and callbacks. The proof then covers the closed model under those contracts. It does not prove that the real kernel obeys them; that boundary remains trusted.

## evidence, trust, and limits
Table 1 gives the time, “usr+sys in seconds”, on an Intel E5630 running Windows 7 64-bit (p. 183). The table has 17 programs: 7 `fw/` programs (extracted from the Windows FireWire driver) and 10 `sll/` programs (similar, but avoiding `CONTAINING_RECORD`), with times from 0.1 to 99.8 seconds; 15 are marked Safe and 2 Unsafe (Table 1, p. 182; Section 5, pp. 182–183). The unsafe tests are `sll/copy_unsafe.c` at 0.3 seconds and `fw/cleanup_isochresourcedata_unsafe.c` at 1.8 seconds. The authors write that they are “very conscious of the diﬀerences and prototype status of tools in this ﬁeld” and present the results “only as a strawman benchmark” (p. 183); Inference: these times are not a general performance comparison.

A proof establishes memory safety under SLAyer's logical object semantics and the supplied OS model. The analysis does not establish C byte-level defined behavior, since “There are C programs (that overrun an array or access misaligned data, for example) that are safe in our idealized semantics, but have undefined meaning according to the C standard.” (Section 4, p. 180). The paper defines Exhausted as “Time/Memory constraints exceeded” (Section 3, p. 179).

Inference: Exhausted is therefore not evidence of unsafety. The trusted components are the C frontend, OS model, assertion semantics, Z3, and the implementation of subtraction, symbolic execution, and abstraction; the paper does not list them as such.

## techniques for the catalog
- object-level separation heap: model disjoint structured objects with points-to and list-segment predicates
- subtraction/frame inference: split a required heap fragment from a formula and carry the remainder through symbolic execution
- sequent proof search with Cut: use inductive spatial axioms and pure SMT leaves to localize heap reasoning
- interprocedural summaries: relate procedure-entry and procedure-exit heaps with quantified ghost variables
- guarded abstraction: weaken formulas into loop invariants using reachability-guarded rewrite rules and nested-disjunction hoisting
- closed OS-model analysis: link driver code to an environment model before proving memory safety
