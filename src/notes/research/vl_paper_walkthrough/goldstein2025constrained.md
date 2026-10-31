# The Search for Constrained Random Generators
(authored by agents unless marked 🧑)
Tag: `goldstein2026constrained`, [paper](https://doi.org/10.1145/3808329)

## problem and guarantee
Property-based testing needs inputs satisfying a precondition. Palamedes searches offline for a generator with exactly the satisfying values as its support. Runtime backtracking is avoided when synthesis and optimization yield an assume-free generator; some synthesized generators still backtrack (sections 3.1 and 5.2, PDF pages 7 and 16). The authors state: “The resulting generators are correct by construction, since the search constructs the proof as well.” (section 1, PDF page 3). Soundness means every generated value satisfies the predicate; completeness means every satisfying value belongs to the generator’s support (Definition 3.2, PDF page 7). This does not guarantee a useful or uniform probability distribution: “It is important to note that our synthesis procedure is guaranteed to produce generators with the correct support (i.e., the right set of values), but not necessarily optimal distributions.” (section 1, PDF page 3).

Inference: this could help generate Verus test inputs satisfying `requires` predicates. Such generation would not prove the Rust function’s postcondition; Verus would still need to verify the function.

## technique 1: deductive synthesis from generator combinators
Palamedes represents generators as an inductive datatype with `pure`, `pick`, `bind`, `indexed`, and `assume` constructors (Figure 7, PDF page 6). It defines each constructor’s denotational support, then searches backward from a predicate using proof rules (Definition 3.1 and section 3.2, PDF pages 6–8).

The core procedure is:
1. start a goal for a correct generator of the desired predicate (section 2, PDF page 4)
2. use `pure` for equality to a constant and `pick` for disjunction (Figure 3, PDF page 4)
3. use `bind` for an existential dependency: generate an intermediate value, then generate a result conditioned on it (Figure 4, PDF page 4)
4. use `S-Convert` and Lean simplification to match logically equivalent predicates to synthesis rules (section 3.2, PDF page 8)
5. use available generators, function introduction, uncurrying, and case splitting for context-dependent goals (Figure 9, PDF page 8)

For example, the predicate `a = 1 ∨ a = 2` becomes `pick (pure 1) (pure 2)` (section 2, PDF page 4). The bind rule combines a generator for `j` and a continuation into a generator for values satisfying `∃j, P j ∧ Q j a` (Figure 4, PDF page 4).

Inference: a Verus adaptation could define executable Rust generators and a support semantics, with proof lemmas establishing soundness and completeness. The paper implements this architecture in Lean, not Verus.

## technique 2: base generators with checked preconditions
The library supplies reusable generators and support proofs. `choose lo hi` generates natural numbers within inclusive bounds when `lo ≤ hi`; `elements xs` generates members of a nonempty list (Lemmas 3.1 and 3.2, PDF page 9). Partial variants wrap these prerequisites in `assume`. Their support is still correct for the target predicate, but an unsatisfied prerequisite causes runtime failure (section 3.3, PDF page 9).

The authors explain: “Rather than ask the synthesis process to synthesize generators for arbitrary predicates “all the way down,” we can provide it with a library of building blocks that it can assemble to build more complex generators.” (section 3.3, PDF page 9).

To extend this library:
1. identify a recurring predicate fragment, such as an interval or list membership
2. supply a generator and a support lemma
3. expose a synthesis rule with the necessary side condition
4. provide an `assume`-wrapped rule when that condition cannot be established statically

These steps follow the range and membership examples in section 3.3 and Figure 10 (PDF page 9).

Inference: executable Verus generators could use `requires` for valid bounds or nonempty collections and `ensures` for output validity. Exact support and coverage would need additional mathematical definitions and proofs; an output contract alone would establish only soundness.

## technique 3: optimize away backtracking
An `assume` can preserve correct support while causing failure after an impossible branch is chosen. Palamedes uses six support-preserving rewrites: eliminating a bind on `pure`, reassociating binds, moving assumptions through binds, and lifting assumptions out of choices (Figure 11, PDF page 10). Moving an assumption out of a bind continuation requires that its condition not depend on the bound value. Lemma 3.3 states: “Rules (1)–(6) do not change the support of the generator.” (PDF page 10).

The implementation follows this sequence:
1. synthesize a correct generator, possibly containing `assume` (section 5.2, PDF page 15)
2. rewrite its AST using the optimization rules (sections 3.4 and 5.2, PDF pages 10 and 15–16)
3. use proof automation to establish equivalence between this optimized generator and its original version (section 5.2, PDF page 16)
4. optionally prove assume-freedom; warn if the check fails (section 5.2, PDF page 16)

For BSTs, the optimizer lifts the range prerequisite out of a choice into a conditional, avoiding failure from choosing a node when the range is empty (section 3.4, PDF page 10). Optimization is incomplete: “These rules are not complete: they may still leave assumes in the generator.” (section 3.4, PDF page 10).

Inference: a Verus adaptation could prove equivalent support for each rewrite. The paper’s meta-level optimizer is not proved correct once and for all inside Lean; it produces an equivalence proof for each optimized result (section 5.2, PDF page 16).

## technique 4: recursive predicates through folds and unfolds
Palamedes avoids synthesizing arbitrary recursive calls directly. It rewrites predicates using folds, which collapse data structures into results, and synthesizes generators using unfolds, which expand seeds into structures (sections 2 and 4, PDF pages 5 and 10–15). For BSTs, `Tree.unfold` chooses a leaf step or a node step carrying new seeds for the left and right subtrees (Figure 5, PDF page 5).

The authors state: “The key takeaway is that, rather than give the synthesizer direct access to indexed and recursion, we synthesize recursive generators through higher-level rules.” (section 4, PDF page 10). For lists, Lemma 4.1 relates each unfold step’s support to the inverse of a fold step (PDF page 13). Optional folds encode failure that propagates through the whole fold; optional accumulations additionally pass state forward through the structure (sections 4.1–4.3, PDF pages 11–14).

The normalization pipeline is:
1. express the predicate as a conjunction of equations between recursive functions’ results and target values
2. rewrite each recursive function as a fold using its base and recursive equations
3. rewrite each fold as an optional accumulation, according to its return type
4. combine the separate accumulations by tupling their state and collector values
5. apply `S-List-Unfold` and recursively synthesize the step generator

This is the workflow in section 4.5 (PDF pages 14–15); Figure 12 is on PDF page 10 and `S-List-Unfold` is on PDF page 14. Tupling combines constraints on the same structure into one pass (section 4.4, PDF page 14). The pipeline generalizes to recursive data types composed of products and sums; the implementation supplies it for lists, binary trees, STLC types, STLC terms, and stacks (section 4.5, PDF page 15).

The `indexed` constructor represents fuel-indexed families. Its support definition requires monotonicity: increasing fuel cannot remove a previously producible value. Synthesis enforces this condition by construction (Definition 3.1, PDF pages 6–7). The sampling interpreter retries exhausted fuel with exponentially increasing amounts (section 5.2, PDF page 16).

Inference: a Verus adaptation would need support definitions, fold/unfold libraries, and proofs connecting recursive predicates to generated structures. This is proposed reuse, not existing Verus support demonstrated by the paper.

## technique 5: Lean proof-search implementation
Palamedes is a Lean library invoked with `generator_search (fun t ⇒ isBST t (lo, hi) = true)` (section 5.1, PDF page 15). It runs synthesis with Aesop best-first proof search, AST optimization, and an optional assume-freedom proof (section 5.2, PDF pages 15–16). Aesop may backtrack during offline proof search; this is separate from any backtracking in the resulting generator. The authors state: “First, the proofs produced by our deductive synthesis procedure can be checked by Lean’s core checker; this ensures that, even if there were mistakes in the synthesis procedure, any successfully synthesized generator is guaranteed to produce exactly the desired set of values.” (section 1, PDF page 3).

Users can keep the tactic call or render editable code with `generator_search?`. Adding weights or size bounds manually may change distributions or make the generator incomplete. The sampling interpreter retries failures and exhausted fuel (section 5.2, PDF page 16).

## evidence, limits, and trusted parts
The Main suite contains 32 benchmarks. Experiments used an M1 MacBook Pro with eight cores and 16 GB memory, Lean 4.21.0, a 900-second timeout, and 30-run averages for Palamedes (section 6, PDF pages 16–17). The authors report: “Palamedes finds generators for 80% of the Main benchmarks in under 3 seconds.” (section 6.1, PDF page 17). It fails `isUnique` and `hasDuplicates` because it cannot automate conversion to optional accumulations. Appendix E.1 reports synthesis times of 1.53 seconds for BSTs and 50.4 seconds for `isRBT` (PDF page 36). These are synthesis times, not measurements of sampling performance.

Cobb solves 13/32 benchmarks with minimal sketches and 15/32 with maximal sketches out of the box; 20 person-hours of adaptation add three working benchmarks with both sketch forms (section 6.1, PDF page 17). QuickChick generates code quickly from inductive specifications. All 32 benchmarks require inductive forms; ten require manually invoking merging, one requires constraint reordering, and one existential benchmark falls outside its automation (section 6.2, PDF page 18; Appendix E.3, PDF page 38).

The qualitative handwritten-generator comparison finds the same generation algorithm and time complexity for STLC, but explicitly limits the performance conclusion: “this does not necessarily mean that synthesized generators are as fast to run (e.g., due to synthesis artifacts or tuning issues).” (section 6.3, PDF page 19).

The paper contains a count inconsistency: section 5.2 says “All but three generators we synthesize in our evaluation are assume-free,” whereas Appendix E.1 says “The four generators below the line are not”. The table lists the unrestricted-bounds range generator, AVL, `isRBTNoBST`, and `isRBT` below that line (PDF pages 16 and 36). The range generator retains an `assume` because no enclosing choice permits its removal.

The approach is partial and handles recursive predicates expressible through first- and second-order primitive recursion; normalization or missing base generators can prevent synthesis. It has no built-in sizing or distribution optimization (section 7, PDF page 19). A nested `pick` example assigns four valid values probabilities 0.5, 0.25, 0.125, and 0.125 under equal-probability branch choices (section 9, PDF page 21).

## techniques for the catalog
- support-exact generator synthesis: construct a generator whose denotational support is exactly the predicate’s satisfying set
- deductive combinator rules: synthesize `pure`, `pick`, `bind`, available generators, and case splits by backward proof search
- certified base generators: package range and membership generators with support lemmas and synthesis rules
- assumption optimization: move prerequisite checks before choices while proving support preservation
- fold/unfold recursion: normalize recursive predicates to optional accumulations, tuple constraints, and synthesize unfold steps
- proof-producing tactic pipeline: combine best-first proof search, AST optimization, and checked correctness proofs
- distribution separation: establish support first; distribution tuning is proposed future work
