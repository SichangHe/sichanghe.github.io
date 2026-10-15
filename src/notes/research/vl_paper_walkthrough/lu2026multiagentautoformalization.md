# Multi-agent Autoformalization of Tensor Network Theory
(authored by agents unless marked 🧑)
Tag: `lu2026multiagentautoformalization`, [paper](http://arxiv.org/abs/2607.07857v1)

## scope and result

The paper reports an autonomous Lean 4 formalization of the fundamental theorem of matrix-product states (FT-MPS), its prerequisites, and a symmetry application. The engineering contribution is a multi-agent workflow: a human-readable blueprint links literature, definitions, dependencies, and Lean declarations; specialized agents share persistent memory and a Lean language server; scouts find library lemmas before expensive proof attempts; reviewers compare the blueprint and proofs with the literature; fixers repeat until review accepts. The core FT-MPS chain is about 62,000 lines, 2,300 declarations, and 233 files inside a roughly 227,000-line TNLean library (main text, p. 5). The authors report that every step in the core chain is checked with no `sorry` placeholders, but they also show that a Lean kernel can certify the wrong or narrower theorem if intent is not reviewed.

## technique 1: a synchronized blueprint as the formal specification

What it is. The blueprint is a LaTeX document between primary sources and Lean. Each definition, lemma, and theorem has machine-readable links to Lean declarations, status markers, and logical dependencies. `checkdecls` verifies that every `\lean` and `\leanok` link resolves and compiles; semantic reviewers then check that the Lean theorem proves the prose statement with no stronger hypotheses than the source. The paper states: “The blueprint is a human-readable mathematical specification that links definitions, theorem statements, and dependency structure to the underlying Lean code.” (main text, p. 3).

When to use it. Use this layer for a project too large for a reviewer to audit directly in code. It makes the intended theorem and its source assumptions visible while proof files can be split among agents.

How to apply it.

1. Transcribe each source theorem once into a single notation and record its literature citation (Fig. 1, p. 2; Appendix B, p. 13).
2. Add a blueprint item for every definition, lemma, and theorem with a label, proof sketch, dependency list, and Lean link (Appendix B, pp. 13, 16).
3. Mark implementation status with `\lean`, `\leanok`, and `\notready`; record logical dependencies with `\uses` (Appendix B, pp. 16–17).
4. Run `checkdecls` after edits to detect missing or stale links (Appendix B, p. 13).
5. Have reviewers compare the blueprint statement and hypotheses with the cited literature, because link checking cannot prove semantic correspondence (Appendix B, p. 13).
6. Keep a dependency graph whose nodes show proof status; orange nodes identify prerequisite work (Appendix B, pp. 16–17).

The blueprint should be self-contained prose. The authors required that “Lean identifiers must not appear in prose, proof sketches must follow the actual Lean proof structure, and software-engineering vocabulary is avoided in chapter titles and mathematical statements.” (Appendix B, p. 17). This is an auditability constraint, not a Lean requirement.

Verus form (Inference). Use Markdown or another checked document as the specification layer for Rust. Each item should link to a Verus declaration and record source requirements, dependencies, status, and proof notes. A small checker can validate links and compile status, but a human or independent reviewer must compare the `requires` and `ensures` with the source requirement. Verus has no `\lean` tags or `checkdecls`; these are project tooling. The corresponding proof constructs are `requires`, `ensures`, loop `invariant`, `assert`, and `proof fn`, as used in the Verus studies, while the blueprint remains outside the verifier.

## technique 2: specialized roles, bounded delegation, and persistent memory

What it is. Six roles divide work: an orchestrator decomposes and dispatches, a proof writer closes placeholders, a library scout searches Mathlib, a simplifier refactors proofs, a blueprint synchronizer keeps prose and declarations aligned, and an automated reviewer cross-checks literature. The paper says: “The formalization was produced by a team of specialized language-model agents coordinated through the shared blueprint and a persistent memory.” (End Matter, p. 9). Each sub-agent receives a fixed role, instructions, read-only notes, assigned files, and a model tier. Parallel tasks use disjoint file sets, and the orchestrator performs a full build after merging.

When to use it. Use bounded roles when a single context cannot hold source papers, current code, proof state, and the intended theorem. Give expensive models proof closure and hard orchestration; use cheaper models for scouting and style checks.

How to apply it.

1. Define roles and the fixed tools each role can use (Appendix A.1, p. 11).
2. For every task, attach only the relevant background notes, assign disjoint files, and choose a model tier (Appendix A.2, p. 12).
3. Keep session notes on proof status, failed routes, counterexamples, and conventions in persistent memory (Appendix C, pp. 17–19).
4. Distill reusable lessons into pinned files; the project pins at most ten durable files (Appendix C.3, p. 19).
5. Merge completed changes and run a full build before accepting the combined state (Appendix D.1, p. 19).

Verus form (Inference). The roles map naturally to a Rust generator, Verus-library scout, proof simplifier, specification synchronizer, orchestrator, and independent reviewer. Assign disjoint Rust modules and preserve diagnostic notes. Model tier is orchestration, not a Verus feature. Inference: a shared memory of failed invariants and known counterexamples can reduce repeated mistakes, but it must never substitute for rerunning `verus` after a change.

Evidence and limits. The entire TNLean development consumed recorded model-API cost of $20,206; a code-size scaling estimate assigns about $5,548 to FT-MPS alone (Appendix F, p. 23). These are project-wide estimates, not proof-cost denominators for an individual lemma. Proof writing and orchestration account for roughly four fifths of cost (Appendix F, p. 24). The system's success therefore depends on substantial compute and human steering.

## technique 3: iterative Lean interaction and scout-then-prove

What it is. Agents use a language-server interface that exposes diagnostics, proof state, declaration types, Mathlib search, file refresh, and project builds. The paper lists `lean_diagnostics`, `lean_inspect`, `lean_loogle`, `lean_file`, and `lean_project` (Appendix A.3, pp. 12–13). The recurring loop is: attempt a proof, inspect the error or goal, search the library, edit, and recheck.

Scout-then-prove stages hard work. An inexpensive `leanSearch` agent writes a memo with exact theorem signatures and a feasible route; an expensive proof agent receives that memo as read-only context. The authors report: “In practice, finding the right existing Mathlib lemma was often the step that saved the most effort.” (Appendix D.2, p. 19).

How to apply it.

1. Ask a scout whether definitions and lemmas already exist and record exact types in persistent memory (Appendix D.2, p. 19).
2. Attach the memo to a proof-writing agent and assign a bounded file/task (Appendix D.2, p. 19).
3. After every proof attempt, run diagnostics; inspect the goal and declaration types before applying a lemma (Appendix A.3, p. 12).
4. Search Mathlib by declaration, constants, or type pattern with `lean_loogle` (Appendix A.3, p. 12).
5. Refresh stale file state and build the project; read diagnostics after a project build (Appendix A.3, p. 13).
6. If heartbeats exceed the default 200,000, split the proof into named intermediate lemmas; one case fell from 1,600,000 to 250,000 heartbeats after factoring (Appendix D.2, p. 19).

Verus form (Inference). The loop is generate Rust/specification, run `verus`, inspect diagnostics and proof obligations, search the Verus library, split long proofs, and rerun. Verus does not have `lean_loogle` or heartbeat semantics identical to Lean; use available source search and compiler diagnostics. Use `assert`, `requires`, `ensures`, loop `invariant`, and `proof fn` only in forms supported by the Verus reference. Inference: a scout memo should contain exact Verus function signatures and invariants, because a guessed lemma type can corrupt later proof attempts.

## technique 4: review–repair cycles for intent and code alignment

What it is. A reviewer identifies paper–Lean mismatches, missing hypotheses, blueprint drift, style problems, or proof-integrity issues. A fixer patches them; review repeats until comments clear or a cap of five iterations. The authors performed six blueprint review rounds, each producing reports that the orchestrator routed to agents. “We emphasize that the human intervention is strategic rather than tactical: the human supervisor pointed out the unintended version of the statement being proved, but not how it should be formalized by the agents.” (main text, p. 3).

How to apply it.

1. Review the blueprint against primary papers for definitions, hypotheses, finite/asymptotic scope, and intended conclusion (main text, pp. 3–4).
2. Review proposed Lean changes for source alignment and missing assumptions; run automated checks for links and compilation (Appendix D.3, p. 20).
3. Dispatch fixers with the review comments and relevant files.
4. Re-review the revised change, stopping when unresolved comments are gone or after five iterations (Appendix D.3, p. 20).
5. Keep strategic theorem choice with a human while agents choose tactics and lemma decompositions (End Matter, p. 9).

The review caught a doubly-stochastic gauge assumption. The agents had a formally correct theorem under a stronger assumption that only covered a smaller tensor class; removing it required reorganizing earlier arguments around one-sided canonical forms (main text, p. 3). It also caught replacement of a finite statement by an asymptotic one: FT-MPS compares unnormalized vectors at each finite length N, with no norm-limit assumption. The corrected proof stayed at fixed finite N (main text, p. 4). Edge cases `D ≥ 1` and `N ≥ 1` were added to avoid artificial branches (main text, p. 4). The paper's warning is precise: “Lean checks the proof but not the choice of statement.” (main text, p. 3).

Verus form (Inference). Review Rust contracts against requirements and call sites, not only successful verification. Check that quantifiers, finite bounds, nonempty cases, and ownership assumptions match the intended behavior. A Verus proof can compile under an overstrong `requires` or vacuous precondition; an independent contract reviewer must detect that. Use `assert` and `invariant` for proof obligations, but leave strategic specification choice to human review.

## technique 5: formal proof decomposition for FT-MPS

The appendix gives a reusable three-stage proof plan.

1. Canonical-form reduction. Decompose the tensor's virtual space into invariant subspaces, put the matrices into block-upper-triangular form, discard off-diagonal blocks that do not contribute to periodic traces, and obtain irreducible blocks. Block by a common period to remove peripheral periodicity, yielding normal blocks in canonical form; a further finite blocking controlled by the quantum Wielandt bound makes each block injective (Appendix B.1, pp. 14–15).
2. Block separation. Group repeated normal tensors, use linear independence of distinct normal-block sectors at sufficiently large finite system size, and use the transfer-operator gap to identify gauge-equivalent blocks. Align scalar weights and block phases without taking an asymptotic limit (Appendix B.1, pp. 14–15).
3. Equal-MPV theorem. Combine canonical reduction and block separation: equal matrix-product-vector families imply matching normal-block sectors and gauge equivalence after weights/phases are aligned (Appendix B.1, p. 14).

The paper's correction for repeated blocks avoids a false convergence assumption. For weights `+1` and `−1`, the factor `1+(−1)^N` oscillates and vanishes for odd N; the corrected route uses equality at all sufficiently large finite lengths, geometric extrapolation, and Newton–Girard identities to recover weight multisets (Appendix E, p. 20). Formal proof expansion is substantial: the gauge-invertibility step exceeds 200 Lean lines, Perron–Frobenius exceeds 150, block separation exceeds 800, and a chapter-level sketch of roughly 240 blueprint lines becomes about 650 Lean lines (Appendix E.3, pp. 21–22).

Verus form (Inference). For a systems proof, use the same discipline: define canonical representations, prove decomposition lemmas, separate independent cases, and keep finite bounds explicit. Replace tensor-specific equalities with Rust state invariants and representation lemmas. The matrix and quantum theorems do not carry over to Verus; the transferable technique is staged decomposition with explicit intermediate contracts. Inference: model edge cases and finite bounds early, because proving a narrower or asymptotic property can leave a product bug unaddressed.

## technique 6: fill library gaps with local replacement proofs

The project encountered five Mathlib gaps and built replacements: generalized eigenspaces plus invertible/nilpotent decomposition for Jordan normal form; Jacobson density and finite-dimensional spans for Burnside's theorem; a direct Kadison–Schwarz proof for completely positive maps; direct fixed-point and irreducibility arguments for quantum Perron–Frobenius; and an external Brouwer formalization transferred from a simplex to density matrices (Table S4, p. 22). For trace-preserving maps, Cesàro averages `S_N(ρ)=1/N Σ_{k=0}^{N−1}E^k(ρ)` give a fixed point by compactness, avoiding Brouwer (Appendix E.4, pp. 22–23).

Verus form (Inference). When Verus lacks a library theorem, isolate a local lemma with a precise contract, prove it from supported primitives, and record its assumptions in the blueprint. Do not mark an unproved helper as `external_body` for the function being verified. An external theorem or library contract remains trusted until its own proof is checked.

## what is proved, trusted, and still open

The Lean kernel checks the formal declarations and proof terms, and the reported core has no `sorry` placeholders. The blueprint and reviews provide evidence that statements were compared with literature, but six review rounds found 10–30 issues per round, chiefly missing hypotheses, mismatched definitions, and overly general claims (End Matter, p. 9). The authors explicitly state that the full one-dimensional SPT classification is not formalized; the result stops at a cohomological invariant. Some deep inputs outside the FT-MPS and symmetry chains remain assumed (Appendix B.1, p. 15). Trusted layers include Lean, Mathlib, external Brouwer code, source translations, blueprint metadata, agent prompts, human strategic review, and the theorem statements themselves.

Inference: threat to a product of agent-written verified Rust is high at the specification boundary and moderate in proof construction. The paper already demonstrates multi-agent decomposition, persistent memory, blueprint synchronization, review–repair, finite-scope auditing, and library-gap workarounds; VL should not redo a generic multi-agent Lean workflow. VL-specific work should measure whether a Verus blueprint catches overstrong contracts, whether proofs survive dependency changes, and whether hidden behavioral tests agree with the verified specification.

## techniques for the catalog

- synchronized blueprint: link source statements, dependencies, status, and Lean declarations in a checked human-readable layer
- specialized bounded agents: separate orchestration, proof writing, scouting, simplification, synchronization, and review with disjoint files
- persistent proof memory: distill failed routes, counterexamples, and reusable lemmas into pinned notes
- scout-then-prove: search library types with a cheap agent before dispatching an expensive proof writer
- language-server proof loop: attempt, inspect diagnostics and goals, search declarations, edit, refresh, and recheck
- review–repair cycle: compare literature, blueprint, and code, then patch and repeat with a bounded reviewer loop
- finite canonical proof decomposition: reduce to canonical form, separate blocks at finite lengths, and combine gauge results
- local library replacements: prove missing mathematical prerequisites from available primitives and record their assumptions

Checked 2026-10-15 against the paper by a Codex agent for multi_agent_autoformalization_of_tensor__20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
