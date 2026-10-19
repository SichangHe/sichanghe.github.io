# Proving Cutoff Bounds for Safety Properties in First-Order Logic
(authored by agents unless marked 🧑)
Tag: `lotan2024cutoff`, [paper](http://arxiv.org/abs/2408.10685v1)

## claim and scope

The paper verifies safety of parameterized first-order transition systems under finite-domain semantics. Ordinary first-order semantics also admits infinite structures, which can create spurious counterexamples. The method proves a cutoff k: checking all finite domains of size at most k suffices for every finite domain. The central claim is: “The simulation provides an inductive argument for correctness in finite instances, reducing the problem to showing safety of instances with bounded size.” (Abstract, p. 1)

Inference: the method is especially useful when safety is true only for finite structures. In TreeTermination, a rooted-tree protocol lets a node terminate after acknowledgements from its children. An infinite total order can have no children of the root, so the root terminates vacuously while other nodes do not; finite trees avoid this because every node has a finite predecessor path (Section 3.1, pp. 6–7). The paper therefore reasons over `T_fin`, the transition system containing only finite structures.

## technique 1: size-reducing simulation as induction on domain size

To establish cutoff k, define a relation H between finite high and low states. For every related pair `(s_h,s_l)`, the low state has a strictly smaller domain. Require four conditions: size reduction; initiation (every initial high state above k relates to some low initial state); simulation (each high transition can be matched by zero or more low transitions while preserving H); and fault preservation (a high fault implies a low fault). The paper states: “The challenge our work addresses, and what makes cutoffs useful for verification, is to establish a cutoff without checking whether Tfin |= P.” (Section 3.2, p. 8)

Apply the theorem by checking every bounded system through k. If a larger finite instance violated safety, repeatedly apply H to obtain a smaller violating instance, eventually reaching size at most k. The theorem is explicit: “If H is a size-reducing simulation for Tfin, P and k, then k is a cutoff for Tfin and P.” (Definition 2 and Theorem 1, p. 8)

Verus form (Inference): represent a finite state and its active-domain set as Rust ghost data, with a `spec fn` for the safety predicate and a relation predicate `H`. Prove initiation, transition matching, and fault preservation as proof functions; use `requires`/`ensures` contracts and loop invariants for repeated reduction. Verus has no quantification over arbitrary first-order structures built in, so the encoding would need finite maps/sets and explicit transition semantics. The induction argument carries over; the first-order solver automation does not.

## technique 2: strong simulation and high-low updates

Direct simulation existentially quantifies over successor states, which are first-order structures. To avoid higher-order quantification, strong simulation requires every related low successor with the same low domain to be a successor by one transition or a stutter. Inductive totality ensures that a related low state exists initially above k and continues to exist along high transitions with the same low domain. The paper states: “A strong size-reducing simulation is a size-reducing simulation.” The converse does not hold (Definition 3 and Lemma 1, p. 9).

For the first-order encoding, choose a deletion condition `θ(z)` and deterministic update formulas for relations and update terms for functions. These define η(z) on the shared domain; restricting its low interpretation to the domain without z gives the smaller state. Figure 5 requires seven checks: initial-state preservation, transition-or-stutter preservation, fault preservation, closure of low functions under deletion, preservation of background axioms, existence of a deletable element initially above k, and preservation of `θ(z)` for the same z across transitions (Sections 4.1–4.4, pp. 10–14).

To use the encoding, specify a finite-domain first-order transition system, a safety formula, a cutoff bound, and a high-low update. For TreeTermination, the input sets bound `node = 2`, uses the default deletion condition excluding immutable constants, defines an `ack` update, and gives a hint mapping the high transition's terminating node to the same low node (Figure 6, p. 15). The tool generates the verification conditions and sends them to Z3. If Z3 establishes that a condition is invalid, it returns a model of its negation that can guide a correction to the high-low update (Section 5.1, p. 16).

## technique 3: z-excluded substructure encoding

A formula over two copies of a vocabulary still has one domain, so the copies alone do not encode a smaller low domain. The paper introduces a free variable `z` for the deleted element and a two-vocabulary formula η(z): the high symbols use `Σ^h`, low symbols use `Σ^l`, and the low structure is the substructure whose domain excludes z. To evaluate a low-state formula in the shared high domain, guard every quantified variable: replace `∀x.β` by `∀x.(x ≠ z) → [β]_z` and `∃x.β` by `∃x.(x ≠ z) ∧ [β]_z`; atoms are unchanged and the transformation recurses through Boolean connectives (Definitions 4–5, pp. 10–11). This gives the paper's semantic bridge: “The following lemma formalizes the aforementioned relation between the value of the z-excluded representation of α in a structure and the value of α in its substructure that excludes the value of z.” (Section 4.1, p. 11)

Verus form (Inference): represent the finite domain as a ghost `Set` and define a projection that removes one element. Quantified predicates must include membership in the projected set. Prove closure of function-like fields and preservation of axioms before using the projected state; ordinary Rust references do not provide this first-order substructure semantics automatically.

## technique 4: quantifier-hint optimization

The hardest condition has the form `(∃x_h. α(x_h,z)) ⇒ (∃x_l. β(x_l,z))`. Split the check per transition disjunct, then provide a hint γ relating high and low arguments. Prove two simpler obligations: totality, `α ⇒ ∃x_l.γ`; and sufficiency, `α ∧ γ ⇒ β`. A common hint is an equality `x_l = t(x_h,z)`. This removes the existential quantifier over β from the solver query and reduces quantifier alternation (Section 5.1, pp. 16–17).

Verus form (Inference): encode `t` as a pure `spec fn` and prove totality/sufficiency as lemmas over finite sets. The hint is a witness-producing proof, not executable code. Solver performance claims cannot be transferred directly because Verus uses SMT differently and may require explicit witness lemmas.

## evidence, limits, and product threat

The implementation uses mypyvy and Z3 4.12.2.0 on a Windows Core-i7 2.8 GHz laptop; all runs take under 10 seconds (Section 5.2, p. 17). Table 1 reports cutoffs and update/hint counts for TreeTermination, EchoMachine, ToyConsensus, LockServer, ListToken, PlusMinus, EqualSum, and EqualSumOrders. For example, TreeTermination has cutoff node 2, one nondefault update out of three, an invariant, and one hint out of one; ListToken has cutoff node 3, two updates out of seven, an invariant, and one hint out of three (Table 1, p. 17). These denominators are table columns, not percentages.

The high-low update is manual; the conclusion says the paper leaves automating its search to future work. Without hints, conditions are not in EPR and Z3 can struggle when a query is invalid (Section 7, p. 20). Liveness is also left open. The user supplies updates, invariants, and hints, whose required properties are checked by verification conditions. Inference: applying the result relies on the adequacy of the system model and finite-domain assumption, the soundness of the encoding, and correct implementation and solver behavior. Inference: for VL, the method threatens proofs involving unbounded numbers of agents or threads because a manually discovered cutoff could replace an induction over all instances. It does not automatically discover the cutoff, and a Verus encoding would still require explicit state and transition models. VL should reuse the size-induction idea but should not claim automatic parameterized verification from this paper.

## techniques for the catalog

- size-reducing simulation: relate initial states above k to smaller initial states, match transitions by finite low traces, and preserve faults
- high-low update encoding: express deletion and deterministic symbol updates as first-order verification conditions checked by SMT
- z-excluded projection: encode deletion of one domain element by guarding low-state quantifiers against the deleted variable
- quantifier hints: supply witness relations that split existential simulation checks into totality and sufficiency obligations
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "To ensure that a state is obtained, we further need to verify that the resulting substructure satisfies the axioms."): checked all paper text including Appendix A against the study, quotations, numbers, references, and technique steps; corrected general simulation to permit finite low traces, distinguished strong simulation from its deterministic encoding, added all seven verification conditions, corrected a quotation reference, and clarified checked user inputs and inferences; did not rerun the research artifact, independently prove the theorems, or validate the proposed Verus encodings.
