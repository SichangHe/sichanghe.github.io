# Lessons Learned So Far From a Community Effort to Verify the Rust Standard Library (work-in-progress)
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

source: Le Blanc and Lam (2025), arXiv:2510.01072v3. Full text read.

## scope and evidence
The Amazon verify-std effort had 27 challenges, 9 accepted, 18 open; at least 50 contributors. At the time of writing, 361 of 9,078 unsafe functions and safe abstractions of unsafe code in core (3.98%) were annotated and 10 of 714 such functions in std (1.4%) were annotated, with Kani contracts (p.3); the paper notes annotated functions are not necessarily fully verified. Nearly all challenges target safety, not functional correctness. No confirmed safety bugs had been found; two specification bugs were reported and fixed (pp.11–12). Accepted proofs are peer-reviewed and CI verifies contracts, but reviewers must judge contract sufficiency.

## techniques and lessons

### Kani proof harness with symbolic inputs
what: a separate harness generates nondeterministic values (`kani::any()`) and asserts safety/behavioral conditions around a function.
when: bounded model checking is convenient and inputs/data structures have manageable bounds.
how: call target with symbolic input; constrain it with `kani::assume` where needed (Listing 3 assumes the input exceeds half of i32::MAX); assert the expected result (Listing 3 asserts `double(num).is_none()`); let Kani/CBMC explore paths. Loops are unrolled with an unwinding assertion or supplied invariant (pp.3–5, 11).
evidence: Kani solved 6 of 9 completed challenges (Table 1, p.4); it is used for most annotated functions.
limits: arrays and structures are explored only to finite length (“small scope hypothesis”, p.11); cannot establish all sizes without invariants, and Kani does not support concurrency in its frontend per its documentation (p.10).
quote: “This proof harness first generates non-deterministic (or symbolic) integers via kani::any()” (p.5).

### choose tools by property
what: combine bounded model checking (Kani/goto-transcoder), separation logic (VeriFast), refinement typing (Flux), abstract interpretation (RAPx), deductive verification (Creusot), and reachability logic (KMIR).
when: no single verifier handles all Rust patterns; unbounded linked-list properties require separation logic, while finite safety checks favor Kani.
how: select tool per challenge and integrate accepted tools into CI; use VeriFast for linked lists/RawVec and Kani for most finite checks (Tables 1–2, pp.4–5).
evidence: 6/9 accepted solutions use Kani; VeriFast solved linked-list and RawVec; randomized testing solved SIMD (Table 1).
limits: each tool has unsupported features; proof scripts and contracts differ, increasing maintenance.
quote: “No one-size-fits-all approach.” (p.8).

### shadow-memory dataflow for complex preconditions
what: track finite-state client obligations (initialized memory, provenance such as `into_raw`) with instrumented shadow memory, conservative alias graph, lattice and transfer functions.
when: Rust APIs require history-dependent conditions not expressible in one `requires`, e.g. `MaybeUninit` initialized or pointer returned by `into_raw`.
how: this is the paper's proposal, not an implemented technique. Kani's `uninit-checks` flag toggles shadow-memory flags added by compile-time instrumentation, with aliasing resolved by a conservative aliasing graph; for other properties only the lattice and transfer function change, and the paper recommends generalizing `uninit-checks` into an API for user-specified dataflow analyses. For infinite-state properties, it says to rely on abstract interpretation (p.9).
evidence: paper reports Kani’s uninit-checks as existing limited support, but no completeness result.
limits: aliasing, especially unions (`MaybeUninit`), is imprecise; specialized scaffolding is costly.
quote: “The main things that change are the lattice and transfer function, but the underlying infrastructure is the same.” (p.9).

### generic harness instantiation
what: instantiate generic Rust functions at many concrete types to expose monomorphized behavior.
when: harnesses must instantiate generic types (e.g. `transmute<T,U>`); the paper says it is unclear how Kani could support generically-typed harnesses.
how: write near-identical harnesses per type, since Rust monomorphizes types and the harness must instantiate them (pp.9–10).
evidence: this is the current verify-std practice for generic functions (p.10).
limits: cumbersome, potentially incomplete, and behavior may vary by type; hybrid deductive plus bounded verification may be needed.
quote: “The result of this is a plethora of near-identical harnesses where only the types are different” (p.10).

### concurrency and encapsulation decomposition
what: verify unsafe internals sequentially when ownership encapsulation guarantees no races; otherwise use a concurrency-capable verifier.
when: standard-library unsafe code includes atomics, `Arc`, and other data-race risks.
how: the paper says that if the unique ownership property holds, verifying as sequential should be sound; VeriFast supports concurrent Rust (not yet used in these challenges); it suggests the Kani frontend needs development and notes Verus was designed for multi-threaded code (p.10).
limits: Kani/goto-transcoder frontends lack concurrency; VeriFast concurrency support has not yet been used in these challenges; KMIR and Flux are believed not to support concurrency.
quote: “if unsafety is encapsulated sufficiently that the unique ownership property holds, then it should be sound to verify relevant methods as if they were in a sequential program.” (p.10).

### peer-reviewed challenge traceability
what: organize verification as scoped challenges with CI proofs, review, and links from every unsafe function to a completed challenge.
when: verifying a large library with many contributors.
how: a challenge is completed when a pull request closing it is approved by reviewers and merged; CI guarantees verification of the annotated code (p.11). A traceability link from every unsafe function to a completed challenge is what the paper calls ideal, not current practice; existing scripts only count annotated functions with proof harnesses (p.11).
evidence: 9/27 challenges accepted; rewards $5,000–$25,000; reviewers mostly Amazon staff (p.3).
limits: current coverage scripts are heuristic and do not establish contract sufficiency; challenge set is not exhaustive.
quote: “challenge solutions are peer-reviewed, almost entirely by Amazon staff.” (p.3).

## what stays trusted and what VL should not redo (inference)
Verifier kernels/solvers, Rust semantics, contracts and SAFETY comments, challenge scope, and human review remain trusted. This effort already establishes practical Kani/VeriFast workflows and the need for multi-tool verification; VL should not assume Kani alone covers generic, concurrent, or unbounded code. Safety-only proofs do not establish functional correctness.

## threat to a product of agent-written verified Rust (inference)
High for unsafe or generic systems code: only 3.98% of core and 1.4% of std functions had Kani contracts at the reported snapshot, and open problems include initialization/provenance, generics, and concurrency. Passing a bounded harness can still leave larger inputs or races unchecked. Medium for ordinary sequential safe Rust when contracts are reviewed and state is bounded.

## techniques for the catalog
- symbolic Kani harness — use `kani::any()` plus assertions and loop invariants for bounded safety proofs
- property-specific verifier selection — combine Kani, VeriFast, Flux, and deductive tools by code property
- shadow-memory dataflow — track initialization or pointer provenance as finite-state client obligations
- generic instantiation harnesses — run concrete monomorphizations to approximate generic-function coverage
- concurrency decomposition — justify sequential proofs via ownership or use concurrency-capable verification
- challenge traceability — tie unsafe functions to peer-reviewed CI-checked verification challenges
Audited 2026-10-12 against the paper: checked counts (27, 9, 18, 361/9,078, 10/714, 6 of 9, 2 of 9, rewards), table readings, page references, all six quotations, and each technique's steps. Changed: coverage wording; Kani harness step (assume, not branch); page for Kani concurrency and for the no-one-size quote; shadow-memory marked as the paper's proposal; removed invented steps (representative types, unique-ownership preconditions, contracts may miss races, coverage-mapping scripts); trusted-section marked inference. Not checked: external claims about verify-rust-std repository state.
