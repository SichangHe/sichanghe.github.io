# Verification of Threshold-Based Distributed Algorithms by Decomposition to Decidable Logics
(authored by agents unless marked 🧑)
Tag: `berkovits2019threshold`, [paper](http://arxiv.org/abs/1905.07805v1)

## scope and result

The paper verifies threshold-based fault-tolerant distributed protocols by separating arithmetic about set sizes from protocol-state reasoning. It models protocol behavior in first-order logic (FOL), represents threshold intersection facts in a restricted language within Boolean Algebra with Presburger Arithmetic (BAPA), translates those facts back to FOL axioms, and checks the resulting transition system in Effectively Propositional logic (EPR) when its quantifier alternation graph is acyclic. This graph records dependencies between sorts introduced by functions and universal-to-existential quantifier nesting (Section 2, page 4). The paper's abstract describes the goal precisely: “In this work, we develop a new methodology for decomposing the verification task of such protocols into two decidable logics: EPR and BAPA.” (Abstract, page 1.) An inference algorithm generates threshold facts; the user still supplies the protocol model, thresholds, resilience conditions, and inductive invariant (Section 8, page 19).

## technique 1: encode threshold cardinalities with threshold sorts

What it is. Instead of putting set cardinality arithmetic directly into FOL, the model introduces a sort `set_t` for sets with at least threshold t and a relation `member_t(node,set_t)`. A set parameter such as faulty nodes gets a unary membership relation. A threshold-faithful FOL structure is the extension of a concrete node structure by a BAPA structure satisfying resilience assumptions Γ (Sections 3.1–3.2, pages 6–8).

When to use it. Use this abstraction when a protocol's guards and invariants compare set sizes against symbolic thresholds such as n−t or (n+3t+1)/2. It supports arbitrary finite node populations while keeping protocol state in FOL. The paper states, “Comparing sizes of two sets is not allowed” (Section 3.1, page 7).

How to do it. (1) Declare integer and set parameters, including n and fault sets. (2) State resilience conditions Γ in BAPA, for example Bosco's `n ≥ 3t + 1` and `|f| ≤ t` (Section 3.1, page 6). (3) Check that every threshold is feasible, `Γ ⊨ t ≤ n`, so its sort is nonempty (Definition 2, page 8); create one threshold sort and membership relation for each threshold. (4) Translate the condition that at least t nodes satisfy φ to `∃q:set_t.∀n:node. member_t(n,q) → φ(n)`. (5) Add only axioms valid in all threshold-faithful structures. The FOL verifier also considers structures outside that class; this makes the model an abstraction. The paper's Lemma 1 proves this encoding sound for threshold-faithful structures (Section 3.2, page 8).

Verus form. Inference: a possible adaptation is to represent node sets as ghost finite sets, state resilience assumptions in `requires`, and prove lemmas connecting cardinality assumptions to intersection bounds. This adaptation is not described or tested in the paper.

Evidence and limits. The authors state that the FOL transition system is an abstraction and “is not restricted to such states” (Section 3.2, page 8). Soundness is conditional on adding axioms that hold in every threshold-faithful structure. The set of all such valid FOL formulas is not recursively enumerable, so the approach is incomplete in general (Section 3.2, page 8).

## technique 2: write threshold intersection properties in TIP and decompose proofs

What it is. The threshold intersection property language (TIP) is a BAPA subset containing conjunctions, guarded universal quantifiers over sets, intersections, complements of atomic set terms, and threshold guards. It excludes general negation, union, disjunction, existential quantification, and arbitrary cardinality arithmetic. A TIP fact is checked for Γ-validity in BAPA, then translated to an FOL axiom. The paper's example for Bosco states that every set of at least n−t nodes intersects every set of more than (n+3t)/2 nodes in at least (n−t+1)/2 non-faulty nodes (Section 4.1, page 9).

When to use it. Use TIP for protocol-independent intersection facts that explain why quorum and threshold guards overlap. Put state-dependent behavior and transition relations in FOL. This division lets BAPA decide arithmetic consequences while EPR proves inductive protocol obligations.

How to do it. (1) Express each needed overlap as a guarded universal TIP formula. (2) Translate a guard `g≥t(B)` to the BAPA cardinality constraint `k·|B| ≥ ℓ` when t=ℓ/k. (3) Check Γ ⊨ φ; for quantifier-free Γ, negating the universally quantified TIP property gives a quantifier-free BAPA satisfiability query. (4) Translate the same formula to FOL using threshold sorts and membership relations. (5) Add the translated formula as an axiom and verify the transition system's initiation, consecution, and safety conditions in EPR. Theorem 1 proves that TIP and its FOL translation agree on threshold-faithful structures (Section 4.2, page 10).

Verus form. Inference: encode each TIP formula as a lemma over finite sets, with `requires` for Γ and `ensures` for the intersection cardinality, then use it in protocol transition proofs. The paper does not establish whether Verus can discharge these lemmas automatically.

Evidence and limits. Full BAPA is also decidable (Section 2, page 5). TIP restricts its formulas so they can also be translated to FOL axioms; EPR additionally requires acyclic quantifier alternation. Inference: a protocol may need properties outside TIP. The paper's soundness theorem covers closed TIP formulas and threshold-faithful structures; it does not show completeness for arbitrary distributed protocols.

## technique 3: infer all useful TIP consequences with A_IP

What it is. A simple TIP formula universally quantifies threshold-sized sets and asserts a threshold bound on their intersection with distinct set parameters or their complements. Algorithm A_IP enumerates these formulas by increasing quantifier count, checks Γ-validity, and prunes formulas using a subsumption relation. It maintains `checked_true` and `checked_false`; a formula implied by a known valid formula is emitted without a BAPA query, while one implying a known invalid formula is skipped. Lemma 4 establishes soundness; Lemma 5 establishes completeness under Γ-feasibility and Γ-non-degeneracy; Corollary 3 establishes termination under Γ-feasibility and Γ-sanity (Section 5.1, pages 11–13).

When to use it. Use A_IP when users supply the resilience conditions and thresholds but need intersection lemmas for their inductive invariant. For Hybrid Reliable Broadcast, the paper reports the same intersection properties under different threshold conditions (Section 6.1, page 16).

How to do it. (1) Define the threshold set T, parameters, and Γ. (2) Check feasibility (`Γ ⊨ t ≤ n` for every threshold) and non-degeneracy (`Γ ⊭ t ≤ 0` for every threshold). (3) Enumerate simple formulas with zero, one, two, and more guarded quantifiers. (4) Apply subsumption before invoking BAPA. (5) Emit Γ-valid formulas; stop when a quantifier level adds no new formula to `checked_true`, the list of formulas established valid by a BAPA query. Formulas emitted by subsumption do not extend that list. (6) For termination, require Γ-sanity: for every pair t1,t2 in T, `Γ ⊭ (t1 ≤ 0 ∨ t2 > n−1)` (Definition 7, page 13). Algorithm 1 appears on page 12.

Verus form. Inference: reuse the increasing-quantifier search to generate candidate ghost lemmas and attempt to prove them with Verus. The paper supplies no completeness or termination result for replacing its BAPA checks with Verus proof attempts.

Evidence and limits. A_IP generates simple formulas whose conjunctions express every Γ-valid TIP formula under Γ-feasibility and Γ-non-degeneracy; Γ-sanity additionally ensures termination. The authors note that the all-formulas set can contain redundancies and that a naive search would not terminate. The authors report that “less than 2%–5% of the formulas are actually checked using a BAPA query” because subsumption handles most candidates (Section 6.3, page 17).

## technique 4: minimize or lazily learn the required axioms

What it is. Eager A_IP constructs all valid simple formulas, discards cyclic formulas under Theorem 3's assumptions, then greedily removes any whose FOL translation is implied by the others. Lazy A_IP starts with no formulas and adds a candidate only when an Ivy counterexample to induction (CTI) violates it. The eager result is a local minimum; the lazy result is a protocol-specific subset that suffices for the verification conditions (Section 5.3, page 15).

When to use it. Use eager minimization when BAPA enumeration is cheap and a compact global basis is useful. Use lazy CTI-guided inference when too many quantified axioms make EPR search slow or diverge. The paper reports that eager sets had 3–5 formulas after minimization, compared with 39–79 before it (Section 6.3, page 17).

How to do it. (1) For eager mode, run A_IP and retain the acyclic formulas as Δ. (2) For each formula φ, test whether the remaining FOL axioms entail FO(φ); remove φ if so. For lazy mode, begin with an empty subset and invoke A_IP as needed rather than precomputing Δ. (3) Verify the protocol with the current subset. (4) If a CTI appears, select a Γ-valid candidate not satisfied by that CTI and add it. (5) Repeat until all verification conditions pass. The authors explain that lazy sets avoid many-quantifier formulas unless a CTI needs them.

Verus form. Inference: start with no intersection lemmas, inspect a failed proof obligation, and add a proved lemma that addresses it. Automating this adaptation would require a way to select useful lemmas from verifier diagnostics; the paper does not implement it.

Evidence and limits. Lazy inference often verifies faster, but its runtime depends on the random seed and CTIs returned by Ivy; the paper says the time for finding CTIs “varies significantly” (Section 6.3, page 17). Inference: compare the two approaches on the same protocol and solver setup because their axiom sets differ.

## what is proved, measured, and trusted

The formal results establish soundness of the threshold-sort model and TIP-to-FOL translation, and the A_IP guarantees described above. Theorem 3 permits removing cyclic formulas when T is Γ-feasible and Γ-acyclic and (T,PrmS) is Γ-sane. Γ-acyclicity excludes distinct thresholds that Γ entails are equal; the extended sanity condition also requires `Γ ⊭ (t ≤ 0 ∨ |a| = n)` for every threshold and every set parameter or its complement. The remaining threshold axioms have an acyclic quantifier alternation graph (Sections 3–5, pages 8–14). The evaluation verifies safety and liveness for Bosco under three resilience conditions and Hybrid Reliable Broadcast, and safety (agreement) for Byzantine Fast Paxos (Section 6.1, pages 15–16). Each experiment was repeated 10 times; Figure 2 reports means and standard deviations (Section 6.3, page 17; Figure 2, page 20). The implementation used Ivy with Z3 4.8.4 for first-order verification, CVC4 1.7 for BAPA, and a laptop running 64-bit Windows 10 with a 2.2 GHz Core i5 and the then-latest Ivy (Section 6.2, page 16).

Inference: trusted components for a Verus deployment include the chosen resilience assumptions, ghost set representation, solver, verifier translation, and the executable protocol code and libraries outside the model. The paper proves properties of its abstract transition systems, not the network, cryptography, or an unmodeled implementation. Inference: adding unproved intersection axioms could hide a protocol error; omitting needed valid axioms can instead prevent verification.

## limitations and what VL should not redo

The paper calls the FOL abstraction sound, then states that it is incomplete because arbitrary threshold-faithful validity is not recursively enumerable (Section 3.2, page 8). Inference: these claims are compatible. Valid supplied axioms preserve soundness, while the method cannot cover every first-order property of threshold-faithful structures. Inference: the reported BAPA-query percentage concerns candidates considered in the experiments, not all possible TIP formulas.

Inference: VL should not redo generic quorum-intersection lemmas or a generic proposal to generate invariants from thresholds without distinguishing the TIP/A_IP decomposition. A possible extension would encode the same lazy CTI loop for Verus ghost sets and compare proof time, lemma count, and repair effort across real protocol changes.

## techniques for the catalog

- threshold-sort abstraction: encode “at least t” sets with dedicated sorts and membership relations in FOL
- TIP decomposition: prove protocol-independent set intersections in BAPA and use their FOL translations as axioms
- A_IP inference: enumerate, subsume, and decide all valid simple threshold properties under resilience assumptions
- CTI-guided minimization: add only intersection lemmas that block counterexamples to induction
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "In fact, it captures a stronger requirement that for every pair of thresholds, there is a model of Γ in which one of them is not interpreted as 0 and the other is not interpreted as n."): read the full paper, including Figure 2 and references; checked quotations, numerical claims, section and page references, modeling steps, algorithm assumptions, and evaluation scope; corrected the abstract quotation, page references, threshold bound, abstraction description, A_IP stopping rule and guarantees, cyclic-formula assumptions, and safety/liveness scope; marked proposed Verus adaptations as inferences and removed unsupported Verus capability and risk claims; did not rerun the protocol experiments, independently prove the theorems, or test the Verus adaptations.
