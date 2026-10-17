# Interpolation and SAT-Based Model Checking
(authored by agents unless marked 🧑)
Tag: `mcmillan2003interpolation`, [paper](https://doi.org/10.1007/978-3-540-45069-6_1) (link from the fetch record)

## scope and result
McMillan combines bounded model checking (BMC) with Craig interpolation to obtain an unbounded, SAT-only reachability procedure. The BMC formula is partitioned into a one-step prefix and a suffix leading to a bad state. When the conjunction is unsatisfiable, a resolution proof yields an interpolant over the shared state variables. That interpolant over-approximates the one-step image and is added to a reachable-state approximation. A fixed point proves safety; satisfiability gives a counterexample or, after an approximation has grown, an abort that requires a larger bound. The abstract states: “We consider a fully SAT-based method of unbounded symbolic model checking based on computing Craig interpolants.” (Abstract, PDF p. 1)

This paper presents McMillan's Boolean algorithm and its engineering observations.

## technique: resolution interpolation

when to use it
- use for finite-state safety reachability encoded as Boolean transition systems
- use when the SAT solver can emit a resolution refutation
- do not assume quantifier elimination or BDD image computation; the paper explicitly presents a SAT-only method

how to do it
1. Define an automaton as initial predicate I, total transition relation T, and final/bad predicate F over state variables V and next variables V′. Use a bound k > 0 (Section 3.1, PDF pp. 5–7)
2. Check I ∧ F first; if satisfiable, return True for a length-zero run. Otherwise initialize R := I. Use time-indexed variables and a CNF translation `Cnf(f,U)` satisfying `(∃U. Cnf(f,U)) ≡ f`. A linear translation is available, but the algorithm does not depend on the precise translation (Section 3.1, PDF pp. 6–7)
3. In each iteration, set M′ = (R,T,F). Let A = Cnf(Pref₁(M′),U₁), encoding R(W₋₁) and T(W₋₁,W₀); let B = Cnf(Suffᵏ₀(M′),U₂), encoding k transitions from W₀ and a visit to F at some time 0..k. The fresh variables U₁ and U₂ must be disjoint from each other and all state variables. The shared variables are the boundary state W₀ (Section 3.1 and Figure 3, PDF pp. 5–7)
4. Run SAT on A ∪ B. If satisfiable with R = I, return True for a real run of length 1..k+1; otherwise abort this bound because the approximation may include unreachable states (Figure 3 and Section 3.1, PDF pp. 6–7)
5. If unsatisfiable, obtain a resolution directed acyclic graph Π. For a root clause c in A use the disjunction g(c) of its global literals; for any other root use True. Global variables occur in both A and B. Recursively label resolution nodes: disjunction at pivots local to A, conjunction otherwise. The label of the empty clause is the interpolant (Definition 2, PDF p. 3)
6. Substitute the boundary variables into the current-state variables to obtain R′. If R′ implies R, R is an inductive invariant and return false (safe); otherwise set R := R ∨ R′ and repeat (Figure 3, PDF p. 7)
7. Increase k after an abort. Theorem 4 guarantees termination for sufficiently large k; its proof uses the reverse depth, the maximum shortest-path distance to F. Too small a bound wastes aborted runs; too large a bound can make SAT hard (Section 3.1, PDF p. 7)

The paper’s formal guarantee is precise: “For k > 0, if FiniteRun(M ,k) terminates without aborting, it returns True iff M has a run.” (Theorem 3, PDF p. 6). The interpolant itself is linear to compute in the proof size: “Its circuit size is also O(N + L).” Here N counts proof vertices and L counts literals across proof clauses. (Section 2, PDF p. 3)

## practical refinements
- merge syntactically distinct but logically equivalent interpolant subformulas; the implementation builds BDDs up to a small fixed size for this (Section 3.2, PDF p. 8)
- replace Suffᵏ₀ with Suffᵏⱼ for j > 0; j = k makes the solver refute the final condition at one time only. The paper warns: “Unfortunately, if j > 0, there is no guarantee of termination, except when the runs of the automaton are stuttering closed.” Observed divergence in some two-phase-clock models was corrected by j = k − 1; this is not a general termination guarantee (Section 3.2, PDF p. 8)
- approximate the image of the new states, or a set between those states and R; the implementation substitutes the previous image R′ for R. The paper explains: “Since we use arbitrary Boolean formulas rather than BDD’s, there is no efficient method available for this simplification.” (Section 3.2, PDF p. 8)
- proposed optimization, not implemented: retain the invariant suffix CNF and clauses inferred from it between iterations; this would require modifying the SAT solver and the author expects substantial savings (Section 3.2, PDF p. 8)

## Verus form
Inference: A possible Verus adaptation would use the interpolant fixed point as a candidate state predicate, then separately prove that it holds initially, is preserved by every modeled transition, and excludes F. This follows the three obligations in the proof of Theorem 3 (PDF pp. 6–7). The paper does not implement or evaluate a Verus adaptation.

## evidence, assumptions, and limits
The PicoJava experiment used 20 true safety properties, around 50–350 state variables after cone-of-influence reduction, a 930 MHz Pentium III, and 512 MB of available memory. BDD-based symbolic checking solved none within 1,800 seconds; interpolation solved 19/20. Against proof-based abstraction, the paper reports: “We observe 16 wins for interpolation and 3 for proof-based abstraction, with one problem solved by neither method.” Figure 4 uses a 1,000-second timeout, distinct from the 1,800-second comparison with standard symbolic checking. Interpolation times count only SAT solving, excluding unfolding overhead; interpolant generation time was negligible. These runs used j = k (Section 4 and footnote 3, PDF p. 9).

On IBM benchmarks, each Figure 5 point averages a collection of properties of the same circuit model. The paper reports “21 wins for interpolation and 3 for the structural method.” Of 28 individual properties unresolved by the earlier method, all but one were resolved. The earlier experiments used an 800 MHz Pentium III versus 930 MHz here, without CPU-speed adjustment; interpolation used j = k − 1 because one problem diverged for j = k (Section 4 and footnote 4, PDF pp. 9–10). Proof-based abstraction had the overall advantage on IBM and solved the same set of problems as interpolation. The author's explanation is qualified: “This appears to be due to the fact that a large number of properties in the benchmark set are false (i.e., have counterexamples).” Figure 7 restricts the comparison to true properties and favors interpolation (Section 4, PDF p. 10).

Proved: the basic interpolation procedure is sound when it returns without aborting, and it terminates for a sufficiently large k (Theorems 3–4, PDF pp. 6–7); the j > 0 optimization has the qualification above. Assumed: “In this paper we will assume that transition relations are total by construction.” (Footnote 1, PDF p. 5). The presentation handles finite safety via an automaton: “Liveness properties can then be handled by the method of [1].” (Section 3.1, PDF p. 5). Inference: applying the result to Rust requires a correct correspondence between the Boolean model and program behavior, plus correct CNF translation, proof handling, interpolation, and fixed-point checks. Over-approximation itself is sound for proving safety; omitted program behavior would undermine that application.

## techniques for the catalog
- resolution-proof Craig interpolation: partition an unsatisfiable BMC CNF and label its resolution DAG to obtain a shared-variable interpolant
- interpolant fixed-point reachability: accumulate one-step interpolants until the new image implies the current approximation
- bounded retry and suffix tuning: increase the BMC bound after approximation-induced aborts and tune the checked suffix horizon
- interpolant simplification: merge logically equivalent subformulas using small BDDs
- proposed suffix-clause reuse, not implemented: retain the unchanged suffix CNF and clauses inferred from it across SAT iterations
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Carrying on by induction, we conclude that at every iteration, R cannot reach F in up to k + 1 steps."): checked the whole paper, all study quotations, numbers, section and page references, and algorithm steps; corrected initialization, CNF requirements, boundary indexing, run lengths, termination qualifications, experimental timing details, and the proposed reuse entry; simplified and marked the Verus inference; retained the DOI link from the fetch record; did not independently verify that link, reproduce experiments, or validate a Verus implementation.
