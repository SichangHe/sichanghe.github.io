# A Mixed Methods Study on the Implications of Unsafe Rust for Interoperation, Encapsulation, and Tooling
(authored by agents unless marked 🧑)
Tag: `mccormack2026unsafe`, [paper](https://arxiv.org/abs/2404.02230) (arXiv id from the paper text; the DOI previously listed is not in the paper text and comes from the fetch record)

empirical study of unsafe Rust practice; no verifier
- 19 interviews + survey of 160 valid respondents
- biased toward online Rust communities and experts; self-reported perceptions, not actual bug rates
- authors did not check whether participants reasoned correctly about unsafe code
foreign ownership and aliasing
- Rust wrappers must preserve allocation ownership, validity, aliasing, lifetimes
  - 54% of FFI callers used a memory container; of these 95% `Box`, 28% `Arc`, 8% `Rc`
  - `Box` move can invalidate raw pointers; C++ developers did not expect it
  - 17% of 51% of `Box`-in-unsafe users hit pointer-invalid-after-move
- source/destination aliasing cannot be given as `&`/`&mut`; need raw pointers
foreign contracts omitted by signatures
- thread safety by type in Rust vs by function in C
- init/cleanup pairs map to `Drop`
- partially thread-safe foreign types hard to encapsulate
- of 112 FFI users: 49% avoid passing abstract data types by value; 23% avoid casting foreign pointers to references
  - paper prose says 43%, contradicting its table
- missing foreign documentation forces manual reasoning
minimal safe encapsulation
- 88% exposed a safe API over unsafe code
- 90% of 68 unsafe-API authors document requirements
- runtime checks at least most of the time: 58% of 141 safe-API authors, 18% of 68 unsafe-API authors
- only 6% audit dependencies
- JIT compilers and OS code use unsafe pervasively, so isolation fails there
- "If you write unsafe code today, you write it against the void"
tooling
- Miri cannot cross FFI and is slow
  - participants asked for FFI-crossing Miri and a unique-pointer sanitizer
  - authors expect compile-time instrumentation (BorrowSanitizer, CapsLock) to scale
- few used static verification
  - 10 respondents used formal tools: 5 Kani, 3 Prusti, 3 Creusot, 1 Flux, 1 Crucible; none Verus
  - adoption evidence for Verus/Kani is weak
Verus takeaways (inference)
- put contract on the safe-facing wrapper
- isolate `external_body`/FFI assumptions at a narrow boundary, never on the function being verified
- ghost state for allocation ownership and lifecycle; list foreign assumptions as trusted axioms
- sanitizer success is testing evidence, not proof
