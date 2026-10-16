# Primrose: Selecting Container Data Types by Their Properties
(authored by agents unless marked 🧑)
Tag: `qina2022primrose`, [paper](https://www.semanticscholar.org/paper/246f085c80981da870df7fa12490f15a0b60313d)

Primrose lets an application specify a container’s interface and semantic behavior, then selects an implementation whose formal library specification satisfies those requirements and ranks valid choices by runtime performance. The prototype preprocesses annotated Rust, represents container behavior with abstract lists, encodes selection conditions in Rosette, and asks an SMT solver for counterexamples. The paper’s abstract describes the goal as selecting “the best performing valid container implementation from a set of container data types that satisfy properties given by application developers.”

## property specifications

What it is. A syntactic property is a Rust trait such as `ContainerT`, `IndexableT`, or `StackT`. A semantic property is a logical predicate over a placeholder container type. A refinement type combines them, for example `type UniqueCon<T> = {c <: (ContainerT) | (unique c)}` or `type StackCon<T> = {c <: (ContainerT, StackT) | (lifo c)}` (§4, pp. 9–10).

When to use it. Use this when an application needs observable behavior but should not commit to a data structure. For a set, write uniqueness; for an ordered container, write an ascending predicate; for a stack, write that `pop(push(c,x))` returns `x`.

How to apply it.

1. Declare the required interface as a trait. `ContainerT` in the paper includes `len`, `contains`, `is_empty`, `insert`, `clear`, and `remove`; `IndexableT` includes `first`, `last`, and `nth` (§4, pp. 9–10).
2. Define a semantic predicate over the abstract container. The uniqueness example is `property unique { \c −> (for−all−elems (\a −> (unique−count? a c)) c) }` (Fig. 1b; §4, p. 9).
3. Combine interface and predicate in a refined type, such as `AscendingIndexableCon<T> = {c <: (ContainerT, IndexableT) | (ascending c)}` (§6.1, p. 17).
4. Use the refined type in ordinary application code. Primrose preprocesses it and generates code for each implementation that passes selection (§3, pp. 5–6).

Verus form. Inference: write the semantic requirement as a `spec fn` over a ghost `Seq<T>` representation and expose only a verified Rust trait. An executable function can carry `requires` for the representation invariant and `ensures` that each operation preserves the `spec fn`. A generated implementation must still be verified against the fixed trait contract. Verus does not select an implementation from a library automatically; the selection pass would be external tooling.

## model-based library specifications

What it is. A library developer writes one Hoare triple per operation over a logical list model, independent of the concrete representation. The paper says: “Library specifications abstract over Rust implementations, providing a clear definition of intended semantics of each operation, without respect to performance or implementation details.” (§5, p. 11). For insertion, the abstract operation returns a new list and its postcondition equates that result with `model-insert`; for `contains`, the returned list is equal to the input, expressing non-mutation; for `remove`, the result is a list and an optional removed element (§5.2, pp. 12–14).

How to apply it.

1. Choose an abstract representation, here a Rosette list, even when the implementation is a tree or hash table (§5.1, p. 11).
2. Define a model operation. The paper’s list insertion is `(define (model−insert xs x) (append xs (list x)))` (§5.2, p. 13).
3. State a Hoare triple whose postcondition equates the abstract result to the model operation. For LinkedList insertion, the paper uses `{xs0 . true} abs-insert {xs0 x xs. xs = model-insert xs0 x}` (§5.2, p. 13).
4. Specify every operation exposed by every implemented trait. An incomplete library specification can make a valid implementation appear invalid (§5.1, p. 12).
5. Define an abstraction function from each concrete container to the model list. For a tree this can be an in-order traversal; for a HashSet it collects and sorts elements (§5.1, pp. 12, 15).
6. Establish forward simulation: every concrete operation has a corresponding abstract operation under the abstraction function. The paper states: “If a forward simulation is shown for all operations, we can conclude that each possible execution with the concrete container has a corresponding execution with an abstract list.” (§5.1, p. 12).
7. Prefer deterministic model operations when possible. Determinism plus forward simulation gives completeness, so the selector does not reject implementations merely because the model is too weak (§5.1, pp. 12–13).

Verus form. Inference: model the representation with a `spec fn` abstraction and state each operation’s abstract effect in `ensures`. A `proof fn` can show that the concrete vector, tree, or hash table maps to the same abstract `Seq` before and after the operation. The forward-simulation relation becomes a lemma over pre-state and post-state. Verus can prove one implementation against a contract, but it does not provide Primrose’s relation-level “maximal operation” semantics without a custom model.

Failure and assumptions. The abstraction must preserve every observable operation. HashSet can be abstracted as sorted for operations that do not expose order, but if a trait exposes `first` or `last`, the order must be modeled or the implementation must be rejected (§5.4, p. 15). A property that is true only of the abstraction but observable ordering is missing would be unsound; Primrose avoids that case through syntactic trait filtering and nondeterministic specifications when necessary (§5.4, p. 15).

## SMT selection with a non-vacuity side condition

What it is. Primrose first filters candidates by required traits, then translates semantic properties and model operations into Rosette and generates verification conditions for every operation. The solver searches for a counterexample to property preservation. For BTreeSet insertion and the `ascending` property, the condition requires `ascending(xs0)` and a post-state produced by the model operation, then asks whether `ascending(xs)` can be false (Fig. 5; §6.2, pp. 17–18).

How to apply it.

1. Filter the library by syntactic traits. In the paper’s ascending example, HashSet is removed because it does not implement `IndexableT`; Vec, LinkedList, and BTreeSet remain (§6.1, p. 17).
2. Translate the property to Rosette. The paper’s ascending definition is `(define ascending (lambda (c) (for−all−consecutive−pairs c leq?)))` (§6.2, p. 17).
3. For each candidate operation, instantiate the general condition `P(xs0) ⇒ P(xs)` where `xs` is constrained by the library operation’s postcondition (§6.2, pp. 17–18).
4. Add the side condition that some `xs0` satisfies both the property and the operation precondition. The authors warn: “Without the side condition, the rule is unsound.” (§6.2, p. 18).
5. Ask the SMT solver for a counterexample up to a configured input model size. A found counterexample rejects the candidate; no counterexample in the bounded model accepts it for the selector’s scope (§6.2, p. 18).
6. Repeat for every operation in every required trait. A candidate is valid only when all checks pass.

Verus form. Inference: keep the semantic predicate and operation contract as Verus `spec fn`s and `ensures`, and use a `proof fn` to prove preservation for all abstract sequences rather than bounded model size. The non-vacuity condition becomes a `requires` or a separate satisfiability lemma ensuring that at least one state meets the property. Bounded counterexample search can remain an external Z3 harness, but it is evidence rather than a universal Verus proof.

## property interactions and code generation

Properties can refer to operations supplied by traits. For `lifo`, Primrose substitutes each candidate’s model `push` and `pop` into `forall x. pop(push(c,x)) = x` (§6.3, p. 19). A front-push model passes; an end-push model fails, so the FIFO implementation is rejected even though both implementations have similarly shaped operation specifications. After selection, Primrose generates Rust with the chosen concrete type and exposes only trait operations named by the property specification (§6.4, p. 19).

The final ranking step runs generated programs for each valid candidate on test input data and measures runtime (§6.4, p. 19). The paper treats this as a proof of concept and leaves more sophisticated non-functional ranking to future work.

Verus form. Inference: generate a Rust module per candidate, instantiate the same verified trait contract, and run benchmarks only after verification. Keep the semantic `spec fn` fixed across candidates so performance ranking cannot weaken correctness. A candidate-specific `proof fn` can discharge the trait and property lemmas.

## evidence, limits, and product threat

The prototype specifies eight containers: four standard Rust types (Vec, LinkedList, HashSet, BTreeSet) and four custom types (SortedVec, LazySortedVec, UniqueVec, LazyUniqueVec) (§5.1, p. 12). Property-based testing uses 100 random inputs per test. For eight implementations, “in total 7200 inputs are tested in 7.315 seconds” (§7.1, p. 20). This is 8 implementations × 9 operation/property checks × 100 inputs as the paper’s reported total; the paper does not give a separate per-operation denominator. Selection time is under 30 seconds with model size 3 and the full library of 8 implementations (§7.2, p. 21). The paper reports that runtime grows linearly with library size and non-linearly with model size, and that larger properties such as `unique` and `ascending` take longer than constant-complexity `lifo` (§7.2, p. 21).

What is proved is preservation of semantic properties by the abstract library specifications, plus the forward-simulation evidence from property-based tests. What remains trusted includes the abstraction functions, library specifications, Rosette/Z3, the bounded model size, generated code, benchmark inputs, and the testing framework. The paper covers sequential list- and set-like containers; maps and dictionaries are future work, and current properties assume comparable elements (§8, p. 22).

Inference: for agent-written verified Rust, Primrose suggests separating three artifacts: a human-readable semantic contract, a representation-specific proof, and a late performance choice. Its product threat is specification mismatch: an agent can produce a correct proof of an abstraction that omits an observable behavior, or a benchmark winner that is unsuitable outside the measured inputs. Verus can strengthen the per-implementation proof, but it cannot decide whether the semantic property captures the application’s real requirement.

No earlier study in the walkthrough notes covers Primrose’s property-directed container selection.

## techniques for the catalog

- refinement property types: combine trait interfaces with semantic predicates so application code names behavior instead of an implementation
- model-based library contracts: specify concrete containers with Hoare triples over an abstract list and an abstraction function
- forward simulation and completeness: require concrete operations to correspond to deterministic abstract model operations
- non-vacuous SMT selection: check every operation for property preservation and require a satisfiable precondition/property state
- property-based contract validation: test concrete implementations against model specifications with generated inputs
- verified-then-benchmarked generation: generate one program per valid implementation and rank only after semantic filtering
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
