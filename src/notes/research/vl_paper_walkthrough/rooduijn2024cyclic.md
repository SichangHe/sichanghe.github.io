# A cyclic proof system for Guarded Kleene Algebra with Tests (full version)
(authored by agents unless marked 🧑)
Tag: `rooduijn2024cyclic`, [paper](http://arxiv.org/abs/2405.07505v1)

## scope and result

Rooduijn, Kozen, and Silva give a non-well-founded sequent calculus for Guarded Kleene Algebra with Tests (GKAT), a language for deterministic while-programs. A sequent carries antecedent and succedent expression lists plus a set of Boolean atoms. The calculus SGKAT∞ uses ordinary sequents, a fairness condition on while-left rules, and back-edge-compatible infinite proofs. The authors prove soundness and completeness for the guarded-language semantics, show every proof can be made regular (finite-state/cyclic), and derive an NLOGSPACE upper bound for language inclusion. The abstract states: “The deterministic nature of GKAT allows for a non-well-founded sequent system whose set of regular proofs is complete with respect to the guarded language model” (Abstract, p. 1). It also states: “the decision procedure induced by proof search runs in NLOGSPACE” (Abstract, p. 1).

Inference: this is a proof-theoretic foundation rather than a Rust verification workflow. Its useful lesson for VL is how to represent loop reasoning with finite state, fairness/progress, invertible rules, and explicit semantic annotations. Verus loop proofs are usually well-founded and invariant-based; cyclic proof ideas can guide automation or proof-search diagnostics but do not transfer as executable Verus syntax.

## technique 1: atom-annotated sequents for guarded programs

what it is

GKAT expressions contain tests, primitive programs, sequential composition, guarded choice, and while loops. A sequent is `Γ ⇒A Δ`, where Γ and Δ are lists of expressions and A is a set of atoms (complete assignments to primitive tests). Its validity is language inclusion `A ⋄ JΓK ⊆ JΔK`; the atom set carries Boolean state so separate propositional rules are unnecessary.

The paper defines a sequent as “a triple (Γ, A, ∆), written Γ ⇒A ∆, where A ⊆ At and Γ and ∆ are (possibly empty) lists of GKAT-expressions” (Definition 1, p. 6). It says the atom annotation “tucks away the Boolean content, as is usual in the GKAT literature, allowing us to omit propositional rules” (Remark 5, p. 6).

when to use it

Use an explicit state annotation when program meaning depends on path conditions or guards. Carrying the guard set through rules avoids repeatedly re-proving propositional facts and makes each transition’s enabled states concrete.

how to do it

1. Define primitive tests T, primitive programs Σ, and atoms as complete Boolean assignments (Section 2.2, p. 5)
2. Interpret expressions as languages of guarded strings (Section 2.2, p. 5)
3. Represent a judgment as antecedent list, atom set A, and succedent list (Definition 1, p. 6)
4. Define validity as guarded-language inclusion (Definition 2, p. 6)
5. Restrict rule applications to the leftmost expression in each cedent (Section 3, p. 7)
6. Update A with `A ↾ b` when a guard b is consumed by a rule (Figure 1, p. 6)

Verus form

Inference: represent the atom set as a ghost predicate over an explicit state type, and encode guard facts in `requires` clauses or loop invariants. Use executable Rust for tests and transitions, `spec fn` for the guarded-language abstraction, and `proof fn` lemmas to show that each transition preserves the abstract relation. This is a modeling suggestion; the paper’s sequents and guarded strings are not Verus constructs.

what shows it works

The paper gives a concrete guarded-string semantics and checks a while/if example: “while a do (if b then p else q)” (Example 1, p. 4). The calculus’s rule set includes left/right rules for tests, guarded choice, sequencing, and loops, plus identity, bottom, and modal rules (Figure 1, p. 6).

where it fails or assumes

The model assumes deterministic GKAT programs and finite primitive test/program alphabets. The atom set can be exponentially large in the number of primitive tests; the complexity result controls storage by syntax-tree pointers and atom information rather than enumerating every language string.

## technique 2: priority and invertibility for proof search

what it is

Rules are ordered by appearance: left logical rules first, right logical rules next, then axioms/modal rules. A rule application has priority when no higher-priority rule has the same conclusion. Every rule is sound; all are invertible except modal k and k0, which become invertible when applied with priority. This lets a proof-search procedure make deterministic local choices without losing valid proofs.

The paper states: “We prioritise the rules of SGKAT in order of occurrence in Figure 1, reading left-to-right, top-to-bottom” (Section 4, p. 9). Its central result is: “Every rule of SGKAT is sound. Moreover, every rule is invertible except for k and k0, which are invertible whenever they have priority” (Proposition 1, p. 9).

when to use it

Use priority when several decompositions can match the same goal and some choices preserve equivalence while others do not. Mark non-invertible steps explicitly and apply them only under conditions that restore invertibility.

how to do it

1. Fix a total priority order over rule schemas (Section 4, p. 9)
2. For a conclusion, determine whether a higher-priority rule has the same conclusion (Section 4, p. 9)
3. Apply priority logical rules eagerly because validity of the conclusion implies validity of every premise (Proposition 1, p. 9)
4. Apply k or k0 only when priority makes that instance invertible (Proposition 1, pp. 9–10)
5. Feed the resulting premises back into proof search while preserving atom annotations (Section 6, p. 15)

Verus form

Inference: use a rule scheduler that first applies contract-preserving simplifications and invariant-strengthening steps known to be logically reversible. Defer expensive lemma search or non-invertible abstraction changes until their preconditions are established. In Verus, this is orchestration around `requires`, `ensures`, and `invariant`, not a new proof rule in the language.

what shows it works

The authors prove soundness of all rules and use invertibility to maintain valid leaves throughout completeness search (Proposition 1, p. 9; Theorem 2, p. 15). A key k-rule argument uses the guarded-language property `JpK ⋄ L = JpK ⋄ K implies L = K` (proof of Proposition 1, p. 10), showing why the priority side condition matters.

where it fails or assumes

k and k0 are not generally invertible. Applying them without priority can destroy a valid proof search path; the paper gives a counterexample for k (p. 10). Priority also depends on always reducing the leftmost expression, an operational restriction used later for regularity.

## technique 3: fairness and weighted while-height for sound cyclic reasoning

what it is

An SGKAT∞ derivation may be infinite, but it is a proof only when every infinite branch applies the while-left rule `(b)-l` infinitely often. Soundness first handles finite proofs, then replaces a loop by every finite unrolling and uses a multiset measure—the weighted while-height of antecedent loops—to justify induction.

Definition 3 requires that every infinite branch “is fair for (b)-l, i.e. contains infinitely many applications of the rule (b)-l” (Section 3, p. 7). The soundness theorem is explicit: “If SGKAT ⊢∞ Γ ⇒A ∆, then A ⋄ JΓ K ⊆ J∆K” (Theorem 1, p. 10).

when to use it

Use a fairness/progress condition whenever a cyclic proof can otherwise loop forever without consuming the semantic structure of a loop. Pair it with a well-founded measure that decreases under finite unrolling.

how to do it

1. Define finite unrollings `[e(b)]0 := b` and `[e(b)]n+1 := be[e(b)]n` (Section 4, p. 10)
2. Prove that a provable loop sequent remains provable after any finite unrolling (Lemma 5, p. 10)
3. Define while-height and weighted while-height as a multiset of loop nestings (Section 4, p. 10)
4. Show every finite unrolling strictly decreases the multiset measure (Lemma 6, p. 10)
5. On an infinite proof, select the finite set of first loop-left nodes on branches; fairness and König’s lemma ensure this set is finite (Theorem 1 proof, p. 10)
6. Apply induction to each unrolled node and recover validity of the original loop (Theorem 1 proof, pp. 10–11)

Verus form

Inference: encode the same idea with a loop `invariant` describing the abstract guarded-language relation and a `decreases` measure for termination when the executable loop is terminating. If the Rust loop is intentionally non-terminating, Verus’s ordinary total-correctness pattern is insufficient; model progress or a state-machine transition property separately. Do not write cyclic proof notation as Verus code.

what shows it works

Theorem 1 establishes semantic inclusion for every fair SGKAT∞ proof (p. 10). The argument explicitly uses finite unrollings and the weighted measure, so an infinite derivation is not trusted merely because it repeats.

where it fails or assumes

Fairness is tied to `(b)-l`, not `(b)-r`; this asymmetry is part of the calculus. The method assumes König’s lemma and finite branching to extract a finite set of loop nodes. An unfair infinite derivation is not a proof (Example 4, p. 8).

## technique 4: regularity via syntax-tree tails

what it is

The authors prove that every proof contains only finitely many distinct sequents. Each expression gets a syntax tree; each possible leftmost node determines one unique tail cedent. Because rules always act on the leftmost expression, antecedents and succedents are realizations of tail-generated tree-node lists. There are linearly many tails on each side, hence quadratically many distinct sequents.

The paper emphasizes: “The results of this section crucially depend on the fact that we are only applying rules to the leftmost expressions of cedents” (Section 5, p. 11). It concludes: “The number of distinct sequents in an SGKAT∞-proof of e ⇒A f is quadratic in |Te | + |Tf |” (Corollary 1, p. 13).

when to use it

Use a syntax-tree state representation when proof search repeatedly unfolds loops or compound terms. Store pointers to subexpressions and their deterministic tails rather than copying whole formulas.

how to do it

1. Build a well-founded labelled syntax tree for each root expression (Definition 5, p. 11)
2. Represent a cedent by syntax-tree nodes and define its realization (Definition 6, p. 12)
3. Define `tail(u)` by connective: sequencing appends the sibling, guarded choice shares the tail, and a loop child prepends the loop node (Definition 7, p. 12)
4. Restrict rule application to leftmost expressions and prove every derived cedent is tail-generated (Lemma 7, pp. 12–13)
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

The paper states: “Every valid sequent is the conclusion of some rule application” (Lemma 8, p. 14). Theorem 2 concludes: “Every valid sequent is provable in SGKAT∞” (p. 15).

when to use it

Use staged search when eager decomposition, loop detection, and terminal closure have different invariants. A finite-state representation allows bounded repetition checks and complexity analysis.

how to do it

1. Apply left rules until the antecedent is exposed (Theorem 2, stage 1, pp. 15–16)
2. Apply right rules; stop at a terminal leaf or a repeated while pattern satisfying Lemma 10 (stage 2, p. 16)
3. If a repeated loop implies `e(b) ⇒A 0`, use validity to show the antecedent language is empty, then apply k0 (stage 3, p. 16)
4. At a terminal leaf apply id, bottom, priority k, or priority k0 (stage 4, p. 16)
5. Use fairness: every infinite branch either remains in left-loop stage or returns through terminating stages infinitely often (Theorem 2 proof, p. 16)
6. For complexity, nondeterministically search for a failing branch while storing syntax-tree pointers and atom set (Proposition 2, pp. 16–17)

Verus form

Inference: structure an agent’s Verus search into phases: normalize contracts and invariants, split conjunctions or state transitions, search helper lemmas, detect repeated obligation states, and close or report a counterexample. Cache states by syntax and contract context. This can reduce memory but does not replace Verus’s SMT-backed checking.

what shows it works

Proposition 2 gives coNLOGSPACE proof search and therefore an NLOGSPACE upper bound for GKAT language inclusion (p. 16). The proof bounds a failing branch by `4 · |Te | · |At| · |Tf |` (p. 17), with syntax-tree sizes and atom count as the factors.

where it fails or assumes

The complexity is an upper bound for this abstract language-inclusion problem, not a claim that every implementation runs in that space. It relies on finite syntax trees, atom sets, bounded loop repetition, and the restricted rule strategy. Verus proof search has different theories, ownership constraints, and solver behavior.

## what is proved, trusted, and still open

The paper proves semantic soundness and completeness of SGKAT∞ relative to the guarded-language model; regular cyclic proofs are complete as a corollary. Trusted foundations include the definitions of GKAT syntax and semantics, the rule calculus, fairness condition, and mathematical arguments using König’s lemma and multiset induction. The result does not verify a concrete Rust compiler or prove that a Verus specification captures a product requirement.

The paper’s complexity claims use the stated abstract model. The abstract says NLOGSPACE, while Proposition 2 explains that proof search runs in coNLOGSPACE and language inclusion is in NLOGSPACE (p. 16); this is a complement relationship, not an arithmetic contradiction. The regularity claim is quadratic in root syntax-tree sizes (Corollary 1, p. 13), while the finite proof-search branch bound additionally multiplies by atom count (Proposition 2, p. 17).

Inference: for agent-authored Verus code, the paper creates an indirect but concrete risk. A proof agent can loop on a recurring obligation or repeatedly unfold a loop without exposing a progress measure. VL can borrow finite-state obligation caching, explicit fairness/progress diagnostics, and priority-aware decomposition. It should not claim that cyclic SGKAT proofs directly verify Rust: Verus uses Rust contracts, `invariant`, and `decreases`, whereas this paper’s sequents and back edges are a separate proof calculus.

## techniques for the catalog

- atom-annotated sequents — carry guard-state sets in judgments so Boolean reasoning is explicit and propositional rules can be omitted
- priority and invertibility — order decomposition rules and apply non-invertible modal rules only when priority restores reversibility
- fair cyclic reasoning — require infinitely repeated loop-left progress and prove soundness with finite unrolling plus a decreasing measure
- syntax-tree regularity — represent leftmost cedents by unique syntax tails to obtain finite-state cyclic proofs
- staged bounded proof search — search in left, right, loop-empty, and closure phases while caching one finite-state obligation
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
