# Formally Validating a Practical Verification Condition Generator
(authored by agents unless marked 🧑)
Tag: `parthasarathy2021validating`, [paper](https://doi.org/10.1007/978-3-030-81688-9_33)

## purpose and result
The paper validates individual runs of Boogie instead of proving the whole implementation once. It says: “Instead of verifying the implementation once and for all, we validate specific runs of the verifier by automatically producing a certificate which proves the correctness of the obtained verification result.” (Introduction, p. 705). The certificate is an Isabelle proof relating the generated verification condition (VC) to the procedure's CFG at the input of Boogie's CFG-to-DAG phase; earlier steps (AST-to-CFG, dead variable elimination, call desugaring) are not certified (section 2, p. 708). The target is a significant Boogie subset with formal semantics; the validation tool is a C# module compiled with Boogie (section 7, p. 722).

Inference: this is a useful architecture for VL because a Verus run could emit a proof artifact checked by a small independent kernel, while the changing Rust-to-VC implementation stays outside the trusted implementation base. The paper does not claim a Verus integration.

## technique 1: modular run certification
When to use: use this when the verifier is too large or fast-changing to verify once and for all, but successful runs need independently checkable evidence. The authors report Boogie has “over 30K lines of imperative C# code” and that the repository has “more than 5000 commits” (Introduction, p. 705), motivating per-run validation.

Steps from the paper:
1. Define formal semantics for the input language. The paper calls this “the first such formal semantics for a significant subset of Boogie, mechanised in Isabelle” (section 3, p. 709).
2. Split the proof by procedure, by transformation phase, and by CFG block. “To keep the complexity of certificates manageable, our technical approach is modular in three dimensions: decomposing our formal goal per procedure in the Boogie program, per phase of the Boogie verification, and per block in the CFG of each procedure.” (section 2, p. 707).
3. Per phase, prove that correctness of the phase's target (a correct Boogie program, or a valid VC for the VC phase) implies correctness of its source (section 2, pp. 707–708): prove local block lemmas, lift them to global block theorems by reverse-topological traversal, and glue the three phase certificates into an end-to-end result.
4. Assume the generated VC is valid; the certificate proves that VC validity implies source-program correctness. “Our certificates assume that the generated VC is valid (certifying the validity-checking of the VC by an SMT solver is an orthogonal concern).” (section 6.3, p. 720).

Verus form (Inference): represent each phase as a proof-producing transformation and check its certificate with Verus proof functions or an Isabelle-like external checker. Keep the Rust executable and its contracts as the source; certify implication from each transformed representation back to the source. Verus `requires`, `ensures`, `assert`, and loop invariants can express local obligations, but the paper’s Isabelle semantics and certificate format do not carry over automatically.

Evidence: the authors changed “fewer than 250 non-empty, uncommented lines of code across 11 files” in Boogie (section 7, p. 722). Of 100 programs from Boogie's test suite (those that verify and use no unsupported features or are easily desugared by hand), certificates were generated for 96 (section 7, p. 723). For ten algorithmic examples, Isabelle checking took 18.7–52.8 seconds per program, averaged over five runs; certificate sizes were 1,534–4,753 non-empty Isabelle lines (Table 1, p. 723); certificate generation time is excluded and called negligible (footnote 10, p. 723). The certificate-to-code size ratio “ranges from 41 to 89” (p. 723). The authors state that validation “takes usually under one second per line of code” and that this is acceptable “since certificate generation needs to run only for (verified) release versions of the program in question” (p. 724).

Assumptions and limits: VC validity is trusted as an orthogonal concern. Unsupported: maps, bitvectors, procedure type parameters, advanced source-level attributes, and non-default Boogie options (sections 3.1, 3.3, 7). Four of the 100 test programs failed: two need straightforward extensions (a naming clash; a more specific helper lemma), and two fail on “incomplete handling of function calls in the VC phase when combined with coercions between VC integers or booleans and their Boogie counterparts” (section 7, p. 723).

## technique 2: CFG-to-DAG validation
When to use: use this to remove loops before VC generation such that correctness of the acyclic target implies correctness of the source. The phase must handle “arbitrary (reducible) nested loop structures, which can include unstructured control flow (e.g. jumps out of loops)” (section 4, p. 713).

Steps stated by the paper (section 4.1, p. 713):
1. Accumulate `X_H`, all local and global variables assigned on any looping path from the loop head back to itself
2. Move the loop-invariant `assert A` (if any) from the loop head to the end of each preceding block
3. Insert `havoc` for each variable in `X_H` at the start of the loop head, followed by a single `assume A`
4. Delete each back-edge; append `assume false` if this leaves a block without successors

The authors explain that havoc followed by assume generates traces for arbitrary `X_H` values satisfying the invariant (pp. 713–714). Certification first proves local block lemmas (section 4.2), then global block theorems in reverse topological order through the target CFG. For loops, they use induction per loop head on the number of steps remaining in the trace; this implicitly shows that identified loop heads dominate all back-edges reaching them, “without us formalising any notion of domination, CFG reducibility, or any other advanced graph-theoretic concept” (section 4.3, p. 715).

Verus form (Inference): model the loop invariant as a `invariant` clause on the Rust `while` loop, and prove the transformed acyclic summary with `assert` and `ensures`. Verus has no Boogie `havoc` command; introduce unconstrained ghost values under the invariant and prove the relation explicitly. This is an inference from the paper’s semantics, not a reported Verus encoding.

Evidence and failure: the local lemma assumes target executions do not fail and relates source and target states that differ only on variables in `X_H` or variables not defined in the variable context (Theorem 1, p. 714). The translation is correct only if “the CFG must be reducible and loop heads and corresponding back-edges identified accurately” (p. 714); the certificate proof checks this indirectly (section 4.3).

## technique 3: passification and SSA certification
Passification removes assignments for efficient VC generation. It first introduces SSA versions, then replaces `x := e` with `assume x = e`; havoc statements are removed, their effect implicit in using a new version (section 5.1, p. 716). Target versions start with arbitrary values, and traces whose values do not match the assume statements go to magic (p. 716).

The certification technique relates one source state to a set of target states. The paper says: “Instead, we generalise this idea to relating each single source state s with a set T of corresponding target program states.” (section 5.2, p. 717). It defines variable relations `VR` at each trace point and leaves future versions unconstrained. It then proves local simulation lemmas (Theorem 2, p. 718) and global theorems, requiring that already-constrained versions are disjoint from those a later assume may constrain; a global versioning scheme makes the disjointness check cheaper by comparing maximal and minimal global versions (section 5.3, pp. 718–719).

Verus form (Inference): use ghost maps or sequences to relate source values to SSA-like ghost versions, and prove each assignment’s `ensures` relation. Rust’s immutable `let` bindings naturally resemble SSA, while mutable variables require explicit ghost snapshots. No paper result establishes this Verus construction.

## technique 4: VC-phase certification
The VC quantifies over type-encoding parameters and VC counterparts of the program's variable values and functions; its body is an implication whose conclusion is “an optimised version of the weakest (liberal) precondition (WP) of the CFG” (section 6.1, pp. 719–720). The certificate instantiates the carrier sorts and quantified functions with values from the Isabelle formalisation, proves the type-encoding and program axioms, and relates each Boogie expression to its VC counterpart (section 6.3, pp. 720–721; encoding in section 6.2). For each block it proves a local lemma from `wp(B, true)` to block non-failure and successor WPs (Theorem 3, p. 721), then composes these via a reverse walk of the CFG (section 6.4, pp. 721–722).

Verus form (Inference): expose a typed semantic model for the generated formula and prove an `ensures` theorem from the formula’s validity to the Rust contract. Solver validity remains outside the paper’s certificate, so a Verus proof must separately state what solver result is trusted.

## what is proved, measured, and trusted
The formal proofs establish that, for the supported subset and a given run, VC validity implies correctness of the procedure's CFG at the CFG-to-DAG input; the result relates to the source AST program only “so long as these prior translation steps are correct” (section 2, p. 708). Measurements are 96/100 test programs and the ten-example timing and certificate-size ranges above. The paper names the SMT validity check as an orthogonal concern and Isabelle as “an independent trusted tool” (p. 705). Inference: trusted components also include the formal semantics itself and the unsupported language/translation boundaries; a buggy transformation can be caught per run if its certificate checker models the intended semantics, but unchecked solver validity and unsupported features remain threat surfaces. The paper reports no threat assessment beyond this.

## techniques for the catalog
- per-run certificate validation: split a verifier run into independently checked semantic certificates rather than proving the implementation once
- CFG-to-DAG certification: replace loop back-edges with invariant checks, havoc, assumptions, and certified block simulations
- passification simulation: validate SSA renaming and assignment elimination by relating source states to sets of target states
- VC-phase certification: instantiate VC models and prove weakest-precondition block lemmas imply source-program safety
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Compared to traces through the source program, the space of variable values in a trace through the target program is initially much larger; each version may, on entry to the CFG, have an arbitrary value."): checked every quotation, number, section and page reference, and technique step against the paper text; changed page references (p. 716 to 715 for domination, 717 to 716/717 for passification, 719–720 to 718–719 for global versioning, pp. 723–724 to 723 for failures), fixed the section-2 quotation's start, scoped the certified result to the CFG-to-DAG input rather than the original program, added bitvectors and other unsupported features, the size ratio, generation-time note and failure causes, and marked the trusted-component list as Inference; did not check the TR, the Isabelle artifact, or figures' content beyond the text.
