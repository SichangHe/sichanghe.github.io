# Higher-Order Specifications for Deductive Synthesis of Programs with Pointers (Extended Version)
(authored by agents unless marked 🧑)
Tag: `young2024higher`, [paper](https://arxiv.org/abs/2407.09143)

## purpose and result

Young, Yang, Sergey, and Potanin introduce Pika, a functional-looking specification language compiled to SuSLik's Synthetic Separation Logic (SSL). The paper's central claim is that higher-order functions over algebraic data types (ADTs), plus separate memory layouts, remove repeated pointer-level predicates while preserving deductive synthesis and its proof. The abstract says: “We implemented a layout-agnostic synthesiser from Pika to SuSLik enabling push-button synthesis of C programs with in-place memory updates, along with the accompanying full proofs that they meet Separation Logic-style specifications, from high-level specifications that resemble ordinary functional programs.” (Abstract, p. 1)

## technique: separate ADT meaning from concrete layout

What it is: define an ADT once, define one or more layout equations that map each constructor to heaplets, and write functions only over ADT constructors and pattern matches. A layout has the form `A : α ↣ layout[x]`; for a singly linked list the paper gives `Sll (Nil) := emp` and `Sll (Cons head tail) := x :-> head, (x+1) :-> tail, Sll tail` (Fig. 3, p. 6). A `%generate` directive selects layouts for an entry function's arguments and result.

When to use it: use this when the same logical data type must be implemented with different pointer layouts, or when a specification should not repeat offsets and points-to assertions. The paper explicitly says, “none of the function definitions need to directly perform any pointer manipulations.” (Sec. 2.3, pp. 7–8)

How to apply it:
1. Declare the ADT (for example `data List := Nil | Cons Int List`). (Sec. 2.2, p. 6)
2. Declare each layout by constructor pattern and SSL heaplets. (Fig. 3, p. 6)
3. Define the function using ADT pattern matching, without pointers. (Sec. 2.3, pp. 6–8)
4. Add `%generate f [ArgLayouts] ResultLayout` so the compiler lowers the abstract function. (Sec. 2.2, p. 6; Sec. 2.3, p. 8)
5. The translator emits an SSL inductive predicate, then SuSLik searches derivable synthesis rules and emits C plus an SSL proof. (Sec. 2.1, p. 4)

Verus form: Inference: represent the ADT as a Rust `enum` and the layout as a representation predicate over a `Map`/sequence and owned memory model; define executable functions over the enum and prove a representation-preservation lemma for each layout. Verus has no Pika `%generate`, SSL heaplets, or automatic C synthesis. `requires`, `ensures`, `proof fn`, `lemma`, `assert`, and loop `invariant` are the available contract mechanisms; the pointer layout and ownership proof must be encoded explicitly.

Evidence: The formal result states, “For any well-typed expression e, if T JeKV,r is satisfiable ... then (σ′, h′) |= T JeKV,r.” (Theorem 3, Sec. 3.5, p. 17). This is a semantic soundness implication, not a measured probability. Evaluation used 13 benchmark tasks (Fig. 18, p. 24), on a 2021 MacBook Pro M1 with 32 GB RAM, GHC 9.8.1 and Apple Clang 13.0.0 (Sec. 5, p. 22).

Limits: layouts are selected at generation/instantiation; the paper says layout inference and type-level equality of layouts are future work (Sec. 8, p. 26). `selfAppend` reuses an argument and violates separation; the authors identify a lightweight linear type system as a possible fix, but did not implement it (Sec. 5, p. 24). SuSLik synthesis failure is another stated failure mode (Sec. 5, p. 24).

## technique: higher-order specification functions

What it is: define a generic `map : (Int -> Int) -> List -> List`, then instantiate it with `add1` using `instantiate [Int -> Int, Sll] Sll map add1 xs` (Sec. 2.3.1, p. 8). The generated SSL predicate captures the relation between input and output lists once, instead of one predicate per payload transformation.

How to apply it: define the function parameter; pattern-match `Nil` and `Cons`; apply the function to the head; recursively apply the generic function to the tail; use `instantiate` to choose layouts for every abstract argument and result; use `%generate` at the entry point. (Sec. 2.3.1, pp. 8–9)

Verus form: Inference: use a higher-order `spec fn` or a trait specification for the mathematical transformation, and prove a generic lemma relating a sequence map to the recursive executable function. Verus function calls do not carry Pika layout arguments; representation parameters would be explicit ghost arguments or type parameters. A `spec fn` is non-executable, so an executable Rust closure/trait implementation needs its own proof contract.

Evidence and limits: the paper's rule S-Inst-Inst performs an ANF-like translation because “In SuSLik, it does not make sense to directly apply a predicate to another predicate application.” (Sec. 3.3.1, p. 15). Thus nested higher-order calls are translated into intermediate results. Defunctionalization is used for the fold benchmark, and true higher-order functions are future work (Sec. 2.3.5, p. 10; Sec. 8, p. 26).

## technique: function predicates and sequential calls

What it is: extend SSL with `func f(...)` heaplets to describe an existing pure function's relation, then add `temp` locations when one call feeds another. The paper's example is `f x y = g (h x) y`; its predicate uses `temp houtput ** func h(x,houtput) ** func g(houtput,y,output)` (Sec. 4.3, p. 20).

How to apply it: define a predicate whose final parameter is the output location/value; use `func` for a call whose result is written to a location; introduce `temp` before the first call; allocate the temporary with Tempfuncalloc; call the consumer; apply Tempfuncfree once no predicate mentions the temporary; recursively free pointed-to contents with generated `type_free` when needed. (Secs. 4.1–4.3, pp. 19–21)

Verus form: Inference: model a temporary as a ghost value or an owned local variable, and use `ensures` to connect the producer's result to the consumer's `requires`. Rust ownership naturally prevents an escaped temporary reference; no `temp` heaplet is needed. For heap-allocated data, prove a destructor/free postcondition or use ownership types and `drop` invariants.

Limits: `temp` is needed because an intermediate location cannot occur in the SSL precondition; the generated flattening example otherwise retains intermediate lists and is space-inefficient (Sec. 4.3, pp. 20–21). This is an engineering extension to SuSLik, not a theorem that all higher-order compositions are synthesizable.

## technique: read-only/constant points-to

What it is: add a constant points-to heaplet that records a location's value and forbids the SSL `Write` rule. Without it, the paper's `copy` predicate can synthesize code that mutates the source after allocation while still satisfying a pure equality (Sec. 4.4, p. 21).

How to apply it: mark input cells as constant in the specification; retain ordinary points-to for output cells; run synthesis so writes cannot consume the constant heaplet; use the resulting predicate as the translation's correctness mechanism. (Sec. 4.4, pp. 21–22)

Verus form: Inference: use an immutable `&T` borrow or a read-only view in the executable signature, and prove that the function's `ensures` preserves the input sequence. If raw pointers are modeled, keep the permission ghost state unchanged and expose no mutable permission. Verus's borrow checker and contracts enforce this at the Rust level; there is no SSL constant-points-to token.

## evidence, trust, and product threat

Measured evidence is limited to the 13 benchmark rows in Fig. 18 (p. 24): each row reports Pika AST nodes, generated SSL AST nodes, compile time, and synthesis time in seconds. The paper reports no denominator beyond those 13 tasks and no confidence intervals. It reports faster unoptimized generated C than Haskell and mixed optimized results; the exact claims are qualitative in Sec. 5, pp. 22–23. The soundness proof covers the restricted formal subset and its translation; the implementation, SuSLik solver, C compiler, runtime allocator, hardware, and correctness of user specifications remain trusted. Inference: this can reduce agent-written Verus proof surface by separating logical ADTs from representation lemmas, but it threatens a VL product if a high-level specification is aligned with the wrong layout or if synthesis succeeds for an underspecified relation. The paper's own separation failure (`selfAppend`) is a direct warning that abstraction does not remove aliasing obligations.

## what VL should reuse and what it should not redo

The reusable ideas are representation-independent ADT specifications, generic higher-order relations, explicit temporary ownership, and read-only input permissions. Inference: VL should not rebuild a Pika-to-C synthesizer unless it needs automatic pointer layout compilation; Verus already supplies Rust ownership, contracts, and solver-backed proofs. VL should instead test whether ADT representation predicates and generic sequence lemmas give the same reuse while preserving executable Rust APIs. The paper does not establish that its benchmark performance or synthesis success transfers to Verus or to agent-generated systems code.

## techniques for the catalog

- layout-separated ADTs: define constructors and reusable pointer layouts separately, then generate SSL for a chosen instantiation
- higher-order SSL predicates: encode generic map/fold relations and instantiate layouts for each call
- function predicates: represent pure function calls as SSL `func` heaplets with output locations
- temporary locations: allocate and free intermediate results for sequential function composition
- constant points-to: prevent synthesis from mutating read-only input cells
- sound translation: prove every well-typed Pika execution satisfies its translated SSL proposition
Checked 2026-10-15 against paper young2024higher: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
