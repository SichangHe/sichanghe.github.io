# Cognitive Admission Control: Risk-Conditioned Assurance for Consequential Actions in Agentic Distributed Systems
(authored by agents unless marked 🧑)
Tag: `he2026cognitive`, [paper](https://arxiv.org/abs/2609.16313)

## what the paper proves or measures

He and Yu propose Cognitive Admission Control (CAC), a policy layer that decides whether an agent proposal has enough current, correctly typed evidence to reach an execution gateway. The abstract says, “A policy maps a typed action and its modeled risk to assurance obligations specifying predicates, evidence classes, scope, freshness, and witness-set constraints.” (Abstract, p. 1.) CAC is an admission calculus and TypeScript prototype; it is not a proof that the policies or sensors describe physical safety. The authors explicitly write, “These results establish tested implementation behaviors and local costs, not production failure rates or comparisons of language-model capability.” (Abstract, p. 1.)

The formal model defines a proposal `q`, a controller snapshot `s`, evidence receipts `E`, and context `χ`. An obligation names a predicate, accepted evidence classes, scope, freshness horizon, set constraints, optional structural fault-domain requirement, guard templates, and whether it is required or advisory (Definition 5, §3.5, p. 3). The prototype was exercised in 2,730 controlled trials and 9,000 complete-path timing samples (contributions, §1.1, p. 2). Theorems establish refinement from a successful specified algorithm to admissibility and guarded dispatch under explicit assumptions (§5, pp. 6–7); they do not establish that an evidence claim is true or that the implementation satisfies every premise.

## technique 1: select typed obligations from modeled risk

what it is: classify an operation using a risk vector and resolve every policy obligation triggered by the typed proposal and snapshot. Risk has six policy coordinates: consequence severity, blast radius, irreversibility, observational uncertainty, dependency exposure, and adverse plausibility (Definition 1–2 and Eq. 6, §§3.1–3.3, pp. 2–3). The resolver is `ΩΠ(q,s) = FΠ(ρ(q,s),q,s)` (Eq. 11, p. 4). Required obligations constrain admission; advisory ones only produce diagnostics (§4.1, p. 4). The paper warns that authorization and readiness answer different questions: “The access decision and the operational preconditions answer different questions.” (Introduction, p. 1.)

when to use it: use this split for consequential agent actions such as promoting a replica, where identity and scope are insufficient to show that the target is current, fenced, and inside the approved scope. Operations below the policy's consequence threshold may use ordinary authorization, but classification itself belongs to the trusted control plane (§2.3, p. 2).

how to do it:
1. Normalize the proposal into a schema-valid canonical encoding containing every field that affects interpretation or execution (§3.2, p. 2).
2. Compute the policy-relative risk vector from the proposal and controller snapshot (Eq. 6, §3.3, p. 3).
3. Resolve all obligations from that vector, proposal, and snapshot (Eq. 11, §4.1, p. 4).
4. Mark obligations as required or advisory; an approval receipt cannot override a separate violated required obligation (§4.1, p. 4).

Verus form: Inference: represent the typed proposal and risk coordinates as Rust structs and define a `spec fn obligations(...) -> Set<Obligation>` or a finite sequence of obligations. Put canonical-input and authorization conditions in `requires`; prove the resolver's result with `ensures`. A Verus `proof fn` can establish that increasing a risk coordinate preserves inclusion of obligations, corresponding to Proposition 2 (§5.3, p. 7). The policy table and risk thresholds remain trusted configuration unless separately specified and proved. Verus syntax does not carry over the paper's mathematical `FΠ` notation directly.

evidence and limits: Proposition 2 proves threshold monotonicity only with fixed non-risk inputs and a policy of the form `{ωj : τj ⪯ ρ}` (p. 7). It does not show that a risk model is calibrated or complete. The discussion states, “An omitted dependency, permissive entailment rule, or incomplete envelope proof can preserve syntactic admission correctness while permitting harm.” (§12, p. 12.)

## technique 2: discharge evidence with freshness, type, and polarity checks

what it is: evaluate each required obligation against eligible witness sets supporting the predicate (`Pω`) or its negation (`Nω`). A receipt is eligible only when authentic, in an accepted class, scoped correctly, version-compatible, and within the freshness interval of Eq. 9 (§3.4–3.5, pp. 3–4). Valid witness sets also satisfy source-separation, cardinality, reconciliation, and entailment rules. Discharge is ternary: satisfied when `Pω` and not `Nω`; violated when `Nω` and not `Pω`; unknown on conflict or missing usable evidence (Eq. 12, p. 4). The paper states, “The policy must distinguish a missing observation from evidence that its predicate was false.” (Section 4.2, p. 4.)

when to use it: use this procedure whenever stale, wrong-class, future-dated, contradictory, or unavailable receipts must lead to different outcomes. It prevents repeating an unrelated observation from substituting for the required predicate; the example separates replication lag evidence from fencing evidence (Introduction, p. 1; Appendix B, p. 15).

how to do it:
1. Construct a receipt with id, typed claim, class, source, provenance, scope, observation time, state version, integrity, and dependencies (Definition 4, §3.4, p. 3).
2. Reject duplicate identifiers with different content, unauthenticated origins, incompatible scope or version, and receipts outside `0 ≤ teval − tobs ≤ Δtmax` (Eq. 9, §3.5, p. 3).
3. Enumerate finite valid witness sets for the positive and negative polarity, enforcing the declared set constraints and source exposure rules (§4.2, p. 4).
4. Return satisfied, violated, or unknown; retain a reproducible diagnostic for missing evidence, stale evidence, bad provenance, conflicts, or structural failure (§4.2, p. 4).
5. On unknown, issue typed acquisition requests and evaluate the fresh evidence in a new remediation turn (§4.4, p. 5).

Verus form: Inference: define receipt and obligation structs, a `spec fn locally_eligible`, and a `spec fn witness_valid`; use `requires`/`ensures` on proof functions for freshness and set-separation lemmas. A bounded executable search can produce candidate sets, while a proof function establishes that any accepted set satisfies the specification. Do not treat an LLM or runtime `proof fn` as the checker. Verus can prove the discharge decision for a finite sequence, but truth of a sensor claim and the completeness of its source registry remain assumptions.

evidence and limits: the prototype enumerates both polarities up to twelve unique eligible receipts and returns unknown beyond that bound (§4.2, p. 4; §10.2, p. 12). In CACBench, thirty initially underprepared intents eventually completed after evidence acquisition, while the no-remediation ablation completed none of those trials (§9.2, p. 10). Evidence availability can therefore cause refusal even when the modeled target is safe (§9.1, p. 10). The paper does not claim scalable exhaustive search for large evidence pools.

## technique 3: require structural cuts against correlated witnesses

what it is: model evidence sources' shared root faults and require a minimum structural cut over decisive coalitions. For voter set `Q`, root basis `BE`, exposure map `D(v)`, and decisive coalitions `Γ`, Eq. 10 computes the smallest root set intersecting every member of some decisive coalition (§3.6, p. 3). A cut of at least `k` excludes decisive corruption by fewer than `k` modeled roots only under conservative exposure, closed causal accounting, and a coalition rule matching authorization (§3.6, p. 3).

how to do it:
1. Enumerate the modeled root-fault basis and record every verifier's exposure set (§3.6, p. 3).
2. Declare which voter coalitions are decisive for approval (§3.6, p. 3).
3. Compute the minimum root set intersecting each decisive coalition and reject unknown exposure profiles rather than treating them as independent (§3.6, p. 3).
4. Require the computed cut in the obligation's witness-set constraints; reject a witness set whose cut is too small (§4.2 and Algorithm 1, pp. 4, 8).

Verus form: Inference: model roots, voters, exposure sets, and coalitions as finite ghost sequences or sets; write a `spec fn structural_cut` and prove a `proof fn` that an accepted manifest has the required lower bound. Keep the exposure map and coalition policy in the specification. A Verus proof of the combinatorial lemma does not prove that the map captures real common causes.

evidence and limits: the correlated-witness fixture has three approving sources sharing one root and requires a cut of two; CAC rejects it, whereas `NoEFD` and `LivePolicy` each admit thirty harmful transitions (§9.2, p. 10). The independent-witness fixture has three disjoint roots and completes all thirty trials (§9.2, p. 10). A finite script checks 43,561 three-voter profile/rule combinations and 348,488 fault states, but the appendix says these checks “neither prove the unbounded results nor test the TypeScript implementation.” (Appendix A.5, p. 15.)

## technique 4: bind witnesses and guards to a scoped, expiring certificate

what it is: after all required obligations are satisfied, mint a certificate containing the subject, authority context, action digest, envelope, policy epoch, witness digest, guards, issuance and expiry times, nonce, and signature (§4.5, p. 5). Domain-separated hashes bind the exact proposal and canonical witness manifest (Eq. 15). Expiry is bounded by the earliest witness freshness, policy, authorization, and capability deadline (Eqs. 16–17, p. 5).

how to do it:
1. Build the obligation-to-witness manifest and derive guard set and permitted invocation envelope (§4.3, p. 4).
2. Check exact-action binding or prove a policy-approved envelope covers every allowed variant and its required manifest (§4.3, p. 4).
3. Set expiry conservatively to the earliest supporting receipt and other bounds (§4.5, p. 5).
4. At the gateway, authenticate the presenter, verify signature and scope, check time, nonce freshness, envelope, live guards, policy epoch, authorization, and revocation; unknown guards fail closed (§4.6, p. 5).
5. Atomically change the nonce from unused to consumed, then dispatch only the validated operation (§4.6, p. 5).

Verus form: Inference: define a ghost certificate record and `spec fn certificate_valid`; use `requires` for the signed canonical fields and `ensures` for proposal equality, expiry, guard satisfaction, and single-use state transition. Model the replay store as a state machine with a transition proof that `Unused` becomes `Consumed` once. A Rust signature implementation, clock, filesystem durability, and target-side atomicity remain trusted environmental components.

evidence and limits: Theorem 3 says that, assuming complete resolution, sound witness validation, and successful guard/envelope validation, Algorithm 1's permit result implies admissibility and a witness for every required obligation (§5.2, p. 7). Property 1 gives at-most-once gateway dispatch under a durable linearizable nonce store, but explicitly does not give exactly-once effects or recovery after a crash (§5.2, p. 7). Property 2's envelope result depends on semantic template coverage; the paper warns that “A signature on an approved template authenticates approval, not its proof.” (§5.2, p. 7.)

## technique 5: separate controller verdicts from independently observed effects

what it is: evaluate the controller and target in constructed local state machines while a privileged observer, hidden from participating controllers, records pre/post world state, completed effects, and harmful effects (§7–8, pp. 8–9). This prevents an acknowledgment or controller label from defining success. The paper states, “Completion without modeled harm does not certify authorization: a failover after revocation may complete physically while violating access policy.” (§8.3, p. 9.)

how to do it:
1. Instantiate thirteen failover scenarios, seven controller variants, and thirty parameter seeds per combination, yielding `13 × 7 × 30 = 2,730` trials (§8.1, p. 9).
2. Apply the same matched pre-dispatch drift or revocation hook to each controller (§8.1, p. 9).
3. Keep the privileged world snapshot and scoring functions away from the controller; record target attempts and pre/post state independently (§8.1, p. 9).
4. Report harmful effects and complete effects without modeled harm as separate predicates, rather than treating a response code as ground truth (§8.3, p. 9).

Verus form: Inference: encode the scenario transition system as a Rust model with ghost pre/post states and prove observer lemmas about `Complete` and `UnsafeEffect`; keep the observer outside the generated controller module. Verus can verify the local transition relation but cannot make a simulated target representative of a distributed database.

evidence and limits: Table 2 reports 390 trials per controller. CAC attempts 150 effects, completes 120 without modeled harm, and records zero harmful effects; LivePolicy also completes 120 but records 30 harmful effects; AuthOnly attempts all 390 and records 180 harmful effects (Table 2, p. 10). These are constructed scenarios and descriptive counts, not population estimates. The controller and target run in one process, no language-model API is invoked, and the authors do not claim deployment failure rates (§8.1, p. 9).

## trusted boundary, contradictions, and scope

The trusted enforcement core is the policy resolver, evidence evaluator, certificate mint, gateway, and replay store (§6.1, p. 8). Identity, time, telemetry, topology, policy configuration, source registrations, and target-side preservation are trusted inputs or assumptions. The paper proves conditional refinement properties of the specified algorithm, not the TypeScript implementation as a whole; 133 passing tests support exercised behavior, not conformance to the entire calculus (§6.3, p. 8). The 9,000 timing samples are three processes × 1,000 iterations for each of one, four, and eight obligations; Table 3 reports median and p99 ranges, excluding evidence acquisition, model inference, remote services, and target execution (§10, pp. 11–12). The abstract's 2,730 trials and Table 2's 390-per-controller matrix agree because 13 scenarios × 7 controllers × 30 seeds equals 2,730 and 390 is 13 × 30.

What VL should not redo: the paper already supplies a typed evidence lifecycle, ternary discharge, freshness and version checks, correlated-source structural cuts, certificate-bound dispatch, and an independent-effect evaluation protocol. Inference: a VeruLaw system for agent-written verified Rust should reuse these as admission and experiment patterns instead of treating proof completion or an agent's confidence as readiness evidence. The threat to the product is moderate at the workflow boundary: a generated proof can be valid while its specification, dependency evidence, or dispatch conditions are stale or incomplete. Inference: the strongest reusable defense is a Verus-checked contract plus an independently checked admission manifest; CAC itself does not prove that a policy captures the product's safety invariant.

## techniques for the catalog

- risk-conditioned obligation resolution — map a typed action and policy-relative risk vector to required and advisory assurance obligations
- ternary evidence discharge — accept only fresh, typed, scoped and valid witness sets, returning satisfied, violated or unknown with typed remediation
- structural-cut witness requirements — reject correlated approval evidence unless its modeled root-fault cut meets the policy threshold
- certificate-bound guarded dispatch — bind proposal, witnesses, expiry, guards and nonce to a certificate and recheck them at the gateway
- independent effect observation — separate controller verdicts and acknowledgments from hidden pre/post state and harmful-effect measurements
Checked 2026-10-14 against the paper by a Codex agent: audit record he2026cognitive; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
