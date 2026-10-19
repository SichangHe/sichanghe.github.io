# Prove2Me: An Open Collaborative Platform for Scaling Math Formalization
(authored by agents unless marked 🧑)
Tag: `chen2026prove2me`, [paper](http://arxiv.org/abs/2608.28433v2)

Inference: Prove2Me is a collaborative Lean platform whose central design decision is to separate immutable theorem statements from independently submitted proofs. Its purpose is to let many agents contribute while keeping a small human-audited core. The paper says, “each theorem is a standalone, immutable object that is stated once and may have multiple proofs, possibly by different agents” (Sec. 3, p. 3).

## technique: exact statement/proof separation

Inference: Submit a theorem card containing a natural-language description, imports, a Lean statement ending in `:= by sorry`, and optionally source and tags. A proof submission declares `solution` with exactly the target type, contains no `sorry` or new axioms, and is compiled in the target’s pinned environment. The paper says the platform “checks that the type of solution matches the type of the target statement, so that the two are interchangeable as Lean terms” (Sec. 3.2, p. 4).

Inference: Apply it as (1) write the intended statement and imports, (2) freeze the statement, (3) submit a proof term with the exact type, (4) compile it against the same Lean/Mathlib environment, (5) reject `sorry` and new axioms, and (6) attach a natural-language explanation. A disproof is submitted as a theorem whose type is the negation of the target.

Inference: Kernel type checking proves that a term inhabits the submitted proposition, but it does not prove that the proposition faithfully represents the source mathematics. The paper warns, “The proof kernel certifies that a proof inhabits a statement, but not that the statement faithfully captures the intended claim” (Sec. 2, p. 3).

## technique: bounded human auditing with read-back

Inference: Put only the headline goal, dependent definitions, and milestone lemmas in a mission’s audited core. Before publication, a human confirms each statement individually. For each candidate, an independent auditor agent receives Lean declarations and definitions but not the source, translates them back to ordinary mathematics, and the human compares that read-back with the source. The paper says, “The human auditor then compares two mathematical statements: the source LATEX statement and the agent’s read-back from Lean” (Sec. 3.3, p. 5).

Inference: Steps are (1) have an agent draft the mission bundle, (2) inspect the natural-language goal and definitions, (3) obtain blind read-back from Lean, (4) compare source and read-back for every binder and hypothesis, (5) correct the mutable proposal, (6) human-confirm each core statement, and (7) compile and publish the confirmed drafts as immutable theorems, then obtain moderator review before the mission goes live. Intermediate lemmas are not audited individually; their only role is to close audited targets.

Inference: This limits audit work, but faithfulness remains a human judgment. The paper cites an external Lean-as-judge audit: “a recent Lean-as-judge audit finds only about 43% of proved statements faithful” (Sec. 2, p. 3, citing Bourigault et al., 2026). This is not a Prove2Me experiment; the cited audit itself was not checked.

## technique: proof-sketch decomposition

Inference: Let a proof import open child theorems whose statements are fixed but whose proofs are unfinished. The parent proof is a sorry-free conditional derivation; each imported child becomes a separate, atomized task. The paper states, “A proof-sketch may import an open theorem or a proved one” (Sec. 4.3, p. 8).

Inference: To use it, (1) choose a large target, (2) identify child lemmas and any supporting definitions, (3) submit immutable child statements, (4) write a parent proof-sketch importing them, (5) let agents prove leaves independently, and (6) auto-resolve the parent when all imports are proved. The Sensitivity Conjecture example imports the maximum-degree spectral bound, Cauchy interlacing, the hypercube spectrum, and a matrix-entry lemma (Sec. 4.2, pp. 7–8). The paper gives the compositional guarantee: “Theorem 4.1 is verified if all imported child lemmas are verified” (Property 1, p. 8).

## technique: milestones and reusable Formalpedia

Inference: A milestone is an authoritative natural-language statement, often copied verbatim from the source, linked to one canonical formal theorem. Agents formalize against the milestone rather than inventing competing restatements. The paper says milestones “keep concurrent agents from producing conflicting formalizations of the same lemma” (Sec. 4.4, p. 10).

Inference: Store every proved theorem as an immutable, self-contained module with its exact environment, searchable natural-language description, and tags. Require agents to search before creating a new statement and reward later imports as citations. The paper says, “Agents are also instructed to search before they submit: reuse an existing theorem where one exists, and introduce a new statement only when none does” (Sec. 4.3, p. 9).

## technique: asynchronous discussion and pinned environments

Inference: Let agents publish progress, intermediate findings, and lessons in a shared discussion channel, and let later agents correct earlier formalizations. The paper reports that “one agent proposed a proof-sketch importing a theorem named gotsman_linial, which a second agent later disproved” (Sec. 4.5, p. 10); the corrected statement added a missing boundary condition. This is a concrete counterexample-to-specification feedback loop, not merely social coordination.

Inference: Pin the Lean and Mathlib revisions for each verification environment, isolate environments, and mirror server modules locally so a proof checked before submission has the same dependencies as the server. The paper says “Environments are fully isolated from one another, so that a result always carries the exact context needed to reproduce it” (Sec. 3.1, p. 4).

## evidence, limits, and product threat

Table 1 (p. 10) reports four completed Prove2Me missions and a centralized swarm for context. Exact Matrix Completion has 81K Lean lines, 9 agents, 16 days, and $600; Sipser–Gács–Lautemann has 55K lines, 3 agents, 8 days, and $400; Bandit Algorithms has 151K lines, 6 agents, 13 days, and $400; Introduction to Linear Optimization has 17K lines, 4 agents, 7 days, and $200. Agents include subagents, and lines include definitions, statements, and accepted proofs. Prove2Me costs use consumer subscriptions at roughly $200/month per human contributor; the centralized swarm’s $100,000 is an estimate of metered API inference. The authors state, “Table 1 reports case studies, not a controlled experiment” (Sec. 5, p. 10). They also state, “Two explanations are confounded in every row: a stronger model generation, and a harness built for multi-agent proving (Section 4)” (Sec. 5, p. 11). Inference: these rows do not establish causal speedups or cost savings from the harness.

The paper leaves adversarial submissions and community trust unresolved: “Furthermore, open submission inevitably invites low-quality or malicious content, so beyond mission auditing we ask how the platform can reject adversarial submissions and build community trust, for instance through a reputation system” (Sec. 7, p. 12). Inference: kernel checking and immutability preserve the formal claim, while confidence that it matches the intended mathematics still depends on the audited statements, their definitions, and the human’s read-back comparison. A similar specification risk would matter when adapting these ideas to agent-written verified Rust; the paper does not evaluate Rust or Verus.

## techniques for the catalog

- Inference: immutable theorem/proof separation — freeze a statement and accept only proofs of the exact target type with no new axioms compiled in its pinned environment
- Inference: read-back auditing — translate formal declarations to plain mathematics and compare them with the source before publication
- Inference: proof-sketch decomposition — import open child statements to split a large proof into independently solvable leaves
- Inference: milestone and reusable library — anchor canonical lemma statements and index proved modules for later imports
- Inference: asynchronous correction and reproducibility — share counterexamples in a discussion channel and pin toolchains so repaired proofs reproduce

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "An agent can attack any one of them without ever downloading or compiling Theorem 4.1: it suffices to submit a local proof of that lemma, after which the parent theorem auto-resolves."): checked the full paper, quotations, numbers, section and page references, and technique steps; corrected audit page references, milestone page reference, publication order, case-study scope and cost details, and the no-new-axioms wording; removed unsupported Verus implementation details and denial-of-service claims; did not check the platform implementation, reproduce missions, or verify cited external studies.
