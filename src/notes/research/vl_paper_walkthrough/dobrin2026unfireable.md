# The Unfireable Safety Kernel: Execution-Time AI Alignment for AI Agents and Other Escapable AI Systems
(authored by agents unless marked 🧑)
Tag: `dobrin2026unfireable`: [paper](https://www.semanticscholar.org/paper/7b4c430ec32ca4682cdee9b710838385fe186663)

## what is proved and measured
The paper describes a Rust authorization kernel placed outside an agent process. Four architectural properties are required: process separation, pre-action enforcement on the only available path, fail-closed behavior, and externally signed evidence. The implementation uses four independently denying seams, a transparency log, binary attestation, and a system lifecycle that depends on kernel availability. The paper says: “The contribution of this paper is the application of all four together to AI agents, the identification of the structurally-only-path property as the load-bearing distinction from contemporary in-runtime approaches, and the machine-checked discharge of P3 against a production code path.” (section 3, p. 4)

Evidence includes 1,000 deterministic Python/Rust equivalence fixtures, 17 cross-language adversarial classes, more than 80 robustness test functions, a controlled p99 comparison at concurrency 20, a Z3 theorem, four Kani harnesses, and a live containment exercise with 704 refused self-modification attempts. The reported 1,000/1,000 and 17/17 denominators are fixture and attack-class counts, not proof of all possible inputs. The paper explicitly says the bypass count is robustness evidence over the tested taxonomy, not a completeness proof (section 6.5, p. 15). Trusted components include Rust/LLVM, Kani, Z3, cryptographic libraries, deployment configuration, operator key custody, and the assumptions about the host and transport. The paper does not machine-check the complete deployment or prove that its threat taxonomy is exhaustive.

## technique: architectural four-property authorization
Use these requirements when a component must control an untrusted process that can otherwise alter its own runtime. P1 requires a separate process with read-only access from the controlled system. P2 requires every consequential action to transit the control on the only path the deployment makes available. P3 requires denial on request errors and refusal to start or halt when the control is unavailable. P4 requires every allowed action to produce a log verifiable outside the controlled system’s trust boundary. The paper states: “Each is necessary; none is individually sufficient.” (section 3, p. 4)

Apply the design in order. First place the decision function in a separate process and expose only an authenticated interface. Second make every ingress, handler, tool dispatch, and client call pass through a denying seam. Third configure boot and runtime dependencies so disabling or losing the kernel disables consequential actions. Fourth append signed evidence using an operator key the kernel does not hold. Fifth statically assemble authorization routes so the agent cannot register new capabilities through the kernel. The reference deployment has nginx, application middleware, dispatch hook, and client SDK seams; a wiring checklist fails builds with a missing seam (section 4, pp. 5–7).

For Verus, this is an inference. Put the policy decision in a separate Rust process and verify a pure decision function with `requires` and `ensures`; verify caller-side fail-closed handling with loop invariants and explicit error cases. Verus can prove local Rust state transitions, but process isolation, key custody, HTTP routing, and deployment startup remain environmental assumptions. The paper’s architectural P1/P2 claims therefore need interface specifications and deployment evidence around the Verus-verified function.

## technique: defense in depth and system-level fail-closed
Use multiple independently denying gates when one routing or handler mistake could create an unprotected window. Each seam denies on its own; the action proceeds only if all permit. The client circuit breaker changes a kernel outage from silent approval to local rejection, and boot configuration refuses to start the agent when the kernel is unreachable. The paper says: “The agent process refuses to start if the kernel is unreachable: \"no kernel, no agent\" at the system level.” (figure 1 caption, p. 6)

Implementation steps are: statically wire each seam; reject builds missing one; configure systemd/Kubernetes liveness dependencies; fail closed on timeout, malformed response, bad signature, or kernel error; and run a reconciler that detects allowed actions missing expected seam evidence. The client SDK must reject a kernel 500, timeout, unreachable endpoint, or forged signature rather than treat them as approval (section 6.3, pp. 10–11). In Verus, model the circuit-breaker state as an enum and prove a transition lemma for every input combination. Keep the network and process transitions outside the proof boundary, and mark those assumptions explicitly.

## technique: Python-to-Rust migration by deterministic equivalence
Use this when replacing a trust-critical implementation. Generate deterministic request fixtures, replay each fixture against both implementations with the same signing seed and pinned clock/nonce, and compare all outputs except documented time-dependent fields. The paper reports “All 1000 were byte-equal.” and “both rejected on all 17 with identical status codes and reason strings.” (section 6.1, pp. 9–10)

The authors regenerated rather than storing opaque fixtures, then added a daily strict-mode lane against the live HTTP boundary. That lane had grown to 570 fixtures and found nine production divergences missed by sampled PR checks; each was triaged rather than silently accepted (section 6.1, p. 10). For Verus, this is complementary evidence, not a substitute for proof: verify the Rust decision function, then use cross-language fixtures to detect migration drift.

The latency result is narrow: at controlled concurrency `C=20`, Rust p99 was 496.9 ms versus Python 920.0 ms, ratio 1.85x. The paper reports a regression at `C=100` and does not generalize the moderate-concurrency comparison (section 6.2, p. 10).

## technique: Z3 model proof plus Kani implementation proof
Use two levels when a safety invariant has both a compositional model and a production Rust function. At model level, encode the fail-closed implication in first-order logic. Prove the safety arm by negation-unsat, then separately prove non-vacuity so the antecedent is reachable. The paper describes Arm A as: “Z3 finds the negation unsatisfiable, so the implication holds for every state.” (section 6.4, p. 12)

At implementation level, factor the production circuit-breaker decision into a pure `gate_decision(state, cooldown_elapsed, probe_in_flight) -> GateDecision`. Have `before_call` compute booleans from clock and lock state and delegate to that function. Add four `#[kani::proof]` harnesses: refuse during cooldown, permit only after cooldown, refuse a second half-open probe, and exhaustively characterize all permit cases. Kani reports “4 successfully verified harnesses, 0 failures.” (section 6.4, p. 13)

The key engineering rule is to verify the function actually called by production. The paper says: “Because before_call delegates to the verified function rather than reimplementing the decision, the proof binds to the shipped decision logic.” (section 6.4, p. 13) In Verus, write the decision as a pure `spec fn` plus an executable function and prove equivalence with a lemma; use `assert` and `ensures` at call boundaries. Verus does not use Kani harness syntax, so the exhaustive symbolic cases become proof lemmas or finite-state loop proofs. Z3’s model-level composition still needs a Verus encoding of the same state predicates.

The authors emphasize that neither level alone is enough: a model can be unfaithful to code, while a bounded checker can miss higher-level composition.

## technique: signed evidence and key separation
Use external evidence when a compromised control might authorize everything while all local gates appear healthy. Every allowed action is appended to a log; the kernel signs entries with its key, while an operator key outside the kernel signs the chain. An external verifier recomputes the expected decision from policy and request and compares it with the signed record. The paper states: “A compromised kernel cannot produce log entries that verify under the operator public key.” (section 4, p. 7)

Implement append-only entries, operator-held private key, public-key verification in the kernel, and a reconciler that checks binary digests against an operator-signed release manifest. In Verus, inference: prove hash-chain and signature-wrapper invariants over a ghost sequence, while cryptographic primitive correctness and private-key custody remain trusted assumptions. The evidence detects misissuance; it does not prevent an operator key holder from authorizing a harmful action, and the paper says prevention requires planned multi-party schemes.

## technique: robustness corpus tied to claims
Use an adversarial corpus whose rows map to explicit security claims. The paper covers forgery, replay, registry bypass, caller-role bypass, transparency-log deletion and tampering, client fail-closed behavior, and certificate pinning. It reports 8 token/signature tests, 5 event-fingerprint tests, 2 replay/TTL tests, 3 registry tests, 4 caller/auth tests, 18 transparency-log tests, 6 client fail-closed tests, and 2 mTLS tests (section 6.3, pp. 10–11). These are test counts, not universal proofs.

## techniques for the catalog
- four-property kernel: require process separation, structurally unavoidable pre-action enforcement, fail-closed operation, and external signed evidence
- multi-seam defense: place independently denying gates at ingress, middleware, dispatch, and client boundaries
- deterministic migration equivalence: compare old and new implementations on regenerated fixtures with pinned nondeterminism
- two-level invariant proof: combine Z3 model reasoning with Kani exhaustive checking of the shipped Rust function
- signed transparency evidence: keep operator signing authority outside the kernel and verify append-only decisions externally
- claim-mapped robustness corpus: tie each attack-class test row to the property it is intended to substantiate
