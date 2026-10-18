# Proving and Disproving Programs with Shared Mutable Data
(authored by agents unless marked 🧑)
Tag: `schmid2021proving`, [paper](http://arxiv.org/abs/2103.07699v1)


## problem and result

Schmid and Kuncak present a verifier for deterministic Scala programs with shared mutable references. Its distinctive choice is to encode heap mutation into recursive pure functions and express frame conditions with quantifier-free formulas over Z3's extended array theory. The abstract states: “This quantifier-free encoding enables SMT solvers to prove safety or report counterexamples relative to the semantics of procedure specifications” (Abstract, p. 1).

The method targets programs combining immutable algebraic data with mutable cells, dynamic frames, recursion, and object-oriented dispatch. It models the heap as a map from object identities to values, then adds an explicit heap argument and returned heap to every stateful function. Unlike a Boogie-style encoding with quantified frame conditions, it uses an array combinator (`mapf`/`mapite`) to express a set-guided merge of two heap maps; the paper says this use of array combinators for framing is, "to the best of our knowledge, novel" (Section 3, p. 6).

## technique 1: specify effects and functional behavior together

What it is. A mutable method declares the set of references it may read and the set it may change, plus a termination measure. The running `Tree.tmap` example recursively updates mutable leaf cells. Its minimal form contains `reads(repr)`, `modifies(repr)`, and `decreases(this)` (Figure 1, p. 3). Here `repr` is a ghost function that returns all cells in the tree. The paper explains: “The reads clause indicates that the only mutable references that tmap reads are given by the value returned from auxiliary function repr” (Section 2, p. 3).

When to use it. Inference: use effect sets for modular verification of shared state: callers need only establish that callees' reads and writes fit their own permissions, while unmentioned objects are guaranteed unchanged. Add a stronger abstraction-function postcondition when functional behavior matters, not merely absence of undeclared effects.

How to apply it.

1. Mark heap-bearing classes with the tool's heap-reference base type and define a ghost representation set recursively (Section 2, pp. 2–3).
2. Declare read and write sets and a decreasing receiver measure on each recursive method (Figure 1, p. 3).
3. For a stronger property, define an abstraction function such as `toList`, require a disjointness predicate `valid`, save the pre-state abstraction, and state the postcondition against the old value (Figure 2, pp. 4–5).
4. Add assertions for disjoint recursive subtrees and prove list lemmas recursively when automatic unfolding cannot establish the property (Section 2, pp. 4–6).

The strong `tmap` specification requires `valid`, saves `oldList = toList`, asserts `left.repr ∩ right.repr == ∅`, and ends with `toList == old(toList.map(f))` (Figure 2, p. 5). `lemmaMapConcat` proves the list-map/concatenation identity by recursion.

Verus form. Inference: represent `repr`, `valid`, and `toList` as ghost/specification functions over a Verus datatype or a Rust structure with a ghost representation field. State the functional contract with `requires(valid)` and `ensures(|self| ... old(to_list(self)) ...)`; use `old(...)` in the postcondition and `invariant(...)` on recursive loops where iteration is used. Inference: Verus has no `reads`/`modifies` clauses like the paper's; ownership and borrowed references instead constrain which locations a function can access. Inference: a ghost set can document and prove the intended footprint, but it does not by itself grant permission to mutate aliased Rust memory.

Evidence and limits. The paper says the minimal `tmap` is automatically checked for conformance to declared effects and that incorrect `repr` definitions produce counterexample states (Section 2, p. 3). The strong version was verified “in a matter of seconds” (Section 2, p. 6), but no machine, benchmark denominator, or per-example timing is supplied. The abstract says counterexamples are "relative to the semantics of procedure specifications". Inference: an overly broad representation set can therefore make a specification weak.

## technique 2: quantifier-free heap and frame encoding

What it is. Stateful operations become pure functions over an explicit `Heap = Map[HeapRef, Any]`. References are erased to an algebraic `HeapRef`; mutable object states become single-constructor data types such as `CellData`. A function returns both its normal result and a new heap (Section 3, pp. 6–7).

How to apply it.

1. Add an immutable heap parameter `h0` to each translated procedure and return `(result,h1)` (Section 3, p. 6).
2. Replace a field read with a heap lookup and a field write with a map update; use a type assertion/downcast justified by the source language's typing (Figure 4, pp. 7–8).
3. Bind the callee's read/write sets, assert that every direct access belongs to the corresponding set, and use a wrapper to check that recursive callees' sets are subsets of the caller's sets (Figure 4, pp. 7–8).
4. Encode modular guarantees with `mapMerge`: the result depends only on the read set, and the returned heap differs only inside the write set (Section 3, p. 8).
5. Translate sets and maps to arrays and `mapMerge` to Z3's `mapf`/`mapite` combinator, avoiding quantified frame formulas (Section 3, p. 8).

The paper's `tmapshim` wrapper asserts `rs ⊆ rd` and `ms ⊆ md`, then assumes the read-dependence and write-frame equations using `mapMerge` (Figure 4, p. 7). The paper states: “This array combinator is part of Z3’s extended array theory [13] and axiomatized as” ∀i. mapf(a1, ..., an)[i] = f(a1[i], ..., an[i]) (Section 3, p. 8). It translates `s.mapMerge(m1, m2)` as `mapite([s], [m1], [m2])`, using Z3's if-then-else, because the combinator "can in practice only be used with built-in functions".

Verus form. Inference: a Verus implementation can use a ghost heap model and a refinement invariant relating concrete fields to ghost map entries. Heap updates remain executable Rust; the map equations are proved in `proof fn`s or lemmas and are erased before runtime. Use `requires` to establish type/representation invariants and `ensures` to state unchanged locations or updated entries. Inference: Verus's ownership model can replace some frame obligations, but the paper's arbitrary `Any` map and Z3 `mapf` are not directly available as executable Rust constructs.

Trust and failure modes. The paper says the downcasts from `Any` are safe "since we will only verify well-typed Scala programs" (Section 3, p. 7). The modular read/write guarantees about callees are added as `assume` statements in the translated program (Figure 4, lines 25-26, p. 7). Inference: the result therefore trusts the encoding of those assumptions and the solver's array reasoning. Inference: a Verus ghost-heap abstraction similarly introduces a trusted correspondence proof; if that proof is omitted or marked external, the executable code is not thereby verified.

## technique 3: shared structures and parallelization

The tool applies the same representation and frame machinery to mutable linked lists, queues, array slices, cell-based arrays, allocators, and fork-join tasks (Section 4, pp. 9–10). For linked lists, the authors track a node representation either as a recursive function or a ghost field, note that well-formedness (e.g., absence of cycles) needs heap separation and an inductive proof, focus on an `append` of two valid lists with disjoint representations, and prove `enqueue` and `dequeue` of a `Queue` functionally correct with respect to a serialized representation similar to `toList` (Section 4, p. 9).

For parallelization, a `Task` exposes ghost `readSet` and `writeSet`; `parallel(task1,task2)` requires each task's write set to be disjoint from the other task's read set, and declares the unions of the two read sets and of the two write sets as its own `reads` and `modifies` (Figure 5, lines 9-12, p. 10). The paper says this “justifies replacing our sequential model of parallel by a more efficient runtime implementation executing the two tasks concurrently” (Section 4, p. 10). Inference: in Verus, a concurrency proof would instead use ownership, borrowing, and a state-machine or permission protocol; the disjointness predicate is a specification fact, not a substitute for Rust's actual alias discipline.

## what is proved, measured, and trusted

The paper describes verified examples but reports no aggregate pass/fail denominator. It claims the strong tree-map proof completes in seconds and describes examples for shallow cells, lists, queues, slices, cell arrays, and fork-join tasks (Sections 2 and 4, pp. 6–10); it ends with "we are confident that our tool brings substantial value to the practice of verification of Scala programs" (p. 10), without a systematic evaluation. The encoding relies on Stainless's counterexample-complete unfolding, Z3's extended array theory, and assumptions encoding modular contracts (Section 3). The paper (a short tool description that says it "briefly" describes the encoding) gives no soundness proof and no claim of coverage of all Scala features, arbitrary aliasing, or concurrency implementations.

Inference: the threat to agent-written verified Rust is high for APIs that manipulate shared state. The paper shows a practical way to combine functional abstraction with mutable effects and counterexamples, but its Scala heap encoding does not transfer automatically to Rust ownership. The product opportunity is a reusable ghost representation/footprint pattern and counterexample-friendly specifications; the residual risks are aliasing, unsafe code, external libraries, and the correctness of the abstraction relation.

## techniques for the catalog

- dynamic effect sets — specify recursive mutable methods with ghost read/write representations and termination measures
- functional abstraction contracts — connect in-place mutation to a pure sequence/list result using old-state postconditions
- quantifier-free heap encoding — translate mutable references to pure heap maps and Z3 array combinators
- modular frame checking — use wrappers and map-merge equations to enforce caller/callee footprint inclusion
- disjoint-task specification — require cross-read/write disjointness before replacing sequential fork-join models with parallel execution
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Our encoding achieves modular verification of heap contracts (reads and modifies) by injecting some additional assertions and assumptions."): read all 12 pages of the arXiv v1 text (sections 1-4 and the references); checked the quotations, Figure 1/2/4/5 contents, section and page references, and the technique steps against the text. Changed: removed "finite" (the paper does not say it), narrowed the array-combinator quotation to the exact sentence, corrected pages (downcast note is p. 7, not p. 8; frame-condition translation ends p. 8), fixed the `parallel` precondition (write set of each task disjoint from the other's read set, with unions as reads/modifies), restricted the linked-list claims to what Section 4 states (append, and queue functional correctness), reworded the evaluation and trust paragraphs, and marked my own conclusions "Inference:". Not checked: the Verus-form paragraphs and the final threat/opportunity paragraph are my inferences, not claims from the paper; I did not check the Stainless or Z3 sources or the paper's cited works.
