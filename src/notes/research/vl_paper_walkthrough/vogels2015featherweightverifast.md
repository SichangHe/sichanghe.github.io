# Featherweight VeriFast
(authored by agents unless marked 🧑)
Tag: `vogels2015featherweightverifast`, [paper](https://www.semanticscholar.org/paper/f523e3dae03bd7de70d6df19bbeaaaa350a181e5)

## scope and trust result
This paper formalizes a core subset of VeriFast, a separation-logic verifier for C-like programs. Its stated contribution is “a formal definition and soundness proof of a core subset of the VeriFast program verification approach” (Abstract, p. 1), backed by an executable definition and machine-checked Coq proof. Featherweight VeriFast handles routines, loops, dynamic allocation/deallocation, contracts, loop invariants, recursive predicates, and symbolic execution, but omits function pointers and concurrency (Sect. 1, p. 3). The target theorem is memory safety: successful verification implies no execution accesses unallocated memory. The Coq kernel and formalized semantics are trusted; the external theorem prover used for symbolic conditions and the real VeriFast implementation are additional trust boundaries.

## technique: contract and predicate annotations
What it is. A routine contract describes resources and facts required before a call and provided after it. The paper's `swap` example uses `req cell1 ↦ ?v1 * cell2 ↦ ?v2` and `ens cell1 ↦ v2 * cell2 ↦ v1` (Sect. 3.1, p. 19). A pattern variable `?v1` binds the value found in a heap chunk so the postcondition can relate final and initial state.

How to apply it. (1) Identify each memory resource a routine needs and write it as a points-to chunk. (2) Use pattern variables to bind old values. (3) Write an `ens` clause that returns the resources and states the relation after mutation. (4) Split independent resources with separating conjunction `*`; it asserts both facts and disjoint heap ownership, unlike ordinary logical conjunction (p. 19). (5) For unbounded structures, define a recursive predicate such as a list chunk and use `open` to expose its fields before a mutation and `close` to package them afterward (Sect. 3.2, p. 35).

Verus form. Inference: use `requires` and `ensures` on Rust functions, ghost variables for old values, and predicates or quantified assertions for owned resources. Rust references and Verus permissions replace the concrete points-to chunks. A `proof fn` can establish the list-shape lemma; it must not be called as executable code. The separation split is represented by disjoint mutable borrows or explicit ghost disjointness facts.

## technique: semiconcrete execution
The paper inserts an intermediate execution between concrete behavior and symbolic reasoning. “Semiconcrete execution executes each routine separately, starting from an arbitrary initial state that satisfies the precondition, and checking that each final state satisfies the postcondition” (Sect. 2.8, p. 17). Calls use the callee contract instead of its body; loop bodies start from an arbitrary invariant-satisfying state and must re-establish the invariant. This bounds trace length even for recursion and loops, while predicates summarize potentially unbounded heaps.

Step by step: (1) verify the routine precondition on entry; (2) consume the resources in the precondition; (3) execute the body with concrete values but contract-based calls; (4) check the postcondition and restore produced resources; (5) for a loop, check the invariant initially and after one body execution; (6) treat a predicate as a named recursive assertion, opening and closing it around field-level operations. The semantic guarantee is a refinement chain, quoted verbatim: “safe program(c) ⇐ sc-safe program(c) ⇐ sym-safe program(c)” (Definition 2.24, p. 17).

Verus form. Inference: write loop `invariant` clauses that summarize the heap shape and use function contracts for modular calls. Verus does not have VeriFast's `open`/`close` commands; unfold and re-establish predicates with proof functions and `assert`/`reveal` patterns supported by Verus. Keep loop invariants strong enough to imply both safety and the next-iteration shape.

## technique: symbolic execution with path conditions
Concrete and semiconcrete execution still branch infinitely on fresh allocation addresses and nondeterministic values. Symbolic execution replaces each demonic choice with a fresh symbol and stores constraints in a path condition. The paper explains: “Infinite branching is thus replaced by picking a fresh symbol. A theorem prover is used to decide equalities between terms and other conditions involving symbols under a given path condition” (Sect. 2.8, p. 18).

Procedure: (1) maintain symbolic store, symbolic heap, and path condition; (2) allocate a fresh symbol and add its reflexive-use fact to the path condition; (3) translate an assertion into a formula and ask the SMT solver whether it follows; (4) consume a heap chunk by finding a symbolic chunk equal under the path condition, not merely textually identical; (5) produce chunks by adding them to the symbolic heap; (6) branch on condition `b` by exploring `b` and `not b` under separate path conditions. The formal definition gives `sassert(b)` as an SMT entailment check and `sconsume` as a search for a heap satisfying equality under the path condition (Definition 4.3, p. 36).

Verus form. Inference: Verus's SMT-backed `assert`, `requires`, and `ensures` discharge path-condition obligations, while Rust control flow creates branches. Use ghost symbolic values only in specifications; do not model a runtime symbolic executor. Solver failure is a proof failure, and unsupported nonlinear or heap reasoning needs explicit lemmas.

## evidence and failure modes
The paper verifies two examples: construction/destruction of a large linked list and in-place list reversal (Sect. 1, p. 3). The formal subset excludes concurrency and function pointers even though full VeriFast supports them. Soundness is conditional on the theorem prover's answers, the semantics implementation, and the Coq kernel. Inference: for VL, the main reusable idea is the layered proof architecture—contracts and recursive ownership summaries first, then symbolic equalities—rather than copying VeriFast syntax. Existing separation-logic work already covers list ownership and modular call reasoning; VL should avoid redoing those abstractions unless Rust borrowing creates a demonstrable gap.

## techniques for the catalog
- separation contracts: specify consumed and produced heap resources with preconditions, postconditions, and separating conjunction
- recursive predicates: summarize unbounded structures and open/close them around local mutations
- semiconcrete execution: use contracts and loop invariants to bound traces before symbolic reasoning
- symbolic execution: replace infinite branching with fresh symbols and SMT-checked path conditions
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
