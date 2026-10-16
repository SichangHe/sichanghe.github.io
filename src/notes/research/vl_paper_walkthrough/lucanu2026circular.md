# Circular Induction
(authored by agents unless marked 🧑)
Tag: `lucanu2026circular`, [paper](http://arxiv.org/abs/2605.24968v1)

## scope and result
The paper develops circular induction, an inductive proof method dual to circular coinduction, and implements both in the CIRC prover. The abstract states: “Circular induction is simple, flexible, generic, and therefore it is a good candidate framework for combining different proving schemes into a competitive tool.” (abstract, p. 1). The arXiv version is a 2010 technical contribution with only related work and conclusion revised; its definitions, proofs, examples, and implementation describe the 2010 system (disclaimer, p. 1).

The method targets order-sorted algebraic specifications with constructors and equations. A goal with inductive variables is repeatedly transformed by constructor substitutions (derivatives). Failed goals become frozen hypotheses; derived goals are reduced by equational reasoning or unfolded again. A cycle closes when a derived goal matches a frozen hypothesis after variable incarnation.

## technique 1: constructor derivatives and experiments

what it is

Each constructor is an equation transformer. For a constant constructor, substitute it for an inductive variable. For `c : s1 … sn → s`, substitute `c(y1,…,yn)` and mark same-sort arguments as incarnations of the original variable. The union of these transformations is `∆` (Definition 5, pp. 6–7).

An experiment is a finite composition of constructor substitutions and therefore denotes a ground constructor term. The paper proves that every ground constructor substitution can be represented by derivatives (Proposition 1, p. 6).

how to apply it

1. Declare inductive sorts, constructors, operations, and equations.
2. State a universally quantified equation `e` over inductive variables.
3. For each constructor matching a variable's sort, form `δc,y[e]`; introduce fresh variables for constructor arguments and record `yi ∼ y` when they have the same sort (Definition 5, p. 6).
4. Continue composing derivatives until a ground constructor substitution is represented; these compositions are experiments (Definition 6, p. 7).
5. Define inductive satisfaction as proving every experiment instance `θ[e]` in the base entailment relation (Definition 7, p. 7).

The worked example proves `even(N)=evenm(N)`: derivatives for `0` and `s(n)` create base and recursive obligations, then a second derivative reaches an incarnation of the initial goal (Introduction and Figure 2, pp. 2–3).

Verus form

Inference: Represent an inductive datatype with Rust enums and recursive `spec fn`s. A derivative is a ghost function that pattern-matches a value and returns subgoals; `ensures` on proof functions states each constructor case. Use `decreases` for executable recursion where needed. Verus does not have constructor-derivative or frozen-equation primitives, so the proof search and incarnation relation must be ghost infrastructure, followed by ordinary lemmas over the enum.

evidence and limits

The paper's Proposition 1 establishes the correspondence between ground substitutions and composed derivatives. This is a mathematical proof, not a benchmark. The method assumes a constructor-based initial algebra and a base entailment relation satisfying the contextual rules in Definition 1 (p. 3).

## technique 2: frozen hypotheses and the circularity principle

what it is

A frozen form replaces each inductive variable `y:s` by a distinguished constant `y.s`; frozen goals contain no designated inductive variables. Freezing inhibits use of a hypothesis over a proper constructor substitution, preventing unsound immediate self-use (Definition 8, p. 7).

The circular induction principle is: if the base specification plus frozen goals proves all derivatives of those goals, then every ground experiment instance is true. The paper states, “Theorem 1. (circular induction principle) Let B = (S, (Σ, ∆), E) be a specification and F be a set of goals. If B ∪ F ⊢ ∆[ F ] then B ⊪ F .” (Section 4, p. 7).

how to apply it

1. Start with proof state `(B, F, G)`, where `F` is frozen hypotheses and `G` pending goals.
2. If `B ∪ F ⊢ e`, apply `[Reduce]` and remove `e`.
3. Otherwise apply `[Derive]`: add incarnation hypotheses `H(e,FVar(∆[e]))` to `F` and add every derivative in `∆[e]` to `G` (Definition 11, p. 8).
4. Repeat until `G` is empty. Theorem 3 states that a finite reduction from empty `F` to empty `G` is sound (Section 4, p. 9).
5. If a needed incarnation is reachable through intermediate sorts, use the extended relation `∼+` and the extended `[Derive]` rule with `H*` (Definition 12, p. 10). This repairs the failing `mirror(mirror(L))=L` list/tree example (Examples 7–8, pp. 9–10).

Inference: In Verus, frozen hypotheses correspond to ghost lemmas whose applicability is guarded by a structural decrease. Encode the guard as a `requires` relation between parent and child values; use a `decreases` clause or an explicit size lemma. Do not treat a proof function as executable code or use unsupported `old`/`modifies` forms; the paper's equations must be translated into valid Verus contracts.

## technique 3: special-hypothesis closure and non-linear goals

what it is

Special hypotheses close the set of hypotheses under bounded experiment depth. Definition 10 requires closure, monotonicity, and idempotence; Theorem 2 permits these hypotheses as lemmas without separately proving every instance (Section 4, pp. 8–9). This handles strong induction and non-linear conjectures.

how to apply it

1. Choose a goal set `F` and define `F≤` for experiments no deeper than the current experiment.
2. Add special equations from `F≤` as frozen hypotheses.
3. Apply Reduce/Derive using `F≤` until all derivatives close.
4. For non-linear goals, retain each incarnation separately. The paper proves `max(N,N)=N` in one derivation because the same variable appears twice (Example 6, p. 9).

Inference: In Verus, bounded special hypotheses can be ghost lemmas parameterized by a value and a size bound. The bound must be explicit in `requires`; otherwise a cyclic lemma could become an unsound unrestricted rewrite.

## technique 4: CIRC implementation and combined induction/coinduction

CIRC is implemented in Maude using reflection and order-sorted subsorts. Its base entailment normalizes terms after turning variables into fresh constants, adding condition equations, and orienting specification equations as rewrite rules (Section 5, p. 11). To control exponential special-hypothesis growth, it stores generic hypotheses with fresh subsorts and instantiates them for generated constants; the paper says, “We store only generic hypotheses represented with variables of fresh subsorts and each new generated constant is declared as inhabitant to an appropriate such subsort.” (Section 5, p. 11).

The same engine can combine coinduction and induction. In the `zeros + S = S` example, coinduction reaches `sum(0,hd(S))=hd(S)`, saves the proof state, proves the generalized induction goal `sum(0,N)=N`, reloads, and completes coinduction (Section 5.1, pp. 12–13).

## techniques for the catalog

- constructor derivative experiments — turn each constructor case into equation transformers and compose them into ground substitutions
- frozen circular hypotheses — block immediate self-use, derive constructor cases, and close cycles through incarnations
- special-hypothesis closure — add bounded experiment instances to support strong and non-linear induction
- subsort hypothesis compression — store generic frozen lemmas by source subsort and instantiate generated variables
- induction/coinduction composition — save a coinductive proof state, discharge an inductive lemma, then resume coinduction
