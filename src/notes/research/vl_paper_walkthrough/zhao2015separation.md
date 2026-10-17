# A survey on formal specification and verification of separation kernels
(authored by agents unless marked 🧑)
Tag: `zhao2015separation`, [paper](http://arxiv.org/abs/1508.07066v3)

## scope and central model

Zhao surveys formal specification and verification of separation kernels for safety and security-critical systems. A separation kernel partitions resources and mediates explicit information flows; the survey separates security policies/properties, formal models, and verification evidence. It quotes the foundational requirement that the kernel must “provide multilevel secure operation on general-purpose multi-user systems” (Section 2.1, pp.3–4). The introduction says that “for the purpose of fully formal verification, the verification chain should reach the implementation level” (Section 1, p.2). The survey covers work since 2000, including MASK, ED, PikeOS, AAMP7G, INTEGRITY-178B, PROSPER, seL4, DEOS and hypervisors.

The properties are data separation, information-flow security, temporal separation and fault isolation. The survey groups the first three spatial properties and notes that many verification efforts work on abstract or low-level models and that model-to-source correspondence is “typically by code review and not formally assured” (Section 4.2.5, pp.28–29); it lists compiler and hardware assumptions among the ingredients of kernel correctness (Section 4.2.4, p.28). Inference: a proved model leaves source, compiler, hardware and configuration correspondence as trusted unless separately verified. Inference: this decomposition is directly useful for VL because an agent-written Rust system needs separate functional, memory, information-flow and scheduling contracts rather than one undifferentiated “correctness” claim.

## technique 1: formalize partition policies as state-machine properties

what it is: represent partitions, resources, subjects and allowed communication as a formal policy, then state what every transition may change. The SKPP partitioned information-flow policy uses subject-to-resource and partition-to-partition rules. The survey gives the policy as `ALLOWED`, where an explicit subject/resource authorization overrides a partition rule unless the subject entry is null (Section 3.1.1, pp.8–9). MASK uses a cell/fiber model; ED uses a top-level state machine with states, inputs and a transition relation.

when to use it (Inference): use this before implementation proofs when the requirement is isolation or controlled flow between compartments. It forces the team to define authorized channels, scheduling state, memory areas and sanitization explicitly.

how it is done:
1. define the state space, partition/resource mapping and event or action alphabet (Sections 2.1 and 3.1.2, pp.5, 9–10)
2. define the policy relation, such as a partition flow matrix or PIFP’s subject/resource triples (pp.7–8)
3. state transition-local properties. ED’s no-exfiltration says a partition’s event may change only its own memory areas; no-infiltration says equal input-partition memory yields equal next partition memory (pp.9–10)
4. include shared-memory and sanitization conditions, such as kernel integrity (Eq. 8, p.10) and ED’s temporal separation (Eq. 15, p.13)
5. prove that every permitted transition preserves the policy, or refine the policy to an implementation model

Inference: Verus can encode a policy state as a ghost or specification value and state transition rules as `requires`/`ensures` on Rust operations. An invariant over the policy state can be written with loop `invariant`; `assert` and `proof fn` lemmas can establish transition preservation. This is an encoding inference, not a construct demonstrated by the survey.

Evidence: the survey reports concrete formalizations in ACL2, PVS, Isabelle/HOL, Z and B, but it is a survey and does not re-run their proofs. It reports seL4’s 8,700 C and 600 assembler lines, 160 bugs found (16 in testing and 144 during verification), and 27,756 proof lines for information-flow security (pp.2, 21). Inference: those counts are project-specific, not evidence that every separation kernel has the same bug yield.

## technique 2: policy-specific information-flow proofs and unwinding

what it is: express noninterference, nonleakage, noninfluence or GWV policies over state transitions and reduce a global trace property to local unwinding conditions. Noninfluence is defined as the conjunction of noninterference and nonleakage in the survey (p.13). The unwinding theorem requires output consistency, weak step consistency and local respect; the survey states the implication as “output consistent∧ weakly step consistent ∧ locally respect −→ noninterference” (Eq. 19–21, pp.22–23).

when to use it (Inference): use unwinding when a direct quantification over all action sequences is too large. It is suited to kernels where each instruction or system transition can be characterized by a local relation and an information-flow policy.

how it is done:
1. define domains/partitions, an observational equivalence and allowed-flow relation
2. define `step` and the state projection visible to each domain
3. prove output consistency: equivalent states have equivalent outputs
4. prove weak step consistency: if the acting domain may influence the observer and the states are equivalent for both the acting domain and the observer, they stay equivalent for the observer after the step
5. prove local respect: an action from a disallowed domain leaves the observer’s state equivalent
6. invoke the unwinding theorem to conclude noninterference (Section 3.3.1, “A General Verification Approach for Spatial Separation Properties,” pp.22–23)

The seL4 separation-kernel work applies nonleakage to reachable states and then proves a one-step confidentiality-u unwinding condition; the survey says refinement transfers the result from abstract specification to C implementation (Section 3.3.1, pp.20–21).

Inference: a Verus implementation can model observer projections as spec functions and prove each Rust kernel operation preserves an equivalence relation. `requires` can state the allowed-flow precondition, `ensures` the post-state equivalence, and `proof fn` lemmas can discharge composition. Verus does not automatically infer hyperproperties; the relation and all relevant scheduler/interrupt state must be specified.

limits: the survey notes GWV is stronger than Rushby noninterference (Section 3.1.5, p.13) and that the relationship between spatial and temporal separation is “complicated and not clear now” (Section 4.2.1, p.27). A proof only covers the modeled domains, events and refinement relation.

## technique 3: top-level specification and code conformance (ED method)

what it is: ED separates security reasoning from most implementation detail by creating a small Top-Level Specification (TLS), proving the TLS property, and then proving that code conforms to it. The survey gives five steps explicitly (Section 3.3.1, p.16): “(1) Producing a Top-Level Specification (TLS) using a state machine model. (2) Formally expressing the security property as the data separation property of the state machine model. (3) Formally verifying that the TLS enforces data separation in TAME … (4) Partitioning the code into three categories … (5) Demonstrating that the kernel code conforms to the TLS.”

when to use it (Inference): use this architecture when a complete source-level proof is too expensive but a small behavioral abstraction captures the required security property.

how it is done:
1. write a natural-language and state-machine TLS (the survey reports 15 pages)
2. formalize data separation and prove TLS enforcement in TAME/PVS
3. partition implementation code into three categories; the survey names “Other Code” (code not corresponding to any TLS behavior, ignored in verification) and later mentions “Event Code” for the code of TLS events
4. define mappings from concrete code states to abstract TLS states and from event pre/postconditions to code annotations
5. prove conformance, retaining the explicit assumptions about ignored code

Evidence: the survey reports 2.5 weeks for TLS/property, 3.5 weeks for the TAME model and proof, and 5 weeks for code conformance (p.17). ED contains 3,000 lines of C and assembly. The survey also says the cost was “much lower than the verification effort on seL4” (p.17). Inference: this staged evidence can be a VL product mode: first verify a compact API/state model, then require checked contracts linking it to Rust functions.

limits: “Other Code” is ignored in the ED verification (p.16). Inference: that code is therefore trusted or outside the property, and the conformance mappings and hardware assumptions remain part of the trusted boundary unless formally checked.

## technique 4: refinement from formal models to executable code

what it is: construct a high-level model, validate it, and refine it through lower-level designs until executable code is generated or manually related. Craig’s Z model covers process tables, spatial separation, asynchronous messaging and non-preemptive scheduling; the Verified Software project mechanized it in Z/Eves, verified model feasibility and API robustness, and found missing invariants and new security properties (Section 3.2, p.14). a B development of a secure partitioning kernel refines the PIFP policy to a level from which C code can be generated automatically (p.15); OS-K uses B for design and Spin for model checking (p.15).

how it is done:
1. state functional and security requirements in Z, B, Event-B or a similar formal language
2. validate or animate the high-level model (ProB is reported for B)
3. introduce refinement relations and discharge proof obligations at each level
4. generate or hand-link implementation code and check representation correspondence
5. separately model hardware-dependent and assembly behavior when needed

Inference: Verus is primarily a code-level contract verifier, so this method would appear as abstract spec functions plus refinement lemmas connecting them to executable Rust. A `spec fn` can define the abstract transition, while executable functions carry `requires`/`ensures`; proof functions establish correspondence. The survey does not claim that Verus supports automatic refinement or code generation.

Evidence: OS-K has more than 2,700 proof obligations, almost all proved automatically in B4free (p.15). Event-B’s ARINC 653 specification has 2,700 LOC and 57 services (p.15). Inference: these counts measure artifacts and obligations, not correctness of unstated hardware or generated-code assumptions.

## technique 5: temporal separation through model checking and inductive invariants

what it is: verify that each thread gets its complete CPU budget in every scheduling period (the DEOS time-partitioning property). DEOS first translates over 1,000 C++ lines into Promela and checks assertions and an LTL idle-execution property. Because one configuration does not generalize, the authors model the scheduler in PVS as a discrete-time transition system and prove an invariant by base and transition steps (Section 3.3.2, pp.23–24). The survey gives the proof shape as an `init invariant` init(s) −→ TP(s) (p.23) and a `transition invariant` TP(ps) ∧ transition(ps,s) −→ TP(s) (p.24).

how it is done:
1. define scheduler state, period, commitment and remaining time
2. state `TP` as a predicate over all periods and threads
3. prove the initial-state implication
4. prove preservation across every transition
5. for one configuration at a time, use model checking; to generalize to arbitrary configurations, the DEOS authors turned to theorem-prover induction

Inference: Verus can express this invariant style with loop `invariant` and transition lemmas, but time and scheduling abstractions must be modeled as spec state. A bounded timed-automata result cannot substitute for an unbounded invariant unless the bound is part of the requirement.

Evidence: the PVS DEOS collection has 1,648 lines and 212 lemmas (p.24). Other surveyed schedulers use Times and UPPAAL timed-automata model checking, and Cheddar simulation analysis of AADL models (Section 3.3.2, pp.24–25; Table 1). The survey says time “can be conveniently represented in model checkers” but that model checking is limited to “only one configuration at a time,” and that provers have “a low degree of verification automation” (Section 4.2.3, pp.27–28); the DEOS feature-based technique “scales well to models of increasing complexity” (p.24).

## evidence, trusted boundary and implications for VL

The survey reports many successful projects but does not independently audit their proof scripts. Inference: trusted elements include formal policy correctness, abstraction-to-code correspondence, compiler and hardware models, configuration assumptions, and any code not included in a model. It notes that model-to-source correspondence is typically established by code review, for example in the INTEGRITY-178B CC evaluation (Section 4.2.5, pp.28–29). The survey recommends full source-level verification, but writes “our opinion is to recommend fully formal verification on source code level” (p.29); this is the author’s opinion, not an experiment.

Inference: the threat to agent-written verified Rust is high for system properties that span memory isolation, information flow, interrupts and scheduling. Function-level Verus proofs can establish local contracts, while this literature shows the need for an abstract state machine, refinement relation, and cross-component noninterference invariants. VL should report which code, compiler, hardware and policy assumptions remain trusted. It should not claim that memory safety or individual `ensures` clauses imply partition isolation.

## what VL should not redo

Inference: VL should not redo generic noninterference definitions, unwinding proofs, TLS/code-conformance decomposition, or scheduler invariant patterns without a Rust-specific gap. These are established techniques with decades of applications. New work should measure how to encode them in Verus, maintain them across unsafe Rust and hardware boundaries, and expose correspondence evidence to users.

## techniques for the catalog

- policy state machines — model partitions, resources, flows and transition-local separation properties before implementation verification
- unwinding information-flow proofs — reduce noninterference to output consistency, step consistency and local respect
- TLS-to-code conformance — prove a small top-level state-machine security model, then map concrete code states and contracts to it
- refinement-based development — transform Z/B/Event-B models through proof obligations into executable or linked code
- scheduler invariants — prove temporal separation with initialization and transition preservation, using timed model checking or induction
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The Workhorse Lemma states that the function’s graph sufficiently captures the dependencies in the data flows of the function."): I read the whole paper text (arXiv:1508.07066v3, pages 1–32) and the whole study. Checked every quotation, number, equation reference, section and page reference, and the ED five-step, unwinding, Z/B/Event-B and DEOS technique steps against the paper. Changed: page references for the PIFP equation, ED properties, seL4 proof size, unwinding conditions, GWV/temporal-separation remark and Section 4.2.5; the Z/Eves result, B/PIFP code generation, DEOS property and sanitization description; the Cheddar and model-checking-versus-theorem-proving statements; the weak step consistency step; the “three categories” step of ED; the unsupported “fault condition” and “authors” wording; and marked unsupported own conclusions “Inference:”. Not checked: the cited primary papers, the Verus encodings (the study’s own inferences, not in the paper), and the PDF figures (Fig. 1–2) beyond the text layer.
