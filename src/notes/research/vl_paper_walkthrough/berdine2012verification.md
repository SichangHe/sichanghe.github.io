# Verification Condition Generation and Variable Conditions in Smallfoot
(authored by agents unless marked 🧑)
Tag: `berdine2012verification`, [paper](http://arxiv.org/abs/1204.4804v1)

## scope and status

Berdine, Calcagno, and O'Hearn document the checks and verification-condition generation implemented in Smallfoot 0.1 (late 2005) for annotated separation-logic programs with concurrency. The notes cover resource environments, variable conditions, alias checks, concurrency checks, symbolic execution, procedure/loop/parallel/critical-region encoding, and resource initialization. The abstract lists the deliverables: "the variable conditions that Smallfoot checks," "the analysis used to check them," "the algorithm used to compute a set of verification conditions corresponding to an annotated program," and "the treatment of concurrent resource initialization code." [Abstract, PDF p.1]

The document is also a warning about soundness scope. Its introduction says: "Ian Wehrman and Berdine have since found some cases where these relaxed conditions are unsound, prompting a revisitation of this topic." [Introduction, PDF p.1] The authors say that Smallfoot "does not use the full relaxation of Brookes's original system, in particular retaining concurrency condition 5 below," and that its proofs "appear to be embeddable into either of the recently proposed sound systems, although we do not claim to have a formal proof at this time." [Introduction, PDF p.1] The condition checks remain whole-program and non-compositional because of "the necessity of guiding the search for a proof to one which satisfies the occurrence conditions" (Introduction, PDF p.1).

## technique 1: compute variable effects and required resources

What it is. For each command and procedure, Smallfoot computes `var`, `mod`, and `req`. `var(C)` is the set of variables mentioned without protection, including specifications recursively; `mod(C)` is the set that may be modified without protection; `req(C)` is the set of resources that must be acquired before execution. The helper `er(M,A)` returns every resource whose protected variables are read in `A` or whose protected variables/invariant free variables are modified in `M` (§1.4, PDF pp.3–4).

How to apply it.

1. Build the resource environment `Gamma` from declarations `r(x) R`, recording protected variables and invariant, and the procedure environment `Delta` from pre/post specifications (§1.1, PDF p.2).
2. Rename bound variables so formals and locals are distinct and postcondition variables are not locally bound in the body (§1.3, PDF p.3).
3. Initialize `var`, `mod`, and `req` for primitive assignment, field access, allocation, disposal, sequencing, branching, loops, calls, parallel calls, and `with r when(B)` using the equations in §1.4 (PDF pp.3–4).
4. Iterate the procedure equations to the least fixpoint under pointwise subset inclusion. The procedure equations subtract formal parameters/value parameters from effects and add `er` for free variables in the contract (§1.4, PDF p.3).
5. For `with r when(B) {C}`, take `req(C)` plus `er(empty, fv(B))` and remove `r`; in `var`, drop the free variables of `r`'s invariant; in `mod`, drop `owned({r})`. The paper's explanation: "ccr statements with r when(B) {C} hide accesses and modifications of the variables owned(r) in C"; variables in `fv(Rr)` "can only be modified in a critical region for r", so reads of them can be ignored "since they can never happen in parallel with a write" (§1.4, PDF p.4).
6. Check `req(main) = empty`, if `main` appears. A violation of concurrency conditions 1 or 2 gives "too large" a required-resource set for the offending code, which "eventually propogates to the main procedure" (§1, PDF p.5).

The paper states: "The definition proceeds by performing a simple fixpoint calculation to determine the least solution (which is best) of the following equations, ordering by point-wise subset inclusion of functions." [§1.4, PDF p.3]

Verus form (inference). Represent each function's abstract read/write/resource summary as a ghost/spec value and prove summary lemmas with `ensures`. Use `requires` on a function for ownership or lock-state preconditions and `invariant` on loops/state-machine transitions. Verus does not provide Smallfoot's `er` or separation-logic star automatically; the summary and resource algebra must be encoded in a project-specific ghost state. This is an inference, not a claim about the paper.

Evidence and limits. The equations are an algorithmic analysis; the paper reports no empirical evaluation. Inference: they take the declared resource protection lists and invariants as given (the paper says "We assume that Γ and ∆ are given," §1.1, PDF p.2). The unsoundness reported in the Introduction concerns "these relaxed conditions" of Brookes's system, on which the soundness argument for Smallfoot originally relied (§Introduction, PDF p.1).

## technique 2: reject aliasing and concurrency-condition violations

Aliasing checks. At every call `f(x;E)`, require actual reference parameters to be distinct. If a global `z` is passed by reference, require that the callee and all recursively called procedures do not read, modify, or mention `z` in specifications. These are the paper's two explicit variable-aliasing conditions (§1, PDF p.4).

Concurrency conditions. Smallfoot checks five conditions. The first two are enforced by `req`: protected variables appear only in their resource's critical regions, and variables in a resource invariant are modified only in critical regions for that resource. Conditions three and four are checked with `var` and `mod`: "Only protected variables can be modified in one parallel process and read or mentioned in specifications in another," and for each parallel call `f(x;E) || f'(x';E')` the modified set of each call must be disjoint from the free variables of the other's pre/postcondition and from the other's `var` set (§1, PDF p.5). The fifth condition is "a property of program proofs, not of annotated programs themselves" (§1, PDF p.5). The paper states the fifth condition as: "Whenever a ccr is symbolically executed, the pre and post states cannot mention variables modified by other processes." [§1.4, PDF p.5]

Apply the checks as follows.

1. Compute summaries for every procedure and call graph fixpoint.
2. Check `req(main) = empty` and inspect each parallel pair's two `mod`/`var` disjointness formulas (§1, PDF p.5).
3. Compute `par(f)`, the smallest set of procedures that might run in parallel with `f`: it contains `f'` for every occurrence of `f(x;E) || f'(x';E')` (either order) in the program, and `par(f')` contains `par(f)` for every procedure `f'` called (alone or in parallel) in the body `Cf` (§1, PDF p.5).
4. Use `par(f)` in VCGen for critical regions: "any such variables modified by processes in parallel are quantified out of the post states of ccrs during symbolic execution, thereby avoiding bad proofs" (§1, PDF p.5). In `chop` these are the variables `u` = `fv(R)` intersected with the union of `mod(f)` over `f` in `par(g)` (§2.2, PDF p.7).
5. Classify each variable as local, process-local, global-constant, protected, or process-protected; each class has the access restrictions listed in the paper (§1, PDF pp.5–6).

Verus form (inference). Encode alias and interference facts as preconditions over ghost ownership tokens and lock/state-machine state. A call's `requires` can demand distinct mutable references; `ensures` can return the preserved abstract resource relation. For concurrent transitions, use a Verus state machine whose invariant separates protected state from process-local state. The exact `par` fixed point and separation-logic assertions are a project encoding, not native Verus syntax.

Evidence and limits. These checks cover concurrency conditions 1 to 4 (condition 5 is handled by the `par`-based instrumentation of VCs); they do not handle deadlock. The paper explicitly says: "Note that this analysis ignores deadlock due to acquiring an already-held resource, as Smallfoot only proves safety." [§1, PDF p.5] Inference: a passing analysis is therefore not a liveness proof.

## technique 3: generate VCs with symbolic instructions and jsr

What it is. A verification condition is `[P] SI [Q]`, where `SI` is loop-free symbolic code made from primitive statements, conditionals, sequencing, and generic `jsr` commands. A `jsr` summarizes a procedure, loop, or resource operation with a precondition, postcondition, and modified-variable set. The paper defines its role: "A symbolic instruction is a piece of loop-free sequential code where all procedure calls have been instantiated to jsr instructions of the form [P ] jsr~x [Q]." [§2.1, PDF p.6]

How to apply it.

1. For each procedure `f`, call `chop(f,C)` to obtain a symbolic instruction and local VC set, then wrap it with the procedure pre/post to form `vcg(f,[P]C[Q])` (§2.2, PDF p.7).
2. Leave primitive statements, sequencing, and conditionals as expected symbolic instructions, recursively unioning child VC sets (§2.2, PDF p.7).
3. For `while(B)[I]{C}`, emit `[I] jsr_mod(C) [not B and I]` and recursively generate a VC for `[B and I] C [I]`. The paper says this is a `jsr` "that allows invariants to be smaller than they might otherwise be, because of framing" (§2.2, PDF p.7).
4. For a procedure call, rename value parameters, emit an initialization `jsr`, then a second `jsr` using only the callee contract. Fresh renamed values let a postcondition refer to an initial value not modified by the body (§2.2, PDF p.7).
5. For parallel calls, initialize both calls and combine preconditions and postconditions with separating conjunction, following `[P]C[Q]` and `[P']C'[Q']` implying `[P * P'] C || C' [Q * Q']` (§2.2, PDF p.7).
6. For `with r when(B){C}`, enter with a `jsr` that adds `B` and the invariant, symbolically execute `C`, and exit with a `jsr` that removes the invariant and forgets the protected variables `x` and the variables `u` of the invariant that processes in `par(g)` might modify (§2.2, PDF pp.7–8).

The symbolic execution rule for a `jsr` requires `Π ∧ Σ ⊢ Π' ∧ Σ' * ΣF`, i.e. finds a frame axiom `ΣF` "which describes the portion of heap unchanged by a procedure call," and continues from `(Π[x'/x]) ∧ Q * (ΣF[x'/x])` with `x'` fresh (§2.1, PDF p.6). The authors explain the concurrency reduction: "The net result is that correctness of a parallel program is reduced to several sequential triples, and no interleaving needs to be considered." [§2.2, PDF p.8]

Verus form (inference). Use a Verus function contract as the executable/specification boundary and prove loop `invariant` clauses directly. A `proof fn` can establish the frame facts and call-summary lemmas, while executable code remains unchanged. Verus does not have Smallfoot's generic `jsr`; the `jsr` summary is represented by a lemma with `requires` and `ensures`, and heap framing must be expressed with the project's ghost ownership model.

Evidence and limits. The VC algorithm is defined by equations and the separation-logic proof rules, not benchmark data. It proves safety properties under valid annotations and solver/proof-rule assumptions; it does not enumerate interleavings or prove deadlock freedom.

## technique 4: initialize resources without order dependence

Resource initializers are code that establishes every declared invariant before ordinary procedures run. The paper imposes two constraints: no initializer `Ci` modifies a variable mentioned by a distinct resource, and `init` (if present) and the initializers contain no procedure calls or ccrs (§3, PDF p.8). It checks the pairwise conditions using accumulated `mod` and `var` sets, then emits an additional VC over all invariants.

Procedure.

1. Check, for all `i`, `mod(Ci) ∩ var(C1,...,Ci-1) = ∅` and `var(Ci) ∩ mod(C1,...,Ci-1) = ∅`; the paper says the constraints "ensure that the order in which the initializers are executed is immaterial" (§3, PDF pp.8–9).
2. Take `P, C, Q` to be `init`'s precondition, body and postcondition if `init()[P'] C' [Q']` exists, otherwise `emp`, `C1;...;Cn` (in some unspecified order) and `emp`; if `init` appears, `main`'s precondition is taken to be `init`'s postcondition (§3, PDF p.9).
3. Generate the additional VC `vcg([P] C [Q * R1 * ... * Rn])` (§3, PDF p.9). Separately, given `init()[P] C [Q]` and `main()[P'] C' [Q']`, check the entailment `Q ⊢ R1 * ... * Rn * P'` (§2.2, PDF p.8).
4. Forbid procedure calls and ccrs in `init` and the initializers (§3, PDF p.8); §2.2 also requires `init`'s body `C` not to contain procedure calls, ccrs or parallel compositions (PDF p.8).

Verus form (inference). Model initial abstract state as a ghost state-machine state and prove one initialization function's `ensures` establishes every resource invariant. If multiple initializers are allowed, prove disjointness or commutation lemmas. This is a design translation; the paper does not define a Verus encoding.

Evidence. The evidence is the generated entailment VC and the stated side conditions. No runtime or benchmark denominator is reported.

## what is proved, trusted, and missing

The paper's stated property for a complete program is `[P] C ; RESDECLS ; let PROCDECLS in C' [Q' * R1 * ... * Rn]`, established "following the rule for complete programs [7, 3]" (§2.2, PDF p.8). Per the paper, `init` must establish all resource invariants separately and `main`'s precondition, procedure and loop VCs come from `vcg`, and critical regions are reduced to sequential triples. The paper does not claim a formal proof that Smallfoot's proofs embed into the newer sound systems; it says they "appear to be embeddable" and "we do not claim to have a formal proof at this time" (§Introduction, PDF p.1). Inference: trusted elements therefore include the annotation, frame-axiom inference, the symbolic-execution implementation, background separation-logic soundness, and any solver used to discharge the generated VCs.

## techniques for the catalog

- effect/resource fixpoint: compute unprotected variables, modifications, and required resources with `var`, `mod`, `req`, and `er`
- alias checks: require distinct reference actuals and forbid unsafe global-reference effects through the call graph
- concurrency side conditions: enforce five variable/interference conditions and compute parallel procedures with `par`
- symbolic VC generation: chop procedures into loop-free symbolic instructions and generic `jsr` summaries
- critical-region framing: add resource invariants on entry and forget protected/parallel-modified state on exit
- resource initialization: check initializer disjointness and generate one entailment VC establishing all invariants
