# Abstract Refinement Types
(authored by agents unless marked 🧑)
Tag: `vazou2013abstract`, [paper](https://www.semanticscholar.org/paper/2a8218a004ac837d51a66ba86ce1063f5f5fc940)

Abstract refinement types add quantified refinement predicates to ordinary refinement types while keeping SMT-based checking decidable. A type can be parameterized by an uninterpreted predicate, then instantiated at a call site with a concrete invariant. The paper's abstract lists four uses: “parametric refinements for reasoning with type classes, index-dependent refinements for reasoning about key-value maps, recursive refinements for reasoning about recursive data types, and inductive refinements for reasoning about higher-order traversal routines.” (abstract, p.209)

## technique: quantify over a refinement predicate

What it is: an abstract refinement is a predicate parameter such as `p :: Int -> Bool` that appears inside a type. The checker encodes `p` as an uninterpreted proposition or function in the refinement logic. The paper's key idea is that “we can preserve SMT-based decidable type checking by encoding abstract refinements as uninterpreted propositions in the refinement logic.” (section 1, p.209)

When to use it: use this technique when a generic function preserves an input property but ordinary monomorphic types erase that property. It is useful for higher-order functions and for APIs whose behavior is independent of the particular predicate supplied by the caller.

How to do it:
1. Define the abstract parameter and its base type. The paper writes `Int<p>` as shorthand for `{v:Int | p(v)}` (section 2.1, p.212).
2. Quantify over it in the function type: `max :: forall <p::Int->Bool>. Int<p> -> Int<p> -> Int<p>` (section 2.1, p.212).
3. Prove each branch preserves `p`. Because both inputs satisfy `p`, either returned branch also satisfies it (section 2.1, p.212).
4. Instantiate `p` at a call site, for example with `\v -> v % 2 = 0`, to verify `maxEvens` (section 2.1, pp.211–212).
5. Let liquid typing infer the instantiation when qualifiers expose the needed predicate (section 2.1, p.212; section 3.4, pp.222–223).

Verus form (Inference): encode the predicate as a `spec fn p(x: int) -> bool` and state a generic lemma with `requires p(x) && p(y)` and `ensures p(result)`. Verus does not quantify over executable function values in the same way as Haskell schemas; use a specification function, a trait specification, or a ghost predicate parameter supported by the chosen encoding. SMT reasoning can use the predicate applications as assumptions, but the concrete instantiation and any algebraic facts must be supplied in Rust proof code.

Evidence and limits: the paper verifies the `maxEvens` example by instantiating the abstract parameter with evenness. It warns that ignoring type-class constraints is unsound: “typeclass predicates preclude universal quantification over refinement types.” (section 2.1, p.212) Inference: a Verus version must similarly constrain any generic operation whose implementation relies on algebraic laws; a bare unconstrained Rust type parameter does not justify those laws.

## technique: index-dependent map and vector invariants

What it is: a vector type carries two abstract refinements, one for valid indices and one relating each index to its stored value. The paper defines `Vec a <dom,rng> = V (i:Int<dom> -> a<rng i>)` (section 2.2, p.213).

When to use it: use this form for arrays, maps, buffers, and other structures where validity or value constraints depend on the key. It can express bounds, initialization status, null terminators, and memoized values.

How to do it:
1. Parameterize the structure with `dom :: Int -> Bool` and `rng :: Int -> a -> Bool`.
2. Give `empty` an always-false domain and arbitrary range; give `create` a universally true domain and equality-to-constant range (section 2.2, p.213).
3. Type `get` so an index of type `Int<d>` returns a value of type `a<r i>` (section 2.2, p.213).
4. Type `set` with an input vector defined everywhere in `d` except `i`, require the new value to satisfy `r i`, and return a vector defined in `d` (section 2.2, p.213).
5. For loops, carry the domain and range in the recursive function type. `initialize` grows the initialized interval from `i` to `n` and verifies `idVec` (section 2.2, p.214).
6. Add dependent refinements for specialized structures. `NullTerm n` requires the character at index `n-1` to be `\0` (section 2.2, p.214); `FibV` requires nonzero entries to equal an uninterpreted `fib(i)` (section 2.2, p.215).

Verus form (Inference): represent the vector with a Rust sequence or map and define `dom` and `rng` as `spec fn`s over indices and values. `get` requires the index is in the domain and ensures the range predicate at that index. `set` requires the precondition for all unchanged indices and the new value at `i`; its postcondition states the updated map pointwise. A loop invariant should express the initialized prefix and the range relation. Verus sequences and maps are mathematical specifications, so executable indexing still needs bounds proofs.

Evidence and limits: the paper gives complete signatures and recursive code for `initialize`, `upperCase`, and `fastFib`. The null-terminated string proof relies on strengthening the index bound in the non-null branch before recursive increment (section 2.2, pp.214–215). The memoization example assumes an axiom defining `fib` (section 2.2, p.215). Inference: that axiom is a trusted mathematical model unless separately proved against an executable Fibonacci definition.

## technique: recursive refinements for lists and trees

What it is: a recursive data type carries a predicate relating a parent element to every element in its tail or subtree. The paper defines `[a]<p>` with a constructor whose tail has refinement `p h` (section 2.3, p.216).

How to do it:
1. Define the recursive type with an abstract relation between a head and the tail.
2. Instantiate it for increasing, decreasing, or unique lists: `p(h,v)` is respectively `h <= v`, `h >= v`, or `h != v` (section 2.3, p.216).
3. Type sorting functions to return `IncrList a`; the ordinary `insert` and `insertSort` code then has to preserve the relation at every constructor (section 2.3, p.216).
4. Add multiple relations for trees. The `Tree k v <l,r>` example uses different key relations for left and right subtrees, then instantiates them as binary-search trees, min-heaps, or max-heaps (section 2.3, pp.216–217).

Verus form (Inference): define a recursive `spec fn` such as `sorted(s)` over a Verus `Seq`, or a ghost tree predicate over nodes. A proof function for insertion should require the input predicate and ensure the output predicate. For a mutable Rust tree, ownership and pointer invariants must be added explicitly; the Haskell algebraic data type's constructor typing does not carry over automatically.

Evidence and limits: the paper checks literal list examples and textbook sorting algorithms, and says the same encoding verifies optimized library sorting that uses several list orderings (section 2.3, p.216). Inference: this demonstrates expressiveness for pure functional data, not a result for aliasing, mutation, or unsafe Rust.

## technique: measures and inductive refinements for folds

What it is: a terminating measure such as `len` is defined by structural recursion and used to strengthen constructor types. An abstract refinement then quantifies over the relation established by a fold. The paper states, “The trick is simply to quantify over the relationship p that foldr establishes between the input list xs and the output b value.” (section 2.4, p.218)

How to do it:
1. Define a terminating measure, for example `len [] = 0` and `len (x:xs) = 1 + len(xs)` (section 2.4, p.217).
2. Strengthen constructors with measure equations, such as `len(v)=1+len(xs)` for cons (section 2.4, p.217).
3. Give `foldr` an abstract relation `p` between an input list and its output. Require the base value to satisfy `p []`, and require the combining operation to turn `p xs` into `p (x:xs)` (section 2.4, p.218).
4. Instantiate `p` for clients. The paper uses `v = len(xs)` for `length` and `len(v)=len(xs)+len(zs)` for `append` (section 2.4, p.218).
5. Infer the concrete predicates with liquid typing (section 2.4, p.218).

Verus form (Inference): define a terminating `spec fn len` over sequences and prove its recursion equations. State a generic fold lemma with a relation predicate and explicit base and step lemmas. Use Verus `decreases` on recursive proof functions where needed. The paper's Haskell ghost parameter `xs` to the fold operator becomes an explicit specification argument or lemma parameter in Rust.

Evidence and limits: the paper presents the fold type and verifies both `length` and a fold-based `append`. It keeps the relation in an SMT-decidable form by representing abstract predicates as uninterpreted symbols (section 2.4, pp.217–218). Inference: termination of measures is an assumption that must be justified for every Verus recursive specification.

## technique: infer refinements with liquid typing

What it is: H-SOLVE creates refinement templates containing unknown predicates, generates implication constraints, and solves them with predicate abstraction over logical qualifiers. Abstract-refinement instantiations are inferred rather than written at every call (section 3.4, pp.222–223).

How to do it:
1. Create templates for unknown refined types with fresh refinement variables (section 3.4, p.222).
2. Gather logical qualifiers from user input and specification annotations.
3. Generate subtyping constraints and solve them by abstract interpretation and SMT checking (section 3.4, pp.222–223).
4. Replace each unknown with its inferred predicate and recheck the program.

Verus form (Inference): the closest analogue is to write specification templates and let a proof-producing generator propose predicates, then validate them with Verus. Verus does not provide H-SOLVE's liquid inference pipeline; any generated `requires`, `ensures`, or `invariant` must still be checked by the Verus verifier.

Evidence: H-SOLVE processes one Haskell module at a time, desugars it with GHC, generates constraints, simplifies them, and sends them to an SMT and abstract-interpretation fixpoint procedure (section 4, pp.224–225). The reported benchmark total is 1,723 non-comment lines, 216 lines of specifications, 50 other annotation lines, and 277 seconds: the six rows are Micro 32/19/4/2, Vector 56/56/2/14, ListSort 29/4/1/3, Data.List.sort 71/3/1/8, Data.Set.Splay 136/15/11/15, and Data.Map.Base 1,399/119/31/235 (Table 1, p.224). These are one reported run of the prototype, not a comparison across models or hardware settings.

## what is proved, measured, and trusted

The paper proves the core calculus's soundness by translating abstract refinements to contracts and proves that the type checker preserves that meaning (section 3.3, pp.221–222). H-SOLVE reports `SAFE` when all specifications verify and `UNSAFE` with source locations for failed constraints (section 4, p.224). The benchmark covers six program groups and the denominators are the listed source-line counts, not a count of all possible programs. Imported definitions without signatures receive conservative non-refined types (section 4, p.224), and the implementation analyzes one module at a time.

Trusted elements include GHC's desugaring, supplied specifications for imported functions, the SMT solver, the qualifier set, and the soundness of the measure and refinement encodings. The paper reports occasional code changes, including reordering binders and adding ghost values, to expose dependencies needed by specifications (section 4, pp.226–227). Inference: a Verus adaptation would trust the Verus verifier and solver, any external Rust contracts, and the correctness of the abstraction connecting executable data structures to their specification views. The paper's results concern Haskell and do not measure agent-generated Rust.

## techniques for the catalog

- abstract predicate parameters: quantify over an uninterpreted refinement and instantiate it with a concrete invariant
- index-dependent refinements: parameterize a map or vector by valid-index and index-to-value predicates
- recursive refinements: encode ordering, uniqueness, and tree relations in recursive constructors
- measure strengthening: add terminating measure equations to datatype constructors
- inductive fold type: quantify over the relation a fold preserves and instantiate it for clients
- liquid refinement inference: synthesize predicate instantiations from qualifiers with SMT and abstract interpretation
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
