# No Accidental Software: Agent-First Canonical Code for Human-Code Entropy Reduction and 30×–500× Lower Frontier-Model Requirements
(authored by agents unless marked 🧑)
Tag: `taylor2026canonical`, [paper](https://www.semanticscholar.org/paper/8fb472e9ee20f09bfaaea9fe89cf3569851d4263)

## claim status and trust boundary
This paper is a research program for converting ordinary repositories into a governed, proof-carrying substrate. It explicitly warns that “The claim is deliberately ambitious, but every range has a denominator.” (Abstract, p.1) The 30×–500× ranges are hypotheses, while the only measured result is a QLoRA run on 64,088 translated trajectories. The proposed foundry trusts source provenance, behavior oracles, tests, traces, human acceptance, generators, proof tools, and cost accounting. Inference: for VL, Verus proofs can supply a P5 evidence lane for selected invariants, but they do not establish that a canonicalization preserved undocumented behavior or that the specification captures product intent.

## technique: governed canonical foundry
The foundry classifies every artifact by language, role, behavior, license, and provenance; assigns a disposition; and emits canonical training objects containing the original, transformation trace, evidence, canonical artifact, and validation results. The paper's dispositions include transform-permitted, secondary-profile, governed-primitive, spec-only, fixture-only, negative-only, metadata-only, quarantine, and license-excluded (Table XI, §VIII). Apply it by: (1) inventorying the corpus; (2) attaching provenance/license metadata; (3) extracting behavior fixtures; (4) assigning a profile and disposition; (5) porting only when evidence permits; (6) retaining rejected paths and receipts; (7) validating at an explicit preservation tier.

Inference: a Verus foundry can preserve Rust source, dependency lockfiles, Verus contracts, proof logs, and assumptions as a canonical object. A `proof fn` is proof-only and erased; executable behavior must remain in ordinary Rust. The paper's evidence discipline is useful, but a disposition is governance metadata, not a proof.

## technique: behavior quotient and minimum functional description
The paper defines an oracle `O` over tests, traces, API contracts, migration replay, security policy, runtime invariants, and accepted incompatibilities, then identifies implementations equivalent under that oracle (§III, p.4). A canonical map selects a representative specification, evidence bundle, renderer, and disposition ledger. Its Minimum Functional Description Length objective minimizes canonical specification plus evidence and renderer subject to the oracle meeting a preservation threshold (§V, p.5).

Apply it by declaring the oracle first; grouping behavior-equivalent implementations; selecting a governed representative; recording non-preserved behavior as an explicit disposition; and generating projections from the representative. Inference: a VL profile can quotient Rust implementations only under named Verus contracts, tests, migration checks, and security properties. It cannot collapse code based on syntactic similarity or a partial contract.

## technique: behavior IR and typed change algebra
The behavior intermediate representation stores entities, state machines, authorization edges, external contracts, effects, idempotency, migrations, observability, privacy zones, rollout constraints, performance envelopes, and proof obligations. Routine changes become typed objects `Δ=(op, params, pre, post, proofs, rollback, provenance)` instead of raw diffs (§XIII, p.13). Examples include `AddField`, `AddPermissionEdge`, `AddIdempotencyKey`, and `UpgradeDependency`; each expands into schema, migration, tests, security, proof, and rollback obligations (Tables XIX–XX).

Inference: a Verus change object should name affected functions and data, state pre/postconditions, include `ensures` and loop-invariant obligations, pin the Verus toolchain and dependencies, and attach proof receipts and rollback information. The paper does not provide a Rust syntax or prove that typed operations cover all product changes.

## technique: proof lanes and proof-carrying changes
A proof lane is a fixed build/test/migrate/security command, environment, log schema, and acceptance rule. A proof-carrying change object binds intent, affected cells, typed diff, schema and migration deltas, tests, security delta, proof obligations, lane receipts, rollback plan, and provenance (Definitions, §XIV). The paper states, “The unit of work is not a patch, but a patch plus typed intent, generated obligations, proof receipts, rollback, and provenance.” (§XIII, p.13)

Apply it by compiling the typed operation into obligations; running exact lanes; recording receipts; requiring review of the intent and preservation evidence; and rejecting changes whose lane fails. Inference: a Verus lane should run `verus` with a pinned toolchain, compile/run tests, and retain diagnostics. Do not write unsupported Verus constructs such as `modifies` or `ensures` on `spec fn`; only use constructs supported by the local Verus studies.

## technique: graded preservation dossier
The paper's P0–P5 tiers range from rejected/metadata-only and syntactic evidence through interface/test, trace/contract, property/fuzz/differential, and proof-backed evidence (Table XIII, §IX). Tests are evidence, not universal equivalence. Apply progressively: run original tests; differential traces; migration replay; security negatives; UI/API replay; human acceptance; and provenance checks. Promote a port only when the declared tier's evidence passes. Inference: Verus contracts can support P5 for specified invariants, while external libraries, hardware, and undocumented compatibility ghosts remain lower-tier assumptions.

## evidence, economics, and falsification
The only reported training experiment fine-tuned Qwen2.5-Coder-14B with QLoRA on 64,088 trajectories, 57,688 train and 6,400 validation, for 7,106 steps on one RTX 3090 over about three days (§XI, p.11). Loss fell from 2.707 to 0.419 (train) and 2.261 to 0.646 (validation); no visible divergence was reported. This shows learnability and suppressed forbidden-language markers, not behavior preservation or lower verified-change cost. Proposed decisive trials compare the same broad model on raw versus canonical repositories with equal issues, hidden tests, reviewer rubrics, and ledgers for files opened, context/reasoning/tool tokens, invalid edits, failed proof lanes, review, wall time, and accepted patches (§XVIII, p.18). The paper's primary endpoint is “amortized cost per verified correct change.” (§XVIII, p.18)

The ranges use separate denominators: training tokens to a fixed accepted-change target, reasoning/tool/retry tokens per verified change, dense-active cost/token, action-space reduction, and all-in cost per verified change (Tables I and XIX). They must not be multiplied. The paper proposes a 3× lower end-to-end cost after foundry and verification amortization as a falsification threshold, but gives no field result.

## what VL should take and threat
Inference: the threat to agent-written verified Rust is high if a canonical substrate silently drops compatibility behavior or turns a weak test suite into a false proof claim. The opportunity is also high: behavior cells, typed changes, fixed proof lanes, and receipts could reduce repeated proof work. Existing compiler IRs, contract-first generators, proof-carrying code, and Verus proof APIs already cover components of this proposal; VL should test the paired raw/canonical change-cost experiment and preserve negative memories rather than redo those foundations.

## techniques for the catalog
- governed canonical foundry: classify artifacts, preserve provenance, and port only into declared profiles with evidence
- behavior quotient: group implementations under a declared behavior oracle and retain non-preserved behavior in a ledger
- typed change algebra: compile named operations into schema, migration, security, test, proof, and rollback obligations
- proof-carrying change: attach intent, obligations, receipts, rollback, and provenance to every accepted change
- graded preservation dossier: promote artifacts from syntactic through trace, fuzz, differential, and proof-backed evidence tiers
- paired cost ledger: compare raw and canonical repositories by amortized cost per verified correct change

Checked 2026-10-15 against the paper by a Codex agent for no_accidental_software_agent_first_canon_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
