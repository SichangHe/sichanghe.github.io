# Formal Verification of Rust Programs by Functional Translation
(authored by agents unless marked 🧑)
Tag: `ho2024formal`, [paper](https://theses.hal.science/tel-05004605v1)

## thesis result

Son Ho's thesis presents Aeneas, a Rust verification toolchain that translates a borrow-checked Rust subset into a pure functional program. The abstract states: “We leverage Rust’s rich region-based type system to eliminate memory reasoning for a large class of Rust programs which includes loops and mutable borrows, by translating them to a pure lambda-calculus.” (Abstract, p. ii.) The generated model can be checked in F*, Coq, HOL4, or Lean. The thesis also introduces LLBC, a borrow-centric operational semantics, and LLBC#, a symbolic semantics whose successful execution is a formally justified borrow check.

Aeneas is aimed at functional correctness after ownership has removed aliasing possibilities. Its translation is a semantic transformation, not a contract-only encoding. The thesis says: “Our functional translation then simply consumes the execution traces of the symbolic semantics to construct a pure, executable program that is functionally equivalent to the source Rust.” (Chapter 7, p. 141.)

Inference: VL can use this architecture when a Rust function's ownership discipline makes memory details irrelevant to the target property. The output is a pure proof model, while the original Rust remains the deployed implementation. The borrow-checking soundness theorem does not prove the functional translation correct. Section 13.5 (p. 235) explicitly says: “The translation is currently trusted, and its correctness left as future work.”

## earlier verification techniques in the thesis

The dissertation also teaches three earlier techniques that motivate Aeneas and are part of its formal-verification contribution.

### hybrid embedding for verified protocol compilation

For a family of related protocols, first write one formal interpreter specification, then write a low-level implementation generic over protocol patterns, prove that implementation against the interpreter once, and specialize it at compile time. The thesis calls this “hybrid embedding” and states: “With hybrid embeddings, we verify the low-level code once then generate for free any number of specialized implementations for any Noise patterns: doing so, we minimize the verification eﬀort while still guaranteeing low-level performance.” (Section 4.3, p. 49.) The implementation uses dependent parameters, `inline_for_extraction`, and compile-time partial evaluation so matches on a deeply embedded Noise pattern disappear before C extraction. The result was used to compile all 59 Noise patterns, with the low-level implementation linked to functional, memory, and symbolic security proofs (Sections 4.3–4.6, pp. 49–81).

Inference: A Verus library can use a ghost algorithm index, generic contracts, and monomorphized wrappers to prove one implementation family, but Verus's Rust compiler and macro pipeline are different. The proof must show that specialization preserves the contract; compile-time erasure alone is not evidence.

### zero-cost functors and staged rewriting

The Zero-Cost Functors project structures verified low-level code like ML functors, then rewrites and partially evaluates the abstraction away. The thesis says: “The DSL is interpreted via meta-programming, specifically, via elaborator reflection; in essence, we script the compiler, and add an early compilation stage that takes our functor DSL and evaluates it away.” (Chapter 5, p. 85.) The steps are to parameterize types, specifications, lemmas, and implementations over an algorithm index; mark helper layers for elimination; specialize concrete choices; and extract the residual low-level code. The reported outcome is that these techniques allowed HACL? to pass 100,000 lines of verified F* source, and six of about a dozen streaming instantiations entered Python's standard library (Chapter 5, pp. 85–86).

Inference: In Verus, use generic Rust modules and proof lemmas over an explicit type or algorithm parameter, then rely on monomorphization and proof erasure. The thesis's elaborator reflection and `Eliminate` attributes are F* mechanisms, so an agent should not claim they exist in Verus.

### module-based induction for maintainable SMT proofs

The Dafny-in-Dafny project factors recurring inductive proof structure into an abstract module. Define a generic induction principle over language syntax, instantiate abstract predicates for a property such as `IsPure`, and decompose the proof into small lemmas for each syntax constructor. The thesis reports: “By decomposing inductive proof obligations into small and precise lemmas, we also make it easy to pinpoint the reason behind proof failures.” (Section 6.5, p. 136.) Updating the mini-Dafny language then requires changing the principle's rules and adding definitions for new declarations rather than rewriting every proof (Sections 6.3–6.5, pp. 131–136).

Inference: In Verus, encode the reusable induction principle as proof lemmas over an enum or AST and call the constructor-specific lemmas from a top-level proof. Verus's solver still needs explicit triggers and invariants; module induction does not make arbitrary induction automatic.

## technique 1: erase uniquely owned references into pure values

Use this for functions whose mutable references are unique and whose behavior can be represented by state passing. The thesis's `incr` example is:

```rust
fn incr(x: &mut i32) { *x = *x + 1; }
fn test_incr() { let mut y = 0i32; incr(&mut y); assert!(y == 1); }
```

The procedure is:

1. Use the ownership type to establish that no alias can modify `x` or `y` during the borrow.
2. Replace the reference argument with its value.
3. Translate arithmetic with Rust's error-on-overflow semantics into an error-monad operation.
4. Translate the caller to a monadic bind and assertion.
5. Prove the generated assertion, including the no-overflow obligation.

Aeneas emits `def incr (x : I32): Result I32 := x + 1#i32` and a `test_incr` that binds the result and checks `y = 1#i32` (Section 8.1, pp. 143–145). The thesis explains the semantic reason: “x and y are uniquely owned, meaning that there are no stray aliases through which x or y may be modified; in other words, to understand what happens to y, it suﬃces to track what happens to &mut y, and therefore to x.” (Section 8.1, p. 144.)

Inference: In Verus, use a Rust function with `requires` and `ensures` and a proof lemma over the value abstraction. The translation to `Result` is a model design, not Verus syntax; Verus's executable function can retain the reference while its `spec fn` describes the value relation. The no-overflow condition must be explicit in the contract or arithmetic proof.

## technique 2: forward and backward functions for returned borrows

Use a backward function when a Rust function returns a mutable borrow. A plain functional conditional loses which input receives updates. The thesis's `choose` takes two `&mut T` arguments and returns one. At a call, Rust transfers ownership of both inputs into a region and returns `z`; when that region ends, ownership of both inputs must be restored.

Aeneas generates a forward function returning the selected value and a continuation. The following adaptation corrects the printed example’s undefined `ret` to its bound parameter `z`:

```text
def choose (b : Bool) (x : T) (y : T) : Result (T × (T → T × T)) :=
  if b then ok (x, fun z => (z, y)) else ok (y, fun z => (x, z))
```

Apply it step by step:

1. Evaluate the forward function at the call and receive `(z, choose_back)`.
2. Perform updates through `z` in the pure model.
3. When the region terminates, call `choose_back` with the final `z`.
4. Rebind all original inputs and prove their postconditions.

The paper states: “The forward function is used to model the function call at line 8, while the backward continuation is used to propagate changes back into x and y when lifetime ↵ terminates.” (Section 8.2, p. 146.) The signature determines the region summary and backward-function interface; the body determines the continuation (Section 13.2, pp. 226–229): for the true branch, the returned value flows to `x` and `y` is unchanged; the false branch is symmetric. This gives modular translation across separately compiled functions.

Inference: In Verus, represent the selected output and restored state with a ghost relation or a lemma about the function's postcondition. A continuation value is one possible specification encoding; it is not a standard Verus borrow primitive. The crucial invariant is that every output borrow has a corresponding update path to the inputs whose ownership was transferred.

## technique 3: recursive data and backward reconstruction

For a mutable reference into a recursive list, translate the borrow as a value plus a reconstruction function. The `list_nth_mut` example returns the n-th element and a function `T -> List T`. In the `Cons` case, the backward function recursively applies the tail continuation and reconstructs the unchanged head; in the base case it replaces the selected head.

The generated model has the shape `Result (T × (T -> List T))`, with the recursive branch `ok (v, fun v' => Cons x (list_nth_mut_back v'))` (Section 8.4, pp. 148–150). The caller gets the element, increments it, applies the backward function, and then sums the rebuilt list. The thesis's code uses `massert` to check the sum.

The same scheme handles loops. A loop version of `list_nth_mut` is translated to an auxiliary recursive `list_nth_mut_loop`; the public function calls it. The thesis says: “The model of the loop itself is actually exactly the same as the translation of the recursive version of list_nth_mut, which is perhaps not surprising given the fact that this function is tail-call recursive.” (Section 8.5, p. 151.)

Inference: For a Verus adaptation, supply a suitable loop invariant and, when proving termination, a decreasing measure; while the functional model can use an inductive sequence/list and a lemma relating the loop state to the list reconstruction. The paper's generated continuation is useful as a conceptual target, but it does not remove the need to prove the loop invariant in Verus.

## technique 4: model traits as explicit dictionaries

Aeneas translates a Rust trait into a structure of method functions. `Counter` with `incr(&mut self) -> usize` becomes a structure containing `incr : Self -> Result (Usize × Self)`. The `usize` instance is a concrete function, and a generic `use_counter` receives an explicit `Counter T` argument (Section 8.5, pp. 151–152).

This avoids relying on backend typeclass inference matching Rust trait resolution. The thesis says: “we resort to using structures rather than typeclasses because we have no way of ensuring that the typeclass inference implemented by the backend will yield the same result as the trait resolution performed by Rust.” (Section 8.5, p. 152.)

Inference: In Verus, an explicit trait or specification object can make the chosen implementation visible to the verifier. The implementation must still satisfy the trait contract; a ghost dictionary alone does not prove dynamic dispatch behavior.

## technique 5: ownership-centric LLBC semantics

LLBC is a cleaned-up MIR-like language with explicit moves and copies and high-level control flow. Its environments store values, borrows, and loans instead of a heap. A mutable borrow gives exclusive ownership and makes the borrowed value unavailable until the borrow ends; shared borrows permit multiple reads. The thesis uses this value-with-borrow representation to explain reborrows and two-phase borrows.

The soundness strategy connects this semantics to a conventional heap-and-addresses model. The authors introduce Pointer Language (PL), with an explicit heap inspired by CompCert, and an intermediary High-Level Pointer Language (HLPL). They prove a sequence of refinements from PL to HLPL to LLBC and then to LLBC#. The result is a semantic foundation rather than an assumption that the borrow-centric model is correct.

The thesis states: “We introduce PL, for ‘pointer language’, which uses a traditional, explicit heap inspired by CompCert’s C memory model, and show that it refines LLBC (Section 11.2).” (Chapter 11, p. 184.)

Inference: For VL, a borrow abstraction should be connected to the deployed Rust semantics by a refinement argument or a trusted compiler boundary. Proving only a pure model's properties leaves the translation relation trusted.

## technique 6: symbolic borrow checking with region abstractions

LLBC# extends LLBC with symbolic values and region abstractions. At a function call, use the callee's type to project input borrows into the regions named by the signature, create fresh output borrows and loans, and store the correspondence in region abstractions. The paper's `swap` example has two independent regions; ending one region restores access to only its associated input.

The symbolic rules expand symbolic pairs, split control-flow branches, and forbid ending a borrow hidden inside a region abstraction until the whole abstraction has no outstanding loans. `Reorg-End-Abstraction` then reintroduces borrows in anonymous variables with fresh symbolic values. This preserves ownership information without tracking an exact alias graph through every call.

The soundness proof uses local state transformations and a hybrid superset language. Rather than define one large global relation, define small rewrites between concrete and abstract states; their reflexive transitive closure is the refinement relation. Hybrid states contain pieces of both semantics and are interpreted in a superset language. The thesis says: “Rather than go full-throttle with a standard compilation-style proof of simulation, we reason modularly over local or pointwise transformations that rewrite one piece of state to another – proofs over those elementary transformations are much easier.” (Chapter 11, p. 184.)

Inference: A Verus abstraction can use ghost region tokens and local lemmas to connect an API's input and output borrows. Verus has no LLBC# interpreter, so this is a proof architecture rather than a ready-made construct. The method is especially relevant to APIs with multiple independent mutable references.

## technique 7: joins and loops in symbolic translation

Branching produces different symbolic environments. Aeneas joins them by recursively joining values, borrows, and loans, introducing fresh symbolic values when branches differ. The join soundness theorem relates each input environment to a projection of the joined environment (Theorem 9, pp. 218–219). The join operation is extended with fixed-point computations to support loops (Chapter 12, pp. 213–221). The generated pure loop model is then synthesized from the symbolic execution trace (Chapter 13, pp. 223–243).

Inference: In Verus, the corresponding user artifact is a loop invariant strong enough to describe the joined state, plus `decreases` for termination. Aeneas's automatic join does not transfer to Verus; an agent still needs to state and prove the invariant.

## backends and partial functions

Aeneas extracts to F*, Coq, HOL4, and Lean. HOL4 and Lean support custom encodings of potentially partial functions. Section 14.3 (p. 250) describes the HOL4 encoding as “a custom encoding of recursive function which leverages Knaster-Tarski’s fixed-point theorem to encode partial functions”. The Lean elaboration automatically establishes monotonicity and continuity obligations and generates unfolding lemmas, deferring termination to total-correctness proofs (Section 14.3.1, pp. 252–259). The thesis gives a list-summing example whose `termination_by l.length - i` measure is also the induction measure used to prove functional correctness. It argues that requiring termination at definition time can duplicate proof work (Section 14.3.1, pp. 250–252).

Inference: A Verus adaptation should distinguish partial correctness from a contract that also guarantees termination, and provide a decreasing measure when the latter is required. The thesis’s partial-function encodings do not establish a termination result for arbitrary Rust inputs.

## evidence, trust, and limits

The implementation consists of Charon, a Rust compiler plugin producing LLBC JSON, and Aeneas, an OCaml interpreter. The thesis reports 16 kLoC for Charon and 35 kLoC for Aeneas (Section 14.1, p. 245). It explicitly says: “The implementation is, naturally, trusted.” (Section 14.1, p. 246.) Continuous invariant checks include well-typed environments, consistent borrows, and the absence of mutable loans inside shared values.

The borrow-checker evaluation contains 2,000 LoC of micro-tests, including 22 loop tests totaling 300 LoC, and a hash table, AVL tree, and b-ε tree totaling 1,068 LoC (Section 14.2.1, p. 246). LLBC# borrow-checks all examples in less than one second for the whole suite. The denominator is the described suite, not all Rust programs. Aeneas also accepts examples rejected by the current Rust borrow checker and even by Polonius, but the authors call those cases anecdotal (Sections 14.2.2–14.2.3, pp. 247–249).

The soundness argument is a pen-and-paper proof, with mechanization ongoing (Chapter 16, p. 279). The functional translation itself is trusted, independently of the implementation trust stated above. Functional proofs in a backend establish the generated model's properties. The symbolic-execution theorem establishes memory safety in the modeled semantics, assuming all called functions borrow-check and initial states satisfy their signatures (Theorems 7–8, pp. 202–212). It permits panic and divergence; it is not a functional-correctness or termination guarantee.

The formalism excludes nested borrows in function signatures, borrow-containing type arguments and type declarations, and does not formalize traits, although the implementation supports traits (Chapter 10, p. 173). Experimental symbolic support for nested borrows and borrow-containing ADTs is distinguished from the translation and updated proofs still being developed (Chapter 16, pp. 278–279). Unsafe code and general interior mutability remain outside the pure translation's scope. For I/O and external dependencies, the user supplies opaque models or assumed lemmas; a state-error monad carries external state (Section 14.4.2, pp. 267–268).

Inference: A claim about deployed Rust additionally depends on the Rust frontend/compiler, Charon, Aeneas, backend modeling, and any supplied external assumptions. The thesis's modeled soundness result alone does not validate this whole chain.

Inference: VL should reuse Aeneas's ownership-to-function translation, backward functions, explicit region summaries, and refinement proof plan. It should not redo these as an agent-specific invention. The threat from agent-written verified Rust is high for mutable-borrow APIs: an agent may prove the pure functional model while supplying an incorrect or trusted translation boundary. A product should record the translator version, generated model, and assumptions as part of every proof artifact.

## techniques for the catalog

- ownership erasure: translate uniquely owned mutable references into pure value-passing functions
- backward functions: return a continuation that propagates updates from an output borrow back to original inputs
- recursive reconstruction: represent a borrowed subvalue as a value plus a function rebuilding the enclosing data
- explicit trait dictionaries: model Rust traits as structures to avoid backend dispatch mismatch
- LLBC borrow semantics: model loans and borrows as first-class values without an explicit heap
- symbolic region abstractions: summarize function-call borrow effects using typed regions and projected inputs/outputs
- local simulation proofs: establish refinement by composing small state transformations in a hybrid superset language
- symbolic joins for loops: join branch environments and synthesize a pure recursive model for loop execution
- hybrid embedding: prove one generic low-level protocol implementation against an interpreter, then specialize it by compile-time partial evaluation
- zero-cost staged rewriting: parameterize verified code over algorithm choices and erase the abstraction through elaborator rewriting and specialization
- module-based induction: package syntax induction as an abstract module and instantiate small constructor lemmas to stabilize proof maintenance

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The model of the loop itself is actually exactly the same as the translation of the recursive version of list_nth_mut, which is perhaps not surprising given the fact that this function is tail-call recursive."): read the complete supplied thesis text in pieces, including front matter, references and appendices, and the whole study; checked quotations, numbers, section/page references, technique steps and scope; corrected quotation wording, tag/link, printed-code typo, signature/body distinction, chapter ranges, HOL4 partial-function support, termination claims, proof assumptions, trusted translation and unsupported-feature limits; did not execute tools or artifacts, reproduce benchmarks, mechanically validate the proofs, or visually inspect the PDF.
