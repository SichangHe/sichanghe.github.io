# Verification of Threshold-Based Distributed Algorithms by Decomposition to Decidable Logics
(authored by agents unless marked 🧑)
Tag: `berkovits2019threshold`, [paper](http://arxiv.org/abs/1905.07805v1)

## scope and result

The paper verifies threshold-based fault-tolerant distributed protocols by separating arithmetic about set sizes from protocol-state reasoning. It models protocol behavior in first-order logic (FOL), represents threshold intersection facts in a restricted BAPA language, translates those facts back to FOL axioms, and checks the resulting transition system in EPR. The paper's abstract describes the goal precisely: “We develop a methodology for decomposing the verification of threshold-based distributed protocols into two decidable logics: EPR and BAPA.” (Abstract, page 1.) An inference algorithm generates the needed threshold facts instead of requiring users to enumerate them.

## technique 1: encode threshold cardinalities with threshold sorts

What it is. Instead of putting set cardinality arithmetic directly into FOL, the model introduces a sort `set_t` for sets with at least threshold t and a relation `member_t(node,set_t)`. A set parameter such as faulty nodes gets a unary membership relation. A threshold-faithful FOL structure is the extension of a concrete node structure by a BAPA structure satisfying resilience assumptions Γ (Sections 3.1–3.2, pages 6–8).

When to use it. Use this abstraction when a protocol's guards and invariants compare set sizes against symbolic thresholds such as n−t or (n+3t+1)/2. It supports arbitrary finite node populations while keeping protocol state in FOL. It does not directly support comparing the sizes of two arbitrary sets; the paper explicitly restricts threshold conditions to one set versus a threshold (Section 3.1, page 6).

How to do it. (1) Declare integer and set parameters, including n and fault sets. (2) State resilience conditions Γ in BAPA, for example Bosco's `n ≥ 3t + 1` and `|f| ≤ t` (Section 3.1, page 6). (3) Create one threshold sort and membership relation for each threshold. (4) Translate “at least t nodes satisfy φ” to `∃q:set_t.∀n:node. member_t(n,q) → φ(n)`. (5) Restrict reasoning to threshold-faithful structures and add only axioms valid in all of them. The paper's Lemma 1 proves this encoding sound for threshold-faithful structures (Section 3.2, page 8).

Verus form. Inference: represent node sets as finite sets or sequences with a cardinality predicate, and state threshold assumptions in `requires`. Use a ghost predicate for membership and a lemma that translates cardinality facts into intersection bounds. Verus has no threshold sort primitive; the sort and relation are an abstraction to encode with Rust ghost state and predicates. Inference: preserve the distinction between executable protocol state and ghost threshold facts so the latter erase at runtime.

Evidence and limits. The authors state that the FOL transition system is an abstraction and “is not restricted to such states” (Section 3.2, page 8). Soundness is conditional on adding axioms that hold in every threshold-faithful structure. The set of all such axioms is not recursively enumerable, so the approach is incomplete in general (Section 3.2, page 8).

## technique 2: write threshold intersection properties in TIP and decompose proofs

What it is. The Threshold Intersection Property language (TIP) is a BAPA subset containing guarded universal quantifiers over sets, intersections, complements, and threshold guards. It excludes union, disjunction, existential quantification, and arbitrary cardinality arithmetic. A TIP fact is checked for Γ-validity in BAPA, then translated to an FOL axiom. The paper's example for Bosco states that every set of at least n−t nodes intersects every set of more than (n+3t)/2 nodes in at least (n−t)/2 non-faulty nodes (Section 4.1, page 9).

When to use it. Use TIP for protocol-independent intersection facts that explain why quorum and threshold guards overlap. Put state-dependent behavior and transition relations in FOL. This division lets BAPA decide arithmetic consequences while EPR proves inductive protocol obligations.

How to do it. (1) Express each needed overlap as a guarded universal TIP formula. (2) Translate a guard `g≥t(B)` to the BAPA cardinality constraint `k·|B| ≥ ℓ` when t=ℓ/k. (3) Check Γ ⊨ φ with a quantifier-free BAPA solver when possible. (4) Translate the same formula to FOL using threshold sorts and membership relations. (5) Add the translated formula as an axiom and verify the transition system's initiation, consecution, and safety conditions in EPR. Theorem 1 proves that TIP and its FOL translation agree on threshold-faithful structures (Section 4.2, page 9).

Verus form. Inference: encode each TIP formula as a Verus lemma over finite sets, with `requires` for Γ and `ensures` for the intersection cardinality. Use those lemmas as reusable facts in protocol transition proofs. Inference: because Verus does not have BAPA's decision procedure, arithmetic set lemmas may require explicit ghost counting arguments or solver-friendly representations.

Evidence and limits. TIP is deliberately weaker than full BAPA. This restriction enables decidable, solver-friendly formulas but may omit a property needed by a protocol. The paper's soundness theorem covers closed TIP formulas and threshold-faithful structures; it does not show completeness for arbitrary distributed protocols.

## technique 3: infer all useful TIP consequences with A_IP

What it is. Algorithm A_IP enumerates simple TIP formulas by increasing quantifier count, checks Γ-validity, and prunes formulas using a subsumption relation. It maintains `checked_true` and `checked_false`; a formula implied by a known valid formula is emitted without a BAPA query, while one implying a known invalid formula is skipped. Under feasibility and Γ-sanity assumptions, Lemmas 4 and 5 prove soundness and completeness, and Corollary 3 proves termination (Section 5.1, pages 11–13).

When to use it. Use A_IP when users know the resilience conditions and thresholds but do not know which intersection lemmas the protocol invariant requires. It is especially useful when several protocols share thresholds but differ in arithmetic conditions, because the same logical intersection structure can recur.

How to do it. (1) Define the threshold set T, parameters, and Γ. (2) Check feasibility (`Γ ⊨ t ≤ n`) and non-degeneracy. (3) Enumerate simple formulas with zero, one, two, and more guarded quantifiers. (4) Apply subsumption before invoking BAPA. (5) Emit Γ-valid formulas and stop when an entire quantifier level adds none. (6) Use the termination theorem's Γ-sanity condition, which rules out thresholds collapsing to zero or n. Algorithm 1 gives these eight steps (Section 5.1, page 12).

Verus form. Inference: generate candidate ghost lemmas from the same increasing-quantifier search, then attempt to prove each with Verus. Use the resulting lemma set as an input to protocol proof automation. Inference: unlike A_IP's complete BAPA checks under its assumptions, Verus proof search may fail because of triggers, representation choices, or missing arithmetic lemmas; the generated list is therefore a candidate inventory, not a soundness result by itself.

Evidence and limits. A_IP is complete only for TIP formulas up to equivalence under Γ-feasibility and Γ-sanity. The authors note that the all-formulas set can contain redundancies and that a naive search would not terminate. The implementation checks less than 2%–5% of candidate formulas with BAPA in the evaluated protocols because subsumption decides the rest (Section 6.3, page 17).

## technique 4: minimize or lazily learn the required axioms

What it is. Eager A_IP constructs all valid formulas, then greedily removes any whose FOL translation is implied by the others. Lazy A_IP starts with no formulas and adds a candidate only when an Ivy counterexample to induction (CTI) violates it. The eager result is a local minimum; the lazy result is a protocol-specific subset that suffices for the verification conditions (Section 5.3, pages 14–15).

When to use it. Use eager minimization when BAPA enumeration is cheap and a compact global basis is useful. Use lazy CTI-guided inference when too many quantified axioms make EPR search slow or diverge. The paper reports that eager sets had 3–5 formulas after minimization, compared with 39–79 before it (Section 6.3, page 17).

How to do it. (1) Run A_IP to obtain Δ. (2) For each formula φ, test whether the remaining FOL axioms entail FO(φ); remove φ if so. For lazy mode, (3) verify the protocol with the current subset. (4) If a CTI appears, select a Γ-valid candidate not satisfied by that CTI and add it. (5) Repeat until all verification conditions pass. The authors explain that lazy sets avoid many-quantifier formulas unless a CTI needs them.

Verus form. Inference: treat each generated intersection lemma as an optional proof lemma. Start with no lemmas, run Verus, inspect the failing proof obligation or counterexample, and add only the lemma that blocks it. Inference: Verus does not expose Ivy CTIs in exactly this form, so a diagnostic harness would be needed to automate the loop.

Evidence and limits. Lazy inference often verifies faster, but its runtime depends on the random seed and CTIs returned by Ivy; the paper says the time for finding CTIs “varies significantly” (Section 6.3, page 17). Eager and lazy sets are not equivalent in size or quantifier structure, so their times must be compared with the same protocol and solver setup.

## what is proved, measured, and trusted

The formal results prove soundness of the threshold-sort model and TIP-to-FOL translation, completeness and termination of A_IP under feasibility, non-degeneracy, and sanity, and preservation of verification conditions after removing cyclic formulas (Sections 3–5, pages 8–15). The evaluation covers Bosco under three resilience conditions, Hybrid Reliable Broadcast, and Byzantine Fast Paxos (Section 6.1, pages 15–16). Each experiment was repeated 10 times; means and standard deviations are reported in the figure caption (Section 6.3, page 17). The implementation used Ivy/Z3 for EPR, CVC4 for BAPA, Windows 10, a 2.2 GHz Core i5, and the latest Ivy (Section 6.2, page 16).

Inference: trusted components for a Verus deployment include the chosen resilience assumptions, ghost set representation, solver, verifier translation, and the executable protocol code and libraries outside the model. The paper proves properties of its abstract transition systems, not the network, cryptography, or an unmodeled implementation. Inference: the threat to agent-written verified Rust is high for quorum protocols because omitted intersection lemmas can make an invariant appear inductive only under an unsound abstraction; it is lower for protocols whose sets and thresholds are already encoded and checked directly.

## contradictions and what VL should not redo

The paper calls the FOL abstraction sound, then states that it is incomplete because arbitrary threshold-faithful validity is not recursively enumerable (Section 3.2, page 8). These claims concern different directions: the supplied axioms preserve soundness, but the method cannot discover every valid axiom. The evaluation says A_IP checks less than 2%–5% of formulas with BAPA; that is a fraction of candidates considered by the implementation, not a fraction of all possible TIP formulas (Section 6.3, page 17).

Inference: VL should not redo generic quorum-intersection lemmas or a generic proposal to generate invariants from thresholds without distinguishing the TIP/A_IP decomposition. A useful extension would encode the same lazy CTI loop for Verus ghost sets and compare proof time, lemma count, and repair effort across real protocol changes.

## techniques for the catalog

- threshold-sort abstraction: encode “at least t” sets with dedicated sorts and membership relations in FOL
- TIP decomposition: prove protocol-independent set intersections in BAPA and use their FOL translations as axioms
- A_IP inference: enumerate, subsume, and decide all valid simple threshold properties under resilience assumptions
- CTI-guided minimization: add only intersection lemmas that block counterexamples to induction
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
