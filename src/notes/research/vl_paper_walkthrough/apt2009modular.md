# Modular Verification of Recursive Programs
(authored by agents unless marked 🧑)
Tag: `apt2009modular`, [paper](http://arxiv.org/abs/0907.4316v1)

## what the paper proves
The paper develops a Hoare-style proof system for recursive procedures with call-by-value parameters. Its central claim is modularity at the level of proofs: establish one procedure property, then use it as an assumption in a later property. The introduction says, “a simpler property, say {p1 } S {q1 }, is established first and then used in the proof of another property, say {p2 } S {q2 }.” (Section 1, p. 1.) The resulting dependency graph is acyclic rather than a set of independent proofs.

The semantic target is explicit. A partial-correctness triple {p} S {q} requires every terminating execution from p to end in q; total correctness additionally rules out divergence. The paper states, “in the case of partial correctness, diverging computations of S are not taken into account.” (Section 3, p. 5.) It models procedure calls with structural operational semantics and a block that initializes formals in parallel and restores them on return (Section 2, pp. 3–5).

## technique 1: generic-call recursion rule
Use this when a recursive procedure's body can be proved under assumed contracts for generic calls. The paper's steps are:

1. choose fresh variables x̄ for each procedure and state assumed triples {pi} Pi(x̄i) {qi}; freshness conditions are given in the INSTANTIATION and RECURSION rules (Section 3, p. 6)
2. prove the desired triple for the whole program using those assumed generic-call triples (Section 3, p. 6)
3. prove each body, written as a block that initializes formal parameters from x̄i, under the same assumptions (Section 3, p. 6)
4. apply RECURSION to discharge the assumptions and obtain the procedure-call triples; then use the first premise to obtain the program triple (Section 3, pp. 6–7)

The rule's purpose is stated directly: “The second premise of the rule states that we can establish from the assumption of the (pi , qi )-correctness of the ‘generic’ procedure calls Pi (xi ) ... the (pi , qi )-correctness of the procedure bodies.” (Section 3, p. 6.) The INSTANTIATION rule then substitutes actual parameters into a proved generic call while requiring that fresh variables do not clash with changed variables (Section 3, p. 6).

Inference: in Verus, encode each recursive function's contract with `requires` and `ensures`, and let recursive calls use that contract. Keep helper lemmas separate from executable code. Verus does not use Hoare triples or the paper's block semantics; Rust ownership and explicit `spec fn` values replace the paper's state-and-substitution presentation. The reusable idea is the dependency order: prove a small contract first, then invoke it in a larger proof.

## technique 2: separate auxiliary properties
Use this when a recursive algorithm has several postconditions that are easier to establish independently but one property strengthens another. The Quicksort proof first establishes a permutation property Q2, then uses Q2 while proving the sorting property Q3. The conclusion reports, “When proving the correctness of the Quicksort program we found that the simple approach here proposed allowed us to structure the proof better by establishing the ‘permutation property’ first and then using it in the proof of the ‘sorting property’.” (Section 6, p. 17.)

The paper's concrete steps are:

1. define P1 for partition's permutation behavior and P2 for its bounds; derive Q2, the permutation contract for Quicksort, by the recursion rule (Section 5, pp. 9–12)
2. define P3 for partition's ordering result; assume Q2 and Q3 for recursive calls and prove the body outline in Figure 2 (Section 5, pp. 12–15)
3. instantiate Q3 for each recursive subrange, preserve the loop/partition invariant J and ordering predicate K with invariance and consequence rules, and combine the subproofs with conjunction (Section 5, pp. 13–15)
4. combine Q2 and Q3 to obtain the final partial-correctness contract Q1 (Section 5, p. 15)

Inference: in Verus, make permutation a lemma or `ensures` clause that can be invoked before proving sortedness. A sequence model and predicates for `sorted` and permutation can carry the same logical split, but the paper's substitution and existential-introduction rules must be expressed with Verus lemmas and explicit triggers.

## technique 3: termination by a decreasing bound
Use this when recursive calls shrink a natural measure. For Quicksort the paper chooses “t ≡ max(y − x, 0) as the bound function.” (Section 5, p. 16.) It proves that partition returns indices making both recursive measures smaller than z, then applies the total-correctness recursion rule. Figure 3 shows the sequence: establish `n − m = z`; partition gives `ri − m < n − m` and `n − le < n − m`; assign `v,w := ri,le`; prove `max(v−m,0)<z` and `max(n−w,0)<z`; call both recursive procedures (Section 5, pp. 16–17).

Inference: in Verus, use a `decreases` clause on the recursive function, usually a natural or integer interval length, and prove the two recursive calls decrease it. The paper's total-correctness proof also requires nonnegativity and explicit arithmetic implications; Verus generates analogous obligations but its syntax and termination checker differ.

## evidence, trust, and limits
The evidence is a worked symbolic proof of Quicksort partial and total correctness, not an implementation benchmark. The paper says its soundness is established “using the operational semantics” (Section 1, p. 2), and reports no solver timings, proof-size denominator, or machine-checked artifact. Trusted assumptions include the assertion logic, semantic model, procedure declarations, and the supplied contracts and lemmas. The method assumes recursive calls can be described by contracts and that suitable invariants and ranking expressions can be found.

Inference: threat to a product that generates verified Rust is medium. Contract dependency graphs and measure-based recursion are directly useful; however, the paper does not address Rust aliasing, unsafe code, library specifications, solver brittleness, or generated proof maintenance. VL should reuse the property-first structure and termination pattern rather than redo a generic Hoare calculus.

## techniques for the catalog
- modular recursive contracts: prove generic-call contracts from body proofs, then reuse them as assumptions in later proofs
- property-first decomposition: prove permutation or another auxiliary property before the stronger functional property
- ranking-function termination: choose a nonnegative bound and prove every recursive call strictly decreases it
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
