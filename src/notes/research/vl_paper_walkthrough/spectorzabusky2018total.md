# Total Haskell is Reasonable Coq
(authored by agents unless marked 🧑)
Tag: `spectorzabusky2018total`, [paper](https://doi.org/10.1145/3167092)

## what is proved or measured
The paper presents hs-to-coq, a translator from total Haskell to Coq by shallow embedding. The abstract says: “we present a tool, named hs-to-coq, that translates total Haskell programs into Coq programs via a shallow embedding.” (Abstract, p. 1). Three case studies verify algebraic laws for the successors library, Hutton’s razor compiler correctness after making its executor total, and semantic correspondence and invariant preservation for GHC’s Bag module (Sections 2.1–2.3, pp. 2–5). For Bag, the authors report: “We verified nineteen different functions on Bags, and no proof was longer than eight lines (using the ssreflect tactic library [12]).” (Section 2.3, p. 5). These are verification case studies, not performance benchmarks.

## technique 1: translate total Haskell while preserving a live proof artifact

what it is: hs-to-coq aims to preserve names, types, modules, classes, and instances closely enough that users can prove properties of the generated program. Its example translates `map` to a Coq fixpoint and translates the list `Functor` instance. “Our tool translates this Haskell program automatically to the analogous Coq definitions.” (Section 1, p. 1). Names sometimes change to avoid conflicts or Coq keywords; basic types can be mapped to existing Coq types (Sections 2.1 and 4.1, pp. 3, 11).

when to use: the intended scope is inductive data and total, terminating functions. The authors state: “This process makes sense only for inductive data types and total, terminating functions.” (Section 1, p. 2). Inference: acceptance by Coq establishes termination of the translated recursive definitions when provisional axioms have been eliminated; it does not independently prove that the translator preserves Haskell semantics.

how to do it:
1. supply Haskell source and a separate file of declarative edits
2. parse and resolve names with GHC 8.0.2’s parser and renamer, before typechecking and desugaring (Section 3, p. 6)
3. translate files to Coq modules, qualify names, and require modules referenced by identifiers (Section 3.1, p. 6)
4. use edits to skip declarations, rename definitions, supply annotations or replacements, and correct declaration order as needed (Sections 3, 3.5–3.6, and 4.2)
5. prove properties over the translated definitions; address partiality and termination issues and inspect remaining assumptions (Section 3.7, pp. 9–10)

Verus form.

evidence and limits: partial pattern matches can introduce `patternFailure : forall {a}, a`; a `nonterminating` edit can replace recursion with `unsafeFix : forall {a}, (a -> a) -> a`. Both axioms are unsound. The authors recommend eliminating provisional axioms as necessary and using `Print Assumptions` to inspect dependencies. Options for termination include fuel, `Program Fixpoint` with a termination edit, handwritten Coq definitions, or refactoring (Section 3.7, pp. 9–10). Unsupported features can produce axioms with explanatory comments (Section 3.9, p. 10). The base translation skips IO, arrays, and selected partial operations (Section 4.3, p. 12).

## technique 2: law classes as reusable proof specifications

what it is: translate Haskell type classes and define parallel Coq classes containing their laws. `FunctorLaws` states identity and composition (Section 1, p. 1); `MonadLaws` states left identity, right identity, associativity, and the two relationships to Applicative operations (Figure 4, p. 4). A concrete instance of the law class supplies proofs of its fields.

how to apply it: translate the class and instance, state the laws as another Coq class, and prove the corresponding law instance. The successors source includes 80 lines of handwritten equational reasoning (Section 2.1, p. 3). The authors describe the Coq proofs as “straightforward and are analogous to the reasoning found in the handwritten 80 line comment in the library.” (Section 2.1, p. 4). Inference: later proofs can use the law class as an explicit premise.

Verus form. Inference: an analogous design could pair a Rust trait or ghost wrapper with specifications of its operations and proof lemmas for the laws. The paper provides no evidence about how Verus would resolve such obligations.

evidence and limits: the translation skips Monad’s `fail` method because it is frequently partial and impossible to implement in Coq for many monads, including Succs. It also translates the separate `MonadFail` class for monads with total implementations (Section 2.1, p. 3). This result concerns the translated interface and its retained methods.

## technique 3: totalize a partial compiler example before proving correctness

what it is: adapt Hutton’s razor so `exec` returns `Maybe Stack` and handles stack underflow, then prove `exec (comp e) [] = Just [eval e]` (Section 2.2 and Figure 5, p. 4). “Since Coq does not support partial functions, this posed an immediate problem.” (Section 2.2, p. 4).

how to apply it: change `exec`’s result type, add the final failure equation returning `Nothing`, translate, and prove compiler correctness. The authors say users can follow Hutton’s small equational reasoning steps or use Coq automation (Section 2.2, p. 4). Inference: this suggests expressing failure in the result type before verifying similar executors.

Verus form. Inference: executable Rust could return `Option<Stack>`, with an `ensures` clause relating compilation and interpretation and proof lemmas for recursive cases. This is a proposed transfer, not a case study in the paper.

evidence and limits: Section 3.7 (p. 10) also reports that the correctness theorem works before totalization, with the partial-match axiom present, because the theorem concerns programs and stacks that never trigger the failure. Inference: proving a particular theorem does not by itself show that all provisional assumptions have been removed.

## technique 4: invariant plus representation equivalence for a data structure

what it is: define the Boolean predicate `well_formed_bag`, prove semantic correspondence through `bagToList`, and prove invariant preservation for functions returning Bags. The invariants require both branches of `TwoBags` to be nonempty and the list in `ListBag` to be nonempty. Although Bags represent unordered collections with duplicates, the implementation preserves element order, enabling a list model (Section 2.3, p. 5).

how to apply it: use edits to skip irrelevant modules and declarations without changing the source, define the invariant, and prove up to two theorems per translated function: correspondence with a list operation and preservation of the invariant. Some results need well-formed inputs and others do not: `isEmptyBag_ok` requires the invariant, while `unionBags_ok` does not; `unionBags_wf` requires both input Bags to be well formed. The case study skips monadic functions and three further functions referring to untranslated code (Section 2.3, p. 5).

Verus form. Inference: a Rust Bag implementation could use a ghost sequence, a `well_formed` predicate, and separate proof obligations for semantic correspondence and preservation. A sequence would retain the stronger order property used in this case study; a multiset would specify only the unordered behavior.

evidence and limits: verification exposed a missing condition in `foldBag`’s documentation. Besides associativity of the combining operator, equality with the commented-out reference implementation requires the initial value to be its identity. The discrepancy had existed for over 21 years (Section 2.3, p. 5).

## techniques for the catalog
- total-source translation — translate terminating Haskell definitions into a live Coq program while preserving structure
- law-class specifications — encode algebraic laws as type-class fields and prove concrete instances
- totalization before proof — replace partial results with explicit option values before compiler-correctness proofs
- representation correspondence — prove operations equivalent to a simpler model and preserve an invariant
- declarative verification slicing — skip irrelevant modules and definitions through edit directives
