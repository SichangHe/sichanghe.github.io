# Certificate-Carrying Transformation of Event-Driven Block Programs
(authored by agents unless marked 🧑)
Tag: `si2026certificate`, [paper](https://arxiv.org/abs/2607.00563)

## what the paper proves

CertiBlock rewrites Scratch programs with an untrusted optimizer and a trusted, fail-closed checker. The abstract states: “An untrusted optimizer proposes a rewrite; a trusted, fail-closed checker accepts it only after recomputing every side condition that the rewrite’s behavior preservation depends on, under an explicit observation lens.” (Abstract, p. 1). The checker is the sole authority for acceptance; certificates carry hints, but the checker reconstructs facts from before/after programs. The paper mechanizes a cooperative-frame refinement theorem in Lean, implements six rewrite families, and evaluates them on 300 real Scratch projects.

The core results have explicit denominators and settings. The checker accepts at least one behavior-preserving rewrite on 283 of 300 projects, 94.3% with 95% confidence interval [91.1, 96.4] (Section VII-B, p. 11). A cross-family adversarial campaign tests 4,278 perturbed rewrites across six families and reports zero false accepts (Section VII-A, p. 10). The checker mean is under one tenth of a second per project; accepted-check median is 2 ms, 95th percentile 66 ms, and slowest check 1.3 s on the largest project (Section VII-C, p. 11). These are Scratch results under the paper's player observation lens and fixed headless VM harness.

## technique: make the checker the sole acceptance authority

What it is. The optimizer emits a certificate naming the rewrite family, observation lens, edited region, and SHA-256 digests of before and after bytes. The checker re-parses both programs, recomputes digests and all registered obligations, and mints the only acceptance receipt. The paper describes the discipline as: “The optimizer is free to be large, heuristic, and wrong.” (Introduction, p. 2).

Steps from Algorithm 1 (Section III-A, p. 3).

1. Recompute SHA-256 digests of before and after byte streams and reject on mismatch.
2. Parse both byte streams.
3. Resolve the certificate's lens through a fixed lens table and the family through a registry.
4. Reject if either is undefined or if the family is not registered for that lens.
5. Iterate through the family's fixed obligations.
6. Discharge each obligation against recomputed before/after facts; reject on any non-proof result.
7. Return ACCEPT only after every obligation proves.

The paper says: “Every branch that is not an explicit acceptance is a rejection, which is what makes the trusted base fail closed.” (Section III-A, p. 3).

Inference: For VeruLaw, an LLM can propose a Rust/Verus patch plus metadata, but a separate verifier process must re-read the actual patch, run Verus, and issue the acceptance record. The patch metadata must never be treated as proof. A fail-closed wrapper should reject parse failures, unsupported syntax, changed files outside the allowed region, verifier errors, and unknown proof modes.

What is proved and trusted. The Lean decision procedures are compiled functions proved sound for the abstract model; the deployed checker is separate Python code validated by tests and a VM differential oracle (Section IV-C, p. 4; Section VI, p. 9). The trusted base is 9,921 checker lines, 5,909 Lean lines, and two named model-to-VM conformance assumptions (Section VI and VII-D, pp. 9, 12). Inference: In Verus, proof soundness remains relative to Verus, its solver, trusted external specifications, and the Rust/Verus execution model; the wrapper and any bridge from model to deployed checker must be audited separately.

## technique: parameterize behavior by an observation lens

What it is. A lens defines which observations count as behavior. The player lens observes frames, sounds, prompts, visible monitors, and termination; editor state is observed by a finer debug lens. The paper states: “A rewrite that is sound for a player is unsound for an editor, and the checker enforces the distinction by pinning each family to the lens under which its edit is behavior-preserving.” (Section I, p. 2).

Steps from Section III-B (p. 4).

1. Define the raw execution trace and the resources and events visible to a chosen observer.
2. Define one or more lenses as projections of that trace.
3. Pin each rewrite family to the lens for which its proof is valid.
4. Reject a certificate claiming a different lens before obligations run.
5. Define refinement as inclusion of observable trace sets under the selected lens.

Inference: In Verus, choose an explicit product observation such as returned values, memory-state abstraction, protocol messages, crash states, or externally visible I/O. Put that abstraction in `spec fn` definitions and state refinement in `ensures` or proof predicates. A proof that preserves an abstract state is not automatically a proof that preserves logs, timing, allocator behavior, or safety properties outside that lens.

## technique: prove a parameterized cooperative-frame theorem

What it is. The theorem removes a first write when a later write overwrites the same resource before any yield or observation. Definition 1 calls the interval the pending window and requires every observation step to avoid the resource and the overwriter not to read the old value. Theorem 1 then says that deleting the first write refines the original under the player lens (Section IV-A, pp. 4–5).

The paper's proof shape is concrete: “The proof exhibits a simulation between the two programs in which the configurations agree on every cell except the dead one, and an admissible observation, reading no dead cell, cannot distinguish the configurations, so the emitted traces coincide step by step until the overwriter restores agreement on the dead cell as well.” (Section IV-A, p. 5).

Steps from Sections IV-A and IV-B (pp. 4–6).

1. Identify resource r, first write W1, and next same-thread write W2 with no yield between them.
2. Define the pending window between W1 and W2.
3. Check every observation in the window: its read set must exclude r.
4. Check W2 does not read r, so its value is independent of W1.
5. Prove a simulation whose states differ only at r until W2.
6. Conclude equal traces under the chosen observation boundary.
7. Instantiate the theorem for variable state at yield boundaries and renderer state at frame boundaries.

The paper emphasizes why one boundary is insufficient: “A yield-only theorem is sound for variables and unsound for renderer state, because renderer state commits at points a yield-only analysis does not see.” (Section IV-B, p. 5).

Inference: In Verus, model the resource and observation boundary with ghost state and `spec fn` trace projections. Use a proof function to establish state agreement before and after the overwrite, and loop invariants for the no-yield window. Verus does not inherit Lean's theorem syntax or Scratch scheduler semantics; those must be encoded in Rust data and specifications. The inference is a design transfer, not a result reported by this paper.

## technique: recompute structural and semantic obligations for six rewrite families

The six families are comment cleanup, unused-asset cleanup, dead-broadcast removal, dead-code elimination, variable dead-store elimination, and visual dead-store elimination (Section V-A, p. 6; Table II, p. 6). Every family uses a shared obligation shape: lens check, well-formedness pre-pass, single-allowed-delta structural check, and family-specific semantic conditions (Section V-C, p. 8).

Representative procedures from the paper.

- Structural single-allowed-delta: derive removed block identifiers from before/after differences, reconstruct the program obtained by exactly that deletion, and require its canonical core to equal the after program. This rejects partial deletion, dangling references, and unrelated edits (Section V-C, p. 8).
- Dead-broadcast removal: resolve the message by identifier through the broadcast table, match receivers case-insensitively over the supported ASCII range, and reject computed or non-ASCII names that the checker cannot decide (Section V-A, pp. 6–7).
- Dead-code elimination: compute the transitive closure of a top-level head over successors and nested inputs, refuse to cross into an independent top-level script, and remove only a component with no triggering hat (Section V-A, p. 7).
- Visual dead-store: walk the straight-line segment after W1; reject a pen state, breaker, observation, or partial write; require an absolute overwrite; enforce literal in-bounds motion when stage clamping could depend on the old position; and verify a clean splice (Algorithm 2, Section V-B, pp. 7–8).

Inference: For Verus transformations, the same pattern can guard LLM edits to a verified Rust module: parse the patch, derive changed declarations, require exactly the declared edit class, recompute dependency and contract obligations, and reject unsupported syntax. A Verus proof of a patch's postcondition is necessary but does not by itself show that the patch is the intended single transformation.

## technique: compose independently certified rewrites

What it is. Equality saturation may propose a sequence. The checker records intermediate digests, re-anchors each step on the actual intermediate program produced by the previous check, and verifies each certificate independently under one lens (Section V-D, p. 8). The paper reports composition on 57 of 300 projects, up to three families and seven steps (Section V-D, p. 8).

Steps.

1. Emit a sequence certificate with before/after digests for each intermediate.
2. Recompute the first step from the actual input.
3. Recompute the next step from the checker-produced intermediate, not optimizer claims.
4. Check every step's obligations and lens.
5. Accept the composed output only if all steps pass.

Inference: In Verus, verify each commit or patch against the exact checked predecessor, then verify the final source again. This avoids trusting a model-generated chain whose intermediate files were never checked.

## technique: use adversarial, differential, and ablation validation

The paper's RQ1 validation has five complementary methods: per-family unit suites, an independent integrated-checker audit, a cross-family adversarial campaign, VM differential conformance, and an ablation removing semantic side conditions (Section VII-A, p. 10). The six unit suites have 274 tests and all pass, but the audit still found eight false accepts that per-family suites missed (Section VII-A, p. 10). The campaign creates variants with a second edit; all 4,278 variants are rejected. The VM oracle runs Scratch VM 1.6.19 for 240 scheduler ticks under a fixed seed and compares frames, sounds, monitor values, and termination; six accepted rewrites are not adjudicable because their own behavior is nondeterministic, and none is a mismatch (Section VII-A, p. 10; Table IV, p. 11).

Inference: For VeruLaw, combine unit tests for each checker obligation, integrated adversarial edits that cross obligation boundaries, independent re-verification of accepted Rust, and differential execution where a deterministic executable oracle exists. Treat nondeterministic runs as not adjudicable rather than as evidence of equivalence. Remove a critical side condition in an ablation to show that the condition rejects real unsound patches, not only synthetic invalid inputs.

## applicability, limits, and VL threat

The paper reports 94.3% prevalence on a uniformly sampled 300-project corpus, but says conservative families make prevalence lower bounds and the player lens approximates perceived behavior rather than exact pixels or audio (Section VIII, p. 12). The variable dead-store family is inert on natural code: 113 projects write a variable and 105 write one twice, yet none has a removable transaction-local dead store because the variable is read elsewhere (Section VII-B, p. 12). This is a useful warning against interpreting a proved technique's low firing rate as a checker failure.

Inference: VeruLaw should treat certificate-carrying transformation as a product pattern for LLM-generated Rust refactoring and proof repair. It directly addresses the threat that an optimizer or agent can propose a plausible but unsound change. The major residual threat is the trusted model-to-executable boundary: the paper explicitly says its Python checker has a transcription gap and that a verified bridge is future work (Section VIII, p. 12). A second threat is a lens that omits a product-visible channel. A third is adversarial edits that cross families; the paper's eight missed false accepts show why integrated audits are required.

Already done. CertiBlock already combines fail-closed acceptance, certificate recomputation, observational refinement, a mechanized theorem, differential testing, and trusted-base accounting. VL should not claim these generic ideas as new. Inference: A distinct VL contribution would need Rust-specific evidence, such as ownership-aware patch obligations, external-crate contract checking, or measured repair over dependency upgrades.

## techniques for the catalog

- fail-closed certificate checker: recompute hashes, parse both versions, pin lens and family, discharge fixed obligations, and mint the only acceptance
- lens-parametric refinement: define behavior as an explicit observation projection and reject edits claimed under the wrong lens
- cooperative-frame dead-store proof: remove an overwritten write only when no yield or observation intervenes and the overwriter ignores the old value
- structural single-delta obligation: reconstruct the exact declared edit from before/after programs and reject unrelated changes
- multi-family obligation registry: share well-formedness, lens, and structural checks while adding family-specific side conditions
- certified sequence composition: check each rewrite against the actual intermediate produced by the previous rewrite
- adversarial and differential validation: combine unit suites, cross-family perturbations, deterministic VM traces, and side-condition ablations
Checked 2026-10-14 against the paper by a Codex agent: audit record si2026certificate; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
