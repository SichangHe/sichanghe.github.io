# Proof search for propositional abstract separation logics via labelled sequents
(authored by agents unless marked 🧑)
Tag: `hou2014proofsearch`, [paper](https://arxiv.org/abs/1307.5592)

## result and semantic model

Hou, Clouston, Gore, and Tiu build a modular labelled-sequent calculus and prover for propositional abstract separation logics (PASL). The abstract says: “We develop a modular proof theory for various propositional abstract separation logics using cut-free labelled sequent calculi.” (Abstract, p. 1.) PASL is the propositional fragment of Calcagno et al.'s abstract separation logic; the paper calls it "a refinement of BBI, differing only by the addition of the semantic properties of partial-determinism and cancellativity" (Section 1, p. 1). It keeps the BBI connectives (separating conjunction, its unit, magic wand) while abstracting from a concrete heap. Its semantic model is a partial cancellative commutative monoid, represented as a ternary relation `R(h1,h2,h3)` plus a unit world ε (Section 2.1, pp. 2–3). Formula `A * B` holds when a world splits into `h1` and `h2` satisfying the subformulas; `A −* B` holds when every extension satisfying `A` satisfies `B`.

A labelled sequent is `G; Γ ⊢ Δ`, where `G` contains relational atoms `(a,b ⊲ c)` and Γ, Δ contain labelled formulas. The calculus extends the BBI rules with partial-determinism (P) and cancellativity (C), and later adds indivisible unit (IU), disjointness (D), splittability, and cross-split rules (Sections 2 and 4). The authors state: “Their assertion languages, called propositional abstract separation logics, extend the logic of (Boolean) Bunched Implications (BBI) in various ways.” (Abstract, p. 1.)

Inference: this relational decomposition is a useful Verus ghost model for ownership and separation. A Rust proof can model resources as ghost worlds and `R` as a split relation, then prove frame and ownership rules. The paper's abstract worlds do not by themselves model addresses, bytes, or Rust lifetimes.

## technique: labelled sequent rules and cut elimination

The calculus makes resource composition explicit. Logical rules decompose connectives; `*L` introduces fresh labels and a relational atom for a separating conjunction; `*R` proves a conjunction by choosing a split; `−*L` and `−*R` reason about extensions. Structural rules encode commutativity (E), associativity (A), unit (U), a special case of associativity (AC), equality substitutions (Eq1/Eq2), partial-determinism (P), and cancellativity (C) (Figure 1, p. 4). A sequent is falsifiable in an extended model when every relational atom in G holds under the label mapping, every labelled formula in Γ is true at its world, and every labelled formula in Δ is not true at its world (Definition 2.3, p. 5).

Soundness is stated as: “For any formula A, and for an arbitrary label w, if the labelled sequent ⊢ w : A is derivable in LSPASL then A is valid.” (Theorem 2.1, Section 2.2, p. 5.) The proof is only sketched in the paper (“We prove that the rules of LSPASL preserve falsifiability upwards. The proof is straightforward so we omit the details”). Cut elimination follows the route of the earlier LSBBI proof via substitution, weakening, invertibility, and contraction admissibility (Lemmas 2.2–2.5, Theorem 2.6, Section 2.3, p. 5), with proofs in Appendix A.1. The additional cases are those for P and C, whose “treatment is similar to that for Eq1 in the proof for LSBBI”.

Inference: a Verus separation library can use a ghost `Resource` type and a relation `combine(a,b,c)`. Each proof lemma should expose the exact algebraic law needed, such as commutativity or cancellativity. Verus does not provide sequent calculus automation, so the labelled rules would be encoded as proof functions or tactic-generated lemmas, with resource ownership represented by ghost state and Rust borrow permissions.

## technique: substitution-free intermediate calculus

Completeness is difficult because equality rules perform label substitution. The paper isolates Eq1, Eq2, P, and C into an equivalence entailment `G ⊢E (a=b)`, defined by a sequence of structural-rule applications whose composite substitution makes the labels syntactically equal (Section 3.1, pp. 5–6). The intermediate calculus ILSPASL removes explicit substitutions and uses `⊢E` as side conditions. The relation `=G` induced by this entailment is proved an equivalence relation (Lemma 3.2, p. 6), and ILSPASL is shown equivalent to the original calculus (Lemma 3.3, p. 6).

The paper says this normalization is needed because of “difficulty in formulating the saturation conditions for rules involving label substitutions” (Section 3, p. 5). In the counter-model construction, label equality is checked through `⊢E` (the relation `=G`) rather than by rewriting labels. The implemented prover (Section 6) still applies the substitution rules Eq1, Eq2, P, C, IU, D directly to unify labels.

Inference: in Verus, normalize ghost resource identities with an equivalence relation or canonical representative before invoking arithmetic and ownership lemmas. A canonicalization invariant can replace repeated map-wide substitutions, but proving it requires extensional equality of all ghost structures.

## technique: Hintikka counter-model construction

To prove completeness, the authors saturate an unprovable sequent into a Hintikka sequent. Definition 3.3 (p. 7) lists 15 closure conditions covering the Boolean connectives, `⊤*`, `*`, magic wand, identity, commutativity, and associativity of relational atoms, and non-occurrence of `⊥` on the left and `⊤` on the right. Partial-determinism and cancellativity do not appear as separate conditions; they enter through the label equivalence `=G` defined by `⊢E`. Lemma 3.4 shows every Hintikka sequent is falsifiable. A fair scheduler enumerates each side, label, formula or structural-rule dummy (U, E, A, AC), and up to two relational atoms infinitely often (Definition 3.4, p. 8; Lemma 3.5). Starting from an unprovable formula, Definition 3.5 (p. 8) applies the scheduled rule when its principal material is present, uses fresh labels `a_2i`, `a_2i+1` for `*L` and `−*R`, and, for the branching rules, chooses the premise that has no derivation, so the finite sequents stay underivable (Lemma 3.6). The union of the sequence is the limit sequent (Definition 3.6); Lemma 3.7 proves it is Hintikka, and Theorem 3.8 (p. 9) extracts a counter-model, establishing completeness; Corollary 3.9 transfers this to LSPASL.

Inference: the schedule must be fair because a rule that is applicable but never scheduled could leave a Hintikka condition unsatisfied in the limit. The construction is a proof device, not the implemented search: its steps ask whether finite sequents have derivations. The paper notes that “no decision procedure for PASL is possible” (Section 1, p. 2) and calls its prover “a complete semi-decision procedure” “given certain fairness assumptions” (Section 8, p. 16).

Inference: this gives Verus a pattern for counterexample-producing ghost search. A bounded Rust checker can enumerate resource splits fairly, record an unsatisfied obligation, and either produce a proof certificate or a finite counterexample under a bounded model. Infinite completeness and fresh-label reasoning would require a separate meta-theory outside executable Verus code.

## technique: modular separation-theory extensions

The paper adds semantic properties by adding structural rules. IU expresses that splitting the unit forces both parts to be unit; D expresses disjointness and implies IU. Splittability adds a rule that every non-unit world splits into two non-unit worlds plus excluded-middle and inequality rules. Cross-split adds relational atoms for intersections of two decompositions. The authors prove soundness for all these rules and cut-free completeness for the combined system (Proposition 4.5, Theorems 4.7 and 4.8, Section 4, pp. 9–11). Theorem 4.8 is stated with only a one-sentence proof (“By a proof that appropriately incorporates the treatments for these properties in this section”); the splittability and cross-split completeness proof is in Appendix A.4. They caution that the current framework does not fully accommodate every property without modifications: “the more exotic properties of splittability and cross-split are not fully compatible with our current framework, they require non-trivial changes to the proofs in previous sections.” (Section 4, p. 9.)

The paper lists eleven labelled calculi from combinations of P, C, IU, and D (Section 5, pp. 11–12), and says subsystems containing splittability or cross-split “can be obtained” by the treatment of Theorem 4.7 but are not shown.

Inference: this lets a user choose the weakest resource theory that matches the program.

Inference: Verus should parameterize ghost resource lemmas by the exact algebraic assumptions instead of asserting heap-specific facts globally. A product that uses finite ownership usually needs disjointness and cancellativity, while fractional permissions may need a different model.

## technique: proof-search strategy and optimizations

Separata implements LSPASL + D. Its ordered search procedure is explicit (Section 6, pp. 12–13): (1) try to close the branch with id, ⊥L, ⊤*R; (2) apply all possible Eq1, Eq2, P, C, IU, D rules to unify labels; (3) apply the invertible rules ∧L, ∧R, →L, →R, *L, −*R, ⊤*L; (4) try `*R` or `−*L` with existing relational atoms; (5) if none applies, apply structural rules to the relational atoms: E for all commutative variants, A for each applicable pair, then U′ for identity atoms; and (6) fail if none of the above applies. The AC rule is not implemented because it is admissible in LSBBI + C (Proposition 6.1), and U is restricted to U′ that only creates `(w, ǫ ⊲ w)` for labels w in the conclusion (Lemma 6.2). Substitution terminates because each substitution eliminates a label, and structural saturation terminates when no new atoms are produced. The search uses focusing: decomposed formulas are moved to the front, while non-deterministic principal formulas are moved to the end for fair consideration.

Three optimizations are reported (Section 6, p. 13). (1) Back-jumping collects the “unsatisfiable core” along each branch: “When one premise of a binary rule has a derivation, we try to derive the other premise only when the unsatisfiable core is not included in that premise.” (2) A strategy from Park et al. forbids applying `*R` or `−*L` twice with the same principal formula and principal relational atom, “since the effect is the same as contraction, which is admissible”. (3) An associativity heuristic, borrowed from the authors' earlier work, finds labels for the subformulas of a right-hand `z : A * B`, builds a binary tree from them, and prioritizes the corresponding relational atoms; without a free-variable system it is “just a special case of the original one”.

## techniques for the catalog

- labelled separation sequents: represent resource composition with relational atoms and labelled formulas
- cut-free modular rules: add partial-determinism, cancellativity, unit, disjointness, and split properties as structural rules
- substitution-free equivalence: isolate label substitutions into an equivalence entailment and canonical equality relation
- Hintikka saturation: fairly apply logical and structural rules until a counter-model can be extracted from the limit sequent
- focused proof search: close branches, unify labels, exhaust invertible rules, then explore split rules with back-jumping and associativity heuristics
