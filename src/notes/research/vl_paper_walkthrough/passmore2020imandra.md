# The Imandra Automated Reasoning System (system description)
(authored by agents unless marked 🧑)
Tag: `passmore2020imandra`, [paper](http://arxiv.org/abs/2004.10263v1)

## scope and claims
The paper describes Imandra, a theorem prover whose models are executable OCaml in a pure, terminating fragment. Its central engineering idea is to combine bounded search, counterexamples, and induction in one workflow. The abstract states: “Imandra’s logic is computational, based on a pure subset of OCaml in which all functions are terminating”. It also states that the system combines “a seamless integration of bounded and unbounded verification” with “first-class computable counterexamples”. These are system-design claims; the paper is a description rather than an independent benchmark.

## technique: conservative definitions with termination measures
What it is. Every type, function, and theorem extends the logical world only through a definitional discipline. Types must be well founded and recursive functions must terminate. The termination proof is later reused to synthesize induction principles.

When to use it. Use this when admitting recursive executable models, especially when structural recursion is insufficient. A measure into the ordinals up to ε₀ (the paper's definitional principle is built on them) gives the verifier a decreasing quantity.

How to do it. (1) Write the recursive function in the modelling language. (2) Collect every recursive call and its guard. (3) Supply an ordinal valued measure, either inferred for structural recursion, with `@@adm` for a lexicographic order, or with `@@measure`. (4) Prove that every guarded call maps to a strictly smaller ordinal. The paper's Ackermann example uses `[@@adm m,n]`, mapping `ack m n` to `m · ω + n`; its `left_pad` example uses `[@@measure Ordinal.of_int (n − List.length xs)]`.

Verus form. Inference: Verus Rust functions can carry executable code plus `requires` and `ensures`; a recursive function can be accompanied by a `decreases` clause when supported. The ordinal encoding and automatic mining described here are Imandra-specific, so a Verus port would define a `spec fn` measure over mathematical integers or a datatype and prove decrease at each recursive call. The Rust function remains executable; proof-only lemmas remain erased.

Evidence and limits. Inference: The evidence is the two worked definitions, not a measured success rate. The paper assumes the function's domain and measure are represented in its logic and that the termination obligations are provable. A termination proof does not by itself prove the application's specification.

Quote: “To prove a function f terminating, an ordinal-valued measure is required.” (Section 2.1, p. 3)

## technique: ground first-order specialization
What it is. Higher-order and polymorphic definitions are transformed, for the conjecture being checked, into ground monomorphic first-order recursive definitions. Lambda lifting, specialization, and monomorphization expose a solver-friendly representation.

How to do it. Start with a theorem such as list-map length preservation. Lift the anonymous function to a named function, specialize `map` and `length` to integer lists, and state the resulting theorem over the specialized datatype. The paper's code shape has `map_lambda0`, `map1`, and `length_int`, ending in `length_int (map1 l) = length_int l`.

Verus form. Inference: write the Rust generic function normally, then state a specialized `ensures` clause or proof lemma for the concrete element type. Verus does not automatically promise Imandra's whole-program monomorphization; explicit helper specs and extensional lemmas may be needed.

Quote: “These transformations include lambda lifting, specialization and monomorphization.” (Section 2.2, p. 4)

## technique: bounded recursive unrolling with reachability literals
What it is. The default `verify` strategy is bounded symbolic model checking. Recursive calls begin uninterpreted. Boolean reachability literals prevent models from using an unexpanded call; an SMT refinement loop expands calls selected from unsatisfiable cores.

How to do it. (1) Build the set `q` of calls occurring in the goal and conjoin each reachability atom. (2) Ask the SMT solver for satisfiability while assuming every atom in `q` is false. (3) If SAT, return a counterexample model. (4) If UNSAT with an empty core, return UNSAT. The paper does not say more about what this result means; Inference: an empty core means the formula is unsatisfiable without assuming any call is unexpanded. (5) Otherwise select a call from the unsat core fairly, set its reachability literal true, instantiate its body, and add guarded literals for its subcalls. (6) Repeat until SAT, an empty core, or a maximal expansion bound. The algorithm in Figure 2 uses `b[f(t)]`, `subcalls_of_call`, and assertions of the form `b[f(t)] ∧ p_i ⇒ a_i`.

When to use it. Use unrolling first to expose wrong models and concrete counterexamples before investing in induction. The authors say they “almost always attack a goal by unrolling first”.

Verus form. Inference: Verus normally proves a loop or recursion with invariants and `decreases`, not with a built-in reachability-literal queue. The analogous workflow is to run bounded tests or a finite proof lemma first, then state the invariant and inductive proof in Verus. A counterexample from a test is evidence for a bug, not a Verus proof.

Evidence and limits. The paper gives the algorithm and two function-template examples (factorial and an `f` calling `g` and `h`), but no corpus denominator or timing table. Inference: when the loop stops at the maximal number of steps without a model or an empty core, nothing is established beyond the explored expansions. Fair call selection and a maximal step limit are assumptions of the procedure.

Quote: “A refinement loop, based on extraction of unsat-cores from this set of assumptions, then expands (interprets) the function calls one by one until a model is found, an empty unsat-core is obtained, or a maximal number of steps is reached.” (Section 3, p. 4)

## technique: inductive waterfall and rule classes
What it is. Unbounded proofs use a Boyer–Moore-inspired waterfall: symbolic execution, conditional rewriting, forward chaining, generalization, and synthesized goal-specific induction. Proved lemmas can be installed as rewrite, forward-chaining, elimination, or generalization rules.

How to do it. (1) Iterate on the model and conjecture until all bounded counterexamples have been eliminated; only then try induction. (2) Simplify with previously proved lemmas, installed as rewrite, forward-chaining, elimination or generalization rules; the paper hopes that with good rules (especially rewrite rules) most useful theorems are provable by simplification alone, with induction applied as a last resort. (3) Otherwise the later waterfall moves prepare the simplified conjecture for induction (for example by generalization). (4) Synthesize a goal-specific induction principle, using data computed from the function's termination proof. The paper also says counterexamples act as a filter on heuristic waterfall steps such as generalization. It does not describe the base and step case handling.

Verus form. Inference: rewrite and forward-chaining lemmas correspond to `proof fn` lemmas with `ensures`; induction is expressed by recursive proof functions or loop invariants plus `decreases`. Verus has no Imandra waterfall or automatic rule-class installation, so rule selection and induction hypotheses must be made explicit.

Quote: “This combines techniques such as symbolic execution, lemma-based conditional rewriting, forward-chaining, generalization and the automatic synthesis of goal-specific induction principles.” (Section 4, p. 6)

## what is proved, trusted, and measured
The paper states that the definitional principle is “designed to maintain the consistency of Imandra’s current logical theory through a discipline of conservative extensions”; it gives no consistency or soundness proof. Its examples show termination annotations, specialization, the unrolling algorithm, and a diagram of the waterfall. It reports industrial use and names Goldman Sachs, Itiviti, and OneChronos, but gives no number of verified projects, theorem counts, error rates, or denominator.

## techniques for the catalog
- termination measures: require an ordinal or other well-founded decrease for every recursive call and reuse it for induction
- specialization: lower polymorphic higher-order models to ground first-order definitions before solving
- reachability unrolling: use guarded recursive expansion and unsat-core selection for bounded proofs and counterexamples
- inductive waterfall: simplify with classified lemmas, generalize, and synthesize a goal-specific induction principle
