# Why3 — Where Programs Meet Provers
(authored by agents unless marked 🧑)
Tag: `filliatre2013why3`, [paper](https://www.semanticscholar.org/paper/4d011ed17687648ac4ce719e24c3bab77a4a143e)

## platform and verification model

Why3 is a deductive-verification platform with WhyML as both a programming/specification language and an intermediate language. The abstract states: "We present Why3, a tool for deductive program verification, and WhyML, its programming and specification language." (abstract, p.1) WhyML is first order, has polymorphic types, pattern matching, inductive predicates, mutable record fields, type invariants, and ghost code. Verification conditions are discharged by external automated or interactive provers.

The specification language is deliberately shared across back ends. The authors write: "The specification language of Why3 does not depend on any features of the programming language, and can serve as a rich common format for theorem proving problems, readily suitable (via Why3) for multiple automated and interactive provers, such as Alt-Ergo, CVC3, Z3, E, SPASS, Vampire, Coq, or PVS." (Section 1, p.1) When a prover lacks a feature, Why3 applies encoding transformations such as eliminating pattern matching or polymorphism (Section 1, p.1).

Inference: VL can adopt a prover-neutral intermediate specification layer, but Verus's Rust and SMT pipeline is a different implementation. The paper does not describe Verus constructs, so any mapping below is an inference.

## technique: alias control instead of a memory model

When to use it: use static alias control when mutable state can be named finitely and first-order verification conditions are preferable to a general heap model.

How to apply it:

1. Restrict every l-value to a finite set of statically known names. WhyML requires this to keep verification conditions tractable and readable (Section 2, p.2).
2. Keep recursive data types free of mutable components; recursive mutable nodes would violate the restriction (Section 2, p.2).
3. Put mutable state in record fields. A mutable resizable array is a record containing mutable `data` and `size` fields, with invariant `0 ≤ size ≤ data.length` (Section 2, p.2).
4. Generate weakest-precondition verification conditions from preconditions, postconditions, loop invariants, assertions, and variants (Section 2, p.2).
5. Send each obligation to an external prover, applying Why3 encodings when the prover lacks a language feature (Section 1, p.1).

Evidence: the paper reports a gallery of 67 case studies (Section 3, p.2). Its KMP example specifies `first_occur p a result` and extracts executable OCaml, while the hash-table example has a mutable `data` field holding an array of lists. The paper says of resizing: "In particular, after the resize, one cannot use any stale pointer to the old value of data." (Section 3, p.3)

Inference: Verus already uses Rust ownership and borrowing as a form of alias control, so this technique is conceptually aligned but not a reason to avoid Verus's memory model. In Verus, use ordinary Rust references/borrows, `requires`/`ensures`, and proof lemmas; do not write WhyML syntax. This is an inference.

Limitations: WhyML is first order: higher-order functions are excluded (Section 2, p.2). Mutable nested pointer structures such as doubly linked lists and mutable trees cannot be implemented directly (Section 3, p.3).

## technique: type invariants and ghost state

When to use it: attach a local invariant to a mutable record type and maintain it at every construction or mutation; add ghost state when a mathematical view or resource is useful only for verification.

How to apply it:

1. Define a record with mutable fields and an invariant. The paper's `rarray` requires `0 ≤ size ≤ data.length` (Section 2, p.2).
2. Assume the invariant on function arguments and generate an obligation after every creation or modification (Section 2, p.2).
3. Add ghost expressions for counters or logical views. Ghost computations may read non-ghost values, but cannot modify non-ghost mutable values or raise exceptions into non-ghost code (Section 2, p.2).
4. Use ghost results only in annotations. The paper says ghost code "can be safely removed from a program without affecting its final result" (Section 2, p.2). It does not say how extraction treats ghost code.

Inference: A Verus analogue is a `spec fn` representation predicate plus ghost/spec variables and proof code erased from execution. The exact invariant placement must follow Verus's supported syntax; the paper's type-invariant semantics is not a Verus feature. This is an inference.

## technique: executable implementation with verified contracts

When to use it: use pre/postconditions for functions, loop invariants for iteration, and variants for termination. This supports executable code while retaining deductive proof obligations.

How to apply it:

1. Annotate each WhyML function with pre- and postconditions for normal and exceptional termination (Section 2, p.2).
2. Annotate loops with invariants. Recursive functions and while-loops can be given variants (values that decrease at each call or iteration) to ensure termination (Section 2, p.2).
3. Statically checked assertions can be inserted at arbitrary points in a program (Section 2, p.2).
4. Let Why3 generate weakest-precondition verification conditions and dispatch them to external provers (Section 2, p.2).
5. Extract verified WhyML to OCaml. Uninterpreted types can map to existing OCaml types or remain abstract; user mappings can customize the result (Section 3, p.3).

The KMP example has a precondition `1 ≤ length p ∧ 0 ≤ length a` and postcondition `first_occur p a result` (Section 3, p.3). The extracted OCaml signature is `character array → character array → Num.t` (Section 3, p.3).

Inference: In Verus, use `requires`, `ensures`, `decreases`, loop `invariant`, and `assert` constructs documented in the approved Verus reference. The paper's exceptional postconditions and OCaml extraction are WhyML-specific. This is an inference.

## technique: abstract interfaces for unimplemented structures

When to use it: specify a complex mutable data structure abstractly when the implementation is outside the language fragment, then verify clients against the interface.

How to apply it:

1. Declare an abstract model type with a mutable pure snapshot. The union-find example declares `type uf model { mutable contents: uf_pure }` (Section 3, pp.3–4). The keyword `model` makes `uf` an abstract data type for programs, while specifications see a record.
2. Use a pure data type `uf_pure` as the immutable snapshot of the structure's contents (Section 3, p.4).
3. Specify operations with a `writes` set and a relation between new and old snapshots. `find` returns a representative and ensures `result = repr u x ∧ same_repr u (old u)` (Section 3, p.4).
4. Verify client code against that contract without implementing the data structure. Any implementation satisfying the interface can replace it without invalidating the client proof (Section 3, p.4).

Inference: In Verus, model the abstract state with a ghost/spec type and expose an external or separately verified function contract; keep the implementation boundary explicit. This is an inference.

## trust, scope, and VL threat

Inference: a Why3 proof depends on the external prover results, Why3's verification-condition generation and encoding transformations, the standard logical theories, and user-supplied axioms or abstract declarations. The paper does not discuss soundness or trust and presents no theorem about these components. Because WhyML extraction produces OCaml, the OCaml compiler/runtime and any custom type mapping also lie outside what the paper describes as proved.

The strongest measured claim is a gallery count, not a benchmark accuracy rate: "Our gallery (http://proval.lri.fr/gallery/why3.en.html) currently contains 67 case studies." (Section 3, p.2) The paper illustrates three kinds of verification (an algorithm, a data structure, a specification of a data structure) rather than giving results for all gallery programs.

What VL should not redo: the paper, a four-page tool description, outlines a prover-neutral VC generator, an alias-controlled mutable language, ghost code, type invariants, and abstract interfaces, but gives no evaluation of them. Inference: VL should focus on Verus-specific Rust ownership, solver control, and extraction trust rather than rebuilding this general architecture.

Threat to agent-written verified Rust: Inference: medium. The paper's three examples suggest that contracts plus a disciplined alias model can handle algorithms and clients of abstract structures, but its unsupported mutable pointer graphs and first-order restriction leave important systems patterns outside scope. A Verus agent still needs correct specifications, trusted external APIs, and compiler/runtime assumptions.

## techniques for the catalog

- prover-neutral verification conditions — generate a shared first-order specification and encode it for multiple automated or interactive provers
- static alias control — constrain mutable names so weakest-precondition obligations avoid a general memory model
- type invariants and ghost code — maintain record invariants and keep verification-only computations in ghost code that can be removed without changing the result
- contract-and-variant verification — combine pre/postconditions, loop invariants, assertions, and decreasing variants
- abstract data-structure interfaces — specify an unimplemented mutable structure through a pure snapshot and verify clients modularly

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "In the process, uninterpreted WhyML types are either mapped to existing OCaml types or left as abstract data types."): read all four pages (LNCS pp.125-128) and checked every quotation, the figure 67, the KMP and union-find details, section and page references, and each technique step; link from the fetch record (the paper text gives no DOI). Changed: page references for the hash-table, mutable-tree and union-find passages (the paper has them on p.3, with union-find continuing on p.4); the exceptional-termination wording; the claim that ghost code is erased at extraction (the paper only says it can be removed without affecting the result); the trust paragraph, now marked Inference since the paper has no trust discussion; an overstated claim of what the paper establishes. Not checked: the Verus-related inferences, the threat rating, and the semanticscholar link target.
