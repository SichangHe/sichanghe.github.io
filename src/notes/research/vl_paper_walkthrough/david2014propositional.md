# Propositional Reasoning about Safety and Termination of Heap-Manipulating Programs
(authored by agents unless marked 🧑)
Tag: `david2014propositional`: [paper](http://arxiv.org/abs/1410.5088v1)

## what the paper proves or measures

The paper introduces SLH, a theory of potentially cyclic singly-linked heaps with arithmetic lengths, and reduces validity to SAT when the background arithmetic is bit-vector arithmetic. The abstract says: “This paper shows that it is possible to reason about the safety and termination of programs handling potentially cyclic, singly-linked lists using propositional reasoning even when the safety invariants and termination arguments depend on constraints over the lengths of lists.” (Abstract, p. 1). SLH models unrestricted sharing and cycles, and supports safety invariants, ranking functions, and counterexamples. The authors prove a small-model theorem and decidability relative to the background theory; experiments use Shakira, CBMC symbolic execution, and Glucose SAT solving.

## technique 1: SLH heap theory

what it is: represent a heap as a finite directed graph with one successor per node (except the null sink), pointer variables as labels, and explicit heap variables. Observation functions are `alias`, `isPath`, `pathLength`, `isNull`, and `circular`; mutation functions are pure heap transformers `new`, `assign`, `lookup`, and `update`.

when to use: use it for sequential Rust-like code whose mutable structures have one `next` field and whose properties depend on both shape and path lengths, including cyclic lists and shared tails. It is intentionally narrower than arbitrary Rust heaps.

how to do it:
1. expose side-effect-free heap predicates in specifications; the explicit heap argument can be hidden for user convenience (Section 5.1, p. 15)
2. model `x = y`, `x = y→next`, allocation, and `x→next = y` with the corresponding pure transformers (Sections 3.1–3.3, pp. 5–9)
3. define `pathLength` as the shortest path, `isPath` as finite reachability, `isNull` as distance zero to null, and `circular` as a nonempty path back to the pointer (Section 3.3, p. 8)
4. combine these literals with Boolean connectives and the background arithmetic theory.

The semantics states: “A heap H = hL, Gi is a singly linked heap iff each vertex has outdegree 1, except for a single sink vertex that has outdegree 0 and is labelled by null” (Definition 2, p. 8). The path functions are computable in `O(kHk)` time because the graph has outdegree one (Section 3.3, p. 8).

Verus form: Inference: represent a list as a ghost sequence or a verified pointer structure; define `spec fn` reachability and path length over that representation. Use ownership and borrowing to constrain mutation, then prove lemmas that each Rust operation refines `assign`, `lookup`, `new`, or `update`. Cycles and shared ownership need an explicit unsafe or reference-count model; SLH's unrestricted sharing does not follow automatically from Rust ownership.

## technique 2: homeomorphism and the small-model reduction

what it is: quotient heaps by a sound equivalence that preserves all observations and transformers. Edge subdivision changes graph granularity but preserves shortest distances using edge weights; homeomorphism allows isomorphism after subdivisions. Every class has a maximally smoothed kernel with at most `2|P|` vertices, where `P` is the number of pointer variables.

how to do it:
1. restrict attention to the reachable sub-heap from program pointers (Definition 3, p. 10)
2. show graph isomorphism preserves `pathLength`, `circular`, and every transformer (Theorem 1, p. 10)
3. permit weighted edge subdivision and prove subdivision preserves observations (Lemma 1, p. 11)
4. define homeomorphism as isomorphism between subdivisions and prove transformers respect it (Lemma 2, p. 11)
5. smooth every unlabelled degree-one chain to a kernel; use the indegree counting argument to obtain at most `2×|P|` vertices (Lemma 3, p. 13)
6. encode only kernels when searching for a counterexample.

The paper's key result is: “Theorem 3 (SLH has Small Model). For any SLH formula ∀h.φ, if there is a counterexample Γ |= ¬φ then there is Γ ′ |= ¬φ with every heap-sorted variable in Γ being interpreted by a homeomorphism kernel.” (Section 4, p. 14)

Verus form: Inference: use a canonical ghost representation for reachable list segments and prove a normalization lemma before arithmetic reasoning. This can reduce proof cases but is not a replacement for proving the concrete pointer representation refines the normalized model. Verus has no built-in heap-homeomorphism operator.

evidence and limits: the bound depends on the finite pointer-variable set and the single-successor graph. It does not cover arbitrary graph degree, unbounded fields, or external aliasing beyond the model.

## technique 3: strongest-postcondition verification conditions

what it is: annotate loops with safety invariants and ranking functions, decompose the program into Hoare triples, and compute strongest postconditions in SLH. Validity of the resulting formulas proves partial or total correctness.

how to do it:
1. for safety, require invariant initiation, inductiveness across the loop body, and exclusion of assertion/null-dereference states (Section 5, p. 14)
2. for termination, provide a ranking function that strictly decreases and is bounded below; combine its VCs with safety VCs (Section 5, p. 14)
3. compute `SP` for each heap operation using a fresh heap variable and the corresponding transformer (Section 5.2, p. 15)
4. encode loop-entry, body, and exit triples as universally quantified SLH formulas
5. decide each formula by the SAT procedure.

For the example `x=y; while (x!=null) x=x→next; assert(isPath(y,x))`, the paper lists three Hoare triples and VCs (6–11, pp. 15–16). The body VC is `∀h. isPath(h,y,x) ∧ ¬isNull(x) ∧ h′=lookup(h,x,x) ⇒ isPath(h′,y,x)` (Equation 10, p. 16).

Verus form: Inference: write the loop invariant as a Verus `invariant` clause, use `requires`/`ensures` for each heap operation, and prove the ranking measure with a `decreases` clause. The paper's strongest-postcondition calculation becomes a sequence of Verus lemmas over ghost state; the executable pointer update still requires ownership proofs.

## technique 4: SAT decision procedure for SLH[TBV]

what it is: instantiate list lengths and numeric variables with bit-vectors, bound the kernel heap to `2P` nodes plus allocation/lookup operations, symbolically execute each SLH atom, and ask a SAT solver whether a counterexample exists.

how to do it:
1. choose `N = 2P + k` nodes for a formula with `P` pointers and `k` allocation/lookup occurrences (Section 6, pp. 16–17)
2. encode each heap as `ptr`, `succ`, and `nnodes`; null is node zero and edge weights are integers
3. instantiate `new`, `assign`, `lookup`, `update`, `circular`, and `pathLength` with the Figure 6 procedures
4. unroll `PathLength` and `Circular` for `N` iterations; each other operation has constant-size background-theory constraints
5. add canonical-topological-order constraints to remove isomorphic counterexamples (Section 6, p. 17)
6. solve the resulting bit-vector formula with CBMC-generated SAT and Glucose; SAT means a counterexample, UNSAT means validity under the small-model theorem.

The paper states: “If we are searching for a counterexample heap with at most 2P nodes, and our formula contains k occurences of Alloc and Lookup, the largest heap that can occur in the counterexample will contain no more than 2P + k nodes.” (Section 6, p. 17). Formula size is `O(x×P)` for `x` theory operations (Section 6, p. 17).

Verus form: Inference: use bounded ghost heaps or finite sequences to reproduce this decision procedure for small tests, but retain unbounded inductive proofs for production contracts. Bit-vector arithmetic can model Rust machine integers; ensure the chosen widths and overflow behavior match the executable code. SAT counterexamples are debugging evidence, not proof of universal correctness.

## technique 5: concrete invariants and ranking functions

The paper gives reusable patterns. For traversing a list `n` times, use `pathLength(y,null)=n−i` and ranking `R(i)=−i` (Section 7, p. 18). For simultaneous traversal, preserve equality of two path lengths; if both are cyclic, the program does not terminate. For division encoded by list lengths, preserve reachability and a modulo relation and use `R(w)=pathLength(w,null)`. For cycle detection, use a path relation and a lexicographic ranking over two path lengths (Section 7, pp. 18–19). These are paper examples; adapting them to Verus pointer APIs is an inference.

## what is measured, trusted, and limited

Shakira evaluates list traversal, reversal, sorting, the motivating examples, and four termination-annotated programs. It generates VCs by Hoare proof and CBMC symbolic execution, then solves them with Glucose 4.0 on a four-core 3.30 GHz Core i5 with 8 GB RAM (Section 8, pp. 19–20). Safe partial-correctness benchmarks contain 40 UNSAT VCs solved in 5.9 s; safe total-correctness benchmarks contain 25 UNSAT VCs solved in 9.6 s. Counterexample sets contain 14, 31, 11, and 4 SAT VCs for nontermination, null dereference, assertion failure, and inadequate invariant, with SAT times 1.6, 3.0, 0.7, and 1.2 s respectively (Table 1, p. 20). The denominators are VCs in each row, not programs; symbolic-execution times are separate columns. The reported average counterexample sizes are 3, 3, 3.5, and 6 nodes for those four rows.

The trusted chain includes the program-to-Hoare translation, strongest-postcondition generator, finite-model encoding, CBMC, Glucose, and the correctness of the SLH abstraction. The paper assumes a one-field singly-linked heap and does not prove Rust ownership refinement. Inference: the threat to agent-written verified Rust is high where agents confuse list-length equalities with termination or omit cyclic cases; a Verus proof of an inadequate invariant can still pass if the postcondition is weak. SLH already covers shape/length interaction, SAT reduction, strongest-postcondition VCs, and counterexample diagnosis. VL should not redo that decision procedure; its needed addition is a verified bridge from concrete Rust ownership and machine memory to a suitable ghost heap model.

## techniques for the catalog

- SLH shape-length logic — combine reachability, cycles, sharing, and arithmetic path lengths in one heap theory
- homeomorphic small models — quotient heaps by subdivision and search kernels with at most twice the pointer count
- strongest-postcondition VCs — derive safety and termination obligations from pure heap transformers
- SAT reduction — encode bounded SLH[TBV] counterexamples with symbolic execution and bit-vector constraints
- invariant and ranking patterns — relate path lengths across traversals and use decreasing or lexicographic measures

Checked 2026-10-15 against the paper by a Codex agent for propositional_reasoning_about_safety_and_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
