# Formal Conjectures: An Open and Evolving Benchmark for Verified Discovery in Mathematics
(authored by agents unless marked 🧑)
Tag: `firsching2026formalconjectures`, [paper](http://arxiv.org/abs/2605.13171v1)


## purpose and result

Formal Conjectures is an open Lean 4 repository and benchmark for research-level mathematical proof discovery and proof autoformalization. The release contains 2,615 statements: 1,029 research-open conjectures, 836 research-solved problems, and 750 test, API, or textbook statements (Abstract, PDF p.1; Figure 1, p.2). Its key design is to keep open problems public while preventing known solutions from defining the discovery task. The authors state: “A proposed solution is definitively correct if and only if its corresponding proof is accepted by the kernel without relying on forbidden axioms like sorry” (Introduction, PDF p.2).

Inference: VL can adapt this as a public, versioned corpus of unsolved Verus obligations and solved contract-repair tasks. Lean’s kernel and Mathlib are different from Verus and vstd, so the reported rates do not transfer directly.

## technique 1: split discovery from autoformalization

What it is. The benchmark has a primary track for proving open research conjectures and a secondary track for formalizing known mathematics. Open statements have no proof at release time, giving a zero-contamination signal; solved statements test translation of an existing informal argument. The paper describes the primary goal as “Measuring AI’s ability to discover formal proofs for open problems” and the secondary goal as formalizing established mathematics (Section 4.1, PDF p.7).

How to apply it. (1) Collect research questions with no known formal solution. (2) Encode them as Lean statements with `sorry` placeholders. (3) Keep solved variants and known informal proofs in a separate category. (4) Evaluate proof discovery on the open category and autoformalization on the solved category. (5) When an open problem is solved, reclassify it as research-solved in a later release and attach the proof. (6) Never treat a proof of a misformalized statement as a discovery of the intended problem.

Verus form. Inference: maintain `research_open` tasks whose `proof fn` bodies are absent, and `research_solved` tasks with reviewed contracts and proof bodies. A solved track can ask an agent to translate an informal safety argument into Verus. Open tasks must undergo human contract review before being called discoveries.

Evidence. FC100OpenSet1 and FC100SolvedSet1 each contain 100 statements sampled from a frozen release (Section 4.1, PDF p.7). On FC100SolvedSet1, AlphaProof solves 45% with 1,000 simulations and 50% with 16,000, while a development DeepMind prover agent solves 66% (Table 2, PDF p.8). FC100OpenSet1 remains at a 0% baseline by definition. These percentages are over 100 problems, so the denominators are explicit.

## technique 2: answer(sorry) for unknown answers

What it is. Some problems ask for a number, function, or set as well as a proof. The custom `answer(sorry)` elaborator separates finding the answer from proving it correct. For an unknown truth value, the solver replaces the placeholder with True or False. The paper says: “The construct also handles unknown truth values: when answer(sorry) appears in a biconditional, a solver replaces it with True or False to conjecture or refute a proposition” (Section 3.2, PDF p.5).

How to apply it. (1) State the property and the answer type. (2) Put `answer(sorry)` where the unknown value belongs. (3) Require the solver to substitute a concrete value or proposition. (4) Compile the substitution and prove the resulting obligation. (5) Record whether failure came from answer discovery or proof verification.

Verus form. Inference: represent an unknown parameter as a Rust ghost value or an explicit specification variable, then require a candidate witness and a proof of its postcondition. Inference: Verus does not provide this Lean elaborator; a task runner must generate separate “find witness” and “verify witness” jobs, with the witness treated as untrusted input until proved.

Evidence and limits. `answer(sorry)` supports mathematical questions whose result is not known in advance, but the placeholder itself is not a proof. The paper’s formal benchmark still relies on kernel acceptance after replacement. Inference: for VL, an agent selecting an overly strong contract could make witness discovery trivial while proving the wrong requirement, so the requirement must be reviewed independently.

## technique 3: external proof links with @[formal_proof]

What it is. To keep the repository lightweight, statements are separated from proof storage through the `@[formal_proof]` attribute. It records proofs in three modes: `formal_conjectures` (a commit that fills the repository’s `sorry`), `lean4` (an equivalent proof elsewhere), and `other_system` (Isabelle, Rocq, or another system) (Section 3.2, PDF p.5).

How to apply it. (1) Keep the canonical statement in the benchmark. (2) Store or link a proof at a pinned commit. (3) Record the proof system and source URL or repository. (4) Compile linked proofs when possible. (5) Report “proved in repository,” “linked proof,” and “with proof” separately. (6) Warn when a research-open statement receives a proof link, because classification may need revision.

Verus form. Inference: use a metadata attribute or manifest entry containing Verus commit, Rust toolchain, vstd revision, and proof artifact path. The statement crate remains small; proof crates can be external but must be reproducibly checked.

Evidence. Table 1 reports 836 research-solved statements, of which 44 (5.3%) have proofs in the repository and 101 (12.1%) have linked proofs, for 145 (17.3%) with either kind (PDF p.8). The totals are denominated by the 836 research-solved statements; the all-category total is 1,586 statements with 726 (45.8%) having a proof. These are coverage measures, not model solve rates.

## technique 4: misformalization taxonomy and repair loop

What it is. A misformalization is an incorrect formal statement. The taxonomy distinguishes Translation errors (formalization only), Underspecified errors (informal text lacks needed detail), and Source errors (informal text itself is not intended). It further divides them into syntactic, semantic, misrepresentation, implicit-convention, reporting, and mathematical error types (Section 3.3, PDF pp.5–6). The paper reports 291 fixes, with misrepresentation 48% and semantic 35% the most common categories (p.6).

How to apply it. (1) Compare the formal statement with the informal source. (2) Classify the discrepancy by level and subtype. (3) Add missing hypotheses or repair definitions. (4) Add a regression test. (5) Record a code diff and source evidence. (6) If an AI proof exposes a discrepancy, inspect the proof before deciding whether the theorem or the source is wrong. The Erdős Problem 978 example shows an informal sentence gaining explicit hypotheses after repeated formalization attempts (Section 3.3, p.6).

Verus form. Inference: classify a Rust specification mismatch as translation (wrong predicate or type), underspecified (missing precondition or environment assumption), or source (the product requirement is wrong). Keep the original requirement and revised contract linked so a passing proof cannot erase the history.

Evidence and trust. Every contribution receives human review by Lean experts and relevant domain experts. The review process also uses LLM cross-checks and AlphaProof runs, but the authors still require manual inspection. The 291 repaired cases are repository observations, not a measured model error rate. Inference: this taxonomy is directly useful for VL because a Verus proof can be valid while its `requires`/`ensures` contract is incomplete.

## technique 5: test-based definitions and prover auditing

What it is. New definitions should ship with proven test lemmas and API statements for expected behavior and edge cases. Automated theorem provers attempt proofs and disproofs across the repository; suspicious successes or failures trigger review. The paper reports 467 test statements and 155 API statements, 23.8% of the repository, in bench-v1-lean4.27.0 (Section 3.4, PDF p.6).

How to apply it. (1) Add a definition. (2) Write small examples and API lemmas expressing expected behavior. (3) Prove them with the kernel or `decide` where appropriate. (4) Run automated proof and disproof attempts across the definition and related statements. (5) Manually inspect counterexamples and unexpected proofs. (6) Run metadata linters for category, subject, answer placeholders, and documentation.

Verus form. Inference: every new Verus abstraction should include executable tests plus proof lemmas for boundary cases, ownership behavior, and contract composition. Use runtime tests to catch implementation errors and Verus proofs to catch specification errors; neither subsumes the other.

Evidence and limits. The test/API counts are denominated by all statements in the cited release, while the paper does not claim that every edge case is covered. Automated auditing can expose errors across categories, but it depends on prover search and human inspection. Inference: a product should preserve failing counterexamples as regression artifacts rather than only fixing the current proof.

## technique 6: frozen subsets and living versioned releases

What it is. The repository evolves, so it publishes immutable snapshots named `bench-vN-lean4.X.Y`. The bench version fixes the problem set; the Lean suffix fixes the Mathlib and toolchain version. Misformalization fixes are never patched into an old snapshot; they appear in the next version. The paper states: “To preserve baselines, snapshots are immutable; misformalization fixes are never patched into existing versions but incorporated into the next” (Section 4.1, PDF p.7).

How to apply it. (1) Freeze a release with exact statement files and dependencies. (2) Create fixed evaluation subsets that import exactly their target statements. (3) Pin compiler and library versions. (4) Publish baseline results with numerator, denominator, and compute budget. (5) Add new or corrected statements only in a new release. (6) Keep the living repository for discovery while using frozen subsets for comparisons.

Verus form. Inference: tag a Verus commit, Rust toolchain, vstd, solver, and dependency lockfile together. Frozen subsets should compile in CI across the supported toolchain. A corrected contract must produce a new benchmark version so historical scores remain meaningful.

Evidence. FC100SolvedSet1 and FC100OpenSet1 each have exactly 100 statements and compile across supported Lean versions (Section 4.1, p.7). AlphaProof’s 45% and 50% results use 1,000 and 16,000 tree-search simulations per problem, respectively; the DeepMind agent’s 66% is a different system (Section 4.2, p.8). The compute settings and denominators matter when comparing scores.

## what is proved, measured, and trusted

A solution is counted only when accepted by the Lean kernel without forbidden axioms such as `sorry`; this verifies the formal statement, not its correspondence to informal intent. Trusted components include the kernel, Mathlib and dependencies, statement formalizers, human reviewers, metadata, and external proof links. The paper acknowledges residual risks from kernel bugs, unintended axioms, source selection bias, and future contamination of once-open problems (Limitations, PDF p.9).

Inference: the threat to a product of agent-written verified Rust is high for specification quality and medium for proof discovery. Formal Conjectures demonstrates that public, evolving tasks can expose genuine reasoning gaps while its misformalization pipeline shows why contract review is indispensable. VL should not redo frozen-subset design, kernel-gated scoring, or basic proof-link metadata. It should adapt the taxonomy, test/API statements, open-versus-solved split, and immutable versioning to Verus contracts and systems properties.

## techniques for the catalog

- open/solved split — separate zero-contamination proof discovery from autoformalization of known arguments
- answer placeholder — decouple finding a concrete answer from proving the resulting obligation
- external proof metadata — link proofs by system and pinned source without bloating the statement repository
- misformalization taxonomy — classify translation, underspecification, and source errors with repair evidence
- test/API definition checks — add proven edge-case statements and run automated proof/disproof audits
- frozen benchmark snapshots — pin statements and toolchains while evolving a separate living repository
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
