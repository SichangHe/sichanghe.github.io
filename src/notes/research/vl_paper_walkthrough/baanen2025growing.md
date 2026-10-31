# Growing Mathlib: maintenance of a large scale mathematical library
(authored by agents unless marked 🧑)
Tag: `baanen2025growing`, [paper](https://arxiv.org/abs/2508.21593v2)

## scope and result
The paper reports engineering practices for maintaining Lean Mathlib while it grows. Its stated scope is broad: "We describe various strategies to manage this growth, while allowing for change and avoiding maintainer overload." (abstract, p. 1). Mathlib had 1.9 million lines of code at the time of writing (Section 1, p. 1), and the paper describes deprecations, semantic linters, build-speed design, technical-debt tracking, review automation, and pull-request triage. The paper does not present a new soundness theorem; it presents operational mechanisms and reported build-performance changes.

### what the technique is
Mathlib keeps renamed declarations available for a grace period with a deprecation marker. The marker records the old-to-new connection and can include a custom migration message. The paper says, "When a declaration is renamed, for a grace period of several months, we add a deprecation marker documenting the rename." (Section 3, p. 4). For renamed files, the old module remains importable and a linter points to the replacement because import resolution happens before the deprecation linter (Section 3, p. 4).

### when to use it
Use this when an API or module name must change while downstream formalizations continue to build. The paper identifies renaming declarations, renaming files, and superficial syntax changes as the common adjustment cases (Section 3, pp. 3–4).

### steps in the paper
1. when a declaration is renamed, keep a deprecation marker connecting its old and new names for several months; a custom migration message can be provided (Section 3, p. 4)
2. warn users of the deprecated declaration and identify its replacement (Section 3, p. 4)
3. preserve the old module instead of erasing it and mark it for replacement warnings, so existing imports still build (Section 3, p. 4)
4. use a linter to suggest the renamed module or, for reorganized content, the old module’s direct imports (Section 3, p. 4)

### evidence and limits
The evidence is the authors' description of Mathlib's migration process; no controlled comparison or denominator is supplied for the number of migrations. The paper says that updates "still require manual work" although prototype replacement tools can automate deprecated declarations and modules (Conclusion, p. 17).

### what the technique is
Mathlib distinguishes syntax linters, which inspect each command as it is elaborated, from environment linters, which inspect declarations in the final environment. The paper states, "Environment linters are good for global validation (e.g. checking lemmas are in simp normal form), but only warn you after the fact. Syntax linters warn you right away and are best suited for local validation (e.g. the valid notation λ x => x is deprecated in favour of fun x 7→ x)." (Section 4, p. 5). At the stated snapshot, Mathlib had 26 syntax linters, 10 dependency syntax linters, and 17 environment linters (Section 4, p. 5).

The paper groups checks into deprecation, style, import structure, code pruning, tracking issues, maintainability/readability, and pedagogical suggestions (Sections 4–4.1, pp. 4–7). Examples include unused variables and tactics, restricted heartbeat options, import dependency checks, rigid tactics after flexible tactics, and explicit focusing of multiple side-goals.

### mechanisms in the paper
1. syntax linters run on commands and can access both syntax trees and fully elaborated information (Section 4, pp. 4–5)
2. environment linters run on the final environment and inspect its declarations; they also can access fully elaborated information (Section 4, pp. 4–5)
3. the deprecatedSyntax linter warns about deprecated syntax and identifies the preferred expression (Section 4, p. 5)
4. the setOption linter flags a file-wide heartbeat limit and suggests restricting it to a single declaration (Section 4, p. 6)

A concrete maintainability rule is the flexible linter. It tracks hypotheses and goals through a proof; after a flexible tactic changes a hypothesis or goal, a rigid tactic should not change that same hypothesis or goal because a newly added simplification lemma can alter the flexible tactic's result (Section 4.1, pp. 6–7). Normalizing flexible tactics such as `ring` and `omega` are exceptions: rigid tactics may follow them (Section 4.1, p. 7). The multiGoal linter requires a focusing dot after a tactic that creates multiple side-goals, making branch ownership explicit (Section 4.1, p. 7).

### evidence and limits
The paper reports counts of linters, not precision, recall, or prevented failures. Its claim is qualitative that linters provide direct feedback and reduce brittleness.

### benchmarking
Mathlib's Speedcenter builds and benchmarks every master commit. Measurements include wall-clock seconds, task-clock seconds, and instruction counts; a bot reports benchmark outliers of 5% or more (Section 5, p. 8). The paper states, "Continuous monitoring of build times is crucial to ensure no unexpected slowdowns occur." (Section 5, p. 8).

### typeclass and coercion design
The paper describes unbundling algebraic classes to reduce multiplicative search. One refactor produced a 20% decrease in typeclass inference time and a 6% overall compilation speedup (Section 5.1, p. 9). A coercion-hierarchy unbundling produced a 33% speedup for typeclass instance synthesis and a 19% decrease in build instructions (Section 5.2, p. 9). These percentages refer to the stated refactors and measured Lean builds; the paper does not give a trial count or confidence interval.

### definitional equality and tactics
Definitions should avoid unnecessary unfolding; marking a definition irreducible can skip an expensive equality check (Section 5.3, pp. 9–10). The `fast_instance` elaboration macro normalizes instance declarations; an initial implementation gave a 5% decrease in type-checking time and halved compilation times for many files (Section 5.3, p. 10). Mathlib spends approximately 14% of compilation time in `simp` and 7% invoking other tactics (Section 5.4, p. 10). Discrimination trees index rewrite lemmas, and replacing general Aesop-based tactics with simpler tactics such as `fun_prop` can reduce running time (Section 5.4, pp. 10–11).

## technical-debt accounting
The paper records porting notes, adaptation notes, and compatibility flags. A weekly CI script reports current totals and their change; each pull request receives the metrics in a summary comment (Section 6, pp. 11–12). The Lean 3-to-Lean 4 port produced over 5,000 porting notes; after processing over two thirds in early 2025, roughly 1,500 remained at writing (Section 6, p. 12). These are counts of notes in that migration, not proof failures or unique defects.

The paper warns that tracking can distort priorities: "When a measure becomes a target, it ceases to be a good measure." (Section 6, p. 13, invoking Goodhart’s Law). It supplements measured debt with a Zulip thread for less measurable technical and organizational debt (Section 6, p. 13).

## review and triage automation
Mathlib requires review before merge and uses bors to merge only approved, continuously passing changes (Section 7, pp. 13–14). Decentralized review lets contributors review style, documentation, and design; maintainers retain final approval. About one in three merged pull requests in the preceding year had reviewer approval before merging (Section 7, p. 14). The denominator is merged pull requests in that year; the paper gives no absolute count.

Automation labels new-content pull requests by area; experimental reviewer assignment uses declared expertise and capacity. It also creates a sticky summary showing renamed lemmas, transitive-import changes, and technical-debt deltas (Section 7.1, pp. 14–15). A triage dashboard caches GitHub GraphQL metadata, computes time in review from label history, and serves a static sortable webpage. The cache code is described as a few hundred lines of shell and Python; the entire project totals about 4,500 lines of Python and 1,000 lines of shell scripts, GraphQL schemas, and related files (Section 7.2, pp. 15–17).

## what is proved, measured, and trusted
The formal proofs in Mathlib are checked by Lean; the paper says a proof that compiles without `sorry`, intentional environment manipulation, or added axioms is correct and complete (Section 7, p. 13 and footnote 16). The maintenance mechanisms themselves are not proved correct in the paper. Benchmarks measure compiler time, instructions, and selected refactor effects; reviewer participation is reported as an observational proportion, while dashboard adoption is described qualitatively from a survey without a sample size or numerical results.

## techniques for the catalog
- deprecation bridge: retain renamed declarations or modules temporarily and warn users with a direct replacement
- semantic linting: run local syntax checks and global environment checks for style, dependencies, dead proof code, and brittle proof structure
- build-speed benchmark: track wall-clock, task-clock, and instruction changes continuously and flag a stated threshold
- hierarchy and elaboration design: reduce instance/coercion search and avoid unnecessary definitional unfolding
- technical-debt report: publish machine-readable debt counts and deltas in CI and pull-request summaries
- review triage dashboard: cache change history, compute actionable metadata, and provide sortable review queues
