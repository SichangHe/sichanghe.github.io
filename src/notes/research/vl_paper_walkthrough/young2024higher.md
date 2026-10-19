# Higher-Order Specifications for Deductive Synthesis of Programs with Pointers (Extended Version)
(authored by agents unless marked 🧑)
Tag: `young2024higher`, [paper](https://arxiv.org/abs/2407.09143)

## purpose and result

Young, Yang, Sergey, and Potanin introduce Pika, a functional specification language translated to SuSLik's Synthetic Separation Logic (SSL). Pika separates algebraic data types (ADTs) and functions over them from their memory layouts. The abstract reports: “We implemented a layout-agnostic synthesiser from Pika to SuSLik enabling push-button synthesis of C programs with in-place memory updates, along with the accompanying full proofs that they meet Separation Logic-style specifications, from high-level specifications that resemble ordinary functional programs.” (p. 1) The paper identifies itself as arXiv:2407.09143v2, dated 15 July 2024 (p. 1).

## technique: separate ADT meaning from concrete layout

What it is: define an ADT, give layout equations mapping its constructors to SSL heaplets, and define functions using constructors and pattern matching. The singly linked list layout maps `Nil` to `emp` and `Cons head tail` to a head cell, a tail-pointer cell at offset one, and a recursive layout application (Fig. 3, p. 6). A `%generate` directive selects layouts for a function's arguments and result.

Inference: use this separation when operations should be reused across memory representations, or when specifications otherwise repeat pointer offsets. The paper explains: “This is relegated entirely to the reusable layout definitions for the ADTs.” (Sec. 2.3, p. 8)

How to apply it:
1. Declare the ADT and its layouts (Fig. 3, p. 6).
2. Define functions using ADT pattern matching and constructors (Sec. 2.3, pp. 6–8).
3. Choose argument and result layouts with `%generate`; use `instantiate` for non-recursive function calls, with layouts inferred for recursive calls (Secs. 2.2–2.3.1, pp. 6–9).
4. Translate to SSL inductive predicates and synthesis specifications; SuSLik searches for a derivation that yields code and its SL correctness proof (Sec. 2.1, p. 4; Sec. 2.3, pp. 6–8).

Appendix A (p. 27) lists the implementation stages: type checking and elaboration; unfolding empty constructors; unfolding pattern matches using layouts; inserting copying predicate applications; translating lets to equalities; unfolding constructor applications and translating function calls and base expressions; generating branch conditions and final predicates. Empty constructors require a zero-equality constraint rather than only `emp`.

Verus form: Inference: try a Rust enum for the ADT and a representation predicate for each layout, with lemmas connecting concrete memory operations to the abstract operation. This is a proposed adaptation, not a translation evaluated by the paper.

Evidence and limits: Theorem 3 (Sec. 3.5, p. 17; proof in Appendix G, pp. 43–45) assumes a well-typed expression, a satisfiable SSL translation, and an abstract-machine transition; it concludes that the final store and heap satisfy the translation. The formal subset excludes guards and conditionals, permits only one function argument, and requires explicit lowering and instantiation (Sec. 3, p. 11). Layout definitions are assumed injective from ADTs to SSL assertions up to bi-implication (Sec. 3.1, p. 12). Compound subexpressions use disjoint heap portions (Sec. 3.2.2, p. 13).

The paper cannot require layout equality at the type level (Sec. 7, p. 25); layout inference and layout type variables are future work (Sec. 8, p. 26). Its presentation is inconsistent about doubly linked layouts: Fig. 18 includes `add1HeadDLL`, while Sec. 8 describes additional layout parameters enabling a doubly linked layout as future work. Inference: the benchmark name alone does not establish general support for such layouts.

## technique: higher-order specification functions

What it is: reuse a Pika function such as `map : (Int -> Int) -> List -> List` with a payload function such as `add1`. The example uses `instantiate [Int -> Int, Sll] Sll map add1 xs` (Sec. 2.3.1, p. 8). This reuses the high-level definition; it does not establish that the emitted SSL predicate remains higher-order.

How to apply it: pattern-match the list; apply the payload function to its head using `instantiate`; recursively map the tail; select layouts for the entry function with `%generate` (Sec. 2.3.1, pp. 8–9). Layouts are inferred for recursive calls, but a call inside the body can explicitly select layouts unrelated to the enclosing function's instantiation (p. 9).

Verus form: Inference: express a mathematical map parameterized by a function and prove a generic representation lemma. Connecting it to an executable implementation would require a separate contract; this paper supplies no Verus implementation.

Evidence and limits: nested applications use an ANF-like translation that introduces intermediate results: “In SuSLik, it does not make sense to directly apply a predicate to another predicate application.” (Sec. 3.3.1, p. 15) This concerns nested applications generally. The fold example specializes its combining function to addition and calls this defunctionalization (Sec. 2.3.5, pp. 10–11). Sec. 8 (p. 26) proposes defunctionalisation and lambda lifting to implement true higher-order functions as future work.

## technique: function predicates and sequential calls

What it is: a function predicate relates a non-higher-order function's inputs to its final output parameter, using `int` for integer values and `loc` for data structures (Definition 5, Sec. 4.1, p. 19). A `func` heaplet represents a function call; `Funcwrite` emits that call as a write to its output location (Sec. 4.2, pp. 19–20).

How to apply it: supply the function relation; use `func` for the call; keep function types consistent and prohibit writes to its input locations when it appears in the postcondition (Sec. 4.2, p. 20). For a composition such as `f x y = g (h x) y`, introduce a `temp` location for the intermediate result because that location is absent from the precondition (Sec. 4.3, p. 20). Allocate and later free it with the new rules in Fig. 16 (p. 21). Deallocation also frees pointed-to contents via `type_free`, which invokes a type-specific synthesized freeing function; for integers it does nothing (p. 21).

Verus form: Inference: use an owned local value for the intermediate result and connect producer and consumer contracts. A heap representation would additionally need an ownership and deallocation argument. This is a proposed analogy, not a paper result.

Limits: the paper's flattening example illustrates how encoding intermediates as part of the output retains unwanted intermediate lists; `temp` makes their deallocation explicit (Sec. 4.3, pp. 20–22). No completeness result guarantees synthesis for every composition.

## technique: read-only/constant points-to

What it is: a constant points-to heaplet prevents applying SSL's `Write` rule to the described location. In the copy example, the synthesizer otherwise changes the input to an allocated cell's initial value instead of copying the input into the output (Sec. 4.4, pp. 22–23).

How to apply it: represent protected inputs with constant points-to assertions and leave writable locations with ordinary points-to assertions. The paper states: “The only difference of the constant points-to from the original points-to heaplet is that the value of the location is constant, which means that the Write rule in SSL is not applicable.” (Sec. 4.4, pp. 22–23)

Verus form: Inference: model this restriction with immutable access or unchanged permission state, and state input preservation in the postcondition. The paper does not verify this adaptation.

## evidence, trust, and product threat

Figure 18 (p. 24) reports 13 tasks with Pika and generated SuSLik AST sizes, compilation time, and synthesis time. Pika AST sizes range from 19 to 119 nodes, SuSLik sizes from 42 to 212, compilation times from 0.001 to 0.012 seconds, and synthesis times from 3.999 to 10.618 seconds. All 13 Pika ASTs are smaller than their generated counterparts. The experiments used a 2021 MacBook Pro with an M1 processor and 32 GB RAM, GHC 9.8.1, and Apple Clang 13.0.0 (Sec. 5, p. 23).

Figure 17 compares six runtime benchmarks, using C/Haskell optimization levels `-O0`/`-O0` and `-O3`/`-O2` (p. 23). Sec. 5 reports faster generated C without optimizations. With optimizations, it reports “For functions for the singly-linked list GHC’s optimisation is very powerful, resulting in much better performance than C programs generated by Pika.” (p. 23) It reports C's advantage for complex data structures. This qualifies the broader performance claim in the introduction (p. 3). The paper supplies no confidence intervals or general synthesis success rate.

Sec. 5 identifies failure from separation-violating reuse, exemplified by `selfAppend`, and from SuSLik failing to synthesize a generated specification (p. 24). A lightweight linear type system is suggested but not implemented. Appendix D.11 attributes `selfAppend` failure to repeated argument use without an exposed copy operation (p. 36). There are additional unresolved statements: Appendix D.2 says the synthesized `car` has incorrect behavior (p. 31); Appendix D.12 says the machine-integer `take` does not synthesize (p. 37), although Fig. 18 reports a synthesis time for `take`. Inference: these inconsistencies limit conclusions about implementation coverage.

Inference: the stated soundness theorem for a restricted semantics does not by itself validate the full implementation or every synthesized executable. Applying the approach to VL would still require checking the representation relation and the intended specification. Neither Verus performance nor agent-generated systems-code correctness is evaluated here.

## what VL should reuse and what it should not redo

Inference: test representation-independent ADT specifications, generic relations, explicit intermediate ownership, and read-only input permissions in Verus. Rebuilding the Pika-to-C pipeline would need a separate justification based on a need for automatic pointer-program synthesis. The paper's results do not establish that its performance or synthesis success transfers to Verus.

## techniques for the catalog

- layout-separated ADTs: define constructors and reusable pointer layouts separately, then generate SSL for a chosen instantiation
- higher-order specification functions: reuse Pika map/fold definitions while explicitly selecting layouts for calls
- function predicates: relate inputs to an output and represent calls with SSL `func` heaplets
- temporary locations: allocate and free intermediate storage for sequential function composition
- constant points-to: prevent synthesis from writing protected input cells
- sound translation: relate executions of the restricted formal Pika subset to satisfaction of its translated SSL propositions

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The comparison is between Haskell functions based on user-defined data structures and C functions generated from Pika’s specifications (via the extended SuSLik), parameterised with the data structures of large size."): checked the full text, quotations, numbers, section and page references, technique steps, formal assumptions, evaluation, and appendices; corrected page references, theorem scope, instantiation and function-call descriptions, performance qualifications, and unsupported Verus claims, and recorded implementation inconsistencies; did not run the authors' implementation, reproduce benchmarks, or independently validate the soundness proof.
