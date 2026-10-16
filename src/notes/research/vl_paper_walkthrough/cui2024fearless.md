# Fearless Unsafe. A More User-friendly Document for Unsafe Rust Programming Base on Refined Safety Properties.
(authored by agents unless marked 🧑)
Tag: `cui2024fearless`, [paper](http://arxiv.org/abs/2412.06251v2)

## scope and contribution

Cui et al. study how unsafe Rust API documentation can state safety requirements in a uniform, complete, and usable form. They review standard-library APIs, classify requirements as safety properties, reorganize rustdoc text, and expose the result through a rust-analyzer hover plugin. The abstract reports: “We defined a category of Safety Properties (22 items in total) that learned from the documents of unsafe APIs in the standard library.” (p. 1). The paper analyzes 438 public unsafe APIs, 419 Rust CVEs, and unsafe-API usage in 103,516 crates.io repositories. Its final taxonomy has 13 major properties and 22 sub-properties, divided into preconditions and postconditions (Introduction, p. 3).

Inference: this is directly useful for VL because the taxonomy can seed preconditions, loop invariants, postconditions, and review checklists around unsafe or low-level Rust. The paper is a documentation and empirical study; it does not prove the APIs or CVE classifications with Verus.

## technique: pre-filter an API corpus before labeling

When to use it: use pre-filtering when multiple namespaces and monomorphizations would overweight near-duplicate APIs. The authors inspect Rust 1.75's `std`, `core`, and `alloc`, including stable and nightly channels (Section 3.1.2, p. 6). They apply three filters:

1. when an API is exposed by both `core`, `std`, and `alloc`, keep one copy
2. for methods on similar numeric types, keep one implementation
3. for compiler intrinsics, retain only those without a stable counterpart

The resulting corpus has 438 unsafe functions; Filter 3.2 folds 127 functions into 11 unique APIs (Section 3.1.2, p. 6). This denominator matters: 438 is the analyzed API collection after filtering, while 127 is the subset collapsed by numeric-type similarity.

Verus form (Inference): deduplicate APIs by semantic operation and contract shape before building a proof corpus. Keep distinct ownership, lifetime, and representation cases even when signatures differ only by a numeric type. Record the filtering rules so a learned safety checklist does not silently omit a type-specific obligation.

## technique: extract safety properties through staged code review

The review process audits five sources for every API: functional description, safety requirements, subchapters, examples, and source code with comments (Section 3.2, p. 6). It uses five rounds:

1. R1 constructs properties in batches of 30 APIs. The first author proposes unrevealed properties and the other authors verify them in an assembly line. A new property is created only when an obligation cannot fit an existing item; all authors jointly review creation, merging, splitting, or deletion. The paper notes that `OverflowCheck` and `IndexCheck` were merged into `Bounded`, while `DualOwned` was split from `Aliased` (Section 3.2.1, p. 7)
2. R2 labels every API with the initial safety properties; the first and second authors audit concurrently and resolve conflicts
3. R3 repeats the labeling review for secondary confirmation, correction, and supplementation
4. R4 revises definitions and labels. The revision reduces 19 earlier properties to 13 major properties with 22 subclasses (Section 3.2.3, p. 7)
5. R5 rewrites documents by linking each document slice to a property and the relevant argument in the signature (Section 3.2.3, p. 7)

Conflicts in property creation or modification require unanimous author agreement; labeling conflicts require more than three authors to agree, otherwise the original decision remains (Conflict Resolution, p. 8). The design goals are generality, unambiguous Rust terminology, non-overlap, composability, essentiality, practicality, and excluding FFI requirements (Section 3.1.1, p. 6). The paper states: “A new item will be defined whenever a safety description cannot be categorized under the existing scheme.” (Section 3.2.1, p. 7).

Verus form (Inference): use this staged review to derive contracts for a VL API library. Review executable code, existing comments, call sites, and proof obligations; propose a property only when the obligation cannot be expressed by existing reusable predicates. Resolve taxonomy changes explicitly and retain disagreement records. A Verus `requires` clause should encode a precondition property; an `ensures` clause or invariant should encode the resulting postcondition. The taxonomy itself is a human-designed abstraction and needs independent validation.

## technique: separate precondition and postcondition safety

The taxonomy isolates call-site obligations from later-use obligations. A precondition safety property (PRE-SP) is an assumption: if inputs violate it, the call can trigger undefined behavior. A postcondition safety property (POS-SP) concerns later operations, assuming all PRE-SPs hold (Section 4.1, p. 8). The authors write: “PRE-SP aligns with the characteristic of unsafe function, i.e., it cannot ensure safety for arbitrary inputs.” (Section 4.1.1, p. 8). They define seven PRE-SPs with 14 sub-properties and six POS-SPs with eight sub-properties.

The 13 major properties and their API-label counts in Table 3 (p. 9) are:

- Allocated, 172: non-null and non-dangling storage
- Bounded, 141: numerical relations and dereferenceable ranges
- Initialized, 104: initialized, typed, and correctly encoded values
- Layout, 109: size, alignment, and exotic-size restrictions
- SystemIO, 26; Thread, 2; Unreachable, 5
- Aliased, 32: aliased, mutated, or outlived access
- DualOwned, 46: overlapping owners or bitwise copies
- Untyped, 37; Freed, 19; Leaked, 35; Pinned, 5

These counts are labels, not disjoint API counts: one API can carry several properties. The authors explicitly note: “No API has all safety property labels in the standard library.” (Section 4.1, p. 10).

Verus form (Inference): encode PRE-SPs as `requires` predicates on a wrapper function and POS-SPs as `ensures` clauses about ownership, validity, or allowed subsequent use. For low-level pointer APIs, use Verus's proof-oriented ownership and memory specifications documented in the Verus study; do not treat a documentation label as a proof. `DualOwned`, `Freed`, `Leaked`, and `Pinned` often describe obligations around resource protocols rather than simple value predicates, so model them in ghost state or an abstract state machine. Keep the paper's isolation boundary: prove call preconditions first, then prove post-call usage under those assumptions.

## technique: refine overlapping properties with correlation analysis

The authors build two labeled databases. The large dataset keeps related APIs; the small dataset applies Filter 4.1 to retain only APIs with identical labels and at least one relation such as same method with different mutability, same trait on different types, same name within a namespace, or intrinsic encapsulation (Section 4.3.1, p. 11). They compute correlation matrices and retain coefficients greater than 0.20 (Figure 3, p. 12). The large dataset can inflate correlation: 30 `SliceIndex<[T]>` implementations all labeled `Bounded` and `Allocated` raise that pair from 0.44 in the small dataset to 0.59 in the large dataset. In the small dataset, `Allocated` and `DualOwned` rise from 0.32 to 0.41 because diversity changes the sample (Section 4.3.2, p. 12).

Pairs above 0.4 in the large matrix include `Allocated`–`Bounded` (0.51), `Allocated`–`Layout` (0.48), `Layout`–`Untyped` (0.45), and `Leaked`–`Untyped` (0.49) (Table 5, p. 13). Four properties—`Unreachable`, `SystemIO`, `Thread`, and `Pinned`—have no substantial correlation in either matrix (Section 4.3.2, p. 12). The authors infer a dereference checklist of `Allocated`, `Bounded`, `Layout`, and `Initialized` after merging earlier categories (Section 4.3.2, p. 13).

Verus form (Inference): use correlation only to discover candidate reusable lemmas or predicates, never to drop a contract. Evaluate correlations on a deduplicated API set and on a full set, since generic or trait-generated code can distort counts. A high correlation can justify a review shortcut but cannot imply logical entailment; prove each Verus obligation separately.

## technique: reorganize documentation into parameter-property-slice triplets

The document-revision procedure has five goals: each API has one unique identifier; safety-property pages do not require hyperlink jumps; all native text is covered; missing safety descriptions are supplemented; and requirements are enumerated structurally (Section 4.4, pp. 13–14). The authors split native documents into sentences, classify each sentence, identify the related parameter or return value, and form a triplet `(P, S, D)` where P is parameter, S is safety property, and D is document slice. They flatten linked documents and manually add missing descriptions from other standard-library slices (Section 4.4, p. 14).

For `ptr::read`, the revised page gives a unique identifier and groups `self` under `Allocated`, `Bounded`, `Initialized`, and `Layout`, while `retval` has `DualOwned` (Figure 4, p. 14). The native requirement that `src` be non-null, within one allocation, initialized, and aligned is therefore attached to the exact argument. The authors state: “The safety property document has a unique identifier and matches the safety properties, parameters, and native document slices, providing a more structured format.” (Figure 4 caption, p. 14).

Verus form (Inference): represent each verified API in a machine-readable registry keyed by fully qualified function and version. Map each parameter and return value to named predicates and source citations. Generate `requires` and `ensures` templates only where the predicate has a checked Verus definition; otherwise show the obligation as documentation. Include version identifiers so a dependency upgrade cannot silently change the contract.

## technique: integrate structured safety prompts into an editor

The prototype stores documents in TOML as `Parameter.SafetyProperty.[DocumentSlice1, DocumentSlice2, …]`, converts TOML to JSON, and serializes a lookup structure to avoid repeated parsing. rust-analyzer's hover component intercepts a function hover, resolves its unique page identifier, and injects the safety-property document when present (Section 4.5, pp. 15–16; Figure 5, p. 15). This gives a developer the obligation at the call site rather than requiring a chain of hyperlinks.

Verus form (Inference): build a language-server or CI integration that shows a function's Verus `requires`, `ensures`, ghost-state obligations, and trusted assumptions on hover. Link each item to the exact source and proof lemma. The editor should expose the proof status and version, but must not imply that a displayed contract has been proved for the caller.

## technique: validate taxonomy coverage against real vulnerabilities

For RQ3, the authors search CVEMitre for “Rust,” sort IDs from CVE-2017-20004 through CVE-2024-21629, retain memory-safety issues with source links, exclude information leaks and selected panic-safety cases, and manually audit code and reports (Section 5.1.1, p. 16). The first two authors double-check the retained set. From 419 screened CVEs, 198 involve misuse of unsafe code; 86.36% of those are attributed to misuse of standard-library unsafe APIs (Section 5.1.1, p. 17). Figure 7's distribution is Thread 70, Initialized 46, Bounded 27, Layout 20, Aliased 19, Allocated 5, with other properties ranging from 4 to 20; four properties have no corresponding CVEs (Section 5.1.2, p. 17).

The CVE-2021-45709 case shows the procedure: inspect the source, identify `slice::from_raw_parts_mut`, compare the input slice's constraints with the unsafe call, and classify the violated `Layout: Aligned` property (Figure 6 and Section 5.1.1, pp. 16–17). The paper says: “In the final dataset (198 CVEs in total), 86.36% of them were attributed to misuse of unsafe APIs within the standard library.” (Section 5.1.1, p. 17).

Verus form (Inference): build a benchmark of failed Verus proofs, unsound `unsafe` wrappers, and historical vulnerabilities. For each case, record the violated contract predicate, whether the defect was a missing precondition, invalid postcondition, ownership protocol, or environment assumption, and have two reviewers confirm the label. Use this corpus to test whether VL's generated contracts cover known failure modes.

## technique: measure ecosystem exposure with source mining

The crates.io analysis mines all latest active crates as of 2023-01-30. It finds 21,506 crates containing unsafe code among 103,516 crates, with 3,614 yanked (Section 5.2.2, p. 18). The authors build a dictionary of 140 unsafe API name strings, remove 20 names that also identify safe functions, and discard source matches lacking the `unsafe` keyword (Section 5.2.1, p. 18). They count both crates containing each string and total occurrences without compiling, to avoid overhead. Frequent categories include transmutation, allocation/deallocation, unchecked constructors, deferred initialization, unchecked indexing, raw-pointer references, and non-overlapping copies (Section 5.2.2, p. 18).

Verus form (Inference): mine VL repositories for unsafe blocks, external-body boundaries, raw-pointer wrappers, and calls to APIs with trusted specifications. Use fully qualified paths and syntax-aware parsing instead of names alone. Count projects and occurrences separately, then prioritize review or model training by exposure multiplied by observed defect frequency.

## what is proved, measured, and trusted

Measured: taxonomy size and labels, property correlations, documentation coverage, CVE classification, crates.io usage, and editor integration. The paper does not mechanize the taxonomy, prove all revised documents, or show that a rust-analyzer hover prevents a vulnerability. The labels rely on manual reviews, expert judgments, and standard-library documentation. The authors acknowledge that the standard library may not cover every safety category, that programmers may disagree about property boundaries, and that future language versions can add or deprecate APIs (Section 6, p. 19).

Inference: threat to VL is high at unsafe boundaries and moderate for safe verified wrappers. A generated Verus proof can establish a chosen contract while leaving the contract incomplete, especially for `SystemIO`, `Thread`, FFI, hardware, and allocator assumptions. The taxonomy is a useful checklist and benchmark schema; it is not a replacement for executable specifications and proof review. Existing static analyzers already cover subsets: Table 6 lists Rudra for `Initialized`, `Thread`, and `DualOwned`; SafeDrop for `Allocated`, `Initialized`, `DualOwned`, and `Freed`; MirChecker for `Bounded` and `DualOwned`; FFIChecker for `Allocated` and `Leaked`; and rCanary for `Leaked` (p. 19). VL should reuse these established bug classes rather than duplicate their catalogs without a Verus-specific proof gap.

## techniques for the catalog

- API pre-filtering — deduplicate standard-library namespaces, numeric variants, and intrinsics before safety labeling
- staged property review — derive and revise a safety taxonomy through five audited rounds with explicit conflict rules
- pre/post safety isolation — separate call preconditions from obligations on later use of outputs and memory
- correlation-guided refinement — compare full and deduplicated API datasets to detect taxonomy overlap and sampling bias
- parameter-property-slice documents — attach each requirement to a parameter or return value with a unique API identifier
- editor-integrated safety prompts — serialize structured obligations and show them at the unsafe call site through hover
- CVE coverage audit — classify historical vulnerabilities by violated safety property and double-check the code review
- ecosystem exposure mining — count unsafe API names in crates.io source to prioritize common operations and risks
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
