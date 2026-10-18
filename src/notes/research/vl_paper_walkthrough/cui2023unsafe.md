# Is unsafe an Achilles’ Heel? A Comprehensive Study of Safety Requirements in Unsafe Rust Programming
(authored by agents unless marked 🧑)
Tag: `cui2023unsafe`, [paper](http://arxiv.org/abs/2308.04785v1)

## what the paper proves or measures

Cui et al. audit public unsafe APIs in Rust 1.70 and turn documentation requirements into a reusable taxonomy of 19 Safety Properties (SPs). They label 416 unsafe methods, classify Rust CVEs, mine crates.io usage, and survey experienced Rust programmers. The abstract reports: “We studied unsafe API documents in the standard library and defined 19 safety properties (SP).” (Abstract, p. 1) The paper is empirical: it does not prove that every unsafe operation is safe after labeling. It proposes a disciplined specification vocabulary that can be used to write contracts and evaluate analyzers.

The SPs split into 12 precondition properties, which must hold at a call, and seven postcondition properties, which constrain later use of inputs or outputs after valid preconditions hold (Section 3.2.2, pp. 4–5; Table 3, p. 5). The 12 preconditions are Const-Numeric Bound, Relative-Numeric Bound, Encoding, Allocated, Initialized, Dereferencable, Aligned, Consistent Layout, Unreachable, Exotically Sized Type, System IO, and Thread. The seven postconditions are Dual Owner, Aliasing & Mutating, Outliving, Untyped, Freed, Leaked, and Pinned (Table 3, p. 5).

## technique 1: extract a safety-property taxonomy from API documentation

what it is: systematically convert prose requirements in Rustdoc, examples, source comments, and function behavior into general, non-overlapping, composable SP labels. The design goals are generality, unambiguous terminology, non-overlap, composability, essentiality, practicality, and unilingual scope (Section 3.1.1, p. 4). An API can receive several labels; the labels are requirements, not implementation claims.

when to use: use this before verifying unsafe wrappers, reviewing FFI boundaries, building a static analyzer, or assembling a benchmark. It gives every unsafe call an explicit checklist instead of relying on a free-form Safety paragraph. It is especially useful when documents are inconsistent, as with `ManuallyDrop::take`, `Box::from_raw`, `Rc::from_raw`, and raw-pointer APIs (Introduction and Table 1, pp. 1–3).

how to do it:

1. collect all public unsafe methods in `std`, `core`, and `alloc` for the target Rust release; remove duplicates where `core` and `std` expose the same method, retain one representative for similar numeric types, and retain compiler intrinsics without a stable counterpart (Section 3.1.2, p. 4)
2. read five sources for each API: functionality description, Safety description, surrounding subsections, example snippets, and source code/comments (Section 3.2.1, p. 4)
3. in the first audit round, assign existing SPs and create a new SP when a requirement is not represented; merge overlapping labels and re-check affected APIs (Section 3.2.1, p. 4)
4. in the second round, cross-check every API for missing labels and inconsistent descriptions (Section 3.2.1, p. 4)
5. classify a requirement as PRE-SP when violating inputs makes the call undefined or vulnerable; classify it as POS-SP when valid inputs can still lead to unsafe subsequent use (Section 3.2.2, p. 4)

Verus form. Inference: encode each SP as a `spec fn` predicate over a pointer, allocation model, lengths, alignment, initializedness, ownership token, or lifetime abstraction. Put call requirements in `requires`; put post-call ownership/aliasing obligations in `ensures`; use ghost state and `proof fn` lemmas for facts that Rust's executable type system cannot express. Inference: Verus can verify a wrapper against the predicates, but it cannot infer missing SPs from Rustdoc and cannot make an unsafe implementation safe merely by labeling it. Inference: POS-SPs need a ghost ownership or permission model that relates later operations to the returned pointer; a one-time `ensures` clause is insufficient if aliases can be created afterward.

evidence: the audit yields 416 unsafe methods, with 127 of them folded into 11 unique APIs by Filter 3.2 for similar numeric types (Section 3.1.2, p. 4). Table 3 reports counts such as Allocated 134, Relative-Numeric Bound 114, Consistent Layout 110, and Dereferencable 96; Inference: the denominator is the 416 labeled methods, and a method can carry multiple labels, since the counts sum to more than 416 (Table 3, p. 5). The paper's example says the `ManuallyDrop::take` safety text requires that the container not be used again (Figure 1, p. 1).

limits and assumptions: the taxonomy ignores FFI and intrinsic requirements from other languages by design (Goal 3.7, Section 3.1.1, p. 4). Inference: documentation may omit a property, and labels therefore depend on auditor judgment (the authors did two audit rounds, double-checked by the first and second authors, Section 3.2.1, p. 4). PRE-SP/POS-SP separation assumes all PRE-SPs hold when evaluating POS-SPs (Section 3.2.2, p. 5).

## technique 2: use SP labels as a CVE-grounded benchmark

what it is: build a vulnerability dataset by filtering Rust CVEs and manually classifying each root cause by violated SPs. The paper says to “classify them into safety properties by manual code review.” (Section 4.1.1, p. 7)

when to use: Inference: use this to test whether a taxonomy covers real failures, to compare analyzers on a common benchmark, and to prioritize proof obligations. The paper itself says the benchmark “can be employed to evaluate the effectiveness of research prototypes or bug-detection tools designed for particular SPs.” (Section 4.1.2, p. 8)

how to do it:

1. search the CVE list for “Rust” and retain memory-safety issues with source links; remove unrelated information leaks, panic-path-only cases, deprecated/yanked crates, and entries without a link to the source code (Section 4.1.1, p. 7)
2. inspect issues, pull requests, contributors (e.g., RUSTSEC), and fixed code to pinpoint the source code of each CVE and decide whether misusing unsafe code was the root cause; the first and second authors double-check (Section 4.1.1, p. 7)
3. classify each CVE into the SPs it violated (Section 4.1.1, p. 7; Figure 3 lists several SPs annotated on the API and names the one violated)
4. publish per-SP CVE lists as a benchmark for bug detectors (Section 4.1.2, p. 8)

Verus form. Inference: translate each benchmark entry into a small Rust harness whose unsafe call has a reviewed `requires` predicate and whose misuse violates that predicate or a postcondition. Use `proof fn` lemmas to show a safe wrapper establishes each SP; use executable tests or Miri for undefined behavior that Verus's abstract model does not capture. Inference: keep the CVE's original unsafe code and a minimal corrected version, then require `ensures` on the corrected wrapper; do not treat a passing proof of a weakened predicate as a repaired CVE.

evidence: from 404 CVE descriptions, 196 remained after filtering; 86.73% of those 196 were attributed to misuse of standard-library unsafe APIs (Introduction, p. 3; Section 4.1.1, p. 7). The paper reports Thread violations as the largest category (70 CVEs) and Initialized as second (37 CVEs); Inference: the denominator is the 196 retained CVEs (Section 4.1.2, p. 8). It states that “7 SPs have no corresponding CVEs” (Section 4.1.2, p. 8), and cautions that “many undiscovered vulnerabilities related to specific SP may not have been registered” in the CVE database (Discussion, p. 8).

limits and assumptions: CVE descriptions are incomplete; classification required manual source investigation. The dataset covers reported vulnerabilities through 2023-07-08 (Abstract, p. 1) and can miss undiscovered or undocumented bugs (Sections 4.1.1–4.1.2, pp. 7–8). The paper itself notes that the CVE statistics may not reflect real SP frequency: 85.3% of CVEs on Initialized and 92.9% on Thread were discovered by the sslab-gatech using their static analyzer Rudra (Discussion in Section 4.1.2, p. 8).

## technique 3: measure unsafe API usage in crates.io

what it is: mine all crates.io repositories with regular expressions, without compilation, for a dictionary of 140 unique unsafe API strings (20 removed for sharing a name with safe std functions), count the crates containing each string and its total usage, and include per-file instances only if the `unsafe` keyword is used (Section 4.2.1, p. 8). Inference: this estimates exposure to each SP in open-source Rust.

how to do it:

1. create a dictionary of unsafe API function names; merge identical API names, then remove the 20 strings that have the same name as other safe std functions (Section 4.2.1, p. 8)
2. scan the latest crate source with regular expressions; count a per-file instance only when the `unsafe` keyword is used in the source code (Section 4.2.1, p. 8)
3. collect, for each string, the number of crates in which it appears and its total usage count across all crates (Section 4.2.2, p. 8). Inference: map common APIs back to their SP labels; the paper itself only groups the top ten strings into usage scenarios.

Verus form. Inference: use this mining result to choose which unsafe wrappers deserve contracts first: allocation, initialization, pointer arithmetic, transmute, indexing, and manual drop. For each selected API, define a Verus `spec fn` for the relevant SP and require it at the wrapper boundary. Inference: regex counts are triage evidence; they cannot establish that a call is semantically unsafe, because aliases, types, and control flow are not parsed.

evidence: as of 2023-01-30, 21,506 of 103,516 crates used Unsafe Rust; 3,614 crates were yanked (Section 4.2.2, p. 8). The top ten strings (Figure 5) cover scenarios the paper lists as `transmute`, `zeroed`, `alloc`, `drop_in_place`, `new_unchecked`, `assume_init`, `get_unchecked`/`mut`, `from_ptr`, and `copy_nonoverlapping` (Section 4.2.2, pp. 8–9). These counts use crates as the denominator for “number of crates” and source occurrences for “usage count”; the study does not claim they are vulnerability rates.

limits: the reported results do not account for filtered strings such as `read`, `as_mut`, and `from_raw` (Section 4.2.2, p. 9). Inference: totals therefore undercount use, and API name matching can include false positives and cannot distinguish safe contexts reliably.

## technique 4: evaluate SP definitions with a controlled developer survey

what it is: present experienced Rust programmers with a definition, a sound snippet, and a misused proof-of-concept for each SP, then ask about precision, significance, usability, and frequency. The paper's procedure supplies, per API, a triplet of a document slice for the SP, a sound code snippet, and a misused PoC, and states: “Participants must read the definition and the triplet of each SP.” (Section 5.1.2, p. 9)

when to use: Inference: use this when a taxonomy needs validation by practitioners rather than only auditor agreement. It can identify unclear labels and properties that developers routinely overlook.

how to do it:

1. recruit participants with at least one year of Rust, 5,000 lines of Rust, and 1,000 lines of unsafe Rust (Section 5.1.1, p. 9)
2. for each SP, show its definition and the `(S, P1, P2)` triplet; link the document slice to the online document and the snippets to the Rust Playground, noting that 18 of 19 misused PoCs trigger UB that Miri can capture (Section 5.1.2, p. 9)
3. ask four questions on precision, significance, usability, and frequency; the paper uses a [−1, 1] scoring scale per answer (Section 5.1.2, p. 9)
4. discard responses with excessively short completion times (less than 15 minutes), the same pattern throughout, or inconsistency with Rust facts (Section 5.2, p. 9)

Verus form. Inference: use the same triplets as proof-review fixtures: `P1` should verify against a reviewed contract, while `P2` should fail a `requires` or `ensures` obligation and, where applicable, trigger an executable UB detector. Inference: a survey score can prioritize documentation and agent prompts, but it cannot serve as proof evidence. The Verus contract must remain fixed while testing whether the examples satisfy it.

evidence: 90 responses were received and 50 were judged valid, collected between July 10 and July 25, 2023 (Section 5.2, p. 9). Mean scores across the 19 SPs were 19.3 for precision, 26.3 for significance, 21.4 for usability, and 8.6 for frequency (Section 5.2, pp. 9–10); the score ranges are [6, 25], [15, 34], [12, 28], and [−6, 25]. The paper reports that 89.4% of the Q2 scores are higher than Q3 (Section 5.2, p. 10). The authors note that the questions “have no objectively correct answers” in the sense that responses depend on perspective and experience (Section 5.1.2, p. 9); these are opinions, not objective correctness measurements.

limits: the authors acknowledge possible non-representative or malicious respondents and changing Rust APIs (Section 6, p. 10). Frequency ratings vary substantially by property (Section 5.2, p. 10). Inference: low frequency can mean either rarity or poor awareness.

## evidence, assumptions, and trust boundary

Measured artifacts are the 416-API labeled corpus, 19-property taxonomy, correlation matrices, 196-CVE benchmark, crates.io counts, and 50-valid-response survey. The paper's empirical claim that 86.73% of retained CVEs came from std unsafe APIs is computed over 196 retained CVEs; it is not a fraction of all 404 descriptions. The paper's six recommended dereference preconditions (Allocated, Dereferencable, ConsistentLayout, Aligned, RelativeBound as needed, and Initialized; Section 3.3.2, p. 7) are a methodological recommendation, not a machine-checked theorem.

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
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "The small dataset intends to eliminate the redundancy of potentially irrelevant data and concentrate on diversity."): I read the whole paper text and checked the abstract and Section 4.1.1 quotations, the page and section references (verified by page against the PDF), the 12/7 SP lists, Table 3 counts, the 416/127/11 API counts, the 404/196/86.73% CVE figures, the Thread 70 and Initialized 37 counts, the crates.io figures (140 strings, 21,506 of 103,516, 3,614 yanked), the survey figures (90/50, means, 89.4%), and the technique steps. I changed the Section 4.1.1 quotation (the paper has a typo, so I quote a different sentence), page references for Section 4.1 and 4.1.2 (pp. 7-8, not 6-7) and for Figure 1 (p. 1), the Rudra statistic (Discussion in Section 4.1.2, not 4.2.2), the unsupported claim that the authors caution about the 7 SPs without CVEs, the top-ten API list, the survey triplet quotation, and marked my own conclusions as Inference. I did not check the heatmap values in Figure 2, the bar values in Figures 4 to 6, Table 5, the references, or that the denominator of Table 3 counts is 416 (inferred).
