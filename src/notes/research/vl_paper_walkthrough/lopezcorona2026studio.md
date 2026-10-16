# From Authorial Mathematics to Studio Mathematics: Ecobiontic Forms of Proof after Large Language Models
(authored by agents unless marked 🧑)
Tag: `lopezcorona2026studio`, [paper](https://doi.org/10.48550/arxiv.2608.22194)

## scope and result

López-Corona defines “studio mathematics” as a governed production regime in which people, generative systems, formal verification, repositories, software, and institutions jointly produce a result. The paper is a conceptual and design paper, not an evaluation of a verifier or a Rust implementation. Its formal-verification lesson is that a machine-checked derivation is one layer in a larger evidence and responsibility system. The supplement makes the non-empirical status explicit: “The understanding audit, AI-use scale, contribution-authority trace, and proposed benchmark are prospective.” (Supplement S1, p. 27.)

The paper’s central object is a CIMA proof-production ecobiont: a coupled system of human agents, computational or generative agents, material and symbolic artifacts, and a task environment. The paper separates a tool from a production unit: “A proof assistant is a tool. A large language model is a tool. A repository is a tool and an archive.” (Section 4, p. 8.) A studio is the organized coupling, with a claim-specific governance test. This distinction is useful for VL because Verus can discharge proof obligations while the surrounding Rust specification, dependencies, generated suggestions, and release decision remain human-system responsibilities.

## technique: claim-relative governance rule

what it is

For a public claim q, classify a workflow as governed only when five conditions hold together: provenance, reconstruction, challenge, authority, and responsibility. The paper states the rule in full: “A studio is governed with respect to q only when five conditions hold” (Section 4, p. 8). Provenance means that source material, model output, code, formal dependencies, and human decisions can be traced to q. Reconstruction means an identified competent and authorized person can rebuild decisive reasoning at suitable granularity. Challenge means that person can diagnose a material error, trace its effects, and test a nearby case. Authority means they can stop release or require revision or withdrawal. Responsibility means people endorse only claims within their competence, disclose material dependencies, and permit independent scrutiny where possible.

when to use it

Use this rule before releasing a verified Rust artifact or a paper claim that depends on it. Apply it to each externally endorsed claim, rather than assigning a permanent label to a laboratory, model, or repository. It is especially relevant when an agent generated specifications, proof code, or design decisions.

how to do it

1. Name the exact public claim q (for example, that a Rust operation preserves a map invariant under concurrent calls).
2. Record every source, generated output, code version, formal dependency, and material human decision that led to q (GR1 in Supplement S4, p. 28).
3. Name the member or group H* responsible for q and have them reconstruct decisive transitions (GR2).
4. Give H* a deliberately adversarial error and a nearby transfer case; require diagnosis, propagation analysis, and transfer testing (GR3).
5. Record an effective stop, revision, and withdrawal decision right (GR4).
6. Record each person’s endorsed scope, disclosed dependencies, and the route for independent scrutiny (GR5).
7. Classify the workflow as ungoverned for q if any condition fails. The paper reserves “degenerate studio” for an ungoverned workflow presented as governed human mathematics (Supplement S4, p. 28).

Verus form

Inference: Represent q as a Verus contract (`requires`, `ensures`, and loop or state-machine invariants) on the executable function or transition system. Keep a versioned ledger outside the Verus source containing input artifacts, model outputs, dependency versions, proof results, reviewer reconstruction, challenge traces, and release authority. Use Verus proof functions and lemmas for the mathematical obligations; do not treat a successful proof as evidence that the ledger, requirement, or authority condition is satisfied. For concurrent code, map the claim to a Verus transition-system invariant and retain the transition and dependency records alongside the proof.

what shows it works and what does not

The paper provides a governance protocol and comparative examples, not a measured success rate. It says, “The conditions are conjunctive for the claim being endorsed.” (Section 4, p. 8.) The Danus and Jacobian examples show that technical orchestration does not itself establish delayed reconstruction, challenge performance, or authorization (Section 5.1, pp. 11–12). No benchmark validates the rule; Supplement S1 says no claim is made that governed studios outperform authorial practice.

Inference: For agent-written verified Rust, this rule is a high product threat if release processes record only passing Verus checks: a valid proof can coexist with an unreviewable requirement, generated dependency, or absent withdrawal authority. It is a process threat rather than a claim that Verus is unsound.

## technique: intervention-level AI-use disclosure

what it is

The paper replaces a binary “used AI” declaration with levels L0–L5 describing how generation enters the justificatory path. The levels are: L0 no generative system; L1 clerical or literature support; L2 local calculations, examples, code, or counterexamples; L3 proof search or decomposition; L4 substantial proof or formal derivation generation followed by audit; and L5 end-to-end result generation with limited human reconstruction. The paper says the scale “reports how directly generation enters the justificatory path, not the moral worth of a project.” (Section 5, p. 10.)

when to use it

Use the scale for every VL project or output in which an agent contributes to requirements, proof search, specifications, proof code, tests, or exposition. Use L4 when generated formal material materially enters a proof but a named human audits it. Use L5 when the end-to-end result is generated and human reconstruction is limited.

how to do it

1. Identify the highest intervention level that occurred.
2. At L0, state whether ordinary software, search, or proof assistants were used.
3. At L1, record tool and version when available and clerical tasks.
4. At L2, preserve prompts or procedures for examples, calculations, code, or counterexamples and record independent checks.
5. At L3, preserve candidate lemmas, search paths, discarded suggestions, and the verification route.
6. At L4, preserve generated sections, formal dependencies, an audit record, the responsible human, and stop authority.
7. At L5, preserve full provenance and explicitly warn that the epistemic agency floor has not been met. These minimum disclosures are listed in Supplement S3, p. 28.

Verus form

Inference: Add an AI-use manifest to the repository or release bundle keyed to crate, module, function, and proof artifact. A Verus proof can show that an `ensures` clause follows from the implementation and invariants, while the manifest records whether a model proposed that clause, a lemma, or a state-machine transition. Use ordinary Rust metadata or a checked claims file for the manifest; there is no paper basis for inventing a Verus annotation syntax.

what shows it works and what does not

The scale is a reporting design. Its levels and minimum disclosures are specified, but no inter-rater study or causal benchmark is reported. The supplement calls it prospective and unvalidated (S1, p. 27). The scale therefore enables reproducible disclosure but does not prove understanding or correctness.

Inference: VL should use the level to route review effort: L3 requires proof-search trace inspection, L4 requires reconstruction and dependency review, and L5 requires a release gate that can reject the artifact. This is an operational recommendation derived from the paper’s levels, not a reported result.

## technique: layered proof record

what it is

The paper decomposes a proof into five layers: generative (conjectures, examples, routes, sketches), formal (derivations checked by a proof assistant), expository (human explanation), repository (dependencies, versions, reusable components), and communal (peer evaluation of significance, intelligibility, originality, and trust). It warns that the layers can diverge: “A Lean file may be correct and yet opaque to many mathematicians.” (Section 6, p. 13.) A formal certificate therefore does not replace explanation, repository preservation, or community judgment.

when to use it

Use this record when a verified Rust result will be maintained, taught, reviewed, or reused. It is particularly useful when proof code passes but the requirement, abstraction boundary, or generated reasoning may be difficult for a maintainer to recover.

how to do it

1. Preserve generated candidates, rejected routes, and counterexamples.
2. Check executable behavior and formal obligations in Verus.
3. Write a human explanation of the invariant, abstraction, and reason the claim matters.
4. Pin repository versions, imported specifications, and reusable proof components.
5. Obtain communal review of correctness, significance, intelligibility, and trust. The five-layer list appears in Section 6, p. 13.

Verus form

Inference: The formal layer is a Verus function contract plus proof code erased before execution. The repository layer is the exact Verus and Rust revision, imported specs, solver settings, and dependency lockfile. The expository and communal layers remain Markdown or review records. A Verus proof does not carry these layers automatically.

what shows it works and what does not

The paper offers the layered model and examples from formal mathematics; it reports no completion or defect-rate denominator. It explicitly says a formalized proof can certify that a derivation exists without explaining why the theorem is true (Section 6, p. 13). Therefore the model is a design aid, not evidence that a particular workflow improves correctness.

Inference: The product threat is medium: omitting these layers increases maintenance and specification risk even when current Verus checks pass, but the paper supplies no evidence that every VL project needs equal documentation depth.

## technique: prospective understanding audit

what it is

The audit tests whether an identified person or group retains epistemic agency after model assistance. Its seven dimensions are strategy, dependencies, reconstruction, error diagnosis, transfer, significance, and authorization. Scores are descriptive: 0 not demonstrated, 1 partial or heavily scaffolded, and 2 independently demonstrated. The paper states, “No pass threshold is validated.” (Section 6.1, p. 14.)

when to use it

Use it before release of an L4 or L5 result, after a major proof or specification change, and when a reviewer must decide whether model assistance bypassed human competence.

how to do it

1. Restrict access to the transcript and delay the audit.
2. Ask the participant to state the problem, central strategy, and purpose of main definitions (UA1, Supplement S9, p. 33).
3. Require identification of assumptions, imported results, formal dependencies, and model-generated steps (UA2).
4. Require reconstruction of decisive transitions (UA3).
5. Plant or explain an error and trace its consequences (UA4).
6. Transfer the strategy to a nearby case or explain why transfer fails (UA5).
7. Explain novelty and limitations (UA6), then decide whether to release, revise, or withdraw and accept responsibility (UA7).
8. Record who satisfied each dimension, allowed tools, prompts, assessor, and unresolved disagreements. The recommended administration is delayed, transcript-restricted, and partly adversarial (Supplement S9, p. 33).

Verus form

Inference: For a Verus crate, ask the reviewer to reconstruct the main invariant and contracts, identify trusted external specifications, alter a nearby input or transition, and predict which proof obligation should fail. Use a separate proof branch or test harness for the challenge; do not weaken the production contract. Score the seven human abilities in the audit record, not as Verus propositions.

what shows it works and what does not

The protocol is prospective and unvalidated. The paper says, “The protocol cannot guarantee understanding, but it makes ceremonial oversight harder to confuse with epistemic agency.” (Section 6.1, p. 14.) No participant count, denominator, reliability estimate, or pass threshold is supplied.

Inference: The threat to VL is high for governance claims but low for theorem soundness: a passing audit does not prove code, while its absence makes “human reviewed” a weak product claim.

## technique: conditional antifragility through error conversion

what it is

The paper models a proof-production system S, perturbations P, and utility U. P includes counterexamples, failed formalizations, hallucinated steps, broken dependencies, adversarial review, benchmark failures, automation shocks, rapid generation, deskilling pressure, and lock-in. The system is “antifragile only when perturbations in P systematically improve U.” (Section 8, p. 16.) Four operational conditions follow: retain failures as inspectable traces, select informative failures, convert a detected gap into a corrected proof or related artifact, and expose the conversion enough for public trust (Section 8, pp. 16–17).

when to use it

Use this loop for ongoing VL maintenance, especially when solver failures, counterexamples, dependency breaks, or generated proof mistakes occur.

how to do it

1. Log the failed proof, counterexample, or dependency break with environment and claim identifiers.
2. Select whether it reveals a specification gap, proof gap, unstable automation, or irrelevant noise.
3. Convert it into a corrected contract, lemma, implementation, library component, benchmark, or revised claim.
4. Publish the conversion record with enough context for independent checking.
5. Measure utility dimensions such as reliability, retained understanding, documentation quality, library robustness, and reusable components. The paper gives these dimensions but no numerical benchmark.

Verus form

Inference: Keep failed Verus invocations, counterexample traces, solver versions, and contract revisions in a replayable corpus. Add regression proofs that encode each repaired obligation. A failure is converted only when the revised Verus proof and its changed specification are reviewed; merely suppressing an obligation is not conversion.

what shows it works and what does not

This is a normative design principle. The paper reports no before/after utility denominator and no experiment showing that failures systematically improve U. It cautions that a failed formalization is useful only if it reveals a gap, strengthens a definition or library, or documents a limitation (Section 8, p. 16).

Inference: This threatens VL mainly through maintenance opacity: retaining and converting failures can improve evidence, but the paper does not establish the cost or an optimal retention policy.

## technique: evidence contract and claim ledger

what it is

Supplement S2 assigns every substantive claim a stable ID, layer, claim type, evidence basis, validation route, robustness status, and qualitative uncertainty. The statuses are ROBUST_CORE, SPURIOUS_ENVELOPE, and LEGITIMATE_OPEN_UNCERTAINTY. The paper says, “A definition is not treated as evidence, a diagram is not treated as a result, and a model output is not promoted to an inference merely because it is fluent or formally shaped.” (Supplement S1, p. 27.)

when to use it

Use a ledger for claims about Verus-verified behavior, threat, performance, or governance. It separates what is defined from what is measured and records how a claim could be challenged.

how to do it

1. Allocate a stable claim ID.
2. Mark its layer and type (definitional, literature-supported, conceptual, normative, empirical example, or prospective hypothesis).
3. Record the source, argument, example, or explicit absence of evidence.
4. State a validation route that could check, challenge, or falsify it.
5. Mark robustness status and qualitative uncertainty.
6. Keep post-hoc criteria visible; the supplement defines a POST_HOC marker and says no release claim is so marked because no outcome benchmark was run (Supplement S2, p. 28).

Verus form

Inference: Give each public contract and security claim a stable identifier linked to the Verus function, specification, imported assumptions, proof result, and test evidence. Keep “proved by Verus” separate from “requirement is correct” and “dependency is trusted.” A ledger entry can point to a `spec fn`, `requires`, `ensures`, or state-machine invariant, but it cannot turn an assumption into a theorem.

what shows it works and what does not

The ledger is a traceability mechanism. The paper reports no independent validation of the ontology or ledger and says its FCA and robustness outputs are representations, not proof that the ontology is true (Supplement S1, p. 27). Its evidence is therefore methodological rather than numerical.

Inference: This is a medium product threat: without claim separation, VL users may mistake solver success for end-to-end product correctness; the ledger adds review work but exposes that distinction.

## what is proved, measured, and trusted

The paper proves no theorem about LLMs, proof assistants, or Rust. It defines an ontology, governance conditions, disclosure levels, audit dimensions, and a ledger schema. It reports no participant benchmark, inter-rater reliability, causal comparison, or utility denominator for the proposed protocols. The paper’s own limitations are explicit: “They have not been validated psychometrically or causally.” (Supplement S1, p. 27.)

Inference: In a Verus deployment, the trusted base still includes the Verus verifier and solver behavior, proof-code erasure, Rust compiler, external-library specifications, hardware, and operating environment, as described in the Verus reference used by VL. The paper’s governance layer adds trust obligations around provenance, reconstruction, challenge, authority, and responsibility; it does not remove those technical assumptions.

## what VL should not redo

The paper already provides a five-condition claim-relative governance rule, L0–L5 intervention scale, seven-dimension understanding audit, five-layer proof record, error-conversion conditions, and evidence-ledger fields. VL should reuse these concepts rather than inventing another binary AI-use label or another unscored “human in the loop” assertion. The proposed instruments remain unvalidated, so VL should not present them as established measures.

## threat to agent-written verified Rust

Inference: The paper presents a substantial governance threat and a conditional engineering opportunity. Agent-generated Rust can satisfy Verus contracts while its requirement, generated proof route, imported specifications, and release authority remain opaque. The five-condition rule and layered record make those omissions visible. The paper gives no evidence that adopting its process lowers defects, shortens proof time, or improves product security, so any product benefit remains an untested hypothesis.

## techniques for the catalog

- claim-relative governance: trace provenance, reconstruct reasoning, challenge errors, retain stop authority, and assign accountable responsibility for each public claim
- intervention-level disclosure: classify model involvement from L0 to L5 and preserve the level-specific artifacts
- layered proof record: retain generative, formal, expository, repository, and communal evidence as distinct layers
- prospective understanding audit: test strategy, dependencies, reconstruction, diagnosis, transfer, significance, and authorization after assistance
- conditional antifragility: retain, select, convert, and expose failures so perturbations improve defined utility
- evidence contract and claim ledger: give each claim an ID, type, evidence basis, validation route, status, and uncertainty
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
