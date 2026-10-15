# An Overview of the HFL Model Checking Project
(authored by agents unless marked 🧑)
Tag: `kobayashi2021hfl`, [paper](http://arxiv.org/abs/2109.04629v1)

## scope and contribution

Kobayashi surveys a project that verifies higher-order programs by reducing them to higher-order fixpoint logic with integer arithmetic, HFL(Z). The article says: “HFL is a higher-order extension of the modal µ-calculus and is strictly more expressive than the modal µ-calculus, but the HFL model checking problem for finite state systems remains decidable.” HFL(Z) extends the logic with integer expressions and can express higher-order predicates and alternating least/greatest fixpoints. The project uses higher-order model checkers, refinement-type inference, and constrained Horn-clause (CHC) solvers as backends.

Inference: The useful product lesson is a staged verification pipeline: compile higher-order control and temporal behavior to a logical formula, simplify or abstract it, then choose a backend whose completeness and precision fit the property. The article is a survey, not a Verus implementation or a single end-to-end benchmark.

## technique 1: encode higher-order behavior as HFL(Z)

What it is. HFL formulas include disjunction/conjunction, modal operators `⟨a⟩` and `[a]`, least (`µ`) and greatest (`ν`) fixpoints, lambda abstraction/application, and integer constraints. The syntax in section 2.1 (PDF page 1) includes `µxκ.ϕ`, `νxκ.ϕ`, `ϕ1 ϕ2`, `λxτ.ϕ`, `ϕ e`, and `e1 ≤ e2`. A type is `int` or a predicate type `κ`; predicate types are built from `o` and arrows.

How to apply it.
1. Choose a formula type whose order is high enough for the program's higher-order functions; the paper defines `ord(o)=ord(int)=0` and `ord(τ→κ)=max(ord(τ)+1,ord(κ))` (section 2.1, page 3).
2. Encode state-machine actions with modal operators: `⟨a⟩ϕ` means some `a` transition leads to `ϕ`, while `[a]ϕ` means every `a` transition does (section 2.1).
3. Encode recursive behavior with `µ` for least fixpoints and `ν` for greatest fixpoints (section 2.1).
4. Encode integer guards and arithmetic with integer expressions and inequalities; quantifiers can be expressed by fixpoint iteration. For example, the paper's `νx.λn.ϕ(n) ∨ x(n+1)` at zero denotes `∃x ≥ 0.ϕ(x)` (Example 1, page 2).
5. Check `M |= ϕ` on a finite labeled transition system, or validity on the one-state transition-free model `M0` (section 2.1, page 3).

The paper warns about the boundary: “For HFL(Z), both the model and validity checking problems are undecidable due to Gödel’s incompleteness theorem” (section 2.1, page 3). Pure HFL model checking is decidable and order-k complete in k-EXPTIME, but adding integer arithmetic and expressive fixpoints loses that guarantee.

Verus form. Inference: A Verus product could generate a ghost transition-system specification and use `spec fn`s for action predicates and recursive relations, while executable Rust remains separately verified against contracts. Verus does not provide HFL modal/fixpoint syntax, so this is an external intermediate representation or proof-planning language. Inference: a Verus `proof fn` can establish individual transition obligations, but the article's HFL solver is not a Verus backend.

Evidence and limits. Examples 1 and 2 show semantic expansions for existential counting and `a^n b^n c`-style traces. There is no aggregate success denominator in this survey. Inference: users must bound or abstract integer domains before expecting a terminating automated procedure.

## technique 2: convert CHCs to HFL(Z) and back

What it is. HFL(Z) validity generalizes CHC satisfiability by allowing higher-order predicates and fixpoint alternation. Section 2.2 gives a multiplication CHC system and converts its recursive clauses to a least-fixpoint HFL formula. For the clauses defining `mult`, the least predicate is:

```
µu.λ(x,y,r).(y = 0 ∧ r = 0) ∨ ∃s.(y ≠ 0 ∧ u(x,y−1,s) ∧ r = s+x)
```

The safety goal becomes a universal implication over that predicate, then its de Morgan dual is a `ν`-only formula (section 2.2, PDF pages 3–4).

How to apply it.
1. Represent each recursive CHC predicate by a fixpoint variable whose arguments are the clause variables (section 2.2).
2. Put base and recursive clause bodies into the least fixpoint (`µ`) that denotes the smallest relation satisfying them (section 2.2).
3. Encode the goal clause as an implication from the predicate and constraints to `false` or the required postcondition (section 2.2).
4. Dualize the formula with de Morgan laws when a `ν`-only backend is needed (section 2.2).
5. Conversely, restrict HFL fixpoint variable types to `int → … → int → o` and translate first-order `ν` formulas to CHCs (section 2.2).

The article's claim is precise: “In this sense, the HFL(Z) validity checking problem can be considered a generalization of the CHC satisfiability problem, where higher-order predicates and fixpoint alternations between µ and ν are allowed.”

Verus form. Inference: A Verus workflow can use CHCs as an off-line abstraction of `requires`/`ensures` and recursive lemmas, then import discovered invariants as Verus proof lemmas. CHC predicates are not callable runtime functions; they correspond to ghost relations. Inference: this can help synthesize contracts but does not replace checking the Rust implementation against them.

Evidence and limits. The multiplication example has a concrete CHC model and later a satisfying model `X(z,y) := z ≤ 0 ∧ z ≤ y` for the transformed goal (section 4.1, PDF pages 7–8). The survey reports no denominator for all project cases. Higher-order predicates and fixpoint alternation are more expressive than ordinary CHCs but make validity undecidable in general.

## technique 3: compile program protocols and recursion to HFL model checking

What it is. Reverse the usual model-checking roles: compile the program to a characteristic HFL(Z) formula and represent the desired protocol as a finite labeled transition system. For a file program `open; read; read; close`, the read-only protocol automaton accepts `read* · close · end`, and the generated formula is `⟨read⟩⟨read⟩⟨close⟩⟨end⟩true` (section 3, PDF page 4).

How to apply it.
1. Build a finite protocol LTS whose transitions are allowed operations and whose terminal state accepts `end` (section 3).
2. Replace each program action by the matching modal operator; replace termination by the `end` modality (section 3).
3. Translate conditionals into conjunctions of guarded implications, preserving both branches (section 3).
4. Translate recursive functions into fixpoints. In the paper's CPS file example, recursion becomes `µ f.λ n.λ k.(n ≤ 0 ⇒ ⟨close⟩k) ∧ (n > 0 ⇒ ⟨read⟩(f(n−1)k))` (section 3, page 5).
5. Check the resulting formula on the protocol LTS. Using `µ` for this recursion also requires termination, as the paper explains (section 3).

Verus form. Inference: Model a resource protocol as a ghost state machine and give each Rust operation a contract that advances the state only along allowed transitions. A `proof fn` can show a sequence of calls preserves the protocol; executable functions perform the I/O. Inference: HFL's higher-order continuations are not a Verus construct, so the translation must be specialized to the API's state-machine representation.

Evidence and limits. The article gives the file protocol and recursive example but no measured corpus. General translations exist for linear-time properties and arbitrary omega-regular properties, with product constructions (section 3). Inference: the finite protocol assumption is a limitation for unbounded resources or data-dependent protocols unless an abstraction is supplied.

## technique 4: remove least fixpoints by bounded unfolding

What it is. Convert a `µ` formula (used for liveness/termination) into a `ν` formula with a bound on unfoldings, then solve the resulting safety-style problem. Section 4.1 uses the fixpoint theorem: for any natural `n`, `ϕ^n(false) ⇒ µx.ϕ(x)`. It rewrites the bounded unfolding as a `ν` formula with a counter:

```
ψ := ∀u ≥ n.(νx'.λi.(i > 0 ∧ ϕ(x'(i−1))))u
```

How to apply it.
1. Identify a `µx.ϕ(x)` whose validity represents termination or another liveness fact (section 4.1).
2. Select an unfolding bound `n`; the bound may depend on free variables (Example 3, page 7).
3. Replace the bounded `µ` unfolding with the `ν` counter formula `ψ` (section 4.1).
4. Increase `n` iteratively to strengthen the approximation (section 4.1).
5. For first-order formulas, translate the resulting `νHFL(Z)` formula to CHCs and solve them (section 4.1).

The paper explicitly qualifies the result: “Due to underapproximation in various steps … the procedure shown in Figure 2 cannot conclude that the original formula ϕ is invalid even if an approximation of the formula is invalid.” Therefore it also runs the procedure on the de Morgan dual to obtain evidence of invalidity when the dual is valid (section 4).

Verus form. Inference: A Verus termination proof can use a decreasing natural-number measure in a recursive `proof fn` or executable function's `decreases` clause; bounded unfolding is an external way to discover or test a candidate bound. It cannot by itself establish unbounded termination in Verus. Inference: use the generated bound as a lemma hypothesis only if separately proved for all inputs.

Evidence and limits. Example 3 yields CHCs with model `X(z,y) := z ≤ 0 ∧ z ≤ y`, establishing that particular formula (section 4.1). No success percentage is given. Increasing `n` improves precision but does not make the general method complete.

## technique 5: predicate abstraction with CEGAR

What it is. Abstract integer predicates in a `νHFL(Z)` formula to Boolean variables, yielding a pure `νHFL` formula that a decidable higher-order model checker can solve. The article's example abstracts integers with `λy.y > 0`, turning `(νx.λy.y ≥ 0 ∧ x(y+1))1` into `(νx.λb.b ∧ x(b))true` (section 4.2, PDF page 8).

How to apply it.
1. Choose predicates over integer values (section 4.2).
2. Replace each integer expression's truth information by Boolean predicate variables, underapproximating the original formula (section 4.2).
3. Run a pure HFL/HORS model checker, which is decidable for the abstract formula (section 4.2).
4. If the abstraction is insufficient, refine the predicate set from a counterexample in a counterexample-guided loop (section 4.2).
5. A valid abstract formula implies validity of the original formula; an invalid underapproximation is inconclusive (section 4.2 and Figure 2).

Verus form. Inference: Predicate abstraction can suggest Boolean ghost invariants or trigger lemmas for Verus, but the abstract proof must be related back to concrete Rust values with explicit lemmas. Verus's arithmetic specifications remain concrete mathematical values; it has no built-in HFL CEGAR engine.

Evidence and limits. The example's pure formula is reported valid by a pure HFL model checker, but the survey gives no number of predicates, iterations, or benchmark denominator. Precision depends on the chosen predicates; underapproximation can miss a valid proof.

## technique 6: refinement types for νHFL(Z)

What it is. Assign a refinement type to each formula, where `o[ψ]` means the proposition holds whenever arithmetic condition `ψ` holds. The grammar is `σ ::= o[ψ] | σ1 → σ2 | x:int → σ` (section 4.3, PDF page 8). A formula is valid if inference assigns it type `o[ψ]`; unknown predicates become constraints solved by a generalized constrained-clause engine.

How to apply it.
1. Choose quantifier-free arithmetic refinements for propositions (section 4.3).
2. Type lambda-bound predicates with dependent arrow refinements, such as `(x:int→o[x≥0])→o[true]` for a predicate applied at zero (section 4.3).
3. Generate constraints for unknown predicate refinements as the type system traverses the formula (section 4.3).
4. Solve constraints of the form `P1 ∧ … ∧ Pk ∧ ψ ⇒ Q1 ∨ … ∨ Ql` with a constrained-clause solver (section 4.3).
5. Accept validity when the inferred top-level type is `o[ψ]` for a true or discharged `ψ`.

The article characterizes the method as “a sound but incomplete reduction to a refinement type inference problem” (section 4.3). It reports that refinement typing is generally faster than predicate abstraction, while predicate abstraction tends to be more precise; the two are complementary (section 4.3).

Verus form. Inference: Verus `requires` and `ensures` clauses are refinement-like contracts, and ghost predicates can play the role of unknown refinements. A generated refinement can guide a `proof fn` contract, but generalized disjunctive constraints still need an external solver or manually supplied lemmas.

Evidence and limits. The bottleneck is solving generalized constrained clauses; the article says work was underway to extend ICE-based CHC solving. No runtime or benchmark denominator is stated for the comparison “generally faster.”

## technique 7: unfold/fold transformations

What it is. Rewrite fixpoint formulas by unfolding definitions, algebraically shuffling the result, and folding a repeated pattern into a new fixpoint. Section 4.4 proves `Even(n) ⇒ Odd(n+1)` by transforming `ϕ(y)=Even(y)∨Odd(y+1)` to `y=0 ∨ ϕ(y−2)`, then replacing it with `(νx.λy.y=0∨x(y−2))n`.

How to apply it.
1. Unfold each `µ` or `ν` definition once at the current argument (section 4.4).
2. Normalize and shuffle conjunctions/disjunctions until a recursive subformula repeats (section 4.4).
3. Define the repeated pattern as a fresh fixpoint and fold the expression (section 4.4).
4. Check the soundness side conditions, which are subtler than CHC unfold/fold because least and greatest fixpoints mix (section 4.4).
5. Submit the simplified formula to a validity backend.

Verus form. Inference: This transformation can suggest a recursive lemma whose postcondition is the folded invariant. It is not a Verus rewrite tactic; each equivalence must be proved in the specification logic.

Evidence and limits. The parity example ends in a formula equivalent to `λy.true` and is therefore valid (section 4.4). The article gives no automation success rate and warns that mixed `µ`/`ν` soundness requires conditions.

## what is proved, trusted, and not established

The survey states semantic correspondences and reports representative examples and qualitative backend comparisons. It does not present one controlled benchmark table with denominators; “generally faster” and “tends to be more precise” are directional observations without a stated sample size in this article. Trusted elements include the HFL(Z) semantics, translation from programs, approximation soundness conditions, model checkers, refinement/CHC solvers, and the protocol model supplied by the user. Inference: for Verus, the trusted boundary additionally includes Verus's source-to-formula translation, Z3, Rust compilation, and the correctness of generated contracts.

Inference: the project has already explored the main pipeline ingredients VL would otherwise need for higher-order protocols: characteristic formulas, µ elimination, predicate abstraction, refinement types, and fold/unfold simplification. VL should reuse these as design references and measure where Rust ownership and mutable state add obligations that HFL abstracts away.

## threat to agent-written verified Rust

Inference: The threat is moderate for agent-written Rust that uses higher-order callbacks or protocol APIs. A protocol LTS plus generated ghost-state contracts can catch invalid call traces, and refinement/CHC synthesis can propose arithmetic invariants. The threat is lower for arbitrary mutable closures, unsafe code, external effects, and unbounded integer behavior because the survey's reductions rely on finite models or incomplete approximations. Inference: an agent should report “unknown” when abstraction, unfolding bounds, or backend solving is inconclusive, rather than treating an invalid approximation as a counterexample to the concrete program.

## techniques for the catalog

- HFL(Z) encoding — represent higher-order control, modal protocols, integer guards, and recursion with typed formulas and µ/ν fixpoints
- CHC correspondence — translate recursive Horn predicates to least fixpoints and ν-only dual formulas, and reduce restricted HFL back to CHCs
- protocol characteristic formula — compile program actions and recursion to modal formulas checked against a finite protocol automaton
- bounded µ removal — replace least-fixpoint liveness with counter-indexed greatest-fixpoint approximations and increase the bound
- predicate abstraction — replace integer predicates with Booleans and refine them from counterexamples
- refinement typing — infer arithmetic refinements for νHFL formulas and solve the resulting generalized constrained clauses
- unfold/fold simplification — unfold fixpoint definitions, normalize repeated patterns, and fold them into a simpler fixpoint
Checked 2026-10-14 against the paper by a Codex agent: audit record kobayashi2021hfl; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
