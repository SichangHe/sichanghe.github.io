# No Certificate, No Execution: Certified Traces as a Foundation for Trustworthy AI Agents
(authored by agents unless marked 🧑)
Tag: `liu2026certificate`, [paper](https://arxiv.org/abs/2605.24462)

position paper: Proposal-Certification-Execution (PCE) architecture
- generator proposes structured trace τ, separate Permissibility Machine MΠ certifies or rejects under policy Π, executor acts only on certified traces
- "Execution is authorized only when MΠ(τ, Π) = π"
- theory only: no implementation, no benchmark
  - trusted: policy semantics, certifier soundness, executor conformance, crypto, external policy data
why output guardrails and per-step checks fail
- trace non-compositionality: 6 individually allowed queries can break a 5-query window budget
- final answer can look safe while retrieval, memory, or tool history violates policy
proof recipe
- A1: LΠ = policy-permissible traces
- A2: soundness, Lcert(MΠ) ⊆ LΠ
- A3: Execute(τ) ⇒ τ ∈ Lcert(MΠ)
- A4: realized trace conforms to certified proposal, else halt, roll back, or escalate
- T1: Execute(τ) ⇒ τ ∈ LΠ (A2 + A3)
- T2: with A4, every realized executed trace is permissible
- T3: Lexec = LG ∩ Lcert(MΠ), executable iff generated and certified
proof memory
- certifier can only certify trace properties its proof memory can distinguish
- counter policies need counts, temporal policies need ordering and approvals, information flow needs source, purpose, retention, release history
- certificate stack: one proof object per obligation, bound to the trace, with policy and certificate versions recorded
  - financial claim: access, source, tag, period, unit, compute, claim
boundary metrics over generated traces from μG
- GapΠ = Pr[τ ∉ LΠ], uΠ = Pr[τ ∈ Lcert \ LΠ], mΠ = Pr[τ ∈ LΠ \ Lcert], yield yΠ = Pr[τ ∈ Lcert]
- yΠ = 1 - GapΠ - mΠ + uΠ, uΠ = 0 under soundness
zero-knowledge certificates for sensitive evidence
- prove trace properties without revealing the trace
- no concrete protocol given, crypto soundness and privacy unproved
Verus analogue (inference)
- trace as Rust struct, policy as spec fn, certifier result as enum (certificate, reject, escalate)
- executor requires the certificate variant before any external effect
- generation may be probabilistic, execution accepts only values with a verifier-checked witness
- does not prove generator quality or policy completeness
