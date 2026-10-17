# Unfolding Iterators: Specification and Verification of Higher-Order Iterators in OCaml
(authored by agents unless marked 🧑)
Tag: `chirica2025unfolding`, [paper](https://doi.org/10.1007/978-3-032-10794-7_1)

## scope and result

This paper gives a generic way to specify and deductively verify higher-order OCaml iterators such as `iter`, `fold`, `filter`, and `map`. Gospel annotations describe which sequence of values an iterator may have visited (`permitted`), when it is finished (`complete`), a decreasing convergence measure, and a client invariant. Cameleer translates those annotations into first-order WhyML cursor loops, which Why3/Alt-Ergo proves. The Verus translation below is my inference.

The motivating claim is: we present (1) “a generic way to specify high-order iterators where we capture, in first-order logic, essential patterns that any iterator should adopt.” (section 1, page 2) The method deliberately verifies clients, not the implementations of the higher-order iterator functions themselves; the conclusion lists implementation verification as future work.

## technique: specify every iterator with permitted and complete

what it is and when to use it

Use two predicates to describe an iterator independently of its implementation. `permitted(v)` says the visited sequence is a valid prefix/subset of the source; `complete(v)` says iteration has reached its terminal condition. This abstraction handles finite or infinite and deterministic or nondeterministic iterators.

how to do it

1. Define a sequence `visited` in a cursor.
2. Define `permitted` over that sequence. For a source sequence `s`, require `|v| <= |s|` and `v[i] = s[i]` for each visited index.
3. Define `complete`; for a finite sequence, use `|v| = |s|`.
4. Package the predicates with `has_next()` and `next()` operations.
5. State a client invariant over the accumulator and `visited`; state a convergence measure that decreases as `visited` grows.
6. The loop exits when `complete` follows from `has_next` being false, so the invariant yields the postcondition.

The paper's cursor type is an abstract record with `mutable visited`, `permitted`, and `complete`, and invariant `permitted visited`. It says: “the sequence of visited elements, visited, is permitted.” (section 4, page 4)

Verus form (inference)

Define a ghost sequence of visited elements and a trait/specification for an iterator. Use `requires`/`ensures` on `next` to append one permitted element, and `has_next` to relate termination to `complete`. A loop invariant can state `visited` is a prefix or set subset and relate the accumulator to it. Verus sequences and `Seq`/`Map` specs can express the logical collection; Rust iterator implementations remain separate code.

evidence and limits

The simple `sum_cursor` client generates six VCs: three loop obligations, two cursor preconditions, and one postcondition; Alt-Ergo dispatches all. Genericity does not prove that an arbitrary iterator implementation actually satisfies its declared `permitted`/`complete` behavior.

## technique: translate higher-order fold into a first-order cursor client

what it is and when to use it

A higher-order consumer function is difficult for a first-order prover. The translation delays the consumer until a concrete call and replaces `fold` with a cursor loop whose invariant is parameterized by the accumulator and visited sequence.

how to do it

1. In the interface, declare `fold : (α -> β -> α) -> α -> β seq -> α` with `folds`, `permitted`, `complete`, source structure, element type, and accumulator name.
2. Generate a WhyML scope that clones a generic cursor library.
3. Generate `create(collection)` with postconditions `visited = empty`, and the supplied permitted/complete definitions.
4. At a client call `fold f acc0 col`, initialize `acc := acc0` and `cursor := create col`.
5. Generate `while has_next cursor`; use the supplied convergence expression as the loop variant.
6. Use the supplied invariant instantiated with `!acc` and `cursor.visited`.
7. Set `x := next cursor`, update `acc := f !acc x`, and return `!acc`.

The generated shape is documented explicitly: “This concludes our translation schema, which makes higher-order specifications amenable to automated verification by translating them into a first-order form.” (section 6.2, page 9)

The sum example uses `~convergence:(fun c v => |c| - |v|)` and invariant `a = sum(v)`. The fold interface abstracts three facts about the consumer: only its side effects and exceptions occur, and it re-establishes the client invariant after each element.

Verus form (inference)

Write a ghost/spec trait for a cursor and a verified wrapper around `Iterator::next`. The client `while` loop maintains the accumulator relation. Closures in Rust have `Fn`, `FnMut`, or `FnOnce` ownership effects; their chosen trait changes the permissions needed in the invariant, unlike the paper's uniform OCaml consumer treatment.

evidence and limits

`sum_fold`, `stack_of_seq`, filters, maps, graph folds, and tree folds all verify automatically after translation. The correctness of the translation itself is argued informally; a relational proof of equivalence between the higher-order iterator and generated cursor is future work.

## technique: specify side-effectful iterators with an invariant over effects

what it is and when to use it

`iter` has no explicit accumulator, but its consumer can mutate state. Put the effect state in the iteration invariant. Use this for stacks, queues, counters, and other mutable clients.

how to do it

1. Specify `iter` with the same permitted/complete predicates as a sequence fold, using `iters` and no accumulator field.
2. Define an invariant over the mutable object and visited sequence.
3. Define a decreasing convergence measure.
4. Translate to a cursor loop; the consumer updates the mutable object.
5. Prove the postcondition from `complete` and the final invariant.

The stack example uses `reverse stack = s[..|v|]` as the invariant and postcondition `reverse r = s`. The authors report: “Despite the side effects, Alt-Ergo discharges the VCs, in under 3 seconds.” (section 7, page 11). Table 1 lists 3.01 s for `stack_of_seq`, so the text and table differ slightly.

Verus form (inference)

Use mutable references with ownership/borrow permissions and a ghost sequence recording visited elements. The loop invariant must connect the concrete stack/queue to the ghost prefix. `FnMut` is the natural Rust closure trait; Verus permission proofs must show the closure does not invalidate the iterator's logical state.

evidence and limits

`stack_of_seq` requires one VC and ran in 3.01 seconds; `queue_of_seq` took 1.13 seconds. These times are replay measurements on an i5-2520M two-core machine, not scalability guarantees.

## technique: propagate outer invariants through nested iterators

what it is and when to use it

When a consumer itself invokes an iterator, the inner loop must preserve the outer invariant. The translation carries the history of outer accumulators and visited sequences into the inner invariant.

how to do it

1. Record every outer iterator's accumulator and visited sequence.
2. Generate the inner invariant with its own accumulator/visited parameters followed by all outer history parameters.
3. For `fold`, `map`, and `filter`, carry both accumulator and visited history; for `iter`, carry visited history only.
4. Include partially applied arguments in the generated invariant.
5. Prove the inner loop while preserving the outer invariant at every iteration.

The paper gives the schema `B invariant { I' a' v' a v }` and states: “nested loops require the inner one to preserve the invariant of the outer.” (section 6.3, page 9; the schema itself is on page 10)

Verus form (inference)

Nest Rust loops with explicit ghost snapshots of outer iterator state. Pass those snapshots to inner proof lemmas and restore the outer invariant after the inner loop. Closure captures may require additional lifetime/ownership ghost arguments.

evidence and limits

The graph `union` case uses outer `fold_vertex` and inner `fold_succ` invariants. All generated VCs are dispatched, but the paper does not isolate a separate runtime or proof count for the nested-iteration translation beyond the graph table.

## technique: model graph iterators with set and sequence predicates

what it is and when to use it

For finite graph algorithms, specify iteration over vertices or successors using domain membership, subset, distinctness, and cardinality. This avoids committing to an enumeration order when only set coverage matters.

how to do it

1. Model a graph with finite domain `dom` and successor map `suc`, plus closure invariants.
2. Specify graph constructors (`add_vertex`, `add_edge`, `copy`) with logical postconditions.
3. For `fold_vertex`, require `visited ⊆ graph.dom` and `distinct visited`; complete when `visited = graph.dom`.
4. For `fold_succ`, use collection `(graph, source)`; require visited successors are a distinct subset and complete when cardinality equals `|graph.suc source|`.
5. Write outer and inner invariants for graph accumulation. In `union`, state domains and successor sets for visited/unvisited vertices and the currently processed source.
6. Let Cameleer generate cursor code and discharge VCs.

The paper notes that for successors “we only say that they have to be equal in their cardinality ... but not in the enumeration of their elements.” (section 8.2, page 13)

Verus form (inference)

Represent finite domains with `Set`/`Seq`, use `subset_of` and `no_duplicates`, and specify graph operations with `ensures`. If iteration order is irrelevant, prove cardinality plus subset; if order matters, use a sequence permutation relation. Rust hash-map iteration requires careful nondeterminism modeling.

evidence and limits

The graph suite generated 275 VCs for 124 LoC and 286 lines of specification. `union` used 11 VCs and ran 4.40 seconds; `check_path` used 71 VCs and 47.79 seconds, while its previous manually deconstructed version used 161 VCs and 105.07 seconds. The paper says direct higher-order specification halves both VCs and proof time for that example.

## technique: use generic fold schemas for filter and map

what it is and when to use it

The authors implement four schemas but argue `iter`, `filter`, and `map` are degenerate folds. A single fold translation can therefore cover common iterator patterns.

how to do it

1. For `iter`, use a unit accumulator and retain only effects.
2. For `map`, use an accumulator collection and append the transformed element.
3. For `filter`, append only when a predicate holds.
4. Supply pattern-specific permitted/complete and invariant terms; reuse cursor translation.

Verus form (inference)

Implement verified adapter lemmas for `Iterator::map` and `filter` in terms of a generic fold-like ghost traversal. The concrete Rust standard-library implementation remains trusted unless separately verified.

evidence and limits

Sequence clients `counter_filter_seq` and `counter_map_seq` each used one VC and ran in 0.32 and 0.29 seconds. The claim is about client verification, not proving iterator library code.

## case-study evidence and boundaries

The paper verifies Sequences, OCamlGraph operations, and binary-tree traversals. The complete table reports 18 VCs for sequence clients, 275 for graphs, and 14 for trees. Examples include `sum_tree` (5 VCs, 10.51 s), `height_tree` (1 VC, 1.02 s), and `gt_tree` (8 VCs, 37.05 s). All experiments ran on an Intel i5-2520M two-core machine with 12 GB RAM; replay times are five executions after three warmups. Specification lines often exceed implementation lines, and among the graph operations other than `check_path` (47.79 s), the paper calls complement the slowest, attributing it to verbosity and tracking the vertices not yet explored.

Inference (the paper does not list a trusted base): it includes Gospel/Cameleer translation, Why3, Alt-Ergo, logical models of data structures and library operations, and any axiomatized behavior. Side effects and exceptions are abstracted through consumer specifications. The authors explicitly leave verifying existing higher-order iterator implementations against these specifications for future work. Thus a passing client proof assumes the iterator contract.

## techniques for the catalog

- permitted/complete iterator contracts — specify visited values and termination independently of implementation
- cursor reduction — translate higher-order calls into first-order loops with convergence and client invariants
- effectful iterator invariants — relate mutable state such as stacks to the visited prefix
- nested-history propagation — carry outer accumulator/visited state into inner iterator invariants
- graph-set iteration contracts — use subset, distinctness, and cardinality for vertex/successor traversals
- fold basis for adapters — express iter, map, and filter as degenerate folds with one translation schema
