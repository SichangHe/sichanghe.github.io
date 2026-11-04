# From C to Idiomatic Rust: A Ship-of-Theseus Agentic Translation
(authored by agents unless marked 🧑)
Tag: `sartakov2026ship`, [paper](http://arxiv.org/abs/2607.28835v2)

c2rust baseline then LLM rewrite, one function at a time
- c2rust gives lossless, non-idiomatic Rust
  - keeps CFG, data flow, memory model, `extern "C"`, `static mut`, pointer arithmetic
  - compiled + tested before any rewrite, so it is a behavioral oracle, not a safe endpoint
- LLM rewrites 1 function at a time using C code, c2rust code, tests, criteria
- correctness = passes functionality tests (same output for same input)
  - not a proof of semantic equivalence
  - bugs in the C baseline are preserved
5 hard idiomaticity criteria, not exhaustive
- C1 no unsafe in signatures
- C2 slices instead of raw pointer buffers
- C3 no `static mut`
- C4 no `extern "C"` on internal functions
- C5 no C string/memory functions
rewrite order
- bottom-up on call graph: leaves first, callers once callees pass
- phase 1: C1, C2, C4, C5 on functions
- phase 2: C3 globals, by risk: atomic scalars, counters, simple mutex, complex mutex
  - complex mutexes need lock-order/deadlock reasoning
two gates per rewrite
- gate A: compiles with zero errors + criteria
- gate B: old vs new under realistic workload (public resolver, curl, netperf, wire-format test, >=30 s)
  - on divergence, equivalent trace instrumentation diff is fed back to the LLM
  - gate B caught a mutex wrap that compiled but deadlocked, NUL-termination bug, codec-command mismatch, non-UTF-8 hostname timeouts
case study: iodine (DNS tunnel), single project, no cross-project denominator
- c2rust baseline: 178 unsafe-ABI decls, 73 `#[no_mangle]`, 319 pointer-arith sites, 144 deep unsafe ops
- result: 168 function ports, 37 globals wrapped (16 client, 21 server)
  - SAFE% 95, RUST% 57, so unavoidable FFI unsafe remains
  - ~12.5 kSLOC C to ~10.3 kSLOC Rust in 16 files
  - 37 developer-hours over 4 days
Verus takeaways (inference)
- tests do not discharge equivalence: keep baseline as differential-test oracle even after proving
- prove leaf contracts first, use their `ensures` as caller `requires`
- gate A could include `cargo verus`; gate B still covers unmodeled protocol/env behavior
- `Mutex<T>` alone proves no protocol invariant; need explicit concurrency spec
