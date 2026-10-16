# SafeFFI: Efficient Sanitization at the Boundary Between Safe and Unsafe Code in Rust and Mixed-Language Applications
(authored by agents unless marked 🧑)
Tag: `braunsdorf2025safeffi`, [paper](http://arxiv.org/abs/2510.20688v1)

## scope and result

SafeFFI modifies rustc and LLVM so a sanitizer checks raw-to-safe pointer boundaries, then relies on Rust’s type guarantees for later safe dereferences. The paper’s abstract states: “SafeFFI achieves superior performance compared to state-of-the-art systems, reducing sanitizer checks by up to 98%, while maintaining correctness and flagging all spatial and temporal memory safety violations.” (Abstract, p.1) Its evaluation uses HWASan on popular crates, known vulnerabilities, and microbenchmarks. SafeFFI retains 10.22% of checks on average with cast and stack checks, or 21.43% when optional heap checks are added (§6.2, p.11). Runtime overhead averages 2.12× without heap checks and 2.51× with full temporal safety, compared with 3.22× for HWASan (§6.2, p.11). Full temporal-safety compile overhead is 2.64×, compared with 8.83× for RustSan (§6.4, p.12).

Inference: SafeFFI’s boundary discipline is relevant to deciding where Verus proofs or runtime checks must concentrate, but sanitizer measurements do not prove a Verus contract. External C, unsafe Rust, the sanitizer runtime, and the compiler remain trusted or separately assumed.

## technique 1: hoist checks to raw-to-safe pointer casts

What it is. Raw pointers have no Rust type-system safety guarantees; references and `Box<T>` do. SafeFFI inserts `safeffi_ensure(raw, size)` at the cast from raw to a safe pointer, then elides sanitizer checks on subsequent safe-pointer dereferences. The paper explains: “Casts from raw to safe pointers can only happen in unsafe Rust code, where the Rust compiler does not check that the raw pointer adheres to the requirements of the safe pointer type.” (§4.1, p.5)

When to use it. Use this when unsafe or foreign code creates a pointer later viewed as `&T`, `&mut T`, or `Box<T>`, and repeated dereference checks are redundant after the boundary.

The paper also states: “SafeFFI provides the option to detect Free-During-Scope violations which allows developers to trade safety for run-time and compile-time performance.” (§4.3, p.6)

How to do it.

1. Annotate pointer types while lowering MIR to LLVM (§5.1, p.8)
2. Detect `&*raw_ptr` and `Box::from_raw(raw_ptr)` casts (§4.2, p.5)
3. Insert `safeffi_ensure` checking liveness, size, and provenance at the cast (§4.1–4.2, pp.4–5)
4. Represent the cast result as a distinct safe LLVM value (§5.2, p.8)
5. Elide checks for later safe-pointer loads and stores in the scope (§4.2, p.5)

Verus form. Inference: Treat a raw-to-safe conversion as a trusted boundary function with `requires` describing pointer validity and `ensures` describing a valid reference. Prove subsequent operations through Rust ownership and Verus contracts; retain an `external_body` only for the actual foreign or sanitizer primitive, never for the function whose behavior is being verified. The runtime check is complementary evidence, not a proof of the contract.

Evidence and limits. The worked `foo` example removes checks before dereferencing fields `a` and `b` after checking the `raw1` cast (Fig. 2, p.4). A failed check aborts at the cast, earlier than a later dereference (§4.1, p.5). The guarantee relies on Rust’s type-system assumptions and the underlying sanitizer.

## technique 2: classify pointer creation locally

What it is. SafeFFI uses function-local pointer type information. It distinguishes stack allocation, derivation from an existing safe reference, raw-to-safe reborrow or `Box::from_raw`, and loading a safe pointer from memory (§4.2, p.5). Cases (a) and (b) need no checks; case (c) gets a cast check; case (d) gets a load check because unsafe or foreign code may have corrupted stored pointers.

How to do it.

1. Annotate locals, globals, arguments, and constants with safe, raw, or NOPTR metadata (§5.1, p.8)
2. Propagate pointer types through LLVM instructions with an intraprocedural analysis (§5.2, p.8)
3. For stack objects and safe derivations, elide checks (§4.2, p.5)
4. For raw casts, insert `safeffi_ensure` (§4.2, p.5)
5. For pointers loaded from memory, validate at load/creation (§4.2, p.5)

Verus form. Inference: Encode the safe-pointer invariant in a function contract and use `assert` to show that each constructor preserves it. A loop `invariant` is needed if pointer creation occurs repeatedly. Verus cannot infer validity of arbitrary LLVM values or foreign memory without a model.

## technique 3: temporal checks for deallocation and calls

What it is. SafeFFI distinguishes Free-Before-Scope and Free-During-Scope violations. Cast checks catch objects already freed before safe-pointer creation. Optional checks catch heap deallocation reachable between pointer creation and dereference. The paper gives Algorithm 1: for each memory instruction and call operand, if the pointer is safe, the callee may deallocate, and the deallocation is reachable, insert a check between them (§4.3, p.6).

How to do it.

1. Build a set of functions that may transitively deallocate (§4.3, p.6)
2. For each dereference of a safe pointer, find reachable deallocation calls (§4.3, Algorithm 1, p.6)
3. Insert `safeffi_ensure` before the dereference when such a call is reachable (§4.3, p.6)
4. For safe pointer arguments from foreign-visible functions, check in the callee prologue (§4.4, p.6)
5. For safe pointer returns, check after the call to catch stack use-after-return (§4.4, p.6)

Verus form. Inference: Model ownership and lifetime with references and ghost state. Contracts can require that a callee does not invalidate an input reference, while loop invariants preserve validity across iterations. Foreign calls and deallocation functions must be modeled as trusted boundaries; a runtime reachability analysis does not prove semantic non-aliasing.

Evidence and limits. SafeFFI detects Free-During-Scope violations reliably in single-threaded programs when optional checks are enabled. The authors state that check hoisting is not thread-safe for concurrent deallocation, so such a violation could occur between check and dereference (§4.3, p.6). SafeFFI remains compatible with multithreaded programs but guarantees only spatial and Free-Before-Scope detection to the sanitizer’s extent.

## technique 4: compositional nofree call-graph analysis

What it is. The implementation computes functions that cannot deallocate using a bottom-up LLVM SCC analysis. A function is `nofree` only if it calls no known deallocator, no unannotated function, and no unknown callee; an SCC is potentially deallocating if any member fails this test (§5.4, p.9).

How to do it.

1. Analyze strongly connected components bottom-up (§5.4, p.9)
2. Mark a function `nofree` only when all callees satisfy the nofree conditions (§5.4, p.9)
3. Treat unknown or external C functions conservatively as potentially deallocating (§5.4, p.9)
4. Serialize annotations and restore them for dependent crates (§5.4, p.9)

Verus form. Inference: A similar conservative policy can mark foreign functions as `external_body` only at a narrow boundary and require callers to prove their assumptions. Verus proofs should state the no-deallocation contract explicitly; inferred call-graph metadata is an optimization aid and cannot replace that contract.

Evidence and limits. SafeFFI’s 45 systematic FFI tests (35 vulnerable, 10 benign) produced no false positives or false negatives (§6.3, p.11). On the known-vulnerability dataset, SafeFFI caught every HWASan-detected vulnerability, reported 21 earlier, and caught one vulnerability missed by every other approach (§6.1, pp.9–10). The dataset is finite and relies on the correctness of the reconstructed RustSec cases.

## what is measured and trusted

The paper measures detection on known CVEs/RustSec cases, check-elision rates, runtime and compile-time overhead, and FFI robustness. SafeFFI uses Rust nightly-2021-02-22 (rustc 1.52.0, LLVM 12) with HWASan on an ARM MacStudio and compares RustSan/ERASan on x86_64 (§6, p.9). The comparison has different architectures and toolchains; the authors could not benchmark RustSan runtime because its harness crashed (§6.2, p.11).

Inference: For VeruLaw, SafeFFI identifies a practical boundary strategy: concentrate validation at unsafe/FFI ingress, then rely on proved safe abstractions. VL must still specify aliasing, lifetime, and foreign-function behavior; sanitizer success cannot establish those specifications. Existing SafeFFI work means VL should not claim novelty for merely moving checks to boundaries. A product threat remains whenever unsafe code, external libraries, or sanitizer assumptions are trusted without a Verus model.

## techniques for the catalog

- boundary check hoisting: validate raw-to-safe casts once and elide later safe dereference checks
- local pointer classification: use MIR/LLVM type metadata to distinguish raw, safe, loaded, and compiler-generated pointers
- temporal deallocation checks: insert optional checks on dereferences reachable from heap frees and across calls
- compositional nofree analysis: compute potentially deallocating functions with bottom-up SCC analysis and conservative unknown-callee handling
- mixed-language validation: test allocation, deallocation, invalidation, and control-flow combinations across Rust and C

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
