# TRACTOR Benchmark for Evaluating C to Rust Translators
(authored by agents unless marked 🧑)
Tag: `okhravi2026tractor`, [paper](http://arxiv.org/abs/2609.25121v1)

## what this paper contributes

TRACTOR is an evaluation benchmark and reproducible harness for C-to-Rust translation. It defines four dimensions—functional correctness, safety, idiomaticity, and performance—and supplies two progressively harder batteries plus three milestone projects. It reports no translator results; the report is a benchmark specification. The authors state: “This report does not include evaluation results; it is intended as a reference for C-to-Rust translator developers” (Section 1, p. 3).

The benchmark is useful for formal-verification work because it separates behavior preservation from safety and code quality, exposes difficult ownership and aliasing features, and makes all test inputs and outputs machine-checkable. It does not itself prove semantic equivalence or generate Verus proofs.

## technique: test-vector behavioral equivalence

Functional correctness is empirical. A translation must match the compiled C binary's observable stdout, stderr, return code, and, for libraries, output state through the C ABI. The paper is explicit: “This is an empirical, test-based notion of correctness, not a formal one; we make no claim of semantic equivalence in the logical or proof-theoretic sense” (Section 2.1, p. 5).

Apply it by creating JSON vectors with `argv`, `stdin`, `env`, `stdout`, `stderr`, and `rc` for executables; library vectors additionally contain `lib_state_in` and `lib_state_out`, while `has_ub` describes undefined behavior (Table 1, p. 6). Generate vectors from the C reference, then run the same vector against Rust. For a library, provide a harness naming the shared library and symbol and map state fields to arguments and return values. stdout/stderr may use regular expressions for cases such as floating-point comparison.

The expanded vector format adds a `setup` script, `resources/`, and `file_changes.tar.gz` to capture filesystem effects. Setup can create files, repositories, network interfaces, and a working directory; Falco records file changes. `Cando` compares the resulting state and `Test Runner` builds projects, starts containers, runs setup and Cando, and emits console or JUnit XML reports (Sections 2.1, pp. 6–7).

Verus form. Inference: use the same vectors as executable regression tests and translate each vector into a Verus contract only when a mathematical specification is available. A passing finite vector set is evidence of tested behavior, not an `ensures` proof. For libraries, model ABI state as a ghost state relation and prove the wrapper preserves it; retain C ABI and FFI assumptions explicitly.

Undefined behavior needs a declared policy. TRACTOR treats the clang/LLVM compiled binary as the reference even when C UB determines its output, but currently excludes vectors marked `has_ub` from automated scoring (Section 2.1, p. 5–7). This makes the denominator of scored vectors smaller than the corpus and means a translator can receive no automated correctness credit or penalty for those cases.

## technique: measure semantic unsafety and UB handling

Safety is scored separately from behavior. The benchmark instruments the Rust compiler to count operations that actually require an unsafe context—calls to unsafe functions, inline assembly, mutable statics, raw-pointer dereferences, and more—rather than merely counting unsafe blocks (Section 2.2, p. 8). The authors warn that this cannot determine whether a use was necessary, especially at FFI boundaries where ABI compatibility requires unsafe.

Apply it by running the released semantic unsafe-operation analysis, report raw counts, and inspect their character. For UB, classify whether the translator recognizes UB, preserves the original semantics, changes behavior by rejecting inputs or adding errors, and emits safe or unsafe Rust. Safe Rust may add runtime checks; unsafe Rust generally does not. The paper concludes that silently changing behavior without developer intervention is the most dangerous option (Section 2.2, p. 9).

Verus form. Inference: make each unsafe operation cross a small, documented trusted boundary and prove its preconditions with Verus before calling it. Count and review `unsafe` operations, but treat a Verus proof as evidence about the stated contract, not a proof that C UB policy is correct. A translation that intentionally rejects an UB input should state that changed behavior in its contract and test vectors.

## technique: combine automated and manual idiomaticity scoring

Automated idiomaticity uses rustc errors/warnings, all Clippy lints in five groups (correctness, suspicious, complexity, performance, style), and average cyclomatic complexity measured by Lizard. The paper warns that raw lint counts correlate weakly with human scores and can be gamed with `#[allow]` attributes (Sections 2.3.1–2.3.2, pp. 10–11). A justified local allow, such as retaining the exact C `M_PI` literal, includes a `GATE-JUSTIFY` comment (Listing 1, p. 11).

Manual review uses a five-level Likert scale across six dimensions: Cargo/project structure; ownership and data flow; error handling and unsafe; types and abstractions; expression/control flow; and API, naming, and documentation (Sections 2.3.2–2.3.3, pp. 11–22). Reviewers first inspect the C source, independently score the Rust translation, record concrete rationale, and discuss large disagreements. Level 1 is anti-idiomatic and level 5 is teaching-quality; levels 2 and 4 interpolate.

The rubric gives actionable checks: avoid defensive `.clone()`, `Arc<Mutex<_>>` as a first resort, raw pointers where references suffice, undocumented unsafe, `Result<_, String>`, magic numbers, stringly APIs, indexed loops where iterators clarify intent, wildcard matches over owned enums, missing `# Errors`/`# Panics`, and every item public. Positive signals include narrow visibility, ownership that expresses intent, typed errors, invariant-carrying newtypes, `TryFrom`, deliberate iterator use, runnable doctests, and private fields with constructor invariants (Sections 2.3.3, pp. 14–22).

Verus form. Inference: add a seventh review dimension for specification quality: meaningful `requires`/`ensures`, complete loop invariants, no unproved `assume`, and proof lemmas that state the invariant rather than merely satisfy Z3. The benchmark's idiomaticity rubric can detect agent code that compiles but is hard to maintain; it cannot tell whether a Verus contract captures the real requirement.

## technique: measure throughput and resource overhead reproducibly

Translation throughput is measured in thousands of C lines per hour over the complete AWS job, including setup, teardown, and S3 transfer. The authors caution that shared-cloud variability affects the result (Section 2.4, p. 23). A benchmark script randomizes translator/test-vector order, performs randomly selected warm-up runs, and then measures to reduce cache and ordering bias. Runtime overhead uses `perf-stat` for task clock, user/total runtime, instructions, cycles, and cache events. Memory overhead uses Valgrind Massif for heap, stack, and allocator metadata; very short vectors may finish before IPC setup and lose memory data (Section 2.4, pp. 23–24).

Inference: record Verus verification time and proof/code ratio alongside these metrics. Translation throughput alone says nothing about specification or proof effort; a product should report solver time, proof failures, and repair work for the same vectors.

## technique: staged benchmark batteries

Battery 01 contains C that maps relatively naturally to Rust's affine type system: stack/static pointers, bounded pointer arithmetic, references, errno-style results, mutable statics, fixed-size structs, libc, and ABI-compatible libraries (Section 3.1, pp. 25–26). Milestone P00 is Perlin noise with floating-point arithmetic and array indexing; P01 is SPHINCS+ with bit-level cryptographic operations and configurable multi-library builds (Section 3.2, p. 26).

Battery 02 adds heap allocation and ownership transfer, mutable aliasing and interior mutability, overlapping raw buffers, function-pointer dispatch, type-erased containers, goto cleanup, type punning, structural indirection, cross-translation-unit linkage, deep macros, filesystem I/O, and environment state (Section 3.3, pp. 26–28). It deliberately excludes inline assembly, cyclic ownership, and concurrency, so it is a bounded challenge rather than a complete C language corpus. P02 is a modified libgit2 of roughly 100,000 lines and combines B02 features as a scale and ownership capstone (Section 3.4, p. 28).

Inference: VL should use B01 to test basic contract translation and B02/P02 to test ownership invariants, buffer overlap, cleanup, and aliasing proofs. The omitted concurrency and inline assembly mean passing TRACTOR would not establish coverage for all systems code.

## trust, contradictions, and threat to VL

The benchmark's strongest claim is reproducibility: public batteries, hidden vectors held back for six months, Dockerized translators, AWS Batch/Fargate, S3 inputs/outputs, and released infrastructure. Its correctness claim remains bounded by test coverage and by LLVM's concrete C behavior. Hidden tests are not a formal oracle. `has_ub` exclusions and regex matching weaken exact equivalence, while manual idiomaticity scores introduce reviewer judgment.

There are no translator performance or correctness numbers in this paper, so no success rate or denominator can be inferred. The report's B01/B02 feature lists are benchmark design facts, not measurements. The authors' statement that B02 “make[s] up the initial evaluation in which a tool’s ability to preserve behavior ... is placed under test” is a motivation, not evidence of proof.

Inference: agent-written verified Rust faces a larger threat from wrong specifications and unsafe FFI assumptions than from ordinary compilation failures. TRACTOR's vectors can catch observable mismatches; its safety and idiomaticity metrics can expose excessive unsafe and poor API design; Verus proofs can add stronger invariants. VL should retain test-vector evidence, formal contracts, solver logs, and unsafe-operation reports as separate artifacts, because none subsumes the others.

## what VL should not redo

TRACTOR already defines the four metric families, JSON and filesystem test-vector schemas, Cando/Test Runner architecture, safety instrumentation, Clippy-plus-manual rubric, performance methodology, staged batteries, and AWS evaluation infrastructure. A VL study should integrate these artifacts with Verus contract checking rather than build another generic C-to-Rust scorecard.

## techniques for the catalog

- observable test-vector equivalence — compare C and Rust stdout, stderr, return codes, ABI state, and filesystem changes with JSON vectors
- UB-aware scoring — classify undefined behavior, preserve or deliberately change semantics, and exclude marked UB vectors from automated scoring
- semantic unsafe measurement — count compiler operations requiring unsafe and review whether each boundary is justified
- rubric-based idiomaticity — combine rustc/Clippy/Lizard measurements with six-dimensional manual Likert review
- reproducible performance measurement — randomize cloud jobs, warm up, and measure throughput, perf-stat runtime, and Massif memory
- staged C-to-Rust batteries — escalate from affine-safe B01 features to aliasing, ownership, type erasure, cleanup, and large B02/P02 projects
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
