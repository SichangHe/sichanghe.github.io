# Inferentialist Resource Semantics
(authored by agents unless marked 🧑)
Tag: `gheorghiu2024inferentialistb`, [paper](https://doi.org/10.46298/entics.14727)

## result and formal object

Gheorghiu, Gu, and Pym give a proof-theoretic resource semantics that combines Linear Logic’s number-of-uses interpretation with Bunched Implications’ sharing/separation interpretation. The semantic carrier is base-extension semantics (B-eS): a base is a set of inferential rules, and a support judgment says that executing a policy with available resources yields an assertion. The abstract states the intended application: “This paper shows how inferentialism — the view that meaning is given in terms of inferential behaviour — enables a versatile and expressive framework for resource semantics.” (Abstract, p. 9–1).

A resource semantics interprets formulas as assertions about process states and manipulated resources. “A resource semantics for a system of logic is an interpretation of its formulae as assertions about states of processes and is expressed in terms of the resources that are manipulated by those processes.” (Section 3, p. 9–9). The paper treats resources as consumable, creatable, copyable, deletable, movable, shared, or separated. The same support machinery is instantiated with multisets for linear logic and bunches for BI.

## technique 1: define policy support by base extension

what it is

Use a support judgment `Γ ⊩^S_B φ`. `Γ` is a policy (a collection of formulas), `B` is a base/model, `S(·)` is contextual resource, and `φ` is the resulting assertion. The generic inference clause is:

`Γ ⊩^S_B φ iff for every C ⊇ B and every U, if Γ is supported in C with U, then φ is supported in C with U inserted into the contextual resource S(U)` (the displayed `(Gen-Inf)` clause, Section 3, p. 9–10).

The paper explains the operational reading: “Γ describes a system policy, B represents an inferential model of a system policy, R constitutes a collection of available resources, and φ signifies an assertion regarding the executed system according to the policy of Γ and B and collection resources R.” (Section 1, p. 9–3, introducing the support judgment before Section 3 gives each component a reading; Section 3, p. 9–10, restates the roles of Γ, B, S(·) and φ in more detail).

when to use it

Use this when a system consists of policies that transform or share resources and you need compositional reasoning about the resulting state. Choose the logic fragment according to the resource discipline: multisets and linear connectives for use counts; bunches and BI connectives for sharing and separation.

how to do it

Inference: the steps below are reconstructed from the paper's definitions and examples; the paper gives no numbered procedure.

1. Choose atoms for resources and formulas for process preconditions/postconditions.
2. Define a base `B` as inferential rules that implement each policy.
3. Define the resource algebra: multiset union for IMALL, or bunch/context operations for BI.
4. Prove support recursively with the logic’s connective clauses and the generic `(Inf)` clause.
5. To compose components, combine their bases and add interface rules. The paper’s general construction is `D := B1 ∪ … ∪ Bn ∪ C`, where `C` gives interface behavior (Remark 5.1, p. 9–15).

Verus form

Inference: Model resources as Rust data structures and policies as `spec fn` relations or state-transition predicates. Encode support of a concrete policy as a `proof fn` with `requires` for the input resource and `ensures` for the output relation. Encode separation with disjointness predicates and ownership-style ghost state. Verus does not provide B-eS, bunches, or linear logic primitives, so these are user-defined specifications and lemmas. Keep executable code separate from `spec fn`; use `ensures` only on proof or executable functions, not on a `spec fn`.

evidence and limits

The paper states equivalence between derivability and support for IPL, IMALL, and BI as theorems taken from earlier work (Theorem 2.3 citing Sandqvist, p. 9–4; Theorem 2.9 citing Gheorghiu, Gu, and Pym and Buzoku, p. 9–6; Theorem 2.20 citing Gu, Gheorghiu, and Pym, p. 9–9), describing only the proof strategy (soundness by admissibility of natural-deduction rules, completeness by simulating a natural-deduction system in a special base). It then reads the generic clause in the airport and multi-factor authentication examples. It supplies no implementation, runtime evaluation, or empirical success denominator. The paper's conclusion lists as future work "verifying the faithfulness and adequacy of the resource interpretation" within a conceptual model of distributed systems (Section 6, p. 9–16). Inference: bases and resource algebras are therefore trusted modelling choices; support proves consequences relative to those choices, not that the chosen policy describes a real system.

## technique 2: linear number-of-uses semantics

Instantiate contextual resources with multisets. A linear implication `φ ⊸ ψ` consumes resources satisfying `φ` and yields `ψ`; tensor combines resources. The motivating example is a vending machine: “The point is that a euro is a resource that should be consumed in a transaction, yielding only one chocolate bar.” (Section 1, p. 9–2). The authors contrast this with ordinary implication, where duplication would incorrectly permit one euro to buy two bars.

Inference: to apply it, represent each resource atom in a multiset, define policy rules in the base, and use the IMALL support clauses. For a tensor precondition `p1 ⊗ … ⊗ pn`, the paper reduces support to a base derivation from `p1,…,pn` to the result in the simplest case, where the base is chosen to make the process as plain as possible (Section 3.1, pp. 9–10 to 9–11). Reading of connectives (Section 3.1, p. 9–10): `&` says φ and ψ are both available processes that each require the same resources, so both may be done but only one will be; the context-former `,` says both processes must be done, so the resources must be divided; `⊕` is non-deterministic choice.

Inference: In Verus, represent a multiset as a sequence/map with a counting invariant. A consuming policy takes ownership of the input sequence and returns a sequence with the consumed count removed; prove conservation and postcondition lemmas. A linear implication is a ghost relation over pre/post states, not a Rust type-level guarantee unless the API enforces ownership.

## technique 3: BI sharing and separation

BI adds bunches, whose tree structure records whether contexts are shared (`;`) or separated (`,`). The paper says: “The sharing/separation interpretation of BI … pertains to modelling this aspect of the architecture of distributed systems.” (Section 3.2, p. 9–11). `φ ∗ ψ` describes two separated components; `φ ∧ ψ` describes sharing; `φ −∗ ψ` consumes a private precondition while `φ → ψ` leaves the resource available. The distinction is operational: “[S]ince −−∗ modifies the system, its required resources must be private (not shared with other processes) so it uses separated resources. Since → does not modify the system its required resources are the kind that may be shared.” (Section 3.2, p. 9–12).

Apply it by building a bunch for component structure, defining each component’s base, and proving support with the BI clauses. Compose bases by union plus interface rules. The airport example maps check-in to `p −∗ ((p ∧ t) ∗ h)`, parallel baggage/security paths to a separated bunch, and final boarding to `(sgate ∗ shold) −∗ f` (Section 4.1, pp. 9–13 to 9–14). The MFA example requires two of three factors: `((p ∗ o) ∨ (p ∗ f) ∨ (o ∗ f)) −∗ sacc` (Section 4.2, p. 9–14). The paper's reason for `∗` over `∧` there is that the two factors must come from separate sources: "two passwords are not substantially stronger than one" (Section 4.2, p. 9–15).

Inference: In Verus, encode a bunch as a tree of ghost resource sets and prove disjointness for separated nodes, equality of shared views for `;`, and frame-like lemmas for unchanged resources. The paper’s implication distinction becomes a postcondition that either removes private resources or preserves them. This is a modelling discipline; Verus will not infer it automatically.

## technique 4: compositional system modelling

For a distributed system graph, assign each component a policy formula and base, then combine them with a bunch and interface base. “A distributed system D comprises distinct components (or sub-systems) C1, . . . , Cn, each of which has its own policy which may interface with each other.” (Section 5, p. 9–15). Remark 5.2 (p. 9–15) says a component may be substituted by a more detailed set of interfacing systems, and the base modelling the refined systems "still models the policy of" the original component, with no change needed.

## what is proved and trusted

Cited, not proved in this paper: derivability/support equivalences for the presented logics. Presented here: a generic support interpretation and two examples. Trusted: the base rules, resource algebra, policy formulas, and the logical metatheory used for each fragment.

## techniques for the catalog

- base-extension support — interpret a policy by quantifying over extensions of an inferential base and resource contexts
- linear resource accounting — use multisets and linear connectives to ensure resources are consumed exactly as specified
- bunch sharing/separation — represent shared versus disjoint component resources with BI context structure
- compositional policy bases — union component bases with explicit interface rules and refine components recursively
- authentication as separated resources — require disjoint factor resources for multi-factor access
