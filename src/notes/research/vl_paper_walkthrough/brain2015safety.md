# Safety Verification and Refutation by k-invariants and k-induction (extended version)
(authored by agents unless marked 🧑)
Tag: `brain2015safety`, [paper](http://arxiv.org/abs/1506.05671v2)
## what the paper establishes

The paper presents kIkI, a single algorithm that combines bounded model checking, k-induction, and abstract interpretation for finite-state software transition systems. Its central claim is: “This paper presents a single, unified algorithm kIkI, which strictly generalises abstract interpretation, bounded model checking and k-induction.” (Abstract, p. 1). A program is represented by `Start(x)` and `Trans(x,x')`; an inductive invariant `Inv` must satisfy `Inv(x0) ∧ Trans(x0,x1) ⇒ Inv(x1)` (Section 2.1, eq. (1), p. 3). The paper restricts attention to finite state systems (Section 2, p. 2). Techniques for proving safety compute an inductive invariant that is disjoint from the error set `Err(x)` (Section 2.1, p. 3).

The method is both a proof and a refutation procedure. It searches for a k-inductive invariant covering initial states and error-free earlier states. If the resulting candidate permits an error, it checks whether that error is reachable in k steps; a reachable error is a concrete counterexample, while an unreachable one causes k to increase and the search to strengthen. Theorem 1 states: “When kIkI terminates it gives either a k-inductive invariant sufficient to show safety or a length k counterexample.” (Theorem 1, Section 2.3, p. 6). The theorem is conditional on termination; the paper does not claim that kIkI always terminates.

## technique 1: combine bounded refutation, k-induction, and invariant inference

What it is: Incremental bounded model checking (IBMC) searches executions up to a bound; k-induction checks a k-step induction condition; abstract interpretation computes an over-approximating inductive invariant. kIkI places these checks in one loop so that each can constrain the others.

How to apply it, following Section 2.3 and Figure 1 (pp. 5–6):

1. Set `k = 1` and choose a predicate template set `T` containing top (`⊤`). First test `Start(x0) ∧ Err(x0)` for an initial error.
2. Find `KInv ∈ T` such that initial states and the first k error-free states imply the candidate, and the candidate is preserved through k transitions. The paper writes the search as `Start(x0) ∧ P[k] ∧ T[k] ⇒ I[k]` and `P[k] ∧ I[k] ∧ T[k] ⇒ KInv(xk)`.
3. Check whether `KInv` excludes `Err`, by testing `P[k] ∧ I[k+1] ∧ T[k] ∧ Err(xk)` (Figure 1, p. 6). If this check is unsatisfiable, return safe.
4. If an error is possible under the candidate, check `Start(x0) ∧ P[k] ∧ I[k+1] ∧ T[k] ∧ Err(xk)`. A satisfying model is a length-k counterexample.
5. If the candidate permits only a spurious error, increment k and repeat. Larger unrollings and the assumption that prior states are error-free can produce a stronger invariant.

The interaction is the contribution: “stronger invariants help k-induction to successfully prove properties more often; and constraining the state space by invariants ultimately accelerates the countermodel search in BMC.” (Section 2.3, p. 7). The paper says kIkI “can simulate k-induction by having T = {⊤} and incremental BMC by over-approximating the first SAT check”, and simulates abstract interpretation “by having T = A and terminating with the result “unknown” if the first SAT check finds a model” (Section 2.3, p. 6; here T is the template set and A the abstract domain).

Verus form: Inference: model the executable Rust state with a `struct`, write a `spec fn` for `Start`, `Trans`, and `Err`, and state transition preservation in a proof function or lemma. Use `requires` and `ensures` on executable functions and `invariant` clauses on loops; do not treat `invariant` as a call. Inference: Verus can check a chosen invariant but, to my knowledge (not checked here), does not provide kIkI's automatic alternation of bounded SAT, induction, and abstract interpretation. Inference: an external driver could run bounded symbolic checks, propose a k-indexed invariant, and ask Verus to prove the preservation and error-exclusion obligations.

Evidence and limits: On 143 SV-COMP’15 loop benchmarks, under 13 GB of memory and 900 seconds of CPU time per run, the paper says “kIkI solves 62.9% of the benchmarks, proving 3 more properties than k-induction” (Section 5.1, p. 13; Table 1, p. 13). Table 1 records for kIkI 38 counterexamples, 52 proofs, 0 false proofs, 2 false alarms, 0 inconclusive, 51 timeouts and 0 memory-outs; these rows sum to 143. Inference: 38 + 52 = 90 of 143 is 62.9%, so the percentage counts only conclusive correct results. Section 5.2 also says “kIkI is up to one order of magnitude slower on many unsafe benchmarks” than the portfolio (p. 14). Inference: the percentage is a benchmark fraction, not a probability of correctness for arbitrary Rust.

## technique 2: SSA with loop havoc, guards, and incremental unwinding

What it is: The implementation converts C programs into acyclic single-static-assignment (SSA) formulas. A loop is cut at the body end; its feedback value is initially free, which over-approximates traces. A Boolean guard joins the pre-loop and feedback values. Loop invariants constrain the free feedback variable, and repeated SSA bodies implement incremental unwinding.

How it is done (Section 3.1, pp. 7–9):

1. Convert acyclic code to SSA, where each assignment has a fresh version and the formula represents the strongest postcondition.
2. At a loop head, introduce a feedback variable for the loop-body poststate and a nondeterministic Boolean guard to choose the initial or feedback value.
3. Leave the feedback variable free; the paper says “It is easy to see that this representation “havocs” loops because x#lb1 is a free variable – this is why its models are an over-approximation of actual program traces.” (Section 3.1, p. 8).
4. Infer an invariant that holds at loop entry and body exit, then assume it for the feedback variable.
5. Unroll the body by repeating its SSA conversion. Merge loop exits with reachability guards; mark not-yet-added unwinding cases false so that the formula grows monotonically.

Verus form: Inference: represent the loop state in Rust and put the discovered relation in a loop `invariant` clause. Verus loop invariants are checked at each iteration rather than encoded as a free SSA feedback variable; the guard and merge facts become Boolean or arithmetic invariant conjuncts. Inference: this mapping preserves the proof obligation, but Verus does not automatically perform the paper's over-approximate SSA conversion.

Evidence: Figure 2's worked `while (x<10) ++x` encoding (p. 7) shows guard variables and SSA versions; the authors say precision “can be improved by constraining the feedback variable x#lb1 by means of a loop invariant which we are going to infer” (Section 3.1, p. 8). A fuller example is in Appendix A (pp. 18–21). The implementation uses one solver instance while constraints and unwindings are added incrementally, which the authors call essential “because kIkI makes thousands of solver calls for invariant inference and property checks” (Section 4, p. 12).

## technique 3: solver-based k-invariant inference from guarded templates

What it is: Rather than solve existential second-order logic directly, kIkI fixes a template `T(x,δ)` and searches for parameter values δ. This is analogous to selecting an abstract domain. The paper uses template polyhedra, including intervals, zones, and octagons, over bit-vector variables; SSA guards turn each template row on only where its variables are defined.

Procedure (Sections 3.2–3.4, pp. 9–12):

1. Choose a base template, such as interval rows `x ≤ δ1` and `−x ≤ δ2`, and attach the conjunction of SSA definition guards to each row.
2. Replace the existential invariant by an existential search over δ. For a trial constant vector d, ask the solver for a counterexample to inductiveness: `T[k](d) ∧ T[k] ∧ ¬T'(xk,d)`.
3. Start at `d = ⊥`. If the formula is unsatisfiable, d is an invariant. The well-known model-enumeration method joins the returned model into d and repeats, which is a classical Kleene iteration; the paper rejects it because the lattice height is enormous (for a one-loop program incrementing an unconstrained 64-bit integer it will not terminate within a human lifetime).
4. Instead, if the check is satisfiable, take the template rows R whose values are not yet inductive and build the constraint system (14) with fresh parameters δr. Binary-search the optimal value of the sum of the δr. The lower bound ℓ is the sum of the values d'r of er(xk) in the model of the inductivity check (13); the upper bound u is the sum over R of the maximum value er(xk) may have, depending on variable type. Because the domains are finite bit-vectors, binary search replaces the LP solver of strategy iteration.
5. The δr values of the last satisfiable query become the new d. Test d for inductiveness (13) and repeat until it is inductive. The paper notes this “potentially requires a higher number of iterations than strategy iteration”, a deliberate choice “to keep the size of the generated SMT formulas small”.

The search loop is stated as: “If satisfiable, set ℓ := m, otherwise set u := m and repeat until ℓ = u.” (Section 3.4, p. 12), where m is the median of ℓ and u. The strategy-iteration-inspired method “can only be used if the domain is convex and the parameter values are ordered and monotonic w.r.t. concretisation” (Section 3.4, p. 11).

Verus form: Inference: use a `spec fn` predicate parameterized by ghost bounds and prove it with arithmetic lemmas; instantiate concrete bounds rather than attempting second-order inference inside Verus. A Rust loop's `invariant` can contain the interval or relation. Bit-vector overflow behavior must match the paper's promoted bit-vector encoding; ordinary Rust integer arithmetic and Verus mathematical integers are not automatically equivalent, so casts and range lemmas are required. Inference: an external SMT-based synthesizer can propose bounds, after which Verus checks the final invariant.

Evidence and limits: the authors implement generic template matrices but report that “very simple matrices A generating interval invariants are sufficient to compete with other state-of-the-art tools” (Section 4, p. 12). The tool handles unrestricted sequential C except programs with irreducible control flow, but “currently, invariants are not inferred over array contents or dynamically allocated data structures.” (Section 4, p. 12). Inference: this is a direct limitation for Rust heap-heavy code.

## what is proved, measured, and trusted

The formal result is Theorem 1 (Section 2.3, pp. 6–7): when kIkI terminates it gives a sufficient k-inductive invariant or a length-k counterexample, and each of IBMC, k-induction and abstract interpretation (with A ⊆ T) is matched. The paper says the simulations “give an intuition for the proof” (p. 6) and this text of the paper contains no proof, so the theorem is stated, not proved, here. The implementation evidence is the 143-benchmark experiment. It used 2LS version 0.2 with MiniSAT-2.2.0, Fedora 20, an Intel Xeon X5667 at 3 GHz, and 13 GB/900-second limits (Section 4 footnote 4 and beginning of Section 5, pp. 12–13). Table 1 reports kIkI total runtime 13.2 hours, versus 13.8 for k-induction, 17.1 for IBMC, and 0.89 for abstract interpretation; comparator tools had different false-proof counts, including 2 for CPAchecker and 12 for ESBMC (Table 1, p. 13). These are run outcomes, not proof denominators beyond the stated 143 benchmarks. The solver, C-to-SSA translation, template choice, bit-vector semantics, and implementation soundness are trusted assumptions; Table 1 reports two kIkI false alarms, which the paper attributes to “limited support for dynamic memory allocation” (footnote 8, p. 14). Table 1 also lists a soundness-bug row count of 0 false proofs for kIkI.

Inference: for VL, the transferable idea is a single feedback loop in which bounded counterexamples constrain invariant synthesis and invariants accelerate proof search. The product threat is specification and modeling error: Verus can prove the supplied invariant while a missing `Err` predicate, incorrect transition model, unsupported dependency, or `external_body` boundary leaves behavior trusted. Existing Verus notes already cover loop invariants, contracts, and solver-backed lemmas; VL should reuse those constructs and focus on integrating counterexample-guided invariant proposals rather than redoing basic k-induction.

## techniques for the catalog

- unified kIkI search — alternate k-inductive invariant synthesis, error reachability checks, and increasing unwinding so proofs and counterexamples reinforce one another
- guarded SSA unwinding — encode loops with guarded feedback variables, then constrain havoc with inferred invariants and incrementally merge unwound exits
- template-based invariant synthesis — reduce second-order invariant search to SMT checks over guarded template parameters and accelerate bound discovery with binary search
- solver-backed refutation — use satisfiable error formulas as concrete length-k counterexamples and unsatisfiable formulas as proof evidence under the transition model
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Since we deal with finite domains (bit-vectors) we can use binary search as optimisation method instead of an LP solver."): read the whole paper text (arXiv v2, 23 PDF pages, including Appendices A and B); checked every quotation, the Table 1 numbers (counts, percentages, run times, false-proof rows), the algorithm steps against Section 2.3 and Figure 1, the SSA and template steps against Sections 3.1-3.4, and the implementation facts in Sections 4 and 5; changed all page numbers to arXiv PDF pages, replaced the claim that Theorem 1 is a proved termination result with its conditional wording (no proof in the paper text), corrected the template-inference steps (the model-join loop is the rejected naive method; bounds of the binary search), replaced a quote that skipped words with a contiguous one, attributed the 62.9% and false-alarm statements to the right places, and marked the Verus-capability statement as inference; did not check the Verus statements, the claim about existing VL notes, the cited related work, Table 2, Figure 4 scatter plots, or the PDF figures beyond their text.
