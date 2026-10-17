# Tactics for Reasoning modulo AC in Coq
(authored by agents unless marked 🧑)
Tag: `braibant2011tactics`, [paper](https://arxiv.org/abs/1106.4448)

## scope and contribution

The paper presents Coq tools for rewriting modulo associativity (A) and commutativity (C).  Its abstract states: “We use two building blocks: first, an extensible reflexive decision procedure for equality modulo AC; second, an OCaml plug-in for pattern matching modulo AC.” (Abstract, PDF p. 1.)  It supports associative-only and AC operations, neutral elements, uninterpreted function symbols, and arbitrary user-defined equivalence relations.  The paper deliberately keeps matching untrusted and checks the proposed rewrite inside Coq: “We chose this option.” (Section 1, PDF p. 2, immediately after the discussion of extending kernel unification.)

Inference: the engineering lesson for Verus is to separate search from a small proof checker.  A fast search procedure may propose a context and substitution, while a verified normalizer checks the equality before executable code or a proof is accepted.

## technique 1: type-class declarations and automatic reification

What it is.  The user declares `Associative`, `Commutative`, `Unit`, and `Proper` instances for the operation and relation of interest.  Figure 1 gives classes whose fields are associativity, commutativity, and left/right unit laws, and examples for `plus`, `and`, list append, and propositional `iff`.  The paper says: “it suffices to declare instances of the appropriate type-classes [22] for the operations of interest, and our tactics will exploit this information automatically.” (Section 1, PDF p. 2.)

Inference: When to use it.  Use this when many operations or polymorphic operations can appear in goals and explicit annotations would be brittle.  The relation parameter allows, for example, rational equality or propositional equivalence instead of Leibniz equality (Section 1, PDF p. 2).

How to apply it.

1. Define instances proving associativity and, when applicable, commutativity and a neutral element (Section 2, PDF pp. 3–4; Figure 1)
2. Define `Proper` instances for functions that preserve the chosen relation (Section 2, PDF p. 4; for Leibniz equality they are inferred automatically)
3. Invoke `aac_reflexivity` to decide an equality or `aac_rewrite` to rewrite with a universally quantified equality (Section 2, PDF p. 4)
4. If several matches exist, invoke `aac_instances` to display the occurrences with their instantiations, then select the desired one with `aac_rewrite` options (Section 2, PDF p. 4)

The paper's example uses hypotheses `H1 : ∀x y z, x∩y ∪ x∩z = x∩(y∪z)` and `H2 : ∀x y, x∩x = x`, then calls `aac_rewrite H1; aac_rewrite H2; aac_reflexivity` (Section 2, PDF p. 4).

Verus form.  Inference: encode an operation's algebraic laws as `spec fn` predicates and prove reusable lemmas with `ensures`; use ordinary Rust traits for executable operations and ghost/spec functions for the relation.  A Verus proof should not treat a proof function as runtime code.  Inference: type-class resolution itself does not carry over; select the relation and lemmas explicitly or package them in a proof-oriented trait/API.

Evidence and limits.  The paper reports that the implementation consists of about 1,400 lines of Coq and 3,600 lines of OCaml and states “We do not use any axiom” (Section 6, PDF p. 13).  It says the decision procedure was not put through extensive testing, “however, we claim that it returns instantaneously in practice” (Section 3.2, PDF p. 9).  Inference: that is an author claim without a denominator, benchmark suite, or timing table, so it is evidence of feasibility rather than a performance guarantee.

## technique 2: certified two-level normalization for equality

What it is.  The decision procedure reifies user terms into an inductive syntax `T`, evaluates syntax back to user terms, and normalizes flattened A/AC nodes.  The paper states: “we define an inductive type T for terms and a function eval: T → X that maps reified terms to user-level terms living in some type X equipped with an equivalence relation R” (Section 3.1, PDF p. 5).  The correctness interface is `eval_norm`, followed by `decide`, which concludes `eval u ≡ eval v` when normalized terms compare equal (Section 3.1, PDF p. 5).

Inference: When to use it.  Use this for a proof-producing equality check where operation symbols may be uninterpreted and where a kernel-checked proof is preferable to trusting a solver or matcher.

How it is done.

1. Package binary operations with their value, `Proper` proof, associativity proof, and optional commutativity proof; package n-ary symbols with arity and a `Proper` proof (Section 3.1, PDF p. 6; Figure 2)
2. Represent A nodes as non-empty lists and AC nodes as non-empty multisets; represent n-ary applications with dependent vectors so ill-formed arities cannot be constructed (Section 3.1, PDF pp. 6–7; Figure 3)
3. Flatten nested A/AC nodes, sort AC arguments, and use smart constructors to avoid unary nodes; normalization checks in the environment that an AC node's operation is actually commutative (Section 3.1, PDF pp. 7–8)
4. Reify by first querying type-class resolution for A/AC operations on binary applications, then querying `Proper` instances for an application from the full argument list down to fewer arguments; the first query that succeeds gives the partial application that is the symbol, and reification recurses on the remaining arguments; arity 0 is the catch-all constant case (Section 3.2, PDF pp. 8–9). The reifier is written in OCaml, not Ltac (Section 3.2, PDF p. 9)
5. Prove normalization soundness and let Coq's conversion rule compute the premise of `decide` (Section 3.1, PDF pp. 5, 8; Section 3.2, PDF p. 8)

The authors explicitly do not prove completeness: “We did not prove completeness.” (Section 3.1, PDF p. 8.)  Their stated reasons are that soundness is enough for a sound tactic, that the proof would be verbose, and that “one cannot reason about the OCaml reification and normalisation functions in the proof-assistant” (Section 3.1, PDF p. 8).

Verus form.  Inference: define a ghost enum for reified terms, a `spec fn eval`, and a recursive `spec fn norm`; prove normalization lemmas with `ensures` and use a `proof fn` to establish normalized-equality implies the chosen relation.  Dependent vectors have no direct Verus equivalent; use a bounded sequence plus a proof that its length equals the symbol arity, or a typed wrapper with an invariant.  Inference: if reification is executable and untrusted, Verus should verify the checker over the proposed syntax rather than mark the whole reifier `external_body`.

Evidence and limits.  The paper gives a concrete term environment for `(a∗S(b+b))−b` and proves `eval ... t = ...` by `reflexivity` (Section 3.1, PDF p. 7).  It says generated proof size is linear in starting-term size, while lemma-by-lemma proof construction would usually be quadratic (Section 3.2, PDF p. 9).  Inference: the result is a structural complexity claim, not an end-to-end measurement.

## technique 3: oracle matching plus checked rewriting

What it is.  Matching searches for a context `C` and substitution `σ` such that the goal is equal modulo A/AC to `C[pσ]`.  The paper's five rewrite steps are: “1. choose a context C and a substitution σ”, “2. make a transitivity step through C[pσ]”, “3. close this step using a dedicated decision procedure”, “4. use the standard rewrite”, and “5. let the user continue the proof.” (Section 1, PDF p. 3.)

Inference: When to use it.  Use it to apply a rewrite lemma under associativity, commutativity, and nested contexts without manually rearranging terms.

How it is done.

1. Flatten A/AC terms and call `split_ac` or `split_a` to enumerate decompositions (Section 4, PDF p. 10)
2. Recursively match variables, repeated variables, A/AC nodes, and uninterpreted applications; reject a repeated variable when its existing assignment is not equal modulo A/AC (Section 4, PDF p. 10; Figure 6)
3. Implement nondeterminism and backtracking with the search monad operations `≫=`, `≫|`, `return`, and `fail` (Section 4, PDF p. 10; Figure 4)
4. Return candidate contexts and substitutions from the OCaml oracle (Section 1, PDF p. 3; Section 5.2, PDF p. 12 for the context extension)
5. Check the candidate equality with the certified reflexive procedure, then invoke Coq's standard rewrite (Section 1, PDF p. 3)

The matching algorithm is intentionally not proved correct: “In any case, the prophecies of this oracle, a set of solutions to the matching problem, are verified by the reflexive decision procedure we implemented in §3.” (Section 4, PDF p. 10.)

Verus form.  Inference: implement candidate generation as executable Rust returning a sequence of `(context, substitution)` values; keep the acceptance predicate as a `spec fn` and prove each accepted candidate reconstructs the original term modulo the relation.  Use sequence invariants for backtracking state and `decreases` for recursive search.  Inference: this mirrors the paper's trust boundary while avoiding a trusted external matcher.

Evidence and limits.  The algorithm avoids redundant solutions, according to Section 4 (PDF p. 10); the matcher is nondeterministic and backtracking.  Inference: matching modulo AC may be costly, but no runtime counts or worst-case measurements are supplied, so product use should treat search cost as an open risk.

## technique 4: units, subterms, and explicit incompleteness

Units.  The matcher extends `split_a`/`split_ac` to return a split containing the operation's neutral element; the paper's example returns four pairs for `a·b·(a·b)⊥`, including `(a·b·(a·b)⊥, 1)` (Section 5.1, PDF p. 11).  Reified syntax adds a unit constructor and a dependent unit environment because two operations may share a unit, e.g. 0 for both max and plus (Section 5.1, PDF pp. 11–12; Figure 7).  Inference: represent a unit in Verus as a relation-indexed ghost value and prove both left and right identity before allowing an empty split.

Subterms.  To match inside a context, extend a pattern with a fresh variable collecting trailing terms.  For `x+x` in `a+b+a`, the extension is `y+x+x`, and the matcher explores syntactic subterms (Section 5.2, PDF p. 12).  If the pattern can be instantiated to a neutral element and the enclosing associative operation also has a neutral element, there are infinitely many distinct contexts; the implementation rejects such peculiar solutions and displays a warning (Section 5.2, PDF pp. 12–13).  Inference: Verus should encode this rejection as an explicit finite-search policy and prove only the returned candidates, rather than claim complete subterm matching.

## what is proved, measured, and trusted

The Coq kernel checks normalization soundness and each rewrite equality; type classes supply algebraic laws; the OCaml reifier and matcher remain outside the proof.  Completeness is unproved, and the authors state that the decision procedure was not put through extensive testing (Sections 3.1–3.2, PDF pp. 8–9).  Inference: an agent-written Verus implementation would threaten a product if it silently trusted candidate generation or if specifications admitted an incorrect equivalence relation.  A kernel-checked checker, explicit relation contracts, and finite-search failure reporting reduce that threat.

Inference: the paper already covers a generic A/AC rewriting architecture, so VL should not redo an untyped AC matcher or a solver-only rewrite mechanism.  Useful new work would instead measure proof-maintenance cost when algebraic laws or library APIs change, and test whether generated Verus proof obligations expose missing or overly broad `Proper` assumptions.

## techniques for the catalog

- type-class algebra declarations: declare associative, commutative, unit, and proper-morphism laws so reification can infer them
- two-level certified normalization: reify terms, flatten and sort A/AC nodes, and prove normalized equality implies the user relation
- oracle matching with checked rewrite: search contexts and substitutions externally, then validate each candidate with the reflexive checker
- unit-aware matching: add relation-indexed unit environments and neutral-element splits
- variable-extension subterm matching: add a trailing variable to search for matches beneath contexts, rejecting infinite unit cases
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The first query that succeeds tells which partial application is a proper morphism, and with which arity."): read all 17 text pages (arXiv v2) and compared every quotation, number and page reference in the study with the text; fixed PDF page numbers for the Section 2 example and aac_instances (p. 4, not 5), the matching-correctness quote (p. 10, not 11), the unit-split example (p. 11, not 12), subterm matching (pp. 12-13) and reification (pp. 8-9), fixed two quotations that were not word for word ("We do not use any axiom"; the "equivalence relation R" quotation), rewrote the five-step quotation as separate exact fragments, narrowed the "no extensive testing" claim to the decision procedure, added the condition under which unit-induced infinite contexts arise, removed the unsupported word "expensive" for matching, marked one unlabelled conclusion as Inference, and replaced the DOI link (not in the paper text) with the arXiv link 1106.4448 printed in the paper; did not check the Verus-form inferences against Verus itself, the references, or the figures beyond their text rendering.
