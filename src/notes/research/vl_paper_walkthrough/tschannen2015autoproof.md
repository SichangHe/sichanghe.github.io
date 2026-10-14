# AutoProof: Auto-active Functional Verification of Object-oriented Programs
(authored by agents unless marked 🧑)
Tag: `tschannen2015autoproof`, [paper](http://arxiv.org/abs/1501.03063v2)

## scope and result
AutoProof is an auto-active verifier for sequential Eiffel programs. The paper defines the interaction model precisely: “Auto-active tools need no user input during verification, which proceeds autonomously until it succeeds or fails; however, the user is still expected to provide guidance indirectly through annotations (such as loop invariants) in the input program.” (Section 1, p. 2). It targets functional correctness of object-oriented code with contracts, class invariants, framing, termination, overflow, and null-dereference checks. It translates Eiffel to Boogie, generates verification conditions, and calls Z3 (Section 4, p. 7).

## technique: contract and invariant guided auto-active verification
Use this when code needs rich functional specifications but should be discharged without interactive prover commands.

1. Write Eiffel preconditions and postconditions for each routine, class invariants for object consistency, loop invariants and variants for loops, and inline assertions where needed (Section 3, p. 4–5).
2. Add framing annotations identifying objects a routine may modify or read. The paper explains that `modify (set)` in a precondition denotes that executing the routine may modify objects in `set` (Section 3.2, p. 6).
3. Model abstract state with ghost members and mathematical structures. AutoProof’s Mathematical Model Library supplies sets, relations, sequences, bags, and maps and maps them to Boogie background theories (Section 3.2, p. 6).
4. Run verification as a push-button attempt. AutoProof checks routine contracts, call preconditions, loop and recursive termination, integer overflow, null dereferences, and class invariants (Section 3, p. 4).
5. Treat a successful result as correctness relative to the supplied specification. The paper says, “AutoProof’s techniques are sound : successful verification entails that the input program is correct with respect to its given specification.” (Section 3, p. 4). It also says the tool is incomplete, so failure can reflect prover heuristics or missing annotations rather than a program error (Section 3, p. 4).

Inference: In Verus, use `requires` and `ensures` on Rust functions, `invariant` clauses attached to loops, and ghost state or `spec fn` models for sequences, sets, and maps. A Verus `proof fn` can establish class-invariant-like relationships between fields. Eiffel `modify`/`read` annotations do not carry over as keywords; Rust ownership and Verus permissions provide a different framing basis. This mapping is an inference because the paper is about Eiffel and Boogie.

## technique: semantic collaboration for shared object invariants
Use this when multiple heap objects have invariants that refer to one another, such as subject/observer, parent/child, or graph structures.

1. Define each object’s abstract model and invariant, including relationships to collaborating objects (Section 2.2, p. 3; Section 3.2, p. 6).
2. Use ownership and flexible visibility so a routine can temporarily open the relevant invariants, modify the permitted footprint, and re-establish them before returning. The paper identifies “semantic collaboration” as its full-fledged framing methodology for collaborating objects (Section 3.2, p. 6).
3. Mark ghost fields and lemma procedures separately from executable routines. Ghost members describe the model; lemma procedures outline proofs with assertions and ghost-state manipulation (Section 3.2, p. 6).
4. Verify benchmark patterns such as iterators, subject/observer, composite trees, marriage, doubly-linked lists, and PIP graphs. These are the paper’s object-oriented challenge group requiring complex invariant and framing reasoning (Section 5.1, p. 11).

Inference: In Verus, model the abstract state with ghost fields and keep executable updates synchronized through `proof fn` lemmas. Rust ownership makes some framing obligations explicit, while shared mutable graphs may require tracked permissions and state-machine-style protocols. The paper does not provide Rust or Verus code.

## technique: two-step verification feedback
Use this when a first proof attempt fails and the user needs to distinguish a real defect from an insufficient invariant.

1. Run the normal sound verification attempt.
2. If it fails, automatically run a second, generally unsound diagnostic step using under-approximations such as finite loop unrolling (Section 3, p. 4).
3. Compare the outcomes. If finite unrolling succeeds while the inductive proof fails, report that the loop appears free of obvious errors and suggest strengthening the loop invariant (Section 3, p. 4).

Inference: Verus can emulate the diagnostic idea with bounded test harnesses or temporary assertions, but such a run is evidence for debugging rather than a proof. The paper’s second step is explicitly unsound and must not be counted as verification evidence.

## technique: translation pipeline and modular backend
Use this when building a verifier for a language that lacks direct SMT verification infrastructure.

1. Parse annotated Eiffel into a Boogie-like abstract syntax tree.
2. Transcribe that AST into textual Boogie.
3. Encode heap, references, objects, contracts, and invariants in Boogie. The paper uses a polymorphic `Heap` map from reference and field pairs to values (Section 4.1, p. 7).
4. Let Boogie generate verification conditions and send them to Z3; map solver results back to Eiffel source elements (Section 4, p. 7).

Inference: Verus generates formulas from Rust-like code directly, so VL should reuse the modular-contract idea rather than reproduce an Eiffel-to-Boogie translation. The architectural lesson is to keep source-language semantics, VC generation, and SMT solving separable.

## evidence, trust, and limits
The benchmark suite contains 27 problems spanning algorithms, object-oriented patterns, and data structures (Table 1, p. 11). Table 2 reports all 27 verified in one bulk run: 203.8 seconds total, 2,262 executable-code lines, 2,165 specification lines, and 43,089 Boogie input lines; the table caption identifies the experiment as “Verification of benchmark problems with AutoProof.” (Table 2, p. 12). The run used one core of a Windows 7 machine with a 3.5 GHz Intel i7 CPU and 16 GB memory, Boogie 2.2.30705.1126, and Z3 4.3.2 (Section 5.2, p. 12). The table’s denominator is 27 listed benchmark rows; no independent random sample is reported.

The paper reports an average auxiliary-annotation ratio of 2.8 out of 10 specification lines and says auxiliary annotations were below 58% for every problem (Section 5.2, p. 12). These are descriptive statistics of the 27-row benchmark, not a general annotation bound. AutoProof does not fully support side-effecting specifications, once routines, precise floating-point reasoning, or concurrency (Section 3.2, p. 5; Section 5.3, pp. 13–14). Successful verification is conditional on the specification, Boogie/Z3 implementation, Eiffel semantics, and modeled external routines; the paper itself footnotes soundness as “modulo bugs in the implementation.” (Section 3, p. 4).

Inference: For agent-written verified Rust, AutoProof is a high threat to any claim that contracts, framing, and object invariants are novel by themselves. Its Eiffel-specific semantics and lack of concurrency do not solve VL’s Rust problem. VL should avoid redoing generic auto-active framing; a Rust-specific contribution would need measured advantages on ownership, unsafe boundaries, dependencies, or concurrency.

## techniques for the catalog
- auto-active contracts — combine push-button SMT proving with user-supplied contracts, loop invariants, and variants
- semantic collaboration — maintain invariants over collaborating heap objects with ownership and framing annotations
- mathematical model library — specify abstract sets, sequences, bags, maps, and relations separately from implementation
- two-step diagnostics — use bounded under-approximation after failure to suggest missing inductive invariants
- translation pipeline — lower an annotated object language through an intermediate verification language to SMT conditions
Checked 2026-10-14: audit record tschannen2015autoproof; paper-study comparison complete; gate executed; experiments not rerun
