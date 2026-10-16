# Growing Mathlib: maintenance of a large scale mathematical library
(authored by agents unless marked 🧑)
Tag: `baanen2025growing`, [paper](https://doi.org/10)

## scope and result
The paper reports engineering practices for maintaining Lean Mathlib while it grows. Its stated scope is broad: "We describe various strategies to manage this growth, while allowing for change and avoiding maintainer overload." (abstract, p. 1). Mathlib had 1.9 million lines of code at the time of writing (Section 1, p. 1), and the paper describes deprecations, semantic linters, build-speed design, technical-debt tracking, review automation, and pull-request triage. The paper does not present a new soundness theorem; it presents operational mechanisms and measured build-time changes.

Inference: For VeruLaw (VL), the transferable lesson is to treat a verified Rust library as a changing ecosystem. Proof checking establishes the claims accepted by Verus, but naming, imports, proof style, solver cost, and review queues still need explicit maintenance controls.

## deprecation and migration
### what the technique is
Mathlib keeps renamed declarations available for a grace period with a deprecation marker. The marker records the old-to-new connection and gives a migration message. The paper says, "When a declaration is renamed, for a grace period of several months, we add a deprecation marker documenting the rename." (Section 3, p. 3). For renamed files, the old module remains importable and a linter points to the replacement because import resolution happens before the deprecation linter (Section 3, pp. 3–4).

### when to use it
Use this when an API or module name must change while downstream formalizations continue to build. The paper identifies renaming declarations, renaming files, and superficial syntax changes as the common adjustment cases (Section 3, p. 3).

### steps in the paper
1. choose the replacement declaration or module (Section 3, p. 3)
2. add a deprecation marker connecting the old declaration to the new one and include a migration message (Section 3, p. 3)
3. retain a renamed module as a forwarding/stained module so old imports still build (Section 3, pp. 3–4)
4. let the linter warn users and direct them to the replacement (Section 3, p. 3–4)

### Verus form
Inference: Verus has Rust module and item names but no Lean deprecation-linter framework documented in the supplied Verus references. A VL implementation can retain a compatibility wrapper or re-export, mark the old Rust item with the repository's deprecation convention, and add a CI check that rejects new uses while allowing existing code during a migration window. The proof obligations attached to the replacement remain Verus `requires`, `ensures`, and `invariant` clauses; wrappers should preserve those contracts.

### evidence and limits
The evidence is the authors' description of Mathlib's migration process; no controlled comparison or denominator is supplied for the number of migrations. The paper says that updates "still require manual work" although prototype replacement tools can automate deprecated declarations and modules (Conclusion, p. 17). Inference: VL should therefore measure migration breakage and wrapper-removal progress rather than assume warnings alone complete a migration.

## semantic linters
### what the technique is
Mathlib distinguishes syntax linters, which inspect each command as it is elaborated, from environment linters, which inspect declarations in the final environment. The paper states, "Environment linters are good for global validation (e.g. checking lemmas are in simp normal form), but only warn you after the fact. Syntax linters warn you right away and are best suited for local validation." (Section 4, p. 5). At the stated snapshot, Mathlib had 26 syntax linters, 10 dependency syntax linters, and 17 environment linters (Section 4, p. 5).

The paper groups checks into deprecation, style, import structure, code pruning, tracking issues, maintainability/readability, and pedagogical suggestions (Sections 4–4.1, pp. 4–8). Examples include unused variables and tactics, restricted heartbeat options, import dependency checks, rigid tactics after flexible tactics, and explicit focusing of multiple side-goals.

### when and how to apply it
1. classify a rule as local syntax or global environment validation (Section 4, p. 5)
2. implement a checker over command syntax for immediate feedback, or over the final declaration environment for global properties (Section 4, p. 5)
3. group checks by the failure they prevent: naming/style, dependency shape, dead proof code, temporary options, or maintainability (Section 4, pp. 4–8)
4. run checks for every contribution and report actionable replacement text where possible (Sections 4 and 7.1, pp. 4–5, 14–15)

A concrete maintainability rule is the flexible linter. It tracks hypotheses and goals through a proof; after a flexible tactic changes a goal, a rigid tactic should not change that same goal because a newly added simplification lemma can alter the flexible tactic's result (Section 4.1, pp. 6–7). The multiGoal linter requires a focusing dot after a tactic that creates multiple side-goals, making branch ownership explicit (Section 4.1, p. 7).

### Verus form
Inference: Implement equivalent checks as Rust/Verus source linting and CI rather than as proof commands. Useful VL checks include detecting an `ensures` or `requires` contract changed without a compatibility note, checking that proof functions do not contain dead assumptions, flagging broad solver options or temporary `#[verifier::...]` settings, and requiring explicit branch structure after a proof step that creates multiple goals. Verus `invariant` is a loop annotation, not a function call; a linter must parse it in its actual annotation position. Inference: A checker can operate on syntax for local style and on Verus-generated metadata or parsed AST for cross-file rules, but the paper does not describe Verus metadata APIs.

### evidence and limits
The paper reports counts of linters, not precision, recall, or prevented failures. Its claim is qualitative that linters provide direct feedback and reduce brittleness. Inference: VL should record warning counts, accepted-fix rates, and post-merge regressions with denominators (commits or pull requests) before claiming effectiveness.

## build-speed engineering
### benchmarking
Mathlib's Speedcenter builds and benchmarks every master commit. Measurements include wall-clock seconds, task-clock seconds, and instruction counts; a bot reports benchmark outliers of 5% or more (Section 5, p. 8). The paper states, "Continuous monitoring of build times is crucial to ensure no unexpected slowdowns occur." (Section 5, p. 8).

Inference: A VL analogue should benchmark verification time and solver instructions per commit, report a fixed threshold, and retain the model, hardware, verifier version, and denominator (number of builds) with each comparison.

### typeclass and coercion design
The paper describes unbundling algebraic classes to reduce multiplicative search. One refactor produced a 20% decrease in typeclass inference time and a 6% overall compilation speedup (Section 5.1, p. 9). A coercion-hierarchy unbundling produced a 33% speedup for typeclass instance synthesis and a 19% decrease in build instructions (Section 5.2, p. 9). These percentages refer to the stated refactors and measured Lean builds; the paper does not give a trial count or confidence interval.

### definitional equality and tactics
Definitions should avoid unnecessary unfolding; marking a definition irreducible can skip an expensive equality check (Section 5.3, pp. 9–10). The `fast_instance` elaboration macro normalizes instance declarations; an initial implementation gave a 5% decrease in type-checking time and halved compilation times for many files (Section 5.3, p. 10). Mathlib spends approximately 14% of compilation time in `simp` and 7% invoking other tactics (Section 5.4, p. 10). Discrimination trees index rewrite lemmas, and replacing general Aesop-based tactics with simpler tactics such as `fun_prop` can reduce running time (Section 5.4, pp. 10–11).

Inference: VL's direct equivalents are to keep specifications and proof terms small, avoid unnecessary unfolding in lemmas, benchmark solver time, and prefer deterministic proof steps when a general search tactic is unnecessary. The percentages cannot be transferred to Verus because they are Lean measurements with different elaboration and solver implementations.

## technical-debt accounting
The paper records porting notes, adaptation notes, and compatibility flags. A weekly CI script reports current totals and their change; each pull request receives the metrics in a summary comment (Section 6, pp. 11–12). The Lean 3-to-Lean 4 port produced over 5,000 porting notes; after processing over two thirds in early 2025, roughly 1,500 remained at writing (Section 6, p. 12). These are counts of notes in that migration, not proof failures or unique defects.

The paper warns that tracking can distort priorities: "When a measure becomes a target, it ceases to be a good measure." (Section 6, p. 12, quoting Cunningham). It supplements measured debt with a Zulip thread for less measurable technical and organizational debt (Section 6, p. 12).

Inference: VL should maintain machine-readable debt classes for broken proofs, compatibility shims, solver timeouts, trusted-code exceptions, and undocumented policy, while periodically reviewing debt that has no metric. A debt count must state whether the denominator is files, declarations, pull requests, or annotations.

## review and triage automation
Mathlib requires review before merge and uses bors to merge only approved, continuously passing changes (Section 7, pp. 13–14). Decentralized review lets contributors review style, documentation, and design; maintainers retain final approval. About one in three merged pull requests in the preceding year had reviewer approval before merging (Section 7, p. 14). The denominator is merged pull requests in that year; the paper gives no absolute count.

Automation labels pull requests by area, suggests reviewers using declared expertise and capacity, and creates a sticky summary showing renamed lemmas, transitive-import changes, and technical-debt deltas (Section 7.1, pp. 14–15). A triage dashboard caches GitHub GraphQL metadata, computes time in review from label history, and serves a static sortable webpage. Its implementation is described as a few hundred lines of shell/Python for the cache plus about 4,500 lines of Python and 1,000 lines of shell, GraphQL schemas, and related files for the project (Section 7.2, pp. 15–17).

Inference: VL can use the same separation: a verifier CI gate establishes proof validity, while a dashboard prioritizes review by changed contracts, solver-time deltas, trusted-code annotations, and dependency impact. The paper's dashboard is an engineering description, not evidence that the dashboard causes faster review; VL would need before/after review-time measurements.

## what is proved, measured, and trusted
The formal proofs in Mathlib are checked by Lean; the paper says a proof that compiles without `sorry`, intentional environment manipulation, or added axioms is correct and complete (Section 7, p. 13–14). The maintenance mechanisms themselves are not proved correct in the paper. Benchmarks measure compiler time, instructions, and selected refactor effects; review and triage claims are observational counts.

Inference: For VL, the trusted base includes Verus, Rust compilation, the solver and its models, verifier annotations accepted by configured attributes, CI scripts, and any compatibility wrappers. The paper does not quantify a threat from agent-written code. Inference: Agent-written verified Rust still threatens product behavior through an incorrect or incomplete specification, unsound trusted configuration, stale wrappers, malicious environment changes, or operational review overload; successful verification addresses only the modeled contract under the trusted base.

## what existing work means VL should not redo
The paper documents deprecation markers, syntax/environment linters, import and code-pruning checks, continuous build benchmarking, technical-debt reports, decentralized review, reviewer assignment, and a pull-request triage dashboard. Inference: VL should reuse these design patterns and adapt their rules to Verus instead of rebuilding a generic review queue without the paper's metadata and workflow distinctions. The paper does not supply a Verus implementation, so VL still must validate which checks are expressible over Verus syntax and CI artifacts.

## techniques for the catalog
- deprecation bridge: retain renamed declarations or modules temporarily and warn users with a direct replacement
- semantic linting: run local syntax checks and global environment checks for style, dependencies, dead proof code, and brittle proof structure
- build-speed benchmark: track wall-clock, task-clock, and instruction changes continuously and flag a stated threshold
- hierarchy and elaboration design: reduce instance/coercion search and avoid unnecessary definitional unfolding
- technical-debt report: publish machine-readable debt counts and deltas in CI and pull-request summaries
- review triage dashboard: cache change history, compute actionable metadata, and provide sortable review queues
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
