# Compositional Program Verification with Polynomial Functors in Dependent Type Theory
(authored by agents unless marked 🧑)
Tag: `aberle2026compositional`, [paper](http://arxiv.org/abs/2604.01303v1)

## scope and contribution

Inference: The paper presents a framework in dependent type theory in which polynomial functors are program interfaces, free-monad morphisms are implementations, and dependent polynomials are pre/post specifications. “We present a framework for compositional program verification based on polynomial functors in dependent type theory.” (abstract, p.1) The author reports an Agda formalization. “The entire development has been formalized in Agda (Norell 2009).” (§1, p.1)

## technique 1: interface as a polynomial functor

Inference: What it is. A polynomial is represented by positions A and directions B(a): `Poly = Σ Set (λ A → A → Set)`. The pair describes a dependent function interface `(a : A) → B(a)`. A morphism from `(A,B)` to `(C,D)` contains a forward position map and a backward direction map. “A morphism p ⇒ q between two polynomials, where p = (A, B) and q = (C, D), thus consists of a forward map f0 : A → C on positions and a backward map f 1 : (a : A) → D(f0 (a)) → B(a) on directions.” (§2.1, p.2)

Inference: When to use it. Use one polynomial for every callable interface whose result type depends on its input, especially when a module must call another module through an abstract boundary. The lens records how a caller chooses a callee position and converts the callee response into the caller's result.

Inference: How to do it. (1) Choose A as operation/input cases. (2) Define B(a) as the response type for each case. (3) Package `(A,B)` as `Poly`. (4) Implement a one-call dependency with the two maps described above. (5) Use sums when a module has several labeled dependencies; the paper's `sum U p` is the coproduct and gives one implementation per label (§2.3, p.3).

Inference: Verus form. represent the interface with a Rust enum for positions and a spec function or associated spec type mapping each position to its response; keep the executable API ordinary Rust and expose a `spec fn` describing the response relation. A Verus contract can use `requires` for admissible positions and `ensures` for the returned relation. Inference: this loses Agda's universe-level dependent family ergonomics, so concrete enums and predicates are likely needed.

Inference: Evidence and limits. The paper's evidence is a type-checking formalization and examples, not an empirical benchmark. Inference: the abstraction assumes each dependency can be given a stable mathematical response type; opaque foreign calls remain outside the proof unless separately modeled.

## technique 2: free monad for repeated calls

Inference: What it is. A lens only models one call. The free monad models zero, one, or many calls with later calls depending on earlier responses. Its constructors are `return : C → Free p C` and `bind : (x : p .fst) → (p .snd x → Free p C) → Free p C`. “An element of Free p C is a computation that either returns a value of type C, or makes a call to p = (A, B) with some input x, receives a response, and continues depending on the result—equivalently, such programs correspond to well-founded trees with leaves in C (Libkind and Spivak 2025; Niu and Spivak 2024) and internal nodes labeled by positions a : A, with branches indexed by directions b : B(a).” (§2.2, p.2)

Inference: When to use it. Use `Free q` as the implementation type for a module `p` that may invoke dependency `q` repeatedly or conditionally. The paper defines an implementation as `p ⇒ Free q` (Definition 2.1, p.3).

Inference: How to do it. (1) Define the module interface p. (2) Define each dependency interface q. (3) Return `return` for a final value. (4) For each dependency call, construct `bind` with a position and continuation indexed by its response. (5) Use the paper's `call[ b ← a ] e` and `do[ b ← m ] e` notation to make call and sequencing explicit (§2.2, p.3). The fold example recursively folds the tail, calls `step`, and returns the new result (§3.1, pp.3–4).

Inference: Verus form. use a ghost/spec datatype for a computation tree, with variants for `Return` and `Call`; define a recursive `spec fn` interpreter or relation over that tree. Executable Rust can remain direct recursion, while a proof function establishes that each branch corresponds to the tree. Inference: Verus proofs do not execute at runtime, so the computation tree is a specification artifact unless an executable interpreter is separately implemented.

Inference: Evidence and limits. The paper supplies Agda definitions of fold, append, concat, and their composition (§3.1–3.2, pp.3–4; Appendix D, pp.21–23). Inference: free-monad trees can grow with interaction depth, and a proof still needs termination/well-founded recursion or a bounded model for recursive programs.

## technique 3: wiring-diagram composition

Inference: What it is. Wiring diagrams describe boxes, each box's dependencies, and external inputs. The key theorem states: “Given a wiring diagram with output interface p and external inputs inputs, together with an implementation of each box b as a morphism Cod(b) ⇒ Free(sum (Arity b) (Dom b)), there is an induced implementation p ⇒ Free(sum Inputs inputs).” (§3.3, p.5)

Inference: When to use it. Use this when nested modules have explicit dependencies and each module supplies its own implementation and verification.

Inference: How to do it. (1) Declare `Boxes`, each `Arity`, each dependency interface `Dom`, each output `Cod`, and external `Inputs`. (2) Build a `Wiring` tree with `wire i` for an external dependency or `box b f` for a box whose dependency diagrams are `f`. (3) Supply an implementation for every box. (4) Recursively call `compose`: a wire forwards the external call; a box composes its implementation with recursively composed subdiagrams (§3.3, p.5). The proof is induction on the wiring diagram (§3.3, p.5).

Inference: Verus form. represent the architecture as ghost records containing module identifiers, dependency edges, and contracts. For each module, write a proof function that consumes the dependency postconditions and establishes the module postcondition; compose these functions recursively over the graph. Inference: this is a proposed encoding, not a Verus implementation or result established by the paper.

Inference: Evidence and limits. The append and concat diagrams are concrete examples (Figure 1, p.6), and Theorem 3.1 gives the compositional guarantee. Inference: a wiring proof assumes every edge is represented and that the graph's recursive structure is well-founded; dynamic dispatch or reflection would require an additional model.

## technique 4: executable semantics with Mealy machines

Inference: What it is. A Mealy machine is a stateful automaton with an input-dependent output and next state. “A Mealy machine with interface (A, B) is a stateful automaton that, given an input a : A, produces an output of type B(a) together with an updated machine state.” (§4.1, p.6) The paper defines `prog→mealy`, which runs a free-monad program against a machine, and `mealy⊕`, which combines machines for summed interfaces.

Inference: How to do it. (1) Define `Mealy p` with `app : (x : p .fst) → p .snd x × Mealy p`. (2) Implement a dependency machine. (3) Run a module by threading the machine through every free-monad call with `prog→mealy`. (4) Combine independent machines with `_mealy⊕_`. The state example encodes `get` and `put`, and Fibonacci composes `fib-update` with `state-mealy (0,1)` (§4.2–4.3, p.7).

Inference: Verus form. model the machine state as a Rust struct and give each operation a `requires`/`ensures` contract. State transitions can be proved with a `proof fn`; loop invariants express the same threaded-state fact. Inference: a Verus executable function can implement the transition directly, while the Mealy record is a ghost mathematical model.

## technique 5: dependent polynomials and verified free monads

Inference: What it is. A dependent polynomial adds a precondition family `C : A → Set` and postcondition family `D : (a : A) → C(a) → B(a) → Set`. “If p = (A, B) represents the interface of a function f : (a : A) → B(a), then a dependent polynomial (C, D) over p specifies a contract: for each input a satisfying precondition C(a), the output f (a) should satisfy postcondition D(a, c, f (a)), where c is the evidence that the precondition holds.” (§5.1, p.8) `FreeDep` carries evidence through `returnD` and `bindD`; a verified implementation is an implementation plus a dependent morphism witnessing its contract (Definition 5.2, pp.8–9).

Inference: How to do it. (1) Write input preconditions C. (2) Write output postconditions D, allowing the proof to depend on precondition evidence. (3) For each free-monad call, supply evidence of the dependency's precondition with `bindD`, then continue assuming its response satisfies the dependency's postcondition. (4) Produce final evidence F with `returnD`. (5) Compose verifications with `compDep`; the paper's Theorem 5.3 says verifications compose along wiring diagrams (§5.2, p.9). The append example instantiates a relational specification and verifies the recursive fold with `foldInd` and `compDep` (§5.2, p.9).

Inference: Verus form. write `requires` and `ensures` on executable Rust functions; use `proof fn` lemmas to propagate dependency postconditions; use `spec fn` predicates for relational list properties. These are proposed correspondences; the paper supplies no Verus code.

Inference: Evidence and limits. The Agda append verification and Theorem 5.3 are the paper's evidence. Inference: the composite verification is conditional on the supplied dependency specifications. An unsatisfied dependency specification prevents applying that guarantee to the actual dependency.

## technique 6: dependent Mealy machines and state invariants

Inference: What it is. `DepMealy` pairs each machine output with proof that the dependent postcondition holds and recursively continues with the next machine. Proposition 6.2 lifts `prog→mealy` to `prog→mealyD`; Proposition 6.3 lifts sums. For state invariants, the read guarantee assumes that the initial state and every written state satisfy T (§6.2, pp.10–11).

Inference: How to do it. (1) Define `Invariant S T` with `get` requiring no input evidence, `put s` requiring `T s`, and a postcondition `T s` on reads. (2) Define `invariant s t` coinductively: a get returns evidence t and recurses; a put receives evidence for the new state and recurses with it (§6.2, pp.10–11). (3) For Fibonacci, define `IsFib` and an invariant relating the two state cells; compose the update proof with the state proof via `prog→mealyD` (§6.3, p.11).

Inference: Verus form. express T as a `spec fn` over the state, put the invariant on each loop that advances state, and prove preservation after every write. Inference: a concurrent Verus version would need an explicit model of effects and resource use. Appendix A supplies parallel composition operations and sketches relational verification, but gives no Verus implementation.

Inference: The Fibonacci example has a weaker public contract than exact stream correctness. Appendix C.2 defines `FibDep .snd _ _ y = Σ Nat (λ x → IsFib x y)` (p.19), so each returned value is a Fibonacci number at some index. Its state invariant relates adjacent Fibonacci values. Inference: this output contract does not record an invocation count or require the nth output to equal the nth Fibonacci number; the initial state and update implementation determine the sequence described in §4.3.

## technique 7: categorical structure and parallel composition

The categorical account uses a category `Int` of interfaces and implementations, a category `Spec` of specifications and verified implementations, and a monoidal forgetful functor `π : Spec → Int` (§7, pp.11–12). Here monoidal means that the categories have a compatible operation for combining objects and morphisms, with a unit. Mealy machines form a lax monoidal presheaf, meaning that implementations act contravariantly on machines and that separate machines can be combined compatibly. The verified machines have the corresponding structure over specifications, with a compatible projection to machines. Definition 7.1 abstracts this structure into a compositional verification framework. The author writes: “The value of the abstraction is that it identifies precisely what structure is needed for compositional verification, and opens the door to other instantiations.” (§7, p.12)

Appendix A replaces coproduct composition with the parallel sum `p∥q`, whose inputs choose the left interface, the right interface, or both. For a simultaneous call, the response is a pair. The appendix defines parallel operations on programs, verifications, Mealy machines, and dependent Mealy machines (pp.14–17). To apply these operations, define the interfaces and their contracts, combine the programs with `_||Prog_`, combine their proofs with `_||DepProg_`, and combine the machines with `_mealy||_` and `_depMealy||_`.

The stated restriction is: “Concretely, this means that in a parallel wiring diagram, a wire cannot be used in two places simultaneously (though it can remain unused, i.e. it can be left dangling).” (Appendix A.1, p.17) The paper uses this to argue race-freedom for effects represented by those interfaces. Appendix A.2 also allows a dependent polynomial over the simultaneous-call interface to relate the two inputs and outputs, rather than merely pairing independent contracts. Inference: that describes where relational contracts belong; it does not supply completed noninterference or monotonicity case studies.

## what is proved, measured, and trusted

The paper states and explains type-level composition theorems (Theorems 3.1 and 5.3), operational and dependent operational composition (Propositions 6.2 and 6.3), and supplies Agda verification definitions for append, state invariants, and the Fibonacci contract described above. It reports no runtime, solver, dataset, or denominator-based empirical measurements. Inference: relying on the reported formalization requires trusting Agda's type checker and relating the modeled interfaces and contracts to the intended program. No Agda type-checking run or compiled runtime was checked in this study, and the paper establishes no result about Verus, Rust, or Z3.

Inference: the main threat to a product that generates verified Rust is contract mismatch: generated proofs can compose while a wrong postcondition still describes the wrong behavior. The architecture is useful for requiring explicit dependency contracts and proof-carrying composition, but it does not by itself solve specification mining, unsafe foreign calls, or solver robustness.

## techniques for the catalog

- Inference: polynomial interface: encode input positions and dependent response directions as a composable module boundary
- Inference: free-monad implementation: represent repeated, conditional dependency calls as a typed computation tree
- Inference: wiring-diagram theorem: recursively compose box implementations and their contracts along an explicit dependency graph
- Inference: Mealy operational semantics: run interaction programs by threading stateful interface machines
- Inference: dependent free-monad verification: carry precondition evidence and postcondition proofs through every call and composition
- Inference: dependent Mealy invariant: prove stateful executions preserve relational and state predicates at each transition
- Inference: parallel composition: combine interfaces, programs, proofs, and machines while preventing simultaneous reuse of an effect wire
- Inference: relational specification: relate inputs and outputs across the simultaneous-call part of a parallel interface
