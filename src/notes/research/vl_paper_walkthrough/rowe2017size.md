# Size Relationships in Abstract Cyclic Entailment Systems
(authored by agents unless marked 🧑)

Tag: `rowe2017size` , [paper](http://arxiv.org/abs/1702.03981v1)

## problem and result

This paper gives an abstract method for proving size relationships between antecedent and consequent models in cyclic entailment proofs. A cyclic proof is a finite graph that represents potentially infinite unfolding. Local soundness of each rule is insufficient: an infinite path can otherwise justify circular reasoning. The framework attaches trace values to antecedents and consequents, ordinal progress measures to trace pairs, and a global condition requiring infinitely progressing traces on every infinite path.

The abstract states: “To preclude spurious cyclic reasoning, cyclic proof systems come equipped with a well-founded notion of ‘size’ for the models that interpret their logical statements.” It then aims at “a further condition on proof objects which ensures that models of a given entailment are always ‘smaller’ when interpreted with respect to the consequent than when interpreted with respect to the antecedent” (Abstract, p. 1). The result is useful for termination arguments and program verification, but the paper deliberately leaves the antecedent/consequent syntax and model notion abstract.

The main chain is: an ordinal trace function gives ordinary cyclic soundness; a descending model property bounds size changes across valid rules; trace-value ordering compares every positive maximal right trace with a left trace; and, under finite-progressing, dynamic, and balanced restrictions, that ordering is reduced to containment of finitely ambiguous weighted sum-automata (Theorem 38, p. 20). Corollary 39 makes the ordering decidable for those restricted proofs (p. 21).

## technique 1: abstract cyclic entailment systems and global soundness

What it is. An entailment system has sequents `A ⊢ C`, rule schemas with ordered premises, a model set, and separate satisfaction relations for antecedents and consequents (Definitions 1–5, pp. 1–2). A cyclic pre-proof is a finite directed graph whose nodes are rule instances; paths may be infinite (Definition 2, p. 2). Trace values are finite sets attached to each antecedent and consequent. A trace-pair function assigns an ordinal to a pair of trace values across a rule edge (Definitions 6–8, pp. 2–3).

Global soundness requires every infinite path to have a tail followed by an infinitely progressing left-hand trace (Definition 9, p. 3). An ordinal trace function maps realizable antecedent trace values and models to ordinals, and its descending counter-model property says that a countermodel of a conclusion yields a countermodel of some premise with a non-increasing ordinal after adding the edge's progress (Definitions 10–11, p. 3).

How to apply it.

1. Choose antecedent and consequent syntax, models, and satisfaction relations (Definitions 1 and 3, pp. 1–2)
2. Define locally sound rule schemas and represent a cyclic derivation as a finite graph of rule instances (Definitions 2 and 5, p. 2)
3. Enumerate finite trace values for each antecedent and consequent and define trace-pair ordinals for every premise edge (Definitions 6–7, pp. 2–3)
4. Define progress as a positive ordinal edge weight and require every infinite path to contain an infinitely progressing left trace (Definitions 7–9, p. 3)
5. Provide an ordinal trace function and prove the descending counter-model property for each rule instance (Definitions 10–11, p. 3)
6. Conclude validity of every sequent in a globally sound cyclic proof (Theorem 12, p. 4)

Evidence. Theorem 12 is a formal soundness theorem; it has no implementation experiment or numerical denominator. The proof relies on the impossibility of an infinite descending ordinal chain. The paper says: “This global soundness condition is decidable via a Büchi automata construction.” (p. 3.) That statement concerns checking the graph condition, not deciding arbitrary cyclic proof validity.

Verus form. Inference: represent a trace value and proof node as ghost Rust data, with a specification function assigning an ordinal-like natural rank. State each transition's rank decrease with `ensures`; use a loop `invariant` to preserve path well-formedness and an explicit `decreases` rank for finite execution of a checker. A `proof fn` can establish that every accepted cycle has a progressing edge. Verus can check a concrete finite graph and rank function, but the paper's arbitrary ordinal domain and Büchi acceptance need an encoding and are not built-in Verus features.

Failure modes. Local rule soundness alone does not imply cyclic soundness. The framework assumes a well-founded ordinal interpretation and a complete enough trace relation; if a real countermodel cannot be assigned a trace value, the descent argument does not apply.

## technique 2: maximal traces and trace-value ordering

What it is. To compare consequent and antecedent sizes, the paper fixes an exclusion predicate, defines positive maximal right-hand traces, and distinguishes grounded terminal values from traces ending at axioms (Definitions 13–15, pp. 5–6). A trace is grounded when every model realizing its terminal value has minimal ordinal size. A sequent equates an antecedent and consequent trace value when their ordinals are equal in every valid model.

For a finite trace along a path, its size is the reverse ordinal sum of edge progress values (Definition 16, p. 6). Reverse order matters because ordinal addition is not commutative. The ordering `τ_C ≤^P_ν τ_A` holds when every positive maximal right trace from consequent value `τ_C` has a left trace from `τ_A` whose progress is at least as large, with an extra grounded/axiom condition (Definition 17, p. 6). A strict ordering uses ` < `.

How to apply it.

1. Define which rule instances exclude a terminal consequent trace because no suitable antecedent model exists (Definition 13, p. 5)
2. Enumerate finite maximal right traces and mark each as positive or negative according to exclusion (p. 5)
3. Identify grounded terminal traces and any sequent-level equivalences between left and right trace values (Definitions 14–15, pp. 5–6)
4. Compute each trace's reverse sum of progress ordinals (Definition 16, p. 6)
5. For every positive maximal right trace, find a left trace with matching initial antecedent value, no greater length, and at least the same progress (Definition 17, p. 6)
6. Use the descending model property to derive the size relation for every model (Definition 18 and Theorem 22, pp. 6, 9)

The paper summarizes the semantic intuition: “the upper bound on its size as a realizer of the consequent trace value is not greater (or strictly smaller) than the lower bound on its size as a realizer of the antecedent trace value.” (Discussion before Theorem 22, p. 9.)

Evidence. Lemma 20 constructs a positive maximal right trace supported by any model; Lemma 21 relates reverse progress sums to ordinal sizes; Theorem 22 proves the ordering relation sound. These are universal mathematical statements. There is no benchmark, solver implementation, or measured success rate.

Verus form. Inference: model the ordinal rank with `nat` or another explicitly bounded rank in a `spec fn`, and represent a trace as a ghost sequence. Prove support and ordering with `assert` and proof functions; use `requires` to require that every rule edge has a valid rank relation and `ensures` to return the size bound. Finite natural ranks can be checked directly, while transfinite ordinals require a faithful library model outside ordinary executable Rust.

Limits. Ordering is a relation over all positive maximal traces and can be difficult to decide. Groundness and trace equivalence may themselves be undecidable for a proof system; the paper explicitly says they “will not, in general, be decidable for any given cyclic proof system” (p. 6). The framework therefore supports conservative approximations.

## technique 3: descending model property

What it is. The descending model property strengthens countermodel descent. For a valid, non-axiomatic rule, every antecedent model must extend to a premise model while trace-pair progress bounds antecedent sizes from above and consequent sizes from below (Definition 18, pp. 6–7). This lets a single sequence of models support both right and left traces (Definition 19, p. 7).

How to apply it.

1. For each valid rule instance and antecedent model `m`, choose a premise and model `m'` satisfying the premise antecedent (Definition 18(i), p. 6)
2. Ensure the current consequent trace is terminal or has an outgoing trace pair (Definition 18(ii), p. 6)
3. Prove the ordinal inequalities for every left and right trace successor, using `≤` for antecedent ranks and `≥` for consequent ranks (Definition 18(iii), p. 6)
4. Package these inequalities as a support witness along a path (Definition 19, p. 7)
5. Apply Lemma 20 to obtain a positive maximal right trace and common support, then Lemma 21 to sum the bounds (pp. 7–8)
6. Invoke Theorem 22 to conclude the desired trace-value ordering for all models (p. 9)

Evidence. Lemma 20 proves supported trace existence; Lemma 21 proves the reverse-sum bound by induction; Theorem 22 proves soundness of `<` and `≤` orderings. The denominator is all models of all valid sequents in the abstract system, not a finite test set.

Verus form. Inference: encode a concrete rule transition as a Rust function whose proof contract states the selected premise model and rank inequalities. A proof function can recursively construct support witnesses over a finite trace; executable code should not call proof-only functions. If the proof is implemented recursively, the rank or trace length must be a `decreases` argument.

Failure modes. The property is stronger than ordinary cyclic soundness and may be hard to establish for rules with non-deterministic model construction. It says nothing about the adequacy of a chosen model size for the actual program unless that interpretation is proved separately.

## technique 4: weighted-automata decision procedure

What it is. The paper encodes trace paths as weighted automata. The automata alphabet consists of proof nodes, states carry a node and trace value, and transition weights are trace-pair ordinals. One automaton accepts positive maximal right traces; another accepts matching left traces, with a groundedness restriction. Trace-value ordering becomes containment between weighted languages under `<` or `≤` (Theorem 28 and following construction, pp. 13–16).

General weighted-language containment is undecidable, so the paper restricts proofs by three decidable conditions (Definition 36, pp. 17–18):

- finitely progressing: reachable edge weights are finite ordinals
- dynamic: every reachable simple cycle has positive progress
- balanced: paired left traces have equal progress on every simple binary cycle

Under these conditions, progress differences are bounded by `C(P) × δmax(P)` (Lemma 37, p. 18). The finite truncation bound is `N = 2 + C(P) × δmax(P) × W(P) + W(P)` (Theorem 38, p. 20). The restricted automata are finitely ambiguous sum automata, for which containment is decidable; Corollary 39 therefore decides trace ordering (p. 21).

How to apply it.

1. Construct the right-trace and left-trace weighted automata from the finite cyclic proof graph and trace-pair functions (Sections 7–8, pp. 9–16)
2. Mark accepting right runs that are positive maximal traces and encode grounded terminal values (Theorem 28, pp. 13–16)
3. Check finite progress, dynamic cycles, and balanced paired cycles by graph reachability and simple-cycle enumeration (Definition 36, p. 17)
4. Compute the proof's trace width `W(P)`, binary-cycle threshold `C(P)`, and maximum edge weight `δmax(P)` (Lemma 37 and Theorem 38, pp. 18–20)
5. Truncate the left automaton at `N` and test weighted-language containment against the right automaton (Theorem 38, p. 20)
6. Return `<` or `≤` ordering according to the chosen containment comparison; use Corollary 39 for decidability (p. 21)

Evidence. Theorem 38 gives the equivalence between trace ordering and finite-valued weighted-automata containment under the three restrictions. Corollary 39 gives decidability. The paper provides no implementation, runtime, number of proofs, or measured denominator; all evidence is theorem statements and proofs.

Verus form. Inference: represent automaton states and finite weights with Rust enums and natural numbers; verify transition preservation with `requires`/`ensures`, and verify bounded runs using a `decreases` counter. Use `assert` for cycle-weight inequalities. A Verus proof can validate a concrete checker and finite truncation, but deciding weighted-language containment remains an external algorithm unless fully encoded.

Limits. The result is conditional on the three restrictions. General weighted-automata containment is undecidable, and infinite ordinal weights break the finite arithmetic used in Lemma 37. The computed `N` can be large, so decidability does not imply practical efficiency.

## what is proved, measured, and trusted

Proved: global cyclic soundness from ordinal trace descent (Theorem 12); semantic soundness of trace-value ordering (Theorem 22); finite progress bounds (Lemma 37); and decidability of ordering for finitely progressing, dynamic, balanced proofs (Corollary 39). Trusted assumptions include the model semantics, ordinal trace function, correctness of every trace-pair assignment, and the proof-system-specific exclusion, groundness, and equivalence predicates.

Measured: nothing empirical. There are no programs, benchmark counts, timing results, or accuracy fractions. “Decidable” means an algorithm exists under the stated restrictions; it is not a claim of scalability.

Inference: the threat to VeruLaw is indirect but potentially useful. The paper offers a recipe for proving termination or resource descent in cyclic ghost proofs, which could support verified recursive data-structure and protocol reasoning. It does not verify Rust memory safety, ownership, compiler behavior, or a concrete invariant. The risk is highest if an agent treats an unproved trace-size ranking as evidence of termination. A safe VL integration would make the rank, trace transition, and cycle conditions explicit Verus contracts and verify the finite checker.

VL should not redo the paper's abstract weighted-automata reduction or its three-condition decidability theorem. A novel implementation would need a concrete Verus encoding, measurements on real cyclic proofs, and an accounting of which semantic assumptions remain trusted.

## techniques for the catalog

- cyclic trace soundness: attach ordinal progress to trace pairs and require infinitely progressing left traces on every infinite path
- maximal trace ordering: compare every positive maximal consequent trace with a sufficiently progressing antecedent trace
- descending model property: construct premise models whose ordinal sizes satisfy edge-wise antecedent and consequent bounds
- weighted-automata reduction: encode trace progress as weighted language containment and decide it under finite ambiguity
- finite-progress restrictions: enforce finitely progressing, dynamic, and balanced cycles to obtain a finite truncation bound

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
