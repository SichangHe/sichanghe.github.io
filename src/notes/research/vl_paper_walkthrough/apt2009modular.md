# Modular Verification of Recursive Programs
(authored by agents unless marked 🧑)
Tag: `apt2009modular`, [paper](http://arxiv.org/abs/0907.4316v1)

## what the paper proves
The paper develops a Hoare-style proof system for recursive procedures with call-by-value parameters. Its central claim is modularity at the level of proofs: establish one procedure property, then use it as an assumption in a later property. The introduction says, “a simpler property, say {p1 } S {q1 }, is established first and then used in the proof of another property, say {p2 } S {q2 }.” (Section 1, p. 1.) The resulting dependency graph is acyclic rather than a set of independent proofs.

The semantic target is explicit. A partial-correctness triple {p} S {q} requires every terminating execution from p to end in q; total correctness additionally rules out divergence. The paper states, “in the case of partial correctness, diverging computations of S are not taken into account.” (Section 3, p. 5.) It models procedure calls with structural operational semantics and a block that initializes formals in parallel and restores them on return (Section 2, pp. 2–5).

## technique 1: generic-call recursion rule
Use this when a recursive procedure's body can be proved under assumed contracts for generic calls. The paper's steps are:

1. choose fresh variables x̄ for each procedure and state assumed triples {pi} Pi(x̄i) {qi}; freshness conditions are given in the INSTANTIATION and RECURSION rules (Section 3, p. 6)
2. prove the desired triple for the whole program using those assumed generic-call triples (Section 3, p. 6)
3. prove each body, written as a block that initializes formal parameters from x̄i, under the same assumptions (Section 3, p. 6)
4. apply RECURSION to discharge the assumptions and obtain the procedure-call triples; then use the first premise to obtain the program triple (Section 3, pp. 6–7)

The rule's purpose is stated directly: “The second premise of the rule states that we can establish from the assumption of the (pi , qi )-correctness of the ‘generic’ procedure calls Pi (x̄i ) for i ∈ {1, . . . , n}, the (pi , qi )-correctness of the procedure bodies Si for i ∈ {1, . . . , n}, which are adjusted as in the transition axiom that deals with the procedure calls.” (Section 3, p. 6.) The INSTANTIATION rule then substitutes actual parameters t̄ for the fresh variables x̄ in a proved generic call, under the side condition that var(x̄) ∩ var(D) = var(t̄) ∩ change(D) = ∅ (Section 3, p. 6). For total correctness the paper uses RECURSION II, whose body premise assumes {pi ∧ t < z} Pi(x̄i) {qi} and proves {pi ∧ t = z} for the body, with z treated as a constant (Section 3, p. 7).

The paper's MODULARITY rule (Section 4, p. 8) is the two-stage, one-procedure form: from {p0} P(x̄) {q0} ⊢ {p0} begin local ū := x̄; S end {q0} and {p0} P(x̄) {q0}, {p} P(x̄) {q} ⊢ {p} begin local ū := x̄; S end {q}, conclude {p} P(x̄) {q}. Section 4 also gives a DECOMPOSITION rule that combines a PR proof of {p} S {q} with a TR proof of {p} S {true} into total correctness of {p} S {q}.

Inference: in Verus, encode each recursive function's contract with `requires` and `ensures`, and let recursive calls use that contract. Keep helper lemmas separate from executable code. Verus does not use Hoare triples or the paper's block semantics; Rust ownership and explicit `spec fn` values replace the paper's state-and-substitution presentation. The reusable idea is the dependency order: prove a small contract first, then invoke it in a larger proof.

## technique 2: separate auxiliary properties
Use this when a recursive procedure's contract splits into a simpler property and a main property whose proof needs the simpler one. The Quicksort proof first establishes a permutation property Q2, then uses Q2 while proving the sorting property Q3. The conclusion reports, “When proving correctness of the Quicksort program we found that the simple approach here proposed allowed us to structure the proof better by establishing the ‘permutation property’ first and then using it in the proof of the ‘sorting property’.” (Section 6, p. 17.)

The paper's concrete steps are:

1. assume P1 (bounds on ri and le after Partition) and P2 (Partition permutes a[m : n] inside any enclosing interval [x′ : y′]); derive Q2, the same permutation property for Quicksort(x, y), by the recursion rule, written P1, P2 ⊢ Q2 (Section 5, pp. 10–12, Claim 1 and Figure 1)
2. assume P3 (after Partition, le > ri, the part a[m : ri] is ≤ pi, the middle is = pi, and a[le : n] is ≥ pi); to derive Q3 {true} Quicksort(x, y) {sorted(a[x : y])} by the recursion rule, assume Q2 and Q3 for the recursive calls and prove the body outline in Figure 2 (Claim 2), written P3, Q2 ⊢ Q3 (Section 5, pp. 10–15)
3. for each recursive call, instantiate Q3 and use Q2 (with the substitution, invariance, ∃-introduction and consequence rules) to show that K, the three-part postcondition of Partition, is preserved; J ≡ m = x ∧ n = y is preserved by the invariance axiom; combine these with the conjunction rule (Section 5, pp. 12–15)
4. combine Q2 and Q3 by the conjunction rule, then apply the substitution rule with [x′, y′ := x, y] and the consequence rule to obtain Q1 {a = a0} Quicksort(x, y) {perm(a, a0, [x : y]) ∧ sorted(a[x : y])}, written P1, P2, P3 ⊢ Q1 (Section 5, p. 15)

Inference: in Verus, make permutation a lemma or `ensures` clause that can be invoked before proving sortedness. A sequence model and predicates for `sorted` and permutation can carry the same logical split, but the paper's substitution and existential-introduction rules must be expressed with Verus lemmas and explicit triggers.

## technique 3: termination by a decreasing bound
Use this when recursive calls shrink a natural measure. For Quicksort the paper chooses “t ≡ max(y − x, 0) as the bound function.” (Section 5, p. 16.) It assumes the Partition property P4 {m < n} Partition(m, n) {ri − m < n − m ∧ n − le < n − m}, shows that both recursive calls start with a measure smaller than z, and applies the simplified recursion rule II to derive Q4 {true} Quicksort(x, y) {true}, written P4 ⊢ Q4 (Section 5, pp. 15–17). Total correctness then follows from Q4 by the decomposition rule of Section 4. Figure 3 shows the sequence: establish `n − m = z`; partition gives `ri − m < n − m` and `n − le < n − m`; assign `v,w := ri,le`; prove `max(v−m,0)<z` and `max(n−w,0)<z`; call both recursive procedures (Section 5, pp. 16–17).

Inference: in Verus, use a `decreases` clause on the recursive function, usually a natural or integer interval length, and prove the two recursive calls decrease it. The paper's total-correctness proof also requires nonnegativity and explicit arithmetic implications; Verus generates analogous obligations but its syntax and termination checker differ.

## evidence, trust, and limits
The evidence is a worked symbolic proof of Quicksort partial and total correctness, not an implementation benchmark. The soundness proof is not in this paper: it says “The soundness of the considered proof systems is rigorously established in [3] using the operational semantics of [16,17].” (Section 1, p. 2.) The paper reports no solver timings, proof-size denominator, or machine-checked artifact; it only says the approach “should be of help when organizing a mechanically verified correctness proof” (Section 6, p. 17). The Partition properties P1–P4 are assumed, not proved: “so to verify them it suffices to prove the corresponding properties of the procedure body using the proof systems PD and TD, a task we leave to Nissim Francez.” (Section 5, p. 10.) Figure 3 as printed uses the guard “n < k” where the procedure has “m < n”.

Inference: the results rest on the assertion logic, the semantic model, the procedure declarations, and the unproved Partition properties; the method assumes recursive calls can be described by contracts and that suitable invariants and ranking expressions can be found.

## techniques for the catalog
- modular recursive contracts: prove generic-call contracts from body proofs, then reuse them as assumptions in later proofs
- property-first decomposition: prove permutation or another auxiliary property before the stronger functional property
- ranking-function termination: choose a nonnegative bound and prove every recursive call strictly decreases it
