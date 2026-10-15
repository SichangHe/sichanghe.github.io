# Type-Checked Compliance: Deterministic Guardrails for Agentic Financial Systems Using Lean 4 Theorem Proving
(authored by agents unless marked 🧑)
Tag: `rashie2026typechecked`, [paper](https://arxiv.org/abs/2604.01483)

## scope and result

Rashie and Rashi propose the Lean-Agent Protocol: an agent proposes an action, a translator turns institutional policy into Lean 4 declarations, and a gateway allows the action only when the Lean kernel proves the corresponding conjecture. The abstract states, “Every proposed agentic action is treated as a mathematical conjecture: execution is permitted if and only if the Lean 4 kernel proves that the action satisfies pre-compiled regulatory axioms.” (abstract, p. 1). The paper is an architectural proposal and roadmap, not a controlled implementation evaluation. Its claims about regulatory sufficiency, “cryptographic-level” certainty, and microsecond operation therefore remain claims of the authors unless backed by the cited external systems.

## technique: asynchronous policy auto-formalization

The protocol separates expensive policy translation from runtime checking. Compliance officers write limits and mandates in English. Aristotle, a neural-symbolic theorem-proving model, translates them into Lean 4 code, repairs failed proofs, and compiles the resulting axioms, theorems, and definitions into an immutable Policy Environment. The paper says, “The computationally intensive process of generating proofs and formalizing policies occurs entirely asynchronously during the configuration phase.” (section 2.4, p. 3).

Steps from section 2.3.1 are: (1) ingest natural-language policies; (2) call Aristotle to auto-formalize constraints; (3) compile the generated code with the Lean kernel; (4) iteratively repair inconsistencies; and (5) store the compiled environment immutably. The authors describe Aristotle's `sorry`-filling ability, but a completed proof is only as correct as the policy translation and definitions supplied to it.

Verus form. Inference: for VL, treat natural-language translation as an untrusted front end that emits Rust/Verus specifications. Require a human-reviewed or independently checked mapping from policy concepts to spec values. Use `requires` and `ensures` on the executable authorization function, and keep policy data immutable after verification. Verus can prove the gateway's decision procedure against the supplied spec; it cannot prove that an English policy was translated faithfully.

## technique: synchronous request-response authorization

The runtime loop is a deterministic state machine. Section 2.3.2 gives these steps: (1) the primary agent generates an intent such as `execute_trade(symbol="AAPL", volume=50000, type="market")`; (2) an orchestrator intercepts the API call and tokenizes parameters plus current state; (3) it formulates a Lean conjecture against the Policy Environment; (4) the Lean type-checker attempts the proof; and (5) a binary result controls actuation. A successful proof unlocks the gateway; failure blocks the action and records an error trace. The paper says, “If the kernel cannot verify the proof ..., the action is definitively blocked, and the system generates a formal error trace for the audit log.” (section 2.3.2, p. 3).

Verus form. Inference: model the request and state as Rust structs, define a pure spec predicate `compliant(req, state)`, and prove that the executable gateway calls the tool only under `compliant`. Use an explicit result enum for allowed or blocked outcomes. A proof of this local control flow does not establish that the external trading API, market state, or policy repository behaves as modeled.

## technique: decouple proof checking from the critical path

The paper argues that only type-checking precompiled proofs is needed synchronously. It cites AWS Cedar measurements of 5 microseconds per formalized access-control input and 7 microseconds for equivalent optimized Rust, and says Lean's `grind` tactic can resolve simple arithmetic constraints with sub-millisecond latency (section 2.4, pp. 3–4). These numbers are cited external measurements, not experiments performed by this paper; they have no denominator or workload distribution beyond the cited Cedar context.

Inference: a Verus gateway could similarly precompile policy proofs and execute a small verified checker, but the paper's Lean latency does not transfer automatically to Rust, Verus, or a networked API path. End-to-end authorization must include serialization, state acquisition, scheduling, and failure handling.

## technique: back-translate proof failures for explanation

A failed Lean compilation produces a technical dependent-type error. To satisfy plain-language explanation requirements, the protocol isolates the failing line and tactic, then uses a retrieval-augmented model to convert the proof state into a stepwise adverse-action explanation. The paper says, “This ensures that the explanation provided to the auditor or consumer is not a hallucinated rationale, but a direct, one-to-one translation of the mathematical constraint that forced the denial.” (section 3.3, p. 5).

Inference: this assurance is stronger than the described evidence. A RAG model can produce an explanation consistent with an error trace only if the mapping is constrained and checked. A safer Verus design would emit a structured refusal code from the verified gateway and render a fixed explanation template from that code; natural-language generation could be advisory and must not alter the decision.

## technique: defend the translation layer

The authors identify the translation model, rather than the Lean kernel, as the primary semantic attack surface. They discuss logical jailbreaks, sentence-level perturbations, indirect prompt injection, and symbol drift. Their mitigation has two parts: require an explicit concept-to-symbol mapping table before translation, and sanitize hydrated context with static parsing so untrusted text and unnecessary variables do not enter the formalization prompt (section 4.2.3, p. 6).

How to apply it. (1) Maintain a hard-coded registry mapping allowed policy concepts to Lean identifiers. (2) Require every translated symbol to reference a registry entry. (3) Reject synonyms or new identifiers without review. (4) Strip external context to a minimal, statically parsed variable set. (5) Compile and kernel-check the result before publication. Inference: Verus can verify parser and registry invariants, but cannot decide whether a concept mapping captures a regulator's intent; that requires independent review or an independently specified semantic test suite.

## technique: sandbox execution

Section 4.3 proposes compiling the Policy Environment and orchestrator into WebAssembly with WASI capabilities configured to deny host network and filesystem access. The goal is to constrain a malicious or compromised translation component. Inference: sandboxing limits ambient authority but does not repair an incorrectly formalized policy. A Verus proof can establish allowed memory and message transitions for a modeled sandbox, while the WASM engine, host configuration, and foreign calls remain trusted boundaries.

## technique: phased deployment and auditability

The roadmap has three phases. Phase 1 is a stateless minimum viable product: translate a bounded policy subset, run shadow verification beside production, and compare Lean judgments with human compliance reviews. Phase 2 moves the verified environment into a hardened WASM runtime, puts the orchestrator in the critical path, adds SMT-backed `grind` checks, and introduces back-translation of refusals (section 6.2, pp. 7–8). Phase 3 scales to global rule sets and high-frequency operation, with bounded MPSC mailboxes, work-stealing schedulers, and immutable proof-linked telemetry (section 6.3, p. 8).

Inference: the staged rollout is a useful verification workflow for VL: first observe decisions, then enforce a narrow verified policy, then broaden the state and concurrency model. The paper does not provide phase exit criteria, measured false blocks, policy coverage, or a denominator for “production-ready.”

## evidence, assumptions, and product threat

The paper supplies architecture, cited regulatory requirements, and cited Cedar/Lean performance figures. It reports no new benchmark suite, no number of translated policies, no translation accuracy rate, no successful attack rate, no end-to-end latency distribution, and no proof that the proposed protocol satisfies any regulator. The Lean kernel checks generated terms, but the natural-language policy, Aristotle translation, `sorry` repair process, immutable repository, orchestrator parser, current-state source, gateway implementation, external API, WASM host, and regulatory interpretation remain trusted or assumed. Contradictions follow from this scope: the abstract presents absolute compliance certainty, while section 4.2 acknowledges that a structurally valid but semantically malicious translation can cause the kernel to authorize a violation.

Inference: for agent-written verified Rust, the paper's strongest lesson is to put a small, deterministic, proof-checked authorization gate after an untrusted agent and to separate policy compilation from runtime checking. The main threat to VL is specification translation: Verus can prove an action satisfies the generated predicate while the predicate omits a risk limit, maps a restricted concept to a permitted symbol, or assumes stale state. VL should not redo the generic claim that theorem kernels reject invalid proofs; it should measure translation fidelity, stale-state handling, and proof-linked audit records.

## techniques for the catalog

- asynchronous policy formalization — translate and compile policies before runtime, then store the checked environment
- kernel-gated request loop — formulate each agent action as a conjecture and allow the API call only after proof success
- proof-checking latency split — keep proof generation offline and execute only precompiled checking synchronously
- structured refusal explanation — derive a human-readable reason from the exact failed proof state
- concept-symbol registry — constrain translation with explicit mappings from policy concepts to formal identifiers
- context sanitization — statically remove untrusted or unnecessary text before formalization
- WASM sandboxing — run the policy and orchestrator with denied host network and filesystem capabilities
- phased shadow-to-production rollout — compare shadow judgments, enforce a narrow policy, then scale the verified state machine
Checked 2026-10-15 against paper rashie2026typechecked: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
