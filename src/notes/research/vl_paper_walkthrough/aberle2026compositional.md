# Compositional Program Verification with Polynomial Functors in Dependent Type Theory
(authored by agents unless marked 🧑)
Tag: `aberle2026compositional`, [paper](http://arxiv.org/abs/2604.01303v1)

## scope and contribution

Inference: The paper presents a framework in dependent type theory in which polynomial functors are program interfaces, free-monad morphisms are implementations, and dependent polynomials are pre/post specifications. “We present a framework for compositional program verification based on polynomial functors in dependent type theory.” (§1, p.1) The complete development is formalized in Agda, including implementations, verification, operational semantics, and examples. “The entire development has been formalized in Agda (Norell 2009).” (§1, p.1)

Inference: The practical lesson for VeruLaw is an architecture for making local contracts composable: give each module an explicit interface, make calls go through a typed computation tree, and carry proof evidence through the same composition operation as execution. The paper does not measure Rust, Verus, solver time, or generated-agent code, so any transfer to Verus is an inference.

## technique 1: interface as a polynomial functor

Inference: What it is. A polynomial is represented by positions A and directions B(a): `Poly = Σ Set (λ A → A → Set)`. The pair describes a dependent function interface `(a : A) → B(a)`. A morphism from `(A,B)` to `(C,D)` contains a forward position map and a backward direction map. “A morphism p ⇒ q between two polynomials, where p = (A, B) and q = (C, D), thus consists of a forward map f0 : A → C on positions and a backward map f 1 : (a : A) → D(f0 (a)) → B(a) on directions.” (§2.1, p.2)

Inference: When to use it. Use one polynomial for every callable interface whose result type depends on its input, especially when a module must call another module through an abstract boundary. The lens records how a caller chooses a callee position and converts the callee response into the caller's result.

Inference: How to do it. (1) Choose A as operation/input cases. (2) Define B(a) as the response type for each case. (3) Package `(A,B)` as `Poly`. (4) Implement a one-call dependency with the two maps described above. (5) Use sums when a module has several labeled dependencies; the paper's `sum U p` is the coproduct and gives one implementation per label (§2.3, pp.3–4).

Inference: Verus form. Inference: represent the interface with a Rust enum for positions and a spec function or associated spec type mapping each position to its response; keep the executable API ordinary Rust and expose a `spec fn` describing the response relation. A Verus contract can use `requires` for admissible positions and `ensures` for the returned relation. Inference: this loses Agda's universe-level dependent family ergonomics, so concrete enums and predicates are likely needed.

Inference: Evidence and limits. The paper's evidence is a type-checking formalization and examples, not an empirical benchmark. Inference: the abstraction assumes each dependency can be given a stable mathematical response type; opaque foreign calls remain outside the proof unless separately modeled.

## technique 2: free monad for repeated calls

Inference: What it is. A lens only models one call. The free monad models zero, one, or many calls with later calls depending on earlier responses. Its constructors are `return : C → Free p C` and `bind : (x : p .fst) → (p .snd x → Free p C) → Free p C`. “An element of Free p C is a computation that either returns a value of type C, or makes a call to p = (A, B) with some input x, receives a response, and continues depending on the result.” (§2.2, p.2)

Inference: When to use it. Use `Free q` as the implementation type for a module `p` that may invoke dependency `q` repeatedly or conditionally. The paper defines an implementation as `p ⇒ Free q` (Definition 2.1, p.3).

Inference: How to do it. (1) Define the module interface p. (2) Define each dependency interface q. (3) Return `return` for a final value. (4) For each dependency call, construct `bind` with a position and continuation indexed by its response. (5) Use the paper's `call[ b ← a ] e` and `do[ b ← m ] e` notation to make call and sequencing explicit (§2.2, p.3). The fold example recursively folds the tail, calls `step`, and returns the new result (§3.1, pp.3–4).

Inference: Verus form. Inference: use a ghost/spec datatype for a computation tree, with variants for `Return` and `Call`; define a recursive `spec fn` interpreter or relation over that tree. Executable Rust can remain direct recursion, while a proof function establishes that each branch corresponds to the tree. Inference: Verus proofs do not execute at runtime, so the computation tree is a specification artifact unless an executable interpreter is separately implemented.

Inference: Evidence and limits. The fold, append, and concat modules type-check in Agda and compose. Inference: free-monad trees can grow with interaction depth, and a proof still needs termination/well-founded recursion or a bounded model for recursive programs.

## technique 3: wiring-diagram composition

Inference: What it is. Wiring diagrams describe boxes, each box's dependencies, and external inputs. The key theorem states: “Given a wiring diagram with output interface p and external inputs inputs, together with an implementation of each box b as a morphism Cod(b) ⇒ Free(sum (Arity b) (Dom b)), there is an induced implementation p ⇒ Free(sum Inputs inputs).” (§3.3, p.5)

Inference: When to use it. Use this when a system graph has nested modules and you want one proof obligation at the boundary rather than manually rewriting every call chain.

Inference: How to do it. (1) Declare `Boxes`, each `Arity`, each dependency interface `Dom`, each output `Cod`, and external `Inputs`. (2) Build a `Wiring` tree with `wire i` for an external dependency or `box b f` for a box whose dependency diagrams are `f`. (3) Supply an implementation for every box. (4) Recursively call `compose`: a wire forwards the external call; a box composes its implementation with recursively composed subdiagrams (§3.3, pp.5–6). The proof is induction on the wiring diagram (§3.3, p.5).

Inference: Verus form. Inference: represent the architecture as ghost records containing module identifiers, dependency edges, and contracts. For each module, write a proof function that consumes the dependency postconditions and establishes the module postcondition; compose these functions recursively over the graph. Inference: Verus has no Agda-style universe-polymorphic inductive wiring type in the cited material, so the graph and recursion would be encoded with ordinary datatypes and explicit lemmas.

Inference: Evidence and limits. The append and concat diagrams are concrete examples (Figure 1, p.6), and Theorem 3.1 gives the compositional guarantee. Inference: a wiring proof assumes every edge is represented and that the graph's recursive structure is well-founded; dynamic dispatch or reflection would require an additional model.

## technique 4: executable semantics with Mealy machines

Inference: What it is. A Mealy machine is a stateful automaton with an input-dependent output and next state. “A Mealy machine with interface (A, B) is a stateful automaton that, given an input a : A, produces an output of type B(a) together with an updated machine state.” (§4.1, p.6) The paper defines `prog→mealy`, which runs a free-monad program against a machine, and `mealy⊕`, which combines machines for summed interfaces.

Inference: How to do it. (1) Define `Mealy p` with `app : (x : p .fst) → p .snd x × Mealy p`. (2) Implement a dependency machine. (3) Run a module by threading the machine through every free-monad call with `prog→mealy`. (4) Combine independent machines with `_mealy⊕_`. The state example encodes `get` and `put`, and Fibonacci composes `fib-update` with `state-mealy (0,1)` (§4.2–4.3, pp.7–8).

Inference: Verus form. Inference: model the machine state as a Rust struct and give each operation a `requires`/`ensures` contract. State transitions can be proved with a `proof fn`; loop invariants express the same threaded-state fact. Inference: a Verus executable function can implement the transition directly, while the Mealy record is a ghost mathematical model.

## technique 5: dependent polynomials and verified free monads

Inference: What it is. A dependent polynomial adds a precondition family `C : A → Set` and postcondition family `D : (a : A) → C(a) → B(a) → Set`. “If p = (A, B) represents the interface of a function f : (a : A) → B(a), then a dependent polynomial (C, D) over p specifies a contract.” (§5.1, p.8) `FreeDep` carries evidence through `returnD` and `bindD`; a verified implementation is an implementation plus a dependent morphism witnessing its contract (Definition 5.2, p.9).

Inference: How to do it. (1) Write input preconditions C. (2) Write output postconditions D, allowing the proof to depend on precondition evidence. (3) For each free-monad call, assume the dependency's postcondition. (4) Produce final evidence F with `returnD`. (5) Compose verifications with `compDep`; the paper's Theorem 5.3 says verifications compose along wiring diagrams (§5.2, p.9). The append example instantiates a relational specification and verifies the recursive fold with `foldInd` and `compDep` (§5.2, p.9).

Inference: Verus form. Inference: write `requires` and `ensures` on executable Rust functions; use `proof fn` lemmas to propagate dependency postconditions; use `spec fn` predicates for relational list properties. Inference: do not write `ensures` on a `spec fn`, call a `proof fn` from runtime code, or use `invariant(...)` as a function; loop invariants are attached to loops in Verus syntax.

Inference: Evidence and limits. The Agda append verification and Theorem 5.3 are the paper's evidence. Inference: this is assume-guarantee reasoning, so an invalid dependency contract can make the composed proof vacuous; the paper does not verify external implementations beyond their supplied contracts.

## technique 6: dependent Mealy machines and state invariants

Inference: What it is. `DepMealy` pairs each machine output with proof that the dependent postcondition holds and recursively continues with the next machine. Proposition 6.2 lifts `prog→mealy` to `prog→mealyD`; Proposition 6.3 lifts sums. For state invariants, the paper specifies that an initial state satisfies T, every written state satisfies T, and every read state satisfies T (§6.2, p.11).

Inference: How to do it. (1) Define `Invariant S T` with `get` requiring no input evidence, `put s` requiring `T s`, and a postcondition `T s` on reads. (2) Define `invariant s t` coinductively: a get returns evidence t and recurses; a put receives evidence for the new state and recurses with it (§6.2, p.11). (3) For Fibonacci, define `IsFib` and an invariant relating the two state cells; compose the update proof with the state proof via `prog→mealyD` (§6.3, p.11).

Inference: Verus form. Inference: express T as a `spec fn` over the state, put the invariant on each loop that advances state, and prove preservation after every write. Inference: a concurrent Verus version would need a state-machine or synchronization model; the paper only sketches concurrency in Appendix A.

## what is proved, measured, and trusted

Inference: The paper proves type-level composition theorems (Theorems 3.1 and 5.3), operational and dependent operational composition (Propositions 6.2 and 6.3), and verifies append, state invariants, and Fibonacci in Agda. It reports no runtime, solver, dataset, or denominator-based empirical measurements. Inference: trusted foundations include Agda's kernel and the correctness of the modeled interfaces, contracts, and erasure/runtime assumptions; the paper does not establish correctness of Verus, Rust, Z3, or external code.

Inference: the main threat to a product that generates verified Rust is contract mismatch: generated proofs can compose while a wrong postcondition still describes the wrong behavior. The architecture is useful for requiring explicit dependency contracts and proof-carrying composition, but it does not by itself solve specification mining, unsafe foreign calls, or solver robustness.

## what VL should not redo

Inference: The paper already supplies a generic typed account of interface sums, free-monad interaction, wiring-diagram composition, dependent contracts, state invariants, and an Agda formalization. Inference: VL should reuse these as design patterns and focus experiments on Rust/Verus encodings, generated contract quality, and maintenance under code changes rather than re-proving the abstract category theory.

## techniques for the catalog

- Inference: polynomial interface: encode input positions and dependent response directions as a composable module boundary
- Inference: free-monad implementation: represent repeated, conditional dependency calls as a typed computation tree
- Inference: wiring-diagram theorem: recursively compose box implementations and their contracts along an explicit dependency graph
- Inference: Mealy operational semantics: run interaction programs by threading stateful interface machines
- Inference: dependent free-monad verification: carry precondition evidence and postcondition proofs through every call and composition
- Inference: dependent Mealy invariant: prove stateful executions preserve relational and state predicates at each transition
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
