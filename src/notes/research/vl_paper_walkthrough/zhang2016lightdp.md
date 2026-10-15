# LightDP: towards automating differential privacy proofs
(authored by agents unless marked 🧑)
Tag: `zhang2016lightdp`, [paper](https://doi.org/10.1145/3009837.3009884)

## problem and contribution

LightDP verifies probabilistic algorithms for pure differential privacy by making the relation between two adjacent executions explicit in types, then reducing the remaining privacy argument to an ordinary verification problem. The paper motivates this split because existing custom logics can express sophisticated algorithms but demand heavy annotations. Its abstract states: “The core of LightDP is a novel relational type system that separates relational reasoning from privacy budget calculations.” (Abstract, PDF p. 1.) The system targets algorithms where composition gives a loose bound, especially Sparse Vector.

The paper's central soundness condition is operational. A typed probabilistic program is transformed into a nondeterministic program with an explicit privacy-cost variable. If the source type-checks and the transformed program proves that this variable never exceeds ε₀, Theorem 2 concludes ε₀-differential privacy. The authors emphasize the intended workflow: “the transformed nonprobabilistic program is ready for off-the-shelf formal verification methods, such as Hoare logic, to provide an upper bound of the privacy cost.” (Section 2.4, PDF p. 4.)

## technique 1: relational distance types and randomness alignment

what it is and when to use it

Use a type `B_d` for a value whose executions on adjacent inputs differ by distance `d`: if the first execution has value `v(1)`, the second has `v(2) = v(1) + d`. Use constant distances for public or fixed alignments and dependent distances when the alignment depends on the current state. A star type packages a value and its distance, allowing a list such as the query list to contain related but unequal elements.

how to do it

1. State the adjacency relation as a global invariant. In Sparse Vector, the precondition bounds every query distance by ±1 (Section 2.4, PDF p. 4).
2. Assign public values distance zero, for example the threshold `T : num0`.
3. For each random draw, choose an injective mapping between the two executions and write its distance. The paper assigns threshold noise distance 1, representing the map `v` to `v+1`.
4. Make a state-dependent assignment when one mapping is needed for each branch. For query noise η₂ the distance is `q[i]+η₂ ≥ T̃ ? 2 : 0`; this maps noise by +2 when the branch is true and leaves it unchanged otherwise (Section 2.4, PDF p. 4).
5. Type-check every comparison with rule T-ODOT. The generated constraint requires the comparison to have the same Boolean result in both executions. For Sparse Vector, the solver checks the universal implication shown after Figure 6 (Section 3.3, PDF p. 7).

evidence and limits

The invariant on the output list has type `list bool0`, so related executions produce identical output. The approach assumes the random alignment is injective and that the adjacency precondition is true. It proves pure ε-privacy; the conclusion explicitly leaves (ε,δ)-privacy for future work (Section 8, PDF p. 13). Inference: a Verus implementation would represent the relation as ghost/spec state and prove branch agreement with `assert` and `assert forall`, while executable Rust still samples randomness; Verus does not provide LightDP's probabilistic semantics automatically.

## technique 2: type-directed cost transformation

what it is and when to use it

Transform each random assignment into an unconstrained `havoc` assignment plus an increment to `vε`. This separates relational alignment, handled by typing, from budget arithmetic, handled by a standard verifier. The paper describes the transformed program as “almost identical to the original program” except that privacy cost is explicit and probabilistic instructions become nondeterministic (Section 2.4, PDF p. 4).

how to do it

1. Introduce `vε := 0`.
2. Replace `η := Lap(r)` with `havoc η; vε := vε + |d|/r`, where `d` is η's type distance (typing rule T-LAPLACE, Figure 6, PDF p. 7).
3. Preserve ordinary commands and add assignments for star-type distance components.
4. Supply a loop invariant that bounds `vε`. For Sparse Vector, the paper uses `c1 ≤ N ∧ vε = ε/2 + c1 × ε/(2N)` and proves `vε ≤ ε` (Figure 2, PDF p. 4).
5. Discharge the resulting functional-correctness goal with Hoare logic or Dafny. The paper reports that the Sparse Vector target was formally proved with one loop-invariant annotation (Section 3.3, PDF p. 7).

Verus form (inference)

Inference: encode `vε` as a ghost integer or real, keep random sampling in executable Rust, and give the loop a `invariant` clause stating the budget equation and loop bound. Use `ensures v_eps <= eps` on a proof-facing wrapper; do not put `ensures` on a `spec fn`. The probabilistic theorem remains an external lemma because Verus's standard verifier proves deterministic contracts.

## technique 3: dependent type inference and MaxSMT optimization

what it is and when to use it

Use inference when hand-selecting distances is difficult or when several valid alignments have different privacy costs. Unknown distances become variables; type checking generates arithmetic and branch-agreement constraints. LightDP then minimizes an upper-bound expression with a MaxSMT solver.

how to do it

1. Mark local distances as unknowns α, β, γ.
2. Run refinement before inference so branch context and definitions propagate into expressions; this is necessary for dependent types (Section 5.1, PDF pp. 9–10).
3. Generate typing constraints and a symbolic cost. For Sparse Vector the bound is `αε/2 + βε/4 + c2γε/(4N)` and optimization is `min(2α + β + c2γ/N)` (Section 2.5, PDF p. 5).
4. Ask µZ MaxSMT for a satisfying assignment minimizing that expression.
5. Verify the resulting transformed program with the supplied loop invariant and postcondition.

The solver infers α=1, β=2, γ=0 for Sparse Vector, matching the hand-written alignment (Section 2.5, PDF p. 5). Inference: a VL workflow could generate candidate Verus ghost distances and lemmas, but a human still needs to review the generated contract because optimization only minimizes the encoded bound.

## technique 4: case-study patterns

The numerical Sparse Vector variant adds fresh Laplace noise before returning a numeric answer. The paper says LightDP reuses the previously inferred types and needs only η₃'s type, inferred as `num−q̂[i]`; the resulting proof uses one loop invariant (Section 6.1, PDF p. 11). SmartSum groups bits into blocks, adds noise to each block and loose bit, and uses one invariant to prove a `2ε` bound (Section 6.2, PDF p. 12). PrivBernoulli handles categorical output by sampling `Uniform[0,1]`, returning true when η≤t, and adding cost `−log(d+1)` for distance `d`; T-ODOT discharges the branch constraint with an SMT solver (Section 6.3, PDF p. 12). These examples show that the reusable unit is the alignment-plus-transformation pattern, not a fixed Laplace-only primitive.

## what is proved, trusted, and missing

The proved claims are type-system soundness, faithfulness of the transformation, and privacy bounds for the listed algorithms under their preconditions. The reported implementation relies on external SMT solving, Dafny for target-program functional proofs, and the semantics of Laplace and uniform distributions. Inference: those solvers, the probabilistic semantics, the correctness of the supplied adjacency relation, and the statement that the code implements the modeled algorithm remain trusted. The paper reports no denominator-based benchmark table; its evidence is successful proofs of the four case-study algorithms and the one-annotation Sparse Vector example. It also notes an incorrect Sparse Vector variant whose transformed cost is unbounded, so the method can expose a privacy failure rather than merely certify successful code (Section 6.1, PDF p. 11).

For VL, the threat is substantial for agent-written privacy-sensitive Rust if an agent supplies a false adjacency assumption or an incorrect cost model. Inference: LightDP's separation suggests a product feature—generate relational ghost facts and a deterministic budget invariant before invoking Verus—but this paper does not establish that LLMs can generate those facts reliably. Existing LightDP already covers Sparse Vector, SmartSum, and categorical Bernoulli alignment; VL should avoid redoing those algorithms and instead test whether generated Rust contracts preserve the same assumptions.

## techniques for the catalog

- relational distance types — assign each value a distance between adjacent executions, including state-dependent distances for branch-sensitive randomness
- type-directed cost transformation — replace random draws with `havoc` plus explicit privacy-budget increments and prove a deterministic bound
- dependent inference with MaxSMT — infer distance annotations from typing constraints and minimize the resulting privacy-cost expression
- alignment for categorical randomness — map uniform samples across executions and charge `−log(d+1)` while proving branch agreement

Checked 2026-10-15 against the paper by a Codex agent for lightdp_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
