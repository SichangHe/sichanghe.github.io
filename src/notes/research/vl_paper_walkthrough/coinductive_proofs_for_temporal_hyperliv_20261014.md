# Coinductive Proofs for Temporal Hyperliveness
(authored by agents unless marked 🧑)
Tag: `correnson2025coinductive`, [paper](https://doi.org/10.1145/3704889)

## what the paper proves or measures

HyCo is a Coq framework for deductively proving temporal hyperproperties of the form `∀*∃* ψ`: a block of universal trace quantifiers followed by a block of existential trace quantifiers, with a safety relation `ψ` over infinite traces. Correnson and Finkbeiner write: “We show that hyperproperties of this class – which includes many hyperliveness properties of interest – can always be approximated by coinductive relations.” (Abstract, p.53:1). The framework works over labeled transition systems (LTSs); Section 7 specializes it to imperative programs with I/O and nondeterminism.

A hyperproperty constrains sets of executions. The introduction's example is noninference: for every execution, another execution replaces high-security inputs with a dummy value while preserving low-security outputs (Section 1, pp.53:1–2). HyCo supplies sound sufficient conditions for the supported hyperproperties, not a complete decision procedure. The authors state: “It is well-known that the game-theoretic approach is incomplete in general [18].” (Section 9, p.53:27). They leave completeness of their approach and the introduction of prophecy variables to future work.

## technique 1: coinductive matching for event invariants

what it is: fix two LTSs and a binary event relation `φ`. Define `fei_φ` as the greatest fixed point of an operator on pairs of states. Each observable left transition must have an observable right transition whose events satisfy `φ`, with successor states again related. The resulting trace property is `∀TS1 ∃TS2 □φ`, where `□` means that `φ` holds at every event position (Section 3.1, p.53:6, Theorem 3.1).

how to do it:
1. model each system by states, observable events, an initial state and transitions that may emit an event or remain silent (Section 2.2, p.53:3)
2. use the paper's observable-transition notation: finitely many silent steps followed by one event-emitting step; traces contain infinitely many observable events
3. choose `φ ⊆ E1 × E2`
4. define `feiF_φ(R)` by universally quantifying over left observable transitions and existentially choosing right observable transitions, requiring related events and successor pair in `R`
5. take `fei_φ = ν feiF_φ` and prove membership of the initial-state pair
6. invoke Theorem 3.1 to obtain `∀TS1 ∃TS2 □φ`

Soundness constructs an infinite right trace for each left trace (Section 3.4, pp.53:10–11). Define proof states `(s1,s2,τ1)` with `τ1` a trace from `s1` and `(s1,s2) ∈ fei_φ`. Prove every proof state has a successor. Functional choice then selects a successor event and proof state through a function `progress`; corecursively iterating that function defines `witness`. Lemma 3.6 establishes both that the witness is a right-system trace and that each pair of events satisfies `φ`.

limits: the coinductive relation is a sound underapproximation of the trace property. Functional choice selects witnesses in the soundness proof; the paper does not provide an automatic procedure for finding matching transitions in arbitrary systems.

Verus form: Inference: model states and transitions as specifications and prove that a candidate relation is preserved by every left transition using an appropriate right transition. Applying that local argument to infinite traces would also require a justified infinite-trace theory; this paper supplies no Verus implementation.

## technique 2: incremental hypotheses and silent-step alignment

what it is: parameterized coinduction lets a proof grow its hypothesis while exploring the systems. HyCo exposes `Init`, `Step`, `Invariant` and `Cycle` (Figure 2, p.53:7).

how to do it:
1. use `Init` to start from the initial states with an empty hypothesis
2. use `Invariant` to add a relation `H'` containing the current pair; prove the goal for each pair in `H'` under the guarded hypothesis `H ∪ H'`
3. use `Step` to match every left observable transition with some right observable transition, checking `φ` and moving to successor states
4. after `Step` releases the guard, use `Cycle` if the current pair belongs to the hypothesis
5. use `Steps-L` to skip finitely many silent deterministic left transitions, or `Steps-R` to choose finitely many silent right transitions (Section 3.3, pp.53:8–9)

The guard prevents closing a proof immediately after assuming its goal. Example 3.2 matches `a` with `b` and `b` with `a`, adds the singleton hypotheses `{(s1,s2)}` and `{(s2,s1)}`, and closes each cycle after another matching step (p.53:8).

The alignment rules are asymmetric. Skipping an arbitrary silent left path could discard a nondeterministic branch that also needs a match. A deterministic left transition must have exactly one successor and emit no event. The existential right side may select a silent path (Section 3.3, p.53:9).

Verus form: Inference: represent candidate state relations as ghost specifications and prove their transition closure. A record that a pair was visited is insufficient by itself; cycle closure needs the postfixed-relation argument and a justified coinduction principle.

## technique 3: derivatives for temporal safety relations

what it is: carry a trace relation together with the pair of states, updating the relation after each event pair. A safety relation is equal to its safety closure: a pair of traces belongs to the closure when every finite paired prefix has an extension satisfying the relation (Definitions 4.1–4.2, pp.53:12–13). Define the derivative by `Δe1,e2(ψ) = {(τ1,τ2) | (e1τ1,e2τ2) ∈ ψ}` (Section 4.2, p.53:13).

how to do it:
1. establish that the initial relation `ψ` is a safety relation
2. define `fe` as a greatest fixed point over triples `(s1,s2,ψ)` (Section 4.3, p.53:14)
3. match each left observable transition with a right observable transition using `Step`
4. use `Deriv` to prove the derivative is nonempty and continue from the successor states with that derivative as the new relation
5. release the hypothesis guard only after `Deriv`, then use hypotheses or continue the proof (Figure 3, p.53:15)

Theorem 4.5 states that initial membership in `fe` implies `∀TS1 ∃TS2 ψ` for a safety relation `ψ` (p.53:14). Its proof follows the functional-choice witness construction and uses the coinductive characterization of safety closure from Lemma 4.3.

For LTL-style formulas, derivatives follow the formula structure: `Δ(○ψ) = ψ`, `Δ(□ψ) = Δ(ψ) ∧ □ψ`, and conjunction and disjunction distribute through `Δ`. Weak-until satisfies `Δ(ψ1 W ψ2) = Δ(ψ2) ∨ (Δ(ψ1) ∧ (ψ1 W ψ2))` (Figure 4, p.53:16). Here `○` means next and `W` means weak-until: the left condition holds until the right condition holds, or the left condition holds forever.

Example 4.6 proves `∀TS1 ∃TS2 ((a1 ∧ a2) W b2)` (pp.53:15–16). Matching `a` with `a` leaves the same relation; matching `a` with `b` reduces it to `true`. An additional matching step closes the coinductive proof of `true`. Section 4.4 identifies that last step as redundant and motivates strengthening.

limits: soundness of the initial trace claim requires a safety relation. Nonempty derivatives express compatibility with some continuation; the coinductive transition obligations must still establish a continuation in the actual systems. The method does not establish arbitrary temporal liveness relations.

Verus form: Inference: a formula datatype and derivative function could support reusable finite-prefix proofs if their semantics and derivative laws were verified. Neither semantic nonemptiness for arbitrary relations nor the required infinite-trace reasoning becomes automatic merely by representing formulas as Rust data.

## technique 4: strengthening through compatible closure operators

what it is: reuse an established stronger trace relation when proving a weaker one. The desired `Strengthen` rule replaces a goal for `ψ` with a goal for `ψ' ⊆ ψ`, preserving both the accumulated hypothesis and its guard (Section 4.5, pp.53:17–18).

Plain parameterized coinduction does not support this rule with the original semantic tuples: retaining hypotheses about successive derivatives of a different relation can be unsound. Resetting the hypothesis to empty would lose incremental proof progress. Section 5.1 therefore replaces the underlying operator with GPACO, generalized parameterized coinduction, while preserving the previous reasoning rules (pp.53:18–19).

how to do it:
1. define `strclo(H) = {(s1,s2,ψ) | ∃ψ' ⊆ ψ, (s1,s2,ψ') ∈ H}`
2. establish compatibility with `feF`: `strclo ∘ feF ⊆ feF ∘ strclo`
3. invoke GPACO's `Up-to` rule with this closure to justify `Strengthen`
4. use strengthening to replace equivalent relations without assuming predicate extensionality, or to close a weaker goal using a stronger relation already in the hypothesis

This also supports derived proof rules for temporal modalities (Figure 5, p.53:18). Section 5.2 supplies a second compatible closure for reasoning up to simulation: replace the universal state by one that simulates it, or the existential state by one it simulates (pp.53:19–20). The authors explain: “In turn, to prove a ∀∃ hyperproperty, it suﬃces to consider an over-approximation of the universally quantiﬁed traces and an under-approximation of the existentially quantiﬁed traces.” (Section 5.2, p.53:19).

Verus form: Inference: a port should prove compatibility of each closure operator before using its corresponding proof shortcut. Logical implication between specifications alone does not justify retaining arbitrary accumulated coinduction hypotheses.

## technique 5: multiple traces and imperative I/O programs

what it is: `hyco_{m,n}` extends the relation to `m` universal and `n` existential systems with an `(m+n)`-ary safety relation. Theorem 6.1 states soundness (Section 6, p.53:20). Section 7 specializes the framework to `IMPio`, an imperative language with infinite loops, input, output, conditionals, assignments and nondeterministic `havoc` (pp.53:20–23).

how to do it:
1. quantify universally over observable transitions of all `m` universal systems, then existentially choose observable transitions of all `n` existential systems
2. require the derivative for the entire event tuple to be nonempty and place the successor-state tuple and derivative in the candidate relation
3. for `IMPio`, model states as `(program,memory)` and events as `in(v)` or `out(v)`; initialize program memory to zero
4. establish a paired-memory relation using `Memory-Invariant`, at a fixed pair of programs and temporal relation
5. use `Input-input` and `Output-output` to match events, then derive the temporal relation
6. use `Havoc-L` to consider every left assignment value and `Havoc-R` to select a right assignment value
7. use loop rules to unfold loops and establish memory invariants; close a recurring proof state with `Cycle` (Figure 9, p.53:23)

`input` and `havoc` can both assign arbitrary integers, but only `input` emits an event. The paper gives semantics for reactive computations with infinitely many observable events; basic instructions without a continuation do not receive a transition rule (Section 7.1, pp.53:20–21).

Example 7.1 relates two executions of an echo server, requiring every right output to double the corresponding left output while leaving inputs unconstrained by the event relation (p.53:24). The proof selects a doubled right input. Example 7.2 relates an incrementer to a nondeterministic adder by choosing `y = 2` and maintaining `x2 = 2*x1`; alignment exposes their matching outputs (pp.53:24–25). These are worked Coq examples, not a performance evaluation.

Verus form: Inference: control labels and ghost memories could express program states, with separate lemmas for silent transitions, event matching and paired-memory invariants. Connecting this model to Rust execution and proving the required infinite-trace principles remain separate obligations.

## trusted boundary, contradictions, and VL implications

The authors report a mechanized soundness proof in Coq using functional choice (Section 1, p.53:2; Section 3.4, pp.53:10–11). Their strengthening construction avoids adding predicate extensionality (Sections 4.4–5.1, pp.53:17–19). The development is linked at `https://github.com/acorrenson/hyco-popl-2025`, with a submission-time archive at `https://zenodo.org/records/14055009` (Data Availability, p.53:27).

Inference: a VeruLaw adaptation would depend on the proof assistant, the chosen axioms, the trace definitions and a justified relationship between Rust executions and the modeled LTS. This paper establishes no such Rust connection. Its reusable contributions are local event matching, derivative rules, incremental hypotheses and compatible closure operators. They could help express relational reactive policies, but their soundness depends on preserving the quantifiers, event observations and guard discipline.

Inference: the main integration work is a justified Rust/Verus trace model and infinite-trace proof principles. Reusing a sound calculus could avoid constructing a separate coinductive argument for each policy. The paper's incompleteness discussion limits any expectation that the matching method can prove every true supported trace property (Section 9, p.53:27); it does not contradict its soundness theorems.

## techniques for the catalog

- coinductive event matching — prove `∀∃ □φ` from a relation preserved by observable transitions
- incremental hypotheses and cycles — grow candidate relations while enforcing guarded reuse
- asymmetric silent-step alignment — skip deterministic left computation or selected right computation
- temporal derivatives — track the remaining safety obligation after an event tuple
- compatible closure operators — justify strengthening and simulation within incremental proofs
- multiple-trace HyCo — generalize transition matching to `∀*∃*` safety relations
- imperative I/O tactics — specialize event matching, memory invariants, nondeterminism and loops

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Substituting a relation with an equivalent one is not an issue when doing informal reasoning in set theory; however, in type-theory based proof assistants such as Coq, this is not possible in general."): checked the entire paper, quotations, quantifiers, definitions, proof steps, examples, section and page references, authorship, year and paper link; corrected the always modality, invariant obligations, alignment asymmetry, derivative rules, strengthening mechanism and example references, and replaced unsupported Verus assertions with labeled inferences; did not inspect or execute the external Coq development, verify the mathematical proofs independently, or validate a Verus implementation. The mid-paper quotation is from Section 4.4, p.53:17.
