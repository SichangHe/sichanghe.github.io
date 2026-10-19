# A cyclic proof system for Guarded Kleene Algebra with Tests (full version)
(authored by agents unless marked 🧑)
Tag: `rooduijn2024cyclic`, [paper](http://arxiv.org/abs/2405.07505v1)

## scope and result

Rooduijn, Kozen, and Silva give a non-well-founded sequent calculus for Guarded Kleene Algebra with Tests (GKAT), a language for deterministic while-programs. A sequent carries antecedent and succedent expression lists plus a set of Boolean atoms. The calculus SGKAT∞ uses ordinary sequents, a fairness condition on while-left rules, and back-edge-compatible infinite proofs. The authors prove soundness and completeness for the guarded-language semantics, show every proof has finitely many distinct sequents and every provable sequent has a regular (cyclic) proof, and derive an NLOGSPACE upper bound for language inclusion. The abstract states: “The deterministic nature of GKAT allows for a non-well-founded sequent system whose set of regular proofs is complete with respect to the guarded language model.” (Abstract, p. 1). It also states: “Moreover, the decision procedure induced by proof search runs in NLOGSPACE, whereas that of Kleene Algebra is in PSPACE.” (Abstract, p. 1).

## technique 1: atom-annotated sequents for guarded programs

what it is

GKAT expressions contain tests, primitive programs, sequential composition, guarded choice, and while loops. A sequent is `Γ ⇒A Δ`, where Γ and Δ are lists of expressions and A is a set of atoms (complete assignments to primitive tests). Its validity is language inclusion `A ⋄ JΓK ⊆ JΔK`; the atom set carries Boolean state so separate propositional rules are unnecessary.

The paper defines a sequent as “A sequent is a triple (Γ, A, ∆), written Γ ⇒A ∆, where A ⊆ At and Γ and ∆ are (possibly empty) lists of GKAT-expressions.” (Definition 1, p. 6). It explains: “This tucks away the Boolean content, as is usual in the GKAT literature, allowing us to omit propositional rules.” (Remark 5, p. 6).

when to use it

Inference: an explicit state annotation may help when program meaning depends on guards. In this calculus, atom annotations carry the Boolean restrictions through rule applications.

how to do it

1. Fix a finite nonempty set T of primitive tests and a disjoint nonempty set Σ of primitive programs; define atoms as complete assignments to T (Sections 2.1–2.2, p. 4)
2. Interpret expressions as languages of guarded strings (Section 2.2, p. 5)
3. Represent a judgment as antecedent list, atom set A, and succedent list (Definition 1, p. 6)
4. Define validity as guarded-language inclusion (Definition 2, p. 6)
5. Restrict rule applications to the leftmost expression in each cedent (Section 3, p. 7)
6. Use `A ↾ b = {α ∈ A : α ≤ b}` in test-left rules; split guarded choice and loop rules between b and its complement. Test-right instead requires `A ↾ b = A`; modal rules reset the annotation to At in their premise (Figure 1, p. 6; Section 3, p. 7)

Verus form

Inference: represent the atom set as a ghost predicate over an explicit state type, and encode guard facts in `requires` clauses or loop invariants. Use executable Rust for tests and transitions, `spec fn` for the guarded-language abstraction, and `proof fn` lemmas to show that each transition preserves the abstract relation. This is a modeling suggestion; the paper’s sequents and guarded strings are not Verus constructs.

what shows it works

The paper gives a concrete guarded-string semantics and checks a while/if example: “while a do (if b then p else q)” (Example 1, p. 4). The calculus’s rule set includes left/right rules for tests, guarded choice, sequencing, and loops, plus identity, bottom, and modal rules (Figure 1, p. 6).

where it fails or assumes

The paper fixes a finite nonempty test alphabet T and a disjoint nonempty program alphabet Σ; it does not require Σ to be finite (Section 2.1, p. 4). Inference: there are `2^|T|` atoms. The complexity claim should be read under the paper’s fixed-T setup, not as a bound for arbitrary Boolean encodings with a growing test alphabet.

## technique 2: priority and invertibility for proof search

what it is

Rules are ordered by appearance: left logical rules first, right logical rules next, then axioms/modal rules. A rule application has priority when no higher-priority rule has the same conclusion. Every rule is sound; all are invertible except modal k and k0, which become invertible when applied with priority. This lets a proof-search procedure make deterministic local choices without losing valid proofs.

The paper states: “We prioritise the rules of SGKAT in order of occurrence in Figure 1, reading left-to-right, top-to-bottom.” (Section 4, p. 9). Its central result is: “Every rule of SGKAT is sound. Moreover, every rule is invertible except for k and k0, which are invertible whenever they have priority.” (Proposition 1, p. 9).

when to use it

Inference: priority is useful when some rule applications preserve validity in both directions only under additional conditions. Prove those conditions before using a rule as a reversible search step.

how to do it

1. Fix a total priority order over rule schemas (Section 4, p. 9)
2. For a conclusion, determine whether a higher-priority rule has the same conclusion (Section 4, p. 9)
3. Apply priority logical rules eagerly because validity of the conclusion implies validity of every premise (Proposition 1, p. 9)
4. Use priority k or k0 at terminal leaves. The repeated-right-loop case separately justifies k0 by proving its premise valid (Theorem 2, pp. 15–16)
5. Feed the resulting premises back into proof search while preserving atom annotations (Section 6, p. 15)

Verus form

Inference: a Verus proof-search scheduler could first try simplifications proved equivalent to the current obligation. A change that strengthens an invariant would need a separate justification; invertibility does not follow merely from strengthening it. The paper does not evaluate such a scheduler.

what shows it works

The authors prove soundness of all rules and use invertibility to maintain valid leaves throughout completeness search (Proposition 1, p. 9; Theorem 2, p. 15). A key k-rule argument uses the guarded-language property `JpK ⋄ L = JpK ⋄ K implies L = K` (proof of Proposition 1, p. 10), showing why the priority side condition matters.

where it fails or assumes

k and k0 are not generally invertible. Applying them without priority can destroy a valid proof search path; the paper gives a counterexample for k (p. 10). The rule schemas act only on the leftmost expression; that restriction is also essential to regularity.

## technique 3: fairness and weighted while-height for sound cyclic reasoning

what it is

An SGKAT∞ derivation may be infinite, but it is a proof only when every leaf is an axiom and every infinite branch applies the while-left rule `(b)-l` infinitely often. Soundness first handles finite proofs, then replaces a loop by every finite unrolling and uses a multiset measure—the weighted while-height of antecedent loops—to justify induction.

Definition 3 requires that every infinite branch “is fair for (b)-l, i.e. contains infinitely many applications of the rule (b)-l.” (Section 3, p. 7). Theorem 1 proves that provability implies guarded-language inclusion (p. 10).

when to use it

Inference: a cyclic proof search needs a condition that rules out unjustified repetition. Here fairness supports a soundness argument using a measure that decreases under finite unrolling.

how to do it

1. Define finite unrollings `[e^(b)]^0 := ¬b` and `[e^(b)]^(n+1) := b · e · [e^(b)]^n`. The base is the complement of b, as shown in the PDF; its overbar is lost in the text extraction (Section 4, p. 10)
2. Prove that a provable loop sequent remains provable after any finite unrolling (Lemma 5, p. 10)
3. Define while-height as maximum loop nesting depth, and weighted while-height as the multiset of these heights for all expressions in the antecedent (Section 4, p. 10)
4. Show every finite unrolling strictly decreases the multiset measure (Lemma 6, p. 10)
5. On an infinite proof, select the finite set of first loop-left nodes on infinite branches; fairness and König’s lemma ensure this set is finite (Theorem 1 proof, pp. 10–11)
6. Apply induction to each unrolled node and recover validity of the original loop (Theorem 1 proof, pp. 10–11)

Verus form

Inference: a Verus model could express a guarded-language relation in an invariant and prove finite-unrolling lemmas with a decreasing measure. That would require a separate encoding and proof; the paper establishes no correspondence between SGKAT fairness and Verus loop verification.

what shows it works

Theorem 1 establishes semantic inclusion for every fair SGKAT∞ proof (p. 10). The argument explicitly uses finite unrollings and the weighted measure, so an infinite derivation is not trusted merely because it repeats.

where it fails or assumes

Fairness is tied to `(b)-l`, not `(b)-r`; this asymmetry is part of the calculus. The method assumes König’s lemma and finite branching to extract a finite set of loop nodes. An unfair infinite derivation is not a proof (Example 4, p. 8).

## technique 4: regularity via syntax-tree tails

what it is

The authors prove that every proof contains only finitely many distinct sequents. Each expression gets a syntax tree; each possible leftmost node determines one unique tail cedent. Because rules always act on the leftmost expression, antecedents and succedents are realizations of tail-generated tree-node lists. There are linearly many tails on each side, hence quadratically many distinct sequents.

The paper emphasizes: “The results of this section crucially depend on the fact that we are only applying rules to the leftmost expressions of cedents.” (Section 5, p. 11). Corollary 1 gives a quadratic bound in `|Te| + |Tf|` on the number of distinct sequents (p. 13).

when to use it

Inference: syntax-tree pointers and their determined tails are useful when a calculus admits the tail property proved here. Applying this representation to a different proof system would require proving that property again.

how to do it

1. Build a well-founded labelled syntax tree for each root expression (Definition 5, p. 11)
2. Represent a cedent by syntax-tree nodes and define its realization (Definition 6, p. 12)
3. Set the root tail to empty. For sequencing, the first child’s tail is the second child followed by the parent tail, and the second child inherits the parent tail. Choice children inherit the parent tail; a loop child’s tail is the loop node followed by the parent tail (Definition 7, p. 12)
4. Prove derived antecedents are realizations of tail-generated e-cedents; succedents are realizations of tail-generated f-cedents or 0-cedents, accounting for k0 (Lemma 7, pp. 12–13)
5. Count linear tails on the antecedent and succedent sides to obtain the quadratic sequent bound (Corollary 1, p. 13)
6. Convert the finite-state infinite tree to a regular proof and, equivalently, a finite tree with back edges (Corollary 2, p. 13)

Verus form

Inference: index a proof-search state by program syntax nodes, loop labels, and invariant contexts. Cache obligations by this structural key to detect repeated states. In a Verus implementation, the final proof still needs ordinary contracts and termination/progress arguments; the tail graph is an external search representation.

what shows it works

Corollary 2 states that every SGKAT∞ proof has a regular one (p. 13). This is the finite-state result needed to view the system as cyclic rather than merely infinitary.

where it fails or assumes

The quadratic bound depends on leftmost-only rules. Allowing arbitrary positions can create infinitely many distinct cedents by repeatedly unravelling one loop (Section 5, p. 11). The bound is on distinct sequents, not necessarily on the time needed to discover a proof.

## technique 5: completeness proof search and space bound

what it is

Completeness uses a four-stage bottom-up strategy: exhaust left logical rules; apply right logical rules until a terminal leaf or a repeated loop pattern; use k0 when a loop language is empty; then close by id, bottom, k, or k0. Lemmas guarantee that valid sequents always admit a rule and that repeated right-loop patterns yield an empty-loop sequent. A nondeterministic failing-branch search stores only one sequent at a time.

The paper states: “Any valid sequent is the conclusion of some rule application.” (Lemma 8, p. 13). Theorem 2 concludes: “Every valid sequent is provable in SGKAT∞.” (p. 15).

when to use it

Inference: staged search may help separate decomposition, repetition detection, and closure. Here the finite-state representation supports bounded repetition checks and the space analysis.

how to do it

1. Apply left logical rules until the antecedent is empty or begins with a primitive program, called exposed; if this never happens, continue the infinite branch in this stage (Theorem 2, stage 1, p. 15)
2. Apply right logical rules until none applies, or a repeated while pattern satisfies Lemma 10, including preservation of the repeated succedent as a final segment (stage 2, p. 15)
3. For the repeated-loop case, close immediately with bottom if A is empty. Otherwise use validity, the empty loop language, and the exposed antecedent to justify the k0 premise; apply k0 and return to stage 1 (stage 3, pp. 15–16)
4. At a terminal leaf apply id, bottom, priority k, or priority k0 (stage 4, p. 16)
5. Use fairness: every infinite branch either remains in left-loop stage or returns through terminating stages infinitely often (Theorem 2 proof, p. 16)
6. For complexity, nondeterministically search for a failing branch while storing syntax-tree pointers, the atom set, the stage, and two counters. Replace stage 2’s loop check by a limit of `2 · |At| · |Tf|`, and stop the search at `4 · |Te| · |At| · |Tf|` (Proposition 2, p. 16; full proof, p. 26)

Verus form

Inference: structure an agent’s Verus search into phases: normalize contracts and invariants, split conjunctions or state transitions, search helper lemmas, detect repeated obligation states, and close or report a counterexample. Cache states by syntax and contract context. This can reduce memory but does not replace Verus’s SMT-backed checking.

what shows it works

Proposition 2 gives coNLOGSPACE proof search and therefore an NLOGSPACE upper bound for GKAT language inclusion (p. 16). The proof bounds a failing branch by `4 · |Te | · |At| · |Tf |` (p. 16; full proof, p. 26), with syntax-tree sizes and atom count as the factors.

where it fails or assumes

The complexity is an upper bound for the stated procedure under the paper’s fixed test alphabet and syntax-tree input representation (Section 2.1, p. 4; Proposition 2, p. 26). The paper leaves optimality open: “We have obtained an upper bound of NLOGSPACE, but do not know whether it is optimal.” (Section 7, p. 17).

## what is proved, trusted, and still open

The paper proves semantic soundness and completeness of SGKAT∞ relative to the guarded-language model; regular cyclic proofs are complete as a corollary. Trusted foundations include the definitions of GKAT syntax and semantics, the rule calculus, fairness condition, and mathematical arguments using König’s lemma and multiset induction. Inference: these mathematical results supply no evidence that a concrete Rust compiler or Verus specification is correct.

The paper’s complexity claims use the stated abstract model. The abstract says NLOGSPACE, while Proposition 2 explains that proof search runs in coNLOGSPACE and language inclusion is in NLOGSPACE (p. 16); this is a complement relationship, not an arithmetic contradiction. The regularity claim is quadratic in root syntax-tree sizes (Corollary 1, p. 13), while the finite proof-search branch bound additionally multiplies by atom count (Proposition 2, p. 16; full proof, p. 26).

## techniques for the catalog

- atom-annotated sequents — carry guard-state sets in judgments so Boolean reasoning is explicit and propositional rules can be omitted
- priority and invertibility — prioritize reversible decompositions; justify k0 separately in the repeated-right-loop case
- fair cyclic reasoning — require infinitely repeated loop-left progress and prove soundness with finite unrolling plus a decreasing measure
- syntax-tree regularity — represent leftmost cedents by unique syntax tails to obtain finite-state cyclic proofs
- staged bounded proof search — search in left, right, loop-empty, and closure phases; the space procedure stores one sequent and counters
