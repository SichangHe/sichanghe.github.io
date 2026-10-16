# Choir: An Open Protocol for Distributed Multi-Agent Autoformalization
(authored by agents unless marked 🧑)
Tag: `qi2026choir`, [paper](http://arxiv.org/abs/2609.31903v1)

## scope and result
Choir is a repository protocol for pooling independently run proof agents. The paper's abstract states: “Choir decomposes a project into tasks that can be completed by independent contributors, each running their own agent with their own LLM subscription, while coordinating entirely through the project’s GitHub repository.” Its tested artifact formalized Yufei Zhao's *Probabilistic Methods in Combinatorics* in Lean 4; the paper gives no theorem-count, success-rate denominator, runtime, or cost for that experiment. The reported large-scale figures are claims about other systems, not Choir measurements: “A Meta FAIR team formalized a graduate algebraic combinatorics textbook into roughly 130,000 lines of Lean in one week, using about 30,000 agent runs working in parallel at an estimated cost of $100K with prompt caching and $430K without.”

The protocol has four roles. The human overseer sets the goal, audit policy, and axiom decisions. An orchestrator agent plans, states, publishes, reviews, and merges. Workers claim and prove tasks from their own machines and forks. A GitHub Actions gate performs deterministic intake checks. The paper summarizes the architecture as: “The orchestrator publishes tasks as GitHub issues, and workers on contributors’ own machines claim them and submit pull requests.”

## technique: shallow roadmap and worker-driven decomposition
Use this when a formalization is too large for one agent to plan in detail. The paper's procedure is:

1. The orchestrator writes a roadmap containing the goal, intended route, reasoning log, and a JSON dependency graph (Section 2, “Plan”).
2. It states only a shallow theorem skeleton. A node is publishable once it and all named dependencies are formally stated (Section 2).
3. `choir orch create-task` turns a ready node into an issue. The issue begins with a YAML record, and the theorem statement has a placeholder proof plus difficulty and priority (Section 2, “Publish”).
4. A worker claims by commenting. The earliest comment wins; a silent claim expires after a day (Section 2, “Claim”).
5. The worker proves locally and submits a pull request with `choir worker submit` (Section 2, “Prove and submit”).
6. If the target is too hard, the worker supplies intermediate lemmas with placeholder bodies, proves the target from them, and records a `choir-reduction` block naming parent and children. The orchestrator updates the graph and publishes child tasks (Section 2, “Decompose”).

Inference: In Verus, the roadmap can map to modules and a dependency manifest; child lemmas can become `proof fn`s with `requires` and `ensures`, while executable placeholders remain ordinary Rust bodies. The paper does not define a Verus translation, and GitHub issue leases are process controls rather than Verus proof constructs.

Evidence is architectural rather than a controlled comparison. The paper says the proof tree “can keep growing” after repeated decomposition, but reports no count of decomposition events or worker attempts. Its assumption is that the orchestrator can understand each decision's local subgraph; the limitation section says this has not been tested beyond textbook scale and suggests hierarchical orchestrators if it fails.

## technique: deterministic pull-request gate
Use this when contributors and models are untrusted. The gate runs automatically on pull-request open/update, recomputes checks from source under policies at the merge base, and `choir orch merge` refuses a merge unless required checks are present and green (Section 3). Apply the checks in this order:

1. Rebuild from a fresh GitHub checkout (the “rebuild” check).
2. Reject new axioms (“axiom-honesty”).
3. Reject remaining placeholders (`sorry`/`oops` in Lean, `Admitted`/`admit`/`Abort` in Rocq, unless a declared decomposition allows them for review) (“sorry-delta”).
4. Check that the published theorem statement was not changed (“statement-immutability”). In Lean 4, use the Lean FRO comparator at kernel level; for Isabelle and Rocq the implementation compares source text (Section 3).
5. Only then send the pull request to orchestrator mathematical review; merge requires both gate and review (Section 2, “Review and merge”).

The paper's exact summary is: “A mechanical gate gives every pull request a set of basic checks before it reaches the orchestrator for review.”

Inference: A Verus gate should rebuild with a pinned toolchain, reject unauthorized `external_body`/axiom-like trust declarations according to project policy, reject unresolved proof holes, and compare the specification API against the base commit. Verus's verifier and Rust compiler provide the checking kernel; the repository policy and diff checker remain trusted glue. These Verus checks are an adaptation, not claims made by the paper.

The paper identifies a concrete failure of source-only immutability: “With a contradictory hypothesis in scope, a worker can even prove statements that are false, by the principle of explosion.” Thus Isabelle/Rocq source comparison is weaker than Lean's dependency-aware comparator. The authors say detection currently relies on orchestrator and human review. No false-positive/negative rate or gate latency is reported.

## technique: leases, salvage, and proof golfing
Leases prevent two workers from silently duplicating work: `claim` creates a task branch, `heartbeat` edits the worker's comment, and `release` returns the task. A scheduled sweep returns quiet claims to the pool (Section 2). When a pull request fails, `choir orch salvage` opens a follow-up seeded from partial work; the paper distinguishes unsound failures, which are republished clean, from near misses, which reuse partial work (Figure 2 and “Review and merge”).

A “golf” task pins an already-proved declaration and asks for a shorter proof while leaving the statement exact. The gate most directly checks a replacement proof alone; factoring into auxiliary lemmas is allowed if named in the pull request (Section 2, “Golf”).

Inference: In Verus, salvage corresponds to retaining a failing branch and extracting verified lemmas; golfing corresponds to replacing a proof body while preserving the same `ensures` contract. The paper gives no measurement showing that either policy improves completion or proof size.

## technique: auditable history visualization
`choir orch viz` derives an HTML timeline solely from git log, issues, and pull requests (Section 4). It replays statements, task publication, claims/releases, pull-request outcomes, and accepted decompositions. Nodes are colored by unpublished, published, claimed, partly proved, or proved status; each claim has a worker color. The paper's claim is: “Human overseers can use the page to follow a project’s progress.”

Inference: A Verus implementation could render module, lemma, verifier-run, and review events from immutable CI logs. This helps audit agent-written code but does not establish semantic correctness beyond the gate's checks.

## what is proved, trusted, and left open
The paper proves no new mathematical theorem. It presents an open-source protocol and reports a Lean textbook formalization, without a denominator for completed versus attempted tasks. Lean's kernel and comparator are trusted for the stated checks; GitHub, wrapper scripts, policy files, orchestrator review, and human axiom decisions remain trusted operational components. For Isabelle and Rocq, source-text immutability leaves semantic smuggling possible. The paper reports no security threat model, cost for the Choir run, or comparison against a centralized baseline.

Inference: For VL, the direct product threat is workflow integrity: an agent can submit a compiling but semantically weakened contract if statement comparison or review is inadequate. Choir's immutable-task and deterministic-gate pattern is therefore reusable, but Verus-specific trust audits and contract-diff checks must be designed separately. VL should not redo the generic ideas of GitHub issue task distribution, expiring claims, pull-request gating, salvage branches, or event visualization; it should adapt and measure them for Rust/Verus.

## techniques for the catalog
- shallow roadmap with worker decomposition: publish only a theorem skeleton, then let workers return child lemmas and update the dependency graph
- deterministic verification gate: rebuild source, audit axioms/placeholders, and enforce statement immutability before review and merge
- lease and salvage workflow: use expiring claims and preserve partial failed proofs for follow-up tasks
- proof golfing: optimize a proved declaration while keeping its statement fixed
- auditable history visualization: reconstruct proof-tree growth from repository events
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
