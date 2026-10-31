# Structural Invariants for the Verification of Systems with Parameterized Architectures
(authored by agents unless marked 🧑)
Tag: `bozga2020structural`, [paper](http://arxiv.org/abs/2002.07672v2)

This paper verifies an unbounded family of replicated finite-state components. A system is given by component types and an interaction formula describing communication and architecture; each finite universe induces a 1-safe Petri net. The central idea is to derive invariants from interaction syntax instead of iterating the transition relation. “We synthesize parameterized invariants directly from the interaction formula of a system, without iterating its transition relation.” (Section 1, p. 2). The target logic is weak monadic second-order logic of κ successor functions, WSκS. The interaction logic ILκ is embedded in it; for κ = 1 it describes pipeline and token-ring architectures, and higher κ describes tree-shaped architectures (Section 2, p. 5).

## technique 1: parameterized Petri-net semantics

What it is. Translate each component instance and each minimal model of an interaction clause into a place and synchronized Petri-net transition. A place is `(local state, component identity)`. A transition consumes and produces the participating ports; all other components idle. The construction yields one marked 1-safe net for every universe size (Section 2.1, pp. 6–7). “The semantics of a component-based system S = hC1 , . . . , CN , Γi is an infinite family of Petri Nets, one for each universe of Γ.” (Section 2.1, p. 6)

How to do it.

1. Describe each component type by ports, states, initial state, and local transitions; describe interactions with the interaction logic ILκ (Section 2, pp. 4–5).
2. Fix a finite universe U. Create place `(s,u)` for every local state `s` and identity `u` (Section 2.1, p. 7).
3. For each minimal model of each interaction clause, create a transition and connect it to the source and target places of each participating local transition (Section 2.1, p. 7).
4. Mark exactly each component's initial-state place. The construction guarantees one token per component identity and therefore 1-safety (Section 2.1, p. 7).
5. Express the safety set as a WSκS formula over sets of places; later checks quantify over all U (Section 3.2, pp. 9–11).

Verus form. Inference: represent a component state as an enum and the finite multiset of identities as a Rust map or sequence. Define a `spec fn` for the abstract marking and a `proof fn` showing each executable transition preserves one-state-per-identity. A Rust `while` over transitions uses an `invariant` for that per-identity property; `requires` captures enabledness and `ensures` captures the post-state. WSκS satisfiability itself is external to Verus, so a Verus development must either replay the finite instance or trust a certificate.

Assumptions and limits. The paper's semantics assumes finite-state components and interactions without exchange of data (Section 1, p. 1), over universes that are finite ranked trees (Section 2, p. 5). Parameterized verification is undecidable in general (Section 1, p. 1), so the method is sound but incomplete (Section 4, p. 11); the final WSκS formula is decidable. Inference: a Rust system with unbounded heap pointers or data-dependent messages needs an additional abstraction before this translation applies.

## technique 2: structural trap invariants

What it is. A trap is a set W of Petri-net places such that every transition consuming a place in W also produces a place in W. If initially marked, at least one place in W remains marked forever. The trap invariant is the set of markings intersecting every initially marked trap. “An IMT defines an invariant of the Petri Net, because some place in the trap will always be marked, no matter which sequence of transitions is fired.” (Section 3, p. 8)

How to do it.

1. For a fixed net, a trap satisfies `W• ⊆ •W`; an initially marked trap (IMT) contains an initially marked place (Section 3, p. 8).
2. Encode a candidate place set with Boolean variables. The trap constraint Θ(N) is the conjunction, over all transitions t, of the implication from the disjunction of the places in the preset of t to the disjunction of the places in its postset (Section 3, p. 8).
3. Embed ILκ into WSκS (Section 3.1, pp. 8–9). The paper embeds ILκ formulae without predicates and set variables; the translation Tr rewrites each successor atom `succi(x) = y`, handling the wrap-around to the root, and is homomorphic for the first-order connectives. Lemma 1 states that a formula and its translation are equivalent on every structure.
4. For each interaction clause, define WSκS formulas `intersects-pre` and `intersects-post` for intersection of the place set with a transition's preset and postset, then conjoin, over the clause's universally quantified participants, the implication from `intersects-pre` to `intersects-post` (formula (6)) to obtain `trap-predS` (Section 3.2, pp. 9–10). Lemma 2 states that an assignment satisfies `trap-predS` iff it encodes a trap.
5. Define `markingS(X)` to enforce exactly one state per component instance, `initially-markedS(X)` to identify initially marked traps, and `trap-invariantS(X)` (formula (7)) to require intersection with every set satisfying `trap-predS ∧ initially-markedS` (Section 3.2, p. 10).
6. Ask whether `∃X. markingS(X) ∧ trap-invariantS(X) ∧ ¬ϕ(X)` (formula (8)) is unsatisfiable. Theorem 1 says unsatisfiability proves ϕ for every universe (Section 3.2, p. 11).

Verus form. Inference: a trap can be represented by a ghost `Set` or predicate over component identities. A `spec fn trap` states the preset/postset implication; a `proof fn` proves preservation for each transition. The global invariant is an `invariant` asserting that every initially marked trap has a marked member. Verus quantifiers over an abstract unbounded universe may require finite bounds or a mathematical sequence model, so the WSκS decision procedure is not directly a Verus primitive.

Evidence. The authors' prototype, ostrich, handles only token-ring and pipeline topologies, for which verification reduces to satisfiability of a WS1S formula; satisfiability was checked with Mona version 1.4/17 (Section 5, p. 14). For the global dining-philosophers benchmark, Table 1 (p. 16) lists deadlock-freedom as verified, 0.23 seconds, and Mona automaton sizes (states / BDD nodes) of 32/174 for `trap`, 19/112 for `trap-inv`, 15/80 for `flow`, and 11/59 for `flow-inv`. Times are not uniformly small: Dijkstra takes 35.68 s and Dijkstra (ring) 83.46 s. Traps alone can be too weak: the paper's alternating dining philosophers instance with n = 3 has a deadlock state that intersects every trap, so trap invariants cannot prove deadlock freedom there (Section 4, pp. 11–12, Proposition 1).

## technique 3: one-invariants as a refinement

What it is. A 1-invariant is a 0/1 weighted sum of places that equals one in every reachable marking. The paper gives structural sufficient conditions: the set contains one initially marked place, and every transition either intersects its pre- and postset in the same 0-or-1 cardinality or has more than one preset member (Definition 1 and Lemma 3, Section 4.1, p. 12). “Although linear invariants are not structural and rely on the set of reachable markings of a marked Petri Net, the set of 1-invariants can be sufficiently under-approximated by structural conditions.” (Section 4.1, p. 12)

How to do it.

1. Choose a set of places F and require the initial marking to put exactly one token in F (Lemma 3, p. 12).
2. Define `unique-initS` (the set uniquely intersects the initial states) and, for each interaction clause, `uniquepreCS` and `uniquepostCS` (unique intersection with the preset and postset of the transition); the paper gives their formulas in the appendix (Section 4.1, pp. 12–13; appendix Section 10).
3. Conjoin `unique-initS` with, for each clause, the formula (9) that encodes the structural cardinality alternatives of Lemma 3 (2), giving `1-predS`; Lemma 4 proves that any satisfying interpretation yields a 1-invariant (Section 4.1, p. 13).
4. Define `1-invariantS(X)` by requiring, via `unique-intersectionS`, unique intersection with every set satisfying `1-predS` (Equation 10, p. 13).
5. Check the stronger unsatisfiability query `∃X. markingS(X) ∧ 1-invariantS(X) ∧ trap-invariantS(X) ∧ ¬ϕ(X)` (formula (11), Theorem 2, Section 4.1, p. 13).

Verus form. Inference: encode the weighted sum as a ghost arithmetic lemma over a sequence of component states. A `proof fn` can show the sum is one before and after each transition; the executable loop carries it in an `invariant`. The structural cardinality condition must be proved for each transition pattern, rather than written as an `invariant(...)` call.

Failure and evidence. The structural conditions are sufficient but not complete: the paper says “the opposite is not true: the are 1-invariants not captured by these conditions” (Section 4.1, p. 12). In Table 1 (p. 16), Preemptive (high) and Preemptive (uninitialized) verify deadlock freedom but not mutual exclusion; Dining Cryptographers, Herman (linear) fail deadlock-freedom; for Szymanski and Dijkstra (ring) the properties are marked “n.a.”, which the paper defines as Mona timing out before the automaton was computed (Section 5, p. 15). The prototype only handles token-ring and pipeline topologies; for the one tree-topology example the formula was constructed manually (Section 5, p. 14). Inference: these are material limits on coverage.

## what is proved, measured, and trusted

Theorems 1 and 2 prove soundness for every universe U when the corresponding WSκS query is unsatisfiable. The implementation measures Mona time, automaton states, and BDD nodes, and reports whether each listed property was established; it does not claim completeness of the trap or one-invariant abstraction. Inference: the trusted base includes the component-to-Petri-net encoding, the ILκ-to-WSκS translation, Mona's decision procedure, and the manually chosen component model. The paper reports that “the satisfiability checks often can be done in very short time” despite one quantifier alternation, and offers as a possible explanation that exponential blowup from universal quantification may occur only in theoretical corner cases (Section 5, p. 15); it gives no aggregate success count beyond the individual rows of Table 1 (p. 16).

The paper's conclusion says the technique is “very cheap, since it avoids costly fixpoint computations” and “suggests incorporating it into other verifiers as a cheap preprocessing step” (Section 6, p. 15).

Inference: the threat to agent-written verified Rust is moderate for replicated control protocols. The paper says its method needs no manual cut-off proof (Section 1, p. 3) and handles systems with broadcast communication (Section 6, p. 15). Inference: it can find global safety proofs without a cutoff, including broadcast systems, but it cannot prove properties absent from the structural abstraction and has topology restrictions in the prototype. Ownership, data values, and implementation refinement remain outside the paper.

## techniques for the catalog

- parameterized Petri-net semantics: instantiate each universe as a 1-safe net whose transitions are minimal interaction models
- ILκ-to-WSκS translation: encode successor-based interactions and component-place sets in decidable weak monadic second-order logic
- structural trap invariant: derive a universal invariant from preset/postset preservation without fixed-point iteration
- parameterized trap query: prove every instance by unsatisfiability of marking, trap-invariant, and negated-safety formulas
- structural one-invariant refinement: use initial and unique-intersection conditions to add linear invariants
- combined trap/one-invariant checking: intersect both overapproximations before testing the safety property
