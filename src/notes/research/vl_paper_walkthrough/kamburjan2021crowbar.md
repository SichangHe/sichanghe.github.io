# Crowbar: Behavioral Symbolic Execution for Deductive Verification of Active Objects
(authored by agents unless marked 🧑)
Tag: `kamburjan2021crowbar`, [paper](http://arxiv.org/abs/2102.10127v2)

## what Crowbar verifies

Crowbar is a deductive verifier for ABS active-object programs. ABS combines object encapsulation, asynchronous calls and futures, and cooperative scheduling. Crowbar implements Behavioral Program Logic (BPL), in which specifications influence symbolic execution while the tree is being built. The abstract states: “Crowbar implements behavioral symbolic execution: each method is symbolically executed, but specification and prior static analyses influence the shape of the symbolic execution tree.” (Abstract, p. 1.) Its purpose is to avoid exploring branches that already violate a behavioral specification and to show failed branches in ABS source terms.

An ABS method is annotated with preconditions, postconditions, object invariants, loop invariants, nullability, or a local session type. Crowbar’s front end parses and type-checks these annotations, then creates a proof obligation of the form `ϕ ⇒ {U}[s α τ]`, where `s` is the method body, `U` is the accumulated substitution, `α` interprets the behavioral specification, and `τ` is its syntax. The middle end produces a tree of symbolic, logic, and static nodes. The back end sends logic nodes to SMT and sends static nodes to external analyses. A symbolic leaf means verification failed; all logic leaves must close and static obligations must be discharged externally for success.

## technique 1: behavioral symbolic execution guided by the specification

what it is: reduce a behavioral specification at each program step and use it to choose which symbolic-execution branches to build. Ordinary dynamic-logic symbolic execution first executes the whole statement and checks a postcondition afterwards. BSE matches the active statement with the active specification action, so a mismatch stops that path immediately.

when to use: use it for protocols, session types, cooperative contracts, or any specification that constrains an execution trace rather than only its final state. It is especially useful for distributed or concurrent systems where exploring behavior that already violates a protocol creates large, irrelevant trees.

how to do it:

1. Parse the method and its behavioral annotation into a specification state `τ` (Sections 3–4, pp. 5–6).
2. At each statement, apply the calculus rule for the current specification. For a local session type, syntactically match the call, synchronization, suspension, or return against the active action (Section 2.1, pp. 4–5; Section 5, p. 7).
3. If a match fails, stop symbolic execution on that branch; do not generate later nodes. If matching cannot decide among alternatives, delay the choice and explore all alternatives (Section 5, p. 7).
4. Generate logical path conditions only after a branch has been identified and the syntactic match succeeds (Section 5, p. 7).
5. Continue with ordinary symbolic updates and path conditions on surviving branches; leaves become logic or static obligations (Sections 3 and 6, pp. 5–6 and 8).

The paper’s session-type example (Example 2, p. 4) requires a call of `m` on role `f`, then `n` on role `g`, then a return in a state where `result == 0`. In Figure 2 (p. 5) the method is specified with the type `f!m.g!n.↓ϕ`, "the method is specified to make two calls, but executes three" (Section 3, p. 5; the code calls `this.f!m()`, `this.g!m()`, `this.f!m()`), so the nodes after the second call are not generated. Figure 2’s caption says, “Illustration of guides in BSE. Verification of the method to the left results in a symbolic execution tree where the dashed nodes are not generated.” (Figure 2, p. 5.)

verus form (inference): model a protocol as a ghost state machine and make each executable operation advance a permitted state. A Verus `proof fn` can establish a transition relation and an `ensures` clause can state the resulting protocol state; `invariant` clauses can preserve state-machine facts across loops. Inference: Verus does not dynamically prune a symbolic execution tree from a session-type grammar. A VL generator could use protocol-state matching to reject candidate Rust calls before invoking Verus, but the generator’s pruning is search guidance; Verus must still prove the accepted transitions.

evidence: Crowbar reports fully automatic verification of a model extracted from C code with 260 lines of ABS, 5 classes, 5 interfaces, 19 method contracts, and one contracted function (Section 7, p. 10). The earlier KeY-ABS case had 140 lines of code for 1 class and required manual interaction (Section 7, p. 10). Inference: this comparison shows scale only; it is not a controlled benchmark. The introduction says BSE improves automatization "as they reduce the size of the final logical formulas" (Section 1, p. 2); the paper reports no formula-size measurement, so Inference: the case study does not isolate that claim.

where it fails or assumes: a symbolic leaf means the behavioral guide stopped execution and verification fails (Section 6, p. 8). Static nodes remain external obligations: the paper says the context sets are output with their heap precondition, that the consistency of cooperative contracts and adherence to the specified method order are checked externally, and that each class with local types outputs a static node for compositionality (Section 6, p. 9); Crowbar itself does not discharge them. Inference: the final guarantee therefore assumes those analyses are sound and complete enough for the chosen model; the paper does not prove that external analyses preserve BPL semantics.

## technique 2: static-analysis and type-system guides

what it is: use prior nullability analysis and the ABS type system to remove proof branches that are impossible under the inferred type facts. A non-null access does not need a side branch proving that it avoids a null-pointer exception.

how to do it:

1. Mark fields and variables annotated `[NonNull]`, or infer non-nullness from the nullability type system (Section 4, p. 6).
2. Tag an access as non-null in Crowbar’s intermediate representation when the type system proves it safe (Section 5, p. 7).
3. During BSE, omit the null-exception side branch for that access; retain the side branch when inference cannot establish null safety (Section 5, p. 7).
4. Inference: treat the resulting proof tree as conditional on the type analysis. Side branches that are still generated end up as logic nodes sent to SMT (Sections 5–6, pp. 7–8).

Figure 2’s example omits node (1) because the field is declared non-null. The paper says, “An access that is shown to be non-null by the type system is marked as such in the intermediate representation of Crowbar.” (Section 5, p. 7.)

verus form (inference): use Rust references and `Option` pattern matching to make nullability explicit. A non-optional `&T` access carries Rust’s type-level non-null guarantee; an `Option<T>` must be matched before dereference. Inference: Verus can then prove functional properties of the non-null branch, but it does not provide Crowbar’s BSE guide interface. A candidate generator may reject impossible `Option::None` paths only when Rust typing already rules them out.

evidence and limits: the result is a smaller tree, but the paper reports no isolated count of branches removed or solver time saved by nullability alone. Nullable values retain side branches, and type inference is trusted input to the BSE guide. Inference: an unsound external nullability analysis would make the guide unsound unless the underlying language type checker independently enforces the same fact.

## technique 3: SMT closure and typed heap translation

what it is: discharge modality-free logic nodes by translating BPL formulas to SMT-LIB. Crowbar handles ABS’s polymorphic heap, partial functions, and update substitutions explicitly before calling an SMT solver.

how to do it:

1. Collect a logic node with no remaining behavioral modality after symbolic execution (Section 6, p. 8).
2. Split BPL’s polymorphic heap into one monomorphic SMT heap per data type, then remove unused heaps in post-processing (Section 6, p. 8).
3. Translate partial pattern matches into total functions by adding an under-specified `else` function symbol, because the verifier reasons about partial correctness (Section 6, p. 8).
4. Apply accumulated substitutions from BPL updates before producing the SMT-LIB formula (Section 6, p. 8).
5. Send every resulting formula to an SMT solver; verification succeeds only if all logic goals close and remaining static nodes are accepted by external analyses (Section 6, p. 8).

The paper states: “Logic nodes are interfaces that contain no modalities and represent one proof goal. Crowbar delegates these proof goals to SMT solvers by passing them the logic nodes translated into SMT-LIB.” (Section 6, p. 8.)

verus form (inference): use Verus `requires`, `ensures`, `assert`, `invariant`, and `spec fn` expressions; Verus lowers these to its SMT backend. A Rust heap abstraction may require ghost maps or state-machine fields, and each polymorphic collection needs an explicit mathematical model. Inference: Crowbar’s monomorphic-heap split and partial-function encoding are translator concerns; they do not become Verus source constructs. The trusted boundary is Verus’s checker plus the adequacy of the heap abstraction and any external model.

evidence and limits: the 260-line case closes fully automatically, but static nodes are explicitly outside SMT and require external checks. The paper says "Crowbar only considers partial correctness (and some exceptions)" (Section 6, p. 8) and that the partial-function approach is "inspired by the KeY system". Inference: closing a logic node therefore does not establish total correctness or termination, and the under-specified `else` branch fits only the partial-correctness interpretation.

## technique 4: guided source-level counterexamples

what it is: reconstruct one failed symbolic-execution branch as a compilable ABS method, retaining the original control-flow structure and filling symbolic values with the SMT model. The result shows users the failure in input-language terms rather than internal proof terms.

how to do it:

1. Select an open branch in the symbolic execution tree (Section 6, pp. 8–9).
2. Traverse the branch and turn each applied symbolic rule into an ABS statement. Keep an `if` or loop shell when only one branch is relevant, so the user can relate the CE to the original method (Section 6, p. 9).
3. Replace symbolic variables with values from SMT `get-model`. Replace calls, `get`, `await`, and object creation with assignments that model their relevant internal effects, making the CE stand alone (Section 6, p. 9).
4. Add readable annotations for evaluated expressions, known-true statements, and the failed proof sub-obligations (Section 6, p. 10).
5. Compile or run the generated method to inspect the concrete failing behavior.

Listing 4 gives a concrete `heartbeat` CE: `beats` starts at 21239, an error branch assigns 21238, and the annotated failure is `heap.beats>=old.beats` together with `result=heap.beats` (Section 6, pp. 9–10). The paper’s key description is: “CEs are generated from the SE tree by traversing a single, open branch: based on the applied rule, each node in the tree can be transformed into a statement.” (Section 6, p. 9.)

verus form (inference): translate a failed Verus obligation into a small Rust test harness or proof lemma with concrete ghost values, preserving the relevant branch and adding `assert` statements for the failed `ensures` or `invariant`. Inference: a harness can help an agent diagnose a proof, but it is evidence of one state, not a proof of all states. The final candidate still requires Verus verification; generated assignments and annotations are untrusted debugging output.

evidence and limits: source-level CEs hide Crowbar internals and are intended for non-expert users, but the paper gives no user-study denominator. A failure caused by a loop invariant removes information outside or inside the loop depending on where the failure occurs (Section 6, p. 9). Inference: static-node failures may not be reconstructible as a concrete CE because they depend on external analyses; the paper describes CEs only for open branches of the symbolic execution tree.

## what remains trusted and what VL should learn

Inference: Crowbar proves properties expressible in BPL over ABS’s modeled semantics, subject to SMT validity and external static analyses. Trusted components include the ABS parser/type checker, BSE calculus and rule implementations, SMT translation (including polymorphic-heap splitting and partial-function encoding), SMT solver correctness, and any external analysis for static nodes. Inference: the generated counterexample is a diagnostic artifact, not part of the soundness proof.

The paper’s demonstrated scale is one 260-line extracted model (Section 7, p. 10); it reports no success rates across a benchmark suite. Inference: a product that generates verified Rust can reuse two ideas: let protocol or state-machine specifications guide candidate search early, and turn failed proof branches into source-level counterexamples for repair. VL should not redo a generic ABS session-type verifier; its opportunity is to test whether Verus state-machine transitions and concrete counterexample harnesses reduce repair cost on Rust systems code. Inference: retaining Verus as the final checker is necessary because Crowbar’s behavioral pruning and external analyses are language-specific and not themselves a proof of Rust implementation correctness.

## techniques for the catalog

- specification-guided symbolic execution — reduce behavioral specifications while executing and stop branches that cannot match the required trace
- type-guided path pruning — use nullability or other static facts to remove impossible exception branches before SMT
- behavioral-to-SMT translation — split polymorphic heaps, totalize partial functions, apply updates, and close modality-free goals with SMT-LIB
- guided source counterexamples — reconstruct a failed branch as compilable input-language code with concrete SMT-model values
- external-analysis interface — represent unresolved context or protocol obligations as static nodes for separate analyses
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Specification guides influence the shape of the tree and what side-branchs are generated by linking statements and specification more closely together than it is possible with post-conditions."): read the whole 11-page paper text and checked every quotation, number, section and page reference, and technique step against it; changed the Figure 2 description (the code calls f, g, f, not f three times; the spec is f!m.g!n), moved the formula-size claim from the abstract to the introduction (p. 2) and marked it as not measured, reworded the static-node and partial-correctness statements to match Section 6, fixed one page range, and labeled unsupported conclusions as Inference; did not check the Verus-form paragraphs against Verus documentation, the cited works, or the external repository, and the tag and arXiv link were kept as is (link from the fetch record, consistent with the arXiv id printed on the paper).
