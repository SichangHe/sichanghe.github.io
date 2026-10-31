# An Overview of the HFL Model Checking Project
(authored by agents unless marked 🧑)
Tag: `kobayashi2021hfl`, [paper](https://doi.org/10.4204/EPTCS.344.1)

## scope and contribution

Kobayashi surveys a project that verifies higher-order programs by reducing them to higher-order fixpoint logic with integer arithmetic, HFL(Z). The article says: “HFL is a higher-order extension of the modal µ-calculus and is strictly more expressive than the modal µ-calculus, but the HFL model checking problem for finite state systems remains decidable.” HFL(Z) extends HFL with integer arithmetic and may be viewed as an extension of constrained Horn clauses (CHCs) with higher-order predicates and fixpoint alternations (Introduction, page 1). The project uses higher-order model checkers and CHC solvers as backends, and a refinement-type approach that reduces to constraint solving (Section 4, Figure 2, page 6). The article calls itself “a non-exhaustive survey” whose objective is “to provide references to technical papers”, and says its explanations are “admittedly short and cryptic” (Introduction, page 1). Its conclusion says a full implementation of the HFL(Z) validity checker is still to be done (Section 5, page 9).

Inference: The useful product lesson is a staged verification pipeline: compile higher-order control and temporal behavior to a logical formula, simplify or abstract it, then choose a backend whose completeness and precision fit the property. The article is a survey, not a Verus implementation or a single end-to-end benchmark.

## technique 1: encode higher-order behavior as HFL(Z)

What it is. HFL formulas include disjunction/conjunction, modal operators `⟨a⟩` and `[a]`, least (`µ`) and greatest (`ν`) fixpoints, lambda abstraction/application, and integer constraints. The syntax in section 2.1 (page 1) includes `µxκ.ϕ`, `νxκ.ϕ`, `ϕ1 ϕ2`, `λxτ.ϕ`, `ϕ e`, and `e1 ≤ e2`. A type is `int` or a predicate type `κ`; predicate types are built from `o` and arrows (`κ ::= o | τ → κ`).

How to apply it.
1. Choose a formula type whose order is high enough for the program's higher-order functions; the paper defines `ord(o)=ord(int)=0` and `ord(τ→κ)=max(ord(τ)+1,ord(κ))`, and the order of a problem is the largest order of types in the formula (section 2.1, page 3).
2. Encode state-machine actions with modal operators: `⟨a⟩ϕ` means there exists a transition labeled `a` after which `ϕ` holds, while `[a]ϕ` means that after any transition labeled `a`, `ϕ` holds (section 2.1, page 2).
3. Encode recursive behavior with `µ` for least fixpoints and `ν` for greatest fixpoints: they denote the least and greatest predicates `x` such that `x = ϕ` (section 2.1, page 2).
4. Encode integer guards and arithmetic with integer expressions (constants, addition) and inequalities; other predicates, operations and quantifiers are definable. For example, `ψ = νx.λn.ϕ(n) ∨ x(n+1)` gives `ψ(0)` denoting `∃x ≥ 0.ϕ(x)` (Example 1, page 2).
5. Check `M |= ϕ` on a finite labeled transition system, or validity as `M0 |= ϕ` where `ϕ` has no modal operators and `M0` is a one-state model without transitions (section 2.1, pages 2–3).

The paper warns about the boundary: “For HFL(Z), both the model and validity checking problems are undecidable due to Gödel’s incompleteness theorem” (section 2.1, page 3). In contrast, for pure HFL the model checking problem is decidable and “k-EXPTIME complete for the order-k fragment” (section 2.1, page 3).

Verus form. Inference: A Verus product could generate a ghost transition-system specification and use `spec fn`s for action predicates and recursive relations, while executable Rust remains separately verified against contracts. Verus does not provide HFL modal/fixpoint syntax (this is my claim about Verus, not the paper's), so this would be an external intermediate representation or proof-planning language. Inference: a Verus `proof fn` can establish individual transition obligations, but the article's HFL solver is not a Verus backend.

Evidence and limits. Example 1 gives the unfolding that shows `ψ(0)` denotes `∃x ≥ 0.ϕ(x)`; Example 2 shows that `νx.λy.y ∨ ⟨a⟩x(⟨b⟩y)` applied to `⟨c⟩true` means there is a transition sequence of the form `a^n b^n` after which a `c`-transition is enabled, which the paper uses to show pure HFL is strictly more expressive than the modal µ-calculus (page 2). There is no aggregate success denominator in this survey. Inference: users must bound or abstract integer domains before expecting a terminating automated procedure.

## technique 2: convert CHCs to HFL(Z) and back

What it is. HFL(Z) validity generalizes CHC satisfiability by allowing higher-order predicates and fixpoint alternation. Section 2.2 gives a multiplication CHC system (with an equivalent OCaml program whose assertion never fails) and converts its first two clauses to a least-fixpoint HFL formula. For the clauses defining `mult`, the least predicate is:

```
µu.λ(x,y,r).(y = 0 ∧ r = 0) ∨ ∃s.(y ≠ 0 ∧ u(x,y−1,s) ∧ r = s+x)
```

The safety goal clause `mult(x,y,r) ∧ x > 0 ⇒ r ≥ y` becomes `∀x,y,r. ϕ(x,y,r) ∧ x > 0 ⇒ r ≥ y`, equivalent to a disjunction with the de Morgan dual of `ϕ`, which is a `ν`-only formula (section 2.2, pages 3–4).

How to apply it.
1. Represent each recursive CHC predicate by a fixpoint variable whose arguments are the clause variables (section 2.2).
2. Put base and recursive clause bodies into the least fixpoint (`µ`) that denotes the least predicate satisfying them (section 2.2).
3. Encode the goal clause as an implication from the predicate and constraints to the required conclusion (section 2.2).
4. Take the de Morgan dual of the formula, so that the satisfiability of any CHCs on integer arithmetic becomes validity of a formula in the first-order, `ν`-only fragment of HFL(Z); universal quantifiers are expressed by `ν` (section 2.2, page 4).
5. Conversely, validity checking of a first-order `ν`-only formula whose fixpoint variables have types `int → … → int → o` can be reduced to CHC satisfiability on integer arithmetic; the paper cites [25] for this (section 2.2, page 4).

The article's claim: “In this sense, the HFL(Z) validity checking problem can be considered a generalization of the CHC satisfiability problem, where higher-order predicates and fixpoint alternations between µ and ν are allowed.” It also says HFL(Z) validity checking can be considered an extension of satisfiability for HoCHC of Burn et al. with fixpoint alternations (section 2.2, page 4).

Verus form. Inference: A Verus workflow can use CHCs as an off-line abstraction of `requires`/`ensures` and recursive lemmas, then import discovered invariants as Verus proof lemmas. CHC predicates are not callable runtime functions; they correspond to ghost relations. Inference: this can help synthesize contracts but does not replace checking the Rust implementation against them.

Evidence and limits. Section 2.2 gives the multiplication CHC system and its HFL(Z) translation but no solver run or model for it; the CHC model `X(z,y) := z ≤ 0 ∧ z ≤ y` in the paper belongs to Example 3 of section 4.1 (technique 4 below), not to the multiplication example. The survey reports no denominator for all project cases. HFL(Z) validity is undecidable in general (section 2.1, page 3).

## technique 3: compile program protocols and recursion to HFL model checking

What it is. Reverse the usual model-checking roles: the paper says “we actually switch the roles of systems and specifications: a program is mapped to a HFL(Z) formula, and a property is mapped to a finite state system”, where the formula is a kind of “characteristic formula” of the program (section 3, page 4). For the file program `let x = open "foo" in (read(x); read(x); close(x))`, the read-only protocol LTS (Figure 1: `q0` with a `read` loop, `close` from `q0` to `q1`, `end` from `q1` to `q2`) accepts `read* · close · end`, and the program becomes the formula `⟨read⟩⟨read⟩⟨close⟩⟨end⟩true`, with `Mfile |= ` that formula expressing correct access (section 3, pages 4–5). The `open` operation is ignored in this example (footnote 1; it matters when more than one file is used).

How to apply it.
1. Build a finite protocol LTS whose transitions are the allowed operations, with `end` denoting program termination (section 3, page 4).
2. Replace each program action by the matching modal operator; replace termination by the `end` modality (section 3).
3. Translate conditionals into conjunctions of implications: `if n<=0 then ... else ...` becomes `(n ≤ 0 ⇒ ···) ∧ (n > 0 ⇒ ···)` (section 3, page 5). Operations are given a continuation parameter by a continuation-passing-style rewrite.
4. Translate recursive functions into fixpoints. In the paper's CPS file example, recursion becomes `µ f.λ n.λ k.(n ≤ 0 ⇒ ⟨close⟩k) ∧ (n > 0 ⇒ ⟨read⟩(f(n−1)k))`, applied to `10` and `⟨end⟩true` (section 3, page 5).
5. Check the resulting formula on the protocol LTS. The paper notes that by using `µ` “we require that the program terminates” (section 3, page 5).

Verus form. Inference: Model a resource protocol as a ghost state machine and give each Rust operation a contract that advances the state only along allowed transitions. A `proof fn` can show a sequence of calls preserves the protocol; executable functions perform the I/O. Inference: HFL's higher-order continuations are not a Verus construct, so the translation must be specialized to the API's state-machine representation.

Evidence and limits. The article gives the file protocol and recursive example but no measured corpus. It says the idea “should work for higher-order programs”; a general translation for linear-time properties is in [27], one for arbitrary ω-regular properties in [44], and a more optimized one for linear-time properties of first-order recursive programs in [25], all using “a kind of product construction” (section 3, page 5). Inference: the finite protocol assumption is a limitation for unbounded resources or data-dependent protocols unless an abstraction is supplied.

## technique 4: remove least fixpoints by bounded unfolding

What it is. Convert a `µ` formula (used for liveness/termination) into a `ν` formula with a bound on unfoldings, then solve the resulting safety-style problem. The paper adopts, for the first-order fragment of HFL(Z), the technique of Fedyukovich et al. [14] as in [25]. Section 4.1 uses the fixpoint theorem: for any natural `n`, `ϕ^n(false) ⇒ µx.ϕ(x)`. It rewrites the bounded unfolding as a `ν` formula with a counter:

```
ψ := ∀u ≥ n.(νx'.λi.(i > 0 ∧ ϕ(x'(i−1))))u
```

How to apply it.
1. Identify a `µx.ϕ(x)` whose validity represents termination or another liveness fact (section 4.1; the paper says liveness and safety properties are respectively turned into µ- and ν-formulas).
2. Select an unfolding bound `n`; the bound may depend on free variables (Example 3, page 7, where the bound is `max(i+1, 1)`).
3. Replace the bounded `µ` unfolding with the `ν` counter formula `ψ` (section 4.1).
4. Increase `n` gradually to obtain a better approximation of the original formula (section 4.1, page 6).
5. For first-order formulas, the translation yields order-1 `νHFL(Z)` formulas, whose validity can be reduced to CHC satisfiability as in section 2, and then solved (section 4.1, page 7).

The paper explicitly qualifies the result: “Due to underapproximation in various steps … the procedure shown in Figure 2 cannot conclude that the original formula ϕ is invalid even if an approximation of the formula is invalid.” Therefore it also prepares the de Morgan dual of `ϕ` and runs the whole procedure in parallel on both; “If” the dual is valid, “then we can conclude that ϕ is invalid” (section 4, page 6).

Verus form. Inference: A Verus termination proof can use a decreasing natural-number measure in a recursive `proof fn` or executable function's `decreases` clause; bounded unfolding is an external way to discover or test a candidate bound. It cannot by itself establish unbounded termination in Verus. Inference: use the generated bound as a lemma hypothesis only if separately proved for all inputs.

Evidence and limits. Example 3 proves `∀i.(µx.λy.y ≤ 0 ∨ x(y−1))i` valid: it yields CHCs `z ≤ 0 ⇒ X(z,y)`, `y > 0 ∧ X(z−1,y−1) ⇒ X(z,y)` with goal `u ≥ i+1 ∧ u ≥ 1 ∧ X(u,i) ⇒ false`, which have the model `X(z,y) := z ≤ 0 ∧ z ≤ y` (section 4.1, page 7). The paper states that its implementation for the first-order fragment (applied to temporal property verification in [25]) “generally outperformed Cook and Koskinen's method specialized for CTL verification [9]”, with no numbers given in this article; work is under way to extend the translation to arbitrary orders (section 4.1, page 7). No success percentage is given. Inference: increasing `n` improves the approximation but nothing in the article says it makes the method complete.

## technique 5: predicate abstraction with CEGAR

What it is. Abstract integers in a `νHFL(Z)` formula using predicates, yielding a pure `νHFL` formula (an underapproximation) that a pure HFL model checker, which is decidable, can solve [17, 18]. In the actual implementation a HORS model checker is used, based on the correspondence between HFL and HORS model checking (footnote 2, page 7). The article's example abstracts every integer with `λy.y > 0`, turning `(νx.λy.y ≥ 0 ∧ x(y+1))1` into `(νx.λb.b ∧ x(b))true`, where `b` corresponds to `y > 0` (section 4.2, page 8).

How to apply it.
1. Choose a set of predicates on integers (section 4.2).
2. Underapproximate the `νHFL(Z)` formula `ϕ` by a pure HFL formula `ϕ'` over Boolean variables corresponding to the predicates (section 4.2).
3. Run a pure HFL model checking algorithm (practical algorithms exist even though worst-case complexity is high) on `ϕ'` (section 4.2, page 7).
4. Find predicates “in a counterexample-guided manner” (section 4.2, page 8); details are in [18].
5. If `ϕ'` is valid then `ϕ` is valid; an invalid approximation does not show `ϕ` invalid (section 4, page 6).

Verus form. Inference: Predicate abstraction can suggest Boolean ghost invariants or trigger lemmas for Verus, but the abstract proof must be related back to concrete Rust values with explicit lemmas. Verus's arithmetic specifications remain concrete mathematical values; it has no built-in HFL CEGAR engine.

Evidence and limits. The paper says `φ'` is valid “as can be confirmed by a pure HFL model checker”; it does not report a run, and gives no number of predicates, iterations, or benchmark denominator. The paper presents the approach as a generalization of the HORS model checking approach to (un)reachability verification [26] and non-termination verification [31]. Inference: precision depends on the chosen predicates; underapproximation can miss a valid proof.

## technique 6: refinement types for νHFL(Z)

What it is. Assign a refinement type to each formula, where `o[ψ]` “describes propositions that hold whenever ψ holds”. The grammar is `σ ::= o[ψ] | σ1 → σ2 | x:int → σ`, with `ψ` a quantifier-free formula of integer arithmetic (section 4.3, page 8). The paper says a `νHFL(Z)` formula `ϕ` is valid if `ϕ` has type `o[ψ]`, and the type inference problem reduces to a constraint satisfaction problem on predicate variables “in a standard manner”. The system is inspired by the refinement type system of Burn et al. for HoCHC.

How to apply it.
1. Use quantifier-free integer-arithmetic refinements `ψ` (section 4.3).
2. Type lambda-bound predicates with dependent arrow refinements; the paper types `λp.p(0)` as `(x:int→o[x≥0])→o[true]` (section 4.3).
3. Reduce type inference to constraints on unknown predicate variables (section 4.3).
4. The resulting constraints are not CHCs in general; they have the form `P1(x̃,ỹ) ∧ … ∧ Pk(x̃,ỹ) ∧ ψ(x̃,ỹ) ⇒ Q1(x̃) ∨ … ∨ Ql(x̃)`, with disjunction possible in the head. The paper calls solving this generalized form of constrained clauses “the current major bottleneck of this approach” (section 4.3, page 8).
5. Inference: the article does not state exactly which top-level `ψ` must hold for validity; it only says `ϕ` is valid if it has type `o[ψ]`.

The article characterizes the method as “(sound but incomplete) reduction to a refinement type inference problem” (section 4.3). It says: “the refinement type-based approach to νHFL(Z) validity checking is generally faster than the predicate abstraction-based approach, while the latter tends to be more precise. Thus, the two approaches are complementary to each other.” (section 4.3, page 8).

Verus form. Inference: Verus `requires` and `ensures` clauses are refinement-like contracts, and ghost predicates can play the role of unknown refinements. A generated refinement can guide a `proof fn` contract, but generalized disjunctive constraints still need an external solver or manually supplied lemmas.

Evidence and limits. The article says work is under way to extend the ICE-based CHC solving approach to deal with the generalized constrained clauses. No runtime or benchmark denominator is stated for the comparison “generally faster”.

## technique 7: unfold/fold transformations

What it is. Rewrite fixpoint formulas by unfolding definitions, shuffling the result, and folding a repeated pattern into a new fixpoint; the paper studies this for the first-order fragment of HFL(Z) [23], inspired by unfold/fold for CHC solving [10, 11]. Section 4.4 (pages 8–9) proves `∀n.Even(n) ⇒ Odd(n+1)`, with `Even := µx.λy.(y = 0 ∨ x(y−2))` and `Odd := µx.λy.(y = 1 ∨ x(y−2))`. It is expressed as `∀n. Ēven(n) ∨ Odd(n+1)` where `Ēven := νx.λy.(y ≠ 0 ∧ x(y−2))` is the dual. With `ϕ(y) := Ēven(y) ∨ Odd(y+1)`, unfolding and shuffling give `y = 0 ∨ ϕ(y−2)`, and `Ēven(n) ∨ Odd(n+1)` is replaced with `(νx.λy.y = 0 ∨ x(y−2))n`.

How to apply it.
1. Unfold the fixpoint definitions once at the current argument (“unfold Even and Odd” in the paper) (section 4.4).
2. Shuffle the formula until the recursive subformula `ϕ(y−2)` appears (section 4.4).
3. Replace by the definition of `ϕ`, then define the repeated pattern as a fixpoint, i.e. fold (section 4.4).
4. Check the soundness conditions: the paper says soundness “is more subtle, due to the mixture of the least and greatest fixpoint operators” and refers to [23] for the conditions (section 4.4, page 9).
5. Use the transformed formula in an automated validity checker, which the transformation is meant to enhance (section 4.4).

Verus form. Inference: This transformation can suggest a recursive lemma whose postcondition is the folded invariant. It is not a Verus rewrite tactic; each equivalence must be proved in the specification logic.

Evidence and limits. The parity example ends in `(νx.λy.y = 0 ∨ x(y−2))n`, which the paper calls “obviously valid (since νx.λy.y = 0 ∨ x(y−2) ≡ λy.true)” (section 4.4, page 9). The article gives no automation success rate and warns that soundness is subtler than for CHCs.

## what is proved, trusted, and not established

The survey states semantic correspondences and reports representative examples and qualitative backend comparisons. It does not present one controlled benchmark table with denominators; “generally faster” and “tends to be more precise” are directional observations without a stated sample size in this article. It says some tools and benchmark sets are available from https://github.com/hopv (section 4, page 5). It also says a full implementation of the HFL(Z) validity checker remains to be done and that integrating semi-automated (Coq-style) proofs with the automated methods is future work (sections 4.5 and 5, page 9). Inference: trusted elements include the HFL(Z) semantics, translation from programs, approximation soundness conditions, model checkers, refinement/CHC solvers, and the protocol model supplied by the user; for Verus, the trusted boundary additionally includes Verus's source-to-formula translation, Z3, Rust compilation, and the correctness of generated contracts.

## threat to agent-written verified Rust

Inference: The threat is moderate for agent-written Rust that uses higher-order callbacks or protocol APIs. A protocol LTS plus generated ghost-state contracts can catch invalid call traces, and refinement/CHC synthesis can propose arithmetic invariants. The threat is lower for arbitrary mutable closures, unsafe code, external effects, and unbounded integer behavior because the survey's reductions rely on finite models or incomplete approximations. Inference: an agent should report “unknown” when abstraction, unfolding bounds, or backend solving is inconclusive, rather than treating an invalid approximation as a counterexample to the concrete program. (Figure 2 of the paper also ends in Yes/No/Unknown.)

## techniques for the catalog

- HFL(Z) encoding — represent higher-order control, modal protocols, integer guards, and recursion with typed formulas and µ/ν fixpoints
- CHC correspondence — translate recursive Horn predicates to least fixpoints and ν-only dual formulas, and reduce restricted HFL back to CHCs
- protocol characteristic formula — compile program actions and recursion to modal formulas checked against a finite protocol automaton
- bounded µ removal — replace least-fixpoint liveness with counter-indexed greatest-fixpoint approximations and increase the bound
- predicate abstraction — replace integer predicates with Booleans and refine them from counterexamples
- refinement typing — infer arithmetic refinements for νHFL formulas and solve the resulting generalized constrained clauses
- unfold/fold simplification — unfold fixpoint definitions, normalize repeated patterns, and fold them into a simpler fixpoint
