# Forall-Exists Relational Verification by Filtering to Forall-Forall [with appendix]
(authored by agents unless marked 🧑)
Tag: `nagasamudram2025forall`, [paper](http://arxiv.org/abs/2509.04777v1)

## problem and result

The paper turns a relational judgment of the form a universal-existential (∀∃) relational judgment into an ordinary universal-universal (∀∀) verification problem. Its vehicle is a bicom, a product program that represents paired executions and can contain right-side havoc followed by a relational filter. The filter-adequacy transformation `chk` adds assertions that validate filters and loop-variant decreases. The main theorem says that if `chk(B)` satisfies a ∀∀ specification, then the projections of `B` satisfy the desired ∀∃ specification.

The abstract states: "This transformation adds assertions to a product program in such a way that the desired ∀∃ property (of a pair of underlying unary programs) is implied by a ∀∀ property of the transformed product." (abstract, p. 1). The result is useful for nondeterministic programs, where a right execution must be selected to match each left run.

## technique 1: build a filtering bicom

What it is. A bicom contains paired commands, conditionals and loops, and projections to left and right unary commands. A `havf y (P)` construct executes right-side havoc of `y` and then assumes relational predicate `P`; it filters right executions to those matching the left state. The introductory example uses `havf y (x = y)` after havocing `x` on the left, so the right value is existentially chosen to equal the left value.

Steps. (1) Start with commands `c` and `c'` and a relational pre/postcondition `R,S`. (2) Choose an alignment product `B` whose left and right projections are semantically equivalent to `c` and `c'`. (3) At a nondeterministic right choice, insert `havf` rather than an unguarded assumption. (4) Add relational loop alignment and a two-state variant where right-only iterations can occur. (5) Check that the bicom is well formed and that its projections preserve the intended commands. (6) Apply `chk` and verify the resulting ∀∀ judgment.

The paper's methodology is explicit: "(1) Find a bicom B that represents c, c′ in the sense that it’s projections are semantically equivalent to c and c′." (section 2, p. 7). It cautions that finding a good alignment can require user guidance or search. Inference: for Verus, the bicom is likely generated as a paired ghost execution rather than executed as production code.

Verus form (inference). Define a Rust proof function over two state records, with ghost copies of each program's variables. `havf` becomes a ghost choice constrained by an `assume`-like precondition; because Verus does not permit arbitrary unsound assumptions, the existential witness must be supplied or proved by a lemma. Relational assertions become `requires`/`ensures` over paired states and loop `invariant`s over both sides.

## technique 2: filter-adequacy transformation (`chk`)

What it is. `chk(B,vs)` recursively transforms a bicom. It leaves ordinary commands and assertions intact, recursively checks sequences and branches, transforms an embedded pair by applying unary check `uchk` to the right command, and changes `havf x P` into `assert(∃|x.P); havf x P`. For loops it snapshots a two-state variant and the right-loop condition, executes the checked body, and asserts that every right-only iteration decreases the variant while remaining nonnegative.

The unary transformation `uchk(c,vs)` instruments each `while e vnt e1 do c1` as assignment of a fresh snapshot variable `x := e1`, checked body, then `assert(0 ≤ e1 < x)`. Freshness excludes variables in the avoid list and nested instrumentation. The paper states: "The unary check function maps a command c and list vs of variables to a command uchk(c,vs) that is equivalent except that each loop is instrumented so it asserts that the body decreases the given variant expression." (section 5.1, p. 19).

Steps. (1) Compute an avoid list containing variables in the specification and bicom. (2) Recursively transform every loop body with `uchk`, selecting fresh snapshot names. (3) For each filtered havoc, add an existential assertion before the havoc. (4) For each bicom loop, snapshot the variant and right-only guard with fresh variables. (5) Check the body recursively. (6) Assert the implication from right-only execution to `0 ≤ variant < old_variant`. (7) Preserve projections and framing conditions.

Verus form (inference). A loop variant is a ghost integer stored before the body; a Verus `invariant` states nonnegativity and a post-body decrease lemma proves termination. A filtered choice should be represented by a proof witness, not a runtime `assume`. Fresh snapshot variables can be local ghost variables. The theorem's framing side conditions become explicit `requires` that instrumentation does not modify relational variables.

## technique 3: bicom logic and framing

The paper defines ∀∀ correctness for bicoms with failure, weakest-precondition equations, semantic frames, and a well-formedness condition. A frame identifies variables untouched by commands and specifications. The transformation uses fresh variables so snapshots cannot interfere with the original semantics. Lemma 5.2 proves that under syntactic framing, `uchk` and `chk` are semantically framed; the proof proceeds by structural induction, with special care for loops and nested snapshots (section 5.1, pp. 20–21).

This framing is essential because an added assertion can fail, and failure may depend on a filter or variant while still being independent of framed variables. The paper's main theorem requires: (i) `B` well formed; (ii) `bFrame(B,vs)`; (iii) `vs` frames `R` and `S`; and (iv) a successful ∀∀ proof of `chk(B,vs)`. The theorem then concludes the ∀∃ judgment (Theorem 5.4, p. 21).

Verus form (inference). Use disjoint state structs or ghost maps and prove that helper lemmas preserve untouched fields. `old(...)` in `ensures` can relate pre-state values where needed; loop invariants state frame equalities. Verus's verifier checks the concrete frame lemmas, while bicom well-formedness and projection equivalence remain proof obligations.

## technique 4: apply the theorem with ordinary tools

The practical workflow is linear after an alignment is chosen. (1) Find a bicom with useful alignment and filtered right havocs. (2) Apply `chk`; the paper says it is a "simple linear time transformation." (section 2, p. 7). (3) Verify `chk(B): R { S` as an ordinary ∀∀ product using assertions, assumptions, loop invariants, and a standard verifier. (4) If verification succeeds, invoke Theorem 5.4 to obtain the original ∀∃ property. If it fails, revise the bicom alignment or invariants.

The prototype translates bicoms to WhyML and uses Why3's SMT backends. It extends an existing tool with filtered havoc and loop variants, applies `chk` after desugaring and type checking, and checks projection equivalences manually for examples (section 6, pp. 22–23). Verification proceeds automatically with simple invariant annotations; existential filter assertions are equalities that SMT solves in the examples.

Verus form (inference). A generated paired Rust proof can use ordinary Verus assertions and invariants once witnesses for filtered choices are explicit. This makes the approach attractive for relational properties such as refinement or generalized noninterference, but alignment synthesis and existential witness construction are outside ordinary Verus automation.

## evidence, assumptions, and product threat

The paper develops sound proof rules (Theorem 3.3), proves filter adequacy (Lemma 5.3 and Theorem 5.4), and mechanizes the development in Rocq; the prototype is a Why3 translation, not a Verus implementation. The trusted base includes the semantic definitions, projection equivalence arguments, freshness generation, Why3 translation, and SMT solver. The examples are proof-of-principle rather than a broad benchmark with aggregate success denominators; the paper does not claim a percentage of all ∀∃ programs.

The method assumes a well-formed bicom, suitable frame variables, declared loop variants for right-only progress, and an alignment whose projections equal the target commands. An unfiltered havoc would be unsound because arbitrary assumptions can discard executions; the explicit existential assertion prevents that. Inference: agent-written verified Rust faces a threat from incorrect alignment or fabricated existential witnesses. The transformation's checks can make those errors fail inside the proof, but projection equivalence and witness generation remain areas where generated code must be inspected. VL should reuse the filter/`chk` pattern for nondeterministic relational specifications rather than treating ∀∃ as an ordinary two-run equality.

## techniques for the catalog

- filtering bicoms: encode existentially chosen right executions as havoc plus a relational filter
- filter-adequacy `chk`: add existential checks and loop-variant assertions before ∀∀ verification
- unary loop checking `uchk`: instrument variants with fresh snapshots and decrease assertions
- bicom framing: preserve projection semantics with freshness and frame conditions
- ∀∃ to ∀∀ workflow: choose an aligned product, transform it, and discharge the ordinary product proof
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
