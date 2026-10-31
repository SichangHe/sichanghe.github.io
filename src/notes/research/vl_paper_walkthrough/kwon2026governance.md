# A Governance Methodology Layer for AI-Assisted Software Development: Defect Taxonomy, Controlled Ablation, and a Test of Process-Over-Capability
(authored by agents unless marked 🧑)
Tag: `kwon2026governance`, [paper](https://www.semanticscholar.org/paper/5a4e2178ecc441ad71ff5010e56843b265666f60)

## scope and result

The paper studies a review process for AI-generated software. Its central distinction is between syntactic checks and semantic review. The abstract says: “Autonomous coding agents produce output that passes syntactic checks — compilation, type safety, CI — at high velocity. Yet syntactic correctness does not imply semantic correctness: design boundaries, security invariants, and maintainability contracts remain structurally invisible to automated pipelines.” (Abstract, p. 1; page numbers here are pages of the 23-page PDF)

The authors make four contributions: a defect taxonomy, a file-based verdict layer, methodology-as-code with portable and host-specific layers, and an ablation of structured versus unstructured review. The primary experiment uses five artifacts and an eight-item ground truth written by one QA engineer. In the original same-session run, structured review had 2/8 strict hits (25%) and 5/8 lenient hits (62%); unstructured review had 0/8 strict (0%) and 4/8 lenient (50%) (§6.2, p. 9). The authors then rerun the comparison in independent sessions with blind scoring. That re-test gives 6/24 strict and 11/24 lenient for structured review, versus 5/24 strict and 8/24 lenient for unstructured review (§6.7, p. 16). The paper concludes that the original contrast does not replicate: the conditions differ by one strict hit in 24, and it says process design as the dominant factor "remains a hypothesis, not a result of this paper" (Abstract, p. 1).

The paper is a single-author, independent-researcher preprint; the companion papers it leans on (v2 empirical paper, Forge Harness paper) are not in this text, and its supporting experiments (§7) are summarized without data.

## technique: classify defects by semantic failure mode

What it is. The taxonomy has four classes that the authors say are "structurally beyond CI/SAST reach": D1 semantic boundary violations, D2 silent failure modes, D3 missing contract guards, and D4 dead correctness code (§3.1, p. 4). Examples include an `allow_session` permission granted through `kind="allow_always"`, `except Exception: return "deny"` where the caller cannot tell an error from a legitimate denial, an `ageDays >= 0` precondition documented in a type comment but only clamped silently at three independent sites, and a `recall < 0` clamp that is unreachable because recall is computed from `2^(-age/halfLife)` with age >= 0 and halfLife > 0 (§3.1, p. 4).

When to use it. Apply the classes when reviewing generated permission, governance, or API code whose type correctness can hide a wrong security or behavioral contract. The paper derived the classes from five artifacts and reports 49 structured-review findings, of which it lists D1 11, D2 14, D3 12, D4 4 (§3.2, pp. 4–5). The authors state: “Finding (taxonomy validity): All 49 structured-review findings classify into D1–D4 without residual.” (§3.2, p. 5) They immediately add that D1–D4 "was inductively derived from the same five artifacts used to demonstrate coverage", so it is not evidence of exhaustiveness on other domains. Inference: the listed class counts sum to 41, not 49, and the paper does not account for the other 8, so the "without residual" claim cannot be checked from the paper's numbers.

How to do it. The paper gives class definitions and examples, not a step list; the steps below are my reading of the definitions.

1. Inference: write the intended boundary, error behavior, preconditions, and mathematical input constraints for the artifact. (Definitions in §3.1, p. 4)
2. Inspect every permission or contract decision for a syntactically valid but semantically wrong boundary (D1: "A logical invariant that is correct syntactically but violates intended semantics"). (§3.1, p. 4)
3. Inspect every error path for a valid-typed value that hides an exceptional condition (D2). (§3.1, p. 4)
4. Compare preconditions documented in comments or types with what is actually enforced (D3). (§3.1, p. 4)
5. Derive the reachable range from the input constraints and flag guards that cannot execute (D4). (§3.1, p. 4)
6. Record the artifact line, defect class, and consequence. The paper's findings use the form `Art4/L154` with examples such as “bare except Exception swallowing all failures” and “timeout <= 0 accepted without validation.” (§3.2, pp. 4–5)

Verus form. Inference: encode the intended boundary and preconditions in `requires` clauses, and the resulting safety and API behavior in `ensures` clauses. Inference: prove D4 reachability claims with `spec fn` predicates and `proof fn` lemmas rather than relying on a reviewer's arithmetic intuition. Inference: model D2 explicitly as a result type or discriminated enum so a proof can require callers to distinguish an error from a legitimate denial. Inference: this technique complements Verus; a proof can show that an implementation meets its written contract, while the taxonomy still asks whether the contract expresses the intended security boundary.

Evidence and limits. Semgrep 1.164.0 with rulesets p/default, p/python, p/typescript, p/javascript, p/rust and p/security-audit produced zero findings on the four code artifacts; Ruff with every rule enabled flagged the broad Python exception pattern (BLE001) and style issues, but not the semantic finding that callers cannot distinguish swallowed failures (§6.5, pp. 11–12). The authors call D1–D4 "empirically non-overlapping with default SAST coverage" on this set and add that a custom ruleset "could encode some of these patterns by hand" (§6.5, p. 12). The paper also says it did not run the projects' CI itself; the claim is that the files sat in committed, CI-integrated codebases (§3.3, p. 5).

## technique: use a runtime-decoupled file governance verdict layer

What it is. The verdict layer reads generator-written files, applies a review protocol, and emits `PASS`, `PENDING`, or `BLOCKED` with S/A/B findings. Its architecture sends generator output files to the verdict layer, which emits PASS, PENDING, or BLOCKED, and the verdict goes to the CI pipeline (§4.1, p. 5). Because it works on static files it needs no runtime environment, no API coupling to the generator, no language-specific toolchain, and no access to the executing system (§4.1, p. 5).

How to do it.

1. Accept the generated artifact as a file rather than attaching to the generation runtime. (§4.1, p. 5)
2. Apply the review protocol and emit a structured line for each finding: `[S|A|B] L{line} — {description}`. (§4.2, p. 6)
3. Emit `PENDING` when semantic findings remain even if CI passes. (§4.2, p. 6)
4. Feed the verdict to the CI pipeline. (§4.1, p. 5)

The paper's review command takes the form `review <artifact> [--verdict-only]` (the command name itself is in §4.2), with output `VERDICT: PASS | PENDING | BLOCKED` followed by `FINDINGS:` (§4.2, p. 6). Portability was shown on TypeScript, Markdown, Python, and Rust artifacts without their respective toolchains (§4.3, p. 6). The paper calls this “the operational definition of runtime-decoupled.” (§4.3, p. 6)

Verus form. Inference: put a verified Rust wrapper around source text or a parsed intermediate representation, and give the verdict layer postconditions that every emitted finding has a valid source span and every `PASS` or `BLOCKED` result satisfies a declared rule set. Inference: use `Option` for an absent verdict only if the caller handles it; a model-generated `PASS` should not be treated as a proof result. Inference: keep runtime-independent structural checks separate from Verus proofs that require compiling the target program.

Evidence and limits. The paper cites a companion experiment in which a CI-passing OpenCode permission file (`arity.ts`, 163 lines) received `PENDING` with two A-grade findings (§4.2, p. 6; §7, p. 17); the paper itself calls it "an N=1 instance", not part of its own ablation. The paper says: “The PENDING verdict on a CI-passing file is the primary signal”. (§4.2, p. 6) Its threats section says the verdict is "a model judgment, which an adversarial input or the model's own optimism can corrupt", and proposes anchoring each finding to "a literal span in a declared source (static side) or an observed execution result (dynamic side)" (§8, L7, p. 18). Inference: a Verus verdict layer should require machine-checkable evidence for terminal acceptance, because proving the verdict layer's parser does not prove the model's semantic judgment.

## technique: separate portable methodology from host automation

What it is. Methodology-as-code puts the review procedure in a version-controlled `SKILL.md` with sections Protocol, Axes, Output format, and Done when (§5.1, pp. 6–7). The two layers are a methodology layer (protocol, axes, output format, completion criteria) and an automation layer (Claude Code hooks, sub-agent dispatch, CI integration) that is host-specific and optional (§5.2, p. 7).

How to do it.

1. Write the review procedure and axes in a human-readable protocol file. (§5.1, pp. 6–7)
2. Version and diff that file like source code. (§5.1, p. 7)
3. Inject the protocol into any LLM CLI as a plain-text prompt. (§5.2, p. 7)
4. Keep hooks and CI integration optional and host-specific. (§5.2, p. 7)
5. Review protocol changes with the same process used for product code. (§5.3, p. 7)

Verus form. Inference: represent the portable policy as a data structure or specification and prove the host adapter preserves its required fields. Inference: use a Verus parser for the structured verdict and source locations, while leaving natural-language semantic judgments as an explicit trusted input. Inference: versioned protocol evolution needs regression cases whose expected verdicts are checked by executable tests and, where applicable, Verus contracts.

Evidence and limits. The paper's portability claim is operational: one protocol reviewed TypeScript, Markdown, Python, and Rust (§4.3, p. 6). Its self-review claim is an example, not a controlled result: the paper reports that its companion v2 paper found a "steel-quench pass on the protocol itself found phantom references and structural gaps that the authors missed" (§5.3, p. 7). The re-test also reports an exploratory arm in which the structured condition was a two-sentence paraphrase instead of the protocol file; it scored 3/24 strict, below the unstructured condition, but the paper says this "does not establish anything about methodology-as-code" (§6.7, p. 16).

## technique: compare structured and unstructured review without overclaiming

The original E-ablation used the same model (Claude Sonnet 4.6, `claude-sonnet-4-6`), the same five artifacts, comparable prompt length, and independent agents per artifact (§6.1, p. 8). Both conditions, however, ran in one AI session with the structured condition first, which the paper records as limitation L1 (§6.3, p. 10). Condition A used four axes (design correctness, security, API contract, maintainability) and a two-wave “find → challenge/retract” process. Condition B used “Find all design and security defects in this code. Grade S/A/B with line number.” (§6.1, p. 8) The ground truth came from a QA engineer with no prior exposure to the artifacts, a "process/quality focus, non-expert coder" (§6.1, p. 8). The same-session grading was done by one party who knew each finding's condition (§6.7, p. 16).

The first run found 49 versus 47 total findings, but the independent-session replication (ten sessions, five per condition) reversed the count: 45 structured versus 64 unstructured (§6.6, p. 12). Blind re-grading assigned zero S findings across all five artifacts: 0S, 21A, 46B, and 8 false positives for approximately 75 deduplicated items (§6.6, p. 13); Gemini and GPT-5.5 also gave zero S (§6.6, pp. 13–14). The authors therefore withdraw the original severity comparison and the false-positive comparison (§6.6, p. 14). The independent recall re-test is the usable result: “Under independent sessions and blind scoring the two conditions differ by one strict hit across 24 opportunities.” (§6.7, p. 15) It used three passes per condition, one blinded grader from a different model family, and no second grader. A run with the unstructured prompt padded to comparable length also scored 5/24 strict (§6.7, p. 16). The paper also reports an "unexplained level shift": findings per artifact-review were about one third of the earlier replication's under the same model identifier (§6.7, p. 16).

Inference: the paper's conclusion (§11, p. 21) says the structured condition's 25% strict recall "reproduces in all three replicates", but §6.7 reports only aggregates (6/24); per-replicate scores are "available from the author on request" (§6.7, p. 16). I did not take the per-replicate claim as established.

Verus form. Inference: use independent review sessions and source-anchored findings to test a Verus-oriented governance protocol, and report both strict and lenient matches with denominators. Inference: do not treat a model's S/A/B label as a proof level. A Verus `ensures` proof is a machine-checked property of the specified code; a review grade is an uncertain triage signal.

## what is proved, measured, and trusted

Measured: five artifacts, eight ground-truth items, structured and unstructured prompts, finding counts, strict and lenient recall, blind re-grading, SAST comparisons, and independent-session replication. The paper states that "the re-test resolves no difference between the two conditions at this sample size" (§11, p. 21) and that the rival explanation, that any detailed prompt achieves equivalent coverage, "is not excluded by the data". The paper lists same-session confounding (L1), a single human rater for ground truth (L2), N=5 (L3), artifact-selection bias (L4), self-referential evidence (L5), SAST configuration breadth (L6), model-based verdict provenance (L7), and grade-boundary subjectivity (L8) as threats (§8, pp. 17–18).

Inference: what the paper trusts without independent check includes the single-rater ground truth, the model identifier (it admits it could not verify that the model behind an identifier was unchanged over three months), the prompt execution, the reviewer's semantic judgment, and the interpretation of severity grades.

## techniques for the catalog

- semantic defect taxonomy: classify boundary violations, silent failures, missing guards, and unreachable correctness code
- file-based governance verdict layer: review generator-written artifacts and emit structured PASS, PENDING, or BLOCKED verdicts
- methodology-as-code: version a portable review protocol separately from host-specific automation
- independent review ablation: compare review procedures with independent sessions, blind scoring, and explicit denominators
- source-anchored verdicts: bind model findings to literal source spans or observed executions before trusting acceptance
