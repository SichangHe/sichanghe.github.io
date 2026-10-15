# Prove2Me: An Open Collaborative Platform for Scaling Math Formalization
(authored by agents unless marked 🧑)
Tag: `chen2026prove2me`, [paper](http://arxiv.org/abs/2608.28433v2)

Inference: Prove2Me is a collaborative Lean platform whose central safety move is to separate immutable theorem statements from independently submitted proofs. Its purpose is to let many agents contribute while keeping a small human-audited core. The paper says, “each theorem is a standalone, immutable object that is stated once and may have multiple proofs, possibly by different agents” (Sec. 3, p. 3).

## technique: exact statement/proof separation

Inference: Submit a theorem card containing a natural-language description, imports, a Lean statement ending in `:= by sorry`, and optionally source and tags. A proof submission declares `solution` with exactly the target type, contains no `sorry` or new axioms, and is compiled in the target’s pinned environment. The paper says the platform “checks that the type of solution matches the type of the target statement, so that the two are interchangeable as Lean terms” (Sec. 3.2, p. 4).

Inference: Apply it as (1) write the intended statement and imports, (2) freeze the statement, (3) submit a proof term with the exact type, (4) compile it against the same Lean/Mathlib environment, (5) reject `sorry` and new axioms, and (6) attach a natural-language explanation. A disproof is submitted as a theorem whose type is the negation of the target. In Verus, use an immutable Rust/Verus specification and separately checked proof functions; this is an inference, because the paper’s kernel is Lean 4. Verus does not use Lean’s Curry–Howard theorem files, so the integration boundary must be a compiled Verus crate and its verifier result.

Inference: Kernel type checking proves that a term inhabits the submitted proposition, but it does not prove that the proposition faithfully represents the source mathematics. The paper warns, “The proof kernel certifies that a proof inhabits a statement, but not that the statement faithfully captures the intended claim” (Sec. 2, p. 2).

## technique: bounded human auditing with read-back

Inference: Put only the headline goal, dependent definitions, and milestone lemmas in a mission’s audited core. Before publication, a human confirms each statement individually. For each candidate, an independent auditor agent receives Lean declarations and definitions but not the source, translates them back to ordinary mathematics, and the human compares that read-back with the source. The paper says, “The human auditor then compares two mathematical statements: the source LATEX statement and the agent’s read-back from Lean” (Sec. 3.3, p. 5).

Inference: Steps are (1) have an agent draft the mission bundle, (2) inspect the natural-language goal and definitions, (3) obtain blind read-back from Lean, (4) compare source and read-back for every binder and hypothesis, (5) correct the mutable proposal, (6) human-confirm each core statement, and (7) publish immutable statements after moderator review. Intermediate lemmas are not audited individually; their only role is to close audited targets. In Verus, read-back should expand `requires`, `ensures`, quantified predicates, and data-structure definitions into plain language before a human accepts the contract. This is an inference.

Inference: This limits audit work, but faithfulness remains a human judgment. The paper cites an external Lean-as-judge audit of about 43% faithful among proved statements (Sec. 2, p. 2); that denominator and protocol belong to the cited work, not to Prove2Me’s own experiments.

## technique: proof-sketch decomposition

Inference: Let a proof import open child theorems whose statements are fixed but whose proofs are unfinished. The parent proof is a sorry-free conditional derivation; each imported child becomes a separate, atomized task. The paper states, “A proof-sketch may import an open theorem or a proved one” (Sec. 4.3, p. 8).

Inference: To use it, (1) choose a large target, (2) identify child lemmas and an assisting definition lemma, (3) submit immutable child statements, (4) write a parent proof-sketch importing them, (5) let agents prove leaves independently, and (6) auto-resolve the parent when all imports are proved. The Sensitivity Conjecture example imports the maximum-degree spectral bound, Cauchy interlacing, the hypercube spectrum, and a matrix-entry lemma (Sec. 4.2, pp. 7–8). The paper gives the compositional guarantee: “Theorem 4.1 is verified if all imported child lemmas are verified” (Property 1, p. 8).

Inference: Verus can use a similar DAG of `proof fn` lemmas with explicit preconditions and postconditions, but Verus modules do not import unfinished declarations as Lean `sorry` terms. A staged workflow can track open obligations externally, while every committed crate remains fully verified. This is an inference.

## technique: milestones and reusable Formalpedia

Inference: A milestone is an authoritative natural-language statement, often copied verbatim from the source, linked to one canonical formal theorem. Agents formalize against the milestone rather than inventing competing restatements. The paper says milestones “keep concurrent agents from producing conflicting formalizations of the same lemma” (Sec. 4.4, p. 9).

Inference: Store every proved theorem as an immutable, self-contained module with its exact environment, searchable natural-language description, and tags. Require agents to search before creating a new statement and reward later imports as citations. In Verus, the equivalent is a registry keyed by crate/module, type signature, specification hash, and trusted assumptions; this is an inference.

## technique: asynchronous discussion and pinned environments

Inference: Let agents publish progress, intermediate findings, and lessons in a shared discussion channel, and let later agents correct earlier formalizations. The paper reports that “one agent proposed a proof-sketch importing a theorem named gotsman_linial, which a second agent later disproved” (Sec. 4.5, p. 10); the corrected statement added a missing boundary condition. This is a concrete counterexample-to-specification feedback loop, not merely social coordination.

Inference: Pin the Lean and Mathlib revisions for each verification environment, isolate environments, and mirror server modules locally so a proof checked before submission has the same dependencies as the server. The paper says “Environments are fully isolated from one another, so that a result always carries the exact context needed to reproduce it” (Sec. 3.1, p. 4). Verus can use a pinned toolchain and lockfile plus reproducible verifier logs; this is an inference.

## evidence, limits, and product threat

Inference: Table 1 reports five case studies, not a controlled experiment. Prove2Me missions include 81K Lean lines with 9 agents over 16 days, 55K lines with 3 agents over 8 days, 151K lines with 6 agents over 13 days, and 17K lines with 4 agents over 7 days; costs are consumer subscriptions ($200/month per contributor) rather than the centralized swarm’s metered $100,000 estimate (Table 1, p. 10). The authors explicitly say model generation and harness effects are confounded, so these rows do not establish causal speedups.

Inference: Trusted facts are Lean kernel compilation in pinned isolated environments and immutable theorem/proof records. Human audit, source-to-formal faithfulness, and moderator decisions remain trusted. Open submissions create denial-of-service, low-quality, and malicious-content risks; the paper names adversarial submissions and reputation as open problems (Sec. 7, pp. 11–12). For agent-written verified Rust, the product threat is high at the specification boundary: a perfect Verus proof can certify a vacuous or misread contract. The reusable defenses are immutable top-level contracts, read-back, milestone ownership, and a searchable proof DAG.

## techniques for the catalog

- Inference: immutable theorem/proof separation — freeze a statement and accept only exact, axiom-free proofs compiled in its pinned environment
- Inference: read-back auditing — translate formal declarations to plain mathematics and compare them with the source before publication
- Inference: proof-sketch decomposition — import open child statements to split a large proof into independently solvable leaves
- Inference: milestone and reusable library — anchor canonical lemma statements and index proved modules for later imports
- Inference: asynchronous correction and reproducibility — share counterexamples in a discussion channel and pin toolchains so repaired proofs reproduce

Checked 2026-10-15 against the paper by a Codex agent for prove2me_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
