# Paxos Made EPR: Decidable Reasoning about Distributed Protocols
(authored by agents unless marked 🧑)
Tag: `padon2017paxos`, [paper](http://arxiv.org/abs/1710.07191v1)

## scope and result

Padon, Losa, Sagiv, and Shoham present a methodology that transforms distributed-protocol models and inductive invariants into effectively propositional logic (EPR), a decidable first-order fragment with finite countermodels. They model Paxos and five variants, then use IVy and Z3 to check safety. The paper's abstract states: “Our methodology involves modeling protocols using general (uninterpreted) first-order logic, and then systematically transforming the model to obtain a model and an inductive invariant that are decidable to check.” The method targets protocol designs rather than low-level implementations; refinement to an implementation remains outside this proof.

The Paxos safety property is agreement: no two decisions contain different values. Multi-Paxos requires agreement per instance; Stoppable Paxos additionally prevents decisions at instances after a decided stop command (Section 5.2, p. 16; Section 7.2, p. 23; Appendix A.4, p. 44). The methodology asks the user for a model, derived relations, rewrites, an auxiliary invariant, and a final inductive invariant. Automated checks either prove the obligations or return finite counterexamples to induction or to a rewrite. It is sound when the supplied axioms and rewrites are sound, but incomplete: a safe protocol may lack a suitable EPR invariant or an EPR-checkable rewrite.

## technique: model the protocol in uninterpreted first-order logic

Use this when the system has unbounded nodes, rounds, messages, sets, or maps that make direct quantified SMT reasoning undecidable. The first step is a many-sorted first-order transition system `(INIT, TR)`, where states are structures over constants, relations, and functions. The authors replace interpreted domains with uninterpreted sorts and axioms. For a total order, they add reflexivity, transitivity, antisymmetry, and totality axioms (Section 3.1.1, p. 6).

Steps:
1. choose a sort for each protocol domain (node, round, value, quorum)
2. represent state fields as relation or function symbols
3. write `INIT` and each atomic action's transition formula `TR`
4. add only axioms valid in the intended domain
5. encode sets as a sort plus a `member` relation, and maps as a sort plus an `apply` function (Section 3.1.2, p. 6)
6. state safety as a closed formula over the state

The paper warns, “While this encoding is sound (as long as we only use axioms that are valid in the higher-order interpretation), it cannot be made complete due to the limitation of first-order logic.” (Section 3.1.2, p. 7)

Inference: a possible Verus adaptation is to express the protocol as an abstract state machine, represent domains with specification predicates, and prove that executable Rust refines the model. The paper does not evaluate Verus.

## technique: inspect the quantifier-alternation graph

After the first-order model and invariant are written, compute a graph whose vertices are sorts and whose edges record dependencies from function arguments to results and from universal variables to existential variables within their scope. Cycles often make Z3 diverge. If the graph is acyclic, the formula is in extended EPR (stratified quantifier alternation), which preserves decidability and finite-model property (Sections 2.2 and 3, pp. 5–7).

Steps:
1. put each verification condition in negation normal form
2. for each function, add an edge from every argument sort to its result sort
3. for each existential quantifier, add an edge from the sort of every universal quantifier whose scope contains it to the existential variable's sort
4. include both positive and negative invariant occurrences in the verification conditions, then find cycles
5. choose derived relations and rewrites that remove the cycles
6. optionally bound selected sorts for semi-bounded debugging; bounding a sort removes its graph node

Inference: an external tool could inspect Verus verification conditions for these dependencies and suggest derived relations. The paper does not establish that this analysis would capture all reasoning used by Verus.

## technique: encode existential facts as derived relations

The paper's main transformation captures an existential formula `ψ(x̄)` with a state relation `r(x̄)`, then rewrites transitions and invariants to use `r`. For example, `r(x)` captures `∃y. p(x,y)`. The automatically generated initialization and update code maintains the representation invariant `∀x̄. r(x̄) ↔ ψ(x̄)` (Section 3.2, pp. 7–9). The authors write, “Derived relations are somewhat analogous to ghost variables.” They distinguish them by their role in expressing current-state properties and by their ability to affect transitions (Section 3.2, pp. 7–8).

Steps:
1. identify an existential subformula causing an alternation cycle
2. declare a derived relation whose arguments are the free variables of that formula; omit the existentially quantified variables
3. generate initial values and update code so its representation invariant holds
4. rewrite guarded transition formulas to use the relation
5. prove rewrite equivalence under an auxiliary invariant
6. provide a final invariant using the derived relation and any needed representation consequences, then check that it is inductive and implies safety in EPR

Inference: a possible Verus adaptation is to maintain a ghost relation together with a proof that it represents the existential formula. A separate refinement argument would be needed for changes to executable guards.

The automatic update scheme handles `ψ(x̄) = ∃ȳ. φ(x̄,ȳ) ∧ p(xᵢ₁,…,xᵢₖ,ȳ)`, where `φ` is quantifier-free, its relations are never modified, and the positive occurrence of `p` contains all existential variables. It requires `p` initially empty and updated only by single-tuple insertions. Initialize the derived relation empty; on insertion, substitute the inserted existential values into `φ` and add the corresponding free-variable tuples. This update introduces no quantifier alternation. The presentation does not handle deletions or multiple-tuple insertions (Section 3.3, pp. 11–12).

## technique: verify rewrites with an auxiliary invariant

Rewriting can change a syntactic guard while preserving reachable behavior. The method checks equivalence only where a modified assume command executes, under an auxiliary inductive invariant `INVaux`. This can be easier than proving the final safety invariant. The paper gives the condition `INVaux ∧ g ⊨ θ ↔ θ̂[ψ/r]` and automatically reports a rewrite counterexample if it fails (Section 3.2, pp. 8–10).

Steps:
1. identify the exact subformula changed by a rewrite
2. state an auxiliary invariant that holds in the original model
3. prove the auxiliary invariant is inductive
4. prove the changed and original subformulas equivalent under the guard and auxiliary invariant
5. only then check the transformed model's safety invariant

Inference: a possible Verus adaptation is a separate proof lemma for guard equivalence under the state invariant, with both guards expressed explicitly.

The transformed model is bisimilar to the original on reachable states, after projecting away the added relations. The authors state: “Unlike safety, inductiveness is not necessarily preserved by the transformation.” A counterexample to induction in the transformed model may depend on inconsistent derived relations and need not correspond to one in the original model (Section 3.2, p. 10).

## technique: split proof effort between semi-bounded and EPR checks

Semi-bounded verification bounds only sorts needed to break quantifier cycles, rather than bounding every sort. It is useful for debugging the original first-order model, but its runtime grows with the round bound. The final EPR model is unbounded and decidable (Section 3.1.3, p. 7).

Inference: use bounded models or small-model tests to debug a state-machine invariant before proving it for arbitrary states. A bounded test is evidence for finding counterexamples, not a proof of the unbounded property.

## protocol-specific reuse: Paxos and its variants

For Paxos, `left_round(n,r)` captures that node `n` has acknowledged a higher round; `joined_round(n,r)` captures that it acknowledged round `r`, omitting the reported vote fields. The transformation uses them in guards and the invariant. Replacing only the quorum acknowledgment guard with `joined_round` produces a spurious counterexample: the candidate invariant permits `joined_round` entries without corresponding acknowledgment messages. Restoring the full representation invariant would reintroduce a quantifier cycle. Instead, the authors rewrite proposal selection to take the maximum over actual prior votes from the quorum, prove this equivalent using an auxiliary invariant, and strengthen the final invariant with two universal properties: joining a higher round implies leaving lower rounds, and acknowledgment messages imply joined rounds (Section 6, pp. 17–20).

These transformations are reused with modifications across the variants. Vertical Paxos I is an exception: it needs `left_round` and a relational replacement for `complete_of`, but does not need `joined_round` or the rewrite to select actual votes (Appendix A.1.3, pp. 36–37). Flexible Paxos changes the quorum sorts and uses the cross-phase intersection axiom (Section 8.3, p. 25; Appendix A.3, pp. 42–44). Fast Paxos requires checking changed subformulas separately to keep the rewrite proof in EPR (Appendix A.2.3, p. 41).

For Stoppable Paxos, the original proposal rule produces cyclic quantifier alternation. The authors replace it with a rule that chooses the stop command with the highest round and checks whether a later instance with a higher round voids it. If it is not voided, retain that stop, discard other stops, and discard proposals at higher instances. If it is voided, discard all stops and proposals at higher instances with lower rounds. The modified rule forces fewer proposals during round installation; subsequent proposal actions can supply the missing proposals. Its safety checks are in EPR, but the separate check that it overapproximates the original rule is outside EPR; the authors report, “Nevertheless, Z3 was able to verify this in under 2 seconds.” (Section 8.4, p. 25; Appendix A.4, pp. 44–49, especially pp. 46–48).

Inference: for Verus, shared abstract protocol components may support similar reuse. An overapproximation would require proving that it can simulate the original behavior and that its additional behavior preserves safety.

## evidence and limits

Figure 8 reports ten runs per experiment using IVy commit `7ce6738` and Z3 4.5.0 on a Linux laptop with a 1.8 GHz Core-i7 CPU. Different random seeds were used for Z3. The EPR safety checks had means of 1.0 s (Paxos), 1.2 s (Multi-Paxos), 2.2 s (Vertical), 4.7 s (Fast), 1.0 s (Flexible), and 3.8 s (Stoppable), with no EPR timeouts. The table's `σ` values are standard deviations across those ten runs. Semi-bounded first-order checks at round bound 16 timed out in 9/10 Paxos runs, 7/10 Multi-Paxos, 9/10 Vertical, 10/10 Fast, 9/10 Flexible, and 10/10 Stoppable. The timeout limit was 300 seconds, and timed-out runs were included in the means. The semi-bounded experiments fixed the value bound at 2 (Section 9, p. 26). Unbounded Z3 checks on the original first-order models diverged for all variants.

The supplied invariants and rewrite equivalences are checked obligations. The automatic update scheme is justified by Lemma 3.2, and Theorem 3.1 establishes the transformation's soundness. The first-order axioms must be valid for the intended interpretation; the protocol-to-model abstraction also requires justification (Sections 3.1–3.3, pp. 6–12). The proof concerns protocol designs rather than executable implementations: “We decided to verify the designs of the protocols and not their implementations since the invariants are more natural and since we wanted to avoid dealing with low level implementation issues.” (Section 1.1.1, p. 2) The methodology is incomplete if suitable invariants, rewrite proofs, or domain axioms cannot be expressed within its requirements (Section 3.2, pp. 10–11).

## techniques for the catalog

- uninterpreted protocol modeling: encode unbounded domains, sets, and maps in many-sorted first-order logic with valid axioms
- quantifier-alternation analysis: use the sort graph to locate cycles that block decidable checking
- derived relations: materialize existential facts as ghost-like state with maintained representation invariants
- checked transition rewrites: prove guard equivalence under an auxiliary invariant before replacing formulas
- semi-bounded debugging: bound selected sorts to obtain finite counterexamples while preserving other unbounded domains
- EPR invariant checking: finish with decidable, finite-model verification conditions and finite counterexamples
- safe overapproximation: alter difficult protocol rules, then prove the expanded model still preserves safety
