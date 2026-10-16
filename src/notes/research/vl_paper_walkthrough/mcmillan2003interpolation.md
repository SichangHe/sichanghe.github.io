# Interpolation and SAT-Based Model Checking
(authored by agents unless marked 🧑)
Tag: `mcmillan2003interpolation`, [paper](https://doi.org/10.1007/978-3-540-45069-6_1)

## scope and result
McMillan combines bounded model checking (BMC) with Craig interpolation to obtain an unbounded, SAT-only reachability procedure. The BMC formula is partitioned into a one-step prefix and a suffix leading to a bad state. When the conjunction is unsatisfiable, a resolution proof yields an interpolant over the shared state variables. That interpolant over-approximates the one-step image and is added to a reachable-state approximation. A fixed point proves safety; satisfiability gives a counterexample or, after an approximation has grown, an abort that requires a larger bound. The abstract states: “We consider a fully SAT-based method of unbounded symbolic model checking based on computing Craig interpolants.” (Abstract, PDF p. 1)

This paper presents McMillan's Boolean algorithm and its engineering observations.

## technique: resolution interpolation

when to use it
- use for finite-state safety reachability encoded as Boolean transition systems
- use when the SAT solver can emit a resolution refutation
- do not assume quantifier elimination or BDD image computation; the paper explicitly presents a SAT-only method

how to do it
1. Define an automaton as initial predicate I, transition relation T, and final/bad predicate F over state variables V and next variables V′ (Section 3.1, PDF pp. 5–6)
2. For a bound k, encode paths with time-indexed variables and translate the formulas to CNF using a linear Tseitin-style `Cnf(f,U)` with fresh variables (Section 3.1, PDF p. 6)
3. Partition the clauses: A is the initial condition plus the first transition frame; B is the remaining transition frames and final condition. Their only shared variables represent the boundary state s1 (Section 3, PDF pp. 4–5)
4. First check I ∧ F for a length-zero run. Then run SAT on A ∪ B. If satisfiable at the first iteration (R = I), return a real run; if satisfiable after R has grown, abort this bound because the interpolant may have over-approximated reachability (Figure 3 and Section 3.1, PDF pp. 6–7)
5. If unsatisfiable, obtain a resolution DAG Π. For a root clause c in A use its global literals g(c); for a root in B use True. Recursively label resolution nodes: disjunction at pivots local to A, conjunction otherwise. The label of the empty clause is the interpolant (Definition 2, PDF p. 3)
6. Substitute the boundary variables into the current-state variables to obtain R′. If R′ implies R, R is an inductive invariant and return false (safe); otherwise set R := R ∨ R′ and repeat (Figure 3, PDF p. 7)
7. Increase k after an abort. Theorem 4 says some k, at most the reverse depth, terminates; too small wastes aborted runs, too large can make SAT hard (Sections 3.1, PDF pp. 7–8)

The paper’s formal guarantee is precise: “For k > 0, if FiniteRun(M ,k) terminates without aborting, it returns True iff M has a run.” (Theorem 3, PDF p. 6). The interpolant itself is linear to compute in the proof size: “Its circuit size is also O(N + L).” Here N counts proof vertices and L counts literals across proof clauses. (Section 2, PDF p. 3)

## practical refinements
- remove syntactically redundant but logically equivalent interpolant subformulas; the implementation builds small BDDs for this (Section 3.2, PDF p. 8)
- replace the suffix condition “all bad times 0..k” with a single final time j = k to shrink SAT queries; this can diverge for non-stuttering-closed systems, so the experiments use j = k − 1 when needed (Section 3.2, PDF p. 8)
- compute only the frontier/new image rather than the whole R; the paper uses the previous image R′ because arbitrary formulas lack an efficient simplifier (Section 3.2, PDF p. 8)
- proposed optimization, not implemented: retain the invariant suffix CNF and clauses inferred from it between iterations; this would require modifying the SAT solver and the author expects substantial savings (Section 3.2, PDF p. 8)

## Verus form
Inference: In Verus, the executable transition system would remain Rust, while a ghost state predicate represents R and a loop `invariant` expresses inductiveness. An external SAT proof producer could emit candidate predicates, which Verus would check with `assert`, `requires`, `ensures`, and proof functions. Inference: the paper’s partition A/B corresponds to a generator-side artifact, not a Verus construct. Inference: the generated predicate must be stated over the exact Verus ghost variables and cannot justify unsafe FFI, compiler behavior, or a mismatched specification.

## evidence, assumptions, and limits
The PicoJava experiment used 20 true safety properties, 50–350 state variables after cone-of-influence reduction, a 930 MHz Pentium III, and 512 MB. BDD-based symbolic checking solved none within 1,800 seconds; interpolation solved 19/20 (Section 4, PDF p. 9). Against proof-based abstraction, interpolation won 16 benchmarks, proof-based abstraction won 3, and neither solved 1; those are the 20 PicoJava instances, and plotted times include only SAT time for interpolation (Section 4, PDF pp. 9–10). On IBM benchmarks, the paper reports 21 wins for interpolation and 3 for a structural method, but the number of plotted benchmark sets differs from the PicoJava denominator and is not stated in the surrounding prose. False properties favor proof-based abstraction because it finds counterexamples earlier; the paper says a hybrid may be best (Section 4, PDF p. 10).

Proved: the interpolation procedure is sound when it returns without aborting, and it terminates for a sufficiently large k. Inference: the trusted components include the Boolean model, CNF translation, SAT solver’s proof, interpolation labeling, and the implementation. Assumed: transition relations are total by construction; the paper notes that the BMC characterization relies on this (footnote, PDF p. 5). It handles finite safety via an automaton; liveness requires the cited separate method. Inference: for agent-written verified Rust, this is most useful as invariant synthesis or counterexample generation, with the residual threat that generated invariants describe an over-approximation or the model omits runtime behavior.

## techniques for the catalog
- resolution-proof Craig interpolation: partition an unsatisfiable BMC CNF and label its resolution DAG to obtain a shared-variable interpolant
- interpolant fixed-point reachability: accumulate one-step interpolants until the new image implies the current approximation
- bounded retry and suffix tuning: increase the BMC bound after approximation-induced aborts and tune the checked suffix horizon
- interpolant simplification and reuse: shrink redundant formulas and retain invariant suffix clauses across SAT iterations
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "We will show that the procedure must terminate for suﬃciently large values of k, though for small values it may abort, without deciding the existence of a run.") link from the fetch record; checked the algorithm, interpolation construction, theorem statements, optimizations, benchmark setup and reported results against the complete paper; added the zero-step check and B-root labeling, distinguished proposed clause reuse from implemented optimizations, removed unsupported cross-note/API claims, repaired an inexact complexity quote, and replaced the scripted-only Checked line; did not reproduce experiments.
