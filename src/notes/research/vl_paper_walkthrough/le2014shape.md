# Shape Analysis via Second-Order Bi-Abduction
(authored by agents unless marked 🧑)
Tag: `le2014shape`, [paper](https://www.semanticscholar.org/paper/430f66f4683c7b67138a4cb9b053671c646e1b01)

## central method

The paper synthesizes separation-logic heap predicates while verifying each method. Its abstract states: “We present a new modular shape analysis that can synthesize heap memory specification on a per method basis.” (abstract, page 52). Unknown second-order predicates stand for pre/post shapes; verification generates relational assumptions, then derivation and normalization turn those assumptions into definitions. The method is implemented as S2 inside HIP and targets memory safety, especially null dereferences and leaks.

## technique: second-order bi-abductive entailment

Use this when a method's heap shape is unknown and fixed list predicates are too restrictive.

1. put fresh unknown predicates in the method contract, for example `requires H(x,q)` and `ensures G(x,q)`.
2. run ordinary Hoare-style symbolic verification, but replace each heap entailment with the extended procedure.
3. given antecedent Δa and consequent Δc, infer a frame residue Δf and relational assumptions R such that `R ∧ Δa` entails `Δc * Δf` (section 3, pages 54–55).
4. when an unknown predicate meets a points-to assertion, unfold it into the node plus fresh unknown predicates for fields and the remainder; when an unknown occurs in the consequent, fold reachable heap pieces into it.
5. accumulate R across method branches and calls; solve R only after collecting the obligations.

The paper summarizes the purpose: “The core of the new entailment procedure generates a set of relational assumptions on unknown predicates to ensure memory safety.” (section 1, page 53). Its list-to-doubly-list example generates assumptions A1–A4 for null and non-null branches, field access, recursive call, and postcondition establishment (section 3, pages 55–56).

Inference: Verus has no `bi-abduction` command. A Verus front end could infer missing heap facts and emit `requires` clauses, ghost ownership predicates, and `proof fn` lemmas; a verified Rust function would still need those generated contracts checked by Verus. The separation-logic frame is an inference layer, not a direct Verus construct.

## technique: #-annotations and heap guards

Use this for predicates with back pointers or multiple parameters, where unrestricted unfolding can instantiate one location repeatedly. Mark parameters as instantiatable or `#` non-instantiatable. During unfolding, instantiate each ordinary parameter at most once and never instantiate `#` parameters; during folding, traverse from ordinary parameters and stop at `#` parameters (section 4, pages 57–58). This prevents formulas such as repeated aliases that would force a false precondition.

When folding, record a heap guard containing known nodes reachable from the `#` parameters. The paper says: “Such heap guards help with capturing the relations of heap structures and recovering those relationships when necessary (e.g. back-pointer x#).” (section 4, page 58). The guard preserves relationships such as a node's parent while the traversed segment is folded.

Inference: represent a Verus analogue with ghost references or maps and explicit separation/disjointness predicates. State the non-duplication condition in `requires`; preserve it in loop `invariant` declarations and prove fold/unfold lemmas with `proof fn`. Verus ownership supplies some alias exclusion, but the paper's automatic #-inference is not a Verus feature.

## technique: derive predicates from relational assumptions

Use this after verification has generated R. The algorithm `PRED_SYN` first exhaustively applies base splitting, separates pre and post assumptions, then repeatedly picks one unknown and assumption. For pre-predicates, it applies case splitting to make guards disjoint, groups disjoint cases, derives a definition, inlines it into remaining assumptions, and discharges obligations. For post-predicates, it groups antecedents and defines the post predicate as their disjunction (section 5, pages 60–62).

The paper's concrete `sll2dll` result is `H(x,q) ≡ emp ∧ x=NULL ∨ x↦node(xp,xn) * Hp(xp,q) * H(xn,x)` and `G(x,q) ≡ emp ∧ x=NULL ∨ x↦node(q,xn) * G(xn,x)` (section 3, page 56). This gives a reader an executable shape recipe: base case is empty heap at null; recursive case owns the current node and recurses on the next field.

Inference: a Verus implementation could generate candidate `spec fn` predicates over ghost sequences/maps and then emit proof lemmas whose `ensures` establish each relational assumption. `spec fn` definitions describe logical shapes; executable functions must not call `proof fn` at runtime. The paper's solver and separation heap are not automatically available in Verus.

## technique: normalize synthesized shapes

Use normalization to make inferred contracts smaller and reusable. `PRED_NORM` (1) replaces undefined dangling predicates with special dangling variables, (2) removes parameters unused by a definition, (3) reuses an equivalent existing predicate after an entailment check, and (4) splits predicates to increase reuse (section 5.4, pages 62–63). In the list example it removes an unused `q` parameter and turns the dangling `prev` field into a marker `Dp`.

The paper's soundness theorem states: “If Δa Δc ; (R, Δf ) and Γ=PRED NORM(PRED SYN(R)) then Γ : ΔaΔc ∗ Δf .” (theorem 6.1, page 63). Thus normalization is intended to preserve the assumptions, rather than merely prettify output.

Inference: in Verus, normalization can simplify ghost predicate arguments and factor reusable `spec fn`s, but each rewrite needs a proof lemma preserving the original `ensures`. A generated contract should be rechecked after normalization; textual equivalence is not enough.

## evidence and measured scope

S2 was evaluated on lists, cyclic lists, doubly linked lists, skip lists, trees, rose trees and tree/list combinations. Table 1 reports synthesis and verification times in seconds for each example on an Intel i7-960 3.2 GHz with 16 GB RAM (section 7, pages 63–64). Across all examples, inference took 8.37 s and re-verification 8.25 s. Normalization reduced synthesized predicate size by 68% (169/533 conjuncts) with a time overhead of 27% (8.37 s without normalization versus 10.62 s with it; section 7, page 65). These denominators and settings are the paper's aggregate over its listed examples, not a general performance guarantee.

On four Glib files, S2 inferred memory-safe specifications for 192/216 procedures and loops (89%; figure 8, page 65). The files were `gslist.c` (698 LOC, 33 procedures, 18 loops, 47 inferred), `glist.c` (784, 35, 19, 49), `gtree.c` (1204, 36, 14, 44), and `gnode.c` (1128, 37, 27, 52). The paper notes that array data structures were unsupported, so some procedures such as `gtree_insert_internal` were not verified.

The stated limitation is direct: “Our present proposal cannot handle graphs and overlaid data structures since our instantiation mechanism always expands into tree-like data structures with back pointers.” (section 7, page 65). Soundness depends on the entailment procedure and predicate-derivation rules; the authors nevertheless re-verified inferred specifications to demonstrate integration. The CIL translation is another assumption: its semantics are preserved only subject to CIL's limitations (section 7, page 63).

Inference: for agent-written verified Rust, this technique threatens less the final checker than the specification layer. It could infer ownership-shape contracts for recursive lists and trees, reducing manual boilerplate, but graphs, alias-heavy unsafe code, arrays, and domain-functional properties remain outside the demonstrated coverage. A wrong inferred shape can make a contract too weak or too strong; Verus must check the emitted contract and code, and external memory/hardware behavior stays trusted unless separately modelled.

## techniques for the catalog

- second-order bi-abduction — infer relational heap assumptions and frame residues while verifying with unknown predicates
- guarded fold/unfold — use #-annotated parameters and heap guards to control aliases and preserve back-pointer context
- relational predicate synthesis — derive disjoint preconditions and disjunctive postconditions from collected assumptions
- predicate normalization — eliminate dangling structure and unused parameters, reuse equivalent definitions, and split predicates
- modular shape inference — synthesize per-method memory-safety contracts and compose them through verified calls

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
