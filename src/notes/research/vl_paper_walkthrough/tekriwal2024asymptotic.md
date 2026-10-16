# Formally verified asymptotic consensus in robust networks
(authored by agents unless marked 🧑)
Tag: `tekriwal2024asymptotic`, [paper](https://doi.org/10.1007/978-3-031-57246-3_14)

## scope and result

The paper formalizes the Weighted-Mean Subsequence Reduced (W-MSR) algorithm for a time-invariant directed graph, under an F-total malicious-node model. Normal nodes repeatedly discard up to F extreme neighbor values and take a weighted average. The main result is an iff theorem: under the stated model, resilient asymptotic consensus holds exactly when the graph is (F+1,F+1)-robust (Theorem 1, pp. 6–7). The paper states, “This paper presents the first formal proof of an asymptotic consensus algorithm, and addresses various challenges in its formalization.” (Abstract, p. 1)

The formalization is in Coq over real numbers, with MathComp sequences/sets and Coquelicot limits. Its scope is deliberately narrower than the source controls paper: time-invariant graphs, malicious rather than Byzantine behavior, and F-total faults (Section 2, p. 3). The authors report, “The total length of Coq proofs is about 11 thousand lines of code. It took us 6 person months for the entire formalization.” (Conclusion, p. 17)

## technique 1: make the W-MSR update and filtering executable in the prover

What it is. A normal node i has inclusive neighbors Ji, removes a set Ri(t) of at most F low and at most F high values, and updates with a convex sum
xi(t+1) = Σj∈Ji\Ri(t) wij(t)xij(t). The weights are zero outside Ji, each retained neighbor has weight at least α, and retained weights sum to one (Section 2.4, pp. 5–6).

When to use it. Use this model when proving a resilient consensus algorithm whose adversaries are bounded in number and whose normal update is a filtered convex combination. It preserves the exact value-based filtering needed by the convergence proof instead of replacing the update with an abstract transition.

How the paper does it.
1. Form the neighbor list and sort it by value relative to i (Section 2.4, p. 5).
2. If fewer than F values are strictly above i, remove all such values; otherwise remove the largest F. Apply the symmetric rule below i (Section 2.4, p. 6).
3. Define `remove_extremes` with MathComp `filter`, using decidable real comparisons and list indices to express ties (Section 3.1, pp. 7–8).
4. Define `incl_neigh_minus_extremes` as the filtered inclusive-neighbor list and state the weight hypotheses for every normal node and time (Section 3.1, p. 8).

Verus form. Inference: represent node values and neighbor membership with executable Rust data plus ghost/spec views; state the update as a `requires`/`ensures` contract and prove the retained-weight sum and lower bound with `assert` and proof functions. Inference: Verus does not directly carry over Coq's MathComp `seq`, `filter`, or `Rle_dec`; use Rust `Seq`/`Set` specifications and explicit lemmas about sorted indices. Inference: retain the executable filtering code, while making tie-breaking deterministic so sortedness is a stable invariant.

Evidence. The paper gives the Coq definitions and says, “The trickiest parts of the proof of Lemma 1 rely on the fact that we desire Ji \ Ri (t) when treated as a list to be sorted.” (Section 3.1, p. 8) The result is a machine-checked safety lemma independent of topology (Lemma 1, pp. 7–9).

Limits and assumptions. Real arithmetic is assumed; the conclusion does not cover finite-precision implementation. The graph is time-invariant and the attacker set is F-total. The authors explicitly identify finite precision and time-varying graphs as future work (Conclusion, p. 17).

## technique 2: prove a filtering safety invariant by sorted-list case analysis

What it is. The safety invariant says every normal update remains in the interval [m(t), M(t)], where m and M are the minimum and maximum normal values. This is Lemma 1, and it is proved in this paper because the source paper only gave an outline (Section 3.1, p. 7).

When to use it. Establish this invariant before a convergence argument: it bounds all later normal values, makes m nondecreasing and M nonincreasing, and supplies the interval part of the final consensus definition.

How the paper does it.
1. Sort Ji and define the low-removal set Ri<(t) by value and index; define Ri>(t) symmetrically (Appendix A, pp. 20–21).
2. Show |Ri<(t)|≤F and that every removed low value is no larger than every retained value (Appendix A, p. 20).
3. If |Ri<(t)|=F, use the F-total fault bound: either all removed lows are adversarial, leaving a retained normal witness, or one removed low is normal and itself supplies the lower bound (Appendix A, p. 20).
4. If |Ri<(t)|<F, take the first retained list element. The index condition forces its value to equal xi(t), so the normal node i itself is a lower-bound witness (Appendix A, p. 21).
5. Multiply the witness inequality by nonnegative weights and use the unit-sum condition to derive xi(t+1)≥m(t); repeat symmetrically for M(t) (Section 3.1, p. 7).

The Coq lemma is stated as `lem_1`, universally quantifying node, time, malicious update, initial values, adversary tag, and weights, and concluding both inequalities (Section 3.1, p. 7). The paper says, “We prove Lemma 1 by showing inductively, that at each time t, and for every normal node i, there exists a node j1 ∈ Ji ∩ N...” (Section 3.1, p. 7)

Verus form. Inference: encode `m(t)` and `M(t)` as spec functions over the normal-node set. Use a loop invariant stating every retained value lies in `[m,M]`, plus a sortedness invariant for the filtered sequence. Inference: Verus arithmetic proofs need explicit nonnegativity and sum-to-one lemmas; the paper's Coq induction and `partition_incl` lemma become separate Verus proof functions. Inference: avoid treating `invariant(...)` as a call; write loop invariants in the supported Verus syntax described by the local Verus notes.

Evidence. The paper reports that MathComp's filter gives lemmas needed to show retained membership, and introduces `partition_incl` to split the inclusive list into low removed, retained, and high removed sorted parts (Section 3.1, pp. 8–9). No runtime benchmark is reported; evidence is the checked Coq theorem and its 11 KLOC proof artifact.

## technique 3: formalize asymptotic sufficiency with shrinking threshold sets

What it is. Sufficiency assumes (F+1,F+1)-robustness and proves all normal sequences converge to one limit. The proof uses limits of M(t) and m(t), assumes they differ, and repeatedly shrinks two disjoint threshold sets until one has no normal node (Sections 3.2 and Appendix B, pp. 9–13, 21–23).

How the paper does it.
1. Use the safety invariant to show M is nonincreasing and m is nondecreasing; take limits AM and Am (Section 3.2, p. 9).
2. Assume AM≠Am and choose ε0 with AM−ε0>Am+ε0. Choose ε satisfying ε < α^N/(1−α^N)·ε0, where N is the number of normal nodes (Appendix B.1, p. 21).
3. Define XM(t,εl)={i: xi(t)>AM−εl} and Xm(t,εl)={i: xi(t)<Am+εl}; instantiate robustness on these disjoint sets (Section 3.2, pp. 11–12; Appendix B.1, p. 21).
4. Use all three clauses of robustness. If the first or second clause applies, first prove a normal node exists in the corresponding set; if the third applies, at least F+1 candidate nodes imply one normal node because at most F are adversarial (Section 3.2, p. 12; Appendix B.2, pp. 21–22).
5. For a high-side witness, prove one retained neighbor is ≤AM−εl and all other retained values are ≤M(t). Then derive xi(t+1)≤(1−α)M(t)+α(AM−εl) (Appendix C, pp. 23–24).
6. Define εl recursively as εl=αεl−1−(1−α)ε and show one of the two normal cardinalities strictly decreases at each step (Appendix B.3, pp. 22–23).
7. Apply the finite counting lemma `sj_ind_var` to obtain T≤N where one set is empty, contradicting AM≤M(t) and m(t)≤Am (Section 3.2, pp. 12–13).

Verus form. Inference: model threshold sets as ghost `Set<Node>` comprehensions and prove cardinality decrease with a natural-number variant. Inference: represent limits through explicit epsilon contracts and sequence lemmas; Verus has no automatic real-analysis library equivalent to Coquelicot, so the limit facts must be imported as proved lemmas or encoded over a discrete bound. Inference: use `requires` for robustness and weight assumptions, `ensures` for the consensus limit relation, and proof functions for the contradiction chain.

Evidence. The paper formalizes `strong_sufficiency`, `r_s_robustness`, `Resilient_asymptotic_consensus`, disjointness, normal-witness existence, intersection, and cardinality-decrease lemmas (Sections 3.2–3.4, pp. 10–15). It notes that the source proof omitted connections from the first two robustness clauses and omitted the bound needed for inequality (2); both are supplied and checked here (Section 3.2, pp. 12–13).

## technique 4: prove necessity by an explicit adversarial counterexample

What it is. Necessity is proved contrapositively: if the graph is not (F+1,F+1)-robust, construct adversaries, initial values, malicious behavior, and weights that keep two normal groups at distinct limits (Section 3.3, p. 13; Appendix D, pp. 24–25).

How the paper does it.
1. Choose disjoint nonempty S1,S2 violating robustness and let the adversary set be χS1^(F+1)∪χS2^(F+1) (Appendix D, p. 24).
2. Pick a normal node in each set outside its χ subset, which exists because each χ subset is strictly smaller than its S set (Appendix D, p. 24).
3. Initialize S1 to 0, S2 to 1, and all other nodes to 1/2. Keep χS1 at 0 and χS2 at 1 for all time (Appendix D, p. 24).
4. Inductively, each normal node in S1 sees at most F outside values, which W-MSR removes; all retained values are 0. Apply the symmetric argument to S2 and choose uniform retained weights wij(t)=1/|Ji\Ri(t)| (Appendix D, pp. 24–25).
5. Conclude that selected normal nodes remain at 0 and 1, so their limits differ and consensus fails (Appendix D, p. 25).

The formal Coq statement `necessity_proof` quantifies the model and weights in the scope needed to construct this counterexample (Section 3.3, p. 14). Formalization exposed a quantifier ambiguity in the source theorem: the stronger formula quantifies A, malicious functions, and initial values before the implication, while the weaker formula places the universal quantifier outside the implication. The paper proves the weaker placement needed for the counterexample (Section 3.3, pp. 14–15).

Verus form. Inference: write ghost adversary sets and fixed-value transition proofs; prove by induction that every S1/S2 node retains its group value. Inference: encode uniform weights with a precondition that the retained set is nonempty and a lemma that the reciprocal weights sum to one. Inference: this counterexample is naturally a Verus state-machine proof, but the paper's real-valued asymptotic semantics still require a discrete or axiomatized limit interface.

Evidence and trusted parts. The checked theorem is a Coq theorem over abstract functions, not a compiled Rust implementation. The paper also had to alter the source weight condition: it applies weight well-formedness to all nodes so maliciousness is defined, while adversarial update values remain unconstrained (Section 3.3, pp. 14–15). Classical reasoning uses the stated axiom `proposition_degeneracy` and excluded middle (Section 3.2, p. 10; Section 3.4, p. 16). Inference: these axioms and the real-number model are trusted assumptions for a Verus product port.

## what VL should take from this paper

The paper supplies reusable proof patterns for agent-written verified Rust: filtered-average safety, sorted-list partition lemmas, robustness-to-witness arguments, shrinking finite sets, and explicit adversarial counterexamples. Existing work already covers exact consensus protocols and many distributed-system verifications; this paper fills the asymptotic, real-analysis case for W-MSR. VL should not redo the mathematical W-MSR theorem without an implementation-level goal. Inference: the product threat is moderate for agents generating consensus code because the theorem leaves finite precision, changing topology, and executable implementation correctness outside its scope; it is high if VL claims real-number asymptotic guarantees from a Rust implementation without separately proving those boundaries.

## techniques for the catalog

- filtered convex-update modeling: encode value-based removal, deterministic tie-breaking, and lower-bounded unit-sum weights
- sorted-list safety invariant: prove every retained weighted average stays between normal minimum and maximum by exhaustive removal cases
- shrinking threshold-set convergence: combine robustness, epsilon recurrences, and a finite cardinality variant to prove asymptotic consensus
- counterexample necessity: violate robustness by fixing two groups at distinct values and constructing bounded adversaries and weights
- quantifier and trust audit: formalize quantifier scope explicitly and record classical axioms, real arithmetic, and implementation gaps
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
