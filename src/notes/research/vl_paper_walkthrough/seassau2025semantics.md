# Formal Semantics and Program Logics for a Fragment of OCaml
(authored by agents unless marked 🧑)
Tag: `seassau2025semantics`, [paper](https://doi.org/10.1145/3747509)

## scope
Inference: The paper defines OLang, a sequential OCaml fragment, in Rocq and builds two sound logics over it. The central engineering technique is a monadic interpreter layered over a small-step tree semantics, with a stateless Hoare logic (Horus) for pure code and an Iris-based separation logic (Osiris) for arbitrary code.

> “We present a formal definition of OLang, a nontrivial sequential fragment of OCaml, which includes first-class functions, ordinary and extensible algebraic data types, pattern matching, references, exceptions, and effect handlers.” (Abstract, p. 1)

> “A stateless Hoare Logic allows reasoning about so-called “pure” programs; an Iris-based Separation Logic allows reasoning about arbitrary programs.” (Abstract, p. 1)

## technique: hybrid monadic/operational semantics
Inference: Use this when a language has many effects and the verifier needs both an executable interpreter and an operational model to prove logics sound against. The paper defines a deep-embedded AST and an untyped inductive `val` (Fig. 1) covering machine integers, tuples, data constructors, extensible-type constructors, heap locations, stored continuations, and closures. `eval_expr : env → expr → micro val exn` is defined by induction on the AST (Sec. 3.3). The top layer is this monadic interpreter; the lower `micro` monad represents computations as finite trees and gives them a small-step relation (Sec. 4–5). The public combinators (Fig. 2) are `ret`, `throw`, `try2`, `bind` (derived from `try2`), `crash`, `please_eval`, `alloc`, `load`, `store`, `par`, `handle`, `perform`, `resume`, and `wrap`. Because Rocq accepts only terminating functions, a function call goes through `please_eval`, a system call that requests a possibly diverging recursive evaluation (Sec. 3.6).

> “The top layer is a monadic interpreter. It is easy to understand and lends itself well to execution, either inside Rocq or via extraction.” (Sec. 2, p. 3)

> “In the lower layer, monadic computations are represented as trees, equipped with a small-step operational semantics.” (Sec. 1, p. 2)

Inference: Steps: (1) define AST and environments (association lists); (2) define values, with closures carrying environments; (3) translate each expression constructor to monadic combinators; (4) define small-step reduction for the tree nodes (`Stop` system calls, `Par`, `Handle`; Fig. 6); (5) prove each logic sound against that reduction relation. For OCaml's unspecified evaluation order, tuple, constructor, and application subexpressions are evaluated with `par`, which permits arbitrary interleaving (Sec. 3.5–3.6).

> “To account for this feature, our semantics of OLang must be non-deterministic: it must permit all of the permutations that the OCaml manual allows.” (Sec. 2, p. 4)

Inference: In Verus, this suggests a ghost AST/interpreter only for specification, with executable Rust kept separate; model effects as an explicit enum and prove each evaluator branch. `par` should be modeled as nondeterministic interleaving or constrained to an explicit sequence in verified code. This is an inference because OLang/Rocq are not Verus.

## technique: trusted translation boundary
The translator consumes a typed OCaml AST produced by the OCaml type checker and emits an OLang AST as a Rocq source file (Sec. 1). Type-based disambiguation (e.g. two data types with a constructor named `A`) is left to the OCaml type checker, while OLang itself is untyped, so it assigns a meaning to all programs, including some uses of unsafe type casts; ill-tagged operations crash (Sec. 2).

> “Our translator of OCaml into OLang is intended to be as simple as possible. This matters, as it is unverified and must be trusted.” (Sec. 2, p. 3)

Inference: Steps: run the OCaml type checker; pass its typed AST to the translator; prove properties about the generated OLang program. Record the translator as trusted infrastructure, or verify it separately. Inference: For VL, a Rust-to-Verus extraction or annotation elaborator is an analogous trusted boundary; claims about verified Rust should state whether translation is in the trusted base.

## technique: Horus stateless Hoare logic
Horus targets pure code: no divergence, mutable state, or control effects, but exceptions and non-determinism are allowed (Sec. 1). Its micro judgment `pure m φ ψ` states that `m` is a pure and terminating computation that returns a value satisfying `φ` or raises an exception satisfying `ψ` (Sec. 7.2); the OLang judgment `expr η e φ ψ` is `pure#` applied to `eval_expr η e` (Sec. 7.3). Its micro rules (Fig. 7) cover `ret`, `throw`, `bind`, `please_eval`, consequence, `try2`, `par`, `handle`, and intersection; pattern matching is handled by `pat`, `branches`, and `cpat` judgments whose rules tactics apply automatically (Sec. 7.3).

> “Horus can verify pure programs, which must terminate and cannot use mutable state or control effects; Osiris can verify arbitrary programs.” (Sec. 2, p. 4)

For an n-ary curried function, `Spec τ c P` is defined by induction on the parameter-type list `τ`: with one parameter, every call `call c #a` satisfies `P a`; with more, each call returns a closure satisfying the residual specification (Sec. 7.4). For recursion (Spec-ELetRec), the user exhibits a well-founded relation `R` over all parameters, proves the body assuming the specification for strictly smaller arguments, and may assume the specification while verifying the rest of the `let rec` (Sec. 7.4). The merge example requires sorted inputs and guarantees a sorted output that is a permutation of their concatenation.

> “Spec-ELetRec governs the definition of one recursive function with an arbitrary number of formal parameters” (Sec. 7.4, p. 21)

Inference: Verus maps this to `requires`/`ensures`, a `decreases` clause, and pure `spec fn` definitions; pattern branches become explicit proof obligations. The paper’s termination requirement carries over conceptually, while its monadic judgment syntax does not.

## technique: Osiris separation logic for effects
Osiris handles OLang programs with divergence, state, and control effects (Sec. 8). Its micro judgment `⟨Ψ⟩ impure m φ ψ` states that `m` cannot crash; if it terminates, normal and exceptional results satisfy `φ` and `ψ`; and every control effect it performs follows protocol `Ψ` (Sec. 8.1). Osiris is partial-correctness only (Sec. 2). `impure-par` is the separation-logic parallel composition rule, so resources are split between the two sides; `impure-conseq` is also the frame rule; `impure-perform` checks an effect against `Ψ`; `impure-resume` hides the heap representation of continuations behind `isCont`; `impure-handle` and `olang-deep-handler` change the description from `Ψ, φ, ψ` to `Ψ′, φ′, ψ′` (Sec. 8.1–8.2).

> “The lower layer of Osiris is a Separation Logic for monadic computations in the micro monad.” (Sec. 8.1, p. 22)

Inference: Steps: (1) choose resource assertions and an effect protocol; (2) prove each primitive computation; (3) split ownership for `par`; (4) discharge effect and continuation obligations; (5) state results at the OLang level, where `expr` is defined as `impure#` of `eval_expr`. Pure subproofs can drop to Horus via rule `impure-pure` (Sec. 8.3), as in the `find_first` example, where the code after a store-extending `type exn +=` instruction is verified in Horus.

> “Sometimes, somewhere in the middle of an Osiris proof, the user faces a pure fragment of the program that they wish to verify. Then, they can “drop down” from Osiris to Horus.” (Sec. 8.3, p. 23)

Inference: In Verus, use `tracked` ownership predicates and explicit effect-state ghost parameters. The division between pure and effectful reasoning is directly useful, but Iris’s `iProp`, magic wand, and continuation protocols need new encodings.

## validation and soundness evidence
Validation is preliminary. An extracted, executable interpreter combined with the translator runs self-contained OCaml programs; the OCaml compiler test suite has fewer than 1700 test cases, many using primitives not yet supported, and only a small number of them were run, plus hand-written tests (Sec. 6). Picking one execution path on each side does not allow a meaningful comparison because of nondeterministic evaluation order; the authors propose a manually defined deterministic variant of the semantics for comparison (Sec. 6).

> “In total, our tests currently represent 29 files and about 900 lines of code.” (Sec. 6, p. 16)

The formal guarantees: if `pure m φ ⊥` holds, executing `m` in any heap cannot diverge, crash, or end with an unhandled exception or effect, reaches a result satisfying `φ`, and leaves the heap unchanged (Sec. 7.2). Theorem 8.1 and Corollary 8.2: if a computation or expression is verified in Osiris under the empty protocol and empty exceptional postcondition, executing it in an empty heap cannot crash or end with an unhandled effect or exception, and a returned value satisfies `φ` (Sec. 8.4). Inference: the empirical denominator is 29 test files, not all OCaml programs, and no success percentage is claimed.

## evidence and limits
The Rocq definitions and soundness proofs are machine-checked (Sec. 1). Verified examples are small: merge sort and splay-tree operations in Horus, and the "control inversion" example in Osiris (Sec. 10).

> “However, the ratio of lines of verification over lines of code still seems quite high.” (Sec. 10, p. 27)

Unsupported: concurrency, weak memory, functors, objects and classes, labeled and optional arguments (Sec. 10); the translator does not yet support shallow handlers (Sec. 3.9). Allowing parallel evaluation over-approximates OCaml: `let r = ref 0 in (incr r, incr r); !r` may return 1 or 2 (Sec. 2). The translator is unverified and trusted. Inference: the OCaml type checker is also relied on for disambiguation. Inference: VL should reuse the hybrid semantics idea, explicit trust boundary, and separate pure/effectful proof layers; redoing a full language semantics is unnecessary. Inference: a VL deployment remains exposed where its semantics, effect model, or translation boundary diverges from the code that Verus checks.

## techniques for the catalog

- hybrid monadic/small-step semantics — define an executable interpreter over an effect tree with a reduction semantics
- trusted typed-AST translation — use the source type checker to disambiguate syntax, then record the translator as trusted
- Horus stateless Hoare logic — verify terminating pure code with recursive specifications and well-founded relations
- Osiris effect separation logic — verify stateful, divergent, exception and effect-handler code with resource splitting and effect protocols
- logic interoperability — discharge pure subexpressions in Horus inside larger Osiris proofs

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Requiring the user to prove termination has a cost (more work for the user) and a benefit (a stronger guarantee about the code)."): what I checked: every quotation word for word, section and page references, numbers (29 files, about 900 lines, fewer than 1700 tests), combinator list, Horus/Osiris rule descriptions, soundness statements, limits, tag and DOI; what I changed: replaced a quote misattributed to the abstract, fixed section/page of three quotes (Sec. 1 p. 2, Sec. 2 p. 3, Sec. 2 p. 4, Sec. 8.3 p. 23) and the wording of two, completed the combinator list, removed an unsupported proof step (correspondence between interpreter and semantics), removed "frame" from Horus rules, removed claims that Osiris verifies concurrent code, reworded the deterministic-variant claim as a proposal, added unsupported features and verified examples, marked inferences; what I did not check: the Rocq artifact, the PDF layout beyond the text extraction, and the Verus mappings (inferences).
