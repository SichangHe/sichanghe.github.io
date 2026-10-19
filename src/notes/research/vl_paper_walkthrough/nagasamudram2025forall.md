# Forall-Exists Relational Verification by Filtering to Forall-Forall [with appendix]
(authored by agents unless marked 🧑)
Tag: `nagasamudram2025forall`, [paper](http://arxiv.org/abs/2509.04777v1)

## problem and result

The paper turns a universal-existential (∀∃) relational judgment into an ordinary universal-universal (∀∀) verification problem. Its vehicle is a bicom, a product program that represents paired executions and can contain right-side havoc followed by a relational filter. The filter-adequacy transformation `chk` adds assertions that validate filters and loop-variant decreases. The main theorem requires a well-formed bicom and a variable list framing the bicom and specification. Under these conditions, a ∀∀ proof of `chk(B,vs)` implies the desired ∀∃ specification for the projections of `B` (Theorem 5.4, p. 21).

The abstract states: "This transformation adds assertions to a product program in such a way that the desired ∀∃ property (of a pair of underlying unary programs) is implied by a ∀∀ property of the transformed product." (abstract, p. 1). For related initial states, the ∀∃ judgment forbids left assertion failure and requires each normally terminating left run to have a normally terminating right match satisfying the post-relation. Left divergence does not require right termination (Definition 3.1, p. 9).

## technique 1: build a filtering bicom

What it is. A bicom contains paired commands, conditionals and loops, and projections to left and right unary commands. A `havf y (P)` construct executes right-side havoc of `y` and then assumes relational predicate `P`; it retains right choices satisfying `P`, which may relate both states. The introductory example uses `havf y (x = y)` after havocing `x` on the left, so the right value is existentially chosen to equal the left value.

Steps. (1) Start with commands `c` and `c'` and a relational pre/postcondition `R,S`. (2) Choose an alignment product `B` whose left and right projections are semantically equivalent to `c` and `c'`. (3) At a nondeterministic right choice, insert `havf` rather than an unguarded assumption. (4) Add relational loop alignment and a two-state variant where right-only iterations can occur. (5) Check that the bicom is well formed and that its projections preserve the intended commands. (6) Apply `chk` and verify the resulting ∀∀ judgment.

The methodology leaves finding the bicom to user guidance or automated search (section 2, p. 7). Its four-way conditional supports different alignments: "The form allows different alignments to be used for different combinations of the branch conditions." (section 4.1, p. 11). Inference: a possible Verus adaptation would model the paired execution in ghost state; the paper does not implement this adaptation.

Inference: proposed Verus form. A possible encoding would use two ghost state records and paired preconditions, postconditions, and loop invariants. It would need a sound representation of nondeterministic choice and a proof that every retained choice satisfies the filter and required continuation. Proving that some choice exists is separate from assuming the filter for an arbitrary choice. This encoding is a proposal, not a result demonstrated in the paper.

## technique 2: filter-adequacy transformation (`chk`)

What it is. `chk(B,vs)` recursively transforms a bicom. It leaves relational assertions intact, recursively checks sequences and branches, transforms an embedded pair by leaving the left command unchanged and applying unary check `uchk` to the right command, and changes `havf x P` into `assert(∃|x.P); havf x P`. For a bi-while, Figure 12 snapshots the two-state variant and the conjunction of the right loop test and right alignment condition. After the checked body, it asserts that this saved conjunction implies `0 ≤ variant < old_variant`. Bi-left projection discards these relational checks during left-only iterations; the assertion therefore enforces progress on right-only iterations (section 5.1, p. 20).

The unary transformation `uchk(c,vs)` instruments each `while e vnt e1 do c1` as assignment of a fresh snapshot variable `x := e1`, checked body, then `assert(0 ≤ e1 < x)`. Freshness excludes variables in the avoid list and nested instrumentation. The paper states: "This ensures that the instrumentation variables of nested loops are distinct." (section 5.1, p. 19). The checks require must-termination of embedded right loops; where only may-termination holds, the user must expose filtered choices in the bicom instead (section 5.1, p. 19).

Steps. (1) Compute an avoid list containing variables in the specification and bicom. (2) Apply `uchk` recursively to right commands inside embedded pairs, selecting fresh loop snapshots. (3) For each filtered havoc, add an existential assertion before the havoc. (4) For each bicom loop, snapshot the variant and conjunction specified in Figure 12 with fresh variables. (5) Check the body recursively. (6) Assert the implication from right-only execution to `0 ≤ variant < old_variant`. (7) Establish the theorem’s well-formedness and framing conditions for the original bicom and specification. The added snapshot assignments change the transformed right projection; the theorem concludes a property of the original projections.

Inference: proposed Verus form. A proposed encoding could store a ghost integer before each right-only iteration and prove the required nonnegative decrease afterward. A proof of the transformation’s soundness would also need freshness and dependence conditions connecting this instrumentation to the original paired programs. These conditions are stronger than simply declaring a ghost variable.

## technique 3: bicom logic and framing

The paper defines ∀∀ correctness for bicoms with failure, weakest-precondition equations, semantic frames, and a well-formedness condition. A frame lists variables on which expressions, assertions, and the relevant command behavior depend. It does not identify untouched variables. Syntactic framing additionally includes every assigned or havoced variable and the variables needed by variant annotations (sections 4.4–4.5, pp. 16–18). Fresh snapshots avoid changing the original program variables; the inserted assertions can change failure behavior. Lemma 5.2 proves that under syntactic framing, `uchk` and `chk` are semantically framed; the proof proceeds by structural induction, with special care for loops and nested snapshots (section 5.1, pp. 20–21).

This framing is essential because added assertions can fail. The paper explains: "However, whether failure happens is influenced only by the assumed relation (for havf) or the variant (for loop), and those are framed by 𝑣𝑠." (section 5.1, p. 20). Snapshot variables lie outside `vs`; framing controls their effect on the original variables and failure behavior. The paper's main theorem requires: (i) `B` well formed; (ii) `bFrame(B,vs)`; (iii) `vs` frames `R` and `S`; and (iv) a successful ∀∀ proof of `chk(B,vs)`. The theorem then concludes the ∀∃ judgment (Theorem 5.4, p. 21).

Inference: proposed Verus form. An encoding could use paired ghost stores and prove that changing snapshot values does not change assertions about original variables or their projected behavior. This would need dependence proofs corresponding to the paper’s semantic frames, alongside bicom well-formedness and projection equivalence.

## technique 4: apply the theorem with ordinary tools

Applying `chk` takes linear time; the paper makes no such complexity claim for finding an alignment or verifying the transformed program. (1) Find a bicom with useful alignment and filtered right havocs. (2) Apply `chk`; the paper says: "This is a simple linear time transformation." (section 2, p. 7). (3) Verify `chk(B): R { S` as an ordinary ∀∀ product using assertions, assumptions, loop invariants, and a standard verifier. (4) If verification succeeds, invoke Theorem 5.4 to obtain the original ∀∃ property. If it fails, revise the bicom alignment or invariants.

The prototype translates bicoms to a subset of WhyML and uses Why3 to generate verification conditions and send them to SMT solvers. It extends an existing tool with filtered havoc and loop variants, applies `chk` after desugaring and type checking, and checks projection equivalences manually for examples (section 6, pp. 22–23). Verification proceeds automatically with simple invariant annotations; existential filter assertions are equalities that SMT solves in the examples.

Inference: proposed Verus form. A proposed paired Rust proof would need assertions and invariants as well as a sound treatment of filtered choices. Refinement and generalized noninterference are possible applications. The paper provides no evidence about how much of alignment synthesis or witness construction Verus could automate.

## evidence, assumptions, and product threat

The paper develops sound proof rules (Theorem 3.3), proves filter adequacy (Lemma 5.3 and Theorem 5.4), and mechanizes the development in Rocq; the prototype is a Why3 translation, not a Verus implementation. The authors trust the prototype to verify bicom correctness for programs acting on integer variables (section 6, p. 22). Inference: practical confidence also depends on projection equivalence checks, freshness generation, translation, and the Why3/SMT verification chain. The paper reports manual projection checks for its examples and warnings for unsupported or unsound features, including right-side procedure calls. The examples are proof-of-principle rather than a broad benchmark with aggregate success denominators; the paper does not claim a percentage of all ∀∃ programs.

The method assumes a well-formed bicom, suitable frame variables, declared loop variants for right-only progress, and an alignment whose projections equal the target commands. Unfiltered havoc is not inherently unsound. Unrestricted filter assumptions can discard all witnesses, so `chk` adds an existence assertion before each original `havf` (section 2, p. 4; Figure 12, p. 20). Inference: agent-written verified Rust faces a threat from incorrect alignment or fabricated existential witnesses. The transformation checks filter existence and right-only progress; it does not establish that a chosen bicom represents the intended source programs. Inference: VL could explore the filter/`chk` pattern for nondeterministic relational specifications, provided it separately proves projection equivalence and a sound encoding of choice.

## techniques for the catalog

- filtering bicoms: encode existentially chosen right executions as havoc plus a relational filter
- filter-adequacy `chk`: add existential checks and loop-variant assertions before ∀∀ verification
- unary loop checking `uchk`: instrument variants with fresh snapshots and decrease assertions
- bicom framing: bound dependence on original variables and isolate fresh snapshots
- ∀∃ to ∀∀ workflow: choose an aligned product, transform it, and discharge the ordinary product proof
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Observe that the check added to a right-side loop body by uchk has the effect that a ∀∀ verification will prove must-termination, whereas may-termination would be sufficient for ∀∃."): read the complete paper including appendix and references; checked study quotations, numbers, section and page references, transformation steps, theorem conditions, and prototype claims; corrected framing, the loop snapshot condition, the scope of uchk and linear-time claims, and the claim about unfiltered havoc; qualified proposed Verus encodings as inference; did not run the prototype, inspect the Rocq development, or validate a Verus implementation.
