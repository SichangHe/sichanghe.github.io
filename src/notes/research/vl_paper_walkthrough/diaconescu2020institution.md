# Introducing H, an Institution-Based Formal Specification and Verification Language
(authored by agents unless marked 🧑)
Tag: `diaconescu2020institution`, [paper](https://doi.org/10.1007/s11787-020-00249-y)

## what the paper defines

H is a specification and verification language built around institution theory and an abstract form of Kripke semantics. The paper separates Hspec, the specification language, from Hver, verification methods and tools. It states: “H is designed as a two-component system” (Introduction, p. 1). Hspec is parameterised by a base logic for data and uses modal structure for dynamics; Hver currently translates specifications to first-order logic (FOL). The implementation was a prototype based on Hets, and the paper reports case studies rather than a soundness or performance evaluation of a production compiler.

The underlying institution (I=(Sign, Sen, Mod, |=)) packages signatures, sentences, models, and satisfaction. A signature morphism translates sentences and reducts models, while the satisfaction condition preserves truth across that translation (Section 2.1, pp. 2–3). This abstraction is the paper's main portability technique: a specification can use a suitable data logic while the modal layer remains uniform. The paper cautions that defining a concrete institution is nontrivial because signatures, variables, and quantifiers must be reconsidered for the intended application (Section 2.1, p. 3).

## technique 1: parameterised hybridisation for stateful specifications

what it is: start from a base institution (I), then add modalities, nominals, quantifiers, and constraints on Kripke frames or local models. The resulting hybridised institution (H I_C) gives each world a base model while imposing sharing or rigidity conditions across worlds. Hspec exposes this as a two-layer syntax: an upper layer for the hybrid signature and sentences, and a lower layer supplied by the selected base institution (Section 2.5, pp. 10–11).

when to use: use it when data semantics and transition/state semantics need different logics, or when several states must share domains or interpretations. The base institution can be CASL, first-order logic, partial algebras, or another institution supported by the implementation.

how to apply it, following the paper:

1. choose the base institution and its data signature. In the calculator example, `Nat` declares a rigid sort and rigid constants `0` and `suc` (Section 2.5, p. 10)
2. declare rigidity for symbols that must be interpreted uniformly across Kripke worlds (Section 2.5, p. 10)
3. declare nominals for named worlds and modalities for transitions; the example declares `mult`, `sum`, and a binary `shift` modality (Section 2.5, p. 10)
4. write frame constraints and modal axioms. The example constrains the frame to two elements, makes `sum` and `mult` alternate under `shift`, and gives recursive equations for addition and multiplication (Section 2.5, pp. 10–11)
5. use base-level quantifiers for data variables and hybrid-level `forallH`/`existsH` for quantification over worlds or hybrid objects (Section 2.5, p. 11)

The concrete specification includes the sentence “. @ mult : not sum” and equations such as “X(m, suc(n)) = suc (X(m, n))” (Section 2.5, p. 10). These are examples of the paper's code shape, not pseudocode invented for this study. The paper notes a theoretical gap: rigidity declarations need to exist at the base signature level so that hybridisation can express sharing, even though the declarations have no semantic effect in the base data specification (Section 2.5, p. 11).

Inference: a Verus encoding would represent the base data as Rust datatypes and `spec fn`s, the protocol world as a ghost or spec enum, and transitions as proof lemmas with `requires` and `ensures`. A transition invariant would be stated as a `spec fn` over the world and data; a loop over transitions would carry a loop invariant. Verus does not provide H's institution parameterisation or modal quantifiers, so changing the data logic requires changing the Verus model and lemmas rather than selecting a registered institution. Inference: the useful transferable idea is to keep data contracts separate from protocol-state contracts and prove their interaction explicitly.

## technique 2: conservative comorphism encoding into first-order logic

what it is: Hver proves a goal (E |= e) by translating the hybridised institution into many-sorted FOL through a comorphism, then translating many-sorted FOL into unsorted FOL accepted by existing theorem provers. A comorphism supplies a signature functor, syntax translation, and model translation that satisfy a preservation condition. The paper states: “The satisfaction condition ensures the mutual coherence between these translations.” (Section 2.6, p. 12).

how to apply it:

1. represent the Hspec axioms and target property as a theory ((Δ,E)) and sentence (e) (Section 2.6.1, p. 13)
2. apply the comorphism (H I_C \rightarrow FOL^{th}), producing translated premises Ẽ and goal ẽ (Section 2.6.1, p. 13)
3. translate many-sorted FOL into unsorted FOL, producing Ē and ē, because the available theorem provers use unsorted FOL (Section 2.6.1, p. 13)
4. invoke a first-order theorem prover to establish Ē |= ē (Section 2.6.1, p. 13)
5. conclude (E |= e) only when the hybridisation comorphism and the many-sorted encoding are conservative; conservativity supplies a model-lifting argument back to the source institution (Section 2.6.1, pp. 13–14)

The paper gives the operational summary: “Now we employ a first order theorem prover and attempt to prove that Ē |= ē.” (Section 2.6.1, p. 13). In Hets, generated encodings are passed to SPASS, Vampire, or E (Section 3.2.4, p. 15).

Inference: the Verus analogue is a trusted translation boundary. Rust/Verus specifications can be lowered to solver formulas, but a VL tool must preserve the source contract and type meaning across every lowering step. Verus's normal `requires`, `ensures`, `invariant`, and lemma constructs can express the source proof obligations; they do not provide a user-facing comorphism or prove that an arbitrary external translation is conservative. Inference: if VL adds a heterogeneous front end, it should require a checked translation theorem or keep the translator inside the trusted computing base.

## technique 3: heterogeneous implementation and structured specifications

Hets implements the multi-logic idea through a Grothendieck construction over a graph of institutions and translations. The user can choose the logic that best fits each problem and reuse its dedicated syntax and proof tools (Section 3.1, pp. 13–14). The Hets implementation registers the base institution, quantifier symbols, and Kripke-model constraints; polymorphic Haskell types generate instances for hybrid signatures; unions, signature translations, and colimits provide specification structuring (Section 3.2, pp. 14–15).

To use this mechanism, register a base institution and its hybrid parameters, generate the corresponding Hets logic instance, write structured Hspec modules, then register a base-to-FOL theoroidal comorphism so Hver can generate an encoding instance (Section 3.2.1–3.2.4, pp. 14–15). Inference: VL could obtain a similar benefit by separating Rust library contracts from protocol libraries and composing them through explicit lemma interfaces, but Verus currently verifies one Rust/SMT language rather than a graph of logics.

## evidence, trusted parts, and limits

The steam-boiler case study verified mode changes and expected functionality for five modes and nine events (Section 4.1, p. 16). The bike-sharing case used double hybridisation with actor/configuration sharing; the FOL encoding caused timeouts, so the first level was encoded in an institution of relations and SPASS was used (Section 4.2, p. 16). These are reported case-study outcomes; the paper gives no aggregate success denominator, runtime distribution, or comparison baseline. The Hets implementation is temporary, and the paper calls for an independent implementation, more Hver methods, more base institutions, and larger studies (Section 5, p. 16).

Inference: H proves source properties only under the correctness and conservativity assumptions of its institution definitions, translations, theorem prover, and Hets implementation. The paper's own timeout report shows that expressive encodings can be impractical even when semantically appropriate. For agent-written verified Rust, the product threat is a false sense of coverage from a flexible specification layer whose translation or library contracts are trusted but not independently checked. VL should not redo H's institution theory; it should reuse the lesson that heterogeneous data/protocol contracts need explicit translation boundaries and measured solver behavior.

## techniques for the catalog

- institution parameterisation — select a base logic for data and add a uniform modal layer for dynamics
- rigidity and sharing constraints — require symbols or domains to agree across Kripke worlds
- conservative comorphism encoding — translate hybrid specifications to FOL and recover source validity through conservativity
- heterogeneous Hets structuring — compose logics, signature translations, unions, and colimits through a graph of institutions
- two-level quantification — separate base data quantifiers from hybrid/world quantifiers in one specification
Checked 2026-10-15 against paper diaconescu2020institution: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
