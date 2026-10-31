# AUTO CEDAR: An Agentic Framework for Verifier-Guided Access Control Policy Synthesis
(authored by agents unless marked 🧑)
Tag: `vatsa2026autocedar`, [paper](https://arxiv.org/abs/2607.03656)

## what is proved or measured

AUTO CEDAR addresses a gap between natural-language access-control requirements and Cedar policy. Its LLM proposes policies, but a reviewed semantic target is fixed before policy search. The target contains a Cedar schema Σ, a boundary plan Π with floors F (access that must remain), ceilings C (access that must not be granted), and liveness slices G (approved workflows that must remain possible). A policy P denotes a set of permitted requests. The paper proves the “synthesis sandwich”: P satisfies Π exactly when `LΠ ⊆ sem(P) ⊆ UΠ` and every liveness slice intersects `sem(P)`, where `LΠ` is the union of floor denotations and `UΠ` the intersection of ceiling denotations (Theorem 1, Section III-B, pp. 3–4).

The conditional guarantee is deliberately narrow. The paper states: “If AUTO CEDAR returns a policy bundle P for an approved plan Π, then the returned artifact has passed Cedar validation, and cedar symcc has certified the inclusion checks in Theorem 1 and the implemented liveness checks in Π.” (Proposition 1, Section III-B, p. 4.) It immediately qualifies that organizational correctness holds only if human approval captured intent.

CedarBench contains 221 executable scenarios. GPT-5.5-low and Haiku 4.5 converged on 221/221, with mean iterations 1.67 and 2.51, mean times 24.59 s and 8.93 s, and estimated costs $0.0405 and $0.0185 (Table II, p. 6). On a 100-scenario ablation, full signals converged on 100/100 with mean final loss 0.00; schema-only converged on 85/100 with mean loss 15.58, and native verifier feedback on 94/100 with loss 0.10 (Table III, p. 6). AUTO CEDAR passed all formal properties on 221/221 scenarios; GPT-5.5 passed every property in 176/221 and Haiku in 3/221 (Table V, p. 7). In three real-world cases, AUTO CEDAR matched 76/76 IBM, 68/68 CyberChair, and 38/38 iTrust semantic requests (Table VI, p. 8).

## technique: reviewed intent atoms and fixed semantic boundary

scope and purpose. Convert prose into small reviewable atoms before allowing policy generation. Each atom records a source span, kind, plain-English rendering, Cedar/schema edit, mechanical status, and intent-review status. An atom enters the approved set only when both mechanical validation passes and a reviewer accepts its meaning (Section III-C, pp. 4–5). Use this when a requirement is incomplete or a policy can be syntactically valid yet semantically overbroad.

paper-defined procedure.

1. Index requirements document D into a source DAG with stable source nodes and bounded context packets (Algorithm 1, lines 1–3; Section III-A, p. 3).
2. Propose schema atoms (entities, actions, attributes, relationships, context) and property atoms one packet at a time, with coverage tracking (Algorithm 1, lines 2–3).
3. If a property needs absent schema support or conflicts with another target, repair the atom or schema and rerun mechanical and intent review before it enters the plan (Algorithm 1, lines 4–6; Section III-C, p. 5).
4. Compile approved atoms into Cedar schema Σ and boundary plan Π. Run schema validation, identity consistency, floor-ceiling checks, derived-constraint checks, and liveness/probe checks; reject the target before any LLM policy call if admission fails (Algorithm 1, lines 7–10; Section III-B, p. 4).
5. Keep Π fixed during candidate search. The model may propose policy syntax, but it cannot change floors, ceilings, liveness slices, or approved obligations (Section III-A, p. 3).

The paper defines plan satisfaction as: “For a permit set S ⊆ RΣ, write S |= Π iff ∀Ci ∈ C. S ⊆ sem(Ci), ∀Fj ∈ F. sem(Fj) ⊆ S, ∀Gk ∈ G. S ∩ Gk ≠ ∅.” (Definition 1, Section III-B, p. 3.)

Verus form. Inference: represent reviewed intent as a fixed ghost/spec model, with floors as required behaviors, ceilings as forbidden behaviors, and liveness as reachable-state obligations. A Verus contract can then quantify over an abstract state or request set. Keep the model outside executable code and outside the agent’s authority to edit. Use `spec fn` for denotations and `ensures`/`invariant` for implementation obligations; use `proof fn` only for proof steps. Inference: this is analogous to pinning a product boundary before an agent writes Rust, but a Verus proof still certifies only the chosen contract.

evidence and limits. Human review is a semantic assumption. The paper warns: “If a requirement is missing from the source material, or if a reviewer approves the wrong atom, the verifier will faithfully check the wrong boundary.” (Section VI, p. 9.) The benchmark’s 221/221 convergence therefore measures target satisfaction, not organizational truth. The source DAG and trace are audit aids; the paper explicitly says the trace “is not a proof of clause provenance.” (Section III-B, p. 4.)

## technique: verifier-guided CEGIS with typed repair signals

scope and purpose. Use counterexample-guided inductive synthesis (CEGIS) when the proposer is stochastic and can reintroduce old errors. AUTO CEDAR’s signal layer converts verifier records into typed repair packets while preserving the target. It distinguishes target-admission failures, semantic direction, local diagnostics, and search history (Table I and Algorithm 2, pp. 5–6).

paper-defined procedure.

1. Initialize history H empty and the repair packet m as a summary of fixed Σ and Π (Algorithm 1, lines 11–12).
2. Ask the LLM for candidate Pt. If it does not parse or type-check, send a local diagnostic packet and keep Π unchanged (Algorithm 1, lines 13–16; Algorithm 2, lines 15–15).
3. For a valid candidate, run Cedar validation and `cedar symcc` against the whole Π, recording check layer, oracle, diagnostic kind, relation, witness, and localization evidence (Algorithm 2, lines 1–3).
4. Map semantic failures to direction: ceiling or disjointness over-permission means TIGHTEN; floor failure means LOOSEN; liveness failure means EXPAND; parse/type/safety errors stay LOCAL (Algorithm 2, lines 5–15; Table I, O2–O3).
5. Include only approved boundary text, witnesses, and localized evidence. The packet may select and compress evidence, but it may not mutate Π, invent a witness, reverse polarity, or add an unapproved obligation (Section III-D, p. 5).
6. Record candidate hashes, recurring failures, oscillation, and action-local diffs in H. History changes the next repair packet, not the oracle (Table I, O4; Section III-D, p. 6).
7. Return `(Σ, Π, Pt, T)` only when all records pass; otherwise iterate to budget K and return a reportable failure (Algorithm 1, lines 17–26).

Verus form. Inference: use Verus verification errors, failed assertions, and executable counterexample traces as typed records. Map a failed postcondition to a repair direction such as strengthen the implementation, weaken an overbroad claimed behavior only with human approval, or add a missing reachable-state case. Preserve the original Rust specification as an immutable target. Maintain failure history so an agent does not alternate between incompatible invariants. Inference: `external_body` should not be counted as repair evidence because it places implementation behavior in the trusted boundary.

evidence and limits. In the 100-scenario ablation, full signals closed 100/100 with zero mean loss versus 85/100 and 15.58 loss for schema-only (Table III, p. 6). The paper notes that a stochastic LLM can reintroduce old failures, so its loop is CEGIS-like rather than a monotone symbolic version-space eliminator (Section VII, p. 9). The model, checker, repair translation, and history interpretation remain trusted components.

## technique: symbolic set checking and request witnesses

scope and purpose. Compare policy denotations symbolically rather than relying on a finite test suite. Cedar’s `symcc` translates policies into SMT formulas and can decide inclusion, equivalence, satisfiability, and emptiness over the supported fragment; failed inclusion returns a concrete request in the set difference (Section II-B, p. 2).

how to do it. Define the typed request universe RΣ from the reviewed schema. Compile each floor and ceiling to a policy denotation, compute the sandwich bounds, and ask `symcc` to check inclusion. Check each liveness slice for nonempty intersection. Then run generated request tests as a sanity check, not a replacement for symbolic obligations (Section III-B and Section VI, pp. 3–4, 8–9).

Verus form. Inference: use a Verus abstract request/state model and prove set inclusion or noninterference with quantified `ensures` and lemmas. Where Z3 produces a model, export it as a concrete Rust test or harness and run it against the implementation. Keep finite tests supplementary because they cannot cover all state combinations.

evidence and limits. AUTO CEDAR’s formal property checks passed 100% for its 221 CedarBench artifacts; direct GPT-5.5 passed 4,397/4,991 individual checks (88.1%) and fully passed 176/221 scenarios (Table V, p. 7). Real-world request matches were 182/182 for AUTO CEDAR (76+68+38), while repaired GPT-5.5 matched 130/144 for IBM and CyberChair (72/76 + 58/68, Table VI, p. 8). Inference: symbolic completeness is bounded by Cedar’s supported fragment and the correctness of the compiler/SMT encoding; request tests add behavioral evidence but do not replace the target proof.

## techniques for the catalog

- reviewed intent atoms and fixed semantic boundary — decompose prose into source-linked, reviewer-approved schema and behavior atoms, then freeze floors, ceilings, and liveness before synthesis
- verifier-guided CEGIS with typed repair signals — classify verifier failures by target admission, semantic direction, local diagnostics, or history and send target-preserving repair packets
- symbolic set checking and request witnesses — use SMT policy-denotation inclusion and concrete set-difference requests, with request tests as supplementary evidence
