# verified primary-source notes
(authored by agents unless marked 🧑)

These five records were downloaded from arXiv and selectively inspected from extracted full text on 12 October 2026. PDFs are copied to `/hdd1/sichanghe/paper_collection/lit_a_20261012/`.

## IC3Syn

- title: Synthesizing Inductive Invariants for Distributed Protocols via IC3 and Large Language Models
- source: https://arxiv.org/abs/2605.24619
- evidence: abstract says, “We propose IC3Syn, a neuro-symbolic framework that executes an IC3-style process over TLA+ states to synthesize inductive invariants with the assistance of LLMs.”
- relevance: combines solver-guided invariant synthesis with LLM-generated blocking clauses; it addresses proof artifact generation, not vague human intent or implementation refinement

## Shipwright

- title: Shipwright: Proving liveness of distributed systems with Byzantine participants
- source: https://arxiv.org/abs/2507.14080
- evidence: abstract says, “We experimentally demonstrate its operation and liveness both in the common case and in several failure scenarios.” The paper describes translating an abstract PBFT specification into an executable Go implementation and proving refinement
- relevance: close primary evidence for distributed liveness tied to implementation; assumptions and protocol-specific specifications remain explicit inputs

## specification-anchored auditing

- title: Beyond Code Reasoning: Specification-Anchored Auditing of Multi-Implementation Distributed Protocols
- source: https://arxiv.org/abs/2604.26495
- evidence: abstract states that code-driven auditing fails “when correctness depends on what the specification requires rather than how the code executes”; the paper reports a controlled reexperiment and releases evaluation artifacts
- relevance: supports checking implementation behavior against an explicit specification; it does not synthesize the user's intended specification

## TLA+-Bench

- title: TLA+-Bench: An Execution-Grounded Benchmark and Dataset for Natural-Language to TLA Specification Generation
- source: https://arxiv.org/abs/2607.23425
- evidence: abstract says existing resources grade natural-language-to-TLA progress by resemblance; the paper defines execution-grounded grading. Full text reports 897 silver specifications and a gold evaluation set, and states that the evaluation uses declarative style while intent style is separately recorded
- relevance: directly evaluates natural-language-to-TLA generation, but its benchmark descriptions and grading oracle are authored by benchmark creators; it does not establish autonomous intent recovery

## digital twins with TLA+

- title: Formal Verification of Digital Twins with TLA and Information Leakage Control
- source: https://arxiv.org/abs/2411.18798
- evidence: the model abstracts physical and communication processes into atomic state transitions; the paper explicitly says correct message delivery is assumed to eventually occur
- relevance: concrete example of how abstraction and environmental assumptions shape a formal guarantee; useful for recording assumptions separately from proved properties

## FLAG

- title: F LAG: Formal and LLM-assisted SVA Generation for Formal Specifications of On-Chip Communication Protocols
- source: https://arxiv.org/abs/2504.17226
- evidence: the abstract says protocol documents are “unstructured and ambiguous” and LLMs “often fail to extract the necessary information”; FLAG uses grammar-generated candidate properties, timing-diagram filtering, and formal checks
- relevance: shows a concrete route from ambiguous documents to checked properties, but in a constrained hardware-protocol domain

## SpecLoop

- title: SpecLoop: An Agentic RTL-to-Specification Framework with Formal Verification Feedback Loop
- source: https://arxiv.org/abs/2603.02895
- evidence: the abstract says candidate specifications are used to reconstruct RTL and formal equivalence checking feeds counterexamples back into iterative refinement; it reports improvement over LLM-only baselines
- limitation: the paper states results depend on the RTL reconstructor and equivalence-checking setup, and bounded resource limits can block feedback
- relevance: specification generation can be anchored to executable correspondence, but this is reverse engineering from RTL rather than inferring an unconstrained human request
