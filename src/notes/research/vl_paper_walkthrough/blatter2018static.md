# Static and Dynamic Verification of Relational Properties on Self-Composed C Code
(authored by agents unless marked 🧑)
Tag: `blatter2018static`, [paper](http://arxiv.org/abs/1801.06876v2)
## what the paper establishes

The paper presents RPP, a Frama-C plugin that turns relational specifications over multiple calls into ordinary ACSL code that WP can prove, while also enabling runtime checking and testing-based counterexamples. Relational properties include monotonicity, non-interference, comparator laws, and encrypt/decrypt round trips. The problem is that ordinary Hoare contracts describe one call: “Function contracts allow specifying the behavior of a single function call … However, it is not possible to specify relational properties, that relate several function calls.” (Section 2, PDF p. 4).

RPP's central reduction is self-composition. A generated wrapper executes renamed copies of the calls, records return values and relevant states, and asserts the relational predicate. The paper reports support for pure, side-effecting, pointer-using, and recursive C functions. It also generates an axiomatic logical counterpart so a proved relation can be reused as a hypothesis in later proofs.

## technique 1: preprocess a relational clause into a self-composed wrapper

What it is: A relational clause quantifies inputs, names calls, and states a predicate over their results or states. RPP expands the clause into a wrapper whose calls have renamed locals and whose final assertion is an ordinary ACSL assertion.

How to apply it (Sections 2.1–2.3, PDF pp. 4–7):

1. Attach a `relational` clause to a function contract. In the original syntax, use `\call(f,args)` to denote the value returned by a call (Section 2.1). In the extended syntax (Section 3.1), declare universally quantified variables and a `\callset` of calls with identifiers; `\callpure` replaces `\call` for pure functions.
2. Inline each call into a generated wrapper, renaming local variables so executions do not interfere.
3. Save each return value in a fresh local and translate the relational predicate into an assertion over those locals. The paper's max/abs example generates `ret_var_1` and `ret_var_2`, then asserts the max identity (Figure 1, p. 5).
4. Run standard WP on the wrapper. The paper states that the proof of the generated function and annotations "implies that the relational property holds for the original code" (Section 2); the paper cites self-composition [3] for this and gives no separate soundness proof.
5. Generate an ACSL axiomatic with a logical function or predicate and a lemma expressing the relation. Add postconditions linking each C function to its logical counterpart so later proof obligations can use the relation. For pure functions this link is possible only because `max` and `abs` read no global memory (Section 2.2).

The paper's soundness concern is that the generated axiomatic must not make the specification inconsistent. Because the wrapper inlines the function bodies, “the lemma of the axiomatic cannot be used to prove the assert annotation inside the wrapper.” (Section 2.3, PDF p. 7). Inference: this is the boundary between proving the implementation and reusing the result.

Verus form: Inference: write a proof wrapper that calls the Rust function twice on ghost or duplicated inputs, then prove a postcondition relating the two results. Use `requires`/`ensures`, `spec fn` relations, and proof functions/lemmas; the wrapper's calls must be executable or ghost-compatible according to the intended use. Verus has no `relational` clause or automatic self-composition, so an external generator or handwritten wrapper is needed. Inference: do not use a `proof fn` as runtime code; use executable functions for runtime wrappers and lemmas for the relational theorem.

Evidence and limits: The internal benchmark has ten relation rows, including monotonicity, nested calls, decrypt/encrypt, a map/reduce max property, matrix identities over functions with loops, and a median symmetry property (Figure 9, PDF p. 14). The table has columns Specified/Generated, Verified, Used, Side effect, Loop, Recursive; all ten rows are marked specified/generated and verified, and rows 3, 4, 6, 7, 8 and 10 are not marked used. Inference: it is a capability matrix over hand-picked examples, not a rate over a random sample. The Conclusion (Section 7) notes that for large function bodies or many functions the generated wrapper "may explode"; on the comparator benchmark the wrapper for PokerHand was out of reach for WP until the function was rewritten more modularly (Section 5.2).

## technique 2: extend self-composition to global side effects

What it is: Side effects require separate memory states for each composed call. RPP's syntax names pre- and post-states with `Pre_id` and `Post_id` labels and refers to them with `\at`. It duplicates only globals in the functions' `assigns ... \from ...` footprints.

Procedure (Sections 3.1–3.2, PDF pp. 7–9):

1. For each call in `\callset`, assign an identifier and expose `\callresult(id)`, `Pre_id`, and `Post_id` in the relational predicate.
2. Require each involved function to have ACSL `assigns` clauses including `\from` components; the paper says this ensures only the globals accessed (read or written) are duplicated.
3. Generate one copy of every accessed global per composed call, and rewrite each inlined body to use its copy.
4. State the relation over `\at(global,Pre_id)` and `\at(global,Post_id)` values in the wrapper assertion.
5. Generate a logical predicate with pre/post values as arguments and an ACSL lemma quantifying all relevant global states. Link the predicate to the C function with an `ensures` clause.

The paper gives the reason for duplication: “each function call must operate on its own memory state, separated from the other calls in order for self-composition to work.” (Section 3.2, PDF p. 8). It also notes that logic functions are always pure and so cannot characterize side effects; the generated predicate therefore takes the relevant program states as parameters, inferred from the `assigns ... \from ...` clauses.

Verus form: Inference: model each composed call with a separate ghost snapshot or separate state object, and relate pre/post ghost fields with `old(...)` and `ensures`. Use explicit state parameters in a `spec fn` relation; executable global mutation can be wrapped in a state-passing function. Rust's ownership can isolate state objects, but aliasing through shared references requires additional proof predicates. Inference: `assigns \from` information corresponds to a manually maintained frame specification; Verus does not infer it for arbitrary external code.

Evidence: Figure 5's `h` example (PDF p. 10) shows the generated code for a monotonicity relation on a global `y`, with duplicates `y_id1` and `y_id2` and an assertion over the ordered pre/post values. The paper gives this as an illustration, not a measured result. Inference: since duplication relies on the `assigns ... \from ...` clauses, the method assumes those effect specifications are accurate.

## technique 3: enforce pointer separation in composed calls

What it is: The paper says, citing [3], that self-composition works if the memory footprint of each call is separated from the others. RPP adds `\separated` preconditions for wrapper arguments and separation assumptions to the generated logical lemma.

Steps (Section 3.3, PDF pp. 9–11):

1. Read the function's `assigns *p \from *p` or equivalent footprint to identify pointer locations read or written.
2. Add a wrapper `requires \separated(p_id1,p_id2)` for the pointer copies used by the composed calls.
3. Add corresponding separation hypotheses over universally quantified pointers in the axiomatic lemma.
4. Give the generated logical predicate explicit pre/post logic labels and a `reads` clause for its footprint.
5. Prove the relational assertion using the two independent pointer states.

The paper's pointer example is a function `k` that increments `*y`, with a monotonicity relation between two calls, whose wrapper requires the two pointers to be separated (Figure 6, PDF p. 11). It states the limitation directly: “Support of properties with pointer aliasing is left as future work.” (Section 3.3, PDF p. 11).

Verus form: Inference: use distinct owned references or ghost disjointness predicates as wrapper preconditions, and prove that each call's footprint is disjoint before composing them. `requires` can state disjointness; `ensures` can relate post-state values. When aliasing is allowed, this technique does not carry over unchanged: the relation must model interference or use a different product construction.

## technique 4: handle recursive calls with bounded inlining and induction

What it is: RPP adds an optional inlining depth to `\callpure` and `\call` terms. A recursive relational property can inline one call while keeping the call on the smaller argument as a call in the wrapper, so the relation is proved as an induction step.

Procedure (Section 4, PDF pp. 11–13):

1. State a base relation for the terminating case, such as `x ≤ 1 ⇒ fact(x)=1`.
2. State an induction relation for `x > 1`, relating `fact(x)` to `fact(x−1)*x`.
3. In the wrapper, inline the outer call to the chosen depth and retain the smaller recursive call at depth zero.
4. Assert the relation between the inlined result and the retained call's result. In the pure case (Figure 7), the paper's reason for keeping the second call is that `fact` is pure and reads nothing from the global environment, so that call returns the same value as the one obtained by inlining.
5. For side-effecting recursion (Figure 8), logic function equality cannot be used; instead inline both calls (depth 1 on each `\call`) and use the relational property as an induction hypothesis. The paper assumes the function always terminates, so that the call in the wrapper is on strictly smaller arguments.

The paper explains the depth semantics: “The default value of 1 … means that we inline the body of the function once … When this parameter is set to 0 … we keep the call as such in the wrapper.” (Section 4, PDF p. 12).

Verus form: Inference: express the base and recursive cases as `ensures` relations and prove the recursive theorem in a `proof fn`/lemma with a `decreases` measure on the executable function. Use ghost snapshots for side effects. Verus's termination checker and recursive proof structure replace RPP's wrapper depth, but the relational invariant still must be supplied.

Evidence: in Figure 9 (PDF p. 14) the two rows marked Recursive (rows 2 and 9, the factorial-style relation and a linearity relation) are marked specified/generated, verified and used. The paper does not report a percentage denominator for this table. Inference: a recursive wrapper can become large, and side effects require accurate frame state.

## technique 5: reuse the relation for runtime checking and counterexamples

What it is: Because RPP produces ordinary ACSL assertions, E-ACSL can instrument them for runtime assertion checking and StaDy can search for inputs that falsify the wrapper assertion when WP cannot prove it.

Steps (Section 6, PDF pp. 15–16):

1. Run WP on the generated wrapper. If a relational property is not proved, retain its final assertion.
2. Use StaDy to search for an input vector that falsifies that assertion, with a 30-second timeout per case in the comparator experiment.
3. Use E-ACSL to compile the relational annotations into runtime checks and execute each generated test input.
4. Inference: treat a found falsifying input as a counterexample; treat a successful run only as evidence for that input, not a proof.

The paper reports that “StaDy was able to find counterexamples for almost all unproven properties.” (Section 6.1, PDF p. 15). The comparator table (Figure 10, PDF p. 16) has 34 benchmark rows, each with properties P1–P3, so 102 property cells. By my count of the table, 65 cells are proved by WP and 37 are not; of the 37, StaDy found a counterexample for 34, timed out for 1 (also unresolved after a 60-minute timeout), and could not handle the translation for 2 (the paper: "Symbol ✐ denotes two cases where the code translation uses features that are currently not yet supported by S TA DY"). Some examples needed modifications for StaDy: adding bodies for unimplemented functions and reducing input space (for example, limiting array size). Inference: these are counts over a fixed benchmark, not a claim of universal completeness. The paper also says the E-ACSL runs on the StaDy-generated inputs confirmed each counterexample violates the property (Section 6.2).

Verus form: Inference: use Verus to prove the relational assertion when possible, and an executable Rust test harness to search for violating inputs when proof fails. Runtime checks can call executable predicates, but Verus specifications are not automatically executable; keep the checked predicate duplicated in a trusted runtime form and test equivalence where practical.

## what is proved, measured, and trusted

The paper's claim is that a successful proof of the generated wrapper implies the relational property for the original code; it argues this via self-composition [3] and does not give a mechanized or formal soundness proof. Experiments cover ten internal relation rows (Figure 9) and a comparator benchmark translated from Java (Section 5.2), where Figure 10 has 34 rows and reports proof and StaDy outcomes per property P1–P3. The paper reports that the results are similar to [19] except for PokerHand. Inference: WP's proof obligations, Frama-C's ACSL semantics, the generated wrappers, solver behavior, and the `assigns`/`\from` frame contracts remain trusted. StaDy and E-ACSL give testing and runtime evidence, not proof.

Inference: the main threat to a product of agent-written verified Rust is an incorrect product state or frame assumption. Verus can prove a relation over duplicated ghost state while the actual calls alias memory, mutate unmodeled globals, or cross an unverified dependency boundary. Existing Verus notes already cover contracts, snapshots, ownership, and recursive lemmas; VL should reuse these and treat generated relational wrappers as additional proof artifacts. It should not claim soundness for pointer-aliasing cases unless disjointness or interference is explicitly modeled.

## techniques for the catalog

- self-composed wrapper reduction — inline renamed calls, assert the relational predicate, and discharge it with ordinary deductive verification
- effect-separated composition — duplicate globals from frame specifications and relate labeled pre/post states across calls
- pointer-disjoint products — require separated footprints before composing pointer-using calls and carry separation into the logical lemma
- recursive relational induction — control inlining depth so a wrapper proves base and smaller-argument induction cases
- dynamic relation checking — feed generated wrapper assertions to runtime instrumentation and testing-based counterexample search
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "It should be noted that the memory separation assumption makes the tool verify relational properties without pointer aliasing."): I read the whole paper text and checked all six quotations word for word, the section references, the technique steps against Sections 2-4 and 6, Figure 9 and Figure 10 (row and cell counts recomputed from the table text). I changed page references to PDF pages (they were off by one or more), the Figure 10 row count (34, not 32), several steps that went beyond the paper (the induction-hypothesis step for pure recursion, "only when" disjoint, "verifies" for Figure 5, soundness stated as proved), and marked my own conclusions "Inference:". Tag and arXiv link kept. I did not check the cited works, the Frama-C or Verus claims, or the figure code listings character by character.
