# Size Relationships in Abstract Cyclic Entailment Systems
(authored by agents unless marked 🧑)

Tag: `rowe2017size` , [paper](http://arxiv.org/abs/1702.03981v1)

## problem and result

This paper gives an abstract method for proving size relationships between antecedent and consequent models in cyclic entailment proofs. A cyclic proof is a finite graph that represents potentially infinite unfolding. Local soundness of each rule is insufficient: an infinite path can otherwise justify circular reasoning. The framework attaches trace values to antecedents and consequents, ordinal progress measures to trace pairs, and a global condition requiring infinitely progressing traces on every infinite path.

The abstract states: “To preclude spurious cyclic reasoning, cyclic proof systems come equipped with a well-founded notion of ‘size’ for the models that interpret their logical statements.” It then aims at “a further condition on proof objects which ensures that models of a given entailment are always ‘smaller’ when interpreted with respect to the consequent than when interpreted with respect to the antecedent” (Abstract, p. 1). The paper says that “Knowledge of such relationships is useful in a program verification setting” (Abstract, p. 1); it keeps the antecedent/consequent syntax and the model notion abstract.

The main chain is: an ordinal trace function gives ordinary cyclic soundness; a descending model property bounds size changes across valid rules; trace-value ordering compares every positive maximal right trace with a left trace; and, under finite-progressing, dynamic, and balanced restrictions, that ordering is reduced to containment of finitely ambiguous weighted sum-automata (Theorem 38, p. 20, which compares the consequent automaton with a truncated antecedent automaton). Corollary 39 makes the ordering decidable for those restricted proofs (p. 21).

## technique 1: abstract cyclic entailment systems and global soundness

What it is. An entailment system has sequents `A ⊢ C`, rule schemas with ordered premises, a model set, and separate satisfaction relations for antecedents and consequents (Definitions 1–5, pp. 1–2). A cyclic pre-proof is a finite directed graph whose nodes are rule instances; paths may be infinite (Definition 2, p. 2). Trace values are finite sets attached to each antecedent and consequent. A trace-pair function assigns an ordinal to a pair of trace values across a rule edge (Definitions 6–8, pp. 3–4).

Global soundness requires every infinite path to have a tail followed by an infinitely progressing left-hand trace (Definition 9, p. 4). An ordinal trace function is a partial function from trace values and models to ordinals, defined at least on pairs of an antecedent trace value and a model of that antecedent; its descending counter-model property says that a countermodel of a rule's conclusion yields a countermodel of some premise such that, for each trace pair with progress α, the premise ordinal plus α is at most the conclusion ordinal (Definitions 10–11, p. 4).

How to apply it.

1. Choose antecedent and consequent syntax, models, and satisfaction relations (Definitions 1 and 3, pp. 1–2)
2. Define locally sound rule schemas and represent a cyclic derivation as a finite graph of rule instances (Definitions 2 and 5, p. 2)
3. Enumerate finite trace values for each antecedent and consequent and define trace-pair ordinals for every premise edge (Definitions 6–7, p. 3)
4. Assign each trace pair an ordinal (progressing when positive, non-progressing when zero) and require every infinite path to have a tail followed by an infinitely progressing left trace (Definitions 7–9, pp. 3–4)
5. Provide an ordinal trace function and prove the descending counter-model property for each rule instance (Definitions 10–11, p. 4)
6. Conclude validity of the proved sequent from a globally sound cyclic proof (Theorem 12, p. 4)

Evidence. Theorem 12 is a formal soundness theorem (assuming an ordinal trace function exists); it has no implementation experiment or numerical denominator, and the paper states it without a proof. The same kind of argument, an infinite descending chain of ordinals from an infinitely progressing trace, appears in the proof of Lemma 20 (p. 8). The paper says: “This global soundness condition is decidable via a Büchi automata construction.” (p. 4.) Inference: that statement concerns checking the graph condition, not deciding arbitrary cyclic proof validity.

Verus form. Inference: represent a trace value and proof node as ghost Rust data, with a specification function assigning an ordinal-like natural rank. State each transition's rank decrease with `ensures`; use a loop `invariant` to preserve path well-formedness and an explicit `decreases` rank for finite execution of a checker. A `proof fn` can establish that every accepted cycle has a progressing edge. Verus can check a concrete finite graph and rank function, but the paper's arbitrary ordinal domain and Büchi acceptance need an encoding and are not built-in Verus features.

Failure modes. Local rule soundness alone does not imply cyclic soundness. The framework assumes a well-founded ordinal interpretation and a complete enough trace relation; if a real countermodel cannot be assigned a trace value, the descent argument does not apply.

## technique 2: maximal traces and trace-value ordering

What it is. To compare consequent and antecedent sizes, the paper fixes an exclusion predicate, defines positive maximal right-hand traces, and distinguishes grounded terminal values from traces ending at axioms (Definitions 13–15, p. 5). A terminal consequent trace value is ground for a rule instance when, if the sequent is valid, its ordinal is 1 (the least value of the ordinal trace function) for every model of the antecedent at which it is defined. A sequent equates an antecedent and a consequent trace value when, if the sequent is valid, the two ordinals are equal for every model of the antecedent at which the consequent one is defined.

For a finite trace along a path, its size is the reverse ordinal sum of edge progress values (Definition 16, p. 6). Reverse order matters because ordinal addition is not commutative. The ordering `τ_C ≤^P_ν τ_A` holds when every positive maximal right trace from consequent value `τ_C` has a left trace from `τ_A` whose progress is at least as large, with an extra grounded/axiom condition (Definition 17, p. 6). A strict ordering uses ` < `.

How to apply it.

1. Define the exclusion predicate: a rule instance may exclude a consequent trace value only if the antecedent has no models or no model of it has a defined ordinal for that value (p. 5, before Definition 13)
2. Enumerate finite maximal right traces and mark each as positive or negative according to exclusion (p. 5)
3. Identify grounded terminal traces and any sequent-level equivalences between left and right trace values (Definitions 14–15, p. 5)
4. Compute each trace's reverse sum of progress ordinals (Definition 16, p. 6)
5. For every positive maximal right trace, find a left trace with matching initial antecedent value, no greater length, and at least the same progress (Definition 17, p. 6)
6. Use the descending model property to derive the size relation for every model (Definition 18 and Theorem 22, pp. 6–7, 9)

The paper summarizes the semantic intuition: “the upper bound on its size as a realizer of the consequent trace value is not greater (or is strictly smaller) than the lower bound on its size as a realizer of the antecedent trace value.” (Paragraph before Theorem 22, p. 9.)

Evidence. Lemma 20 constructs a positive maximal right trace supported by any model; Lemma 21 relates reverse progress sums to ordinal sizes; Theorem 22 proves the ordering relation sound. These are universal mathematical statements. There is no benchmark, solver implementation, or measured success rate.

Verus form. Inference: model the ordinal rank with `nat` or another explicitly bounded rank in a `spec fn`, and represent a trace as a ghost sequence. Prove support and ordering with `assert` and proof functions; use `requires` to require that every rule edge has a valid rank relation and `ensures` to return the size bound. Finite natural ranks can be checked directly, while transfinite ordinals require a faithful library model outside ordinary executable Rust.

Limits. Ordering is a relation over all positive maximal traces; Inference: it can be difficult to decide in general. Groundness and trace equivalence may themselves be undecidable for a proof system; the paper explicitly says they “will not, in general, be decidable for any given cyclic proof system” (p. 6). The paper's remedy is approximation: it suffices to decide groundness for instances of a chosen set of rules and to treat all other trace values as not ground, and to decide equating only for conclusions of axiomatic rule instances (p. 6).

## technique 3: descending model property

What it is. The descending model property strengthens countermodel descent. For a valid, non-axiomatic rule, every antecedent model must extend to a premise model while trace-pair progress bounds antecedent sizes from above and consequent sizes from below (Definition 18, pp. 6–7). This lets a single sequence of models support both right and left traces (Definition 19, p. 7).

How to apply it.

1. For each valid rule instance and antecedent model `m`, choose a premise and model `m'` satisfying the premise antecedent (Definition 18(i), p. 7)
2. Ensure the current consequent trace is terminal or has an outgoing trace pair (Definition 18(ii), p. 7)
3. Prove the ordinal inequalities for every left and right trace successor, using `≤` for antecedent ranks and `≥` for consequent ranks (Definition 18(iii), p. 7)
4. Package these inequalities as a support witness along a path (Definition 19, p. 7)
5. Apply Lemma 20 to obtain a positive maximal right trace and common support, then Lemma 21 to sum the bounds (pp. 7–8)
6. Invoke Theorem 22 to conclude the desired trace-value ordering for all models (p. 9)

Evidence. Lemma 20 (stated under the paper's “Trace Descent Property”, which appears to be the Descending Model Property of Definition 18; the paper does not say so explicitly) proves supported trace existence; Lemma 21 proves the reverse-sum bound by induction; Theorem 22 proves soundness of `<` and `≤` orderings. The denominator is all models of all valid sequents in the abstract system, not a finite test set.

Verus form. Inference: encode a concrete rule transition as a Rust function whose proof contract states the selected premise model and rank inequalities. A proof function can recursively construct support witnesses over a finite trace; executable code should not call proof-only functions. If the proof is implemented recursively, the rank or trace length must be a `decreases` argument.

Failure modes. The paper notes that the property differs from the descending counter-model property in that it concerns models of valid sequents and also consequent trace values (p. 7). Inference: it may be hard to establish for rules whose premise models are hard to construct, and it says nothing about the adequacy of a chosen model size for an actual program unless that interpretation is proved separately.

## technique 4: weighted-automata decision procedure

What it is. The paper encodes trace paths as weighted automata. The automata alphabet consists of proof nodes, states carry a node and trace value, and transition weights are trace-pair ordinals. One automaton accepts positive maximal right traces; another accepts matching left traces, with a groundedness restriction. Trace-value ordering becomes containment between weighted languages under `<` or `≤` (Definition 23, p. 10; Theorem 28, pp. 12–14). The ordering is computed over the ordinal-valued max-plus (tropical) semiring.

Weighted-automata language containment is “known to be undecidable in general [7, 1]” (p. 9), so the paper restricts proofs by three decidable conditions (Definition 36, pp. 17–18):

- finitely progressing: reachable edge weights are finite ordinals
- dynamic: every reachable simple cycle has positive progress
- balanced: paired left traces have equal progress on every simple binary cycle

Under these conditions, progress differences are bounded by `C(P) × δmax(P)` (Lemma 37, p. 18). The finite truncation bound is `N = 2 + C(P) × δmax(P) × W(P) + W(P)` (Theorem 38, p. 20). The restricted automata are finitely ambiguous sum automata, for which containment is decidable; Corollary 39 therefore decides trace ordering (p. 21).

How to apply it.

1. Construct the right-trace and left-trace weighted automata from the finite cyclic proof graph and trace-pair functions (Definitions 23 and 31, pp. 10 and 15)
2. Mark accepting right runs that are positive maximal traces and encode grounded terminal values (Corollary 27 and Theorem 28, pp. 12–14)
3. Check finite progress, dynamic cycles, and balanced paired cycles by graph reachability and simple-cycle enumeration (Definition 36, p. 17)
4. Compute the proof's trace width `W(P)`, binary-cycle threshold `C(P)`, and maximum edge weight `δmax(P)` (W(P) is defined in the proof of Lemma 32, p. 16; C(P) before Lemma 37, p. 18; Lemma 37 and Theorem 38, pp. 18–20)
5. Truncate the left automaton at `N` (Definition 31, p. 15) and test weighted-language containment against the right automaton, together with the groundedness check (Theorem 38, p. 20)
6. Return `<` or `≤` ordering according to the chosen containment comparison; use Corollary 39 for decidability (p. 21)

Evidence. Theorem 38 gives the equivalence between trace ordering and containment of the right automaton in the truncated left automaton (with the right automaton grounded) under the three restrictions. Corollary 39 gives decidability. The paper provides no implementation, runtime, number of proofs, or measured denominator; all evidence is theorem statements and proofs.

Verus form. Inference: represent automaton states and finite weights with Rust enums and natural numbers; verify transition preservation with `requires`/`ensures`, and verify bounded runs using a `decreases` counter. Use `assert` for cycle-weight inequalities. A Verus proof can validate a concrete checker and finite truncation, but deciding weighted-language containment remains an external algorithm unless fully encoded.

Limits. The result is conditional on the three restrictions. General weighted-automata containment is undecidable (p. 9), and the paper notes that the equational reasoning in Lemma 37 “does not hold in general when the size of the traces can be infinite ordinals” (p. 19). Inference: `N` can be large, so decidability does not imply practical efficiency.

## what is proved, measured, and trusted

Proved: global cyclic soundness from ordinal trace descent (Theorem 12); semantic soundness of trace-value ordering (Theorem 22); finite progress bounds (Lemma 37); and decidability of ordering for finitely progressing, dynamic, balanced proofs (Corollary 39). Inference: trusted assumptions include the model semantics, ordinal trace function, correctness of every trace-pair assignment, and the proof-system-specific exclusion, groundness, and equivalence predicates.

Measured: nothing empirical. There are no programs, benchmark counts, timing results, or accuracy fractions. “Decidable” means an algorithm exists under the stated restrictions; it is not a claim of scalability.

Inference: the threat to VeruLaw is indirect but potentially useful. The paper offers a recipe for proving termination or resource descent in cyclic ghost proofs, which could support verified recursive data-structure and protocol reasoning. It does not verify Rust memory safety, ownership, compiler behavior, or a concrete invariant. The risk is highest if an agent treats an unproved trace-size ranking as evidence of termination. A safe VL integration would make the rank, trace transition, and cycle conditions explicit Verus contracts and verify the finite checker.

Inference: VL should not redo the paper's abstract weighted-automata reduction or its three-condition decidability theorem. A novel implementation would need a concrete Verus encoding, measurements on real cyclic proofs, and an accounting of which semantic assumptions remain trusted.

## techniques for the catalog

- cyclic trace soundness: attach ordinal progress to trace pairs and require infinitely progressing left traces on every infinite path
- maximal trace ordering: compare every positive maximal consequent trace with a sufficiently progressing antecedent trace
- descending model property: construct premise models whose ordinal sizes satisfy edge-wise antecedent and consequent bounds
- weighted-automata reduction: encode trace progress as weighted language containment and decide it under finite ambiguity
- finite-progress restrictions: enforce finitely progressing, dynamic, and balanced cycles to obtain a finite truncation bound

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Weighted automata [5] generalise finite-state automata by assigning to each word a value that is taken from a (usually infinite) set of weights, rather than simply a binary value indicating whether the word is included in the language or not."): read the whole paper text (pp. 1-22) and the whole study; checked every quotation, definition/lemma/theorem number, page number, the three restrictions, the formula for N and the decidability claims; changed several page references (Definitions 6-11 and Definition 9 are on pp. 3-4, Definitions 13-15 on p. 5, Definition 18 items on p. 7, the automata construction on pp. 10-14, no numbered sections exist), one quote word ("is strictly smaller"), the claim that Theorem 12 has a proof in the paper (it is stated without proof), the "termination arguments" claim (the paper says program verification), and the description of groundness, equating and Theorem 38; marked own conclusions "Inference:"; did not check the Verus encodings (all marked Inference), the proofs of Lemmas 24-26, 30, 32-35 and Theorem 28/38 line by line, or the cited references.
