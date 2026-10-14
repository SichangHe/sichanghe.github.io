# Static and Dynamic Verification of Relational Properties on Self-Composed C Code
(authored by agents unless marked 🧑)
Tag: `blatter2018static`, [paper](http://arxiv.org/abs/1801.06876v2)
## what the paper establishes

The paper presents RPP, a Frama-C plugin that turns relational specifications over multiple calls into ordinary ACSL code that WP can prove, while also enabling runtime checking and testing-based counterexamples. Relational properties include monotonicity, non-interference, comparator laws, and encrypt/decrypt round trips. The problem is that ordinary Hoare contracts describe one call: “Function contracts allow specifying the behavior of a single function call … However, it is not possible to specify relational properties, that relate several function calls.” (Section 2, p. 3).

RPP's central reduction is self-composition. A generated wrapper executes renamed copies of the calls, records return values and relevant states, and asserts the relational predicate. The paper reports support for pure, side-effecting, pointer-using, and recursive C functions. It also generates an axiomatic logical counterpart so a proved relation can be reused as a hypothesis in later proofs.

## technique 1: preprocess a relational clause into a self-composed wrapper

What it is: A relational clause quantifies inputs, names calls, and states a predicate over their results or states. RPP expands the clause into a wrapper whose calls have renamed locals and whose final assertion is an ordinary ACSL assertion.

How to apply it (Sections 2.1–2.3, pp. 4–6):

1. Attach a `relational` clause to a function contract. For pure calls, use `\call(f,args)`; for the extended syntax, declare universally quantified variables and a `\callset` of calls with identifiers.
2. Inline each call into a generated wrapper, renaming local variables so executions do not interfere.
3. Save each return value in a fresh local and translate the relational predicate into an assertion over those locals. The paper's max/abs example generates `ret_var_1` and `ret_var_2`, then asserts the max identity (Figure 1, p. 5).
4. Run standard WP on the wrapper. A proved assertion establishes the original relational property because the wrapper is the self-composed execution.
5. Generate a logical function or predicate and an ACSL lemma expressing the relation. Add postconditions linking each C function to its logical counterpart so later proof obligations can use the relation.

The paper emphasizes that the wrapper prevents the generated axiom from proving itself: “the lemma of the axiomatic cannot be used to prove the assert annotation inside the wrapper.” (Section 2.3, p. 6). This is the soundness boundary between proving the implementation and reusing the result.

Verus form: Inference: write a proof wrapper that calls the Rust function twice on ghost or duplicated inputs, then prove a postcondition relating the two results. Use `requires`/`ensures`, `spec fn` relations, and proof functions/lemmas; the wrapper's calls must be executable or ghost-compatible according to the intended use. Verus has no `relational` clause or automatic self-composition, so an external generator or handwritten wrapper is needed. Inference: do not use a `proof fn` as runtime code; use executable functions for runtime wrappers and lemmas for the relational theorem.

Evidence and limits: The internal benchmark contains ten relation families, including monotonicity, nested calls, decrypt/encrypt, matrix identities, loops, and recursion (Figure 9, p. 10). The table marks each as specified/generated and proved/used where applicable; it is a capability matrix, not a rate over a random sample. The transformation assumes the generated wrapper can be discharged by WP and may suffer combinatorial explosion.

## technique 2: extend self-composition to global side effects

What it is: Side effects require separate memory states for each composed call. RPP's syntax names pre- and post-states with `Pre_id` and `Post_id` labels and refers to them with `\at`. It duplicates only globals in the functions' `assigns ... \from ...` footprints.

Procedure (Section 3.1–3.2, pp. 7–8):

1. For each call in `\callset`, assign an identifier and expose `\callresult(id)`, `Pre_id`, and `Post_id` in the relational predicate.
2. Require complete ACSL `assigns` and `\from` clauses for each involved function. Infer which globals are read or written.
3. Generate one copy of every accessed global per composed call, and rewrite each inlined body to use its copy.
4. State the relation over `\at(global,Pre_id)` and `\at(global,Post_id)` values in the wrapper assertion.
5. Generate a logical predicate with pre/post values as arguments and an ACSL lemma quantifying all relevant global states. Link the predicate to the C function with an `ensures` clause.

The paper gives the reason for duplication: “each function call must operate on its own memory state, separated from the other calls in order for self-composition to work.” (Section 3.2, p. 8). It also warns that pure logic functions cannot represent side effects, so the generated logical predicate must include state values.

Verus form: Inference: model each composed call with a separate ghost snapshot or separate state object, and relate pre/post ghost fields with `old(...)` and `ensures`. Use explicit state parameters in a `spec fn` relation; executable global mutation can be wrapped in a state-passing function. Rust's ownership can isolate state objects, but aliasing through shared references requires additional proof predicates. Inference: `assigns \from` information corresponds to a manually maintained frame specification; Verus does not infer it for arbitrary external code.

Evidence: Figure 5's `h` example verifies monotonicity of a global `y` by duplicating `y_id1` and `y_id2` and asserting the ordered pre/post values (pp. 8–9). Missing or imprecise frame clauses prevent safe duplication, so the method assumes accurate effect specifications.

## technique 3: enforce pointer separation in composed calls

What it is: Self-composition is sound for pointer operations only when calls access disjoint memory. RPP adds `\separated` preconditions for wrapper arguments and separation assumptions to the generated logical lemma.

Steps (Section 3.3, pp. 9–10):

1. Read the function's `assigns *p \from *p` or equivalent footprint to identify pointer locations read or written.
2. Add a wrapper `requires \separated(p_id1,p_id2)` for the pointer copies used by the composed calls.
3. Add corresponding separation hypotheses over universally quantified pointers in the axiomatic lemma.
4. Give the generated logical predicate explicit pre/post logic labels and a `reads` clause for its footprint.
5. Prove the relational assertion using the two independent pointer states.

The paper's pointer example increments two locations and proves order preservation only under separation (Figure 6, pp. 9–10). It states the limitation directly: “Support of properties with pointer aliasing is left as future work.” (Section 3.3, p. 10).

Verus form: Inference: use distinct owned references or ghost disjointness predicates as wrapper preconditions, and prove that each call's footprint is disjoint before composing them. `requires` can state disjointness; `ensures` can relate post-state values. When aliasing is allowed, this technique does not carry over unchanged: the relation must model interference or use a different product construction.

## technique 4: handle recursive calls with bounded inlining and induction

What it is: RPP adds an inlining depth to call terms. A recursive relational property can inline one call while leaving a smaller recursive call uninterpreted, turning the relation into an induction step.

Procedure (Section 4, pp. 10–11):

1. State a base relation for the terminating case, such as `x ≤ 1 ⇒ fact(x)=1`.
2. State an induction relation for `x > 1`, relating `fact(x)` to `fact(x−1)*x`.
3. In the wrapper, inline the outer call to the chosen depth and retain the smaller recursive call at depth zero.
4. Assert the relation between the inlined result and the retained call's result; WP proves the step using the relational property as an induction hypothesis.
5. For side-effecting recursion, inline both calls and use the relational property as a hypothesis instead of equating pure logic-function results. Assume termination and strictly smaller recursive arguments.

The paper explains the depth semantics: “The default value of 1 … means that we inline the body of the function once … When this parameter is set to 0 … we keep the call as such in the wrapper.” (Section 4, p. 11).

Verus form: Inference: express the base and recursive cases as `ensures` relations and prove the recursive theorem in a `proof fn`/lemma with a decreasing `decreases` measure on the executable function. Use ghost snapshots for side effects. Verus's termination checker and recursive proof structure replace RPP's wrapper depth, but the relational invariant still must be supplied.

Evidence: Figure 9 marks factorial and other recursive relations as generated and proved; the paper does not report a percentage denominator for this capability table. A recursive wrapper can become large, and side effects require accurate frame state.

## technique 5: reuse the relation for runtime checking and counterexamples

What it is: Because RPP produces ordinary ACSL assertions, E-ACSL can instrument them for runtime assertion checking and StaDy can search for inputs that falsify the wrapper assertion when WP cannot prove it.

Steps (Section 6, pp. 12–13):

1. Run WP on the generated wrapper. If a relational property is not proved, retain its final assertion.
2. Use StaDy to search for an input vector that falsifies that assertion, with a 30-second timeout per case in the comparator experiment.
3. Use E-ACSL to compile the relational annotations into runtime checks and execute each generated test input.
4. Treat a found falsifying input as a counterexample; treat a successful run only as evidence for that input, not a proof.

The paper reports that “StaDy was able to find counterexamples for almost all unproven properties.” (Section 6.1, p. 12). In the 32-row comparator table (Figure 10, p. 13), one case timed out after both 30 seconds and a 60-minute retry, and two cases used unsupported translation features; the remaining applicable unproved properties received counterexamples. These denominators are table rows and are not a claim of universal completeness.

Verus form: Inference: use Verus to prove the relational assertion when possible, and an executable Rust test harness to search for violating inputs when proof fails. Runtime checks can call executable predicates, but Verus specifications are not automatically executable; keep the checked predicate duplicated in a trusted runtime form and test equivalence where practical.

## what is proved, measured, and trusted

The formal claim is that a successful proof of the generated wrapper implies the relational property, provided the self-composition assumptions and ACSL contracts hold. Experiments cover ten internal relation examples and a comparator benchmark translated from Java; Table 10 has 32 comparator rows, while Figure 10 reports proof and StaDy outcomes per property P1–P3. WP's proof obligations, Frama-C's ACSL semantics, generated wrappers, solver behavior, and `assigns`/`\from` frame contracts remain trusted. StaDy and E-ACSL provide testing and runtime evidence, not deductive completeness.

Inference: the main threat to a product of agent-written verified Rust is an incorrect product state or frame assumption. Verus can prove a relation over duplicated ghost state while the actual calls alias memory, mutate unmodeled globals, or cross an unverified dependency boundary. Existing Verus notes already cover contracts, snapshots, ownership, and recursive lemmas; VL should reuse these and treat generated relational wrappers as additional proof artifacts. It should not claim soundness for pointer-aliasing cases unless disjointness or interference is explicitly modeled.

## techniques for the catalog

- self-composed wrapper reduction — inline renamed calls, assert the relational predicate, and discharge it with ordinary deductive verification
- effect-separated composition — duplicate globals from frame specifications and relate labeled pre/post states across calls
- pointer-disjoint products — require separated footprints before composing pointer-using calls and carry separation into the logical lemma
- recursive relational induction — control inlining depth so a wrapper proves base and smaller-argument induction cases
- dynamic relation checking — feed generated wrapper assertions to runtime instrumentation and testing-based counterexample search
Checked 2026-10-13: audit record blatter2018static; paper-study comparison complete; gate executed; experiments not rerun
