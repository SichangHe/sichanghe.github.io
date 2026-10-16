# No Certificate, No Execution: Certified Traces as a Foundation for Trustworthy AI Agents
(authored by agents unless marked 🧑)
Tag: `liu2026certificate`, [paper](https://arxiv.org/abs/2605.24462)

## scope and trusted parts
This position paper formalizes execution authorization for agents as a Proposal–Certification–Execution (PCE) architecture. A generator proposes a structured trace, a separate Permissibility Machine certifies or rejects it under policy, and an executor acts only on certified traces. The abstract states: “The resulting executable trace language is Lexec = LG ∩ Lcert (MΠ ).” (Abstract, p. 1) The paper proves algebraic safety theorems from axioms; it does not implement or benchmark a certifier. Inference: the policy semantics, certifier soundness, executor conformance, cryptography, and any external policy data remain trusted assumptions.

## technique: pre-execution trace certification
Use this when final-output checks cannot see cumulative or provenance-sensitive violations. Represent the intended actions, retrievals, computations, evidence, approvals, credentials, and conditions as a finite trace τ. Define policy-permissible traces LΠ. A certifier MΠ maps (τ, Π) to a checkable certificate π, rejection ⊥, or escalation. Permit execution only on the π branch. The paper specifies: “Execution is authorized only when MΠ (τ, Π) = π.” (Sec. 4, p. 7)

The paper's proof recipe is explicit. Axiom 1 defines τ∈LΠ. Axiom 2 requires soundness, Lcert(MΠ)⊆LΠ. Axiom 3 requires Execute(τ)⇒τ∈Lcert(MΠ). Axiom 4 requires the realized trace to conform to the certified proposal or halt, roll back, or escalate (Sec. 3, pp. 4–5). Theorem 1 then derives Execute(τ)⇒τ∈LΠ by composing Axioms 2 and 3 (Sec. 3, p. 5). Theorem 2 adds conformance to show every realized executed trace is permissible (Sec. 3, pp. 5–6).

Verus form (Inference): encode a trace as a Rust struct and policy as a `spec fn`; give the certifier result an enum with certificate, reject, and escalation variants. A `proof fn` can establish policy membership from a certificate verifier's postcondition, and an executor function can require the certificate variant before calling an external effect. Use `ensures` on executable functions and loop invariants for trace construction. Keep the policy checker and external effect behind explicitly trusted interfaces unless their semantics are modeled. Verus does not provide the paper's PCE type automatically; the separation must be enforced by API design and proofs.

The failure addressed is trace non-compositionality: six individually authorized queries can violate a five-query window budget. The paper states: “Output guardrails ask whether the final output appears acceptable. Local action checks ask whether each step is individually allowed.” (Sec. 2, p. 4) A final answer can therefore be safe-looking while retrieval, memory, or tool history violates policy.

## technique: executable-language intersection
Use the language formulation to reason about what can actually run. Define LG as traces producible by generator MG and Lcert(MΠ) as traces accepted by the certifier. Then define Lexec(A)=LG∩Lcert(MΠ), where A=(MG,MΠ,E). The paper's Theorem 3 says a trace is executable iff it is both generated and certified (Sec. 5, p. 8). The proof is set inclusion in both directions: execution implies generation and certification; membership in the intersection implies authorization under the architecture.

Verus form (Inference): represent generated and certified predicates as `spec fn`s over traces and prove the executor's precondition implies their conjunction. This is useful as a refinement boundary for agent-written Rust: generation may be probabilistic, but execution accepts only values carrying a verifier-checked witness. It does not prove generator quality or policy completeness.

## technique: proof memory and certificate stacks
Use policy-specific proof memory for obligations that depend on history. The paper distinguishes semantic policy LΠ from remembered evidence H. Counter policies need query counts or exposure; temporal policies need ordering and approvals; information-flow policies need source, purpose, retention, and release history (Sec. 6, p. 9). A financial-claim certificate is decomposed as π=(πaccess, πsource, πtag, πperiod, πunit, πcompute, πclaim), binding authorization, source, tags, periods, units, replayable computation, and final claim (Sec. 6, pp. 9–10). A general high-stakes stack adds identity, authority, policy, risk, privacy, human approval, and lineage components.

Steps from the paper: identify policy obligations; store the history needed to distinguish them; emit one proof object per obligation; check each object and bind them to the trace; record policy and certificate versions for audit (Sec. 6, pp. 9–10). The paper's principle is: “a certifier can only certify trace properties that its proof memory can distinguish.” (Sec. 6, p. 10)

Verus form (Inference): use immutable Rust records for trace history and certificate components, with `spec fn` predicates for each obligation and a proof function that combines them. Version fields should be part of the verified record. Persistent storage, signatures, and replay engines remain trusted unless modeled.

## technique: certification-boundary metrics
Use these metrics to separate unsafe admission from conservative rejection. For generator distribution μG, define generated permissibility risk GapΠ(MG)=Pr[τ∉LΠ], certified-but-impermissible risk uΠ=Pr[τ∈Lcert\LΠ], missed-certification risk mΠ=Pr[τ∈LΠ\Lcert], and executable yield yΠ=Pr[τ∈Lcert] (Sec. 7, pp. 10–11). Theorem 4 states yΠ=1−GapΠ−mΠ+uΠ; under soundness uΠ=0. The denominator for every probability is generated traces sampled from μG, not all possible traces. Boundary distance is μG(Lcert△LΠ)=uΠ+mΠ.

## technique: privacy-preserving certification
Use zero-knowledge certificates when evidence itself is sensitive. A privacy policy can constrain who accessed which data, purpose, component, logging, retention, and release. A query budget Nτ(u,R,W)≤B captures cumulative access (Sec. 8, pp. 12–13). The paper states: “A zero-knowledge certificate can prove selected properties of an execution trace without revealing the sensitive trace itself.” (Sec. 8, p. 13)

Inference: a Verus implementation could verify a commitment-opening or proof-verifier result while keeping raw prompts and records outside the verified program. The paper does not specify a zero-knowledge protocol, so cryptographic soundness and privacy are unproved here.

## techniques for the catalog
- PCE trace gate: separate generation, certification, and execution, authorizing only certificate-bearing traces
- executable-language intersection: model runnable behavior as generated traces intersected with certified traces
- proof-memory certificates: retain history and compose obligation-specific witnesses into a certificate stack
- boundary metrics: measure unsafe certification, missed certification, and executable yield over generated traces
- zero-knowledge trace certification: prove policy properties while withholding sensitive trace contents
