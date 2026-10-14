# Overcoming Restraint: Composing Verification of Foreign Functions with Cogent
(authored by agents unless marked 🧑)
Tag: `cheung2021overcoming`, [paper](http://arxiv.org/abs/2102.09920v4)

## scope and result
Cheung, O’Connor, and Rizkallah verify C implementations called through Cogent’s foreign-function interface (FFI). Cogent is a restricted functional language whose uniqueness types support memory safety and whose compiler emits C plus Isabelle/HOL refinement artifacts. The paper's problem is that imported C does not automatically satisfy Cogent's invariants. Its abstract says: “We demonstrate how they smoothly compose with existing Cogent theorems, and result in a correctness theorem of the overall Cogent-C system.” (abstract, p. 1)

The case study verifies an array library, higher-order iterators, a generic loop, and binary search, then composes those proofs with Cogent code used in the BilbyFs file system. The prior BilbyFs verification had assumed C components were correct; this work discharges the FFI obligations for the covered operations.

Inference: this is directly relevant to Verus whenever Rust calls C, assembly, a platform API, or an `unsafe` wrapper. The transferable principle is to require a checked refinement contract at every foreign boundary. The paper is Isabelle/HOL/Cogent work, so the Verus mapping below is an inference.

## technique 1: use a two-semantics, uniqueness-preserving source model
Cogent has a pure value semantics and an imperative update semantics with a mutable store. Uniqueness types ensure that each mutable heap object has one active pointer; read-only `!` values may be shared. The paper explains that “These two semantic interpretations correspond (Section 2.5), meaning that any correctness proofs about the value semantics also apply to the update semantics.” (Sec. 2, p. 2) Verification obligations are type preservation, frame conditions, and refinement.

How to apply it: define the abstract function in pure value terms; define the update relation over stores and pointers; type the value and update forms; prove that well-typed execution preserves type and that the update result corresponds to the pure result. Track readable and writable pointer sets in the frame relation so untouched memory is unchanged and writable regions do not leak.

Verus form. Inference: use a mathematical model in `spec fn`s and a Rust representation whose `requires` describe ownership and valid ranges. Use `ensures` to relate the post-state to the model and to state frame properties for locations not in the modified footprint. Rust borrowing supplies much of Cogent's uniqueness discipline; raw pointers or FFI require explicit ghost ownership predicates and proof lemmas. Do not encode a foreign call as `#[verifier::external_body]` without a contract if its behavior is part of the claim.

## technique 2: build a refinement tower across C and abstract semantics
The compiler generates shallow, polymorphic deep, monomorphic deep, and C embeddings. Each adjacent pair is connected by a forward-simulation/refinement theorem. The paper states: “The composition of all these refinements means that any property preserved by refinement, such as functional correctness, proved about all executions of the most abstract embedding — the Shallow HOL embedding — will also apply to the most concrete embedding, i.e. the C code.” (Sec. 2.5, p. 4)

Steps: define a relation between values at each layer; prove C execution refines update semantics; prove update semantics corresponds to value semantics and preserves frames; prove monomorphisation refinement; prove shallow-to-polymorphic refinement; compose the relations into one theorem for each imported function. The C evaluation relation explicitly excludes undefined behavior (`¬failed`).

Verus form. Inference: use a `spec fn` relation between an FFI-facing Rust value and a pure model, then prove a wrapper's executable body `ensures` that relation. For a C call, state the C contract as a trusted specification only when the C implementation is outside Verus, and separately verify it in a tool that can establish the same relation. A `proof fn` can compose the wrapper, model, and caller obligations; there is no direct Verus analogue of Isabelle's generated deep embeddings or AutoCorres.

Trust boundary: compiler-generated refinement proofs, AutoCorres/C parser semantics, Isabelle/HOL, and the supplied C abstractions remain trusted or assumption-bearing. The authors explicitly require user proofs for abstract functions and types.

## technique 3: specify and verify a concrete array implementation
The authors specify `length`, `get`, `put`, `fold`, and `mapAccum` as Isabelle list functions, then implement them in C with a length and pointer. `get` returns a default out of bounds; `put` leaves the array unchanged out of bounds; iterators cap the end index at the array length. They define update-semantics abstractions over `UWA τ len p` and value-semantics abstractions over `VWA τ xs`, plus a relation connecting pointer-indexed memory to list indices.

For `put`, prove three layers. First, the AutoCorres C embedding refines the update abstraction by case-splitting on the index. Second, update and value abstractions correspond; in bounds, show the pointer at `p + size(τ)×i` is the list element at `i`, and show the frame relation. Third, the shallow list function refines the value abstraction. The paper says: “For first order functions length, get and put, the proofs tend to follow easily from the definitions of their abstractions, implementation, refinement relation and value typing relation.” (Sec. 3.2.4, p. 9)

Verus form. Inference: define an abstract `Seq<T>` model and a representation predicate tying a Rust slice or owned buffer to that sequence. Give `get` an `ensures` selecting the element or default by a bounds condition; give `put` an `ensures` that updates exactly one position and preserves all others. Prove pointer arithmetic or slice indexing safety with explicit bounds and no-overflow lemmas. For `fold`/`mapAccum`, use `invariant` clauses over the processed prefix and a `decreases` measure. The paper's C heap relation becomes a Verus representation invariant and frame proof.

## technique 4: discharge higher-order and loop FFI obligations
`fold` and `mapAccum` call a function argument. The authors prove their theorems under assumptions that every argument function preserves type and refinement; Cogent discharges this automatically for Cogent functions and requires manual proofs for C functions. They verify `repeat`, a bounded loop with a stopping predicate and mutable accumulator, using a fuel argument. The implementation's C loop has a maximum iteration count and can exit early.

Steps: define a recursive pure shallow function; define the C loop and its update abstraction; relate each callback's C and Cogent behaviors; prove the loop invariant and termination by the fuel bound; instantiate the generic theorem at each caller. The paper reports that “the majority of the proof effort was concentrated on proving that loop invariants are maintained, and not on any aspect of the Cogent framework.” (Sec. 3.2.4, p. 10)

Verus form. Inference: make callback contracts explicit as `requires`/`ensures` on a trait-like verified function boundary, and quantify the loop invariant over the accumulator and processed index. Use `invariant` and `decreases` in the executable loop. Higher-order function pointers crossing FFI need a finite dispatch model or separately verified wrappers; Verus cannot assume arbitrary callbacks satisfy a contract without a proof obligation.

## technique 5: compose library proofs into a system theorem
The authors instantiate the verified array and loop abstractions in Cogent's `sum` and binary-search examples. For binary search, the pure theorem states that a sorted array returns an index containing the value or an out-of-bounds index when absent. The overall refinement theorem then transfers this result to C. For BilbyFs, they remove the axiomatisation for five core array operations, while functions depending on platform-specific `malloc` remain unverified.

The paper distinguishes what was actually closed from what remains assumed: “The array operations that remain unveriﬁed are functions like create, set, copy, cmp, that depend on platform-speciﬁc functions such as malloc.” (Sec. 5.1, p. 13) This is a concrete warning against treating a verified wrapper as a verified allocator or platform.

Verus form. Inference: publish a Rust module contract for each FFI operation, prove callers against the model contract, and require an independent proof or test-backed certificate for each implementation. Keep allocator and platform contracts explicit in the trusted-base inventory. A system-level `ensures` should be derived by composing function contracts, not by marking the whole module external.

## what is proved, measured, and trusted
The paper proves refinement, type preservation, frame conditions, array operations, generic loops, and a binary-search correctness theorem; it demonstrates composition with Cogent code and removes five BilbyFs array axioms. It reports no corpus denominator or runtime/proof-time aggregate; the evidence is theorem statements and case studies. It notes that earlier AutoCorres array proofs were “roughly 250 lines” and about half the size of theirs, but that comparison is about a different scope and is not a percentage of all code.

Trusted or assumed pieces include Isabelle/HOL and its libraries, Cogent's compiler certificate, AutoCorres/C parsing, manually supplied C abstractions, and the unverified platform-dependent functions. The paper also notes a staged order requirement for higher-order abstract functions and an implicit abstract-function correctness assumption in the shallow phase.

Inference: threat to VL is high at unsafe boundaries and low for ordinary safe Rust. The paper shows that a high-level proof can remain valid only when the foreign implementation satisfies a precise representation, frame, and functional contract. VL should reuse the boundary-contract and refinement-tower pattern; it should not claim that a verified Rust caller proves an unverified C callee.

## techniques for the catalog
- dual semantics: relate pure values to mutable stores while preserving uniqueness and frames
- refinement tower: connect shallow specifications to C through compositional forward simulations
- array abstraction proof: relate pointer-indexed C arrays to list models with bounds and frame cases
- verified higher-order loop: prove callback contracts, loop invariants, and fuel-based termination
- FFI composition: instantiate library refinements in system code and keep platform assumptions explicit
Checked 2026-10-13: audit record cheung2021overcoming; paper-study comparison complete; gate executed; experiments not rerun
