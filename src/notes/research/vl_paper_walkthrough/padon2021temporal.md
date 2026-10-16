# Temporal Prophecy for Proving Temporal Properties of Infinite-State Systems
(authored by agents unless marked 🧑)
Tag: `padon2021temporal`, [paper](http://arxiv.org/abs/2106.00966v1)

## scope and claim
The paper strengthens liveness-to-safety reduction for infinite-state transition systems with temporal prophecy. Its abstract states: “Temporal prophecy refines an infinite-state system using first-order linear temporal logic formulas, via a suitable tableau construction.” (abstract, p. 1). The construction is integrated into Ivy and evaluated on challenging temporal examples.

## technique 1: dynamic abstraction and abstract-lasso safety
Use this when liveness is reduced to absence of repeating behaviors but a fixed finite projection introduces spurious lassos. The method freezes a finite abstraction after a prefix. A state footprint is the interpretation of every vocabulary constant; a finite prefix's footprint is the union of those sets. The paper defines an abstract lasso as a finite trace with fair prefix and loop segments whose two loop-end states agree under the frozen footprint (section 4.1, pp. 4–5).

Steps: choose a freeze point after a fair prefix; compute the prefix footprint; project later states onto that finite set; search for a fair looping segment with equal projected states; prove that no abstract lasso exists. The paper proves, “If TW has no abstract lassos then it also has no A-fair traces.” (Lemma 3, section 4.1, p. 5).

Inference: In Verus, this can guide a ghost finite abstraction of an infinite Rust state, with a ghost snapshot at a chosen point and an invariant that no fair repeated projection exists. Verus has no temporal tableau primitive, so the abstraction and fairness predicates must be encoded as ghost state and proved manually.

Limit: without prophecy, the finite projection can merge states whose futures differ, yielding a false lasso even though the liveness property holds (abstract, p. 1; section 2, pp. 2–3).

## technique 2: temporal prophecy formulas
Use prophecy to split states according to future behavior before abstraction freezes. Construct a set `A` of FO-LTL formulas closed under subformula and containing the negated target property. Build the tableau product `TP`; each formula gets a relation recording whether it holds globally from the current state. The paper says additional formulas “split the states of TS into more states in TP, and they cause some non-determinism of the future trace to be ‘pulled backwards’” (section 4.2, p. 6).

Steps from section 4.2: (1) choose `A`; (2) construct the tableau product with the original transition system; (3) augment the fair-segment condition with all formulas in `A`; (4) run the abstract-lasso safety test; (5) conclude the original temporal property from Theorem 2 when no abstract lasso remains. Theorem 2 states that if the augmented system has no abstract lasso, then the source system satisfies the FO-LTL formula (section 4.2, p. 7).

Inference: A Verus encoding would represent each selected prophecy predicate as a ghost boolean or ghost relation and prove its temporal update law. Rust's executable state does not change; only ghost proof state does. Verus currently proves safety-style assertions, so liveness requires a separate ranking/fairness encoding or an external temporal checker.

Evidence: in the ticket protocol, adding `∃x.♦□critical(x)` to the tableau removes the spurious lasso that defeats the unaugmented method (section 4.3, pp. 7–8). The paper's examples include ticket mutual exclusion, alternating-bit protocol, TLB shootdown, and a parameterized lock; the conclusion says prophecy avoided nested termination arguments and reduced human proof effort (section 8, p. 13). No single aggregate success denominator is reported in the excerpt; claims are per example.

## technique 3: prophecy witnesses for existential formulas
When a prophecy formula has free variables and an existential witness matters to abstraction, add a fresh constant. For each selected formula `ψ(x1,...,xn)` in witness set `B`, add constants `c1,...,cn`, keep them unchanged in transitions, and constrain the initial state so that if an existential instance holds, the constants witness it. The paper gives the construction `ιW = ιP ∧ FO[(∃x1,...,xn.ψ) → ψ(c1,...,cn)]` (section 4.2, p. 7).

Steps: identify existential temporal facts that affect future behavior; add one constant tuple per fact; include equality constraints preserving constants; include witness implication in the initial formula; include the constants in the footprint and invariant. The paper proves the extension is conservative and that the augmented and unaugmented products have equivalent fair-trace existence (Lemma 4, section 4.2, p. 7).

Inference: In Verus, witnesses can be ghost references or ghost indices with validity predicates. Their lifetime and domain must be bounded or otherwise modeled; a raw Rust reference cannot stand for an arbitrary infinite-state element. The conservativity proof must be supplied as a ghost lemma.

## trust, limits, and VL risk
The formal theorem proves soundness of the liveness-to-safety transformation under the stated FO-LTL, fairness, tableau, and no-abstract-lasso premises. Trusted components include the Ivy implementation, SMT solver, transition-system encoding, and user-selected prophecy formulas. Inference: agent-written verified Rust faces a semantic risk if fairness assumptions about schedulers or channels are omitted; Verus checking local invariants does not establish those environmental assumptions. VL should reuse prophecy as a specification-design pattern, but it should not claim temporal correctness from safety proofs alone.

## techniques for the catalog
- abstract-lasso reduction: freeze a finite footprint and prove no fair repeated projection exists
- temporal prophecy tableau: add future-sensitive FO-LTL formulas to refine the product state space
- prophecy witnesses: add immutable ghost constants witnessing existential temporal formulas
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
