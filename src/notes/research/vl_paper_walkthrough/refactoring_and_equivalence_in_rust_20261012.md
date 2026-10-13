# Refactoring and Equivalence in Rust: Expanding the REM Toolchain with a Novel Approach to Automated Equivalence Proofs
(authored by agents unless marked 🧑)

## scope and result

REM2.0 combines Rust-Analyzer-backed Extract Method refactoring, lifetime repair, and an optional CHARON/AENEAS/Coq equivalence check. The paper’s problem is specific: Rust’s ownership and borrowing make moving a code fragment across a function boundary semantically delicate. The authors state that “a transformation that appears harmless at the level of syntax may cause the borrow checker to reject the program, or may alter which parts of the program are permitted to mutate shared state.” Their redesign replaces unstable IntelliJ/rustc integration with a persistent JSON-RPC daemon and a single-file semantic workspace augmented by standard-library crates.

The extraction evaluation has 40 advanced-feature cases: 33 compile after extraction (about 83%); async 7/8, const 10/11, non-local control flow 11/13, higher-ranked trait bounds 6/8, generic functions 11/14, and dynamic trait objects 1/4. The verification evaluation has 20 cases (10 simple EX and 10 real-world RW), a fixed 10-second timeout, and CHARON to LLBC, AENEAS to Coq, then generated Coq equivalence lemmas. All ten EX cases verify in roughly 1.7–2.2 seconds. Nine RW cases verify in about 3.8–4.4 seconds; case 20 fails. Deliberately altered, type-correct versions are rejected whenever the original case verifies. These denominators are small and selected for tool support, so they do not establish coverage of arbitrary Rust crates.

## technique 1: semantic extraction using Rust-Analyzer

What it is: ask Rust-Analyzer’s existing Extract Function assist for a structured edit instead of rebuilding type and ownership analysis. REM2.0 sends file contents, selection range, and function name; RA returns the new function and rewritten call site with inferred types, generics, lifetimes, and where-clauses. The paper says, “By using its extract-method implementation as the semantic source of truth, REM2.0 inherits support for the full Rust language surface.”

When to use it: use it for interactive extraction where correctness depends on borrow checking, async desugaring, trait resolution, or generic bounds. Reuse RA when it already knows semantics; do not duplicate its analysis in an AST-only transformer.

How to do it: create a synthetic workspace for the current file; initialize a persistent standard-library workspace; merge semantic graphs; issue RA’s extraction request; apply the returned edits; pass the result to lifetime repair; optionally capture original and extracted bodies in isolated virtual crates for verification.

Verus form (inference): Verus has no identical Extract Function assist, so a tool should use rust-analyzer’s syntax and semantic APIs to propose the Rust edit, then preserve Verus contracts, ghost state, and proof calls at the moved boundary. Re-run `verus` after extraction; RA acceptance is only a candidate check. Functions with borrowed values need explicit `requires`/`ensures` and ownership-compatible signatures, while loop invariants may need to move with the body.

Evidence and limits: the 33/40 advanced cases show broad but incomplete support. Dynamic trait objects succeed only 1/4; failures include `AsRef<[u8]>` generalized to `?Sized`, missing generic bounds, and unresolvable signatures. The single-file view lacks cross-module trait information, so RA’s semantic source is still bounded by workspace construction.

## technique 2: persistent single-file workspace with standard-library merge

What it is: analyze only the edited file for speed, but merge it with a persistent workspace containing `core`, `alloc`, `std`, and dependencies. Without that merge, RA cannot infer `Vec<T>`, `Option<T>`, or `Result<T,E>` and emits placeholders. The paper reports that “REM merges the semantic graphs of the std workspace and the single-file workspace, producing an ‘effective’ workspace with full knowledge of both user code and the standard library.”

How to do it: start a long-lived standard workspace once when the editor launches; construct a minimal isolated crate for each requested file; parse and type-check it; combine the graphs; run extraction against the effective view; cache the stable standard graph across requests. This avoids full-project reanalysis while restoring common type information.

Verus form (inference): maintain a persistent Verus model for standard ghost libraries and imported specs, then overlay the current file’s executable and proof code. Cache immutable environment facts, but invalidate them when crate features, versions, or contracts change. A Verus adapter must include dependency contracts, not only Rust type definitions, because solver-visible specifications affect proof validity.

Evidence and limits: raw daemon extraction is reported at roughly 2–9 ms, with user-perceived latency 120–260 ms after repair and VSCode overhead. The model assumes the persistent standard workspace remains stable; single-file analysis still misses traits and associated types defined elsewhere.

## technique 3: lifetime and ownership repair loop

What it is: after RA proposes extraction, REM Repairer fixes missing lifetimes and ownership inconsistencies, guided by compiler diagnostics and lifetime-elision rules. The paper describes it as a re-engineered descendant that “reify and correct any missing lifetimes (as guided by cargo check), before applying a series of lifetime elision rules.”

How to do it: run extraction; compile with `cargo check`; read borrow and lifetime diagnostics; modify the extracted signature and call site; retry until the borrow checker accepts or the case is reported as failed; apply readability-oriented elision after correctness. The paper makes repair optional in extraction but lists it as a stage of the verification pipeline (§4.5, p.29), where it iterates until the program compiles.

Verus form (inference): use `verus` diagnostics to repair function contracts and ghost/executable boundaries. Preserve aliasing facts with `requires` clauses and frame-like `ensures`; move or strengthen invariants when a mutable borrow becomes a parameter. Compiler acceptance alone does not prove semantic equivalence, so proceed to a relational check for critical refactorings.

Evidence and limits: the repairer is invoked in 7 of the original 40 cases, exactly the tighter-lifetime examples. The paper’s scope excludes many macros and complex generic patterns; repair cannot infer information absent from the local workspace.

## technique 4: translation-based equivalence checking

What it is: compare original and refactored Rust semantically by translating both through CHARON and AENEAS into Coq, then prove an equality lemma. The paper emphasizes that “the mere fact that refactored code compiles does not guarantee equivalence.” CHARON produces ownership-explicit LLBC; AENEAS produces pure functional Coq definitions; Coq checks the generated lemma.

How to do it: capture original and transformed functions in virtual crates; translate each with CHARON; translate LLBC to Coq with AENEAS; generate `Orig.main = Refactored.main` (or the corresponding function equality) and a proof script; run Coq; report success or failure in VSCode and offer rollback on failure. Cache LLBC and dependencies for repeated checks.

Verus form (inference): express the relation as a ghost reference model or relational lemma over pre-state, inputs, return value, and mutated state. Prove that the original and extracted Verus functions have equal post-state and outputs under the same preconditions. Verus’s SMT-backed contracts can discharge many arithmetic and state relations, but a general Rust-to-pure translation and Coq-style functional semantics would be additional infrastructure; do not claim equivalence from two independent `ensures` proofs alone.

Evidence and limits: all 10 EX cases pass; 9/10 RW cases pass, with fresh LLBC conversion often 9–15 seconds but cached conversion about 1.6–1.9 seconds. For the EX cases most time is proof checking; for RW cases the paper reports a far more equal split. In every originally successful case, manually introduced type-correct behavioral changes are rejected. Unsupported `!` returns and translation failures remain outside the guarantee; the authors call this optional high-assurance mode for the AENEAS-supported fragment.

## what is proved, measured, and trusted

Rust compilation proves type and borrow safety, not behavioral equivalence. Coq proves the generated equality in the translated semantics, conditional on CHARON/AENEAS translation correctness and the modeled primitives. Trusted components include RA’s extraction, the repairer, translation tools, generated proof scripts, compiler/toolchain versions, and the selected benchmark filtering. The paper itself notes that it sometimes calls the checker a verifier although “the work it performs isn’t verification in the strictest sense of the word.” The evaluation’s 20 verification cases, fixed timeout, and selected supported subset limit generalization.

## techniques for the catalog

- rust-analyzer semantic extraction — delegate Extract Method to RA’s inferred types, lifetimes, generics, and control-flow semantics
- persistent semantic workspace — merge a cached standard-library graph with a minimal single-file graph for fast complete inference
- compiler-guided lifetime repair — iterate signature and call-site edits from borrow-checker diagnostics and lifetime-elision rules
- translation-based equivalence proof — translate original and refactored Rust through CHARON/AENEAS and prove equality in Coq

Audited 2026-10-12 against the paper: read the study and the paper text; checked the 33/40 and per-feature fractions, the 83% rate, the 7 repairer cases, EX and RW timings and ranges, the 10-second timeout, case 20 failure, the altered-refactoring result, the 2-9 ms and 120-260 ms latencies, the quotations, the pipeline steps in sections 3.5, 3.6, 4.5 and the AENEAS limits. Changed: removed an invented claim that repair is mandatory in a high-assurance mode (replaced by what section 4.5 says); corrected the statement that proof checking dominates time (true for EX only). Verus-form paragraphs are marked inference and are plausible, not checked against Verus. Could not check: Coq proof details in the appendices beyond the lemma shapes.
