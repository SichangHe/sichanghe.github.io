# Verification Condition Generation and Variable Conditions in Smallfoot
(authored by agents unless marked 🧑)
Tag: `berdine2012verification`, [paper](http://arxiv.org/abs/1204.4804v1)

## scope and status

Berdine, Calcagno, and O'Hearn document the checks and verification-condition generation implemented in Smallfoot 0.1 (late 2005) for annotated separation-logic programs with concurrency. The notes cover resource environments, variable conditions, alias checks, concurrency checks, symbolic execution, procedure/loop/parallel/critical-region encoding, and resource initialization. The abstract lists the deliverables: "the variable conditions that Smallfoot checks," "the analysis used to check them," "the algorithm used to compute a set of verification conditions corresponding to an annotated program," and "the treatment of concurrent resource initialization code." [Abstract, PDF p.1]

The document is also a warning about soundness scope. Its introduction says: "Ian Wehrman and Berdine have since found some cases where these relaxed conditions are unsound, prompting a revisitation of this topic." [Introduction, PDF p.1] The authors believe Smallfoot proofs appear embeddable into newer sound systems but explicitly do not claim a formal proof. The analyses remain whole-program and non-compositional because they guide proof search toward annotations satisfying occurrence conditions (§Introduction, PDF p.1).

## technique 1: compute variable effects and required resources

What it is. For each command and procedure, Smallfoot computes `var`, `mod`, and `req`. `var(C)` is the set of variables mentioned without protection, including specifications recursively; `mod(C)` is the set that may be modified without protection; `req(C)` is the set of resources that must be acquired before execution. The helper `er(M,A)` returns every resource whose protected variables are read in `A` or whose protected variables/invariant free variables are modified in `M` (§1.4, PDF pp.3–4).

How to apply it.

1. Build the resource environment `Gamma` from declarations `r(x) R`, recording protected variables and invariant, and the procedure environment `Delta` from pre/post specifications (§1.1, PDF p.2).
2. Rename bound variables so formals and locals are distinct and postcondition variables are not locally bound in the body (§1.3, PDF p.3).
3. Initialize `var`, `mod`, and `req` for primitive assignment, field access, allocation, disposal, sequencing, branching, loops, calls, parallel calls, and `with r when(B)` using the equations in §1.4 (PDF pp.3–4).
4. Iterate the procedure equations to the least fixpoint under pointwise subset inclusion. The procedure equations subtract formal parameters/value parameters from effects and add `er` for free variables in the contract (§1.4, PDF p.3).
5. For a critical region, remove the acquired resource from `req`, hide its protected variables from external `var`/`mod`, and account for invariant free variables as protected (§1.4, PDF p.4).
6. Require the main procedure to have no outstanding resource requirement. A violation propagates through calls as a nonempty `req(main)` (§1, PDF p.5).

The paper states: "The definition proceeds by performing a simple fixpoint calculation to determine the least solution (which is best) of the following equations, ordering by point-wise subset inclusion of functions." [§1.4, PDF p.3]

Verus form (inference). Represent each function's abstract read/write/resource summary as a ghost/spec value and prove summary lemmas with `ensures`. Use `requires` on a function for ownership or lock-state preconditions and `invariant` on loops/state-machine transitions. Verus does not provide Smallfoot's `er` or separation-logic star automatically; the summary and resource algebra must be encoded in a project-specific ghost state. This is an inference, not a claim about the paper.

Evidence and limits. The equations are an algorithmic analysis, not an empirical evaluation. They assume the declared resource protection lists and invariants are correct. The paper's warning about unsound relaxed concurrency conditions applies to the implementation's historical proof system (§Introduction, PDF p.1).

## technique 2: reject aliasing and concurrency-condition violations

Aliasing checks. At every call `f(x;E)`, require actual reference parameters to be distinct. If a global `z` is passed by reference, require that the callee and all recursively called procedures do not read, modify, or mention `z` in specifications. These are the paper's two explicit variable-aliasing conditions (§1, PDF p.4).

Concurrency conditions. Smallfoot checks five conditions. The first two are enforced by `req`: protected variables appear only in their resource's critical regions, and variables in a resource invariant are modified only in critical regions for that resource. Conditions three and four use `var` and `mod` for each parallel pair: one process may not modify a variable that the other process reads or mentions in specifications unless it is protected, and each process's modifications must be disjoint from the other's effects and contract variables (§1, PDF pp.5–6). The paper states the fifth condition as: "Whenever a ccr is symbolically executed, the pre and post states cannot mention variables modified by other processes." [§1.4, PDF p.5]

Apply the checks as follows.

1. Compute summaries for every procedure and call graph fixpoint.
2. Check `req(main) = empty` and inspect each parallel pair's two `mod`/`var` disjointness formulas (§1, PDF p.5).
3. Compute `par(f)`, the least set of procedures that may run concurrently with `f`, by adding direct parallel partners and propagating partners through enclosing procedures (§1, PDF p.5).
4. Use `par(f)` in critical-region verification: variables modified by parallel procedures are forgotten from the critical-region post-state so a proof cannot rely on a value that another process may change (§1, PDF p.5).
5. Classify variables as local, process-local, global-constant, protected, or process-protected; apply the corresponding access restrictions (§1, PDF pp.5–6).

Verus form (inference). Encode alias and interference facts as preconditions over ghost ownership tokens and lock/state-machine state. A call's `requires` can demand distinct mutable references; `ensures` can return the preserved abstract resource relation. For concurrent transitions, use a Verus state machine whose invariant separates protected state from process-local state. The exact `par` fixed point and separation-logic assertions are a project encoding, not native Verus syntax.

Evidence and limits. These checks establish the side conditions needed by the paper's proof rules; they do not handle deadlock. The paper explicitly says: "Note that this analysis ignores deadlock due to acquiring an already-held resource, as Smallfoot only proves safety." [§1, PDF p.5] Therefore a passing analysis is not a liveness proof.

## technique 3: generate VCs with symbolic instructions and jsr

What it is. A verification condition is `[P] SI [Q]`, where `SI` is loop-free symbolic code made from primitive statements, conditionals, sequencing, and generic `jsr` commands. A `jsr` summarizes a procedure, loop, or resource operation with a precondition, postcondition, and modified-variable set. The paper defines its role: "A symbolic instruction is a piece of loop-free sequential code where all procedure calls have been instantiated to jsr instructions of the form [P ] jsr~x [Q]." [§2.1, PDF p.6]

How to apply it.

1. For each procedure `f`, call `chop(f,C)` to obtain a symbolic instruction and local VC set, then wrap it with the procedure pre/post to form `vcg(f,[P]C[Q])` (§2.2, PDF p.7).
2. Leave primitive statements, sequencing, and conditionals as expected symbolic instructions, recursively unioning child VC sets (§2.2, PDF p.7).
3. For `while(B)[I]{C}`, emit `[I] jsr_mod(C) [not B and I]` and recursively generate a VC for `[B and I] C [I]`. The modified set permits framing around the invariant (§2.2, PDF p.7).
4. For a procedure call, rename value parameters, emit an initialization `jsr`, then a second `jsr` using only the callee contract. Fresh renamed values let a postcondition refer to an initial value not modified by the body (§2.2, PDF p.7).
5. For parallel calls, initialize both calls and combine preconditions and postconditions with separating conjunction, following `[P]C[Q]` and `[P']C'[Q']` implying `[P * P'] C || C' [Q * Q']` (§2.2, PDF p.7).
6. For `with r when(B){C}`, enter with a `jsr` that adds `B` and the invariant, symbolically execute `C`, and exit with a `jsr` that forgets protected variables and variables modified by `par(f)` (§2.2, PDF pp.7–8).

The symbolic execution rule for a `jsr` first discovers a frame axiom for unchanged heap, substitutes fresh values, and composes the callee postcondition with the continuation (§2.1, PDF p.6). The authors explain the concurrency reduction: "The net result is that correctness of a parallel program is reduced to several sequential triples, and no interleaving needs to be considered." [§2.2, PDF p.8]

Verus form (inference). Use a Verus function contract as the executable/specification boundary and prove loop `invariant` clauses directly. A `proof fn` can establish the frame facts and call-summary lemmas, while executable code remains unchanged. Verus does not have Smallfoot's generic `jsr`; the `jsr` summary is represented by a lemma with `requires` and `ensures`, and heap framing must be expressed with the project's ghost ownership model.

Evidence and limits. The VC algorithm is defined by equations and the separation-logic proof rules, not benchmark data. It proves safety properties under valid annotations and solver/proof-rule assumptions; it does not enumerate interleavings or prove deadlock freedom.

## technique 4: initialize resources without order dependence

Resource initializers are code that establishes every declared invariant before ordinary procedures run. The paper imposes two constraints: initializer `Ci` must not modify variables mentioned by a distinct resource, and `init` plus initializers contain no calls or critical regions (§3, PDF p.9). It checks the pairwise conditions using accumulated `mod` and `var` sets, then emits an additional VC over all invariants.

Procedure.

1. Check `mod(Ci) intersect var(rj) = empty` for distinct resources, using prefix accumulations so either initializer order is safe (§3, PDF p.9).
2. If `init` exists, use its postcondition as `main`'s precondition; otherwise use `emp` and the initializers in an unspecified order (§3, PDF p.9).
3. Generate `vcg([P] C [Q * R1 * ... * Rn])`, requiring the initializer result to entail the separating conjunction of all resource invariants and `main`'s precondition (§2.2–§3, PDF pp.8–9).
4. Forbid calls, critical regions, and parallel compositions in initialization, ensuring initializer order is immaterial (§3, PDF p.9).

Verus form (inference). Model initial abstract state as a ghost state-machine state and prove one initialization function's `ensures` establishes every resource invariant. If multiple initializers are allowed, prove disjointness or commutation lemmas. This is a design translation; the paper does not define a Verus encoding.

Evidence. The evidence is the generated entailment VC and the stated side conditions. No runtime or benchmark denominator is reported.

## what is proved, trusted, and missing

The paper's intended result is safety of complete annotated programs under its separation-logic rules: initialization establishes invariants, procedure VCs hold, variable conditions prevent interference, and critical regions are reduced to sequential triples. The paper does not claim a formal proof that Smallfoot's relaxed conditions are sound; it says the proofs "appear to be embeddable" into newer systems while expressly withholding that claim (§Introduction, PDF p.1). Trusted elements therefore include the annotation, frame-axiom inference, symbolic-execution implementation, background separation-logic soundness, and any solver used to discharge the generated VCs.

Inference: For VL, the reusable lesson is to separate effect/resource analysis from proof search and to reject concurrency proofs whose summaries leave unaccounted interference. A Verus product should not copy Smallfoot's historical relaxed conditions without a fresh soundness argument. The threat from agent-written verified Rust is moderate: Verus can prove a Rust implementation against contracts, but a missing ownership/resource invariant can make the contract vacuous or fail to capture cross-thread interference. Existing work means VL should not redo generic `var`/`mod`/`req` fixed-point analyses as a literature novelty; it may still need an engineering adaptation that extracts these facts from Rust and checks them against Verus state-machine invariants.

## techniques for the catalog

- effect/resource fixpoint: compute unprotected variables, modifications, and required resources with `var`, `mod`, `req`, and `er`
- alias checks: require distinct reference actuals and forbid unsafe global-reference effects through the call graph
- concurrency side conditions: enforce five variable/interference conditions and compute parallel procedures with `par`
- symbolic VC generation: chop procedures into loop-free symbolic instructions and generic `jsr` summaries
- critical-region framing: add resource invariants on entry and forget protected/parallel-modified state on exit
- resource initialization: check initializer disjointness and generate one entailment VC establishing all invariants

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
