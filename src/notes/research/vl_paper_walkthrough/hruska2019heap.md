# 2LS: Heap Analysis and Memory Safety (Competition Contribution)
(authored by agents unless marked 🧑)
Tag: `hruska2019heap`, [paper](http://arxiv.org/abs/1903.00712v2)

## scope and result
2LS is a static analyzer for sequential C. It combines bounded model checking, k-induction, abstract interpretation, template synthesis, and incremental SAT solving. The abstract says it “implements template-based synthesis techniques, e.g. to find invariants and ranking functions, and incremental loop unwinding techniques to find counterexamples and k-induction proofs.” The 2020 competition contribution adds joint shape/content reasoning for heap structures and instrumentation for memory safety.

## technique 1: kIkI architecture and template synthesis
What it is: translate GOTO programs to acyclic over-approximate SSA, cut loop back edges, infer inductive invariants represented as parameterized logical templates, bit-blast SSA to SAT, and incrementally unwind loops or refine templates. The paper states: “The kIkI algorithm then incrementally amends the formula to perform loop unwindings and invariant inference based on template-based synthesis.”

Steps (Section 1, paragraph "Architecture"; the paper gives the pipeline in prose, not as numbered steps):
1. the program is translated to GOTO and then to an acyclic over-approximate SSA form, with loops cut at the edges returning to the loop head;
2. 2LS refines the over-approximation by computing inductive invariants in abstract domains represented by templates (the competition version uses the zones domain for numerical variables, the shape domain for pointer-typed variables, and the symbolic paths domain);
3. the SSA is bit-blasted into a propositional formula and given to a SAT solver;
4. the kIkI algorithm incrementally amends the formula to perform loop unwindings and invariant inference.
The paper states that kIkI "integrates bounded model checking, k-induction, and abstract interpretation into a single, scalable framework" and "relies on incremental SAT solving in order to find proofs and refutations of assertions, as well as to perform termination analysis". Inference: the exact alternation of k-induction proof attempts and BMC counterexample search is not described in this paper.

Verus form: Inference: this suggests generating candidate `invariant` clauses and `decreases` measures for Verus loops, then asking Verus's SMT backend to discharge them. Verus has no kIkI command or C GOTO front end, so this is a workflow analogy.

## technique 2: product shape and numerical domains
The shape domain over-approximates points-to sets for each pointer variable and abstract object's pointer fields. The interval/zones template-polyhedra domain constrains numerical fields. Their conjunction infers both shape and content; the paper's list example infers `(ao1.next = &ao1 ∨ ao1.next = NULL) ∧ ao1.val ∈ [1, 10]` for an unbounded singly linked list.

Steps (Section 2.1, partly Inference on the order): represent all objects allocated by the same malloc call (the same program location) by one abstract dynamic object; the shape domain computes, for each pointer-typed variable and pointer-typed field of an abstract dynamic object, the set of addresses it may point to; the template polyhedra domain (interval and zones) covers numerical values; the two template formulas are used side by side in a product, whose result is their conjunction. The paper says: “Since both domains have the form of a template formula, we simply use them side-by-side in a product domain combination—the resulting formula is a conjunction of the two template formulae.”

Verus form: Inference: define a ghost sequence/set abstraction for reachable nodes, a pointer-shape predicate, and numeric bounds in one `invariant`; prove list traversal preserves both. Rust ownership and references alter pointer modeling, and the paper does not provide a Rust encoding.

## technique 3: symbolic-path invariants
What it is (Section 2.2): compute different invariants for different symbolic paths, where a symbolic path expresses which loops were executed at least once. This distinguishes situations in which an abstract dynamic object does not represent any really allocated object, so the invariant for it is not valid. The paper calls the aggregate "a power domain combination"; the paths are "represented by guard variables in the SSA". “The symbolic path domain allows us to iteratively compute a set of symbolic paths p1, . . . , pn ... with associated shape and data invariants I1, . . . , In.” The aggregate is `p1 ⇒ I1 ∧ ... ∧ pn ⇒ In`.

Verus form: Inference: encode path conditions as ghost booleans and guard each path-specific invariant with `requires` or `assert`; this requires explicit path partitioning because Verus does not expose 2LS symbolic-path domains.

## technique 4: memory-safety instrumentation
Section 2.3. For null dereference/free, add an assertion `p != NULL` at each location where `*p` or `free(p)` occurs; absence of such errors can be proven because the shape domain over-approximates the addresses p may point to, and if an error is found, BMC is used to check its reachability. For dereferencing/freeing a freed pointer, for each abstract dynamic object ao_i a single concrete object is non-deterministically selected and materialized as ao_i^co; every time ao_i is freed, a special variable `fr` is non-deterministically set to true; the paper then generates an assertion `p != fr` for each location containing `*p` or `free(p)`. For leaks, check at the end of the program whether there is an object ao_i^co such that `fr != &ao_i^co`; if so, there is a leak. The paper cautions: “absence from memory leaks can only be proven for programs without loops (or with loops that can be fully unwound).”

Verus form: Inference: Rust's borrow checker rules out many raw-pointer cases, but unsafe code can use ghost ownership tokens and `assert` checks for null, freed, and leak conditions. The materialization and nondeterministic marker are analysis instrumentation, not Verus primitives.

## evidence, trust, and limits
On ten authors' shape/content benchmarks, 2LS verified 9 of 10 ("the last one has timed out"); "None of the other tools was able to verify more than 3 of these benchmarks." The authors contributed these 10 benchmarks because there were none in earlier SV-COMP editions. Inference: this denominator is the authors' ten contributed benchmarks, not all SV-COMP programs. The tool is 2LS version 0.7.2 with Glucose 4.0; the paper reports that 2LS "narrowly missed the podium in 4th place" in MemSafety, and that the new MemCleanup sub-category was "handled well by 2LS". It also reports that the heap domain over-approximates too much for complicated properties, "reasoning about array contents is still lacking", kIkI "does not yet support recursion", and there is "a large number of unconfirmed witnesses, especially in the termination analysis (500 points lost)". Inference: trusted elements include CPROVER translation, abstract-domain soundness, SSA encoding, SAT solver, and assumptions behind nondeterministic instrumentation. Inference: for agent-written verified Rust, template inference could reduce annotation work, but over-approximation, recursion, and unsafe aliasing remain product threats.

## techniques for the catalog
- kIkI incremental synthesis — combine BMC, k-induction, and abstract interpretation with incremental SAT template refinement
- shape/content product domains — conjoin points-to and zones/interval templates for heap invariants
- symbolic-path guards — associate separate invariants with loop-execution path predicates
- memory-safety materialization — insert null, freed-object, and end-of-program leak assertions
