# Lessons Learned So Far From a Community Effort to Verify the Rust Standard Library (work-in-progress)
(authored by agents unless marked 🧑)

source: Le Blanc and Lam (2025), arXiv:2510.01072v3. Full text read.

## scope and evidence
The Amazon verify-std effort had 27 challenges, 9 accepted, 18 open; at least 50 contributors. Coverage remained 361/9,078 core unsafe functions (3.98%) and 10/714 std functions (1.4%) with Kani contracts (p.3). Nearly all challenges target safety, not functional correctness. No confirmed safety bugs had been found; two specification bugs were reported and fixed (pp.11–12). Accepted proofs are peer-reviewed and CI verifies contracts, but reviewers must judge contract sufficiency.

## techniques and lessons

### Kani proof harness with symbolic inputs
what: a separate harness generates nondeterministic values (`kani::any()`) and asserts safety/behavioral conditions around a function.
when: bounded model checking is convenient and inputs/data structures have manageable bounds.
how: call target with symbolic input; branch on precondition; assert result and no overflow; let Kani/CBMC explore paths. Loops are unrolled with an unwinding assertion or supplied invariant (pp.3–5, 11).
evidence: Kani solved 6 of 9 completed challenges (Table 1, p.4); it is used for most annotated functions.
limits: arrays and structures are finite (“small scope hypothesis”); cannot establish all sizes without invariants, and Kani does not support concurrency in its frontend (pp.11–12).
quote: “This proof harness first generates non-deterministic (or symbolic) integers via kani::any()” (p.5).

### choose tools by property
what: combine bounded model checking (Kani/goto-transcoder), separation logic (VeriFast), refinement typing (Flux), abstract interpretation (RAPx), deductive verification (Creusot), and reachability logic (KMIR).
when: no single verifier handles all Rust patterns; unbounded linked-list properties require separation logic, while finite safety checks favor Kani.
how: select tool per challenge and integrate accepted tools into CI; use VeriFast for linked lists/RawVec and Kani for most finite checks (Tables 1–2, pp.4–5).
evidence: 6/9 accepted solutions use Kani; VeriFast solved linked-list and RawVec; randomized testing solved SIMD (Table 1).
limits: each tool has unsupported features; proof scripts and contracts differ, increasing maintenance.
quote: “No one-size-fits-all approach.” (p.9).

### shadow-memory dataflow for complex preconditions
what: track finite-state client obligations (initialized memory, provenance such as `into_raw`) with instrumented shadow memory, conservative alias graph, lattice and transfer functions.
when: Rust APIs require history-dependent conditions not expressible in one `requires`, e.g. `MaybeUninit` initialized or pointer returned by `into_raw`.
how: instrumentation tags shadow state; propagate through operations; reject uses lacking required state. Generalize Kani `uninit-checks` into user-defined analyses. For infinite-state properties, use abstract interpretation (p.9).
evidence: paper reports Kani’s uninit-checks as existing limited support, but no completeness result.
limits: aliasing, especially unions (`MaybeUninit`), is imprecise; specialized scaffolding is costly.
quote: “The main things that change are the lattice and transfer function, but the underlying infrastructure is the same.” (p.9).

### generic harness instantiation
what: instantiate generic Rust functions at many concrete types to expose monomorphized behavior.
when: bounded checkers cannot reason about generic type parameters directly (e.g. `transmute<T,U>`).
how: write near-identical harnesses per type pair; run each through checker; choose representative types cautiously.
evidence: this is the current verify-std practice for generic functions (p.10).
limits: cumbersome, potentially incomplete, and behavior may vary by type; hybrid deductive plus bounded verification may be needed.
quote: “The result of this is a plethora of near-identical harnesses where only the types are different” (p.10).

### concurrency and encapsulation decomposition
what: verify unsafe internals sequentially when ownership encapsulation guarantees no races; otherwise use a concurrency-capable verifier.
when: standard-library unsafe code includes atomics, `Arc`, and other data-race risks.
how: establish unique ownership preconditions; use VeriFast for concurrent Rust where needed; extend Kani frontend or use Verus for concurrent constructs (pp.10–11).
limits: Kani/goto-transcoder frontends lack concurrency; VeriFast support has not yet been used in these challenges; contracts may miss races.
quote: “if unsafety is encapsulated sufficiently that the unique ownership property holds, then it should be sound to verify relevant methods as if they were in a sequential program.” (p.10).

### peer-reviewed challenge traceability
what: organize verification as scoped challenges with CI proofs, review, and links from every unsafe function to a completed challenge.
when: verifying a large library with many contributors.
how: define challenge safety property; submit tool proof and contracts; CI checks proofs; expert reviewers approve; maintain scripts mapping annotated functions to challenges (pp.3, 11).
evidence: 9/27 challenges accepted; rewards $5,000–$25,000; reviewers mostly Amazon staff (p.3).
limits: current coverage scripts are heuristic and do not establish contract sufficiency; challenge set is not exhaustive.
quote: “challenge solutions are peer-reviewed, almost entirely by Amazon staff.” (p.3).

## what stays trusted and what VL should not redo
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
