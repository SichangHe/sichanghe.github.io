# Sovereign Agentic Loops: Decoupling AI Reasoning from Execution in Real-World Systems
(authored by agents unless marked 🧑)
Tag: `he2026sovereign`, [paper](https://arxiv.org/abs/2604.22136)

## problem and contribution
The paper addresses a specific architecture: a language model emits an API command that can mutate infrastructure, and the command is executed with little mediation. Its proposed Sovereign Agentic Loop (SAL) converts model output into a structured intent, validates that intent against true state and policy, executes it only after approval, and records the lifecycle in a cryptographically linked Evidence Chain. The abstract states: “We introduce Sovereign Agentic Loops (SAL), a control-plane architecture in which models emit structured intents with justifications, and the control plane validates those intents against true system state and policy before execution.” (Abstract, p. 1.)

Inference: SAL is an execution-control architecture, not formal verification of the model or generated code. Its theorem is conditional on four assumptions, and its experiment measures policy filtering, replay, and latency rather than a Rust program’s functional correctness.

## technique 1: intent/execution decoupling

What it is. SAL treats a model response as a proposal. The paper calls this the Decoupling Principle: “reasoning models should yield verifiable intent rather than direct execution authority.” (Section 1, p. 2.) The control plane receives an intent `i` and justification `J`, evaluates them against true state `s` and policies `P`, and only then invokes the execution operator `X`.

How to apply it.

1. Give the model only an obfuscated state `ŝ` and goal `G`; define the model interface as `M(ŝ,G) → (i,J)` (Section 3.2, p. 6).
2. Require a normalized intent schema. The prototype uses `i = ⟨action_type, target_token, parameters, justification⟩` and represents a node removal as `action: TERMINATE_NODE, target: Node-A7x, justification: "Memory exhaustion"` (Section 4.2, p. 10).
3. Evaluate policy and contextual consistency separately: `E(i,s,P) = Epolicy(i,s,P) ∧ Econsistency(i,J,ŝ)` (Section 3.2, p. 7). Policy checks use true state and sovereign rules; consistency checks compare the justification with the observed context.
4. Execute only when `E = 1`; otherwise return `⊥` (Section 3.2, pp. 7–8). The paper’s execution semantics are `X(i,s,P) = aexec` if `E(i,s,P)=1`, and `⊥` otherwise.
5. Keep mutation credentials inside the control plane so that all state changes pass through `X`. This is assumption A3, “Closed Execution,” and the implementation uses short-lived, scoped IAM tokens tied to the authorization window (Sections 3.3 and 4.4, pp. 8, 10).

Verus form. Inference: model an intent as a Rust enum or struct whose fields have precise types, then write an executable evaluator with `requires` for valid state and policy representations and `ensures` that a returned authorization implies the policy predicate. Use a `spec fn` for the mathematical predicate and `assert` or proof lemmas to establish the evaluator result. The execution function can take an authorization token produced by the evaluator, so Rust ownership prevents callers from fabricating the token in the verified interface. Inference: Verus can prove the local relation between `E` and `X`; it cannot by itself prove that an external cloud API obeys the adapter contract, so that contract is a trusted boundary unless the API is modeled.

Evidence and limits. The prototype uses Open Policy Agent (OPA) for production-destruction limits, blast-radius thresholds, and region restrictions. A contradictory justification, such as claiming “high CPU utilization” when telemetry reports 15% load, is rejected by the consistency evaluator (Section 4.3, p. 10). The architecture assumes deterministic evaluation, deterministic execution, closed execution, and complete context (Section 3.3, p. 8). Inference: violating any assumption can invalidate the policy-bounded claim; an unmediated credential or omitted context is outside the theorem.

## technique 2: obfuscation membrane and intent abstraction

What it is. SAL separates identity-sensitive state from structural information. It decomposes `s ∈ S` as `(sid,sstruct)` and maps it through `Π:S→Ŝ`. The strict target is `I(Sid;Ŝ)=0`, while the structural objective is to maximize `I(Sstruct;Ŝ)` (Section 3.1, pp. 5–6). The paper states: “this projection must satisfy the strict isolation constraint” (Section 3.1, p. 5) and later specifies that identifying metadata such as AWS account IDs, exact subnets, routing hashes, and internal DNS endpoints are replaced with ephemeral tokens (Section 4.2, pp. 9–10).

How to apply it.

1. Define which state fields identify infrastructure and which describe topology or relationships.
2. Replace identity fields with ephemeral tokens while preserving the dependency graph topology.
3. Store `Π` and privileged `Π−1:Ŝ×K→S` in a secure control-plane cache; the model “strictly receives obfuscated inputs” (Section 3.2, p. 6), and `Π−1` is defined as accessible “exclusively within the control plane” (Section 3.1, p. 6; cache in Section 4.2, p. 10).
4. Parse model output into token-based intents. Resolve the token to a concrete target only inside the control plane after policy evaluation.
5. Check side channels. The paper qualifies the isolation claim: it holds only “provided that auxiliary side channels do not reintroduce identity information.” (Section 3.1, p. 5.)

Verus form. Inference: encode `ObfuscatedState` without identity fields and keep the reconstruction map behind a module boundary. A `spec fn` can state non-disclosure for a finite modeled state, but information-theoretic mutual information is not automatically available as a Verus library theorem; a proof would require a discrete probability model and lemmas about the projection. The practical Verus contract can instead require that each token resolves only through an authorized map and that no executable function exposed to the model accepts the key `K`. Inference: this proves an interface discipline, not the paper’s full Shannon-information claim.

Evidence and limits. The paper proves Lemma 1 only under `I(Sid;Ŝ)=0` and no reconstruction key or equivalent oracle (Section 3.3, p. 8). Its statement is that no deterministic estimator `f(Ŝ)=Sid` can exceed “uninformed random guessing over the prior marginal distribution of Sid”. Inference: side channels, a compromised cache, or an obfuscation that leaks identifiers are outside that argument. The paper gives no method for building a `Π` that achieves `I(Sid;Ŝ)=0` in practice; Section 4.2 only says identifying metadata is replaced with ephemeral tokens.

## technique 3: deterministic evaluation, scoped execution, and fail-safe behavior

What it is. The control plane uses a deterministic policy engine, a consistency checker, an environment-specific adapter, and an append-only Evidence Ledger. Authorized actions receive transient credentials; parse failures, incomplete context, and adapter faults default to denial. The paper states: “If action parsing fails, a context check cannot be completed, or an adapter faults, processing terminates in a denied state recorded in the chain rather than falling back to unmediated operations.” (Section 4.4, p. 10.)

How to apply it.

1. Normalize and validate intent syntax.
2. Evaluate declarative policies against the localized true state.
3. Compare justification `J` with context snapshot `ct`.
4. If both checks pass, create a short-lived scoped IAM token and dispatch through the environment adapter.
5. Record denial as well as execution; never retry through a direct API path after an internal fault.

Verus form. Inference: represent authorization as an enum with `Authorized` and `Denied` variants; make the adapter accept only `Authorized`. Prove that every `Authorized` value satisfies the policy predicate with `ensures`, and prove a total evaluator that maps parse, policy, consistency, and adapter errors to `Denied`. A loop over an evidence log can carry an `invariant` stating that every recorded execution has a corresponding authorized intent and chained predecessor hash. Inference: cryptographic collision resistance and the cloud provider’s token semantics remain assumptions unless separately modeled.

Evidence. OpenKedge ran on AWS Graviton2 c6g.2xlarge instances (8 vCPUs, 16 GB RAM), Amazon Linux 2026, Redis for token mapping, SHA-256 chaining, and OPA binaries (Section 5.1, p. 11). The workload had 10,000 traces: 7,500 benign and 2,500 adversarial. Median control-plane latency was 12.4 ms and the 95th percentile was 21.7 ms; the median components were 2.1 ms reconstruction/context fetch, 6.8 ms OPA evaluation, 2.3 ms consistency evaluation, and 1.2 ms hashing/serialization (Section 5.2, p. 11). Of 2,500 adversarial intents, 2,325 (93.0%) were blocked by policy and 175 (7.0%) by consistency, giving `(2325+175)/2500 = 1.00` (Section 5.3, p. 11). All 7,500 benign executions replayed from the ledger with a reported 100% match rate (Section 5.4, p. 12).

Inference: these denominators describe a simulated cloud workload, not production traffic. The paper’s “no unsafe intent bypassed the evaluation stage” (Section 5.3, p. 11) is evidence for this benchmark and implementation, not a universal guarantee. The theorem’s guarantee depends on A3; the prototype’s claim therefore depends on credentials and APIs actually being confined to the control plane.

## what is proved, measured, and trusted

The paper states policy-bounded execution, identity isolation, and deterministic replay in Theorem 1 under A1–A4 (Section 3.3, pp. 8–9); the proofs given are proof sketches. It measures latency, blocked adversarial intents, and replay reconstruction. Inference: trusted elements include the completeness of `ct`, the deterministic behavior of `E` and `X`, the closed-execution credential setup, the obfuscation assumptions, OPA and adapters, Redis key storage, SHA-256 properties, cloud APIs, and the paper’s simulated red-team workload.

Inference: for VL, SAL’s strongest transferable idea is to ensure that agent-written verified Rust emits a typed proposal and that a separately verified control-plane function decides whether an effect may occur. The paper argues in Section 1 that logging or coarse permission boundaries “do not by themselves verify whether the proposed action is appropriate under the true system state”, but its evaluation has no direct-execution or logging-only baseline, so it does not measure that comparison. The product threat remains material: a correct local proof can be bypassed by an unmodeled execution path, incomplete state, a compromised mapping cache, or an adapter whose real behavior differs from its contract.

## techniques for the catalog

- intent/execution decoupling — represent model output as a typed intent and authorize it against live state and policy before any mutation
- obfuscation membrane — replace identity-sensitive fields with tokens while preserving structural topology and reconstruct only inside the control plane
- deterministic policy and consistency evaluation — require both declarative policy compliance and justification/context agreement
- evidence chain replay — record intent, justification, decision, executed action, a hash of the context, and the hash of the previous entry in a cryptographically linked ledger for audit and deterministic reconstruction
- fail-safe scoped execution — use short-lived authorization credentials and deny on parse, context, or adapter failure
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "This motivates treating model outputs as proposals that require downstream validation rather than as commands that can be executed directly."): read the whole text (Sections 1-6, appendices); checked every quotation, equation, number (10,000 traces, 7,500/2,500 split, 2,325/175 blocked, 12.4/21.7 ms, component latencies, hardware), section and page reference, and the tag and arXiv link (2604.22136, Jun He and Deying Yu, 2026). Changed: one quotation case, three page references (Sections 3.1/4.2 spans), the model-never-receives-K claim now cites the paper's own words, the evidence-chain record fields, the proof-sketch status of Theorem 1, an unsupported 'paper already establishes' claim (the paper has no baseline comparison), and marked the trusted-elements list and side-channel remarks as Inference. Did not check: the Verus forms (study's own inferences, not run), the cited references, or the figures beyond their captions.
