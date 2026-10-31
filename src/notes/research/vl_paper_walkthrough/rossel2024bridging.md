# Bridging Syntax and Semantics of Lean Expressions in E-Graphs
(authored by agents unless marked 🧑)
Tag: `rossel2024bridging`, [paper](https://arxiv.org/abs/2405.10188)

## scope and result

Rossel and Goens describe an early Lean tactic that sends equational goals and theorems to the `egg` equality-saturation engine, then converts the engine's explanation back into a Lean proof. The engineering problem is that Lean expressions carry dependent types, binders, de Bruijn indices, and definitional equality, whereas e-graphs primarily compare syntax. The paper's result is a collection of partial bridges: dynamic checks prevent several unsound matches, normalization and erasure remove some definitional-equality cases, and e-class substitution implements beta and eta reduction. The abstract states, “Notably, while our techniques are partially unsound, the resulting proof automation remains sound by virtue of Lean’s proof checking.” (p. 1).

A practical user starts with a Lean equality goal and a list of equational theorems, invokes the `egg` tactic, and lets equality saturation search rewrite sequences. The explanation is translated to Lean proof steps and checked by the kernel. The paper states, “Thus, proof automation tools can play fast and loose without compromising soundness of the system, as incorrect proofs will not be accepted by the kernel.” (section 1, p. 2).

## technique: prevent capture with dynamic rewrites

What it is. A rewrite can change a free variable into a bound one, or remove a binder without shifting an escaping free variable. The paper's examples are `?x ↦ (λ ?x) 0` applied to `λ 0̂`, and `λ(λ ?x) 0 ↦ λ ?x` applied to `λ(λ 4̂) 0`; both produce non-equivalent terms. The authors state, “Both of these problems can be avoided by having every rewrite be a dynamic rewrite which checks whether a given matched pattern variable refers to free variables, and if so, shifts them as needed.” (section 2.1, p. 2).

How to apply it. (1) Represent Lean terms with de Bruijn indices. (2) Use an e-class analysis to check whether matched expressions contain free variables. (3) Shift their indices as needed when the rewrite adds or removes binders. The paper assigns efficient free-variable checking to an e-class analysis; it calls shifting on e-class results “rather involved” (section 2.1, p. 2).

Verus form. Inference: a Verus implementation would keep executable term data separate from a ghost model of binder depth, with `requires` stating a well-scoped term and `ensures` stating that a dynamic rewrite preserves denotation. A `proof fn` could prove that the shift operation adjusts every free index by the specified offset. Verus does not automatically provide Lean's dependent expression semantics, so the denotation and scope predicates must be supplied by the developer.

Evidence and limits. The paper gives constructions and no benchmark denominator or soundness theorem for its e-graph transformations. Accepted proofs rely on Lean’s kernel; explanation conversion must produce a proof the kernel accepts. The authors later warn that proof justifications are not yet handled properly, so the method can lose rewrite steps required for reconstruction (section 4, p. 6).

## technique: reject invalid matches under binders

What it is. Syntactically equal indices can denote different variables at different binder depths, and a rewrite pattern can accidentally match a locally bound variable. The paper's examples are `λ(λ ?x) ?x` against `λ(λ 0̂) 0̂`, and `(λ ?x) 1 ↦ ?x` applied to `(λ 0̂) 1`. The latter yields the invalid `0̂`; the rewrite is valid only when `?x` is not bound.

How to apply it. (1) Traverse the trigger pattern while recording binder depth. (2) If one pattern variable maps to a variable but occurs under multiple different binders, reject it as semantically ambiguous. (3) If a variable at depth `d` maps to an index smaller than `d`, reject it as locally bound. These rejection criteria are stated in section 2.2 (p. 3): “If any pattern variable maps to a variable and appears under multiple different binders, we have case (1). If a pattern variable at binder depth 𝑑 maps to a variable whose index is smaller than 𝑑, we have case (2). In either case, the rewrite is aborted.”

Verus form. Inference: define a recursive spec predicate `well_scoped_at(term, depth)` and prove a lemma for the matcher that accepted substitutions preserve scope and free-variable identity. Use ordinary `if` branches in executable matching code; put the universal preservation claim in proof functions. No Verus construct can make an unchecked e-graph match safe by itself.

## technique: constrain bound-variable aliasing with types

What it is. E-graphs intern the same de Bruijn variable node across expressions. Rewriting `0̂` in `λ 0̂ + 1` can therefore rewrite the `0̂` in `λ ¬0̂`, making the latter ill-typed. The proposed mitigation is to add explicit type annotations to every term, making variables of different types syntactically distinct.

Proposed approach. Add explicit type annotations to all terms so variables with different types become syntactically distinct. The authors write, “We believe the problem of bound variable aliasing to be partially solvable by adding explicit type annotations to all terms.” (section 2.3, p. 3). They do not prove that same-typed aliasing is benign and caution that annotations for parameterized types may themselves contain variables. They say their argument may apply only to unparameterized types.

Verus form. Inference: represent explicit type annotations as executable node data so they affect node identity. A ghost type model could support a separate proof about type preservation. Neither step by itself proves Lean’s dependent typing or the authors’ unproved benign-aliasing argument.

## technique: bridge definitional equality

What it is. E-graphs initially equate syntax; Lean's definitional equality also includes zeta, beta, eta, proof irrelevance, and alpha-equivalence effects. The tactic uses three different bridges. First, it fully reduces `let` expressions (zeta normalization) before saturation. Second, it replaces every proof term by a constant `ϵ`, overapproximating proof irrelevance. Third, it adds dynamic beta and eta rewrites that shift indices and substitute under binders.

How to apply it. (1) Normalize all lets before encoding. (2) Erase proof terms to `ϵ`; arrange for proof reconstruction later. (3) For beta, substitute the argument into the function body, shifting free variables in the body down and variables in the argument up by the number of enclosing binders. (4) For eta, remove the final binder only when the bound index is absent from the function's free variables, shifting free variables down by one. (5) E-match the beta or eta pattern, run the corresponding e-class substitution, and union the result with the matched pattern class. The paper gives the formal `subst`, `eta`, and `beta` definitions in section 3 (pp. 4–5). It says, “Notably, we cannot simply implement this function over expressions, but must implement it on e-classes, as e-matching does not yield expressions but only e-classes.” (section 3, p. 4).

Verus form. Inference: model substitution as a pure spec function over an immutable term tree and provide an executable traversal separately. Prove beta/eta side conditions with `requires` (for example, absence from free variables) and preservation with `ensures`. A Verus proof can establish the shift arithmetic for a finite tree, but verifying finite-tree arithmetic alone would not verify the e-graph representation or conversion of explanations into Lean proofs.

## technique: substitute by traversing the e-class graph

The paper compares three designs: add substitution as an explicit constructor and rewrite its semantics; extract one expression, substitute it, and reinsert it; or traverse the target e-class and build an equivalent substituted subgraph. It chooses the third because explicit constructors complicate rules and scaling, while extraction is incomplete. The operational procedure is: recursively visit every e-node in the class and every child class; memoize visited classes to avoid infinite recursion; replace variable nodes according to the substitution; and construct replacement classes bottom-up.

Cycles prevent naive bottom-up construction. The paper relies on the property that every e-graph cycle contains an e-node whose child e-classes root either acyclic subgraphs or subgraphs satisfying the same cycle-breaking property (section 4, pp. 5–6). On a repeated child with no completed substitute, return failure, record the dependent child classes in `C`, and put the e-node on a waiting list. Whenever a new substitute class is created, reconsider waiting nodes whose dependencies are all ready. The paper says, “Thus, by the cycle breaking property, all waiting e-nodes will at some point be substituted.” (section 4, p. 6).

Verus form. Inference: use a finite graph model with a ghost visited set, a decreasing measure for newly resolved dependencies, and a proof that each waiting node eventually becomes ready under the paper's cycle property. Rust ownership can enforce table access discipline, but it does not prove termination or semantic equivalence without those explicit invariants.

## proved, measured, and trusted

The paper describes algorithms, gives illustrative counterexamples and informal arguments, and reports, “Preliminary tests show that these techniques are promising for this use case.” (section 5, p. 6). It supplies no test count, benchmark denominator, runtime, or success percentage. It does not prove that type annotations eliminate aliasing or that erased proofs are always reconstructible. On substitution explanations, it states, “A major caveat to our algorithm is that we do not yet know how to properly handle justifications (used for explanations).” (section 4, p. 6). Lean’s kernel checks generated proofs; the paper does not require trusting the e-graph search or explanation conversion to establish an accepted theorem. Inference: a Verus implementation would need its own correctness argument for these transformations unless it also submits generated proofs to an appropriate trusted checker. Missing rewrite steps can prevent proof reconstruction even when the search finds an equality.

## techniques for the catalog

- dynamic capture check — inspect free variables and shift them before a binder-changing rewrite
- binder-depth match rejection — reject repeated-binder aliases and locally bound substitutions
- typed e-node annotation — include explicit types to reduce bound-variable aliasing
- zeta normalization — eliminate let expressions before equality saturation
- proof erasure — replace proof terms with `ϵ` and reconstruct them during proof generation
- e-class beta/eta substitution — implement binder-aware shifts and substitutions on e-classes
- cycle-breaking traversal — defer cyclic e-nodes until all substituted child classes are available
