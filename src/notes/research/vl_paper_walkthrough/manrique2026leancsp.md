# LeanCSP: A Framework for Certifying Constraint Reformulation and Solving in Lean
(authored by agents unless marked 🧑)
Tag: `manrique2026leancsp`, [paper](http://arxiv.org/abs/2607.28459v1)

## scope and result

LeanCSP verifies two separate parts of a constraint-programming workflow: that a reformulation preserves the intended problem, and that an external solver's answer is correct for one instance. Its abstract states that it proves “formulation-level properties, such as equivalence, equisatisfiability, and the correctness of symmetry-breaking constraints, parametrically for entire problem families” and checks solver certificates for individual instances (Abstract, p. 1). The paper combines the two layers: prove equisatisfiability of the original CSP with an optimized formulation once, solve the optimized formulation externally, and check the result inside Lean (Section 1, p. 3).

The authors say, “The external solvers are outside the trusted Lean base: every certificate produced is checked back against the original problem inside Lean, so any possible errors or bugs in the solvers cannot produce a false guarantee, only a check that fails.” (Figure 1, p. 2.) The framework formalizes CSPs with dependent types, a library of more than 40 constraints, and translation backends for MiniZinc, SMT-LIB, and OPB (Section 1, pp. 2–3). The paper's applications include the Schur number S(4) = 44, R(3, 3) ≤ 6, and W(2, 3) ≤ 9 (Section 1, p. 3), and its experiments cover upper bounds for Schur, Ramsey, and van der Waerden numbers (Section 4, p. 10). The authors report a maximum search reduction of 2 × 10^7 for one symmetry-breaking constraint and in-Lean certification within a few minutes for their largest instances (Abstract, p. 1). These are results for the listed families and hardware, not a claim about all constraint problems.

## technique: define CSPs, equivalence, and equisatisfiability in Lean

what it is and when to use it

Make the CSP itself a formal object before translating it to a solver format. Use equivalence when a reformulation preserves all solutions through an explicit map; use equisatisfiability when only the existence of a solution matters. This prevents a fast encoding from silently becoming a different specification.

how to do it

1. Define variables by a type `VarIndex`, give each variable a dependent domain `DomainType : VarIndex → Type`, and represent the CSP as a list of dynamic constraints. A constraint stores a vector of variables (`scope`) and a Boolean checker over their dependent values (Section 2, pp. 3–4).
2. Define an assignment as a dependent function from variables to domain values, a solution as an assignment satisfying every constraint, and satisfiability as existence of a solution (Section 2, p. 4).
3. Define equivalence as a bijection between solution sets. The paper warns that this alone is uninformative for unsatisfiable problems because two empty sets are trivially in bijection (Section 2, p. 4).
4. Instead, prove `π`-equivalence: every solution of the reformulated CSP maps to a solution of the original, every original solution has a preimage, and the map is injective on solutions (Section 2, pp. 4–5).
5. Prove the characterization theorem connecting `π`-equivalence and equivalence; it assumes the assignment type of the original CSP is non-empty (Section 2, p. 5). The paper's Schur example maps a one-hot Boolean formulation back to the color assignment and proves the relation parametrically for all `n` and `k` (Example 2, p. 5).
6. Define equisatisfiability as both CSPs being satisfiable or both unsatisfiable. Use it when a symmetry-breaking constraint changes the solution set but preserves existence (Section 2, p. 5).

Verus form

Inference: In Verus, the analogous data model can use a `spec` map or sequence for variables and a predicate for constraint satisfaction. State a projection as a `spec fn`; prove its preservation, surjectivity-on-solutions, and injectivity properties with proof functions and `ensures`. Use `requires` for domain assumptions and `invariant` for loops over constraints. Verus has no Lean dependent-type library or theorem elaborator, so the concrete encodings and automation do not carry over.

evidence and limits

LeanCSP's Table 1 reports 6,183 lines for equivalence proofs and 2,349 for non-value-precedence symmetry-breaking proofs across the listed families; the generic value-precedence proof is 149 lines, reused through per-family glue (Table 1, p. 7). The proof effort is substantial, but each parametric theorem covers every instance size in its family (Section 2, p. 6). The framework assumes that the formal CSP is the specification; it does not independently prove that the CSP captures an external informal requirement.

## technique: prove symmetry-breaking constraints parametrically

what it is and when to use it

A symmetry is a variable or domain permutation preserving solutions. A symmetry-breaking constraint (SBC) selects representatives while preserving satisfiability. Prove the symmetry and the coverage condition once for a parameterized family, then reuse it for every instance.

how to do it

1. Define a variable symmetry as a bijection on variable indices that maps every solution to a solution. Define a domain symmetry as a dependent family of permutations, one for each variable (Section 2, pp. 5–6).
2. Define an SBC so that for every original solution there exists a valid symmetry whose transformed assignment satisfies the added constraint. The paper's Lean definition says: for every solution of the original CSP, there exists a domain-permutation family that is a domain symmetry and whose application to the solution is a solution of the extended CSP; the variable case is analogous (Section 2, p. 6).
3. Prove that adding the SBC preserves satisfiability by applying the selected symmetry to each solution (Section 2, p. 6).
4. For interchangeable values, prove value precedence: values first appear in a fixed order, retaining one representative from each permutation class. Prove the generic constraint once, then supply short family-specific lemmas that expose the relevant value symmetry (Section 2, p. 6).
5. Reject an SBC if either the claimed symmetry or the representative-coverage property cannot be proved. The paper's reversal candidate for the ordinary Schur problem with `k = 3` colors stays satisfiable for all `n ≤ 12` but deletes all solutions at `n = 13`; the framework refuses it because neither required fact can be proved (Section 3, pp. 8–9).

Verus form

Inference: A Verus version would define a permutation as a `spec fn` over an abstract assignment and prove preservation with `ensures`. The SBC obligation can be a proof function that, for each satisfying assignment, returns a witness permutation and proves the extended postcondition. Keep the permutation and assignment as ghost/specification data; executable Rust need only implement the chosen encoding. Verus's `spec fn`, `requires`, `ensures`, and proof functions are the closest constructs, but the paper's dependent `DomainEquivFamily` API is Lean-specific.

evidence and limits

The cautionary Schur example is a concrete failure mode. Reversal is not a symmetry already at `n = 3`; the paper gives `[0, 1, 1]` reversing to `[1, 1, 0]`, which violates the Schur triple constraint (Section 3, p. 8). At `n = 13`, reversal happens to be a symmetry but cannot map any palindrome to a strict lexicographic leader, so all solutions are deleted (Section 3, pp. 8–9). This shows why tests on small instances do not replace a family-level theorem.

## technique: certify external solver results through a checked intermediate model

what it is and when to use it

Translate a formal CSP to an external solver, but import its SAT witness or UNSAT certificate into Lean and check it against the original formal object. Use the pseudo-Boolean path for unsatisfiability when the CSP constraints have verified translations to a PB model.

how to do it

1. Restrict the translation backend to finite variable types, integer values, and constraints from the verified library (Section 3, p. 7).
2. For MiniZinc and SMT-LIB, instantiate each constraint's serializer. The serializers are outside the trusted base (Section 3, p. 7).
3. For OPB, define a CSP-to-PB model in Lean and prove: if the CSP is satisfiable, the PB model is satisfiable. This translation-soundness theorem lets a PB refutation imply CSP unsatisfiability (Section 3, p. 7).
4. Run an external solver. Import a SAT assignment and check every original CSP constraint in Lean, or import a VeriPB UNSAT proof and check it with PBLean against the in-Lean PB model (Section 3, pp. 7–8).
5. Treat a failed check as no result. A bad serializer, solver, or certificate cannot pass the Lean check. The paper states, “A successful check yields an end-to-end (un)satisfiability result inside Lean, so a faulty translation or an incorrect certificate can only make the check fail, never certify a wrong answer.” (Section 3, pp. 7–8.)
6. For Schur `S(4) = 44`, check a SAT witness at `n = 44`, a VeriPB refutation at `n = 45`, and transfer both results through the proved equisatisfiability of the value-precedence formulation (Example 4, p. 8).

Verus form

Inference: In Verus, define a pure specification for the CSP and prove that a serialized or encoded model implies the original constraints. Use `ensures` on a checker function and proof functions for the encoding theorem; use `assert` for each decoded constraint. Verus can verify the checker logic, but external solver binaries, serialization, and certificates remain trusted unless a separate proof-certificate checker is modeled and verified. Keep any external boundary in a specification with explicit assumptions, and leave the checker body subject to verification.

trusted components and limits

Lean's trusted base includes the Lean kernel and compiler. PBLean is proved sound but run by reflection, adding `Lean.ofReduceBool` and `Lean.trustCompiler` to the trusted boundary; the OPB serialization is outside it (Section 3, p. 8). The CSP itself is trusted as the mathematical specification. Thus a proof can establish the formal CSP while the formal CSP still misstates the intended system. Inference: an agent-written verified Rust product has the same specification risk even when its proof checker is sound.

## technique: choose proof backends by proof shape, then measure verification cost

The paper compares pseudo-Boolean and SAT certificates on unsatisfiable families. RoundingSat emits VeriPB proofs checked by VeriPB; CaDiCaL emits DRAT proofs checked by drat-trim (Section 4, p. 9). Cutting-plane proofs stay near-constant for pigeonhole and mutilated chessboard while DRAT grows exponentially; odd-cycle proofs scale linearly for both. The authors write that these observations “motivated our choice, rather than dictated it” and add that the SAT route is “a perfectly feasible alternative” left for future work (Section 4, pp. 9–10).

The end-to-end experiment uses ten unsatisfiable families, AMD Ryzen 5 PRO 8540U, 32 GB, 600-second per invocation, and median wall times over three runs (Section 4, p. 9). Table 2 reports deterministic operation counts, wall speedups, geometric-mean speedups, native PBLean checking, and full in-Lean checking for the largest instances and ranges (Table 2, p. 10). Value precedence gives up to 19,863,281× deterministic speedup on clique `K15` and 303× on `M4`; the paper's abstract rounds the former to 2 × 10^7 (Table 2, p. 10; Abstract, p. 1). The paper says the gain disappears when the solver needs no search, as in pigeonhole and mutilated chessboard, and when the constraint breaks only a small part of the symmetries, as with matching transposition (Section 4, pp. 10–11). Value precedence slows pigeonhole (speedup 0.062 deterministic). Certifying the largest instance with SBCs “stays under two minutes throughout” (Section 4, p. 11).

## product relevance, trusted facts, and existing work

LeanCSP takes the formal CSP as the specification (Section 3, p. 8); it does not prove that the CSP matches an informal requirement, and external solvers are checked per instance rather than proved correct.

## techniques for the catalog

- parametric CSP semantics: define dependent variables, domains, constraints, assignments, solutions, equivalence, and equisatisfiability
- projection-based reformulation proofs: prove preservation, preimage, and injectivity for an explicit assignment map
- symmetry-breaking certification: prove a permutation preserves solutions and reaches the added representative constraint
- certificate checking pipeline: recheck SAT assignments or UNSAT proof certificates inside the trusted theorem prover
- verified intermediate translation: prove CSP-to-PB satisfiability preservation before accepting external PB refutations
- proof-backend selection: compare certificate systems by proof growth, solver effort, and checker cost
