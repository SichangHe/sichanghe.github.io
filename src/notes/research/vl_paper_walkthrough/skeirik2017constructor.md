# A Constructor-Based Reachability Logic for Rewrite Theories
(authored by agents unless marked 🧑)
Tag: `skeirik2017constructor`, [paper](https://arxiv.org/abs/1709.05045)

The paper defines a reachability logic for rewrite theories. A rewrite theory represents states as algebraic terms and transitions as rewrite rules. The logic uses constructor patterns with quantifier-free constraints, then proves all-path reachability with two inference rules. Its purpose is to verify distributed-system designs as well as programs. The abstract says: “To be able to verify not just code but also distributed system designs, a new rewrite-theory-generic reachability logic is presented and proved sound for a wide class of rewrite theories.” (abstract, p.1)

## technique: represent systems as rewrite theories

What it is: a rewrite theory `R = (Σ,E,R)` contains a signature of state constructors and operations, equations `E`, and rewrite rules `R`. Ground terms modulo the equations are states; a rewrite rule gives a concurrent transition. The QLOCK example represents a state as `< n | w | c | q >`, with normal, waiting, critical process sets and a waiting queue (section 1, p.2).

When to use it: use this representation when the system's state has algebraic structure and transitions can be described by local rewrite rules. It covers distributed protocols, mutual exclusion, programming-language semantics, and real-time systems, per the paper's examples; the authors state that “A distributed system can be designed and modeled as a rewrite theory R = (Σ, E, R) [8] in the following way” (section 1, p.2). The paper names distributed systems and programming-language semantics (section 4, p.8) and real-time systems (section 6, p.14) as targets.

How to do it:
1. Choose sorts and constructor operations for each state component, such as multisets and lists for QLOCK (section 1, p.2).
2. State equations for algebraic identities. The QLOCK equations include associativity and commutativity of multiset union and identity elements for an empty multiset and empty list (section 1, p.2; section 2, p.6 lists these as the axioms B).
3. Write rewrite rules with conditions. For example, `w2c` changes a waiting process at the queue head into the critical set (section 1, p.2).
4. Interpret execution as rewriting modulo the equations. A state is an equation-equivalence class `[u]`, and `[u] ->R [v]` holds when the rewrite-logic deduction derives the transition (section 1, p.2).

Verus form (Inference): represent the concrete state with Rust structs and define a mathematical state view using a `spec fn`. Represent each rewrite rule as a `proof fn` or state-machine transition whose `requires` predicate matches the rule's left-hand side and whose `ensures` predicate describes the right-hand side. Algebraic equations become lemmas about the view, such as commutativity of a ghost multiset. The paper's rewrite engine and equation modulo matching are not Verus syntax.

Evidence and limits: the QLOCK rule and state encoding are worked examples, not an implementation benchmark. The method requires a topmost rewrite theory and a constructor decomposition with finitary unification assumptions (section 4, p.8). Inference: a Rust encoding must make those algebraic assumptions explicit and prove that each executable operation preserves the chosen representation invariant.

## technique: constrained constructor pattern predicates

What it is: an atomic predicate is `u | ϕ`, where `u` is a constructor term and `ϕ` is a quantifier-free formula over the full signature. It denotes all constructor instances satisfying the constraint. Predicates can be combined with conjunction and disjunction. The authors explain that “The state predicate u | ϕ holds for a state [u′ ] iff there is a ground substitution ρ such that [u′ ] = [uρ] and E |= ϕρ.” (section 1, p.3)

When to use it: use patterns to describe infinite families of states symbolically. This is useful for unbounded process identifiers, queues, or parameterized invariants. In QLOCK, the predicate `<n | w | c | q> | dupl(n w c) != tt` excludes states where `n w c` has a repeated identifier; the paper's motivation is to rule out “a process i which is both waiting and critical at the same time” (section 3, p.7).

How to do it:
1. Split the signature into constructors `Ω` and defined functions `Δ`; require a convergent, sufficiently complete decomposition so terms simplify to constructor terms (section 3, pp.6–7).
2. Write each atomic pattern with a constructor term and a quantifier-free constraint.
3. Combine atoms with `∨` and `∧`. With a finitary constructor unification algorithm, intersections can be reduced to finite disjunctions of constrained constructor patterns (section 3, pp.7–8).
4. Use pattern subsumption to show that one predicate includes another. The paper defines subsumption by a substitution α with `v =EΩ∪BΩ uα` and validity of `ψ ⇒ ϕα` (section 3, p.7).

Verus form (Inference): use a `spec fn` returning `bool` for each pattern predicate, with a Rust state view as its argument. Conjunction and disjunction are ordinary Boolean formulas. For a symbolic multiset, use an abstract sequence or map and prove that the predicate is preserved by each operation. Verus SMT can discharge ground arithmetic constraints, but constructor unification and normalization must be encoded as explicit lemmas or finite case splits.

Evidence and limits: the semantics is formalized by Definition 3 (section 3, p.7), and QLOCK's duplicate check is a concrete example. The approach assumes a constructor decomposition and finitary unification. The paper notes that more general equational theories can make constraint satisfiability undecidable, in which case the implementation must over-approximate or delegate obligations to an inductive prover; this is stated for future versions in footnote 4 (section 5, p.12).

## technique: solve the invariant paradox with a stop transformation

What it is: ordinary reachability formulas are vacuously true for a never-terminating system because they quantify only over terminating paths (section 4, p.8). The paper calls this “the invariant paradox” and explains: “since Term R = ∅, R |=∀T A →⊛ B holds vacuously for all reachability formulas A →⊛ B.” (section 4.1, p.10) The solution adds a fresh stopped-state constructor and a `stop` rewrite rule. Inference: the stopped states play the role of the terminating states `[ ]`, so every reachable state can be turned into a terminating one.

When to use it: use the transformation for safety invariants of systems that can run forever, such as QLOCK, mutual exclusion protocols, or servers. Inference: it converts an invariant claim into a reachability claim about stopped copies of reachable states.

How to do it:
1. Choose initial predicate `S0` and desired invariant predicate `P` in standard form (section 4.1, p.10).
2. Add a new state constructor `[ ... ]` and rule `stop: <x1,...,xn> -> [x1,...,xn]` to obtain `Rstop` (section 4.1, p.10).
3. Lift predicates through brackets: `[B]` replaces the original state constructor with the stopped constructor while retaining `B`'s constraint (section 4.1, p.10).
4. Prove `Rstop |=∀[ ] S0 ->⊛ [P]`. Theorem 1 states this is equivalent to `P` being an invariant of `R` from `S0` (section 4.1, p.10); the proofs are in the technical report [13], not in this paper (section 1, p.3).
5. For QLOCK, define `S0` as an initially empty waiting and critical state with no duplicates, and define `P` as the disjunction for either one critical process at the queue head or no critical process (section 4.1, pp.10–11).

Verus form (Inference): model the stopped copy as a ghost Boolean or enum state and prove a transition that snapshots the current state into that copy. Then state the invariant as a `requires`/`ensures` relation on the ghost snapshot. A Verus loop `invariant` can express preservation directly, so the stop transformation is mainly useful as a proof design pattern for turning the claim that all reachable states satisfy P into a finite transition obligation. Verus has no rewrite-theory `Rstop` command.

Evidence and limits: Theorem 1 and Corollary 1 are the formal evidence. Corollary 1 reduces an invariant proof to initial inclusion `S0 ⊆ P` and an inductive reachability formula from a renamed copy of `P` (section 4.1, p.11). Completeness is not established; the paper says “Investigating completeness of the logic is left as future work.” (section 5, p.13)

## technique: two-rule symbolic proof system

What it is: the proof system has `Step∀ + Subsumption` and `Axiom`. The step rule symbolically rewrites every applicable successor using constructor unification (narrowing) and satisfiable constraints. The axiom rule uses a trusted reachability formula to summarize multiple transitions and handle repetitive behavior (section 5, p.11).

How to do it:
1. Start with a finite set `C` of conjectures, including the target property and auxiliary lemmas. The proof starts with no trusted axioms (section 5, p.11).
2. In `Step∀ + Subsumption`, compute matches against the target patterns and unifiers with every rewrite-rule left side. Discard unsatisfiable constraints and generate one successor goal per satisfiable unifier (section 5, pp.12–13).
3. Ensure the side condition that every non-subsumed state has an `R` successor; this preserves all-path reasoning (section 5, p.13).
4. After at least one step, use conjectures in `C` as axioms. Apply `Axiom` when a current antecedent is an instance of a trusted formula's antecedent and its constraint implies the trusted constraint (section 5, p.13).
5. Close a goal by subsumption when its antecedent is covered by a succedent pattern. For QLOCK, the derivation applies a step for `n2w`, then an axiom for a renamed conjecture, then subsumes the resulting goals (section 6, pp.14–15, Fig. 1).

Verus form (Inference): encode each rewrite rule as a lemma with `requires` for the symbolic antecedent and `ensures` for the successor. Encode the inductive conjecture as a lemma that can be called after establishing its precondition; keep recursive proof calls in proof code so they erase at runtime. Use `assert` and quantified `spec fn` lemmas for subsumption and constraint implication. This reproduces the proof shape, while constructor matching and the paper's implicit variable quantification require explicit Rust data and lemmas.

Evidence and limits: Theorem 2 proves soundness: “If R proves [∅, C] ⊢T C then R |=∀T C.” (section 5, p.13) The implementation uses finitary B-unification and an SMT solver with variant satisfiability (section 6, pp.13–14); the proofs of the theorems are in [13]. The paper warns that future, more general theories may make satisfiability undecidable and require over-approximation or an inductive theorem prover (section 5, p.13).

## technique: constructor unification and SMT automation

What it is: the prototype mechanizes matching and constraint checks with finitary B-unification and variant satisfiability. It requires a convergent decomposition with the finite variant property and a constructor subtheory consisting of commutative, associative-commutative, or identity axioms (section 6, p.14).

How to do it (Inference: this is my reading of the `unify`, `match` and Step rules in section 5, pp.12–13, and the prototype description in section 6, pp.13–14; the paper gives no such step list for the tool):
1. Compute a complete set of constructor matches of the goal's antecedent against the target patterns, and a complete set of constructor unifiers with the rule left sides.
2. Ask the SMT/variant-satisfiability procedure whether the combined pattern and rule constraints `(ϕ′ ∧ φj)α` are satisfiable.
3. Retain satisfiable branches and prove each branch with the two inference rules.

Verus form (Inference): implement normalization and finite matching as executable ghost data transformations only when the state space is bounded. For unbounded algebraic structures, keep them as mathematical specifications and prove the needed match lemmas. Use Verus's SMT-backed arithmetic and Boolean reasoning for the residual constraints, but do not assume it provides Maude's variant satisfiability procedure.

Evidence: the prototype is implemented in Maude and accepts a rewrite theory plus a set of reachability formulas (section 6, p.13). Table 1 lists 9 rows (section 6, p.14): Choice, two communication protocols, Dijkstra, Fixed-Size Token Ring, QLOCK, Readers/Writers, Lamport's Bakery, and Thermostat. The table reports properties, not success fractions or run times. Inference: these examples demonstrate coverage of cases, not a denominator-based performance comparison.

## what is proved, measured, and trusted

The paper states soundness of the two-rule system (Theorem 2) under its rewrite-theory assumptions and the stop-transformation equivalence for invariants (Theorem 1); the proofs are in the technical report [13]. The prototype verifies the Table 1 examples, including mutual exclusion and communication properties, but reports no total count of attempted versus successful proof obligations and no timing denominator. Inference: trusted components include the rewrite semantics, equations, constructor decomposition, unification and satisfiability procedures, the Maude implementation, and any axioms supplied to the proof system. A Verus port would additionally trust the Verus verifier, solver, Rust compiler, ghost erasure, and the abstraction connecting executable Rust to the algebraic state.

The paper does not establish completeness, and its future work includes more general rewrite theories, decision procedures, and an inductive theorem-prover backend (section 6, p.14; section 5, p.13). Inference: VL can reuse the explicit separation between state representation, transition rules, invariant transformation, and inductive proof obligations. It should not present Maude's automation or the listed examples as evidence that agent-written Rust is automatically verified.

## techniques for the catalog

- rewrite-theory modeling: represent states as algebraic terms modulo equations and concurrent steps as rewrite rules
- constrained constructor patterns: describe symbolic sets of states with constructor terms plus quantifier-free constraints
- stop transformation: add a stopped-state constructor and rule to turn invariants of nonterminating systems into reachability formulas
- step and axiom proof rules: use symbolic one-step rewriting, subsumption, and trusted lemmas to prove all-path reachability
- constructor unification automation: combine finitary matching with satisfiability checks to generate proof branches
- invariant corollary: reduce an invariant to initial inclusion and an inductive renamed-pattern reachability obligation
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The reachability logic in [14,15] is based on terminating sequences of state transitions; when there are no terminating states, all reachability formulas are vacuously true."): read the whole paper text (pages 1-16) and the study; checked every quotation, section and page reference, the Table 1 row count, the QLOCK S0/P/derivation description and the proof-rule descriptions against the text; changed one misquoted sentence (the pattern-predicate definition), several page and section references (Fig. 1 derivation is in section 6; footnote 4 is on p.12; subsumption on p.7), the QLOCK duplicate-check gloss, and marked the unification-automation step list, the stop-transformation reading and the trusted-components list as Inference; added that proofs are in the technical report [13], not this paper. Did not check: the proofs in [13], the Maude prototype or its web page, or whether Verus can express these encodings.
