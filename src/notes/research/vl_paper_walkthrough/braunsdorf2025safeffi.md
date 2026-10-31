# SafeFFI: Efficient Sanitization at the Boundary Between Safe and Unsafe Code in Rust and Mixed-Language Applications
(authored by agents unless marked 🧑)
Tag: `braunsdorf2025safeffi`, [paper](http://arxiv.org/abs/2510.20688v1)

## scope and result

SafeFFI modifies rustc and LLVM so a sanitizer checks raw-to-safe pointer boundaries, then relies on Rust’s type guarantees for later safe dereferences. The paper’s abstract states: “SafeFFI achieves superior performance compared to state-of-the-art systems, reducing sanitizer checks by up to 98%, while maintaining correctness and flagging all spatial and temporal memory safety violations.” (Abstract, p.1) That abstract claim requires the body’s qualification: optional heap checks cover Free-During-Scope violations in single-threaded programs; concurrent deallocation can evade hoisted checks (§4.3, p.6). Its evaluation uses HWASan on popular crates, known vulnerabilities, and microbenchmarks. SafeFFI retains 10.22% of checks on average with cast and stack checks, or 21.43% when optional heap checks are added (§6.2, p.11). Runtime overhead averages 2.12× without heap checks and 2.51× with heap checks, compared with 3.22× for HWASan (§6.2, p.11). Compile-time overhead with heap checks is 2.64×, compared with 8.83× for RustSan (§6.4, p.12).

Inference: SafeFFI’s boundary discipline is relevant to deciding where Verus proofs or runtime checks must concentrate, but sanitizer measurements do not prove a Verus contract. External C, unsafe Rust, the sanitizer runtime, and the compiler remain trusted or separately assumed.

## technique 1: hoist checks to raw-to-safe pointer casts

What it is. Raw pointers have no Rust type-system safety guarantees; references and `Box<T>` do. SafeFFI inserts `safeffi_ensure(raw, size)` at the cast from raw to a safe pointer, then elides sanitizer checks on subsequent safe-pointer dereferences. The paper explains: “Casts from raw to safe pointers can only happen in unsafe Rust code, where the Rust compiler does not check that the raw pointer adheres to the requirements of the safe pointer type.” (§4.1, p.5)

When to use it. Inference: Use this when unsafe or foreign code creates a pointer later viewed as `&T`, `&mut T`, or `Box<T>`, and repeated dereference checks are redundant after the boundary.

The paper also states: “SafeFFI provides the option to detect Free-During-Scope violations which allows developers to trade safety for run-time and compile-time performance.” (§4.3, p.6)

How to do it.

1. Annotate pointer types while lowering MIR to LLVM (§5.1, pp.7–8)
2. Detect `&*raw_ptr` and `Box::from_raw(raw_ptr)` casts in MIR (§5.3, p.8)
3. Insert `safeffi_ensure` at the cast. The overview describes checks for allocation liveness, size, and provenance; detection is limited by the underlying sanitizer (§3, p.4; §4.2, pp.5–6)
4. Represent the cast result as a distinct safe LLVM value and replace the MIR-to-LLVM value mapping (§5.3, p.9)
5. Elide dereference checks for safe pointers, retaining the additional temporal checks described below (§4.2–4.3, pp.5–6)

Verus form. Inference: Treat a raw-to-safe conversion as a trusted boundary function with `requires` describing pointer validity and `ensures` describing a valid reference. Prove subsequent operations through Rust ownership and Verus contracts; retain an `external_body` only for the actual foreign or sanitizer primitive, never for the function whose behavior is being verified. The runtime check is complementary evidence, not a proof of the contract.

Evidence and limits. The worked `foo` example removes checks before dereferencing fields `a` and `b` after checking the `raw1` cast (Fig. 2, p.4). The overview states: “If the safeffi_ensure() check fails, we immediately abort the program, pointing the developer directly to the cast location.” (§3, p.4) The guarantee relies on Rust’s type-system assumptions and the underlying sanitizer.

## technique 2: classify pointer creation locally

What it is. SafeFFI uses function-local pointer type information. It distinguishes stack allocation, derivation from an existing safe reference, raw-to-safe reborrow or `Box::from_raw`, and loading a safe pointer from memory (§4.2, p.5). Cases (a) and (b) need no checks; case (c) gets a cast check; case (d) gets a load check because unsafe or foreign code may have corrupted stored pointers.

How to do it.

1. Annotate locals, globals, arguments, and constants using LLVM metadata nodes and function-parameter attributes. Compiler-generated pointers for aggregate stack variables receive NOPTR and are treated as safe (§5.1, pp.7–8)
2. Propagate safe, raw, and NOPTR classifications through LLVM instructions with an intraprocedural analysis. A GEP derived from a safe base remains safe only if its offset can be statically shown to stay within the original allocation (§5.2, p.8)
3. For stack objects and safe derivations, elide checks (§4.2, p.5)
4. For raw casts, insert `safeffi_ensure` (§4.2, p.5)
5. For safe pointers loaded from memory, validate when loaded into the current function scope (§4.2, p.5)

Implementation limit. SafeFFI classifies dynamically sized data pointers as raw because it cannot reason about their dynamic size; trait-object vtable pointers are annotated safe because the compiler manages them (§5.1, p.8).

Verus form. Inference: Encode the safe-pointer invariant in a function contract and use `assert` to show that each constructor preserves it. For loops, express pointer-validity properties needed across iterations with a loop `invariant`. Verus cannot infer validity of arbitrary LLVM values or foreign memory without a model.

## technique 3: temporal checks for deallocation and calls

What it is. SafeFFI distinguishes Free-Before-Scope and Free-During-Scope violations. Creation checks catch objects already freed before safe-pointer creation. Optional heap checks address deallocation during the scope. The paper states: “To detect Free-During-Scope violations, SafeFFI inserts an additional safeffi_ensure() check for every dereference of the safe pointer that is reachable from a call to a potential deallocation function.” (§4.3, p.6; Algorithm 1)

How to do it.

1. Build a set of functions that may transitively deallocate (§4.3, p.6)
2. For each dereference of a safe pointer, determine whether it is reachable from a potentially deallocating call (§4.3, Algorithm 1, p.6)
3. Insert `safeffi_ensure` at each such dereference (§4.3, p.6)
4. For safe pointer parameters of externally visible Rust functions that foreign code can call, check in the callee prologue (§4.4, pp.6–7)
5. After every call returning a safe pointer, check that pointer to catch stack use-after-return (§4.4, p.7)

Verus form. Inference: Model ownership and lifetime with references and ghost state. Contracts can require that a callee does not invalidate an input reference, while loop invariants preserve validity across iterations. Foreign calls and deallocation functions must be modeled as trusted boundaries; a runtime reachability analysis does not prove semantic non-aliasing.

Evidence and limits. SafeFFI detects Free-During-Scope violations reliably in single-threaded programs when optional checks are enabled. The authors state that check hoisting is not thread-safe for concurrent deallocation, so such a violation could occur between check and dereference (§4.3, p.6). SafeFFI remains compatible with multithreaded programs but guarantees only spatial and Free-Before-Scope detection to the sanitizer’s extent.

## technique 4: compositional nofree call-graph analysis

What it is. The implementation computes functions that cannot deallocate using a bottom-up LLVM SCC analysis. A function is `nofree` only if it calls no known deallocator, no unannotated function, and no unknown callee; an SCC is potentially deallocating if any member fails this test (§5.4, p.9).

How to do it.

1. Analyze strongly connected components bottom-up (§5.4, p.9)
2. Mark a function `nofree` only when all callees satisfy the nofree conditions (§5.4, p.9)
3. Treat unknown callees and dynamically linked or precompiled C functions as potentially deallocating; offer clang build flags to analyze C/C++ dependencies (§5.4, p.9)
4. Serialize annotations and restore them for dependent crates (§5.4, p.9)

Verus form. Inference: A similar conservative policy can mark foreign functions as `external_body` only at a narrow boundary and require callers to prove their assumptions. Verus proofs should state the no-deallocation contract explicitly; inferred call-graph metadata is an optimization aid and cannot replace that contract.

Evidence and limits. SafeFFI’s 45 systematic FFI tests (35 vulnerable, 10 benign) produced no false positives or false negatives (§6.3, pp.11–12). On the known-vulnerability dataset, SafeFFI caught every HWASan-detected vulnerability, reported 21 earlier, and caught one vulnerability missed by every other approach (§6.1, p.10). The authors manually reconstructed RustSan’s dataset from RustSec advisories because RustSan’s authors did not provide it (§6.1, p.10). Inference: these finite tests do not establish correctness for every program.

## what is measured and trusted

The paper measures detection on known CVEs/RustSec cases, check-elision rates, runtime and compile-time overhead, and FFI robustness. SafeFFI uses Rust nightly-2021-02-22 (rustc 1.52.0, LLVM 12) with HWASan on an ARM MacStudio and compares RustSan/ERASan on x86_64 (§6, p.9). The comparison has different architectures and toolchains; the authors could not benchmark RustSan runtime because its harness crashed (§6.2, p.11).

## techniques for the catalog

- boundary check hoisting: validate raw-to-safe casts once and elide later safe dereference checks
- local pointer classification: use MIR/LLVM type metadata to distinguish raw, safe, and compiler-generated pointers
- temporal deallocation checks: insert optional checks at dereferences reachable from potential heap deallocation and check safe pointer arguments and returns across calls
- compositional nofree analysis: compute potentially deallocating functions with bottom-up SCC analysis and conservative unknown-callee handling
- mixed-language validation: test allocation, deallocation, invalidation, and control-flow combinations across Rust and C
