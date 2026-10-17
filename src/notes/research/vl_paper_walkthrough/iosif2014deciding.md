# Deciding Entailments in Inductive Separation Logic with Tree Automata
(authored by agents unless marked 🧑)
Tag: `iosif2014deciding`, [paper](https://arxiv.org/abs/1402.2127)

## result and applicability

The paper decides entailments between inductive separation-logic predicates by reducing them to inclusion between nondeterministic bottom-up tree-automata languages. It targets recursive heap structures whose edges are local with respect to a spanning tree: singly and doubly linked lists, trees, and trees with parent pointers. The abstract states: “Our reduction provides tight complexity bounds for the problem and shows that entailment in our fragment is EXPTIME-complete.” (abstract, p. 1)

The input is an inductive system of separation-logic rules. A rule allocates a nonempty spatial head, invokes zero or more recursive predicates, and has a restricted pure equality part. Rules must be connected (Definition 4, p. 10): some formal parameter is a root of the rule's spatial head, and each recursive call receives a variable reachable from that root which is also a root of the head of each rule of the called predicate. The paper proves that allowing unconnected rules makes entailment undecidable (Theorem 2, p. 28; proof p. 29, by reduction from context-free grammar language inclusion), while connected systems have EXPTIME-complete entailment (Theorem 3, p. 29). For non-local structures such as trees with linked leaves, the procedure is sound but incomplete; a negative answer may be a false negative and can cause non-termination in a verification fixpoint (Introduction, p. 1).

## technique: model inductive heaps as tiles and unfolding trees

what it is and when to use it

A tile is a basic separation-logic formula together with one incoming port and zero or more outgoing ports, each port being a tuple of variables (Section 3, pp. 10–11). Composing a parent tile with child tiles using separating conjunction and port equalities gives a tiled tree. The characteristic tile of an unfolding tree is the composed formula represented by that tree. This representation exposes recursive heap shape as a finite tree while retaining pointer equalities and spatial disjointness.

how to do it

1. Write each inductive rule as a nonempty points-to spatial head, recursive predicate tail, and pure equalities (Section 2.4, pp. 8–9).
2. Convert each rule to a tile whose incoming port is the rule's formal parameters and whose outgoing ports correspond to recursive predicate calls (Section 3, pp. 10–11).
3. Compose a parent tile with a child tile by separating their heaps and equating the parent's selected outgoing port with the child's incoming port (the i-composition, Section 3, p. 11).
4. Build an unfolding tree whose root selects a rule for the queried predicate and whose children select rules for each recursive call (Section 3, pp. 10–11).
5. Interpret the characteristic tile as the heap formula obtained by recursively composing all tiles (Section 3, p. 11).

The paper's DLL predicate illustrates the shape: the base rule allocates `hd` and equates `hd` with `tl`; the recursive rule allocates `hd`, points to a fresh `x`, and invokes `DLL(x,hd,tl,n)` (Example 1, p. 9). TLL similarly uses two recursive calls and linked-leaf parameters (Example 2, p. 9).

Verus form

Inference: represent a recursive heap predicate as a Verus `spec fn` over a ghost sequence or tree model, and prove each recursive case with `proof fn`s and `invariant` clauses. Verus does not natively use the paper's tile or separating-conjunction syntax; those are a specification-layer encoding. Inference: a Rust implementation can carry a ghost ownership model while executable pointers remain in the code, but the correspondence between the model and raw memory must be proved separately.

what the evidence shows and limits

The tile semantics is a formal reduction, not a runtime measurement. It requires nonempty rule heads and the stated restrictions on parameter copying and equalities. The paper's restriction to nonempty heads "currently does not allow defining data structures of zero size (such as empty lists, trees, etc.)", and predicates such as `JOIN DLL` cannot be defined in the framework; an extension with a concatenation operation on tree automata is left for further investigation (Remark, Section 2.4, p. 10).

## technique: canonicalization and rotation invariance

what it is and when to use it

The same local heap can be represented by different spanning trees depending on the entry point or traversal order. Canonical tiles sort incoming and outgoing ports by selector order and separate forward and backward references. A rotation maps one tree representation to another while preserving adjacency. Closing an automaton under all canonical rotations makes representation choice irrelevant.

how to do it

1. Eliminate pure equalities by replacing each variable with the representative of its equality class; keep only equalities between formal parameters one of which is allocated (Section 4.1, p. 21).
2. Split each rule head into one points-to proposition per rule using a depth-first traversal of its spatial formula (Algorithm 1, pp. 21–22).
3. Order ports by selector positions and require matching forward/backward port lengths between a parent tile and each child tile (Definition 8, Section 3.1, pp. 12–13).
4. Define canonical rotations (Definition 9, pp. 15–16) as bijections between tree positions, with a variable substitution per tile, such that each parent/child pair in the first tree is adjacent (as parent, child, or via the reversed direction) in the second and the forward/backward ports match accordingly. Lemma 1 (p. 5) shows that reversed directions occur only on the path from the root to the position mapped to the new root.
5. Build a rotation-closure automaton that accepts every rotated tree of the original automaton (Section 4.3, pp. 25–27).

The formal basis is the paper's statement: “This fact is the basis of the completeness argument of our method.” (Section 3.1, p. 12) For a canonical tree, the paper says "any two models of Φ(t) differ only by a renaming of the allocated locations" (p. 14, before Lemma 3; Lemma 3, pp. 14–15). Lemma 4 (pp. 16–18) states that if a state S satisfies a canonical tree t, then S satisfies a canonical tree u if and only if u is a canonical rotation of t.

Verus form

Inference: canonicalization is a ghost normalization of a heap model, not a runtime operation. A Verus proof can define a canonical sequence/tree view and prove that different traversal roots yield equal views, then use that view in `spec fn` contracts. Inference: no Verus construct automatically proves pointer-graph isomorphism; helper `proof fn`s and extensional equality lemmas are required.

what evidence shows and limits

For local rooted systems the rotation closure is complete. For non-local edges, the paper introduces quasi-canonical tiles and proves only the one-way implication that a state satisfying one quasi-canonical tree also satisfies its rotation (Lemma 5, Section 3.2, pp. 18–20). Thus soundness remains, but completeness is lost outside the local fragment.

## technique: quasi-canonical encoding for non-local edges

what it is and when to use it

Quasi-canonical tiles extend canonical tiles with equality ports that may connect non-local edges across several tiles. Projecting away equality variables yields a canonical tree, while equality substitutions preserve enough information to represent structures such as trees with linked leaves.

how to do it

1. Factor every port into forward, backward, and equality components (Section 3.2, p. 18).
2. Project away equality components to obtain a canonical tree (Section 3.2, p. 19).
3. Define quasi-canonical rotations as a canonical rotation of the canonical projections plus per-tile substitutions that match the equality ports (Definition 11, pp. 19–20).
4. Use the one-way semantic lemma (Lemma 5, p. 20) to conclude sound entailment when a rotated tree is accepted (soundness part of Theorem 1, p. 28).

Inference: encode equality components as ghost equalities in a Verus heap model and prove substitution preservation. The paper's loss of completeness means a Verus-based decision aid should treat a rejected entailment as “unknown” and require a separate proof, rather than infer that the entailment is false.

## technique: convert inductive systems to tree automata

what it is and when to use it

After preprocessing, the tool turns each inductive predicate into a finite tree automaton. Automaton states correspond to predicate names; transitions correspond to inductive rules; labels are normalized quasi-canonical tiles. By Lemma 6, a state satisfies the predicate if and only if it satisfies the characteristic tile of some tree accepted by the automaton.

how to do it

1. Eliminate propagated formal parameters by tracking each parameter through recursive calls: the tracked parameter is replaced by the actual parameter where it is allocated or not propagated further, and is removed from rules that do not reference it (Algorithm 2, prose p. 23, listing p. 34).
2. Compute forward, backward, and equality signatures (Algorithm 3, listing p. 35). An empty equality signature for every predicate is a sufficient test of locality, which "turned out to be powerful enough for all the examples that we considered in our experiments" (Section 4.2, p. 24).
3. Normalize each tile by replacing variables with fresh names in a fixed order (Section 4.2, p. 24).
4. Sort ports using selector order and create one automaton state per predicate name (Section 4.2, p. 24).
5. Add a transition for every inductive rule and mark the queried predicate's state as final (Algorithm 4, prose p. 24, listing p. 36; Lemma 6, p. 25).

The construction has automaton size `O(|P|)` (Lemma 6, p. 25). The splitting into one points-to proposition per rule takes time `O(|P|)` (Algorithm 1, p. 23), parameter elimination is linear in the size of the system (p. 23), and equality elimination preserves system size (p. 21).

Verus form

Inference: this automaton is an external decision procedure over a ghost representation. A Verus proof can use the accepted-tree relation as a candidate lemma, then independently prove the concrete Rust data structure satisfies the corresponding predicate. Inference: the automaton's states and transitions should not be marked `assume` in a final proof unless the translation itself is trusted and justified.

## technique: entailment as language inclusion

what it is and when to use it

To decide `Pi(x) |= Pj(x)`, construct an automaton `A1` for the left predicate and a rotation-closed automaton `Ar2` for the right predicate. Check `L(A1) ⊆ L(Ar2)`. If inclusion holds, entailment holds for all states. If both rooted systems are local, inclusion is also necessary.

how to do it

1. Apply the conversion above to both predicates (Section 4, pp. 20–25).
2. Compute the rotation closure of the right-hand automaton (Section 4.3, pp. 25–27; Lemma 7 gives size `O(|A|^2)`).
3. Run nondeterministic tree-automata inclusion checking (Theorem 1, p. 28; the paper's implementation uses the VATA library, Introduction, p. 2).
4. Report “yes” only when inclusion succeeds; for non-local systems, treat “no” as potentially incomplete (Introduction, p. 1; Theorem 1, p. 28).

Theorem 1 states soundness generally and completeness for local rooted systems. For Theorem 3 (pp. 29–30), hardness reduces tree-automata inclusion to entailment, and membership in EXPTIME follows from the polynomial reduction of Theorem 1 to tree-automata inclusion; the paper cites Corollary 1.7.9 of [8] for EXPTIME-completeness of nondeterministic tree-automata inclusion. Unconnected systems are undecidable (Theorem 2, p. 28). Inference: checking connectedness is therefore a precondition for the stated guarantee (Algorithm 1 aborts on disconnected rules, pp. 21–22).

Verus form

Inference: use inclusion results as proof lemmas about ghost predicates, then connect those predicates to Rust contracts with `requires`, `ensures`, and `invariant`. Verus itself is not a tree-automata inclusion solver; integrating one would require an external certificate or a separately verified checker. Inference: a failed inclusion check should become a proof obligation or an unsupported-case report, not an unchecked `assume`.

## experimental evidence

The prototype accepts two rooted systems after parameter elimination. Table 1 lists 14 entailment queries; its upper and lower sections separate local and non-local systems. It answered every listed query correctly, and all running times were under one second on an Intel Core2 3 GHz PC with 4 GB RAM (Section 6, p. 30). The table reports automaton state/transition sizes for each row; for example, DLL entailments use 2/4-state/transition automata before rotation and 5/8 after rotation, while a TLL parent-pointer query reaches 16/26 after rotation (Table 1, p. 31). The paper says no reduction technique was applied to reduce the rotated automaton size (Section 6, p. 31).

The denominator is the 14 table queries, not all possible inductive systems. The authors also state that "the incompleteness of our approach has never showed up" in the experiments (Section 7, p. 32), which is an observation over those listed cases, not a completeness result. The prototype step “replaced each left/right-hand side ... by a new top-level predicate” and then performed parameter elimination before applying the tool (Section 6, p. 31); the authors write "We have not yet implemented this step, but we tightly followed Alg. 2."

## what is proved, trusted, and left open

The paper proves the semantic reduction, soundness, local completeness, EXPTIME-completeness, and undecidability boundary. Inference: it relies on the separation-logic semantics, the tree-automata algorithms, and the inclusion checker implementation (VATA), none of which is verified in the paper. Non-local quasi-canonical closure is sound but incomplete. It does not verify executable Rust, compiler behavior, unsafe pointer code, concurrency, or a Verus memory model.

Inference: for VL, the reusable lesson is a certificate-producing separation between candidate heap-shape reasoning and the final Rust proof. An agent could generate inductive predicates and an automaton inclusion certificate, but Verus must still prove that the concrete Rust operations preserve the modeled ownership and shape. The product threat is hidden incompleteness: a tool returning “no” for a non-local case can be mistaken for a counterexample, or an external automaton result can be trusted without checking its connection to the code. VL should not redo this paper's automata reduction as if it were new; it should reuse its local/non-local boundary and require explicit evidence for any certificate adapter.

## techniques for the catalog


- tile semantics for recursive heaps — compose separation-logic rule heads and recursive calls into characteristic tiled trees
- canonical heap-tree normalization — eliminate equalities, split heads, and order ports so equivalent local heaps have normalized representations
- rotation closure — accept all spanning-tree rotations that represent the same local heap
- quasi-canonical non-local encoding — add equality ports to represent non-local edges with sound but incomplete rotation reasoning
- inductive-system to tree-automaton compilation — map predicates to states and rules to normalized tile transitions in linear size
- entailment by language inclusion — decide a local separation-logic entailment through inclusion of a left automaton in the rotated right automaton
- locality and complexity checks — enforce connected rules for decidability and use empty equality signatures as a sufficient locality test
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The following lemma is the key for proving completeness of our entailment checking for local inductive systems: if a (local) state is a model of the characteristic tiles of two different canonical tree, then these trees must be related by canonical rotation."): read the whole paper text and checked every quotation, theorem and lemma number, page reference (page numbers are those printed in the arXiv v2 text), the Table 1 count and sizes, the timing and machine, and each step of the techniques against the paper; changed page references (Theorem 1 is on p. 28, Lemma 4 on pp. 16-18, Lemma 3 on pp. 14-15, Table 1 on p. 31, the incompleteness remark on p. 32), the equality-elimination and parameter-elimination steps, the connectedness definition, the locality test (the paper does not say the implementation uses it), the Theorem 3 proof outline, and the claim about what the automaton accepts; replaced a paraphrase of the zero-size limitation and the unimplemented replacement step with the paper's words; marked the reliance list and the connectedness precondition as Inference; did not check the proofs of Lemmas 1 to 7 line by line, Algorithms 2 to 5 beyond their prose descriptions, the cited related work, or the Verus-form inferences, which are the study's own and not in the paper. Link from the paper text (arXiv:1402.2127v2).
