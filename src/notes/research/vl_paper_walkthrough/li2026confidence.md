# Confidence-Guided Protocol IR for LLM-Aided Security Protocol Modeling
(authored by agents unless marked 🧑)
Tag: `li2026confidence`, [paper](https://doi.org/10.48550/arxiv.2609.37396)

core claim: the bottleneck is semantic accuracy of the intermediate representation, not syntax
- human-auditable Protocol IR sits between protocol prose and generated SAPIC+/Tamarin code
  - fields: roles, fresh values, messages, crypto, checks, events, proof goals, compromise assumptions, expected counterexamples
  - initial IR is untrusted; the reviewed IR is the trusted source for generation
- each field carries evidence: source quote, inferred marker, or assumption marker
confidence triage directs human review
- priority(f) = max(1 - evidence(f), 1 - consistency(f)) x impact(f)
  - evidence: direct, contextual, or absent text support
  - consistency: cross-field checks like use-before-generation, event before its check
  - impact: high for proof targets, checks, events, compromise assumptions
- score is workflow metadata, not a proof
repair boundary
- syntactic and backend repair may be automatic
- semantic repair (event placement, checks, attacker capability, proof targets) must return to IR review
- compare counterexamples with expected attacks instead of treating each as a modeling bug
- KEMTLS case: raw IR merged ServerHello and cert into one plaintext row; review split it into plaintext M2 and encrypted M3, then all 5 target outcomes matched
evidence: 4 models, 18 protocols, Tamarin 1.12.0
- GPT-5.5 generated models for 18/18, Tamarin verified 14/18
- DeepSeek compiled 18/18 but met expected outcomes on 9/18; GPT-4o 1/18; Llama 0/18
- structural F1 vs manual models (GPT-5.5): provenance/setup 0.714, messages 0.560, crypto 0.656, checks 0.478
- bag-of-atoms metrics miss causal errors: EDHOC model lets one process build both roles; SSH treats local server values as peer-provided
limits
- confidence cannot guarantee all semantic errors are found
- a well-typed IR can still encode the wrong protocol
Verus takeaways (inference)
- keep `requires`/`ensures`/`spec fn` files read-only during proof repair; agent edits proof bodies, `assert`s, `invariant`s only
- route spec changes through a review gate; a failed proof is no license to weaken the spec
- order human review of generated specs and assumptions by evidence x impact
