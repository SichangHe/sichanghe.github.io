# Automatic Textbook Formalization
(authored by agents unless marked 🧑)
Tag: `gloeckle2026automatic`, [paper](https://doi.org/10.1145/3573105.3575688)

This case study formalized a 500-page graduate algebraic-combinatorics textbook in Lean with a multi-agent software-engineering workflow. The result contains about 130,000 Lean lines and 5,900 declarations; 340 designated theorem/definition targets were all proved in one week (§3.3, p.6). The abstract states, “The formalization comprises 130K lines of code and 5900 Lean declarations and was conducted within one week by a total of 30K Claude 4.5 Opus agents collaborating in parallel on a shared code base via version control” (Abstract, p.1). These are Lean engineering results, not evidence that agent-written Rust/Verus can formalize arbitrary systems.

## technique: define measurable targets and avoid contamination

The authors designate 340 definitions and theorems in the source as targets, excluding exercises and cited results (§3.2, p.6). This turns progress into coverage rather than agent activity. They selected a textbook largely disjoint from Mathlib and ran agents without internet access to reduce copying; where overlap existed, reuse was allowed (§3.1, pp.5–6). Steps: choose a source with complete proofs and manageable dependencies; mark target statements; explicitly exclude exercises and incidental citations; check repository/library overlap; record which targets are proved. Inference: a VL project should similarly enumerate Rust functions, contracts, and invariants and separate target verification from auxiliary infrastructure. Inference: target lists prevent an agent from claiming success by proving unrelated helper lemmas.

The paper warns that proof assistants reduce trust to “a small and tightly validated proof checker kernel, and a few dozen lines of manually reviewed definitions and final theorem statements per publication” (Introduction, p.2). That sentence describes the intended trust reduction, not a measured guarantee for this experiment. Inference: Verus still leaves specification correctness, external code, solver behavior, and compilation in the trusted base, so a target list must include review of contracts themselves.

## technique: sketch then prove

An initial decomposition experiment gave one agent a chapter and asked it to create all definitions and theorem statements, then launched one prover subagent per theorem. The authors report that this “proved unable to scale beyond simple preprints or book chapters because of its limited context handling” (§2.3, p.3). The scalable workflow retains the separation but moves to a repository-level collaboration. Sketcher agents receive a source chunk and create definitions and theorem statements with `sorry`; prover agents fill proofs and may escalate statement or dependency problems (§2.4, p.4).

Steps from the method: assign a chapter-sized source chunk to a sketcher; emit formal declarations with proof holes; assign each missing proof to a prover; allow the prover to file a blocker or repair a statement/helper; compile and test on the branch. Inference: for Verus, a sketcher can write Rust signatures, `requires`, `ensures`, and data-model definitions, leaving proof functions and invariants for prover agents. Lean `sorry` is only a staging placeholder; Verus proof code must ultimately satisfy the verifier, and executable code must remain well-typed Rust.

## technique: repository-level roles and short-lived branches

The authors adopt git, trunk-based development, and short-lived feature branches because single-file decomposition does not scale. They state, “The features are supposed to be as small and self-contained as possible to enable fast reviewing by reviewer agents and integration into the main branch” (§2.4, p.4). Roles are explicit: sketcher, prover, reviewer, maintainer, triage, scan, and progress agents. Each worktree shares the Mathlib installation; branches contain only repository files and build artifacts (§2.4, p.4).

Apply it as follows: create a target assignment; have one agent make a small branch; run a build; open a pull request; run independent math and engineering reviews; merge only after both approve and the branch merges cleanly. Reviewer outcomes are approval, requested changes, or rejection (§2.4, p.4). Inference: a Verus repository can use the same branch and review discipline, with `verus` verification in continuous integration. The paper does not establish an optimal branch size or concurrency level.

## technique: independent mathematical and engineering review

Review is split to catch different failures. Mathematical review checks whether statements match the source; engineering review checks conventions, naming, documentation, API design, and buildability (§2.4, p.4). A pull request is mergeable only if it builds, merges without conflicts, and both reviews approve. This is a practical separation between semantic fidelity and code quality. Inference: for VL, semantic review should compare Rust/Verus contracts to the intended systems behavior, while engineering review checks ownership, module boundaries, proof maintainability, and CI reproducibility. A passing verifier alone cannot perform the first review.

## technique: issue-tracker escalation and maintainers

Agents communicate through files in an issue-tracker directory. Provers can file blockers, such as missing helpers, statement errors, or ordering problems; maintainers resolve cross-file refactors and global issues. Examples include replacing a proof strategy, refactoring duplicate definitions, avoiding false subgoals, replacing a placeholder definition, and transferring a proof to a finer-grained object (§1, p.3). The paper says, “Shared files provide a direct, simple and universal communication protocol for agents without the need for bespoke solutions for message passing” (§1, p.3).

Steps: when blocked, write a concrete issue describing the failing target, dependency, evidence, and next action; let triage prioritize it; assign a maintainer; review and merge the fix; requeue the blocked prover. Inference: this maps directly to VL when an invariant depends on an unmodeled state transition or an external-library contract. The file protocol is an orchestration choice, not a Verus feature.

## technique: global coherence controls

The case exposed coherence failures that local proof success cannot detect. An N-partition type was defined three times; Bender–Knuth involutions were implemented inconsistently, including a wrong direction and a shortcut that ignored matching conditions (§4.1, pp.10–11). Provers could prove lemmas against a broken definition, while false lemmas triggered local comments without a global repair. Rabbit holes caused agents to formalize cited theories such as Pfaffians instead of target statements; a single unbatched merge queue became a bottleneck (§4.2, p.11).

The authors recommend status agents that inspect target coverage, `sorry` occurrences, dependencies, and global proof strategy, then create issues and a summary for resumption (§4.3, p.12). They tune freedom over project time: more parallelism early, tighter prompts and harmonization near release, described as “simulated annealing” (§4.3, p.12). Inference: VL should run duplicate-definition checks, dependency-cycle checks, and contract-consistency audits before accepting locally verified Rust. Inference: a Verus proof of a wrong model is exactly the failure mode this workflow documents.

## evidence, cost, and trust boundaries

Table 1 reports 340 targets, 52 Lean files, about 130,000 lines, about 5,900 declarations, and about 3,300 successful agents (p.3). Table 2 reports 30,046 total agents, 83,176 million input tokens, and 561.2 million output tokens (p.7). The formalization used 83 billion input tokens including repeated multi-turn context and 561 million output tokens. Without caching the authors estimate $430K; a back-of-the-envelope cached estimate is about $100K, including $14K output (§3.5, p.8). These are estimates, not invoices; the paper explicitly says token-caching logs were unavailable. The authors believe 3–10× lower cost is possible after orchestration fixes (§3.5, p.9).

All 340 designated targets were present and proved, but the authors only manually spot-checked key statements and say individual semantic mistranslations may remain (§3.3, p.7). Trust includes Lean's kernel/compiler, Mathlib, source definitions, review agents, and the correctness of the target selection. The study does not measure proof correctness against an independently formalized specification, executable performance, or Verus. Inference: threat to a product generating verified Rust is high at the modeling and coordination layers: duplicated or placeholder definitions can make downstream proofs pass while behavior is wrong. What VL should not redo is the basic role split, PR review, and file-based blocker protocol; new work should test them on Rust/Verus systems and quantify semantic bugs caught.

## techniques for the catalog

- target accounting and contamination control — enumerate source targets, exclude incidental work, and choose inputs that limit copied formalization

- sketch/prove decomposition — create declarations first and assign proof holes to specialized prover agents

- repository collaboration — use short-lived branches, build checks, pull requests, and a merge queue for small changes

- dual review — independently review mathematical fidelity and engineering quality before merge

- issue escalation — record blockers as files and use maintainer and triage roles for cross-file fixes

- coherence steering — audit duplicates, dependencies, rabbit holes, and global contracts while tightening orchestration near release
Checked 2026-10-14 against the paper by a Codex agent: audit record gloeckle2026automatic; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
