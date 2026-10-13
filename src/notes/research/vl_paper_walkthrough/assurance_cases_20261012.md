# Automatically Building Machine-Checked Assurance Cases from C Codebases to Requirements
(authored by agents unless marked 🧑)

## scope and existing notes

This study covers Li et al., arXiv:2609.40119 (2026), “Automatically Building Machine-Checked Assurance Cases from C Codebases to Requirements.” I found no earlier study with this title in the research notes. The paper presents CCV, an LLM-assisted workflow using VST in Rocq. Its concrete claim is memory safety and leak freedom for 299 C function definitions in six benchmarks, conditional on contracts, external specifications, caller obligations, and human review that links formal artifacts to requirements.

## technique 1: co-evolve specifications and proofs

What it is. CCV treats a function contract and its body proof as a coupled synthesis problem. A natural-language requirement is analyzed into candidate preconditions, postconditions, invariants, and caller demands; these are formalized bottom-up into VST function specifications and lemmas; proof attempts then revise specifications when they are too strong, weak, or mis-expressed.

When to use it. Use this for a codebase where contracts are not already trustworthy and where proof failures expose missing semantic information. It is especially useful when callers impose requirements on a callee that cannot be guessed from the callee body alone.

How to do it. First freeze the C input as a Clight AST (V_Preprocess). Analyze implementations, callers, and design material (V_Analyze), recording interface functions, functional/resource invariants, external-function axioms, and assumptions. Formalize callees before callers (V_Specify), including separation predicates, lemmas, and funspecs. Construct body proofs and shared lemmas (V_Prove). On a semantic gap, revise the affected representation, specification, or protocol and recheck dependent proofs. Keep an audit of axioms, admitted holes, and coverage. The paper’s list example shows why this loop matters: weak `list_push`/`list_remove` postconditions returned an arbitrary list, so `list_length`’s length precondition could not be established; stronger postconditions returned `v :: xs` and `le_or_id v xs`, carrying exact list information.

Evidence and limits. All 299 bodies passed the no-admitted-obligation gate, with machine-checked proofs of memory safety and leak freedom. The six benchmarks contain 299 functions across 18 translation units; human effort is reported as under one person-day per benchmark. These numbers are benchmark results, not a success rate over arbitrary C. Functional correctness, termination, and concurrency are outside scope. Contracts and external specifications remain assumptions, and proof success does not establish that a specification expresses intended requirements.

Quote (Section 2, page 2): “A usable, provable pair is therefore the outcome of an iterative co-evolution, not of a single synthesis pass.”

## technique 2: resource-aware interface protocol for open libraries

What it is. An open library has no `main` to define legal call sequences. CCV therefore builds a state-based interface protocol P = (F, S, transitions, guards, branches). A state records global variables, borrowed caller resources, and library-managed objects; its interpretation is a separation-logic assertion. Each function has a guard and branches describing possible observations, successor states, pure facts, and residual resources.

When to use it. Use this when requirements constrain sequences of exported calls and there is no designated client. A protocol makes legal sequences, ownership assumptions, and resource flow explicit for human review and allows per-function proofs to compose.

How to do it. Identify externally callable functions F and logical variables W for each interface. Define state domains for globals, borrowed resources, and library objects, plus `Inv`, `GlobalRep`, `BorrowRep`, and `LibObjRep`. For each function define a guard `G_f(state,w)` and branch set `Br_f(state,w,o)` containing next state, observable result, proposition, and residual resource. Define protocol transitions only when the guard holds and a branch reaches the successor. For every enabled state/function pair create a protocol edge whose precondition combines the guard, interpreted state, and caller-borrowed resources; its postcondition existentially selects a declared branch and successor. Prove per-edge subsumption: the edge precondition entails the interface precondition, and every interface outcome fits an edge postcondition under a frame. Then require a covering witness: one satisfiable run from an empty grounded state that exercises every interface.

Evidence and limits. The protocol soundness theorem states that a valid input-aware run, realized by a client supplying represented arguments and borrowed resources, is safe when (H1) implementations satisfy interfaces and (H2) every edge is subsumed. The theorem is conditional: it does not verify arbitrary clients, prove that every abstract run has a client, establish maximality of accepted calls, termination, liveness, callbacks, or concurrent ownership. Unsatisfiable preconditions and over-strong guards can make proofs vacuous, so model fidelity, realizability, coverage, and conformance review are required.

Quote (Section 4.3, page 10): “Under H1 and H2, every concrete execution that realizes a valid input-aware run is safe.”
Quote (Section 4.4, page 10): “It does not prove that every declared state is satisfiable, that every branch occurs in the implementation, or that a concrete client program realizing the witness exists.”

## technique 3: evidence-producing workflow and explicit trust gates

What it is. CCV structures verification as artifacts and gates rather than one proof search. V_Preprocess binds source, build context, and frozen Clight; V_Analyze records contractual demands; V_Specify emits formal objects and an NL-to-formal change record; V_Prove discharges body, lemma, edge, and run-lifting obligations. Optional V_Review can send work back to preprocessing; V_Confirm checks that produced artifacts conform to reviewed design intent; V_Succeed delivers proofs, assumptions, scope, and review records.

How to do it. Regenerate the frozen Clight input and preserve provenance. Separate semantics-preserving transformations from adaptations that change scope. Record all external functions, allocator premises, logical/model axioms, and tool versions. Require proofs free of admitted obligations, audit dependencies and coverage, and have humans review whether specifications and protocols match requirements. Bind delivered source, toolchain, Clight, and proof artifacts with correctness-critical gates. The LLM remains outside the trusted computing base; Rocq rechecks formal statements and proofs.

Evidence and limits. The implementation used Rocq 9.0.0, VST 2.16, and CompCert 3.17. Six cases passed the proof gate. A SHA-256/224 review found `CopyCtx(ctx, ctx)` excluded because the contract required disjoint resources; this exposed a potentially defective use despite a valid proof. The formal guarantee is relative to CompCert Clight semantics and disclosed premises, and executable-C assurance requires downstream verified compilation.

Quote (Section 5.4, page 13): “Proof success does not imply unconditional correctness beyond the disclosed axiomatic specifications and assumptions.”
Quote (Section 5.5, page 13): “The LLM agent is not in the TCB: Rocq rechecks every formal statement and proof that it proposes.”

## what is proved, measured, and trusted

Proved: each listed function body satisfies its VST specification; memory safety and leak freedom hold under preconditions; protocol soundness follows from H1/H2; four openHiTLS cases additionally have protocols, edge subsumption proofs, and witnesses. Measured: 299 functions, 18 translation units, six benchmarks, listed C LOC, elapsed days, tokens where available, and under one human day per benchmark. Trusted or assumed: Rocq kernel, VST/CompCert soundness, frozen preprocessing/front end, gate bindings, allocator and external-function premises, formal specifications, protocol model, caller arguments/resources, and human requirement-conformance judgments. The paper says it does not verify functional correctness of cryptographic algorithms, termination, or concurrency. Token/time records are incomplete (dashes for some cases), and model-service downtime makes cross-run efficiency comparisons invalid.

## what VL should reuse and threat inference

VL should reuse the separation-logic pattern of carrying state and ownership across calls, per-edge subsumption, a satisfiable all-interface witness, specification–proof feedback, frozen-input provenance, and explicit audits for holes and axioms. It should not redo a generic API protocol theory or claim unconditional correctness from a passing prover. My inference: threat to agent-written verified Rust is high for contract/proof drafting and modular feedback, but lower for requirement conformance and open-library call protocols because those remain human judgments and caller obligations. Verus/Rust-specific semantics, executable compilation, and concurrency need separate evidence.

## techniques for the catalog

- specification–proof co-evolution — iteratively revise VST contracts and proofs together using proof failures as semantic feedback
- resource-aware interface protocol — model legal open-library call sequences with states, guards, branches, ownership, and edge subsumption
- input-aware protocol soundness — obtain conditional safety for realized runs under implementation satisfaction and caller obligations
- evidence-producing verification gates — freeze inputs, audit proofs/axioms, and require human conformance review before delivery
- covering witness — require one satisfiable run exercising every interface to block vacuous protocol proofs
