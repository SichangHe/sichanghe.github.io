# Auto-active Verification of Graph Algorithms, Written in OCaml
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and prior notes

This paper verifies selected OCamlgraph data structures and graph algorithms with Cameleer, which translates GOSPEL-annotated OCaml to WhyML verification conditions discharged by Why3 provers. The paper's code is OCaml, so every Verus mapping below is my inference. The verified artifacts are a persistent labeled graph, an imperative unlabeled directed graph, cycle finding, and two breadth-first path checkers. The authors say their work presents “the formal verification of graph data structures, as well as graph-manipulating algorithms, written in OCaml.” (section 1, page 2)

The useful pattern for VL is modular verification of real library code: specify an abstract graph model at a module boundary, maintain representation invariants in each implementation, and verify algorithms against the boundary rather than one concrete graph. The paper also demonstrates certificate checking, where a difficult producer need only be shown safe while a smaller validator receives the functional proof.

## technique: GOSPEL contracts and termination variants

what it is and when to use it

Attach behavioral comments to existing OCaml functions. Use `requires` for caller obligations, `ensures` for the result relation, and `variant` for a well-founded value that decreases on recursion or looping. This is the basic auto-active workflow for ordinary pure or stateful functions.

how to do it

1. Write the OCaml implementation first or retain the library implementation.
2. Add a GOSPEL comment after the function. For `fast_exp`, require `0 <= n`, state `r = x ^ n`, and use `variant n`.
3. Feed the file to Cameleer; select the function to prove and a prover.
4. If a verification condition does not close, split it with Why3's `split_vc`, which checks the resulting conditions separately.
5. Treat the postcondition as conditional on the precondition: a call with negative `n` does not obtain the postcondition.

The paper's example has the exact contract shape:

```
(*@ r = fast_exp x n
      requires 0 <= n
      variant n
      ensures r = x ^ n *)
```

The authors describe the variant as “a value that decreases with each call until it reaches a point where the loop ends.” (section 2, page 3) This is both a functional contract and a total-correctness obligation; an `ensures` clause alone does not prove termination.

Verus form (inference)

Use `requires` and `ensures` on a `fn` or `proof fn`, and use a `decreases` clause for recursive functions. A Rust implementation and its proof can remain together, but Rust's ownership and integer types replace OCaml's semantics. GOSPEL's comment syntax, `variant`, and Why3's `split_vc` do not carry over; Verus requires its own contract and proof blocks. Preserve the discipline that callers must establish preconditions before relying on postconditions.

evidence and limits

The small exponentiation example required one interactive split because Alt-Ergo initially failed, then discharged the split obligations. Cameleer cannot yet handle every OCaml feature: the paper specifically reports missing support for higher-order functions with side effects and modules included inside modules. The proof therefore assumes the supported language subset and the correctness of Cameleer's translation, Why3, and external provers.

## technique: model a module interface and verify implementations through it

what it is and when to use it

Give a graph module an abstract logical model, then specify only operations needed by algorithms. A module implementation can use maps, sets, hash tables, or another representation as long as it satisfies the signature. Use this when several data structures should share verified algorithms.

how to do it

1. Define a module signature with a vertex type, graph type, successor operation, and enumeration operation.
2. Attach a model to the graph type: a finite set `dom` of vertices and a successor function `suc`.
3. State model consistency, for example, every successor of a member of `dom` is also in `dom`.
4. Specify `succ` so its returned list contains exactly the model successors and only graph vertices; specify `all` so it enumerates exactly `dom`.
5. Change higher-order iterators into list-returning operations when the verifier cannot reason about the original iterators.
6. Instantiate the same algorithm functor with each verified structure.

The signature's key clauses are:

```
model dom: V.t fset
model suc: V.t -> V.t fset
invariant forall v1, v2. Set.mem v1 dom /\
  Set.mem v2 (suc v1) -> Set.mem v2 dom
...
ensures forall v'. List.mem v' l <-> Set.mem v' (g.suc v)
```

The paper states that the algorithms are “independent of a specific graph implementation, relying on receiving it as a module that adheres to a certain signature.” (section 4.2, page 10)

Verus form (inference)

Represent the abstract model with a `spec fn` or ghost map/set and expose a trait or module contract for `succ` and `all`. Use trait bounds or generic parameters to make algorithms representation independent. Verus has no direct OCaml functor equivalent; generic Rust functions and trait specifications are the nearest shape. If an iterator is difficult for the verifier, provide a ghost sequence or a finite collection view with a lemma relating it to the concrete iterator.

evidence and limits

The authors reduced OCamlgraph's abstraction by making one concrete functor per analyzed structure because higher-order functors and iterators were unsupported. This makes the method modular but narrows applicability. No performance or coverage claim is made for all 19 OCamlgraph graph variants.

## technique: representation invariants for graph structures

what it is and when to use it

Put persistent facts about a data structure on its record type so every operation must preserve them. The persistent labeled graph stores an adjacency map from vertices to sets of `(destination,label)` pairs. Its invariant expresses vertex closure and undirected-edge symmetry.

how to do it

1. Wrap the map in a record, because Cameleer can attach a type invariant to a record but not an alias type.
2. Define comparison functions and assert their ordering properties as logical axioms at the module boundary.
3. State that each destination in an adjacency set belongs to the graph's vertex domain.
4. State that an edge `(v1,label)` from `v2` is mirrored by `(v2,label)` from `v1`.
5. Prove each constructor and mutator preserves the invariant; then use it as an automatic assumption when proving queries.
6. Add small helper lemmas when SMT provers cannot discover an immediate consequence.

The paper gives this invariant:

```
invariant forall v1. Set.mem v1 self.HM.dom ->
  forall e. Set.mem e (self.HM.view v1).S.dom ->
    let (v2, l) = e in
      Set.mem v2 self.HM.dom /\
      Set.mem (v1, l) (self.HM.view v2).S.dom
```

It says the invariant guarantees “that all the successors of a vertex also belong to the graph and that if there is an edge (v2, l) in v1’s adjacency list, then the edge (v1, l) exists in v2’s adjacency list.” (section 4.1, page 8)

Verus form (inference)

Use a ghost representation field and a `wf` predicate, then put `requires self.wf()` on public methods and `ensures self.wf()` on mutators. For an owned Rust structure, the invariant can be re-established before returning the mutable borrow. A Verus `invariant` clause on loops is different from a type invariant; Verus offers `#[verifier::type_invariant]` for struct invariants (from my knowledge of Verus, not found in the notes), or the `wf` predicate can be carried explicitly in method contracts. Ordering assumptions should be proved as lemmas for concrete comparison functions where possible; axioms remain trusted assumptions.

evidence and limits

Most structure obligations were automatic, but `find_all_edges` needed interactive instantiation of the invariant and logical implication splitting. The authors also added the simple lemma `List.mem e l -> Seq.mem e (of_list l)` because provers had difficulty finding it in context. Thus an invariant reduces proof repetition but does not eliminate lemma engineering.

## technique: use logical axioms only at abstract boundaries

what it is and when to use it

When a generic module accepts a comparison operation, state the algebraic property required by maps and sets instead of reproving it inside every client. Use this only for a genuine module assumption: the concrete implementation must satisfy the axiom outside the client proof.

how to do it

1. Mark comparison operations as usable in logic.
2. State `is_pre_order compare` in the module signature.
3. Use map/set library lemmas under that assumption.
4. Keep the axiom at the boundary and record that it is trusted. (Steps 3 and 4 are the study's inference; the paper only states the axioms and says that without one nothing could be assumed about compare, section 4.1.)

The signatures contain `(*@ axiom pre_order : is_pre_order compare *)` and `(*@ axiom pre_order_compare: is_pre_order compare*)` (section 4.1, page 7). This is an assumption, not a theorem proved by the graph development.

Verus form (inference)

A trait specification can require reflexivity, transitivity, or a total-order property, and generic proofs can assume those lemmas. Prefer executable proof lemmas for a concrete comparator. If a `#[verifier::external_body]` or axiom is used, mark it as trusted in the product's trust inventory; Verus will not establish the property from the comparator code automatically.

## technique: certificate proofs for complex producers

what it is and when to use it

Instead of proving a complex algorithm's output-generation logic directly, prove a validator that checks its output. Use this when the output is a compact witness and a validator is simpler and largely independent of the producer implementation.

how to do it

1. Modify or wrap the cycle finder so it returns a list of vertices rather than only a Boolean.
2. Define `is_path` over a graph model: the first list element must be a successor of the start, each adjacent pair must be an edge, and the final element must be the target.
3. Define a cycle as a nonempty path from its last vertex back to itself; represent “no cycle” by the empty list.
4. Implement `is_cycle` by obtaining the last list element and calling the path checker with that vertex as both endpoints.
5. Prove the validator's Boolean is equivalent to the logical `is_cycle` predicate, including list-membership preconditions.
6. Separately prove the producer terminates and does not raise an unhandled exception. Any producer that returns a list in the expected format can then be checked.

The paper describes the method directly: “instead of proving the function itself, we construct a new support function, a certificate generator or witness validator so to say, which receives an output of the first function and tests whether it is correct.” (section 4.2, page 9)

Its cycle representation is:

```
predicate is_cycle (l : G.V.t seq) (g : G.gt) =
  let len = Seq.length l in
  len <> 0 /\ is_path l[len - 1] l l[len - 1] g
```

Verus form (inference)

Return a ghost or executable witness such as `Seq<V>` and prove a `spec fn valid_cycle`. Implement an executable `fn check_cycle` whose `ensures` establishes `check_cycle(w,g) <==> valid_cycle(w,g)`. The producer can have a weaker postcondition saying its witness is well formed, while a caller invokes the checker before trusting the result. Rust ownership may require borrowing a slice or ghost sequence. The validator does not prove that a producer found a cycle whenever one exists; completeness remains a separate producer property.

evidence and limits

All cycle support functions were proved by Cameleer, and the validator is independent of the cycle-finder implementation so long as the list format is respected. The paper notes that a correct topological sort can similarly certify the no-cycle result. The approach shifts trust to the validator proof, the producer's safety proof, and the interpretation of the witness; it does not remove the need to prove termination or absence of exceptions.

## technique: specify and prove a path checker

what it is and when to use it

Separate a Boolean path-list checker from the existential graph reachability property. The checker gives a reusable fact for cycle validation and BFS proofs.

how to do it

1. Define `edge(v1,v2,g)` as membership of `v2` in the successor set of `v1`.
2. For an empty list, return whether the two endpoints are equal.
3. For a nonempty list, check that its first element is a successor of the start, then recurse through adjacent list elements.
4. State list-membership preconditions ensuring every listed vertex belongs to the graph.
5. Ensure the executable Boolean is equivalent to the sequence-level `is_path` predicate with quantified edge conditions.

The executable contract ensures “b <-> is_path v1 (of_list l) v2 g” (section 4.2, page 11). This deliberately relates an OCaml list to a logical sequence.

Verus form (inference)

Use a `spec fn is_path` over a sequence and a recursive executable or proof checker over a slice. Add `decreases` on the remaining length and prove the conversion between slice/list iteration and the ghost sequence. The exact `Seq` indexing syntax differs, but the correspondence lemma is the reusable artifact.

evidence and limits

The path checker was fully automatic in Cameleer. Its contract requires graph membership for endpoints and list elements; the paper says that otherwise there is no doubt that it is not a path (section 4.2).

## technique: BFS reachability with soundness and completeness invariants

what it is and when to use it

Verify a queue-plus-visited breadth-first search by proving two directions: a returned `true` supplies a path, while an empty queue proves no path exists. Use this when verifying a search over a finite graph where the implementation's cache structures must be related to reachability.

how to do it

1. Initialize a queue with the source and an empty visited table.
2. Pop a vertex; return `true` if it is the target.
3. Otherwise mark it visited and enqueue all successors.
4. Maintain queue soundness: every queued vertex is reachable from the source.
5. Maintain frontier completeness: if a path exists to the target while the queue is empty, some unvisited intermediate vertex must be in the queue.
6. Add the stronger closure invariant that every child of a visited vertex is either visited or queued.
7. Prove the `true` branch from queue soundness; prove the `false` branch by contradiction from frontier completeness.

The soundness invariant is:

```
forall v'. Seq.mem v' q.Queue.view -> has_path v1 v' pc.graph
```

The completeness invariant is:

```
has_path v1 v2 pc.graph ->
  exists w. Seq.mem w q.Queue.view /\ has_path w v2 pc.graph /\
    not (Set.mem w visited.HV.dom)
```

The authors explain that the second condition is difficult because “if there is a path, then there must be an intermediate unvisited vertex in the queue and if there are no more vertices in the queue, this can’t happen.” (section 4.3, page 13)

Verus form (inference)

Model the queue as a ghost sequence and visited as a ghost set, with loop invariants expressing queue reachability, disjointness or membership, and successor closure. Use `while` invariants and `decreases` for queue/remaining-work termination. A Rust `VecDeque` or hash set needs abstraction lemmas connecting concrete operations to ghost updates. Verus's quantifier support may need explicit triggers or helper lemmas for the existential frontier argument.

evidence and limits

The original BFS proof required a ghost function `intermediate_value`, which finds an edge crossing a predicate from true to false along a path. Its contract supplies the unvisited boundary and splits the path around it. Cameleer proved the closure invariant automatically, but the completeness proof needed case analysis and the auxiliary lemma. This is a concrete example where proving the false-result equivalence costs more than proving positive results.

## technique: ghost boundary search and representation-aligned lemmas

what it is and when to use it

Use a ghost recursive function to extract the first edge crossing a predicate along a known path. Add an auxiliary lemma when the logical path uses sequences but executable code uses lists. This is a general proof pattern for turning a global existential claim into a local queue witness.

how to do it

1. Define a predicate `p` and assume `p u`, `not p v`, and a path from `u` to `v`.
2. Recursively inspect the list representation of the path.
3. Stop at the first element not satisfying `p`; otherwise recurse on the suffix.
4. Return vertices `u'`,`v'`, prefix `s1`, and suffix `s2` such that `p u'`, `not p v'`, both path fragments hold, and `edge u' v'` holds.
5. Prove an auxiliary sequence lemma that lifts the list result into the logical `Seq` path form.
6. Instantiate `p` with membership in `visited`; the crossing vertex must be queued by successor closure.

The function's contract includes “ensures p u' /\ not (p v') /\ is_path u s1 u' g” and “ensures is_path v' s2 v g /\ edge u' v' g” (section 4.3, page 14).

Verus form (inference)

Write a `proof fn` over a ghost sequence with a `decreases` length argument, returning a tuple or existential witnesses. Prove a separate lemma that connects a concrete slice traversal to the ghost sequence. Explicitly instantiate the predicate with `visited.contains`. This style is likely useful in Verus protocol proofs whenever an invariant says all successors of a processed object have been discovered or queued.

evidence and limits

The technique closes the BFS completeness proof, but it is not automatic discovery: the authors designed the boundary function and its contract. It assumes a finite represented path and a successor closure invariant. It also adds proof code that has no runtime effect.

## technique: change the data structure to reduce proof complexity

what it is and when to use it

Alter an implementation while preserving its functional behavior when the original representation creates awkward invariants. The paper's alternative BFS keeps `visited` ghost-only and introduces a `marked` table to prevent duplicate queue entries.

how to do it

1. On discovering a successor, check `marked` before enqueuing.
2. If unmarked, mark it and enqueue it; otherwise skip it.
3. Keep popped vertices in `visited` for the logical proof.
4. Prove that `visited` and the queue are disjoint and queue elements are distinct.
5. Reuse the same reachability specification and compare proof obligations with the original algorithm.

The authors report that this version “avoids both of these issues: we made visited a ghost structure and added in a new Hash table by the name of marked.” (section 4.3, page 15)

Verus form (inference)

Maintain a ghost `visited` set and an executable `marked` set or map. Give `marked` a ghost correspondence and make insertion conditional on membership. Distinctness and disjointness invariants can simplify quantified reasoning, though they add state and a correspondence proof. This is an engineering transformation, not a claim that Verus's original proof must be changed.

evidence and limits

Both path implementations were fully proved. The alternative had a simpler completeness proof because the queue and visited sets were separated. The tradeoff is an additional table and mark operation; the paper gives no runtime comparison beyond saying it is “slightly more efficient.”

## automation, evidence, and trust

The development used Z3, Alt-Ergo, CVC4, and EProver through Why3. Appendix statistics report every root and subgoal proved: imperative digraph 22/22 roots and 79/79 subgoals in an average 16.001 seconds; persistent labeled graph 28/28 and 219/219 in 24.769 seconds; cycle finder 9/9 and 78/78 in 18.809 seconds; original path 14/14 and 223/223 in 22.860 seconds; altered path 15/15 and 325/325 in 29.565 seconds. These denominators are proof obligations, not test cases or executions of all possible graphs. Each replay average came from seven runs with the maximum and minimum removed, leaving five; the setup was a 16 GB Ryzen 5 1600 machine in WSL 2 with up to five Why3 processes.

The formal result is (my inference) conditional on GOSPEL specifications, module axioms, the Cameleer translation, Why3's verification-condition generation, and the external SMT/prover implementations. The executable OCaml compiler and runtime are outside the stated theorem. The paper proves safety and functional contracts for the selected modules; it does not prove all OCamlgraph variants, all higher-order clients, asymptotic complexity, or absence of bugs in unsupported language features.

The reported numbers add up within each appendix table (for example 22 of 22 and 79 of 79), so I found no arithmetic contradiction. “Mostly automatic” is supported by the proof descriptions but is not quantified as a fraction of obligations; several assertions, lemmas, and the BFS completeness argument required human guidance.

## implications for VL and what it should not redo

This is a low-level but direct analogue for agent-written verified Rust libraries. A VL graph or protocol library should expose a ghost model and representation invariant once, then verify algorithms through a trait contract. Certificate validators are a practical way to contain difficult search procedures. The main product threat, my inference, is that an agent can generate a plausible BFS or cycle finder and stop after proving only positive soundness; this paper shows that proving the false result requires a distinct frontier invariant and often a custom ghost lemma. A second threat is hidden trust in axioms such as ordering laws or in unsupported translation features.

VL should not redo a generic SMT graph experiment. The reusable work here is the concrete decomposition: model boundary, type invariant, path predicate, certificate checker, soundness invariant, completeness invariant, boundary witness, and representation change. New VL work should measure Rust/Verus ownership overhead, trait-model ergonomics, and checker-versus-producer proof cost.

## techniques for the catalog

- contract plus variant — attach preconditions, postconditions, and a decreasing termination measure to existing recursive code
- modular model signatures — specify graph operations against an abstract finite-domain and successor model
- representation invariants — encode closure and edge symmetry on graph records and preserve them through mutators
- boundary axioms — assume algebraic properties of generic comparison operations at module interfaces
- certificate validation — prove a small witness checker and separately establish producer safety
- path predicate correspondence — relate executable list checks to a quantified sequence path definition
- BFS soundness and completeness — use queue reachability and frontier invariants to prove both true and false results
- ghost boundary extraction — find a predicate-crossing edge along a path to discharge existential completeness claims
- proof-oriented data-structure change — add marking state and ghost sets to make queue invariants disjoint and simpler
- prover-guided splitting — split verification conditions and add small lemmas when SMT automation cannot infer them

Audited 2026-10-12 against the paper: checked all appendix figures (root and sub goals, replay times, machine setup), code excerpts, the algorithm descriptions and every page and section reference. Changed: the variant quotation was not verbatim (paper says a value that decreases with each call), now fixed; the BFS completeness quotation is on page 13, not 14; a proof fn was wrongly used for an executable certificate checker, now an exec fn; an unsupported claim about arbitrary values and the step wording on selecting a verification method were replaced with the paper's wording; steps 3 and 4 of the axiom technique and the conditional-result paragraph are now marked as the study's inference; the Verus type invariant remark corrected from my own knowledge of Verus; removed a leftover process sentence, a doubled phrase, and double backslashes inside quoted contract text. Not checked: the linked GitHub proofs and OCamlgraph source, which are outside the PDF; the Verus type_invariant attribute was not confirmed in the notes.
