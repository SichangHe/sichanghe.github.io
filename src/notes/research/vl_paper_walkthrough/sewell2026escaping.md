# Escaping the Quicksand: A Call to Arms
(authored by agents unless marked 🧑)
Tag: `sewell2026escaping`, [paper](https://doi.org/10.48550/arxiv.2608.19674)
## thesis and assurance ladder

This short call-to-arms argues that software engineering should combine testing, executable specifications and proof instead of treating testing and formal proof as opposing cultures. It is a position paper, not an evaluation: it reports no benchmark, implementation, solve rate or denominator. Its practical proposal is an assurance ladder. Begin with cheap concrete tests against an executable partial specification, add property-based testing and symbolic execution, and then attempt proof when stronger assurance justifies the cost. The same loop should support human and AI development.

The authors state the ladder directly: “This enables a range of intertwined feedback loops, again both for AI and human, from cheap testing through to more expensive proof.” (Abstract, p. 1.) They recommend code-first retrofitting, specification-first development, or any hybrid, depending on context. The specification is a live artifact that should be tensioned against implementation continuously.

## technique 1: executable-as-test-oracle specifications

What it is: define a mechanized specification that, given an observed behavior or trace, computes whether the behavior is allowed. Instrument the implementation to record externally observable behavior, run ordinary tests, and mechanically compare each observation with the specification. The specification may be executable assertions, pre/postconditions, a trace checker, a reference implementation, or ordinary code in the ambient language (Sections “Making specifications executable as test oracles,” pp. 4–5).

Steps from the paper: choose the behavior representation; write the allowed-behavior predicate or checker; instrument the implementation to produce observations; run existing tests; evaluate each observation with the checker; and use disagreements to revise code or specification. The checker can also generate tests systematically or randomly, removing the need for a manually curated expected result for every case.

Verus form (Inference: the paper is language-agnostic): write a Verus `spec fn` describing allowed states or traces, use executable Rust to collect observations, and prove helper lemmas about the checker with proof functions and `ensures`. A runtime test can call an executable mirror, while the final universal claim requires Verus proofs over the specified state space. Inference: an executable checker alone tests only observed traces; it does not establish the universal theorem that Verus can establish.

Evidence and limits: no case study or numerical result is reported. The method assumes that the observation boundary captures the behavior the specification intends and that the checker is itself correct. The authors present it as something existing tools can do immediately, rather than as a completed product.

Quote: “We say a specification is executable as a test oracle if, given some behaviour that might be exhibited by the system, the specification can be used to compute whether or not that behaviour is allowed.” (p. 4.)

## technique 2: executable abstraction functions and invariants

What it is: define a computable abstraction function from concrete implementation state to intended abstract state, execute it after each step, and compare the resulting abstract states. This supports fine-grained checks even before proof and makes complex state evolution inspectable.

Steps from the “Executable and testable abstraction functions and invariants” section (p. 5): define the abstract state and a function computing it from concrete state; instrument step boundaries; compute the abstract state at each boundary; compare or diff successive states; and flag transitions that violate intended invariants. Inference: the paper does not prescribe a particular diff format or invariant language.

Verus form (Inference): encode the abstraction as a `spec fn` or executable pure function; state an `ensures` relation between concrete and abstract states; and prove that each transition preserves the relation with a proof function. During development, run the executable abstraction function as a test oracle. Rust ghost values can store abstract state; Verus checks the transition proof.

Evidence and limits: no measurements are supplied. The approach is strongest when a useful abstract state can be computed cheaply; it may miss internal behavior that the abstraction omits. The authors claim that examining and diffing abstract states can expose why a system behaves as intended, but do not quantify diagnostic quality.

Quote: “This can be very discriminating, capturing and checking – even without proof – many of the reasons why a system behaves as intended.” (p. 5.)

## technique 3: partial specifications as a gentle on-ramp

What it is: start with partial contracts that support both testing and proof, improve code and specifications through concrete and property-based feedback, and escalate to symbolic execution and proof only when needed. The workflow can be code-first, specification-first or co-developed.

Steps in the paper (p. 5): add a partial executable specification to existing code or write it alongside new code; run concrete tests and check consistency; add property-based tests; use symbolic execution to explore broader paths; attempt proof of the same specification; and strengthen either code or specification when a stage finds a mismatch. The authors emphasize incremental benefits and costs rather than an all-or-nothing proof project.

Verus form (Inference): begin with executable Rust checks and sampled tests; express stable properties as Verus `requires`/`ensures`; add loop `invariant`s and proof functions as symbolic obligations become clear; then run Verus for universal assurance. Inference: Verus can be the expensive final stage in this ladder, while ordinary tests provide faster feedback to an agent generating code.

Evidence and limits: this is a recommendation with historical motivation, not an experiment. It assumes specifications can be written in a form shared by runtime testing and proof. Some properties may be difficult to execute or may require abstractions that are not yet available for the target language.

Quote: “It provides a gentle on-ramp to full verification, with incremental benefits (and incremental demands on costs and skills) as one goes, rather than the more all-or-nothing character of traditional proof-focussed formal methods.” (p. 5.)

## technique 4: specification for design clarification

What it is: force intended behavior into a precise, mechanically usable form and tension it against implementation. Writing and testing the specification exposes ambiguity, missing cases and contradictory assumptions before they become infrastructure.

Steps (Section “Design clarification,” p. 5): state the intended abstraction precisely; encode it in a form that can be executed or proved; compare it with implementation behavior; inspect counterexamples and unexplained cases; and revise the specification or implementation. The paper cites relaxed-memory concurrency, C and Rust aliasing/provenance, LLVM poison/undef and PDF definitions as domains where informal descriptions caused deep mismatches.

Verus form (Inference): make the intended Rust abstraction explicit in `spec fn`s and function contracts, use `assert` to expose disputed cases, and add lemmas for semantics that the verifier cannot infer. Inference: Verus can reveal contradictions in a formal contract, but it cannot decide which of two conflicting stakeholder intents is correct.

Evidence and limits: the paper gives examples but no denominator or measured reduction in defects. The method requires stakeholders to resolve the questions that precise specifications expose; proof cannot replace that decision.

## technique 5: semantics infrastructure and cross-layer proof

What it is: build validated semantics, specification languages and testing/analysis/proof tools for the abstractions on which systems rest—assembly, C, Rust, LLVM IR, operating-system APIs and hardware—and relate layers so properties survive compilation and linking. Figure 2 lists examples such as CompCert, CakeML, seL4, Verus, Alive2 and architecture models, but the paper calls the list a sample rather than a survey.

Steps implied by the infrastructure discussion (pp. 6–7): define the semantics of each abstraction; validate it against intended behavior; provide executable testing and test generation; provide proof tooling; define cross-layer relations (for example Rust to LLVM to assembly); and maintain the artifacts as production infrastructure. The authors stress that isolated projects with incompatible definitions will not integrate later.

Verus form (Inference): use Verus to verify Rust-level components, then establish explicit contracts at FFI, compiler and hardware boundaries. Verus proofs do not by themselves prove LLVM or hardware semantics; those layers need their own validated models and refinement theorems. Inference: a VL product that emits verified Rust should document which lower layers remain trusted.

Evidence and limits: no completion estimate, coverage number or cost denominator is given. The authors say each existing success story required a substantial multi-year project and call for coordinated “100s of M$, not of B$, of funding” (p. 7), a funding opinion rather than a measured requirement.

Quote: “But much requires a body of semantics infrastructure: well-validated and usable semantics of the abstractions on which the implemented system rests – be they assembly, C, Rust, OS APIs, or whatever – and testing/analysis/proof tooling for them.” (p. 6.)

## what is proved, measured and trusted

Nothing is formally proved or empirically measured by this paper. It makes engineering claims and proposals. Trusted elements include the executable specification/checker, instrumentation, abstraction function, semantic definitions, test generators, proof kernels and the mapping from prose intent to formal intent. The authors' assurance claim is conditional: mechanized proofs are checkable by small non-AI prover kernels, but only for the formal statement actually proved.

## what VL should not redo and product threat

Already done here: a unified workflow combining executable partial specifications, concrete tests, property-based tests, symbolic execution and proof; executable abstraction functions; code-first/spec-first/hybrid adoption; and an explicit call for cross-layer Rust/LLVM/architecture semantics. VL should turn these principles into Verus-specific tooling and measurements rather than repeat the argument that testing and proof can coexist.

Inference: threat to a product that emits agent-written verified Rust is high at the boundary level but actionable. The paper identifies the exact gap a VL system must address: a Verus proof can establish a Rust theorem while leaving prose intent, library semantics, compiler behavior, hardware and runtime observations outside the proof. The proposed assurance ladder offers a practical mitigation: use executable contracts and property tests for rapid agent feedback, then gate releases on Verus proofs and record the remaining trusted layers.

## techniques for the catalog

- executable test-oracle specifications — compute whether observed behavior is allowed and check it during ordinary tests
- executable abstraction functions — map concrete states to abstract states and diff them step by step
- partial-specification assurance ladder — move from concrete tests to property tests, symbolic execution and proof
- specification-driven design clarification — use mechanized contracts to expose ambiguity and contradictory intent
- cross-layer semantics infrastructure — relate Rust, compilers, intermediate languages and hardware with tested and proved semantics
Checked 2026-10-13: audit record sewell2026escaping; paper-study comparison complete; gate executed; experiments not rerun
