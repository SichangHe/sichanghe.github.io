# Paxos Made EPR: Decidable Reasoning about Distributed Protocols
(authored by agents unless marked 🧑)
Tag: `padon2017paxos`, [paper](http://arxiv.org/abs/1710.07191v1)

## scope and result

Padon, Losa, Sagiv, and Shoham present a methodology that transforms distributed-protocol models and inductive invariants into effectively propositional logic (EPR), a decidable first-order fragment with finite countermodels. They model Paxos and five variants, then use IVy and Z3 to check safety. The paper's abstract states: “Our methodology involves modeling protocols using general (uninterpreted) first-order logic, and then systematically transforming the model to obtain a model and an inductive invariant that are decidable to check.” The method targets protocol designs rather than low-level implementations; refinement to an implementation remains outside this proof.

The safety claim is consensus: no two decisions contain different values. The methodology asks the user for a model, derived relations, rewrites, an auxiliary invariant, and a final inductive invariant. Automated checks either prove the obligations or return finite counterexamples to induction or to a rewrite. It is sound when the supplied axioms and rewrites are sound, but incomplete: a safe protocol may lack a suitable EPR invariant or an EPR-checkable rewrite.

## technique: model the protocol in uninterpreted first-order logic

Use this when the system has unbounded nodes, rounds, messages, sets, or maps that make direct quantified SMT reasoning undecidable. The first step is a many-sorted first-order transition system `(INIT, TR)`, where states are structures over constants, relations, and functions. The authors replace interpreted domains with uninterpreted sorts and axioms. For a total order, they add reflexivity, transitivity, antisymmetry, and totality axioms (Section 3.1.1, p. 6).

Steps:
1. choose a sort for each protocol domain (node, round, value, quorum)
2. represent state fields as relation or function symbols
3. write `INIT` and each atomic action's transition formula `TR`
4. add only axioms valid in the intended domain
5. encode sets as a sort plus a `member` relation, and maps as a sort plus an `apply` function (Section 3.1.2, p. 6)
6. state safety as a closed formula over the state

The paper warns, “While this encoding is sound (as long as we only use axioms that are valid in the higher-order interpretation), it cannot be made complete due to the limitation of first-order logic.”

Verus form (Inference): represent the protocol as a Verus state machine with a Rust struct for state, `spec fn` predicates for membership and transition guards, and proof lemmas for order axioms. A Verus state-machine invariant can express the safety formula. Verus's executable code and ownership can refine this model, but uninterpreted sets and maps remain ghost abstractions requiring a refinement proof.

## technique: inspect the quantifier-alternation graph

After the first-order model and invariant are written, compute a graph whose vertices are sorts and whose edges record a universal-to-existential alternation. Cycles often make Z3 diverge. If the graph is acyclic, the formula is in extended EPR (stratified quantifier alternation), which preserves decidability and finite-model property (Sections 2.2 and 3, pp. 5–7).

Steps:
1. put each verification condition in negation normal form
2. record a directed edge from a sort quantified universally to a sort quantified existentially when they alternate
3. find cycles
4. choose derived relations that remove the cycles
5. optionally bound selected sorts for semi-bounded debugging; bounding a sort removes its graph node

Verus form (Inference): Verus users do not normally see this graph because formulas are generated internally. An external proof-synthesis tool could inspect quantifier-heavy `spec fn`s and suggest ghost relations or bounds before invoking Verus. The graph itself is a methodology inference, not a Verus construct.

## technique: encode existential facts as derived relations

The paper's main transformation captures an existential formula `ψ(x̄)` with a state relation `r(x̄)`, then rewrites transitions and invariants to use `r`. For example, `r(x)` captures `∃y. p(x,y)`. The automatically generated initialization and update code maintains the representation invariant `∀x̄. r(x̄) ↔ ψ(x̄)` (Section 3.2, pp. 7–9). The authors note that derived relations are “somewhat analogous to ghost variables,” but they summarize current-state properties and can affect transitions.

Steps:
1. identify an existential subformula causing an alternation cycle
2. declare a derived relation with the existential variables free
3. generate initial values and update code so its representation invariant holds
4. rewrite guarded transition formulas to use the relation
5. prove rewrite equivalence under an auxiliary invariant
6. replace the existential formula in the final invariant with the derived relation

Verus form (Inference): add a ghost set/map field and a `spec fn` representation invariant connecting it to the underlying state. Update the ghost field in every transition proof. Use `assert` or a `lemma` to show the rewritten guard is equivalent under the representation invariant. Verus ghost state is erased, so it cannot affect runtime behavior unless the executable transition is changed consistently.

The automatic update scheme requires a restricted formula: one positive relation `p`, no modifications to relations in the quantifier-free part, `p` initially empty, and single-tuple insertions (Section 3.3, p. 11). More general updates are possible in principle but are not implemented here.

## technique: verify rewrites with an auxiliary invariant

Rewriting can change a syntactic guard while preserving reachable behavior. The method checks equivalence only where a modified assume command executes, under an auxiliary inductive invariant `INVaux`. This can be easier than proving the final safety invariant. The paper gives the condition `INVaux ∧ g ⊨ θ ↔ θ̂[ψ/r]` and automatically reports a rewrite counterexample if it fails (Section 3.2, pp. 8–10).

Steps:
1. identify the exact subformula changed by a rewrite
2. state an auxiliary invariant that holds in the original model
3. prove the auxiliary invariant is inductive
4. prove the changed and original subformulas equivalent under the guard and auxiliary invariant
5. only then check the transformed model's safety invariant

Verus form (Inference): write a separate `lemma` proving guard equivalence from the state invariant and call it from the transition proof. Keep the original and rewritten guards as explicit `spec fn`s so the equivalence obligation is visible. This protects refinement arguments; it does not make an unsound rewrite safe by itself.

The transformed model is bisimilar to the original when these checks pass. The paper's soundness theorem states: “If `(INIT, TR)` is a model obtained by the above procedure, and `INV` is an inductive invariant for it such that `INV |= P`, then `P` holds in all reachable states of `(INIT, TR)`.”

## technique: split proof effort between semi-bounded and EPR checks

Semi-bounded verification bounds only sorts needed to break quantifier cycles, rather than bounding every sort. It is useful for debugging the original first-order model, but its runtime grows with the round bound. The final EPR model is unbounded and decidable (Section 3.1.3, p. 7).

Verus form (Inference): use bounded ghost domains or small-model tests to debug a state-machine invariant before proving it for arbitrary states. A bounded test is evidence for finding counterexamples, not a proof of the unbounded property.

## protocol-specific reuse: Paxos and its variants

The authors reuse the same two derived relations (`left_round` and `joined_round`) and similar rewrites across Paxos variants (Sections 6–8). For Flexible Paxos, they change the quorum sorts and use the cross-phase intersection axiom. For Stoppable Paxos, the original proposal rule falls outside EPR; they use a different rule that soundly overapproximates it, adds behaviors, and still preserves safety (Appendix A.4, pp. 25–26). This is a reusable abstraction pattern: alter the model to regain decidability, then prove that the altered model is a safe overapproximation or bisimulation.

Verus form (Inference): represent each variant as a state-machine module sharing a common invariant lemma and specialize the quorum relation. If an overapproximation is used, prove that every concrete transition is allowed by the abstract transition and then prove safety of the abstract system.

## evidence and limits

Figure 8 reports ten Z3 runs per protocol on a 1.8 GHz Core-i7 laptop. The EPR safety checks had means of 1.0 s (Paxos), 1.2 s (Multi-Paxos), 2.2 s (Vertical), 4.7 s (Fast), 1.0 s (Flexible), and 3.8 s (Stoppable), with no EPR timeouts. The table's `σ` values are standard deviations across those ten runs. Semi-bounded first-order checks at round bound 16 timed out in 9/10 Paxos runs, 7/10 Multi-Paxos, 9/10 Vertical, 10/10 Fast, 9/10 Flexible, and 10/10 Stoppable. These denominators and timeout counts are exactly the table's ten repetitions and 300-second limit (Section 9, p. 26). Unbounded Z3 checks on the original first-order models diverged for all variants.

Trusted elements are the first-order axioms, model-to-EPR transformations, update-code generation, IVy translation, Z3, and the supplied invariants. The proof is of the modeled protocol design. The paper does not prove a concrete implementation, network stack, compiler, or machine arithmetic. It also admits incompleteness when no EPR invariant or EPR-checkable rewrite exists.

Inference: the threat to VL is high for distributed Rust agents that jump directly from code to solver automation. The paper suggests a disciplined architecture for Verus: abstract state machine first, explicit ghost relations for existential facts, checked guard rewrites, then refinement to executable Rust. VL should not redo the EPR Paxos proof; it should test whether similar derived-state and refinement patterns stabilize Verus proofs for real protocol implementations.

## techniques for the catalog

- uninterpreted protocol modeling: encode unbounded domains, sets, and maps in many-sorted first-order logic with valid axioms
- quantifier-alternation analysis: use the sort graph to locate cycles that block decidable checking
- derived relations: materialize existential facts as ghost-like state with maintained representation invariants
- checked transition rewrites: prove guard equivalence under an auxiliary invariant before replacing formulas
- semi-bounded debugging: bound selected sorts to obtain finite counterexamples while preserving other unbounded domains
- EPR invariant checking: finish with decidable, finite-model verification conditions and finite counterexamples
- safe overapproximation: alter difficult protocol rules, then prove the expanded model still preserves safety
Checked 2026-10-13: audit record padon2017paxos; paper-study comparison complete; gate executed; experiments not rerun
