# Structural Invariants for the Verification of Systems with Parameterized Architectures
(authored by agents unless marked 🧑)
Tag: `bozga2020structural`, [paper](http://arxiv.org/abs/2002.07672v2)

This paper verifies an unbounded family of replicated finite-state components. A system is given by component types and an interaction formula describing communication and architecture; each finite universe induces a 1-safe Petri net. The central idea is to derive invariants from interaction syntax instead of iterating the transition relation. “We synthesize parameterized invariants directly from the interaction formula of a system, without iterating its transition relation.” (Section 1, p. 2). The target logic is weak monadic second-order logic of successor functions, WSκS, which can express token-ring, pipeline, and tree-shaped universes.

## technique 1: parameterized Petri-net semantics

What it is. Translate each component instance and each minimal model of an interaction clause into a place and synchronized Petri-net transition. A place is `(local state, component identity)`. A transition consumes and produces the participating ports; all other components idle. The construction yields one marked 1-safe net for every universe size (Section 2.1, pp. 5–6). “The semantics of a component-based system S = hC1 , . . . , CN , Γi is an infinite family of Petri Nets, one for each universe of Γ.” (Section 2.1, p. 5)

How to do it.

1. Describe each component type by ports, states, initial state, and local transitions; describe interactions with the interaction logic ILκ (Sections 1–2, pp. 2–5).
2. Fix a finite universe U. Create place `(s,u)` for every local state `s` and identity `u` (Section 2.1, p. 6).
3. For each minimal model of each interaction clause, create a transition and connect it to the source and target places of each participating local transition (Section 2.1, p. 6).
4. Mark exactly each component's initial-state place. The construction guarantees one token per component identity and therefore 1-safety (Section 2.1, p. 6).
5. Express the safety set as a WSκS formula over sets of places; later checks quantify over all U (Section 3.2, pp. 8–10).

Verus form. Inference: represent a component state as an enum and the finite multiset of identities as a Rust map or sequence. Define a `spec fn` for the abstract marking and a `proof fn` showing each executable transition preserves one-state-per-identity. A Rust `while` over transitions uses an `invariant` for that per-identity property; `requires` captures enabledness and `ensures` captures the post-state. WSκS satisfiability itself is external to Verus, so a Verus development must either replay the finite instance or trust a certificate.

Assumptions and limits. The paper's semantics assumes finite-state components, no data exchange in the basic interaction model, and the chosen successor structures. Parameterized verification is undecidable in general; decidability comes from the restricted logic and topology. Inference: a Rust system with unbounded heap pointers or data-dependent messages needs an additional abstraction before this translation applies.

## technique 2: structural trap invariants

What it is. A trap is a set W of Petri-net places such that every transition consuming a place in W also produces a place in W. If initially marked, at least one place in W remains marked forever. The trap invariant is the set of markings intersecting every initially marked trap. “An IMT defines an invariant of the Petri Net, because some place in the trap will always be marked, no matter which sequence of transitions is fired.” (Section 3, p. 7)

How to do it.

1. For a fixed net, define `W• ⊆ •W` and select traps containing an initially marked place (Section 3, p. 7).
2. Encode a candidate place set with Boolean variables. The trap constraint is the conjunction, for every transition, of a preset-intersection implication to a postset intersection (Section 3, p. 7).
3. Embed the interaction formula ILκ into WSκS by translating successor atoms and predicates (Section 3.1, pp. 7–8). The paper proves equivalence of the translation in Lemma 1.
4. For each interaction clause, define WSκS formulas for intersection with a transition's preset and postset, then conjoin the implication for all universally quantified participants (Section 3.2, pp. 8–9).
5. Define `markingS(X)` to enforce exactly one state per component, `initially-markedS(X)` to identify initially marked traps, and `trap-invariantS(X)` to require intersection with every such trap (Section 3.2, pp. 9–10).
6. Ask whether `∃X. markingS(X) ∧ trap-invariantS(X) ∧ ¬ϕ(X)` is unsatisfiable. Theorem 1 says unsatisfiability proves ϕ for every universe (Section 3.2, p. 10).

Verus form. Inference: a trap can be represented by a ghost `Set` or predicate over component identities. A `spec fn trap` states the preset/postset implication; a `proof fn` proves preservation for each transition. The global invariant is an `invariant` asserting that every initially marked trap has a marked member. Verus quantifiers over an abstract unbounded universe may require finite bounds or a mathematical sequence model, so the WSκS decision procedure is not directly a Verus primitive.

Evidence. The authors' prototype, ostrich, derives these formulas syntactically and checks WS1S/WSκS with Mona 1.4/17 (Section 5, p. 11). For the global dining-philosophers benchmark, the table reports 0.23 seconds, 32/174 automaton states/BDD nodes for `trap`, 19/112 for `trap-inv`, 15/80 for `flow`, and 11/59 for `flow-inv` (Table 1, p. 14). The denominator for each ratio is the automaton/BDD representation size, not a success percentage. The method verifies deadlock freedom for that benchmark but fails its mutual-exclusion property (Table 1, p. 14), showing that traps can be too weak.

## technique 3: one-invariants as a refinement

What it is. A 1-invariant is a 0/1 weighted sum of places that equals one in every reachable marking. The paper gives structural sufficient conditions: the set contains one initially marked place, and every transition either intersects its pre- and postset in the same 0-or-1 cardinality or has more than one preset member (Definition 1 and Lemma 3, Section 4, pp. 10–11). “Although linear invariants are not structural and rely on the set of reachable markings of a marked Petri Net, the set of 1-invariants can be sufficiently under-approximated by structural conditions.” (Section 4, p. 10)

How to do it.

1. Choose a set of places F and require the initial marking to contain exactly one F place (Lemma 3, p. 11).
2. For each interaction, encode the structural cardinality alternatives with `unique-initS`, `unique-intersectionS`, `uniquepreS`, and `uniquepostS` (Section 4.1, pp. 11–12).
3. Conjoin those formulas into `1-predS`; Lemma 4 proves that any satisfying interpretation yields a 1-invariant (Section 4.1, p. 12).
4. Define `1-invariantS(X)` by universally requiring unique intersection with every set satisfying `1-predS` (Equation 10, p. 12).
5. Check the stronger unsatisfiability query `∃X. markingS(X) ∧ 1-invariantS(X) ∧ trap-invariantS(X) ∧ ¬ϕ(X)` (Theorem 2, Section 4.1, p. 12).

Verus form. Inference: encode the weighted sum as a ghost arithmetic lemma over a sequence of component states. A `proof fn` can show the sum is one before and after each transition; the executable loop carries it in an `invariant`. The structural cardinality condition must be proved for each transition pattern, rather than written as an `invariant(...)` call.

Failure and evidence. The structural conditions are sufficient but not complete: the paper explicitly says some 1-invariants are not captured (Section 4, p. 11). In the table, Preemptive (high) verifies deadlock freedom but not mutual exclusion; Szymanski has “n.a.” for some automata because Mona timed out (Table 1, pp. 13–14). The prototype only automatically handles token-ring and pipeline topologies; a tree example was manually encoded (Section 5, p. 11). These are material assumptions on coverage.

## what is proved, measured, and trusted

Theorems 1 and 2 prove soundness for every universe U when the corresponding WSκS query is unsatisfiable. The implementation measures Mona time, automaton states, and BDD nodes, and reports whether each listed property was established; it does not claim completeness of the trap or one-invariant abstraction. The trusted base includes the component-to-Petri-net encoding, ILκ-to-WSκS translation, Mona's decision procedure, and the manually chosen component model. The paper reports that formula checks are often short despite one quantifier alternation, but gives no aggregate success denominator beyond the individual benchmark rows (Section 5, pp. 12–14).

The paper already provides a cheap invariant-preprocessing stage for parameterized architectures. Inference: VL should reuse trap/one-invariant generation for replicated Rust protocols instead of inventing a second fixed-point engine; the remaining integration task is a sound certificate format that Verus can replay.

Inference: the threat to agent-written verified Rust is moderate for replicated control protocols. The method can find global safety proofs without a cutoff, including broadcast systems, but it cannot prove properties absent from the structural abstraction and has topology restrictions in the prototype. Ownership, data values, and implementation refinement remain outside the paper.

## techniques for the catalog

- parameterized Petri-net semantics: instantiate each universe as a 1-safe net whose transitions are minimal interaction models
- ILκ-to-WSκS translation: encode successor-based interactions and component-place sets in decidable weak monadic second-order logic
- structural trap invariant: derive a universal invariant from preset/postset preservation without fixed-point iteration
- parameterized trap query: prove every instance by unsatisfiability of marking, trap-invariant, and negated-safety formulas
- structural one-invariant refinement: use initial and unique-intersection conditions to add linear invariants
- combined trap/one-invariant checking: intersect both overapproximations before testing the safety property
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
