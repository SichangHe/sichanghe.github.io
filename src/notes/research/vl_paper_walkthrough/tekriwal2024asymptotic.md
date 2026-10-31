# Formally verified asymptotic consensus in robust networks
(authored by agents unless marked 🧑)
Tag: `tekriwal2024asymptotic`, [paper](https://arxiv.org/abs/2202.13833v3)

## scope and result

The paper formalizes the Weighted-Mean Subsequence Reduced (W-MSR) algorithm for a time-invariant directed graph, under an F-total malicious-node model. A malicious node sends the same value to all its neighbors at each time step, but departs from the normal update at some time (Definition 1, p. 4). Normal nodes repeatedly discard up to F values on each side of their own value and take a weighted average. The main theorem equates (F+1,F+1)-robustness with consensus for every adversary assignment, malicious update, initialization, and admissible weight function. Its formal statement assumes at least two nodes and 0<F+1≤|D| (Theorem 1, p. 6; Section 3.4, pp. 15–16). The paper states, “This paper presents the first formal proof of an asymptotic consensus algorithm, and addresses various challenges in its formalization.” (Abstract, p. 1)

The formalization is in Coq over real numbers, with MathComp sequences/sets and Coquelicot limits. Its scope is deliberately narrower than the source controls paper: time-invariant graphs, malicious rather than Byzantine behavior, and F-total faults (Section 2, p. 3). The authors report, “The total length of Coq proofs is about 11 thousand lines of code. It took us 6 person months for the entire formalization.” (Conclusion, p. 17)

## technique 1: define the W-MSR update and filtering in the prover

What it is. A normal node i has inclusive neighbors Ji, removes a set Ri(t) of at most F low and at most F high values, and updates with a convex sum
xi(t+1) = Σj∈Ji\Ri(t) wij(t)xij(t). The weights are zero outside Ji, each retained neighbor has weight at least α, and retained weights sum to one (Section 2.4, pp. 5–6).

When to use it. Inference: use this model when proving a resilient consensus algorithm whose adversaries are bounded in number and whose normal update is a filtered convex combination. It preserves the exact value-based filtering needed by the convergence proof instead of replacing the update with an abstract transition.

How the paper does it.

1. Form the inclusive-neighbor list and sort it by value, breaking equal-value ties by the node order in `enum D` (Section 3.1, p. 8).
2. If fewer than F values are strictly above i, remove all such values; otherwise remove the largest F. Apply the symmetric rule below i (Section 2.4, p. 6).
3. Define `remove_extremes` with MathComp `filter`, using decidable real comparisons and list indices to retain the nodes allowed by the removal rule (Section 3.1, p. 8).
4. Define `incl_neigh_minus_extremes` as the filtered inclusive-neighbor list. The weight hypothesis depends on adversary tags, malicious updates, and initial values because those determine which values survive filtering (Section 3.1, p. 8).

Verus form. Inference: specify the sorted sequence, retained membership, weight lower bound, and unit sum as separate obligations. A Rust filtering implementation would need a proof that its output matches this mathematical model. The paper supplies no Rust or Verus implementation; these are proposed proof obligations, not a checked translation.

Evidence. The paper gives the Coq definitions and says, “The trickiest parts of the proof of Lemma 1 rely on the fact that we desire Ji \ Ri (t) when treated as a list to be sorted.” (Section 3.1, p. 8) The result is a machine-checked safety lemma independent of topology (Lemma 1, pp. 7–9).

Limits and assumptions. Real arithmetic is assumed; the conclusion does not cover finite-precision implementation. The graph is time-invariant and the attacker set is F-total. The authors explicitly identify finite precision and time-varying graphs as future work (Conclusion, p. 17).

## technique 2: prove a filtering safety invariant by sorted-list case analysis

What it is. The safety invariant says every normal update remains in the interval [m(t), M(t)], where m and M are the minimum and maximum normal values. This is Lemma 1, and it is proved in this paper because the source paper only gave an outline (Section 3.1, p. 7).

When to use it. Inference: establish this invariant before a convergence argument: it bounds all later normal values, makes m nondecreasing and M nonincreasing, and supplies the interval part of the final consensus definition.

How the paper does it.

1. Sort Ji and define the low-removal set Ri<(t) by value and index; define Ri>(t) symmetrically (Appendix A, pp. 20–21).
2. Show |Ri<(t)|≤F and that every removed low value is no larger than every retained value (Appendix A, p. 20).
3. If |Ri<(t)|=F, use the F-total fault bound: either all removed lows are adversarial, leaving a retained normal witness, or one removed low is normal and itself supplies the lower bound (Appendix A, p. 20).
4. If |Ri<(t)|<F, take the first retained list element. The index condition forces its value to equal xi(t), so the normal node i itself is a lower-bound witness (Appendix A, p. 21).
5. Multiply the witness inequality by nonnegative weights and use the unit-sum condition to derive xi(t+1)≥m(t); repeat symmetrically for M(t) (Section 3.1, p. 7).

The Coq lemma is stated as `lem_1`, universally quantifying node, time, malicious update, initial values, adversary tag, and weights, and concluding both inequalities (Section 3.1, p. 7). The paper says, “We provide a detailed proof of the lemma by explicitly enumerating the cases from the definition of the W-MSR algorithm.” (Section 3.1, p. 7)

Verus form. Inference: define the normal minimum and maximum in the specification, then prove that every retained value lies between them. Separate proof functions can express the sorted-list partition and the weighted-average bound. This requires explicit nonnegative-weight and unit-sum assumptions.

Evidence. The paper reports that MathComp's filter gives lemmas needed to show retained membership, and introduces `partition_incl` to split the inclusive list into low removed, retained, and high removed sorted parts (Section 3.1, pp. 8–9). The authors report proof size and effort in the conclusion; this study does not inspect or rerun the Coq artifact.

## technique 3: formalize asymptotic sufficiency with shrinking threshold sets

What it is. Sufficiency assumes (F+1,F+1)-robustness and proves all normal sequences converge to one limit. For disjoint nonempty sets S1 and S2, robustness requires one of three alternatives: every node in S1 has F+1 outside in-neighbors; every node in S2 does; or at least F+1 nodes across the two sets do, relative to their respective sets (Definition 4, p. 5). The proof uses limits of M(t) and m(t), assumes they differ, and repeatedly shrinks two disjoint threshold sets until one has no normal node (Sections 3.2 and Appendix B, pp. 9–13, 21–23).

How the paper does it.

1. Use the safety invariant to bound M and m and make M nonincreasing and m nondecreasing; take limits AM and Am (Section 3.2, pp. 9–11; Figure 3, p. 10). Inference: the sentence on p. 9 calling both functions continuous and decreasing is imprecise; m increases monotonically and the functions are discrete-time sequences.
2. Assume AM≠Am and choose ε0 with AM−ε0>Am+ε0. Choose 0<ε<ε0 also satisfying ε < α^N/(1−α^N)·ε0, where N is the number of normal nodes (Appendix B.1, p. 21).
3. Choose tε such that M(t)<AM+ε and m(t)>Am−ε for all t≥tε. Define XM(t,εl)={i: xi(t)>AM−εl} and Xm(t,εl)={i: xi(t)<Am+εl}; instantiate robustness on these disjoint sets (Section 3.2, pp. 11–12; Appendix B.1, p. 21).
4. Use all three clauses of robustness. If the first or second clause applies, first prove a normal node exists in the corresponding set; if the third applies, at least F+1 candidate nodes imply one normal node because at most F are adversarial (Section 3.2, p. 12; Appendix B.2, pp. 21–22).
5. For a high-side witness, prove one retained neighbor is ≤AM−εl and all other retained values are ≤M(t). Then derive xi(t+1)≤(1−α)M(t)+α(AM−εl) (Appendix C, pp. 23–24).
6. Define εl recursively as εl=αεl−1−(1−α)ε, keeping εl positive through l=N by the choice of ε. While both sets contain normal nodes, prove that neither normal-node cardinality increases and at least one strictly decreases at each step (Appendix B.3, pp. 22–23).
7. Apply the finite counting lemma `sj_ind_var` to obtain T≤N where one threshold set has no normal nodes, contradicting AM≤M(t) and m(t)≤Am (Section 3.2, p. 13; Appendix B.3, pp. 22–23).

The paper prints a plus sign in the εl recurrence on p. 12, but a minus sign in Appendix B.3, p. 22. The steps above use the appendix recurrence. Inference: the minus sign agrees with the preceding update bound AM−αε0+(1−α)ε in inequality (2), p. 22.

Verus form. Inference: prove the finite-set counting argument separately from the real-analysis argument. A translation must supply precise sequence-limit definitions and establish their lemmas before claiming asymptotic consensus. Replacing those limits with a discrete approximation would require a different theorem.

Evidence. The paper formalizes `strong_sufficiency`, `r_s_robustness`, `Resilient_asymptotic_consensus`, disjointness, normal-witness existence, intersection, and cardinality-decrease lemmas (Section 3.2, pp. 10–13). It notes that the source proof omitted connections from the first two robustness clauses and omitted the bound needed for inequality (2); both are supplied and checked here (Section 3.2, pp. 12–13).

## technique 4: prove necessity by an explicit adversarial counterexample

What it is. Necessity is proved contrapositively: if the graph is not (F+1,F+1)-robust, construct adversaries, initial values, malicious behavior, and weights that keep two normal groups at distinct limits (Section 3.3, p. 13; Appendix D, pp. 24–25).

How the paper does it.

1. Choose disjoint nonempty S1,S2 violating robustness. Let χS^(F+1) denote the nodes in S with at least F+1 in-neighbors outside S, and choose χS1^(F+1)∪χS2^(F+1) as the adversary set. Violating the third robustness clause bounds its size by F (Section 3.3, p. 14; Appendix D, p. 24).
2. Pick a normal node in each set outside its χ subset, which exists because each χ subset is strictly smaller than its S set (Appendix D, p. 24).
3. Initialize S1 to 0, S2 to 1, and all other nodes to 1/2. Keep χS1 at 0 and χS2 at 1 for all time (Appendix D, p. 24).
4. Inductively, each normal node in S1 receives at most F outside inputs, and W-MSR removes every nonzero input; all retained values are 0. Apply the symmetric argument to S2 and choose uniform retained weights wij(t)=1/|Ji\Ri(t)| (Appendix D, pp. 24–25).
5. Conclude that selected normal nodes remain at 0 and 1, so their limits differ and consensus fails (Appendix D, p. 25).

The formal Coq statement `necessity_proof` negates a universally quantified consensus claim, permitting a counterexample to that universal claim (Section 3.3, p. 14). The distinction on p. 15 is between `∀ configuration, admissible(configuration) → (consensus(configuration) ↔ robust)` and `(∀ configuration, admissible(configuration) → consensus(configuration)) ↔ robust`. The final theorem uses the second form: robustness is necessary for consensus under every admissible configuration, rather than necessary for an individual configuration to converge (Section 3.4, p. 15).

Verus form. Inference: specify the adversary set and fixed group values, then prove by induction that the selected normal nodes remain distinct. Uniform weights additionally require a nonempty retained set, a unit-sum proof, and a positive lower bound independent of time. These are proposed translation obligations; no Verus proof is checked here.

Evidence and trusted parts. The checked theorem is a Coq theorem over abstract functions, not a compiled Rust implementation. Section 2.4, p. 6 lists the lower bound for all inclusive neighbors, whereas Appendix D, pp. 24–25 constructs positive uniform weights only for retained neighbors and zero elsewhere. The retained-neighbor formulation above follows that construction and the discussion on p. 8. The paper also alters the scope of the source weight condition: it applies weight well-formedness to all nodes so maliciousness is defined, while adversarial update values remain unconstrained (Section 3.3, pp. 14–15). Classical reasoning uses the stated axiom `proposition_degeneracy` and excluded middle (Section 3.2, p. 10; Section 3.4, p. 16). The paper states, “We introduce the following axiom in Coq to support reasoning by contradiction.” (Section 3.2, p. 9) Inference: a translation must account for this classical reasoning and preserve the real-number semantics or prove a replacement theorem.

## techniques for the catalog

Inference: the following are candidate reusable techniques.

- filtered convex-update modeling: encode value-based removal, deterministic tie-breaking, and lower-bounded unit-sum weights
- sorted-list safety invariant: prove every retained weighted average stays between normal minimum and maximum by exhaustive removal cases
- shrinking threshold-set convergence: combine robustness, epsilon recurrences, and a finite cardinality variant to prove asymptotic consensus
- counterexample necessity: violate robustness by fixing two groups at distinct values and constructing bounded adversaries and weights
- quantifier and trust audit: formalize quantifier scope explicitly and record classical axioms, real arithmetic, and implementation gaps
