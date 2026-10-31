# Rust’s Type Checker Implementation Is Unsound: An Empirical Study on Soundness Bugs in rustc
(authored by agents unless marked 🧑)
Tag: `sim2026rustc`, [paper](http://arxiv.org/abs/2608.28713v1)

## scope and findings

Sim, Ryu, and Hong study soundness issues in the Rust compiler's type checker. They collect reports from the rustc GitHub tracker, classify the accepted programs that should have been rejected, test candidate oracles, and audit the language documentation. The abstract states: “rustc, the official Rust compiler, is not immune to defects; it contains soundness bugs, where the compiler accepts programs that should be rejected during type checking.” (Abstract, p. 1)

The final dataset has 30 issues from January 1, 2022 through September 1, 2025. The five affected-feature categories are lifetimes, traits, type inference, type well-formedness, and type casts (Table 1, p. 7). The four consequences are memory bug, breaking change, inconsistency, and misleading behavior (Table 2, p. 7). The study finds 11/30 memory-bug issues, 17/30 inconsistency issues, 1/30 breaking-change issue, and 1/30 misleading issue (Table 5, p. 13). This is an empirical characterization, not a proof that the compiler or the collected taxonomy is complete.

## technique 1: reproducible collection and filtering of soundness issues

what it is: combine GitHub-label filtering, manual code inspection, duplicate analysis, and comparison with a prior dataset to construct a defensible corpus of soundness bugs.

when to use: use this workflow when a compiler or verifier has many issue reports but no curated soundness benchmark. It is useful for selecting stable language features and retaining a clear acceptance/rejection oracle.

how to do it:

1. query rustc issues with the 14 type-related area labels, producing 969 candidates (Section 3, p. 6)
2. retain only issues marked `C-bug` or `I-unsound`; remove documentation/tool, diagnostics, crash/performance, non-bug, and feature-gated labels, producing 320 issues (Section 3, p. 6)
3. manually keep an issue only when it contains Rust code the reporter says should be rejected and the behavior is caused by the compiler, producing 27 issues (Section 3, p. 6)
4. remove four duplicates within the collected set and retain two older duplicates for comparison, producing 23 unique issues (Section 3, p. 6)
5. compare with Liu et al.'s 22-issue dataset, manually inspect nine relevant exclusions, and add seven qualifying reports to reach 30 (Section 3, pp. 6–7)

Verus form. Inference: use each corpus snippet as a negative test for a Verus/Rust front end: the compiler should reject the unsound source, while a trusted reference checker or reviewed semantic predicate explains why. Inference: ordinary Verus contracts cannot test rustc's type-checker implementation directly; the experiment needs compiler differential tests, Miri/ASan execution, or a mechanized type-system oracle. Inference: keep issue metadata (feature, trigger, consequence, status, compiler version) beside each test so an agent cannot silently drop a failing case.

evidence and limits: the 30-item corpus is manually manageable, and the authors say all were studied in depth, but they warn that label-based filtering and the requirement for a clear rejection snippet can miss issues (Threats to Validity, pp. 18–19). Feature-gated issues are excluded from the main corpus; 10 of 223 excluded `F-` issues also had `I-unsound`, showing that this scope choice matters (p. 19).

## technique 2: classify each issue across feature, symptom, consequence, trigger, consensus, and lifecycle

what it is: analyze every issue using a fixed multidimensional record rather than only a bug label. A symptom describes how the feature is mishandled; a consequence records what bad behavior follows; triggers identify interacting language features; status records whether the issue is fixed, confirmed, reported, or non-bug (Sections 3–4, pp. 6–12).

when to use: use this for prioritizing testing and formalization work. The dimensions reveal interactions that a single “lifetime bug” or “trait bug” label hides.

how to do it:

1. assign one affected feature and one symptom from Table 1, such as missing lifetime checks, overlapping implementations, arbitrary hidden type selection, or missing well-formedness checks (Section 4, p. 7)
2. assign one or more triggers from the 14-feature list: implied bounds, associated types, impl traits, RPITs, trait objects, higher-rank polymorphism, associated constants, function pointers, closures, recursion, asynchrony, try propagation, arrays, and enums (Section 4, p. 7)
3. classify the consequence using the four Table 2 meanings (Section 4, p. 7)
4. determine status by checking the issue discussion and whether the latest compiler rejects the snippet; “Fixed” specifically means rustc 1.93.0 rejects it, regardless of GitHub closure status (Table 3, p. 7)
5. preserve a minimal reproducer and inspect the interaction that lets the accepted program violate the intended rule; Listings 1–11 show representative lifetime, trait, inference, well-formedness, and cast cases (Sections 4.1–4.5, pp. 8–12)

Verus form. Inference: represent each trigger and consequence as a reviewed `spec fn` predicate over types, lifetimes, trait implementations, or ghost ownership state. Use `requires` to state well-formedness and lifetime assumptions and `ensures` to state that a transition preserves them; use `proof fn` lemmas for interactions such as associated-type projection plus a trait bound. Inference: Verus's Rust subset does not automatically model rustc's inference algorithm, dyn-compatibility rules, or all trait-object behavior, so these records should guide a separate oracle rather than be translated as if they were executable Verus properties.

evidence: associated types trigger 15/30 issues, implied bounds 7/30, RPITs 7/30, and higher-rank polymorphism 5/30 (Table 6, p. 14). Lifetimes affect 15/30, traits 7/30, and type inference 6/30 (Table 5, p. 13). All 7 issues involving implied bounds and all 6 involving trait objects lead to memory bugs in this corpus (Finding 5, p. 14); these are corpus counts, not population rates.

limits: the authors caution that frequent features may simply be more exposed, so the counts do not show disproportionate defect rates (p. 14). A status of “reported” means open and not fixed or confirmed; it is not evidence that the report is false.

## technique 3: lifecycle testing across rustc releases

what it is: compile every reproducer across compiler versions to measure when it first becomes testable, when the bug is introduced, when it is discovered, and when it is fixed. The earliest testable version is one where the prior version rejects the code as unstable and the selected version accepts the relevant feature (Section 5.4, p. 15).

how to do it:

1. identify stable or nightly releases in which each snippet can be tested; use nightly for issues not reproducible on stable (Section 5.4, p. 15)
2. find the earliest release where the feature is accepted and the soundness behavior appears (Section 5.4, p. 15)
3. use the GitHub issue creation date as discovery date, with earlier duplicate reports substituted where needed (Section 5.4, p. 15)
4. test the latest release to decide fixed status and calculate durations in days (Sections 4 and 5.4, pp. 7, 15)

Verus form. Inference: run a Verus proof corpus against pinned toolchain revisions and record the first revision that verifies, fails, or changes semantics. Store contracts and proof artifacts with the compiler revision; require a clean `verus` run after upgrades. Inference: a passing proof across versions does not prove rustc soundness, but a new acceptance of an invalid negative test is a release-blocking signal.

evidence: across 30 issues, introduction-to-discovery averages 1,291 days, with a 3,552-day maximum; for the 18 fixed issues, discovery-to-fix averages 324 days and reaches 855 days maximum (Table 8, p. 15). Seven issues were introduced simultaneously with feature stabilization (Finding 8, p. 16). The authors infer that rare interactions and silent acceptance make soundness bugs hard to notice (Finding 7, p. 16).

limits: lifecycle dates depend on reproducibility and issue-report dates; they do not measure developer effort. Two issues are not reproducible on stable releases and two are duplicates of much older reports, requiring special handling (Section 5.4, p. 15).

## technique 4: use AddressSanitizer and Miri as execution oracles

what it is: run accepted programs under AddressSanitizer and Miri to determine whether a compiler soundness bug manifests as runtime undefined behavior. AddressSanitizer instruments memory accesses; Miri interprets Rust and detects undefined behavior (Section 6.1.1, p. 16).

when to use: use these tools after rustc accepts a reproducer, when the suspected consequence is a memory bug. They complement, rather than replace, a type-soundness oracle.

how to do it:

1. select accepted snippets classified as memory-bug consequences (11 in the corpus)
2. compile/run each under AddressSanitizer and under Miri (Section 6.1.1, p. 16)
3. record whether each detects the invalid execution; retain the source snippet and tool output as evidence
4. do not treat a clean run as evidence that the type checker was sound, because non-memory inconsistencies are outside both tools' scope (Section 6.1.1, p. 16)

Verus form. Inference: use Miri/ASan as runtime checks around unsafe or FFI wrappers, while Verus proves the wrapper's reviewed `requires`/`ensures`. Inference: a Verus proof does not replace execution oracles for undefined behavior in compiler-generated code, and a Miri finding does not identify which type rule rustc violated. Keep both results in a regression record.

evidence: AddressSanitizer and Miri detected memory bugs in all 11/11 memory-bug issues tested (Section 6.1.1, p. 16). The denominator is the corpus's 11 issues classified as memory bugs, not all 30 soundness issues.

limits: the tools cannot detect soundness bugs that yield only inconsistency, breaking changes, or misleading behavior (Section 6.1.1, p. 16). Their result also depends on reaching the faulty execution path.

## technique 5: differential trait-oracle testing with Chalk

what it is: feed trait-related reproducers to Chalk, an experimental logic-based trait solver, and compare its decision with rustc's. Chalk models declarations as logical predicates and checks overlap, orphan rules, and trait implementation (Section 6.1.2, p. 16).

how to do it:

1. select the seven trait-affecting issues in the corpus (Section 6.1.2, p. 16)
2. encode each reproducer in Chalk 0.104.0 and ask whether the trait obligations are valid
3. compare acceptance/rejection with rustc and classify crashes, wrong diagnostics, and unsupported syntax separately
4. treat correct rejection as oracle evidence only for the feature Chalk actually models (Section 6.1.2, p. 16)

Verus form. Inference: a Verus project can use a separate trait-model oracle to check ghost predicates for impl overlap and associated-type uniqueness. Verus `spec fn`, `requires`, `ensures`, and `proof fn` can state the intended relation, but Verus does not turn Chalk into a trusted backend. Inference: run both tools and flag disagreement; never weaken a Verus contract to match an accepting compiler.

evidence: Chalk correctly identified the orphan impl in Issue 99554 and dyn-compatibility violation in Issue 126079; it rejected Issue 105787 with the wrong reason, crashed on Issue 114061, and accepted Issues 114389 and 133361. It could not express Issue 106040 because associated types with bounds in impls are unsupported (Section 6.1.2, p. 16). Thus only 2/7 were cleanly correct, 1/7 had a wrong diagnostic, 1/7 crashed, 2/7 were accepted, and 1/7 was inexpressible; these counts use the seven trait-affecting issues.

limits: Chalk is trait-only and immature. Extending it to unrelated type-system features is outside the paper's recommendation (Section 6.1.2, p. 17).

## technique 6: executable type-model oracle with a-mir-formality

what it is: translate selected Rust snippets into a-mir-formality's executable formal model and compare its accept/reject decision with rustc. The tool uses its own syntax and MiniRust-like function bodies (Section 6.1.3, p. 17).

how to do it:

1. manually rewrite each candidate into a-mir-formality syntax; Listing 12 shows crates and `ty` type parameters for Issue 99554 (Section 6.1.3, p. 17)
2. record unsupported constructs before interpreting a result; the tested commit lacks implied bounds, impl traits, trait objects, function pointers, closures, async, arrays, casts, and surface `?` (Section 6.1.3, p. 17)
3. run the five expressible issue snippets and compare decisions with rustc
4. use disagreement to guide model and compiler fixes, but do not generalize from unsupported features (Section 6.1.3, p. 17)

Verus form. Inference: use a small ghost type model or `spec fn` relation to state the subset's intended type rules, and prove correspondence lemmas with `proof fn`. Inference: this model can serve as a reference for a Verus front end only after a refinement proof connects source Rust to the model; a manually rewritten snippet is an untrusted translation. Keep unsupported-feature metadata explicit.

evidence: a-mir-formality rejected 3/5 expressible snippets (99554, 98117, 109628) and accepted 2/5 (106040, 114061) (Section 6.1.3, p. 17). The denominator is the five issues the tool could express, not all 30. The authors conclude it is immature as a practical oracle but has broad potential.

limits: language coverage is currently too small for the feature interactions that dominate the corpus, especially implied bounds, impl traits, and trait objects (Section 6.1.3, p. 17).

## technique 7: audit documentation before mechanizing semantics

what it is: search the Rust Reference, FLS, and RFCs for each relevant concept, then compare the prose and inference rules against the issue's required semantics. The paper warns that “constructing a mechanized specification for Rust cannot be achieved simply by collecting existing documents.” (Section 6.2, p. 17)

when to use: use this before implementing a reference type checker or generating Verus contracts from documentation. It exposes missing definitions and interactions that a text-only corpus would silently omit.

how to do it:

1. search all sections containing the relevant keywords in the Reference, FLS, and RFCs (Section 6.2, p. 17)
2. compare definitions across documents; record whether the rule is precise enough to implement
3. test interaction cases, not only isolated features: implied bounds plus well-formedness, function-item-to-pointer coercion plus higher-rank lifetimes, and HRTBs plus associated types (Section 6.2, pp. 18–19)
4. fill missing inference rules in a mechanized model and validate it against the 30 reproducers; preserve links to the source wording

Verus form. Inference: treat each reviewed requirement as a `spec fn` and expose assumptions at call sites with `requires`; connect implementation behavior to the requirement with `ensures`. Use `assert` and `proof fn` lemmas for cross-feature facts rather than relying on prose. Inference: a specification review must be separate from proof checking because Verus proves the written predicate, not the adequacy of the Reference or FLS wording.

evidence: the audit finds that the Reference and FLS mention implied bounds without defining well-formed types, that coercion descriptions do not cover higher-rank cases, and that HRTB/associated-type interactions are undocumented (Section 6.2, pp. 18–19). These are documentation findings, not a complete formalization.

limits: the paper does not systematically cover every language feature and does not claim that the Reference or FLS were intended as formal specifications (Section 6.2, p. 18).

## evidence, contradictions, and trusted boundary

The authors summarize the lifecycle result as “Soundness issues are typically discovered long after they are introduced, persisting across multiple releases.” (Finding 7, p. 16)

The study's strongest evidence is 30 manually verified issue records, release-by-release compilation checks, 11/11 ASan and Miri detections for memory-bug cases, partial Chalk/a-mir-formality oracle results, and the documentation gap audit. The dataset has 18 fixed, 4 confirmed, and 8 reported issues; no issue is classified as non-bug (Table 7, p. 15). The paper's percentages and fractions above use the table denominators; none is a rate over all rustc programs.

## techniques for the catalog

- soundness-issue corpus construction — filter rustc reports, manually validate rejection claims, deduplicate, and compare datasets
- multidimensional soundness classification — record affected feature, symptom, consequence, trigger, status, and lifecycle for each issue
- release-lifecycle testing — compile reproducers across versions to measure introduction, discovery, and fix delays
- memory-execution oracles — use AddressSanitizer and Miri to detect UB in accepted programs
- trait differential oracle — compare rustc with Chalk on trait overlap, orphan, and dyn-compatibility cases
- executable type-model oracle — translate supported snippets to a-mir-formality and compare accept/reject decisions
- semantics documentation audit — cross-check Reference, FLS, and RFC rules and test cross-feature interactions before mechanization
