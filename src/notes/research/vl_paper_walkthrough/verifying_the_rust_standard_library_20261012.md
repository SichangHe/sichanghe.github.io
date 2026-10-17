# Verifying the Rust Standard Library
(authored by agents unless marked 🧑)
Tag: `cook2026verifying`, [paper](https://doi.org/10.1007/978-3-032-28079-4_19)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and prior notes

This study covers the full paper (22 pages, no appendix). The repository already has [rust_std_verification_effort.md](/ssd1/sichanghe.github.io/src/notes/research/topic_studies/formal_verification_rust/rust_verifiers/rust_std_verification_effort.md), so this file records the methods and quantitative details that note lacks. The paper studies an open, multi-tool campaign for proving selected classes of undefined behavior (UB) absent from Rust's evolving `core`, `alloc`, and `std` libraries. Absence of those UB classes is a safety result, not full functional correctness, liveness, security, aliasing, or termination.

## technique 1: organize verification as a rewarded, reviewable challenge program

What it is and when to use it. Split a large, changing library into concrete challenges, each with a target, assumptions, acceptance criteria, and reward. Use this when no single verification team can cover the codebase and contributors have different tools and expertise. Contributors fork the verification repository, implement a candidate proof, submit a pull request, and a technical committee reviews and merges accepted work. The fork is periodically synchronized with upstream Rust. This turns proof maintenance into ordinary CI work and gives external people a bounded unit of work.

The paper says, “Verification tasks are organized into challenges. Each challenge specifies a concrete verification target, a list of assumptions, explicit success criteria, and a financial reward disbursed upon completion.” It reports 29 published challenges, more than 450 pull requests, and at least 21 external contributors from four institutions. CI runs every active proof on each pull request, so a change that breaks a proof is visible immediately.

Step by step (the study's sequence assembled from sections 3.1 and 3.2; the paper gives no checklist, and review of soundness and the diff is the study's wording): define the target and assumptions; publish the contract and success test; let a contributor fork the pinned verification repository; require tool output and any source edits in a pull request; review soundness and the diff; merge only accepted artifacts; rerun all tools on later revisions. Inference: in Verus, VL could apply the same governance around `requires`, `ensures`, loop invariants, and proof modules, while retaining a pinned Verus toolchain and a separate proof fork. Inference: the contest and CI ideas carry over directly; Kani annotations, VeriFast predicates, and Flux refinements do not.

Evidence and limits. Four tools are integrated: Kani, ESBMC, VeriFast, and Flux; Verus, Creusot, KRust, and RAPx were under review. The authors explain that “no single tool can discharge all verification conditions.” Section 5.1 says the authors under-budgeted time for community consensus and institutional coordination, and that formal legal agreements took months to finalize; these are schedule lessons, not proof evidence. The campaign found no previously unknown memory-safety vulnerability, but did find incorrect SIMD results, missing unsafe annotations, incorrect SAFETY comments, and incorrect panic documentation.

## technique 2: generate MIR-level nondeterministic proof harnesses

What it is and when to use it. Autoharness is a Kani compiler pass that enumerates functions and synthesizes a harness calling each eligible function with symbolic values. It is useful for broad triage of a library where hand-written harnesses plateau. The generated MIR does not modify source, so it can run continuously against a pinned compiler snapshot.

The paper defines the harness as a test whose inputs represent all inputs at once: “A proof harness is analogous to a unit test, but instead of calling a function with concrete inputs, it calls the function with symbolic (non-deterministic) values that represent all possible inputs simultaneously.” Eligibility is mechanical: the function is monomorphic; every argument implements or can derive `kani::Arbitrary`; and it is not Kani-internal. Include/exclude patterns further restrict the set. Functions skipped for generic parameters, missing `Arbitrary`, absent bodies, internal status, foreign declarations, or unsupported argument types are recorded with a reason.

Step by step: enumerate MIR function definitions; filter by those three predicates; allocate one local per argument; initialize each with `kani::any::<T>()`; call the target; if contracts exist, assume preconditions and check postconditions; otherwise instrument execution for supported UB; report pass, failure, timeout, or skip. The conceptual shape is:

```rust
#[kani::proof]
fn check_wrapping_shl() {
    let self_val: u32 = kani::any();
    let rhs: u32 = kani::any();
    let _ = self_val.wrapping_shl(rhs);
}
```

For a Verus implementation, this is an inference: write a `proof` or harness function that constructs arbitrary values only where the type's invariants are represented, then call the verified Rust function under `requires` and `ensures`. Verus does not provide Kani's whole-program symbolic execution, so VL would need explicit finite-domain generation, a model-checking backend, or deductive contracts. The idea of generating harnesses at an intermediate representation level carries over; the exact `kani::any` API does not.

The campaign produced 16,748 harnesses: 4,645 unsafe, 1,126 safe abstractions, and 10,977 other safe functions. 11,970 passed Kani's checked UB classes; 4,778 failed because of missing models, timeouts, or unsupported features. The denominator matters: only 11,970/16,748 (71.5%) automatic harnesses passed, and only 295 of those had contracts. With 694 manual contract proofs, 989 functions had contract-based proofs. Of 17,207 skipped functions, 9,635 (56%) were generic, 3,826 (22%) lacked `Arbitrary`, 3,246 (19%) were Kani internals, and 500 (3%) had other reasons. Thus extending generic and pointer/reference support could address 78% of skips, but this is a projection rather than a demonstrated result.

## technique 3: separate validity invariants from semantic safety invariants

A bit-valid value is not necessarily a value that safe callers can construct. Kani's derived `Arbitrary` respects compiler validity invariants such as a Boolean's representation, but it can violate semantic invariants such as `Duration` nanoseconds being below 10^9. The paper adds an `Invariant` trait with an `is_safe()` predicate. A contract harness assumes these predicates in addition to function preconditions. For an uncontracted function, all bit-valid states remain in scope; a failure can be a real UB or an input that callers are required to exclude.

Use this technique whenever a type has a representation invariant that Rust's type system does not enforce. Step by step: identify the semantic invariant; implement `Invariant::is_safe`; attach a function contract requiring it; generate a harness that assumes the precondition; classify an unannotated failure as “needs contract” until a human decides whether the state is constructible. The paper warns, “types whose safety invariants are not yet annotated with is safe() are tested over all bit-valid values, which may include states that violate the type’s intended invariants.”

In Verus, this maps naturally to a `spec fn` predicate and a `requires` clause, with `ensures` preserving the predicate. This is an inference because the paper uses Kani's trait and assumptions, but the proof obligation is the same. The assumption is visible and auditable; it is not evidence that every caller establishes it unless caller proofs are checked compositionally.

## technique 4: choose bounded or inductive loop reasoning explicitly

By default Kani unrolls loops to a configured bound and inserts an unwinding assertion. If the assertion passes, all reachable paths up to the model are covered; if it fails, the proof fails. A `kani::assume` can limit input size, but then the result is only for that range. With a loop contract, Kani checks that the invariant is inductive from an arbitrary invariant-satisfying state and uses a one-iteration abstraction, removing dependence on the bound. The paper says Kani does not yet support loop variant (decreases) clauses, so termination is not verified there (sections 4.1 and 7). The kani study in this directory documents `loop_decreases` in Kani's own loop contracts, so the two papers differ on this point; this study follows the standard-library paper for what the campaign used.

The paper states, “A successful verification with loop contracts therefore constitutes an inductive proof for the annotated loops, removing the dependency on the unwinding bound.” In Verus, the direct form is a `while` invariant plus a decreases clause when termination matters. Inference: VL should record whether a generated proof relies on bounded unwinding, an explicit finite input assumption, or an inductive invariant; these are different guarantees.

## technique 5: use separation logic for pointer-heavy linked structures

VeriFast handles a LinkedList proof whose guarantees the paper calls qualitatively different from model checking: it reasons about unbounded inputs. A recursive `Nodes` predicate owns each allocated node and links the sequence from head to tail. Separating conjunction (`&*&`) gives exclusive ownership and rules out aliases and cycles. Each operation has `req` and `ens` contracts transferring ownership and updating the abstract sequence. The proof covered 19 pointer-manipulating functions and implied soundness of five additional safe functions.

The exact contract shape includes a recursive predicate and a `push_front_node` precondition requiring allocator ownership, the existing `Nodes` list, and ownership of the new node; the postcondition returns `cons(node, nodes)` and increments length. VeriFast symbolically executes raw-pointer dereferences, field writes, and `Box::from_raw` under those resources. The paper says, “Because the predicate’s clauses are joined by a separating conjunction (&*&), the predicate structurally rules out aliasing and cycles.”

For Verus, this is an inference. Model the list with a ghost sequence/set and a representation predicate over permissions or linear ghost tokens; use `requires`/`ensures` and loop invariants for traversal. Verus's linear ghost types can express ownership transfer, but VeriFast's syntax and automatic separation-logic entailment do not carry over. The proof assumes a `'static` allocator lifetime and does not fully check Tree Borrows restrictions for mutable references or boxes. VeriFast required ghost commands and source rewrites; a refinement checker then proved every original behavior is preserved, followed by a diff against upstream. The paper presents this three-stage pipeline as how it ensures the annotation edits do not alter program behavior.

## technique 6: optimize a large proof CI with measurement and caching

16,748 harnesses made compilation the bottleneck. The authors introduced compiler benchmarks, then used parallelization, caching, heuristically ordered code generation, and function stubbing. These changes yielded a reported 3.97x compilation speedup. Inference: in VL, the transferable method is to measure proof-build phases, cache stable intermediate artifacts, parallelize independent verification conditions, and stub only functions whose contracts are trusted and separately checked. A stub is a trust boundary and must be counted in the evidence.

## what is proved, measured, and trusted

The strongest reported result is 989 functions with contract-verified proofs (694 manual plus 295 automatic). The broader 11,970 automatic passes cover Kani's supported classes: out-of-bounds, null/dangling dereference, uninitialized reads, and selected arithmetic overflow. They do not cover Rust aliasing (Stacked/Tree Borrows), data races, invalid inline assembly, all provenance UB, or preservation of type-level safety invariants. Randomized testing, not formal proof, validated 565 SIMD intrinsics; it found two upstream bugs but is only high-confidence testing.

Trusted components include the MIR-to-GOTO translation, CBMC, SAT/SMT solvers, VeriFast's symbolic executor, intrinsic and foreign-function models, the pinned Rust semantics, explicit harness assumptions, and the proof authors' contracts. None of the tools is itself formally verified. Inference: the title's “verified” therefore means a scoped theorem under these models and assumptions.

## contradictions, unfinished work, and threat to VL

The paper reports 33,955 functions in the snapshot, while Autoharness generated 16,748 and skipped 17,207; these sum exactly to 33,955. Table 1's 11,970 automatic passes equal 295 contract passes plus 11,675 without contracts. The headline “over 10,000 functions” can therefore hide a large uncontracted majority: 11,675 passed without function contracts, namely 10,127 safe functions, 926 safe abstractions, and 622 unsafe functions (Table 1; the totals 10,194 and 970 include 67 and 44 with contracts). For the 622 unsafe functions without contracts, the paper says a pass means either that the function is trivially safe for Kani's checked classes (its unsafe marker relating to properties such as aliasing) or that Kani's UB coverage is incomplete, and calls them candidates surfaced by automated triage.

The paper says major APIs including BTreeMap internals, atomics, String, iterators, vectors, deques, and reference-counted types are only partially covered or not yet addressed. Generic functions, intrinsic models, relaxed-memory concurrency, and proof synchronization remain open. Inference: this overlaps work VL should not redo: the challenge/CI pattern, Autoharness eligibility accounting, invariant-vs-validity distinction, and linked-list separation-logic case are already demonstrated. VL should instead test how Verus contracts and linear ghost state handle the skipped generic and concurrency-heavy cases, and should report denominators and trust assumptions in the same detail.

Threat assessment (inference). Agent-written verified Rust is threatened by the gap between compiling a proof and proving the intended property. An LLM can generate a contract that is too weak, an `assume` that removes difficult states, or a stub whose model is wrong; Kani will still certify the reduced claim. The paper's remedy is mechanical CI, explicit assumptions, complementary tools, and human review of unsafe contracts. VL needs generated proofs to carry machine-checkable preconditions, an assumption ledger, caller-side discharge checks, and tests against aliasing and concurrency models that Kani does not cover.

## techniques for the catalog

- rewarded verification challenges — publish scoped targets, assumptions, acceptance tests, and reviewable pull requests so a changing library can be verified by a distributed community
- MIR nondeterministic harness synthesis — enumerate eligible monomorphic functions, call them with symbolic `any` values, and check contracts or supported UB on all explored paths
- invariant-aware input generation — distinguish bit-valid representations from semantic safety invariants and assume only explicit `is_safe` predicates
- bounded versus inductive loop proofs — use unwinding assertions for finite bounds or loop contracts for invariant-based proofs independent of the bound
- separation-logic ownership predicates — recursively own linked heap nodes with separating conjunction and transfer resources through pre/postconditions
- multi-tool continuous verification — combine model checking, refinement types, and separation logic in CI because each covers different Rust behaviors
- proof-pipeline performance engineering — benchmark compilation, then apply parallelism, caching, ordering, and stubbing while recording the resulting trust boundary

Audited 2026-10-12 against the paper: checked every number (16,748 and its three parts, 11,970, 4,778, 295, 694, 989, skip counts and percentages, 33,955, 29 challenges, 450 pull requests, 21 contributors, 3.97x, 19 and 5 LinkedList functions, 565 SIMD), Table 1 arithmetic, quotations and their sections, and the Verus forms (sound, all marked inference). Changed: the uncontracted breakdown was wrong (10,194 and 970 are totals; without contracts it is 10,127, 926 and 622, summing to 11,675) and is fixed; the decreases claim is now attributed to this paper and flagged as differing from the kani study; the months of delay claim narrowed to the legal agreements the paper names; the unverified APIs sentence now says partially covered or not yet addressed; the LinkedList model-checking comparison and the necessary evidence phrase reworded to what the paper says; the 622 interpretation restated as the paper words it; several VL and Verus sentences marked as inference. Not checked: figure values beyond the text, cited tools and repositories.
