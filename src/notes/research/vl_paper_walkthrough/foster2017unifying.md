# Unifying Theories of Reactive Design Contracts
Inference: (authored by agents unless marked 🧑)
Tag: `foster2017unifying`, [paper](http://arxiv.org/abs/1712.10233v2)

## what is proved or measured
Inference: The paper defines a UTP theory for stateful reactive design contracts and mechanizes its theorems in Isabelle/UTP. A contract has an assumption, an intermediate (pericondition) guarantee, and a terminating (postcondition) guarantee. The abstract says: “our theory of contracts allow us to specify both the evolution of state variables and the permissible interactions with the environment.” (abstract, p. 1) The theory uses alphabetized predicates, healthiness conditions, a generalized trace algebra, and relational operators. Its practical verification tactic reduces a contract refinement goal to three implications over pre-, peri-, and postconditions. The authors' contributions include a contract notation, composition laws, a card-payment case study, and an automated refinement proof method (section 1, pp. 1–2).

## technique: UTP relational encoding
Inference: What it is: represent programs and specifications as alphabetized predicates over initial and final observations. Refinement is implication under equal alphabets: `P v Q` means Q's behaviors imply P's. Sequential composition, choice, conditionals, assignment, and recursion are predicate operators. Definition 2.2 gives, for example, sequential composition through an existentially quantified intermediate state and assignment as a relation equating the post-state to the assigned value (section 2.1, pp. 3–4).

Inference: When to use it: use this encoding when a reactive language needs a common semantic model and algebraic calculation laws. It supports discrete, continuous, and hybrid traces because the trace is an algebra rather than a fixed list representation. The paper states: “UTP follows the ‘programs-as-predicates’ approach.” (section 2.1, p. 3)

Inference: How: (1) choose typed observational variables, including state and trace; (2) define healthiness conditions that restrict valid predicates; (3) define constructors as healthy operators; (4) express program behavior as predicates; (5) use relational laws to calculate compositions; (6) prove refinement by predicate implication in Isabelle/HOL. All theorems in the paper are mechanically proved in Isabelle/UTP (section 2, p. 2).

Inference: Verus form: Inference: model the state and logical trace with Verus `spec fn`s and algebraic datatypes; express component contracts with `requires` and `ensures`; use proof functions to establish composition lemmas. Verus does not provide UTP alphabets, healthiness operators, or a built-in pericondition, so these must be represented explicitly in ghost state and predicates. This is a semantic translation, not a feature claimed by the paper.

## technique: three-part reactive contract and refinement
Inference: What it is: Definition 4.1 defines `[ P1 |− P2 | P3 ]`, where P1 is a reactive condition, P2 a reactive relation over intermediate observations, and P3 a reactive relation that may mention final state. The contract combines assumption and guarantees through the reactive-design operator. Refinement is reduced by Theorem 4.2 to: precondition weakening, pericondition strengthening under the old precondition, and postcondition strengthening under the old precondition. The paper states: “Theorem 4.2 shows that contract refinement reduces to three proof obligations.” (section 4.1, p. 13)

Inference: How: (1) calculate the program contract `[Q1 |− Q2 | Q3]`; (2) state the desired contract `[P1 |− P2 | P3]`; (3) prove `P1 ⇒ Q1`; (4) prove `P2 v (Q2 ∧ P1)`; (5) prove `P3 v (Q3 ∧ P1)`; (6) discharge the relational obligations with Isabelle/UTP tactics and external automated theorem provers through Sledgehammer. These are the paper's explicit three obligations (section 4.1, pp. 13–14).

Inference: Verus form: Inference: write one Verus lemma per implication, with `requires` encoding the specification assumption and `ensures` encoding each guarantee. A terminating method can model P3; intermediate observations require a ghost event/trace model and separate lemmas. Verus's `ensures` can express final-state guarantees but does not directly encode a reactive design's waiting observation.

## technique: algebraic contract composition
Inference: What it is: Theorem 4.13 supplies laws for internal choice, indexed choice, conjunction, conditionals, sequential composition, and iteration. For sequential composition, the composite precondition combines the first precondition with a weakest liberal precondition of the second; periconditions combine intermediate behavior; postconditions compose relationally. The paper says: “These are theorems, rather than definitions, since they formulate the semantics of contracts composed by the UTP operators defined previously.” (section 4.3, p. 17)

Inference: When to use it: calculate a system contract compositionally before proving a system-level property. This avoids enumerating an infinite state space. The laws depend on reactive healthiness side conditions and trace algebra laws.

Inference: Verus form: Inference: create reusable proof lemmas for sequential contract composition and state-update frame properties. A Rust method's executable body remains ordinary Rust; the algebra lives in `proof fn`s and `spec fn`s. The UTP operators' exact equations do not carry over unless a trace model is implemented.

## technique: contract-based case-study verification
Inference: The card system defines `Pay(i,j,n)`, rejects invalid transfers, performs two indexed assignments for valid transfers, and iterates an internal choice over card pairs. The authors mechanize Theorem 5.4, which calculates its P1/P2/P3 contract, then verify three refinements with `rdes-refine`: no change in total balance (Theorem 5.5), no overdrafts (Theorem 5.6), and acceptance of a valid transfer (Theorem 5.7). The paper states: “Each of these properties is assigned a contract which Pay(i, j, n) must refine.” (section 5, pp. 24–25)

Inference: How: calculate the Pay contract; state each property as a contract; invoke the refinement tactic; for balance preservation, split the postcondition into invalid-transfer (state unchanged) and valid-transfer (subtract n then add n) cases; for no overdraft, split the affected index into i, j, and all other cards; for acceptance, reason over the pericondition and case-split the possible intermediate observations.

Inference: Verus form: Inference: represent balances as a map or sequence with a view, specify transfer preconditions and postconditions, and prove sum preservation and non-negativity by case analysis. Use `old` state in `ensures`; use `assert` and arithmetic proof blocks for the i/j/other-index cases. Reactive event offers and periconditions require ghost traces and are not directly executable Verus behavior.

## assumptions, trust, and product implication
Inference: The paper proves semantic theorems and the card properties in Isabelle/UTP; it does not report a runtime benchmark or a percentage denominator. Trusted elements include Isabelle/HOL, Isabelle/UTP, external provers used by Sledgehammer, the chosen trace algebra, and the correctness of the encoded contract. Inference: the theory is a reusable blueprint for writing compositional contracts around agent-written Rust, especially state-update and interaction protocols. Inference: threat to VeruLaw is medium: the decomposition can expose missing assumptions, but translating reactive intermediate behavior into Verus ghost state is substantial and can introduce specification errors. VL should not redo the three-obligation refinement pattern or the card-system proof shape; a Rust library for reactive traces and a generator for these obligations remain open work.

## techniques for the catalog
- UTP predicate semantics — encode programs as alphabetized predicates constrained by healthiness conditions
- three-obligation contract refinement — reduce refinement to precondition, pericondition, and postcondition implications
- algebraic contract composition — calculate composite assumptions and guarantees with proved relational laws
- reactive case-study proof — verify stateful protocols by contract refinement and index-based postcondition case analysis

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
