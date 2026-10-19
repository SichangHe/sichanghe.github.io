# MechMath Agent Team: LLM Driven Agents for Mathematical Research
(authored by agents unless marked 🧑)
Tag: `cao2026mechmath`, [paper](http://arxiv.org/abs/2607.04394v1)

## scope and verified boundary

Cao et al. describe the MechMath Agent Team (MMAT), a multi-agent system for taking mathematical research from exploration to Lean 4 certification. Its harness separates Control, Execution, and Augmentation planes, then instantiates a Natural Language Prover, Formal Language Prover, and Knowledge Base Manager. Formal verification covers selected results and depends on explicitly retained assumptions. The abstract says: “We design a tripartite Harness Architecture that decouples system responsibilities into Control, Execution, and Augmentation planes, thereby reconciling rigorous logical control with the agility demanded by open-ended research.” (Abstract, p. 1.)

The Formal Language Prover (FL-Prover) uses the Lean 4 compiler as the mechanical referee. The paper states: “mathematical validity here is absolutely and exclusively determined by the Lean 4 compiler kernel in a deterministic manner.” (§3.2, p. 11.) Inference: this is the paper's strongest transfer to Verus: natural-language agents may search, but a trusted proof checker must decide acceptance. The authors report an internal two-month deployment solving 11 problems in the abstract, while the conclusion says “it solved ten problems”; this is an internal numerical inconsistency that should not be silently reconciled.

## technique 1: tripartite harness with explicit state

what it is

The Control Plane has a centralized Orchestrator, a global execution graph, and a local task ledger. The Execution Plane gives each agent an isolated workspace and exchanges artifacts through files. The Augmentation Plane supports human-AI co-reasoning and persistent memory of recurring errors as negative constraints. The paper describes the execution design as: “Sandboxed Isolated Workspaces contain agent operations, while artifact-centric File-Based Handoffs replace fragile peer-to-peer dialogue.” (Introduction, p. 2.)

how to apply it

1. Represent work as graph nodes and ledger rows containing task id, description, owner, and status; only the Orchestrator may modify the ledger (§2.1, pp. 4–5)
2. Let the Orchestrator allocate resources and track dependencies instead of relying on conversational context (§2.1)
3. Give every subagent a separate workspace with restricted writes; pass structured files through the Orchestrator instead of conversational history (§2.2, pp. 5–6)
4. Produce progress reports and accept human instructions or annotations for refinement and deadlock resolution (§2.3.1, pp. 6–7)
5. Keep temporary notation in local memory, recurring reasoning failures as long-term behavioral constraints, and dense domain facts in the Knowledge Base (§2.3.2, p. 7)

Verus form

Inference: implement the ledger and workspace isolation around Verus runs. Each generated Rust proof lives in a scratch directory; only a controller merges a verified patch. Record theorem statements, verifier output, and diffs as immutable artifacts. Verus itself checks the proof; the harness controls scheduling and provenance.

Evidence and limits

This architecture is evaluated through case studies rather than a controlled ablation of each plane. The paper gives no denominator for how many agent tasks failed or how much each plane contributed. Inference: the architecture is an engineering pattern, not evidence that every component is necessary.

## technique 2: closed-loop natural/formal proof pipeline

what it is

Within each project, KB-Manager, NL-Prover, and FL-Prover interact through four primitives: Inform, Formalize, Feedback, and Archive. KB-Manager supplies historical knowledge to both provers through Inform. NL-Prover decomposes a problem and writes a natural-language proof; FL-Prover translates it to Lean, compiles it, and returns diagnostics; NL-Prover revises and resubmits. Both agents archive artifacts and failures through KB-Manager. The paper says: “If the verification fails, the NL Prover revises the informal proof based on the feedback and may re-initiate the Formalize process.” (§3, p. 8.)

The NL pipeline uses specialized roles: Sketcher (proof plan), Generator (detailed proof), Verifier (independent audit), Searcher (theorem grounding), Code Executor (exact computations), Auditor (notation and assumptions), Explorer/Synthesizer (alternative routes), Regulator (failure classification), CE-Hunter (counterexamples), Refiner, and Writer (Table 1, p. 9). Deterministic tooling handles retrieval, PDF extraction, linting, and cross-model checks, described as a “deterministic exoskeleton.” (§3.1.2, p. 10).

how to apply it

1. Sketch the theorem into lemmas and dependencies
2. Generate an informal proof for each assigned statement
3. Formalize statements first, with proof bodies initially marked `sorry` (§3.2.1, p. 11)
4. Have a Formal Reviewer compare each formal statement with the source before proof search (§3.2.1)
5. Run a Formal Generator only in an ephemeral scratchpad
6. Compile with Lean; scan for `sorry` or `admit`; guard theorem AST snapshots (§3.2.2, p. 12)
7. Return formal verification outcomes to NL-Prover for revision (§3, p. 8); for an informal Verifier failure, repair the local proof or backtrack to the Sketcher (§3.1.1, p. 9)
8. Integrate only verified fragments, then archive the proof, logs, and failure record (§3, p. 8)

Verus form

Inference: replace Lean scaffolds with Verus Rust modules and use verifier output as the feedback channel. The Formal Reviewer should freeze function signatures and specifications before proof generation; scratchpads can contain temporary lemmas, but integration should admit only code that passes Verus and repository checks. A corresponding scanner should reject unfinished proof scaffolds and flag assumptions for review under the project’s policy.

Evidence and limits

The paper's FL-Prover claims deterministic Lean checking, but the NL roles and model outputs remain untrusted. The case studies show successful formalization, not a measured error rate for statement translation. Inference: statement drift remains a product risk even when every resulting Lean term compiles.

## technique 3: formalization prerequisite checks and anti-vacuity controls

what it is

The FL-Prover separates syntax generation, semantic review, proof search, integration, cleanup, and global audit. Guarding snapshots theorem statements and checks AST integrity so an agent cannot weaken a proposition merely to make compilation succeed. Scanning searches for unfinished placeholders. Indexing records dependencies; Searching retrieves library lemmas through Leansearch, Leanfinder, Leanexplore, and Loogle. The paper says guarding “effectively blocks agents from surreptitiously weakening propositions to force a successful, yet invalid, compilation.” (§3.2.2, p. 12.)

how to apply it

1. Formalizer writes the target statement and definitions with temporary bodies (§3.2.1)
2. Obtain F-Reviewer approval of semantic fidelity before establishing a statement snapshot
3. F-Generator searches in an isolated workspace
4. Integrator merges only a verified fragment into the target file
5. Golfer performs post-verification cleanup without changing logic
6. Regulator audits diffs, duplicate definitions, statement drift, and vacuous truths (§3.2.1)

Verus form

Inference: snapshot Verus function signatures, `requires`, `ensures`, and relevant datatype definitions before generation; reject diffs that weaken them. Run `verus` on the final module, inspect dependency and trusted-axiom settings, and compare the parsed specification AST where tooling permits. The Lean-specific commands require adaptation to Verus.

Evidence and limits

The controls are described architecturally, with no separate pass/fail dataset or denominator.

## technique 4: proof-chain auditing and counterexample recovery

what it is

For sparse-polynomial work, MMAT audits imported lemmas instead of treating them as black boxes. Searcher traces dependencies, Auditor checks parameter boundaries, and CE-Hunter searches extreme values. The paper reports that this process found a flaw in Lemma 4.7(ii), then used finite enumeration to refute the claimed probability: “the actual success probability under this extreme scale plummets to P = 7495/30182 ≈ 0.248, directly refuting the original paper’s theoretical claim of 1 − µ1/2 = 3/4.” (§4.3.1, p. 19.)

how to apply it

1. Trace every imported lemma and its assumptions
2. Identify boundary parameters and intermediate quantities
3. Form a falsification hypothesis and search extreme configurations
4. Run exact finite enumeration or symbolic computation
5. Send the result to an independent Verifier and Regulator
6. Halt downstream proof work when a prerequisite fails; archive the counterexample

Verus form

Inference: apply the same process to imported Verus lemmas, especially arithmetic bounds and collection invariants. Generate counterexamples in ordinary Rust or a model checker, then encode the surviving claim as a Verus lemma. Finding no counterexample leaves the claim unproved.

## technique 5: large-scale certificate orchestration with exception branches

what it is

For Vasc's cyclic inequality at n=9, MMAT clears denominators, uses cyclic symmetry and successive-difference substitution, then checks 40,320 cones. Positive coefficients certify a cone; otherwise Polya multipliers or AM-GM/SOS certificates are generated. When a sample remains unresolved, the Orchestrator opens a recovery branch: CE-Hunter probes for violations while Generator synthesizes a patch, Verifier authenticates it, and Code Executor checks it. The final certificate had 36,815 positive-coefficient leaves, 2,236 Polya-multiplier leaves, and 1,269 AM-GM/SOS leaves (§4.2, pp. 17–18).

Verus form

Inference: this is a pattern for partitioning large Rust proof obligations into independently checked cases, with a bounded exception queue. Each case must produce a Verus proof or a concrete counterexample; an unsuccessful counterexample search cannot close a case. Store counts and certificate hashes so a product can audit coverage.

## techniques for the catalog

- tripartite harness — separate scheduling, isolated execution, and human/memory augmentation with explicit state
- closed-loop formalization — alternate natural-language generation, compiler checking, feedback repair, and archival
- formalization prerequisite checks — snapshot statements, scan placeholders, guard ASTs, and integrate only verified fragments
- proof-chain auditing — trace imported lemmas and search extreme parameters for counterexamples
- exception-branch certification — keep a primary exhaustive scan running while specialized agents patch unresolved cases
- negative-constraint memory — store recurring reasoning failures as reusable behavioral constraints
