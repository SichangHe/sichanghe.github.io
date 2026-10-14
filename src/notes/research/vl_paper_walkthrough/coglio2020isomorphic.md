# Isomorphic Data Type Transformations
(authored by agents unless marked 🧑)
Tag: `coglio2020isomorphic`, [paper](http://arxiv.org/abs/2009.13771v1)

## purpose and model

Coglio and Westfold describe APT transformations in ACL2 for replacing one data representation with an isomorphic one while generating theorems that relate old and new functions. The motivating pattern is stepwise refinement: an abstract specification is refined through intermediate specifications into an implementation. Isomorphic refinement changes representation without changing the represented values, for example finite sets to duplicate-free ordered lists or bit vectors, or records augmented with cached fields (pp. 125–126).

The abstract states the engineering payoff: “Because of the inherent symmetry of isomorphisms, these tools are also useful to verify existing programs, by turning more concrete data representations into more abstract ones to ease verification.” (p. 125). The paper's three tools are `defiso` for establishing a mapping, `isodata` for initiating a transformed function, and `propagate-iso` for propagating the transformation through callers and theorems (p. 128).

An isomorphism `ξ : X → X'` has inverse `ξ⁻¹`, and an output mapping `υ : Y → Y'` has inverse `υ⁻¹`. For a recursive function `f : X → Y`, the mechanically defined function is `f' = υ ◦ f ◦ ξ⁻¹`; induction proves the commuting relationship and transfers termination using the old measure composed with `ξ⁻¹` (pp. 126–127). The paper stresses interface discipline: “Typically, a data type will have relatively few interface functions that access the internals of the type.” (p. 125).

Inference: VL can use this as a representation-refinement pattern for Rust verified with Verus: define a mathematical view of a concrete structure, prove conversion inverses, and derive or verify optimized functions against the view. The paper uses ACL2, not Rust or Verus; every Verus mapping below is an inference.

## technique 1: establish a relativized isomorphism with `defiso`

Use this before transforming any function whose inputs or outputs change representation. ACL2 is untyped and functions are total, so `defiso` takes predicates `old` and `new`, a forward function `iso`, and an inverse `osi`. It attempts four applicability conditions (Section 3.1, pp. 128–129): old values map to new values; new values map back to old; `osi(iso(o)) = o` on old values; and `iso(osi(n)) = n` on new values. The paper says, “As in all APT transformations, it is the user’s responsibility to ensure that these conditions are proved” (p. 128).

Steps:
1. Define predicates for the old and new representations.
2. Define executable conversions `iso` and `osi`.
3. Prove the two representation-preservation implications.
4. Prove both inverse equations under their respective predicates.
5. Call `defiso`; it generates injectivity theorems and records the mapping in an ACL2 table (pp. 128–129).
6. Optionally enable guard conditions requiring `iso` only on old values and `osi` only on new values (p. 129).

The generated injectivity theorem states that two old values have equal images exactly when they are equal, and similarly for new values (p. 128). The paper's proof obligations are assumptions supplied by the developer; `defiso` does not discover a false mapping.

Inference: In Verus, define conversion `spec fn`s or executable conversion functions with `requires old_view(x)` and `ensures new_view(result)`. Add lemmas proving `from(to(x)) == x` and `to(from(y)) == y` under the respective predicates. A `proof fn` can package injectivity from the inverse lemma. Verus has no ACL2 table, so the mapping must be named and passed explicitly to later lemmas. The old and new predicates are ordinary specifications, not runtime type checks.

## technique 2: initiate a function transformation with `isodata`

Use `isodata` when a function directly manipulates values of the transformed type. Given a guarded recursive ACL2 function, `isodata` checks that the function maps old inputs to old outputs, recursive arguments remain old, and (when guard verification is enabled) the function guard implies the old representation (Section 3.2, pp. 129–130). It then generates a new function whose guard uses `new`, whose body converts inputs with `osi`, executes the old body, and converts outputs with `iso`.

For a schematic function

```
(defun f (x)
  (if (a x) (b x) (c x (f (d x)))))
```

`isodata` generates the corresponding `f1` with `osi` on inputs, `iso` on outputs, and `iso`/`osi` around recursive calls (p. 129). It also generates theorems `f(x) = osi(f1(iso(x)))`, `f1(x) = iso(f(osi(x)))`, and preservation of the new representation (pp. 130–131). Termination uses the old measure applied to `osi(x)`, and an `mbt$` wrapper makes the untyped guard branch unreachable outside `new` (p. 130).

Steps: specify which arguments and results use each isomorphism; prove the applicability conditions; generate the converted recursive definition; discharge guard and termination obligations; prove both directions of the function relationship; simplify away conversion pairs when possible (Sections 3.2, pp. 129–131).

Inference: In Verus, keep the original executable function as the reference and write a second function over the concrete representation. State a view relation in a `spec fn`; give the new function `requires` for the concrete representation and `ensures` that its view equals the old function's result. Prove recursive termination with the appropriate `decreases` measure and prove the conversion round trips with lemmas. The paper's automatic `mbt$` branch has no direct Verus equivalent; Rust's type and contract system should make out-of-domain calls unrepresentable or explicitly reject them.

## technique 3: propagate transformations through interfaces and callers

Use `propagate-iso` after initiating transformations for the small set of interface functions that expose a data type. It traverses ACL2's event history to find functions and theorems that directly or indirectly reference the interfaces, infers argument and result types from guards and theorem statements, and generates transformed versions (Section 3.3, p. 131).

When the transformed type appears inside a larger one, `propagate-iso` constructs a dependent isomorphism by mapping each component with the base conversion and using identity for other components (p. 131). For a pair containing a natural number and an old value, it generates a new predicate and two conversions that preserve the natural component and transform only the old component (p. 131). For a list of transformed values, it recursively maps each element and constructs the inverse list conversion (pp. 137–138).

Steps: identify the interface event range; infer transformed argument/result positions; generate dependent predicates and conversions for records, lists, or maps; generate transformed function definitions; generate theorem proofs using old-to-new and new-to-old rules; allow user hints if generated proofs fail (pp. 131–132, 137–139).

Proof strategy: transformed hints are tried first; if they fail, `propagate-iso` tries proving the new theorem by using the old theorem instantiated with new-to-old conversions; as a last resort it tries the current theory (p. 132). The authors report that generated hints proved all the theorems in the drone example, but they also state that hints are “not alway guaranteed to succeed” (p. 132).

Inference: In Verus, this is a dependency-graph workflow: start from conversion lemmas for public accessors, then add view-preservation lemmas for every caller. For a `Vec<T>`, define a `Seq` conversion by mapping each element; for a record, transform only the selected field and prove all unaffected fields equal. A `proof fn` can reuse the old function's `ensures` through the conversion theorem. Verus has no automatic event-history traversal, so VL would need a source-level call-graph pass.

## technique 4: simplify conversions into direct concrete operations

The generated isodata body may contain repeated `iso(osi(...))` conversions. APT's `simplify` transformation rewrites these using conversion theorems and user-enabled distributive rules. In the bounded-integer example, `isodata` converts a Java-like 32-bit implementation to an unbounded-integer representation; `simplify` removes bounded operations and produces direct arithmetic over the new type (pp. 132–134). The paper's transformed `drawline-loop2` replaces 32-bit operations with `<`, `+`, and multiplication while preserving the relationship theorem (p. 134).

Steps: generate the isomorphic function; collect rewrite rules for conversion inverses and transformed interface operations; invoke `simplify`; inspect the resulting definition; prove the simplification theorem from the isodata relationship (pp. 133–134).

Inference: In Verus, this corresponds to proving a `spec fn` view equality between an optimized function and a wrapper that converts to an abstract type, runs the reference, and converts back. Rewrite lemmas can be supplied with `assert` blocks or proof lemmas. The optimized body must still satisfy the executable function's `ensures`; a theorem about the wrapper alone does not verify the optimized Rust implementation.

## technique 5: re-index a loop through an isomorphism

Use this when a loop's state space has a bijection that makes iteration direction or representation more convenient. Section 4.2 maps `n ∈ {0,…,10}` to `10−n`, using the same function as inverse. Applying `isodata` to a countdown recursion produces an increasing recursion; `simplify` yields a loop that tests `n < 10` and calls itself with `n+1` (pp. 134–135).

Steps: define the finite-domain isomorphism and prove inverse equations; apply `isodata` to the loop index; simplify arithmetic conversions; check the new termination measure; prove the old and new loops' result relationship (pp. 134–135). The paper notes that the new measure is `acl2-count (+ 10 (- n))`, which decreases as the increasing loop approaches its bound (p. 135).

Inference: In Verus, state the index relation in a loop `invariant`, and use a `decreases` expression based on the remaining distance to the bound. Prove that each `n+1` step corresponds to one old `n−1` step under the conversion. The executable Rust loop can count up while the specification remains count-down; the relation must cover all intermediate states, not only final outputs.

## technique 6: refine a record with cached fields and maintain the invariant

Use this when recomputing derived fields is expensive. The drone planner's `dr-state` contains an identifier, graph, visited nodes, and path. The extended record adds `unvisited-nodes` and `currentpos`; a predicate restricts those fields to equal functions of the original fields (Section 4.3, pp. 136–137). `to-dr-state-ext` computes the fields, while `from-dr-state-ext` drops them. The isomorphism is established with `defiso` and accessor theorems.

`extend-path-taken` updates visited nodes and path. After propagation, `isodata` produces an extended function, and `simplify` rewrites it to update `unvisited-nodes` by set difference and `currentpos` from the last plan element (pp. 137–139). The final propagation generates 32 translated functions, six isomorphisms including four translator functions, and 317 non-local theorems, all proved with automatically generated hints (p. 139).

Steps: define the extended record; define a well-formedness predicate equating each cache to its derivation; prove conversions are inverse on well-formed states; transform interface predicates and accessors; transform mutators; simplify to incremental cache updates; propagate theorems through all callers; verify that every update preserves the cache equations (pp. 136–139).

Inference: In Verus, represent cached fields in a Rust struct and define a `spec fn` view that recomputes them from authoritative fields. The constructor `requires` the cache invariant; each mutator's `ensures` preserves it. The optimization is safe only if the view equality is proved after every mutation. Unlike ACL2's total functions, Rust ownership and mutability can make stale aliases observable, so borrow contracts are an additional proof obligation.

## evidence, limits, and trust boundary

The paper reports worked examples rather than a controlled performance study. The drone example's exact counts are 32 translated functions, six isomorphisms, and 317 non-local theorems (p. 139); no denominator, runtime, or failure rate is supplied. The tools support nonrecursive functions and recursive functions with multiple bases or calls, but not mutually recursive functions, and tuple transformations are not yet supported (p. 130). `propagate-iso` handles lists and records through generated dependent isomorphisms, while richer non-isomorphic mappings remain future work (pp. 139–140).

The trusted assumptions are the applicability conditions supplied by the user, ACL2's prover and guard/termination reasoning, and the correctness of the old function and its theorems. The paper explicitly says generated proof hints can fail and permits user augmentation (p. 132). Isomorphism preserves behavior only on the predicates where inverse equations hold; it does not justify calls outside those predicates.

Inference: For VL, this technique lowers the threat of representation changes by making a concrete-to-abstract view a first-class contract. It does not prove that a cache update is correct unless every mutator is transformed and checked, and it does not cover non-bijective changes such as lossy compression. Existing Verus studies already cover `spec fn` views, `ensures`, loop invariants, and proof lemmas; VL should reuse them. The distinct contribution is a repeatable pipeline for deriving and auditing concrete functions from an isomorphic specification, including explicit inverse and cache invariants.

## techniques for the catalog

- relativized isomorphism: prove representation-preserving conversions and inverse equations under old and new predicates
- isodata initiation: generate a converted recursive or nonrecursive function plus bidirectional relationship and termination theorems
- propagate-iso: traverse interface callers and lift a base isomorphism through records, lists, and other containers
- conversion simplification: rewrite generated conversion wrappers into direct operations using interface and inverse lemmas
- loop re-indexing: use a finite-domain bijection to reverse iteration direction while preserving results and termination
- cached-record refinement: add derived fields, constrain them with an invariant, and incrementally maintain them in transformed mutators
- proof-hint fallback: try transformed hints, then instantiate old theorems through inverse conversions, with user hints as a final fallback
Checked 2026-10-14: audit record coglio2020isomorphic; paper-study comparison complete; gate executed; experiments not rerun
