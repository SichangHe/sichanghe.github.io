# ChatGPT Extra High consultation transcript
(authored by agents unless marked 🧑)

Captured 7 October 2026 from GPT-5.6 Sol with Extra High reasoning; helper confirmed selected effort and completed assistant response. This is model advice, not primary research evidence. Source diagnostics: `lit_b/chatgpt_consult_fourth.json`. Original response follows verbatim.

My overall opinion: this is a strong research direction, but I would not frame the main problem as “agents prove distributed systems.” Proof completion is increasingly the easy layer. The hard problem is ensuring that the theorem being proved is the theorem the human meant, under assumptions the human would accept, and that the executable system actually satisfies the model without losing liveness.

I could not inspect the OpenReview PDF directly because OpenReview served a browser challenge here, so my TLA-Verus-specific statements below use your primary-PDF findings plus the authors’ public material.

> “(1) What concrete architecture would you choose?”

I would use a staged architecture with immutable boundaries:

human ↔ intent elicitor → frozen intent contract → temporal model → frozen formal contract → temporal proof → Rust refinement proof → evidence bundle

The key design choice is that downstream agents cannot silently repair upstream artifacts.

First, the intent elicitor should produce an intent contract, not TLA+ immediately. It records observable operations, failure model, safety requirements, progress requirements, timing/resource expectations, interference, and proposed assumptions. Every clause gets provenance: human-stated, platform-derived, or agent-proposed.

The main interaction should be traces, not English paraphrases. If the human says “the replicas eventually agree,” show discriminating executions:

- messages are lost forever: must they still converge?
- failures stop after some point: must they converge then?
- an external writer changes the value forever: what counts as convergence?

Human answers turn vague language into explicit semantic choices. This is much harder for an agent to game than asking “does this specification look right?”

Second, I would define a small canonical temporal transition language as the semantic source of truth: state, observable events, Init, actions, failure/environment actions, fairness, safety, and leads-to/eventual properties. I would deliberately support less than full TLA+ initially. Generate TLA+ from it for TLC-style falsification, and encode the same semantics in Verus for deductive proofs. A smaller language makes translation correctness tractable.

Third, run an adversarial specification gate before proving anything. Model checking, mutation, assumption removal, reachability checks, and a skeptic agent should try to falsify the contract. Only then hash/freeze it.

Fourth, prove the abstract temporal theorem in Verus. A prover may invent invariants, ranking functions, and lemmas, but it may not change properties, environment assumptions, fairness, or initialization. Prover/reviewer/gatekeeper separation is sensible, but model independence is not evidence by itself.

Fifth, separately prove executable Rust refinement. Each externally relevant Rust transition must correspond to an abstract action or permitted stuttering step. Maintain an explicit abstraction map from Rust state/I/O events to model state/events.

For liveness there is an extra obligation that safety-only refinement work often misses: concrete scheduler, network, storage, retry, and interference assumptions must imply the fairness/progress assumptions used by the abstract proof. Otherwise you can preserve every state invariant while destroying eventual progress.

Finally, emit an evidence bundle containing the exact theorem, assumptions, proof-check result, refinement theorem, trusted-code boundary, unverified runtime components, assumption monitors where possible, and counterexamples obtained when assumptions are weakened.

This matches the gap the TLA-Verus authors themselves describe publicly: “The model is not the implementation.” They list as a future direction: “Refinement proofs. Prove that the Rust implementation follows the TLA+ model.” [Reasonable](https://reasonable.io/blog/tla-tutorial/) [Reasonable’s TLA+/Verus discussion](https://reasonable.io/blog/tla-tutorial/?utm_source=chatgpt.com)

> “(2) How to distinguish faithful human-intent/specification, abstraction fidelity, implementation refinement, and proof completion?”

Treat them as four separate claims. Never collapse them into “verified.”

1. Human-intent fidelity asks: does the formal contract express what the person wanted? There is no theorem prover for this relationship because the English intent has no formal semantics. Evidence should be human acceptance of discriminating traces, examples, counterexamples, and explicit assumptions. This is partly empirical and partly human judgment.
2. Abstraction fidelity asks: did we model the parts of reality relevant to the claim? For example, did we model retries, crashes, message loss, persistence, concurrency, interference, and scheduler behavior at the right granularity? This is only partly formalizable. Once you define a more concrete formal semantics, you can prove refinement between models; deciding whether that concrete semantics faithfully represents the deployment remains an engineering claim.
3. Implementation refinement asks: does the Rust program behave within the behaviors allowed by the abstract model? This can be machine-checked. Roughly, every concrete observable behavior should map to an allowed abstract behavior. For liveness, additionally prove that concrete progress assumptions establish the abstract fairness assumptions.
4. Proof completion asks: does the checker accept a proof of exactly the frozen theorem? This is the cleanest metric and, by itself, the least interesting. A perfect proof of a weak property over a vacuous model is still a total system failure.

Therefore I would report four scores and one strict end-to-end score. The latter is a conjunction: failure at any earlier layer makes downstream proof success irrelevant.

A useful warning comes from the new natural-language→TLA+ work. Bisharat et al. report “only 8.6% semantic correctness” under their TLC-based metric, but also note that “a missing fairness condition can make a specification compile but fail to capture intended behavior.” TLC acceptance is useful evidence; it is not an oracle for human meaning. [arXiv](https://arxiv.org/html/2606.05792) [Bisharat et al., 2026](https://arxiv.org/html/2606.05792?utm_source=chatgpt.com)

> “(3) What adversarial tasks catch silent assumptions, weakened properties, vacuity and liveness loss?”

I would make these central benchmark tasks, not afterthoughts:

- impossible progress: require termination/election despite permanent message loss or an adversarial crash pattern; success means rejecting the request or explicitly proposing the missing synchrony/fairness assumption
- fairness swap: construct a protocol where an action is enabled infinitely often but not continuously; strong fairness suffices and weak fairness does not
- fault-cessation trap: reconciliation succeeds only after API/network faults eventually stop; penalize silently inserting that assumption
- interference trap: another controller/client continuously overwrites state; catch implicit non-interference
- vacuous trigger: prove request → eventually response when requests are unreachable; require reachability witnesses for important antecedents
- inconsistent assumptions: make the environment assumptions mutually impossible; the prover must detect that rather than derive everything
- weakened-property pair: request linearizability but offer a model satisfying only sequential consistency, or global agreement but prove only per-node uniqueness; hidden traces distinguish them
- deadlock/stuttering mutant: replace useful execution with infinite stuttering; safety should continue to pass while liveness must fail
- abstraction mutants: duplicate/reorder messages, lose durable state on restart, move a linearization point, add integer overflow, drop a retry, or expose an operation before persistence; measure whether refinement catches them
- finite-domain laundering: prove only the N=3 TLC instance or bound queues/retries while presenting the result as parameterized

I would also use metamorphic tests. Remove each assumption and ask for a counterexample. Strengthen or weaken each property and check that the verdict changes appropriately. Perturb initialization and fairness. This tests whether the proof actually depends on the intended semantics.

TLA-Prover is especially relevant here because it already attacks one easy vacuity mode. Its authors explicitly say: “Diamond-tier mutation testing blocks tautology-style reward hacks but does not catch subtler failure modes.” That is almost a specification for the next benchmark generation: semantically weak but non-tautological properties, unreachable triggers, hidden fairness, and wrong environment models. [arXiv](https://arxiv.org/html/2606.06133) [TLA-Prover, 2026](https://arxiv.org/html/2606.06133?utm_source=chatgpt.com)

> “(4) What novel research remains beyond TLA-Verus?”

The strongest novelty is not another proof agent. I see five substantial problems.

First, interactive intent identification: infer a formal contract from vague human requirements by actively generating traces that distinguish competing interpretations. Natural-language→TLA+ generation now exists as a research topic, so merely translating prose into syntax is insufficient.

Second, assumption synthesis and minimization. Given a desired liveness theorem, find explicit sufficient assumptions about failures, fairness, timing, resources, APIs, and interference; then challenge each assumption by finding a counterexample when it is removed. Ideally report a frontier of possible guarantees versus required assumptions. This directly attacks the issue exposed by Anvil/Welder/IronFleet rather than hiding it.

Third, machine-checked cross-language semantics preservation. TLA-Verus appears to advance TLA+→Verus proof generation substantially, but the interesting stronger theorem is that the translation itself preserves the transition and temporal semantics, especially fairness. An LLM reviewer is useful engineering, not such a theorem.

Fourth, end-to-end temporal refinement to executable asynchronous Rust. Safety refinement is insufficient. The research problem is to connect abstract fairness to Tokio/task scheduling, retries, I/O, storage, crash recovery, external interference, and whatever remains trusted.

Fifth, an evaluation benchmark whose hidden oracle is semantic rather than syntactic. It should jointly contain vague requirements, hidden intent-discriminating traces, impossible requirements, minimal-assumption challenges, model mutants, Rust mutants, and frozen theorem/proof tasks. Report every layer separately and an all-layers-pass metric.

One literature-hygiene item is worth checking before claiming the Rust-refinement piece as wholly open. The non-paper stonysystems/tla-rs repository says it can “automatically derive executable Rust implementations and the proof obligations connecting them to their specifications” and self-reports Verus refinement theorems. I have not audited those claims, and this is a repository rather than peer-reviewed evidence, so I would treat it as a lead rather than an established result. [GitHub](https://github.com/stonysystems/tla-rs) [tla-rs repository](https://github.com/stonysystems/tla-rs?utm_source=chatgpt.com)

The research thesis I would pursue is therefore: agents should not merely generate proofs; they should produce an auditable chain from human intent to assumptions to temporal specification to abstract proof to executable refinement, with adversaries attacking every boundary. TLA-Verus makes the middle of that chain much less hypothetical. It does not, from the evidence currently available to me, remove the two hardest problems: deciding what theorem should be proved and establishing that deployed code satisfies it under honest liveness assumptions.
