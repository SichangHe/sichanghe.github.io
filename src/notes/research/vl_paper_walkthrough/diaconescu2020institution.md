# Introducing H, an Institution-Based Formal Specification and Verification Language
(authored by agents unless marked 🧑)
Tag: `diaconescu2020institution`, [paper](https://arxiv.org/abs/1908.09868)

## what the paper defines

H is a specification and verification language built around institution theory and an abstract form of Kripke semantics. The paper separates Hspec, the specification language, from Hver, verification methods and tools. It states: “H is designed as a two-component system” (Introduction, p. 1). Hspec is parameterised by a base logic for data and uses modal structure for dynamics; Hver currently translates specifications to first-order logic (FOL). The paper is a short survey (its abstract: “a short survey on the development of the formal specification and verification language H with emphasis on the scientific part”). It says H “has been provisionally implemented as a prototype running system during 2017 – 2018” on top of Hets (Section 1, p. 1; Section 3, p. 13), and it briefly describes two case studies that were reported in other papers (Section 4, p. 16). It contains no soundness proof, benchmark or performance evaluation of its own.

The underlying institution (I=(Sign, Sen, Mod, |=)) packages signatures, sentences, models, and satisfaction. A signature morphism translates sentences and reducts models, while the satisfaction condition preserves truth across that translation (Section 2.1, p. 3, Satisfaction Condition (1)). The paper says Hspec “is parameterised over a variety of base logic systems captured as institutions” and that “the list of base logics is open” (Section 1, p. 1). Inference: this is the portability mechanism, since a specification can use a suitable data logic while the modal layer stays uniform. The paper cautions that defining a particular logic as an institution is not necessarily trivial, because one may have to rethink signature morphisms, variables and quantifiers for the intended application (Section 2.1, pp. 3–4).

## technique 1: parameterised hybridisation for stateful specifications

what it is: start from a base institution (I), then add modalities, nominals, quantifiers, and constraints on Kripke frames or local models. The resulting hybridised institution (H I_C) gives each world a base model while imposing sharing or rigidity conditions across worlds. Hspec exposes this as a two-layer syntax: an upper layer for the hybrid signature and sentences, and a lower layer supplied by the selected base institution (Section 2.5, pp. 10–11).

when to use: Inference: use it when data semantics and transition/state semantics need different logics, or when several states must share domains or interpretations. The paper says CASL “may be used in many situations” as the lower layer (Section 2.5, p. 10); other base institutions it mentions are many-sorted first-order logic (Section 4.1, p. 16), atomic propositional logic (Section 4.2, p. 16), and partial algebras with rigid symbols (Section 3.2.5, p. 15).

how to apply it, following the paper's calculator example (Section 2.5, pp. 10–11):

1. choose the base institution and its data signature. In the calculator example, `spec Nat` uses `logic : RigidCASL`, declares `rigid sort Nat`, `rigid op 0 : Nat`, `rigid op suc : Nat -> Nat`, and a non-rigid `op X : Nat * Nat -> Nat` (p. 10)
2. declare rigidity for symbols that must be interpreted uniformly across Kripke worlds; the paper says constraints on Kripke models are specified by rigidity declarations or, for other properties such as Kripke-frame properties, by specific axioms (p. 10)
3. in `spec Calc` (`hlogic : HRigidCASLC`, which imports `data Nat`), declare nominals and modalities; the example declares nominals `mult`, `sum`, and a `shift` modality of arity 2 (pp. 10–11)
4. write modal axioms. The paper says “the first axiom says that the Kripke frames have only two elements” (the axiom `. mult \/ sum`); further axioms make `sum` and `mult` alternate under `shift`, and make `X` behave as addition in the `sum` state (`X(m, 0) = m`, `X(m, suc(n)) = suc (X(m, n))`). In the `mult` state, an axiom relates `X(m, n)`, `X(m, suc(n))` and `<shift> X(x, m) = y`, i.e. it expresses multiplication through the other state's addition rather than by a direct recursive equation (p. 11)
5. use the two quantifier levels: the paper says “forall is at the level of the base institution while forallH and existsH are quantifiers at the level of the hybridised institution” (pp. 11–12). In the example the `forallH`/`existsH` variables range over `Nat` data (`forallH m : Nat`). The paper also says quantification over nominals is possible in the hybridised institution (Section 2.3.2, pp. 8–9)

The concrete specification includes the sentence “. @ mult : not sum” and the equation “X(m, suc(n)) = suc (X(m, n))” (Section 2.5, p. 11). These are examples of the paper's code shape, not pseudocode invented for this study. The paper notes a theoretical gap: rigidity declarations need to exist at the base signature level so that hybridisation can express sharing, even though the declarations have no semantic effect in the base data specification (Section 2.5, p. 11).

Inference: a Verus encoding would represent the base data as Rust datatypes and `spec fn`s, the protocol world as a ghost or spec enum, and transitions as proof lemmas with `requires` and `ensures`. A transition invariant would be stated as a `spec fn` over the world and data; a loop over transitions would carry a loop invariant. Verus does not provide H's institution parameterisation or modal quantifiers, so changing the data logic requires changing the Verus model and lemmas rather than selecting a registered institution. Inference: the useful transferable idea is to keep data contracts separate from protocol-state contracts and prove their interaction explicitly.

## technique 2: conservative comorphism encoding into first-order logic

what it is: Hver proves a goal (E |= e) by translating the hybridised institution into many-sorted FOL through a comorphism, then translating many-sorted FOL into unsorted FOL accepted by existing theorem provers. This follows the result of [17] (Diaconescu and Madeira), which the paper calls “the main achievement” there (Section 2.6, p. 12). A comorphism (Φ, α, β) supplies a signature functor Φ, a sentence translation α, and a model translation β that satisfy a satisfaction condition. Because the structural cost is shifted into Φ, which maps signatures to theories, the paper calls these “theoroidal” comorphisms, written HI_C → FOL^th (pp. 12–13). The comorphism from the hybridised institution is built by “lifting” a given comorphism from the base institution to FOL^th, under technical conditions the paper omits (p. 13). The paper states: “The satisfaction condition ensures the mutual coherence between these translations.” (Section 2.6, p. 12).

how to apply it:

1. represent the Hspec specification as a theory (Δ,E) in some HI_C and the property as a sentence e to check, i.e. E |= e (Section 2.6.1, p. 13)
2. apply the comorphism HI_C → FOL^th, producing translated premises Ẽ and goal ẽ. The paper says Ẽ “includes both the syntactic translation α(E) of E and the sentences of the theory Φ(Δ)”, and ẽ = α(e) (Section 2.6.1, step 1, p. 13)
3. translate many-sorted FOL into unsorted FOL, producing Ē and ē, because, “at least up to my knowledge, all major first order logic theorem provers work with the unsorted version of first order logic” (step 2, p. 13)
4. invoke a first-order theorem prover to establish Ē |= ē (step 3, p. 13)
5. conclude E |= e on success; the paper says this backward move “holds as a consequence of an important property of comorphisms, namely that of conservativity” (step 4, p. 13). Conservativity of HI_C → FOL^th is, under “some technical conditions”, inherited from conservativity of the base comorphism, and the many-sorted-to-unsorted encoding “indeed is” conservative (p. 13). The paper's conservativity definition is, for each Σ-model M, the existence of a Φ(Σ)-model M' with M = β_Σ(M') (the printed text has typographical errors in this definition)

The paper gives the operational summary: “Now we employ a first order theorem prover and attempt to prove that Ē |= ē.” (Section 2.6.1, p. 13). It says “In practice all the translations and the proofs are performed automatically using tools” (p. 13). In Hets, the translation of a goal is passed to “one of the first order logic theorem provers of choice, such as SPASS [40], Vampire [32], E [34]” (Section 3.2.4, p. 15).

## technique 3: heterogeneous implementation and structured specifications

Hets implements the multi-logic idea through a Grothendieck construction over a graph of institutions and translations. The user can choose the logic that best fits each problem and reuse its dedicated syntax and proof tools (Section 3.1, pp. 13–14). The Hets implementation registers the base institution, quantifier symbols, and Kripke-model constraints; polymorphic Haskell types generate instances for hybrid signatures; unions, specification translations along signature morphisms (symbol renamings), and colimits of signatures provide specification structuring, supported through a correspondence with DOL, the structuring language of Hets (Sections 3.2.1–3.2.3, pp. 14–15).

To use this mechanism, register a base institution and its hybrid parameters, generate the corresponding Hets logic instance, write structured Hspec modules, then register a base-to-FOL theoroidal comorphism so Hver can generate an encoding instance (Sections 3.2.1–3.2.4, pp. 14–15).

## evidence, trusted parts, and limits

The steam-boiler case study verified mode changes and expected functionality for five modes and nine events (Section 4.1, pp. 15–16; the paper attributes the case study to [8]). The bike-sharing case used double hybridisation with actor/configuration sharing; the FOL encoding caused timeouts, so the first level was encoded in an institution of relations and SPASS was used (Section 4.2, p. 16; the paper attributes the case study to [38]). These are reported case-study outcomes; the paper gives no aggregate success denominator, runtime distribution, or comparison baseline. The paper says the Hets implementation “is only a temporary implementation” (Section 1, p. 2), and its Section 5 (pp. 16–17) calls for an independent implementation, more Hver methods, more base institutions, and larger studies (Section 5, p. 16).

## techniques for the catalog

- institution parameterisation — select a base logic for data and add a uniform modal layer for dynamics
- rigidity and sharing constraints — require symbols or domains to agree across Kripke worlds
- conservative comorphism encoding — translate hybrid specifications to FOL and recover source validity through conservativity
- heterogeneous Hets structuring — compose logics, signature translations, unions, and colimits through a graph of institutions
- two-level quantification — separate base-institution quantifiers (forall) from hybridised-institution quantifiers (forallH, existsH) in one specification
