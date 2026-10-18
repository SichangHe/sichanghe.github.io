# Primrose: Selecting Container Data Types by Their Properties
(authored by agents unless marked 🧑)
Tag: `qina2022primrose`, [paper](https://doi.org/10.22152/programming-journal.org/2023/7/11)

Primrose lets an application specify a container’s interface and semantic behavior, then selects an implementation whose formal library specification satisfies those requirements and ranks valid choices by runtime performance. The prototype preprocesses annotated Rust, represents container behavior with abstract lists, encodes selection conditions in Rosette, and asks an SMT solver for counterexamples. The paper’s abstract describes the goal as selecting “the best performing valid container implementation from a set of container data types that satisfy properties given by application developers.”

## property specifications

What it is. A syntactic property is a Rust trait such as `ContainerT`, `IndexableT`, or `StackT`. A semantic property is a logical predicate over a placeholder container type. A refinement type combines them, for example `type UniqueCon<T> = {c <: (ContainerT) | (unique c)}` or `type StackCon<T> = {c <: (ContainerT, StackT) | (lifo c)}` (§4, p. 7; §4.3, p. 11). Page numbers in this study are the article page numbers 11:N printed in the paper.

When to use it. Use this when an application needs observable behavior but should not commit to a data structure. For a set, write uniqueness; for an ordered container, write an ascending predicate; for a stack, write that `pop(push(c,x))` returns `x`.

How to apply it.

1. Declare the required interface as a trait. `ContainerT` in the paper includes `len`, `contains`, `is_empty`, `insert`, `clear`, and `remove`; `IndexableT` includes `first`, `last`, and `nth` (§4.1, p. 8).
2. Define a semantic predicate over the abstract container. The uniqueness example is `property unique { \c −> (for−all−elems (\a −> (unique−count? a c)) c) }` (Fig. 1b, p. 4; §4, p. 7).
3. Combine interface and predicate in a refined type, such as `AscendingIndexableCon<T> = {c <: (ContainerT, IndexableT) | (ascending c)}` (§6.1, p. 17).
4. Use the refined type in ordinary application code. Primrose preprocesses it and generates code for each implementation that passes selection (§3, pp. 5–6; §6.4, p. 20).

Verus form. Inference: write the semantic requirement as a `spec fn` over a ghost `Seq<T>` representation and expose only a verified Rust trait. An executable function can carry `requires` for the representation invariant and `ensures` that each operation preserves the `spec fn`. A generated implementation must still be verified against the fixed trait contract. Verus does not select an implementation from a library automatically; the selection pass would be external tooling.

## model-based library specifications

What it is. A library developer writes one Hoare triple per operation over a logical list model, independent of the concrete representation. The paper says: “Library specifications abstract over Rust implementations, providing a clear definition of intended semantics of each operation, without respect to performance or implementation details.” (§5, p. 11). For insertion, the abstract operation returns a new list and its postcondition equates that result with `model-insert`; for `contains`, the returned list is equal to the input, expressing non-mutation; for `remove`, the result is a pair of a list and an optional removed element (§5.2, pp. 13–14).

How to apply it.

1. Choose an abstract representation, here a Rosette list, even when the implementation is a tree or hash table (§5.1, p. 11).
2. Define a model operation. The paper’s list insertion is `(define (model−insert xs x) (append xs (list x)))` (§5.2, p. 13).
3. State a Hoare triple whose postcondition equates the abstract result to the model operation. For LinkedList insertion, the paper uses `{xs0 . true} abs-insert {xs0 x xs. xs = model-insert xs0 x}` (§5.2, p. 13).
4. Specify every operation exposed by every implemented trait. The paper says that without completeness “Primrose could possibly rule out perfectly valid implementations” (§5.1, p. 13); it requires that “each operation of the LinkedList is specified by a trait” and has similar specifications for each operation (§5.2, p. 14).
5. Define an abstraction function from each concrete container to the model list. For a tree this can be an in-order traversal; for a HashSet it collects elements into a list and sorts them (§5.1, p. 12; §5.3, p. 15; §5.4, p. 16).
6. Establish forward simulation: every concrete operation has a corresponding abstract operation under the abstraction function. The paper states: “If a forward simulation is shown for all operations, we can conclude that each possible execution with the concrete container has a corresponding execution with an abstract list, thus the specification accurately captures the implementation’s semantics.” (§5.1, p. 12).
7. Prefer deterministic model operations when possible. Determinism plus forward simulation gives completeness, so the selector does not reject implementations merely because an operation is incompletely specified (§5.1, p. 13). The paper states: “Our approach easily ensures completeness when each operation is specified by a deterministic model operation.”

Verus form. Inference: model the representation with a `spec fn` abstraction and state each operation’s abstract effect in `ensures`. A `proof fn` can show that the concrete vector, tree, or hash table maps to the same abstract `Seq` before and after the operation. The forward-simulation relation becomes a lemma over pre-state and post-state. Verus can prove one implementation against a contract, but it does not provide Primrose’s relation-level semantics, where the abstract operation is “the maximal relation satisfying the Hoare triple” (§5.1, p. 12), without a custom model.

Failure and assumptions. The paper abstracts a HashSet as a sorted list of unique elements, so an ordering property such as `ascending` would be trivially satisfied by the abstraction though not by the implementation. Primrose avoids this through syntactic trait checking: “The HashSet type does not implement any trait with operations that allow the ordering of its elements to be observed.” If a library developer writes a HashSet with operations that leak ordering, the paper says they “can provide a nondeterministic library specification” (§5.4, p. 16). Inference: the abstraction is only safe if no exposed operation distinguishes the abstract order from the real one.

## SMT selection with a non-vacuity side condition

What it is. Primrose first filters candidates by required traits, then translates semantic properties and model operations into Rosette and generates verification conditions for every operation. The solver searches for a counterexample to property preservation. For BTreeSet insertion and the `ascending` property, the condition requires `ascending(xs0)`, the precondition `xs0 = dedup(sort xs0 <)`, and a post-state produced by the model operation, then asks whether `ascending(xs)` can be false (Fig. 5; §6.2, p. 18).

How to apply it.

1. Filter the library by syntactic traits. In the paper’s ascending example, HashSet is removed because it does not implement `IndexableT`; Vec, LinkedList, and BTreeSet remain (§6.1, p. 17).
2. Translate the property to Rosette. The paper’s ascending definition is `(define ascending (lambda (c) (for−all−consecutive−pairs c leq?)))` (§6.2, p. 18).
3. For each candidate operation, instantiate the general condition `P(xs0) ⇒ P(xs)` where `xs` is constrained by the library operation’s postcondition (§6.2, p. 18; Fig. 6, p. 19).
4. Add the side condition that some `xs0` satisfies both the property and the operation precondition. The authors warn: “Without the side condition, the rule is unsound.” (§6.2, p. 18).
5. Ask the SMT solver for a counterexample up to a configured input model size. The paper says the search “is parameterised by a model size, which denotes the maximum size of the input list” and that if no counterexample is found “the solver will conclude that the operation BTreeSet::insert satisfies the property ascending” (§6.2, p. 18). Inference: acceptance is therefore relative to the bounded model size; §7.2, p. 22 appeals to the small scope hypothesis for sizes beyond five.
6. Repeat for every operation in every required trait. A candidate is valid only when all checks pass.

Verus form. Inference: keep the semantic predicate and operation contract as Verus `spec fn`s and `ensures`, and use a `proof fn` to prove preservation for all abstract sequences rather than bounded model size. The non-vacuity condition becomes a `requires` or a separate satisfiability lemma ensuring that at least one state meets the property. Bounded counterexample search can remain an external Z3 harness, but it is evidence rather than a universal Verus proof.

## property interactions and code generation

Properties can refer to operations supplied by traits. For `lifo`, Primrose substitutes each candidate’s model `push` and `pop` into the Rosette definition of `lifo` (§6.3, p. 19). The paper’s LIFO model (`model−push−front`) appends the pushed element to the end of the list and pops the last element, and the solver verifies `lifo`; the FIFO model (`model−push−end`) prepends the pushed element and pops the last element, and the solver “correctly concludes that this library specification does not satisfy the semantic property lifo” (§6.3, pp. 19–20). Both implementations have similarly shaped Hoare triples. After selection, Primrose generates a Rust program per valid candidate and, in practice, uses Rust trait objects that expose only the operations in the traits named as syntactic properties (§6.4, p. 20).

The final ranking step executes the generated programs for each valid candidate and measures their runtime “on some test input data” (§6.4, p. 20). The paper calls this a “proof-of-concept implementation” and says “We anticipate adopting more sophisticated ranking techniques” in the future.

Verus form. Inference: generate a Rust module per candidate, instantiate the same verified trait contract, and run benchmarks only after verification. Keep the semantic `spec fn` fixed across candidates so performance ranking cannot weaken correctness. A candidate-specific `proof fn` can discharge the trait and property lemmas.

## techniques for the catalog

- refinement property types: combine trait interfaces with semantic predicates so application code names behavior instead of an implementation
- model-based library contracts: specify concrete containers with Hoare triples over an abstract list and an abstraction function
- forward simulation and completeness: require concrete operations to correspond to deterministic abstract model operations
- non-vacuous SMT selection: check every operation for property preservation and require a satisfiable precondition/property state
- property-based contract validation: test concrete implementations against model specifications with generated inputs
- verified-then-benchmarked generation: generate one program per valid implementation and rank only after semantic filtering
