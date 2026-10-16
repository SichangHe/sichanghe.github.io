# Vibe Coding in Software Development: A Multivocal Literature Review
(authored by agents unless marked 🧑)
Tag: `siddeeq2026vibe`, [paper](https://doi.org/10.5281/zenodo.21490083)

## scope and evidence

Siddeeq et al. synthesize 47 academic and practitioner sources about natural-language software development. Their formal-verification lesson is a workflow and evidence claim, not a new verifier: generated code must enter an evaluation loop whose checks reach the relevant failure. The review defines the practice as a spectrum from minimal oversight to structured validation, and says: “Validation and testing sit inside this loop rather than as optional additions: generated code is evaluated, repaired, and refined before it is relied upon.”

The denominators differ by research question. RQ2 workflow counts use 43 contributing sources; RQ5.2 safeguards use 33; failure-mode percentages in RQ5.1 use all 47. A source may contribute to several categories, so percentages are prevalence of sources, not of projects or lines of code.

## technique: make generation an evaluation–repair loop

what it is and when to use it

After each generation, run checks, inspect their outputs, feed failures back into a prompt or patch, and repeat before relying on the artifact. Use this for agent-written systems where one-shot plausibility is insufficient and failures can be observed through tests, lint, runtime behavior, logs, or review.

how the review specifies it

1. Express intent, requirements, and constraints in the prompt (RQ1/RQ2 synthesis).
2. Generate or modify the artifact.
3. Apply a validation and evaluation pipeline: automated tests, continuous-integration checks, linting, and runtime inspection (RQ2; Table 18).
4. Return runtime errors or logs to the next prompt in an iterate–prompt–patch loop (RQ2).
5. Repair and re-evaluate before deployment or reliance. The review calls this “an iterative generation–evaluation–refinement loop rather than a one-shot code-generation activity.”

Across 43 RQ2 sources, validation/evaluation pipelines appear in 31 (72%), chat-based iteration in 27 (63%), explicit context provisioning in 17 (40%), and iterate–prompt–patch in 15 (35%) (Table 18). These are source counts; categories overlap. The review also states: “The quality of the result therefore seems to depend on the strength of the evaluation loop around the AI-generated code.” This is a synthesis inference from reported literature, not a controlled causal estimate.

Verus form (inference)

Inference: place a Verus contract on each executable Rust operation, prove loop invariants and postconditions, then run ordinary tests and integration checks for properties outside the model. Use `ensures` on executable functions and `requires` for caller assumptions; use `invariant` inside loops. Treat deployment, external libraries, and human-facing behavior as explicit trusted boundaries. A failed proof is feedback for a patch, but a passing proof only covers the written specification.

## technique: calibrate trust and preserve checkpoints

The review reports a developer shift toward “orchestrating generation and validation,” with trust calibration and adaptive reliance in 23 of 34 RQ3.1 sources (68%). Checkpoints, version-control discipline, and validation are described as safeguards against drift and overtrust. Human-in-the-loop review appears in 16 of 33 safeguard sources (48%). Apply this when generated changes cross a commit or deployment boundary: inspect the diff, run the contract and tests, and retain a rollback point.

Inference: a VL workflow should require proof and test artifacts before accepting a change, record the exact specification and dependencies, and make review a gate for assumptions that Verus cannot model. This is a product design inference; the review reports recommendations rather than an evaluated protocol.

## technique: constrain execution and preserve provenance

Sandboxing and constrained execution appear in 5 of 33 safeguard sources (15%). The review quotes one multi-tier design: “Apple’s Seatbelt confines all operations to a read-only jail” and “Docker-based isolation combined with iptables firewall rules” confines Linux operations. Provenance and traceability appear in 1/33 sources (3%); explicit guidance to avoid vibe coding in safety-critical settings appears in 1/33 (3%). Use these when generated code can access files, network, credentials, or production state.

Inference: Verus proof erasure does not replace runtime isolation. Run untrusted generated binaries in a constrained environment, record source and model provenance, and keep assumptions about OS and foreign code visible in the verification boundary.

## what the review establishes and leaves unproved

Across the full 47-source corpus, hallucinated or incorrect generation is reported by 13/47 (28%); licensing/provenance uncertainty by 3/47 (6%); cumulative context drift by 2/47 (4%); minimal-review commits by 2/47 (4%) (Table 24). Among the 33 safeguard contributors, validation/testing pipelines are recommended by 29/33 (88%), human review by 16/33 (48%), and sandboxing by 5/33 (15%) (Table 25). The authors explicitly caution: “Few studies, however, provide empirical evidence on whether these safeguards reduce risk in real development settings.” Thus these counts show convergence of recommendations, not measured effectiveness.

The review also finds short-term productivity or time-to-prototype gains in 21 of 47 sources (45%), while evidence for maintainability, long-term quality, and safeguard effectiveness is weak. Its evidence streams mix peer-reviewed and grey sources; many safeguard recommendations are Tier 2 practitioner material. It does not test Verus, prove generated Rust properties, or establish that any loop catches a specified class of defect.

Inference: threat to a product that produces agent-written verified Rust is high at the workflow boundary and moderate inside formalized functions. A Verus proof can rule out counterexamples to a precise contract, but context drift, wrong requirements, dependency assumptions, deployment behavior, and access control remain. Existing vibe-coding literature has already catalogued iterative validation, testing, linting, review, sandboxing, and provenance; VL should measure Rust-specific proof and repair outcomes rather than repeat a generic recommendation survey.

## techniques for the catalog

- evaluation–repair loop — run checks after generation, feed concrete failures into a patch or prompt, and repeat before reliance
- trust checkpoints — retain versioned diffs and human review at commit or deployment boundaries while calibrating reliance to evidence
- constrained execution and provenance — sandbox generated code and record source, model, dependency, and artifact lineage
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
