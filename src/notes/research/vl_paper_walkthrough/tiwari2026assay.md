# Assay: Claims That Decay With the Code. Content-Addressed Evidence Graphs for Accountable AI-Assisted Software Delivery
(authored by agents unless marked 🧑)
Tag: `tiwari2026assay`, [paper](https://arxiv.org/abs/2609.36170)

## scope and contribution

Assay is a dependency-free Python tool and protocol for keeping software-verification claims valid as repositories change. Its core object is a claim bound to a Merkle hash of the subject's dependency cone. The abstract says, "Every claim an agent makes (tests pass, no secrets, behavior preserved) is bound to the Merkle hash of the dependency cone of the code it covers, so the claim is stale exactly when that code or anything it depends on changes." (Abstract, PDF p. 1) This unifies repository orientation and accountability: the same dependency graph supplies an agent's context and computes which evidence has gone stale.

The paper defines soundness and minimality propositions for cone hashes, a risk-proportional evidence policy, a signed append-only ledger, a review lifecycle, and a model-free merge gate. It evaluates five public repositories (Express, Flask, Gin, Axum, FastAPI) plus Assay itself with scripted experiments and no model in the loop (Section VI, PDF pp. 6–8). It explicitly says the gate provides a floor of plausible evidence, not proof that the evidence is sufficient.

## technique 1: dependency-cone Merkle binding

What it is. Partition repository files into modules, hash each module's files, condense cyclic dependencies into strongly connected components, then hash each component with the hashes of reachable successor components. A claim over subject modules stores the cone hash for each subject. A later edit invalidates exactly claims whose cones contain the changed module.

When to use it. Use cone binding when cached tests, reviews, or attestations must be invalidated selectively after edits. Binding only the named module misses dependent claims; binding the whole repository invalidates everything.

How to do it (paper Sections III.A–III.C, PDF pp. 2–4).

1. Define modules from repository files (Assay uses directories up to a configurable depth) and hash each module's sorted `(path, file hash)` pairs.
2. Resolve imports to obtain a module dependency relation; compute strongly connected components and a condensation DAG.
3. Compute each component's hash in reverse topological order from its own module hashes and the hashes of reachable successor components. A member of a cycle shares one cone hash.
4. For a claim over subject set `S_c`, record the cone hash for every subject at attestation time.
5. On a new repository state, recompute hashes. Mark a claim stale when any recorded subject cone hash differs.
6. Compute blast radius `BR(Δ) = Δ ∪ {m : m →* d for some d ∈ Δ}`; this is the exact set of modules whose cones changed, up to hash collisions.

The paper states, "Together the propositions say cone binding invalidates a claim if and only if dependency semantics require re-verification." (Section III.C, PDF p. 4) Proposition 1 establishes soundness when a changed module lies in a subject's cone; Proposition 2 establishes minimality when no cone module changes. Proposition 3 identifies blast radius with the staleness frontier.

Verus form. Inference: model a repository snapshot as a ghost map from module names to content hashes and a dependency relation, then state a `spec fn` for reachability and cone membership. A Verus `proof fn` can prove that changing a reachable module changes the recomputed binding under an injective abstract hash assumption. The actual cryptographic hash, filesystem traversal, import parser, and collision resistance remain trusted external components; Verus does not turn Git contents into a mathematical digest automatically.

Evidence and limits. In four-module random edits, cone binding re-verifies 7.9% (FastAPI) to 81.9% (Gin) of claims, while repository binding re-verifies 100%; self-binding misses 23%–68% of required invalidations (Table III, PDF p. 9). These percentages are fractions of claims over 100 random edit sets at `k = 4` edited modules, with each repository's module count shown in Table III. Regex import extraction can under-approximate dynamic imports, reflection, and generated code (Section VI.G, PDF p. 9), weakening the practical soundness proposition.

## technique 2: risk-proportional obligations and bounded review

What it is. Give each module a risk score based on recent commits and fan-in. For a change, calculate radius fraction, radius size, and maximum risk, then assign obligation levels. Level 0 requires tests on changed modules; Level 1 extends tests to the radius; Level 2 adds lint, secrets scanning, and adversarial review; Level 3 adds human sign-off. The policy is explicit, monotone in radius and risk, and configurable.

When to use it. Use this when a uniform review rule would spend too much effort on leaves and too little on high-impact hubs. The radius is computed from the same graph used for freshness.

How to do it (paper Section III.D, PDF p. 4; Section IV, PDF pp. 4–5).

1. Compute module risk from 90-day commit churn and fan-in using the paper's bounded formula.
2. For changed set `Δ`, compute `BR(Δ)`, its fraction of all modules, absolute size, and maximum risk.
3. Select an obligation level using stored policy thresholds and minimum-radius rules.
4. Require the evidence predicates for that level over the changed modules or radius. If no language test runner exists, require build and typecheck instead.
5. Require independent review; levels 2 and 3 add adversarial review and human approval respectively.

Verus form. Inference: represent an obligation policy as a pure function over ghost graph statistics and prove that increasing radius or risk cannot lower the selected level. Use ordinary Rust only for collecting commits, imports, and test output; treat the policy proof as a separate Verus module. The paper's policy thresholds are governance parameters, not program invariants.

Evidence and limits. Table V reports median and p90 single-module radius and counts at levels L0–L3 for six repositories. For example, FastAPI has 195 modules, median radius 0.5%, p90 1.0%, and 149/38/0/8 modules at L0/L1/L2/L3 (Table V, PDF p. 10). Thresholds are policy, so the authors do not claim an optimal risk model.

## technique 3: signed ledger and model-free merge gate

What it is. Store claims and review transitions in an append-only JSON-lines ledger. Each line carries HMAC-SHA256 under a key outside the repository. The gate computes obligations, finds the best claim for every `(predicate,module)` requirement, and accepts only fresh, independently reviewed, signed, plausible evidence.

When to use it. Use this to make acceptance mechanical and resistant to an agent deleting failures, approving its own work, forging a verdict, or reusing stale evidence.

How to do it (paper Sections IV.A–IV.C and V.B, PDF pp. 4–6).

1. Assign doer, reviewer, and human roles. No identity may issue a verdict on its own claim; only reviewers and humans issue verdicts.
2. Append an attestation containing predicate, subject, cone bindings, command, exit code, output hash, duration, and test count. Record non-zero commands as failed claims rather than discarding them.
3. Let a reviewer accept, counter, refute, or escalate. A counter requires an attestor response naming concrete harm; three counters escalate to a human. Status is derived from ledger history, not stored.
4. At gate time, recompute blast radius and obligation, classify each required claim as ok, weak, unreviewed, stale, escalated, failed, refuted, or missing, and verify signatures.
5. Apply plausibility checks: test output must look like a test runner and contain output; test count cannot decrease below overlapping earlier evidence without human approval; stale or altered lines fail.
6. Pass only when every required pair is ok and every signature verifies.

The gate's boundary is explicit: "It does not guarantee the evidence is sufficient." (Section IV.C, PDF p. 6) The authors also state, "The gate passes only with fresh, independently accepted, plausible evidence for every requirement." (Section IV.B, PDF p. 5)

Verus form. Inference: encode claim states and legal transitions as a Verus state machine or ghost transition system, with `requires` on append operations and `ensures` that no terminal claim receives a new verdict. Keep HMAC verification and process isolation outside the proof. Verus can prove the transition logic for an abstract ledger; it cannot prove that a subprocess output is truthful or that a signing key is inaccessible to an agent.

Evidence and limits. In the E4 scripted experiment, all 12 scenarios end as designed: three honest paths pass and nine adversarial paths fail (Table IV, PDF p. 10). The nine failures cover missing coverage, wrong radius, stale evidence, self-approval, forged signatures, non-zero exit, fake commands, deleted failing tests, and reviewer refutation. This is a designer-authored script, not independent red-team evidence. The gate has 2,313 lines of Python, no runtime dependencies, and 30 tests (Section V.B, PDF p. 6).

## technique 4: compact orientation brief and incremental index

What it is. Assay indexes files, imports, exports, history, risk, and language commands, then emits a 600-token brief describing project shape, changed radius, required evidence, and stale claims. A per-file cache keyed by size and modification time enables Merkle-skipped rebuilds.

When to use it. Use the brief before an agent opens source files, and expose the full module index through an MCP `get_module` operation when details are needed.

How to do it (paper Sections V.A–V.B and VI.B–VI.C, PDF pp. 6–8).

1. List tracked files with `git ls-files`, parse imports/exports, group modules, and resolve edges.
2. Mine 90 days of history for churn and fan-in risk; detect test, build, and typecheck commands.
3. Cache file hashes and parse results; on rebuild, reparse only files whose stat changed, then recompute affected graph hashes.
4. Generate the brief with hubs, hot spots, changed radius, obligations, and evidence status, capped at 600 tokens by default.
5. Install a pre-commit hook to refresh the committed index and expose operations through CLI/MCP.

Evidence. Table I reports brief sizes 592–635 tokens on five external repositories, 14×–114× less than an exploration proxy and 216×–1225× less than a full dump; denominators are token counts measured with `tiktoken/cl100k_base` (Table I, PDF p. 8). FastAPI's cold build is 508 ms and one-file rebuild 106 ms; the paper says warm rebuilds are 2×–5× faster than cold builds (Section VI.C, PDF p. 8). These measurements are tool/repository-specific and do not measure agent task success.

## evidence, trust, and VL implications

What is proved: hash-binding soundness/minimality propositions up to collision resistance and exact dependency edges; the implementation's scripted gate behavior. What is measured: orientation token counts, index rebuild time, invalidation fractions, adversarial scenarios, and radius distributions under the stated repositories and scripts. What remains trusted: hash collision resistance, import extraction, filesystem and Git behavior, HMAC key custody, test-runner plausibility, human review, and the sufficiency of evidence. Inference: for VL, cone binding gives a concrete way to make a Verus proof claim decay when code or dependencies change. It does not prove that a Verus proof specification is adequate, and a model-free gate cannot detect a wrong but successfully verified contract.

Already done that VL should not redo. The paper already supplies dependency-cone invalidation, append-only signed evidence, risk levels, review transitions, monotonicity checks, and a compact repository brief. VL should adapt these ideas to Verus proof artifacts and proof-dependency extraction, then measure false freshness and missed invalidations on Rust workspaces. The main product threat is stale or forged evidence around agent-written verified code; the paper's own parser and key-custody limitations show where that threat remains.

## techniques for the catalog

- dependency-cone Merkle binding — hash each subject's transitive dependency cone so freshness and blast radius are the same graph computation
- risk-proportional obligations — map change radius, module risk, and fan-in to explicit evidence and review levels
- signed append-only evidence ledger — record claims, failures, signatures, and review transitions without mutable history
- model-free merge gate — require fresh, independently reviewed, plausible evidence and mechanically reject stale or forged claims
- compact indexed orientation brief — summarize repository structure, changed radius, and evidence state in a bounded token artifact
Checked 2026-10-14 against the paper by a Codex agent: audit record tiwari2026assay; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
