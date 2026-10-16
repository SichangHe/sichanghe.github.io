# Model-Driven Discipline for Multi-Agent LLMs: Requirement-to-Verification Generation of Traceable System Models
(authored by agents unless marked 🧑)
Tag: `wei2026radiant`, [paper](https://doi.org/10.48550/arxiv.2607.16708)

## scope and result

RADIANT is a requirement-model-driven methodology that combines model-driven engineering (MDE) with cooperating LLM agents. Its target is a chain from one carefully engineered requirement model to heterogeneous models, executable trace links, and a formally checked behaviour model. The authors describe the contribution as “closing the loop from a requirement model to a formally verifiable behaviour model” (Section 1, p. 3). The paper is an empirical feasibility study, not a Verus or Rust paper.

The pipeline has six phases. The engineer authors Phase 1, a requirement model; phases 2–5 generate a concept model, a domain-specific modelling language (DSML), a conforming system model, and a behaviour model; Phase 6 performs ordinary MDE model management and change-impact analysis. Every generated phase emits a requirement-to-artefact trace. The AUV case uses RoboChart/CSP and FDR to check deadlock freedom and convergence.

## technique: check-gated multi-agent generation

what it is

Each generative phase instantiates a generic layer with a User Proxy, Group Chat Manager, Generator, Checker, optional Refactorer, Trace Generation Agent, a check gate, and a phase-specific Repair Agent. The generator drafts an artefact; the checker returns corrections; the refactorer consolidates where used; the trace agent emits requirement links; and the check gate accepts or rejects the result. A hard failure invokes repair and repeats the check up to a retry cap. The paper summarizes the discipline as “Generate, check, refactor, then trace: every layer follows this same pipeline, repairing its artefact on a failed check before accepting it” (Section 3.3, p. 8).

when to use it

Use this pattern when an agent must produce an artefact that has a machine-readable syntax or executable semantics. It is intended for each of RADIANT’s concept, DSML, model, and behaviour phases, rather than a one-shot prompt for the whole system.

how to do it

1. Convert the manually authored requirement model to JSON with a model-to-text transformation (Section 3.2.1, p. 7).
2. Give the phase input and earlier outputs to the Generator. The Group Chat Manager schedules agents round-robin with a shared dialogue history (Section 3.1, p. 6).
3. Have the Checker validate syntax and phase-specific constraints and send errors to the Generator.
4. Have the Refactorer consolidate the generated result in phases where it is configured.
5. Have the Trace Generation Agent emit requirement-to-artefact links.
6. Run the phase check gate. Its checks include structural, traceability, and FDR checks (Figure 2, p. 6).
7. On a hard failure, pass the failure to the phase Repair Agent, apply its correction, and repeat until pass or retry cap.
8. Accept the artefact and trace only after the gate passes. Table 1 lists JSON→Concept, Emfatic→Ecore, EOL execution→EMF, and RoboChart build/FDR transformations.

Verus form

Inference: Use a generator/checker/repair loop around Verus source, contracts, and proof functions. The checker is `verus`, and a failed verification run supplies diagnostics to a repair agent. Keep the requirement model and generated Rust separate; do not call a proof function at runtime. A release gate should require successful verification plus syntax, trace, and dependency checks. This is an adaptation because the paper uses AutoGen, EMF/Epsilon, RoboChart, and FDR rather than Verus.

evidence from check-gated generation

On the AUV, each model/configuration was repeated ten times. For DeepSeek-V4, DSML syntax validity improved from 0.50 to 1.00 and EOL conformant-model execution from 0/10 to 10/10; for QWEN3-max, syntax improved from 0.00 to 0.80 and execution from 0/10 to 4/10; Claude Sonnet 4.6 remained 1.00 syntax and 0/10 execution. The authors report that “the multi-agent decomposition’s most robust, model-independent contribution is to the syntactic validity of the generated formal artefacts” (Section 4.5, p. 14). Semantic accuracy can decrease: QWEN behaviour F1 fell 1.00 to 0.98 and Sonnet DSML class F1 fell 0.92 to 0.86. Repair therefore does not guarantee semantic correctness.

## technique: requirement modelling and staged artefact generation

what it is

Phase 1 is the only manual step. Requirements contain concepts, instances, stakeholders, categories, and packages. The authors recommend distinguishing Concepts from Instances, capitalising Concepts and quoting Instances, keeping requirements atomic, and optionally modularising them. JSON is the LLM exchange format. Later phases consume earlier artefacts, so the chain is concept → DSML → conforming model → behaviour.

when to use it

Use this staged method when requirements must drive heterogeneous representations and later formal verification depends on earlier structure. It is useful for safety-critical systems where requirements, architecture, code-like models, and behaviour need consistent links.

how to do it

1. Author atomic requirements and explicitly mark concepts and instances.
2. Serialize them to JSON.
3. Extract a Concept/Instance model and links (Phase 2).
4. Generate Emfatic source and parse it into an Ecore DSML (Phase 3); skip this phase if a DSML already exists.
5. Generate an EOL program and execute it to build a conforming EMF model (Phase 4).
6. Generate a RoboChart/CSP behaviour model from requirements, concepts, DSML, model, and target grammar (Phase 5).
7. Translate the behaviour model to CSP and check with FDR.
8. Re-run only affected phases after a requirement change; a minor change may re-run phases 4–5, while a fundamental change re-runs phase 2 or 3 (Section 3.2.6, p. 8).

Verus form

Inference: Treat the requirement model as the source of Rust data-structure and state-machine contracts. Generate an executable Rust skeleton and Verus specifications in stages: types and constants, then functions, then state transitions and invariants. Use `requires`/`ensures`, `invariant` clauses in loops, and proof functions for intermediate facts. This mapping is an inference; the paper’s artefacts are Ecore, EOL, RoboChart, and CSP.

evidence from staged modelling

The AUV behaviour model passed FDR deadlock-freedom and convergence checks. In SRanger, unchanged prompts and layers produced a 9-concept model, a syntactically valid 13-class DSML, a conformant EMF model, and a three-mode/seven-transition behaviour model verified deadlock-free and convergent. No expert reference was authored for SRanger, so no accuracy number is reported. Manual edits are not propagated backward; missing round-trip engineering is a stated limitation (Section 3.2.6, p. 8).

## technique: executable traceability and exact change-impact analysis

what it is

Each phase creates a Bifrost traceability model. A trace links source and target elements using ExternalReferences containing a version and element location, so a tool can locate elements across heterogeneous models. The authors define an executable link as one that carries enough information for model-management operations to locate both elements automatically. A content hash of each requirement is compared with the recorded version; a mismatch flags a changed requirement, and affected downstream elements are read from the links (Section 3.3, p. 9).

when to use it

Use executable links when requirement changes must identify affected specifications, generated code, proofs, or state-machine transitions without manual browsing. Use element-level links instead of document-level references for safety cases and maintenance.

how to do it

1. Give every requirement a stable identity and content version.
2. During generation, emit a Req2X link from each requirement to every produced element.
3. Store target location and version in an ExternalReference.
4. Build the Bifrost model for that phase.
5. On a requirement edit, recompute its content hash and compare it with the stored version.
6. Read affected elements from the trace graph and re-run necessary generation/check phases.
7. Compare computed impact with an expert-intended set during validation.

Verus form

Inference: Assign stable claim IDs to Rust functions, state-machine transitions, and Verus specifications. Store links from requirements to `requires`, `ensures`, `spec fn`, proof functions, and implementation locations in a machine-readable manifest. Hash requirement text and check the manifest in CI; changed requirements trigger proof and review jobs. Verus itself does not provide the Bifrost model, so this is repository tooling around Verus.

evidence from executable traces

For 18 AUV behaviour requirements, ten runs per model produced 180 injected changes per model. The computed impact set had precision, recall, and F1 of 1.00, flagging exactly the affected transition. Architecture-root changes propagated across concept, DSML, and model layers. Link resolvability was 1.00 for concept, DSML, and model for all models, but behaviour resolvability was 1.00/0.97/0.73 for DeepSeek/QWEN/Sonnet; behaviour coverage was only 0.67 for DeepSeek and QWEN because variable, constant, and state requirements were not linked. Exact computation is therefore bounded by link quality.

## technique: counterexample-guided formal repair

what it is

RADIANT’s Phase 5 translates generated RoboChart state machines to CSP and invokes the FDR refinement checker for deadlock freedom and convergence. If a model fails, the returned counterexample is fed to the repair agent, which edits the state machine and repeats verification. In the AUV example, the Last Response Engine has Operator Control, Main Operating, High Caution, and Collision Avoidance modes with safety transitions and velocity/distance conditions.

when to use it

Use counterexample-guided repair when a formal checker can produce a concrete trace or state explaining a failed property. It is appropriate for safety-critical state machines where simulation coverage is insufficient.

how to do it

1. Generate a state machine from requirements and target grammar.
2. Translate it to CSP and invoke FDR.
3. If deadlock or convergence fails, capture the counterexample trace.
4. Provide the trace and model to the repair agent.
5. Apply a patch, regenerate CSP, and rerun FDR.
6. Stop only when the check passes or the retry cap is reached; retain failed traces and patches.

Verus form

Inference: Use a Verus proof failure or counterexample-like diagnostic to direct repair of a contract, invariant, or transition. Encode safety properties as state-machine invariants and prove each transition preserves them. Preserve failed verifier output and the final proof in CI artifacts. Verus diagnostics are not identical to FDR traces, so this mapping requires an additional harness or test model.

evidence from formal repair

The AUV and SRanger behaviour models were reported deadlock-free and convergent after the loop. The paper does not give counts of failed repair attempts, retry-cap exhaustion, or independent review defects. It abstracts concrete guards to booleans for FDR verifiability, so behaviour structural F1 is reported separately from full semantic fidelity (Section 4.3.3, p. 12).

## evaluation evidence and limitations

The AUV evaluation used three LLMs, ten repetitions for each model/configuration, transparent set-based F1 and binary validity/execution rates, and Mann–Whitney U or Fisher tests. Significant effects include DeepSeek DSML syntax 0.50→1.00 (p=0.033), QWEN syntax 0.00→0.80 (p=7.1×10−4), and DeepSeek conformant EOL 0/10→10/10 (p=1.1×10−5). Fifteen stage–model p-values were uncorrected; strong effects survive Bonferroni while marginal p≈0.03–0.04 are indicative only.

Six participants performed manual and automated AUV modelling in a crossover study. Manual totals were 278–510 minutes; automated totals were 20–42 minutes, a 10–15× reduction (mean about 12.5×), with 93–97% automated accuracy versus 77–96% manual. Automated artefacts were common across participants, so times measure review effort and pipeline output rather than independent generation skill. The efficiency sample is six people and measured accuracy centres on one AUV family.

## what is proved, measured, and trusted

The paper measures artefact validity, semantic similarity to hand-authored references, traceability, change-impact sets, development time, and transfer to SRanger. FDR checks deadlock freedom and convergence for generated behaviour models. It does not prove that LLM outputs are generally correct, that traceability is complete for arbitrary domains, or that the method scales beyond its cases. Trusted components include the manually authored requirement model, expert reference artefacts, Clang static analysis, EMF/Epsilon transformations, RoboTool translation, and FDR. Generated behaviour guards are abstracted to booleans for verification, and manual model edits cannot propagate backward.

Inference: In VL, Verus, its solver, Rust compilation and erasure, external specifications, and the requirement model become analogous trusted components. A passing proof establishes the encoded contract, not that the requirement model, generated trace, or dependency assumptions are correct.

## what VL should not redo

RADIANT already supplies a staged requirement-to-model pipeline, check-gated multi-agent roles, executable element-level traceability, content-hash impact analysis, and a counterexample-driven formal repair loop. VL should reuse these patterns rather than invent another one-shot agent architecture or document-level trace convention. Evidence is limited to AUV/SRanger cases, three LLMs, and six participants.

## threat to agent-written verified Rust

Inference: The paper presents a high process threat and a useful design pattern for VL. Agent-written Rust can pass Verus while generated requirements, omitted trace links, or abstraction changes hide semantic errors. Check gates and executable traces expose syntax, proof, and impact failures earlier, but measured gains do not establish security or correctness of a Verus product. The strongest transferable idea is to make every generated contract and proof dependency traceable to an atomic requirement and to repair from machine feedback while retaining failed attempts.

## techniques for the catalog

- check-gated multi-agent generation: generate, check, refactor, trace, and repair each formal artefact before accepting it
- staged requirement-to-verification modelling: derive concepts, a DSML, a conforming model, and behaviour from one atomic requirement model
- executable traceability: emit element-level versioned links that support automated cross-model impact analysis
- counterexample-guided formal repair: feed checker traces to a repair agent and repeat verification until pass or cap
- model-dependent evaluation: measure syntax, execution, semantics, traces, and effort over repeated runs with denominators

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
