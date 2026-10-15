# Is unsafe an Achilles’ Heel? A Comprehensive Study of Safety Requirements in Unsafe Rust Programming
(authored by agents unless marked 🧑)
Tag: `cui2023unsafe`, [paper](http://arxiv.org/abs/2308.04785v1)

## what the paper proves or measures

Cui et al. audit public unsafe APIs in Rust 1.70 and turn documentation requirements into a reusable taxonomy of 19 Safety Properties (SPs). They label 416 unique unsafe methods, classify Rust CVEs, mine crates.io usage, and survey experienced Rust programmers. The abstract reports: “We studied unsafe API documents in the standard library and defined 19 safety properties (SP).” (Abstract, p. 1) The paper is empirical: it does not prove that every unsafe operation is safe after labeling. It proposes a disciplined specification vocabulary that can be used to write contracts and evaluate analyzers.

The SPs split into 12 precondition properties, which must hold at a call, and seven postcondition properties, which constrain later use of inputs or outputs after valid preconditions hold (Section 3.2.2, p. 4; Table 3, p. 5). The 12 preconditions are Const-Numeric Bound, Relative-Numeric Bound, Encoding, Allocated, Initialized, Dereferencable, Aligned, Consistent Layout, Unreachable, Exotically Sized Type, System IO, and Thread. The seven postconditions are Dual Owner, Aliasing & Mutating, Outliving, Untyped, Freed, Leaked, and Pinned (Table 3, p. 5).

## technique 1: extract a safety-property taxonomy from API documentation

what it is: systematically convert prose requirements in Rustdoc, examples, source comments, and function behavior into general, non-overlapping, composable SP labels. The design goals are generality, unambiguous terminology, non-overlap, composability, essentiality, practicality, and unilingual scope (Section 3.1.1, p. 4). An API can receive several labels; the labels are requirements, not implementation claims.

when to use: use this before verifying unsafe wrappers, reviewing FFI boundaries, building a static analyzer, or assembling a benchmark. It gives every unsafe call an explicit checklist instead of relying on a free-form Safety paragraph. It is especially useful when documents are inconsistent, as with `ManuallyDrop::take`, `Box::from_raw`, `Rc::from_raw`, and raw-pointer APIs (Introduction and Table 1, pp. 2–3).

how to do it:

1. collect all public unsafe methods in `std`, `core`, and `alloc` for the target Rust release; remove duplicates where `core` and `std` expose the same method, retain one representative for similar numeric types, and retain compiler intrinsics without a stable counterpart (Section 3.1.2, p. 4)
2. read five sources for each API: functionality description, Safety description, surrounding subsections, example snippets, and source code/comments (Section 3.2.1, p. 4)
3. in the first audit round, assign existing SPs and create a new SP when a requirement is not represented; merge overlapping labels and re-check affected APIs (Section 3.2.1, p. 4)
4. in the second round, cross-check every API for missing labels and inconsistent descriptions (Section 3.2.1, p. 4)
5. classify a requirement as PRE-SP when violating inputs makes the call undefined or vulnerable; classify it as POS-SP when valid inputs can still lead to unsafe subsequent use (Section 3.2.2, p. 4)

Verus form. Inference: encode each SP as a `spec fn` predicate over a pointer, allocation model, lengths, alignment, initializedness, ownership token, or lifetime abstraction. Put call requirements in `requires`; put post-call ownership/aliasing obligations in `ensures`; use ghost state and `proof fn` lemmas for facts that Rust's executable type system cannot express. Inference: Verus can verify a wrapper against the predicates, but it cannot infer missing SPs from Rustdoc and cannot make an unsafe implementation safe merely by labeling it. Inference: POS-SPs need a ghost ownership or permission model that relates later operations to the returned pointer; a one-time `ensures` clause is insufficient if aliases can be created afterward.

evidence: the audit yields 416 unsafe methods, with 127 duplicate numeric implementations folded into 11 unique APIs (Section 3.1.2, p. 4). Table 3 reports counts such as Allocated 134, Relative-Numeric Bound 114, Consistent Layout 110, and Dereferencable 96; the denominator is the 416 labeled methods, and a method can carry multiple labels (Table 3, p. 5). The paper's example says the `ManuallyDrop::take` safety text requires that the container not be used again (Figure 1, p. 2).

limits and assumptions: the taxonomy ignores FFI and intrinsic requirements from other languages by design (Goal 3.7, Section 3.1.1, p. 4). Documentation may omit a property, and labels therefore depend on auditor judgment. PRE-SP/POS-SP separation assumes all PRE-SPs hold when evaluating POS-SPs (Section 3.2.2, p. 5).

## technique 2: use SP labels as a CVE-grounded benchmark

what it is: build a vulnerability dataset by filtering Rust CVEs and manually classifying each root cause by violated SPs. The workflow is “Create a database of CVEs caused by misusing unsafe code and classify them into safety properties by manual code review.” (Section 4.1.1, p. 6)

when to use: use this to test whether a taxonomy covers real failures, to compare analyzers on a common benchmark, and to prioritize proof obligations. It tests observed vulnerabilities rather than synthetic examples alone.

how to do it:

1. search the CVE list for “Rust” and retain memory-safety issues with source links; remove unrelated information leaks, panic-path-only cases, deprecated/yanked crates, and entries without auditable source (Section 4.1.1, p. 6)
2. inspect issue reports, pull requests, contributors' advisories, fixed code, and the vulnerable source to identify the actual unsafe misuse (Section 4.1.1, p. 6)
3. assign every violated SP, allowing one CVE to violate several properties; double-check the classification (Section 4.1.1, p. 6)
4. publish per-SP CVE lists as a benchmark for bug detectors (Section 4.1.2, p. 7)

Verus form. Inference: translate each benchmark entry into a small Rust harness whose unsafe call has a reviewed `requires` predicate and whose misuse violates that predicate or a postcondition. Use `proof fn` lemmas to show a safe wrapper establishes each SP; use executable tests or Miri for undefined behavior that Verus's abstract model does not capture. Inference: keep the CVE's original unsafe code and a minimal corrected version, then require `ensures` on the corrected wrapper; do not treat a passing proof of a weakened predicate as a repaired CVE.

evidence: from 404 CVE descriptions, 196 remained after filtering; 86.73% of those 196 were attributed to misuse of standard-library unsafe APIs (Introduction, p. 3; Section 4.1.1, p. 6). The paper reports Thread violations as the largest category (70 CVEs) and Initialized as second (37 CVEs), with the denominator being the 196 retained CVEs (Section 4.1.2, p. 7). Seven SPs had no corresponding CVE in this filtered set, which the authors caution does not show that the properties are unnecessary (Section 4.1.2, p. 7).

limits and assumptions: CVE descriptions are incomplete; classification required manual source investigation. The dataset covers reported vulnerabilities through 2023-07-08 and can miss undiscovered or undocumented bugs (Sections 4.1.1–4.1.2, pp. 6–7). The paper itself notes that static-analyzer-heavy categories can distort observed frequencies: 85.3% of Initialized CVEs and 92.9% of Thread CVEs were found by Rudra (Section 4.2.2, p. 8).

## technique 3: measure unsafe API usage in crates.io

what it is: mine all crates.io repositories with regular expressions for 140 unique unsafe API names, count crates and per-crate occurrences, and retain only files where the `unsafe` keyword appears. This estimates exposure to each SP in open-source Rust without requiring compilation (Section 4.2.1, p. 8).

how to do it:

1. create a dictionary of unsafe API function names; merge identical methods and remove names also used by safe standard-library functions (Section 4.2.1, p. 8)
2. scan every latest crate source file with regular expressions; count an occurrence only when the file contains `unsafe` (Section 4.2.1, p. 8)
3. report both the number of crates containing an API string and total occurrences, then map common APIs back to their SP labels (Sections 4.2.1–4.2.2, p. 8)

Verus form. Inference: use this mining result to choose which unsafe wrappers deserve contracts first: allocation, initialization, pointer arithmetic, transmute, indexing, and manual drop. For each selected API, define a Verus `spec fn` for the relevant SP and require it at the wrapper boundary. Inference: regex counts are triage evidence; they cannot establish that a call is semantically unsafe, because aliases, types, and control flow are not parsed.

evidence: as of 2023-01-30, 21,506 of 103,516 crates used Unsafe Rust; 3,614 crates were yanked (Section 4.2.2, p. 8). The top API strings included `transmute`, `zeroed`, `alloc`, `drop_in_place`, `new_unchecked`, `assume_init`, unchecked indexing, raw-pointer constructors, and `copy_nonoverlapping` (Section 4.2.2, p. 8). These counts use crates as the denominator for “number of crates” and source occurrences for “usage count”; the study does not claim they are vulnerability rates.

limits: filtered names such as `read`, `as_mut`, and `from_raw` are omitted, so totals undercount use (Section 4.2.2, p. 8). API name matching can include false positives and cannot distinguish safe contexts reliably.

## technique 4: evaluate SP definitions with a controlled developer survey

what it is: present experienced Rust programmers with a definition, a sound snippet, and a misused proof-of-concept for each SP, then ask about precision, significance, usability, and frequency. The paper supplies the exact triplet design: “For each API, we further supply a triplet (S, P1, P2), containing a document slice S for the current SP, a sound code snippet P1, and a misused PoC P2.” (Section 5.1.2, p. 9)

when to use: use this when a taxonomy needs validation by practitioners rather than only auditor agreement. It can identify unclear labels and properties that developers routinely overlook.

how to do it:

1. recruit participants with at least one year of Rust, 5,000 lines of Rust, and 1,000 lines of unsafe Rust (Section 5.1.1, p. 9)
2. for each SP, show its definition and the `(S, P1, P2)` triplet; link snippets to an executable Rust Playground and use Miri for 18 of 19 UB PoCs (Section 5.1.2, p. 9)
3. ask four questions: concise precision, unacceptable significance, practical usability, and encounter frequency; score each answer on a −1 to 1 scale (Section 5.1.2, p. 9)
4. discard responses with completion under 15 minutes, identical patterns, or contradictions with Rust facts (Section 5.2, p. 9)

Verus form. Inference: use the same triplets as proof-review fixtures: `P1` should verify against a reviewed contract, while `P2` should fail a `requires` or `ensures` obligation and, where applicable, trigger an executable UB detector. Inference: a survey score can prioritize documentation and agent prompts, but it cannot serve as proof evidence. The Verus contract must remain fixed while testing whether the examples satisfy it.

evidence: 90 responses were received and 50 were judged valid (Section 5.2, p. 9). Mean scores across the 19 SPs were 19.3 for precision, 26.3 for significance, 21.4 for usability, and 8.6 for frequency on the paper's aggregate scoring scale (Section 5.2, pp. 9–10). The paper reports 89.4% of Q2 scores higher than Q3, with Q2 and Q3 scores from the 50 valid respondents (Section 5.2, p. 10). These are opinions, not objective correctness measurements.

limits: the authors acknowledge possible non-representative or malicious respondents and changing Rust APIs (Section 6, p. 10). Frequency ratings vary substantially by property; low frequency can mean either rarity or poor awareness.

## evidence, assumptions, and trust boundary

Measured artifacts are the 416-API labeled corpus, 19-property taxonomy, correlation matrices, 196-CVE benchmark, crates.io counts, and 50-valid-response survey. The paper's empirical claim that 86.73% of retained CVEs came from std unsafe APIs is computed over 196 retained CVEs; it is not a fraction of all 404 descriptions. The paper's six recommended dereference preconditions are a methodological recommendation, not a machine-checked theorem.

Trusted elements include Rustdoc accuracy, auditor decisions, CVE completeness, regex extraction, Miri's UB detection for survey PoCs, Rust compiler behavior, and the assumption that 19 properties are exhaustive enough for the studied scope. Inference: a Verus proof can reduce risk at a wrapper boundary only when the property predicates correctly model allocation, alignment, initialization, pointer bounds, ownership, and lifetimes. It cannot prove undocumented hardware/FFI behavior or correct an incorrectly stated SP.

The authors' own evidence exposes a coverage tension: standard-library documents are comprehensive but inconsistent, and CVE coverage validates known categories while missing undiscovered bugs. Inference: the taxonomy should be treated as a living contract catalog, with new unsafe APIs and CVEs triggering review rather than as a closed list.

## implications for VeruLaw

Inference: this paper is directly useful for agent-written verified Rust because it supplies names and examples for the obligations agents most often omit around unsafe code. VL should generate a property checklist per unsafe boundary, attach the relevant `requires`/`ensures` obligations, and preserve a benchmark of known CVE-shaped misuses. The strongest product threat is silent omission: a proof may pass while leaving an unsafe call's allocation, alignment, initializedness, or ownership assumption unstated.

Inference: VL should not redo the basic 19-property taxonomy, the 416-API audit, or the 196-CVE labeling as new contributions. A new experiment should instead test whether Verus contracts generated from these SP labels catch real unsafe-wrapper regressions, and should report denominators separately for verified wrappers, rejected misuses, and unmodeled properties.

## techniques for the catalog

- safety-property extraction — audit Rustdoc, examples, and source in two rounds to label unsafe APIs with composable PRE-SP and POS-SP requirements
- CVE-grounded benchmark construction — filter, manually audit, and SP-label reported Rust unsafe vulnerabilities
- ecosystem usage mining — count unsafe API names in crates.io source files to prioritize frequently crossed boundaries
- practitioner validation triplets — evaluate each SP with a document slice, sound snippet, and misused PoC using experienced Rust programmers
Checked 2026-10-15 against paper cui2023unsafe: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
