# When Passing Tests Hides Vulnerabilities: An Empirical Study of Silent Failures in Agentic Systems
(authored by agents unless marked 🧑)
Tag: `bai2026passing`, [paper](https://arxiv.org/abs/2609.10548)

## what the paper establishes

Bai et al. study security defects that survive ordinary functional checks in agentic code repair. They define a four-level verification hierarchy: L0 syntactic validity, L1 functional validation, L2 static security analysis, and L3 exploitability assessment. A silent-failure candidate passes L0 and L1 but fails L2 or L3. The paper says: “Thus, a patch may compile without errors (L0) and pass unit tests (L1), while still containing a vulnerability detectable through static security analysis (L2) or exploitability testing (L3).” (section 1, p. 1).

The study runs seven frameworks with GPT-4o-mini (temperature 0.2), three 50-task sampling iterations, and two Python-focused datasets. Of 1,050 target traces, 20 invalid traces were excluded, leaving 1,030 valid traces; 252 candidates were flagged by L2/L3 and manual review confirmed 170 silent failures (sections 2.4–2.5, pp. 4–6). The 170-case denominator yields Omission 82/170 (48.2%), Introduction 52/170 (30.6%), and Inadequacy 36/170 (21.2%) (section 3.1, pp. 7–10). The abstract states that “Current test-passing evaluation and LLM-based reviewer roles were insufficient to expose or intercept these failures in the confirmed cases.”

## technique: multi-level verification beyond functional tests

what it is and when to use it

Apply separate syntactic, functional, static-security, and exploitability checks to every generated patch. Use it for security-sensitive repair because a functional oracle may not observe a security property.

how to do it

1. run L0 and reject patches that do not parse (section 2.4.2, p. 4)
2. run L1 import, structural, and associated functional checks (section 2.4.2, p. 4)
3. run Bandit for L2 and map findings to CWE identifiers; fail L2 on any HIGH-severity finding (section 2.4.2, pp. 4–5)
4. compute L3 exploitability from source patterns, dangerous sinks, the original CWE pattern, and safe-practice discounts (section 2.4.2, p. 5)
5. send L2/L3 candidates to manual review and retain true-positive and partial cases as confirmed silent failures (sections 2.4.3–2.5.2, pp. 5–7)

The paper formalizes the candidate condition as `(L0 pass ∧ L1 pass) ∧ (L2 fail ∨ L3 fail)` (section 2.4.2, p. 5). Its command-injection example adds a length check but retains shell execution; benign tests pass, while static analysis and exploitability scoring detect the reachable sink (section 2.4.2, p. 5).

Verus form

Inference: express an L0/L1/L2/L3 report as a Rust enum or struct and define a `spec fn silent_candidate(r: Report) -> bool` matching the conjunction above. Use `requires` and `ensures` on the classifier and proof functions for arithmetic properties of the score. Verus can prove the classifier's logic and a modeled source-sink rule; it cannot prove Bandit completeness, Python semantics, or that the exploitability heuristic captures every attack without formal models.

evidence and limits

The paper reports 252 automatically flagged candidates and 170 manually confirmed cases, so the confirmed corpus is 170/1,030 valid traces (16.5%), while the candidate screen is 252/1,030 (24.5%). These fractions are computed from the study's stated denominators. Bandit false negatives cannot be measured; the authors call the corpus a conservative estimate of failures detectable by this framework (section 5.2, p. 17).

## technique: exploitability scoring for candidate triage

what it is and when to use it

Use a bounded heuristic to prioritize patches for manual review. The score combines controllability of user-input sources, severity-weighted dangerous sinks, whether the target CWE remains, and discounts for up to five safe-practice categories. A score of 15 or more flags a silent-failure candidate (section 2.4.2, p. 5).

how to do it

1. identify input sources such as web requests, interactive input, standard input, environment, or file reads and assign weights 4, 3, or 2 (section 2.4.2, p. 5)
2. identify dangerous sinks and assign base weights from 6 to 12, with dynamic execution highest and formatted-string operations lowest (section 2.4.2, p. 5)
3. multiply a sink's weight by 1.5 when an input source co-occurs with it in the same patch, and by a further 1.3 when the sink matches the task's target CWE (section 2.4.2, p. 5); for multi-file patches take the maximum score over files (section 2.4.2, p. 5)
4. add 10 when the original vulnerability pattern remains (section 2.4.2, p. 5)
5. subtract `min(2 n_safe, 10)` for detected safe-practice categories, clip to [0,100], and flag scores at least 15 (section 2.4.2, p. 5)
6. manually review every flagged candidate; the threshold is a sensitivity screen, not the final verdict (sections 2.4.2–2.4.3, pp. 5–6)

Verus form

Inference: implement the score over a finite list of typed source and sink records and prove bounds on each contribution and the final clipping. Use `requires` for valid weights and `ensures` for the [0,100] range. Treat the security classification as an untrusted report unless the source and sink semantics are modeled; a Verus proof of arithmetic does not validate the heuristic's security relevance.

evidence and limits

The weights and threshold were calibrated on Iteration 1 candidates and are not a universal risk model. The authors explicitly say manual review makes the threshold a sensitivity parameter rather than a final classification boundary (section 2.4.2, p. 5).

## technique: iterative taxonomy and propagation tracing

what it is and when to use it

Trace the first stage where a deficiency becomes observable, how it propagates through planner, engineer, reviewer, and auxiliary artifacts, and whether a reviewer intercepts it. Use this to target checks upstream and distinguish omission, incomplete defense, and newly introduced vulnerability.

how to do it

1. sample 50 tasks per iteration without replacement from 1,236 eligible tasks (section 2.5.1, p. 6)
2. normalize each framework's output into one trace schema and run L0–L3 screening (section 2.5.1, p. 6)
3. open-code confirmed cases without predefined codes, recording propagation chain, severity, and candidate mechanisms (section 2.5.2, p. 7)
4. axial-code failure type, originator role, injection stage, and code location; then selectively refine categories across iterations (section 2.5.2, p. 7)
5. stop coding when no new codes emerge in two consecutive batches of 50 traces (section 2.5.2, p. 7)
6. have a second author independently recode a random 20% subset (35 cases) and report Cohen's Kappa agreement; the paper reports composite κ = 0.71 (D0 triage 0.63, D1 axial category 0.66) (section 2.5.3, p. 8)

The resulting propagation table has 82 Omission, 36 Inadequacy, and 52 Introduction cases. Multi-agent systems contribute 115 cases: Omission 54 (47.0%), Inadequacy 20 (17.4%), Introduction 41 (35.7%). Single-agent systems contribute 55: Omission 28 (50.9%), Inadequacy 16 (29.1%), Introduction 11 (20.0%) (Table 7, p. 12). The paper also reports 107/170 cases (62.9%) converging across three or more frameworks on the same task and CWE (section 3.2, p. 12).

Verus form

Inference: model a repair pipeline as a state machine whose states carry the patch, artifact set, and security obligations. Prove that each handoff preserves an obligation record and that every generated artifact is included in the checked set. Use proof functions and `requires`/`ensures` for transitions. The observed role attribution and CWE taxonomy are empirical labels, not facts Verus can infer from arbitrary agent traces.

evidence and limits

Reviewers rarely intercepted confirmed deficiencies in the multi-agent cases (section 3.2, p. 12). Introduction was concentrated in multi-agent outputs and configuration artifacts, while Inadequacy had the highest mean L3 risk, 17.7 versus Omission 10.7 and Introduction 8.0 (Table 9, p. 13). The same base model and related prompts prevent attributing convergence to architecture alone (section 3.2, p. 12).

## technique: category-directed security verification

what it is and when to use it

Route analysis according to the expected failure mechanism. API-substitution vulnerabilities are predominantly Omission; logic-intensive vulnerabilities such as XSS and path traversal are Inadequacy; newly introduced information disclosure and open redirect cases are Introduction (section 3.3, pp. 13–14).

how to do it

1. for API-substitution families, check dangerous calls and secure replacements at call sites (section 4.3, p. 16)
2. for logic-intensive input-handling families, apply deeper logic analysis to the input-handling code (section 4.3, p. 16); the paper also suggests evaluating defense completeness against known bypass techniques, such as differential testing against known bypasses (section 4.1, p. 15)
3. enumerate every configuration, scaffold, build, and test artifact produced by multi-agent repair and scan it for introduced weaknesses (section 4.3, pp. 16–17)
4. retain independent security analysis before trusting a patch, even when all functional tests pass (section 4.3, p. 16)

Evidence: Input Handling contains 61/170 cases (35.9%), Configuration 37/170 (21.8%), and API Call 35/170 (20.6%) (Table 8, p. 13). Inadequacy has mean L3 17.7 and maximum 100, the highest category mean (Table 9, p. 13). Critical severity appears in 22/170 cases: Omission 17, Inadequacy 5, Introduction 0 (Table 9, p. 13). These denominators are the confirmed 170-case corpus.

Verus form

Inference: use separate verified predicates for secure API selection, input canonicalization, and artifact inventory. Prove local properties such as `the path stays within the allowed base` with `requires`/`ensures`, and make the inventory itself part of the release record. External database, filesystem, network, and cryptographic library behavior remains trusted unless specified.

The authors conclude: “Our results show that silent failures should be treated as a separate form of security-compliance decoupling rather than as ordinary functional defects alone.” (section 7, p. 20).

## what is proved, trusted, and unresolved

The paper proves no formal theorem; it provides an empirical taxonomy and verification procedure. The main results depend on GPT-4o-mini, Python-only SecurityEval/CVEfixes tasks, Bandit, the L3 heuristic, manual review, and qualitative coding. As a sensitivity check the authors re-examined the taxonomy using only the 131 true positives (39 of the 170 are Partial) and state: “All three axial categories and seven of the ten open codes remain represented in this subset.” (section 5.1, p. 17). The three dropped codes are Deployment Context Risk, Ambiguous Repair Intent, and Vulnerable Test Code; the paper reports that counts fell in all three categories but does not give the per-category counts of the subset. The paper excludes performance, privacy, maintainability, usability, and non-security silent failures (section 5.1, p. 17).

## techniques for the catalog

- four-level verification: separate syntax, functional behavior, static security, and exploitability checks
- exploitability score: rank candidates with source-sink, CWE, and safe-practice signals before manual review
- propagation tracing: follow a deficiency from planning or implementation through every agent handoff and artifact
- iterative taxonomy: refine omission, inadequacy, and introduction codes with independent recoding and agreement checks
- category-directed analysis: route API, input-handling, and generated-artifact checks to the failure mechanism most likely to occur
