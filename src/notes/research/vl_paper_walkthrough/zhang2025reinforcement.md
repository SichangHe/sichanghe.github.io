# Reinforcement Learning from Compiler and Language Server Feedback
(authored by agents unless marked 🧑)
Tag: `zhang2025reinforcement`, [paper](https://www.semanticscholar.org/paper/def1916a02dedb0a170a91af1d43c98dd9e8dbcf)

## what is proved or measured

The paper introduces RLCSF and Lanser-CLI, an orchestration layer that turns compiler and language-server observations into replayable transition feedback for coding agents. A state contains a task, workspace snapshot, and selector context; an action is a query or mutation proposal; an observation is an Analysis Bundle. The system is instantiated with the Language Server Protocol and Pyright for Python (Sections 1–2, pp. 1–3).

The abstract states: "RLCSF treats each tool interaction as a transition and computes a shaped process reward from deterministic changes in diagnostics, selector confidence, and edit safety." (Abstract, p. 1). The formal claims are determinism of canonical bundles under frozen inputs (Proposition 5.1, p. 8) and non-negative undiscounted reward when all tracked components weakly improve without a tool error (Proposition 5.2, p. 8). These are conditional properties; the paper does not prove that an external language server is deterministic outside the stated assumptions.

## technique: robust selector DSL and deterministic relocation

what it is and when to use it

Use a selector DSL when file:line:column coordinates become stale after edits or ambiguous under overloads and duplicate names. Selectors encode a cursor/range, symbolic qualified name, AST path, or content anchor. A deterministic relocation procedure resolves the selector to ranked concrete ranges and emits ambiguity evidence (Section 3, pp. 4–5).

how to do it

1. Represent intent as a tagged `PositionSpec`: cursor with explicit indexing, range, symbolic qualified name and role, AST path, or content anchor with snippet, context, and hash (Section 3.1, p. 4).
2. Serialize it in canonical CLI syntax, such as `py://pkg.mod#Class.method:body` or `anchor://src/app.py#"def load_data("?ctx=24` (Section 3.1, p. 4; Appendix A, p. 13).
3. Negotiate the server's position encoding at initialization and record whether coordinates are UTF-16, UTF-8, or codepoint indexed (Section 3.2, p. 4).
4. Run `Relocate`: first use an exact document-version map; for symbolic/AST selectors reparse and structurally match; for anchors perform winnowed k-gram search within the recorded context (Section 3.3, pp. 4–5; Algorithm 1, p. 6).
5. Assign certified candidates score 1.0. Score other candidates with `0.5 sast + 0.2 smodule + 0.2 Jtoken + 0.1 sprox`, sort by descending score then `(uri, range)`, and require top score ≥ τ and margin ≥ δ; otherwise return top-k alternatives with explanations (Section 3.3, p. 5; Algorithm 1, p. 6).

The paper explains the safety condition: "A selector is accepted automatically only when the top score is at least τ and ∆ ≥ δ; otherwise the bundle surfaces top-k alternatives with explanations, and mutating commands require explicit target confirmation." (Section 3.3, p. 5).

Verus form (inference)

Inference: Define a `spec fn` for selector resolution and candidate ordering, with `requires` for the workspace snapshot and encoding metadata and `ensures` that returned candidates are sorted and satisfy the threshold rule. Use `seq` for ordered candidates and loop `invariant` clauses for deterministic sorting. Prove that an exact document-version match is certified, while ambiguous candidates produce an explicit error/result variant. Treat fuzzy matching and parser behavior as executable code whose correspondence to the specification needs separate lemmas; a proof function must not be called at runtime.

evidence, limits, and assumptions

The relocation algorithm is presented with a correctness sketch rather than a benchmark. It assumes deterministic parsing, structural matching, and hash comparison under a frozen snapshot. The error taxonomy includes `E/NOT FOUND`, `E/AMBIGUOUS`, `E/VERSION SKEW`, and `E/INDEXING MISMATCH` (Section 3.3, p. 5). A selector can remain ambiguous by design; the system surfaces evidence instead of guessing. The score weights, τ, and δ are policy parameters, so they do not prove semantic identity of a target.

## technique: canonical Analysis Bundles and replay

what it is and when to use it

Use Analysis Bundles to convert stateful LSP responses into stable artifacts suitable for audit, offline supervision, and reward replay. A bundle records normalized facts, edits, environment metadata, capabilities, and a content hash (Section 2.2, p. 3; Section 5.1, pp. 7–8).

how to do it

1. Capture the workspace snapshot, tool and server versions, position encoding, interpreter, configuration digest, and platform (Section 2.2, p. 3).
2. Normalize all location lists by `(uri, sL, sC, eL, eC)` with stable tie-breakers (Section 2.2, p. 3; Appendix B, p. 13).
3. Canonicalize the stable fields with JSON Canonicalization Scheme and compute `bundleId = sha256(canonical fields)`, excluding timestamps and run-local trace data (Section 2.2, p. 3; Appendix B, p. 13).
4. Record request, resolution, facts, edits, environment, capabilities, and stable metadata in the response envelope (Section 5.1, p. 7).
5. For replay, freeze the workspace digest, tool/configuration versions, encoding, request, and reward weights; regenerate canonical bundles and adjacent-transition rewards from the trace (Section 5.1, p. 8; Appendix E, p. 15).

The formal assumption is: "Given an identical workspace snapshot, tool version, encoding, and request, Lanser-CLI yields a byte-identical hash-domain bundle under deterministic tool semantics." (Section 2.2, p. 3). Proposition 5.1 (p. 8) proves the hash is invariant under exactly those assumptions.

Verus form (inference)

Inference: Model the hash-domain bundle as an immutable record and specify a canonical serialization function. Prove with `ensures` that equal snapshots, configuration, encoding, and requests yield equal canonical records and equal hashes, assuming a trusted cryptographic hash specification. Use `invariant` clauses while sorting lists and exclude volatile fields at the type or serialization boundary. The hash implementation and JSON canonicalizer remain trusted unless verified separately.

evidence, limits, and assumptions

The claim excludes timestamps, trace spans, and other fields outside the hash domain (Section 5.1, p. 8; Appendix B, p. 13). It also assumes pinned tool semantics; a nondeterministic analyzer can violate the premise. Appendix B caps references at 105 entries and marks truncation, which bounds artifact size but can discard evidence. Replay therefore reproduces recorded semantics, not necessarily a fresh server's behavior.

## technique: preview-first guarded mutation

what it is and when to use it

Use guarded mutation for refactors and edits that can target the wrong range, escape the project root, conflict with concurrent changes, or corrupt encodings. Lanser-CLI previews a workspace edit and requires explicit application under a jail and policy checks (Section 4, pp. 6, 9–10).

how to do it

1. Require a clean Git worktree unless `--allow-dirty` is explicitly set (Algorithm 2, p. 8).
2. Run `prepareRename`; abort on failure (Algorithm 2, p. 8).
3. Request the workspace edit, compute a unified diff, emit the preview, and return without writing in dry-run mode (Section 4, p. 6; Algorithm 2, p. 8).
4. If applying, stage the edit under a realpath-normalized workspace jail and allow/deny filters; perform conflict detection and fail with `E/APPLY CONFLICT` when needed (Section 4, pp. 6, 9).
5. Write temporary files preserving line endings, encoding, and permitted mode; fsync and rename per file, then notify the server with `didChange` (Section 5.2, p. 9; Algorithm 2, p. 8).

The paper's interface rule is: "Mutating commands default to preview." (Section 4, p. 6). It cautions that per-file atomic replacement does not by itself provide crash atomicity for multi-file edits (Section 5.2, p. 9).

Verus form (inference)

Inference: Represent an edit set as a sequence of path-qualified hunks and specify a workspace-jail predicate. Prove that every applied path is under the normalized root, that conflict checks precede writes, and that dry-run leaves the workspace unchanged. Use `requires` for a clean-worktree policy or explicit override, and `ensures` for the resulting file contents and notification state. Multi-file crash atomicity requires a separate transactional model; the paper does not claim it.

evidence, limits, and assumptions

The safety envelope includes preview-by-default, jail, filters, clean-worktree guard, encoding detection, ambiguity evidence, staged validation, and Git-backed rollback (Section 5.2, p. 9). The paper describes these mechanisms but gives no measured failure rate or formal proof that every filesystem implementation honors them. Case-only renames on case-insensitive filesystems are rejected with `E/FS PERMISSIONS` (Section 5.2, p. 9). Multi-file application can still fail after individual file replacement, so rollback metadata and three-way Git application are needed.

## technique: RLCSF potential-based process reward

what it is and when to use it

Use the reward when terminal success is sparse but each tool step exposes deterministic diagnostics, selector confidence, and safety readiness. The reward is a shaping signal for planning, reinforcement learning, offline process supervision, and counterfactual evaluation; the paper explicitly says it is not a replacement for task success (Section 5, p. 7; Appendix E, p. 15).

how to do it

1. For each bundle Bₜ, record diagnostic count Dₜ over a fixed scope, safety readiness Sₜ∈[0,1], selector confidence Aₜ∈[0,1], and structured-error indicator Eₜ∈{0,1} (Section 5, p. 7).
2. Set non-negative weights and define `Φ(Bₜ)=−wD Dₜ + wS Sₜ + wA Aₜ` (Equation 5.1, p. 7).
3. Compute `rₜ = γΦ(Bₜ) − Φ(Bₜ₋₁) − wE Eₜ` (Equation 5.2, p. 7).
4. When γ=1, credit diagnostic reduction, safety improvement, and confidence improvement; subtract the structured tool-error penalty. Add the process reward to an external task reward if one exists (Section 5, p. 7).
5. Replay the same adjacent bundles and weights to recover the same reward without rerunning the server (Appendix E, p. 15).

The paper's worked example uses γ=1 and `(wD,wS,wA,wE)=(0.5,0.4,0.1,0.5)`: diagnostics fall from 5 to 2, safety rises 0 to 1, confidence 0.70 to 0.94, and no error occurs, giving `0.5·3 + 0.4·1 + 0.1·0.24 = 1.924` (Appendix E, p. 15). A conflict with unchanged diagnostics, safety, and confidence gives −0.5 under the same weights (Appendix E, p. 15).

Verus form (inference)

Inference: Encode the potential and reward as `spec fn`s over bundle records and prove the arithmetic proposition with `ensures`. For the non-negativity theorem, require equal diagnostic scope, non-negative weights, `Dₜ≤Dₜ₋₁`, `Sₜ≥Sₜ₋₁`, `Aₜ≥Aₜ₋₁`, and `Eₜ=0`; an `invariant` can preserve these relations across a planning loop. Keep γ and weights explicit because γ<1 changes the sign argument. Verify that scope changes zero the diagnostic component as specified; otherwise the reward can compare incomparable counts.

evidence, limits, and assumptions

Proposition 5.2 (p. 8) proves non-negativity only for γ=1, fixed non-negative weights, same diagnostic scope, componentwise improvement, and no structured error. The authors state that with `wE=0` and bundle features in the Markov state, the shaping term is standard potential-based shaping; with `wE>0`, the penalty is an explicit design choice that may change the optimal policy (Section 5, p. 7). Reward quality therefore depends on policy-set weights and feature definitions; the paper reports no downstream coding-agent task benchmark.

## what remains trusted and product threat (inference)

Inference: The trusted base includes the language server/compiler, parser, filesystem, canonicalizer, cryptographic hash, environment pinning, and reward implementation. The paper's formal statements are conditional on deterministic tool semantics and frozen snapshots; they do not verify Python programs, Rust ownership, unsafe code, or specification adequacy.

Inference: For VeruLaw, the most direct transfer is to emit deterministic proof diagnostics and counterexamples as bundles, gate edits with preview and workspace invariants, and use reward shaping only to guide search. The product threat is moderate: agents can be grounded in compiler facts, but a low diagnostic count can still reflect an incomplete or incorrect specification. A verified Verus checker and explicit trusted-kernel boundary remain necessary.

## what VL should not redo

The paper already specifies selector encodings, relocation scoring, canonical bundle hashing, preview/apply guardrails, reward equations, worked examples, and conditional proofs. Repeating a generic LSP wrapper would not add knowledge. New work should test these ideas on Verus diagnostics, proof-state counterexamples, and Rust-specific edits while measuring false confidence and trusted components.

## techniques for the catalog

- robust selector DSL — address code by symbolic, AST, anchor, or explicit-coordinate intent and resolve it with deterministic ranked evidence
- canonical Analysis Bundles — normalize tool responses, pin environment metadata, and hash stable fields for replay
- preview-first guarded mutation — preview edits, enforce jail and conflict policies, then apply only after explicit approval
- RLCSF reward shaping — convert diagnostic, safety, confidence, and error deltas into a replayable transition reward

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
