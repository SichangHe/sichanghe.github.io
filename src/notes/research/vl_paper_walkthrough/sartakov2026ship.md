# From C to Idiomatic Rust: A Ship-of-Theseus Agentic Translation
(authored by agents unless marked 🧑)
Tag: `sartakov2026ship`, [paper](http://arxiv.org/abs/2607.28835v2)

## scope and result

Sartakov describes a migration workflow for turning a C system into idiomatic Rust through an intermediate, mechanically translated Rust baseline. The workflow uses c2rust for lossless translation, an LLM for one-function-at-a-time rewrites, and two automated gates: compilation and runtime behavior. The case study is iodine, a DNS tunnel. It is a testing and refactoring workflow, not a formal proof of semantic equivalence. The paper explicitly defines proper implementation by functionality tests: “we assume that a program is properly implemented if it passes all functionality tests: produces the same output for the same input as the original program.” (Section 3, p. 3).

The abstract states: “This paper presents a migration methodology that first generates a semantics-preserving, non-idiomatic Rust baseline and then incrementally rewrites it into idiomatic Rust using agentic AI, validating each step through compilation and behavioural testing.” (Abstract, p. 1).

## technique 1: use a lossless, non-idiomatic baseline

what it is. c2rust translates C through Clang's AST while retaining the C control flow, data flow, memory model, `extern "C"` declarations, `static mut` globals, pointer arithmetic, and libc FFI. This baseline is compiled and tested before any idiomatic rewrite. The paper says: “The transpiler preserves the control flow graph, the data flow, and the memory model of the original C.” (Section 2.1, p. 2).

when to use it. Use this phase when direct C-to-idiomatic-Rust generation would have to infer ownership and semantics at the same time as changing representation. The baseline gives a continuously executable reference for later transformations. It still carries unsafe operations and C risks; it is a behavioral oracle, not a safe endpoint.

how to do it. (1) Run c2rust on the C translation units. (2) Compile baseline, c2rust, and instrumented variants in the build infrastructure. (3) Run the existing functionality tests and record output and state modification for identical inputs. (4) Preserve this verified baseline while changing one Rust function at a time. These steps are in Sections 2.1 and 3.2, pp. 2–4. The paper reports that c2rust output includes “functions ... declared as extern \"C\" ABI,” “global variables become static mut,” and pointer arithmetic through `.offset()` (Section 2.1, p. 2).

Verus form. Inference: a Verus migration would use the translated function as executable code and state a mathematical contract with `requires` and `ensures`; a ghost/spec view can describe the C behavior. `proof fn` lemmas can connect the baseline and rewrite, but runtime tests do not discharge that equivalence automatically. Inference: preserve the baseline as a differential-test oracle even after proving the new function, because the proof only covers the stated contract.

evidence and limits. The paper's iodine baseline had approximately 12.5 kSLOC of C (Section 4, p. 4). c2rust is described as lossless at the AST level, but no independent proof of losslessness or test denominator is given. Inference: unsafe FFI and undefined C behavior remain trusted assumptions; if the baseline's behavior is already wrong, matching it preserves the wrong behavior.

## technique 2: define explicit idiomaticity criteria

what it is. The authors define five criteria used as hard checks during migration: C1, no unsafe in function signatures; C2, slices instead of raw pointer buffers; C3, no `static mut`; C4, no `extern "C"` on internal functions; and C5, no C string or memory functions. The paper says: “We define idiomatic Rust along five criteria.” (Section 3.1, p. 3).

when to use it. Use explicit criteria when “idiomatic” would otherwise be subjective and an agent could make cosmetic changes while leaving unsafe interfaces. The criteria are a project policy, not a complete Rust safety proof: the paper says “These five criteria are not exhaustive.” (Section 3.1, p. 3).

how to do it. (1) Reject candidate signatures exposing unsafe to callers, while allowing narrow unsafe blocks needed at FFI. (2) Change buffer parameters to `&[u8]` or `&mut [u8]`, carrying length in the type. (3) Replace scalar globals with atomic types and compound state with `Mutex<T>` or another synchronization primitive. (4) Retain `extern "C"` only for direct FFI callbacks. (5) Replace `strlen`, `strcpy`, `memcpy`, `malloc`, and `free` with Rust abstractions, using `&str` only when UTF-8 is guaranteed and `&[u8]` for arbitrary bytes. The definitions are in Section 3.1, p. 3. The paper summarizes the safety boundary: “A codebase satisfying all five is safe by construction in its safe regions, with unsafe confined to the FFI boundary where it is unavoidable.” (Section 3.1, p. 3).

Verus form. Inference: C1–C5 can become review and proof preconditions rather than Verus syntax. For each rewritten function, put memory and ownership assumptions in `requires`, behavior in `ensures`, and use `proof fn` lemmas for slice-length or state-transition facts. Inference: `&[u8]` and `&mut [u8]` are executable Rust types that Verus can reason about, while the absence of `static mut` reduces the state model but does not prove concurrent correctness.

evidence and limits. The criteria remove classes of unsafe syntax, but C3 wrappers introduce lock-order and deadlock obligations. The paper calls C3 “challenging because it requires reasoning about lock ordering and potential deadlocks” (Section 3.2, p. 4). Inference: a product must add explicit concurrency specifications; passing the five textual criteria is insufficient evidence of race freedom or functional equivalence.

## technique 3: order rewrites bottom-up by a call graph

what it is. A static analysis builds a directed call graph. The agent first ports leaf functions with no internal dependencies; once a dependency tier is safe, callers in the next tier become eligible. The paper says: “The transition is performed on per-function basis.” (Section 3.2, p. 4) and “This bottom-up ordering guarantees that each transformation rests on a foundation of already-verified safe code.” (Section 3.2, p. 4).

when to use it. Use this ordering when function signatures and ownership changes propagate to callers. Leaf-first limits the number of simultaneous changes and makes failures local. Functions coupled through global state or shared types may still require architectural work before this ordering works.

how to do it. (1) Build the call graph from c2rust output. (2) Select functions with no internal dependencies. (3) Give one leaf to the LLM with C and c2rust code, tests, and the criteria. (4) After it passes both gates, mark it safe and expose the next dependency tier. (5) Repeat until the component is ported. These steps are in Section 3.2, p. 4.

Verus form. Inference: prove leaf contracts first, then use their `ensures` facts as preconditions for callers. A caller's `requires` should match the callee contract; proof functions can establish the call graph's data invariants. Inference: Verus does not infer the paper's migration order automatically, so an agent controller or build script would need to maintain it.

evidence and limits. The method is evaluated on one DNS tunnel; no cross-project denominator is supplied. Inference: call-graph leaves do not guarantee low semantic risk when a leaf accesses shared FFI state or hidden global effects.

## technique 4: gate every candidate with compilation and differential runtime traces

what it is. Gate A requires zero compilation errors and the idiomaticity criteria. Gate B runs a realistic workload on old and new implementations. If outputs diverge, equivalent trace instrumentation compares the executions and sends the divergence back to the LLM for revision. The paper says: “Each transformation passes through two gates: compilation (A) and runtime verification (B).” (Figure 2 caption, p. 4).

when to use it. Use the two gates after every atomic rewrite to keep the code continuously executable. Gate B is needed because compilation cannot detect deadlocks, protocol changes, or incorrect data handling.

how to do it. (1) Present one candidate implementation. (2) Run Gate A: compile with zero errors and treat safety/idiomaticity violations as hard errors. (3) Run Gate B under sustained real-data workload. (4) If it fails, instrument old and new implementations with equivalent traces, execute identical inputs, compare divergence, and feed the diagnosis to the LLM. (5) Revise and repeat until Gate B passes. This procedure is in Section 3.2, p. 4. The paper reports that Gate B caught “a batch mutex wrap that compiled but deadlocked under load,” a NUL-termination bug, a codec-command mismatch, and timeouts on non-UTF-8 hostnames (Section 4.3, p. 6).

Verus form. Inference: Gate A can include `cargo verus` proof checking, while Gate B remains a regression and differential test. A Verus `ensures` contract can prove a local property, but trace comparison is still useful for unmodeled protocol and environment behavior. Inference: the gate should reject a proof that relies on `external_body` for the function whose behavior is being established; trusted external interfaces need separately stated contracts.

evidence and limits. Each of 168 function ports and each of 37 static-mut wrappings was run against a public resolver for at least 30 seconds, with curl, netperf, and a wire-format integration test (Section 4.3, p. 6). This is a denominator for validation attempts, but the paper does not say how many candidate revisions failed before passing. Runtime coverage is one workload and one application.

## technique 5: separate function cleanup from global-state conversion

what it is. Phase 1 addresses C1, C2, C4, and C5. Phase 2 addresses C3 by converting `static mut` globals, in increasing risk order: atomic scalars, counters, simple mutexes, then complex mutexes requiring lock-order analysis. The paper says: “We separate the translation into two phases.” (Section 3.2, p. 4).

when to use it. Use this split when function-level ownership and FFI cleanup can proceed before concurrency redesign. It keeps lock reasoning from obscuring simpler signature and buffer transformations.

how to do it. (1) Complete Phase 1 on function bodies and signatures. (2) In Phase 2, wrap atomic scalars first, then counters, then single-path compound data, and finally multi-path shared state. (3) Run both gates after each wrapper. (4) Treat C library globals that cannot be wrapped, such as `getopt` externals, as replacement tasks; the paper deferred replacing them with a Rust argument parser because they were confined to `main` (Section 4.2, p. 5).

Verus form. Inference: use Verus state-machine or invariant reasoning for shared state, with `proof fn` lemmas for each transition and explicit lock-order assumptions. A `Mutex<T>` wrapper alone does not prove a protocol invariant. Inference: if an external C global remains, model it as a trusted interface with a precise contract and isolate it behind a small API.

evidence and limits. The evaluated code wrapped 37 globals (16 client, 21 server) in atomics or mutexes (Section 4.3, p. 6). The paper reports two silent lock-pattern defects found under load, so compilation and a textual wrapper check are inadequate.

## case-study evidence and numbers

The c2rust baseline contained 178 unsafe-ABI declarations (EX), 73 `#[no_mangle]` annotations (NM), 319 pointer-arithmetic sites (PA), and 144 deep unsafe operations (DU). The paper defines SAFE% as `100(1 − (EX + NM)/(EX0 + NM0))` and RUST% as `100(1 − (PA + DU)/(PA0 + DU0))` (Section 4.3, p. 6). Server commits 1–31 reached SAFE% 72 and RUST% 47; client commits 32–41 completed 168 signatures at SAFE%=95; static-mut elimination in commits 39–45 wrapped 37 globals and produced final RUST%=57. The denominators are the c2rust baseline counts, not tests or lines of code. The paper explains that residual SAFE% consists of five signal-handler aliases and six entry-point annotations, while residual RUST% is 99 PA and 99 DU sites at FFI boundaries (Section 4.3, p. 6).

The final code is approximately 10.3 kSLOC of Rust in 16 files, from approximately 12.5 kSLOC of C; the migration took 37 developer-hours over four working days, or 4.5 functions and roughly 278 lines per hour (Section 4.3, p. 6). The 10.3/12.5 figures are code-size approximations, not a correctness ratio. Inference: the final 57% RUST% demonstrates remaining unavoidable FFI unsafe surface, so “idiomatic” does not mean zero unsafe code in the whole system.

## techniques for the catalog

- lossless baseline then refinement — generate compilable c2rust Rust, preserve it as a behavioral oracle, and rewrite one function at a time
- explicit idiomaticity criteria — enforce five concrete API, slice, global-state, ABI, and library rules as hard checks
- leaf-first dependency ordering — port call-graph leaves and expose callers only after their callees pass
- two-gate differential validation — require compilation plus sustained runtime testing, with trace comparison on divergence
- phased global-state conversion — complete function and buffer cleanup before wrapping globals from atomic scalars through complex mutexes
