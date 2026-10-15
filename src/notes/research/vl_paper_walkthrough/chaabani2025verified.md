# Verified Path Indexing
(authored by agents unless marked 🧑)
Tag: `chaabani2025verified`, [paper](https://doi.org/10.1007/978-3-031-99984-0_14)

## what the paper proves

The paper formalizes path indexing in Isabelle/HOL. Its abstract says: “This paper presents the first veriﬁed implementation of a term indexing data structure, namely a formalization of path indexing in the proof assistant Isabelle/HOL.” (Abstract, p. 249). It defines the structure, maintenance, and four retrieval operations, and states that “We prove that maintenance operations preserve the invariants of the structure, and that retrieval operations are sound and complete.” (Abstract, p. 249). The implementation is functional Isabelle/HOL; the conclusion explicitly says that efficient mutable implementations remain future work.

Inference: For VeruLaw, this is a model of verifying an indexing structure together with the mathematical relation it implements. A direct Rust/Verus port would require replacing Isabelle datatypes, finite maps, inductive predicates, and lifted typedefs with Rust data and Verus specifications; the invariant-and-operation decomposition carries over, while Isabelle syntax and its code extraction do not.

## technique 1: model terms and retrieval relations before the index

What it is. Terms are an inductive datatype, `Var v | Fun f (f,v) term list` (Sect. 3, p. 251). A term index stores a set of terms and retrieves terms satisfying a relation. The paper defines exact relations for unification, instantiation, generalization, and variants using substitutions. For example, `term-unification t1 t2 = (∃ σ. t1 · σ = t2 · σ)` (Sect. 3, p. 252).

When to use it. Use this separation whenever a data structure is an acceleration of a semantic query: define the mathematical relation first, then state what the implementation may return. Path indexing is an imperfect filter, so the implementation returns a superset and a standard unification algorithm filters it; the paper says, “Like many term indexing techniques, path indexing is a so-called imperfect filter.” (Sect. 3, p. 252).

How it is done. Define exact relations with substitutions. Define weaker linear relations that ignore repeated-variable constraints: `linear-unification`, `linear-instance`, `linear-generalization`, and `linear-variant` (Sect. 3, pp. 252–253). Prove a necessary-condition lemma such as `term-unification t1 t2 ⟹ linear-unification t1 t2` (Sect. 3, p. 253). Use the linear relation as the index specification; apply a complete unification algorithm to the returned superset when exact answers are needed (Sect. 3, p. 252).

Verus form. Inference: represent terms as an executable Rust enum with a `spec fn` for each semantic relation and a `spec fn` for each linear relation. State the necessary-condition theorem with `ensures`; prove it in a `proof fn`. Keep the filtering unifier as executable Rust with a contract. Do not put `ensures` on a `spec fn`, and do not call a proof function at run time. These are the Verus constructs used in the Verus reference notes.

Evidence and limits. The paper proves the necessary-condition lemma and later proves retrieval soundness and completeness for the linear relation (Sect. 3, p. 253; Sect. 4.3, pp. 258–259). The relation deliberately ignores non-linearity, so exact unification is not established by the index alone. Inference: a Verus user must make that residual filtering assumption explicit in the API contract.

## technique 2: represent paths and a trie with explicit invariants

What it is. A path is a list of `(symbol, child-number)` pairs from a term root to a leaf; variables map to `Star`, and function symbols map to `F f arity` (Sect. 3, pp. 253–254). The trie has `Leaf term set` and `SymbolNode` containing nested finite maps (Sect. 4.1, p. 255). Terms are stored in every leaf reached by one of their paths.

How it is done. Define predicates for (1) `sound-storage`: every stored term is at a path of that term; (2) `complete-storage`: every path of every stored term has a corresponding leaf; (3) `well-structured`: edge arities and leaf shape agree; and (4) `minimal-storage`: no empty leaves or childless nodes except the root (Sect. 4.1, pp. 255–256). Generalize soundness and completeness to `...-from-position`, parameterized by the prefix path of a subtrie, because root-only predicates do not support recursive proofs (Sect. 4.1, p. 256). Package valid tries in a typedef requiring all four predicates (Sect. 4.1, p. 256).

Verus form. Inference: use a Rust trie with `Map`-like storage and a ghost/spec view of all leaves. State the four properties as `spec fn` predicates over the view and a path prefix. Put them in the representation invariant of the index type. Verus has no Isabelle typedef or Isabelle finite-map coercion; the Rust type and its constructor must establish the invariant, and methods must preserve it. Use `invariant` only in a loop or quantified proof context as supported by Verus, rather than as a function call.

Evidence and limits. The paper explains why it needs position-indexed predicates: “properties sound-storage and complete-storage hold only for the root of the trie, and not for subtries.” (Sect. 4.1, p. 256). It reports that well-structured and minimal-storage preservation are direct, while sound and complete storage require generalized lemmas (Sect. 4.2, pp. 257–258). No runtime benchmark or mutable implementation is reported. The conclusion says, “to obtain efficient implementations, we will need to verify imperative code with mutable data structures.” (Sect. 5, p. 259).

## technique 3: verify insertion and deletion by path recursion

What it is. Insertion and deletion traverse from the root along every path of the term, creating, updating, or removing nodes. The paper defines `insert-leaf`, map update helpers, and recursive `insert-aux`; the latter inserts a term into every leaf reached by the paths of a structural term (Sect. 4.2, pp. 257–258).

How it is done. For a variable or zero-arity function, update the corresponding symbol map and child 0, inserting into a leaf. For a non-empty function, update the symbol entry and recursively process each argument at child indices `[0 ..< length fargs]` (Sect. 4.2, p. 257). Define `insert-term tr t = insert-aux tr t t`, then lift it to the valid-index type. Prove preservation of all four invariants. The key completeness lemma assumes `well-structured`, position-indexed completeness, and that the term has the given subterm at the position; it concludes position-indexed completeness after insertion (Sect. 4.2, p. 257). Specify extensional behavior with `index-to-set (index-insert tr t) = insert t (index-to-set tr)` (Sect. 4.2, p. 258). Define deletion analogously, additionally removing empty leaves and nodes, and prove its invariant preservation and set specification (Sect. 4.2, p. 258).

Verus form. Inference: write insertion and deletion as executable recursive Rust methods over the trie, with a decreases measure for recursion and contracts relating the ghost set before and after. Use a proof helper for the position-indexed completeness lemma. For mutable maps, expose a ghost snapshot or abstract map so that updates can be related to the mathematical set. The Isabelle `lift-definition` is replaced by methods whose precondition and postcondition establish the index invariant.

Evidence and limits. The paper gives the insertion specification and says deletion has the same kind of specification (Sect. 4.2, pp. 257–258). It does not provide operation counts, throughput, or a comparison with an unverified index. Inference: the formal evidence establishes functional preservation and extensional set behavior, not performance parity with production theorem provers.

## technique 4: retrieve by matching one path level at a time

What it is. `retrieve-unifications` recursively follows trie edges whose symbol and arity match the query, unions all variable (`Star`) leaves, and returns all terms in matching leaves. For a variable query it returns the whole trie; for a function query it recursively retrieves each argument child (Sect. 4.3, pp. 258–259).

How it is done. Define `var-terms` as the set below the `Star` edge. For a variable query, return `to-set`. For `Fun f fargs`, union `var-terms` with the matching `F f (length fargs)` branch; return the zero-arity leaf directly, otherwise recurse over each argument index (Sect. 4.3, p. 258). Lift the function to the valid `index` type. Prove two directions: every returned term is in the stored set and satisfies `linear-unification` (soundness), and every stored linear unification is returned (completeness), using position-indexed sound/complete lemmas (Sect. 4.3, pp. 258–259). Apply exact unification afterward because the index relation is only linear.

Verus form. Inference: implement retrieval with a recursive function and a `decreases` clause over remaining path depth. Give a postcondition characterizing the returned set by stored membership and the linear relation. Prove soundness and completeness with lemmas over the trie invariant and path prefix. The executable method can return a candidate vector or set; exact filtering remains a separate method with its own contract.

Evidence and limits. The paper states the exact theorem: `index-retrieve-unifications tr t1 = {t2. t2 ∈ index-to-set tr ∧ linear-unification t1 t2}` (Sect. 4.3, p. 259). It also says the same ideas are used for generalizations, instances, and variants (Sect. 4.3, p. 258), but gives no separate theorem text or measurements for those three operations. Inference: those operations should be treated as the same proof pattern with relation-specific recursion, not as independently evaluated implementations.

## trust, reuse, and product threat

The proved facts are the four trie invariants, insertion and deletion preservation, extensional set behavior, and soundness/completeness of retrieval for linear relations (Sects. 4.1–4.3, pp. 255–259). The paper leaves trusted the Isabelle/HOL kernel and code-extraction path, the standard unification filter, and the semantic choice that linear relations are adequate filters for the caller. Inference: a Verus product would additionally trust its Rust compiler, Verus/Z3 translation, and any external term representation or map implementation, unless those receive contracts and proofs.

Inference: this paper is a moderate threat to agent-written verified Rust because it demonstrates a complete proof pattern for a nontrivial, recursive index, but it does not provide a Rust implementation, mutable refinement, or performance data. VL should reuse the invariant decomposition, position-indexed induction, and two-stage candidate-then-filter API. VL should not redo a basic path-indexing design without adding a Verus-specific implementation, refinement, or measured engineering result.

## techniques for the catalog

- path-index filter — store every term at symbol/argument paths and retrieve a superset characterized by linear unification, then run exact unification

- position-indexed trie invariants — parameterize soundness and completeness by a subtrie’s path prefix so recursive proofs apply

- verified maintenance — prove insertion and deletion preserve well-structured, sound, complete, and minimal storage and specify their abstract set effect

- retrieval soundness/completeness — prove recursive path retrieval returns exactly the stored terms satisfying the chosen linear relation
Checked 2026-10-15 against paper chaabani2025verified: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
