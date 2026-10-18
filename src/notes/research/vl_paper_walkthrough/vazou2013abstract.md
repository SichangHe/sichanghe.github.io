# Abstract Refinement Types
(authored by agents unless marked 🧑)
Tag: `vazou2013abstract`, [paper](https://www.semanticscholar.org/paper/2a8218a004ac837d51a66ba86ce1063f5f5fc940)

Abstract refinement types add quantified refinement predicates to ordinary refinement types while keeping SMT-based checking decidable. A type can be parameterized by an uninterpreted predicate, then instantiated at a call site with a concrete invariant. The paper's abstract lists four uses: “parametric refinements for reasoning with type classes, index-dependent refinements for reasoning about key-value maps, recursive refinements for reasoning about recursive data types, and inductive refinements for reasoning about higher-order traversal routines.” (abstract, p.209)

## technique: quantify over a refinement predicate

What it is: an abstract refinement is a predicate parameter such as `p :: Int -> Bool` that appears inside a type. The checker encodes `p` as an uninterpreted proposition or function in the refinement logic. The paper's key idea is that “we can preserve SMT-based decidable type checking by encoding abstract refinements as uninterpreted propositions in the refinement logic.” (section 1, p.210)

When to use it: use this technique when a generic function preserves an input property but ordinary monomorphic types erase that property. It is useful for higher-order functions and for APIs whose behavior is independent of the particular predicate supplied by the caller.

How to do it:
1. Define the abstract parameter and its base type. The paper writes `Int<p>` as shorthand for `{v:Int | p(v)}` (section 2.1, p.212).
2. Quantify over it in the function type: `max :: forall <p::Int->Bool>. Int<p> -> Int<p> -> Int<p>` (section 2.1, p.212).
3. Prove each branch preserves `p`. Because both inputs satisfy `p`, either returned branch also satisfies it (section 2.1, p.212).
4. Instantiate `p` at a call site, for example with `\v -> v % 2 = 0`, to verify `maxEvens` (section 2.1, pp.211–212).
5. Let liquid typing infer the instantiation when qualifiers expose the needed predicate (section 2.1, p.212; section 3.4, p.223).

Verus form (Inference): encode the predicate as a `spec fn p(x: int) -> bool` and state a generic lemma with `requires p(x) && p(y)` and `ensures p(result)`. Verus does not quantify over executable function values in the same way as Haskell schemas; use a specification function, a trait specification, or a ghost predicate parameter supported by the chosen encoding. SMT reasoning can use the predicate applications as assumptions, but the concrete instantiation and any algebraic facts must be supplied in Rust proof code.

Evidence and limits: the paper verifies the `maxEvens` example by instantiating the abstract parameter with evenness. It warns that ignoring type-class constraints is unsound: “typeclass predicates preclude universal quantification over refinement types.” (section 2.1, p.212) Inference: a Verus version must similarly constrain any generic operation whose implementation relies on algebraic laws; a bare unconstrained Rust type parameter does not justify those laws.

## technique: index-dependent map and vector invariants

What it is: a vector type carries two abstract refinements, one for valid indices and one relating each index to its stored value. The paper defines `Vec a <dom,rng> = V (i:Int<dom> -> a<rng i>)` (section 2.2, p.213).

When to use it: use this form for arrays, maps, buffers, and other structures where validity or value constraints depend on the key. It can express bounds, initialization status, null terminators, and memoized values.

How to do it:
1. Parameterize the structure with `dom :: Int -> Bool` and `rng :: Int -> a -> Bool`.
2. Give `empty` an always-false domain and arbitrary range; give `create` a universally true domain and equality-to-constant range (section 2.2, p.213).
3. Type `get` so an index of type `Int<d>` returns a value of type `a<r i>` (section 2.2, p.213).
4. Type `set` with an input vector defined everywhere in `d` except `i`, require the new value to satisfy `r i`, and return a vector defined in `d` (section 2.2, pp.213–214).
5. For loops, carry the domain and range in the recursive function type. `initialize` grows the initialized interval from `i` to `n` and verifies `idVec` (section 2.2, p.214).
6. Add dependent refinements for specialized structures. `NullTerm n` requires the character at index `n-1` to be `\0` (section 2.2, p.214); `FibV` requires nonzero entries to equal an uninterpreted `fib(i)` (section 2.2, p.215).

Verus form (Inference): represent the vector with a Rust sequence or map and define `dom` and `rng` as `spec fn`s over indices and values. `get` requires the index is in the domain and ensures the range predicate at that index. `set` requires the precondition for all unchanged indices and the new value at `i`; its postcondition states the updated map pointwise. A loop invariant should express the initialized prefix and the range relation. Verus sequences and maps are mathematical specifications, so executable indexing still needs bounds proofs.

Evidence and limits: the paper gives complete signatures and recursive code for `initialize`, `upperCase`, and `fastFib`. The null-terminated string proof relies on strengthening the index bound in the non-null branch before recursive increment (section 2.2, pp.214–215). The memoization example assumes an axiom defining `fib` (section 2.2, p.215). Inference: that axiom is a trusted mathematical model unless separately proved against an executable Fibonacci definition.

## technique: recursive refinements for lists and trees

What it is: a recursive data type carries a predicate relating a parent element to every element in its tail or subtree. The paper defines `[a]<p>` with a constructor whose tail has refinement `p h` (section 2.3, p.216).

How to do it:
1. Define the recursive type with an abstract relation between a head and the tail.
2. Instantiate it for increasing, decreasing, or unique lists: `p(h,v)` is respectively `h <= v`, `h >= v`, or `h != v` (section 2.3, p.216).
3. Type sorting functions to return `IncrList a`; the paper does this for `insertSort` and `insert` and writes that “the usual algorithms produce sorted lists” can be verified (section 2.3, p.216).
4. Add multiple relations for trees. The `Tree k v <l,r>` example uses different key relations for left and right subtrees, then instantiates them as binary-search trees, min-heaps, or max-heaps (section 2.3, p.217).

Verus form (Inference): define a recursive `spec fn` such as `sorted(s)` over a Verus `Seq`, or a ghost tree predicate over nodes. A proof function for insertion should require the input predicate and ensure the output predicate. For a mutable Rust tree, ownership and pointer invariants must be added explicitly; the Haskell algebraic data type's constructor typing does not carry over automatically.

Evidence and limits: section 2.3 checks literal list examples and shows `insertSort` (p.216). The evaluation reports verifying insert-, merge- and quick-sort (ListSort) and the three optimized `Data.List.sort` algorithms, which use increasing and decreasing lists, as producing `IncrList a` (section 4, p.225; sizes in Table 1, p.224). Inference: this demonstrates expressiveness for pure functional data, not a result for aliasing, mutation, or unsafe Rust.

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

What it is: the Liquid Types method, which the paper recalls and extends in section 3.4 (p.223), creates refinement templates containing unknown predicates, generates implication constraints, and solves them with monomial predicate abstraction over logical qualifiers. For abstract refinements, the argument of each refinement application gets a template `λx1:τ1 ... λxn:τn.κ` and `κ` is solved the same way, so instantiations are inferred rather than written at every call.

How to do it:
1. Create templates for unknown refined types with fresh refinement variables (section 3.4, p.222).
2. Gather logical qualifiers: H-SOLVE takes optional user-provided qualifiers and also uses qualifiers mined from the refinement type annotations in the program (section 4, p.224).
3. Generate subtyping constraints, simplify them to logical implication constraints, and solve them by abstract interpretation (section 3.4, p.223); H-SOLVE sends them to an SMT- and abstract-interpretation-based fixpoint procedure (section 4, p.225).
4. Replace each unknown `κ` with its solution to get the inferred refinement instantiations (section 3.4, p.223).

Verus form (Inference): the closest analogue is to write specification templates and let a proof-producing generator propose predicates, then validate them with Verus. Verus does not provide H-SOLVE's liquid inference pipeline; any generated `requires`, `ensures`, or `invariant` must still be checked by the Verus verifier.

Evidence: H-SOLVE processes one Haskell module at a time, desugars it with GHC, generates constraints, simplifies them, and sends them to an SMT and abstract-interpretation fixpoint procedure (section 4, pp.224–225). The reported benchmark total is 1,723 non-comment lines, 216 lines of specifications, 50 other annotation lines, and 277 seconds: the six rows are Micro 32/19/4/2, Vector 56/56/2/14, ListSort 29/4/1/3, Data.List.sort 71/3/1/8, Data.Set.Splay 136/15/11/15, and Data.Map.Base 1,399/119/31/235 (Table 1, p.224). Inference: the paper gives no hardware, solver version or number of runs for these times, and Table 1 contains no comparison with other tools.

## what is proved, measured, and trusted

For the core calculus λP, the paper does not re-prove preservation and progress. It translates λP into the contract calculus FH of Belo et al. [1], states by induction on derivations that λP's typing rules conservatively approximate FH's, and derives preservation and progress from [1] (section 3.3, p.222). The section 4 intro defers extending the metatheory to a call-by-name calculus, which Haskell needs, to future work (section 4, p.223); so the soundness result does not directly cover H-SOLVE's Haskell setting. H-SOLVE reports `SAFE` when all specifications verify and `UNSAFE` with source locations for failed constraints (section 4, p.224). The benchmark covers six program groups and the denominators are the listed source-line counts, not a count of all possible programs. Imported definitions without signatures receive conservative non-refined types (section 4, p.224), and the implementation analyzes one module at a time.

Inference: trusted elements include GHC's desugaring, supplied specifications for imported functions (the paper says they “are assumed to hold”, section 4, p.224), the SMT solver, and the soundness of the measure and refinement encodings. The qualifier set affects only what can be inferred, since inferred types are still checked. The paper reports occasional code changes, including reordering binders and adding ghost values, to expose dependencies needed by specifications (section 4, pp.226–227). Inference: a Verus adaptation would trust the Verus verifier and solver, any external Rust contracts, and the correctness of the abstraction connecting executable data structures to their specification views. The paper's results concern Haskell and do not measure agent-generated Rust.

## techniques for the catalog

- abstract predicate parameters: quantify over an uninterpreted refinement and instantiate it with a concrete invariant
- index-dependent refinements: parameterize a map or vector by valid-index and index-to-value predicates
- recursive refinements: encode ordering, uniqueness, and tree relations in recursive constructors
- measure strengthening: add terminating measure equations to datatype constructors
- inductive fold type: quantify over the relation a fold preserves and instantiate it for clients
- liquid refinement inference: synthesize predicate instantiations from qualifiers with SMT and abstract interpretation
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Abstract refinements allow us to solve this problem with a very expressive type for foldr whilst remaining firmly within the boundaries of SMT-based decidability."): read the whole paper text and checked every quotation, the Table 1 numbers and totals (sums verified), section and page references, and the technique steps; changed page numbers (key-insight quote is on p.210, section 3.4 is p.223 only, `set` explanation spans pp.213-214, Tree is p.217, soundness section 3.3 is p.222), the description of the soundness argument (derived from the FH calculus, call-by-name metatheory deferred), the liquid-inference steps (these recall the Liquid Types method rather than H-SOLVE-specific steps; added the qualifier source and removed an unsupported "recheck" step), the sorting evidence, and marked trusted-element and run-count remarks as Inference; the tag line is kept and the link is from the fetch record (the paper text gives no DOI); not checked: the Verus-form paragraphs (my own inferences, not in the paper), cited external works, the PDF layout of equations beyond the text extraction, and the benchmark programs themselves.
