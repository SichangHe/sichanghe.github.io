# Craig Interpolation in Program Verification
(authored by agents unless marked 🧑)
Tag: `rümmer2026craig`, [paper](http://arxiv.org/abs/2602.08532v1)

## contribution and scope

This chapter surveys Craig interpolation as an automation method for loop invariants, abstractions, SAT/SMT model checking, CEGAR, and constrained Horn clauses (CHCs). Its central claim is practical: “Craig interpolation is used in program verification for automating key tasks such as the inference of loop invariants and the computation of program abstractions” (abstract, PDF p.1). It is a tutorial chapter, not a new benchmark. The worked Fibonacci examples provide directly reusable algorithms.

## technique 1: derive an invariant from an unwound path

What it is: turn a bounded, loop-free execution into an implication `A → C`; compute a Craig interpolant using only symbols shared by the prefix `A` and suffix `C`; rename those symbols back to program variables. An interpolant `I` satisfies `A |= I` and `I |= C` (definition 2, PDF p.9). The shared-symbol restriction makes `I` an assertion at the cut point.

Paper’s Fibonacci procedure (sections 1.1, PDF pp.3–6):

1. State precondition `n >= 0`, initialize `a=0,b=1,i=0`, and unroll the loop twice, encoding loop guards with `assume` (Fig. 2a).
2. Place an intermediate assertion `K` at a cut between iterations.
3. Translate assignments into SSA-style symbols (`a0,a1,a2`, etc.) and form a verification condition. The prefix is `A`; the suffix, including `a2 >= 0`, is `C` (Fig. 3).
4. Ask an SMT interpolator for `ϕ` such that `A → ϕ` and `ϕ → C`. Only the symbols common to both sides (for example `n0,a1,b1,t1,i1`) may occur.
5. Rename `ϕ`’s indexed symbols to current program variables to obtain `K`; use the resulting formula as an invariant candidate.
6. Check initiation, consecution, and sufficiency on the original loop. The chapter’s candidate is `a >= 0 ∧ b >= 0`; `a >= 0` alone fails consecution (section 1.1).

The chapter states: “One possible interpolant we will then derive is the formula ϕ = (b1 ≥ 1), which can be translated to the intermediate assertion K = (b ≥ 1)” (PDF p.7). This is an intermediate assertion for the two-step path, not by itself a proof of an inductive invariant.

Inference: in Verus, encode the cut-point formula as a loop `invariant` clause and prove initiation/consecution with a `requires`/`ensures` contract. Verus does not expose a standard automatic Craig-interpolant command in the cited chapter; an external interpolator could propose formulas, but they must be translated into Verus syntax and discharged by Verus. The chapter’s `assert`/`assume` pseudocode is not Verus code.

Evidence and limits: the example proves partial correctness of the nonnegative Fibonacci result when the candidate satisfies all three conditions. Interpolation depends on the background theory admitting the required interpolants; formulas can be too weak, too strong, quantified, or difficult for the solver.

## technique 2: interpolation-based model checking (IMC)

What it is: accelerate BMC’s finite-depth search into an unbounded invariant search. A transition system has initial-state formula `B[x]`, transition relation `TR[x,x']`, and error-state formula `E[x]`. BMC checks a k-step conjunction; an unsatisfiable query only says that no error occurs within that bound. IMC repeatedly computes over-approximations `R0,R1,...` with interpolants until one is inductive.

Steps (section 3.1–3.2, PDF pp.25–28):

1. Set `R0 := B`.
2. For parameters `j ≤ k`, construct the paper’s query `R_i[x0] ∧ TR[x0,x1] ∧ … ∧ TR[x{k−1},xk] ∧ (E[xj] ∨ … ∨ E[xk])` (equation (3)).
3. If satisfiable with `i=0`, report a reachable error. If satisfiable with `i>0`, abort because the approximation may be too imprecise.
4. If unsatisfiable, extract an interpolant/separator `I_i[x1]` between prefix and suffix, rename `x1` to `x`, and set `R_{i+1} := R_i ∨ I_i`.
5. Check consecution `R_i ∧ TR |= R_i'` and sufficiency `R_i ∧ E |= ⊥`; alternatively detect a fixed point `R_{i+1} ≡ R_i`.
6. If an inductive `R_i` is found, it proves no error is reachable at any depth.

The chapter explains the acceleration: “The use of Craig interpolation has the effect of accelerating the fixed-point construction” (section 3.2.1, PDF p.27). Larger `k` and smaller `j` produce stronger approximations, but infinite-state systems may never stabilize (PDF pp.27–28).

Inference: a Verus integration could use IMC outside Verus to synthesize candidate state predicates, then encode the fixed point as a Verus loop or state-machine invariant. Verus’s proof obligations are contracts and invariants, not `B/TR/E` transition formulas; translation and trust in the model are additional work.

## technique 3: CEGAR with interpolant predicates

What it is: begin with a coarse existential/predicate abstraction, analyze it, and refine it when an abstract counterexample is spurious. Predicate abstraction maps each concrete state to Boolean values of predicates `P={P1,…,Pk}`. A spurious path yields an unsatisfiable conjunction `A1 ∧ … ∧ A_{m+1}`; sequence interpolants `I1,…,Im` become new predicates.

Steps (section 3.3, PDF pp.29–32):

1. Start with a small predicate set, even empty, and construct or lazily explore the abstract transition system.
2. Find an abstract path from an initial state to an abstract error state.
3. Check whether the corresponding concrete path formula is satisfiable.
4. If unsatisfiable, compute sequence interpolants; each `I_i` uses only state symbols at position `i`.
5. Rename them to state predicates and add all to the predicate set.
6. Rebuild or lazily refine the abstraction; repeat until the error is proved unreachable or a real counterexample is found.

The paper says refinement “can be achieved with the help of Craig interpolation” (section 3.3.3, PDF p.30) and that new predicates eliminate the particular path, although paths of other lengths may require more iterations. Lazy abstraction avoids explicit state construction; Impact generates predicates per path (section 3.3.4).

Inference: for Verus, predicates can correspond to ghost state facts or state-machine invariants. CEGAR can discover missing relations, but Verus still needs the final predicates expressed in supported Rust/Verus logic and proved for all transitions.

## technique 4: CHC encoding for loops and recursion

What it is: encode invariants and contracts as relation symbols in constrained Horn clauses. For Fibonacci, `loop(n,a,b,i)` is constrained by initiation, consecution, and a contradiction clause for a bad postcondition. The chapter gives the solution `loop ↦ a ≥ 0 ∧ b ≥ 0` (section 3.4.1, PDF pp.32–34).

Steps: translate each loop entry, body transition, and error condition to a CHC; ask a CHC solver for formulas replacing relation symbols; read the replacement as an invariant. For recursion, introduce `pre` and `post` relations, encode base cases and recursive calls, and solve the resulting linear/non-linear clauses (section 3.4.2, PDF pp.34–35). Non-linear clauses arise when a recursive body has multiple postcondition atoms.

Inference: a Verus function contract and recursive proof lemma play the roles of `pre`/`post`; CHC solving can synthesize candidate contracts, but Verus requires these candidates to be encoded as Rust/Verus specifications and checked. A recursive Verus proof must also satisfy termination requirements where applicable.

## what is proved, trusted, and threatened

The chapter proves logical properties of interpolation definitions and algorithms under their stated theory assumptions; its Fibonacci formulas are examples, not measurements. Trusted components include the SMT solver’s satisfiability and interpolation implementation, the chosen background theory, SSA encoding, and the specification itself. Infinite-state IMC may fail to stabilize; CEGAR may refine indefinitely; interpolation strength, size, and vocabulary materially affect performance (conclusion, PDF p.36).

## techniques for the catalog

- interpolant invariant inference — unroll a path, split its verification condition, compute a shared-symbol interpolant, rename it, and check induction

- IMC fixed-point acceleration — iteratively interpolate BMC queries to build inductive over-approximations of reachable states

- CEGAR predicate refinement — turn interpolants from spurious counterexamples into predicates and repeat abstraction checking

- CHC invariant/contract solving — encode initiation, transitions, recursion, and errors as Horn clauses and solve relation symbols
