# Igloo: soundly linking compositional refinement and separation logic for distributed system verification
(authored by agents unless marked 🧑)
Tag: `sprenger2020igloo`, [paper](https://doi.org/10.1145/3428220)

## purpose and result

Igloo links a top-down event-system refinement development to bottom-up separation-logic proofs of implementation code. Its unit of connection is a component I/O specification whose traces match the component event system. The paper states: “The core of our approach is a formal framework that soundly relates event-based system models to program specifications in separation logic, such that successful verification establishes a refinement relation between the model and the code.” (Section 1, PDF p. 3).

The methodology has six steps: abstract model, protocol model, interface model, decomposition, component I/O specification, and implementation verification. The authors verify leader election and two-party entity authentication implementations in Java and Python using VeriFast and Nagini, and primary-backup replication implementations in Java using VeriFast (Sections 3.8, 4.1.4, and 4.2.4, PDF pp. 15, 18–20). They support safety, not liveness: “We currently support the verification of safety properties, but not liveness properties.” (Section 3, PDF p. 8).

## technique 1: six-step refinement-to-code pipeline

Inference: when to use it: use this for a distributed system whose components maintain local state and communicate through an environment, including lossy, faulty, or adversarial networks.

Before the six steps, identify system requirements and environment assumptions, including channel behavior, component faults, and attacker models (Section 3.1, PDF p. 8).

Steps prescribed by Section 3.1 (PDF pp. 8–9):

1. Build an abstract event-system model with a global view; establish central trace properties there or in further abstract refinements.
2. Refine it to a protocol model with distributed nodes and the environment; prove each refinement.
3. Refine to an interface model aligned with the I/O library calls and structured for decomposition.
4. Decompose the monolithic model into component and environment event systems; prove recomposition is trace-equivalent.
5. Translate each component event system into a trace-equivalent separation-logic I/O specification.
6. Implement and verify each component against its I/O specification.

These steps allow case-specific combinations or omissions: primary-backup replication starts directly with a protocol model and already includes I/O buffers there (Sections 4.1.2–4.1.3, PDF pp. 17–18).

The paper’s step summary says: “The number of refinements per step is not fixed. Each refinement is proven correct and may incorporate additional system requirements.” (Section 3.1, PDF p. 8). It also says decomposition preserves `traces(M_m) = traces((E1s 9 … 9 Ens) ∥χe Ee)`; here `9` denotes interleaving composition (Table 2, PDF p. 16).

Inference: a possible Verus adaptation would represent local component states and transitions with ghost state and prove each executable I/O wrapper follows an allowed transition. It would also need a proof connecting composed component traces to the global model; the paper does not develop or validate this adaptation.

Evidence: Table 2 gives the chain of guarantees: model refinement gives trace inclusion, decomposition gives equality, model-to-I/O translation gives trace equality, and code verification gives `traces(cj) ⊆ traces(φj)`. The overall theorem is `M_i |= P_i ⇒ S |= π̂_i^{-1}(P_i)` (Table 2 and Section 3.9, PDF p. 16).

## technique 2: trace-equivalent I/O specifications

Inference: when to use it: use this when the implementation verifier understands separation logic but not the global event model.

Steps from Sections 3.5–3.7 and 5 (PDF pp. 10–13, 20–25):

1. Align each I/O event with one library operation and its parameters. Separate its guard into component and environment guards; the component guard must not depend on the input. After decomposition, represent internal component events as ghost I/O actions (Sections 3.5–3.6, PDF pp. 10–12).
2. Translate the component event system through a sequential process calculus; this isolates I/O interactions from state data.
3. Encode the process as separation-logic assertions containing I/O permissions, tokens, and existential places.
4. Use the assertion’s heap transition semantics: an operation consumes its I/O permission and moves a token from the source to the target place. An input differing from the permission’s prediction moves to a state permitting arbitrary well-typed behavior. Assertion traces are the intersection of the traces of all satisfying heaps (Section 5.1, PDF pp. 21–22).
5. Prove trace equivalence in both directions between the component event system and its assertion.
6. Use the resulting assertion as the Hoare-triple specification for the implementation.

The paper explains the bridge: “We therefore define a translation of the components’ event systems into I/O specifications and prove that they are trace-equivalent by establishing a simulation in each direction.” (Section 5, PDF p. 20). Its illustrative specification is `token(t) ★ (∃x,t′,t″. recv(t,x,t′) ★ send(t′,2x,t″))` (Example 5.2, PDF p. 21).

Inference: a possible Verus adaptation would use owned ghost tokens and ghost traces to constrain I/O wrappers. Matching Igloo’s theorem would additionally require a semantics and proof corresponding to the intersection over all satisfying heaps; token bookkeeping alone would not establish that equivalence. This adaptation is not evaluated in the paper.

Evidence: Theorem 5.5 and Theorem 5.7 establish the translation properties summarized in Table 2. The paper identifies spurious behaviors from existential places and monotonicity and defines assertion traces by behaviors common to all heap models (Example 5.3, PDF p. 22). This is why the equivalence proof is nontrivial rather than a syntactic translation.

## technique 3: modular code verification

Inference: when to use it: use it when components are in different languages or use local concurrency, and avoid re-proving global protocol properties for each implementation.

Steps:

1. Give each component only its own I/O specification and local state contract.
2. Verify the implementation with a separation-logic verifier, such as VeriFast or Nagini, or with a separation logic embedded in an interactive theorem prover (Section 1, PDF p. 4; Section 3.8, PDF p. 14).
3. Require the verifier assumption: proving the Hoare triple implies implementation traces refine the I/O specification (Section 1, PDF p. 4).
4. Under the environment, configuration, translation, and tool assumptions, compose verified component traces with the environment and apply compositional refinement (Sections 3.9–3.10, PDF pp. 16–17).

The paper says: “Crucially, our approach supports modular reasoning in that the verification of a component’s code does not involve reasoning about the system’s global properties, other components, or the environment.” (Section 1, PDF p. 4).

Inference: a possible Verus adaptation would verify each component against local protocol contracts and supply a separate composition proof. Concurrent implementations would need a resource invariant relating shared program state to model state, following the role of the monitor invariant in the replication case study (Section 4.1.4, PDF p. 18). The paper does not validate this Rust adaptation.

Evidence: case studies cover unbounded component instances, TCP and UDP, concurrent implementations, and three protocols (Section 3.1, PDF p. 9). Inference: these case studies demonstrate feasibility, rather than a general bound on annotation effort. The paper explicitly excludes liveness (Section 3, PDF p. 8).

## technique 4: explicit trust-boundary accounting

The overall theorem assumes (1) the modeled environment includes every real environment behavior, (2) program configuration parameters obey the configuration map, (3) manual translation of I/O specifications is correct, and (4) the verification logics and tools are sound, agree on I/O-specification semantics, and the code verifier satisfies (VA); Nagini additionally depends on Viper (Section 3.10, PDF pp. 16–17). The paper states: “These guarantees assume that the real environment, including the I/O libraries and the lower software and hardware layers, conforms to our environment model, the components are correctly instantiated, and the verification tools used are sound.” (Section 1, PDF p. 4).

Inference: for VeruLaw’s agent-written verified Rust, Igloo is relevant prior work for connecting local code proofs to distributed-system properties. A comparable claim would need a global model, component specifications, a composition argument, and explicit environment and configuration assumptions. The paper does not evaluate VeruLaw or Verus. It leaves liveness and automation of manual specification translation as future work (Section 7, PDF p. 28).

## what is proved and measured

The formal development is in Isabelle/HOL; code case studies use VeriFast and Nagini. The paper reports three protocol case studies and independent Java/Python implementations, but provides no aggregate lines-of-code or proof-time measurement. Section 3.8 (PDF p. 14) gives one limited encoding-size observation: “For instance, encoding such specifications in VeriFast required less than 25 LoC to declare types for places and abstract predicates for chunks, and no tool modifications.” Its formal guarantee is conditional trace preservation, not an empirical claim that every distributed implementation is verified. The trusted surface includes environment models, configuration, manually translated specifications, and verifier/tool soundness.

## techniques for the catalog

- six-step refinement pipeline — refine global requirements to protocol, interface, components, I/O specifications, and verified code
- trace-equivalent I/O linking — translate event systems through a process calculus into separation-logic permissions and prove simulation both ways
- modular component verification — prove each heterogeneous implementation against a local I/O contract, then compose traces
- trust-boundary accounting — state environment, configuration, translation, and tool assumptions needed for end-to-end soundness
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Instead of translating component models directly into I/O specifications, we will pass through an intermediate translation to a sequential process calculus."): checked all paper text, including references and Appendix A, and the study’s quotations, numbers, section/page references, technique steps, tag, and DOI; corrected the six-step sequence, case-study language coverage, I/O-event prerequisites and heap transitions, section/page references, trust assumptions, and measurement description; marked proposed Verus applications as unvalidated inferences; did not inspect artifacts, rerun proofs or implementations, or validate the proposed Verus adaptations.
