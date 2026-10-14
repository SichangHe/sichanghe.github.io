# Safety Verification and Refutation by k-invariants and k-induction (extended version)
(authored by agents unless marked 🧑)
Tag: `brain2015safety`, [paper](http://arxiv.org/abs/1506.05671v2)
## what the paper establishes

The paper presents kIkI, a single algorithm that combines bounded model checking, k-induction, and abstract interpretation for finite-state software transition systems. Its central claim is: “This paper presents a single, unified algorithm kIkI, which strictly generalises abstract interpretation, bounded model checking and k-induction.” (Abstract, p. 1). A program is represented by `Start(x)` and `Trans(x,x')`; an inductive invariant `Inv` must satisfy `Inv(x0) ∧ Trans(x0,x1) ⇒ Inv(x1)` (Section 2.1, p. 2). Safety means that the invariant excludes `Err(x)`.

The method is both a proof and a refutation procedure. It searches for a k-inductive invariant covering initial states and error-free earlier states. If the resulting candidate permits an error, it checks whether that error is reachable in k steps; a reachable error is a concrete counterexample, while an unreachable one causes k to increase and the search to strengthen. The authors summarize the termination result: “When kIkI terminates it gives either a k-inductive invariant sufficient to show safety or a length k counterexample.” (Theorem 1, Section 2.3, p. 5).

## technique 1: combine bounded refutation, k-induction, and invariant inference

What it is: Incremental bounded model checking (IBMC) searches executions up to a bound; k-induction checks a k-step induction condition; abstract interpretation computes an over-approximating inductive invariant. kIkI places these checks in one loop so that each can constrain the others.

How to apply it, following Section 2.3 (pp. 4–5):

1. Set `k = 1` and choose a predicate template set `T` containing top (`⊤`). First test `Start(x0) ∧ Err(x0)` for an initial error.
2. Find `KInv ∈ T` such that initial states and the first k error-free states imply the candidate, and the candidate is preserved through k transitions. The paper writes the search as `Start(x0) ∧ P[k] ∧ T[k] ⇒ I[k]` and `P[k] ∧ I[k] ∧ T[k] ⇒ KInv(xk)`.
3. Check whether `KInv` excludes `Err`. If this check is unsatisfiable, return safe.
4. If an error is possible under the candidate, check `Start(x0) ∧ P[k] ∧ I[k+1] ∧ T[k] ∧ Err(xk)`. A satisfying model is a length-k counterexample.
5. If the candidate permits only a spurious error, increment k and repeat. Larger unrollings and the assumption that prior states are error-free can produce a stronger invariant.

The interaction is the contribution: “stronger invariants help k-induction to successfully prove properties more often; and constraining the state space by invariants ultimately accelerates the countermodel search in BMC.” (Section 2.3, p. 5). The algorithm can simulate k-induction by `T={⊤}`, IBMC by over-approximating its first SAT check, and abstract interpretation by `T=A` and returning unknown when the first SAT check finds a model (Section 2.3, p. 5).

Verus form: Inference: model the executable Rust state with a `struct`, write a `spec fn` for `Start`, `Trans`, and `Err`, and state transition preservation in a proof function or lemma. Use `requires` and `ensures` on executable functions and `invariant` clauses on loops; do not treat `invariant` as a call. Verus can check a chosen invariant but does not provide kIkI's automatic alternation of bounded SAT, induction, and abstract interpretation. Inference: an external driver could run bounded symbolic checks, propose a k-indexed invariant, and ask Verus to prove the preservation and error-exclusion obligations.

Evidence and limits: On 143 SV-COMP’15 loop benchmarks, under 13 GB and 900 seconds per run, kIkI solved 62.9% (the paper says this is 52 proofs plus 38 counterexamples out of 143) and proved three more properties than k-induction (Section 5.1, Table 1, p. 8). Table 1 records 38 counterexamples, 52 proofs, 51 timeouts, and no memory-outs for kIkI; the rows sum to 143. Inference: the percentage is a benchmark fraction, not a probability of correctness for arbitrary Rust.

## technique 2: SSA with loop havoc, guards, and incremental unwinding

What it is: The implementation converts C programs into acyclic single-static-assignment (SSA) formulas. A loop is cut at the body end; its feedback value is initially free, which over-approximates traces. A Boolean guard joins the pre-loop and feedback values. Loop invariants constrain the free feedback variable, and repeated SSA bodies implement incremental unwinding.

How it is done (Section 3.1, pp. 6–7):

1. Convert acyclic code to SSA, where each assignment has a fresh version and the formula represents the strongest postcondition.
2. At a loop head, introduce a feedback variable for the loop-body poststate and a nondeterministic Boolean guard to choose the initial or feedback value.
3. Leave the feedback variable free to obtain a sound over-approximation (“it is easy to see that this representation ‘havocs’ loops because x#lb1 is a free variable”).
4. Infer an invariant that holds at loop entry and body exit, then assume it for the feedback variable.
5. Unroll the body by repeating its SSA conversion. Merge loop exits with reachability guards; mark not-yet-added unwinding cases false so that the formula grows monotonically.

Verus form: Inference: represent the loop state in Rust and put the discovered relation in a loop `invariant` clause. Verus loop invariants are checked at each iteration rather than encoded as a free SSA feedback variable; the guard and merge facts become Boolean or arithmetic invariant conjuncts. Inference: this mapping preserves the proof obligation, but Verus does not automatically perform the paper's over-approximate SSA conversion.

Evidence: Figure 2's worked `while (x<10) ++x` encoding shows guard variables and SSA versions; the authors explain that invariant constraints increase precision (Section 3.1, pp. 6–7). The implementation uses one solver instance while constraints and unwindings are added incrementally, which the authors call essential because invariant inference makes thousands of solver calls (Section 4, p. 8).

## technique 3: solver-based k-invariant inference from guarded templates

What it is: Rather than solve existential second-order logic directly, kIkI fixes a template `T(x,δ)` and searches for parameter values δ. This is analogous to selecting an abstract domain. The paper uses template polyhedra, including intervals, zones, and octagons, over bit-vector variables; SSA guards turn each template row on only where its variables are defined.

Procedure (Sections 3.2–3.3, pp. 7–8):

1. Choose a base template, such as interval rows `x ≤ δ1` and `−x ≤ δ2`, and attach the conjunction of SSA definition guards to each row.
2. Replace the existential invariant by an existential search over δ. For a trial constant vector d, ask the solver for a counterexample to inductiveness: `T[k](d) ∧ T[k] ∧ ¬T'(xk,d)`.
3. Start at `⊥`. If the formula is unsatisfiable, d is an invariant; if satisfiable, join the returned model into the current abstract value and continue.
4. Avoid naïve Kleene iteration, whose lattice height can be enormous. For non-inductive rows, build the paper's constraint system and binary-search the sum of row bounds. The lower bound is the model's current row values; the upper bound is the type maximum.
5. Test the resulting d for inductiveness and repeat until the template is inductive.

The optimization is explicit: “The binary search is performed by iteratively checking (14) for satisfiability under the assumption … until ℓ = u.” (Section 3.4, p. 9). Bit-vector finite domains make binary search applicable, while monotone convex template domains justify the strategy-iteration-inspired optimization (Section 3.4, pp. 8–9).

Verus form: Inference: use a `spec fn` predicate parameterized by ghost bounds and prove it with arithmetic lemmas; instantiate concrete bounds rather than attempting second-order inference inside Verus. A Rust loop's `invariant` can contain the interval or relation. Bit-vector overflow behavior must match the paper's promoted bit-vector encoding; ordinary Rust integer arithmetic and Verus mathematical integers are not automatically equivalent, so casts and range lemmas are required. Inference: an external SMT-based synthesizer can propose bounds, after which Verus checks the final invariant.

Evidence and limits: the authors implement generic template matrices but report that simple interval matrices were sufficient to compete with state-of-the-art tools (Section 4, p. 8). The tool handles unrestricted sequential C except irreducible control flow, but “currently, invariants are not inferred over array contents or dynamically allocated data structures.” (Section 4, p. 8). Inference: this is a direct limitation for Rust heap-heavy code.

## what is proved, measured, and trusted

The formal results prove simulation relationships: kIkI terminates with either a sufficient k-inductive invariant or a length-k counterexample, and it subsumes the three restricted algorithms under the stated template choices (Theorem 1, Section 2.3). The implementation evidence is the 143-benchmark experiment. It used 2LS version 0.2 with MiniSAT-2.2.0, Fedora 20, an Intel Xeon X5667 at 3 GHz, and 13 GB/900-second limits (Section 4 and beginning of Section 5, pp. 8–9). Table 1 reports kIkI total runtime 13.2 hours, versus 13.8 for k-induction, 17.1 for IBMC, and 0.89 for abstract interpretation; comparator tools had different false-proof counts, including 2 for CPAchecker and 12 for ESBMC (Table 1, p. 9). These are run outcomes, not proof denominators beyond the stated 143 benchmarks. The solver, C-to-SSA translation, template choice, bit-vector semantics, and implementation soundness are trusted assumptions; the table itself reports two kIkI false alarms caused by limited dynamic-memory support.

Inference: for VL, the transferable idea is a single feedback loop in which bounded counterexamples constrain invariant synthesis and invariants accelerate proof search. The product threat is specification and modeling error: Verus can prove the supplied invariant while a missing `Err` predicate, incorrect transition model, unsupported dependency, or `external_body` boundary leaves behavior trusted. Existing Verus notes already cover loop invariants, contracts, and solver-backed lemmas; VL should reuse those constructs and focus on integrating counterexample-guided invariant proposals rather than redoing basic k-induction.

## techniques for the catalog

- unified kIkI search — alternate k-inductive invariant synthesis, error reachability checks, and increasing unwinding so proofs and counterexamples reinforce one another
- guarded SSA unwinding — encode loops with guarded feedback variables, then constrain havoc with inferred invariants and incrementally merge unwound exits
- template-based invariant synthesis — reduce second-order invariant search to SMT checks over guarded template parameters and accelerate bound discovery with binary search
- solver-backed refutation — use satisfiable error formulas as concrete length-k counterexamples and unsatisfiable formulas as proof evidence under the transition model
Checked 2026-10-13: audit record brain2015safety; paper-study comparison complete; gate executed; experiments not rerun
