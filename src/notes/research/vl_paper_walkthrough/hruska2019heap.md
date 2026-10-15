# 2LS: Heap Analysis and Memory Safety (Competition Contribution)
(authored by agents unless marked 🧑)
Tag: `hruska2019heap`, [paper](http://arxiv.org/abs/1903.00712v2)

## scope and result
2LS is a static analyzer for sequential C. It combines bounded model checking, k-induction, abstract interpretation, template synthesis, and incremental SAT solving. The abstract says it “implements template-based synthesis techniques, e.g. to find invariants and ranking functions, and incremental loop unwinding techniques to find counterexamples and k-induction proofs.” The 2020 competition contribution adds joint shape/content reasoning for heap structures and instrumentation for memory safety.

## technique 1: kIkI architecture and template synthesis
What it is: translate GOTO programs to acyclic over-approximate SSA, cut loop back edges, infer inductive invariants represented as parameterized logical templates, bit-blast SSA to SAT, and incrementally unwind loops or refine templates. The paper states: “The kIkI algorithm then incrementally amends the formula to perform loop unwindings and invariant inference based on template-based synthesis.”

Steps (Sections 1 and Architecture):
1. compile C to GOTO and acyclic SSA;
2. choose abstract-domain templates;
3. solve template constraints incrementally with SAT;
4. use k-induction to prove assertions or BMC to find bounded counterexamples;
5. repeat loop unwinding and invariant refinement.

Verus form: Inference: this suggests generating candidate `invariant` clauses and `decreases` measures for Verus loops, then asking Verus's SMT backend to discharge them. Verus has no kIkI command or C GOTO front end, so this is a workflow analogy.

## technique 2: product shape and numerical domains
The shape domain over-approximates points-to sets for each pointer variable and abstract object's pointer fields. The interval/zones template-polyhedra domain constrains numerical fields. Their conjunction infers both shape and content; the paper's list example infers `(ao1.next = &ao1 ∨ ao1.next = NULL) ∧ ao1.val ∈ [1, 10]` for an unbounded singly linked list.

Steps (Section 2.1): represent all objects allocated at one malloc site by an abstract dynamic object; compute possible symbolic addresses; instantiate numerical templates; conjoin shape and numerical formulas; use the conjunction as the inductive invariant. The paper says: “Since both domains have the form of a template formula, we simply use them side-by-side in a product domain combination—the resulting formula is a conjunction of the two template formulae.”

Verus form: Inference: define a ghost sequence/set abstraction for reachable nodes, a pointer-shape predicate, and numeric bounds in one `invariant`; prove list traversal preserves both. Rust ownership and references alter pointer modeling, and the paper does not provide a Rust encoding.

## technique 3: symbolic-path invariants
What it is: compute different invariants for paths distinguished by loop-execution guards, avoiding invalid facts about abstract objects that are not allocated on a path. “The symbolic path domain allows us to iteratively compute a set of symbolic paths p1, . . . , pn ... with associated shape and data invariants I1, . . . , In.” The aggregate is `p1 ⇒ I1 ∧ ... ∧ pn ⇒ In`.

Verus form: Inference: encode path conditions as ghost booleans and guard each path-specific invariant with `requires` or `assert`; this requires explicit path partitioning because Verus does not expose 2LS symbolic-path domains.

## technique 4: memory-safety instrumentation
For null dereference/free, insert `p != NULL` assertions at every `*p` or `free(p)` site. For use-after-free, materialize one concrete object from each abstract object and nondeterministically set a `fr^co` marker when the abstract object is freed; assert `p != fr^co`. For leaks, check at program end whether a materialized object remains unfreed. The paper cautions: “absence from memory leaks can only be proven for programs without loops (or with loops that can be fully unwound).”

Verus form: Inference: Rust's borrow checker rules out many raw-pointer cases, but unsafe code can use ghost ownership tokens and `assert` checks for null, freed, and leak conditions. The materialization and nondeterministic marker are analysis instrumentation, not Verus primitives.

## evidence, trust, and limits
On ten authors' shape/content benchmarks, 2LS verified 9/10; the tenth timed out, while no other tool verified more than 3/10. Inference: this denominator is the authors' ten contributed benchmarks, not all SV-COMP programs. The tool is 2LS version 0.7.2 with Glucose 4.0; the paper reports fourth place in MemSafety. It also reports that the heap domain over-approximates too much for complicated properties, array-content reasoning is lacking, recursion is unsupported, and many termination witnesses were unconfirmed (500 competition points lost). Inference: trusted elements include CPROVER translation, abstract-domain soundness, SSA encoding, SAT solver, and assumptions behind nondeterministic instrumentation. Inference: for agent-written verified Rust, template inference could reduce annotation work, but over-approximation, recursion, and unsafe aliasing remain product threats.

## techniques for the catalog
- kIkI incremental synthesis — combine BMC, k-induction, and abstract interpretation with incremental SAT template refinement
- shape/content product domains — conjoin points-to and zones/interval templates for heap invariants
- symbolic-path guards — associate separate invariants with loop-execution path predicates
- memory-safety materialization — insert null, freed-object, and end-of-program leak assertions
Checked 2026-10-15 against paper hruska2019heap: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
