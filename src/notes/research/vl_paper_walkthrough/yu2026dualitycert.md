# DualityCert: Verifier-Gated Language-Model Repair of Broken Duality Claims in Quantum Field Theory
(authored by agents unless marked 🧑)
Tag: `yu2026dualitycert`, [paper](https://arxiv.org/abs/2607.23614)

## object, certificate, and measured claims

DualityCert is a symbolic checker for candidate Seiberg-duality claims in four-dimensional N=1 quiver gauge theories. It represents each theory as JSON (gauge nodes and ranks, arrows with R-charges, and superpotential terms), checks a registry of consistency obligations, and returns a certificate or failure. A language-model agent edits the magnetic theory until the checker accepts it. This is a verifier-gated repair loop, not a theorem prover for physical duality.

The paper is explicit: “A claim that passes receives a consistency certificate, which states that no tested inconsistency was found, not that the duality is proven.” (Abstract, p. 1.) Its four obligation families are gauge and ABJ anomaly cancellation plus ’t Hooft anomaly matching; superpotential gauge invariance and R(W)=2; trial central-charge matching; and a bounded classical chiral-ring proxy (Section 2, pp. 3–4). A claim is CERTIFIED when at least one obligation passes and none in scope fails; UNKNOWN, NOT APPLICABLE, and NOT IMPLEMENTED statuses are retained in the certificate. A failed obligation rules out the claim only in the encoded scope.

The paper closes its abstract with, “The verifier, benchmark, protocol, and all per-attempt records are released.” (Abstract, p. 1.)

The benchmark contains 145 repairable fixtures: 38 broken by deleting a superpotential term, 13 by flipping a coefficient sign, 52 by perturbing R-charges, and 42 by changing a gauge-node rank. They come from six seed families and are retained only when the perturbed pair fails while the unperturbed pair certifies. The generation is deterministic from a fixed random seed, and released manifests hash the configuration and fixture list (Section 3, p. 5; Appendix B.2).

Five policies use the same 145 fixtures. Single-shot (ss) makes one attempt; generic retry (gr) allows five rounds with only “verification failed”; verifier feedback (vf) allows five rounds and reports failed obligation names and categories; masked feedback has the same shape with identities replaced by placeholders; and best-of-eleven draws up to 11 independent single-shot attempts, stopping at the first final certificate (Section 3, p. 5). The stop-first portfolio replays ss, then gr, then vf under the same 11-attempt budget.

The confirmatory campaign uses three replications per policy and model, with DEEPSEEK-CHAT and QWEN-PLUS. The preregistered GEE analysis clusters outcomes by fixture and applies Holm adjustment to the six primary tests. Content-free retry improves final success over a single attempt by +8.3 percentage points on DEEPSEEK-CHAT (p=0.0015) and +7.1 points on QWEN-PLUS (p=0.0016). Under 11 attempts, the portfolio is 10.3 points worse than independent verifier-filtered resampling on DEEPSEEK-CHAT (p=0.0016), but 14.7 points better on QWEN-PLUS (p<10⁻⁴). On QWEN-PLUS, named category feedback beats generic retry by +8.7 points (p=0.0016), and named obligations beat structurally identical masked feedback by +6.4 points (p=0.0065); neither effect is detected on DEEPSEEK-CHAT (Table 1 and Section 4, pp. 7–8). These are standardized marginal risk differences over the 145 fixtures and three replications, not percentages of a single run.

## technique: schema and registry of obligations

What it is. Define a serializable claim schema and a finite, explicit registry of necessary consistency tests. Each test returns a status and details; the certificate records every outcome. The paper says, “The certificate therefore states that no tested obligation failed, not that every conceivable check was performed, and a failed obligation rules out the claim only within the encoded scope.” (Section 2, p. 4.)

When to use it. Use this pattern when a full formal proof is unavailable but a domain has machine-checkable necessary conditions. It is useful for filtering and repairing generated artifacts while stating exactly what remains unchecked.

How to do it.

1. Encode the object under repair in a deterministic schema. Here, each theory has gauge nodes/ranks, arrows and R-charges, and an ordered superpotential (Section 2, p. 3).
2. Register obligations. For anomalies, require gauge and gauge-global cancellation and matching global ’t Hooft tables. For superpotentials, require gauge invariance and R-charge 2. Compare trial central charges and bounded chiral-ring data (Section 2, pp. 3–4).
3. Evaluate each obligation and store CERTIFIED, FAILED, UNKNOWN, NOT APPLICABLE, or NOT IMPLEMENTED plus numerical tables where applicable (Appendix B.1, pp. 13–14).
4. CERTIFY only if at least one obligation passes and none fails; otherwise return FAILED.
5. Expose a projection of failures to the repair agent, while keeping the certificate and final judge authoritative.

For anomaly matching, the implementation computes exact rational Tr R and Tr R³ values for each theory and compares entries; the interaction feedback reveals only the failed obligation name and category, not the numeric residuals (Section 2, pp. 4–5). The checker uses a bounded chiral-ring proxy, not the full ring, and does not perform a-maximization. The SU(2) cubic condition is a chirality-balance convention and the Witten anomaly is not checked (Section 5, p. 8).

Inference: In Verus, this corresponds to a Rust claim schema plus a registry of `spec fn` predicates or proof lemmas, each returning a status record. A certificate can summarize which predicates were established, but Verus proof acceptance must remain the final gate. This is an inference; the paper's checker is Python/symbolic JSON, not Verus.

## technique: verifier-gated iterative repair

What it is. The agent receives a reference theory TA, a broken TB, and prior feedback, then returns a complete revised TB in the same JSON schema. It gets at most K=5 rounds. A verbatim copy of TA is rejected because identity trivially passes (Figure 1 and Section 2, pp. 3–5).

How to do it.

1. Generate a deliberately broken but repairable fixture by perturbing TB and retaining it only when the checker fails while the seed pair certifies (Section 3, p. 5).
2. Present TA, current TB, and a fixed feedback projection to the agent.
3. Require a full-theory JSON edit, not a patch; reject malformed output, abstention, and verbatim copies (Appendix B.2, pp. 14–15).
4. Re-run the verifier after each edit. For vf, return failed obligation names/categories; for masked, return placeholders; for gr, return only failure text.
5. Stop on a final certificate or after five rounds. The final judge is at least as strict as the interaction checker: for 111 of 145 singlet-free fixtures, interaction checks use chiral-ring depth L=3 but final acceptance uses L=5 (Section 2, p. 5).

Inference: For Verus agent repair, return a complete Rust/spec artifact or a controlled patch, run Verus after every attempt, and expose failing verification-condition categories rather than arbitrary raw solver text. Keep a stricter final run (clean build, fresh assumptions) than the interactive run. Do not treat a certificate of selected obligations as semantic correctness of the specification.

Evidence and limits. Generic retry improves over one attempt on both primary models, so repeated verifier gating has value even without informative feedback. Structured feedback is model-dependent: QWEN-PLUS benefits, DEEPSEEK-CHAT does not. Invalid model output is counted as failure; it is not silently filtered. The paper reports vf invalid rates of 35% for DEEPSEEK-CHAT, 32% for QWEN-PLUS, and 45% for the MiniMax extension (Section 5, p. 8). Thus retry budgets and parser robustness are part of the measured system.

## technique: budget-matched policy comparison

What it is. Compare feedback escalation with independent verifier-filtered resampling under the same number of model attempts. The portfolio uses ss, then gr, then vf; best-of-eleven uses 11 independent ss calls and stops at a final certificate. Pairing all policies on the same 145 fixtures controls for fixture difficulty (Section 3, p. 5).

How to do it.

1. Freeze policy definitions, endpoint contrasts, and model calls before data collection.
2. Run ss, gr, vf, masked, and best-of-eleven for every fixture and replication.
3. Define E2=gr−ss, E1=vf−gr, E4=portfolio−best-of-eleven, and E5=vf−masked (Section 3, p. 5).
4. Fit fixture-clustered GEE risk differences with robust covariance and Holm-adjusted primary tests.
5. Report denominators (145 fixtures × three replications), confidence intervals, invalid outcomes, and provider-fault handling.

The two exploitation policies reverse ordering by model. The authors therefore claim non-universality of these tested policies, not a universal best repair algorithm. The paper notes that E4 confounds feedback, dependence between attempts, and spreading the budget across three stages rather than 11 independent draws (Section 5, p. 8).

## techniques for the catalog

- scoped obligation registry — encode a serializable claim and explicit necessary checks, returning per-obligation statuses and a bounded certificate
- verifier-gated repair loop — let an agent edit a full artifact for up to five rounds, rerun the verifier, and accept only a stricter final certificate
- feedback projection — compare generic failure text, named categories, and masked identities while keeping numeric residuals hidden
- budget-matched resampling — compare staged feedback repair with independent verifier-filtered attempts under the same eleven-call budget
- paired clustered evaluation — reuse the same fixtures across policies and report fixture-clustered risk differences with multiplicity correction
