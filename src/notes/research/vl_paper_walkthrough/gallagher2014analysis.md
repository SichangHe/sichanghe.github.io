# Analysis and Transformation Tools for Constrained Horn Clause Verification
(authored by agents unless marked 🧑)
Tag: `gallagher2014analysis`, [paper](http://arxiv.org/abs/1405.3883v1)

## problem and pipeline

Gallagher and Kafle study whether off-the-shelf Constraint Logic Programming (CLP) analysis and semantics-preserving transformations can solve Constrained Horn Clause (CHC) verification problems. Their target is a set of Horn clauses over a background theory, with `false` as the distinguished unsafe predicate. The abstract reports: "Our aim in this work is to investigate the use of a combination of off-the-shelf techniques from the literature in analysis and transformation of Constraint Logic Programs (CLPs) to solve challenging CHC verification problems." [Abstract, PDF p.1]

A CHC set is safe when `false` is not derivable. Equivalently, if an over-approximation of the least model contains no `false` fact, safety is proved. The paper states: "It is sufficient to find a set of constrained facts M′ such that M[[P ]] ⊆ M′, where false 6∈ M′. This technique is called proof by over-approximation of the minimal model." [§2.1, PDF p.3]

The practical chain is redundant-argument filtering (RAF), forward unfolding (FU), query-answer transformation (QA), predicate splitting (PS), threshold constraints (TC), then convex-hull/polyhedron analysis (CHA), as Figure 6 shows (§4.1, PDF p.8). The components preserve the original safety query, while the abstract interpreter over-approximates the transformed least model.

## technique 1: preserve the CHC query while transforming it

Unfolding. Replace a clause containing a call `p(Y)` by one clause per definition of `p`, adding equalities between actual and formal arguments. This preserves the minimal model and therefore whether `false` is derivable (§3, PDF p.4). In the running example, the authors build a predicate dependency graph, depth-first search from `false`, identify backward edges, and unfold every call not at a backward edge (§4.1, PDF pp.6–7).

Specialisation with RAF. Specialise a program for the safety query, removing predicate arguments that do not affect the computation. For query `A`, RAF produces `P_A^raf` with `P |= A` iff `P_A^raf |= A`; in particular, safety for `false` is preserved (§3, PDF p.4). This is forward slicing: discard irrelevant state before expensive analysis.

Query-answer transformation. For query `A`, create `p_query` and `p_ans` predicates for each predicate `p`. Query predicates model calls reachable from the initial goal; answer predicates model successful answers. The transformed program satisfies `P |= A` iff `P_A^qa |= A_ans` (§3, PDF p.4). For verification, transform the goal `false`, so constraints from integrity clauses propagate through `query` and `ans` predicates.

Predicate splitting. Partition the clauses defining a predicate into mutually exclusive groups, create a fresh predicate for each group, add a dispatcher predicate, and unfold dispatcher calls. The paper's example splits `new3` on `A <= 99` versus `A >= 100`, so the analyzer maintains separate polyhedra for the disjoint cases (§3, PDF pp.4–5).

Procedure.

1. Represent the safety property as clauses with `false` in the head (§2, PDF p.2).
2. Build the predicate dependency graph and unfold forward calls until recursive/backward edges remain (§4.1, PDF p.6).
3. Apply RAF with respect to the `false` goal (§3, PDF p.4).
4. Apply query-answer transformation to expose reachable calls and answer constraints (§3–§4.1, PDF pp.4, 6–7).
5. Split predicates where clause constraints are mutually exclusive, then unfold dispatcher calls (§3–§4.1, PDF pp.4–7).

Verus form (inference). Treat the Rust program's safety obligation as a Horn-style relation over ghost state, then use specialization-like preprocessing to remove irrelevant arguments before proving invariants. Unfolding corresponds to expanding helper relations; predicate splitting corresponds to case-specific lemmas. Verus itself does not perform CHC query-answer transformation, so this would be an external VC preprocessing or proof-generation layer. This is an inference.

Evidence and limits. Each transformation has a stated minimal-model or query equivalence. Transformations can increase program size; the paper warns that query-answer transformation, splitting, and unfolding may cause blow-up and require heuristics (§6, PDF p.10).

## technique 2: convex-polyhedron abstract interpretation with thresholds

What it is. Convex-polyhedron analysis computes at most one constrained fact `p(X) <- C` per predicate, where `C` is a conjunction of linear inequalities over a convex polyhedron. It over-approximates the least model, so excluding `false` proves safety. Infinite ascending chains require widening. The paper explains: "Since the domain of convex polyhedra contains infinite increasing chains, the use of a widening operator is needed to ensure convergence of the abstract interpretation." [§3, PDF p.5]

Threshold construction. To improve widening precision, compute three iterations of the concrete immediate-consequence operator from the all-true interpretation, split each resulting conjunction into atomic constraints, and use those constraints as widening thresholds. The exact definition is `thresholds(P) = atomconstraints(T_P^3(I_top))` (§3, PDF p.5). Thresholds that are not invariants are discarded during widening.

How to apply it.

1. Set `I_top` to one `p(X) <- true` fact per predicate (§3, PDF p.5).
2. Run three concrete `T_P` iterations from `I_top` and extract each atomic constraint (§3, PDF p.5).
3. Run abstract interpretation over convex polyhedra, applying widening with the extracted thresholds (§3, PDF p.5).
4. Inspect the resulting approximate model. If no constrained fact for `false` (or `false_ans` after QA) occurs, report safe; otherwise report unknown (§4, PDF p.6).

Verus form (inference). Use linear arithmetic invariants on loops or state-machine transitions and introduce threshold candidate lemmas derived from early symbolic executions. Verus/Z3 can discharge many linear consequences, but the polyhedral widening algorithm and `false` model test would be an external analyzer. Do not call a successful over-approximation a Verus proof unless the generated invariant is actually checked by Verus.

Evidence. In the running MAP-disj example, direct polyhedral analysis of the original/intermediate programs fails, but after the full chain it produces `new3_query_1(A,B)` with `0 <= A <= 50, B = 50` and `new3_query_2(A,B)` with `51 <= A <= 100, A = B`; no `false_ans` fact appears (§4.1, PDF pp.7–8). The scaled variant changes constants from 50/49/100/101 to 5000/4999/10000/10001 and is solved in essentially the same time, unlike finite enumeration (§4.1, PDF p.8).

## technique 3: assemble and tune the tool chain

The paper's running example shows why composition matters: "Application of the convex polyhedron tool to the original, or the intermediate programs, does not solve the problem; all the transformations are needed in this case, apart from redundant argument filtering, which only affects efficiency." [§4.1, PDF p.8] The practical ordering can vary, but the authors found Figure 6's chain most effective.

Apply it to a benchmark set as follows.

1. Translate imperative or other source models to CHCs (§1, PDF p.1; §5, PDF p.8).
2. Run RAF, FU, QA, PS, threshold generation, and CHA (§5, PDF p.8).
3. Preserve a safe result only when the final over-approximation excludes `false`; retain `unknown` for an over-approximation that includes it (§4–§5, PDF pp.6, 8–9).
4. Record unsupported numerical ranges and structures rather than silently treating them as safe. The implementation's Ciao Prolog uses 32-bit numbers; entries marked `*` exceed that limit, and `**` require ad hoc chain changes (§5, PDF p.9).
5. Choose transformation order and heuristics per benchmark; the paper proposes lazy/implicit transformed programs and fixpoint engines to control blow-up (§6, PDF p.10).

Verus form (inference). For VL, use the chain as a proof-obligation scheduler: specialize generated Rust specs, split disjoint cases, infer candidate linear invariants, then feed explicit lemmas and `invariant` clauses to Verus. The chain can reduce solver load but does not replace Verus's checked proof. This is an inference.

Evidence. Table 1 contains 32 benchmarks: 25 marked verified, 7 marked NOT; two verified rows (`amebsa.smt2`, `DAGGER-barbr.map.c`) are marked as solvable by a simple ad hoc modification, while three NOT rows are marked 32-bit overflows and the others fail to derive needed invariants (§5, PDF p.9). The authors report no timings: "We do not report timings, though all these results are obtained in a matter of seconds, since our tool-chain is not at all optimised, relying on file input-output and the individual components are often prototypes." [§5, PDF p.9]

## what is proved, trusted, and incomplete

The mathematical result proved by the chain is conditional safety: semantics-preserving transformations preserve the `false` query, and convex-polyhedron analysis over-approximates the least model. A `false`-free abstract model therefore establishes that the original CHC set has a model and that the integrity constraints are unreachable. The work does not prove completeness: an abstract model containing `false` returns unknown even when the program is safe.

The trusted base includes CHC translation, each transformation's correctness, the abstract interpreter and widening implementation, the background linear-arithmetic theory, and the assumption that numerical limits or prototype failures are reported correctly. The benchmark denominator is 32 programs, with 25 verified and 7 NOT in Table 1; the paper gives no per-program timing denominator beyond “a matter of seconds.”

Inference: For agent-written verified Rust, the threat is indirect but substantial when an inferred invariant over-approximates the wrong state relation or when a transformation drops a dependency. VL should not redo generic CHC transformations, query-answer logic, or convex-polyhedron abstract interpretation as if new. A Verus integration could instead reuse these as candidate-invariant and obligation-prioritization components, then require Verus to check the final executable code and contracts.

## techniques for the catalog

- CHC-preserving unfolding: replace predicate calls with definitions while preserving the minimal model and safety query
- query-directed specialization: use RAF to remove irrelevant arguments and query-answer predicates to propagate reachability constraints
- predicate splitting: separate mutually exclusive clauses so each case gets a precise abstract polyhedron
- thresholded polyhedral analysis: compute widening thresholds from three concrete iterations and exclude `false` from the over-approximation
- compositional CHC tool chain: order transformations and analysis, reporting safe versus unknown with explicit numerical limits
Checked 2026-10-14 against the paper by a Codex agent: audit record gallagher2014analysis; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
